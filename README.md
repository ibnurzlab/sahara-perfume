# SAHARA — Katalog Parfum (User + Admin)

Aplikasi katalog haute parfumerie dengan **dua sisi terpisah**:

- **Sisi User (publik)** — etalase katalog dan halaman detail produk.
- **Sisi Admin (privat)** — panel kurasi untuk mengelola produk, harga, dan foto.

Data katalog kini hidup di **database SQLite** dan diakses lewat **API backend Node.js**,
sehingga perubahan dari admin langsung tersimpan permanen dan terlihat oleh semua
pengunjung — bukan lagi hanya di satu peramban.

> **Sudah dideploy:** <https://sahara-perfume.ibnurz.workers.dev>
> (Cloudflare Workers + D1). Lihat [Deploy ke Cloudflare](#deploy-ke-cloudflare).
> Versi lokal dan versi Cloudflare memakai API yang sama persis.

---

## Menjalankan

Butuh **Node.js 24+** (memakai modul bawaan `node:sqlite`). Tanpa `npm install` — nol dependensi.

```bash
cd "C:\Users\Muhamad Ibnu\sahara-perfume"
npm start
```

Di Windows bisa juga klik dua kali **`start.cmd`**.

Lalu buka:

| Halaman | URL |
| --- | --- |
| Etalase publik | <http://localhost:5173/> |
| Detail produk | <http://localhost:5173/detail.html?id=p1> |
| Masuk admin | <http://localhost:5173/masuk.html> |

**Akun kurator default:** `kurator` / `sahara2025`

> Ganti lewat environment variable sebelum dipakai sungguhan:
> `SAHARA_ADMIN_USER`, `SAHARA_ADMIN_PASS`, `SAHARA_ADMIN_NAME`, `PORT`, `SAHARA_DB`.
> Akun hanya dibuat saat database masih kosong.

---

## Deploy ke Cloudflare

**URL publik:** <https://sahara-perfume.ibnurz.workers.dev>

Situs ini berjalan sebagai **satu Cloudflare Worker** yang sekaligus menyajikan
frontend statis dan API-nya, dengan **Cloudflare D1** sebagai database.

```
                     ┌─────────────────────────────────────┐
   Browser  ──────►  │  Worker  cf/src/index.js            │
                     │   ├── /api/...    → API + D1        │
                     │   ├── /uploads/   → gambar di D1    │
                     │   └── lainnya     → dist/ (aset)    │
                     └──────────────┬──────────────────────┘
                                    │  binding DB
                              Cloudflare D1  (sahara-db)
```

Yang sudah dibuat di akun Cloudflare:

| Sumber daya | Nama | Keterangan |
| --- | --- | --- |
| Worker | `sahara-perfume` | menyajikan aset + API |
| Database D1 | `sahara-db` | `232fc3a5-ae0f-4e68-b05f-cc15b9b76e72` |

### Perintah sehari-hari

```bash
cd cf
npm run dev        # jalankan lokal di http://127.0.0.1:8787 (memakai D1 lokal)
npm run deploy     # bangun dist/ lalu deploy ke Cloudflare
npm run db:remote  # terapkan migrasi ke D1 remote
npm run tail       # lihat log Worker secara langsung
```

Dari folder akar proyek juga tersedia: `npm run build:cf`, `npm run cf:db`, `npm run deploy`.

### Menyiapkan dari nol (akun lain)

```bash
cd cf
npm install
npx wrangler login                       # atau set CLOUDFLARE_API_TOKEN
npx wrangler d1 create sahara-db         # salin database_id ke wrangler.toml
npm run db:remote                        # buat tabel + isi 4 parfum contoh
npm run deploy
```

### Kata sandi kurator di Cloudflare

Akun `kurator` dibuat otomatis saat tabel `users` masih kosong. Kata sandinya
diambil dari `SAHARA_ADMIN_PASS`; bila tidak diset, dipakai kata sandi demo
`sahara2025`. Untuk menggantinya:

```bash
cd cf
npx wrangler secret put SAHARA_ADMIN_PASS
```

> **Penting:** akun hanya dibuat sekali. Kalau kata sandi sudah pernah dibuat,
> mengubah secret tidak otomatis mengganti kata sandi yang tersimpan — ubah
> barisnya di D1 atau hapus tabel `users`.

### Perbedaan versi lokal vs Cloudflare

Keduanya memakai kontrak API yang identik, jadi frontend tidak berubah sama sekali.
Yang berbeda hanya lapisan penyimpanan:

| Aspek | Lokal (Node) | Cloudflare |
| --- | --- | --- |
| Server | `node:http` di `backend/` | Worker di `cf/src/` |
| Database | `node:sqlite` → `backend/data/sahara.db` | D1 (`binding DB`) |
| Hash kata sandi | scrypt | PBKDF2-HMAC-SHA256 (Web Crypto) |
| Gambar unggahan | berkas di `uploads/` | base64 di tabel `assets` D1 |
| Throttle login | penghitung di memori | tabel `login_attempts` di D1 |
| Cookie sesi | `Secure` nonaktif (HTTP lokal) | `Secure` aktif otomatis saat HTTPS |
| Label penyimpanan | `SQLite (server)` | `D1 (Cloudflare)` |

Catatan teknis:

- **Putaran PBKDF2 sengaja 25.000** (`cf/src/security.js`). Paket gratis Workers
  membatasi CPU 10 ms per permintaan, sehingga scrypt maupun PBKDF2 dengan putaran
  besar akan melewati batas itu. Kalau Anda memakai paket berbayar, naikkan
  `PBKDF2_ITERATIONS` sampai ±200.000.
- **Hanya berkas publik yang diunggah.** `scripts/build-frontend.js` menyalin daftar
  putih berkas ke `dist/`, jadi `backend/`, `cf/`, database SQLite lokal, dan
  `README.md` tidak pernah bisa diakses dari internet.
- **Gambar disimpan di D1** supaya tidak perlu layanan tambahan. Untuk katalog besar,
  pindahkan ke Cloudflare R2: ganti `cf/src/assets.js` menjadi operasi R2 dan
  simpan URL-nya di kolom `products.image`.
- Mengubah `assets/js/*` **wajib** diikuti `npm run deploy` (yang menjalankan build),
  bukan `npx wrangler deploy` saja — kalau tidak, `dist/` masih berisi berkas lama.

---

## Arsitektur

```
                    ┌──────────────────────────────┐
   Browser  ──────► │  backend/index.js  (Node http)│
                    │   ├── /api/...   → REST API   │
                    │   ├── /uploads/  → foto       │
                    │   └── /          → frontend   │
                    └───────────┬──────────────────┘
                                │  node:sqlite
                        backend/data/sahara.db
```

- **Frontend** — HTML + Tailwind (CDN) + JavaScript vanilla, tanpa build step.
- **Backend** — `node:http` + `node:sqlite` + `node:crypto`. Nol paket npm.
- **Database** — satu berkas SQLite di `backend/data/sahara.db` (mode WAL).
- **Gambar unggahan** — disimpan sebagai berkas di `uploads/` dan disajikan lewat `/uploads/...`.

Frontend tidak pernah menyimpan data katalog sendiri lagi; `assets/js/store.js`
hanya **cache di memori** yang selalu disegarkan dari server.

---

## Pemisahan User & Admin

**Shell User (publik)** — `index.html`, `detail.html`
- Navigasi bawah hanya **Koleksi** dan **Detail**. Tidak ada menu Admin.
- Tidak ada satu pun tautan menuju halaman admin.
- Produk berstatus **draft tidak pernah dikirim ke browser publik** (disaring di server).

**Shell Admin (privat)** — `login.html`, `admin.html`, `upload.html`
- Hanya bisa dibuka setelah login. Membuka URL-nya langsung akan dialihkan ke `login.html`.
- Navigasi bawah admin: **Katalog · Unggah · Toko**.
- Endpoint `/api/admin/*` dan `/api/uploads` menolak permintaan tanpa sesi (HTTP 401).
- Diberi `noindex, nofollow` agar tidak terindeks mesin pencari.

Pintu masuk admin hanya `masuk.html`. Halaman user tidak pernah menautkannya.

---

## API

| Metode | Endpoint | Sesi | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/health` | – | Cek status server |
| GET | `/api/products` | – | Daftar produk publik (+ taksonomi). `?includeDrafts=1` menyertakan draft bila sudah login |
| GET | `/api/products/:id` | – | Satu produk (404 untuk draft bila belum login) |
| GET | `/api/taxonomy` | – | Daftar kategori & koleksi |
| GET | `/api/favorites` | – | Id favorit pengunjung ini |
| POST | `/api/favorites` | – | `{productId}` — tambah/hapus favorit |
| POST | `/api/auth/login` | – | `{username, password}` → set cookie sesi |
| POST | `/api/auth/logout` | – | Cabut sesi |
| GET | `/api/auth/me` | – | Status sesi saat ini |
| POST | `/api/uploads` | ✔ | `{dataUrl}` → `{url}` |
| GET | `/api/admin/stats` | ✔ | Ringkasan jumlah/average/edisi |
| POST | `/api/admin/products` | ✔ | Buat produk |
| PUT | `/api/admin/products/:id` | ✔ | Perbarui produk |
| PATCH | `/api/admin/products/:id/price` | ✔ | Ubah harga saja |
| DELETE | `/api/admin/products/:id` | ✔ | Hapus produk |
| POST | `/api/admin/reset` | ✔ | Kembalikan katalog ke data contoh |

Semua respons berupa JSON. Kesalahan memakai bentuk `{ "error": "pesan" }`.

---

## Database

Skema ada di `backend/db/schema.sql` (dibuat otomatis saat pertama dijalankan):

| Tabel | Isi |
| --- | --- |
| `users` | Kurator + hash kata sandi (scrypt) |
| `sessions` | Sesi login; yang disimpan **hash token**, bukan token mentah |
| `collections`, `categories` | Taksonomi |
| `products` | Data utama produk |
| `product_categories` | Kategori per produk (many-to-many) |
| `product_sizes` | Varian ukuran tiap produk |
| `product_gallery` | Foto galeri tiap produk |
| `favorites` | Favorit per pengunjung anonim |

Data awal (4 parfum) diisi otomatis saat tabel `products` masih kosong,
dari `backend/db/seed-data.js`. Tombol **reset katalog** di panel admin
mengembalikan isi katalog ke data contoh tersebut.

Ingin mulai dari nol? Hentikan server, hapus `backend/data/sahara.db`, jalankan lagi.

---

## Keamanan

Yang sudah ditangani:

- Kata sandi disimpan sebagai hash dengan salt acak — **scrypt** di versi Node,
  **PBKDF2-HMAC-SHA256** (Web Crypto) di versi Cloudflare — dan dibandingkan
  memakai perbandingan waktu-konstan (tahan timing attack).
- Sesi disimpan di **cookie HttpOnly + SameSite=Lax**, tidak bisa dibaca JavaScript.
  Di Cloudflare cookie otomatis memakai flag `Secure` (HTTPS).
- Token sesi diacak 32 byte dan **di-hash** sebelum masuk database.
- Semua query memakai **prepared statement** dengan parameter (aman dari SQL injection).
- Throttle login: maksimum 8 percobaan gagal per IP dalam 10 menit. Di Cloudflare
  penghitungnya ada di D1, jadi tetap akurat walau Worker berjalan di banyak isolat.
- Batas ukuran body (12 MB) dan batas ukuran gambar (6 MB).
- Server statis memblokir `/backend`, `/package.json`, berkas `*.db`, dan path traversal.
  Di Cloudflare hal ini dijamin lebih kuat lagi: **hanya berkas dalam daftar putih
  `dist/` yang pernah diunggah**, sehingga kode backend dan database lokal tidak
  pernah ada di server publik.
- Endpoint admin & unggah menolak permintaan tanpa sesi (HTTP 401).
- Draft tidak pernah dikirim ke klien publik.
- Respons statis diberi `X-Content-Type-Options: nosniff` dan `Referrer-Policy`.

Yang **belum** ada — pertimbangkan sebelum dipakai produksi:

- Versi lokal belum memakai HTTPS dan cookie belum berflag `Secure`; jalankan di
  belakang reverse proxy (mis. nginx) bila dipublikasikan. Versi Cloudflare sudah
  HTTPS otomatis.
- Belum ada pembatasan laju untuk endpoint selain login.
- Satu peran saja (kurator). Belum ada manajemen pengguna ganda.
- Putaran PBKDF2 di Cloudflare lebih rendah dari rekomendasi OWASP karena batas CPU
  paket gratis (lihat catatan di bagian Deploy ke Cloudflare).

---

## Struktur berkas

```
sahara-perfume/
├── backend/
│   ├── index.js              entry: server HTTP, statis, dan pemasangan rute
│   ├── config.js             port, lokasi DB, umur sesi, akun default
│   ├── db/
│   │   ├── index.js          koneksi, migrasi, seeding
│   │   ├── schema.sql        DDL tabel
│   │   └── seed-data.js      data contoh (4 parfum)
│   ├── lib/
│   │   ├── http.js           helper HTTP, cookie, body, berkas statis
│   │   ├── router.js         router mini dengan :param
│   │   └── security.js       scrypt, token, throttle login
│   ├── repositories/         akses data: products, users, favorites
│   ├── routes/               auth, catalog, admin, uploads
│   └── data/sahara.db        ← dibuat otomatis
├── uploads/                  ← gambar hasil unggahan (dibuat otomatis)
├── assets/
│   ├── css/base.css
│   └── js/
│       ├── tailwind-config.js  token desain
│       ├── store.js            klien API + cache katalog + helper format
│       ├── auth.js             sesi admin (berbasis cookie server)
│       ├── catalog.js          halaman Koleksi
│       ├── detail.js           halaman Detail
│       ├── admin.js            panel admin
│       ├── upload.js           tambah/edit produk
│       └── login.js            halaman masuk
├── index.html  detail.html  masuk.html
├── login.html  admin.html   upload.html
├── server.js                 penerus `node server.js` (memanggil backend)
├── scripts/
│   ├── build-frontend.js     salin daftar putih berkas publik → dist/
│   └── generate-seed-migration.js  hasilkan seed Cloudflare dari seed-data.js
├── cf/                       ← versi Cloudflare
│   ├── wrangler.toml         nama Worker, aset, binding D1
│   ├── src/
│   │   ├── index.js          entry Worker: /api, /uploads, aset statis
│   │   ├── routes.js         seluruh endpoint (kontrak sama dengan backend/)
│   │   ├── products.js       repository produk (D1)
│   │   ├── auth.js           pengguna, sesi, throttle login (D1)
│   │   ├── favorites.js      favorit per pengunjung (D1)
│   │   ├── assets.js         gambar unggahan (base64 di D1)
│   │   ├── security.js       PBKDF2, token (Web Crypto)
│   │   ├── http.js  router.js  utils.js  config.js
│   │   └── seed-data.js      ← dihasilkan otomatis
│   └── migrations/
│       ├── 0001_init.sql     skema D1
│       └── 0002_seed_catalogue.sql  ← dihasilkan otomatis
├── dist/                     ← hasil build (dibuat otomatis, diabaikan git)
├── start.cmd  package.json  README.md
```

`cf/src/seed-data.js` dan `cf/migrations/0002_seed_catalogue.sql` dihasilkan dari
`backend/db/seed-data.js`, jadi katalog contoh di kedua backend tidak pernah menyimpang:

```bash
npm run seed:cf     # node scripts/generate-seed-migration.js
```

---

## Catatan pengembangan

- **Tailwind dimuat dari CDN** (`cdn.tailwindcss.com`), jadi internet diperlukan untuk
  tampilan. Konsol akan selalu menampilkan peringatan CDN — itu normal.
  Untuk produksi, kompilasi Tailwind menjadi berkas CSS statis.
- `npm start` setara dengan `node backend/index.js`. `node server.js` juga jalan
  (hanya meneruskan ke backend).
- Kalau port 5173 terpakai: `set PORT=5199 && npm start`.
- Bila backend tidak aktif, halaman menampilkan pesan "Server Tidak Terjangkau"
  beserta tombol muat ulang, bukan layar kosong.
- Versi Cloudflare dijalankan dari folder `cf/`. Selalu pakai `npm run deploy`
  (bukan `npx wrangler deploy`) supaya `dist/` ikut dibangun ulang — kalau tidak,
  perubahan pada `assets/js/*` tidak akan terkirim.
- `cf/.env` berisi `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID`; berkas ini
  diabaikan git. Hapus bila Anda ingin memakai `wrangler login` biasa.

---

## Hasil verifikasi

Kedua backend diuji terhadap API dan browser sungguhan:

| Pengujian | Cakupan | Hasil |
| --- | --- | --- |
| API Cloudflare (`cf-smoke`) | 77 pemeriksaan: halaman, berkas privat, katalog, auth, CRUD admin, unggah, favorit, reset, logout | **77 lulus, 0 gagal** |
| Browser Cloudflare (Chrome headless) | 38 pemeriksaan: render katalog, detail, favorit, penjagaan admin, login, unggah | **38 lulus, 0 gagal** |

Termasuk yang dipastikan: `/backend/config.js`, `/cf/wrangler.toml`, `/cf/.env`,
`/package.json`, dan berkas database **tidak dapat diakses publik** (semuanya 404).
