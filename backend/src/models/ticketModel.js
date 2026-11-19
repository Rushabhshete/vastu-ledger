import pool from "../config/db.js";

/**
 * Creates a new helpdesk ticket.
 */
export async function createTicket({
  societyId,
  flatId = null,
  createdBy,
  title,
  description,
  category = "GENERAL",
  priority = "MEDIUM",
  scopeType = "PRIVATE_FLAT",
  photoUrl = null,
}) {
  const [result] = await pool.execute(
    `INSERT INTO helpdesk_tickets
       (society_id, flat_id, created_by, title, description, category, priority, status, scope_type, photo_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`,
    [societyId, flatId, createdBy, title, description, category, priority, scopeType, photoUrl]
  );
  return result.insertId;
}

/**
 * Finds a single ticket by ID with joined creator & flat details.
 */
export async function findTicketById(id, societyId = null) {
  let sql = `
    SELECT t.*,
           f.wing, f.number AS flat_number, f.bhk,
           u.full_name AS creator_name, u.email AS creator_email, u.role AS creator_role
    FROM helpdesk_tickets t
    LEFT JOIN flats f ON t.flat_id = f.id
    JOIN users u ON t.created_by = u.id
    WHERE t.id = ?
  `;
  const params = [id];
  if (societyId) {
    sql += " AND t.society_id = ?";
    params.push(societyId);
  }

  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

/**
 * Lists tickets with optional filters (status, category, priority, flat).
 */
export async function listTickets({
  societyId,
  flatId = null,
  status = null,
  category = null,
  priority = null,
  search = null,
  limit = 50,
  offset = 0,
}) {
  let sql = `
    SELECT t.*,
           f.wing, f.number AS flat_number, f.bhk,
           u.full_name AS creator_name, u.email AS creator_email,
           (SELECT COUNT(*) FROM helpdesk_ticket_comments c WHERE c.ticket_id = t.id) AS comments_count
    FROM helpdesk_tickets t
    LEFT JOIN flats f ON t.flat_id = f.id
    JOIN users u ON t.created_by = u.id
    WHERE t.society_id = ?
  `;
  const params = [societyId];

  if (flatId) {
    sql += " AND t.flat_id = ?";
    params.push(flatId);
  }
  if (status && status !== "ALL") {
    sql += " AND t.status = ?";
    params.push(status);
  }
  if (category && category !== "ALL") {
    sql += " AND t.category = ?";
    params.push(category);
  }
  if (priority && priority !== "ALL") {
    sql += " AND t.priority = ?";
    params.push(priority);
  }
  if (search) {
    sql += " AND (t.title LIKE ? OR t.description LIKE ? OR f.number LIKE ? OR u.full_name LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  // Prioritize EMERGENCY & OPEN tickets at the top
  sql += `
    ORDER BY 
      CASE WHEN t.priority = 'EMERGENCY' AND t.status != 'CLOSED' THEN 1
           WHEN t.status = 'OPEN' THEN 2
           WHEN t.status = 'IN_PROGRESS' THEN 3
           WHEN t.status = 'RESOLVED' THEN 4
           ELSE 5 END ASC,
      t.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Updates ticket fields (status, assigned technician, cost, resolution notes).
 */
export async function updateTicket(id, societyId, fields = {}) {
  const fieldMapping = {
    status: "status",
    assignedTo: "assigned_to",
    assigned_to: "assigned_to",
    estimatedCost: "estimated_cost",
    estimated_cost: "estimated_cost",
    resolutionNotes: "resolution_notes",
    resolution_notes: "resolution_notes",
    resolvedAt: "resolved_at",
    resolved_at: "resolved_at",
    priority: "priority",
    category: "category",
    rating: "rating",
    feedback: "feedback",
  };

  const sets = [];
  const params = [];

  for (const [key, val] of Object.entries(fields)) {
    const colName = fieldMapping[key];
    if (colName) {
      sets.push(`${colName} = ?`);
      params.push(val);
    }
  }

  if (sets.length === 0) return;

  params.push(id, societyId);
  await pool.execute(
    `UPDATE helpdesk_tickets SET ${sets.join(", ")} WHERE id = ? AND society_id = ?`,
    params
  );
}

/**
 * Adds a comment or progress update to a ticket.
 */
export async function addComment({ ticketId, userId, comment, isInternal = false }) {
  const [result] = await pool.execute(
    `INSERT INTO helpdesk_ticket_comments (ticket_id, user_id, comment, is_internal)
     VALUES (?, ?, ?, ?)`,
    [ticketId, userId, comment, isInternal]
  );
  return result.insertId;
}

/**
 * Fetches all comments for a ticket.
 */
export async function getComments(ticketId, includeInternal = true) {
  let sql = `
    SELECT c.*, u.full_name, u.role
    FROM helpdesk_ticket_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.ticket_id = ?
  `;
  const params = [ticketId];
  if (!includeInternal) {
    sql += " AND c.is_internal = FALSE";
  }
  sql += " ORDER BY c.created_at ASC";

  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Aggregates ticket telemetry counts for society command center.
 */
export async function getTicketStats(societyId) {
  const [rows] = await pool.execute(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS open_count,
       SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_count,
       SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_count,
       SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_count,
       SUM(CASE WHEN priority = 'EMERGENCY' AND status != 'CLOSED' THEN 1 ELSE 0 END) AS emergency_count
     FROM helpdesk_tickets
     WHERE society_id = ?`,
    [societyId]
  );
  return rows[0] || { total: 0, open_count: 0, in_progress_count: 0, resolved_count: 0, closed_count: 0, emergency_count: 0 };
}
