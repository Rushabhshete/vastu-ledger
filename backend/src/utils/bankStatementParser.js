import * as XLSX from "xlsx";

/**
 * Normalizes string for fuzzy matching (removes special chars, extra whitespace)
 */
function normalizeText(str) {
  if (!str) return "";
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Extracts 12-digit UPI reference (UTR / RRN) from narration or reference column.
 */
export function extractUtrFromText(text) {
  if (!text) return null;
  const str = String(text).trim();

  // Pattern 1: Explicit UPI/UTR/IMPS/NEFT followed by 12 digits
  const explicitMatch = str.match(/(?:UPI|UTR|IMPS|NEFT|RRN|REF)[\/:\-_]?\s*([0-9]{12})\b/i);
  if (explicitMatch) return explicitMatch[1];

  // Pattern 2: Standalone 12-digit number (standard NPCI RRN format)
  const standaloneMatch = str.match(/\b([0-9]{12})\b/);
  if (standaloneMatch) return standaloneMatch[1];

  return null;
}

/**
 * Parses numeric currency strings like "1,500.50", "₹ 7,590.00", "(250)"
 */
export function parseCurrencyAmount(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const str = String(val).replace(/[₹\s,]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parses dates from various bank formats (DD/MM/YYYY, YYYY-MM-DD, DD-MMM-YYYY, Excel serial)
 */
export function parseBankDate(val) {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === "number") {
    // Excel date serial number (days since 1899-12-30)
    try {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + val * 86400000);
      return date.toISOString().slice(0, 10);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }

  const str = String(val).trim();
  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);

  // Check DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Fallback to Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Detects table header row in a 2D sheet array
 */
function findHeaderRow(rows) {
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    const rowStrings = row.map((cell) => String(cell || "").toLowerCase().trim());
    const rowText = rowStrings.join(" ");

    const hasDate = /date|txn\s*date|value\s*date|tran\s*date/.test(rowText);
    const hasDesc = /narration|description|particulars|remarks|details|transaction\s*details/.test(rowText);
    const hasCredit = /credit|deposit|amount|cr\b|cr\s*amount/.test(rowText);

    if (hasDate && (hasDesc || hasCredit)) {
      return { rowIndex: r, headers: rowStrings };
    }
  }
  return null;
}

/**
 * Parses raw bank statement file buffer (CSV, XLSX, XLS)
 * Returns normalized array of credit transactions
 */
export function parseRawBankStatement(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Uploaded workbook contains no sheets");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Bank statement sheet is empty");
  }

  const headerInfo = findHeaderRow(rawRows);
  if (!headerInfo) {
    throw new Error(
      "Could not detect valid bank statement headers (Date, Narration/Description, Credit/Deposit)"
    );
  }

  const { rowIndex, headers } = headerInfo;

  // Identify column indices
  let dateIdx = -1;
  let descIdx = -1;
  let creditIdx = -1;
  let debitIdx = -1;
  let refIdx = -1;
  let typeIdx = -1;
  let amountIdx = -1;

  headers.forEach((h, idx) => {
    if (dateIdx === -1 && /(txn\s*date|value\s*date|tran\s*date|^date$)/i.test(h)) {
      dateIdx = idx;
    } else if (descIdx === -1 && /(narration|particulars|description|remarks|details)/i.test(h)) {
      descIdx = idx;
    } else if (creditIdx === -1 && /(credit|deposit|cr\s*amount|cr_amt)/i.test(h)) {
      creditIdx = idx;
    } else if (debitIdx === -1 && /(debit|withdrawal|dr\s*amount|dr_amt)/i.test(h)) {
      debitIdx = idx;
    } else if (refIdx === -1 && /(ref|cheque|chq|utr|rrn)/i.test(h)) {
      refIdx = idx;
    } else if (typeIdx === -1 && /(type|dr\s*\/\s*cr|cr\s*\/\s*dr)/i.test(h)) {
      typeIdx = idx;
    } else if (amountIdx === -1 && /^amount/i.test(h)) {
      amountIdx = idx;
    }
  });

  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1;

  const transactions = [];

  for (let i = rowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rawDate = row[dateIdx];
    const rawDesc = String(row[descIdx] || "").trim();
    if (!rawDesc && !rawDate) continue;

    // Skip summary rows
    const fullRowText = row.join(" ").toLowerCase();
    if (/(total|closing balance|opening balance|summary|generated on|page \d)/i.test(fullRowText)) {
      continue;
    }

    let creditAmt = 0;
    if (creditIdx !== -1) {
      creditAmt = parseCurrencyAmount(row[creditIdx]);
    } else if (amountIdx !== -1) {
      const amt = parseCurrencyAmount(row[amountIdx]);
      if (typeIdx !== -1) {
        const typeVal = String(row[typeIdx] || "").toUpperCase();
        if (typeVal.includes("CR")) creditAmt = amt;
      } else if (amt > 0) {
        creditAmt = amt;
      }
    }

    // Only process credit inflows
    if (creditAmt <= 0) continue;

    const rawRef = refIdx !== -1 ? String(row[refIdx] || "").trim() : "";
    const extractedUtr = extractUtrFromText(rawRef) || extractUtrFromText(rawDesc);
    const dateFormatted = parseBankDate(rawDate);

    transactions.push({
      rowNumber: i + 1,
      date: dateFormatted,
      narration: rawDesc,
      reference: rawRef,
      extractedUtr: extractedUtr || null,
      amount: creditAmt,
    });
  }

  return transactions;
}
