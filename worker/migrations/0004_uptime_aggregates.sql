-- Replace per-tick history scans with two rollup tables.
--
-- Before this migration: every cron tick ran
--   loadStatusHistory(7) + loadStatusHistory(90)
-- per service — each a full scan of status_snapshots for that window.
-- With 1-minute cadence × 41 services × 90-day retention, steady-state
-- reads were ~120M rows/day, well past the D1 free-tier quota.
--
-- After: the cron tick UPSERTs one counter row into daily_uptime per
-- service per Shanghai-calendar day; uptime_7d / uptime_90d / pattern
-- are recomputed hourly from daily_uptime into service_uptime, which
-- the /api/services reader joins instead of scanning snapshots.
--
-- Per-day counters, keyed by Asia/Shanghai calendar day so the
-- frontend "今天" boundary aligns with what gets aggregated.
CREATE TABLE IF NOT EXISTS daily_uptime (
  service_id    TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  day           TEXT NOT NULL,            -- 'YYYY-MM-DD' in Asia/Shanghai
  total_n       INTEGER NOT NULL DEFAULT 0,
  known_n       INTEGER NOT NULL DEFAULT 0,
  -- Per-status counts let us reconstruct uptime_pct under any weighting
  -- without re-reading snapshots when the formula changes.
  n_operational    INTEGER NOT NULL DEFAULT 0,
  n_degraded       INTEGER NOT NULL DEFAULT 0,
  n_partial_outage INTEGER NOT NULL DEFAULT 0,
  n_major_outage   INTEGER NOT NULL DEFAULT 0,
  n_maintenance    INTEGER NOT NULL DEFAULT 0,
  n_unknown        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (service_id, day)
);

CREATE INDEX IF NOT EXISTS idx_daily_uptime_day ON daily_uptime(day);

-- Rolled-up uptime + pattern per service. One row per service, refreshed
-- by the hourly aggregation step. The API reader joins this table; the
-- frontend never sees the underlying counters.
CREATE TABLE IF NOT EXISTS service_uptime (
  service_id    TEXT PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
  uptime_7d     REAL,                       -- 0..1, null when no known samples
  uptime_90d    REAL,
  pattern_hint  TEXT,                       -- UptimePattern enum
  refreshed_at  TEXT NOT NULL
);

-- ─── Backfill from existing status_snapshots ────────────────────────────────
-- One-shot: build daily_uptime + service_uptime from history we already have
-- so /api/services keeps returning useful uptime numbers after the cron
-- switches to the new write path. Re-running this migration is harmless
-- because each statement is idempotent (DELETE+INSERT / INSERT OR REPLACE).
DELETE FROM daily_uptime;
INSERT INTO daily_uptime
  (service_id, day, total_n, known_n,
   n_operational, n_degraded, n_partial_outage,
   n_major_outage, n_maintenance, n_unknown)
SELECT
  service_id,
  date(checked_at, '+8 hours') AS day,
  COUNT(*),
  SUM(CASE WHEN status != 'unknown' THEN 1 ELSE 0 END),
  SUM(CASE WHEN status = 'operational'    THEN 1 ELSE 0 END),
  SUM(CASE WHEN status = 'degraded'       THEN 1 ELSE 0 END),
  SUM(CASE WHEN status = 'partial_outage' THEN 1 ELSE 0 END),
  SUM(CASE WHEN status = 'major_outage'   THEN 1 ELSE 0 END),
  SUM(CASE WHEN status = 'maintenance'    THEN 1 ELSE 0 END),
  SUM(CASE WHEN status = 'unknown'        THEN 1 ELSE 0 END)
FROM status_snapshots
GROUP BY service_id, date(checked_at, '+8 hours');

-- Seed service_uptime with the first rollup so the API returns
-- non-null values immediately after deploy. The cron's hourly job will
-- keep this fresh after that.
--
-- Formula stays close to the previous computeUptime: operational +
-- maintenance + degraded count fully; partial_outage half; major_outage
-- and unknown drop out of the numerator. Unknown also drops out of the
-- denominator so all-unknown services return null (vs misleading 0%).
DELETE FROM service_uptime;
INSERT INTO service_uptime (service_id, uptime_7d, uptime_90d, pattern_hint, refreshed_at)
SELECT
  s.id,
  -- 7-day uptime
  (SELECT
    CASE WHEN SUM(known_n) > 0
      THEN (SUM(n_operational + n_maintenance + n_degraded)
            + 0.5 * SUM(n_partial_outage)) * 1.0 / SUM(known_n)
      ELSE NULL END
   FROM daily_uptime
   WHERE service_id = s.id
     AND day >= date('now', '+8 hours', '-7 days')
  ),
  -- 90-day uptime
  (SELECT
    CASE WHEN SUM(known_n) > 0
      THEN (SUM(n_operational + n_maintenance + n_degraded)
            + 0.5 * SUM(n_partial_outage)) * 1.0 / SUM(known_n)
      ELSE NULL END
   FROM daily_uptime
   WHERE service_id = s.id
     AND day >= date('now', '+8 hours', '-90 days')
  ),
  -- Cron will overwrite the pattern_hint with a computed value on the
  -- first hourly tick; backfill with 'unknown' so the column is non-empty.
  'unknown',
  datetime('now')
FROM services s;
