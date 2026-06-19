// Display-string formatters used by the API to match the shapes the
// frontend's static seed data produces (so /api/* is drop-in compatible).
//
// Workers run in UTC. Target audience is Chinese; render wall-clock times in
// Asia/Shanghai so "今天 22:30" matches the user's actual clock instead of
// the Worker's UTC clock (which would be "今天 14:30").

const DISPLAY_TZ = "Asia/Shanghai";

// SQLite's datetime() returns "YYYY-MM-DD HH:MM:SS" in UTC with no timezone
// designator. V8's Date.parse() reads that as LOCAL time, which produces a
// wrong "X 分钟前" by up to ±12h. Normalize to ISO-UTC before parsing.
export function toUtcIso(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.endsWith("Z") || /[+-]\d\d:?\d\d$/.test(raw)) return raw;
  return raw.replace(" ", "T") + "Z";
}

type DateParts = { year: number; month: number; day: number; hour: number; minute: number };

function partsInTz(date: Date, tz: string): DateParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const out: Partial<DateParts> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type === "year") out.year = Number(part.value);
    else if (part.type === "month") out.month = Number(part.value);
    else if (part.type === "day") out.day = Number(part.value);
    else if (part.type === "hour") out.hour = Number(part.value);
    else if (part.type === "minute") out.minute = Number(part.value);
  }
  return out as DateParts;
}

export function formatRelativeZh(iso: string | null, now = new Date()): string {
  if (!iso) return "—";
  const t = Date.parse(toUtcIso(iso) ?? "");
  if (!Number.isFinite(t)) return "—";
  const deltaSec = Math.floor((now.getTime() - t) / 1000);
  if (deltaSec < 60) return `${Math.max(deltaSec, 0)} 秒前`;
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "昨天";
  if (day < 7) return `${day} 天前`;
  const p = partsInTz(new Date(t), DISPLAY_TZ);
  return `${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function formatRelativeIncidentZh(iso: string, now = new Date()): string {
  // Matches the static data style: "今天 14:23" / "昨天 18:30" / "06-16 22:00"
  const normalized = toUtcIso(iso) ?? iso;
  const t = new Date(normalized);
  if (Number.isNaN(t.getTime())) return iso;

  const tParts = partsInTz(t, DISPLAY_TZ);
  const nowParts = partsInTz(now, DISPLAY_TZ);
  const hh = String(tParts.hour).padStart(2, "0");
  const mm = String(tParts.minute).padStart(2, "0");

  // Day difference computed from the Asia/Shanghai calendar date rather than
  // raw ms (so 23:59 UTC on day N and 00:01 UTC on day N+1 are correctly
  // grouped as the same Shanghai day when that's the user's reality).
  const startOfToday = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day);
  const startOfDayT = Date.UTC(tParts.year, tParts.month - 1, tParts.day);
  const dayDiff = Math.round((startOfToday - startOfDayT) / 86_400_000);

  if (dayDiff === 0) return `今天 ${hh}:${mm}`;
  if (dayDiff === 1) return `昨天 ${hh}:${mm}`;
  const mo = String(tParts.month).padStart(2, "0");
  const dd = String(tParts.day).padStart(2, "0");
  return `${mo}-${dd} ${hh}:${mm}`;
}

export function formatUptimePct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(2)}%`;
}
