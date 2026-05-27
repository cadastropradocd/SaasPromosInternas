-- Sprint 3: Saneamento estrutural

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'GESTOR', 'COMPRADOR')),
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);

CREATE TABLE IF NOT EXISTS promotion_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'LAUNCH', 'CANCEL', 'CLOSE', 'DUPLICATE', 'SOFT_DELETE')),
  old_status TEXT,
  new_status TEXT,
  payload TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_history_promotion ON promotion_history(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_history_user ON promotion_history(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS generated_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  storage_key TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

ALTER TABLE promotions ADD COLUMN updated_at TEXT;
ALTER TABLE promotions ADD COLUMN deleted_at TEXT;
ALTER TABLE promotions ADD COLUMN category_id INTEGER REFERENCES categories(id);
ALTER TABLE promotions ADD COLUMN launched_by TEXT;
ALTER TABLE promotions ADD COLUMN launched_at TEXT;
ALTER TABLE promotions ADD COLUMN closed_at TEXT;
ALTER TABLE promotions ADD COLUMN cancelled_by TEXT;
ALTER TABLE promotions ADD COLUMN cancelled_at TEXT;

ALTER TABLE stores ADD COLUMN updated_at TEXT;
ALTER TABLE stores ADD COLUMN deleted_at TEXT;

DROP INDEX IF EXISTS idx_promotions_status;
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
DROP INDEX IF EXISTS idx_promotions_end_date;
CREATE INDEX IF NOT EXISTS idx_promotions_end_date ON promotions(end_date);