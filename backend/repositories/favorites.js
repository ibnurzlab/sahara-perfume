/* ============================================================
   SAHARA — repository favorit (per-pengunjung, berbasis cookie)
   ============================================================ */
"use strict";

const { db, v, nowIso } = require("../db");

function list(visitorId) {
  if (!visitorId) return [];
  return db
    .prepare("SELECT product_id FROM favorites WHERE visitor_id = ? ORDER BY created_at DESC")
    .all(v(visitorId))
    .map((row) => row.product_id);
}

function has(visitorId, productId) {
  if (!visitorId) return false;
  return !!db
    .prepare("SELECT 1 AS ok FROM favorites WHERE visitor_id = ? AND product_id = ?")
    .get(v(visitorId), v(productId));
}

/** Mengembalikan true kalau produk baru saja ditambahkan. */
function toggle(visitorId, productId) {
  if (has(visitorId, productId)) {
    db.prepare("DELETE FROM favorites WHERE visitor_id = ? AND product_id = ?").run(
      v(visitorId), v(productId)
    );
    return false;
  }
  db.prepare("INSERT INTO favorites (visitor_id, product_id, created_at) VALUES (?,?,?)").run(
    v(visitorId), v(productId), v(nowIso())
  );
  return true;
}

function productExists(productId) {
  return !!db.prepare("SELECT 1 AS ok FROM products WHERE id = ?").get(v(productId));
}

module.exports = { list, has, toggle, productExists };
