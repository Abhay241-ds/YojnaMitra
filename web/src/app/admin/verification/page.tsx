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
  official_url: string | null;
  is_active: boolean | null;
  scheme_level?: string | null;
  created_at?: string | null;
};

type StatusFilter = "all" | "active" | "inactive";

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

export default function VerificationPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [notice, setNotice] = useState("");

  const loadSchemes = useCallback(async () => {
    setError("");
    const { data, error: schemesError } = await supabase
      .from("schemes")
      .select("id, name, category, target_state, official_url, is_active, scheme_level, created_at")
      .order("created_at", { ascending: false });

    if (schemesError) throw schemesError;
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
        console.error("Verification page error:", err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load schemes for verification."
          );
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

  const activeSchemes = useMemo(
    () => schemes.filter((scheme) => scheme.is_active === true),
    [schemes]
  );
  const inactiveSchemes = useMemo(
    () => schemes.filter((scheme) => scheme.is_active !== true),
    [schemes]
  );

  const filteredSchemes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return schemes.filter((scheme) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && scheme.is_active === true) ||
        (statusFilter === "inactive" && scheme.is_active !== true);

      const matchesSearch =
        !query ||
        [scheme.name, scheme.category, scheme.target_state, scheme.scheme_level]
          .some((value) => value?.toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [schemes, search, statusFilter]);

  async function toggleStatus(scheme: Scheme) {
    const nextStatus = scheme.is_active !== true;
    const confirmed = window.confirm(
      `${nextStatus ? "Activate" : "Deactivate"} "${scheme.name || "this scheme"}"?`
    );
    if (!confirmed) return;

    setUpdatingId(scheme.id);
    setError("");
    setNotice("");

    const { data, error: updateError } = await supabase
      .from("schemes")
      .update({ is_active: nextStatus })
      .eq("id", scheme.id)
      .select("id, is_active")
      .maybeSingle();

    setUpdatingId(null);

    if (updateError) {
      setError(
        `Status update failed. Check the schemes UPDATE RLS policy. ${updateError.message}`
      );
      return;
    }

    if (!data) {
      setError(
        "No row was updated. Check that your admin account has permission to update schemes in Supabase."
      );
      return;
    }

    setSchemes((current) =>
      current.map((item) =>
        item.id === scheme.id ? { ...item, is_active: data.is_active } : item
      )
    );
    setNotice(
      `"${scheme.name || "Scheme"}" is now ${data.is_active ? "active" : "inactive"}.`
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
          <p className="text-sm font-medium text-slate-600">Loading verification data…</p>
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
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Admin workspace
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Scheme Verification
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review published scheme information, check official sources, and manage visibility.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadSchemes()
              .catch((err) => setError(err instanceof Error ? err.message : "Unable to refresh schemes."))
              .finally(() => setLoading(false));
          }}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span aria-hidden="true">↻</span> Refresh data
        </button>
      </header>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button type="button" onClick={() => setError("")} className="self-start font-semibold underline sm:self-auto">
            Dismiss
          </button>
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p>{notice}</p>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification" className="font-bold">×</button>
        </div>
      )}

      <section aria-label="Scheme statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total schemes" value={schemes.length} hint="All records in the database" icon="▦" tone="blue" />
        <StatCard label="Active schemes" value={activeSchemes.length} hint="Currently visible to users" icon="✓" tone="green" />
        <StatCard label="Inactive schemes" value={inactiveSchemes.length} hint="Hidden from the public list" icon="◷" tone="amber" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">All schemes</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredSchemes.length} {filteredSchemes.length === 1 ? "result" : "results"} · Verify URLs and manage scheme status.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block sm:min-w-64">
              <span className="sr-only">Search schemes</span>
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, category, state…"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:w-44"
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>
          </div>
        </div>

        {filteredSchemes.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-500">⌕</div>
            <h3 className="font-semibold text-slate-900">No schemes found</h3>
            <p className="mt-1 text-sm text-slate-500">Try changing your search or status filter.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
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
                      <td className="max-w-[280px] px-6 py-4">
                        <p className="truncate font-semibold text-slate-900">{scheme.name || "Untitled scheme"}</p>
                        <p className="mt-1 text-xs text-slate-500">Added {formatDate(scheme.created_at)}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{scheme.category || "Uncategorised"}</td>
                      <td className="px-6 py-4 text-slate-600">{scheme.target_state || "All India"}</td>
                      <td className="px-6 py-4">
                        {scheme.official_url && isValidHttpUrl(scheme.official_url) ? (
                          <a href={scheme.official_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:underline">
                            Open source ↗
                          </a>
                        ) : (
                          <span className="text-xs font-medium text-amber-700">URL missing / invalid</span>
                        )}
                      </td>
                      <td className="px-6 py-4"><StatusBadge active={scheme.is_active === true} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/admin/schemes/${scheme.id}/edit`} className="font-semibold text-blue-700 hover:underline">
                            Review
                          </Link>
                          <button
                            type="button"
                            disabled={updatingId === scheme.id}
                            onClick={() => toggleStatus(scheme)}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              scheme.is_active === true
                                ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            }`}
                          >
                            {updatingId === scheme.id ? "Saving…" : scheme.is_active === true ? "Deactivate" : "Activate"}
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
                    <StatusBadge active={scheme.is_active === true} />
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
                    disabled={updatingId === scheme.id}
                    onClick={() => toggleStatus(scheme)}
                    className={`mt-4 min-h-10 w-full rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                      scheme.is_active === true
                        ? "border border-amber-200 bg-amber-50 text-amber-800"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    {updatingId === scheme.id ? "Saving…" : scheme.is_active === true ? "Deactivate scheme" : "Activate scheme"}
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">ⓘ</div>
          <div>
            <h2 className="font-bold text-slate-900">Verification checklist</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Before activating a scheme, review its eligibility rules, benefits, required documents, application steps, and official government source. Deactivating a scheme hides it from public listings only if your public query filters on <code className="rounded bg-white px-1 py-0.5 text-xs">is_active = true</code>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: string;
  tone: "blue" | "green" | "amber";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{hint}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold ring-1 ${tones[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
      active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
