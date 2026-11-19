import * as documentService from "../services/documentService.js";
import { recordAuditEvent } from "../services/auditService.js";

/**
 * GET /api/documents/compliance-scorecard
 */
export async function getComplianceScorecard(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const scorecard = await documentService.getComplianceScorecard(societyId);
    res.json({ success: true, data: scorecard });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents
 */
export async function listDocuments(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const userRole = req.user.role;
    const docs = await documentService.listDocuments(societyId, userRole, req.query);
    res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/documents/upload
 */
export async function uploadDocument(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const userId = req.user.id;

    const doc = await documentService.uploadDocument({
      societyId,
      title: req.body.title,
      category: req.body.category,
      documentNumber: req.body.documentNumber,
      issuingAuthority: req.body.issuingAuthority,
      file: req.file || null,
      filePath: req.body.filePath || null,
      accessScope: req.body.accessScope || "ALL_RESIDENTS",
      validFrom: req.body.validFrom || null,
      expiresAt: req.body.expiresAt || null,
      description: req.body.description || null,
      uploadedBy: userId,
    });

    await recordAuditEvent({
      societyId,
      userId,
      action: "SOCIETY_DOCUMENT_UPLOADED",
      entityType: "society_documents",
      entityId: doc.id,
      details: { title: doc.title, category: doc.category, scope: doc.access_scope },
    });

    res.status(201).json({
      success: true,
      message: `Document '${doc.title}' registered in society vault`,
      data: doc,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/documents/:id
 */
export async function deleteDocument(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const id = Number(req.params.id);

    await documentService.deleteDocument(id, societyId);

    await recordAuditEvent({
      societyId,
      userId: req.user.id,
      action: "SOCIETY_DOCUMENT_DELETED",
      entityType: "society_documents",
      entityId: id,
    });

    res.json({ success: true, message: "Document removed from vault" });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents/notices
 */
export async function listNotices(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const notices = await documentService.listNotices(societyId, req.query);
    res.json({ success: true, data: notices });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/documents/notices
 */
export async function createNotice(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const userId = req.user.id;

    const notice = await documentService.createNotice({
      societyId,
      title: req.body.title,
      noticeNumber: req.body.noticeNumber,
      category: req.body.category,
      priority: req.body.priority,
      content: req.body.content,
      attachmentPath: req.body.attachmentPath || null,
      issuedBy: req.body.issuedBy,
      expiresAt: req.body.expiresAt || null,
      isPinned: req.body.isPinned,
      createdBy: userId,
    });

    await recordAuditEvent({
      societyId,
      userId,
      action: "OFFICIAL_NOTICE_PUBLISHED",
      entityType: "official_notices",
      entityId: notice.id,
      details: { title: notice.title, priority: notice.priority, number: notice.notice_number },
    });

    res.status(201).json({
      success: true,
      message: `Notice '${notice.notice_number}' published on notice board`,
      data: notice,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/documents/notices/:id
 */
export async function deleteNotice(req, res, next) {
  try {
    const societyId = req.societyId || req.user?.society_id || 1;
    const id = Number(req.params.id);

    await documentService.deleteNotice(id, societyId);

    await recordAuditEvent({
      societyId,
      userId: req.user.id,
      action: "OFFICIAL_NOTICE_DELETED",
      entityType: "official_notices",
      entityId: id,
    });

    res.json({ success: true, message: "Notice removed from board" });
  } catch (err) {
    next(err);
  }
}
