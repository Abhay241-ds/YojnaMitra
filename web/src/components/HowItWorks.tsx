"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function HowItWorks() {
  const { lang } = useLang();
  const isHindi = lang === "hi";

  const steps = [
    {
      title: isHindi ? "प्रोफ़ाइल बनाएँ" : "Enter Profile",
      text: isHindi
        ? "अपनी बुनियादी जानकारी दें, जैसे उम्र, स्थान और व्यवसाय।"
        : "Share basic details (age, location, occupation)",
      iconStyle: "bg-amber-100 text-amber-600",
      icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
      action: {
        label: isHindi ? "प्रोफ़ाइल बनाएँ" : "Create Profile",
        href: "/auth",
      },
    },
    {
      title: isHindi ? "योजनाएँ खोजें" : "Discover Schemes",
      text: isHindi
        ? "हमारा प्लेटफ़ॉर्म आपके लिए उपयोगी सरकारी योजनाएँ खोजने में मदद करता है।"
        : "Our platform matches you with relevant schemes instantly",
      iconStyle: "bg-blue-100 text-blue-600",
      icon: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
      action: null,
    },
    {
      title: isHindi ? "आवेदन करें और स्थिति जानें" : "Apply & Track",
      text: isHindi
        ? "आवेदन करने के लिए मार्गदर्शन और आधिकारिक लिंक प्राप्त करें।"
        : "Get guided application links and track your status",
      iconStyle: "bg-amber-100 text-amber-600",
      icon: "M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z",
      action: null,
    },
  ];

  return (
    <section
      id="how"
      className="scroll-mt-24 space-y-7"
      aria-labelledby="how-title"
    >
      <div className="space-y-1.5 text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {isHindi ? "यह कैसे काम करता है" : "How It Works"}
        </span>

        <h2
          id="how-title"
          className="text-2xl font-bold text-brand-navy sm:text-3xl"
        >
          {isHindi
            ? "योजनामित्र का उपयोग करना आसान है"
            : "Navigating YojnaMitra is Easy"}
        </h2>
      </div>

      <ol className="grid grid-cols-1 gap-6 pt-1 md:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="relative rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
          >
            <div
              aria-hidden="true"
              className="absolute -top-3 left-5 flex size-7 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white ring-4 ring-brand-bg"
            >
              {index + 1}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${step.iconStyle}`}
                >
                  <svg
                    className="size-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d={step.icon} />
                  </svg>
                </span>

                <h3 className="text-base font-bold text-slate-900">
                  {step.title}
                </h3>
              </div>

              <p className="min-h-[40px] text-sm leading-relaxed text-slate-600">
                {step.text}
              </p>

              {step.action && (
                <div className="pt-2">
                  <Link
                    href={step.action.href}
                    className="inline-block rounded-lg bg-brand-navy px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-navy-dark"
                  >
                    {step.action.label}
                  </Link>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
