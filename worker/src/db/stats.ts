import { toUtcIso } from "../format";
import type { NormalizedStatus } from "./types";

const STATUSES: NormalizedStatus[] = [
  "operational",
  "degraded",
  "partial_outage",
  "major_outage",
  "maintenance",
  "unknown",
];

export async function getStats(db: D1Database): Promise<{
  total: number;
  counts: Record<NormalizedStatus, number>;
  last_updated: string | null;
}> {
  const { results } = await db
    .prepare(
      `
      SELECT latest.status, COUNT(*) AS n
      FROM services s
      LEFT JOIN (
        SELECT ss.service_id, ss.status FROM status_snapshots ss
        INNER JOIN (
          SELECT service_id, MAX(checked_at) AS max_checked
          FROM status_snapshots GROUP BY service_id
        ) li
          ON ss.service_id = li.service_id
         AND ss.checked_at = li.max_checked
      ) latest ON latest.service_id = s.id
      GROUP BY latest.status
      `
    )
    .all<{ status: NormalizedStatus | null; n: number }>();

  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, 0])
  ) as Record<NormalizedStatus, number>;

  let total = 0;
  for (const row of results ?? []) {
    const key = (row.status ?? "unknown") as NormalizedStatus;
    counts[key] = (counts[key] ?? 0) + row.n;
    total += row.n;
  }

  const last = await db
    .prepare(`SELECT MAX(checked_at) AS t FROM status_snapshots`)
    .first<{ t: string | null }>();

  return { total, counts, last_updated: toUtcIso(last?.t ?? null) };
}
