"use client";

import { useT } from "@/lib/i18n";
import type { Service } from "@/lib/types";
import { StatusPill } from "./StatusPill";

type Props = {
  service: Service;
  onClick: () => void;
};

export function MiniSelectedCard({ service, onClick }: Props) {
  const t = useT();
  return (
    <div
      className="svc-mini"
      onClick={onClick}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--primary-300)",
        borderRadius: 14,
        boxShadow: "0 0 0 2px var(--primary-100)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
            {service.company}
          </div>
        </div>
        <StatusPill status={service.status} />
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--primary-500)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        {t("mini.expanded")}
      </div>
    </div>
  );
}
