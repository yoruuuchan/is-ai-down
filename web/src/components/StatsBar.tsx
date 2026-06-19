"use client";

import { useT } from "@/lib/i18n";
import { statsDotColor } from "@/lib/status";
import type { NormalizedStatus } from "@/lib/types";

type Counts = Record<NormalizedStatus, number>;

type Props = {
  total: number;
  counts: Counts;
};

const cells: { key: NormalizedStatus | "total"; tKey: string }[] = [
  { key: "total", tKey: "stats.total" },
  { key: "operational", tKey: "status.operational" },
  { key: "degraded", tKey: "status.degraded" },
  { key: "partial_outage", tKey: "status.partial_outage" },
  { key: "major_outage", tKey: "status.major_outage" },
  { key: "maintenance", tKey: "status.maintenance" },
  { key: "unknown", tKey: "status.unknown" },
];

export function StatsBar({ total, counts }: Props) {
  const t = useT();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--sb-stat-grid)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--line-2)",
        borderRadius: 14,
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      {cells.map((cell, idx) => {
        const isLast = idx === cells.length - 1;
        const value = cell.key === "total" ? total : counts[cell.key];
        const dot =
          cell.key === "total" ? null : (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 99,
                background: statsDotColor[cell.key],
              }}
            />
          );
        return (
          <div
            key={cell.key}
            style={{
              padding: "var(--sb-stat-pad)",
              borderRight: isLast ? undefined : "1px solid var(--line-1)",
              borderBottom: "1px solid var(--line-1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {dot}
              <span
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: "var(--sb-stat-size)",
                  fontWeight: 600,
                  color: "var(--ink-1)",
                  letterSpacing: "-0.02em",
                }}
              >
                {value}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                marginTop: 2,
              }}
            >
              {t(cell.tKey)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
