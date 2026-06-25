"use client";

import { useSyncExternalStore } from "react";

import type { ServiceCategory } from "./types";

export type Locale = "zh" | "en";

const STORAGE_KEY = "ai-status-board-locale";
const DEFAULT_LOCALE: Locale = "zh";

// --- Dictionary ------------------------------------------------------------

type Dict = Record<string, string>;

const ZH: Dict = {
  "header.title": "AI 状态看板",
  "header.subtitle": "公开状态聚合 · AI Status Board",
  "header.nextRefresh": "下次刷新",
  "header.lastChecked": "上次检查",

  "stats.total": "服务总计",

  "status.operational": "正常",
  "status.degraded": "降级",
  "status.partial_outage": "部分异常",
  "status.major_outage": "异常",
  "status.maintenance": "维护中",
  "status.unknown": "未知",

  "search.placeholder": "搜索服务...",
  "filter.all": "全部",

  "category.general_chat": "大众聊天",
  "category.ai_search": "AI 搜索",
  "category.coding": "AI 编程",
  "category.platforms": "模型平台",
  "category.media": "图像/音视频",
  "category.design": "设计/生产力",

  "sort.label": "排序方式",
  "sort.status": "按状态",
  "sort.alpha_asc": "名称 A→Z",
  "sort.alpha_desc": "名称 Z→A",
  "sort.recent": "最近更新",

  "card.uptime7d": "7日可用率",
  "detail.titleSuffix": "详细状态",
  "detail.probeTitle": "公开探针详情",
  "detail.24h": "24 小时状态",
  "detail.uptime7d": "7 日可用率",
  "detail.uptime90d": "90 日可用率",
  "detail.sourceLabel": "状态源",
  "detail.collapse": "收起 ✕",

  "mini.expanded": "详情已展开 · 点击收起",

  "incident.title": "近期事件",
  "incident.todayCount": "{n} 条今日",

  "incStatus.investigating": "调查中",
  "incStatus.identified": "已确认",
  "incStatus.monitoring": "监控中",
  "incStatus.resolved": "已恢复",
  "incStatus.maintenance": "维护中",
  "incStatus.unknown": "未知",

  "empty.title": "没有匹配的服务",
  "empty.hint": "尝试其他关键词或清除筛选条件",

  "error.title": "无法获取状态数据",
  "error.hint": "检测服务暂时不可用，请稍后重试。",
  "error.retry": "重试",

  "firstload.title": "首次检测中",
  "firstload.hint": "正在连接各服务状态源，通常需要 10-30 秒。",

  "feedback.title": "反馈",
  "feedback.emailLabel": "邮箱",
  "feedback.messageLabel": "反馈内容",
  "feedback.messagePlaceholder":
    "想说啥都行：哪个 AI 该加 / 哪个数据不准 / 哪个功能想看到 / Whatever you want to say",
  "feedback.submit": "发送反馈",
  "feedback.submitting": "发送中…",
  "feedback.success": "反馈已收到，谢谢 / Thanks, received.",
  "feedback.error": "发送失败，请稍后再试。",
  "feedback.privacy":
    "你的邮箱仅用于回信，不会订阅、不会泄漏。/ Your email is only used to reply. No subscription, no leak.",

  "disclaimer.line1":
    "本站监测官方状态页与公开页面可访问性，不代表登录后聊天功能一定正常。",
  "disclaimer.line2":
    "HTTP 200 只代表页面响应正常，不一定代表内部功能可用——遇到状态显示正常但实际不可用，请通过反馈邮箱告诉我们。",

  "theme.titleUnknown": "切换主题",
  "theme.titleToYoru": "切换到夜间模式 (yoru)",
  "theme.titleToAkari": "切换到日间模式 (akari)",

  "locale.titleToZh": "切换到中文",
  "locale.titleToEn": "切换到英文",

  "source.official_ai_status_page": "官方状态页",
  "source.betterstack": "Better Stack",
  "source.instatus": "Instatus",
  "source.onlineornot": "OnlineOrNot",
  "source.incidentio": "incident.io",
  "source.cloud_health_dashboard": "云平台健康",
  "source.public_page_probe_only": "仅公开探针",
  "source.docs_or_notice_only": "文档/公告",
  "source.third_party_only": "第三方监控",
  "source.unknown": "来源未知",

  "time.seconds": "{n} 秒前",
  "time.minutes": "{n} 分钟前",
  "time.hours": "{n} 小时前",
  "time.yesterday": "昨天",
  "time.days": "{n} 天前",
  "time.todayAt": "今天 {time}",
  "time.yesterdayAt": "昨天 {time}",
  "time.unknown": "—",
};

const EN: Dict = {
  "header.title": "AI Status Board",
  "header.subtitle": "Public status aggregation",
  "header.nextRefresh": "Next refresh",
  "header.lastChecked": "Last checked",

  "stats.total": "Services",

  "status.operational": "Operational",
  "status.degraded": "Degraded",
  "status.partial_outage": "Partial outage",
  "status.major_outage": "Major outage",
  "status.maintenance": "Maintenance",
  "status.unknown": "Unknown",

  "search.placeholder": "Search services...",
  "filter.all": "All",

  "category.general_chat": "Chat",
  "category.ai_search": "Search",
  "category.coding": "Coding",
  "category.platforms": "Platforms",
  "category.media": "Media",
  "category.design": "Design",

  "sort.label": "Sort by",
  "sort.status": "By status",
  "sort.alpha_asc": "A → Z",
  "sort.alpha_desc": "Z → A",
  "sort.recent": "Recently updated",

  "card.uptime7d": "7-day uptime",
  "detail.titleSuffix": "Details",
  "detail.probeTitle": "Public probe details",
  "detail.24h": "Last 24 hours",
  "detail.uptime7d": "7-day uptime",
  "detail.uptime90d": "90-day uptime",
  "detail.sourceLabel": "Source",
  "detail.collapse": "Collapse ✕",

  "mini.expanded": "Expanded · click to collapse",

  "incident.title": "Recent incidents",
  "incident.todayCount": "{n} today",

  "incStatus.investigating": "Investigating",
  "incStatus.identified": "Identified",
  "incStatus.monitoring": "Monitoring",
  "incStatus.resolved": "Resolved",
  "incStatus.maintenance": "Maintenance",
  "incStatus.unknown": "Unknown",

  "empty.title": "No services match",
  "empty.hint": "Try a different keyword or clear filters.",

  "error.title": "Couldn't fetch status data",
  "error.hint": "The probe service is temporarily unavailable. Try again shortly.",
  "error.retry": "Retry",

  "firstload.title": "First probe in progress",
  "firstload.hint": "Connecting to status sources. Usually takes 10–30 seconds.",

  "feedback.title": "Feedback",
  "feedback.emailLabel": "Email",
  "feedback.messageLabel": "Message",
  "feedback.messagePlaceholder":
    "想说啥都行：哪个 AI 该加 / 哪个数据不准 / 哪个功能想看到 / Whatever you want to say",
  "feedback.submit": "Send",
  "feedback.submitting": "Sending…",
  "feedback.success": "反馈已收到，谢谢 / Thanks, received.",
  "feedback.error": "Could not send. Please try again later.",
  "feedback.privacy":
    "你的邮箱仅用于回信，不会订阅、不会泄漏。/ Your email is only used to reply. No subscription, no leak.",

  "disclaimer.line1":
    "We probe official status pages and public endpoints. A green probe doesn't guarantee logged-in chat actually works.",
  "disclaimer.line2":
    "HTTP 200 means the page responded — not that the feature works. If a service looks green but breaks in practice, please email feedback.",

  "theme.titleUnknown": "Toggle theme",
  "theme.titleToYoru": "Switch to night mode (yoru)",
  "theme.titleToAkari": "Switch to day mode (akari)",

  "locale.titleToZh": "Switch to Chinese",
  "locale.titleToEn": "Switch to English",

  "source.official_ai_status_page": "Official status page",
  "source.betterstack": "Better Stack",
  "source.instatus": "Instatus",
  "source.onlineornot": "OnlineOrNot",
  "source.incidentio": "incident.io",
  "source.cloud_health_dashboard": "Cloud health",
  "source.public_page_probe_only": "Public probe only",
  "source.docs_or_notice_only": "Docs / notice",
  "source.third_party_only": "Third-party monitor",
  "source.unknown": "Source unknown",

  "time.seconds": "{n}s ago",
  "time.minutes": "{n} min ago",
  "time.hours": "{n} h ago",
  "time.yesterday": "Yesterday",
  "time.days": "{n} d ago",
  "time.todayAt": "Today {time}",
  "time.yesterdayAt": "Yesterday {time}",
  "time.unknown": "—",
};

export const DICT: Record<Locale, Dict> = { zh: ZH, en: EN };

// Service.category is a CJK string in the DB — map to a stable English slug
// so dictionary keys stay readable.
export const CATEGORY_SLUG: Record<ServiceCategory, string> = {
  大众聊天: "general_chat",
  "AI 搜索": "ai_search",
  "AI 编程": "coding",
  模型平台: "platforms",
  "图像/音视频": "media",
  "设计/生产力": "design",
};

// ProbeUrl.label is free text in D1. Map known CJK labels to English; anything
// already in English (API / Platform / Console / Firefly / DashScope / …)
// passes through unchanged. Brand-ish product names ("混元", "百炼") use
// pinyin + a translated function word so they read naturally either side.
const PROBE_LABEL_EN: Record<string, string> = {
  官网: "Homepage",
  文档: "Docs",
  聊天: "Chat",
  平台: "Platform",
  支持: "Support",
  百炼控制台: "Bailian Console",
  千帆控制台: "Qianfan Console",
  混元: "Hunyuan",
  "AI Gateway 文档": "AI Gateway Docs",
};

// --- Locale store (mirrors ThemeToggle's data-attribute pattern) -----------

function readLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const attr = document.documentElement.getAttribute("data-locale");
  return attr === "en" ? "en" : "zh";
}

function subscribeLocale(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-locale"],
  });
  return () => obs.disconnect();
}

export function useLocale(): Locale {
  return useSyncExternalStore<Locale>(
    subscribeLocale,
    readLocale,
    () => DEFAULT_LOCALE,
  );
}

export function setLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-locale", locale);
  document.documentElement.setAttribute(
    "lang",
    locale === "en" ? "en" : "zh-CN",
  );
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore — private mode, etc.
  }
}

export function getInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // fall through to navigator
  }
  const nav = navigator.language || "";
  return nav.toLowerCase().startsWith("zh") ? "zh" : "en";
}

// --- Translation function --------------------------------------------------

export type T = (key: string, vars?: Record<string, string | number>) => string;

function interp(raw: string, vars?: Record<string, string | number>): string {
  if (!vars) return raw;
  let out = raw;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export function useT(): T {
  const locale = useLocale();
  const dict = DICT[locale];
  return (key, vars) => interp(dict[key] ?? key, vars);
}

export function useProbeLabel(): (label: string) => string {
  const locale = useLocale();
  return (label) => {
    if (locale !== "en") return label;
    return PROBE_LABEL_EN[label] ?? label;
  };
}

// --- Relative time helpers -------------------------------------------------
//
// API returns ISO-8601 timestamps; the frontend formats them relative to the
// viewer's clock and the active locale. Two granularity levels:
//   formatRelative          — "5 分钟前" / "5 min ago"  (Service.lastUpdate)
//   formatRelativeIncident  — "今天 14:23" / "Today 14:23"  (Incident.time)
//
// Times older than a week fall back to a numeric date — language-neutral.

// Service.regionGroup hints whether the canonical wall-clock for a service
// is China (Asia/Shanghai) or global. We render incident times in the
// viewer's locale-appropriate zone: Shanghai for zh, viewer-local for en.
const SHANGHAI = "Asia/Shanghai";

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function partsInTz(date: Date, tz: string | undefined): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    ...(tz ? { timeZone: tz } : {}),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const out: Partial<Parts> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type === "year") out.year = Number(part.value);
    else if (part.type === "month") out.month = Number(part.value);
    else if (part.type === "day") out.day = Number(part.value);
    else if (part.type === "hour") out.hour = Number(part.value);
    else if (part.type === "minute") out.minute = Number(part.value);
  }
  return out as Parts;
}

export function formatRelative(
  iso: string | null,
  t: T,
  now: Date = new Date(),
): string {
  if (!iso) return t("time.unknown");
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return t("time.unknown");

  const deltaSec = Math.max(0, Math.floor((now.getTime() - parsed) / 1000));
  if (deltaSec < 60) return t("time.seconds", { n: deltaSec });
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return t("time.minutes", { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("time.hours", { n: hr });
  const day = Math.floor(hr / 24);
  if (day === 1) return t("time.yesterday");
  if (day < 7) return t("time.days", { n: day });

  // Older than a week: locale-neutral MM-DD (or YYYY-MM-DD if a different year).
  const tz = localeTzForFormatRelative();
  const t2 = partsInTz(new Date(parsed), tz);
  const tn = partsInTz(now, tz);
  const mo = String(t2.month).padStart(2, "0");
  const dd = String(t2.day).padStart(2, "0");
  if (t2.year !== tn.year) return `${t2.year}-${mo}-${dd}`;
  return `${mo}-${dd}`;
}

// Default zone for the "older than a week" fallback. Hard to thread a locale
// through every caller; Shanghai is the right default for this site's audience
// and matches the previous behavior.
function localeTzForFormatRelative(): string {
  return SHANGHAI;
}

export function formatRelativeIncident(
  iso: string,
  t: T,
  now: Date = new Date(),
): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return iso;
  const date = new Date(parsed);

  // Render the wall clock in Shanghai so "今天" / "Today" lines up with the
  // local newsroom-style display the prototype was designed around.
  const tParts = partsInTz(date, SHANGHAI);
  const nowParts = partsInTz(now, SHANGHAI);
  const hh = String(tParts.hour).padStart(2, "0");
  const mm = String(tParts.minute).padStart(2, "0");

  // Day diff from Shanghai calendar (not raw ms — that mis-groups across
  // midnight when the user crosses a UTC day boundary).
  const startOfNow = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
  const startOfT = Date.UTC(tParts.year, tParts.month - 1, tParts.day);
  const dayDiff = Math.round((startOfNow - startOfT) / 86_400_000);

  if (dayDiff === 0) return t("time.todayAt", { time: `${hh}:${mm}` });
  if (dayDiff === 1) return t("time.yesterdayAt", { time: `${hh}:${mm}` });
  const mo = String(tParts.month).padStart(2, "0");
  const dd = String(tParts.day).padStart(2, "0");
  if (tParts.year !== nowParts.year) {
    return `${tParts.year}-${mo}-${dd} ${hh}:${mm}`;
  }
  return `${mo}-${dd} ${hh}:${mm}`;
}

// Locale-aware uptime percentage. Worker used to return "99.34%" directly;
// the API now returns a fraction so we can drop the trailing decimal in EN
// or whatever else makes sense per locale.
export function formatUptimePct(value: number | null, t: T): string {
  if (value === null || !Number.isFinite(value)) return t("time.unknown");
  return `${(value * 100).toFixed(2)}%`;
}
