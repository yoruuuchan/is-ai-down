"use client";

import { useT } from "@/lib/i18n";
import { pillMap } from "@/lib/status";
import type { NormalizedStatus } from "@/lib/types";

type Props = {
  status: NormalizedStatus;
};

export function StatusPill({ status }: Props) {
  const t = useT();
  const p = pillMap[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 9px",
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 500,
        flexShrink: 0,
        whiteSpace: "nowrap",
        background: p.bg,
        color: p.text,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 99,
          background: p.dot,
        }}
      />
      {t("status." + status)}
    </span>
  );
}
