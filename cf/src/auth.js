/* ============================================================
   SAHARA — pengguna, sesi login, dan throttle login (D1)
   Padanan dari backend/repositories/users.js + lib/security.js
   ============================================================ */

import { hashPassword, verifyPassword, randomToken, sha256 } from "./security.js";
import { nowIso } from "./utils.js";

export async function findByUsername(db, username) {
  return db
    .prepare("SELECT * FROM users WHERE lower(username) = lower(?)")
    .bind(String(username == null ? "" : username).trim())
    .first();
}

/** Bentuk aman untuk dikirim ke klien — tanpa hash kata sandi. */
export function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
  };
}

export async function verifyCredentials(db, username, password) {
  const row = await findByUsername(db, username);
  if (!row) return null;
  const ok = await verifyPassword(password, row.password_hash);
  return ok ? row : null;
}

/* ---------- sesi ---------- */

export async function createSession(db, userId, ttlMs) {
  const token = randomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  await db
    .prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)")
    .bind(await sha256(token), userId, now.toISOString(), expiresAt.toISOString())
    .run();

  return { token: token, expiresAt: expiresAt };
}

export async function userForSessionToken(db, token) {
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.role
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .bind(await sha256(token), nowIso())
    .first();
  return row || null;
}

export async function destroySession(db, token) {
  if (!token) return;
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export async function purgeExpiredSessions(db) {
  await db.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(nowIso()).run();
}

/* ---------- throttle login ----------
   Disimpan di D1 (bukan memori) karena Worker berjalan di banyak
   isolat sekaligus, sehingga penghitung di memori tidak akurat. */

export async function tooManyAttempts(db, ip, max, windowMs) {
  const row = await db
    .prepare("SELECT count, first_at FROM login_attempts WHERE ip = ?")
    .bind(String(ip))
    .first();
  if (!row) return false;
  if (Date.now() - Date.parse(row.first_at) > windowMs) return false;
  return row.count >= max;
}

export async function recordFailure(db, ip, windowMs) {
  const now = Date.now();
  const row = await db
    .prepare("SELECT first_at FROM login_attempts WHERE ip = ?")
    .bind(String(ip))
    .first();

  if (!row || now - Date.parse(row.first_at) > windowMs) {
    await db
      .prepare("INSERT OR REPLACE INTO login_attempts (ip, count, first_at) VALUES (?,?,?)")
      .bind(String(ip), 1, new Date(now).toISOString())
      .run();
  } else {
    await db.prepare("UPDATE login_attempts SET count = count + 1 WHERE ip = ?").bind(String(ip)).run();
  }
}

export async function clearFailures(db, ip) {
  await db.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(String(ip)).run();
}

/* ---------- seeding akun kurator ---------- */

/**
 * Membuat akun kurator kalau tabel `users` masih kosong.
 * Memakai INSERT OR IGNORE supaya aman kalau beberapa isolat
 * menjalankannya bersamaan.
 */
export async function ensureAdmin(db, admin) {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM users").first();
  if (row && row.n > 0) return false;

  const hash = await hashPassword(admin.password);
  await db
    .prepare(
      "INSERT OR IGNORE INTO users (username, password_hash, display_name, role, created_at) VALUES (?,?,?,?,?)"
    )
    .bind(admin.username, hash, admin.displayName, "curator", nowIso())
    .run();

  return true;
}
