// ============================================================
// vPast — ID generation
// Compact URL-safe IDs (6 chars, alphanumeric, uniform),
// collisions resolved by retry in the caller.
// ============================================================

import { randomBytes } from "crypto";

const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomAlphanumeric(length) {
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < length; i++) {
    // 62 possible symbols; mod 62 keeps it uniform over a 256*2 pool
    const index = bytes.readUInt16BE(i * 2) % ALPHABET.length;
    out += ALPHABET[index];
  }
  return out;
}

export function generateId(length = 6) {
  return randomAlphanumeric(length);
}