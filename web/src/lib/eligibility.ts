export type EligibilityStatus = "eligible" | "not_eligible" | "needs_verification";

export interface UserProfile {
  /** Exact age if known. */
  age?: number | null;
  /** Saved profile age group, e.g. "18-25", "Below 18", or "60+". */
  ageRange?: string | null;
  gender?: string | null;
  state?: string | null;
  occupation?: string | null;
  annual_family_income?: number | null;
}

export interface SchemeEligibilityRules {
  name: string;
  min_age?: number | null;
  max_age?: number | null;
  eligible_occupation?: string[] | null;
  annual_income_limit?: number | null;
  target_state?: string | null;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: string[];
  matchedRules: string[];
  failedRules: string[];
  missingInformation: string[];
}

type AgeInterval = { min: number; max: number };

function getAgeInterval(profile: UserProfile): AgeInterval | null {
  if (profile.age != null && Number.isFinite(profile.age)) {
    return { min: profile.age, max: profile.age };
  }
  const value = profile.ageRange?.trim().toLowerCase();
  if (!value) return null;
  if (value === "below 18") return { min: 0, max: 17 };
  if (value === "18-25" || value === "18–25") return { min: 18, max: 25 };
  if (value === "26-35" || value === "26–35") return { min: 26, max: 35 };
  if (value === "36-50" || value === "36–50") return { min: 36, max: 50 };
  if (value === "51-60" || value === "51–60") return { min: 51, max: 60 };
  if (value === "60+" || value === "above 60") return { min: 61, max: 120 };
  return null;
}

export function checkEligibility(
  profile: UserProfile,
  scheme: SchemeEligibilityRules
): EligibilityResult {
  const matchedRules: string[] = [];
  const failedRules: string[] = [];
  const missingInformation: string[] = [];

  // Age groups can overlap a rule without proving that every age in the group qualifies.
  if (scheme.min_age != null || scheme.max_age != null) {
    const age = getAgeInterval(profile);
    if (!age) {
      missingInformation.push("Age or age group is missing or unrecognized.");
    } else {
      const lower = scheme.min_age ?? 0;
      const upper = scheme.max_age ?? 120;
      if (age.max < lower) {
        failedRules.push(`Minimum age required: ${lower}; your age group is below this limit.`);
      } else if (age.min > upper) {
        failedRules.push(`Maximum age allowed: ${upper}; your age group is above this limit.`);
      } else if (age.min >= lower && age.max <= upper) {
        matchedRules.push(`Age group ${profile.ageRange || profile.age} satisfies the configured age limits (${scheme.min_age ?? "no minimum"}–${scheme.max_age ?? "no maximum"}).`);
      } else {
        missingInformation.push(`Your age group (${profile.ageRange || profile.age}) overlaps the configured age limits (${scheme.min_age ?? "no minimum"}–${scheme.max_age ?? "no maximum"}); exact age verification is needed.`);
      }
    }
  }

  if (scheme.eligible_occupation && scheme.eligible_occupation.length > 0) {
    if (!profile.occupation?.trim()) {
      missingInformation.push("Occupation is missing.");
    } else {
      const allowed = scheme.eligible_occupation.map((item) => item.trim().toLowerCase());
      const userOccupation = profile.occupation.trim().toLowerCase();
      const aliases: Record<string, string[]> = {
        "self employed": ["self employed", "self-employed", "business owner"],
        "self-employed": ["self employed", "self-employed", "business owner"],
        "business owner": ["self employed", "self-employed", "business owner"],
      };
      const userVariants = aliases[userOccupation] ?? [userOccupation];
      if (allowed.some((item) => userVariants.includes(item))) {
        matchedRules.push(`Occupation "${profile.occupation}" matches the configured occupation criteria.`);
      } else {
        failedRules.push(`Your occupation "${profile.occupation}" does not match the listed occupations: ${scheme.eligible_occupation.join(", ")}.`);
      }
    }
  }

  if (scheme.annual_income_limit != null) {
    if (profile.annual_family_income == null || !Number.isFinite(profile.annual_family_income)) {
      missingInformation.push("Annual family income is missing.");
    } else if (profile.annual_family_income <= scheme.annual_income_limit) {
      matchedRules.push(`Annual family income is within the limit of ₹${scheme.annual_income_limit}.`);
    } else {
      failedRules.push(`Annual family income exceeds the limit of ₹${scheme.annual_income_limit}.`);
    }
  }

  if (scheme.target_state?.trim() && scheme.target_state.trim().toLowerCase() !== "all india") {
    if (!profile.state?.trim()) {
      missingInformation.push("State is missing.");
    } else if (profile.state.trim().toLowerCase() === scheme.target_state.trim().toLowerCase()) {
      matchedRules.push(`Your state "${profile.state}" matches the scheme's target state.`);
    } else {
      failedRules.push(`This scheme targets ${scheme.target_state}; your state is ${profile.state}.`);
    }
  }

  const status: EligibilityStatus = failedRules.length > 0
    ? "not_eligible"
    : missingInformation.length > 0
      ? "needs_verification"
      : "eligible";

  const reasons = [...failedRules, ...missingInformation];
  if (status === "eligible") {
    reasons.push("All configured criteria passed. Confirm the complete official requirements before applying.");
  }

  return { status, reasons, matchedRules, failedRules, missingInformation };
}
