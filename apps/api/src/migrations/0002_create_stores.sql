-- Migration: Create stores and promotion_stores tables

CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(active);

CREATE TABLE IF NOT EXISTS promotion_stores (
  promotion_id INTEGER NOT NULL,
  store_id INTEGER NOT NULL,
  PRIMARY KEY (promotion_id, store_id),
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_promotion_stores_promotion ON promotion_stores(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_stores_store ON promotion_stores(store_id);
