import * as ticketModel from "../models/ticketModel.js";
import * as flatModel from "../models/flatModel.js";
import * as notificationModel from "../models/notificationModel.js";

/**
 * Creates a new helpdesk maintenance ticket and notifies society management.
 */
export async function createTicket({
  societyId,
  user,
  title,
  description,
  category = "GENERAL",
  priority = "MEDIUM",
  scopeType = "PRIVATE_FLAT",
  photoUrl = null,
  flatId = null,
}) {
  let targetFlatId = flatId;
  if (user.role === "RESIDENT" && !targetFlatId) {
    targetFlatId = user.flatId;
  }

  const ticketId = await ticketModel.createTicket({
    societyId,
    flatId: targetFlatId,
    createdBy: user.id,
    title,
    description,
    category,
    priority,
    scopeType,
    photoUrl,
  });

  // Asynchronously notify management committee & admins
  (async () => {
    try {
      const flat = targetFlatId ? await flatModel.findById(targetFlatId) : null;
      const flatLabel = flat ? `Flat ${flat.wing}-${flat.number}` : "Common Area";
      const emergencyPrefix = priority === "EMERGENCY" ? "🚨 EMERGENCY: " : "";

      await notificationModel.createNotification({
        societyId,
        role: "ADMIN",
        title: `${emergencyPrefix}New Helpdesk Ticket #${ticketId}`,
        detail: `${user.fullName || "A resident"} logged a ${priority} ticket for ${flatLabel}: "${title}" (${category})`,
        type: "TICKET",
        link: `/helpdesk?ticketId=${ticketId}`,
      });
    } catch {
      // Non-blocking notification
    }
  })();

  return ticketModel.findTicketById(ticketId, societyId);
}

/**
 * Lists tickets scoped to the user's role and society.
 */
export async function listTickets({
  societyId,
  user,
  status,
  category,
  priority,
  search,
  filterMode = "all", // "all", "my", "community"
  limit = 50,
  offset = 0,
}) {
  let targetFlatId = null;

  if (user.role === "RESIDENT") {
    if (filterMode === "community") {
      // Show common area tickets
    } else {
      // Default to personal flat tickets
      targetFlatId = user.flatId;
    }
  }

  const [tickets, stats] = await Promise.all([
    ticketModel.listTickets({
      societyId,
      flatId: targetFlatId,
      status,
      category,
      priority,
      search,
      limit,
      offset,
    }),
    ticketModel.getTicketStats(societyId),
  ]);

  return { tickets, stats };
}

/**
 * Retrieves full ticket detail with comment history.
 */
export async function getTicketDetails(ticketId, societyId, user) {
  const ticket = await ticketModel.findTicketById(ticketId, societyId);
  if (!ticket) {
    throw Object.assign(new Error("Helpdesk ticket not found"), { status: 404 });
  }

  // Resident access control: can only view own flat's tickets or common area issues
  if (user.role === "RESIDENT" && ticket.scope_type === "PRIVATE_FLAT" && ticket.created_by !== user.id) {
    if (ticket.flat_id !== user.flatId) {
      throw Object.assign(new Error("Forbidden — you cannot access tickets from other flats"), { status: 403 });
    }
  }

  const includeInternal = user.role === "ADMIN" || user.role === "COMMITTEE" || user.isSuperadmin;
  const comments = await ticketModel.getComments(ticketId, includeInternal);

  return { ticket, comments };
}

/**
 * Updates ticket progress (assign vendor, update status, record resolution notes & cost).
 */
export async function updateTicketProgress(ticketId, societyId, user, fields = {}) {
  const ticket = await ticketModel.findTicketById(ticketId, societyId);
  if (!ticket) {
    throw Object.assign(new Error("Helpdesk ticket not found"), { status: 404 });
  }

  // Resident can only close or add feedback, not change assignment or cost
  if (user.role === "RESIDENT" && fields.status && !["CLOSED", "OPEN"].includes(fields.status)) {
    throw Object.assign(new Error("Forbidden — residents can only reopen or close completed tickets"), { status: 403 });
  }

  const updatePayload = { ...fields };
  if (fields.status === "RESOLVED") {
    updatePayload.resolved_at = new Date();
  }

  await ticketModel.updateTicket(ticketId, societyId, updatePayload);

  // Notify ticket creator of status change
  if (fields.status && fields.status !== ticket.status && ticket.created_by) {
    (async () => {
      try {
        await notificationModel.createNotification({
          societyId,
          userId: ticket.created_by,
          title: `Ticket #${ticketId} Updated: ${fields.status}`,
          detail: `Your ${ticket.category} ticket "${ticket.title}" has been updated to ${fields.status}.`,
          type: "TICKET",
          link: `/helpdesk?ticketId=${ticketId}`,
        });
      } catch {
        // Non-blocking notification
      }
    })();
  }

  return ticketModel.findTicketById(ticketId, societyId);
}

/**
 * Resident rates & closes a resolved ticket.
 */
export async function closeAndRateTicket(ticketId, societyId, user, { rating, feedback }) {
  const ticket = await ticketModel.findTicketById(ticketId, societyId);
  if (!ticket) {
    throw Object.assign(new Error("Helpdesk ticket not found"), { status: 404 });
  }

  if (user.role === "RESIDENT" && ticket.created_by !== user.id && ticket.flat_id !== user.flatId) {
    throw Object.assign(new Error("Forbidden — you can only close your own tickets"), { status: 403 });
  }

  await ticketModel.updateTicket(ticketId, societyId, {
    status: "CLOSED",
    rating: Number(rating) || 5,
    feedback: feedback || null,
  });

  return ticketModel.findTicketById(ticketId, societyId);
}

/**
 * Appends a comment or update to a ticket.
 */
export async function addComment(ticketId, societyId, user, { comment, isInternal = false }) {
  const ticket = await ticketModel.findTicketById(ticketId, societyId);
  if (!ticket) {
    throw Object.assign(new Error("Helpdesk ticket not found"), { status: 404 });
  }

  const internalAllowed = user.role === "ADMIN" || user.role === "COMMITTEE" || user.isSuperadmin;
  const flagInternal = internalAllowed ? Boolean(isInternal) : false;

  const commentId = await ticketModel.addComment({
    ticketId,
    userId: user.id,
    comment,
    isInternal: flagInternal,
  });

  return { id: commentId, ticketId, comment, isInternal: flagInternal };
}
