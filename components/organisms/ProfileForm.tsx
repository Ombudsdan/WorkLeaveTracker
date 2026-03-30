"use client";
import { CheckCircle } from "lucide-react";
import type { YearAllowance, UkCountry } from "@/types";
import FormField from "@/components/molecules/FormField";
import Button from "@/components/atoms/Button";
import WorkingDaysPicker from "@/components/molecules/WorkingDaysPicker";
import AllowanceListItem from "@/components/molecules/AllowanceListItem";

const UK_COUNTRIES: { value: UkCountry; label: string }[] = [
  { value: "england-and-wales", label: "England & Wales" },
  { value: "scotland", label: "Scotland" },
  { value: "northern-ireland", label: "Northern Ireland" },
];

export interface ProfileFormProps {
  firstName: string;
  onFirstNameChange: (v: string) => void;
  lastName: string;
  onLastNameChange: (v: string) => void;
  /** Read-only — shown but not editable. */
  email: string;
  workingDays: number[];
  onWorkingDaysChange: (days: number[]) => void;
  country: UkCountry | "";
  onCountryChange: (v: UkCountry | "") => void;
  yearAllowances: YearAllowance[];
  /** The currently-active holiday year (used to drive AllowanceListItem highlight). */
  currentYear: number;
  onAddYear: () => void;
  onEditYear: (ya: YearAllowance) => void;
  onSave: () => void;
  /** When true, renders a "Saved successfully" confirmation. */
  saved?: boolean;
  submitError?: string;
}

/**
 * Full profile edit form organism.
 * Composed of: Personal Details, Bank Holidays Region, Working Days,
 * Leave Allowances and Save controls.
 *
 * All values and callbacks are controlled by the parent — no internal state.
 * Must be rendered inside a `FormValidationProvider`.
 */
export default function ProfileForm({
  firstName,
  onFirstNameChange,
  lastName,
  onLastNameChange,
  email,
  workingDays,
  onWorkingDaysChange,
  country,
  onCountryChange,
  yearAllowances,
  currentYear,
  onAddYear,
  onEditYear,
  onSave,
  saved = false,
  submitError,
}: ProfileFormProps) {
  const sorted = [...yearAllowances].sort(
    (a, b) => b.year - a.year || (a.active === false ? 1 : -1)
  );

  return (
    <div className="space-y-6">
      {/* Personal Details */}
      <section>
        <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
          Personal Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="profile-firstName"
            label="First Name"
            value={firstName}
            onChange={onFirstNameChange}
            required
          />
          <FormField
            id="profile-lastName"
            label="Last Name"
            value={lastName}
            onChange={onLastNameChange}
            required
          />
          <FormField
            id="profile-email"
            label="Email"
            type="email"
            value={email}
            readOnly
          />
        </div>
      </section>

      {/* Bank Holidays Region */}
      <section>
        <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
          Bank Holidays Region
        </h3>
        <div className="flex gap-2 flex-wrap">
          {UK_COUNTRIES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onCountryChange(country === opt.value ? "" : opt.value)}
              aria-pressed={country === opt.value}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition cursor-pointer ${
                country === opt.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Select your region to show the correct UK bank holidays
        </p>
      </section>

      {/* Working Days */}
      <section>
        <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
          Working Days
        </h3>
        <WorkingDaysPicker
          value={workingDays}
          onChange={onWorkingDaysChange}
          hint="Select the days you work"
        />
      </section>

      {/* Leave Allowances */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            Leave Allowances
          </h3>
          <button
            type="button"
            onClick={onAddYear}
            className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-indigo-700 transition cursor-pointer"
          >
            + Add Year
          </button>
        </div>
        {yearAllowances.length === 0 ? (
          <p className="text-sm text-gray-400">No allowances configured yet.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((ya, idx) => (
              <AllowanceListItem
                key={`${ya.year}-${ya.company}-${idx}`}
                allowance={ya}
                currentYear={currentYear}
                onEdit={ya.active !== false ? onEditYear : undefined}
              />
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">
          If you change companies, add a new allowance for the same year with your new company.
          Your previous allowance will be marked as ended.
        </p>
      </section>

      {/* Error / success feedback */}
      {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
      {saved && (
        <p className="flex items-center gap-1.5 text-green-600 text-sm">
          <CheckCircle size={16} aria-hidden="true" />
          Saved successfully
        </p>
      )}

      <Button type="button" variant="primary" onClick={onSave}>
        Save Profile
      </Button>
    </div>
  );
}
