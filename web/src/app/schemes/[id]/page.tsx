"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkEligibility, type EligibilityResult, type UserProfile } from "@/lib/eligibility";

type DbScheme = {
  id: string;
  name: string;
  description: string | null;
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
};

type ProfileRecord = {
  age_range: string | null;
  state: string | null;
  occupation: string | null;
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
    annual_family_income: parsedIncome !== null && Number.isFinite(parsedIncome) ? parsedIncome : null,
  };
}

function SchemeDetailsContent() {
  const params = useParams<{ id: string }>();
  const schemeId = params.id;
  const supabase = useMemo(() => createClient(), []);
  const [scheme, setScheme] = useState<DbScheme | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDetails() {
      setLoading(true);
      setError("");
      try {
        const { data: schemeData, error: schemeError } = await supabase
          .from("schemes")
          .select("id, name, description, category, scheme_level, target_state, eligible_occupation, min_age, max_age, annual_income_limit, benefits, required_documents, application_process, official_url, is_active")
          .eq("id", schemeId)
          .eq("is_active", true)
          .maybeSingle();
        if (schemeError) throw schemeError;
        if (!schemeData) throw new Error("Scheme not found or it is no longer active.");

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        let result: EligibilityResult = {
          status: "needs_verification",
          reasons: ["Log in and complete your profile to evaluate eligibility."],
          matchedRules: [],
          failedRules: [],
          missingInformation: ["User profile is unavailable."],
        };

        if (authData.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .select("age_range, state, occupation, annual_family_income")
            .eq("user_id", authData.user.id)
            .maybeSingle();
          if (profileError) throw profileError;
          if (profileData) result = checkEligibility(toEligibilityProfile(profileData as ProfileRecord), schemeData as DbScheme);
        }
        if (!active) return;
        setScheme(schemeData as DbScheme);
        setEligibility(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load scheme details.");
      } finally {
        if (active) setLoading(false);
      }
    }
    if (schemeId) void loadDetails();
    return () => { active = false; };
  }, [schemeId, supabase]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#F4F6F9] text-slate-600">Loading scheme details...</main>;
  if (error || !scheme || !eligibility) return (
    <main className="min-h-screen bg-[#F4F6F9] px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-6">
        <p className="text-red-700">{error || "Scheme details could not be loaded."}</p>
        <Link href="/schemes" className="mt-4 inline-flex font-semibold text-blue-700 underline">← Back to schemes</Link>
      </div>
    </main>
  );

  const statusLabel = eligibility.status === "eligible" ? "Eligible" : eligibility.status === "not_eligible" ? "Not Eligible" : "Needs Verification";
  const statusClass = eligibility.status === "eligible" ? "bg-emerald-100 text-emerald-800" : eligibility.status === "not_eligible" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";

  return (
    <main className="min-h-screen bg-[#F4F6F9] px-4 py-8 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/schemes" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">← Back to schemes</Link>
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="bg-[#0F2342] px-6 py-7 text-white sm:px-8">
            <p className="mb-2 text-sm text-blue-100">{scheme.scheme_level === "state" ? `${scheme.target_state || "State"} Government` : "Central Government"}</p>
            <h1 className="text-2xl font-bold sm:text-3xl">{scheme.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{statusLabel}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{scheme.category || "Other"}</span>
            </div>
          </header>
          <div className="space-y-7 p-6 sm:p-8">
            <section>
              <h2 className="mb-2 text-lg font-bold">About this scheme</h2>
              <p className="whitespace-pre-line leading-7 text-slate-600">{scheme.description || "No description has been added yet."}</p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-bold">Benefits / Financial assistance</h2>
              <p className="whitespace-pre-line leading-7 text-slate-600">{scheme.benefits || "Please check the official website for benefit details."}</p>
            </section>
            <section>
              <h2 className="mb-3 text-lg font-bold">Your eligibility assessment</h2>
              {eligibility.matchedRules.length > 0 && <div className="mb-4"><h3 className="mb-2 text-sm font-bold text-emerald-700">Matched criteria</h3><ul className="list-disc space-y-1 pl-5 text-slate-600">{eligibility.matchedRules.map((item, index) => <li key={`matched-${index}`}>{item}</li>)}</ul></div>}
              {eligibility.reasons.length > 0 && <div><h3 className="mb-2 text-sm font-bold text-slate-800">Reasons / next steps</h3><ul className="list-disc space-y-1 pl-5 text-slate-600">{eligibility.reasons.map((item, index) => <li key={`reason-${index}`}>{item}</li>)}</ul></div>}
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">This assessment uses only the eligibility criteria configured in YojnaMitra. Confirm all requirements on the official scheme website before applying.</p>
            </section>
            <section>
              <h2 className="mb-2 text-lg font-bold">Eligibility criteria configured</h2>
              <ul className="list-disc space-y-1 pl-5 text-slate-600">
                <li>Minimum age: {scheme.min_age ?? "Not specified"}</li>
                <li>Maximum age: {scheme.max_age ?? "Not specified"}</li>
                <li>Annual family income limit: {scheme.annual_income_limit == null ? "Not specified" : `₹${scheme.annual_income_limit.toLocaleString("en-IN")}`}</li>
                <li>Eligible occupations: {scheme.eligible_occupation?.length ? scheme.eligible_occupation.join(", ") : "Not specified"}</li>
                <li>Target state: {scheme.scheme_level === "state" ? scheme.target_state || "Not specified" : "All India (Central scheme)"}</li>
              </ul>
            </section>
            {scheme.required_documents?.length ? <section><h2 className="mb-2 text-lg font-bold">Required documents</h2><ul className="list-disc space-y-1 pl-5 text-slate-600">{scheme.required_documents.map((doc, index) => <li key={`doc-${index}`}>{doc}</li>)}</ul></section> : <section><h2 className="mb-2 text-lg font-bold">Required documents</h2><p className="text-slate-600">No document list has been added. Check the official website.</p></section>}
            <section>
              <h2 className="mb-2 text-lg font-bold">Application process</h2>
              <p className="whitespace-pre-line leading-7 text-slate-600">{scheme.application_process || "Application instructions have not been added yet. Please check the official website."}</p>
            </section>
            {scheme.official_url && <a href={scheme.official_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#F97316] px-5 py-3 text-sm font-bold text-white hover:bg-orange-600">Visit official website ↗</a>}
          </div>
        </article>
      </div>
    </main>
  );
}


export default function SchemeDetailsPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#F4F6F9] text-slate-600">Loading scheme details...</main>}>
      <SchemeDetailsContent />
    </Suspense>
  );
}
