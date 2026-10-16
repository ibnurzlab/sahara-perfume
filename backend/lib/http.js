/* ============================================================
   SAHARA — helper HTTP (tanpa dependensi eksternal)
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

/** Error yang sengaja dilempar handler untuk menghasilkan respons rapi. */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/* ---------- respons ---------- */

function sendJson(res, status, payload, extraHeaders) {
  const body = Buffer.from(JSON.stringify(payload === undefined ? {} : payload), "utf8");
  res.writeHead(
    status,
    Object.assign(
      {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": body.length,
        "Cache-Control": "no-store",
      },
      extraHeaders || {}
    )
  );
  res.end(body);
}

function sendText(res, status, text, contentType) {
  const body = Buffer.from(String(text), "utf8");
  res.writeHead(status, {
    "Content-Type": contentType || "text/plain; charset=utf-8",
    "Content-Length": body.length,
  });
  res.end(body);
}

/* ---------- cookie ---------- */

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!name) return;
    try {
      out[name] = decodeURIComponent(value);
    } catch (err) {
      out[name] = value;
    }
  });
  return out;
}

/** Tambahkan Set-Cookie tanpa menimpa cookie lain yang sudah diset. */
function appendCookie(res, cookieString) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) res.setHeader("Set-Cookie", cookieString);
  else if (Array.isArray(existing)) res.setHeader("Set-Cookie", existing.concat(cookieString));
  else res.setHeader("Set-Cookie", [existing, cookieString]);
}

function serializeCookie(name, value, options) {
  const opts = options || {};
  const parts = [name + "=" + encodeURIComponent(value)];
  parts.push("Path=" + (opts.path || "/"));
  if (opts.maxAge != null) parts.push("Max-Age=" + Math.floor(opts.maxAge));
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  parts.push("SameSite=" + (opts.sameSite || "Lax"));
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

/* ---------- body ---------- */

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new HttpError(413, "Ukuran data melebihi batas."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", (err) => reject(err));
  });
}

async function readJson(req, limit) {
  const raw = await readBody(req, limit);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch (err) {
    throw new HttpError(400, "Body bukan JSON yang valid.");
  }
}

/* ---------- lain-lain ---------- */

function clientIp(req) {
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

function mimeFor(file) {
  return MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
}

function safeJoin(root, requestPath) {
  const normalized = path.normalize(decodeURIComponent(requestPath)).replace(/^([/\\])+/, "");
  const target = path.join(root, normalized);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (target !== root && !target.startsWith(rootWithSep)) return null;
  return target;
}

function fileExists(file) {
  try {
    return fs.statSync(file).isFile();
  } catch (err) {
    return false;
  }
}

/** Kirim berkas statis; mengembalikan true kalau berkas ada. */
function sendFile(req, res, file, cacheControl) {
  const stat = fs.statSync(file);
  res.writeHead(200, {
    "Content-Type": mimeFor(file),
    "Content-Length": stat.size,
    "Cache-Control": cacheControl || "no-cache",
  });
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  fs.createReadStream(file).pipe(res);
  return true;
}

module.exports = {
  HttpError,
  sendJson,
  sendText,
  parseCookies,
  serializeCookie,
  appendCookie,
  readBody,
  readJson,
  clientIp,
  mimeFor,
  safeJoin,
  fileExists,
  sendFile,
  MIME,
};
