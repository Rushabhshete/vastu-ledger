import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import pool from "../config/db.js";
import security from "../config/security.js";

describe("Killer Feature 3: Resident Helpdesk & Maintenance Ticketing Engine", () => {
  let resident1Token;
  let resident2Token;
  let committeeToken;
  let createdTicketId;

  beforeAll(async () => {
    // Rajesh Kulkarni - Flat 1, Society 1
    resident1Token = jwt.sign(
      { sub: 5, email: "rajesh@vastuledger.in", role: "RESIDENT", societyId: 1, flatId: 1, fullName: "Rajesh Kulkarni" },
      security.jwt.accessSecret,
      { expiresIn: "15m" }
    );

    // Resident 2 - Flat 2, Society 1
    resident2Token = jwt.sign(
      { sub: 8, email: "other@vastuledger.in", role: "RESIDENT", societyId: 1, flatId: 2, fullName: "Pooja Mehta" },
      security.jwt.accessSecret,
      { expiresIn: "15m" }
    );

    // Committee Member - Sanjay Joshi
    committeeToken = jwt.sign(
      { sub: 4, email: "committee1@vastuledger.in", role: "COMMITTEE", societyId: 1, fullName: "Sanjay Joshi" },
      security.jwt.accessSecret,
      { expiresIn: "15m" }
    );
  });

  afterAll(async () => {
    if (createdTicketId) {
      await pool.execute("DELETE FROM helpdesk_ticket_comments WHERE ticket_id = ?", [createdTicketId]);
      await pool.execute("DELETE FROM helpdesk_tickets WHERE id = ?", [createdTicketId]);
    }
    await pool.execute("DELETE FROM notifications WHERE type = 'TICKET' AND detail LIKE '%bathroom%'");
  });

  it("should allow a resident to submit a maintenance ticket with category and priority", async () => {
    const payload = {
      title: "Severe water pipe leakage in master bathroom",
      description: "Water leaking under the washbasin sink, causing dampness on floor tiles.",
      category: "PLUMBING",
      priority: "HIGH",
      scopeType: "PRIVATE_FLAT",
    };

    const res = await request(app)
      .post("/api/helpdesk")
      .set("Authorization", `Bearer ${resident1Token}`)
      .set("X-Society-Id", "1")
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();

    createdTicketId = res.body.data.id;
    expect(res.body.data.title).toBe(payload.title);
    expect(res.body.data.status).toBe("OPEN");
    expect(res.body.data.flat_id).toBe(1);
    expect(res.body.data.category).toBe("PLUMBING");
    expect(res.body.data.priority).toBe("HIGH");

    // Verify admin/management notification was created
    const [notifs] = await pool.execute(
      "SELECT * FROM notifications WHERE type = 'TICKET' AND detail LIKE ? LIMIT 1",
      [`%${payload.title}%`]
    );
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs[0].role).toBe("ADMIN");
  });

  it("should list society tickets with telemetry stats for committee members", async () => {
    const res = await request(app)
      .get("/api/helpdesk")
      .set("Authorization", `Bearer ${committeeToken}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tickets).toBeDefined();
    expect(res.body.data.stats).toBeDefined();
    expect(Number(res.body.data.stats.total)).toBeGreaterThan(0);

    const ticketInList = res.body.data.tickets.find((t) => t.id === createdTicketId);
    expect(ticketInList).toBeDefined();
    expect(ticketInList.creator_name).toBeDefined();
  });

  it("should prevent a different resident from accessing another resident's private ticket (403 Forbidden)", async () => {
    const res = await request(app)
      .get(`/api/helpdesk/${createdTicketId}`)
      .set("Authorization", `Bearer ${resident2Token}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(403);
  });

  it("should allow committee to assign technician, record estimated cost, and set status to IN_PROGRESS", async () => {
    const updatePayload = {
      status: "IN_PROGRESS",
      assignedTo: "Ramesh Sharma (Society Plumber - 9820123456)",
      estimatedCost: 1500,
    };

    const res = await request(app)
      .put(`/api/helpdesk/${createdTicketId}`)
      .set("Authorization", `Bearer ${committeeToken}`)
      .set("X-Society-Id", "1")
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("IN_PROGRESS");
    expect(res.body.data.assigned_to).toContain("Ramesh Sharma");
    expect(Number(res.body.data.estimated_cost)).toBe(1500);

    // Add progress comment
    const commentRes = await request(app)
      .post(`/api/helpdesk/${createdTicketId}/comments`)
      .set("Authorization", `Bearer ${committeeToken}`)
      .set("X-Society-Id", "1")
      .send({ comment: "Plumber inspected the washer and is replacing the coupling today." });

    expect(commentRes.status).toBe(201);
  });

  it("should allow committee to resolve ticket and resident to close with 5-star rating", async () => {
    // 1. Committee marks resolved
    const resolveRes = await request(app)
      .put(`/api/helpdesk/${createdTicketId}`)
      .set("Authorization", `Bearer ${committeeToken}`)
      .set("X-Society-Id", "1")
      .send({
        status: "RESOLVED",
        resolutionNotes: "Coupling and washer replaced. No further seepage observed.",
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe("RESOLVED");
    expect(resolveRes.body.data.resolved_at).toBeDefined();

    // 2. Resident reviews & closes ticket with 5-star rating
    const closeRes = await request(app)
      .post(`/api/helpdesk/${createdTicketId}/close`)
      .set("Authorization", `Bearer ${resident1Token}`)
      .set("X-Society-Id", "1")
      .send({
        rating: 5,
        feedback: "Fixed promptly within 2 hours. Very professional work by the society plumber!",
      });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.status).toBe("CLOSED");
    expect(closeRes.body.data.rating).toBe(5);
    expect(closeRes.body.data.feedback).toContain("Fixed promptly");
  });
});
