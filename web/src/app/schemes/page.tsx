"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FilterSidebar, { type FilterState } from "@/components/FilterSidebar";
import { useCopy } from "@/lib/i18n";
import { checkEligibility, type EligibilityResult, type UserProfile } from "@/lib/eligibility";

type DbScheme = {
  id: string;
  name: string;
  description: string;
  category: string | null;
  scheme_level: "central" | "state";
  target_state: string | null;
  eligible_occupation: string[] | null;
  min_age: number | null;
  max_age: number | null;
  annual_income_limit: number | null;
  benefits: string | null;
  required_documents: string[] | null;
  application_process: string | null;
  official_url: string | null;
  is_active: boolean;
  created_at?: string;
};

type DisplayScheme = {
  id: string;
  name: string;
  department: string;
  description: string;
  financialAid: string;
  eligibility: "eligible" | "check" | "not-eligible";
  category: string;
  applicantType: string;
  result: EligibilityResult;
  raw: DbScheme;
};

type ProfileRecord = {
  full_name: string | null;
  age_range: string | null;
  gender: string | null;
  state: string | null;
  district: string | null;
  education_level: string | null;
  occupation: string | null;
  sub_occupation: string | null;
  annual_family_income: number | string | null;
};

function toEligibilityProfile(profile: ProfileRecord): UserProfile {
  const income = profile.annual_family_income;
  const parsedIncome = income == null || income === "" ? null : Number(income);

  return {
    age: null,
    ageRange: profile.age_range,
    state: profile.state,
    occupation: profile.occupation,
    annual_family_income:
      parsedIncome !== null && Number.isFinite(parsedIncome) ? parsedIncome : null,
  };
}

function toDisplayScheme(scheme: DbScheme, profile: ProfileRecord | null): DisplayScheme {
  const result = profile
    ? checkEligibility(toEligibilityProfile(profile), scheme)
    : {
        status: "needs_verification" as const,
        reasons: ["Log in and complete your profile to evaluate eligibility."],
        matchedRules: [],
        failedRules: [],
        missingInformation: ["User profile is unavailable."],
      };

  const eligibility: DisplayScheme["eligibility"] =
    result.status === "eligible"
      ? "eligible"
      : result.status === "not_eligible"
        ? "not-eligible"
        : "check";

  return {
    id: scheme.id,
    name: scheme.name,
    department: scheme.scheme_level === "state" ? `${scheme.target_state || "State"} Government` : "Central Government",
    description: scheme.description,
    financialAid: scheme.benefits || "See official scheme details",
    eligibility,
    category: scheme.category || "Other",
    applicantType: scheme.eligible_occupation?.[0] || "All Applicants",
    result,
    raw: scheme,
  };
}

export default function SchemesPage() {
  const supabase = useMemo(() => createClient(), []);
  const copy = useCopy();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [schemes, setSchemes] = useState<DisplayScheme[]>([]);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    location: { state: false, district: false },
    applicantType: [],
    gender: false,
    benefits: false,
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setLoadError("");
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        let profileData: ProfileRecord | null = null;
        if (authData.user) {
          const { data, error } = await supabase
            .from("user_profiles")
            .select("full_name, age_range, gender, state, district, education_level, occupation, sub_occupation, annual_family_income")
            .eq("user_id", authData.user.id)
            .maybeSingle();
          if (error) throw error;
          profileData = data as ProfileRecord | null;
        }

        const { data: schemeData, error: schemeError } = await supabase
          .from("schemes")
          .select("id, name, description, category, scheme_level, target_state, eligible_occupation, min_age, max_age, annual_income_limit, benefits, required_documents, application_process, official_url, is_active, created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (schemeError) throw schemeError;
        if (!active) return;

        setProfile(profileData);
        setSchemes(((schemeData || []) as DbScheme[]).map((scheme) => toDisplayScheme(scheme, profileData)));
      } catch (error) {
        console.error("Error loading scheme eligibility:", error);
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Unable to load schemes. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => { active = false; };
  }, [supabase]);

  const filteredSchemes = useMemo(() => {
    let result = [...schemes];
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((scheme) =>
        `${scheme.name} ${scheme.description} ${scheme.category}`.toLowerCase().includes(query)
      );
    }
    if (filters.categories.length > 0) {
      result = result.filter((scheme) => filters.categories.includes(scheme.category));
    }
    if (filters.applicantType.length > 0) {
      result = result.filter((scheme) =>
        filters.applicantType.some((type) =>
          scheme.raw.eligible_occupation?.some((occupation) => occupation.toLowerCase() === type.toLowerCase())
        )
      );
    }
    return result;
  }, [schemes, searchQuery, filters]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#0A2540]" />
          <p className="mt-4 text-slate-600">Loading schemes and checking eligibility...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F9] text-gray-800">
      <section className="border-b border-[#1A3865] bg-[#0F2342] pb-10 pt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-6 text-2xl font-bold tracking-tight text-white md:text-3xl">{copy.schemes.title}</h1>
          <div className="flex w-full overflow-hidden rounded-md bg-white shadow-lg">
            <input
              className="w-full border-0 bg-transparent px-4 py-3.5 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:ring-0"
              placeholder={copy.schemes.searchPlaceholder}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Search government schemes"
            />
            <button aria-label="Search schemes" className="flex items-center justify-center bg-[#F97316] px-7 text-white" type="button" onClick={() => setSearchQuery((value) => value.trim())}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></svg>
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {loadError && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>}
        <div className="flex flex-col gap-6 lg:flex-row">
          <FilterSidebar onFilterChange={setFilters} />
          <section className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold tracking-tight text-gray-900">{copy.schemes.showing} {filteredSchemes.length} {copy.schemes.schemesCount}</h2>
            </div>

            {profile ? (
              <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-gray-900">{copy.schemes.profileSummary}</h3>
                <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                  <div><span className="text-gray-500">{copy.schemes.name}:</span><p className="font-semibold text-gray-800">{profile.full_name || "—"}</p></div>
                  <div><span className="text-gray-500">{copy.schemes.ageRange}:</span><p className="font-semibold text-gray-800">{profile.age_range || "—"}</p></div>
                  <div><span className="text-gray-500">{copy.schemes.state}:</span><p className="font-semibold text-gray-800">{profile.state || "—"}</p></div>
                  <div><span className="text-gray-500">{copy.schemes.occupation}:</span><p className="font-semibold text-gray-800">{profile.occupation || "—"}</p></div>
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Log in and complete your profile to get personalized eligibility results. Results currently need verification.</div>
            )}

            {filteredSchemes.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSchemes.map((scheme) => (
                  <article key={scheme.id} className="flex min-w-0 flex-col gap-3">
                    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="text-base font-bold leading-snug text-slate-900">{scheme.name}</h3>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          scheme.result.status === "eligible"
                            ? "bg-emerald-100 text-emerald-800"
                            : scheme.result.status === "not_eligible"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                        }`}>
                          {scheme.result.status === "eligible" ? "Eligible" : scheme.result.status === "not_eligible" ? "Not Eligible" : "Needs Verification"}
                        </span>
                      </div>
                      <p className="mb-1 text-sm font-medium text-slate-600">{scheme.department}</p>
                      <p className="mb-3 line-clamp-2 text-sm text-slate-600">{scheme.description}</p>
                      <p className="mb-4 text-sm font-semibold text-slate-800">
                        <span className="text-slate-500">Benefits: </span>{scheme.financialAid}
                      </p>
                      <div className="mb-4 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{scheme.category}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                          {scheme.raw.scheme_level === "state" ? `${scheme.raw.target_state || "State"} scheme` : "Central scheme"}
                        </span>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                        <Link
                          href={`/schemes/${scheme.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0F2342] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#173663]"
                        >
                          View Details <span aria-hidden="true">→</span>
                        </Link>
                        {scheme.raw.official_url && (
                          <a
                            href={scheme.raw.official_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                          >
                            Official website ↗
                          </a>
                        )}
                      </div>

                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
                <h3 className="mb-2 text-xl font-semibold text-gray-700">{copy.schemes.noSchemes}</h3>
                <p className="mx-auto max-w-md text-gray-500">{copy.schemes.noSchemesText}</p>
              </div>
            )}
          </section>
        </div>
      </main>

      <aside className="fixed bottom-6 right-6 z-50 flex items-center space-x-2">
        <button className="flex items-center space-x-2.5 rounded-full border border-white/10 bg-[#0F2342] py-1.5 pl-2 pr-4 text-white shadow-xl transition-colors hover:bg-[#173663]" type="button">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-500"><svg className="h-3.5 w-3.5 fill-current text-white" viewBox="0 0 24 24"><path d="M12 2L14.2 8.4H20.8L15.4 12.4L17.6 18.8L12 14.8L6.4 18.8L8.6 12.4L3.2 8.4H9.8L12 2Z" /></svg></span>
          <span className="text-xs font-medium tracking-tight">Chat with YojnaMitra AI</span>
        </button>
        <button aria-label="Open Chat Window" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#0F2342] text-white shadow-xl transition-colors hover:bg-[#173663]" type="button"><svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z" /></svg></button>
      </aside>
    </div>
  );
}
