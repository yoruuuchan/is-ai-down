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
  // "Today" = same UTC date as now. Using date() sidesteps the format
  // mismatch you get from comparing SQLite's "YYYY-MM-DD HH:MM:SS" against
  // a strftime() literal — same issue that hits the relative-time formatter.
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM incidents WHERE date(updated_at) = date('now')`
    )
    .first<{ n: number }>();
  return row?.n ?? 0;
}
