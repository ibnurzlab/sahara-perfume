/* ============================================================
   SAHARA — repository pengguna & sesi login
   ============================================================ */
"use strict";

const { db, v, nowIso } = require("../db");
const security = require("../lib/security");
const config = require("../config");

function findByUsername(username) {
  return db
    .prepare("SELECT * FROM users WHERE lower(username) = lower(?)")
    .get(String(username == null ? "" : username).trim());
}

function findById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(v(id));
}

/** Bentuk aman untuk dikirim ke klien — tanpa hash kata sandi. */
function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
  };
}

function verifyCredentials(username, password) {
  const row = findByUsername(username);
  if (!row) return null;
  if (!security.verifyPassword(password, row.password_hash)) return null;
  return row;
}

/* ---------- sesi ---------- */

function createSession(userId) {
  const token = security.randomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.sessionTtlMs);

  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)"
  ).run(v(security.sha256(token)), v(userId), v(now.toISOString()), v(expiresAt.toISOString()));

  return { token: token, expiresAt: expiresAt };
}

function userForSessionToken(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.role
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .get(v(security.sha256(token)), v(nowIso()));
  return row || null;
}

function destroySession(token) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(v(security.sha256(token)));
}

module.exports = {
  findByUsername,
  findById,
  publicUser,
  verifyCredentials,
  createSession,
  userForSessionToken,
  destroySession,
};
