"use client";

import { useT } from "@/lib/i18n";

type Props = {
  sourceCount: number;
};

export function FirstLoadState({ sourceCount }: Props) {
  const t = useT();
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: 99,
          background: "var(--primary-500)",
          margin: "0 auto 20px",
          animation: "sb-pulse 1.2s ease-in-out infinite",
        }}
      />
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)" }}>
        {t("firstload.title")}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--ink-3)",
          marginTop: 6,
          lineHeight: 1.6,
        }}
      >
        {t("firstload.hint")}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono-stack)",
          fontSize: 11,
          color: "var(--ink-4)",
          marginTop: 12,
        }}
      >
        connecting to {sourceCount} status sources...
      </div>
    </div>
  );
}
