import * as documentModel from "../models/documentModel.js";
import pool from "../config/db.js";

/**
 * Lists documents with role-based access filtering.
 */
export async function listDocuments(societyId, userRole, filters = {}) {
  return documentModel.listDocuments(societyId, {
    userRole,
    category: filters.category || null,
    search: filters.search || null,
    limit: filters.limit || 50,
    offset: filters.offset || 0,
  });
}

/**
 * Uploads/Registers a document in the society vault.
 */
export async function uploadDocument({
  societyId,
  title,
  category = "GENERAL",
  documentNumber = null,
  issuingAuthority = null,
  file = null,
  filePath = null,
  accessScope = "ALL_RESIDENTS",
  validFrom = null,
  expiresAt = null,
  description = null,
  uploadedBy,
}) {
  if (!title) {
    throw Object.assign(new Error("Document title is required"), { status: 400 });
  }

  const finalPath = file ? `/uploads/documents/${file.filename}` : filePath || "/uploads/compliance/sample.pdf";
  const finalSize = file ? file.size : 102400;
  const finalType = file ? file.mimetype : "application/pdf";

  const docId = await documentModel.createDocument({
    societyId,
    title: title.trim(),
    category,
    documentNumber: documentNumber ? documentNumber.trim() : null,
    issuingAuthority: issuingAuthority ? issuingAuthority.trim() : null,
    filePath: finalPath,
    fileSizeBytes: finalSize,
    fileType: finalType,
    accessScope,
    validFrom: validFrom || null,
    expiresAt: expiresAt || null,
    description: description ? description.trim() : null,
    uploadedBy,
  });

  return documentModel.findDocumentById(docId, societyId);
}

/**
 * Removes a document from the vault.
 */
export async function deleteDocument(id, societyId) {
  const existing = await documentModel.findDocumentById(id, societyId);
  if (!existing) {
    throw Object.assign(new Error("Document not found in society vault"), { status: 404 });
  }
  return documentModel.deleteDocument(id, societyId);
}

/**
 * Retrieves statutory compliance scorecard.
 */
export async function getComplianceScorecard(societyId) {
  return documentModel.getComplianceMetrics(societyId);
}

/**
 * Lists official notices.
 */
export async function listNotices(societyId, filters = {}) {
  return documentModel.listNotices(societyId, {
    category: filters.category || null,
    search: filters.search || null,
    limit: filters.limit || 50,
    offset: filters.offset || 0,
  });
}

/**
 * Publishes a new circular / notice to the digital notice board.
 */
export async function createNotice({
  societyId,
  title,
  noticeNumber = null,
  category = "GENERAL",
  priority = "MEDIUM",
  content,
  attachmentPath = null,
  issuedBy = "Managing Committee",
  expiresAt = null,
  isPinned = false,
  createdBy,
}) {
  if (!title || !content) {
    throw Object.assign(new Error("Title and content are required to publish a notice"), { status: 400 });
  }

  const year = new Date().getFullYear();
  const autoNumber = noticeNumber || `CIR/${year}/${Math.floor(100 + Math.random() * 900)}`;

  const noticeId = await documentModel.createNotice({
    societyId,
    title: title.trim(),
    noticeNumber: autoNumber,
    category,
    priority,
    content: content.trim(),
    attachmentPath,
    issuedBy: issuedBy ? issuedBy.trim() : "Managing Committee",
    expiresAt: expiresAt || null,
    isPinned: Boolean(isPinned),
    createdBy,
  });

  return documentModel.findNoticeById(noticeId, societyId);
}

/**
 * Deletes an official notice.
 */
export async function deleteNotice(id, societyId) {
  const existing = await documentModel.findNoticeById(id, societyId);
  if (!existing) {
    throw Object.assign(new Error("Notice not found"), { status: 404 });
  }
  return documentModel.deleteNotice(id, societyId);
}
