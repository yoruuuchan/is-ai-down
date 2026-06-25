import type { Bindings } from "./index";
import type {
  EndpointStatus,
  IncidentSeverity,
  IncidentStatus,
  NormalizedStatus,
  ProbeUrl,
  StatusSourceType,
  UptimePattern,
} from "./db/types";

const STATUSPAGE_TIMEOUT_MS = 8_000;
const PROBE_TIMEOUT_MS = 8_000;
const PROBE_BODY_BYTES = 32_768;
const SERVICE_CONCURRENCY = 6;
const RETENTION_DAYS = 90;
// Cloudflare Workers caps fetch subrequests at 50 per invocation. With ~37
// services × (1 statuspage + 2–3 endpoints) we'd hit 150+ per tick. Stagger
// across N ticks so each invocation polls ~37/N services (≤ ~5 fetches each).
const POLL_BATCHES = 4;

type ServiceRow = {
  id: string;
  name: string;
  status_page: string;
  status_page_url: string;
  source_type: StatusSourceType;
  endpoints_json: string;
};

type EndpointSnapshot = ProbeUrl & {
  httpStatus?: number;
  responseTimeMs?: number;
};

type ProbeRaw = {
  label: string;
  url: string;
  status: EndpointStatus;
  httpStatus?: number;
  responseTimeMs?: number;
  errorKind?:
    | "timeout"
    | "network"
    | "http"
    | "invalid_url"
    | "subrequest_limit"
    | "content_mismatch";
  error?: string;
};

type StatuspageSummary = {
  status?: {
    indicator?: string;
    description?: string;
  };
  // Instatus and some other "Atlassian-compatible" hosts return only
  // { page: { status: "UP" | "HASISSUES" | "UNDERMAINTENANCE" } }
  // with no `status.indicator`. We treat `page.status` as a fallback.
  page?: {
    status?: string;
    name?: string;
  };
  incidents?: StatuspageIncident[];
  scheduled_maintenances?: StatuspageIncident[];
};

type StatuspageIncident = {
  id?: string;
  name?: string;
  status?: string;
  impact?: string;
  shortlink?: string;
  url?: string;
  created_at?: string;
  started_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
  scheduled_for?: string;
  scheduled_until?: string | null;
  incident_updates?: { body?: string }[];
};

type StatuspageResult = {
  ok: boolean;
  url?: string;
  status: NormalizedStatus;
  incidents: IncidentUpsert[];
  indicator?: string;
  description?: string;
  error?: string;
};

type IncidentUpsert = {
  id: string;
  serviceId: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  startedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  url: string | null;
  summary: string | null;
};

type ServicePollResult = {
  serviceId: string;
  status: NormalizedStatus;
  pattern: UptimePattern;
  uptime7d: number | null;
  uptime90d: number | null;
  endpoints: EndpointSnapshot[];
  sourceRaw: string;
  incidents: IncidentUpsert[];
};

export const handleScheduled: ExportedHandlerScheduledHandler<Bindings> = async (
  event,
  env,
  ctx
) => {
  const ranAt = new Date().toISOString();
  ctx.waitUntil(runScheduledPoll(event, env, ranAt));
};

async function runScheduledPoll(
  event: ScheduledController,
  env: Bindings,
  ranAt: string
) {
  await env.DB.prepare(
    `INSERT INTO cron_runs (ran_at, scheduled_time) VALUES (?, ?)`
  )
    .bind(ranAt, new Date(event.scheduledTime).toISOString())
    .run()
    .catch(() => {});

  await cleanupSeedRows(env.DB);
  const allServices = await loadServices(env.DB);
  // Stagger services across POLL_BATCHES ticks to stay under the
  // 50-subrequest-per-invocation Worker limit.
  const minute = Math.floor(event.scheduledTime / 60_000);
  const batchIndex = ((minute % POLL_BATCHES) + POLL_BATCHES) % POLL_BATCHES;
  const services = allServices.filter(
    (_, i) => i % POLL_BATCHES === batchIndex
  );

  const results = await mapLimit(services, SERVICE_CONCURRENCY, (service) =>
    pollService(env.DB, service, ranAt)
  );

  await writePollResults(env.DB, results, ranAt);
  await cleanupOldRows(env.DB);
}

async function loadServices(db: D1Database): Promise<ServiceRow[]> {
  const { results } = await db
    .prepare(
      `
      SELECT id, name, status_page, status_page_url, source_type, endpoints_json
      FROM services
      ORDER BY sort_order ASC, id ASC
      `
    )
    .all<ServiceRow>();

  return results ?? [];
}

async function pollService(
  db: D1Database,
  service: ServiceRow,
  checkedAt: string
): Promise<ServicePollResult> {
  const [statuspage, probe] = await Promise.all([
    fetchStatuspage(service),
    probeEndpoints(parseEndpoints(service.endpoints_json)),
  ]);

  const status = chooseServiceStatus(service.source_type, statuspage, probe.status);
  const [history7d, history90d] = await Promise.all([
    loadStatusHistory(db, service.id, 7),
    loadStatusHistory(db, service.id, 90),
  ]);
  const statuses7d = [...history7d, status];
  const statuses90d = [...history90d, status];

  const endpoints = probe.endpoints.map((endpoint) => ({
    ...endpoint,
    ...(endpoint.httpStatus === undefined ? {} : { httpStatus: endpoint.httpStatus }),
    ...(endpoint.responseTimeMs === undefined
      ? {}
      : { responseTimeMs: endpoint.responseTimeMs }),
  }));

  return {
    serviceId: service.id,
    status,
    pattern: computePattern(statuses7d),
    uptime7d: computeUptime(statuses7d),
    uptime90d: computeUptime(statuses90d),
    endpoints,
    sourceRaw: JSON.stringify({
      statuspage: statuspage
        ? {
            ok: statuspage.ok,
            url: statuspage.url,
            indicator: statuspage.indicator,
            description: statuspage.description,
            error: statuspage.error,
          }
        : null,
      probe: probe.raw,
      checkedAt,
    }),
    incidents: statuspage?.incidents ?? [],
  };
}

async function writePollResults(
  db: D1Database,
  results: ServicePollResult[],
  checkedAt: string
) {
  if (results.length === 0) return;

  const snapshotStmt = db.prepare(
    `
    INSERT INTO status_snapshots
      (service_id, status, pattern_hint, uptime_7d, uptime_90d, endpoints_json, checked_at, source_raw)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  );
  const incidentStmt = db.prepare(
    `
    INSERT INTO incidents
      (id, service_id, title, inc_status, severity, started_at, updated_at, resolved_at, url, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      inc_status = excluded.inc_status,
      severity = excluded.severity,
      updated_at = excluded.updated_at,
      resolved_at = excluded.resolved_at,
      url = excluded.url,
      summary = excluded.summary
    `
  );

  const statements: D1PreparedStatement[] = [];
  for (const result of results) {
    statements.push(
      snapshotStmt.bind(
        result.serviceId,
        result.status,
        result.pattern,
        result.uptime7d,
        result.uptime90d,
        JSON.stringify(result.endpoints),
        checkedAt,
        result.sourceRaw
      )
    );
    for (const incident of result.incidents) {
      statements.push(
        incidentStmt.bind(
          incident.id,
          incident.serviceId,
          incident.title,
          incident.status,
          incident.severity,
          incident.startedAt,
          incident.updatedAt,
          incident.resolvedAt,
          incident.url,
          incident.summary
        )
      );
    }
  }

  // One RPC instead of one per row — ~10 services × (1 snapshot + 0–5
  // incidents) used to mean 10–60 sequential D1 round trips per cron tick.
  await db.batch(statements);
}

async function cleanupOldRows(db: D1Database) {
  await db
    .prepare(`DELETE FROM status_snapshots WHERE checked_at < datetime('now', ?)`)
    .bind(`-${RETENTION_DAYS} days`)
    .run();

  await db
    .prepare(`DELETE FROM cron_runs WHERE ran_at < datetime('now', ?)`)
    .bind(`-${RETENTION_DAYS} days`)
    .run();
}

async function cleanupSeedRows(db: D1Database) {
  await db.prepare(`DELETE FROM status_snapshots WHERE source_raw IS NULL`).run();
  await db.prepare(`DELETE FROM incidents WHERE id LIKE 'seed-%'`).run();
}

// Dispatch to a platform-specific adapter based on the service's source_type.
// Each adapter returns a normalized StatuspageResult so chooseServiceStatus
// can stay platform-agnostic. Adapters MAY return null to mean "this isn't my
// platform"; that lets us fall through to Better Stack HTML as a last resort.
async function fetchStatuspage(service: ServiceRow): Promise<StatuspageResult | null> {
  switch (service.source_type) {
    case "official_ai_status_page":
      return (
        (await fetchAtlassian(service)) ?? (await fetchBetterStackOgFallback(service))
      );
    case "betterstack":
      return (
        (await fetchBetterStackJson(service)) ??
        (await fetchBetterStackOgFallback(service))
      );
    case "instatus":
      return await fetchInstatus(service);
    case "onlineornot":
      return await fetchOnlineOrNot(service);
    case "incidentio":
      return await fetchIncidentIo(service);
    default:
      return null;
  }
}

type IncidentIoSummary = {
  page_title?: string;
  page_url?: string;
  ongoing_incidents?: Array<{
    id?: string;
    name?: string;
    status?: string;
    published_at?: string;
    affected_components?: Array<{ component_id?: string; current_status?: string }>;
  }>;
  in_progress_maintenances?: Array<{
    id?: string;
    name?: string;
    status?: string;
    started_at?: string;
  }>;
  scheduled_maintenances?: Array<{
    id?: string;
    name?: string;
    starts_at?: string;
  }>;
};

async function fetchIncidentIo(service: ServiceRow): Promise<StatuspageResult | null> {
  const base = normalizeUrl(service.status_page_url) ?? normalizeUrl(service.status_page);
  if (!base) return null;
  let url: string;
  try {
    url = new URL("/api/v1/summary", new URL(base).origin).toString();
  } catch {
    return null;
  }

  try {
    const res = await fetchWithTimeout(url, STATUSPAGE_TIMEOUT_MS, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { ok: false, url, status: "unknown", incidents: [], error: `HTTP ${res.status}` };
    }
    const json = safeJson<IncidentIoSummary>(await res.text());
    if (!json) {
      return { ok: false, url, status: "unknown", incidents: [], error: "invalid JSON" };
    }

    const ongoing = json.ongoing_incidents ?? [];
    const maint = json.in_progress_maintenances ?? [];

    // No overall-status field in incident.io's public summary; derive it.
    // Worst component status across ongoing incidents wins.
    let status: NormalizedStatus;
    if (ongoing.length === 0 && maint.length === 0) {
      status = "operational";
    } else if (maint.length > 0 && ongoing.length === 0) {
      status = "maintenance";
    } else {
      status = worstIncidentIoComponentStatus(ongoing);
    }

    const incidents = [
      ...ongoing.map((i) => ({
        id: `${service.id}:io-${i.id ?? i.name}`,
        serviceId: service.id,
        title: i.name ?? "Incident",
        status: mapIncidentIoIncidentStatus(i.status),
        severity: mapIncidentIoSeverity(worstComponentStatusOf(i.affected_components)),
        startedAt: i.published_at ?? new Date().toISOString(),
        updatedAt: i.published_at ?? new Date().toISOString(),
        resolvedAt: null,
        url: null,
        summary: null,
      })),
      ...maint.map((m) => ({
        id: `${service.id}:io-m-${m.id ?? m.name}`,
        serviceId: service.id,
        title: m.name ?? "Maintenance",
        status: "maintenance" as const,
        severity: "notice" as const,
        startedAt: m.started_at ?? new Date().toISOString(),
        updatedAt: m.started_at ?? new Date().toISOString(),
        resolvedAt: null,
        url: null,
        summary: null,
      })),
    ];

    return {
      ok: true,
      url,
      status,
      indicator: `incidentio:${status}`,
      description: ongoing.length
        ? `${ongoing.length} ongoing incident(s)`
        : maint.length
        ? `${maint.length} maintenance(s) in progress`
        : "all systems operational",
      incidents,
    };
  } catch (error) {
    return { ok: false, url, status: "unknown", incidents: [], error: stringifyError(error) };
  }
}

function worstComponentStatusOf(
  components: Array<{ current_status?: string }> | undefined
): string | undefined {
  if (!components || components.length === 0) return undefined;
  const order = ["full_outage", "partial_outage", "degraded_performance", "under_maintenance", "operational"];
  for (const s of order) {
    if (components.some((c) => c.current_status === s)) return s;
  }
  return undefined;
}

function worstIncidentIoComponentStatus(
  ongoing: NonNullable<IncidentIoSummary["ongoing_incidents"]>
): NormalizedStatus {
  const all = ongoing.flatMap((i) => i.affected_components ?? []);
  const worst = worstComponentStatusOf(all);
  return mapIncidentIoComponentStatus(worst);
}

function mapIncidentIoComponentStatus(s: string | undefined): NormalizedStatus {
  if (s === "operational") return "operational";
  if (s === "degraded_performance") return "degraded";
  if (s === "partial_outage") return "partial_outage";
  if (s === "full_outage") return "major_outage";
  if (s === "under_maintenance") return "maintenance";
  return "degraded"; // unknown ongoing incident → at least degraded
}

function mapIncidentIoSeverity(s: string | undefined): IncidentSeverity {
  if (s === "operational") return "notice";
  if (s === "degraded_performance") return "degraded";
  if (s === "partial_outage") return "partial_outage";
  if (s === "full_outage") return "major_outage";
  if (s === "under_maintenance") return "notice";
  return "unknown";
}

function mapIncidentIoIncidentStatus(s: string | undefined): IncidentStatus {
  if (s === "investigating") return "investigating";
  if (s === "identified") return "identified";
  if (s === "monitoring") return "monitoring";
  if (s === "resolved") return "resolved";
  return "investigating";
}

async function fetchAtlassian(service: ServiceRow): Promise<StatuspageResult | null> {
  const urls = buildStatuspageSummaryUrls(service);
  let lastError = "no summary URL candidates";

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, STATUSPAGE_TIMEOUT_MS, {
        headers: { accept: "application/json" },
      });
      const text = await res.text();
      if (!res.ok) {
        lastError = `${url} → HTTP ${res.status}`;
        continue;
      }

      const summary = safeJson<StatuspageSummary>(text);
      if (!summary) {
        lastError = `${url} → invalid Statuspage summary`;
        continue;
      }
      const indicator = summary.status?.indicator;
      const pageStatus = summary.page?.status;
      if (!indicator && !pageStatus) {
        lastError = `${url} → no indicator or page.status`;
        continue;
      }

      const status = indicator
        ? mapStatuspageIndicator(indicator)
        : mapInstatusPageStatus(pageStatus!);
      return {
        ok: true,
        url,
        status,
        indicator: indicator ?? `instatus:${pageStatus}`,
        description: summary.status?.description,
        incidents: [
          ...(summary.incidents ?? []),
          ...(summary.scheduled_maintenances ?? []),
        ].map((incident) => mapStatuspageIncident(service.id, incident)),
      };
    } catch (error) {
      lastError = `${url} → ${stringifyError(error)}`;
    }
  }

  return {
    ok: false,
    status: "unknown",
    incidents: [],
    error: lastError,
  };
}

type BetterStackJson = {
  data?: {
    attributes?: {
      aggregate_state?: string;
    };
  };
  included?: Array<{
    id?: string | number;
    type?: string;
    attributes?: {
      title?: string;
      starts_at?: string;
      ends_at?: string | null;
      aggregate_state?: string;
      report_type?: string;
    };
  }>;
};

async function fetchBetterStackJson(
  service: ServiceRow
): Promise<StatuspageResult | null> {
  const base = normalizeUrl(service.status_page_url) ?? normalizeUrl(service.status_page);
  if (!base) return null;
  let url: string;
  try {
    url = new URL("/index.json", new URL(base).origin).toString();
  } catch {
    return null;
  }

  try {
    const res = await fetchWithTimeout(url, STATUSPAGE_TIMEOUT_MS, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { ok: false, url, status: "unknown", incidents: [], error: `HTTP ${res.status}` };
    }
    const json = safeJson<BetterStackJson>(await res.text());
    const state = json?.data?.attributes?.aggregate_state;
    if (!state) {
      return { ok: false, url, status: "unknown", incidents: [], error: "missing aggregate_state" };
    }

    const incidents = (json?.included ?? [])
      .filter((row) => row.type === "status_report" && row.attributes?.title)
      .map((row) => {
        const a = row.attributes!;
        return {
          id: `${service.id}:bs-${row.id ?? a.title}`,
          serviceId: service.id,
          title: a.title!,
          status: a.ends_at ? ("resolved" as const) : ("monitoring" as const),
          severity: mapBetterStackSeverity(a.aggregate_state),
          startedAt: a.starts_at ?? new Date().toISOString(),
          updatedAt: a.ends_at ?? a.starts_at ?? new Date().toISOString(),
          resolvedAt: a.ends_at ?? null,
          url: null,
          summary: null,
        };
      });

    return {
      ok: true,
      url,
      status: mapBetterStackAggregateState(state),
      indicator: `betterstack:${state}`,
      description: `Better Stack aggregate_state: ${state}`,
      incidents,
    };
  } catch (error) {
    return { ok: false, url, status: "unknown", incidents: [], error: stringifyError(error) };
  }
}

// HTML og:image fallback. Kept for cases where /index.json is somehow
// unreachable. Confidence is low; only the overall indicator, no incidents.
async function fetchBetterStackOgFallback(
  service: ServiceRow
): Promise<StatuspageResult | null> {
  const base = normalizeUrl(service.status_page_url) ?? normalizeUrl(service.status_page);
  if (!base) return null;
  let origin: string;
  try {
    origin = new URL(base).origin + "/";
  } catch {
    return null;
  }

  try {
    const res = await fetchWithTimeout(origin, STATUSPAGE_TIMEOUT_MS, {
      headers: { accept: "text/html", range: "bytes=0-16383" },
    });
    if (res.status !== 200 && res.status !== 206) return null;
    const text = await res.text();
    if (!/uptime\.betterstack\.com|status_pages_v2/i.test(text)) return null;

    const ogMatch = text.match(/og_(operational|degraded|downtime|maintenance)/);
    if (!ogMatch) return null;
    const indicator = ogMatch[1];

    return {
      ok: true,
      url: origin,
      status: mapBetterStackAggregateState(indicator),
      indicator: `betterstack-og:${indicator}`,
      description: `Better Stack og:image fallback: ${indicator}`,
      incidents: [],
    };
  } catch {
    return null;
  }
}

function mapBetterStackAggregateState(state: string): NormalizedStatus {
  if (state === "operational") return "operational";
  if (state === "degraded") return "degraded";
  if (state === "downtime") return "major_outage";
  if (state === "maintenance") return "maintenance";
  return "unknown";
}

function mapBetterStackSeverity(state: string | undefined): IncidentSeverity {
  if (state === "degraded") return "degraded";
  if (state === "downtime") return "major_outage";
  if (state === "maintenance") return "notice";
  return "unknown";
}

type InstatusJson = {
  page?: { status?: string };
  activeIncidents?: Array<{
    id?: string;
    name?: string;
    started?: string;
    resolved?: string | null;
    impact?: string;
    status?: string;
    url?: string;
  }>;
};

async function fetchInstatus(service: ServiceRow): Promise<StatuspageResult | null> {
  const base = normalizeUrl(service.status_page_url) ?? normalizeUrl(service.status_page);
  if (!base) return null;
  // Instatus exposes /v3/summary.json on both the custom domain and the
  // <subdomain>.instatus.com host. The custom domain version always works
  // when the custom domain itself does — try it first.
  const candidates = new Set<string>();
  try {
    const origin = new URL(base).origin;
    candidates.add(new URL("/v3/summary.json", origin).toString());
    candidates.add(new URL("/api/v2/summary.json", origin).toString());
  } catch {
    return null;
  }

  let lastError = "no candidates";
  for (const url of candidates) {
    try {
      const res = await fetchWithTimeout(url, STATUSPAGE_TIMEOUT_MS, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        lastError = `${url} → HTTP ${res.status}`;
        continue;
      }
      const json = safeJson<InstatusJson>(await res.text());
      const pageStatus = json?.page?.status;
      if (!pageStatus) {
        lastError = `${url} → no page.status`;
        continue;
      }

      const incidents = (json.activeIncidents ?? [])
        .filter((i) => i.name)
        .map((i) => ({
          id: `${service.id}:in-${i.id ?? i.name}`,
          serviceId: service.id,
          title: i.name!,
          status: mapInstatusIncidentStatus(i.status),
          severity: mapInstatusIncidentImpact(i.impact),
          startedAt: i.started ?? new Date().toISOString(),
          updatedAt: i.started ?? new Date().toISOString(),
          resolvedAt: i.resolved ?? null,
          url: i.url ?? null,
          summary: null,
        }));

      return {
        ok: true,
        url,
        status: mapInstatusPageStatus(pageStatus),
        indicator: `instatus:${pageStatus}`,
        description: `Instatus page.status: ${pageStatus}`,
        incidents,
      };
    } catch (error) {
      lastError = `${url} → ${stringifyError(error)}`;
    }
  }

  return { ok: false, status: "unknown", incidents: [], error: lastError };
}

function mapInstatusIncidentStatus(s: string | undefined): IncidentStatus {
  const v = (s ?? "").toUpperCase();
  if (v === "INVESTIGATING") return "investigating";
  if (v === "IDENTIFIED") return "identified";
  if (v === "MONITORING") return "monitoring";
  if (v === "RESOLVED") return "resolved";
  if (v === "MAINTENANCE") return "maintenance";
  return "unknown";
}

function mapInstatusIncidentImpact(i: string | undefined): IncidentSeverity {
  const v = (i ?? "").toUpperCase();
  if (v === "OPERATIONAL" || v === "NO_IMPACT") return "notice";
  if (v === "DEGRADED" || v === "DEGRADEDPERFORMANCE") return "degraded";
  if (v === "PARTIALOUTAGE") return "partial_outage";
  if (v === "MAJOROUTAGE") return "major_outage";
  if (v === "MAINTENANCE") return "notice";
  return "unknown";
}

type OnlineOrNotJson = {
  success?: boolean;
  result?: {
    status?: { description?: string };
    status_page?: { status?: string };
    components?: Array<{ name?: string; status?: string }>;
    active_incidents?: Array<{
      id?: string;
      title?: string;
      started?: string;
      ended?: string | null;
      impact?: string;
      status?: string;
    }>;
  };
};

async function fetchOnlineOrNot(service: ServiceRow): Promise<StatuspageResult | null> {
  // status_page_url is expected to be the full OnlineOrNot summary URL.
  const url = normalizeUrl(service.status_page_url);
  if (!url || !/api\.onlineornot\.com/.test(url)) {
    return { ok: false, status: "unknown", incidents: [], error: "OnlineOrNot URL missing" };
  }

  try {
    const res = await fetchWithTimeout(url, STATUSPAGE_TIMEOUT_MS, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { ok: false, url, status: "unknown", incidents: [], error: `HTTP ${res.status}` };
    }
    const json = safeJson<OnlineOrNotJson>(await res.text());
    if (!json?.success || !json.result) {
      return { ok: false, url, status: "unknown", incidents: [], error: "no result" };
    }

    // Prefer status_page.status (machine-readable). Fall back to inferring
    // from the description string ("All Systems Operational" / etc.).
    const pageStatus =
      json.result.status_page?.status ??
      inferOnlineOrNotFromDescription(json.result.status?.description) ??
      inferOnlineOrNotFromComponents(json.result.components);

    const status = mapOnlineOrNotStatus(pageStatus);
    const incidents = (json.result.active_incidents ?? [])
      .filter((i) => i.title)
      .map((i) => ({
        id: `${service.id}:oon-${i.id ?? i.title}`,
        serviceId: service.id,
        title: i.title!,
        status: mapInstatusIncidentStatus(i.status),
        severity: mapOnlineOrNotSeverity(i.impact),
        startedAt: i.started ?? new Date().toISOString(),
        updatedAt: i.started ?? new Date().toISOString(),
        resolvedAt: i.ended ?? null,
        url: null,
        summary: null,
      }));

    return {
      ok: true,
      url,
      status,
      indicator: `onlineornot:${pageStatus ?? "unknown"}`,
      description: json.result.status?.description,
      incidents,
    };
  } catch (error) {
    return { ok: false, url, status: "unknown", incidents: [], error: stringifyError(error) };
  }
}

function inferOnlineOrNotFromDescription(desc: string | undefined): string | undefined {
  if (!desc) return undefined;
  const d = desc.toLowerCase();
  if (d.includes("all systems operational")) return "ALL_SYSTEMS_OPERATIONAL";
  if (d.includes("major outage")) return "MAJOR_OUTAGE";
  if (d.includes("partial outage")) return "PARTIAL_OUTAGE";
  if (d.includes("degraded")) return "DEGRADED_PERFORMANCE";
  if (d.includes("maintenance")) return "UNDER_MAINTENANCE";
  return undefined;
}

function inferOnlineOrNotFromComponents(
  components: Array<{ status?: string }> | undefined
): string | undefined {
  if (!components || components.length === 0) return undefined;
  if (components.some((c) => c.status === "MAJOR_OUTAGE")) return "MAJOR_OUTAGE";
  if (components.some((c) => c.status === "PARTIAL_OUTAGE")) return "PARTIAL_OUTAGE";
  if (components.some((c) => c.status === "DEGRADED_PERFORMANCE"))
    return "DEGRADED_PERFORMANCE";
  if (components.every((c) => c.status === "OPERATIONAL")) return "ALL_SYSTEMS_OPERATIONAL";
  return undefined;
}

function mapOnlineOrNotStatus(s: string | undefined): NormalizedStatus {
  if (!s) return "unknown";
  if (s === "ALL_SYSTEMS_OPERATIONAL") return "operational";
  if (s === "DEGRADED_PERFORMANCE") return "degraded";
  if (s === "PARTIAL_OUTAGE") return "partial_outage";
  if (s === "MAJOR_OUTAGE") return "major_outage";
  if (s === "UNDER_MAINTENANCE") return "maintenance";
  return "unknown";
}

function mapOnlineOrNotSeverity(impact: string | undefined): IncidentSeverity {
  const v = (impact ?? "").toUpperCase();
  if (v === "OPERATIONAL" || v === "NO_IMPACT") return "notice";
  if (v === "DEGRADED_PERFORMANCE") return "degraded";
  if (v === "PARTIAL_OUTAGE") return "partial_outage";
  if (v === "MAJOR_OUTAGE") return "major_outage";
  if (v === "MAINTENANCE") return "notice";
  return "unknown";
}

function buildStatuspageSummaryUrls(service: ServiceRow): string[] {
  const urls = new Set<string>();
  for (const raw of [service.status_page_url, service.status_page]) {
    const normalized = normalizeUrl(raw);
    if (!normalized) continue;
    // If the configured URL itself is a JSON endpoint (e.g. Rootly's
    // /api/v1/status.json on Replit, or a service pointing directly at
    // deepseek.statuspage.io), use it verbatim — don't append /api/v2/.
    if (/\.json(\?|$)/i.test(normalized) || /\/api\/v\d+\//.test(normalized)) {
      urls.add(normalized);
      continue;
    }
    try {
      const u = new URL(normalized);
      urls.add(new URL("/api/v2/summary.json", u.origin).toString());
      if (u.pathname !== "/") {
        const basePath = u.pathname.replace(/\/$/, "");
        urls.add(new URL(`${basePath}/api/v2/summary.json`, u.origin).toString());
      }
    } catch {
      // Ignore malformed status page metadata; endpoint probes still run.
    }
  }
  return [...urls];
}

async function probeEndpoints(
  endpoints: ProbeUrl[]
): Promise<{ endpoints: EndpointSnapshot[]; raw: ProbeRaw[]; status: NormalizedStatus }> {
  const raw = await mapLimit(endpoints, 8, probeEndpoint);
  const snapshots = raw.map((r) => ({
    label: r.label,
    url: r.url,
    status: r.status,
    ...(r.httpStatus === undefined ? {} : { httpStatus: r.httpStatus }),
    ...(r.responseTimeMs === undefined ? {} : { responseTimeMs: r.responseTimeMs }),
  }));

  return {
    endpoints: snapshots,
    raw,
    status: aggregateProbeStatus(raw),
  };
}

async function probeEndpoint(endpoint: ProbeUrl): Promise<ProbeRaw> {
  const url = normalizeUrl(endpoint.url);
  if (!url) {
    return {
      label: endpoint.label,
      url: endpoint.url,
      status: "unknown",
      errorKind: "invalid_url",
      error: "empty URL",
    };
  }

  const started = Date.now();
  const shouldCheckBody =
    (endpoint.bodyMustContain?.length ?? 0) > 0 ||
    (endpoint.bodyMustNotContain?.length ?? 0) > 0;
  try {
    const res = await fetchWithTimeout(url, PROBE_TIMEOUT_MS, {
      redirect: "follow",
      headers: {
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        ...(shouldCheckBody ? { range: `bytes=0-${PROBE_BODY_BYTES - 1}` } : {}),
        "user-agent": "ai-status-board/0.1 (+https://is-ai-down.yoru-and-akari.dev)",
      },
    });
    const responseTimeMs = Date.now() - started;
    let status = mapProbeHttpStatus(res.status, responseTimeMs);
    let contentError: string | undefined;

    if (shouldCheckBody) {
      const body = await readBodyPrefix(res, PROBE_BODY_BYTES);
      const mismatch = evaluateBodyChecks(endpoint, body);
      if (mismatch && status !== "down") {
        status = "degraded";
        contentError = mismatch;
      }
    } else {
      // Drain a small chunk so the request is actually completed without storing
      // or parsing large pages.
      await res.body?.cancel();
    }

    return {
      label: endpoint.label,
      url: endpoint.url,
      status,
      httpStatus: res.status,
      responseTimeMs,
      ...(contentError
        ? { errorKind: "content_mismatch" as const, error: contentError }
        : res.status >= 400
        ? { errorKind: "http" as const }
        : {}),
    };
  } catch (error) {
    const responseTimeMs = Date.now() - started;
    const message = stringifyError(error);
    const lower = message.toLowerCase();
    const isSubreqLimit = lower.includes("too many subrequests");
    const isTimeout = lower.includes("abort");
    // We can't distinguish "real outage" from "Worker can't reach this host"
    // (CDN refusing the egress IP/UA, regional block, etc.) — only timeouts
    // are confident-enough to treat as down.
    const status: EndpointStatus = isTimeout ? "down" : "unknown";
    const errorKind: ProbeRaw["errorKind"] = isSubreqLimit
      ? "subrequest_limit"
      : isTimeout
      ? "timeout"
      : "network";
    return {
      label: endpoint.label,
      url: endpoint.url,
      status,
      responseTimeMs,
      errorKind,
      error: message,
    };
  }
}

async function readBodyPrefix(res: Response, byteLimit: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < byteLimit) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const remaining = byteLimit - total;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      total += chunk.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function evaluateBodyChecks(endpoint: ProbeUrl, body: string): string | null {
  const lowerBody = body.toLowerCase();
  const missing = endpoint.bodyMustContain?.filter(
    (keyword) => !lowerBody.includes(keyword.toLowerCase())
  );
  if (missing?.length) return `missing required body content: ${missing.join(", ")}`;

  const forbidden = endpoint.bodyMustNotContain?.find((keyword) =>
    lowerBody.includes(keyword.toLowerCase())
  );
  if (forbidden) return `forbidden body content matched: ${forbidden}`;

  return null;
}

function mapProbeHttpStatus(status: number, responseTimeMs: number): EndpointStatus {
  if (status >= 500) return "down";
  if (status >= 400) return "unknown";
  // Cross-region Worker → upstream CDN can easily take 1–2s on cold paths.
  // 2.5s is the threshold where users actually start noticing.
  if (responseTimeMs >= 2_500) return "degraded";
  return "up";
}

function aggregateProbeStatus(raw: ProbeRaw[]): NormalizedStatus {
  if (raw.length === 0) return "unknown";
  const known = raw.filter((r) => r.status !== "unknown");
  if (known.length === 0) return "unknown";
  if (known.every((r) => r.status === "down" && r.errorKind === "timeout")) {
    return "major_outage";
  }
  if (raw.some((r) => r.status === "down")) return "partial_outage";
  if (raw.some((r) => r.status === "degraded")) return "degraded";
  if (raw.some((r) => r.status === "up")) return "operational";
  return "unknown";
}

function chooseServiceStatus(
  sourceType: StatusSourceType,
  statuspage: StatuspageResult | null,
  probeStatus: NormalizedStatus
): NormalizedStatus {
  if (sourceType === "cloud_health_dashboard") {
    // No statuspage available; the probe is the only signal. But the probe
    // ran from whichever Cloudflare edge picked up this cron tick, and that
    // edge may simply not reach the upstream (common for CN-region services
    // like 百度千帆 / 阿里百炼 / 腾讯混元 when scheduled to a US edge).
    // Treat a probe-only major_outage as unknown — honest beats wrong.
    if (probeStatus === "major_outage") return "unknown";
    return probeStatus;
  }
  if (statuspage?.ok) return statuspage.status;
  // Statuspage fetch failed (Better Stack host, subrequest limit, SSL, etc.).
  // Only trust the probe if it produced a confident "up/degraded/operational"
  // signal — a probe "unknown" or "major_outage" inferred purely from network
  // errors should not flip the displayed status.
  if (probeStatus === "operational" || probeStatus === "degraded") {
    return probeStatus;
  }
  return "unknown";
}

function mapStatuspageIndicator(indicator: string): NormalizedStatus {
  if (indicator === "none") return "operational";
  if (indicator === "minor") return "degraded";
  if (indicator === "major") return "partial_outage";
  if (indicator === "critical") return "major_outage";
  if (indicator === "maintenance") return "maintenance";
  return "unknown";
}

function mapInstatusPageStatus(pageStatus: string): NormalizedStatus {
  // Instatus exposes coarse states via the Atlassian-compat endpoint:
  // UP / HASISSUES / UNDERMAINTENANCE (sometimes lowercase).
  const v = pageStatus.toUpperCase();
  if (v === "UP") return "operational";
  if (v === "HASISSUES") return "degraded";
  if (v === "UNDERMAINTENANCE") return "maintenance";
  return "unknown";
}

function mapStatuspageIncident(
  serviceId: string,
  incident: StatuspageIncident
): IncidentUpsert {
  const upstreamId =
    incident.id ??
    stableIncidentId(
      incident.name ?? "untitled",
      incident.created_at ?? incident.started_at ?? incident.scheduled_for ?? "unknown"
    );
  const startedAt =
    incident.started_at ??
    incident.created_at ??
    incident.scheduled_for ??
    new Date().toISOString();
  const updatedAt =
    incident.updated_at ?? incident.resolved_at ?? incident.scheduled_until ?? startedAt;

  return {
    id: `${serviceId}:${upstreamId}`,
    serviceId,
    title: incident.name ?? "Untitled incident",
    status: mapIncidentStatus(incident.status),
    severity: mapIncidentSeverity(incident.impact, incident.status),
    startedAt,
    updatedAt,
    resolvedAt: incident.resolved_at ?? null,
    url: incident.shortlink ?? incident.url ?? null,
    summary: incident.incident_updates?.[0]?.body ?? null,
  };
}

function mapIncidentStatus(status: string | undefined): IncidentStatus {
  if (status === "investigating") return "investigating";
  if (status === "identified") return "identified";
  if (status === "monitoring") return "monitoring";
  if (status === "resolved" || status === "completed" || status === "postmortem") {
    return "resolved";
  }
  if (status === "scheduled" || status === "in_progress" || status === "verifying") {
    return "maintenance";
  }
  return "unknown";
}

function mapIncidentSeverity(
  impact: string | undefined,
  status: string | undefined
): IncidentSeverity {
  if (status === "scheduled" || status === "in_progress" || status === "verifying") {
    return "notice";
  }
  if (impact === "minor") return "degraded";
  if (impact === "major") return "partial_outage";
  if (impact === "critical") return "major_outage";
  if (impact === "none" || impact === "maintenance") return "notice";
  return "unknown";
}

async function loadStatusHistory(
  db: D1Database,
  serviceId: string,
  days: 7 | 90
): Promise<NormalizedStatus[]> {
  const { results } = await db
    .prepare(
      `
      SELECT status
      FROM status_snapshots
      WHERE service_id = ?
        AND checked_at >= datetime('now', ?)
      ORDER BY checked_at ASC
      `
    )
    .bind(serviceId, `-${days} days`)
    .all<{ status: NormalizedStatus }>();

  return (results ?? []).map((row) => row.status);
}

function computePattern(statuses: NormalizedStatus[]): UptimePattern {
  if (statuses.length === 0 || statuses.every((s) => s === "unknown")) return "unknown";
  if (statuses.every((s) => s === "operational")) return "perfect";
  if (statuses.includes("maintenance")) return "maintenance";
  if (statuses.includes("major_outage")) return "recent_issue";
  if (statuses.some((s) => s === "partial_outage" || s === "degraded")) {
    return "some_issues";
  }
  if (new Set(statuses).size > 1) return "scattered";
  return "unknown";
}

function computeUptime(statuses: NormalizedStatus[]): number | null {
  const known = statuses.filter((s) => s !== "unknown");
  if (known.length === 0) return null;

  const score = known.reduce((sum, status) => {
    if (status === "operational" || status === "maintenance") return sum + 1;
    if (status === "degraded") return sum + 1;
    if (status === "partial_outage") return sum + 0.5;
    return sum;
  }, 0);

  return round4(score / known.length);
}

function parseEndpoints(raw: string): ProbeUrl[] {
  const parsed = safeJson<ProbeUrl[]>(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (endpoint): endpoint is ProbeUrl =>
      typeof endpoint?.label === "string" && typeof endpoint?.url === "string"
  );
}

function safeJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  init: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await fn(items[index], index);
      }
    })
  );

  return results;
}

function stableIncidentId(title: string, startedAt: string): string {
  let hash = 0;
  const input = `${title}|${startedAt}`;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `generated-${hash.toString(16)}`;
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
