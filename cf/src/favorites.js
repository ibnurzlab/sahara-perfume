/* ============================================================
   SAHARA — favorit per pengunjung (cookie) di D1
   Padanan dari backend/repositories/favorites.js
   ============================================================ */

import { nowIso } from "./utils.js";

export async function list(db, visitorId) {
  if (!visitorId) return [];
  const result = await db
    .prepare("SELECT product_id FROM favorites WHERE visitor_id = ? ORDER BY created_at DESC")
    .bind(visitorId)
    .all();
  return (result.results || []).map((row) => row.product_id);
}

export async function has(db, visitorId, productId) {
  if (!visitorId) return false;
  const row = await db
    .prepare("SELECT 1 AS ok FROM favorites WHERE visitor_id = ? AND product_id = ?")
    .bind(visitorId, productId)
    .first();
  return !!row;
}

/** Mengembalikan true kalau produk baru saja ditambahkan. */
export async function toggle(db, visitorId, productId) {
  if (await has(db, visitorId, productId)) {
    await db
      .prepare("DELETE FROM favorites WHERE visitor_id = ? AND product_id = ?")
      .bind(visitorId, productId)
      .run();
    return false;
  }

  await db
    .prepare("INSERT OR IGNORE INTO favorites (visitor_id, product_id, created_at) VALUES (?,?,?)")
    .bind(visitorId, productId, nowIso())
    .run();
  return true;
}

export async function productExists(db, productId) {
  const row = await db.prepare("SELECT 1 AS ok FROM products WHERE id = ?").bind(productId).first();
  return !!row;
}
