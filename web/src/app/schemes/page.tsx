


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
import { useRouter } from "next/navigation";

type DbScheme = {
  id: string;
  name: string;
  name_hi?: string | null;
  description: string;
  description_hi?: string | null;
  category: string | null;
  scheme_level: "central" | "state";
  target_state: string | null;
  state?: string | null;
  eligible_occupation: string[] | null;
  eligible_social_categories?: string[] | null;
  min_age: number | null;
  max_age: number | null;
  annual_income_limit: number | null;
  benefits: unknown;
  benefits_hi?: unknown;
  required_documents_hi?: string[] | null;
  application_process_hi?: string | null;
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
  eligibility: "eligible" | "check" | "not-eligible" | "unchecked";
  category: string;
  applicantType: string;
  result: EligibilityResult | null;
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
  social_category?: string | null;
};

function richTextToPlainText(value: unknown): string {
  if (value == null) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    // Some legacy TEXT columns contain JSON-serialized rich-text data.
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        const text = richTextToPlainText(parsed);
        return text === "[]" || text === "{}" ? "" : text;
      } catch {
        return trimmed === "[]" || trimmed === "{}" ? "" : trimmed;
      }
    }

    return trimmed;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(richTextToPlainText).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    if (item.text != null) return richTextToPlainText(item.text);
    if (item.children != null) return richTextToPlainText(item.children);
    if (item.content != null) return richTextToPlainText(item.content);
    if (item.value != null) return richTextToPlainText(item.value);
  }

  return "";
}

function cleanFilterValues(value: unknown): string[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.flatMap(cleanFilterValues);
  }

  if (typeof value === "object") {
    return cleanFilterValues(richTextToPlainText(value));
  }

  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed || trimmed === "[]" || trimmed === "{}") return [];

  // Some imported fields contain JSON text such as ["Agriculture"] or [""] .
  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      return cleanFilterValues(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  // Ignore empty JSON-like values and whitespace-only labels.
  if (trimmed === '""' || trimmed === "null" || trimmed === "undefined") return [];
  return [trimmed];
}

function normalizeFilterKey(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

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

function toDisplayScheme(
  scheme: DbScheme,
  profile: ProfileRecord | null,
  evaluateEligibility = true,
): DisplayScheme {
  let result: EligibilityResult | null = evaluateEligibility && profile
    ? checkEligibility(toEligibilityProfile(profile), scheme)
    : null;

  /* Keep scheme rendering independent from eligibility evaluation. */
  if (evaluateEligibility && !profile) result = {
      status: "needs_verification" as const,
      reasons: ["Log in and complete your profile to evaluate eligibility."],
      matchedRules: [],
      failedRules: [],
      missingInformation: ["User profile is unavailable."],
    };

  // Apply social-category eligibility only when the scheme has a specific restriction.
  // "ALL", an empty list, or a missing value means the scheme is not category-restricted.
  const eligibleCategories = (scheme.eligible_social_categories ?? [])
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  const categoryRestricted =
    eligibleCategories.length > 0 && !eligibleCategories.includes("ALL");
  const userCategory = profile?.social_category?.trim().toUpperCase() ?? "";

  if (profile && result && categoryRestricted) {
    if (!userCategory) {
      result = {
        ...result,
        status: result.status === "not_eligible" ? "not_eligible" : "needs_verification",
        reasons: [...result.reasons, "Your social category is not available in your profile; verify the scheme's category rules."],
        missingInformation: [...result.missingInformation, "Social category"],
      };
    } else if (!eligibleCategories.includes(userCategory)) {
      result = {
        ...result,
        status: "not_eligible",
        reasons: [...result.reasons, `This scheme is marked for these categories: ${eligibleCategories.join(", ")}.`],
        failedRules: [...result.failedRules, "Social category does not match the scheme's configured eligible categories."],
      };
    } else {
      result = {
        ...result,
        reasons: [...result.reasons, `Social category (${userCategory}) matches the scheme's configured categories.`],
        matchedRules: [...result.matchedRules, "Social category"],
      };
    }
  }

  const eligibility: DisplayScheme["eligibility"] =
    !result ? "unchecked" : result.status === "eligible"
      ? "eligible"
      : result.status === "not_eligible"
        ? "not-eligible"
        : "check";

  return {
    id: scheme.id,
    name: scheme.name,
    department: scheme.scheme_level === "state" ? `${scheme.target_state || "State"} Government` : "Central Government",
    description: richTextToPlainText(scheme.description),
    financialAid:
      richTextToPlainText(scheme.benefits) || "See official scheme details",
    eligibility,
    category: cleanFilterValues(scheme.category)[0] || "",
    applicantType: scheme.eligible_occupation?.[0] || "All Applicants",
    result,
    raw: scheme,
  };
}

function FilterGroup({
  title,
  subtitle,
  selectedValue,
  children,
  isOpen,
  onToggle,
}: {
  title: string;
  subtitle: string;
  selectedValue: string;
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-t border-[#4F7C81]/20 pt-2 first:border-0 first:pt-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border-0 bg-transparent py-1.5 text-left text-sm font-bold text-slate-800 outline-none hover:text-[#315E63] focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:ring-0"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{title}</span>
            <span className="max-w-full truncate rounded-md bg-[#4F7C81]/10 px-2 py-0.5 text-[11px] font-semibold text-[#315E63]">
              {selectedValue}
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] font-normal text-slate-500">{subtitle}</span>
        </span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-600 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>
      {isOpen && <div className="flex flex-wrap gap-1.5 pb-2 pt-1">{children}</div>}
    </div>
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
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${active
          ? "border-[#0F2342] bg-[#0F2342] text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        }`}
    >
      {children}
    </button>
  );
}

export default function SchemesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const copy = useCopy();
  const [isHindi, setIsHindi] = useState(false);

  // Follow the existing site language switch (which updates the HTML lang attribute).
  useEffect(() => {
    const syncLanguage = () => {
      const htmlLang = document.documentElement.lang.toLowerCase();
      setIsHindi(htmlLang === "hi" || htmlLang.startsWith("hi-"));
    };
    syncLanguage();
    const observer = new MutationObserver(syncLanguage);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    window.addEventListener("languagechange", syncLanguage);
    return () => {
      observer.disconnect();
      window.removeEventListener("languagechange", syncLanguage);
    };
  }, []);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [allSchemesLoaded, setAllSchemesLoaded] = useState(false);
  const [schemes, setSchemes] = useState<DisplayScheme[]>([]);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [openFilterGroup, setOpenFilterGroup] = useState<string | null>(null);

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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setLoadError("");
      try {
        // Initial render fetches only public scheme data. No auth/profile request
        // and no eligibility calculation runs during page load.
        // Show the first 1,000 schemes immediately, then append remaining batches
        // in the background so the page becomes usable as early as possible.
        const PAGE_SIZE = 1000;
        let from = 0;
        let isFirstBatch = true;

        while (true) {
          const { data: schemeBatch, error: schemeError } = await supabase
            .from("schemes")
            .select("id, name, name_hi, description, description_hi, category, scheme_level, state, target_state, eligible_occupation, eligible_social_categories, min_age, max_age, annual_income_limit, benefits, benefits_hi, required_documents, required_documents_hi, application_process, application_process_hi, official_url, is_active, created_at")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

          if (schemeError) throw schemeError;
          if (!active) return;

          const batch = (schemeBatch || []) as DbScheme[];
          const displayBatch = batch.map((scheme) => toDisplayScheme(scheme, null, false));

          if (isFirstBatch) {
            setSchemes(displayBatch);
            setLoading(false);
            isFirstBatch = false;
          } else if (displayBatch.length > 0) {
            setSchemes((current) => current.concat(displayBatch));
          }

          if (batch.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        if (active) setAllSchemesLoaded(true);
      } catch (error) {
        console.error("Error loading schemes:", error);
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

  const handleProfileFilter = async () => {
    if (eligibilityLoading || !allSchemesLoaded) return;

    // Results are cached in component state after the first explicit request.
    if (profile && schemes.some((scheme) => scheme.result !== null)) {
      setProfileOnly((current) => !current);
      setSelectedEligibility("all");
      return;
    }

    setEligibilityLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        router.push("/profile");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("full_name, age_range, gender, state, district, education_level, occupation, sub_occupation, annual_family_income, social_category")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        router.push("/profile");
        return;
      }

      const loadedProfile = profileData as ProfileRecord;
      // This is the only place eligibility is evaluated: after an explicit click.
      setSchemes((current) => current.map((scheme) =>
        toDisplayScheme(scheme.raw, loadedProfile, true)
      ));
      setProfile(loadedProfile);
      setProfileOnly(true);
      setSelectedEligibility("all");
    } catch (error) {
      console.error("Could not calculate profile matches:", error);
      setLoadError(error instanceof Error ? error.message : "Unable to check your profile matches. Please try again.");
    } finally {
      setEligibilityLoading(false);
    }
  };

  const filteredSchemes = useMemo(() => {
    let result = [...schemes];
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((scheme) =>
        `${scheme.name} ${scheme.description} ${scheme.raw.name_hi ?? ""} ${scheme.raw.description_hi ?? ""} ${scheme.category}`.toLowerCase().includes(query)
      );
    }
    if (filters.categories.length > 0) {
      result = result.filter((scheme) =>
        cleanFilterValues(scheme.raw.category).some((category) => filters.categories.includes(category))
      );
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
        scheme.raw.scheme_level === "state" &&
        [...cleanFilterValues(scheme.raw.target_state), ...cleanFilterValues(scheme.raw.state)]
          .some((state) => normalizeFilterKey(state) === normalizeFilterKey(selectedState))
      );
    }
    if (benefitsFilter !== "all") {
      result = result.filter((scheme) =>
        benefitsFilter === "with"
          ? Boolean(richTextToPlainText(scheme.raw.benefits))
          : !richTextToPlainText(scheme.raw.benefits)
      );
    }
    if (profileOnly && profile) {
      result = result.filter((scheme) => scheme.result?.status === "eligible");
    }
    return result;
  }, [schemes, searchQuery, filters, selectedLevel, selectedEligibility, selectedState, benefitsFilter, profileOnly, profile]);

  // Build dependent filter options from the currently selected government level/state.
  // This keeps category chips relevant to the selected state (e.g. Uttar Pradesh).
  const schemesForCategoryOptions = useMemo(() => {
    return schemes.filter((scheme) => {
      if (selectedLevel !== "all" && scheme.raw.scheme_level !== selectedLevel) {
        return false;
      }

      if (selectedState !== "all") {
        if (scheme.raw.scheme_level !== "state") return false;
        const schemeStates = [
          ...cleanFilterValues(scheme.raw.target_state),
          ...cleanFilterValues(scheme.raw.state),
        ];
        if (!schemeStates.some((state) => normalizeFilterKey(state) === normalizeFilterKey(selectedState))) {
          return false;
        }
      }

      return true;
    });
  }, [schemes, selectedLevel, selectedState]);

  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(
        schemesForCategoryOptions.flatMap((scheme) =>
          cleanFilterValues(scheme.raw.category)
        )
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [schemesForCategoryOptions]);

  const availableStates = useMemo(() => {
    if (selectedLevel === "central") return [];

    const stateNames = schemes
      .filter((scheme) => scheme.raw.scheme_level === "state")
      .flatMap((scheme) => [
        ...cleanFilterValues(scheme.raw.target_state),
        ...cleanFilterValues(scheme.raw.state),
      ])
      .map((state) => state.trim())
      .filter(Boolean);

    // Deduplicate case-insensitively while preserving the first display label.
    const uniqueStates = new Map<string, string>();
    for (const state of stateNames) {
      const key = normalizeFilterKey(state);
      if (key && !uniqueStates.has(key)) uniqueStates.set(key, state);
    }

    return Array.from(uniqueStates.values()).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [schemes, selectedLevel]);

  // Reset to the first page whenever the search or filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filters,
    selectedLevel,
    selectedEligibility,
    selectedState,
    benefitsFilter,
    profileOnly,
  ]);

  // Eligibility results are computed and cached only after the user requests profile filtering.
  const profileEligibleCount = profile
    ? schemes.filter((scheme) => scheme.result?.status === "eligible").length
    : 0;

  const totalPages = Math.ceil(filteredSchemes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSchemes = filteredSchemes.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );
  const startItem = filteredSchemes.length === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + ITEMS_PER_PAGE, filteredSchemes.length);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#0A2540]" />
          <p className="mt-4 text-slate-600">Loading schemes...</p>
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
              onClick={handleProfileFilter}
              disabled={eligibilityLoading || !allSchemesLoaded}
              aria-pressed={profileOnly}
              className={`mb-2 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-100 ${profileOnly
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                }`}
            >
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1v6m-3-3h6" />
                </svg>
                {!allSchemesLoaded ? (isHindi ? "योजनाएँ लोड हो रही हैं..." : "Loading schemes...") : eligibilityLoading ? (isHindi ? "पात्रता जाँची जा रही है..." : "Checking eligibility...") : (profileOnly ? (isHindi ? "मेरी प्रोफ़ाइल से मेल खाती योजनाएँ" : "Showing My Profile Matches") : (isHindi ? "मेरी प्रोफ़ाइल से फ़िल्टर करें" : "Filter by My Profile"))}
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
                  <span className="block text-sm font-bold">{isHindi ? "फ़िल्टर" : "Filters"}</span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">{isHindi ? "योजनाएँ छाँटें" : "Refine scheme results"}</span>
                </span>
              </span>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-transform duration-200 ${filtersExpanded ? "rotate-180" : ""}`}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            {filtersExpanded && (
              <div id="scheme-filter-panel" className="mt-2 space-y-3 rounded-xl border border-[#0F2342]/20 bg-[#0F2342]/[0.06] p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{isHindi ? "उपयुक्त योजनाएँ खोजें" : "Find relevant schemes"}</h3>
                    <p className="mt-1 text-xs text-slate-500">{isHindi ? "नीचे फ़िल्टर चुनें" : "Choose any filters below"}</p>
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
                    {isHindi ? "सभी रीसेट करें" : "Reset all"}
                  </button>
                </div>

                <FilterGroup
                  title={isHindi ? "सरकार का स्तर" : "Government level"}
                  selectedValue={selectedLevel === "all" ? (isHindi ? "सभी" : "All") : selectedLevel === "central" ? (isHindi ? "केंद्र" : "Central") : (isHindi ? "राज्य" : "State")}
                  subtitle={isHindi ? "योजना कौन देता है?" : "Who provides the scheme?"}
                  isOpen={openFilterGroup === "government-level"}
                  onToggle={() => setOpenFilterGroup((current) => current === "government-level" ? null : "government-level")}
                >
                  <FilterChip active={selectedLevel === "all"} onClick={() => { setSelectedLevel("all"); setSelectedState("all"); setFilters((prev) => ({ ...prev, categories: [] })); }}>
                    {isHindi ? "सभी" : "All"}
                  </FilterChip>
                  <FilterChip active={selectedLevel === "central"} onClick={() => { setSelectedLevel("central"); setSelectedState("all"); setFilters((prev) => ({ ...prev, categories: [] })); }}>
                    {isHindi ? "केंद्र" : "Central"}
                  </FilterChip>
                  <FilterChip active={selectedLevel === "state"} onClick={() => { setSelectedLevel("state"); setSelectedState("all"); setOpenFilterGroup("state"); setFilters((prev) => ({ ...prev, categories: [] })); }}>
                    {isHindi ? "राज्य" : "State"}
                  </FilterChip>
                </FilterGroup>

                {selectedLevel !== "central" && (
                  <FilterGroup
                    title={isHindi ? "राज्य" : "State"}
                    selectedValue={selectedState === "all" ? (isHindi ? "सभी" : "All") : selectedState}
                    subtitle={isHindi ? "राज्य चुनें" : "Choose a state"}
                    isOpen={openFilterGroup === "state"}
                    onToggle={() => setOpenFilterGroup((current) => current === "state" ? null : "state")}
                  >
                    <FilterChip active={selectedState === "all"} onClick={() => { setSelectedState("all"); setFilters((prev) => ({ ...prev, categories: [] })); }}>
                      {isHindi ? "सभी" : "All states"}
                    </FilterChip>
                    {availableStates.map((state) => (
                      <FilterChip
                        key={state}
                        active={normalizeFilterKey(selectedState) === normalizeFilterKey(state)}
                        onClick={() => {
                          setSelectedState(state);
                          setSelectedLevel("state");
                          setFilters((prev) => ({ ...prev, categories: [] }));
                        }}
                      >
                        {state}
                      </FilterChip>
                    ))}
                  </FilterGroup>
                )}


                <FilterGroup
                  title={isHindi ? "श्रेणी" : "Category"}
                  selectedValue={filters.categories.length === 0 ? (isHindi ? "सभी" : "All") : filters.categories.join(", ")}
                  subtitle={isHindi ? "चयनित सरकार और राज्य की योजनाओं के प्रकार" : "Categories for the selected government level and state"}
                  isOpen={openFilterGroup === "category"}
                  onToggle={() => setOpenFilterGroup((current) => current === "category" ? null : "category")}
                >
                  <FilterChip active={filters.categories.length === 0} onClick={() => setFilters((prev) => ({ ...prev, categories: [] }))}>
                    {isHindi ? "सभी" : "All"}
                  </FilterChip>
                  {availableCategories.map((category) => (
                    <FilterChip
                      key={category}
                      active={filters.categories.includes(category)}
                      onClick={() => setFilters((prev) => ({
                        ...prev,
                        categories: prev.categories.includes(category)
                          ? prev.categories.filter((item) => item !== category)
                          : [...prev.categories, category],
                      }))}
                    >
                      {category}
                    </FilterChip>
                  ))}
                  {availableCategories.length === 0 && (
                    <span className="px-2 py-1 text-xs text-slate-500">
                      {isHindi ? "कोई श्रेणी उपलब्ध नहीं" : "No categories available"}
                    </span>
                  )}
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
                    ? (profileOnly
                      ? `${profileEligibleCount} schemes match your profile. Showing all eligible matches.`
                      : `Discover schemes using your saved profile. ${profileEligibleCount} schemes currently match your profile.`)
                    : "Complete your profile to see schemes matched to your details."}
                </p>
              </div>
              {profile ? (
                <button
                  type="button"
                  onClick={handleProfileFilter}
                  disabled={eligibilityLoading || !allSchemesLoaded}
                  aria-pressed={profileOnly}
                  className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-100 ${profileOnly
                      ? "bg-emerald-700 text-white hover:bg-emerald-800"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1v6m-3-3h6" />
                  </svg>
                  {!allSchemesLoaded ? (isHindi ? "लोड हो रहा है..." : "Loading...") : eligibilityLoading ? (isHindi ? "जाँच जारी..." : "Checking...") : (profileOnly ? (isHindi ? "मेरे मेल" : "Showing My Matches") : (isHindi ? "मेरी प्रोफ़ाइल के लिए" : "For My Profile"))}
                  {profileOnly && <span aria-hidden="true">✓</span>}
                </button>
              ) : (
                <Link
                  href="/profile"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0F2342] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#173663]"
                >
                  {isHindi ? "प्रोफ़ाइल पूरी करें" : "Complete Profile"} <span aria-hidden="true">→</span>
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
                  <div><span className="text-gray-500">{isHindi ? "सामाजिक श्रेणी" : "Social category"}:</span><p className="font-semibold text-gray-800">{profile.social_category || (isHindi ? "नहीं दी गई" : "Not provided")}</p></div>
                </div>
              </div>
            ) : null}

            {filteredSchemes.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedSchemes.map((scheme) => {
                    const schemeTitle = isHindi
                      ? (richTextToPlainText(scheme.raw.name_hi) || scheme.name)
                      : scheme.name;

                    const schemeDescription = isHindi
                      ? (richTextToPlainText(scheme.raw.description_hi) || scheme.description)
                      : scheme.description;

                    return (
                      <article key={scheme.id} className="min-w-0">
                        <Link
                          href={`/schemes/${scheme.id}`}
                          aria-label={`${isHindi ? "योजना का विवरण देखें" : "View scheme details"}: ${schemeTitle}`}
                          className="group flex h-[250px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#0F2342]/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2342] focus-visible:ring-offset-2"
                        >
                          {profile && (
                            <span className={`mb-2 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${scheme.eligibility === "eligible"
                                ? "bg-emerald-100 text-emerald-800"
                                : scheme.eligibility === "not-eligible"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                              {scheme.eligibility === "eligible"
                                ? (isHindi ? "आप पात्र हैं" : "Eligible")
                                : scheme.eligibility === "not-eligible"
                                  ? (isHindi ? "पात्र नहीं" : "Not eligible")
                                  : (isHindi ? "जाँच आवश्यक" : "Needs verification")}
                            </span>
                          )}
                          <h3 className="mb-3 line-clamp-2 min-h-[3.25rem] text-base font-bold leading-snug text-slate-900 group-hover:text-[#0F2342]">
                            {schemeTitle || (isHindi ? "नाम उपलब्ध नहीं" : "Name unavailable")}
                          </h3>

                          <p className="line-clamp-4 overflow-hidden text-sm leading-relaxed text-slate-600">
                            {schemeDescription || (isHindi ? "संक्षिप्त विवरण उपलब्ध नहीं है। अधिक जानकारी के लिए विवरण देखें।" : "Short description is not available. Open the scheme to see more details.")}
                          </p>

                          <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-[#0F2342]">
                            {isHindi ? "विवरण देखें" : "View details"}
                            <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                          </span>
                        </Link>
                      </article>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
                    <p className="text-sm text-slate-600">
                      {isHindi ? "दिखाई जा रही योजनाएँ" : "Showing"}{" "}
                      <span className="font-bold text-slate-900">
                        {startItem}-{endItem}
                      </span>{" "}
                      {isHindi ? "में से" : "of"}{" "}
                      <span className="font-bold text-slate-900">
                        {filteredSchemes.length}
                      </span>{" "}
                      {isHindi ? "योजनाएँ" : "schemes"}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isHindi ? "← पिछला" : "← Previous"}
                      </button>

                      <span className="rounded-lg bg-[#0F2342] px-4 py-2 text-sm font-bold text-white">
                        {currentPage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isHindi ? "अगला →" : "Next →"}
                      </button>
                    </div>
                  </div>
                )}
              </>
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
          <span className="text-xs font-medium tracking-tight">{isHindi ? "YojnaMitra AI से चैट करें" : "Chat with YojnaMitra AI"}</span>
        </button>
        <button aria-label="Open Chat Window" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#0F2342] text-white shadow-xl transition-colors hover:bg-[#173663]" type="button"><svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z" /></svg></button>
      </aside>
    </div>
  );
}









