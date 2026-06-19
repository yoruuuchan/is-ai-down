import type {
  EndpointStatus,
  IncidentSeverity,
  IncidentStatus,
  NormalizedStatus,
  ProbeUrl,
  UptimePattern,
} from "./types";

type PillTokens = { bg: string; text: string; dot: string };

export const pillMap: Record<NormalizedStatus, PillTokens> = {
  operational: {
    bg: "var(--success-100)",
    text: "var(--success-700)",
    dot: "var(--success-500)",
  },
  degraded: {
    bg: "var(--warning-100)",
    text: "var(--warning-700)",
    dot: "var(--warning-500)",
  },
  partial_outage: {
    bg: "var(--ember-100)",
    text: "var(--ember-700)",
    dot: "var(--ember-500)",
  },
  major_outage: {
    bg: "var(--error-100)",
    text: "var(--error-700)",
    dot: "var(--error-500)",
  },
  maintenance: {
    bg: "var(--info-100)",
    text: "var(--info-700)",
    dot: "var(--info-500)",
  },
  unknown: {
    bg: "var(--line-1)",
    text: "var(--ink-3)",
    dot: "var(--ink-4)",
  },
};

export const statsDotColor: Record<NormalizedStatus, string> = {
  operational: "var(--success-500)",
  degraded: "var(--warning-500)",
  partial_outage: "var(--ember-500)",
  major_outage: "var(--error-500)",
  maintenance: "var(--info-500)",
  unknown: "var(--ink-4)",
};

export const endpointDot: Record<EndpointStatus, string> = {
  up: "var(--success-500)",
  degraded: "var(--warning-500)",
  down: "var(--error-500)",
  unknown: "var(--ink-4)",
};

export const incStatusStyle: Record<
  IncidentStatus,
  { bg: string; text: string }
> = {
  investigating: { bg: "var(--warning-100)", text: "var(--warning-700)" },
  identified: { bg: "var(--ember-100)", text: "var(--ember-700)" },
  monitoring: { bg: "var(--info-100)", text: "var(--info-700)" },
  resolved: { bg: "var(--success-100)", text: "var(--success-700)" },
  maintenance: { bg: "var(--info-100)", text: "var(--info-700)" },
  unknown: { bg: "var(--line-1)", text: "var(--ink-3)" },
};

export const incidentSeverityDot: Record<IncidentSeverity, string> = {
  notice: "var(--info-500)",
  degraded: "var(--warning-500)",
  partial_outage: "var(--ember-500)",
  major_outage: "var(--error-500)",
  unknown: "var(--ink-4)",
};

// Sort order: abnormal first.
const statusOrder: Record<NormalizedStatus, number> = {
  major_outage: 0,
  partial_outage: 1,
  degraded: 2,
  unknown: 3,
  maintenance: 4,
  operational: 5,
};

export function compareByStatus(
  a: NormalizedStatus,
  b: NormalizedStatus,
): number {
  return statusOrder[a] - statusOrder[b];
}

// Reverses Worker `formatRelativeZh()` back into seconds for client-side
// "recent" sorting. "MM-DD" and "—" return +∞ so they sink to the bottom —
// good enough without round-tripping a raw timestamp through the API.
const SECONDS_AGO_RE = /^(\d+)\s*秒前$/;
const MINUTES_AGO_RE = /^(\d+)\s*分钟前$/;
const HOURS_AGO_RE = /^(\d+)\s*小时前$/;
const DAYS_AGO_RE = /^(\d+)\s*天前$/;

export function parseLastUpdateAgo(s: string): number {
  if (!s || s === "—") return Number.POSITIVE_INFINITY;
  let m = SECONDS_AGO_RE.exec(s);
  if (m) return Number(m[1]);
  m = MINUTES_AGO_RE.exec(s);
  if (m) return Number(m[1]) * 60;
  m = HOURS_AGO_RE.exec(s);
  if (m) return Number(m[1]) * 3600;
  if (s === "昨天") return 86_400;
  m = DAYS_AGO_RE.exec(s);
  if (m) return Number(m[1]) * 86_400;
  return Number.POSITIVE_INFINITY;
}

// Pattern → segment array → segment runs → linear-gradient CSS.
// Mirrors the prototype's makeGradient() exactly so the visual matches.
type Seg = "ok" | "warn" | "err" | "ember" | "maint" | "unk";

const palVar: Record<Seg, string> = {
  ok: "var(--pal-ok)",
  warn: "var(--pal-warn)",
  err: "var(--pal-err)",
  ember: "var(--pal-ember)",
  maint: "var(--pal-maint)",
  unk: "var(--pal-unk)",
};

export function makeUptimeGradient(pattern: UptimePattern, n: number): string {
  const segs: Seg[] = new Array(n).fill("ok");

  if (pattern === "recent_issue") {
    const off = Math.floor(n * 0.88);
    const span = Math.ceil(n * 0.06);
    for (let a = off; a < off + span && a < n; a++) segs[a] = "warn";
    if (off + 3 < n) segs[off + 3] = "err";
  } else if (pattern === "scattered") {
    segs[Math.floor(n * 0.25)] = "warn";
    segs[Math.floor(n * 0.61)] = "warn";
  } else if (pattern === "some_issues") {
    const s1 = Math.floor(n * 0.33);
    segs[s1] = "warn";
    if (s1 + 1 < n) segs[s1 + 1] = "warn";
    if (s1 + 2 < n) segs[s1 + 2] = "ember";
    segs[Math.floor(n * 0.67)] = "warn";
    const s2 = Math.floor(n * 0.83);
    segs[s2] = "warn";
    if (s2 + 1 < n) segs[s2 + 1] = "ember";
    if (s2 + 2 < n) segs[s2 + 2] = "warn";
  } else if (pattern === "maintenance") {
    const ms = Math.floor(n * 0.83);
    const me = Math.floor(n * 0.94);
    for (let j = ms; j < me && j < n; j++) segs[j] = "maint";
  } else if (pattern === "unknown") {
    for (let k = 0; k < n; k++) segs[k] = "unk";
  }

  const runs: { color: string; from: number; to: number }[] = [];
  let s = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || segs[i] !== segs[s]) {
      runs.push({
        color: palVar[segs[s]],
        from: (s / n) * 100,
        to: (i / n) * 100,
      });
      s = i;
    }
  }

  return (
    "linear-gradient(to right, " +
    runs
      .map((r) => `${r.color} ${r.from.toFixed(1)}% ${r.to.toFixed(1)}%`)
      .join(", ") +
    ")"
  );
}

// Deterministic pseudo-random response time generator for mock detail panel.
export function mockResponseTime(
  endpointLabel: string,
  serviceName: string,
  status: EndpointStatus,
): string {
  if (status === "down" || status === "unknown") return "—";
  const base =
    ((endpointLabel.charCodeAt(0) * 7 + serviceName.charCodeAt(0) * 3) % 180) +
    40;
  if (status === "up") return `${base}ms`;
  return `${base + 400}ms`;
}

export function mockHttpStatus(status: EndpointStatus): string {
  if (status === "up") return "200 OK";
  if (status === "degraded") return "200 Slow";
  if (status === "down") return "5xx Error";
  return "—";
}

export function formatProbeResponseTime(
  endpoint: ProbeUrl,
  serviceName: string,
): string {
  if (typeof endpoint.responseTimeMs === "number") {
    return `${Math.round(endpoint.responseTimeMs)}ms`;
  }
  return mockResponseTime(endpoint.label, serviceName, endpoint.status);
}

export function formatProbeHttpStatus(endpoint: ProbeUrl): string {
  if (typeof endpoint.httpStatus !== "number") return mockHttpStatus(endpoint.status);
  if (endpoint.httpStatus >= 500) return `${endpoint.httpStatus} Error`;
  if (endpoint.httpStatus >= 400) return `${endpoint.httpStatus} Blocked`;
  if (endpoint.status === "degraded") return `${endpoint.httpStatus} Slow`;
  return `${endpoint.httpStatus} OK`;
}
