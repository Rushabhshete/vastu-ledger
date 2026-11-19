import { z } from "zod";
import * as societyModel from "../models/societyModel.js";
import * as wingModel from "../models/wingModel.js";
import * as flatModel from "../models/flatModel.js";
import * as authService from "../services/authService.js";
import { success, fail } from "../utils/apiResponse.js";

export const createSocietySchema = z.object({
  name: z.string().min(3),
  slug: z.string().optional(),
  registrationNumber: z.string().min(3),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().default("Maharashtra"),
  pincode: z.string().min(5),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
});

export const createWingSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(1).max(10),
  totalFloors: z.number().int().min(1).max(100).default(1),
  hasElevator: z.boolean().default(true),
});

export const autoGenerateFlatsSchema = z.object({
  wingId: z.number().int().positive(),
  wingCode: z.string().min(1),
  startFloor: z.number().int().min(0).default(1),
  totalFloors: z.number().int().min(1).max(100).default(5),
  flatsPerFloor: z.number().int().min(1).max(50).default(4),
  defaultBhk: z.enum(["1BHK", "2BHK", "3BHK", "4BHK", "PENTHOUSE"]).default("2BHK"),
  defaultAreaSqft: z.number().positive().default(1100),
  numberPrefix: z.string().optional(),
});

export const singleFlatSchema = z.object({
  wingId: z.number().int().optional(),
  wing: z.string().min(1),
  floor: z.number().int().default(1),
  number: z.string().min(1), // alphanumeric, e.g. "A-101", "PH-01"
  address: z.string().optional(),
  areaSqft: z.number().positive().default(1000),
  bhk: z.enum(["1BHK", "2BHK", "3BHK", "4BHK", "PENTHOUSE"]).default("2BHK"),
  isOccupied: z.boolean().default(true),
  occupancyType: z.enum(["OWNER_OCCUPIED", "TENANT_OCCUPIED", "VACANT"]).default("OWNER_OCCUPIED"),
});

export async function listSocieties(req, res) {
  if (req.user?.isSuperadmin) {
    const list = await societyModel.listAll();
    return success(res, list);
  }
  const mySocieties = await authService.getUserSocieties(req.user.id);
  return success(res, mySocieties);
}

export async function getSociety(req, res) {
  const socId = Number(req.params.id);
  const society = await societyModel.findById(socId);
  if (!society) return fail(res, "Society not found", 404);
  return success(res, society);
}

export async function createSociety(req, res) {
  if (!req.user?.isSuperadmin) {
    return fail(res, "Only Platform SuperAdmin can onboard new housing societies", 403);
  }
  const id = await societyModel.create(req.body);
  const created = await societyModel.findById(id);
  return success(res, created, "Society created successfully with default settings", 201);
}

export async function updateSociety(req, res) {
  const socId = Number(req.params.id);
  if (!req.user?.isSuperadmin && req.societyRole !== "ADMIN") {
    return fail(res, "Forbidden", 403);
  }
  await societyModel.update(socId, req.body);
  const updated = await societyModel.findById(socId);
  return success(res, updated, "Society updated successfully");
}

export async function getTopology(req, res) {
  const socId = Number(req.params.id);
  const topology = await societyModel.getTopology(socId);
  if (!topology) return fail(res, "Society not found", 404);
  return success(res, topology);
}

// Wing Handlers
export async function listWings(req, res) {
  const socId = Number(req.params.id);
  const wings = await wingModel.listBySociety(socId);
  return success(res, wings);
}

export async function createWing(req, res) {
  const socId = Number(req.params.id);
  if (!req.user?.isSuperadmin && req.societyRole !== "ADMIN") {
    return fail(res, "Forbidden", 403);
  }
  const id = await wingModel.create({ ...req.body, societyId: socId });
  const wing = await wingModel.findById(id, socId);
  return success(res, wing, "Wing added successfully", 201);
}

export async function updateWing(req, res) {
  const socId = Number(req.params.id);
  const wingId = Number(req.params.wingId);
  if (!req.user?.isSuperadmin && req.societyRole !== "ADMIN") {
    return fail(res, "Forbidden", 403);
  }
  await wingModel.update(wingId, socId, req.body);
  const wing = await wingModel.findById(wingId, socId);
  return success(res, wing, "Wing updated successfully");
}

export async function deleteWing(req, res) {
  const socId = Number(req.params.id);
  const wingId = Number(req.params.wingId);
  if (!req.user?.isSuperadmin && req.societyRole !== "ADMIN") {
    return fail(res, "Forbidden", 403);
  }
  await wingModel.deleteWing(wingId, socId);
  return success(res, null, "Wing and its associated flats deleted successfully");
}

// Flat Handlers (Auto-Generate & Single Entity Alteration)
export async function autoGenerateFlats(req, res) {
  const socId = Number(req.params.id);
  if (!req.user?.isSuperadmin && req.societyRole !== "ADMIN") {
    return fail(res, "Forbidden", 403);
  }
  const result = await flatModel.bulkAutoGenerate({
    societyId: socId,
    ...req.body,
  });
  const allFlats = await flatModel.listFlats(socId, { wingId: req.body.wingId });
  return success(res, { ...result, flats: allFlats }, `Successfully generated ${result.insertedCount} flats`);
}

export async function listFlats(req, res) {
  const socId = Number(req.params.id);
  const flats = await flatModel.listFlats(socId, req.query);
  return success(res, flats);
}

export async function createFlat(req, res) {
  const socId = Number(req.params.id);
  if (!req.user?.isSuperadmin && req.societyRole !== "ADMIN") {
    return fail(res, "Forbidden", 403);
  }
  const id = await flatModel.createFlat({ societyId: socId, ...req.body });
  const flat = await flatModel.findById(id, socId);
  return success(res, flat, "Flat created successfully", 201);
}

export async function updateFlat(req, res) {
  const socId = Number(req.params.id);
  const flatId = Number(req.params.flatId);
  if (!req.user?.isSuperadmin && req.societyRole !== "ADMIN") {
    return fail(res, "Forbidden", 403);
  }
  const payload = { ...req.body };
  if (payload.areaSqft !== undefined && payload.area_sqft === undefined) payload.area_sqft = payload.areaSqft;
  if (payload.isOccupied !== undefined && payload.is_occupied === undefined) payload.is_occupied = payload.isOccupied;
  if (payload.occupancyType !== undefined && payload.occupancy_type === undefined) payload.occupancy_type = payload.occupancyType;
  if (payload.wingId !== undefined && payload.wing_id === undefined) payload.wing_id = payload.wingId;

  await flatModel.updateFlat(flatId, socId, payload);
  const updated = await flatModel.findById(flatId, socId);
  return success(res, updated, "Flat altered successfully");
}

export async function deleteFlat(req, res) {
  const socId = Number(req.params.id);
  const flatId = Number(req.params.flatId);
  if (!req.user?.isSuperadmin && req.societyRole !== "ADMIN") {
    return fail(res, "Forbidden", 403);
  }
  await flatModel.deleteFlat(flatId, socId);
  return success(res, null, "Flat removed successfully");
}
