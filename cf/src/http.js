/* ============================================================
   SAHARA — helper HTTP untuk Workers
   ============================================================ */

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Bangun respons JSON; cookie tambahan ikut dilampirkan. */
export function json(data, status = 200, cookies = []) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify(data === undefined ? {} : data), { status, headers });
}

export function text(body, status = 200, extraHeaders = {}) {
  return new Response(body, { status, headers: extraHeaders });
}

export function parseCookies(request) {
  const header = request.headers.get("Cookie");
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    const value = part.slice(index + 1).trim();
    try {
      out[name] = decodeURIComponent(value);
    } catch (err) {
      out[name] = value;
    }
  }
  return out;
}

export function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || "/"}`);
  if (options.maxAge != null) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.httpOnly !== false) parts.push("HttpOnly");
  parts.push(`SameSite=${options.sameSite || "Lax"}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export async function readJson(request, limit) {
  const raw = await request.text();
  if (raw.length > limit) throw new HttpError(413, "Ukuran data melebihi batas.");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new HttpError(400, "Body bukan JSON yang valid.");
  }
}

export function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown"
  );
}
