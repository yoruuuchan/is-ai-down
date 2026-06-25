import { formatRelativeZh, formatUptimePct } from "../format";
import type {
  NormalizedStatus,
  ProbeUrl,
  RegionGroup,
  Service,
  ServiceCategory,
  StatusSourceType,
  UptimePattern,
} from "./types";

type ServiceRow = {
  id: string;
  name: string;
  company: string;
  category: ServiceCategory;
  region_group: RegionGroup;
  priority: "P0" | "P1" | "P2";
  brand_color: string;
  avatar_text: "#fff" | "#1A1A1A";
  initial: string;
  status_page: string;
  status_page_url: string;
  source_type: StatusSourceType;
  endpoints_json: string;
  // Latest status comes from the freshest snapshot; uptime + pattern come
  // from the hourly-refreshed service_uptime rollup. Splitting these means
  // /api/services never scans status_snapshots beyond MAX(checked_at).
  status: NormalizedStatus | null;
  endpoints_snapshot_json: string | null;
  last_checked: string | null;
  pattern_hint: UptimePattern | null;
  uptime_7d: number | null;
  uptime_90d: number | null;
};

export async function getServicesWithLatestStatus(db: D1Database): Promise<Service[]> {
  const { results } = await db
    .prepare(
      `
      SELECT
        s.id, s.name, s.company, s.category, s.region_group, s.priority,
        s.brand_color, s.avatar_text, s.initial,
        s.status_page, s.status_page_url, s.source_type,
        s.endpoints_json,
        latest.status,
        latest.endpoints_json AS endpoints_snapshot_json,
        latest.checked_at AS last_checked,
        u.pattern_hint, u.uptime_7d, u.uptime_90d
      FROM services s
      LEFT JOIN (
        SELECT ss.* FROM status_snapshots ss
        INNER JOIN (
          SELECT service_id, MAX(checked_at) AS max_checked
          FROM status_snapshots GROUP BY service_id
        ) li
          ON ss.service_id = li.service_id
         AND ss.checked_at = li.max_checked
      ) latest ON latest.service_id = s.id
      LEFT JOIN service_uptime u ON u.service_id = s.id
      ORDER BY s.sort_order ASC, s.id ASC
      `
    )
    .all<ServiceRow>();

  const now = new Date();
  return (results ?? []).map((r) => {
    // Prefer the per-tick endpoint statuses from the latest snapshot; fall
    // back to the static endpoint list on the service row.
    const staticEndpoints = safeJson<ProbeUrl[]>(r.endpoints_json, []);
    const liveEndpoints = safeJson<ProbeUrl[] | null>(r.endpoints_snapshot_json, null);
    const endpoints = liveEndpoints?.length ? liveEndpoints : staticEndpoints;

    return {
      id: r.id,
      name: r.name,
      company: r.company,
      category: r.category,
      regionGroup: r.region_group,
      priority: r.priority,
      status: (r.status ?? "unknown") as NormalizedStatus,
      pattern: (r.pattern_hint ?? "unknown") as UptimePattern,
      uptime7d: formatUptimePct(r.uptime_7d),
      uptime90d: formatUptimePct(r.uptime_90d),
      lastUpdate: formatRelativeZh(r.last_checked, now),
      brandColor: r.brand_color,
      avatarText: r.avatar_text,
      initial: r.initial,
      statusPage: r.status_page,
      statusPageUrl: r.status_page_url,
      sourceType: r.source_type,
      endpoints,
    };
  });
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
