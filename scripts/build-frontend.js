/* ============================================================
   SAHARA — bangun folder `dist/` untuk dideploy.

   Hanya berkas publik yang disalin (daftar putih), sehingga
   `backend/`, database, dan berkas proyek lain tidak pernah
   ikut terunggah ke Cloudflare.
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist");

const PAGES = [
  "index.html",
  "detail.html",
  "masuk.html",
  "login.html",
  "admin.html",
  "upload.html",
];

const DIRS = ["assets"];

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) n += copyDir(src, dst);
    else if (entry.isFile()) {
      fs.copyFileSync(src, dst);
      n += 1;
    }
  }
  return n;
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  let count = 0;
  const missing = [];

  for (const page of PAGES) {
    const src = path.join(ROOT, page);
    if (!fs.existsSync(src)) {
      missing.push(page);
      continue;
    }
    fs.copyFileSync(src, path.join(OUT, page));
    count += 1;
  }

  for (const dir of DIRS) {
    const src = path.join(ROOT, dir);
    if (!fs.existsSync(src)) {
      missing.push(dir + "/");
      continue;
    }
    count += copyDir(src, path.join(OUT, dir));
  }

  if (missing.length) {
    console.error("Berkas tidak ditemukan: " + missing.join(", "));
    process.exit(1);
  }

  console.log("Frontend dibangun: " + count + " berkas → dist/");
}

build();
