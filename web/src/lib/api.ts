import type { Incident, Service } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type ServicesResponse = { services: Service[]; fetched_at: string };
type IncidentsResponse = { incidents: Incident[]; todayEvents: number };
type FeedbackRequest = { email: string; message: string; _trap: string };

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  // Let the Cache-Control header from /api/* decide freshness — the worker
  // sets a 15s edge cache to collapse repeated visitor refreshes.
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

export function fetchServices(signal?: AbortSignal) {
  return getJson<ServicesResponse>("/api/services", signal);
}

export function fetchIncidents(signal?: AbortSignal) {
  return getJson<IncidentsResponse>("/api/incidents?limit=50", signal);
}

export async function submitFeedback(payload: FeedbackRequest): Promise<void> {
  const res = await fetch(`${BASE}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`/api/feedback → ${res.status}`);
}
