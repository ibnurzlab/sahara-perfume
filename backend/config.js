/* ============================================================
   SAHARA — konfigurasi backend
   Semua nilai bisa ditimpa lewat environment variable.
   ============================================================ */
"use strict";

const path = require("path");

const ROOT = path.resolve(__dirname, "..");

module.exports = {
  /** Akar proyek — dipakai untuk menyajikan berkas frontend. */
  root: ROOT,

  /** Port HTTP. Default 5173 agar `start.cmd` lama tetap cocok. */
  port: Number(process.env.PORT || 5173),

  /** Berkas database SQLite. */
  dbFile: process.env.SAHARA_DB || path.join(__dirname, "data", "sahara.db"),

  /** Folder gambar hasil unggahan admin. */
  uploadsDir: process.env.SAHARA_UPLOADS || path.join(ROOT, "uploads"),

  /** Umur sesi login admin (8 jam). */
  sessionTtlMs: Number(process.env.SAHARA_SESSION_TTL || 8 * 60 * 60 * 1000),

  /** Umur cookie pengunjung untuk favorit (1 tahun). */
  visitorTtlMs: 365 * 24 * 60 * 60 * 1000,

  cookieName: "sahara_session",
  visitorCookie: "sahara_visitor",

  /** Batas ukuran body request (data URL gambar ikut lewat sini). */
  maxBodyBytes: 12 * 1024 * 1024,

  /** Batas ukuran satu gambar unggahan setelah didekode. */
  maxImageBytes: 6 * 1024 * 1024,

  /** Throttle login: maksimum percobaan gagal per jendela waktu. */
  loginMaxAttempts: 8,
  loginWindowMs: 10 * 60 * 1000,

  /** Akun kurator yang dibuat otomatis saat database masih kosong. */
  admin: {
    username: process.env.SAHARA_ADMIN_USER || "kurator",
    password: process.env.SAHARA_ADMIN_PASS || "sahara2025",
    displayName: process.env.SAHARA_ADMIN_NAME || "Kurator Sahara",
  },

  /** Path yang tidak boleh diakses lewat server statis. */
  blockedPrefixes: ["/backend", "/node_modules", "/.git", "/package.json", "/package-lock.json"],
};
