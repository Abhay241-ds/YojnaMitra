"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Scheme = {
  id: string | number;
  name: string | null;
  description: string | null;
  category: string | null;
  scheme_level: "central" | "state" | string | null;
  target_state: string | null;
  official_url: string | null;
  is_active: boolean | null;
  created_at?: string | null;
};

type StatusFilter = "all" | "active" | "inactive";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

export default function AdminSchemesPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSchemes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

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

      setAuthorized(true);

      const { data, error: queryError } = await supabase
        .from("schemes")
        .select(
          "id, name, description, category, scheme_level, target_state, official_url, is_active, created_at"
        )
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;
      setSchemes((data ?? []) as Scheme[]);
    } catch (err: unknown) {
      console.error("Admin schemes load error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Schemes could not be loaded. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadSchemes();
  }, [loadSchemes]);

  const categories = useMemo(
    () =>
      [...new Set(schemes.map((scheme) => scheme.category?.trim()).filter(
        (category): category is string => Boolean(category)
      ))].sort((a, b) => a.localeCompare(b)),
    [schemes]
  );

  const filteredSchemes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return schemes.filter((scheme) => {
      const searchable = [
        scheme.name,
        scheme.description,
        scheme.category,
        scheme.target_state,
        scheme.scheme_level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchable.includes(term);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && scheme.is_active === true) ||
        (statusFilter === "inactive" && scheme.is_active !== true);
      const matchesCategory =
        categoryFilter === "all" || scheme.category === categoryFilter;
      const matchesLevel =
        levelFilter === "all" || scheme.scheme_level === levelFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesLevel;
    });
  }, [schemes, search, statusFilter, categoryFilter, levelFilter]);

  const activeCount = schemes.filter((scheme) => scheme.is_active === true).length;
  const inactiveCount = schemes.length - activeCount;
  const withOfficialUrl = schemes.filter((scheme) => {
    if (!scheme.official_url) return false;
    try {
      const url = new URL(scheme.official_url);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }).length;

  async function deleteScheme(scheme: Scheme) {
    const schemeName = scheme.name || "this scheme";
    if (
      !window.confirm(
        `Delete "${schemeName}" permanently? This action cannot be undone.`
      )
    ) return;

    setDeletingId(scheme.id);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/auth");
        throw new Error("Your session has expired. Please log in again.");
      }

      const { data: admin, error: adminError } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) throw adminError;
      if (!admin) throw new Error("You are not authorized to delete schemes.");

      const { data: deletedRows, error: deleteError } = await supabase
        .from("schemes")
        .delete()
        .eq("id", scheme.id)
        .select("id");

      if (deleteError) throw deleteError;
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error(
          "No scheme was deleted. Check the schemes table RLS DELETE policy and your admin permissions."
        );
      }

      setSchemes((current) => current.filter((item) => item.id !== scheme.id));
      setSuccess(`"${schemeName}" was deleted successfully.`);
    } catch (err: unknown) {
      console.error("Scheme delete error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to delete this scheme."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
          <span className="text-sm font-medium text-slate-600">Checking admin access and loading schemes…</span>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Redirecting…"}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/80 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              <span aria-hidden="true">▦</span> Scheme management
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">All Schemes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Add, review, edit, and manage the government schemes available in YojnaMitra.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadSchemes(true)}
              disabled={refreshing}
              className={`${buttonClass} border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100`}
            >
              <span aria-hidden="true">{refreshing ? "↻" : "⟳"}</span>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              href="/admin/schemes/new"
              className={`${buttonClass} bg-blue-700 text-white shadow-sm hover:bg-blue-800`}
            >
              <span aria-hidden="true">＋</span> Add New Scheme
            </Link>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div><strong className="block font-bold">Something went wrong</strong><span className="mt-1 block">{error}</span></div>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error" className="rounded-lg px-2 py-1 font-bold hover:bg-red-100">×</button>
          </div>
        )}
        {success && (
          <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <span>✓ {success}</span>
            <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss success message" className="rounded-lg px-2 py-1 font-bold hover:bg-emerald-100">×</button>
          </div>
        )}

        <section aria-label="Scheme statistics" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total schemes", value: schemes.length, icon: "▤", detail: "All records in database" },
            { label: "Active schemes", value: activeCount, icon: "✓", detail: "Currently marked active" },
            { label: "Inactive schemes", value: inactiveCount, icon: "◷", detail: "Not shown as active" },
            { label: "Official URLs", value: `${withOfficialUrl}/${schemes.length}`, icon: "↗", detail: "Syntactically valid links" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{stat.detail}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-700" aria-hidden="true">{stat.icon}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Scheme directory</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing <strong className="text-slate-700">{filteredSchemes.length}</strong> of {schemes.length} schemes
                </p>
              </div>
              {(search || statusFilter !== "all" || categoryFilter !== "all" || levelFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); setLevelFilter("all"); }}
                  className="self-start text-sm font-semibold text-blue-700 hover:text-blue-900 sm:self-auto"
                >
                  Clear all filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="xl:col-span-1">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Search schemes</span>
                <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, state, category…" />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Status</span>
                <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Category</span>
                <select className={inputClass} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Scheme level</span>
                <select className={inputClass} value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
                  <option value="all">Central & state</option>
                  <option value="central">Central</option>
                  <option value="state">State</option>
                </select>
              </label>
            </div>
          </div>

          {filteredSchemes.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-500" aria-hidden="true">⌕</div>
              <h3 className="mt-4 font-bold text-slate-900">{schemes.length === 0 ? "No schemes added yet" : "No matching schemes"}</h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                {schemes.length === 0 ? "Add your first scheme to start building the YojnaMitra directory." : "Try changing your search term or clearing one or more filters."}
              </p>
              {schemes.length === 0 && (
                <Link href="/admin/schemes/new" className={`${buttonClass} mt-5 bg-blue-700 text-white hover:bg-blue-800`}>＋ Add your first scheme</Link>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-6 py-4 font-bold">Scheme</th>
                      <th scope="col" className="px-4 py-4 font-bold">Category / level</th>
                      <th scope="col" className="px-4 py-4 font-bold">Target state</th>
                      <th scope="col" className="px-4 py-4 font-bold">Status</th>
                      <th scope="col" className="px-6 py-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSchemes.map((scheme) => (
                      <tr key={scheme.id} className="transition hover:bg-slate-50/80">
                        <td className="max-w-[360px] px-6 py-4">
                          <p className="font-bold text-slate-900">{scheme.name || "Untitled scheme"}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{scheme.description || "No description provided."}</p>
                          {scheme.official_url && (
                            <a href={scheme.official_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
                              Official link <span aria-hidden="true">↗</span>
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="block font-medium text-slate-700">{scheme.category || "Other"}</span>
                          <span className="mt-1 block text-xs capitalize text-slate-400">{scheme.scheme_level || "Not set"}</span>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{scheme.target_state || "Not specified"}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${scheme.is_active === true ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${scheme.is_active === true ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {scheme.is_active === true ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/admin/schemes/${encodeURIComponent(String(scheme.id))}/edit`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Edit</Link>
                            <button type="button" disabled={deletingId === scheme.id} onClick={() => void deleteScheme(scheme)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
                              {deletingId === scheme.id ? "Deleting…" : "Delete"}
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
                  <article key={scheme.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-bold text-slate-900">{scheme.name || "Untitled scheme"}</h3>
                        <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-500">{scheme.description || "No description provided."}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${scheme.is_active === true ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{scheme.is_active === true ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600">{scheme.category || "Other"}</span>
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 capitalize text-blue-700">{scheme.scheme_level || "Level not set"}</span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-600">{scheme.target_state || "State not set"}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      {scheme.official_url ? <a href={scheme.official_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-700 hover:underline">Official link ↗</a> : <span className="text-xs text-slate-400">No official URL</span>}
                      <div className="flex gap-2">
                        <Link href={`/admin/schemes/${encodeURIComponent(String(scheme.id))}/edit`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Edit</Link>
                        <button type="button" disabled={deletingId === scheme.id} onClick={() => void deleteScheme(scheme)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50">{deletingId === scheme.id ? "Deleting…" : "Delete"}</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
            Showing {filteredSchemes.length} record{filteredSchemes.length === 1 ? "" : "s"} · URL validity here is a format check only, not confirmation that a link is reachable or government-owned.
          </div>
        </section>
      </div>
    </main>
  );
}
