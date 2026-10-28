"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Scheme = {
  id: string | number;
  name: string | null;
  category: string | null;
  target_state: string | null;
  official_url?: string | null;
  is_active: boolean | null;
  scheme_level?: string | null;
  created_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function InactiveSchemesPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState<string | number | null>(null);

  const loadSchemes = useCallback(async () => {
    setError("");

    // Explicitly request only inactive records. RLS must allow this admin to SELECT them.
    const { data, error: queryError } = await supabase
      .from("schemes")
      .select("id, name, category, target_state, official_url, is_active, scheme_level, created_at")
      .eq("is_active", false)
      .order("created_at", { ascending: false });

    if (queryError) throw queryError;
    setSchemes((data ?? []) as Scheme[]);
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
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
          router.replace("/");
          return;
        }

        if (!active) return;
        setAuthorized(true);
        await loadSchemes();
      } catch (err) {
        console.error("Inactive schemes page error:", err);
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load inactive schemes.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();
    return () => {
      active = false;
    };
  }, [supabase, router, loadSchemes]);

  const filteredSchemes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return schemes;

    return schemes.filter((scheme) =>
      [scheme.name, scheme.category, scheme.target_state, scheme.scheme_level]
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [schemes, search]);

  async function restoreScheme(scheme: Scheme) {
    const confirmed = window.confirm(
      `Activate "${scheme.name || "this scheme"}"? It may become visible on the public schemes page.`
    );
    if (!confirmed) return;

    setRestoringId(scheme.id);
    setError("");
    setNotice("");

    // Backend write: rely on Supabase RLS to authorize the admin. Never bypass RLS from the client.
    const { data, error: updateError } = await supabase
      .from("schemes")
      .update({ is_active: true })
      .eq("id", scheme.id)
      .eq("is_active", false)
      .select("id, is_active")
      .maybeSingle();

    setRestoringId(null);

    if (updateError) {
      setError(
        `Could not activate the scheme. Check your Supabase schemes UPDATE RLS policy. ${updateError.message}`
      );
      return;
    }

    if (!data) {
      setError(
        "No row was updated. The scheme may already be active, or your Supabase RLS policy does not allow this admin to update it."
      );
      return;
    }

    setSchemes((current) => current.filter((item) => item.id !== scheme.id));
    setNotice(`"${scheme.name || "Scheme"}" has been activated and removed from this inactive list.`);
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await loadSchemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh inactive schemes.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
          <p className="text-sm font-medium text-slate-600">Loading inactive schemes…</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || "Redirecting to the appropriate page…"}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/verification"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
          >
            <span aria-hidden="true">←</span> Back to verification
          </Link>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Admin workspace
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Inactive Schemes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review hidden schemes, check their source information, and reactivate them when appropriate.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <span aria-hidden="true">↻</span> {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="break-words">{error}</p>
          <button type="button" onClick={() => setError("")} className="self-start font-semibold underline sm:self-auto">Dismiss</button>
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification" className="font-bold">×</button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Inactive schemes</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{schemes.length}</p>
              <p className="mt-2 text-xs text-slate-500">Currently hidden from public listings</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-lg font-bold text-amber-700 ring-1 ring-amber-100">◷</div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Needs review</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{schemes.filter((s) => !s.official_url || !isValidHttpUrl(s.official_url)).length}</p>
              <p className="mt-2 text-xs text-slate-500">Missing or invalid official URLs</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-lg font-bold text-rose-700 ring-1 ring-rose-100">!</div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Hidden schemes</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredSchemes.length} {filteredSchemes.length === 1 ? "result" : "results"} found
            </p>
          </div>
          <label className="relative block sm:min-w-72">
            <span className="sr-only">Search inactive schemes</span>
            <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, category, state…"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>

        {filteredSchemes.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-500">✓</div>
            <h3 className="font-semibold text-slate-900">{schemes.length === 0 ? "No inactive schemes" : "No matching schemes"}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {schemes.length === 0
                ? "All schemes are active, or there are currently no inactive records."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Scheme</th>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold">Target state</th>
                    <th className="px-6 py-4 font-semibold">Official source</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchemes.map((scheme) => (
                    <tr key={scheme.id} className="transition hover:bg-slate-50/80">
                      <td className="max-w-[260px] px-6 py-4">
                        <p className="truncate font-semibold text-slate-900">{scheme.name || "Untitled scheme"}</p>
                        <p className="mt-1 text-xs text-slate-500">Added {formatDate(scheme.created_at)}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{scheme.category || "Uncategorised"}</td>
                      <td className="px-6 py-4 text-slate-600">{scheme.target_state || "All India"}</td>
                      <td className="px-6 py-4">
                        {scheme.official_url && isValidHttpUrl(scheme.official_url) ? (
                          <a href={scheme.official_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">Open source ↗</a>
                        ) : (
                          <span className="text-xs font-medium text-amber-700">URL missing / invalid</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inactive
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/admin/schemes/${scheme.id}/edit`} className="font-semibold text-blue-700 hover:underline">Review</Link>
                          <button
                            type="button"
                            disabled={restoringId === scheme.id}
                            onClick={() => restoreScheme(scheme)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {restoringId === scheme.id ? "Activating…" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {filteredSchemes.map((scheme) => (
                <article key={scheme.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-slate-900">{scheme.name || "Untitled scheme"}</h3>
                      <p className="mt-1 text-xs text-slate-500">{scheme.category || "Uncategorised"} · {scheme.target_state || "All India"}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Inactive</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                    {scheme.official_url && isValidHttpUrl(scheme.official_url) ? (
                      <a href={scheme.official_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">Official source ↗</a>
                    ) : (
                      <span className="text-xs font-medium text-amber-700">URL missing / invalid</span>
                    )}
                    <Link href={`/admin/schemes/${scheme.id}/edit`} className="font-semibold text-blue-700 hover:underline">Review</Link>
                  </div>
                  <button
                    type="button"
                    disabled={restoringId === scheme.id}
                    onClick={() => restoreScheme(scheme)}
                    className="mt-4 min-h-10 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 disabled:opacity-50"
                  >
                    {restoringId === scheme.id ? "Activating…" : "Activate scheme"}
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">ⓘ</div>
          <div>
            <h2 className="font-bold text-slate-900">Before reactivating</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Check the scheme's current eligibility criteria, benefits, application process, and official government URL before activating it. The update is sent to Supabase and depends on your existing Row Level Security policies.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
