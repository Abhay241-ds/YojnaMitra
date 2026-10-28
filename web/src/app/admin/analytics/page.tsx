"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SchemeRow = {
  is_active: boolean | null;
  scheme_level: string | null;
  category: string | null;
  target_state: string | null;
};

type AnalyticsStats = {
  totalSchemes: number;
  activeSchemes: number;
  inactiveSchemes: number;
  centralSchemes: number;
  stateSchemes: number;
  byCategory: Record<string, number>;
  byState: Record<string, number>;
};

const emptyStats: AnalyticsStats = {
  totalSchemes: 0,
  activeSchemes: 0,
  inactiveSchemes: 0,
  centralSchemes: 0,
  stateSchemes: 0,
  byCategory: {},
  byState: {},
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [stats, setStats] = useState<AnalyticsStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.replace("/auth");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) throw adminError;

      if (!admin) {
        setAuthorized(false);
        router.replace("/");
        return;
      }

      setAuthorized(true);

      // Read in pages so analytics isn't silently limited to the first
      // PostgREST response page when the schemes table grows.
      const allSchemes: SchemeRow[] = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        const { data, error: schemesError } = await supabase
          .from("schemes")
          .select("is_active, scheme_level, category, target_state")
          .range(from, from + pageSize - 1);

        if (schemesError) throw schemesError;

        const page = (data ?? []) as SchemeRow[];
        allSchemes.push(...page);

        if (page.length < pageSize) break;
        from += pageSize;
      }

      const nextStats: AnalyticsStats = { ...emptyStats, byCategory: {}, byState: {} };

      for (const scheme of allSchemes) {
        nextStats.totalSchemes += 1;

        if (scheme.is_active === true) nextStats.activeSchemes += 1;
        else nextStats.inactiveSchemes += 1;

        const level = (scheme.scheme_level ?? "").trim().toLowerCase();
        if (level === "central") nextStats.centralSchemes += 1;
        if (level === "state") nextStats.stateSchemes += 1;

        const category = scheme.category?.trim() || "Uncategorized";
        nextStats.byCategory[category] = (nextStats.byCategory[category] ?? 0) + 1;

        const state = scheme.target_state?.trim() || "Not specified";
        nextStats.byState[state] = (nextStats.byState[state] ?? 0) + 1;
      }

      setStats(nextStats);
    } catch (err) {
      console.error("Analytics page error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load analytics. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) return;
      await loadAnalytics();
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [loadAnalytics]);

  const activeRate = stats.totalSchemes
    ? Math.round((stats.activeSchemes / stats.totalSchemes) * 100)
    : 0;

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-7 text-center shadow-sm">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">Loading analytics…</p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            {error || "Checking administrator access…"}
          </p>
          {error && (
            <button
              onClick={() => void loadAnalytics()}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Try again
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
              YojnaMitra Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Analytics
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Monitor scheme coverage, publication status, and distribution across categories and states.
            </p>
          </div>
          <button
            onClick={() => void loadAnalytics(true)}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <span aria-hidden="true" className={refreshing ? "animate-spin" : ""}>↻</span>
            {refreshing ? "Refreshing…" : "Refresh data"}
          </button>
        </header>

        {error && (
          <div role="alert" className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <p><span className="font-semibold">Could not fully load analytics:</span> {error}</p>
            <button
              onClick={() => void loadAnalytics(true)}
              className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        <section aria-label="Scheme overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total schemes" value={stats.totalSchemes} icon="▤" tone="blue" helper="All records returned by the database" />
          <StatCard title="Active schemes" value={stats.activeSchemes} icon="✓" tone="green" helper="Marked active in the database" />
          <StatCard title="Inactive schemes" value={stats.inactiveSchemes} icon="Ⅱ" tone="slate" helper="Includes records with inactive or null status" />
          <StatCard title="Active rate" value={`${activeRate}%`} icon="↗" tone="amber" helper="Active schemes as a share of total" />
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <DistributionCard
            title="Government level"
            description="How schemes are split between central and state government."
            empty={stats.totalSchemes === 0}
          >
            <ProgressRow label="Central government" count={stats.centralSchemes} total={stats.totalSchemes} tone="blue" />
            <ProgressRow label="State government" count={stats.stateSchemes} total={stats.totalSchemes} tone="purple" />
            <p className="pt-1 text-xs text-slate-500">
              Records with another or unspecified level are included in the total, but not in these two rows.
            </p>
          </DistributionCard>

          <DistributionCard
            title="Status distribution"
            description="Publication status based on each scheme's is_active field."
            empty={stats.totalSchemes === 0}
          >
            <ProgressRow label="Active" count={stats.activeSchemes} total={stats.totalSchemes} tone="green" />
            <ProgressRow label="Inactive / unspecified" count={stats.inactiveSchemes} total={stats.totalSchemes} tone="slate" />
          </DistributionCard>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <BreakdownCard
            title="Schemes by category"
            description="Categories ranked by number of scheme records."
            entries={stats.byCategory}
            emptyMessage="No category data is available yet."
          />
          <BreakdownCard
            title="Schemes by state"
            description="Target states ranked by number of scheme records."
            entries={stats.byState}
            emptyMessage="No state distribution is available yet."
          />
        </section>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Analytics are calculated from the current schemes table. They describe database records and do not independently verify scheme eligibility or official availability.
        </p>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone,
  helper,
}: {
  title: string;
  value: string | number;
  icon: string;
  tone: "blue" | "green" | "amber" | "slate";
  helper: string;
}) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-white text-slate-700",
  };

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold opacity-90">{title}</p>
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-lg shadow-sm">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{helper}</p>
    </article>
  );
}

function DistributionCard({
  title,
  description,
  children,
  empty,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  empty: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {empty ? (
        <EmptyState message="Add scheme records to see this distribution." />
      ) : (
        <div className="space-y-5">{children}</div>
      )}
    </section>
  );
}

function ProgressRow({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: "blue" | "purple" | "green" | "slate";
}) {
  const width = total > 0 ? Math.min(100, (count / total) * 100) : 0;
  const fills = {
    blue: "bg-blue-600",
    purple: "bg-violet-600",
    green: "bg-emerald-600",
    slate: "bg-slate-400",
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="whitespace-nowrap font-bold text-slate-900">
          {count.toLocaleString("en-IN")} <span className="font-normal text-slate-500">({Math.round(width)}%)</span>
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
      >
        <div className={`h-full rounded-full transition-all duration-500 ${fills[tone]}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  description,
  entries,
  emptyMessage,
}: {
  title: string;
  description: string;
  entries: Record<string, number>;
  emptyMessage: string;
}) {
  const sortedEntries = Object.entries(entries).sort(
    ([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB)
  );
  const maxCount = sortedEntries[0]?.[1] ?? 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {sortedEntries.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="space-y-4">
          {sortedEntries.map(([label, count]) => {
            const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={label}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words font-medium text-slate-700">{label}</span>
                  <span className="shrink-0 font-bold text-slate-900">{count.toLocaleString("en-IN")}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
