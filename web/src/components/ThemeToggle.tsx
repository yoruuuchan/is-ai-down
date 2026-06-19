"use client";

import { useSyncExternalStore } from "react";

import { useT } from "@/lib/i18n";

type Theme = "akari" | "yoru";
const STORAGE_KEY = "ai-status-board-theme";

function readTheme(): Theme {
  if (typeof document === "undefined") return "akari";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "yoru" ? "yoru" : "akari";
}

function subscribe(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => obs.disconnect();
}

export function ThemeToggle() {
  const t = useT();
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    readTheme,
    () => "akari"
  );
  const mounted = typeof document !== "undefined";

  const toggle = () => {
    const next: Theme = theme === "akari" ? "yoru" : "akari";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — private mode, etc.
    }
  };

  const title = !mounted
    ? t("theme.titleUnknown")
    : theme === "akari"
      ? t("theme.titleToYoru")
      : t("theme.titleToAkari");

  return (
    <button
      type="button"
      onClick={toggle}
      title={title}
      aria-label={title}
      className="theme-btn"
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        border: "1px solid var(--line-2)",
        background: "transparent",
        color: "var(--ink-2)",
        fontFamily: "var(--font-jp-stack)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        lineHeight: 1,
      }}
    >
      {theme === "akari" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}
