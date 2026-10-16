/* ============================================================
   SAHARA — rute publik: katalog, taksonomi, favorit
   ============================================================ */
"use strict";

const { sendJson, HttpError } = require("../lib/http");
const products = require("../repositories/products");
const favorites = require("../repositories/favorites");

function register(router) {
  /* ---------- sistem ---------- */

  router.get("/api/health", (req, res) => {
    sendJson(res, 200, { ok: true, storage: "sqlite", time: new Date().toISOString() });
  });

  /** Daftar produk. Draft hanya ikut kalau pemanggil sudah login sebagai admin. */
  router.get("/api/products", (req, res, ctx) => {
    const includeDrafts = ctx.query.get("includeDrafts") === "1" && !!ctx.user;
    sendJson(res, 200, {
      products: products.list({ includeDrafts: includeDrafts }),
      categories: products.categories(),
      collections: products.collections(),
      storageLabel: "SQLite (server)",
    });
  });

  router.get("/api/products/:id", (req, res, ctx) => {
    const product = products.get(ctx.params.id, { includeDrafts: !!ctx.user });
    if (!product) throw new HttpError(404, "Produk tidak ditemukan.");
    sendJson(res, 200, { product: product });
  });

  router.get("/api/taxonomy", (req, res) => {
    sendJson(res, 200, {
      categories: products.categories(),
      collections: products.collections(),
    });
  });

  /* ---------- favorit ---------- */

  router.get("/api/favorites", (req, res, ctx) => {
    sendJson(res, 200, { favorites: favorites.list(ctx.visitorId) });
  });

  router.post("/api/favorites", (req, res, ctx) => {
    const productId = String((ctx.body && ctx.body.productId) || "").trim();
    if (!productId) throw new HttpError(400, "productId wajib diisi.");
    if (!favorites.productExists(productId)) throw new HttpError(404, "Produk tidak ditemukan.");

    const added = favorites.toggle(ctx.visitorId, productId);
    sendJson(res, 200, { favorited: added, favorites: favorites.list(ctx.visitorId) });
  });
}

module.exports = { register };
