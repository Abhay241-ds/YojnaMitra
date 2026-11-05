"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type SchemeForm = {
  name: string;
  name_hi: string;
  description: string;
  description_hi: string;
  category: string;
  scheme_level: "central" | "state";
  target_state: string;
  eligible_occupation: string;
  eligible_social_categories: string[];
  min_age: string;
  max_age: string;
  annual_income_limit: string;
  benefits: string;
  benefits_hi: string;
  required_documents: string;
  application_process: string;
  application_process_hi: string;
  official_url: string;
  is_active: boolean;
};

const emptyForm: SchemeForm = {
  name: "",
  name_hi: "",
  description: "",
  description_hi: "",
  category: "Other",
  scheme_level: "central",
  target_state: "All India",
  eligible_occupation: "",
  eligible_social_categories: ["ALL"],
  min_age: "",
  max_age: "",
  annual_income_limit: "",
  benefits: "",
  benefits_hi: "",
  required_documents: "",
  application_process: "",
  application_process_hi: "",
  official_url: "",
  is_active: true,
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const categories = [
  "Agriculture",
  "Education",
  "Health",
  "Employment",
  "Women & Child",
  "Housing",
  "Social Welfare",
  "Financial Assistance",
  "Other",
];

const socialCategories = [
  { value: "ALL", label: "All categories" },
  { value: "General", label: "General" },
  { value: "SC", label: "SC — Scheduled Caste" },
  { value: "ST", label: "ST — Scheduled Tribe" },
  { value: "OBC", label: "OBC — Other Backward Classes" },
  { value: "EWS", label: "EWS — Economically Weaker Section" },
  { value: "Other", label: "Other" },
];

const states = [
  "All India",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function AddSchemePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [form, setForm] = useState<SchemeForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

        if (active) setAuthorized(true);
      } catch (err: unknown) {
        console.error("Admin access error:", err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to verify admin access. Please try again."
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
  }, [router, supabase]);

  function updateField<K extends keyof SchemeForm>(
    key: K,
    value: SchemeForm[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function toggleSocialCategory(category: string) {
    setForm((previous) => {
      const selected = previous.eligible_social_categories;

      if (category === "ALL") {
        return { ...previous, eligible_social_categories: ["ALL"] };
      }

      const withoutAll = selected.filter((item) => item !== "ALL");
      const next = withoutAll.includes(category)
        ? withoutAll.filter((item) => item !== category)
        : [...withoutAll, category];

      return {
        ...previous,
        eligible_social_categories: next.length ? next : ["ALL"],
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name || !description) {
      setError("Scheme name and description are required.");
      return;
    }

    if (form.scheme_level === "state" && form.target_state === "All India") {
      setError("For a state government scheme, please select the target state.");
      return;
    }

    const minAge = form.min_age.trim() === "" ? null : Number(form.min_age);
    const maxAge = form.max_age.trim() === "" ? null : Number(form.max_age);
    const incomeLimit =
      form.annual_income_limit.trim() === ""
        ? null
        : Number(form.annual_income_limit);

    if (
      (minAge !== null && (!Number.isInteger(minAge) || minAge < 0 || minAge > 120)) ||
      (maxAge !== null && (!Number.isInteger(maxAge) || maxAge < 0 || maxAge > 120)) ||
      (minAge !== null && maxAge !== null && minAge > maxAge) ||
      (incomeLimit !== null && (!Number.isFinite(incomeLimit) || incomeLimit < 0))
    ) {
      setError("Enter valid age limits (0–120) and a non-negative annual income limit.");
      return;
    }

    const officialUrl = form.official_url.trim();
    if (officialUrl) {
      try {
        const url = new URL(officialUrl);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new Error("Invalid protocol");
        }
      } catch {
        setError("Enter a valid official URL beginning with https:// or http://.");
        return;
      }
    }

    setSaving(true);

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
      if (!admin) throw new Error("You are not authorized to add schemes.");

      const payload = {
        name,
        name_hi: form.name_hi.trim() || null,
        description,
        description_hi: form.description_hi.trim() || null,
        category: form.category.trim() || "Other",
        scheme_level: form.scheme_level,
        target_state: form.scheme_level === "central" ? "All India" : form.target_state,
        eligible_occupation: form.eligible_occupation
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        eligible_social_categories: form.eligible_social_categories,
        min_age: minAge,
        max_age: maxAge,
        annual_income_limit: incomeLimit,
        benefits: form.benefits.trim() || null,
        benefits_hi: form.benefits_hi.trim() || null,
        required_documents: form.required_documents
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        application_process: form.application_process.trim() || null,
        application_process_hi: form.application_process_hi.trim() || null,
        official_url: officialUrl || null,
        is_active: form.is_active,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("schemes")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) throw insertError;
      if (!inserted) throw new Error("The scheme could not be confirmed as saved.");

      setForm(emptyForm);
      setSuccess(`Scheme "${name}" added successfully.`);
      router.refresh();
    } catch (err: unknown) {
      console.error("Scheme save error:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "Unable to save the scheme. Please try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
          <span className="text-sm font-medium text-slate-600">Verifying admin access…</span>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-6">
        <div role="alert" className="max-w-lg rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
          {error || "You do not have access to this page. Redirecting…"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/80 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7">
          <Link href="/admin/schemes" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700">
            <span aria-hidden="true">←</span> Back to all schemes
          </Link>
          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                <span aria-hidden="true">＋</span> Scheme management
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Add New Scheme</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Add accurate scheme details in English and Hindi for YojnaMitra users.
              </p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
              <strong className="block font-bold">Admin workspace</strong>
              Fields marked * are required.
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            <div><strong className="block font-bold">Unable to add scheme</strong><span>{error}</span></div>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error" className="rounded-lg px-2 py-1 font-bold hover:bg-red-100">×</button>
          </div>
        )}

        {success && (
          <div role="status" className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 sm:flex-row sm:items-center">
            <span>✓ {success}</span>
            <Link href="/admin/schemes" className="font-bold underline underline-offset-4">View all schemes →</Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <SectionHeading number="01" title="Basic information" description="The scheme name and summary users will see first." />
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Scheme name (English) *" hint="Use the official scheme name.">
                <input className={inputClass} value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. PM Kisan Samman Nidhi" required maxLength={200} />
              </Field>
              <Field label="Scheme name (Hindi)" hint="Optional, but recommended for Hindi users.">
                <input className={inputClass} value={form.name_hi} onChange={(e) => updateField("name_hi", e.target.value)} placeholder="उदाहरण: पीएम किसान सम्मान निधि" maxLength={200} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Description (English) *">
                  <textarea className={inputClass} rows={4} value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Explain what the scheme provides and who it is for…" required maxLength={5000} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Description (Hindi)">
                  <textarea className={inputClass} rows={4} value={form.description_hi} onChange={(e) => updateField("description_hi", e.target.value)} placeholder="योजना का उद्देश्य और लाभ हिंदी में लिखें…" maxLength={5000} />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <SectionHeading number="02" title="Classification & eligibility" description="Help the matching system understand who may qualify." />
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Category *">
                <select className={inputClass} value={form.category} onChange={(e) => updateField("category", e.target.value)} required>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </Field>
              <Field label="Government level *">
                <select className={inputClass} value={form.scheme_level} onChange={(e) => {
                  const level = e.target.value as "central" | "state";
                  setForm((current) => ({
                    ...current,
                    scheme_level: level,
                    target_state: level === "central" ? "All India" : current.target_state === "All India" ? "Uttar Pradesh" : current.target_state,
                  }));
                }} required>
                  <option value="central">Central Government</option>
                  <option value="state">State Government</option>
                </select>
              </Field>
              <Field label="Target state *" hint={form.scheme_level === "central" ? "Central schemes are set to All India." : "Choose the state where this scheme applies."}>
                <select className={inputClass} value={form.target_state} onChange={(e) => updateField("target_state", e.target.value)} disabled={form.scheme_level === "central"} required>
                  {states.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
              </Field>
              <Field label="Eligible occupations" hint="Separate multiple values with commas.">
                <input className={inputClass} value={form.eligible_occupation} onChange={(e) => updateField("eligible_occupation", e.target.value)} placeholder="Farmer, Student, Unemployed" />
              </Field>
              <div className="md:col-span-2">
                <Field
                  label="Eligible social categories"
                  hint="Select the categories allowed by the scheme's official guidelines. Choose All categories if the scheme has no category restriction."
                >
                  <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {socialCategories.map((category) => {
                      const checked = form.eligible_social_categories.includes(category.value);
                      return (
                        <label
                          key={category.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm transition ${
                            checked
                              ? "border-blue-300 bg-blue-50 text-blue-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSocialCategory(category.value)}
                            className="h-4 w-4 accent-blue-700"
                          />
                          <span className="font-medium">{category.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </Field>
              </div>
              <Field label="Minimum age (years)">
                <input className={inputClass} type="number" inputMode="numeric" min="0" max="120" step="1" value={form.min_age} onChange={(e) => updateField("min_age", e.target.value)} placeholder="e.g. 18" />
              </Field>
              <Field label="Maximum age (years)">
                <input className={inputClass} type="number" inputMode="numeric" min="0" max="120" step="1" value={form.max_age} onChange={(e) => updateField("max_age", e.target.value)} placeholder="e.g. 60" />
              </Field>
              <Field label="Annual family income limit (₹)" hint="Enter the yearly amount in rupees, not monthly income.">
                <input className={inputClass} type="number" inputMode="decimal" min="0" step="0.01" value={form.annual_income_limit} onChange={(e) => updateField("annual_income_limit", e.target.value)} placeholder="e.g. 250000" />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <SectionHeading number="03" title="Benefits & documents" description="Provide clear, accurate information about the support offered." />
            <div className="mt-6 grid gap-5">
              <Field label="Benefits (English)">
                <textarea className={inputClass} rows={3} value={form.benefits} onChange={(e) => updateField("benefits", e.target.value)} placeholder="Describe financial assistance, services, or other benefits…" maxLength={5000} />
              </Field>
              <Field label="Benefits (Hindi)">
                <textarea className={inputClass} rows={3} value={form.benefits_hi} onChange={(e) => updateField("benefits_hi", e.target.value)} placeholder="लाभों का विवरण हिंदी में लिखें…" maxLength={5000} />
              </Field>
              <Field label="Required documents" hint="Separate each document with a comma.">
                <textarea className={inputClass} rows={3} value={form.required_documents} onChange={(e) => updateField("required_documents", e.target.value)} placeholder="Aadhaar Card, Bank Passbook, Income Certificate" />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <SectionHeading number="04" title="Application & official source" description="Help users understand how to apply and where to verify details." />
            <div className="mt-6 grid gap-5">
              <Field label="Application process (English)">
                <textarea className={inputClass} rows={4} value={form.application_process} onChange={(e) => updateField("application_process", e.target.value)} placeholder="List the application steps in order…" maxLength={5000} />
              </Field>
              <Field label="Application process (Hindi)">
                <textarea className={inputClass} rows={4} value={form.application_process_hi} onChange={(e) => updateField("application_process_hi", e.target.value)} placeholder="आवेदन की प्रक्रिया हिंदी में लिखें…" maxLength={5000} />
              </Field>
              <Field label="Official government URL" hint="Use the official scheme page or government portal. The app checks URL format, not ownership or availability.">
                <input className={inputClass} type="url" value={form.official_url} onChange={(e) => updateField("official_url", e.target.value)} placeholder="https://example.gov.in/scheme" />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <SectionHeading number="05" title="Publishing" description="Control whether the scheme is visible on the public website." />
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
              <input type="checkbox" checked={form.is_active} onChange={(e) => updateField("is_active", e.target.checked)} className="mt-1 h-4 w-4 accent-blue-700" />
              <span>
                <span className="block text-sm font-bold text-slate-800">Publish this scheme</span>
                <span className="mt-1 block text-sm leading-5 text-slate-500">When active, this scheme may appear in the public directory, subject to the website's filters and policies.</span>
              </span>
            </label>
          </section>

          <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <Link href="/admin/schemes" className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
              Cancel
            </Link>
            <button type="submit" disabled={saving} className={`${buttonClass} bg-blue-700 text-white shadow-sm hover:bg-blue-800`}>
              {saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Saving scheme…</> : <><span aria-hidden="true">＋</span> Add scheme</>}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">{number}</span>
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}
