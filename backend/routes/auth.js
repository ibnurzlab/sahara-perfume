/* ============================================================
   SAHARA — rute autentikasi admin
   ============================================================ */
"use strict";

const config = require("../config");
const { sendJson, serializeCookie, appendCookie, HttpError, clientIp } = require("../lib/http");
const security = require("../lib/security");
const users = require("../repositories/users");

function register(router) {
  router.get("/api/auth/me", (req, res, ctx) => {
    sendJson(res, 200, {
      authenticated: !!ctx.user,
      user: ctx.user ? users.publicUser(ctx.user) : null,
    });
  });

  router.post("/api/auth/login", (req, res, ctx) => {
    const username = String((ctx.body && ctx.body.username) || "").trim();
    const password = String((ctx.body && ctx.body.password) || "");
    const ip = clientIp(req);

    if (!username || !password) {
      throw new HttpError(400, "Nama kurator dan kata sandi wajib diisi.");
    }

    if (security.tooManyAttempts(ip, config.loginMaxAttempts, config.loginWindowMs)) {
      throw new HttpError(429, "Terlalu banyak percobaan masuk. Coba lagi beberapa menit lagi.");
    }

    const row = users.verifyCredentials(username, password);
    if (!row) {
      security.recordFailure(ip, config.loginWindowMs);
      throw new HttpError(401, "Nama kurator atau kata sandi salah.");
    }

    security.clearFailures(ip);
    const session = users.createSession(row.id);

    appendCookie(
      res,
      serializeCookie(config.cookieName, session.token, {
        maxAge: Math.floor(config.sessionTtlMs / 1000),
        sameSite: "Lax",
      })
    );

    sendJson(res, 200, { user: users.publicUser(row) });
  });

  router.post("/api/auth/logout", (req, res, ctx) => {
    users.destroySession(ctx.sessionToken);
    appendCookie(res, serializeCookie(config.cookieName, "", { maxAge: 0, sameSite: "Lax" }));
    sendJson(res, 200, { ok: true });
  });
}

module.exports = { register };
