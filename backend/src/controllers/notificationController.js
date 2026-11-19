import * as notificationService from "../services/notificationService.js";
import { success } from "../utils/apiResponse.js";

export async function list(req, res) {
  const societyId = req.societyId || 1;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const notifications = await notificationService.listUserNotifications({
    societyId,
    user: req.user,
    limit,
  });
  return success(res, notifications);
}

export async function markRead(req, res) {
  const id = Number(req.params.id);
  await notificationService.markNotificationRead(id, req.user);
  return success(res, { id, read: true }, "Notification marked as read");
}

export async function markAllRead(req, res) {
  const societyId = req.societyId || 1;
  await notificationService.markAllNotificationsRead(societyId, req.user);
  return success(res, { markedAll: true }, "All notifications marked as read");
}
