import pool from "../config/db.js";

/**
 * Ensures the document vault and notice board tables exist and has default sample data.
 */
export async function ensureTables() {
  const ddl1 = `
    CREATE TABLE IF NOT EXISTS society_documents (
      id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
      society_id          BIGINT NOT NULL,
      title               VARCHAR(255) NOT NULL,
      category            ENUM('COMPLIANCE_NOC', 'SOCIETY_BYELAWS', 'AGM_MINUTES', 'FINANCIAL_AUDIT', 'SHARE_CERTIFICATE', 'CIRCULAR_NOTICE', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
      document_number     VARCHAR(100) NULL,
      issuing_authority   VARCHAR(255) NULL,
      file_path           VARCHAR(500) NOT NULL,
      file_size_bytes     INT NULL,
      file_type           VARCHAR(50) DEFAULT 'application/pdf',
      access_scope        ENUM('ALL_RESIDENTS', 'COMMITTEE_ONLY', 'PUBLIC') DEFAULT 'ALL_RESIDENTS',
      valid_from          DATE NULL,
      expires_at          DATE NULL,
      description         TEXT NULL,
      uploaded_by         BIGINT NOT NULL,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_doc_soc_cat (society_id, category),
      INDEX idx_doc_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const ddl2 = `
    CREATE TABLE IF NOT EXISTS official_notices (
      id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
      society_id          BIGINT NOT NULL,
      title               VARCHAR(255) NOT NULL,
      notice_number       VARCHAR(100) NOT NULL,
      category            ENUM('AGM_EGM', 'MAINTENANCE_WORK', 'RULES_REGULATIONS', 'ELECTION', 'EVENT_CELEBRATION', 'GENERAL') DEFAULT 'GENERAL',
      priority            ENUM('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY') DEFAULT 'MEDIUM',
      content             TEXT NOT NULL,
      attachment_path     VARCHAR(500) NULL,
      issued_by           VARCHAR(255) NOT NULL DEFAULT 'Managing Committee',
      published_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at          TIMESTAMP NULL,
      is_pinned           BOOLEAN DEFAULT FALSE,
      created_by          BIGINT NOT NULL,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_notice_soc (society_id, is_pinned),
      INDEX idx_notice_pub (published_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.execute(ddl1);
  await pool.execute(ddl2);

  // Seed initial statutory documents for society 1 if empty
  const [docCount] = await pool.execute("SELECT COUNT(*) AS count FROM society_documents WHERE society_id = 1");
  if (docCount[0].count === 0) {
    const seedDocs = [
      [
        1,
        "Annual Fire Safety NOC (FY 2026-27)",
        "COMPLIANCE_NOC",
        "PMC/FIRE/NOC/2026/0442",
        "Pune Municipal Fire Brigade",
        "/uploads/compliance/fire_noc_2026.pdf",
        184520,
        "application/pdf",
        "ALL_RESIDENTS",
        "2026-01-01",
        "2027-01-01",
        "Statutory Form B fire fighting system clearance certificate for Wing A & Wing B.",
        1,
      ],
      [
        1,
        "Passenger Lift Safety Fitness License",
        "COMPLIANCE_NOC",
        "CEI/MH/LIFT/8821",
        "Chief Electrical Inspector Maharashtra (Energy Dept)",
        "/uploads/compliance/lift_license_2026.pdf",
        224100,
        "application/pdf",
        "ALL_RESIDENTS",
        "2025-11-01",
        "2026-11-01",
        "Annual lift fitness and automatic rescue device (ARD) inspection approval.",
        1,
      ],
      [
        1,
        "Model Bye-Laws of Co-operative Housing Society",
        "SOCIETY_BYELAWS",
        "MAH/RWA/BYELAWS/2014",
        "Commissioner for Co-operation Maharashtra",
        "/uploads/compliance/society_byelaws.pdf",
        1450200,
        "application/pdf",
        "ALL_RESIDENTS",
        "2014-01-01",
        null,
        "Official 174-section bye-laws governing maintenance, voting, transfers, and parking.",
        1,
      ],
      [
        1,
        "Statutory Audit Report & Balance Sheet FY 2024-25",
        "FINANCIAL_AUDIT",
        "AUD/2025/CA/910",
        "M/s Kulkarni & Associates, Chartered Accountants",
        "/uploads/compliance/statutory_audit_2025.pdf",
        890400,
        "application/pdf",
        "ALL_RESIDENTS",
        "2025-08-15",
        null,
        "Audited Financial Statement, Sinking Fund allocation, and Auditor Certificate.",
        1,
      ],
      [
        1,
        "Managing Committee Strategic Vendor Contract Binder",
        "GENERAL",
        "MC/CONF/2026/01",
        "Managing Committee Vastu Heights",
        "/uploads/compliance/security_contract_confidential.pdf",
        512000,
        "application/pdf",
        "COMMITTEE_ONLY",
        "2026-01-01",
        "2027-01-01",
        "Confidential commercial rate sheet for security guard deployment.",
        1,
      ],
    ];

    for (const d of seedDocs) {
      await pool.execute(
        `INSERT INTO society_documents 
         (society_id, title, category, document_number, issuing_authority, file_path, file_size_bytes, file_type, access_scope, valid_from, expires_at, description, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        d
      );
    }
  }

  // Seed initial official notices if empty
  const [noticeCount] = await pool.execute("SELECT COUNT(*) AS count FROM official_notices WHERE society_id = 1");
  if (noticeCount[0].count === 0) {
    const seedNotices = [
      [
        1,
        "Annual General Body Meeting (AGM) Notice & Agenda",
        "CIR/2026/01",
        "AGM_EGM",
        "HIGH",
        "Notice is hereby given that the 12th Annual General Body Meeting of Vastu Heights CHS will be held on Sunday, 28th June 2026 at 10:00 AM in the Society Clubhouse. Agenda includes adoption of FY 2025-26 audited accounts, election of sub-committees, and sanction of clubhouse solar installation budget.",
        null,
        "Secretary & Chairman",
        true,
        1,
      ],
      [
        1,
        "Mandatory Fire Drill and Hose Reel Demonstration",
        "CIR/2026/02",
        "RULES_REGULATIONS",
        "MEDIUM",
        "In compliance with PMC Fire Safety guidelines, an emergency mock drill and training on fire extinguishers and riser hydrant operation will take place this Saturday at 4:30 PM. All flat owners and tenants are requested to attend.",
        null,
        "Managing Committee",
        false,
        1,
      ],
      [
        1,
        "Water Tank Deep Cleaning & Pressure Valve Inspection",
        "CIR/2026/03",
        "MAINTENANCE_WORK",
        "HIGH",
        "Underground and overhead water tanks will undergo UV sanitization and pressure testing on Tuesday. Water supply will remain closed between 10:00 AM and 3:00 PM. Kindly ensure sufficient storage.",
        null,
        "Estate Manager",
        false,
        1,
      ],
    ];

    for (const n of seedNotices) {
      await pool.execute(
        `INSERT INTO official_notices 
         (society_id, title, notice_number, category, priority, content, attachment_path, issued_by, is_pinned, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        n
      );
    }
  }
}

// ==========================================
// Society Documents Operations
// ==========================================

export async function createDocument({
  societyId,
  title,
  category = "GENERAL",
  documentNumber = null,
  issuingAuthority = null,
  filePath,
  fileSizeBytes = null,
  fileType = "application/pdf",
  accessScope = "ALL_RESIDENTS",
  validFrom = null,
  expiresAt = null,
  description = null,
  uploadedBy,
}) {
  await ensureTables();

  const [res] = await pool.execute(
    `INSERT INTO society_documents 
     (society_id, title, category, document_number, issuing_authority, file_path, file_size_bytes, file_type, access_scope, valid_from, expires_at, description, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      societyId,
      title,
      category,
      documentNumber,
      issuingAuthority,
      filePath,
      fileSizeBytes,
      fileType,
      accessScope,
      validFrom,
      expiresAt,
      description,
      uploadedBy,
    ]
  );

  return res.insertId;
}

export async function listDocuments(
  societyId,
  { category = null, userRole = "RESIDENT", search = null, limit = 50, offset = 0 } = {}
) {
  await ensureTables();

  let query = `
    SELECT 
      d.*,
      u.full_name AS uploaded_by_name,
      DATEDIFF(d.expires_at, CURDATE()) AS days_until_expiry
    FROM society_documents d
    JOIN users u ON d.uploaded_by = u.id
    WHERE d.society_id = ?
  `;
  const params = [societyId];

  // Privacy rule: Residents cannot access COMMITTEE_ONLY documents
  if (userRole === "RESIDENT") {
    query += ` AND d.access_scope IN ('ALL_RESIDENTS', 'PUBLIC')`;
  }

  if (category && category !== "ALL") {
    query += ` AND d.category = ?`;
    params.push(category);
  }

  if (search) {
    query += ` AND (d.title LIKE ? OR d.document_number LIKE ? OR d.issuing_authority LIKE ? OR d.description LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.execute(query, params);
  return rows;
}

export async function findDocumentById(id, societyId) {
  await ensureTables();
  const [rows] = await pool.execute(
    `SELECT d.*, u.full_name AS uploaded_by_name, DATEDIFF(d.expires_at, CURDATE()) AS days_until_expiry
     FROM society_documents d
     JOIN users u ON d.uploaded_by = u.id
     WHERE d.id = ? AND d.society_id = ?`,
    [id, societyId]
  );
  return rows[0] || null;
}

export async function deleteDocument(id, societyId) {
  await ensureTables();
  const [res] = await pool.execute(
    "DELETE FROM society_documents WHERE id = ? AND society_id = ?",
    [id, societyId]
  );
  return res.affectedRows > 0;
}

/**
 * Calculates society compliance health based on statutory certificates.
 */
export async function getComplianceMetrics(societyId) {
  await ensureTables();

  const [docs] = await pool.execute(
    `SELECT id, title, category, document_number, expires_at, DATEDIFF(expires_at, CURDATE()) AS days_left
     FROM society_documents
     WHERE society_id = ? AND category IN ('COMPLIANCE_NOC', 'SOCIETY_BYELAWS', 'FINANCIAL_AUDIT')`,
    [societyId]
  );

  let fireNoc = { status: "MISSING", daysLeft: null, title: "Fire Safety NOC" };
  let liftLicense = { status: "MISSING", daysLeft: null, title: "Lift Inspection Certificate" };
  let byeLaws = { status: "MISSING", title: "Model Society Bye-Laws" };
  let auditReport = { status: "MISSING", title: "Statutory Audit" };

  for (const d of docs) {
    const titleLower = d.title.toLowerCase();
    const days = d.days_left !== null ? Number(d.days_left) : null;

    if (titleLower.includes("fire")) {
      fireNoc = {
        id: d.id,
        title: d.title,
        documentNumber: d.document_number,
        daysLeft: days,
        status: days === null ? "ACTIVE" : days > 30 ? "ACTIVE" : days > 0 ? "EXPIRING_SOON" : "EXPIRED",
      };
    } else if (titleLower.includes("lift")) {
      liftLicense = {
        id: d.id,
        title: d.title,
        documentNumber: d.document_number,
        daysLeft: days,
        status: days === null ? "ACTIVE" : days > 30 ? "ACTIVE" : days > 0 ? "EXPIRING_SOON" : "EXPIRED",
      };
    } else if (d.category === "SOCIETY_BYELAWS") {
      byeLaws = {
        id: d.id,
        title: d.title,
        documentNumber: d.document_number,
        status: "ACTIVE",
      };
    } else if (d.category === "FINANCIAL_AUDIT") {
      auditReport = {
        id: d.id,
        title: d.title,
        documentNumber: d.document_number,
        status: "ACTIVE",
      };
    }
  }

  const items = [fireNoc, liftLicense, byeLaws, auditReport];
  const activeCount = items.filter((i) => i.status === "ACTIVE").length;
  const scorePercent = Math.round((activeCount / items.length) * 100);

  return {
    scorePercent,
    activeCount,
    totalCount: items.length,
    fireNoc,
    liftLicense,
    byeLaws,
    auditReport,
  };
}

// ==========================================
// Official Notices Operations
// ==========================================

export async function createNotice({
  societyId,
  title,
  noticeNumber,
  category = "GENERAL",
  priority = "MEDIUM",
  content,
  attachmentPath = null,
  issuedBy = "Managing Committee",
  expiresAt = null,
  isPinned = false,
  createdBy,
}) {
  await ensureTables();

  const [res] = await pool.execute(
    `INSERT INTO official_notices 
     (society_id, title, notice_number, category, priority, content, attachment_path, issued_by, expires_at, is_pinned, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      societyId,
      title,
      noticeNumber,
      category,
      priority,
      content,
      attachmentPath,
      issuedBy,
      expiresAt,
      isPinned ? 1 : 0,
      createdBy,
    ]
  );

  return res.insertId;
}

export async function listNotices(societyId, { category = null, search = null, limit = 50, offset = 0 } = {}) {
  await ensureTables();

  let query = `
    SELECT 
      n.*,
      u.full_name AS created_by_name
    FROM official_notices n
    JOIN users u ON n.created_by = u.id
    WHERE n.society_id = ?
  `;
  const params = [societyId];

  if (category && category !== "ALL") {
    query += ` AND n.category = ?`;
    params.push(category);
  }

  if (search) {
    query += ` AND (n.title LIKE ? OR n.notice_number LIKE ? OR n.content LIKE ? OR n.issued_by LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY n.is_pinned DESC, n.published_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.execute(query, params);
  return rows;
}

export async function findNoticeById(id, societyId) {
  await ensureTables();
  const [rows] = await pool.execute(
    `SELECT n.*, u.full_name AS created_by_name
     FROM official_notices n
     JOIN users u ON n.created_by = u.id
     WHERE n.id = ? AND n.society_id = ?`,
    [id, societyId]
  );
  return rows[0] || null;
}

export async function deleteNotice(id, societyId) {
  await ensureTables();
  const [res] = await pool.execute(
    "DELETE FROM official_notices WHERE id = ? AND society_id = ?",
    [id, societyId]
  );
  return res.affectedRows > 0;
}
