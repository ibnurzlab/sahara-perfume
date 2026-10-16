/* ============================================================
   SAHARA — Worker Cloudflare (entry point)

   - `/api/*`   → API (D1)
   - `/uploads/*` → gambar unggahan yang tersimpan di D1
   - lainnya    → berkas statis dari folder `dist/`
   ============================================================ */

import { Router } from "./router.js";
import { HttpError, json, text, parseCookies, serializeCookie, readJson } from "./http.js";
import { fromBase64 } from "./utils.js";
import { newId } from "./security.js";
import { configFor } from "./config.js";
import { ensureAdmin, userForSessionToken } from "./auth.js";
import * as assets from "./assets.js";
import { register } from "./routes.js";

const router = new Router();
register(router);

const ASSET_ID = /^[A-Za-z0-9_.-]{1,80}$/;
const VISITOR_ID = /^[A-Za-z0-9_-]{8,80}$/;

/* Akun kurator dibuat sekali per isolat (aman kalau tabel sudah terisi). */
let adminReady = false;

async function ensureSeed(env, config) {
  if (adminReady) return;
  const created = await ensureAdmin(env.DB, config.admin);
  adminReady = true;
  if (created) {
    console.log("[sahara] akun kurator dibuat: " + config.admin.username);
  }
}

/* ---------- API ---------- */

async function handleApi(request, env, url, pathname, config) {
  const match = router.resolve(request.method, pathname);
  if (!match) return json({ error: "Endpoint tidak ditemukan." }, 404);
  if (match.methodMismatch) {
    return json({ error: "Metode HTTP tidak diizinkan untuk endpoint ini." }, 405);
  }

  await ensureSeed(env, config);

  const cookies = parseCookies(request);
  const sessionToken = cookies[config.cookieName] || null;
  const user = await userForSessionToken(env.DB, sessionToken);
  const secure = url.protocol === "https:";

  const outCookies = [];
  let visitorId = cookies[config.visitorCookie];
  if (!visitorId || !VISITOR_ID.test(visitorId)) {
    visitorId = newId("visitor");
    outCookies.push(
      serializeCookie(config.visitorCookie, visitorId, {
        maxAge: Math.floor(config.visitorTtlMs / 1000),
        sameSite: "Lax",
        secure: secure,
      })
    );
  }

  const ctx = {
    request: request,
    env: env,
    url: url,
    config: config,
    secure: secure,
    params: match.params,
    query: url.searchParams,
    sessionToken: sessionToken,
    user: user,
    visitorId: visitorId,
    json(data, status) {
      return json(data, status, outCookies);
    },
    setCookie(name, value, options) {
      outCookies.push(serializeCookie(name, value, options));
    },
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    ctx.body = await readJson(request, config.maxBodyBytes);
  }

  return await match.handler(ctx);
}

/* ---------- gambar unggahan ---------- */

async function handleAsset(request, env, pathname) {
  const id = pathname.slice("/uploads/".length);
  if (!ASSET_ID.test(id)) return text("Not found", 404, { "Content-Type": "text/plain" });

  const row = await assets.find(env.DB, id);
  if (!row) return text("Not found", 404, { "Content-Type": "text/plain" });

  return new Response(fromBase64(row.data), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/* ---------- berkas statis ---------- */

async function handleStatic(request, env, pathname) {
  if (!env.ASSETS) return text("Not found", 404, { "Content-Type": "text/plain" });

  /* html_handling = "none" tidak memetakan "/" ke index.html,
     jadi pemetaan itu dilakukan di sini — tetap tanpa redirect. */
  let target = request;
  if (pathname === "/" && (request.method === "GET" || request.method === "HEAD")) {
    target = new Request(new URL("/index.html", request.url), request);
  }

  const response = await env.ASSETS.fetch(target);
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(response.body, { status: response.status, headers: headers });
}

/* ---------- penanganan galat ---------- */

function handleError(err) {
  if (err instanceof HttpError) return json({ error: err.message }, err.status);
  console.error("[sahara]", err && err.stack ? err.stack : err);
  return json({ error: "Terjadi kesalahan di server." }, 500);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch (err) {
      return json({ error: "Alamat tidak valid." }, 400);
    }

    try {
      if (pathname === "/api" || pathname.startsWith("/api/")) {
        return await handleApi(request, env, url, pathname, configFor(env));
      }
      if (pathname.startsWith("/uploads/")) {
        return await handleAsset(request, env, pathname);
      }
      return await handleStatic(request, env, pathname);
    } catch (err) {
      return handleError(err);
    }
  },
};
