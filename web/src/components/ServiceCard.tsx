"use client";

import { CATEGORY_SLUG, formatRelative, useProbeLabel, useT } from "@/lib/i18n";
import { endpointDot, makeUptimeGradient } from "@/lib/status";
import type { Service } from "@/lib/types";
import { StatusPill } from "./StatusPill";

type Props = {
  service: Service;
  onClick: () => void;
};

export function ServiceCard({ service, onClick }: Props) {
  const t = useT();
  const localizeProbeLabel = useProbeLabel();
  const gradient = makeUptimeGradient(service.pattern, 90);
  return (
    <div
      className="svc-card"
      onClick={onClick}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--line-2)",
        borderRadius: 14,
        boxShadow: "var(--shadow-card)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--font-mono-stack)",
            flexShrink: 0,
            background: service.brandColor,
            color: service.avatarText,
          }}
        >
          {service.initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink-1)",
            }}
          >
            {service.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {service.company}
            <span style={{ color: "var(--ink-4)" }}>·</span>
            <span style={{ color: "var(--ink-4)" }}>
              {t("category." + CATEGORY_SLUG[service.category])}
            </span>
          </div>
        </div>
        <StatusPill status={service.status} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {service.endpoints.map((ep) => (
          <div
            key={ep.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--ink-2)",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 99,
                background: endpointDot[ep.status],
              }}
            />
            {localizeProbeLabel(ep.label)}
          </div>
        ))}
      </div>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--ink-4)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {t("card.uptime7d")}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono-stack)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ink-1)",
            }}
          >
            {service.uptime7d}
          </span>
        </div>
        <div
          style={{
            height: 5,
            borderRadius: 3,
            overflow: "hidden",
            background: "var(--line-1)",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 3,
              background: gradient,
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 6,
          borderTop: "1px solid var(--line-1)",
          fontSize: 10,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono-stack)",
            color: "var(--ink-4)",
          }}
        >
          {formatRelative(service.lastUpdate, t)}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "var(--ink-4)" }}>
            {t("source." + service.sourceType)}
          </span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <a
            href={service.statusPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="source-link"
            style={{
              fontFamily: "var(--font-mono-stack)",
              color: "var(--primary-500)",
              textDecoration: "none",
            }}
          >
            {service.statusPage} ›
          </a>
        </div>
      </div>
    </div>
  );
}
