"use client";

import Link from "next/link";
import HeroIllustration from "@/components/HeroIllustration";
import HowItWorks from "@/components/HowItWorks";
import KeyFeatures from "@/components/KeyFeatures";
import { useLang } from "@/lib/i18n";

export default function Home() {
  const { lang } = useLang();
  const isHindi = lang === "hi";

  const content = {
    title: isHindi
      ? "अपने लिए सही सरकारी योजनाएँ खोजें"
      : "Find Government Schemes Made for You",

    description: isHindi
      ? "केंद्र और राज्य सरकार की कल्याणकारी योजनाओं को आसानी से जानें और उनका लाभ उठाएँ। सरल, पारदर्शी और सभी के लिए सुलभ।"
      : "Your trusted guide to navigate and access central & state government welfare schemes effortlessly. Simple, transparent, and accessible.",

    getStarted: isHindi ? "शुरू करें" : "Get Started",
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-16 px-6 py-10 lg:px-12">
      <section className="grid grid-cols-1 items-center gap-8 pb-6 pt-2 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-6">
          <h1 className="text-4xl font-extrabold leading-[1.18] tracking-tight text-brand-navy sm:text-5xl lg:text-[3.1rem]">
            {content.title}
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {content.description}
          </p>

          <div className="pt-2">
            <Link
              href="/schemes"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-navy px-7 py-3 text-base font-medium text-white shadow-sm transition duration-200 hover:bg-brand-navy-dark hover:shadow"
            >
              <span>{content.getStarted}</span>

              <svg
                className="mt-0.5 size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:col-span-6 lg:justify-end">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
            <HeroIllustration />
          </div>
        </div>
      </section>

      <HowItWorks />
      <KeyFeatures />
    </main>
  );
}
