/* ============================================================
   SAHARA — rute unggah gambar
   Klien mengirim gambar yang sudah dikompres sebagai data URL;
   server menyimpannya sebagai berkas dan mengembalikan URL-nya.
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const config = require("../config");
const { sendJson, HttpError } = require("../lib/http");
const { newId } = require("../lib/security");

const DATA_URL = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\s]+)$/i;

function register(router) {
  router.post("/api/uploads", (req, res, ctx) => {
    if (!ctx.user) throw new HttpError(401, "Sesi admin tidak ditemukan. Silakan masuk kembali.");

    const dataUrl = String((ctx.body && ctx.body.dataUrl) || "");
    const match = DATA_URL.exec(dataUrl);
    if (!match) throw new HttpError(400, "Format gambar tidak didukung (gunakan PNG, JPEG, atau WebP).");

    const buffer = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
    if (!buffer.length) throw new HttpError(400, "Gambar kosong.");
    if (buffer.length > config.maxImageBytes) {
      throw new HttpError(413, "Gambar terlalu besar setelah dikompres.");
    }

    const ext = match[1].toLowerCase() === "png" ? "png" : match[1].toLowerCase() === "webp" ? "webp" : "jpg";
    const filename = newId("img") + "." + ext;

    fs.mkdirSync(config.uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(config.uploadsDir, filename), buffer);

    sendJson(res, 201, { url: "/uploads/" + filename });
  });
}

module.exports = { register };
