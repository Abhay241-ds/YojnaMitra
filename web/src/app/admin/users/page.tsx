"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type UserProfile = {
  user_id: string;
  full_name: string | null;
  age_range: string | null;
  gender: string | null;
  state: string | null;
  district: string | null;
  education_level: string | null;
  occupation: string | null;
  sub_occupation: string | null;
  annual_family_income: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatIncome(value: number | string | null) {
  if (value === null || value === undefined || value === "") return "Not provided";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(numeric);
}

export default function UsersPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [occupationFilter, setOccupationFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const loadUsers = useCallback(async () => {
    setError("");
    const { data, error: queryError } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, age_range, gender, state, district, education_level, occupation, sub_occupation, annual_family_income, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (queryError) throw queryError;
    setUsers((data ?? []) as UserProfile[]);
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

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
        await loadUsers();
      } catch (err) {
        console.error("Users page error:", err);
        if (active) setError(err instanceof Error ? err.message : "Unable to load registered users.");
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();
    return () => { active = false; };
  }, [supabase, router, loadUsers]);

  const states = useMemo(
    () => Array.from(new Set(users.map((user) => user.state).filter((value): value is string => Boolean(value)))).sort(),
    [users]
  );
  const occupations = useMemo(
    () => Array.from(new Set(users.map((user) => user.occupation).filter((value): value is string => Boolean(value)))).sort(),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !query || [
        user.full_name, user.user_id, user.state, user.district, user.occupation,
        user.sub_occupation, user.education_level,
      ].some((value) => value?.toLowerCase().includes(query));
      return matchesSearch &&
        (stateFilter === "all" || user.state === stateFilter) &&
        (occupationFilter === "all" || user.occupation === occupationFilter);
    });
  }, [users, search, stateFilter, occupationFilter]);

  async function refreshUsers() {
    setRefreshing(true);
    try {
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh users.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
        <p className="text-sm font-medium text-slate-600">Loading user management…</p>
      </div>
    </div>;
  }

  if (!authorized) {
    return <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      {error || "Redirecting to the appropriate page…"}
    </div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" /> Admin workspace
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">User Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Browse registered user profiles and review profile completeness. Authentication credentials are not exposed here.
          </p>
        </div>
        <button type="button" onClick={refreshUsers} disabled={refreshing}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
          ↻ {refreshing ? "Refreshing…" : "Refresh users"}
        </button>
      </header>

      {error && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="break-words">{error}</p>
        <button type="button" onClick={() => setError("")} className="self-start font-semibold underline sm:self-auto">Dismiss</button>
      </div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Profile records" value={users.length} hint="Rows returned by the profile query" icon="♙" tone="blue" />
        <StatCard label="States represented" value={states.length} hint="Unique states in saved profiles" icon="⌖" tone="green" />
        <StatCard label="Occupations" value={occupations.length} hint="Unique occupation groups" icon="▦" tone="violet" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Registered profiles</h2>
            <p className="mt-1 text-sm text-slate-500">Showing {filteredUsers.length} of {users.length} profiles</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <label className="relative block sm:min-w-64">
              <span className="sr-only">Search profiles</span>
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, district, ID…"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </label>
            <label>
              <span className="sr-only">Filter by state</span>
              <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                <option value="all">All states</option>
                {states.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by occupation</span>
              <select value={occupationFilter} onChange={(event) => setOccupationFilter(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                <option value="all">All occupations</option>
                {occupations.map((occupation) => <option key={occupation} value={occupation}>{occupation}</option>)}
              </select>
            </label>
          </div>
        </div>

        {filteredUsers.length === 0 ? <div className="px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-500">♙</div>
          <h3 className="font-semibold text-slate-900">{users.length === 0 ? "No user profiles found" : "No matching profiles"}</h3>
          <p className="mt-1 text-sm text-slate-500">{users.length === 0 ? "Profiles will appear here once users save their details." : "Try a different search term or filter."}</p>
        </div> : <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                <th className="px-6 py-4 font-semibold">User</th><th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Occupation</th><th className="px-6 py-4 font-semibold">Education</th>
                <th className="px-6 py-4 font-semibold">Income</th><th className="px-6 py-4 font-semibold">Profile updated</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => <tr key={user.user_id} className="transition hover:bg-slate-50/80">
                  <td className="max-w-[240px] px-6 py-4"><p className="truncate font-semibold text-slate-900">{user.full_name || "Name not provided"}</p><p className="mt-1 font-mono text-xs text-slate-500">{user.user_id.slice(0, 8)}…</p></td>
                  <td className="px-6 py-4 text-slate-600"><p>{user.district || "District not provided"}</p><p className="mt-1 text-xs text-slate-500">{user.state || "State not provided"}</p></td>
                  <td className="px-6 py-4 text-slate-600">{user.occupation || "Not provided"}{user.sub_occupation ? <p className="mt-1 text-xs text-slate-500">{user.sub_occupation}</p> : null}</td>
                  <td className="px-6 py-4 text-slate-600">{user.education_level || "Not provided"}</td>
                  <td className="px-6 py-4 text-slate-600">{formatIncome(user.annual_family_income)}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(user.updated_at || user.created_at)}</td>
                  <td className="px-6 py-4 text-right"><button type="button" onClick={() => setSelectedUser(user)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">View profile</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {filteredUsers.map((user) => <article key={user.user_id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0">
                <h3 className="break-words font-semibold text-slate-900">{user.full_name || "Name not provided"}</h3>
                <p className="mt-1 font-mono text-xs text-slate-500">{user.user_id.slice(0, 8)}…</p>
              </div><span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{user.occupation || "Occupation n/a"}</span></div>
              <p className="mt-3 text-sm text-slate-600">{[user.district, user.state].filter(Boolean).join(", ") || "Location not provided"}</p>
              <p className="mt-1 text-sm text-slate-500">{user.education_level || "Education not provided"}</p>
              <button type="button" onClick={() => setSelectedUser(user)} className="mt-4 min-h-10 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">View profile</button>
            </article>)}
          </div>
        </>}
      </section>

      {selectedUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUser(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4"><div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">User profile</p>
            <h2 id="profile-dialog-title" className="mt-2 text-xl font-bold text-slate-950">{selectedUser.full_name || "Name not provided"}</h2>
            <p className="mt-1 break-all font-mono text-xs text-slate-500">{selectedUser.user_id}</p>
          </div><button type="button" onClick={() => setSelectedUser(null)} aria-label="Close profile details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">✕</button></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Detail label="Age range" value={selectedUser.age_range} /><Detail label="Gender" value={selectedUser.gender} />
            <Detail label="State" value={selectedUser.state} /><Detail label="District" value={selectedUser.district} />
            <Detail label="Education" value={selectedUser.education_level} /><Detail label="Occupation" value={selectedUser.occupation} />
            <Detail label="Sub-occupation" value={selectedUser.sub_occupation} />
            <Detail label="Annual family income" value={formatIncome(selectedUser.annual_family_income)} />
            <Detail label="Profile created" value={formatDate(selectedUser.created_at)} /><Detail label="Last updated" value={formatDate(selectedUser.updated_at)} />
          </div>
          <p className="mt-6 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Profile data is personal information. Access it only for legitimate administration and keep permissions restricted.</p>
        </section>
      </div>}

      <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">ⓘ</div><div>
          <h2 className="font-bold text-slate-900">Privacy and backend notes</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            This page reads profile records from <code className="rounded bg-white px-1 py-0.5 text-xs">user_profiles</code>; it does not retrieve authentication emails or passwords. Ensure Supabase Row Level Security restricts profile reads to authorized admins. Client-side route checks alone are not a security boundary.
          </p>
        </div></div>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint, icon, tone }: {
  label: string; value: number; hint: string; icon: string; tone: "blue" | "green" | "violet";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-start justify-between gap-3"><div>
      <p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div><div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold ring-1 ${tones[tone]}`}>{icon}</div></div>
  </div>;
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-xl border border-slate-200 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 break-words text-sm font-medium text-slate-900">{value || "Not provided"}</p>
  </div>;
}
