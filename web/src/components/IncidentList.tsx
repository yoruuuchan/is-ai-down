"use client";

import { formatRelative, useT } from "@/lib/i18n";
import { incidentSeverityDot, incStatusStyle } from "@/lib/status";
import type { Incident } from "@/lib/types";

type Props = {
  incidents: Incident[];
  todayEvents: number;
};

export function IncidentList({ incidents, todayEvents }: Props) {
  const t = useT();
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          marginBottom: 10,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        {t("incident.title")}
        <span
          style={{
            fontFamily: "var(--font-mono-stack)",
            fontSize: 10,
            color: "var(--ink-4)",
            letterSpacing: 0,
            fontWeight: 500,
          }}
        >
          {t("incident.todayCount", { n: todayEvents })}
        </span>
      </div>
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--line-2)",
          borderRadius: 14,
          boxShadow: "var(--shadow-card)",
          overflow: "hidden",
        }}
      >
        {incidents.map((inc, idx) => {
          const sm = incStatusStyle[inc.incStatus];
          const isLast = idx === incidents.length - 1;
          return (
            <div
              key={`${inc.service}-${inc.time}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                borderBottom: isLast ? undefined : "1px solid var(--line-1)",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 99,
                  flexShrink: 0,
                  background: incidentSeverityDot[inc.severity],
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 11,
                  color: "var(--ink-4)",
                  flexShrink: 0,
                  width: 88,
                }}
              >
                {formatRelative(inc.time, t)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink-1)",
                  flexShrink: 0,
                  width: 105,
                }}
              >
                {inc.service}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--ink-2)",
                  flex: 1,
                  minWidth: 120,
                  textWrap: "pretty",
                }}
              >
                {inc.desc}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 8px",
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 500,
                  flexShrink: 0,
                  background: sm.bg,
                  color: sm.text,
                }}
              >
                {t("incStatus." + inc.incStatus)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
