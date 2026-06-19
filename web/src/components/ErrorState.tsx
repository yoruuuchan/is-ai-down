"use client";

import { useT } from "@/lib/i18n";

type Props = {
  onRetry: () => void;
};

export function ErrorState({ onRetry }: Props) {
  const t = useT();
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "var(--error-100)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--error-500)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)" }}>
        {t("error.title")}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--ink-3)",
          marginTop: 6,
          lineHeight: 1.6,
        }}
      >
        {t("error.hint")}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono-stack)",
          fontSize: 11,
          color: "var(--ink-4)",
          marginTop: 4,
        }}
      >
        NETWORK_ERROR · timeout after 10s
      </div>
      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={onRetry}
          className="retry-btn"
          style={{
            padding: "8px 20px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            background: "var(--primary-500)",
            color: "var(--ink-on-primary)",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-ui-stack)",
          }}
        >
          {t("error.retry")}
        </button>
      </div>
    </div>
  );
}
