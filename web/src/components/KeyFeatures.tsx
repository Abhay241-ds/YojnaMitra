"use client";

import { useLang } from "@/lib/i18n";

const features = [
  {
    title: {
      en: "Personalized Matches",
      hi: "आपके लिए उपयुक्त योजनाएँ",
    },
    text: {
      en: "Tailored suggestions based on your profile",
      hi: "आपकी प्रोफ़ाइल के आधार पर योजनाओं के सुझाव",
    },
    icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5",
  },
  {
    title: {
      en: "Eligibility Checker",
      hi: "पात्रता जाँच",
    },
    text: {
      en: "Instantly check if you qualify for any scheme",
      hi: "जानें कि आप किसी योजना के लिए पात्र हैं या नहीं",
    },
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  {
    title: {
      en: "Real-Time Updates",
      hi: "नवीनतम अपडेट",
    },
    text: {
      en: "Get notified about new schemes and deadlines",
      hi: "नई योजनाओं और आवेदन की अंतिम तिथियों की जानकारी पाएँ",
    },
    icon: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0",
  },
  {
    title: {
      en: "Easy Documentation",
      hi: "दस्तावेज़ों की आसान जानकारी",
    },
    text: {
      en: "Hassle-free document guidance and access",
      hi: "ज़रूरी दस्तावेज़ों और उन्हें प्राप्त करने की सरल जानकारी",
    },
    icon: "M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z",
  },
];

export default function KeyFeatures() {
  const { lang } = useLang();
  const isHindi = lang === "hi";

  return (
    <section
      className="space-y-6 pt-2"
      aria-labelledby="features-title"
    >
      <h2
        id="features-title"
        className="text-center text-2xl font-bold text-brand-navy sm:text-3xl"
      >
        {isHindi ? "योजनामित्र की प्रमुख विशेषताएँ" : "Key Features of YojnaMitra"}
      </h2>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <li
            key={feature.title.en}
            className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d={feature.icon}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <h3 className="text-sm font-bold text-slate-900">
                {isHindi ? feature.title.hi : feature.title.en}
              </h3>
            </div>

            <p className="text-sm leading-normal text-slate-600">
              {isHindi ? feature.text.hi : feature.text.en}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
