import { z } from "zod";
import * as ticketService from "../services/ticketService.js";
import { success, created, fail } from "../utils/apiResponse.js";

export const createTicketSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(5),
  category: z
    .enum([
      "PLUMBING",
      "ELECTRICAL",
      "LIFT_ELEVATOR",
      "SECURITY",
      "CIVIL_LEAKAGE",
      "HOUSEKEEPING",
      "GENERAL",
    ])
    .default("GENERAL"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]).default("MEDIUM"),
  scopeType: z.enum(["PRIVATE_FLAT", "COMMON_AREA"]).default("PRIVATE_FLAT"),
  flatId: z.coerce.number().int().positive().nullable().optional(),
});

export const updateTicketSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  assignedTo: z.string().max(255).nullable().optional(),
  estimatedCost: z.coerce.number().nonnegative().optional(),
  resolutionNotes: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]).optional(),
  category: z
    .enum([
      "PLUMBING",
      "ELECTRICAL",
      "LIFT_ELEVATOR",
      "SECURITY",
      "CIVIL_LEAKAGE",
      "HOUSEKEEPING",
      "GENERAL",
    ])
    .optional(),
});

export const closeTicketSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).default(5),
  feedback: z.string().max(1000).nullable().optional(),
});

export const addCommentSchema = z.object({
  comment: z.string().min(1),
  isInternal: z.boolean().default(false),
});

export async function createTicket(req, res) {
  const societyId = req.societyId || 1;
  const photoUrl = req.file ? `/uploads/receipts/${req.file.filename}` : null;

  const ticket = await ticketService.createTicket({
    societyId,
    user: req.user,
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    priority: req.body.priority,
    scopeType: req.body.scopeType,
    photoUrl,
    flatId: req.body.flatId,
  });

  return created(res, ticket, "Helpdesk ticket created successfully");
}

export async function listTickets(req, res) {
  const societyId = req.societyId || 1;
  const { status, category, priority, search, filterMode, limit, offset } = req.query;

  const data = await ticketService.listTickets({
    societyId,
    user: req.user,
    status,
    category,
    priority,
    search,
    filterMode,
    limit,
    offset,
  });

  return success(res, data);
}

export async function getTicketDetails(req, res) {
  const societyId = req.societyId || 1;
  const ticketId = Number(req.params.id);

  const data = await ticketService.getTicketDetails(ticketId, societyId, req.user);
  return success(res, data);
}

export async function updateTicketProgress(req, res) {
  const societyId = req.societyId || 1;
  const ticketId = Number(req.params.id);

  const updated = await ticketService.updateTicketProgress(
    ticketId,
    societyId,
    req.user,
    req.body
  );
  return success(res, updated, "Ticket progress updated successfully");
}

export async function closeAndRateTicket(req, res) {
  const societyId = req.societyId || 1;
  const ticketId = Number(req.params.id);

  const closed = await ticketService.closeAndRateTicket(
    ticketId,
    societyId,
    req.user,
    req.body
  );
  return success(res, closed, "Ticket closed and feedback recorded");
}

export async function addComment(req, res) {
  const societyId = req.societyId || 1;
  const ticketId = Number(req.params.id);

  const comment = await ticketService.addComment(
    ticketId,
    societyId,
    req.user,
    req.body
  );
  return created(res, comment, "Comment added successfully");
}
