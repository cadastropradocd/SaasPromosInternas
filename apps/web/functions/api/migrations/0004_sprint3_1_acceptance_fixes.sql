-- Sprint 3.1 — Acceptance fixes

-- Fix CHECK constraint to accept CANCELADA status
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS promotions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  description TEXT NOT NULL,
  retail_price REAL NOT NULL,
  wholesale_price REAL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'ATIVA', 'ENCERRADA', 'CANCELADA')),
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  deleted_at TEXT,
  category_id INTEGER,
  launched_by TEXT,
  launched_at TEXT,
  closed_at TEXT,
  cancelled_by TEXT,
  cancelled_at TEXT
);

INSERT INTO promotions_new (
  id,
  code,
  description,
  retail_price,
  wholesale_price,
  start_date,
  end_date,
  notes,
  status,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  category_id,
  launched_by,
  launched_at,
  closed_at,
  cancelled_by,
  cancelled_at
)
SELECT
  id,
  code,
  description,
  retail_price,
  wholesale_price,
  start_date,
  end_date,
  notes,
  status,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  category_id,
  launched_by,
  launched_at,
  closed_at,
  cancelled_by,
  cancelled_at
FROM promotions;

DROP TABLE promotions;

ALTER TABLE promotions_new RENAME TO promotions;

CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_end_date ON promotions(end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_deleted_at ON promotions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_promotions_category ON promotions(category_id);
CREATE INDEX IF NOT EXISTS idx_promotions_created_by ON promotions(created_by);
CREATE INDEX IF NOT EXISTS idx_promotions_launched_at ON promotions(launched_at);
CREATE INDEX IF NOT EXISTS idx_promotions_closed_at ON promotions(closed_at);

PRAGMA foreign_keys=on;

-- Add GENERATE_PDF to promotion_history action values (via table recreation)
PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS promotion_history_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'LAUNCH', 'CANCEL', 'CLOSE', 'DUPLICATE', 'SOFT_DELETE', 'GENERATE_PDF')),
  old_status TEXT,
  new_status TEXT,
  payload TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promotion_id) REFERENCES promotions(id)
);

INSERT INTO promotion_history_new SELECT * FROM promotion_history;

DROP TABLE promotion_history;
ALTER TABLE promotion_history_new RENAME TO promotion_history;

CREATE INDEX IF NOT EXISTS idx_promotion_history_promotion ON promotion_history(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_history_user ON promotion_history(user_id);

PRAGMA foreign_keys=on;