import { z } from "zod";
import * as pollModel from "../models/pollModel.js";
import * as reportService from "../services/reportService.js";
import { notifyPollPublished } from "../services/notificationService.js";
import { success, created, fail } from "../utils/apiResponse.js";

export const createPollSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  options: z.array(z.string()).min(2),
  startDate: z.string(),
  endDate: z.string(),
});

export const castVoteSchema = z.object({
  choice: z.string().min(1),
});

export async function listPolls(req, res) {
  const societyId = req.societyId || 1;
  const userFlatId = req.flatId || req.user?.flatId || null;
  const polls = await pollModel.listPolls(societyId, userFlatId);
  return success(res, polls);
}

export async function getPoll(req, res) {
  const societyId = req.societyId || 1;
  const userFlatId = req.flatId || req.user?.flatId || null;
  const poll = await pollModel.findPollById(Number(req.params.id), societyId, userFlatId);
  if (!poll) return fail(res, "Poll not found", 404);
  return success(res, poll);
}

export async function createPoll(req, res) {
  const societyId = req.societyId || 1;
  const id = await pollModel.createPoll({ ...req.body, societyId, createdBy: req.user.id });
  notifyPollPublished({ societyId, title: req.body.title, pollId: id });
  return created(res, { pollId: id });
}

export async function castVote(req, res) {
  const pollId = Number(req.params.id);
  const societyId = req.societyId || 1;
  const flatId = req.flatId || req.user?.flatId;

  if (!flatId) {
    return fail(res, "Only registered flat owners/occupants can vote", 403);
  }

  const poll = await pollModel.findPollById(pollId, societyId, flatId);
  if (!poll) return fail(res, "Poll not found", 404);
  if (!poll.is_active) return fail(res, "Poll is closed", 400);

  const now = new Date();
  if (now < new Date(poll.start_date) || now > new Date(poll.end_date)) {
    return fail(res, "Voting window is not active", 400);
  }

  // Validate choice is one of the valid options
  let opts = poll.options;
  if (typeof opts === "string") {
    try {
      opts = JSON.parse(opts);
    } catch {
      opts = ["YES", "NO", "ABSTAIN"];
    }
  }
  if (Array.isArray(opts) && !opts.includes(req.body.choice)) {
    return fail(res, `Invalid choice '${req.body.choice}'. Options: ${opts.join(", ")}`, 400);
  }

  const already = await pollModel.hasVoted(pollId, flatId);
  if (already) {
    return fail(res, "This flat has already voted on this resolution (1-Flat-1-Vote enforced)", 409);
  }

  await pollModel.castVote(pollId, req.user.id, flatId, req.body.choice);
  const updatedPoll = await pollModel.findPollById(pollId, societyId, flatId);
  return created(res, updatedPoll, "Vote recorded successfully");
}

export async function getAgmPackage(req, res) {
  const societyId = req.societyId || 1;
  const pack = await reportService.getAgmFinancialPack(societyId);
  return success(res, pack);
}
