import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import pool from "../config/db.js";
import { ensureTable } from "../models/whatsappLogModel.js";

let adminToken;
let residentToken;
let demoBillId;

beforeAll(async () => {
  await ensureTable();

  // Admin Login
  const adminRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@vastuledger.in", password: "Vastu@2026" });
  adminToken = adminRes.body.data.accessToken;

  // Resident Login
  const residentRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "rajesh@vastuledger.in", password: "Vastu@2026" });
  residentToken = residentRes.body.data.accessToken;

  // Find or insert a pending test bill
  const [bills] = await pool.execute(
    "SELECT id FROM maintenance_bills WHERE society_id = 1 AND status = 'PENDING' LIMIT 1"
  );
  if (bills.length) {
    demoBillId = bills[0].id;
  } else {
    const [ins] = await pool.execute(
      `INSERT INTO maintenance_bills 
       (society_id, flat_id, billing_cycle, base_amount, sinking_fund, repair_fund, non_occupancy, late_fee, total_amount, status, due_date)
       VALUES (1, 1, '2026-06', 4500, 500, 300, 0, 0, 5300, 'PENDING', DATE_ADD(CURDATE(), INTERVAL 15 DAY))`
    );
    demoBillId = ins.insertId;
  }
});

describe("Killer Feature 2: WhatsApp Notification Bot & Cloud Messaging Hub", () => {
  it("should verify Meta Webhook handshake challenge successfully (GET /api/whatsapp/webhook)", async () => {
    const res = await request(app)
      .get("/api/whatsapp/webhook")
      .query({
        "hub.mode": "subscribe",
        "hub.verify_token": "vastu_ledger_whatsapp_verify_secret_2026",
        "hub.challenge": "CHALLENGE_ACCEPTED_7788",
      });

    expect(res.status).toBe(200);
    expect(res.text).toBe("CHALLENGE_ACCEPTED_7788");
  });

  it("should reject Meta Webhook handshake when verify_token is invalid", async () => {
    const res = await request(app)
      .get("/api/whatsapp/webhook")
      .query({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong_unauthorized_token",
        "hub.challenge": "CHALLENGE_ACCEPTED_7788",
      });

    expect(res.status).toBe(403);
  });

  it("should 1-click dispatch an official maintenance bill notification to resident WhatsApp (POST /api/whatsapp/send-bill/:id)", async () => {
    const res = await request(app)
      .post(`/api/whatsapp/send-bill/${demoBillId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-society-id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("DELIVERED");
    expect(res.body.data.recipientPhone).toBeDefined();
    expect(res.body.data.externalMessageId).toContain("wamid.");
  });

  it("should batch dispatch due date reminders to all unpaid flats (POST /api/whatsapp/batch-reminders)", async () => {
    const res = await request(app)
      .post("/api/whatsapp/batch-reminders")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-society-id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sentCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.data.dispatchedLogs)).toBe(true);
  });

  it("should broadcast an emergency notice to all registered resident WhatsApp numbers (POST /api/whatsapp/broadcast)", async () => {
    const res = await request(app)
      .post("/api/whatsapp/broadcast")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-society-id", "1")
      .send({
        title: "Overhead Water Tank Cleaning Notice",
        message: "Water supply will be suspended tomorrow from 10:00 AM to 3:00 PM for deep cleaning. Please store water in advance.",
        urgency: "HIGH",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sentCount).toBeGreaterThanOrEqual(1);
  });

  it("should retrieve aggregated delivery stats and activity logs (GET /api/whatsapp/stats & /logs)", async () => {
    const statsRes = await request(app)
      .get("/api/whatsapp/stats")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-society-id", "1");

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.success).toBe(true);
    expect(statsRes.body.data.total).toBeGreaterThan(0);
    expect(statsRes.body.data.deliveryRate).toBeGreaterThanOrEqual(0);

    const logsRes = await request(app)
      .get("/api/whatsapp/logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-society-id", "1");

    expect(logsRes.status).toBe(200);
    expect(logsRes.body.success).toBe(true);
    expect(Array.isArray(logsRes.body.data)).toBe(true);
    expect(logsRes.body.data.length).toBeGreaterThan(0);
  });

  it("should process inbound Meta webhook delivery status updates (POST /api/whatsapp/webhook)", async () => {
    const webhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_12345",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                statuses: [
                  {
                    id: "wamid.TEST_MESSAGE_ID_123",
                    status: "read",
                    timestamp: String(Math.floor(Date.now() / 1000)),
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const res = await request(app)
      .post("/api/whatsapp/webhook")
      .send(webhookPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should prevent RESIDENT from accessing WhatsApp bot management (403 Forbidden)", async () => {
    const res = await request(app)
      .post("/api/whatsapp/batch-reminders")
      .set("Authorization", `Bearer ${residentToken}`)
      .set("x-society-id", "1");

    expect(res.status).toBe(403);
  });
});
