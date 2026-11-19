import pool from "../config/db.js";
import { computeRowHash, GENESIS_HASH } from "../utils/ledgerHash.js";

export async function getAll(societyId = null) {
  if (societyId) {
    const [rows] = await pool.execute(
      "SELECT * FROM ledger_transactions WHERE society_id = ? ORDER BY id ASC",
      [societyId]
    );
    return rows;
  }
  const [rows] = await pool.execute("SELECT * FROM ledger_transactions ORDER BY id ASC");
  return rows;
}

export async function getLastRow(societyId = null) {
  if (societyId) {
    const [rows] = await pool.execute(
      "SELECT * FROM ledger_transactions WHERE society_id = ? ORDER BY id DESC LIMIT 1",
      [societyId]
    );
    return rows[0] || null;
  }
  const [rows] = await pool.execute("SELECT * FROM ledger_transactions ORDER BY id DESC LIMIT 1");
  return rows[0] || null;
}

export async function getBalance(societyId = null) {
  const last = await getLastRow(societyId);
  return last ? Number(last.balance_after) : 0;
}

/**
 * Append a ledger transaction with atomic hash chaining and concurrency locking per society.
 */
export async function appendTransaction({
  societyId = 1,
  transactionType,
  category,
  referenceType = null,
  referenceId = null,
  description,
  amount,
  createdBy = null,
  createdAt = new Date(),
}) {
  const socId = Number(societyId) || 1;
  const numAmount = Number(amount);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Lock latest row for this society to ensure sequential hash chaining
    const [lastRows] = await conn.execute(
      "SELECT id, row_hash, balance_after FROM ledger_transactions WHERE society_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [socId]
    );
    const lastRow = lastRows[0] || null;
    const prevHash = lastRow?.row_hash || GENESIS_HASH;
    const prevBalance = lastRow ? Number(lastRow.balance_after) : 0;
    const balanceAfter =
      transactionType === "CREDIT" ? prevBalance + numAmount : prevBalance - numAmount;

    const rawDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
    const normDate = new Date(Math.floor(rawDate.getTime() / 1000) * 1000);

    // Insert row initially with a temporary placeholder row_hash
    const [result] = await conn.execute(
      `INSERT INTO ledger_transactions
         (society_id, transaction_type, category, reference_type, reference_id, description, amount, balance_after, prev_hash, row_hash, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        socId,
        transactionType,
        category,
        referenceType,
        referenceId,
        description,
        numAmount,
        balanceAfter,
        prevHash,
        GENESIS_HASH,
        createdBy,
        normDate,
      ]
    );

    const insertId = result.insertId;

    // Compute deterministic SHA-256 row hash incorporating the assigned auto-increment ID
    const rowHash = computeRowHash({
      prevHash,
      transactionId: insertId,
      amount: numAmount,
      transactionType,
      createdAt: normDate,
    });

    // Update row with computed hash
    await conn.execute("UPDATE ledger_transactions SET row_hash = ? WHERE id = ?", [
      rowHash,
      insertId,
    ]);

    await conn.commit();

    return {
      insertId,
      ledgerId: insertId,
      balanceAfter,
      prevHash,
      rowHash,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function insertTransaction(tx) {
  const socId = tx.societyId || 1;
  const [result] = await pool.execute(
    `INSERT INTO ledger_transactions
       (society_id, transaction_type, category, reference_type, reference_id, description, amount, balance_after, prev_hash, row_hash, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      socId,
      tx.transactionType,
      tx.category,
      tx.referenceType,
      tx.referenceId,
      tx.description,
      tx.amount,
      tx.balanceAfter,
      tx.prevHash,
      tx.rowHash,
      tx.createdBy,
    ]
  );
  return result.insertId;
}
