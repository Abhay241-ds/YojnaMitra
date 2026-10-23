"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sampleSchemes, type WorkType } from "@/lib/sampleSchemes";
import FilterSidebar, { type FilterState } from "@/components/FilterSidebar";
import SchemeCard from "@/components/SchemeCard";
import { useCopy } from "@/lib/i18n";

interface Scheme {
  id: string;
  name: string;
  department: string;
  description: string;
  financialAid: string;
  eligibility: "eligible" | "check" | "not-eligible";
  category: string;
  applicantType: string;
}

const MOCK_SCHEMES: Scheme[] = [
  {
    id: "1",
    name: "PM Kisan Samman Nidhi",
    department: "Department of Agriculture & Farmers Welfare",
    description: "Direct income support of ₹6,000 per year in three equal installments to all landholding farmers' families across the country.",
    financialAid: "₹6000/year",
    eligibility: "eligible",
    category: "Agriculture",
    applicantType: "Farmer",
  },
  {
    id: "2",
    name: "Ayushman Bharat",
    department: "Department of Health and Family Welfare",
    description: "National health protection scheme covering secondary and tertiary care hospitalization for over 50 crore impoverished citizens.",
    financialAid: "₹5 Lakh/family",
    eligibility: "check",
    category: "Health",
    applicantType: "Farmer",
  },
  {
    id: "3",
    name: "Stand-Up India",
    department: "Department of Financial Services",
    description: "Facilitates bank loans between 10 lakh and 1 crore to SC, ST, and at least one woman borrower per bank branch for setting up enterprise.",
    financialAid: "₹10L - ₹1 Crore",
    eligibility: "check",
    category: "Business",
    applicantType: "Business Owner",
  },
  {
    id: "4",
    name: "Kisan Credit Card (KCC)",
    department: "Department of Agriculture & Farmers Welfare",
    description: "Simplifies credit access to farmers for short-term working requirements, crop loans, and agricultural infrastructure.",
    financialAid: "Subsidized Credit",
    eligibility: "eligible",
    category: "Agriculture",
    applicantType: "Farmer",
  },
  {
    id: "5",
    name: "Pradhan Mantri Awas Yojana",
    department: "Ministry of Housing & Urban Affairs",
    description: "Affordable housing scheme intended for urban and rural low-income families through interest subsidy and house assistance.",
    financialAid: "Up to ₹2.67 Lakh",
    eligibility: "not-eligible",
    category: "Housing",
    applicantType: "Farmer",
  },
  {
    id: "6",
    name: "Sukanya Samriddhi Yojana",
    department: "Ministry of Women and Child Development",
    description: "Small deposit savings scheme targeted for parents of girl children with high interest rates and income tax exemption benefits.",
    financialAid: "8.2% Compound Interest",
    eligibility: "not-eligible",
    category: "Women",
    applicantType: "Farmer",
  },
];

export default function SchemesPage() {
  const supabase = createClient();
  const copy = useCopy();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [schemes, setSchemes] = useState<Scheme[]>(MOCK_SCHEMES);
  const [filteredSchemes, setFilteredSchemes] = useState<Scheme[]>(MOCK_SCHEMES);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    location: { state: false, district: false },
    applicantType: [],
    gender: false,
    benefits: false,
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (error) throw error;
          setProfile(data);

          // Set initial filters based on profile
          const occupationMap: Record<string, string> = {
            Farmer: "Farmer",
            Student: "Student",
            "Self Employed": "Business Owner",
            Salaried: "Business Owner",
            Unemployed: "Farmer",
          };

          const applicantType = occupationMap[data.occupation] || "Farmer";
          setFilters((prev) => ({
            ...prev,
            applicantType: [applicantType],
          }));
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase]);

  useEffect(() => {
    let filtered = [...schemes];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (scheme) =>
          scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          scheme.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter((scheme) =>
        filters.categories.includes(scheme.category)
      );
    }

    // Apply applicant type filter
    if (filters.applicantType.length > 0) {
      filtered = filtered.filter((scheme) =>
        filters.applicantType.includes(scheme.applicantType)
      );
    }

    setFilteredSchemes(filtered);
  }, [searchQuery, filters, schemes]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A2540] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading your schemes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F6F9] text-gray-800 min-h-screen flex flex-col">
      
       

      {/* Hero Search Section */}
      <section className="bg-[#0F2342] pb-10 pt-4 border-b border-[#1A3865]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
        

          {/* Section Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 tracking-tight">
            {copy.schemes.title}
          </h1>

          {/* Search Bar */}
          <div className="relative w-full shadow-lg rounded-md overflow-hidden bg-white flex">
            <input
              className="w-full px-4 py-3.5 text-sm text-gray-700 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-gray-400"
              placeholder={copy.schemes.searchPlaceholder}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <button
              aria-label="Submit Search"
              className="bg-[#F97316] hover:bg-[#EA580C] text-white px-7 flex items-center justify-center transition-colors duration-150"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter Sidebar */}
          <FilterSidebar onFilterChange={handleFilterChange} />

          {/* Schemes Content */}
          <section className="flex-1">
            {/* Header: Scheme Count */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                {copy.schemes.showing} {filteredSchemes.length} {copy.schemes.schemesCount}
              </h2>
              <div className="flex items-center text-xs text-gray-500 space-x-2">
                <span>{copy.schemes.sortBy}</span>
                <select className="text-xs border-gray-300 rounded py-1 pl-2 pr-6 focus:ring-orange-500 focus:border-orange-500">
                  <option>{copy.schemes.relevance}</option>
                  <option>{copy.schemes.newest}</option>
                  <option>{copy.schemes.funding}</option>
                </select>
              </div>
            </div>

            {/* Profile Summary */}
            {profile && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">{copy.schemes.profileSummary}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">{copy.schemes.name}:</span>
                    <p className="font-semibold text-gray-800">{profile.full_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{copy.schemes.ageRange}:</span>
                    <p className="font-semibold text-gray-800">{profile.age_range}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{copy.schemes.state}:</span>
                    <p className="font-semibold text-gray-800">{profile.state}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{copy.schemes.occupation}:</span>
                    <p className="font-semibold text-gray-800">{profile.occupation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Schemes Grid */}
            {filteredSchemes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSchemes.map((scheme) => (
                  <SchemeCard
                    key={scheme.id}
                    name={scheme.name}
                    department={scheme.department}
                    description={scheme.description}
                    financialAid={scheme.financialAid}
                    eligibility={scheme.eligibility}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {copy.schemes.noSchemes}
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {copy.schemes.noSchemesText}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Floating AI Assistant */}
      <aside className="fixed bottom-6 right-6 z-50 flex items-center space-x-2">
        <button
          className="bg-[#0F2342] text-white pl-2 pr-4 py-1.5 rounded-full shadow-xl flex items-center space-x-2.5 border border-white/10 hover:bg-[#173663] transition-colors duration-150"
          type="button"
        >
          <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 24 24">
              <path d="M12 2L14.2 8.4H20.8L15.4 12.4L17.6 18.8L12 14.8L6.4 18.8L8.6 12.4L3.2 8.4H9.8L12 2Z"></path>
            </svg>
          </span>
          <span className="text-xs font-medium tracking-tight">Chat with YojnaMitra AI</span>
        </button>
        <button
          aria-label="Open Chat Window"
          className="w-10 h-10 rounded-full bg-[#0F2342] text-white shadow-xl flex items-center justify-center border border-white/10 hover:bg-[#173663] transition-colors duration-150"
          type="button"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"></path>
          </svg>
        </button>
      </aside>
    </div>
  );
}
