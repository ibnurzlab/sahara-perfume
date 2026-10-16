/* ============================================================
   SAHARA — koneksi database, migrasi, dan seeding
   Memakai modul bawaan Node: `node:sqlite` (tanpa dependensi).
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

let DatabaseSync;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch (err) {
  console.error("");
  console.error("  Modul bawaan `node:sqlite` tidak tersedia pada Node " + process.version + ".");
  console.error("  Gunakan Node.js 24 atau lebih baru, atau jalankan dengan flag --experimental-sqlite.");
  console.error("");
  process.exit(1);
}

const config = require("../config");
const security = require("../lib/security");
const seedData = require("./seed-data");

/* ---------- buka koneksi ---------- */

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

const db = new DatabaseSync(config.dbFile);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

const SCHEMA_VERSION = 1;

/* ---------- helpers ---------- */

function nowIso() {
  return new Date().toISOString();
}

/** node:sqlite menolak boolean & undefined — normalkan ke number/null. */
function v(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

function tx(fn) {
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (err) {
    try { db.exec("ROLLBACK"); } catch (e) { /* already rolled back */ }
    throw err;
  }
}

function countRows(table) {
  return db.prepare("SELECT COUNT(*) AS n FROM " + table).get().n;
}

/* ---------- seeding ---------- */

function seedTaxonomy() {
  const insertCategory = db.prepare(
    "INSERT OR REPLACE INTO categories (id, label, position) VALUES (?, ?, ?)"
  );
  seedData.CATEGORIES.forEach((c, i) => insertCategory.run(v(c.id), v(c.label), i));

  const insertCollection = db.prepare(
    "INSERT OR REPLACE INTO collections (id, label, position) VALUES (?, ?, ?)"
  );
  seedData.COLLECTIONS.forEach((c, i) => insertCollection.run(v(c.id), v(c.label), i));
}

function insertProduct(product, sortOrder) {
  const now = nowIso();
  db.prepare(
    `INSERT INTO products (
       id, name, concentration, collection_id, badge, volume, price, status,
       rating, reviews, notes, sku, description,
       note_top, note_heart, note_base, image, admin_image,
       updated_label, sort_order, created_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    v(product.id),
    v(product.name),
    v(product.concentration || "Eau de Parfum"),
    v(product.collection),
    v(product.badge || ""),
    v(product.volume || "100ml"),
    v(Number(product.price) || 0),
    v(product.status || "active"),
    v(Number(product.rating) || 0),
    v(Number(product.reviews) || 0),
    v(product.notes || ""),
    v(product.sku || ""),
    v(product.description || ""),
    v((product.pyramid && product.pyramid.top) || ""),
    v((product.pyramid && product.pyramid.heart) || ""),
    v((product.pyramid && product.pyramid.base) || ""),
    v(product.image || ""),
    v(product.adminImage || product.image || ""),
    v(product.updated || "Stabil"),
    v(sortOrder),
    now,
    now
  );
}

function attachRelations(product) {
  const gallery = (product.gallery && product.gallery.length ? product.gallery : [product.image]).filter(Boolean);
  gallery.slice(0, 4).forEach((url, i) => {
    db.prepare(
      "INSERT INTO product_gallery (product_id, position, url) VALUES (?,?,?)"
    ).run(v(product.id), i, v(url));
  });

  (product.categories || []).forEach((categoryId, i) => {
    db.prepare(
      "INSERT OR IGNORE INTO product_categories (product_id, category_id, position) VALUES (?,?,?)"
    ).run(v(product.id), v(categoryId), i);
  });

  (product.sizes || []).forEach((size, i) => {
    db.prepare(
      `INSERT INTO product_sizes (product_id, position, volume, label, sub, desc_text, price)
       VALUES (?,?,?,?,?,?,?)`
    ).run(
      v(product.id),
      i,
      v(size.volume || ""),
      v(size.label || ""),
      v(size.sub || ""),
      v(size.desc || ""),
      v(Number(size.price) || 0)
    );
  });
}

function seedCatalogue() {
  tx(() => {
    db.exec("DELETE FROM product_gallery");
    db.exec("DELETE FROM product_sizes");
    db.exec("DELETE FROM product_categories");
    db.exec("DELETE FROM products");
    seedData.products().forEach((product, i) => {
      insertProduct(product, (i + 1) * 10);
      attachRelations(product);
    });
  });
}

function seedAdmin() {
  if (countRows("users") > 0) return;
  db.prepare(
    "INSERT INTO users (username, password_hash, display_name, role, created_at) VALUES (?,?,?,?,?)"
  ).run(
    v(config.admin.username),
    v(security.hashPassword(config.admin.password)),
    v(config.admin.displayName),
    v("curator"),
    v(nowIso())
  );
}

function ensureSeeded() {
  seedTaxonomy();
  if (countRows("products") === 0) {
    seedCatalogue();
  }
  seedAdmin();
}

/** Dipakai tombol "reset katalog" di panel admin. */
function resetCatalogue() {
  seedCatalogue();
}

/* ---------- pembersihan ---------- */
function purgeExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(v(nowIso()));
}

module.exports = {
  db,
  v,
  tx,
  nowIso,
  countRows,
  ensureSeeded,
  resetCatalogue,
  purgeExpiredSessions,
  SCHEMA_VERSION,
};
