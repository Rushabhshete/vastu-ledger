import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import security from "../config/security.js";

const { key, algorithm } = security.encryption;
const IV_LENGTH   = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH  = 16; // 128-bit auth tag

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a hex string: iv:ciphertext:authTag
 */
export function encrypt(plaintext) {
  if (!plaintext) return null;
  const iv     = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(algorithm, key, iv, { authTagLength: TAG_LENGTH });
  let enc      = cipher.update(plaintext, "utf8", "hex");
  enc         += cipher.final("hex");
  const tag    = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${enc}:${tag}`;
}

/**
 * Decrypt a string produced by encrypt().
 */
export function decrypt(payload) {
  if (!payload) return null;
  const [ivHex, encHex, tagHex] = payload.split(":");
  if (!ivHex || !encHex || !tagHex) throw new Error("Malformed encrypted payload");

  const iv       = Buffer.from(ivHex, "hex");
  const tag      = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv(algorithm, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  let dec        = decipher.update(encHex, "hex", "utf8");
  dec           += decipher.final("utf8");
  return dec;
}
