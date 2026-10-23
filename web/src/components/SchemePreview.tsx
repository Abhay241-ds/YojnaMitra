"use client";

import { useState } from "react";
import Link from "next/link";
import { useCopy, useLang } from "@/lib/i18n";
import { sampleSchemes, workTypes, type WorkType } from "@/lib/sampleSchemes";

export default function Hero() {
  const c = useCopy();
  const { lang } = useLang();
  const [work, setWork] = useState<WorkType>("farmer");

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-20">
      <div>
        <h1 className="font-display text-4xl leading-[1.3] text-neel sm:text-5xl lg:text-6xl lg:leading-[1.25]">
          {c.hero.title}
        </h1>
        <p className="mt-6 max-w-[34rem] text-lg leading-relaxed sm:text-xl">{c.hero.sub}</p>
        <p className="mt-5 max-w-[34rem] border-l-4 border-haldi pl-4 text-base text-syahi/80">
          {c.hero.trust}
        </p>
      </div>

      <div className="rounded-2xl border-2 border-neel bg-white p-5 shadow-[6px_6px_0_0_#1F2A6B] sm:p-7">
        <fieldset>
          <legend className="font-display text-2xl text-neel">{c.hero.cardTitle}</legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {workTypes.map((w) => (
              <label key={w} className="cursor-pointer">
                <input
                  type="radio"
                  name="work"
                  value={w}
                  checked={work === w}
                  onChange={() => setWork(w)}
                  className="peer sr-only"
                />
                <span className="block rounded-full border-2 border-neel px-4 py-2 text-base font-semibold text-neel peer-checked:bg-neel peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neel">
                  {c.hero.work[w]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-syahi/70">{c.hero.resultsTitle}</h2>
          <ul className="mt-2 divide-y divide-neel/15 rounded-lg border border-neel/20">
            {sampleSchemes[work].map((s) => (
              <li key={s.name.en} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-semibold text-neel">{s.name[lang]}</p>
                  <p className="text-sm text-syahi/70">{s.category[lang]}</p>
                </div>
                <span className="shrink-0 rounded-full bg-haldi/25 px-2.5 py-0.5 text-sm font-semibold text-neel">
                  {c.hero.example}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-syahi/70">{c.hero.sampleNote}</p>
        </div>

        <Link
          href="/auth"
          className="mt-6 block rounded-lg bg-haldi px-5 py-3 text-center text-lg font-bold text-neel hover:bg-haldi-deep"
        >
          {c.hero.cta}
        </Link>
        <p className="mt-3 text-sm text-syahi/70">{c.hero.askLater}</p>
      </div>
    </section>
  );
}