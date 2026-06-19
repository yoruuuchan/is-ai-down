"use client";

import { CATEGORY_SLUG, useT } from "@/lib/i18n";
import type { ServiceCategory } from "@/lib/types";

export type FilterKey = "all" | ServiceCategory;
export type SortKey = "status" | "alpha_asc" | "alpha_desc" | "recent";

const chips: { key: FilterKey; tKey: string }[] = [
  { key: "all", tKey: "filter.all" },
  { key: "大众聊天", tKey: "category." + CATEGORY_SLUG["大众聊天"] },
  { key: "AI 搜索", tKey: "category." + CATEGORY_SLUG["AI 搜索"] },
  { key: "AI 编程", tKey: "category." + CATEGORY_SLUG["AI 编程"] },
  { key: "模型平台", tKey: "category." + CATEGORY_SLUG["模型平台"] },
  { key: "图像/音视频", tKey: "category." + CATEGORY_SLUG["图像/音视频"] },
  { key: "设计/生产力", tKey: "category." + CATEGORY_SLUG["设计/生产力"] },
];

const sortOptions: { key: SortKey; tKey: string }[] = [
  { key: "status", tKey: "sort.status" },
  { key: "alpha_asc", tKey: "sort.alpha_asc" },
  { key: "alpha_desc", tKey: "sort.alpha_desc" },
  { key: "recent", tKey: "sort.recent" },
];

type Props = {
  searchQuery: string;
  activeFilter: FilterKey;
  sortBy: SortKey;
  onSearchChange: (q: string) => void;
  onFilterChange: (f: FilterKey) => void;
  onSortChange: (s: SortKey) => void;
};

export function SearchFilter({
  searchQuery,
  activeFilter,
  sortBy,
  onSearchChange,
  onFilterChange,
  onSortChange,
}: Props) {
  const t = useT();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 20,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 180,
          background: "var(--bg-elevated)",
          border: "1px solid var(--line-2)",
          borderRadius: 12,
          padding: "0 12px",
          height: 36,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ink-4)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("search.placeholder")}
          style={{
            border: "none",
            background: "transparent",
            fontFamily: "var(--font-ui-stack)",
            fontSize: 13,
            color: "var(--ink-1)",
            width: "100%",
            height: "100%",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 4,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          maxWidth: "100%",
        }}
      >
        {chips.map((c) => {
          const active = activeFilter === c.key;
          return (
            <span
              key={c.key}
              className="chip"
              data-active={active}
              onClick={() => onFilterChange(c.key)}
              style={{
                padding: "6px 12px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: active ? "var(--primary-500)" : "var(--bg-elevated)",
                color: active ? "var(--ink-on-primary)" : "var(--ink-2)",
                border: `1px solid ${active ? "var(--primary-500)" : "var(--line-2)"}`,
              }}
            >
              {t(c.tKey)}
            </span>
          );
        })}
      </div>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
        aria-label={t("sort.label")}
        className="sort-select"
      >
        {sortOptions.map((o) => (
          <option key={o.key} value={o.key}>
            {t(o.tKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
