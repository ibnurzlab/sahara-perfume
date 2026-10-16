/* ============================================================
   SAHARA — server backend
   Menyajikan API (/api/...), gambar unggahan (/uploads/...),
   dan berkas frontend dari akar proyek.

   Jalankan:  node backend/index.js        (atau: npm start)
   ============================================================ */
"use strict";

const http = require("http");

const config = require("./config");
const { Router } = require("./lib/router");
const {
  HttpError,
  sendJson,
  sendText,
  parseCookies,
  serializeCookie,
  appendCookie,
  readJson,
  clientIp,
  safeJoin,
  fileExists,
  sendFile,
} = require("./lib/http");
const security = require("./lib/security");
const database = require("./db");
const users = require("./repositories/users");

/* ---------- siapkan database ---------- */
database.ensureSeeded();
database.purgeExpiredSessions();

/* ---------- kumpulkan rute API ---------- */
const api = new Router();
require("./routes/auth").register(api);
require("./routes/catalog").register(api);
require("./routes/admin").register(api);
require("./routes/uploads").register(api);

/* ---------- berkas frontend ---------- */
function serveStatic(req, res, pathname) {
  for (const prefix of config.blockedPrefixes) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      sendText(res, 403, "Forbidden");
      return;
    }
  }
  if (/\.(db|db-wal|db-shm|sqlite|sqlite3|sql)$/i.test(pathname)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  const target = safeJoin(config.root, pathname);
  if (!target) {
    sendText(res, 403, "Forbidden");
    return;
  }
  if (!fileExists(target)) {
    sendText(res, 404, "Berkas tidak ditemukan.");
    return;
  }
  sendFile(req, res, target, "no-cache");
}

/* ---------- penanganan API ---------- */
async function handleApi(req, res, pathname) {
  const match = api.resolve(req.method, pathname);
  if (!match) {
    sendJson(res, 404, { error: "Endpoint tidak ditemukan." });
    return;
  }
  if (match.methodMismatch) {
    sendJson(res, 405, { error: "Metode HTTP tidak diizinkan untuk endpoint ini." });
    return;
  }

  const cookies = parseCookies(req);
  const sessionToken = cookies[config.cookieName] || null;
  const user = users.userForSessionToken(sessionToken);

  /* setiap pengunjung anonim mendapat id stabil untuk menyimpan favorit */
  let visitorId = cookies[config.visitorCookie];
  if (!visitorId || !/^[A-Za-z0-9_-]{8,80}$/.test(visitorId)) {
    visitorId = security.newId("visitor");
    appendCookie(
      res,
      serializeCookie(config.visitorCookie, visitorId, {
        maxAge: Math.floor(config.visitorTtlMs / 1000),
        sameSite: "Lax",
      })
    );
  }

  const ctx = {
    params: match.params,
    query: new URLSearchParams(new URL(req.url, "http://localhost").search),
    body: {},
    sessionToken: sessionToken,
    user: user,
    visitorId: visitorId,
    ip: clientIp(req),
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    ctx.body = await readJson(req, config.maxBodyBytes);
  }

  try {
    await match.handler(req, res, ctx);
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message });
      return;
    }
    console.error("[api]", req.method, pathname, err);
    if (!res.headersSent) sendJson(res, 500, { error: "Terjadi kesalahan di server." });
    else res.end();
  }
}

/* ---------- server ---------- */
const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (err) {
    sendText(res, 400, "Permintaan tidak valid.");
    return;
  }

  if (pathname === "/") pathname = "/index.html";

  if (pathname.startsWith("/api/")) {
    handleApi(req, res, pathname).catch((err) => {
      console.error("[api:fatal]", err);
      if (!res.headersSent) sendJson(res, 500, { error: "Terjadi kesalahan di server." });
      else res.end();
    });
    return;
  }

  try {
    serveStatic(req, res, pathname);
  } catch (err) {
    console.error("[static]", err);
    if (!res.headersSent) sendText(res, 500, "Terjadi kesalahan di server.");
  }
});

server.listen(config.port, () => {
  console.log("");
  console.log("  SAHARA — server + database siap");
  console.log("  ------------------------------------------------");
  console.log("  Etalase        : http://localhost:" + config.port + "/");
  console.log("  Masuk admin    : http://localhost:" + config.port + "/masuk.html");
  console.log("  Database       : " + config.dbFile);
  console.log("  Akun kurator   : " + config.admin.username + " (sandi: " + config.admin.password + ")");
  console.log("  ------------------------------------------------");
  console.log("  Tekan Ctrl+C untuk berhenti.");
  console.log("");
});

/* ---------- penutupan rapi ---------- */
function shutdown(signal) {
  console.log("\n" + signal + " diterima — menutup server...");
  server.close(() => {
    try { database.db.close(); } catch (err) { /* sudah tertutup */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
