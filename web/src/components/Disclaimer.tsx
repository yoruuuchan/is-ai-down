"use client";

import { useT } from "@/lib/i18n";

export function Disclaimer() {
  const t = useT();
  return (
    <div
      style={{
        fontSize: 11,
        color: "var(--ink-4)",
        textAlign: "center",
        lineHeight: 1.7,
        padding: "8px 0",
      }}
    >
      <div>{t("disclaimer.line1")}</div>
      <div style={{ marginTop: 2, opacity: 0.85 }}>{t("disclaimer.line2")}</div>
      <div style={{ marginTop: 4, opacity: 0.7 }}>by Claude ＆ Yoru</div>
    </div>
  );
}
