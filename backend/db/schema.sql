-- ============================================================
-- SAHARA — skema database (SQLite)
-- ============================================================

PRAGMA foreign_keys = ON;

-- Kurator yang boleh masuk ke panel admin.
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'curator',
  created_at    TEXT NOT NULL
);

-- Sesi login. Yang disimpan adalah hash token, bukan token mentah.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Taksonomi.
CREATE TABLE IF NOT EXISTS collections (
  id       TEXT PRIMARY KEY,
  label    TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id       TEXT PRIMARY KEY,
  label    TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

-- Katalog parfum.
CREATE TABLE IF NOT EXISTS products (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  concentration TEXT NOT NULL DEFAULT 'Eau de Parfum',
  collection_id TEXT REFERENCES collections(id),
  badge         TEXT NOT NULL DEFAULT '',
  volume        TEXT NOT NULL DEFAULT '100ml',
  price         INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'critical', 'draft')),
  rating        REAL NOT NULL DEFAULT 0,
  reviews       INTEGER NOT NULL DEFAULT 0,
  notes         TEXT NOT NULL DEFAULT '',
  sku           TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  note_top      TEXT NOT NULL DEFAULT '',
  note_heart    TEXT NOT NULL DEFAULT '',
  note_base     TEXT NOT NULL DEFAULT '',
  image         TEXT NOT NULL DEFAULT '',
  admin_image   TEXT NOT NULL DEFAULT '',
  updated_label TEXT NOT NULL DEFAULT 'Stabil',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Kategori yang melekat pada satu produk (many-to-many).
CREATE TABLE IF NOT EXISTS product_categories (
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, category_id)
);

-- Varian ukuran (50ml Nomade, 100ml Flacon, ...).
CREATE TABLE IF NOT EXISTS product_sizes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL DEFAULT 0,
  volume     TEXT NOT NULL DEFAULT '',
  label      TEXT NOT NULL DEFAULT '',
  sub        TEXT NOT NULL DEFAULT '',
  desc_text  TEXT NOT NULL DEFAULT '',
  price      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sizes_product ON product_sizes(product_id);

-- Galeri foto.
CREATE TABLE IF NOT EXISTS product_gallery (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL DEFAULT 0,
  url        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gallery_product ON product_gallery(product_id);

-- Favorit pengunjung, dikaitkan ke cookie anonim (bukan akun).
CREATE TABLE IF NOT EXISTS favorites (
  visitor_id TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (visitor_id, product_id)
);
