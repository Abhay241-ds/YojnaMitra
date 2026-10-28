"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Scheme = {
  id: string | number;
  name: string | null;
  name_hi: string | null;
  description: string | null;
  description_hi: string | null;
  benefits: string | null;
  benefits_hi: string | null;
  application_process: string | null;
  application_process_hi: string | null;
  created_at?: string | null;
};

const translationFields = [
  { label: "Scheme name", english: "name", hindi: "name_hi" },
  { label: "Description", english: "description", hindi: "description_hi" },
  { label: "Benefits", english: "benefits", hindi: "benefits_hi" },
  {
    label: "Application process",
    english: "application_process",
    hindi: "application_process_hi",
  },
] as const;

export default function TranslationsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "translated" | "missing">("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadSchemes = useCallback(async () => {
    setError("");

    const { data, error: queryError } = await supabase
      .from("schemes")
      .select(
        "id, name, name_hi, description, description_hi, benefits, benefits_hi, application_process, application_process_hi, created_at"
      )
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("Supabase schemes query failed:", {
        message: queryError.message,
        details: queryError.details,
        hint: queryError.hint,
        code: queryError.code,
      });

      throw new Error(
        `Schemes query failed: ${queryError.message} (code: ${queryError.code ?? "unknown"})`
      );
    }

    setSchemes(data ?? []);
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
        console.error("Translations page error:", err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load translations."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [supabase, router, loadSchemes]);

  const hasHindiTranslation = (scheme: Scheme) =>
    translationFields.some(({ hindi }) => Boolean(scheme[hindi]?.trim()));

  const getMissingCount = (scheme: Scheme) =>
    translationFields.filter(({ hindi }) => !scheme[hindi]?.trim()).length;

  const filteredSchemes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return schemes.filter((scheme) => {
      const matchesSearch =
        !query ||
        [scheme.name, scheme.name_hi, scheme.description, scheme.description_hi]
          .some((value) => value?.toLowerCase().includes(query));

      const translated = hasHindiTranslation(scheme);
      const matchesFilter =
        filter === "all" ||
        (filter === "translated" && translated) ||
        (filter === "missing" && !translated);

      return matchesSearch && matchesFilter;
    });
  }, [schemes, search, filter]);

  const translatedCount = schemes.filter(hasHindiTranslation).length;
  const notTranslatedCount = schemes.length - translatedCount;
  const completion = schemes.length
    ? Math.round((translatedCount / schemes.length) * 100)
    : 0;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadSchemes();
    } catch (err) {
      console.error("Unable to refresh translations:", err);
      setError(
        err instanceof Error ? err.message : "Unable to refresh translations."
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
          <p className="text-sm font-medium text-slate-600">Loading translations...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <i className="fa-solid fa-shield-halved mb-3 text-2xl text-amber-600" aria-hidden="true" />
          <h1 className="text-lg font-bold text-slate-900">Admin access required</h1>
          <p className="mt-2 text-sm text-slate-600">{error || "Redirecting to the appropriate page..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              <i className="fa-solid fa-language text-base" aria-hidden="true" />
              Content management
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Translations</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Track Hindi translation coverage for scheme names, descriptions, benefits, and application steps.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className={`fa-solid fa-rotate ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <i className="fa-solid fa-circle-exclamation mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">Could not load all translation data</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error" className="rounded p-1 hover:bg-red-100">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
        )}

        <section aria-label="Translation statistics" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="fa-solid fa-list-check" label="Total schemes" value={schemes.length} tone="blue" />
          <StatCard icon="fa-solid fa-circle-check" label="Has Hindi translation" value={translatedCount} tone="green" />
          <StatCard icon="fa-solid fa-language" label="No Hindi translation" value={notTranslatedCount} tone="amber" />
          <StatCard icon="fa-solid fa-chart-pie" label="Translation coverage" value={`${completion}%`} tone="violet" />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Scheme translation status</h2>
              <p className="mt-1 text-xs text-slate-500">Showing {filteredSchemes.length} of {schemes.length} schemes</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search schemes..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-64"
                />
              </label>
              <label className="sr-only" htmlFor="translation-filter">Filter translations</label>
              <select
                id="translation-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value as typeof filter)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All schemes</option>
                <option value="translated">Has Hindi translation</option>
                <option value="missing">No Hindi translation</option>
              </select>
            </div>
          </div>

          {filteredSchemes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
              <i className="fa-solid fa-folder-open text-3xl text-slate-300" aria-hidden="true" />
              <p className="mt-3 font-semibold text-slate-800">
                {schemes.length === 0 ? "No schemes found" : "No matching schemes"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {schemes.length === 0 ? "Add schemes first to manage their translations." : "Try another search term or filter."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5 font-bold">Scheme</th>
                      <th className="px-4 py-3.5 font-bold">Hindi name</th>
                      <th className="px-4 py-3.5 font-bold">Description</th>
                      <th className="px-4 py-3.5 font-bold">Hindi description</th>
                      <th className="px-4 py-3.5 font-bold">Coverage</th>
                      <th className="px-4 py-3.5 text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSchemes.map((scheme) => (
                      <tr key={scheme.id} className="transition hover:bg-slate-50/80">
                        <td className="max-w-[220px] px-4 py-4 font-semibold text-slate-900">{scheme.name || "Untitled scheme"}</td>
                        <td className="max-w-[220px] px-4 py-4 text-slate-600">{scheme.name_hi || <MissingValue />}</td>
                        <td className="max-w-[240px] px-4 py-4 text-slate-600"><p className="line-clamp-2">{scheme.description || "—"}</p></td>
                        <td className="max-w-[240px] px-4 py-4 text-slate-600"><p className="line-clamp-2">{scheme.description_hi || <MissingValue />}</p></td>
                        <td className="px-4 py-4"><StatusBadge scheme={scheme} /></td>
                        <td className="px-4 py-4 text-right">
                          <Link href={`/admin/schemes/${scheme.id}/edit`} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100">
                            <i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredSchemes.map((scheme) => (
                  <article key={scheme.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-bold text-slate-900">{scheme.name || "Untitled scheme"}</h3>
                        <p className="mt-1 break-words text-sm text-slate-600">{scheme.name_hi || "Hindi name missing"}</p>
                      </div>
                      <StatusBadge scheme={scheme} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <TranslationField label="English description" value={scheme.description} />
                      <TranslationField label="Hindi description" value={scheme.description_hi} />
                      <TranslationField label="English benefits" value={scheme.benefits} />
                      <TranslationField label="Hindi benefits" value={scheme.benefits_hi} />
                      <TranslationField label="English application process" value={scheme.application_process} />
                      <TranslationField label="Hindi application process" value={scheme.application_process_hi} />
                    </div>
                    <Link href={`/admin/schemes/${scheme.id}/edit`} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800">
                      <i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Edit translations
                    </Link>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <i className="fa-solid fa-circle-info text-lg" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">About translations</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                This page reports translation coverage from the Hindi fields stored in Supabase. Use the Edit action to open the scheme form and update available translation fields.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {translationFields.map((field) => (
                  <span key={field.hindi} className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                    {field.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string | number;
  tone: "blue" | "green" | "amber" | "violet";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>
          <i className={icon} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ scheme }: { scheme: Scheme }) {
  const translated = translationFields.filter(({ hindi }) => Boolean(scheme[hindi]?.trim())).length;
  const total = translationFields.length;
  const complete = translated === total;

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${complete ? "bg-emerald-100 text-emerald-700" : translated > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
      <i className={`fa-solid ${complete ? "fa-circle-check" : translated > 0 ? "fa-circle-half-stroke" : "fa-circle-minus"}`} aria-hidden="true" />
      {translated}/{total} fields
    </span>
  );
}

function MissingValue() {
  return <span className="text-xs font-medium italic text-amber-600">Missing</span>;
}

function TranslationField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 whitespace-pre-wrap break-words text-sm ${value?.trim() ? "text-slate-800" : "italic text-amber-600"}`}>
        {value?.trim() || "Not added"}
      </p>
    </div>
  );
}
