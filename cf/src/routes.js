/* ============================================================
   SAHARA — seluruh endpoint API
   Kontraknya identik dengan backend/routes/*.js versi Node,
   sehingga frontend tidak perlu diubah sama sekali.
   ============================================================ */

import { HttpError, clientIp } from "./http.js";
import * as products from "./products.js";
import * as favorites from "./favorites.js";
import * as users from "./auth.js";
import * as assets from "./assets.js";

function requireUser(ctx) {
  if (!ctx.user) throw new HttpError(401, "Sesi admin tidak ditemukan. Silakan masuk kembali.");
}

export function register(router) {
  /* ---------- sistem ---------- */

  router.get("/api/health", (ctx) =>
    ctx.json({ ok: true, storage: "d1", time: new Date().toISOString() })
  );

  /* ---------- katalog publik ---------- */

  /** Draft hanya ikut kalau pemanggil sudah login sebagai admin. */
  router.get("/api/products", async (ctx) => {
    const includeDrafts = ctx.query.get("includeDrafts") === "1" && !!ctx.user;
    return ctx.json({
      products: await products.list(ctx.env.DB, { includeDrafts: includeDrafts }),
      categories: await products.categories(ctx.env.DB),
      collections: await products.collections(ctx.env.DB),
      storageLabel: "D1 (Cloudflare)",
    });
  });

  router.get("/api/products/:id", async (ctx) => {
    const product = await products.get(ctx.env.DB, ctx.params.id, { includeDrafts: !!ctx.user });
    if (!product) throw new HttpError(404, "Produk tidak ditemukan.");
    return ctx.json({ product: product });
  });

  router.get("/api/taxonomy", async (ctx) =>
    ctx.json({
      categories: await products.categories(ctx.env.DB),
      collections: await products.collections(ctx.env.DB),
    })
  );

  /* ---------- favorit ---------- */

  router.get("/api/favorites", async (ctx) =>
    ctx.json({ favorites: await favorites.list(ctx.env.DB, ctx.visitorId) })
  );

  router.post("/api/favorites", async (ctx) => {
    const productId = String((ctx.body && ctx.body.productId) || "").trim();
    if (!productId) throw new HttpError(400, "productId wajib diisi.");
    if (!(await favorites.productExists(ctx.env.DB, productId))) {
      throw new HttpError(404, "Produk tidak ditemukan.");
    }

    const added = await favorites.toggle(ctx.env.DB, ctx.visitorId, productId);
    return ctx.json({
      favorited: added,
      favorites: await favorites.list(ctx.env.DB, ctx.visitorId),
    });
  });

  /* ---------- autentikasi ---------- */

  router.get("/api/auth/me", (ctx) =>
    ctx.json({
      authenticated: !!ctx.user,
      user: ctx.user ? users.publicUser(ctx.user) : null,
    })
  );

  router.post("/api/auth/login", async (ctx) => {
    const username = String((ctx.body && ctx.body.username) || "").trim();
    const password = String((ctx.body && ctx.body.password) || "");
    const ip = clientIp(ctx.request);
    const { loginMaxAttempts, loginWindowMs, sessionTtlMs, cookieName } = ctx.config;

    if (!username || !password) {
      throw new HttpError(400, "Nama kurator dan kata sandi wajib diisi.");
    }

    if (await users.tooManyAttempts(ctx.env.DB, ip, loginMaxAttempts, loginWindowMs)) {
      throw new HttpError(429, "Terlalu banyak percobaan masuk. Coba lagi beberapa menit lagi.");
    }

    const row = await users.verifyCredentials(ctx.env.DB, username, password);
    if (!row) {
      await users.recordFailure(ctx.env.DB, ip, loginWindowMs);
      throw new HttpError(401, "Nama kurator atau kata sandi salah.");
    }

    await users.clearFailures(ctx.env.DB, ip);
    await users.purgeExpiredSessions(ctx.env.DB);

    const session = await users.createSession(ctx.env.DB, row.id, sessionTtlMs);
    ctx.setCookie(cookieName, session.token, {
      maxAge: Math.floor(sessionTtlMs / 1000),
      sameSite: "Lax",
      secure: ctx.secure,
    });

    return ctx.json({ user: users.publicUser(row) });
  });

  router.post("/api/auth/logout", async (ctx) => {
    await users.destroySession(ctx.env.DB, ctx.sessionToken);
    ctx.setCookie(ctx.config.cookieName, "", {
      maxAge: 0,
      sameSite: "Lax",
      secure: ctx.secure,
    });
    return ctx.json({ ok: true });
  });

  /* ---------- admin (semua butuh sesi login) ---------- */

  router.get("/api/admin/stats", async (ctx) => {
    requireUser(ctx);
    return ctx.json(await products.stats(ctx.env.DB));
  });

  router.post("/api/admin/products", async (ctx) => {
    requireUser(ctx);
    return ctx.json({ product: await products.create(ctx.env.DB, ctx.body || {}) }, 201);
  });

  router.put("/api/admin/products/:id", async (ctx) => {
    requireUser(ctx);
    return ctx.json({ product: await products.update(ctx.env.DB, ctx.params.id, ctx.body || {}) });
  });

  router.patch("/api/admin/products/:id/price", async (ctx) => {
    requireUser(ctx);
    const price = ctx.body && ctx.body.price;
    if (price == null) throw new HttpError(400, "Harga wajib diisi.");
    return ctx.json({ product: await products.updatePrice(ctx.env.DB, ctx.params.id, price) });
  });

  router.delete("/api/admin/products/:id", async (ctx) => {
    requireUser(ctx);
    await products.remove(ctx.env.DB, ctx.params.id);
    return ctx.json({ ok: true });
  });

  router.post("/api/admin/reset", async (ctx) => {
    requireUser(ctx);
    await products.resetCatalogue(ctx.env.DB);
    return ctx.json({ products: await products.list(ctx.env.DB, { includeDrafts: true }) });
  });

  /* ---------- unggah gambar ---------- */

  router.post("/api/uploads", async (ctx) => {
    requireUser(ctx);
    const url = await assets.save(ctx.env.DB, ctx.body && ctx.body.dataUrl, ctx.config.maxImageBytes);
    return ctx.json({ url: url }, 201);
  });
}
