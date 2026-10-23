"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthIllustration from "./AuthIllustration";

type Mode = "login" | "register";

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("already registered")) return "This email is already registered. Please log in instead.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a few minutes and try again.";
  return message;
}

/* ---------- Icons ---------- */
function MailIcon() {
  return (
    <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 20 20">
      <path d="M3 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3 7 7 5 7-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect height="11" rx="2" ry="2" width="18" x="3" y="11" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      {off ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="1" x2="23" y1="1" y2="23" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

/* ---------- Input field ---------- */
type FieldProps = {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  icon: ReactNode;
  trailing?: ReactNode;
};

function Field({ id, label, type = "text", value, onChange, placeholder, autoComplete, icon, trailing }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400"
        >
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`block w-full rounded-md border border-slate-300 bg-white py-2.5 pl-11 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/25 ${
            trailing ? "pr-11" : "pr-4"
          }`}
        />
        {trailing}
      </div>
    </div>
  );
}

/* ---------- Main view ---------- */
export default function AuthView() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setFormError(null);
    setNotice(null);
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setFormError(friendlyError(authError.message));
        return;
      }

      // Profile hai to schemes par, nahi to profile bharne ke liye
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      router.replace(profile ? "/schemes" : "/profile");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });

      if (authError) {
        setFormError(friendlyError(authError.message));
        return;
      }

      // Email already registered (confirmation on hone par Supabase yahi deta hai)
      if (data.user?.identities && data.user.identities.length === 0) {
        setFormError("This email is already registered. Please log in instead.");
        return;
      }

      // Confirmation off hai: user seedha logged in hota hai
      if (data.session) {
        router.replace("/profile");
        router.refresh();
        return;
      }

      // Confirmation on hai: email check karna hoga
      setPassword("");
      setConfirm("");
      setMode("login");
      setNotice("Account created. Open the confirmation link we emailed you, then log in.");
    } catch {
      setFormError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? "Hide password" : "Show password"}
      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition-colors hover:text-slate-600"
    >
      <EyeIcon off={showPassword} />
    </button>
  );

  return (
    <main className="flex flex-1 flex-col lg:flex-row">
      {/* Left: welcome + illustration (sirf bade screen par) */}
      <section className="hidden flex-col justify-between border-r border-slate-100 bg-white px-14 py-12 lg:flex lg:w-1/2 xl:px-20">
        <div>
          <h2 className="text-4xl font-extrabold leading-snug tracking-tight text-brand-navy">
            Welcome to YojnaMitra
          </h2>
          <p className="mt-2 text-lg text-slate-600">
            Your gateway to government schemes and services
          </p>
        </div>

        <div className="my-6 flex flex-1 items-center justify-center">
          <AuthIllustration />
        </div>

        <p className="border-t border-slate-100 pt-5 text-xs text-slate-500">
          YojnaMitra is an independent information guide, not a government website.
        </p>
      </section>

      {/* Right: auth card */}
      <section className="flex flex-1 items-center justify-center bg-brand-bg px-4 py-10 sm:px-12 lg:px-16 lg:py-14">
        <div className="w-full max-w-[440px] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
          <div
            role="tablist"
            aria-label="Log in or register"
            className="grid grid-cols-2 border-b border-slate-200"
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                id={`tab-${m}`}
                aria-selected={mode === m}
                aria-controls="auth-panel"
                onClick={() => switchMode(m)}
                className={`relative py-4 text-center text-base transition-colors ${
                  mode === m
                    ? "bg-white font-bold text-brand-navy"
                    : "font-medium text-slate-500 hover:text-slate-700"
                }`}
              >
                {m === "login" ? "Log In" : "Register"}
                {mode === m && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-sm bg-amber-500"
                  />
                )}
              </button>
            ))}
          </div>

          <div id="auth-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
              {mode === "login" ? "Welcome back!" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {mode === "login"
                ? "Enter your details below"
                : "Register to find schemes made for you"}
            </p>

            <div className="mt-5 space-y-3 empty:hidden">
              {formError && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              )}
              {notice && (
                <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {notice}
                </p>
              )}
            </div>

            <form
              onSubmit={mode === "login" ? handleLogin : handleRegister}
              className="mt-5 space-y-4"
            >
              {mode === "register" && (
                <Field
                  id="full-name"
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Full Name"
                  autoComplete="name"
                  icon={<UserIcon />}
                />
              )}

              <Field
                id="email"
                label="Email address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="Email Address"
                autoComplete="email"
                icon={<MailIcon />}
              />

              <Field
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder="Password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                icon={<LockIcon />}
                trailing={passwordToggle}
              />

              {mode === "register" && (
                <Field
                  id="confirm-password"
                  label="Confirm password"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  icon={<LockIcon />}
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md border-b-2 border-amber-500 bg-brand-navy px-4 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-brand-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
              </button>
            </form>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 text-center text-sm font-medium text-slate-600">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              className="ml-1 font-bold text-amber-700 hover:underline"
            >
              {mode === "login" ? "Register Now" : "Log In"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}