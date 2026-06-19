import { Hono } from "hono";
import { cors } from "hono/cors";

import { handleScheduled } from "./cron";
import { countTodayEvents, getRecentIncidents } from "./db/incidents";
import { getServicesWithLatestStatus } from "./db/services";
import { getStats } from "./db/stats";

export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  LOG_LEVEL: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  FEEDBACK_TO?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors({ origin: "*", maxAge: 300 }));

const DISPOSABLE_EMAIL_MARKERS = [
  "10minutemail",
  "mailinator",
  "tempmail",
  "guerrillamail",
  "throwaway",
  "yopmail",
  "maildrop",
  "getnada",
  "trashmail",
  "fakemail",
];

type FeedbackPayload = {
  email?: unknown;
  message?: unknown;
  _trap?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasTrapValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@").at(-1)?.toLowerCase() ?? "";
  return DISPOSABLE_EMAIL_MARKERS.some((marker) => domain.includes(marker));
}

async function countFeedbackFromIp(
  db: D1Database,
  ip: string,
  windowSql: "-1 minute" | "-1 day",
): Promise<number> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS count FROM feedback WHERE ip = ? AND created_at >= datetime('now', ?)",
    )
    .bind(ip, windowSql)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

async function sendFeedbackEmail(
  env: Bindings,
  email: string,
  message: string,
  ip: string,
): Promise<void> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM || !env.FEEDBACK_TO) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: env.FEEDBACK_TO,
      reply_to: email,
      subject: `[is-ai-down 反馈] ${email}`,
      text: `${message}\n\n---\nIP: ${ip}`,
    }),
  });

  if (!res.ok) {
    console.warn("feedback email delivery failed", res.status);
  }
}

app.get("/api/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

app.get("/api/services", async (c) => {
  const services = await getServicesWithLatestStatus(c.env.DB);
  return c.json({ services, fetched_at: new Date().toISOString() });
});

app.get("/api/incidents", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const [incidents, todayEvents] = await Promise.all([
    getRecentIncidents(c.env.DB, limit),
    countTodayEvents(c.env.DB),
  ]);
  return c.json({ incidents, todayEvents });
});

app.get("/api/stats", async (c) => {
  const stats = await getStats(c.env.DB);
  return c.json(stats);
});

app.post("/api/feedback", async (c) => {
  let payload: FeedbackPayload | null = null;
  try {
    const json = await c.req.json();
    payload = isRecord(json) ? json : null;
  } catch {
    payload = null;
  }
  if (!payload) return c.json({ error: "invalid_json" }, 400);

  if (hasTrapValue(payload._trap)) {
    return c.json({ ok: true });
  }

  const email = normalizeText(payload.email).toLowerCase();
  if (!isValidEmail(email)) return c.json({ error: "invalid_email" }, 400);
  if (isDisposableEmail(email)) {
    return c.json({ error: "disposable_email" }, 400);
  }

  const message = normalizeText(payload.message);
  if (message.length < 5 || message.length > 2000) {
    return c.json({ error: "invalid_message" }, 400);
  }

  const ip = (c.req.header("CF-Connecting-IP") ?? "").slice(0, 64);
  const userAgent = (c.req.header("user-agent") ?? "").slice(0, 500);

  const minuteCount = await countFeedbackFromIp(c.env.DB, ip, "-1 minute");
  if (minuteCount >= 3) return c.json({ error: "rate_limited" }, 429);

  const dayCount = await countFeedbackFromIp(c.env.DB, ip, "-1 day");
  if (dayCount >= 20) return c.json({ error: "rate_limited" }, 429);

  await c.env.DB.prepare(
    "INSERT INTO feedback (email, message, ip, user_agent) VALUES (?, ?, ?, ?)",
  )
    .bind(email, message, ip, userAgent)
    .run();

  c.executionCtx.waitUntil(
    sendFeedbackEmail(c.env, email, message, ip).catch((err) => {
      console.warn(
        "feedback email delivery failed",
        err instanceof Error ? err.message : "unknown error",
      );
    }),
  );

  return c.json({ ok: true });
});

app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
} satisfies ExportedHandler<Bindings>;
