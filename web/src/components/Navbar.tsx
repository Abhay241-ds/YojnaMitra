"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoMark from "./LogoMark";
import LanguageSwitch from "./LanguageSwitch";
import { createClient } from "@/lib/supabase/client";

type Language = "en" | "hi";

const links = [
  { label: { en: "Home", hi: "होम" }, href: "/" },
  { label: { en: "Profile", hi: "प्रोफ़ाइल" }, href: "/profile" },
  { label: { en: "Schemes", hi: "योजनाएँ" }, href: "/schemes" },
];

function isActive(pathname: string, href: string) {
  if (href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkBase =
  "whitespace-nowrap rounded-lg px-4 py-2.5 text-base transition-colors";

const desktopLink = (active: boolean) =>
  active
    ? `${linkBase} bg-brand-navy/10 font-semibold text-brand-navy`
    : `${linkBase} font-medium text-slate-600 hover:bg-brand-navy/5 hover:text-slate-900`;

const mobileLink = (active: boolean) =>
  active
    ? "block rounded-lg bg-brand-navy/10 px-4 py-3 text-base font-semibold text-brand-navy"
    : "block rounded-lg px-4 py-3 text-base font-medium text-slate-700 hover:bg-brand-navy/5";

function PersonIcon() {
  return (
    <svg
      className="size-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");

  const close = () => setOpen(false);
  const t = (en: string, hi: string) => (language === "hi" ? hi : en);

  useEffect(() => {
    // Keep Navbar labels in sync with the existing LanguageSwitch component.
    const readLanguage = () => {
      const htmlLang = document.documentElement.lang.toLowerCase();
      setLanguage(htmlLang === "hi" || htmlLang.startsWith("hi-") ? "hi" : "en");
    };

    readLanguage();

    const observer = new MutationObserver(readLanguage);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function checkUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error) {
          setIsLoggedIn(false);
        } else {
          setIsLoggedIn(!!user);
        }
      } catch {
        if (mounted) setIsLoggedIn(false);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setIsLoggedIn(!!session?.user);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Close the mobile menu after route changes.
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div
        aria-hidden="true"
        className="h-1 w-full bg-[linear-gradient(to_right,#E67E22,#FFFFFF,#3C9A4E)]"
      />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 md:h-20 lg:px-12">
        {/* Logo */}
        <Link
          href="/"
          onClick={close}
          className="flex items-center gap-2 md:gap-3"
          aria-label="YojnaMitra home"
        >
          <LogoMark className="h-8 w-auto sm:h-10 md:h-12" />

          <span className="flex flex-col">
            <span className="text-base font-bold leading-tight text-brand-navy sm:text-xl md:text-2xl">
              YojnaMitra
            </span>
            <span className="hidden text-sm font-medium text-slate-600 md:block">
              {t("Civic Scheme Discovery", "सरकारी योजनाओं की खोज")}
            </span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label={t("Main navigation", "मुख्य नेविगेशन")} className="hidden items-center gap-1 p-1 xl:flex">
          {links.map((link) => {
            const active = isActive(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={desktopLink(active)}
              >
                {link.label[language]}
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          <LanguageSwitch />

          {!authLoading && !isLoggedIn && (
            <Link
              href="/auth"
              className="hidden items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-base font-medium text-brand-navy transition-colors hover:bg-brand-navy/5 md:inline-flex"
            >
              {t("Login", "लॉग इन")}
            </Link>
          )}

          {!authLoading && isLoggedIn && (
            <Link
              href="/account"
              aria-label={t("My account", "मेरा अकाउंट")}
              title={t("My account", "मेरा अकाउंट")}
              className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white lg:flex"
            >
              <PersonIcon />
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label={open ? t("Close menu", "मेन्यू बंद करें") : t("Open menu", "मेन्यू खोलें")}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg p-2 text-brand-navy hover:bg-brand-navy/5 xl:hidden"
          >
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav
          id="mobile-menu"
          aria-label={t("Mobile navigation", "मोबाइल नेविगेशन")}
          className="border-t border-slate-200/70 bg-white px-4 pb-4 pt-2 sm:px-6 xl:hidden"
        >
          <ul className="space-y-1">
            {links.map((link) => {
              const active = isActive(pathname, link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={mobileLink(active)}
                  >
                    {link.label[language]}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex flex-col gap-2 border-t border-slate-200/70 pt-3">
            <Link
              href="/schemes"
              onClick={close}
              className="rounded-lg bg-brand-navy px-4 py-3 text-center text-sm font-semibold text-white md:hidden"
            >
              {t("Get Started", "शुरू करें")}
            </Link>

            {!authLoading && !isLoggedIn && (
              <Link
                href="/auth"
                onClick={close}
                className="rounded-lg border border-brand-navy/30 px-4 py-3 text-center text-sm font-semibold text-brand-navy md:hidden"
              >
                {t("Login", "लॉग इन")}
              </Link>
            )}

            {!authLoading && isLoggedIn && (
              <Link
                href="/account"
                onClick={close}
                className="rounded-lg border border-brand-navy/30 px-4 py-3 text-center text-sm font-semibold text-brand-navy"
              >
                {t("My Account", "मेरा अकाउंट")}
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
