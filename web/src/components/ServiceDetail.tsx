"use client";

import { CATEGORY_SLUG, formatUptimePct, useProbeLabel, useT } from "@/lib/i18n";
import {
  endpointDot,
  formatProbeHttpStatus,
  formatProbeResponseTime,
  makeUptimeGradient,
} from "@/lib/status";
import type { Service } from "@/lib/types";
import { StatusPill } from "./StatusPill";

type Props = {
  service: Service;
  onClose: () => void;
};

export function ServiceDetail({ service, onClose }: Props) {
  const t = useT();
  const localizeProbeLabel = useProbeLabel();
  const grad24 = makeUptimeGradient(service.pattern, 24);
  const grad7 = makeUptimeGradient(service.pattern, 90);

  return (
    <div
      style={{
        gridColumn: "1 / -1",
        background: "var(--bg-elevated)",
        border: "1px solid var(--primary-300)",
        borderRadius: 14,
        boxShadow: "var(--shadow-card)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Detail header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "var(--font-mono-stack)",
              background: service.brandColor,
              color: service.avatarText,
            }}
          >
            {service.initial}
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink-1)",
              }}
            >
              {service.name} · {t("detail.titleSuffix")}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
              {service.company} · {t("category." + CATEGORY_SLUG[service.category])}
            </div>
          </div>
          <StatusPill status={service.status} />
        </div>
        <span
          onClick={onClose}
          className="svc-close"
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            cursor: "pointer",
            padding: "4px 10px",
            borderRadius: 8,
            border: "1px solid var(--line-2)",
            flexShrink: 0,
          }}
        >
          {t("detail.collapse")}
        </span>
      </div>

      {/* Two-column content */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {/* Left: endpoint details */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--ink-4)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {t("detail.probeTitle")}
          </div>
          <div
            style={{
              background: "var(--bg-base)",
              borderRadius: 10,
              border: "1px solid var(--line-1)",
              overflow: "hidden",
            }}
          >
            {service.endpoints.map((ep, idx) => {
              const isLast = idx === service.endpoints.length - 1;
              return (
                <div
                  key={ep.label}
                  style={{
                    padding: "8px 12px",
                    borderBottom: isLast ? undefined : "1px solid var(--line-1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
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
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--ink-1)",
                      }}
                    >
                      {localizeProbeLabel(ep.label)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono-stack)",
                        fontSize: 11,
                        color: "var(--ink-3)",
                        marginLeft: "auto",
                      }}
                    >
                      {formatProbeResponseTime(ep, service.name)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono-stack)",
                      fontSize: 10,
                      color: "var(--ink-4)",
                      marginTop: 2,
                      paddingLeft: 11,
                    }}
                  >
                    {ep.url} · {formatProbeHttpStatus(ep)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: 24h + uptime */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--ink-4)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {t("detail.24h")}
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                overflow: "hidden",
                background: "var(--line-1)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 4,
                  background: grad24,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
                fontFamily: "var(--font-mono-stack)",
                fontSize: 10,
                color: "var(--ink-4)",
              }}
            >
              <span>0:00</span>
              <span>6:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>now</span>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                color: "var(--ink-4)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {t("detail.uptime7d")}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 6,
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
                    background: grad7,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink-1)",
                }}
              >
                {formatUptimePct(service.uptime7d, t)}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-4)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {t("detail.uptime90d")}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink-1)",
                  marginTop: 2,
                }}
              >
                {formatUptimePct(service.uptime90d, t)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-4)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {t("detail.sourceLabel")}
              </div>
              <a
                href={service.statusPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="source-link"
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 12,
                  color: "var(--primary-500)",
                  marginTop: 2,
                  textDecoration: "none",
                }}
              >
                {service.statusPage} ›
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
