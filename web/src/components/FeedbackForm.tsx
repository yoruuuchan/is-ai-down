"use client";

import { type CSSProperties, type FormEvent, useState } from "react";

import { submitFeedback } from "@/lib/api";
import { useT } from "@/lib/i18n";

type SubmitState = "idle" | "submitting" | "success" | "error";

const fieldStyle = {
  width: "100%",
  border: "1px solid var(--line-2)",
  borderRadius: 10,
  background: "var(--bg-surface)",
  color: "var(--ink-1)",
  fontFamily: "var(--font-ui-stack)",
  fontSize: 13,
  lineHeight: 1.5,
  padding: "10px 12px",
} satisfies CSSProperties;

export function FeedbackForm() {
  const t = useT();
  const [state, setState] = useState<SubmitState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;

    const form = event.currentTarget;
    const data = new FormData(form);
    setState("submitting");

    try {
      await submitFeedback({
        email: String(data.get("email") ?? ""),
        message: String(data.get("message") ?? ""),
        _trap: String(data.get("_trap") ?? ""),
      });
      form.reset();
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--line-2)",
          borderRadius: 14,
          boxShadow: "var(--shadow-card)",
          padding: 20,
          color: "var(--ink-2)",
          fontSize: 13,
          textAlign: "center",
        }}
      >
        {t("feedback.success")}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--line-2)",
        borderRadius: 14,
        boxShadow: "var(--shadow-card)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
        }}
      >
        <div
          style={{
            color: "var(--ink-1)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {t("feedback.title")}
        </div>
        {state === "error" && (
          <div style={{ color: "var(--error-500)", fontSize: 11 }}>
            {t("feedback.error")}
          </div>
        )}
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ color: "var(--ink-3)", fontSize: 11 }}>
          {t("feedback.emailLabel")}
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          style={fieldStyle}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ color: "var(--ink-3)", fontSize: 11 }}>
          {t("feedback.messageLabel")}
        </span>
        <textarea
          name="message"
          required
          minLength={5}
          maxLength={2000}
          rows={4}
          placeholder={t("feedback.messagePlaceholder")}
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </label>

      <input
        type="text"
        name="_trap"
        tabIndex={-1}
        autoComplete="off"
        style={{
          position: "absolute",
          left: "-9999px",
          height: 0,
          width: 0,
          opacity: 0,
        }}
      />

      <button
        type="submit"
        disabled={state === "submitting"}
        style={{
          border: 0,
          borderRadius: 10,
          background: "var(--primary-500)",
          color: "var(--ink-on-primary)",
          cursor: state === "submitting" ? "wait" : "pointer",
          fontFamily: "var(--font-ui-stack)",
          fontSize: 13,
          fontWeight: 600,
          minHeight: 38,
          padding: "9px 14px",
          opacity: state === "submitting" ? 0.72 : 1,
        }}
      >
        {state === "submitting"
          ? t("feedback.submitting")
          : t("feedback.submit")}
      </button>

      <div style={{ color: "var(--ink-4)", fontSize: 11, lineHeight: 1.6 }}>
        {t("feedback.privacy")}
      </div>
    </form>
  );
}
