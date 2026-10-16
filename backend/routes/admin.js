/* ============================================================
   SAHARA — rute admin (semua butuh sesi login)
   ============================================================ */
"use strict";

const { sendJson, HttpError } = require("../lib/http");
const products = require("../repositories/products");
const db = require("../db");

function requireUser(ctx) {
  if (!ctx.user) throw new HttpError(401, "Sesi admin tidak ditemukan. Silakan masuk kembali.");
}

function register(router) {
  router.get("/api/admin/stats", (req, res, ctx) => {
    requireUser(ctx);
    sendJson(res, 200, products.stats());
  });

  router.post("/api/admin/products", (req, res, ctx) => {
    requireUser(ctx);
    const product = products.create(ctx.body || {});
    sendJson(res, 201, { product: product });
  });

  router.put("/api/admin/products/:id", (req, res, ctx) => {
    requireUser(ctx);
    const product = products.update(ctx.params.id, ctx.body || {});
    sendJson(res, 200, { product: product });
  });

  router.patch("/api/admin/products/:id/price", (req, res, ctx) => {
    requireUser(ctx);
    const price = ctx.body && ctx.body.price;
    if (price == null) throw new HttpError(400, "Harga wajib diisi.");
    const product = products.updatePrice(ctx.params.id, price);
    sendJson(res, 200, { product: product });
  });

  router.delete("/api/admin/products/:id", (req, res, ctx) => {
    requireUser(ctx);
    products.remove(ctx.params.id);
    sendJson(res, 200, { ok: true });
  });

  router.post("/api/admin/reset", (req, res, ctx) => {
    requireUser(ctx);
    db.resetCatalogue();
    sendJson(res, 200, { products: products.list({ includeDrafts: true }) });
  });
}

module.exports = { register };
