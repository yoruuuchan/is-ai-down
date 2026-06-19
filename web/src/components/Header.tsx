"use client";

import { useT } from "@/lib/i18n";
import { LocaleToggle } from "./LocaleToggle";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  nextRefreshIn: number;
  lastChecked: string;
};

export function Header({ nextRefreshIn, lastChecked }: Props) {
  const t = useT();
  return (
    <div
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        borderBottom: "1px solid var(--glass-border)",
        padding: "14px 0",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: 1260,
          margin: "0 auto",
          padding: "0 var(--sb-pad-x)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--ink-1)",
              letterSpacing: "-0.01em",
            }}
          >
            {t("header.title")}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              marginTop: 1,
            }}
          >
            {t("header.subtitle")}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              fontFamily: "var(--font-mono-stack)",
              fontSize: 11,
              color: "var(--ink-3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: "var(--success-500)",
                display: "inline-block",
              }}
            />
            {t("header.nextRefresh")} · {nextRefreshIn}s
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono-stack)",
              fontSize: 10,
              color: "var(--ink-4)",
              padding: "4px 10px",
              border: "1px solid var(--line-2)",
              borderRadius: 99,
            }}
          >
            {t("header.lastChecked")} {lastChecked}
          </div>
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
