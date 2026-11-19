import { z } from "zod";
import pool from "../config/db.js";
import * as adminConfigService from "../services/adminConfigService.js";
import * as auditService from "../services/auditService.js";
import * as userModel from "../models/userModel.js";
import * as flatModel from "../models/flatModel.js";
import { success, created, fail } from "../utils/apiResponse.js";

export const updateSettingSchema = z.object({
  key:   z.string().min(1),
  value: z.string(),
});

export const bulkUpdateSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

export const rotateBankMasterSchema = z
  .object({
    bankName: z.string().min(2).max(100),
    ifscCode: z.string().regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, "Invalid RBI IFSC code format (e.g. ICIC0000452)"),
    accountNumber: z.string().regex(/^\d{9,18}$/, "Account number must be 9 to 18 digits"),
    confirmAccountNumber: z.string().regex(/^\d{9,18}$/),
    upiVpa: z.string().regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, "Invalid UPI VPA format (e.g. society@bank)"),
    adminPassword: z.string().min(6),
    reason: z.string().min(5),
  })
  .refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: "Bank account numbers do not match",
    path: ["confirmAccountNumber"],
  });

export async function getSettings(req, res) {
  const societyId = req.societyId || 1;
  const settings = await adminConfigService.getAllSettings(societyId);
  return success(res, settings);
}

export async function updateSetting(req, res) {
  const societyId = req.societyId || 1;
  const result = await adminConfigService.updateSetting(req.body.key, req.body.value, req.user.id, societyId);
  req.auditEntity = { type: "system_settings", details: result };
  return success(res, result, "Setting updated");
}

export async function bulkUpdate(req, res) {
  const societyId = req.societyId || 1;
  await adminConfigService.bulkUpdateSettings(req.body.settings, req.user.id, societyId);
  return success(res, req.body.settings, "Settings updated");
}

export async function rotateBankMaster(req, res) {
  const societyId = req.societyId || 1;
  const result = await adminConfigService.rotateBankMaster({
    societyId,
    adminUserId: req.user.id,
    adminPassword: req.body.adminPassword,
    bankName: req.body.bankName,
    ifscCode: req.body.ifscCode,
    accountNumber: req.body.accountNumber,
    confirmAccountNumber: req.body.confirmAccountNumber,
    upiVpa: req.body.upiVpa,
    reason: req.body.reason,
    ipAddress: req.ip,
  });

  req.auditEntity = {
    type: "system_settings",
    details: {
      action: "BANK_ACCOUNT_ROTATED",
      bankMask: result.bankMask,
      upiVpa: result.upiVpa,
      reason: req.body.reason,
    },
  };

  return success(res, result, "Society bank master account successfully rotated");
}

export async function getAuditLogs(req, res) {
  const limit  = Number(req.query.limit)  || 50;
  const offset = Number(req.query.offset) || 0;
  const { action, startDate, endDate, search, userId } = req.query;

  const result = await auditService.getAuditLogs({
    limit,
    offset,
    societyId: req.societyId,
    action: action || null,
    userId: userId ? Number(userId) : null,
    startDate: startDate || null,
    endDate: endDate || null,
    search: search || null,
  });

  return success(res, result);
}

export async function listUsers(req, res) {
  const isSuper = Boolean(req.user?.isSuperadmin);
  const users = await userModel.listUsers(req.societyId, isSuper);
  return success(res, users);
}

export async function listFlats(req, res) {
  const flats = await flatModel.listFlats(req.societyId);
  return success(res, flats);
}

/* ------------------------------------------------------------------ */
/*  Users CRUD                                                        */
/* ------------------------------------------------------------------ */

export const createUserSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required"),
  role:     z.enum(["ADMIN", "TREASURER", "COMMITTEE", "RESIDENT"]),
  flatId:   z.preprocess((val) => (val === "" || val === undefined ? null : Number(val)), z.number().int().positive().optional().nullable()),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role:     z.enum(["ADMIN", "TREASURER", "COMMITTEE", "RESIDENT"]).optional(),
  flatId:   z.preprocess((val) => (val === "" || val === undefined ? null : Number(val)), z.number().int().positive().optional().nullable()),
  isActive: z.boolean().optional(),
});

export async function createUser(req, res, next) {
  const { email, password, fullName, role, flatId } = req.body;
  const societyId = req.societyId || 1;
  const existing = await userModel.findByEmail(email);
  if (existing) {
    const err = new Error("Email already registered");
    err.status = 409;
    err.title = "Conflict";
    return next(err);
  }

  const { hashPassword } = await import("../services/authService.js");
  const passwordHash = await hashPassword(password);
  const id = await userModel.createUser({ email, passwordHash, fullName, role, flatId });

  if (societyId) {
    await pool.execute(
      "INSERT INTO society_memberships (society_id, user_id, role, flat_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role), flat_id = VALUES(flat_id)",
      [societyId, id, role, flatId || null]
    );
  }

  req.auditEntity = { type: "user", id, details: { email, role, flatId } };
  return created(res, { id, email, fullName, role, flatId }, "User created");
}

export async function updateUser(req, res, next) {
  const id = Number(req.params.id);

  const target = await userModel.findById(id);
  if (!target) {
    const err = new Error("User not found");
    err.status = 404;
    err.title = "Not Found";
    return next(err);
  }

  // Security guard: Only SuperAdmin can modify another SuperAdmin
  if (target.is_superadmin && !req.user?.isSuperadmin) {
    const err = new Error("Security Violation: You do not have permission to modify a Platform SuperAdmin account.");
    err.status = 403;
    err.title = "Forbidden";
    return next(err);
  }

  const fields = { ...req.body };
  delete fields.password;
  delete fields.email;

  if (Object.keys(fields).length === 0) {
    const err = new Error("No fields to update");
    err.status = 400;
    err.title = "Bad Request";
    return next(err);
  }

  await userModel.updateUser(id, fields);
  const updated = await userModel.findById(id);
  const { password_hash, ...safe } = updated;

  req.auditEntity = { type: "user", id, details: fields };
  return success(res, safe, "User updated");
}

export async function deleteUser(req, res, next) {
  const id = Number(req.params.id);

  if (req.user.id === id) {
    const err = new Error("You cannot delete your own account");
    err.status = 400;
    err.title = "Bad Request";
    return next(err);
  }

  const exists = await userModel.findById(id);
  if (!exists) {
    const err = new Error("User not found");
    err.status = 404;
    err.title = "Not Found";
    return next(err);
  }

  // 1. Strict SuperAdmin protection: SuperAdmins are completely immutable
  if (exists.is_superadmin) {
    const err = new Error("Security Violation: Platform Owner (SuperAdmin) accounts are immutable and cannot be deleted.");
    err.status = 403;
    err.title = "Forbidden";
    return next(err);
  }

  // 2. A regular Admin cannot delete another Admin
  if (exists.role === "ADMIN" && !req.user?.isSuperadmin) {
    const err = new Error("Forbidden: Only Platform SuperAdmin can delete an Administrator account.");
    err.status = 403;
    err.title = "Forbidden";
    return next(err);
  }

  await userModel.deleteUser(id);
  req.auditEntity = { type: "user", id, details: { email: exists.email } };
  return success(res, null, "User deleted");
}

/* ------------------------------------------------------------------ */
/*  Flats CRUD                                                        */
/* ------------------------------------------------------------------ */

export const createFlatSchema = z.object({
  wing:        z.string().min(1, "Wing is required").max(5),
  number:      z.string().min(1, "Flat number is required").max(20),
  address:     z.string().optional(),
  areaSqft:    z.preprocess((val) => Number(val), z.number().int().positive("Area must be a positive number")),
  bhk:         z.enum(["1BHK", "2BHK", "3BHK", "4BHK", "PENTHOUSE"]).default("2BHK"),
  isOccupied:  z.boolean().optional(),
});

export const updateFlatSchema = z.object({
  address:    z.string().optional(),
  areaSqft:   z.preprocess((val) => (val === undefined ? undefined : Number(val)), z.number().int().positive().optional()),
  bhk:        z.enum(["1BHK", "2BHK", "3BHK", "4BHK", "PENTHOUSE"]).optional(),
  isOccupied: z.boolean().optional(),
});

export async function createFlat(req, res, next) {
  const { wing, number, address, areaSqft, bhk, isOccupied } = req.body;
  const societyId = req.societyId || 1;

  const exists = await flatModel.findByWingNumber(societyId, wing, number);
  if (exists) {
    const err = new Error("Flat already exists in this society");
    err.status = 409;
    err.title = "Conflict";
    return next(err);
  }

  const id = await flatModel.createFlat({ societyId, wing, number, address, areaSqft, bhk, isOccupied });

  req.auditEntity = { type: "flat", id, details: { wing, number, bhk, areaSqft } };
  return created(res, { id, wing, number, address, areaSqft, bhk, isOccupied }, "Flat created");
}

export async function updateFlat(req, res, next) {
  const id = Number(req.params.id);
  const fields = { ...req.body };

  const dbFields = {};
  if (fields.address !== undefined) dbFields.address = fields.address;
  if (fields.areaSqft !== undefined) dbFields.area_sqft = fields.areaSqft;
  if (fields.bhk !== undefined) dbFields.bhk = fields.bhk;
  if (fields.isOccupied !== undefined) dbFields.is_occupied = fields.isOccupied;

  if (Object.keys(dbFields).length === 0) {
    const err = new Error("No fields to update");
    err.status = 400;
    err.title = "Bad Request";
    return next(err);
  }

  await flatModel.updateFlat(id, dbFields);
  const updated = await flatModel.findById(id);
  if (!updated) {
    const err = new Error("Flat not found");
    err.status = 404;
    err.title = "Not Found";
    return next(err);
  }

  req.auditEntity = { type: "flat", id, details: dbFields };
  return success(res, updated, "Flat updated");
}

export async function deleteFlat(req, res, next) {
  const id = Number(req.params.id);

  const exists = await flatModel.findById(id);
  if (!exists) {
    const err = new Error("Flat not found");
    err.status = 404;
    err.title = "Not Found";
    return next(err);
  }

  await flatModel.deleteFlat(id);
  req.auditEntity = { type: "flat", id, details: { wing: exists.wing, number: exists.number } };
  return success(res, null, "Flat deleted");
}
