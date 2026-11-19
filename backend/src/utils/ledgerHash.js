import { createHash } from "node:crypto";

const GENESIS_HASH = "0".repeat(64);

/**
 * Compute SHA-256 hash for a ledger row.
 * Deterministic format: prevHash | txId | amount(2 decimals) | type | isoTimestamp
 */
export function computeRowHash({ prevHash, transactionId, amount, transactionType, createdAt }) {
  const normAmount = Number(amount).toFixed(2);
  const rawDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const secDate = new Date(Math.floor(rawDate.getTime() / 1000) * 1000);
  const normDate = secDate.toISOString();
  const data = `${prevHash}|${transactionId}|${normAmount}|${transactionType}|${normDate}`;
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Verify an entire ordered array of ledger rows.
 * Returns { valid: boolean, brokenAtId?: number, reason?: string }
 */
export function verifyChain(rows) {
  let expectedPrev = GENESIS_HASH;
  for (const row of rows) {
    if (row.prev_hash !== expectedPrev) {
      return { valid: false, brokenAtId: row.id, reason: "PREV_HASH_MISMATCH" };
    }
    const computed = computeRowHash({
      prevHash:        row.prev_hash,
      transactionId:   row.id,
      amount:          row.amount,
      transactionType: row.transaction_type,
      createdAt:       row.created_at,
    });
    if (computed !== row.row_hash) {
      return { valid: false, brokenAtId: row.id, reason: "ROW_HASH_MISMATCH" };
    }
    expectedPrev = row.row_hash;
  }
  return { valid: true };
}

export { GENESIS_HASH };
