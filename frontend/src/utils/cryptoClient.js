/**
 * Client-side cryptographic helper utilities.
 * Uses Web Crypto API where available.
 */

/**
 * Compute SHA-256 hash of a text string (returns hex string)
 */
export async function sha256Hex(text) {
  if (!text) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Mask Indian phone numbers: +91 9876543210 -> +91 ******3210
 */
export function maskPhone(phone) {
  if (!phone) return "—";
  const str = String(phone).replace(/\s+/g, "");
  if (str.length < 6) return str;
  const visible = str.slice(-4);
  return `******${visible}`;
}

/**
 * Mask Indian PAN card: ABCDE1234F -> AB****34F
 */
export function maskPAN(pan) {
  if (!pan) return "—";
  const str = String(pan).toUpperCase().trim();
  if (str.length !== 10) return str;
  return `${str.slice(0, 2)}****${str.slice(7)}`;
}

/**
 * Mask Bank Account Number: 123456789012 -> ****9012
 */
export function maskBankAccount(accountNo) {
  if (!accountNo) return "—";
  const str = String(accountNo).replace(/\s+/g, "");
  if (str.length <= 4) return str;
  return `****${str.slice(-4)}`;
}

/**
 * Truncate 64-char SHA-256 hash for UI badges: 4f2943...fdfc54df
 */
export function truncateHash(hash, lead = 8, trail = 8) {
  if (!hash || hash.length <= lead + trail) return hash || "—";
  return `${hash.slice(0, lead)}...${hash.slice(-trail)}`;
}
