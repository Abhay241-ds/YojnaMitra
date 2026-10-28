"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
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

type SchemeRecord = Partial<{
  id: string | number;
  name: string | null;
  name_hi: string | null;
  description: string | null;
  description_hi: string | null;
  category: string | null;
  scheme_level: string | null;
  target_state: string | null;
  eligible_occupation: string[] | null;
  min_age: number | null;
  max_age: number | null;
  annual_income_limit: number | null;
  benefits: string | null;
  benefits_hi: string | null;
  required_documents: string[] | null;
  application_process: string | null;
  application_process_hi: string | null;
  official_url: string | null;
  is_active: boolean | null;
}>;

const STATES = [
  "All India", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const CATEGORIES = [
  "Agriculture", "Education", "Health", "Employment", "Women & Child",
  "Housing", "Social Welfare", "Financial Assistance", "Business",
  "Disability", "Pension", "Other",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

const initialForm: SchemeForm = {
  name: "", name_hi: "", description: "", description_hi: "",
  category: "Other", scheme_level: "central", target_state: "All India",
  eligible_occupation: "", min_age: "", max_age: "", annual_income_limit: "",
  benefits: "", benefits_hi: "", required_documents: "",
  application_process: "", application_process_hi: "", official_url: "",
  is_active: true,
};

function listToText(value: unknown): string {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string").join(", ") : "";
}

function toForm(scheme: SchemeRecord): SchemeForm {
  return {
    name: scheme.name ?? "",
    name_hi: scheme.name_hi ?? "",
    description: scheme.description ?? "",
    description_hi: scheme.description_hi ?? "",
    category: scheme.category || "Other",
    scheme_level: scheme.scheme_level === "state" ? "state" : "central",
    target_state: scheme.target_state || "All India",
    eligible_occupation: listToText(scheme.eligible_occupation),
    min_age: scheme.min_age == null ? "" : String(scheme.min_age),
    max_age: scheme.max_age == null ? "" : String(scheme.max_age),
    annual_income_limit: scheme.annual_income_limit == null ? "" : String(scheme.annual_income_limit),
    benefits: scheme.benefits ?? "",
    benefits_hi: scheme.benefits_hi ?? "",
    required_documents: listToText(scheme.required_documents),
    application_process: scheme.application_process ?? "",
    application_process_hi: scheme.application_process_hi ?? "",
    official_url: scheme.official_url ?? "",
    is_active: scheme.is_active ?? true,
  };
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}

function Section({
  number, title, description, children,
}: { number: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-800">{number}</span>
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">{children}</div>
    </section>
  );
}

export default function EditSchemePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const schemeId = params?.id;
  const [supabase] = useState(() => createClient());
  const [form, setForm] = useState<SchemeForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const messageRef = useRef<HTMLDivElement | null>(null);

  const updateField = <K extends keyof SchemeForm>(key: K, value: SchemeForm[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const verifyAdmin = useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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
    if (!admin) {
      router.replace("/");
      throw new Error("You are not authorized to manage schemes.");
    }
    return user;
  }, [router, supabase]);

  useEffect(() => {
    if (!error && !success) return;
    messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error, success]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      if (!schemeId) {
        setError("Scheme ID is missing from the URL.");
        setLoading(false);
        return;
      }
      try {
        await verifyAdmin();
        if (!active) return;
        setAuthorized(true);

        const { data, error: fetchError } = await supabase
          .from("schemes")
          .select("*")
          .eq("id", schemeId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Scheme not found, or you do not have permission to view it.");
        if (active) setForm(toForm(data as SchemeRecord));
      } catch (err) {
        console.error("Load scheme error:", err);
        if (active) setError(err instanceof Error ? err.message : "Unable to load the scheme.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();
    return () => { active = false; };
  }, [schemeId, supabase, verifyAdmin]);

  function validateForm(): string | null {
    if (!form.name.trim()) return "Scheme name in English is required.";
    if (!form.description.trim()) return "Scheme description in English is required.";
    if (form.scheme_level === "state" && form.target_state === "All India") {
      return "For a state government scheme, select the specific target state.";
    }

    const minAge = form.min_age.trim() === "" ? null : Number(form.min_age);
    const maxAge = form.max_age.trim() === "" ? null : Number(form.max_age);
    const income = form.annual_income_limit.trim() === "" ? null : Number(form.annual_income_limit);

    if (minAge !== null && (!Number.isInteger(minAge) || minAge < 0 || minAge > 120)) {
      return "Minimum age must be a whole number between 0 and 120.";
    }
    if (maxAge !== null && (!Number.isInteger(maxAge) || maxAge < 0 || maxAge > 120)) {
      return "Maximum age must be a whole number between 0 and 120.";
    }
    if (minAge !== null && maxAge !== null && minAge > maxAge) {
      return "Minimum age cannot be greater than maximum age.";
    }
    if (income !== null && (!Number.isFinite(income) || income < 0)) {
      return "Annual income limit must be zero or greater.";
    }
    if (form.official_url.trim()) {
      try {
        const url = new URL(form.official_url.trim());
        if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".")) {
          return "Enter a valid HTTP or HTTPS official URL.";
        }
      } catch {
        return "Enter a valid HTTP or HTTPS official URL.";
      }
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!schemeId) {
      setError("Scheme ID is missing from the URL.");
      return;
    }

    setSaving(true);
    try {
      await verifyAdmin();

      const minAge = form.min_age.trim() === "" ? null : Number(form.min_age);
      const maxAge = form.max_age.trim() === "" ? null : Number(form.max_age);
      const incomeLimit = form.annual_income_limit.trim() === "" ? null : Number(form.annual_income_limit);
      const payload = {
        name: form.name.trim(),
        name_hi: form.name_hi.trim() || null,
        description: form.description.trim(),
        description_hi: form.description_hi.trim() || null,
        category: form.category.trim() || "Other",
        scheme_level: form.scheme_level,
        target_state: form.scheme_level === "central" ? "All India" : form.target_state,
        eligible_occupation: form.eligible_occupation.split(",").map((v) => v.trim()).filter(Boolean),
        min_age: minAge,
        max_age: maxAge,
        annual_income_limit: incomeLimit,
        benefits: form.benefits.trim() || null,
        benefits_hi: form.benefits_hi.trim() || null,
        required_documents: form.required_documents.split(",").map((v) => v.trim()).filter(Boolean),
        application_process: form.application_process.trim() || null,
        application_process_hi: form.application_process_hi.trim() || null,
        official_url: form.official_url.trim() || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from("schemes")
        .update(payload)
        .eq("id", schemeId)
        .select("id")
        .maybeSingle();

      if (updateError) throw updateError;
      if (!data) {
        throw new Error("No scheme was updated. Check the scheme ID and your Supabase RLS UPDATE policy.");
      }

      setSuccess("Scheme updated successfully.");
      router.refresh();
    } catch (err) {
      console.error("Scheme update error:", err);
      setError(err instanceof Error ? err.message : "Unable to update the scheme. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!schemeId || deleting || saving) return;
    const confirmed = window.confirm("Delete this scheme permanently? This action cannot be undone.");
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeleting(true);
    try {
      await verifyAdmin();
      const { data, error: deleteError } = await supabase
        .from("schemes")
        .delete()
        .eq("id", schemeId)
        .select("id");

      if (deleteError) throw deleteError;
      if (!data?.length) {
        throw new Error("No scheme was deleted. Check the scheme ID and your Supabase RLS DELETE policy.");
      }
      router.replace("/admin/schemes");
      router.refresh();
    } catch (err) {
      console.error("Scheme delete error:", err);
      setError(err instanceof Error ? err.message : "Unable to delete the scheme.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
          <p className="mt-4 text-sm font-medium text-slate-600">Loading scheme details…</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="mx-auto my-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-800">Unable to open this scheme</p>
        <p className="mt-2 text-sm text-red-700">{error || "Redirecting…"}</p>
        <Link href="/admin/schemes" className="mt-4 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
          Back to schemes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link href="/admin/schemes" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700">
              <span aria-hidden="true">←</span> All schemes
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Edit scheme</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${form.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                {form.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Update scheme details, eligibility rules, Hindi translations and official application information.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
          >
            <span aria-hidden="true">⌫</span>{deleting ? "Deleting…" : "Delete scheme"}
          </button>
        </header>

        <div ref={messageRef} aria-live="polite" className="space-y-3">
          {error && (
            <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <span aria-hidden="true" className="font-bold">!</span><p>{error}</p>
            </div>
          )}
          {success && (
            <div role="status" className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <span aria-hidden="true" className="font-bold">✓</span><p>{success}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <Section number="01" title="Basic information" description="The scheme name and summary users see first.">
            <Field label="Scheme name (English) *">
              <input className={inputClass} value={form.name} onChange={(e) => updateField("name", e.target.value)} maxLength={200} required placeholder="e.g. Pradhan Mantri…" />
            </Field>
            <Field label="Scheme name (Hindi)">
              <input className={inputClass} value={form.name_hi} onChange={(e) => updateField("name_hi", e.target.value)} maxLength={200} placeholder="योजना का नाम" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description (English) *">
                <textarea className={inputClass} rows={4} value={form.description} onChange={(e) => updateField("description", e.target.value)} required maxLength={5000} placeholder="Explain what the scheme provides…" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description (Hindi)">
                <textarea className={inputClass} rows={4} value={form.description_hi} onChange={(e) => updateField("description_hi", e.target.value)} maxLength={5000} placeholder="योजना का विवरण हिंदी में…" />
              </Field>
            </div>
          </Section>

          <Section number="02" title="Classification & eligibility" description="Set the government level, state and eligibility limits.">
            <Field label="Category *">
              <select className={inputClass} value={form.category} onChange={(e) => updateField("category", e.target.value)} required>
                {!CATEGORIES.includes(form.category) && <option value={form.category}>{form.category}</option>}
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Government level *">
              <select
                className={inputClass}
                value={form.scheme_level}
                onChange={(e) => {
                  const level = e.target.value as "central" | "state";
                  setForm((prev) => ({
                    ...prev,
                    scheme_level: level,
                    target_state: level === "central" ? "All India" : (prev.target_state === "All India" ? "Uttar Pradesh" : prev.target_state),
                  }));
                }}
              >
                <option value="central">Central Government</option>
                <option value="state">State Government</option>
              </select>
            </Field>
            <Field label="Target state *" hint={form.scheme_level === "central" ? "Central schemes are saved as All India." : "Choose the state where this scheme applies."}>
              <select className={inputClass} value={form.target_state} onChange={(e) => updateField("target_state", e.target.value)} required disabled={form.scheme_level === "central"}>
                {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </Field>
            <Field label="Eligible occupations" hint="Separate multiple values with commas.">
              <input className={inputClass} value={form.eligible_occupation} onChange={(e) => updateField("eligible_occupation", e.target.value)} placeholder="Student, Farmer, Self-employed" />
            </Field>
            <Field label="Minimum age" hint="Leave blank if there is no minimum.">
              <input className={inputClass} type="number" min="0" max="120" step="1" inputMode="numeric" value={form.min_age} onChange={(e) => updateField("min_age", e.target.value)} placeholder="e.g. 18" />
            </Field>
            <Field label="Maximum age" hint="Leave blank if there is no maximum.">
              <input className={inputClass} type="number" min="0" max="120" step="1" inputMode="numeric" value={form.max_age} onChange={(e) => updateField("max_age", e.target.value)} placeholder="e.g. 60" />
            </Field>
            <Field label="Annual family income limit (₹)" hint="Enter the annual limit, not monthly income.">
              <input className={inputClass} type="number" min="0" step="any" inputMode="decimal" value={form.annual_income_limit} onChange={(e) => updateField("annual_income_limit", e.target.value)} placeholder="e.g. 250000" />
            </Field>
          </Section>

          <Section number="03" title="Benefits & documents" description="Tell citizens what they receive and what they need.">
            <div className="sm:col-span-2">
              <Field label="Benefits (English)">
                <textarea className={inputClass} rows={3} value={form.benefits} onChange={(e) => updateField("benefits", e.target.value)} maxLength={5000} placeholder="Financial assistance, subsidy, scholarship…" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Benefits (Hindi)">
                <textarea className={inputClass} rows={3} value={form.benefits_hi} onChange={(e) => updateField("benefits_hi", e.target.value)} maxLength={5000} placeholder="योजना के लाभ हिंदी में…" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Required documents" hint="Separate document names with commas.">
                <textarea className={inputClass} rows={3} value={form.required_documents} onChange={(e) => updateField("required_documents", e.target.value)} placeholder="Aadhaar card, income certificate, bank passbook" />
              </Field>
            </div>
          </Section>

          <Section number="04" title="Application & official source" description="Provide application steps and the official reference page.">
            <div className="sm:col-span-2">
              <Field label="Application process (English)">
                <textarea className={inputClass} rows={4} value={form.application_process} onChange={(e) => updateField("application_process", e.target.value)} maxLength={8000} placeholder="1. Visit the official portal…\n2. Complete the form…" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Application process (Hindi)">
                <textarea className={inputClass} rows={4} value={form.application_process_hi} onChange={(e) => updateField("application_process_hi", e.target.value)} maxLength={8000} placeholder="आवेदन करने के चरण हिंदी में…" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Official government URL" hint="Use the official government website where possible. URL format is checked, but reachability and ownership are not verified automatically.">
                <input className={inputClass} type="url" value={form.official_url} onChange={(e) => updateField("official_url", e.target.value)} maxLength={2048} placeholder="https://…" />
              </Field>
            </div>
          </Section>

          <Section number="05" title="Publishing status" description="Choose whether this scheme should appear on the public website.">
            <div className="sm:col-span-2">
              <label className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition ${form.is_active ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-slate-50"}`}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => updateField("is_active", e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700" />
                <span>
                  <span className="block text-sm font-bold text-slate-900">{form.is_active ? "Scheme is active" : "Scheme is inactive"}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                    {form.is_active ? "It can be displayed on the public website, subject to the public page query." : "It should be hidden from public listings that filter inactive schemes."}
                  </span>
                </span>
              </label>
            </div>
          </Section>

          <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <p className="px-2 text-xs text-slate-500">Changes are saved to the Supabase <code>schemes</code> table.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/admin/schemes" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                Cancel
              </Link>
              <button type="submit" disabled={saving || deleting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-800 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">
                {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {saving ? "Saving changes…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
