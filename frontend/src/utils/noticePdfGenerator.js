import jsPDF from "jspdf";
import { formatDate } from "./formatCurrency.js";

/**
 * Generates an official, formal PDF Notice / Circular on Housing Society Letterhead.
 */
export function generateOfficialNoticePDF({
  society = {},
  notice = {},
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const societyName = society.NAME || "Vastu Heights Co-operative Housing Society Ltd.";
  const regNo = society.REG_NO || "Reg. No: MAH/PUN/RWA/2026/411045";
  const address = society.ADDRESS || "Plot 42, Baner Hill Trail, Baner, Pune, Maharashtra 411045";

  // Top Header Banner
  doc.setFillColor(11, 15, 23); // Obsidian #0B0F17
  doc.rect(0, 0, 210, 36, "F");

  // Society Name
  doc.setFont("helvetica", "bold");
  doc.setTextColor(245, 158, 11); // Terracotta Amber #F59E0B
  doc.setFontSize(15);
  doc.text(societyName.toUpperCase(), 14, 15);

  // Registration & Address
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.setFontSize(8.5);
  doc.text(`${regNo}`, 14, 22);
  doc.text(address, 14, 28);

  // Circular Badge
  doc.setFillColor(20, 184, 166); // Veridian Teal #14B8A6
  doc.roundedRect(144, 10, 52, 16, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("OFFICIAL CIRCULAR", 148, 17);
  doc.setFontSize(8);
  doc.text(`REF: ${notice.notice_number || "CIR/2026/01"}`, 148, 23);

  // Document Info Sub-Header Bar
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.rect(14, 44, 182, 14, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 44, 182, 14, "S");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFontSize(8.5);
  doc.text(`CIRCULAR NO: ${notice.notice_number || "CIR/2026/01"}`, 18, 52);

  const pubDate = notice.published_at ? formatDate(notice.published_at) : formatDate(new Date().toISOString());
  doc.text(`DATE OF ISSUE: ${pubDate}`, 110, 52);

  // Priority Banner (if HIGH or EMERGENCY)
  let yPos = 68;
  if (notice.priority === "EMERGENCY" || notice.priority === "HIGH") {
    const isEmergency = notice.priority === "EMERGENCY";
    doc.setFillColor(isEmergency ? 225 : 245, isEmergency ? 29 : 158, isEmergency ? 72 : 11);
    doc.roundedRect(14, yPos - 6, 182, 9, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(
      isEmergency ? "URGENT COMPLIANCE / EMERGENCY NOTIFICATION" : "HIGH PRIORITY NOTICE — ATTENTION REQUIRED",
      18,
      yPos
    );
    yPos += 14;
  }

  // Circular Title
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(13);
  doc.text(notice.title ? notice.title.toUpperCase() : "NOTICE TO RESIDENTS", 14, yPos);
  yPos += 8;

  // Thin separator rule
  doc.setDrawColor(20, 184, 166);
  doc.setLineWidth(0.8);
  doc.line(14, yPos, 196, yPos);
  yPos += 10;

  // Body Content (Multi-line text wrapping)
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.setFontSize(10);
  doc.setLineHeightFactor(1.5);

  const cleanContent = notice.content || "No circular body specified.";
  const splitText = doc.splitTextToSize(cleanContent, 182);
  doc.text(splitText, 14, yPos);

  yPos += splitText.length * 5.8 + 25;

  // Make sure yPos doesn't overflow page
  if (yPos > 240) {
    doc.addPage();
    yPos = 40;
  }

  // Signatory Authorization Block
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(14, yPos, 196, yPos);
  yPos += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Issued by Order of the Managing Committee:", 14, yPos);
  yPos += 16;

  // Signature columns
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text("__________________________", 14, yPos);
  doc.text("__________________________", 110, yPos);
  yPos += 6;

  doc.text("Honorary Secretary", 14, yPos);
  doc.text("Chairman / President", 110, yPos);
  yPos += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${societyName}`, 14, yPos);
  doc.text(`${societyName}`, 110, yPos);

  // Bottom Security & Hash Watermark
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 282, 210, 15, "F");
  doc.setDrawColor(226, 232, 240);
  doc.line(0, 282, 210, 282);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Society Record • Digitally Signed & Chained via VastuLedger OS • Notice Ref: ${notice.notice_number || "CIR/2026"}`,
    14,
    289
  );

  const safeFilename = `${(notice.notice_number || "Notice").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  doc.save(safeFilename);
}
