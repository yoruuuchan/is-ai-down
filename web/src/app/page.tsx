"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Disclaimer } from "@/components/Disclaimer";
import { EmptySearch } from "@/components/EmptySearch";
import { ErrorState } from "@/components/ErrorState";
import { FeedbackForm } from "@/components/FeedbackForm";
import { FirstLoadState } from "@/components/FirstLoadState";
import { Header } from "@/components/Header";
import { IncidentList } from "@/components/IncidentList";
import {
  SearchFilter,
  type FilterKey,
  type SortKey,
} from "@/components/SearchFilter";
import { ServiceGrid } from "@/components/ServiceGrid";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { StatsBar } from "@/components/StatsBar";

import { fetchIncidents, fetchServices } from "@/lib/api";
import { compareByStatus, secondsSince } from "@/lib/status";
import type { Incident, NormalizedStatus, Service } from "@/lib/types";

type DemoState = "live" | "loading" | "error" | "first_load";

const REFRESH_INTERVAL = 60;
const ESTIMATED_SOURCE_COUNT = 37; // matches seed; first_load just needs a hint

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function initialDemoState(): DemoState {
  if (typeof window === "undefined") return "live";
  try {
    const s = new URLSearchParams(window.location.search).get("state");
    if (s === "loading" || s === "error" || s === "first_load") return s;
  } catch {
    // ignore
  }
  return "live";
}

export default function HomePage() {
  // Lazy initializer reads the URL once at mount — no effect needed (avoids
  // the React 19 set-state-in-effect lint).
  const [demoState] = useState<DemoState>(initialDemoState);

  const [services, setServices] = useState<Service[] | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [todayEvents, setTodayEvents] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [sortBy, setSortBy] = useState<SortKey>("status");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [nextRefreshIn, setNextRefreshIn] = useState(REFRESH_INTERVAL);
  const [lastChecked, setLastChecked] = useState<string>("—");

  // Fetch helper used both for first load and 60s refresh.
  const loadData = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    try {
      const [svc, inc] = await Promise.all([
        fetchServices(signal),
        fetchIncidents(signal),
      ]);
      if (signal?.aborted) return false;
      setServices(svc.services);
      setIncidents(inc.incidents);
      setTodayEvents(inc.todayEvents);
      setLastChecked(formatTime(new Date()));
      setFetchError(null);
      return true;
    } catch (err) {
      if (signal?.aborted) return false;
      setFetchError(err instanceof Error ? err.message : "fetch failed");
      return false;
    }
  }, []);

  // First load (only when not in a demo state override). Effect-driven
  // setState here is intentional: this is the standard "fetch external data
  // on mount, store in React state" pattern that the lint rule warns about
  // but explicitly allows as a callback-driven subscription.
  useEffect(() => {
    if (demoState !== "live") return;
    const ac = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(ac.signal);
    return () => ac.abort();
  }, [demoState, loadData]);

  // 60s countdown — silent refresh on tick.
  const refreshInFlight = useRef(false);
  useEffect(() => {
    if (demoState !== "live") return;
    const id = window.setInterval(() => {
      setNextRefreshIn((prev) => {
        if (prev <= 1) {
          if (!refreshInFlight.current) {
            refreshInFlight.current = true;
            loadData().finally(() => {
              refreshInFlight.current = false;
            });
          }
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [demoState, loadData]);

  // Reset expansion alongside search/filter — handled at the setter so we
  // don't need an effect (React 19 rule: avoid setState-in-effect cascades).
  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    setExpandedId(null);
  }, []);
  const handleFilterChange = useCallback((f: FilterKey) => {
    setActiveFilter(f);
    setExpandedId(null);
  }, []);
  const handleSortChange = useCallback((s: SortKey) => {
    setSortBy(s);
    setExpandedId(null);
  }, []);

  const counts = useMemo<Record<NormalizedStatus, number>>(() => {
    const c: Record<NormalizedStatus, number> = {
      operational: 0,
      degraded: 0,
      partial_outage: 0,
      major_outage: 0,
      maintenance: 0,
      unknown: 0,
    };
    for (const s of services ?? []) c[s.status]++;
    return c;
  }, [services]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = (services ?? []).filter((s) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q);
      const matchFilter =
        activeFilter === "all" || s.category === activeFilter;
      return matchSearch && matchFilter;
    });

    if (sortBy === "alpha_asc") {
      return base.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    }
    if (sortBy === "alpha_desc") {
      return base.sort((a, b) => b.name.localeCompare(a.name, "zh-Hans-CN"));
    }
    if (sortBy === "recent") {
      return base.sort((a, b) => {
        const sa = secondsSince(a.lastUpdate);
        const sb = secondsSince(b.lastUpdate);
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name, "zh-Hans-CN");
      });
    }
    return base.sort((a, b) => compareByStatus(a.status, b.status));
  }, [services, searchQuery, activeFilter, sortBy]);

  const handleToggle = (id: string) =>
    setExpandedId((curr) => (curr === id ? null : id));

  const handleRetry = () => {
    setFetchError(null);
    loadData();
  };

  // Resolved view state — demo override wins, otherwise derive from fetch.
  const isDemoLoading = demoState === "loading";
  const isDemoError = demoState === "error";
  const isDemoFirstLoad = demoState === "first_load";
  const isLiveError = demoState === "live" && fetchError !== null;
  const isLiveFirstLoad = demoState === "live" && services === null && !fetchError;
  const isLiveReady = demoState === "live" && services !== null;
  const showSearchEmpty = isLiveReady && filtered.length === 0;
  const showCards = isLiveReady && filtered.length > 0;

  const sourceCount = services?.length ?? ESTIMATED_SOURCE_COUNT;
  const totalForStats = services?.length ?? 0;

  return (
    <>
      <Header nextRefreshIn={nextRefreshIn} lastChecked={lastChecked} />
      <div
        style={{
          maxWidth: 1260,
          margin: "0 auto",
          padding: "24px var(--sb-pad-x) 40px",
        }}
      >
        <StatsBar total={totalForStats} counts={counts} />
        <SearchFilter
          searchQuery={searchQuery}
          activeFilter={activeFilter}
          sortBy={sortBy}
          onSearchChange={handleSearchChange}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
        />

        {showCards && (
          <ServiceGrid
            services={filtered}
            expandedId={expandedId}
            onToggle={handleToggle}
          />
        )}
        {showSearchEmpty && <EmptySearch />}
        {isDemoLoading && <SkeletonGrid />}
        {(isDemoError || isLiveError) && <ErrorState onRetry={handleRetry} />}
        {(isDemoFirstLoad || isLiveFirstLoad) && (
          <FirstLoadState sourceCount={sourceCount} />
        )}

        {isLiveReady && (
          <IncidentList incidents={incidents} todayEvents={todayEvents} />
        )}

        <div style={{ marginTop: 20, marginBottom: 12 }}>
          <FeedbackForm />
        </div>

        <Disclaimer />
      </div>
    </>
  );
}
