/* ============================================================
   SAHARA — penyimpanan gambar unggahan

   Di Cloudflare tidak ada disk, jadi gambar (yang sudah
   dikompres klien menjadi JPEG kecil) disimpan sebagai base64
   di tabel `assets`. Untuk katalog besar, pindahkan ke
   Cloudflare R2 — lihat README.
   ============================================================ */

import { HttpError } from "./http.js";
import { newId } from "./security.js";
import { nowIso } from "./utils.js";

const DATA_URL = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\s]+)$/i;

export async function save(db, dataUrl, maxBytes) {
  const match = DATA_URL.exec(String(dataUrl || ""));
  if (!match) {
    throw new HttpError(400, "Format gambar tidak didukung (gunakan PNG, JPEG, atau WebP).");
  }

  const base64 = match[2].replace(/\s+/g, "");
  const bytes = Math.floor((base64.length * 3) / 4);
  if (!bytes) throw new HttpError(400, "Gambar kosong.");
  if (bytes > maxBytes) throw new HttpError(413, "Gambar terlalu besar setelah dikompres.");

  const kind = match[1].toLowerCase();
  const ext = kind === "png" ? "png" : kind === "webp" ? "webp" : "jpg";
  const mime = kind === "png" ? "image/png" : kind === "webp" ? "image/webp" : "image/jpeg";

  const id = newId("img") + "." + ext;
  await db
    .prepare("INSERT INTO assets (id, mime, data, created_at) VALUES (?,?,?,?)")
    .bind(id, mime, base64, nowIso())
    .run();

  return "/uploads/" + id;
}

export async function find(db, id) {
  const row = await db
    .prepare("SELECT mime, data FROM assets WHERE id = ?")
    .bind(String(id))
    .first();
  return row || null;
}
