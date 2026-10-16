/* ============================================================
   SAHARA — utilitas keamanan
   Hashing kata sandi (scrypt), token sesi, dan throttle login.
   ============================================================ */
"use strict";

const crypto = require("crypto");

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/* ---------- kata sandi ---------- */

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  });
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

function verifyPassword(password, stored) {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    if (!N || !r || !p || !salt.length || !expected.length) return false;

    const derived = crypto.scryptSync(String(password), salt, expected.length, { N, r, p });
    return crypto.timingSafeEqual(derived, expected);
  } catch (err) {
    return false;
  }
}

/* ---------- token ---------- */

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function newId(prefix) {
  return (prefix || "id") + "_" + crypto.randomBytes(9).toString("base64url");
}

/* ---------- throttle login (in-memory) ---------- */

const attempts = new Map();

function tooManyAttempts(key, max, windowMs) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > windowMs) return false;
  return entry.count >= max;
}

function recordFailure(key, windowMs) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > windowMs) {
    attempts.set(key, { first: now, count: 1 });
    return;
  }
  entry.count += 1;
}

function clearFailures(key) {
  attempts.delete(key);
}

/** Buang catatan lama supaya Map tidak tumbuh tanpa batas. */
function sweepAttempts(windowMs) {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (now - entry.first > windowMs) attempts.delete(key);
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  randomToken,
  sha256,
  newId,
  tooManyAttempts,
  recordFailure,
  clearFailures,
  sweepAttempts,
};
