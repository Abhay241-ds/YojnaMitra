"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthIllustration from "./AuthIllustration";

type Mode = "login" | "register";

function friendlyError(message: string, language: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return language === "hi" ? "ईमेल या पासवर्ड गलत है।" : "Email or password is incorrect.";
  if (m.includes("email not confirmed")) return language === "hi" ? "कृपया पहले ईमेल की पुष्टि करें। लिंक के लिए अपना इनबॉक्स देखें।" : "Please confirm your email first. Check your inbox for the link.";
  if (m.includes("already registered")) return language === "hi" ? "यह ईमेल पहले से पंजीकृत है। कृपया लॉग इन करें।" : "This email is already registered. Please log in instead.";
  if (m.includes("rate limit")) return language === "hi" ? "बहुत अधिक प्रयास हुए हैं। कुछ मिनट बाद फिर कोशिश करें।" : "Too many attempts. Please wait a few minutes and try again.";
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
type AuthViewProps = {
  next?: string;
};

export default function AuthView({ next }: AuthViewProps) {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [language, setLanguage] = useState<"en" | "hi">("en");

  // Follow the existing Navbar language toggle through the document's lang attribute.
  useEffect(() => {
    const syncLanguage = () => {
      const current = document.documentElement.lang.toLowerCase();
      setLanguage(current === "hi" || current.startsWith("hi-") ? "hi" : "en");
    };

    syncLanguage();

    const observer = new MutationObserver(syncLanguage);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });

    return () => observer.disconnect();
  }, []);

  const bilingual = (en: string, hi: string) => language === "hi" ? hi : en;
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
        setFormError(friendlyError(authError.message, language));
        return;
      }

      // Admin links always require an explicit admin check after authentication.
      // The page component only passes a validated local /admin destination.
      const isAdminDestination = Boolean(
        next && (next === "/admin" || next.startsWith("/admin/"))
      );

      if (isAdminDestination) {
        const { data: admin, error: adminError } = await supabase
          .from("app_admins")
          .select("user_id")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (adminError) {
          setFormError(bilingual("We couldn’t verify administrator access. Please try again.", "एडमिन की अनुमति की पुष्टि नहीं हो सकी। कृपया फिर कोशिश करें।"));
          return;
        }

        if (!admin) {
          setFormError(
            bilingual("This account does not have administrator access. Please use an authorized admin account.", "इस खाते को एडमिन की अनुमति नहीं है। कृपया अधिकृत एडमिन खाते से लॉग इन करें।")
          );
          return;
        }

        router.replace(next!);
        router.refresh();
        return;
      }

      // Regular user login: profile hai to schemes par, nahi to profile page.
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (profileError) {
        setFormError(bilingual("You are signed in, but we couldn’t load your profile. Please try again.", "आप लॉग इन हो गए हैं, लेकिन प्रोफ़ाइल लोड नहीं हो सकी। कृपया फिर कोशिश करें।"));
        return;
      }

      router.replace(profile ? "/schemes" : "/profile");
      router.refresh();
    } catch {
      setFormError(bilingual("Something went wrong. Please check your connection and try again.", "कुछ गड़बड़ हुई। अपना इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);

    if (password.length < 8) {
      setFormError(bilingual("Password must be at least 8 characters.", "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।"));
      return;
    }
    if (password !== confirm) {
      setFormError(bilingual("Passwords do not match.", "दोनों पासवर्ड मेल नहीं खाते।"));
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
        setFormError(friendlyError(authError.message, language));
        return;
      }

      // Email already registered (confirmation on hone par Supabase yahi deta hai)
      if (data.user?.identities && data.user.identities.length === 0) {
        setFormError(bilingual("This email is already registered. Please log in instead.", "यह ईमेल पहले से पंजीकृत है। कृपया लॉग इन करें।"));
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
      setNotice(bilingual("Account created. Open the confirmation link we emailed you, then log in.", "खाता बन गया है। ईमेल में आए पुष्टि लिंक को खोलें, फिर लॉग इन करें।"));
    } catch {
      setFormError(bilingual("Something went wrong. Please check your connection and try again.", "कुछ गड़बड़ हुई। अपना इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।"));
    } finally {
      setLoading(false);
    }
  }

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? bilingual("Hide password", "पासवर्ड छिपाएँ") : bilingual("Show password", "पासवर्ड दिखाएँ")}
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
            {bilingual("Welcome to YojnaMitra", "YojnaMitra में आपका स्वागत है")}
          </h2>
          <p className="mt-2 text-lg text-slate-600">
            {bilingual("Your gateway to government schemes and services", "सरकारी योजनाओं और सेवाओं तक आपकी पहुँच")}
          </p>
        </div>

        <div className="my-6 flex flex-1 items-center justify-center">
          <AuthIllustration />
        </div>

        <p className="border-t border-slate-100 pt-5 text-xs text-slate-500">
          {bilingual("YojnaMitra is an independent information guide, not a government website.", "YojnaMitra एक स्वतंत्र सूचना मंच है, सरकारी वेबसाइट नहीं।")}
        </p>
      </section>

      {/* Right: auth card */}
      <section className="flex flex-1 items-center justify-center bg-brand-bg px-4 py-10 sm:px-12 lg:px-16 lg:py-14">
        <div className="w-full max-w-[440px] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
          <div
            role="tablist"
            aria-label={bilingual("Log in or register", "लॉग इन या रजिस्टर करें")}
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
                {m === "login" ? bilingual("Log In", "लॉग इन") : bilingual("Register", "रजिस्टर")}
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
              {next?.startsWith("/admin")
                ? mode === "login"
                  ? bilingual("Administrator sign in", "एडमिन लॉग इन")
                  : bilingual("Create your account", "अपना खाता बनाएँ")
                : mode === "login"
                  ? bilingual("Welcome back!", "स्वागत है!")
                  : bilingual("Create your account", "अपना खाता बनाएँ")}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {next?.startsWith("/admin") && mode === "login"
                ? bilingual("Sign in with an authorized administrator account to continue.", "आगे बढ़ने के लिए अधिकृत एडमिन खाते से लॉग इन करें।")
                : mode === "login"
                  ? bilingual("Enter your details below", "नीचे अपनी जानकारी भरें")
                  : bilingual("Register to find schemes made for you", "अपने लिए उपयुक्त योजनाएँ खोजने के लिए रजिस्टर करें")}
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
                  label={bilingual("Full name", "पूरा नाम")}
                  value={fullName}
                  onChange={setFullName}
                  placeholder={bilingual("Full Name", "पूरा नाम")}
                  autoComplete="name"
                  icon={<UserIcon />}
                />
              )}

              <Field
                id="email"
                label={bilingual("Email address", "ईमेल पता")}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder={bilingual("Email Address", "ईमेल पता")}
                autoComplete="email"
                icon={<MailIcon />}
              />

              <Field
                id="password"
                label={bilingual("Password", "पासवर्ड")}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder={bilingual("Password", "पासवर्ड")}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                icon={<LockIcon />}
                trailing={passwordToggle}
              />

              {mode === "register" && (
                <Field
                  id="confirm-password"
                  label={bilingual("Confirm password", "पासवर्ड की पुष्टि करें")}
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={setConfirm}
                  placeholder={bilingual("Confirm Password", "पासवर्ड दोबारा लिखें")}
                  autoComplete="new-password"
                  icon={<LockIcon />}
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md border-b-2 border-amber-500 bg-brand-navy px-4 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-brand-navy-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? bilingual("Please wait...", "कृपया प्रतीक्षा करें...") : mode === "login" ? bilingual("Log In", "लॉग इन") : bilingual("Create Account", "खाता बनाएँ")}
              </button>
            </form>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 text-center text-sm font-medium text-slate-600">
            {mode === "login" ? bilingual("Don’t have an account?", "खाता नहीं है?") : bilingual("Already have an account?", "पहले से खाता है?")}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              className="ml-1 font-bold text-amber-700 hover:underline"
            >
              {mode === "login" ? bilingual("Register Now", "अभी रजिस्टर करें") : bilingual("Log In", "लॉग इन")}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}