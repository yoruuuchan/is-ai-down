-- AI Status Board — D1 schema v1
-- Normalised storage. The API layer formats display strings ("5 分钟前",
-- "99.98%") from these raw values before returning them to the frontend.

PRAGMA foreign_keys = ON;

-- Static service metadata. Hand-curated, rarely changes.
CREATE TABLE IF NOT EXISTS services (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  company         TEXT NOT NULL,
  category        TEXT NOT NULL,             -- ServiceCategory (Chinese)
  region_group    TEXT NOT NULL,             -- global | china | mixed
  priority        TEXT NOT NULL,             -- P0 | P1 | P2
  brand_color     TEXT NOT NULL,
  avatar_text     TEXT NOT NULL,             -- '#fff' or '#1A1A1A'
  initial         TEXT NOT NULL,
  status_page     TEXT NOT NULL,
  status_page_url TEXT NOT NULL,
  source_type     TEXT NOT NULL,             -- StatusSourceType
  endpoints_json  TEXT NOT NULL DEFAULT '[]',-- ProbeUrl[]
  sort_order      INTEGER NOT NULL DEFAULT 100,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_sort     ON services(sort_order);

-- Time-series of polling results. One row per service per cron tick.
-- The frontend's `pattern` enum is computed from a recent window of these.
CREATE TABLE IF NOT EXISTS status_snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id      TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,             -- NormalizedStatus
  pattern_hint    TEXT,                      -- UptimePattern, seeded for now; computed in phase B
  uptime_7d       REAL,                      -- 0..1, e.g. 0.9998
  uptime_90d      REAL,                      -- 0..1
  endpoints_json  TEXT,                      -- per-endpoint statuses at this tick
  checked_at      TEXT NOT NULL,
  source_raw      TEXT                       -- original payload, for debugging
);

CREATE INDEX IF NOT EXISTS idx_snapshots_service_time
  ON status_snapshots(service_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_time
  ON status_snapshots(checked_at);

-- Incidents from status pages (statuspage.io style + custom parsers).
CREATE TABLE IF NOT EXISTS incidents (
  id              TEXT PRIMARY KEY,          -- upstream incident id (or synthesised)
  service_id      TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,             -- short description
  inc_status      TEXT NOT NULL,             -- IncidentStatus
  severity        TEXT NOT NULL,             -- IncidentSeverity
  started_at      TEXT NOT NULL,             -- ISO timestamp
  updated_at      TEXT NOT NULL,
  resolved_at     TEXT,
  url             TEXT,
  summary         TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_updated ON incidents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service_id, updated_at DESC);

-- Cron heartbeat. Lets us verify the trigger is live before parsers exist.
CREATE TABLE IF NOT EXISTS cron_runs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at          TEXT NOT NULL,
  scheduled_time  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_time ON cron_runs(ran_at DESC);
