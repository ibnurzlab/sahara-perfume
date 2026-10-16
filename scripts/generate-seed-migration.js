/* ============================================================
   SAHARA — hasilkan berkas seed untuk backend Cloudflare.

   Satu sumber data (`backend/db/seed-data.js`, dipakai versi Node
   lokal) menghasilkan dua berkas:

     1. cf/migrations/0002_seed_catalogue.sql  → seed saat migrasi D1
     2. cf/src/seed-data.js                    → dipakai tombol "reset katalog"

   Dengan begitu katalog contoh tidak pernah menyimpang antara
   backend Node dan backend Cloudflare.

   Jalankan:  node scripts/generate-seed-migration.js
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const seedData = require("../backend/db/seed-data.js");

const ROOT = path.resolve(__dirname, "..");
const SQL_OUT = path.join(ROOT, "cf", "migrations", "0002_seed_catalogue.sql");
const JS_OUT = path.join(ROOT, "cf", "src", "seed-data.js");

const q = (value) => "'" + String(value == null ? "" : value).replace(/'/g, "''") + "'";
const n = (value) => String(Number(value) || 0);

const products = seedData.products();

/* ---------- 1. migrasi SQL ---------- */

function buildSql() {
  const lines = [];
  lines.push("-- ============================================================");
  lines.push("-- SAHARA — data contoh katalog (dihasilkan otomatis)");
  lines.push("-- Sumber: backend/db/seed-data.js");
  lines.push("-- Jangan disunting manual; jalankan scripts/generate-seed-migration.js");
  lines.push("-- ============================================================");
  lines.push("");

  lines.push("-- taksonomi");
  seedData.CATEGORIES.forEach((c, i) => {
    lines.push(`INSERT OR REPLACE INTO categories (id, label, position) VALUES (${q(c.id)}, ${q(c.label)}, ${i});`);
  });
  lines.push("");
  seedData.COLLECTIONS.forEach((c, i) => {
    lines.push(`INSERT OR REPLACE INTO collections (id, label, position) VALUES (${q(c.id)}, ${q(c.label)}, ${i});`);
  });
  lines.push("");

  lines.push("-- produk");
  products.forEach((p, i) => {
    const sortOrder = (i + 1) * 10;
    lines.push(
      "INSERT OR REPLACE INTO products (" +
        "id, name, concentration, collection_id, badge, volume, price, status, " +
        "rating, reviews, notes, sku, description, note_top, note_heart, note_base, " +
        "image, admin_image, updated_label, sort_order, created_at, updated_at" +
        ") VALUES (" +
        [
          q(p.id),
          q(p.name),
          q(p.concentration),
          q(p.collection),
          q(p.badge),
          q(p.volume),
          n(p.price),
          q(p.status),
          Number(p.rating) || 0,
          n(p.reviews),
          q(p.notes),
          q(p.sku),
          q(p.description),
          q(p.pyramid && p.pyramid.top),
          q(p.pyramid && p.pyramid.heart),
          q(p.pyramid && p.pyramid.base),
          q(p.image),
          q(p.adminImage || p.image),
          q(p.updated || "Stabil"),
          sortOrder,
          "datetime('now')",
          "datetime('now')",
        ].join(", ") +
        ");"
    );

    p.categories.forEach((categoryId, ci) => {
      lines.push(
        `INSERT OR IGNORE INTO product_categories (product_id, category_id, position) VALUES (${q(p.id)}, ${q(categoryId)}, ${ci});`
      );
    });

    p.sizes.forEach((s, si) => {
      lines.push(
        "INSERT INTO product_sizes (product_id, position, volume, label, sub, desc_text, price) VALUES (" +
          `${q(p.id)}, ${si}, ${q(s.volume)}, ${q(s.label)}, ${q(s.sub)}, ${q(s.desc)}, ${n(s.price)});`
      );
    });

    const gallery = (p.gallery && p.gallery.length ? p.gallery : [p.image]).filter(Boolean).slice(0, 4);
    gallery.forEach((url, gi) => {
      lines.push(`INSERT INTO product_gallery (product_id, position, url) VALUES (${q(p.id)}, ${gi}, ${q(url)});`);
    });

    lines.push("");
  });

  return lines.join("\n");
}

/* ---------- 2. modul ESM untuk Worker ---------- */

function buildEsm() {
  const payload = {
    categories: seedData.CATEGORIES,
    collections: seedData.COLLECTIONS,
    products: products,
  };

  return [
    "/* ============================================================",
    "   SAHARA — data contoh katalog untuk backend Cloudflare",
    "   DIHASILKAN OTOMATIS dari backend/db/seed-data.js",
    "   Jangan disunting manual; jalankan scripts/generate-seed-migration.js",
    "   ============================================================ */",
    "",
    "export const CATEGORIES = " + JSON.stringify(payload.categories, null, 2) + ";",
    "",
    "export const COLLECTIONS = " + JSON.stringify(payload.collections, null, 2) + ";",
    "",
    "/** Salinan baru setiap pemanggilan supaya pemanggil bebas mengubahnya. */",
    "export function seedProducts() {",
    "  return JSON.parse(JSON.stringify(SEED_PRODUCTS));",
    "}",
    "",
    "const SEED_PRODUCTS = " + JSON.stringify(payload.products, null, 2) + ";",
    "",
  ].join("\n");
}

fs.mkdirSync(path.dirname(SQL_OUT), { recursive: true });
fs.mkdirSync(path.dirname(JS_OUT), { recursive: true });
fs.writeFileSync(SQL_OUT, buildSql(), "utf8");
fs.writeFileSync(JS_OUT, buildEsm(), "utf8");

const sizeCount = products.reduce((a, p) => a + p.sizes.length, 0);
const galleryCount = products.reduce((a, p) => a + Math.min(4, (p.gallery || []).length || 1), 0);

console.log("Seed Cloudflare dibuat:");
console.log("  cf/migrations/0002_seed_catalogue.sql");
console.log("  cf/src/seed-data.js");
console.log(
  "  " + products.length + " produk, " + sizeCount + " varian ukuran, " + galleryCount + " foto galeri"
);
