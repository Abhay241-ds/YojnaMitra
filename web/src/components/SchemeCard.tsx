"use client";

import { useCopy } from "@/lib/i18n";

interface SchemeCardProps {
  name: string;
  department: string;
  description: string;
  financialAid: string;
  eligibility: "eligible" | "check" | "not-eligible";
}

export default function SchemeCard({
  name,
  department,
  description,
  financialAid,
  eligibility,
}: SchemeCardProps) {
  const copy = useCopy();

  const getEligibilityBadge = () => {
    switch (eligibility) {
      case "eligible":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <svg className="w-3 h-3 mr-1 fill-current" viewBox="0 0 20 20">
              <path
                clipRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                fillRule="evenodd"
              />
            </svg>
            {copy.schemes.eligible}
          </span>
        );
      case "check":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            {copy.schemes.checkEligibility}
          </span>
        );
      case "not-eligible":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
            {copy.schemes.notEligible}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
      <div>
        <h3 className="font-bold text-gray-900 text-sm leading-snug">{name}</h3>
        <p className="text-[11px] text-gray-500 mt-0.5 mb-2 font-medium">{department}</p>
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{description}</p>
        <div className="mt-3 text-xs font-semibold text-gray-800">
          {copy.schemes.financialAid}: <span className="text-gray-950 font-bold">{financialAid}</span>
        </div>
        <div className="mt-2.5">{getEligibilityBadge()}</div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <button
          className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors duration-150"
          type="button"
        >
          {copy.schemes.viewDetails}
        </button>
        <button
          className="text-gray-400 hover:text-gray-600 p-1"
          title={copy.schemes.saveScheme}
          type="button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
