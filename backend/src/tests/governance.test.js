import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import security from "../config/security.js";
import * as pollModel from "../models/pollModel.js";

describe("AGM Digital Governance, Quorum & 1-Vote-Per-Flat Engine", () => {
  const residentFlat1Token = jwt.sign(
    { sub: 5, email: "rajesh@vastuledger.in", role: "RESIDENT", flatId: 1, societyId: 1 },
    security.jwt.accessSecret,
    { expiresIn: "15m" }
  );

  const adminNoFlatToken = jwt.sign(
    { sub: 1, email: "admin@vastuledger.in", role: "ADMIN", flatId: null, societyId: 1 },
    security.jwt.accessSecret,
    { expiresIn: "15m" }
  );

  it("should list polls with statutory quorum metrics and tally breakdown", async () => {
    vi.spyOn(pollModel, "listPolls").mockResolvedValue([
      {
        id: 1,
        society_id: 1,
        title: "Upgrade CCTV Security System",
        description: "Vote on installing AI-enabled CCTV cameras",
        options: ["YES", "NO", "ABSTAIN"],
        start_date: "2026-03-01T00:00:00.000Z",
        end_date: "2026-03-07T23:59:59.000Z",
        totalFlats: 10,
        totalVotes: 3,
        tally: { YES: 2, NO: 1, ABSTAIN: 0 },
        percentages: { YES: 66.7, NO: 33.3, ABSTAIN: 0 },
        quorumPct: 60,
        quorumRequired: 6,
        quorumMet: false,
        turnoutPct: 30,
        status: "ACTIVE",
        outcome: "IN_PROGRESS",
        hasVoted: false,
      },
    ]);

    const res = await request(app)
      .get("/api/governance/polls")
      .set("Authorization", `Bearer ${residentFlat1Token}`)
      .set("X-Society-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].totalFlats).toBe(10);
    expect(res.body.data[0].quorumRequired).toBe(6);
    expect(res.body.data[0].tally.YES).toBe(2);
  });

  it("should reject vote from user without an assigned flat", async () => {
    const res = await request(app)
      .post("/api/governance/polls/1/vote")
      .set("Authorization", `Bearer ${adminNoFlatToken}`)
      .set("X-Society-Id", "1")
      .send({ choice: "YES" });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("Only registered flat owners/occupants can vote");
  });

  it("should reject duplicate ballot from the same flat (1-Flat-1-Vote Rule)", async () => {
    vi.spyOn(pollModel, "findPollById").mockResolvedValue({
      id: 1,
      is_active: 1,
      start_date: "2026-01-01T00:00:00.000Z",
      end_date: "2026-12-31T23:59:59.000Z",
      options: ["YES", "NO", "ABSTAIN"],
    });

    vi.spyOn(pollModel, "hasVoted").mockResolvedValue(true);

    const res = await request(app)
      .post("/api/governance/polls/1/vote")
      .set("Authorization", `Bearer ${residentFlat1Token}`)
      .set("X-Society-Id", "1")
      .send({ choice: "YES" });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("1-Flat-1-Vote enforced");
  });

  it("should accept valid vote from registered flat owner and record ballot", async () => {
    vi.spyOn(pollModel, "findPollById").mockResolvedValue({
      id: 1,
      is_active: 1,
      start_date: "2026-01-01T00:00:00.000Z",
      end_date: "2026-12-31T23:59:59.000Z",
      options: ["YES", "NO", "ABSTAIN"],
      hasVoted: true,
      userVote: "YES",
    });

    vi.spyOn(pollModel, "hasVoted").mockResolvedValue(false);
    vi.spyOn(pollModel, "castVote").mockResolvedValue(101);

    const res = await request(app)
      .post("/api/governance/polls/1/vote")
      .set("Authorization", `Bearer ${residentFlat1Token}`)
      .set("X-Society-Id", "1")
      .send({ choice: "YES" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("Vote recorded");
  });
});
