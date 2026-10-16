/* ============================================================
   SAHARA — keamanan di runtime Workers (Web Crypto)

   Memakai PBKDF2-HMAC-SHA256 dari `crypto.subtle` karena
   `node:crypto` scrypt tidak tersedia di runtime Workers.

   PUTARAN (ITERATIONS) sengaja dibuat sedang: paket gratis
   Cloudflare Workers membatasi CPU 10 ms per permintaan.
   Kalau Anda memakai paket berbayar, naikkan angkanya.
   ============================================================ */

import { toBase64, fromBase64 } from "./utils.js";

export const PBKDF2_ITERATIONS = 25000;
const KEY_BYTES = 32;
const encoder = new TextEncoder();

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(String(password)),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    KEY_BYTES * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password, iterations = PBKDF2_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derive(password, salt, iterations);
  return `pbkdf2$${iterations}$${toBase64(salt)}$${toBase64(derived)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations < 1) return false;

    const salt = fromBase64(parts[2]);
    const expected = fromBase64(parts[3]);
    const actual = await derive(password, salt, iterations);
    if (actual.length !== expected.length) return false;

    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch (err) {
    return false;
  }
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(value)));
  const bytes = new Uint8Array(digest);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function newId(prefix) {
  return `${prefix || "id"}_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
}
