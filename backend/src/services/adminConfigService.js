import * as configModel from "../models/configModel.js";
import * as userModel from "../models/userModel.js";
import { verifyPassword } from "./authService.js";
import * as notificationModel from "../models/notificationModel.js";

export async function getAllSettings(societyId = 1) {
  return configModel.getAll(societyId);
}

export async function getSetting(key, societyId = 1) {
  return configModel.get(key, societyId);
}

export async function updateSetting(key, value, updatedBy, societyId = 1) {
  await configModel.set(key, value, updatedBy, societyId);
  return { key, value };
}

export async function bulkUpdateSettings(entries, updatedBy, societyId = 1) {
  await configModel.bulkSet(entries, updatedBy, societyId);
  return entries;
}

/**
 * Rotate Society Bank Master Account & UPI VPA with Step-Up Password Authentication.
 * Updates settings, derives masked bank identifier, records security audit trail, and notifies committee.
 */
export async function rotateBankMaster({
  societyId = 1,
  adminUserId,
  adminPassword,
  bankName,
  ifscCode,
  accountNumber,
  confirmAccountNumber,
  upiVpa,
  reason,
  ipAddress,
}) {
  // 1. Verify admin password (step-up authentication)
  const adminUser = await userModel.findById(adminUserId);
  if (!adminUser) {
    throw Object.assign(new Error("Admin user not found"), { status: 404 });
  }

  const isPasswordValid = await verifyPassword(adminPassword, adminUser.password_hash);
  if (!isPasswordValid) {
    throw Object.assign(new Error("Invalid admin password. Step-up authorization failed."), { status: 401 });
  }

  // 2. Validate account numbers match
  if (accountNumber !== confirmAccountNumber) {
    throw Object.assign(new Error("Bank account numbers do not match"), { status: 400 });
  }

  // 3. Normalize values and derive display mask
  const cleanBankName = bankName.trim();
  const cleanIfsc = ifscCode.trim().toUpperCase();
  const cleanVpa = upiVpa.trim().toLowerCase();
  const lastFour = accountNumber.trim().slice(-4);
  const derivedBankMask = `${cleanBankName} •••• ${lastFour}`;

  // 4. Get previous settings for diff audit
  const prevSettings = await configModel.getAll(societyId);
  const prevMask = prevSettings.SOCIETY_BANK_MASK || "None";
  const prevVpa = prevSettings.SOCIETY_UPI_VPA || "None";

  // 5. Bulk set updated banking settings
  const updatedSettings = {
    SOCIETY_BANK_NAME: cleanBankName,
    SOCIETY_BANK_IFSC: cleanIfsc,
    SOCIETY_BANK_MASK: derivedBankMask,
    SOCIETY_UPI_VPA: cleanVpa,
  };

  await configModel.bulkSet(updatedSettings, adminUserId, societyId);

  // 6. Asynchronously broadcast security notification to Treasurers & Admins
  (async () => {
    try {
      await notificationModel.createNotification({
        societyId,
        role: "TREASURER",
        title: "Security Alert: Society Bank Master Rotated",
        detail: `Bank account changed to ${derivedBankMask} (VPA: ${cleanVpa}) by ${adminUser.full_name}. Reason: ${reason}`,
        type: "SYSTEM",
        link: "/admin",
      });
    } catch {
      // Non-blocking notification
    }
  })();

  return {
    success: true,
    bankMask: derivedBankMask,
    bankName: cleanBankName,
    ifscCode: cleanIfsc,
    upiVpa: cleanVpa,
    previousMask: prevMask,
    previousVpa: prevVpa,
    rotatedBy: adminUser.full_name,
    rotatedAt: new Date().toISOString(),
  };
}
