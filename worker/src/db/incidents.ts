import { formatRelativeIncidentZh } from "../format";
import type { Incident, IncidentSeverity, IncidentStatus } from "./types";

type IncidentRow = {
  service_name: string;
  title: string;
  inc_status: IncidentStatus;
  severity: IncidentSeverity;
  updated_at: string;
};

export async function getRecentIncidents(
  db: D1Database,
  limit: number
): Promise<Incident[]> {
  const { results } = await db
    .prepare(
      `
      SELECT
        s.name AS service_name,
        i.title, i.inc_status, i.severity, i.updated_at
      FROM incidents i
      JOIN services s ON s.id = i.service_id
      ORDER BY i.updated_at DESC
      LIMIT ?
      `
    )
    .bind(limit)
    .all<IncidentRow>();

  const now = new Date();
  return (results ?? []).map((r) => ({
    service: r.service_name,
    time: formatRelativeIncidentZh(r.updated_at, now),
    desc: r.title,
    incStatus: r.inc_status,
    severity: r.severity,
  }));
}

export async function countTodayEvents(db: D1Database): Promise<number> {
  // "Today" = same Asia/Shanghai calendar date as now. The frontend renders
  // incident times in CST via formatRelativeIncidentZh, so the count must
  // agree with what users see — using UTC here would mark a 01:00 CST event
  // (17:00 UTC the previous day) as "yesterday" while the row above it still
  // says "今天 01:00". SQLite stores naive UTC, so shift by +8h before date().
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM incidents
       WHERE date(updated_at, '+8 hours') = date('now', '+8 hours')`
    )
    .first<{ n: number }>();
  return row?.n ?? 0;
}
