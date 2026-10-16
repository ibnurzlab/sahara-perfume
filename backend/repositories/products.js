/* ============================================================
   SAHARA — repository produk
   Semua query memakai prepared statement dengan parameter.
   ============================================================ */
"use strict";

const { db, v, tx, nowIso } = require("../db");
const { HttpError } = require("../lib/http");
const { newId } = require("../lib/security");
const seedData = require("../db/seed-data");

const STATUSES = ["active", "critical", "draft"];

/* ---------- normalisasi input dari klien ---------- */

function str(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function normalize(input) {
  const p = input || {};
  const gallery = Array.isArray(p.gallery) ? p.gallery.filter(Boolean).slice(0, 4).map((u) => str(u, 2000)) : [];
  const sizes = Array.isArray(p.sizes)
    ? p.sizes.slice(0, 6).map((s) => ({
        volume: str(s.volume, 20),
        label: str(s.label, 60),
        sub: str(s.sub, 40),
        desc: str(s.desc, 400),
        price: Math.max(0, Math.round(Number(s.price) || 0)),
      }))
    : [];

  return {
    name: str(p.name, 120) || "Parfum Tanpa Nama",
    concentration: str(p.concentration, 80) || "Eau de Parfum",
    collection: p.collection ? str(p.collection, 80) : null,
    badge: str(p.badge, 40),
    volume: str(p.volume, 20) || "100ml",
    price: Math.max(0, Math.round(Number(p.price) || 0)),
    status: STATUSES.indexOf(p.status) !== -1 ? p.status : "active",
    rating: Math.min(5, Math.max(0, Number(p.rating) || 0)),
    reviews: Math.max(0, Math.round(Number(p.reviews) || 0)),
    notes: str(p.notes, 300),
    sku: str(p.sku, 40),
    description: str(p.description, 2000),
    pyramid: {
      top: str(p.pyramid && p.pyramid.top, 300),
      heart: str(p.pyramid && p.pyramid.heart, 300),
      base: str(p.pyramid && p.pyramid.base, 300),
    },
    image: str(p.image, 2000),
    adminImage: str(p.adminImage || p.image, 2000),
    gallery: gallery,
    categories: Array.isArray(p.categories) ? p.categories.map((c) => str(c, 60)).filter(Boolean).slice(0, 8) : [],
    updated: str(p.updated, 40) || "Baru saja",
    sizes: sizes,
  };
}

/* ---------- pemetaan baris → objek produk (bentuk yang dipakai frontend) ---------- */

function relationsFor(ids) {
  const empty = { cats: {}, sizes: {}, gallery: {} };
  if (!ids.length) return empty;

  const placeholders = ids.map(() => "?").join(",");

  const cats = {};
  db.prepare(
    `SELECT product_id, category_id FROM product_categories
      WHERE product_id IN (${placeholders}) ORDER BY position ASC`
  )
    .all(...ids)
    .forEach((row) => {
      (cats[row.product_id] = cats[row.product_id] || []).push(row.category_id);
    });

  const sizes = {};
  db.prepare(
    `SELECT product_id, volume, label, sub, desc_text, price FROM product_sizes
      WHERE product_id IN (${placeholders}) ORDER BY position ASC`
  )
    .all(...ids)
    .forEach((row) => {
      (sizes[row.product_id] = sizes[row.product_id] || []).push({
        volume: row.volume,
        label: row.label,
        sub: row.sub,
        desc: row.desc_text,
        price: row.price,
      });
    });

  const gallery = {};
  db.prepare(
    `SELECT product_id, url FROM product_gallery
      WHERE product_id IN (${placeholders}) ORDER BY position ASC`
  )
    .all(...ids)
    .forEach((row) => {
      (gallery[row.product_id] = gallery[row.product_id] || []).push(row.url);
    });

  return { cats: cats, sizes: sizes, gallery: gallery };
}

function toProduct(row, relations) {
  return {
    id: row.id,
    name: row.name,
    concentration: row.concentration,
    collection: row.collection_id || "",
    badge: row.badge,
    volume: row.volume,
    price: row.price,
    categories: relations.cats[row.id] || [],
    status: row.status,
    updated: row.updated_label,
    rating: row.rating,
    reviews: row.reviews,
    notes: row.notes,
    sku: row.sku,
    description: row.description,
    pyramid: {
      top: row.note_top,
      heart: row.note_heart,
      base: row.note_base,
    },
    image: row.image,
    adminImage: row.admin_image || row.image,
    gallery: relations.gallery[row.id] || [],
    sizes: relations.sizes[row.id] || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hydrate(rows) {
  const relations = relationsFor(rows.map((r) => r.id));
  return rows.map((row) => toProduct(row, relations));
}

/* ---------- baca ---------- */

function list(options) {
  const opts = options || {};
  const includeDrafts = opts.includeDrafts ? 1 : 0;
  const rows = db
    .prepare(
      `SELECT * FROM products
        WHERE (? = 1 OR status <> 'draft')
        ORDER BY sort_order ASC, created_at DESC`
    )
    .all(includeDrafts);
  return hydrate(rows);
}

function get(id, options) {
  const opts = options || {};
  const includeDrafts = opts.includeDrafts ? 1 : 0;
  const row = db
    .prepare("SELECT * FROM products WHERE id = ? AND (? = 1 OR status <> 'draft')")
    .get(String(id), includeDrafts);
  if (!row) return null;
  return toProduct(row, relationsFor([row.id]));
}

function exists(id) {
  return !!db.prepare("SELECT 1 AS ok FROM products WHERE id = ?").get(String(id));
}

/** Statistik ringkas untuk header panel admin. */
function stats() {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS variants,
              COALESCE(ROUND(AVG(price)), 0) AS average,
              COUNT(DISTINCT COALESCE(collection_id, '')) AS editions
         FROM products`
    )
    .get();
  return { variants: row.variants, average: row.average, editions: row.editions };
}

function nextSortOrder() {
  const row = db.prepare("SELECT MIN(sort_order) AS min FROM products").get();
  return row.min == null ? 10 : row.min - 1;
}

/* ---------- tulis ---------- */

function writeRelations(productId, product) {
  db.prepare("DELETE FROM product_gallery WHERE product_id = ?").run(v(productId));
  db.prepare("DELETE FROM product_sizes WHERE product_id = ?").run(v(productId));
  db.prepare("DELETE FROM product_categories WHERE product_id = ?").run(v(productId));

  const gallery = (product.gallery && product.gallery.length ? product.gallery : [product.image]).filter(Boolean);
  gallery.slice(0, 4).forEach((url, i) => {
    db.prepare("INSERT INTO product_gallery (product_id, position, url) VALUES (?,?,?)").run(
      v(productId), i, v(url)
    );
  });

  product.categories.forEach((categoryId, i) => {
    db.prepare(
      "INSERT OR IGNORE INTO product_categories (product_id, category_id, position) VALUES (?,?,?)"
    ).run(v(productId), v(categoryId), i);
  });

  product.sizes.forEach((size, i) => {
    db.prepare(
      `INSERT INTO product_sizes (product_id, position, volume, label, sub, desc_text, price)
       VALUES (?,?,?,?,?,?,?)`
    ).run(v(productId), i, v(size.volume), v(size.label), v(size.sub), v(size.desc), v(size.price));
  });
}

function create(payload) {
  const product = normalize(payload);
  const id = str(payload && payload.id, 60) || newId("p");
  if (exists(id)) throw new HttpError(409, "Produk dengan id tersebut sudah ada.");

  const now = nowIso();

  tx(() => {
    db.prepare(
      `INSERT INTO products (
         id, name, concentration, collection_id, badge, volume, price, status,
         rating, reviews, notes, sku, description,
         note_top, note_heart, note_base, image, admin_image,
         updated_label, sort_order, created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      v(id), v(product.name), v(product.concentration), v(product.collection), v(product.badge),
      v(product.volume), v(product.price), v(product.status), v(product.rating), v(product.reviews),
      v(product.notes), v(product.sku), v(product.description),
      v(product.pyramid.top), v(product.pyramid.heart), v(product.pyramid.base),
      v(product.image), v(product.adminImage), v(product.updated),
      v(nextSortOrder()), now, now
    );
    writeRelations(id, product);
  });

  return get(id, { includeDrafts: true });
}

function update(id, payload, options) {
  const opts = options || {};
  if (!exists(id)) throw new HttpError(404, "Produk tidak ditemukan.");

  const current = db.prepare("SELECT * FROM products WHERE id = ?").get(String(id));
  const product = normalize(payload);
  const touch = opts.touch === false ? current.updated_label : product.updated;

  tx(() => {
    db.prepare(
      `UPDATE products SET
         name = ?, concentration = ?, collection_id = ?, badge = ?, volume = ?, price = ?,
         status = ?, rating = ?, reviews = ?, notes = ?, sku = ?, description = ?,
         note_top = ?, note_heart = ?, note_base = ?, image = ?, admin_image = ?,
         updated_label = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      v(product.name), v(product.concentration), v(product.collection), v(product.badge),
      v(product.volume), v(product.price), v(product.status), v(product.rating), v(product.reviews),
      v(product.notes), v(product.sku), v(product.description),
      v(product.pyramid.top), v(product.pyramid.heart), v(product.pyramid.base),
      v(product.image), v(product.adminImage), v(touch), v(nowIso()), v(id)
    );
    writeRelations(id, product);
  });

  return get(id, { includeDrafts: true });
}

/** Ubah harga saja — dipakai modal "edit cepat" di panel admin. */
function updatePrice(id, price) {
  const product = get(id, { includeDrafts: true });
  if (!product) throw new HttpError(404, "Produk tidak ditemukan.");

  const value = Math.max(0, Math.round(Number(price) || 0));

  tx(() => {
    db.prepare("UPDATE products SET price = ?, updated_label = ?, updated_at = ? WHERE id = ?").run(
      v(value), v("Baru saja"), v(nowIso()), v(id)
    );

    /* ikuti varian flacon utama supaya halaman detail tetap konsisten */
    const last = product.sizes[product.sizes.length - 1];
    if (last) {
      db.prepare(
        `UPDATE product_sizes SET price = ?, label = ?
          WHERE product_id = ? AND position = (
            SELECT MAX(position) FROM product_sizes WHERE product_id = ?
          )`
      ).run(v(value), v((last.volume || product.volume || "100ml") + " Flacon"), v(id), v(id));
    }
  });

  return get(id, { includeDrafts: true });
}

function remove(id) {
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(String(id));
  if (!result.changes) throw new HttpError(404, "Produk tidak ditemukan.");
  return { ok: true };
}

/* ---------- taksonomi ---------- */

function categories() {
  return db.prepare("SELECT id, label FROM categories ORDER BY position ASC").all();
}

function collections() {
  return db.prepare("SELECT id, label FROM collections ORDER BY position ASC").all();
}

module.exports = {
  STATUSES,
  list,
  get,
  create,
  update,
  updatePrice,
  remove,
  stats,
  categories,
  collections,
  normalize,
  seedSizes: seedData.makeSizes,
};
