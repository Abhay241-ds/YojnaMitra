
"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  checkEligibility,
  type EligibilityResult,
  type UserProfile,
} from "@/lib/eligibility";

type SchemeRow = Record<string, unknown> & {
  id: string;
  name?: string | null;
  name_hi?: string | null;
  scheme_level?: string | null;
  target_state?: string | null;
  official_url?: string | null;
  is_active?: boolean | null;
};

type ProfileRecord = {
  age_range: string | null;
  state: string | null;
  occupation: string | null;
  annual_family_income: number | string | null;
};

type DetailSection = {
  id: string;
  title: string;
  value: unknown;
};

function toEligibilityProfile(profile: ProfileRecord): UserProfile {
  const income =
    profile.annual_family_income == null || profile.annual_family_income === ""
      ? null
      : Number(profile.annual_family_income);

  return {
    age: null,
    ageRange: profile.age_range,
    state: profile.state,
    occupation: profile.occupation,
    annual_family_income:
      income !== null && Number.isFinite(income) ? income : null,
  };
}

/** Safely turn strings, JSON, arrays and rich-text objects into readable text. */
function toPlainText(value: unknown): string {
  if (value == null) return "";

  if (typeof value === "string") {
    const text = value.trim();
    if (!text || text === "[]" || text === "{}" || text === "null") return "";

    if (
      (text.startsWith("{") && text.endsWith("}")) ||
      (text.startsWith("[") && text.endsWith("]"))
    ) {
      try {
        return toPlainText(JSON.parse(text));
      } catch {
        return text;
      }
    }

    return text;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toPlainText).filter(Boolean).join("\n");
  }

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (object.text != null) return toPlainText(object.text);
    if (object.children != null) return toPlainText(object.children);
    if (object.content != null) return toPlainText(object.content);
    if (object.value != null) return toPlainText(object.value);

    // Preserve useful key/value data if the object is not a rich-text node.
    return Object.entries(object)
      .filter(([, item]) => item != null && typeof item !== "object")
      .map(([key, item]) => `${key}: ${String(item)}`)
      .join("\n");
  }

  return "";
}

function firstAvailable(row: SchemeRow, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value != null && toPlainText(value).trim() !== "") return value;
  }
  return null;
}


function getUrl(value: unknown): string | null {
  const text = toPlainText(value).trim();
  if (!text) return null;

  const candidate = text.match(/https?:\/\/[^\s"'<>]+/i)?.[0] ?? text;
  if (!/^https?:\/\//i.test(candidate)) return null;

  try {
    const parsed = new URL(candidate);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function findUrlByKeys(row: SchemeRow, keys: string[]): string | null {
  for (const key of keys) {
    const url = getUrl(row[key]);
    if (url) return url;
  }
  return null;
}

function findGuidelineUrl(row: SchemeRow): string | null {
  const preferredKeys = [
    "guidelines_url", "guideline_url", "guidance_url",
    "guidelines_link", "guideline_link", "guidance_link",
    "scheme_guidelines_url", "scheme_guideline_url",
    "guidelines_pdf_url", "guideline_pdf_url", "guidelines_document_url",
    "guidelines", "guideline", "guidance",
  ];

  const preferred = findUrlByKeys(row, preferredKeys);
  if (preferred) return preferred;

  // Also support imported datasets where the column name differs slightly.
  const dynamicKey = Object.keys(row).find((key) =>
    /(guideline|guidance)/i.test(key) && /(url|link|pdf|document)/i.test(key)
  );
  return dynamicKey ? getUrl(row[dynamicKey]) : null;
}

function findOfficialUrl(row: SchemeRow): string | null {
  const preferredKeys = [
    "official_website_url", "official_website", "website_url",
    "official_site_url", "official_site", "scheme_website_url",
    "department_website", "ministry_website", "application_url",
    "apply_url", "portal_url", "official_url",
  ];
  const dynamicKeys = Object.keys(row).filter((key) =>
    /(official|website|portal|apply|application).*(url|link)|(url|link).*(official|website|portal|apply|application)/i.test(key) &&
    !/(guideline|guidance)/i.test(key)
  );
  const candidates = [...new Set([...preferredKeys, ...dynamicKeys])]
    .map((key) => getUrl(row[key]))
    .filter((url): url is string => Boolean(url));

  if (!candidates.length) return null;

  // If official_url points to the muScheme directory, prefer a distinct
  // scheme/department website URL when one is also stored in the row.
  const nonMuScheme = candidates.find((url) => !/muscheme/i.test(new URL(url).hostname));
  return nonMuScheme ?? candidates[0];
}


type SchemeReference = {
  title: string;
  category: string;
  url: string;
};

function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathPart = parsed.pathname
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();

    const rawTitle = pathPart || parsed.hostname.replace(/^www\./i, "");
    return rawTitle
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  } catch {
    return url;
  }
}

function extractReferences(row: SchemeRow): SchemeReference[] {
  const referenceFields = Object.entries(row).filter(([key]) =>
    /(reference|references|source|citation)/i.test(key)
  );

  const found: SchemeReference[] = [];
  const seen = new Set<string>();

  const add = (
    urlValue: unknown,
    titleValue?: unknown,
    categoryValue?: unknown
  ) => {
    const url = getUrl(urlValue);
    if (!url || seen.has(url)) return;
    seen.add(url);
    const title = toPlainText(titleValue).trim() || titleFromUrl(url);
    const category =
      toPlainText(categoryValue).trim() || "Reference";
    found.push({ title, category, url });
  };

  const visit = (
    value: unknown,
    inheritedTitle?: unknown,
    inheritedCategory?: unknown
  ) => {
    if (value == null) return;

    if (typeof value === "string") {
      const text = value.trim();
      if (!text) return;

      // Handle JSON stored as text.
      if (
        (text.startsWith("{") && text.endsWith("}")) ||
        (text.startsWith("[") && text.endsWith("]"))
      ) {
        try {
          visit(JSON.parse(text), inheritedTitle, inheritedCategory);
          return;
        } catch {
          // Continue and try to extract markdown/raw URLs.
        }
      }

      // Markdown links: [Readable title](https://...)
      const markdownLink = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi;
      let match: RegExpExecArray | null;
      let matched = false;
      while ((match = markdownLink.exec(text)) !== null) {
        add(match[2], match[1], inheritedCategory);
        matched = true;
      }

      // Raw URLs in reference text.
      const rawUrls = text.match(/https?:\/\/[^\s"'<>()[\]]+/gi) || [];
      rawUrls.forEach((url) => add(url, inheritedTitle, inheritedCategory));
      if (!matched && rawUrls.length === 0) {
        const directUrl = getUrl(text);
        if (directUrl) add(directUrl, inheritedTitle, inheritedCategory);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, inheritedTitle, inheritedCategory));
      return;
    }

    if (typeof value === "object") {
      const object = value as Record<string, unknown>;
      const title =
        object.title ??
        object.name ??
        object.label ??
        object.reference_title ??
        object.source_name ??
        object.description ??
        inheritedTitle;

      const category =
        object.category ??
        object.type ??
        object.reference_type ??
        object.source_type ??
        object.document_type ??
        inheritedCategory;

      const urlValue =
        object.url ??
        object.href ??
        object.link ??
        object.reference_url ??
        object.source_url ??
        object.website ??
        object.pdf_url;

      if (urlValue != null) add(urlValue, title, category);

      // Some imported records nest reference objects under other properties.
      for (const [key, nested] of Object.entries(object)) {
        if (
          ["title", "name", "label", "description", "reference_title", "source_name",
           "url", "href", "link", "reference_url", "source_url", "website", "pdf_url"]
            .includes(key)
        ) continue;
        visit(nested, title, category);
      }
    }
  };

  referenceFields.forEach(([fieldName, value]) => {
    const fieldCategory = formatLabel(fieldName);
    visit(value, undefined, fieldCategory);
  });

  // Preserve order while avoiding duplicate URLs.
  return found;
}

type ApplicationProcessContent = {
  mode: string | null;
  intro: string | null;
  steps: string[];
  tracking: string | null;
  extra: string[];
};

function cleanApplicationMarkup(input: string): string {
  return input
    .replace(/\\\*/g, "*")
    .replace(/\*\*/g, "")
    // Normalize nested markdown links such as:
    // [official website]([https://example.com](https://example.com))
    .replace(
      /\[([^\]]+)\]\(\s*\[?(https?:\/\/[^\])\s]+)\]?\((https?:\/\/[^)\s]+)\)\s*\)/gi,
      "[$1]($3)"
    )
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi, "[$1]($2)")
    .replace(/\r\n/g, "\n")
    .trim();
}

function parseApplicationProcess(value: unknown): ApplicationProcessContent {
  const empty: ApplicationProcessContent = {
    mode: null,
    intro: null,
    steps: [],
    tracking: null,
    extra: [],
  };
  if (value == null) return empty;

  let raw = "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return empty;

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        const object = parsed as Record<string, unknown>;
        const mode = toPlainText(object.mode) || null;
        const processValue =
          object.process ??
          object.instructions ??
          object.application_steps ??
          object.steps ??
          object.description ??
          object.content;
        const nested = parseApplicationProcess(processValue);
        return {
          ...nested,
          mode: mode ?? nested.mode,
          tracking:
            toPlainText(object.tracking ?? object.application_tracking) ||
            nested.tracking,
        };
      }
    } catch {
      // The database value is ordinary text/markdown, not JSON.
    }
    raw = trimmed;
  } else if (Array.isArray(value)) {
    raw = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return [
            toPlainText(obj.title ?? obj.step_title ?? obj.heading),
            toPlainText(
              obj.description ??
                obj.instruction ??
                obj.instructions ??
                obj.content ??
                obj.text ??
                obj.details
            ),
          ]
            .filter(Boolean)
            .join(": ");
        }
        return toPlainText(item);
      })
      .filter(Boolean)
      .join("\n");
  } else {
    raw = toPlainText(value);
  }

  raw = cleanApplicationMarkup(raw);
  if (!raw) return empty;

  const modeMatch = raw.match(/(?:^|\n)\s*(?:[-*]\s*)?mode\s*:\s*([^\n]+)/i);
  const mode = modeMatch?.[1]?.trim() || null;
  if (modeMatch) raw = raw.replace(modeMatch[0], "");

  // Pull out the application-tracking paragraph instead of mixing it into
  // the numbered application steps.
  let tracking: string | null = null;
  const trackingMatch = raw.match(
    /(?:^|\n)\s*(?:\*\*)?Application\s+Tracking\s*:?(?:\*\*)?\s*([\s\S]*)$/i
  );
  if (trackingMatch) {
    tracking = trackingMatch[1]
      .replace(/^\s*[:\-]\s*/, "")
      .trim() || null;
    raw = raw.slice(0, trackingMatch.index).trim();
  }

  raw = raw
    .replace(/^\s*(?:\*\*)?Scheme\s+Application\s+Process\s*:?(?:\*\*)?\s*/i, "")
    .trim();

  const stepPattern =
    /(?:^|\n)\s*(?:\*\*)?Step\s*(\d+)\s*:\s*(?:\*\*)?\s*/gi;
  const matches = Array.from(raw.matchAll(stepPattern));
  const steps: string[] = [];
  let intro = "";

  if (matches.length) {
    intro = raw.slice(0, matches[0].index).trim();
    matches.forEach((match, index) => {
      const startIndex = (match.index ?? 0) + match[0].length;
      const endIndex =
        index + 1 < matches.length
          ? (matches[index + 1].index ?? raw.length)
          : raw.length;
      const body = raw.slice(startIndex, endIndex).trim();
      if (body) steps.push(body);
    });
  } else {
    intro = raw;
  }

  // Remove leftover markdown emphasis markers and tidy whitespace.
  const tidy = (text: string) =>
    text
      .replace(/\*\*/g, "")
      .replace(/\\\*/g, "")
      .replace(/[ \t]+/g, " ")
      .trim();

  return {
    mode,
    intro: tidy(intro) || null,
    steps: steps.map(tidy).filter(Boolean),
    tracking: tracking ? tidy(tracking) : null,
    extra: [],
  };
}

function renderInlineLinks(text: string): ReactNode[] {
  const normalized = cleanApplicationMarkup(text);
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<]+)/gi;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = linkPattern.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(normalized.slice(lastIndex, match.index));
    }

    const label = match[1];
    const href = (match[2] || match[3]).replace(/[.,;]+$/, "");
    nodes.push(
      <a
        key={`application-link-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
      >
        {label || href}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalized.length) {
    nodes.push(normalized.slice(lastIndex));
  }

  return nodes;
}

function formatLabel(key: string): string {
  return key
    .replace(/_hi$|_en$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DetailBlock({
  value,
  emptyText,
}: {
  value: unknown;
  emptyText: string;
}) {
  const text = toPlainText(value);

  if (!text) {
    return <p className="text-sm leading-7 text-slate-500">{emptyText}</p>;
  }

  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  if (lines.length > 1) {
    return (
      <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
        {lines.map((line, index) => (
          <li key={`${index}-${line.slice(0, 24)}`}>{line}</li>
        ))}
      </ul>
    );
  }

  return (
    <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
      {text}
    </p>
  );
}

function SchemeDetailsContent() {
  const params = useParams<{ id: string }>();
  const schemeId = params.id;
  const supabase = useMemo(() => createClient(), []);

  const [scheme, setScheme] = useState<SchemeRow | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isHindi, setIsHindi] = useState(false);

  // Follow the language toggle in the existing navbar.
  // The navbar changes the document's lang attribute; this page listens to it.
  useEffect(() => {
    const syncLanguage = () => {
      const lang = document.documentElement.lang.toLowerCase();
      setIsHindi(lang === "hi" || lang.startsWith("hi-"));
    };

    syncLanguage();
    const observer = new MutationObserver(syncLanguage);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    window.addEventListener("languagechange", syncLanguage);

    return () => {
      observer.disconnect();
      window.removeEventListener("languagechange", syncLanguage);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDetails() {
      setLoading(true);
      setError("");

      try {
        // Select * so every field already stored for this scheme is available
        // without silently omitting bilingual or newly-added database columns.
        const { data: schemeData, error: schemeError } = await supabase
          .from("schemes")
          .select("*")
          .eq("id", schemeId)
          .eq("is_active", true)
          .maybeSingle();

        if (schemeError) throw schemeError;
        if (!schemeData) {
          throw new Error("Scheme not found or it is no longer active.");
        }

        const row = schemeData as SchemeRow;
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        let result: EligibilityResult = {
          status: "needs_verification",
          reasons: [
            "Log in and complete your profile to evaluate eligibility.",
          ],
          matchedRules: [],
          failedRules: [],
          missingInformation: ["User profile is unavailable."],
        };

        if (authData.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .select(
              "age_range, state, occupation, annual_family_income"
            )
            .eq("user_id", authData.user.id)
            .maybeSingle();

          if (profileError) throw profileError;

          if (profileData) {
            result = checkEligibility(
              toEligibilityProfile(profileData as ProfileRecord),
              row as never
            );
          }
        }

        if (!active) return;
        setScheme(row);
        setEligibility(result);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load scheme details."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (schemeId) void loadDetails();
    return () => {
      active = false;
    };
  }, [schemeId, supabase]);

  const sections = useMemo<DetailSection[]>(() => {
    if (!scheme) return [];

    const fields: Array<{
      id: string;
      titleEn: string;
      titleHi: string;
      keysEn: string[];
      keysHi: string[];
    }> = [
      {
        id: "overview",
        titleEn: "Scheme overview",
        titleHi: "योजना का परिचय",
        keysEn: ["brief_description_en", "description", "detailed_description_en"],
        keysHi: ["brief_description_hi", "description_hi", "detailed_description_hi"],
      },
      {
        id: "description",
        titleEn: "Detailed description",
        titleHi: "विस्तृत विवरण",
        keysEn: ["detailed_description_en", "description", "brief_description_en"],
        keysHi: ["detailed_description_hi", "description_hi", "brief_description_hi"],
      },
      {
        id: "benefits",
        titleEn: "Benefits / Financial assistance",
        titleHi: "लाभ / वित्तीय सहायता",
        keysEn: ["benefits_en", "benefits"],
        keysHi: ["benefits_hi"],
      },
      {
        id: "eligibility",
        titleEn: "Eligibility criteria",
        titleHi: "पात्रता मानदंड",
        keysEn: ["eligibility_en", "eligibility_summary", "eligibility"],
        keysHi: ["eligibility_hi", "eligibility_summary_hi"],
      },
      {
        id: "documents",
        titleEn: "Required documents",
        titleHi: "आवश्यक दस्तावेज़",
        keysEn: ["documents_en", "required_documents"],
        keysHi: ["documents_hi", "required_documents_hi"],
      },
      {
        id: "application",
        titleEn: "Application process",
        titleHi: "आवेदन प्रक्रिया",
        keysEn: ["application_process_en", "application_steps_en", "application_process", "application_steps", "how_to_apply", "procedure"],
        keysHi: ["application_process_hi", "application_steps_hi", "how_to_apply_hi", "procedure_hi"],
      },
      {
        id: "department",
        titleEn: "Ministry / Department",
        titleHi: "मंत्रालय / विभाग",
        keysEn: ["ministry_en", "department_en", "ministry", "department"],
        keysHi: ["ministry_hi", "department_hi"],
      },
      {
        id: "scheme-category",
        titleEn: "Scheme category",
        titleHi: "योजना की श्रेणी",
        keysEn: ["category_en", "category"],
        keysHi: ["category_hi"],
      },
      {
        id: "target-area",
        titleEn: "Applicable state / area",
        titleHi: "लागू राज्य / क्षेत्र",
        keysEn: ["state_en", "target_state", "state"],
        keysHi: ["state_hi", "target_state_hi"],
      },
      {
        id: "tags",
        titleEn: "Tags",
        titleHi: "टैग",
        keysEn: ["tags_en", "tags"],
        keysHi: ["tags_hi"],
      },
    ];

    return fields.map((field) => ({
      id: field.id,
      title: isHindi ? field.titleHi : field.titleEn,
      value: firstAvailable(
        scheme,
        isHindi ? field.keysHi : field.keysEn
      ) ?? firstAvailable(
        scheme,
        isHindi ? field.keysEn : field.keysHi
      ),
    }));
  }, [scheme, isHindi]);

  const status = eligibility?.status ?? "needs_verification";
  const statusLabel =
    status === "eligible"
      ? isHindi
        ? "आप पात्र हो सकते हैं"
        : "Potentially eligible"
      : status === "not_eligible"
        ? isHindi
          ? "पात्रता मेल नहीं खाती"
          : "Not eligible based on available criteria"
        : isHindi
          ? "जाँच आवश्यक"
          : "Needs verification";

  const statusClass =
    status === "eligible"
      ? "bg-emerald-100 text-emerald-800"
      : status === "not_eligible"
        ? "bg-rose-100 text-rose-800"
        : "bg-amber-100 text-amber-900";

  const title = scheme
    ? toPlainText(
        firstAvailable(
          scheme,
          isHindi ? ["scheme_name_hi", "name_hi"] : ["scheme_name_en", "name"]
        )
      ) || toPlainText(scheme.name) || (isHindi ? "योजना का विवरण" : "Scheme details")
    : "";

  const schemeLevel = scheme
    ? toPlainText(
        firstAvailable(
          scheme,
          isHindi ? ["scheme_level_hi"] : ["scheme_level_en"]
        )
      ) || (scheme.scheme_level === "state" ? "State Government" : "Central Government")
    : "";

  const detail = (id: string) => sections.find((section) => section.id === id)?.value;

  const applicationProcess = parseApplicationProcess(detail("application"));
  const officialWebsiteUrl = scheme ? findOfficialUrl(scheme) : null;
  const guidelineUrl = scheme ? findGuidelineUrl(scheme) : null;
  const schemeReferences = scheme ? extractReferences(scheme) : [];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F6F9] text-slate-600">
        {isHindi ? "योजना का विवरण लोड हो रहा है..." : "Loading scheme details..."}
      </main>
    );
  }

  if (error || !scheme || !eligibility) {
    return (
      <main className="min-h-screen bg-[#F4F6F9] px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-6">
          <p className="text-red-700">
            {error || (isHindi ? "योजना का विवरण लोड नहीं हो सका।" : "Scheme details could not be loaded.")}
          </p>
          <Link href="/schemes" className="mt-4 inline-flex font-semibold text-blue-700 underline">
            {isHindi ? "← योजनाओं पर वापस जाएँ" : "← Back to schemes"}
          </Link>
        </div>
      </main>
    );
  }

  const sidebarItems = [
    { id: "overview", label: isHindi ? "योजना का परिचय" : "Overview" },
    { id: "description", label: isHindi ? "विस्तृत विवरण" : "Description" },
    { id: "benefits", label: isHindi ? "लाभ" : "Benefits" },
    { id: "eligibility", label: isHindi ? "पात्रता" : "Eligibility" },
    { id: "documents", label: isHindi ? "आवश्यक दस्तावेज़" : "Required documents" },
    { id: "application", label: isHindi ? "आवेदन प्रक्रिया" : "Application process" },
    { id: "department", label: isHindi ? "मंत्रालय / विभाग" : "Ministry / Department" },
    { id: "scheme-category", label: isHindi ? "योजना की श्रेणी" : "Category" },
    { id: "target-area", label: isHindi ? "लागू राज्य / क्षेत्र" : "Applicable area" },
    { id: "assessment", label: isHindi ? "आपकी पात्रता जाँच" : "Your eligibility assessment" },
    { id: "configured-criteria", label: isHindi ? "डेटाबेस में उपलब्ध मानदंड" : "Configured criteria" },
    { id: "references", label: isHindi ? "संदर्भ और स्रोत लिंक" : "References & source links" },
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className="min-h-screen bg-[#F4F6F9] px-4 py-6 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/schemes"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          {isHindi ? "← सभी योजनाएँ" : "← Back to schemes"}
        </Link>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sticky table-of-contents sidebar */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-extrabold text-slate-900">
                {isHindi ? "इस पेज पर" : "On this page"}
              </h2>
              <nav className="space-y-1" aria-label={isHindi ? "योजना अनुभाग" : "Scheme sections"}>
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-[#0F2342]/5 hover:text-[#0F2342]"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="bg-[#0F2342] px-6 py-7 text-white sm:px-8">
              <p className="mb-2 text-sm text-blue-100">{schemeLevel}</p>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
                  {statusLabel}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  {toPlainText(detail("scheme-category")) || (isHindi ? "अन्य" : "Other")}
                </span>
                {scheme.target_state && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                    {toPlainText(scheme.target_state)}
                  </span>
                )}
              </div>
            </header>

            <div className="space-y-8 p-6 sm:p-8">
              <section id="overview" className="scroll-mt-28">
                <h2 className="mb-3 text-xl font-bold">{isHindi ? "योजना का परिचय" : "Scheme overview"}</h2>
                <DetailBlock value={detail("overview")} emptyText={isHindi ? "परिचय उपलब्ध नहीं है।" : "Overview is not available in the database."} />
              </section>

              <section id="description" className="scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="mb-3 text-xl font-bold">{isHindi ? "विस्तृत विवरण" : "Detailed description"}</h2>
                <DetailBlock value={detail("description")} emptyText={isHindi ? "विस्तृत विवरण उपलब्ध नहीं है।" : "Detailed description is not available in the database."} />
              </section>

              <section id="benefits" className="scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="mb-3 text-xl font-bold">{isHindi ? "लाभ / वित्तीय सहायता" : "Benefits / Financial assistance"}</h2>
                <DetailBlock value={detail("benefits")} emptyText={isHindi ? "लाभ की जानकारी उपलब्ध नहीं है।" : "Benefit details are not available in the database."} />
              </section>

              <section id="eligibility" className="scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="mb-3 text-xl font-bold">{isHindi ? "पात्रता मानदंड" : "Eligibility criteria"}</h2>
                <DetailBlock value={detail("eligibility")} emptyText={isHindi ? "पात्रता का विवरण उपलब्ध नहीं है।" : "Eligibility details are not available in the database."} />
              </section>

              <section id="documents" className="scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="mb-3 text-xl font-bold">{isHindi ? "आवश्यक दस्तावेज़" : "Required documents"}</h2>
                <DetailBlock value={detail("documents")} emptyText={isHindi ? "दस्तावेज़ों की सूची उपलब्ध नहीं है।" : "No document list is available in the database."} />
              </section>

              <section id="application" className="scroll-mt-28 border-t border-slate-100 pt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold">{isHindi ? "आवेदन प्रक्रिया" : "Application process"}</h2>
                  {applicationProcess.mode && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                      {isHindi ? "माध्यम" : "Mode"}: {applicationProcess.mode}
                    </span>
                  )}
                </div>

                {applicationProcess.intro && (
                  <p className="mb-4 text-sm leading-7 text-slate-700">
                    {renderInlineLinks(applicationProcess.intro)}
                  </p>
                )}

                {applicationProcess.steps.length > 0 ? (
                  <ol className="space-y-3">
                    {applicationProcess.steps.map((step, index) => (
                      <li
                        key={`application-step-${index}`}
                        className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F2342] text-sm font-bold text-white">
                          {index + 1}
                        </span>
                        <p className="min-w-0 whitespace-pre-line pt-1 text-sm leading-7 text-slate-700">
                          {renderInlineLinks(step)}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm leading-7 text-slate-500">
                    {isHindi
                      ? "आवेदन प्रक्रिया की जानकारी डेटाबेस में उपलब्ध नहीं है। नीचे दिए गए आधिकारिक पोर्टल या दिशानिर्देश देखें।"
                      : "Application steps are not available in the database. Please check the official portal or scheme guidelines below."}
                  </p>
                )}

                {applicationProcess.tracking && (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <h3 className="mb-2 text-sm font-bold text-emerald-900">
                      {isHindi ? "आवेदन की स्थिति ट्रैक करें" : "Application tracking"}
                    </h3>
                    <p className="whitespace-pre-line text-sm leading-7 text-emerald-950">
                      {renderInlineLinks(applicationProcess.tracking)}
                    </p>
                  </div>
                )}
              </section>
              <section id="department" className="scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="mb-3 text-xl font-bold">{isHindi ? "मंत्रालय / विभाग" : "Ministry / Department"}</h2>
                <DetailBlock value={detail("department")} emptyText={isHindi ? "विभाग की जानकारी उपलब्ध नहीं है।" : "Ministry or department information is not available."} />
              </section>

              <section id="scheme-category" className="scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="mb-3 text-xl font-bold">{isHindi ? "योजना की श्रेणी" : "Scheme category"}</h2>
                <DetailBlock value={detail("scheme-category")} emptyText={isHindi ? "श्रेणी उपलब्ध नहीं है।" : "Category is not available."} />
              </section>

              <section id="target-area" className="scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="mb-3 text-xl font-bold">{isHindi ? "लागू राज्य / क्षेत्र" : "Applicable state / area"}</h2>
                <DetailBlock value={detail("target-area")} emptyText={isHindi ? "क्षेत्र की जानकारी उपलब्ध नहीं है।" : "Applicable area is not specified."} />
              </section>

              <section id="assessment" className="scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="mb-3 text-xl font-bold">{isHindi ? "आपकी पात्रता जाँच" : "Your eligibility assessment"}</h2>
                {eligibility.matchedRules.length > 0 && (
                  <div className="mb-4 rounded-lg bg-emerald-50 p-4">
                    <h3 className="mb-2 text-sm font-bold text-emerald-800">{isHindi ? "मेल खाने वाले मानदंड" : "Matched criteria"}</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-emerald-900">
                      {eligibility.matchedRules.map((item, index) => <li key={`matched-${index}`}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {eligibility.failedRules.length > 0 && (
                  <div className="mb-4 rounded-lg bg-rose-50 p-4">
                    <h3 className="mb-2 text-sm font-bold text-rose-800">{isHindi ? "मेल नहीं खाने वाले मानदंड" : "Criteria that do not match"}</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-rose-900">
                      {eligibility.failedRules.map((item, index) => <li key={`failed-${index}`}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {eligibility.reasons.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-800">{isHindi ? "कारण / अगले कदम" : "Reasons / next steps"}</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700">
                      {eligibility.reasons.map((item, index) => <li key={`reason-${index}`}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {eligibility.missingInformation.length > 0 && (
                  <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                    {isHindi ? "अधूरी जानकारी: " : "Information to verify: "}
                    {eligibility.missingInformation.join(", ")}
                  </p>
                )}
                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600">
                  {isHindi
                    ? "यह आकलन YojnaMitra में उपलब्ध पात्रता मानदंडों पर आधारित है। आवेदन करने से पहले आधिकारिक वेबसाइट पर सभी शर्तों की पुष्टि करें।"
                    : "This assessment uses only the eligibility criteria configured in YojnaMitra. Confirm all requirements on the official scheme website before applying."}
                </p>
              </section>

              <section id="configured-criteria" className="scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="mb-3 text-xl font-bold">{isHindi ? "डेटाबेस में उपलब्ध मानदंड" : "Configured criteria"}</h2>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    [isHindi ? "न्यूनतम आयु" : "Minimum age", scheme.min_age],
                    [isHindi ? "अधिकतम आयु" : "Maximum age", scheme.max_age],
                    [
                      isHindi ? "वार्षिक पारिवारिक आय सीमा" : "Annual family income limit",
                      scheme.annual_income_limit == null
                        ? null
                        : `₹${Number(scheme.annual_income_limit).toLocaleString("en-IN")}`,
                    ],
                    [
                      isHindi ? "पात्र व्यवसाय" : "Eligible occupations",
                      scheme.eligible_occupation,
                    ],
                    [
                      isHindi ? "लक्षित राज्य" : "Target state",
                      scheme.scheme_level === "state" ? scheme.target_state : isHindi ? "पूरे भारत में" : "All India (Central scheme)",
                    ],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg bg-slate-50 p-3">
                      <dt className="text-xs font-semibold text-slate-500">{String(label)}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-800">
                        {value == null || value === ""
                          ? isHindi ? "उल्लेख नहीं है" : "Not specified"
                          : Array.isArray(value) ? value.join(", ") : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

             

              {/* Reference URLs from the scheme's reference fields */}
              <section id="references" className="scroll-mt-28 border-t border-slate-100 pt-6">
                <h2 className="mb-3 text-xl font-bold">
                  {isHindi ? "संदर्भ और स्रोत लिंक" : "References & source links"}
                </h2>
                <p className="mb-4 text-sm leading-6 text-slate-600">
                  {isHindi
                    ? "इस योजना से संबंधित डेटाबेस में दिए गए स्रोत और संदर्भ लिंक।"
                    : "Source and reference links stored for this scheme."}
                </p>

                {schemeReferences.length > 0 ? (
                  <div className="space-y-3">
                    {schemeReferences.map((reference, index) => (
                      <a
                        key={`${reference.url}-${index}`}
                        href={reference.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-bold text-slate-900 group-hover:text-blue-800">
                            {reference.title}
                          </span>
                          <span className="mt-2  inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-semibold text-blue-800">
                            {reference.category}
                          </span>
                          <span className="mt-2 block break-all text-xs leading-5 text-slate-500">
                            {reference.url}
                          </span>
                        </span>
                        <span className="shrink-0 text-lg font-bold text-blue-700" aria-hidden="true">
                          ↗
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    {isHindi
                      ? "इस योजना के लिए कोई संदर्भ लिंक उपलब्ध नहीं है।"
                      : "No reference links are stored for this scheme."}
                  </p>
                )}
              </section>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}

export default function SchemeDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F4F6F9] text-slate-600">
          Loading scheme details...
        </main>
      }
    >
      <SchemeDetailsContent />
    </Suspense>
  );
}



