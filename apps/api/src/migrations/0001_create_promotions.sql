-- Migration: Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  description TEXT NOT NULL,
  retail_price REAL NOT NULL,
  wholesale_price REAL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'ATIVA', 'ENCERRADA')),
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_end_date ON promotions(end_date);
