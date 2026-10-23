"use client";

import { useLang } from "@/lib/i18n";

const base =
  "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3";
const on = "bg-white text-brand-navy shadow-[0_1px_3px_rgba(0,0,0,0.08)]";
const off = "text-slate-600 hover:text-slate-900";

export default function LanguageSwitch() {
  const { lang, setLang } = useLang();

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center rounded-full bg-slate-200/70 p-1"
    >
      <button
        type="button"
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
        className={`${base} ${lang === "en" ? on : off}`}
      >
        English
      </button>
      <button
        type="button"
        lang="hi"
        aria-pressed={lang === "hi"}
        onClick={() => setLang("hi")}
        className={`${base} ${lang === "hi" ? on : off}`}
      >
        हिन्दी
      </button>
    </div>
  );
}