import type { Lang } from "./copy";

export type WorkType = "farmer" | "student" | "selfEmployed" | "homemaker";

type Bilingual = Record<Lang, string>;

export const sampleSchemes: Record<WorkType, { name: Bilingual; category: Bilingual }[]> = {
  farmer: [
    { name: { en: "PM-KISAN", hi: "पीएम-किसान सम्मान निधि" }, category: { en: "Agriculture", hi: "कृषि" } },
    { name: { en: "PM Fasal Bima Yojana", hi: "प्रधानमंत्री फसल बीमा योजना" }, category: { en: "Crop insurance", hi: "फसल बीमा" } },
  ],
  student: [
    { name: { en: "Central Sector Scholarship Scheme", hi: "केंद्रीय क्षेत्र छात्रवृत्ति योजना" }, category: { en: "Education", hi: "शिक्षा" } },
    { name: { en: "PM Vidyalaxmi", hi: "पीएम विद्यालक्ष्मी" }, category: { en: "Education loan", hi: "शिक्षा ऋण" } },
  ],
  selfEmployed: [
    { name: { en: "PM Vishwakarma", hi: "पीएम विश्वकर्मा योजना" }, category: { en: "Artisans and crafts", hi: "कारीगर और शिल्पकार" } },
    { name: { en: "PM Mudra Yojana", hi: "प्रधानमंत्री मुद्रा योजना" }, category: { en: "Business loan", hi: "व्यापार ऋण" } },
  ],
  homemaker: [
    { name: { en: "PM Ujjwala Yojana", hi: "प्रधानमंत्री उज्ज्वला योजना" }, category: { en: "Cooking gas", hi: "रसोई गैस" } },
    { name: { en: "PM Matru Vandana Yojana", hi: "प्रधानमंत्री मातृ वंदना योजना" }, category: { en: "Maternity support", hi: "मातृत्व सहायता" } },
  ],
};

export const workTypes = Object.keys(sampleSchemes) as WorkType[];