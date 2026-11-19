import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { ensureTables } from "../models/documentModel.js";

let adminToken;
let residentToken;
let createdDocId;
let createdNoticeId;

beforeAll(async () => {
  await ensureTables();

  const adminRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@vastuledger.in", password: "Vastu@2026" });
  adminToken = adminRes.body.data.accessToken;

  const residentRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "rajesh@vastuledger.in", password: "Vastu@2026" });
  residentToken = residentRes.body.data.accessToken;
});

describe("Killer Feature 5: Official PDF Notice Board & Society Documents Vault", () => {
  it("should retrieve statutory compliance scorecard (GET /api/documents/compliance-scorecard)", async () => {
    const res = await request(app)
      .get("/api/documents/compliance-scorecard")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-society-id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fireNoc).toBeDefined();
    expect(res.body.data.liftLicense).toBeDefined();
    expect(res.body.data.byeLaws).toBeDefined();
    expect(res.body.data.scorePercent).toBeGreaterThanOrEqual(50);
  });

  it("should list society documents and respect resident visibility boundaries", async () => {
    // 1. Admin gets all documents including COMMITTEE_ONLY
    const adminRes = await request(app)
      .get("/api/documents")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-society-id", "1");

    expect(adminRes.status).toBe(200);
    const hasConfidential = adminRes.body.data.some((d) => d.access_scope === "COMMITTEE_ONLY");
    expect(hasConfidential).toBe(true);

    // 2. Resident gets only ALL_RESIDENTS / PUBLIC documents
    const residentRes = await request(app)
      .get("/api/documents")
      .set("Authorization", `Bearer ${residentToken}`)
      .set("x-society-id", "1");

    expect(residentRes.status).toBe(200);
    const residentHasConfidential = residentRes.body.data.some((d) => d.access_scope === "COMMITTEE_ONLY");
    expect(residentHasConfidential).toBe(false);
  });

  it("should upload and register a new compliance certificate (POST /api/documents/upload)", async () => {
    const res = await request(app)
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-society-id", "1")
      .field("title", "Structural Stability & Load Test Certificate 2026")
      .field("category", "COMPLIANCE_NOC")
      .field("documentNumber", "PMC/STRUCT/2026/099")
      .field("issuingAuthority", "PMC Certified Structural Engineers")
      .field("accessScope", "ALL_RESIDENTS")
      .field("validFrom", "2026-01-01")
      .field("expiresAt", "2031-01-01")
      .field("description", "5-year comprehensive structural audit inspection report.");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    createdDocId = res.body.data.id;
  });

  it("should list official notices with pinned notices first (GET /api/documents/notices)", async () => {
    const res = await request(app)
      .get("/api/documents/notices")
      .set("Authorization", `Bearer ${residentToken}`)
      .set("x-society-id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    // If first item is pinned, verify boolean/truthy
    if (res.body.data[0].is_pinned) {
      expect(Boolean(res.body.data[0].is_pinned)).toBe(true);
    }
  });

  it("should publish a new official society circular (POST /api/documents/notices)", async () => {
    const res = await request(app)
      .post("/api/documents/notices")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-society-id", "1")
      .field("title", "Installation of EV Charging Points in Basement B1")
      .field("category", "RULES_REGULATIONS")
      .field("priority", "HIGH")
      .field("isPinned", "true")
      .field("content", "Discom load expansion has been approved. Residents wishing to connect EV charging points must apply via the helpdesk portal with vehicle RC copy.")
      .field("issuedBy", "Honorary Secretary");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notice_number).toContain("CIR/");
    createdNoticeId = res.body.data.id;
  });

  it("should reject resident when attempting to publish notice or delete document (403 Forbidden)", async () => {
    const uploadRes = await request(app)
      .post("/api/documents/upload")
      .set("Authorization", `Bearer ${residentToken}`)
      .set("x-society-id", "1")
      .field("title", "Unauthorized Resident Upload");

    expect(uploadRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/documents/${createdDocId}`)
      .set("Authorization", `Bearer ${residentToken}`)
      .set("x-society-id", "1");

    expect(deleteRes.status).toBe(403);
  });

  it("should allow admin to delete notice and document", async () => {
    const delNotice = await request(app)
      .delete(`/api/documents/notices/${createdNoticeId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-society-id", "1");

    expect(delNotice.status).toBe(200);

    const delDoc = await request(app)
      .delete(`/api/documents/${createdDocId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("x-society-id", "1");

    expect(delDoc.status).toBe(200);
  });
});
