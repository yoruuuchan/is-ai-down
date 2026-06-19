"use client";

import { setLocale, useLocale, useT } from "@/lib/i18n";

export function LocaleToggle() {
  const locale = useLocale();
  const t = useT();
  const mounted = typeof document !== "undefined";

  const toggle = () => {
    setLocale(locale === "zh" ? "en" : "zh");
  };

  // Label shows the OTHER side (what you'd switch to).
  const label = !mounted ? "•" : locale === "zh" ? "EN" : "中";
  const title = !mounted
    ? "Locale"
    : locale === "zh"
      ? t("locale.titleToEn")
      : t("locale.titleToZh");

  return (
    <button
      type="button"
      onClick={toggle}
      title={title}
      aria-label={title}
      className="theme-btn"
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        border: "1px solid var(--line-2)",
        background: "transparent",
        color: "var(--ink-2)",
        fontFamily: "var(--font-ui-stack)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.02em",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}
