/* ============================================================
   SAHARA — repository produk untuk Cloudflare D1
   Padanan async dari backend/repositories/products.js
   ============================================================ */

import { HttpError } from "./http.js";
import { newId } from "./security.js";
import { chunk, nowIso } from "./utils.js";
import { seedProducts } from "./seed-data.js";

export const STATUSES = ["active", "critical", "draft"];

/* ---------- normalisasi input dari klien ---------- */

function str(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

export function normalize(input) {
  const p = input || {};
  const gallery = Array.isArray(p.gallery)
    ? p.gallery.filter(Boolean).slice(0, 4).map((u) => str(u, 2000))
    : [];
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
    categories: Array.isArray(p.categories)
      ? p.categories.map((c) => str(c, 60)).filter(Boolean).slice(0, 8)
      : [],
    updated: str(p.updated, 40) || "Baru saja",
    sizes: sizes,
  };
}

/* ---------- relasi ---------- */

/**
 * D1 membatasi jumlah parameter per query, jadi id dipecah per 50.
 * Mengembalikan peta { cats, sizes, gallery } yang di-key oleh id produk.
 */
async function relationsFor(db, ids) {
  const cats = {};
  const sizes = {};
  const gallery = {};
  if (!ids.length) return { cats, sizes, gallery };

  for (const group of chunk(ids, 50)) {
    const placeholders = group.map(() => "?").join(",");

    const catRows = await db
      .prepare(
        `SELECT product_id, category_id FROM product_categories
          WHERE product_id IN (${placeholders}) ORDER BY position ASC`
      )
      .bind(...group)
      .all();
    for (const row of catRows.results || []) {
      (cats[row.product_id] = cats[row.product_id] || []).push(row.category_id);
    }

    const sizeRows = await db
      .prepare(
        `SELECT product_id, volume, label, sub, desc_text, price FROM product_sizes
          WHERE product_id IN (${placeholders}) ORDER BY position ASC`
      )
      .bind(...group)
      .all();
    for (const row of sizeRows.results || []) {
      (sizes[row.product_id] = sizes[row.product_id] || []).push({
        volume: row.volume,
        label: row.label,
        sub: row.sub,
        desc: row.desc_text,
        price: row.price,
      });
    }

    const galleryRows = await db
      .prepare(
        `SELECT product_id, url FROM product_gallery
          WHERE product_id IN (${placeholders}) ORDER BY position ASC`
      )
      .bind(...group)
      .all();
    for (const row of galleryRows.results || []) {
      (gallery[row.product_id] = gallery[row.product_id] || []).push(row.url);
    }
  }

  return { cats, sizes, gallery };
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

async function hydrate(db, rows) {
  const relations = await relationsFor(db, rows.map((r) => r.id));
  return rows.map((row) => toProduct(row, relations));
}

/* ---------- baca ---------- */

export async function list(db, options) {
  const includeDrafts = options && options.includeDrafts ? 1 : 0;
  const result = await db
    .prepare(
      `SELECT * FROM products
        WHERE (? = 1 OR status <> 'draft')
        ORDER BY sort_order ASC, created_at DESC`
    )
    .bind(includeDrafts)
    .all();
  return hydrate(db, result.results || []);
}

export async function get(db, id, options) {
  const includeDrafts = options && options.includeDrafts ? 1 : 0;
  const row = await db
    .prepare("SELECT * FROM products WHERE id = ? AND (? = 1 OR status <> 'draft')")
    .bind(String(id), includeDrafts)
    .first();
  if (!row) return null;
  const relations = await relationsFor(db, [row.id]);
  return toProduct(row, relations);
}

export async function exists(db, id) {
  const row = await db.prepare("SELECT 1 AS ok FROM products WHERE id = ?").bind(String(id)).first();
  return !!row;
}

/** Statistik ringkas untuk header panel admin. */
export async function stats(db) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS variants,
              COALESCE(ROUND(AVG(price)), 0) AS average,
              COUNT(DISTINCT COALESCE(collection_id, '')) AS editions
         FROM products`
    )
    .first();
  return { variants: row.variants, average: row.average, editions: row.editions };
}

async function nextSortOrder(db) {
  const row = await db.prepare("SELECT MIN(sort_order) AS min FROM products").first();
  return row && row.min != null ? row.min - 1 : 10;
}

/* ---------- tulis ---------- */

function insertStatement(db, id, product, sortOrder) {
  const now = nowIso();
  return db
    .prepare(
      `INSERT INTO products (
         id, name, concentration, collection_id, badge, volume, price, status,
         rating, reviews, notes, sku, description,
         note_top, note_heart, note_base, image, admin_image,
         updated_label, sort_order, created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      id,
      product.name,
      product.concentration,
      product.collection,
      product.badge,
      product.volume,
      product.price,
      product.status,
      product.rating,
      product.reviews,
      product.notes,
      product.sku,
      product.description,
      product.pyramid.top,
      product.pyramid.heart,
      product.pyramid.base,
      product.image,
      product.adminImage,
      product.updated,
      sortOrder,
      now,
      now
    );
}

/** Deretan statement untuk mengganti seluruh relasi sebuah produk. */
function relationStatements(db, productId, product) {
  const statements = [
    db.prepare("DELETE FROM product_gallery WHERE product_id = ?").bind(productId),
    db.prepare("DELETE FROM product_sizes WHERE product_id = ?").bind(productId),
    db.prepare("DELETE FROM product_categories WHERE product_id = ?").bind(productId),
  ];

  const gallery = (product.gallery && product.gallery.length ? product.gallery : [product.image]).filter(Boolean);
  gallery.slice(0, 4).forEach((url, i) => {
    statements.push(
      db.prepare("INSERT INTO product_gallery (product_id, position, url) VALUES (?,?,?)").bind(productId, i, url)
    );
  });

  product.categories.forEach((categoryId, i) => {
    statements.push(
      db
        .prepare("INSERT OR IGNORE INTO product_categories (product_id, category_id, position) VALUES (?,?,?)")
        .bind(productId, categoryId, i)
    );
  });

  product.sizes.forEach((size, i) => {
    statements.push(
      db
        .prepare(
          `INSERT INTO product_sizes (product_id, position, volume, label, sub, desc_text, price)
           VALUES (?,?,?,?,?,?,?)`
        )
        .bind(productId, i, size.volume, size.label, size.sub, size.desc, size.price)
    );
  });

  return statements;
}

export async function create(db, payload) {
  const product = normalize(payload);
  const id = str(payload && payload.id, 60) || newId("p");
  if (await exists(db, id)) throw new HttpError(409, "Produk dengan id tersebut sudah ada.");

  const sortOrder = await nextSortOrder(db);

  /* db.batch() berjalan dalam satu transaksi implisit. */
  await db.batch([insertStatement(db, id, product, sortOrder), ...relationStatements(db, id, product)]);

  return get(db, id, { includeDrafts: true });
}

export async function update(db, id, payload, options) {
  const opts = options || {};
  const current = await db.prepare("SELECT * FROM products WHERE id = ?").bind(String(id)).first();
  if (!current) throw new HttpError(404, "Produk tidak ditemukan.");

  const product = normalize(payload);
  const touch = opts.touch === false ? current.updated_label : product.updated;

  await db.batch([
    db
      .prepare(
        `UPDATE products SET
           name = ?, concentration = ?, collection_id = ?, badge = ?, volume = ?, price = ?,
           status = ?, rating = ?, reviews = ?, notes = ?, sku = ?, description = ?,
           note_top = ?, note_heart = ?, note_base = ?, image = ?, admin_image = ?,
           updated_label = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        product.name,
        product.concentration,
        product.collection,
        product.badge,
        product.volume,
        product.price,
        product.status,
        product.rating,
        product.reviews,
        product.notes,
        product.sku,
        product.description,
        product.pyramid.top,
        product.pyramid.heart,
        product.pyramid.base,
        product.image,
        product.adminImage,
        touch,
        nowIso(),
        id
      ),
    ...relationStatements(db, id, product),
  ]);

  return get(db, id, { includeDrafts: true });
}

/** Ubah harga saja — dipakai modal "edit cepat" di panel admin. */
export async function updatePrice(db, id, price) {
  const product = await get(db, id, { includeDrafts: true });
  if (!product) throw new HttpError(404, "Produk tidak ditemukan.");

  const value = Math.max(0, Math.round(Number(price) || 0));

  const statements = [
    db
      .prepare("UPDATE products SET price = ?, updated_label = ?, updated_at = ? WHERE id = ?")
      .bind(value, "Baru saja", nowIso(), id),
  ];

  /* ikuti varian flacon utama supaya halaman detail tetap konsisten */
  const last = product.sizes[product.sizes.length - 1];
  if (last) {
    statements.push(
      db
        .prepare(
          `UPDATE product_sizes SET price = ?, label = ?
            WHERE product_id = ? AND position = (
              SELECT MAX(position) FROM product_sizes WHERE product_id = ?
            )`
        )
        .bind(value, (last.volume || product.volume || "100ml") + " Flacon", id, id)
    );
  }

  await db.batch(statements);
  return get(db, id, { includeDrafts: true });
}

export async function remove(db, id) {
  const result = await db.prepare("DELETE FROM products WHERE id = ?").bind(String(id)).run();
  const changes = result && result.meta ? result.meta.changes : 0;
  if (!changes) throw new HttpError(404, "Produk tidak ditemukan.");
  return { ok: true };
}

/* ---------- taksonomi ---------- */

export async function categories(db) {
  const result = await db.prepare("SELECT id, label FROM categories ORDER BY position ASC").all();
  return result.results || [];
}

export async function collections(db) {
  const result = await db.prepare("SELECT id, label FROM collections ORDER BY position ASC").all();
  return result.results || [];
}

/** Dipakai tombol "reset katalog" di panel admin. */
export async function resetCatalogue(db) {
  const statements = [
    db.prepare("DELETE FROM product_gallery"),
    db.prepare("DELETE FROM product_sizes"),
    db.prepare("DELETE FROM product_categories"),
    db.prepare("DELETE FROM products"),
  ];

  seedProducts().forEach((raw, i) => {
    const product = normalize(raw);
    statements.push(insertStatement(db, raw.id, product, (i + 1) * 10));
    statements.push(...relationStatements(db, raw.id, product));
  });

  await db.batch(statements);
}
