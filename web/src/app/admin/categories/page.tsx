"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const categories = [
  "Agriculture",
  "Education",
  "Health",
  "Employment",
  "Women & Child",
  "Housing",
  "Social Welfare",
  "Financial Assistance",
  "Business",
  "Disability",
  "Pension",
  "Other",
];

type SchemeCategoryRow = {
  category: string | null;
  is_active?: boolean | null;
};

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-6";

export default function CategoriesPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [categoryRows, setCategoryRows] = useState<SchemeCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  const loadCategories = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
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

      // Fetch only the columns needed for the category dashboard.
      const { data, error: schemesError } = await supabase
        .from("schemes")
        .select("category,is_active");

      if (schemesError) throw schemesError;
      setCategoryRows((data ?? []) as SchemeCategoryRow[]);
    } catch (err) {
      console.error("Categories page error:", err);
      setError(err instanceof Error ? err.message : "Unable to load categories.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    let mounted = true;

    // Defer state updates from an effect that may have been cleaned up.
    const run = async () => {
      await loadCategories();
      if (!mounted) return;
    };
    void run();

    return () => {
      mounted = false;
    };
  }, [loadCategories]);

  const counts = useMemo(() => {
    const result: Record<string, { total: number; active: number; inactive: number }> = {};
    for (const category of categories) result[category] = { total: 0, active: 0, inactive: 0 };

    for (const row of categoryRows) {
      const category = (row.category || "Other").trim() || "Other";
      if (!result[category]) result[category] = { total: 0, active: 0, inactive: 0 };
      result[category].total += 1;
      if (row.is_active === false) result[category].inactive += 1;
      else result[category].active += 1;
    }
    return result;
  }, [categoryRows]);

  const totalSchemes = categoryRows.length;
  const activeSchemes = categoryRows.filter((row) => row.is_active !== false).length;
  const inactiveSchemes = categoryRows.filter((row) => row.is_active === false).length;
  const customCategories = Object.keys(counts).filter((category) => !categories.includes(category));

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
          <p className="mt-4 text-sm font-medium text-slate-600">Loading categories…</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="mx-auto my-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-800">Unable to open categories</p>
        <p className="mt-2 text-sm text-red-700">{error || "Redirecting…"}</p>
        <Link href="/admin" className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Scheme management</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Categories</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review how government schemes are organized and see the number of schemes in each category.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadCategories(true)}
              disabled={refreshing}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <span aria-hidden="true">{refreshing ? "↻" : "⟳"}</span>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              href="/admin/schemes"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900"
            >
              Manage schemes <span className="ml-2" aria-hidden="true">→</span>
            </Link>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p>{error}</p>
            <button type="button" onClick={() => void loadCategories(true)} className="shrink-0 font-bold underline underline-offset-2">Retry</button>
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-blue-700 p-5 text-white shadow-sm">
            <p className="text-sm font-medium text-blue-100">Total schemes</p>
            <p className="mt-2 text-3xl font-extrabold">{totalSchemes}</p>
            <p className="mt-2 text-xs text-blue-100">Across all categories</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Active schemes</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">{activeSchemes}</p>
            <p className="mt-2 text-xs text-slate-500">Not marked inactive</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Inactive schemes</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-700">{inactiveSchemes}</p>
            <p className="mt-2 text-xs text-slate-500">Hidden if public page filters inactive schemes</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Categories in use</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{Object.values(counts).filter((item) => item.total > 0).length}</p>
            <p className="mt-2 text-xs text-slate-500">Includes custom category names</p>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Scheme categories</h2>
              <p className="mt-1 text-sm text-slate-500">Counts are calculated from the current rows in the schemes table.</p>
            </div>
            <p className="text-xs text-slate-500">Predefined categories: {categories.length}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category, index) => {
              const item = counts[category] ?? { total: 0, active: 0, inactive: 0 };
              return (
                <article key={category} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-800">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.total ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-500"}`}>
                      {item.total} {item.total === 1 ? "scheme" : "schemes"}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{category}</h3>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium">
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-800">Active: {item.active}</span>
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-800">Inactive: {item.inactive}</span>
                  </div>
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <Link href="/admin/schemes" className="text-sm font-semibold text-blue-800 hover:text-blue-950">
                      View schemes <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {customCategories.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-bold text-amber-950">Other category names found in database</h3>
              <p className="mt-1 text-sm text-amber-900">These values exist in the database but are not in the predefined list.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {customCategories.map((category) => (
                  <span key={category} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-950">
                    {category} <span className="ml-1 font-bold">({counts[category].total})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg" aria-hidden="true">ⓘ</span>
            <div>
              <h2 className="font-bold text-slate-900">About categories</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This page reports category counts from the <code className="rounded bg-slate-100 px-1.5 py-0.5">schemes</code> table. Category names are currently predefined in this page; this screen does not create, rename, or delete categories. To introduce a new category, add it to the list in this file and ensure your scheme form offers the same value.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
