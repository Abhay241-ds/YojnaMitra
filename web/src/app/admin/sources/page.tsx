"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Scheme = {
  id: string | number;
  name: string | null;
  official_url: string | null;
  scheme_level: string | null;
  target_state: string | null;
  created_at?: string | null;
};

type Filter = "all" | "with-url" | "missing-url" | "invalid-url";

function isValidHttpUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeUrl(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function Icon({
  name,
  className = "text-base",
}: {
  name: string;
  className?: string;
}) {
  // Text glyphs are used here intentionally to avoid server/client icon
  // rendering mismatches caused by icon-font CSS or browser extensions.
  const icons: Record<string, string> = {
    search: "⌕",
    refresh: "↻",
    link: "↗",
    check: "✓",
    warning: "!",
    edit: "✎",
    external: "↗",
    schemes: "▤",
    missing: "＋",
    filter: "☷",
    info: "i",
  };

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center font-semibold leading-none ${className}`}
    >
      {icons[name] ?? "•"}
    </span>
  );
}

export default function SourcesPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const loadSchemes = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      // Verify the current authenticated user.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(`Authentication check failed: ${authError.message}`);
      }

      if (!user) {
        router.replace("/auth");
        setAuthorized(false);
        return;
      }

      // The UI check is for navigation only; sensitive data must also be
      // protected by Supabase RLS policies.
      const { data: admin, error: adminError } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) {
        throw new Error(`Admin verification failed: ${adminError.message}`);
      }

      if (!admin) {
        setAuthorized(false);
        router.replace("/");
        return;
      }

      setAuthorized(true);

      const { data, error: queryError } = await supabase
        .from("schemes")
        .select("id, name, official_url, scheme_level, target_state, created_at")
        .order("created_at", { ascending: false });

      if (queryError) {
        throw new Error(`Unable to load schemes: ${queryError.message}`);
      }

      setSchemes((data ?? []) as Scheme[]);
    } catch (err: unknown) {
      console.error("Official Sources page error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load official sources. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadSchemes();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAuthorized(false);
        router.replace("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [loadSchemes, router, supabase]);

  const stats = useMemo(() => {
    const withUrl = schemes.filter((scheme) => normalizeUrl(scheme.official_url));
    const missingUrl = schemes.filter((scheme) => !normalizeUrl(scheme.official_url));
    const invalidUrl = withUrl.filter((scheme) => !isValidHttpUrl(scheme.official_url));
    const validUrl = withUrl.length - invalidUrl.length;

    return {
      total: schemes.length,
      withUrl: withUrl.length,
      missingUrl: missingUrl.length,
      invalidUrl: invalidUrl.length,
      validUrl,
      coverage: schemes.length
        ? Math.round((withUrl.length / schemes.length) * 100)
        : 0,
    };
  }, [schemes]);

  const filteredSchemes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return schemes.filter((scheme) => {
      const name = (scheme.name ?? "").toLocaleLowerCase();
      const level = (scheme.scheme_level ?? "").toLocaleLowerCase();
      const state = (scheme.target_state ?? "").toLocaleLowerCase();
      const url = (scheme.official_url ?? "").toLocaleLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        level.includes(query) ||
        state.includes(query) ||
        url.includes(query);

      const hasUrl = Boolean(normalizeUrl(scheme.official_url));
      const validUrl = isValidHttpUrl(scheme.official_url);

      const matchesFilter =
        filter === "all" ||
        (filter === "with-url" && hasUrl && validUrl) ||
        (filter === "missing-url" && !hasUrl) ||
        (filter === "invalid-url" && hasUrl && !validUrl);

      return matchesSearch && matchesFilter;
    });
  }, [filter, schemes, search]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">
            Loading official sources…
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center px-5">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-xl font-bold text-amber-700">
            <Icon name="warning" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-900">
            Admin access required
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {error || "Verifying access or redirecting you to the appropriate page."}
          </p>
          {error && (
            <button
              type="button"
              onClick={() => void loadSchemes()}
              className="mt-5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            <Icon name="link" />
            Content management
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Official Sources
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review government source links for each scheme and find records that
            need an official URL.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSchemes(true)}
          disabled={refreshing}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className={refreshing ? "animate-spin" : ""}>
            <Icon name="refresh" />
          </span>
          {refreshing ? "Refreshing…" : "Refresh data"}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-700">
              !
            </span>
            <div>
              <p className="font-semibold text-red-900">
                Could not complete the request
              </p>
              <p className="mt-1 break-words text-sm leading-6 text-red-800">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadSchemes(true)}
            className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      <section
        aria-label="Official source statistics"
        className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Total schemes"
          value={stats.total}
          detail="Schemes in the database"
          icon="schemes"
          tone="blue"
        />
        <StatCard
          label="Valid HTTP(S) URLs"
          value={stats.validUrl}
          detail="Links with a valid URL format"
          icon="check"
          tone="green"
        />
        <StatCard
          label="Missing URLs"
          value={stats.missingUrl}
          detail="Need an official source added"
          icon="missing"
          tone="amber"
        />
        <StatCard
          label="Invalid URL format"
          value={stats.invalidUrl}
          detail="Present, but not a valid HTTP(S) URL"
          icon="warning"
          tone="red"
        />
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xl text-slate-400">
              <Icon name="search" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search scheme, state, level or URL…"
              aria-label="Search schemes"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Icon name="filter" />
              Filter
            </span>
            {(
              [
                ["all", "All schemes"],
                ["with-url", "Valid URLs"],
                ["missing-url", "Missing URLs"],
                ["invalid-url", "Invalid URLs"],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  filter === value
                    ? "bg-[#102544] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredSchemes.length}</strong>{" "}
            of <strong className="text-slate-800">{schemes.length}</strong> schemes
          </span>
          <span>
            URL coverage:{" "}
            <strong className="text-slate-800">{stats.coverage}%</strong>
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${stats.coverage}%` }}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Scheme source directory</h2>
            <p className="mt-1 text-sm text-slate-500">
              Use Edit to update a scheme&apos;s official source URL.
            </p>
          </div>
          <span className="mt-2 inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:mt-0">
            {filteredSchemes.length} records
          </span>
        </div>

        {filteredSchemes.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-500">
              <Icon name="search" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">No schemes found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Try another search term or change the selected filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Scheme</th>
                    <th className="px-5 py-3.5 font-bold">Level</th>
                    <th className="px-5 py-3.5 font-bold">State</th>
                    <th className="px-5 py-3.5 font-bold">Official source</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchemes.map((scheme) => {
                    const url = normalizeUrl(scheme.official_url);
                    const valid = isValidHttpUrl(url);

                    return (
                      <tr key={scheme.id} className="transition hover:bg-slate-50/80">
                        <td className="max-w-[260px] px-5 py-4">
                          <p className="truncate font-semibold text-slate-900">
                            {scheme.name || "Untitled scheme"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            ID: {scheme.id}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {scheme.scheme_level || "—"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {scheme.target_state || "All states / not specified"}
                        </td>
                        <td className="max-w-[270px] px-5 py-4">
                          {url && valid ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={url}
                              className="inline-flex max-w-full items-center gap-1.5 text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              <span className="block max-w-[230px] truncate">{url}</span>
                              <Icon name="external" className="text-xs" />
                            </a>
                          ) : url ? (
                            <span title={url} className="block max-w-[250px] truncate text-red-700">
                              {url}
                            </span>
                          ) : (
                            <span className="text-slate-400">No URL added</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={!url ? "missing" : valid ? "valid" : "invalid"} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/schemes/${encodeURIComponent(String(scheme.id))}/edit`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                          >
                            <Icon name="edit" className="text-sm" />
                            {url ? "Edit scheme" : "Add URL"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {filteredSchemes.map((scheme) => {
                const url = normalizeUrl(scheme.official_url);
                const valid = isValidHttpUrl(url);

                return (
                  <article key={scheme.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-bold text-slate-900">
                          {scheme.name || "Untitled scheme"}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {scheme.scheme_level || "Level not specified"} ·{" "}
                          {scheme.target_state || "All states / not specified"}
                        </p>
                      </div>
                      <StatusBadge status={!url ? "missing" : valid ? "valid" : "invalid"} />
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Official source
                      </p>
                      {url && valid ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-sm font-medium text-blue-700 underline"
                        >
                          {url}
                        </a>
                      ) : (
                        <p className={`break-all text-sm ${url ? "text-red-700" : "text-slate-400"}`}>
                          {url || "No URL added"}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/admin/schemes/${encodeURIComponent(String(scheme.id))}/edit`}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#102544] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#18365f]"
                    >
                      <Icon name="edit" />
                      {url ? "Edit scheme" : "Add official URL"}
                    </Link>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg font-bold text-blue-700 shadow-sm">
            <Icon name="info" />
          </span>
          <div>
            <h2 className="font-bold text-slate-900">Guidelines for official sources</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Prefer the relevant government department or official scheme page.
              This page checks URL format only; it does not confirm that a link is
              live, official, or up to date.
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <li className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 text-emerald-700" />
                Use HTTPS when the official site supports it.
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 text-emerald-700" />
                Prefer government domains and department-specific pages.
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 text-emerald-700" />
                Recheck links periodically for changes.
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 text-emerald-700" />
                Confirm each URL before publishing scheme information.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: string;
  tone: "blue" | "green" | "amber" | "red";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ring-1 ${tones[tone]}`}>
          <Icon name={icon} />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "valid" | "missing" | "invalid" }) {
  const config = {
    valid: {
      label: "URL format valid",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      icon: "check",
    },
    missing: {
      label: "Missing URL",
      className: "bg-amber-50 text-amber-800 ring-amber-200",
      icon: "missing",
    },
    invalid: {
      label: "Invalid format",
      className: "bg-red-50 text-red-700 ring-red-200",
      icon: "warning",
    },
  } as const;

  const item = config[status];

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${item.className}`}>
      <Icon name={item.icon} className="text-xs" />
      {item.label}
    </span>
  );
}
