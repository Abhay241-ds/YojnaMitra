"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Stats = {
  totalSchemes: number;
  activeSchemes: number;
  inactiveSchemes: number;
  centralSchemes: number;
  stateSchemes: number;
};

const INITIAL_STATS: Stats = {
  totalSchemes: 0,
  activeSchemes: 0,
  inactiveSchemes: 0,
  centralSchemes: 0,
  stateSchemes: 0,
};

export default function AdminDashboard() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      setErrorMessage("");

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

        const { data: schemes, error: schemesError } = await supabase
          .from("schemes")
          .select("is_active, scheme_level");

        if (schemesError) throw schemesError;

        if (!active) return;
        const rows = schemes ?? [];

        setStats({
          totalSchemes: rows.length,
          activeSchemes: rows.filter((scheme) => scheme.is_active).length,
          inactiveSchemes: rows.filter((scheme) => !scheme.is_active).length,
          centralSchemes: rows.filter((scheme) => scheme.scheme_level === "central").length,
          stateSchemes: rows.filter((scheme) => scheme.scheme_level === "state").length,
        });
      } catch (error) {
        console.error("Admin dashboard error:", error);
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Dashboard data could not be loaded. Please try again."
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
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">Checking administrator access…</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total schemes",
      value: stats.totalSchemes,
      description: "All schemes in the database",
      icon: "▦",
      tone: "blue",
      href: "/admin/schemes",
    },
    {
      title: "Active schemes",
      value: stats.activeSchemes,
      description: "Currently visible to the public",
      icon: "✓",
      tone: "green",
      href: "/admin/schemes",
    },
    {
      title: "Inactive schemes",
      value: stats.inactiveSchemes,
      description: "Hidden from public listings",
      icon: "Ⅱ",
      tone: "slate",
      href: "/admin/verification/inactive",
    },
    {
      title: "Central schemes",
      value: stats.centralSchemes,
      description: "Managed by the central government",
      icon: "⌂",
      tone: "amber",
      href: "/admin/schemes",
    },
    {
      title: "State schemes",
      value: stats.stateSchemes,
      description: "State-specific programmes",
      icon: "⌖",
      tone: "purple",
      href: "/admin/schemes",
    },
  ] as const;

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              YojnaMitra administration
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Dashboard overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Monitor your scheme catalogue and quickly access the tools you use most.
            </p>
          </div>
          <Link
            href="/admin/schemes/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Add new scheme
          </Link>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">Couldn’t load all dashboard data</p>
              <p className="mt-1 break-words">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-10 shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        )}

        <section aria-label="Scheme statistics">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Scheme overview</h2>
              <p className="mt-1 text-sm text-slate-500">A live summary of the current catalogue.</p>
            </div>
            <Link
              href="/admin/schemes"
              className="hidden text-sm font-semibold text-blue-700 hover:text-blue-900 sm:inline-flex"
            >
              View all schemes <span aria-hidden="true" className="ml-1">→</span>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {statCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${
                      card.tone === "blue"
                        ? "bg-blue-50 text-blue-700"
                        : card.tone === "green"
                          ? "bg-emerald-50 text-emerald-700"
                          : card.tone === "amber"
                            ? "bg-amber-50 text-amber-700"
                            : card.tone === "purple"
                              ? "bg-violet-50 text-violet-700"
                              : "bg-slate-100 text-slate-700"
                    }`}
                    aria-hidden="true"
                  >
                    {card.icon}
                  </span>
                  <span className="text-slate-300 transition group-hover:text-slate-500" aria-hidden="true">↗</span>
                </div>
                <p className="mt-5 text-sm font-medium text-slate-600">{card.title}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                  {card.value.toLocaleString("en-IN")}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{card.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">Quick actions</h2>
            <p className="mt-1 text-sm text-slate-500">Jump directly to a management task.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <QuickActionCard
              title="Add a scheme"
              description="Create a new scheme record with eligibility and application details."
              icon="+"
              href="/admin/schemes/new"
              tone="blue"
            />
            <QuickActionCard
              title="Manage schemes"
              description="Search, review, edit, activate, or deactivate scheme records."
              icon="▤"
              href="/admin/schemes"
              tone="green"
            />
            <QuickActionCard
              title="Verification queue"
              description="Review scheme information and official source links."
              icon="✓"
              href="/admin/verification"
              tone="amber"
            />
            <QuickActionCard
              title="Categories"
              description="Keep scheme categories consistent and organized."
              icon="◇"
              href="/admin/categories"
              tone="purple"
            />
          </div>
        </section>

        <section className="mt-9 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recommended next steps</h2>
              <p className="mt-1 text-sm text-slate-500">
                Keep scheme information accurate and useful for citizens.
              </p>
            </div>
            <Link
              href="/admin/verification"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open verification queue →
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <GuidanceItem
              number="01"
              title="Verify official links"
              description="Check that each scheme points to a genuine government source."
            />
            <GuidanceItem
              number="02"
              title="Review eligibility"
              description="Make sure age, occupation, state, and income criteria are accurate."
            />
            <GuidanceItem
              number="03"
              title="Keep listings current"
              description="Deactivate schemes that are no longer active or accepting applications."
            />
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          YojnaMitra Admin · Scheme information should be checked against official sources.
        </footer>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  href,
  tone,
}: {
  title: string;
  description: string;
  icon: string;
  href: string;
  tone: "blue" | "green" | "amber" | "purple";
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-700 group-hover:bg-blue-100",
    green: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100",
    amber: "bg-amber-50 text-amber-700 group-hover:bg-amber-100",
    purple: "bg-violet-50 text-violet-700 group-hover:bg-violet-100",
  };

  return (
    <Link
      href={href}
      className="group flex min-h-36 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${toneClasses[tone]}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-slate-900">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-600">{description}</span>
        <span className="mt-4 inline-flex text-sm font-semibold text-blue-700">
          Open <span aria-hidden="true" className="ml-1 transition group-hover:translate-x-0.5">→</span>
        </span>
      </span>
    </Link>
  );
}

function GuidanceItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold tracking-widest text-blue-700">{number}</p>
      <h3 className="mt-2 text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
    </div>
  );
}
