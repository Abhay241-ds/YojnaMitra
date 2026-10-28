"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
type FilterState = {
  categories: string[];
  location: { state: boolean; district: boolean };
  applicantType: string[];
  gender: boolean;
  benefits: boolean;
};
import { useCopy } from "@/lib/i18n";
import { checkEligibility, type EligibilityResult, type UserProfile } from "@/lib/eligibility";
import router from "next/router";

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

function FilterGroup({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#4F7C81]/15 pt-2 first:border-0 first:pt-0">
      <div className="mb-1.5">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">{title}</h4>
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium leading-4 transition focus:outline-none focus:ring-2 focus:ring-[#4F7C81]/30 ${
        active
          ? "border-[#4F7C81] bg-[#4F7C81]/15 text-[#24494D]"
          : "border-slate-200 bg-white/90 text-slate-600 hover:border-[#4F7C81]/60 hover:bg-white"
      }`}
    >
      <span aria-hidden="true" className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border ${active ? "border-[#4F7C81] bg-[#4F7C81] text-white" : "border-slate-300 bg-white"}`}>
        {active ? <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m2 6 2.5 2.5L10 3" /></svg> : null}
      </span>
      {children}
    </button>
  );
}

export default function SchemesPage() {
  const supabase = useMemo(() => createClient(), []);
  const copy = useCopy();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [schemes, setSchemes] = useState<DisplayScheme[]>([]);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    // Desktop starts expanded; mobile starts collapsed.
    const updateExpansion = () => {
      setFiltersExpanded(window.matchMedia("(min-width: 1024px)").matches);
    };
    updateExpansion();
    window.addEventListener("resize", updateExpansion);
    return () => window.removeEventListener("resize", updateExpansion);
  }, []);

  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    location: { state: false, district: false },
    applicantType: [],
    gender: false,
    benefits: false,
  });
  const [selectedLevel, setSelectedLevel] = useState<"all" | "central" | "state">("all");
  const [selectedEligibility, setSelectedEligibility] = useState<"all" | "eligible" | "check" | "not-eligible">("all");
  const [selectedState, setSelectedState] = useState("all");
  const [benefitsFilter, setBenefitsFilter] = useState<"all" | "with" | "without">("all");
  const [profileOnly, setProfileOnly] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setLoadError("");
      try {
        // Login is optional for viewing schemes. Read the current session safely;
        // when there is no session, continue loading public active schemes.
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn("Could not read auth session; loading public schemes without a profile.", sessionError);
        }

        const user = sessionData.session?.user ?? null;
        let profileData: ProfileRecord | null = null;

        // Load the user's profile only when a user is actually logged in.
        if (user) {
          const { data, error } = await supabase
            .from("user_profiles")
            .select("full_name, age_range, gender, state, district, education_level, occupation, sub_occupation, annual_family_income")
            .eq("user_id", user.id)
            .maybeSingle();

          if (error) {
            // A profile problem should not prevent public scheme cards from appearing.
            console.warn("Could not load user profile; showing schemes without personalized eligibility.", error);
          } else {
            profileData = data as ProfileRecord | null;
          }
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
    if (selectedLevel !== "all") {
      result = result.filter((scheme) => scheme.raw.scheme_level === selectedLevel);
    }
    if (selectedEligibility !== "all") {
      result = result.filter((scheme) => scheme.eligibility === selectedEligibility);
    }
    if (selectedState !== "all") {
      result = result.filter((scheme) =>
        scheme.raw.scheme_level === "state" && scheme.raw.target_state === selectedState
      );
    }
    if (benefitsFilter !== "all") {
      result = result.filter((scheme) =>
        benefitsFilter === "with"
          ? Boolean(scheme.raw.benefits?.trim())
          : !scheme.raw.benefits?.trim()
      );
    }
    if (profileOnly && profile) {
      result = result.filter((scheme) => scheme.result.status === "eligible");
    }
    return result;
  }, [schemes, searchQuery, filters, selectedLevel, selectedEligibility, selectedState, benefitsFilter, profileOnly, profile]);

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
          <aside className="w-full shrink-0 lg:w-80">
            <button
              type="button"
              onClick={() => {
                if (!profile) {
                  router.push("/profile");
                  return;
                }
                setProfileOnly((value) => !value);
              }}
              aria-pressed={profileOnly}
              className={`mb-2 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-100 ${
                profileOnly
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1v6m-3-3h6" />
                </svg>
                {profile ? (profileOnly ? "Showing My Profile Matches" : "Filter by My Profile") : "Complete Profile to Filter"}
              </span>
              <span aria-hidden="true">{profileOnly ? "✓" : "→"}</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltersExpanded((expanded) => !expanded)}
              aria-expanded={filtersExpanded}
              aria-controls="scheme-filter-panel"
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M7 12h10m-7 7h4" />
                  </svg>
                </span>
                <span>
                  <span className="block text-sm font-bold">Filters</span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">Refine scheme results</span>
                </span>
              </span>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-transform duration-200 ${filtersExpanded ? "rotate-180" : ""}`}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            {filtersExpanded && (
              <div id="scheme-filter-panel" className="mt-2 space-y-2.5 rounded-lg border border-[#4F7C81]/25 bg-[#4F7C81]/[0.08] p-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Find relevant schemes</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ categories: [], location: { state: false, district: false }, applicantType: [], gender: false, benefits: false });
                      setSelectedLevel("all");
                      setSelectedEligibility("all");
                      setSelectedState("all");
                      setBenefitsFilter("all");
                      setProfileOnly(false);
                    }}
                    className="rounded-lg px-3 py-2 text-xs font-bold text-[#0F2342] hover:bg-slate-100"
                  >
                    Reset all
                  </button>
                </div>

                <FilterGroup title="Category" subtitle="Scheme type">
                  <FilterChip active={filters.categories.length === 0} onClick={() => setFilters((prev) => ({ ...prev, categories: [] }))}>All</FilterChip>
                  {Array.from(new Set(schemes.map((scheme) => scheme.category).filter(Boolean))).sort().map((category) => (
                    <FilterChip key={category} active={filters.categories.includes(category)} onClick={() => setFilters((prev) => ({ ...prev, categories: prev.categories.includes(category) ? prev.categories.filter((item) => item !== category) : [...prev.categories, category] }))}>{category}</FilterChip>
                  ))}
                </FilterGroup>

                <FilterGroup title="Government level" subtitle="Who provides the scheme?">
                  <FilterChip active={selectedLevel === "all"} onClick={() => setSelectedLevel("all")}>All</FilterChip>
                  <FilterChip active={selectedLevel === "central"} onClick={() => setSelectedLevel("central")}>Central</FilterChip>
                  <FilterChip active={selectedLevel === "state"} onClick={() => setSelectedLevel("state")}>State</FilterChip>
                </FilterGroup>

                <FilterGroup title="State" subtitle="Applicable state schemes">
                  <FilterChip active={selectedState === "all"} onClick={() => setSelectedState("all")}>All</FilterChip>
                  {Array.from(new Set(schemes.filter((scheme) => scheme.raw.scheme_level === "state" && scheme.raw.target_state).map((scheme) => scheme.raw.target_state as string))).sort().map((state) => (
                    <FilterChip key={state} active={selectedState === state} onClick={() => setSelectedState(state)}>{state}</FilterChip>
                  ))}
                </FilterGroup>

                <FilterGroup title="Beneficiary" subtitle="Who can apply?">
                  <FilterChip active={filters.applicantType.length === 0} onClick={() => setFilters((prev) => ({ ...prev, applicantType: [] }))}>All</FilterChip>
                  {Array.from(new Set(schemes.flatMap((scheme) => scheme.raw.eligible_occupation ?? []).filter(Boolean))).sort().map((occupation) => (
                    <FilterChip key={occupation} active={filters.applicantType.includes(occupation)} onClick={() => setFilters((prev) => ({ ...prev, applicantType: prev.applicantType.includes(occupation) ? prev.applicantType.filter((item) => item !== occupation) : [...prev.applicantType, occupation] }))}>{occupation}</FilterChip>
                  ))}
                </FilterGroup>

                <FilterGroup title="Eligibility" subtitle="Based on available profile data">
                  <FilterChip active={selectedEligibility === "all"} onClick={() => setSelectedEligibility("all")}>All</FilterChip>
                  <FilterChip active={selectedEligibility === "eligible"} onClick={() => setSelectedEligibility("eligible")}>Potential match</FilterChip>
                  <FilterChip active={selectedEligibility === "check"} onClick={() => setSelectedEligibility("check")}>Needs checking</FilterChip>
                  <FilterChip active={selectedEligibility === "not-eligible"} onClick={() => setSelectedEligibility("not-eligible")}>Not a match</FilterChip>
                </FilterGroup>

                <FilterGroup title="Benefits information" subtitle="Details available in listing">
                  <FilterChip active={benefitsFilter === "all"} onClick={() => setBenefitsFilter("all")}>All</FilterChip>
                  <FilterChip active={benefitsFilter === "with"} onClick={() => setBenefitsFilter("with")}>With benefits</FilterChip>
                  <FilterChip active={benefitsFilter === "without"} onClick={() => setBenefitsFilter("without")}>Not listed</FilterChip>
                </FilterGroup>
              </div>
            )}
          </aside>
          <section className="min-w-0 flex-1">
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold tracking-tight text-gray-900">
                  {copy.schemes.showing} {filteredSchemes.length} {copy.schemes.schemesCount}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {profile
                    ? "Discover schemes using your saved profile and preferences."
                    : "Complete your profile to see schemes matched to your details."}
                </p>
              </div>
              {profile ? (
                <button
                  type="button"
                  onClick={() => setProfileOnly((value) => !value)}
                  aria-pressed={profileOnly}
                  className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-100 ${
                    profileOnly
                      ? "bg-emerald-700 text-white hover:bg-emerald-800"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1v6m-3-3h6" />
                  </svg>
                  {profileOnly ? "Showing My Matches" : "For My Profile"}
                  {profileOnly && <span aria-hidden="true">✓</span>}
                </button>
              ) : (
                <Link
                  href="/profile"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0F2342] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#173663]"
                >
                  Complete Profile <span aria-hidden="true">→</span>
                </Link>
              )}
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
