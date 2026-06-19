"use client";

import { useT } from "@/lib/i18n";

export function EmptySearch() {
  const t = useT();
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-2)" }}>
        {t("empty.title")}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 4 }}>
        {t("empty.hint")}
      </div>
    </div>
  );
}
