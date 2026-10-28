"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminUser = {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  app_metadata?: Record<string, unknown>;
};

export default function SettingsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [logoutError, setLogoutError] = useState("");

  const initialize = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user: userData },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(`Authentication check failed: ${authError.message}`);
      }

      if (!userData) {
        setAuthorized(false);
        router.replace("/auth");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", userData.id)
        .maybeSingle();

      if (adminError) {
        throw new Error(`Admin verification failed: ${adminError.message}`);
      }

      if (!admin) {
        setAuthorized(false);
        router.replace("/");
        return;
      }

      setUser({
        id: userData.id,
        email: userData.email ?? undefined,
        created_at: userData.created_at,
        last_sign_in_at: userData.last_sign_in_at,
        app_metadata: userData.app_metadata,
      });
      setAuthorized(true);
    } catch (err: unknown) {
      console.error("Admin settings initialization failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load settings. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAuthorized(false);
        router.replace("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [initialize, router, supabase]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/auth");
      router.refresh();
    } catch (err: unknown) {
      console.error("Admin sign out failed:", err);
      setLogoutError(
        err instanceof Error ? err.message : "Unable to sign out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">
            Verifying administrator access…
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center px-5">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-xl font-bold text-amber-700">
            !
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-900">
            Admin access required
          </h1>
          <p className="mt-2 break-words text-sm leading-6 text-slate-600">
            {error || "You are being redirected to the appropriate page."}
          </p>
          {error && (
            <button
              type="button"
              onClick={() => void initialize()}
              className="mt-5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : "Not available";
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : "Not available";

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            Administration
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review your administrator account, dashboard preferences, and
            account security options.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Admin account verified
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-700">
                  A
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Admin profile</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Account details from Supabase Authentication
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <ProfileRow label="Email address">
                <span className="break-all font-medium text-slate-900">
                  {user?.email || "Email not available"}
                </span>
              </ProfileRow>
              <ProfileRow label="User ID">
                <span className="break-all font-mono text-xs text-slate-700 sm:text-sm">
                  {user?.id}
                </span>
              </ProfileRow>
              <ProfileRow label="Role">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                  Administrator
                </span>
              </ProfileRow>
              <ProfileRow label="Account created">
                <span className="text-sm text-slate-700">{createdAt}</span>
              </ProfileRow>
              <ProfileRow label="Last sign in">
                <span className="text-sm text-slate-700">{lastSignIn}</span>
              </ProfileRow>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg font-bold text-violet-700">
                ◫
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-slate-900">
                  Dashboard preferences
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  The admin sidebar can be expanded or collapsed using the
                  sidebar toggle. This preference is currently controlled by
                  the admin layout.
                </p>
                <div className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <span className="mt-0.5 text-blue-700">i</span>
                  <p className="text-xs leading-5 text-slate-600">
                    Theme and notification preferences are not saved from this
                    page yet. No settings are changed automatically.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-lg font-bold text-amber-700">
                ◈
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-900">Account security</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Change your password using the existing authentication
                  workflow.
                </p>
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Password
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      You may be asked to verify your identity.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/auth/reset-password")}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    Change password
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-[#102544] to-[#1d416e] p-6 text-white shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">
              ✓
            </div>
            <h2 className="mt-4 text-lg font-bold">YojnaMitra Admin</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Your admin account is verified for this session. Continue to
              protect your login credentials and sign out on shared devices.
            </p>
            <LinkButton onClick={() => router.push("/admin")}>
              Back to dashboard
            </LinkButton>
          </section>

          <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="border-b border-red-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 font-bold text-red-700">
                  !
                </span>
                <h2 className="font-bold text-red-900">Danger zone</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sign out of your administrator account on this device.
              </p>
            </div>

            <div className="p-5">
              {logoutError && (
                <p
                  role="alert"
                  className="mb-3 break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  {logoutError}
                </p>
              )}
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-700 border-t-transparent" />
                    Signing out…
                  </>
                ) : (
                  "Sign out"
                )}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="min-w-0 sm:max-w-[65%] sm:text-right">{children}</div>
    </div>
  );
}

function LinkButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#102544] transition hover:bg-blue-50"
    >
      {children}
    </button>
  );
}
