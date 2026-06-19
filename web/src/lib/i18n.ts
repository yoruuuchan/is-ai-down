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
// Worker emits Chinese-formatted strings (e.g. "3 分钟前", "今天 14:23"). We
// parse them back into a structured shape and re-render in the active locale.
// "MM-DD" / "MM-DD HH:MM" / unrecognized strings pass through untouched —
// they're language-neutral numerals.

const RE_SECONDS = /^(\d+)\s*秒前$/;
const RE_MINUTES = /^(\d+)\s*分钟前$/;
const RE_HOURS = /^(\d+)\s*小时前$/;
const RE_DAYS = /^(\d+)\s*天前$/;
const RE_TODAY_AT = /^今天\s+(\d{1,2}:\d{2})$/;
const RE_YESTERDAY_AT = /^昨天\s+(\d{1,2}:\d{2})$/;

export function formatRelative(raw: string, t: T): string {
  if (!raw || raw === "—") return t("time.unknown");
  let m = RE_SECONDS.exec(raw);
  if (m) return t("time.seconds", { n: m[1] });
  m = RE_MINUTES.exec(raw);
  if (m) return t("time.minutes", { n: m[1] });
  m = RE_HOURS.exec(raw);
  if (m) return t("time.hours", { n: m[1] });
  if (raw === "昨天") return t("time.yesterday");
  m = RE_DAYS.exec(raw);
  if (m) return t("time.days", { n: m[1] });
  m = RE_TODAY_AT.exec(raw);
  if (m) return t("time.todayAt", { time: m[1] });
  m = RE_YESTERDAY_AT.exec(raw);
  if (m) return t("time.yesterdayAt", { time: m[1] });
  return raw;
}
