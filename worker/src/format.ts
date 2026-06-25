// SQLite's datetime() returns "YYYY-MM-DD HH:MM:SS" in UTC with no timezone
// designator. V8's Date.parse() reads that as LOCAL time, which produces a
// wrong "X 分钟前" by up to ±12h. Normalize to ISO-UTC before returning so
// clients can parse it unambiguously.
export function toUtcIso(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.endsWith("Z") || /[+-]\d\d:?\d\d$/.test(raw)) return raw;
  return raw.replace(" ", "T") + "Z";
}
