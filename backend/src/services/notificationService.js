import * as notificationModel from "../models/notificationModel.js";

export async function listUserNotifications({ societyId, user, limit = 20 }) {
  const role = user?.isSuperadmin ? "SUPERADMIN" : user?.role || "RESIDENT";
  return notificationModel.listNotifications({
    societyId,
    userId: user?.id,
    role,
    limit,
  });
}

export async function markNotificationRead(id, user) {
  return notificationModel.markAsRead(Number(id), user?.id);
}

export async function markAllNotificationsRead(societyId, user) {
  const role = user?.isSuperadmin ? "SUPERADMIN" : user?.role;
  return notificationModel.markAllAsRead(societyId, user?.id, role);
}

/**
 * Triggers notification when a resident submits a UPI payment with UTR.
 * Broadcast to Treasurers and Admins of the society.
 */
export async function notifyUpiSubmitted({ societyId, flatNumber, amount, utr, billId }) {
  try {
    await notificationModel.createNotification({
      societyId,
      role: "TREASURER",
      title: "New UPI UTR Submitted",
      detail: `${flatNumber || "A flat"} submitted ₹${amount} (UTR: ${utr})`,
      type: "UPI",
      link: "/bills",
    });
  } catch (err) {
    console.warn("[Notification] Failed creating UPI notification:", err.message);
  }
}

/**
 * Triggers notification when a vendor expense exceeds threshold and needs committee co-signing.
 * Broadcast to Committee members and Admins.
 */
export async function notifyExpenseRequiresApproval({ societyId, vendorName, amount, threshold, expenseId }) {
  try {
    await notificationModel.createNotification({
      societyId,
      role: "COMMITTEE",
      title: "Expense Pending Approval",
      detail: `${vendorName} ₹${amount} exceeds ₹${threshold} threshold`,
      type: "EXPENSE",
      link: "/expenses",
    });
  } catch (err) {
    console.warn("[Notification] Failed creating expense notification:", err.message);
  }
}

/**
 * Triggers notification when an AGM resolution poll is published.
 * Broadcast to all residents of the society.
 */
export async function notifyPollPublished({ societyId, title, pollId }) {
  try {
    await notificationModel.createNotification({
      societyId,
      role: "RESIDENT",
      title: "AGM Resolution Active",
      detail: `${title} is open for voting`,
      type: "POLL",
      link: "/governance",
    });
  } catch (err) {
    console.warn("[Notification] Failed creating poll notification:", err.message);
  }
}

/**
 * Triggers notification when a resident's payment is verified and reconciled.
 * Sent directly to the resident user.
 */
export async function notifyPaymentVerified({ societyId, userId, amount, billId, flatNumber }) {
  try {
    await notificationModel.createNotification({
      societyId,
      userId,
      role: "RESIDENT",
      title: "Payment Receipt Issued ✓",
      detail: `Your payment of ₹${amount} for ${flatNumber || `Bill #${billId}`} is verified and official receipt is ready`,
      type: "UPI",
      link: "/bills",
    });
  } catch (err) {
    console.warn("[Notification] Failed creating payment verified notification:", err.message);
  }
}
