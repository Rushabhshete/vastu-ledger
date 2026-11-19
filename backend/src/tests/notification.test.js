import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import security from "../config/security.js";
import * as notificationModel from "../models/notificationModel.js";
import * as notificationService from "../services/notificationService.js";

describe("Real In-App & Multi-Tenant Notification Engine", () => {
  const adminToken = jwt.sign(
    { sub: 1, email: "admin@vastuledger.in", role: "ADMIN", societyId: 1 },
    security.jwt.accessSecret,
    { expiresIn: "15m" }
  );

  it("should fetch user notifications scoped to society and role", async () => {
    vi.spyOn(notificationModel, "listNotifications").mockResolvedValue([
      {
        id: 101,
        society_id: 1,
        user_id: 1,
        role: "ADMIN",
        title: "New UPI UTR Submitted",
        detail: "Flat A-204 submitted ₹9,488 (UTR: 412306789023)",
        type: "UPI",
        link: "/bills",
        is_read: 0,
        created_at: new Date().toISOString(),
      },
    ]);

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("New UPI UTR Submitted");
  });

  it("should mark a notification as read", async () => {
    vi.spyOn(notificationModel, "markAsRead").mockResolvedValue(true);

    const res = await request(app)
      .patch("/api/notifications/101/read")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.read).toBe(true);
  });

  it("should mark all notifications as read for current user", async () => {
    vi.spyOn(notificationModel, "markAllAsRead").mockResolvedValue(true);

    const res = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.markedAll).toBe(true);
  });
});
