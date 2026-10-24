"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Scheme = {
  id: string;
  name: string;
  description: string;
  category: string;
  scheme_level: "central" | "state";
  target_state: string;
  eligible_occupation: string[];
  min_age: number | null;
  max_age: number | null;
  annual_income_limit: number | null;
  benefits: string | null;
  required_documents: string[];
  application_process: string | null;
  official_url: string | null;
  is_active: boolean;
};

type SchemeForm = {
  name: string;
  description: string;
  category: string;
  scheme_level: "central" | "state";
  target_state: string;
  eligible_occupation: string;
  min_age: string;
  max_age: string;
  annual_income_limit: string;
  benefits: string;
  required_documents: string;
  application_process: string;
  official_url: string;
  is_active: boolean;
};

const emptyForm: SchemeForm = {
  name: "",
  description: "",
  category: "Other",
  scheme_level: "central",
  target_state: "All India",
  eligible_occupation: "",
  min_age: "",
  max_age: "",
  annual_income_limit: "",
  benefits: "",
  required_documents: "",
  application_process: "",
  official_url: "",
  is_active: true,
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default function AdminSchemesPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [form, setForm] = useState<SchemeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const messageRef = useRef<HTMLDivElement | null>(null);

  // After a save attempt, scroll to the error or success message.
  useEffect(() => {
    if (!error && !success) return;

    messageRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [error, success]);

  const loadSchemes = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("schemes")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      throw queryError;
    }

    setSchemes((data ?? []) as Scheme[]);
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

        if (adminError) {
          throw adminError;
        }

        if (!admin) {
          router.replace("/");
          return;
        }

        if (!active) return;

        setAuthorized(true);
        await loadSchemes();
      } catch (err) {
        console.error("Admin dashboard error:", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load the admin dashboard."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [supabase, router, loadSchemes]);

  function updateField<K extends keyof SchemeForm>(
    key: K,
    value: SchemeForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function startEdit(scheme: Scheme) {
    setEditingId(scheme.id);

    setForm({
      name: scheme.name ?? "",
      description: scheme.description ?? "",
      category: scheme.category ?? "Other",
      scheme_level: scheme.scheme_level === "state" ? "state" : "central",
      target_state: scheme.target_state ?? "All India",
      eligible_occupation: (scheme.eligible_occupation ?? []).join(", "),
      min_age: scheme.min_age == null ? "" : String(scheme.min_age),
      max_age: scheme.max_age == null ? "" : String(scheme.max_age),
      annual_income_limit:
        scheme.annual_income_limit == null
          ? ""
          : String(scheme.annual_income_limit),
      benefits: scheme.benefits ?? "",
      required_documents: (scheme.required_documents ?? []).join(", "),
      application_process: scheme.application_process ?? "",
      official_url: scheme.official_url ?? "",
      is_active: scheme.is_active,
    });

    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.description.trim()) {
      setError("Scheme name and description are required.");
      return;
    }

    const minAge = form.min_age === "" ? null : Number(form.min_age);
    const maxAge = form.max_age === "" ? null : Number(form.max_age);
    const incomeLimit =
      form.annual_income_limit === ""
        ? null
        : Number(form.annual_income_limit);

    if (
      (minAge !== null && (!Number.isInteger(minAge) || minAge < 0)) ||
      (maxAge !== null && (!Number.isInteger(maxAge) || maxAge < 0)) ||
      (minAge !== null && maxAge !== null && minAge > maxAge) ||
      (incomeLimit !== null &&
        (!Number.isFinite(incomeLimit) || incomeLimit < 0))
    ) {
      setError("Please enter valid age and income limits.");
      return;
    }

    if (form.official_url.trim()) {
      try {
        const url = new URL(form.official_url.trim());

        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new Error("Invalid protocol");
        }
      } catch {
        setError("Please enter a valid official URL.");
        return;
      }
    }

    setSaving(true);

    try {
      // Verify the current session and admin role before writing.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const { data: admin, error: adminError } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) throw adminError;

      if (!admin) {
        throw new Error("You are not authorized to manage schemes.");
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim() || "Other",
        scheme_level: form.scheme_level,
        target_state: form.target_state,
        eligible_occupation: form.eligible_occupation
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        min_age: minAge,
        max_age: maxAge,
        annual_income_limit: incomeLimit,
        benefits: form.benefits.trim() || null,
        required_documents: form.required_documents
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        application_process: form.application_process.trim() || null,
        official_url: form.official_url.trim() || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("schemes")
          .update(payload)
          .eq("id", editingId);

        if (updateError) throw updateError;

        setSuccess("Scheme updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("schemes")
          .insert(payload);

        if (insertError) throw insertError;

        setSuccess("Scheme added successfully.");
      }

      setForm(emptyForm);
      setEditingId(null);

      await loadSchemes();
    } catch (err: unknown) {
      console.error("Scheme save error details:", JSON.stringify(err, null, 2));

      const message =
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "Unable to save the scheme. Check the browser console for details.";

      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteScheme(scheme: Scheme) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${scheme.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in again.");
      }

      const { data: admin, error: adminError } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) throw adminError;

      if (!admin) {
        throw new Error("You are not authorized to delete schemes.");
      }

      const { error: deleteError } = await supabase
        .from("schemes")
        .delete()
        .eq("id", scheme.id);

      if (deleteError) throw deleteError;

      setSchemes((previous) =>
        previous.filter((item) => item.id !== scheme.id)
      );

      if (editingId === scheme.id) {
        cancelEdit();
      }

      setSuccess("Scheme deleted successfully.");
    } catch (err) {
      console.error("Scheme delete error:", err);

      setError(
        err instanceof Error ? err.message : "Unable to delete the scheme."
      );
    }
  }

  const filteredSchemes = schemes.filter((scheme) =>
    `${scheme.name} ${scheme.category} ${scheme.target_state}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-600">
          Checking admin access...
        </p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-sm text-red-600">
          {error || "Redirecting..."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
              YojnaMitra Admin
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Scheme Management
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Add, update and manage government schemes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Website
          </button>
        </header>

        {error && (
          <div
            ref={messageRef}
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            ref={messageRef}
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              {editingId ? "Edit Scheme" : "Add New Scheme"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-sm font-semibold text-slate-600 underline"
              >
                Cancel editing
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Scheme Name *">
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. PM Kisan Samman Nidhi"
                  required
                />
              </Field>

              <Field label="Category *">
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  required
                >
                  <option>Agriculture</option>
                  <option>Education</option>
                  <option>Health</option>
                  <option>Employment</option>
                  <option>Women & Child</option>
                  <option>Housing</option>
                  <option>Social Welfare</option>
                  <option>Financial Assistance</option>
                  <option>Other</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Scheme Level *">
                <select
                  className={inputClass}
                  value={form.scheme_level}
                  onChange={(e) =>
                    updateField("scheme_level", e.target.value as "central" | "state")
                  }
                  required
                >
                  <option value="central">Central Government</option>
                  <option value="state">State Government</option>
                </select>
              </Field>

              <Field label="Description *">
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                    required
                  />
                </Field>
              </div>

              <Field label="Target State">
                <select
                  className={inputClass}
                  value={form.target_state}
                  onChange={(e) =>
                    updateField("target_state", e.target.value)
                  }
                >
                  <option>All India</option>
                  <option>Andhra Pradesh</option>
                  <option>Bihar</option>
                  <option>Delhi</option>
                  <option>Gujarat</option>
                  <option>Haryana</option>
                  <option>Karnataka</option>
                  <option>Madhya Pradesh</option>
                  <option>Maharashtra</option>
                  <option>Punjab</option>
                  <option>Rajasthan</option>
                  <option>Tamil Nadu</option>
                  <option>Telangana</option>
                  <option>Uttar Pradesh</option>
                  <option>Uttarakhand</option>
                  <option>West Bengal</option>
                </select>
              </Field>

              <Field label="Eligible Occupations (comma separated)">
                <input
                  className={inputClass}
                  value={form.eligible_occupation}
                  onChange={(e) =>
                    updateField("eligible_occupation", e.target.value)
                  }
                  placeholder="Farmer, Student"
                />
              </Field>

              <Field label="Minimum Age">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={form.min_age}
                  onChange={(e) => updateField("min_age", e.target.value)}
                />
              </Field>

              <Field label="Maximum Age">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={form.max_age}
                  onChange={(e) => updateField("max_age", e.target.value)}
                />
              </Field>

              <Field label="Annual Income Limit (₹)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  value={form.annual_income_limit}
                  onChange={(e) =>
                    updateField("annual_income_limit", e.target.value)
                  }
                />
              </Field>

              <Field label="Benefits">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.benefits}
                  onChange={(e) => updateField("benefits", e.target.value)}
                />
              </Field>

              <Field label="Required Documents (comma separated)">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.required_documents}
                  onChange={(e) =>
                    updateField("required_documents", e.target.value)
                  }
                  placeholder="Aadhaar Card, Bank Passbook"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Application Process">
                  <textarea
                    className={inputClass}
                    rows={4}
                    value={form.application_process}
                    onChange={(e) =>
                      updateField("application_process", e.target.value)
                    }
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Official Government URL">
                  <input
                    className={inputClass}
                    type="url"
                    value={form.official_url}
                    onChange={(e) =>
                      updateField("official_url", e.target.value)
                    }
                    placeholder="https://..."
                  />
                </Field>
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  updateField("is_active", e.target.checked)
                }
                className="h-4 w-4 accent-blue-700"
              />
              Active — show this scheme on the public website
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#173B6C] px-6 py-3 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Scheme"
                  : "Add Scheme"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                All Schemes
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {schemes.length} total schemes
              </p>
            </div>

            <input
              className={`${inputClass} max-w-sm`}
              placeholder="Search schemes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search schemes"
            />
          </div>

          {filteredSchemes.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No schemes found. Add your first scheme using the form above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Scheme</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">State</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredSchemes.map((scheme) => (
                    <tr key={scheme.id} className="hover:bg-slate-50">
                      <td className="max-w-sm px-5 py-4">
                        <p className="font-bold text-slate-900">
                          {scheme.name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {scheme.description}
                        </p>
                      </td>

                      <td className="px-5 py-4">{scheme.category}</td>
                      <td className="px-5 py-4">{scheme.target_state}</td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${scheme.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                            }`}
                        >
                          {scheme.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(scheme)}
                            className="font-semibold text-blue-700 hover:underline"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteScheme(scheme)}
                            className="font-semibold text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}