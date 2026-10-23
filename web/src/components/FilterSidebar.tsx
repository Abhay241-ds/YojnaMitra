"use client";

import { useState } from "react";
import { useCopy } from "@/lib/i18n";

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  categories: string[];
  location: { state: boolean; district: boolean };
  applicantType: string[];
  gender: boolean;
  benefits: boolean;
}

export default function FilterSidebar({ onFilterChange }: FilterSidebarProps) {
  const copy = useCopy();
  const [filters, setFilters] = useState<FilterState>({
    categories: ["Agriculture"],
    location: { state: false, district: false },
    applicantType: ["Farmer"],
    gender: false,
    benefits: false,
  });

  const handleCategoryChange = (category: string, checked: boolean) => {
    // If "All" is selected, clear all categories
    if (category === "All" && checked) {
      const newFilters = { ...filters, categories: [] };
      setFilters(newFilters);
      onFilterChange(newFilters);
      return;
    }

    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter((c) => c !== category);
    const newFilters = { ...filters, categories: newCategories };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleApplicantTypeChange = (type: string, checked: boolean) => {
    // If "All" is selected, clear all applicant types
    if (type === "All" && checked) {
      const newFilters = { ...filters, applicantType: [] };
      setFilters(newFilters);
      onFilterChange(newFilters);
      return;
    }

    const newTypes = checked
      ? [...filters.applicantType, type]
      : filters.applicantType.filter((t) => t !== type);
    const newFilters = { ...filters, applicantType: newTypes };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleLocationChange = (field: keyof FilterState["location"], checked: boolean) => {
    const newLocation = { ...filters.location, [field]: checked };
    const newFilters = { ...filters, location: newLocation };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleToggleChange = (field: keyof Pick<FilterState, "gender" | "benefits">) => {
    const newFilters = { ...filters, [field]: !filters[field] };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-[#12284C] text-white rounded-lg shadow p-4 space-y-5">
        {/* Categories Filter Block */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-white/10 cursor-pointer">
            <span className="text-sm font-semibold tracking-wide">{copy.schemes.categories}</span>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <div className="mt-3 space-y-2 text-xs text-gray-200">
            <label className="flex items-center space-x-2.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={filters.categories.length === 0}
                onChange={(e) => handleCategoryChange("All", e.target.checked)}
                className="rounded filter-checkbox text-orange-500 focus:ring-orange-400"
              />
              <span className={filters.categories.length === 0 ? "text-white font-medium" : ""}>{copy.schemes.all}</span>
            </label>
            {[
              { key: "Education", label: copy.schemes.education },
              { key: "Agriculture", label: copy.schemes.agriculture },
              { key: "Health", label: copy.schemes.health },
              { key: "Housing", label: copy.schemes.housing },
              { key: "Women", label: copy.schemes.women },
              { key: "Business", label: copy.schemes.business },
            ].map((category) => (
              <label key={category.key} className="flex items-center space-x-2.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category.key)}
                  onChange={(e) => handleCategoryChange(category.key, e.target.checked)}
                  className="rounded filter-checkbox text-orange-500 focus:ring-orange-400"
                />
                <span className={filters.categories.includes(category.key) ? "text-white font-medium" : ""}>{category.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Location Filter Block */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-white/10 cursor-pointer">
            <span className="text-sm font-semibold tracking-wide">{copy.schemes.location}</span>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <div className="mt-3 space-y-2 text-xs text-gray-200">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.location.state}
                  onChange={(e) => handleLocationChange("state", e.target.checked)}
                  className="rounded filter-checkbox text-orange-500"
                />
                <span>{copy.schemes.state}</span>
              </label>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.location.district}
                  onChange={(e) => handleLocationChange("district", e.target.checked)}
                  className="rounded filter-checkbox text-orange-500"
                />
                <span>{copy.schemes.district}</span>
              </label>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Applicant Type Block */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-white/10 cursor-pointer">
            <span className="text-sm font-semibold tracking-wide">{copy.schemes.applicantType}</span>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <div className="mt-3 space-y-2 text-xs text-gray-200">
            <label className="flex items-center space-x-2.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={filters.applicantType.length === 0}
                onChange={(e) => handleApplicantTypeChange("All", e.target.checked)}
                className="rounded filter-checkbox text-orange-500 focus:ring-orange-400"
              />
              <span className={filters.applicantType.length === 0 ? "text-white font-medium" : ""}>{copy.schemes.all}</span>
            </label>
            {[
              { key: "Farmer", label: copy.schemes.farmer },
              { key: "Student", label: copy.schemes.student },
              { key: "Senior Citizen", label: copy.schemes.seniorCitizen },
              { key: "Business Owner", label: copy.schemes.businessOwner },
            ].map((type) => (
              <label key={type.key} className="flex items-center space-x-2.5 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={filters.applicantType.includes(type.key)}
                  onChange={(e) => handleApplicantTypeChange(type.key, e.target.checked)}
                  className="rounded filter-checkbox text-orange-500 focus:ring-orange-400"
                />
                <span className={filters.applicantType.includes(type.key) ? "text-white font-medium" : ""}>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Gender Section */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-white/10 cursor-pointer">
            <span className="text-sm font-semibold tracking-wide">{copy.schemes.gender}</span>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-200">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.gender}
                onChange={() => handleToggleChange("gender")}
                className="rounded filter-checkbox text-orange-500"
              />
              <span>{copy.schemes.all} / Specific</span>
            </label>
            <div className="flex space-x-1">
              <span className={`w-2.5 h-2.5 rounded-full ${filters.gender ? "bg-orange-500" : "bg-gray-400"}`}></span>
              <span className={`w-2.5 h-2.5 rounded-full ${!filters.gender ? "bg-orange-500" : "bg-gray-400"}`}></span>
            </div>
          </div>
        </div>

        {/* Benefits Filter Block */}
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-white/10 cursor-pointer">
            <span className="text-sm font-semibold tracking-wide">{copy.schemes.benefits}</span>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <div className="mt-2 text-xs text-gray-300 flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.benefits}
              onChange={() => handleToggleChange("benefits")}
              className="rounded filter-checkbox text-orange-500"
            />
            <span>{copy.schemes.dbt}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
