// Mirrors web/src/lib/types.ts — keep in sync. These are the shapes returned
// by /api/* and consumed unchanged by the frontend.

export type NormalizedStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance"
  | "unknown";

export type EndpointStatus = "up" | "degraded" | "down" | "unknown";

export type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved"
  | "maintenance"
  | "unknown";

export type IncidentSeverity =
  | "notice"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "unknown";

export type StatusSourceType =
  // Atlassian Statuspage (or Statuspage-compatible — Replit's Rootly returns
  // the same shape on /api/v1/status.json). Treated identically by the parser.
  | "official_ai_status_page"
  | "betterstack"
  | "instatus"
  | "onlineornot"
  | "incidentio"
  | "cloud_health_dashboard"
  | "public_page_probe_only"
  | "docs_or_notice_only"
  | "third_party_only"
  | "unknown";

export type ServiceCategory =
  | "大众聊天"
  | "AI 搜索"
  | "AI 编程"
  | "模型平台"
  | "图像/音视频"
  | "设计/生产力";

export type UptimePattern =
  | "perfect"
  | "scattered"
  | "recent_issue"
  | "some_issues"
  | "maintenance"
  | "unknown";

export type RegionGroup = "global" | "china" | "mixed";

export type ProbeUrl = {
  label: string;
  url: string;
  status: EndpointStatus;
  httpStatus?: number;
  responseTimeMs?: number;
  bodyMustContain?: string[];
  bodyMustNotContain?: string[];
};

export type Service = {
  id: string;
  name: string;
  company: string;
  category: ServiceCategory;
  regionGroup: RegionGroup;
  priority: "P0" | "P1" | "P2";
  status: NormalizedStatus;
  pattern: UptimePattern;
  // Uptime as a fraction (0..1) or null when there are no known samples.
  // The frontend formats the display string in the current locale.
  uptime7d: number | null;
  uptime90d: number | null;
  // ISO-8601 timestamp of the last status check, or null if the service
  // has never been polled. Frontend renders it relative to its own clock.
  lastUpdate: string | null;
  brandColor: string;
  avatarText: "#fff" | "#1A1A1A";
  initial: string;
  statusPage: string;
  statusPageUrl: string;
  sourceType: StatusSourceType;
  endpoints: ProbeUrl[];
};

export type Incident = {
  service: string;
  // ISO-8601 timestamp; frontend formats it relative to its own clock.
  time: string;
  desc: string;
  incStatus: IncidentStatus;
  severity: IncidentSeverity;
};
