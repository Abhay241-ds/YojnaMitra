"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";


type Language = "en" | "hi";

interface ProfileForm {
  full_name: string;
  age_range: string;
  gender: string;
  state: string;
  district: string;
  education_level: string;
  occupation: string;
  sub_occupation: string;
  annual_family_income: string;
}

const initialForm: ProfileForm = {
  full_name: "",
  age_range: "",
  gender: "",
  state: "",
  district: "",
  education_level: "",
  occupation: "",
  sub_occupation: "",
  annual_family_income: "",
};

const content = {
  en: {
    badge: "PERSONALIZED GOVERNMENT SCHEMES",
    title: "Your Profile",
    subtitle:
      "Tell us a little about yourself so we can help you discover relevant government schemes.",
    personal: "Personal Information",
    location: "Location Details",
    educationWork: "Education & Occupation",
    incomeSection: "Family Income",
    name: "Full Name",
    age: "Age Group",
    gender: "Gender",
    state: "State",
    district: "District",
    education: "Education Level",
    occupation: "Occupation",
    subOccupation: "Additional Occupation Details",
    income: "Annual Family Income",
    namePlaceholder: "Enter your full name",
    selectAge: "Select age group",
    selectGender: "Select gender",
    selectState: "Select state",
    districtPlaceholder: "Enter your district",
    selectEducation: "Select education level",
    selectOccupation: "Select occupation",
    subOccupationPlaceholder: "e.g. Crop type, business type",
    incomePlaceholder: "e.g. 250000",
    incomeHint:
      "Enter the total annual income of your family in Indian rupees.",
    save: "Save Profile",
    update: "Update Profile",
    find: "Find My Schemes",
    saving: "Saving...",
    loading: "Loading your profile...",
    saved: "Profile saved successfully!",
    loadError: "Unable to load your profile.",
    saveError: "Unable to save your profile. Please try again.",
    loginRequired: "Please log in to save your profile.",
    required: "Please complete all required fields.",
    profileNote:
      "Your information helps us identify potentially relevant schemes. Eligibility will depend on each scheme's official rules.",
    optional: "Optional",
    editHeading: "Update your details",
    newHeading: "Let's get to know you",
    footer: "YojnaMitra · Helping you discover government schemes",
    male: "Male",
    female: "Female",
    other: "Other",
    student: "Student",
    farmer: "Farmer",
    selfEmployed: "Self-employed",
    salaried: "Salaried",
    unemployed: "Unemployed",
    homemaker: "Homemaker",
    otherOccupation: "Other",
    secondary: "Secondary School",
    higherSecondary: "Higher Secondary",
    graduate: "Graduate",
    postgraduate: "Post Graduate",
    doctoral: "Doctoral",
    under18: "Below 18",
    age18to25: "18–25",
    age26to35: "26–35",
    age36to50: "36–50",
    age51to60: "51–60",
    above60: "Above 60",
    back: "Back",
    hindi: "हिन्दी",
    english: "English",
  },
  hi: {
    badge: "आपके लिए सरकारी योजनाएँ",
    title: "आपकी प्रोफ़ाइल",
    subtitle:
      "अपने बारे में कुछ जानकारी दें, ताकि हम आपके लिए उपयोगी सरकारी योजनाएँ खोज सकें।",
    personal: "व्यक्तिगत जानकारी",
    location: "स्थान की जानकारी",
    educationWork: "शिक्षा और व्यवसाय",
    incomeSection: "परिवार की आय",
    name: "पूरा नाम",
    age: "आयु वर्ग",
    gender: "लिंग",
    state: "राज्य",
    district: "जिला",
    education: "शिक्षा का स्तर",
    occupation: "व्यवसाय",
    subOccupation: "व्यवसाय से जुड़ी अतिरिक्त जानकारी",
    income: "परिवार की वार्षिक आय",
    namePlaceholder: "अपना पूरा नाम लिखें",
    selectAge: "आयु वर्ग चुनें",
    selectGender: "लिंग चुनें",
    selectState: "राज्य चुनें",
    districtPlaceholder: "अपने जिले का नाम लिखें",
    selectEducation: "शिक्षा का स्तर चुनें",
    selectOccupation: "व्यवसाय चुनें",
    subOccupationPlaceholder: "जैसे फसल या व्यवसाय का प्रकार",
    incomePlaceholder: "जैसे 250000",
    incomeHint:
      "अपने परिवार की कुल वार्षिक आय भारतीय रुपये में दर्ज करें।",
    save: "प्रोफ़ाइल सेव करें",
    update: "प्रोफ़ाइल अपडेट करें",
    find: "मेरे लिए योजनाएँ खोजें",
    saving: "सेव हो रहा है...",
    loading: "आपकी प्रोफ़ाइल लोड हो रही है...",
    saved: "प्रोफ़ाइल सफलतापूर्वक सेव हो गई!",
    loadError: "प्रोफ़ाइल लोड नहीं हो सकी।",
    saveError: "प्रोफ़ाइल सेव नहीं हो सकी। कृपया दोबारा प्रयास करें।",
    loginRequired: "प्रोफ़ाइल सेव करने के लिए कृपया लॉग इन करें।",
    required: "कृपया सभी आवश्यक जानकारी भरें।",
    profileNote:
      "आपकी जानकारी से संबंधित योजनाएँ खोजने में मदद मिलती है। पात्रता प्रत्येक योजना के आधिकारिक नियमों पर निर्भर करेगी।",
    optional: "वैकल्पिक",
    editHeading: "अपनी जानकारी अपडेट करें",
    newHeading: "आइए, आपके बारे में जानें",
    footer: "YojnaMitra · सरकारी योजनाएँ खोजने में आपकी सहायता",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    student: "विद्यार्थी",
    farmer: "किसान",
    selfEmployed: "स्वरोज़गार",
    salaried: "वेतनभोगी",
    unemployed: "बेरोज़गार",
    homemaker: "गृहिणी",
    otherOccupation: "अन्य",
    secondary: "माध्यमिक शिक्षा",
    higherSecondary: "उच्च माध्यमिक",
    graduate: "स्नातक",
    postgraduate: "स्नातकोत्तर",
    doctoral: "डॉक्टरेट",
    under18: "18 वर्ष से कम",
    age18to25: "18–25 वर्ष",
    age26to35: "26–35 वर्ष",
    age36to50: "36–50 वर्ष",
    age51to60: "51–60 वर्ष",
    above60: "60 वर्ष से अधिक",
    back: "वापस जाएँ",
    hindi: "हिन्दी",
    english: "English",
  },
};

const states = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
];

export default function ProfilePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const { lang } = useLang();
  const language: Language = lang === "hi" ? "hi" : "en";

  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const t = content[language];

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          if (active) {
            setError(t.loginRequired);
            setLoading(false);
          }
          return;
        }

        const { data, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!active) return;

        if (data) {
          setForm({
            full_name: data.full_name ?? "",
            age_range: data.age_range ?? "",
            gender: data.gender ?? "",
            state: data.state ?? "",
            district: data.district ?? "",
            education_level: data.education_level ?? "",
            occupation: data.occupation ?? "",
            sub_occupation: data.sub_occupation ?? "",
            annual_family_income:
              data.annual_family_income == null
                ? ""
                : String(data.annual_family_income),
          });

          setIsEditing(true);
        } else {
          setIsEditing(false);
        }
      } catch (err) {
        console.error("Profile loading error:", err);

        if (active) {
          setError(t.loadError);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [supabase, language]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.full_name.trim() ||
      !form.age_range ||
      !form.gender ||
      !form.state ||
      !form.district.trim() ||
      !form.education_level ||
      !form.occupation
    ) {
      setError(t.required);
      return;
    }

    const incomeText = form.annual_family_income.trim();

    const normalizedIncome = incomeText.replace(/[₹,\s]/g, "");

    const income = normalizedIncome === "" ? null : Number(normalizedIncome);

    if (
      income !== null &&
      (!Number.isFinite(income) || income < 0)
    ) {
      setError(
        language === "hi"
          ? "कृपया वार्षिक आय की सही राशि दर्ज करें।"
          : "Please enter a valid annual family income."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setError(t.loginRequired);
        return;
      }

      const profileData = {
        user_id: user.id,
        full_name: form.full_name.trim(),
        age_range: form.age_range,
        gender: form.gender,
        state: form.state,
        district: form.district.trim(),
        education_level: form.education_level,
        occupation: form.occupation,
        sub_occupation: form.sub_occupation.trim() || null,
        annual_family_income: income,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = await supabase
        .from("user_profiles")
        .upsert(profileData, {
          onConflict: "user_id",
        });

      if (saveError) throw saveError;

      setIsEditing(true);
      setSuccess(t.saved);
    } catch (err) {
      console.error("Profile save error:", err);

      setError(
        err instanceof Error && err.message
          ? err.message
          : t.saveError
      );
    } finally {
      setSaving(false);
    }
  }

  function findSchemes() {
    router.push("/schemes");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#173B6C]" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            {t.loading}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F6F9] text-slate-800">
      {/* Hero */}
      <section className="bg-[#102A4C]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wider text-amber-300">
            {t.badge}
          </span>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {t.title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* Profile Form */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
            <h2 className="text-xl font-bold text-[#173B6C]">
              {isEditing ? t.editHeading : t.newHeading}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t.profileNote}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-8"
            >
              {error}

              {error === t.loginRequired && (
                <button
                  type="button"
                  onClick={() => router.push("/auth")}
                  className="ml-2 font-bold underline"
                >
                  {language === "hi" ? "लॉग इन करें" : "Log in"}
                </button>
              )}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mx-5 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 sm:mx-8"
            >
              {success}
            </div>
          )}

          <div className="space-y-8 p-5 sm:p-8">
            {/* Personal Information */}
            <section>
              <SectionHeading
                number="01"
                title={t.personal}
              />

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label={t.name} required>
                  <input
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder={t.namePlaceholder}
                    autoComplete="name"
                    required
                    className={inputClass}
                  />
                </Field>

                <Field label={t.age} required>
                  <select
                    name="age_range"
                    value={form.age_range}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">{t.selectAge}</option>
                    <option value="Below 18">{t.under18}</option>
                    <option value="18-25">{t.age18to25}</option>
                    <option value="26-35">{t.age26to35}</option>
                    <option value="36-50">{t.age36to50}</option>
                    <option value="51-60">{t.age51to60}</option>
                    <option value="60+">{t.above60}</option>
                  </select>
                </Field>

                <Field label={t.gender} required>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">{t.selectGender}</option>
                    <option value="Male">{t.male}</option>
                    <option value="Female">{t.female}</option>
                    <option value="Other">{t.other}</option>
                  </select>
                </Field>
              </div>
            </section>

            {/* Location */}
            <section>
              <SectionHeading
                number="02"
                title={t.location}
              />

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label={t.state} required>
                  <select
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">{t.selectState}</option>

                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}

                    {/* Preserve an existing value if it isn't in the list. */}
                    {form.state && !states.includes(form.state) && (
                      <option value={form.state}>
                        {form.state}
                      </option>
                    )}
                  </select>
                </Field>

                <Field label={t.district} required>
                  <input
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    placeholder={t.districtPlaceholder}
                    required
                    className={inputClass}
                  />
                </Field>
              </div>
            </section>

            {/* Education and Occupation */}
            <section>
              <SectionHeading
                number="03"
                title={t.educationWork}
              />

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label={t.education} required>
                  <select
                    name="education_level"
                    value={form.education_level}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">{t.selectEducation}</option>
                    <option value="Secondary">{t.secondary}</option>
                    <option value="Higher Secondary">
                      {t.higherSecondary}
                    </option>
                    <option value="Graduate">{t.graduate}</option>
                    <option value="Post Graduate">
                      {t.postgraduate}
                    </option>
                    <option value="Doctoral">{t.doctoral}</option>
                  </select>
                </Field>

                <Field label={t.occupation} required>
                  <select
                    name="occupation"
                    value={form.occupation}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">{t.selectOccupation}</option>
                    <option value="Student">{t.student}</option>
                    <option value="Farmer">{t.farmer}</option>
                    <option value="Self Employed">
                      {t.selfEmployed}
                    </option>
                    <option value="Salaried">{t.salaried}</option>
                    <option value="Unemployed">{t.unemployed}</option>
                    <option value="Homemaker">{t.homemaker}</option>
                    <option value="Other">{t.otherOccupation}</option>
                  </select>
                </Field>

                <div className="md:col-span-2">
                  <Field
                    label={t.subOccupation}
                    optional={t.optional}
                  >
                    <input
                      name="sub_occupation"
                      value={form.sub_occupation}
                      onChange={handleChange}
                      placeholder={t.subOccupationPlaceholder}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* Income */}
            <section>
              <SectionHeading
                number="04"
                title={t.incomeSection}
              />

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
                <Field label={t.income} optional={t.optional}>
                  <div className="flex h-12 items-center rounded-lg border border-slate-200 bg-white px-3 transition focus-within:border-[#173B6C] focus-within:ring-2 focus-within:ring-blue-100">
                    <span className="mr-3 font-bold text-[#173B6C]">
                      ₹
                    </span>

                    <input
                      name="annual_family_income"
                      type="text"
                      inputMode="decimal"
                      value={form.annual_family_income}
                      onChange={handleChange}
                      placeholder={t.incomePlaceholder}
                      className="h-full w-full border-0 bg-transparent text-sm outline-none focus:ring-0"
                    />
                  </div>
                </Field>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {t.incomeHint}
                </p>
              </div>
            </section>

            {/* Buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push("/")}
                disabled={saving}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {t.back}
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#173B6C] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#102A4C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? t.saving
                    : isEditing
                      ? t.update
                      : t.save}
                </button>

                <button
                  type="button"
                  onClick={findSchemes}
                  disabled={saving}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#D97706] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t.find}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        <footer className="py-6 text-center text-xs leading-6 text-slate-500">
          © {new Date().getFullYear()} {t.footer}
        </footer>
      </section>
    </main>
  );
}

const inputClass =
  "h-12 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#173B6C] focus:ring-2 focus:ring-blue-100";

function SectionHeading({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#173B6C]/5 text-xs font-extrabold text-[#173B6C]">
        {number}
      </span>

      <h3 className="text-base font-bold text-slate-900">
        {title}
      </h3>
    </div>
  );
}

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
        )}

        {optional && (
          <span className="text-xs font-normal text-slate-400">
            ({optional})
          </span>
        )}
      </label>

      {children}
    </div>
  );
}