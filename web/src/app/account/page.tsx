"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AccountDetails = {
  id: string;
  email: string;
  createdAt: string;
  fullName: string;
  ageRange: string;
  gender: string;
  state: string;
  district: string;
  educationLevel: string;
  occupation: string;
  subOccupation: string;
  annualFamilyIncome: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const supabase = createClient();

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select(
            "full_name, age_range, gender, state, district, education_level, occupation, sub_occupation, annual_family_income"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (!active) return;

        if (profileError) {
          console.error("Profile fetch error:", profileError.message);
          setError("Unable to load your profile details.");
        }

        setAccount({
          id: user.id,
          email: user.email ?? "Not available",
          createdAt: user.created_at,
          fullName:
            profile?.full_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "Not provided",
          ageRange: profile?.age_range || "Not provided",
          gender: profile?.gender || "Not provided",
          state: profile?.state || "Not provided",
          district: profile?.district || "Not provided",
          educationLevel: profile?.education_level || "Not provided",
          occupation: profile?.occupation || "Not provided",
          subOccupation: profile?.sub_occupation || "Not provided",
          annualFamilyIncome:
            profile?.annual_family_income || "Not provided",
        });
      } catch (err) {
        console.error("Account loading error:", err);

        if (active) {
          setError("Something went wrong while loading your account.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    setError("");

    const supabase = createClient();

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError("Unable to sign out. Please try again.");
      setSigningOut(false);
      return;
    }

    router.replace("/auth");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
          <p className="text-sm text-slate-600">
            Loading your account...
          </p>
        </div>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Account unavailable
        </h1>
        <p className="mt-3 text-slate-600">
          Please sign in to view your account.
        </p>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
        >
          Go to Login
        </Link>
      </main>
    );
  }

  const details = [
    { label: "Age Range", value: account.ageRange },
    { label: "Gender", value: account.gender },
    { label: "State", value: account.state },
    { label: "District", value: account.district },
    { label: "Education", value: account.educationLevel },
    { label: "Occupation", value: account.occupation },
    { label: "Sub-occupation", value: account.subOccupation },
    { label: "Annual Family Income", value: account.annualFamilyIncome },
  ];

  const initials =
    account.fullName === "Not provided"
      ? "U"
      : account.fullName
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Page heading */}
        <div className="mb-8">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-700"
          >
            <span aria-hidden="true">←</span>
            Back to Home
          </Link>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            My Account
          </h1>

          <p className="mt-2 text-slate-600">
            Manage your account and view your registration details.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Account overview */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-2 bg-blue-700" />

          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-800">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">
                Registered User
              </p>

              <h2 className="mt-1 break-words text-2xl font-bold text-slate-900">
                {account.fullName}
              </h2>

              <p className="mt-2 break-all text-sm text-slate-600">
                {account.email}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Member since{" "}
                {new Date(account.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                <span className="size-2 rounded-full bg-green-500" />
                Signed In
              </span>

              <Link
                href="/profile"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </section>

        {/* Registration details */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Registration Details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Information saved in your YojnaMitra profile.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Full Name
              </p>
              <p className="mt-2 break-words font-semibold text-slate-900">
                {account.fullName}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Email Address
              </p>
              <p className="mt-2 break-all font-semibold text-slate-900">
                {account.email}
              </p>
            </div>

            {details.map((detail) => (
              <div
                key={detail.label}
                className="rounded-xl bg-slate-50 p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {detail.label}
                </p>

                <p className="mt-2 break-words font-semibold text-slate-900">
                  {detail.value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Your account information is displayed from your authenticated
            account and saved profile. Use Edit Profile to update your
            personal details.
          </p>
        </section>

        {/* Account actions */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            Account Actions
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            You can update your profile or sign out of your account.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Update My Profile
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center justify-center rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? "Signing Out..." : "Sign Out"}
            </button>
          </div>
        </section>

        {/* Scheme discovery */}
        <section className="mt-6 rounded-2xl bg-blue-900 p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
          <div>
            <h2 className="text-xl font-bold">
              Discover Government Schemes
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Explore schemes that may be relevant to your needs.
            </p>
          </div>

          <Link
            href="/schemes"
            className="mt-5 inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-900 transition hover:bg-blue-50 sm:mt-0"
          >
            Find Schemes
          </Link>
        </section>
      </div>
    </main>
  );
}

