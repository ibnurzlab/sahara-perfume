/* ============================================================
   SAHARA — konfigurasi Worker
   Nilai default bisa ditimpa lewat `[vars]` di wrangler.toml
   atau lewat `wrangler secret put`.
   ============================================================ */

export function configFor(env) {
  const e = env || {};
  const num = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  return {
    /** Umur sesi login admin (8 jam). */
    sessionTtlMs: num(e.SAHARA_SESSION_TTL, 8 * 60 * 60 * 1000),

    /** Umur cookie pengunjung untuk favorit (1 tahun). */
    visitorTtlMs: 365 * 24 * 60 * 60 * 1000,

    cookieName: "sahara_session",
    visitorCookie: "sahara_visitor",

    /** Batas ukuran body request (data URL gambar ikut lewat sini). */
    maxBodyBytes: num(e.SAHARA_MAX_BODY, 12 * 1024 * 1024),

    /** Batas ukuran satu gambar unggahan setelah didekode. */
    maxImageBytes: num(e.SAHARA_MAX_IMAGE, 6 * 1024 * 1024),

    /** Throttle login: maksimum percobaan gagal per jendela waktu. */
    loginMaxAttempts: num(e.SAHARA_LOGIN_MAX, 8),
    loginWindowMs: 10 * 60 * 1000,

    /** Akun kurator yang dibuat otomatis saat tabel users masih kosong. */
    admin: {
      username: e.SAHARA_ADMIN_USER || "kurator",
      password: e.SAHARA_ADMIN_PASS || "sahara2025",
      displayName: e.SAHARA_ADMIN_NAME || "Kurator Sahara",
    },
  };
}
