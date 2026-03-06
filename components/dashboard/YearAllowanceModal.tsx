"use client";
import { useState, useEffect } from "react";
import { BankHolidayHandling } from "@/types";
import type { YearAllowance } from "@/types";
import FormField from "@/components/FormField";
import Button from "@/components/Button";
import CompanyCombobox from "@/components/CompanyCombobox";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";
import { MONTH_NAMES_LONG } from "@/variables/calendar";
import { usersController } from "@/controllers/usersController";
import { yearAllowanceDates, yearAllowancesOverlap } from "@/utils/dateHelpers";

export default function YearAllowanceModal({
  initialYear,
  existing,
  existingCompanies,
  existingAllowances,
  onClose,
  onSave,
}: YearAllowanceModalProps) {
  return (
    <FormValidationProvider>
      <YearAllowanceModalInner
        initialYear={initialYear}
        existing={existing}
        existingCompanies={existingCompanies}
        existingAllowances={existingAllowances}
        onClose={onClose}
        onSave={onSave}
      />
    </FormValidationProvider>
  );
}

function YearAllowanceModalInner({
  initialYear,
  existing,
  existingCompanies = [],
  existingAllowances = [],
  onClose,
  onSave,
}: YearAllowanceModalProps) {
  const { triggerAllValidations } = useFormValidation();
  const [year, setYear] = useState(existing?.year ?? initialYear ?? new Date().getFullYear());
  const [company, setCompany] = useState(existing?.company ?? "");
  const [holidayStartMonth, setHolidayStartMonth] = useState(existing?.holidayStartMonth ?? 1);

  // Hours vs Days toggle — restored from the saved allowance preference
  const initialUseHours = existing?.useHoursDisplay ?? false;
  const initialCoreHoursPerDay = existing?.coreHoursPerDay ?? 7.5;
  const [useHoursDisplay, setUseHoursDisplay] = useState(initialUseHours);
  const [coreHoursPerDay, setCoreHoursPerDay] = useState(initialCoreHoursPerDay);

  // Compute initial display values: if loading an existing allowance in Hours mode,
  // convert the stored decimal days to hours using the stored conversion rate.
  const toInitialHours = (days: number) => parseFloat((days * initialCoreHoursPerDay).toFixed(4));

  const [core, setCore] = useState(() => {
    if (!existing) return initialUseHours ? 25 * initialCoreHoursPerDay : 25;
    return initialUseHours ? toInitialHours(existing.core) : existing.core;
  });
  const [bought, setBought] = useState(() => {
    if (!existing) return 0;
    return initialUseHours ? toInitialHours(existing.bought) : existing.bought;
  });
  const [carried, setCarried] = useState(() => {
    if (!existing) return 0;
    return initialUseHours ? toInitialHours(existing.carried) : existing.carried;
  });
  const [bankHolidayHandling, setBankHolidayHandling] = useState<BankHolidayHandling>(
    existing?.bankHolidayHandling ?? BankHolidayHandling.None
  );
  const [overlapError, setOverlapError] = useState("");

  // Re-convert field values whenever the user flips the toggle so the displayed
  // number stays consistent with the selected unit.
  function handleToggleUnit(toHours: boolean) {
    if (toHours === useHoursDisplay) return;
    if (toHours) {
      // days → hours
      setCore((v) => parseFloat((v * coreHoursPerDay).toFixed(4)));
      setBought((v) => parseFloat((v * coreHoursPerDay).toFixed(4)));
      setCarried((v) => parseFloat((v * coreHoursPerDay).toFixed(4)));
    } else {
      // hours → days
      setCore((v) => parseFloat((v / coreHoursPerDay).toFixed(4)));
      setBought((v) => parseFloat((v / coreHoursPerDay).toFixed(4)));
      setCarried((v) => parseFloat((v / coreHoursPerDay).toFixed(4)));
    }
    setUseHoursDisplay(toHours);
  }

  // Merge prop-provided companies with anything fetched from the API
  const [companies, setCompanies] = useState<string[]>(existingCompanies);

  useEffect(() => {
    usersController.fetchCompanies().then((fetched) => {
      if (fetched.length > 0) {
        setCompanies((prev) => [...new Set([...prev, ...fetched])]);
      }
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-800 mb-4">{existing ? "Edit" : "Add"} Year Allowance</h3>
        <div className="space-y-3">
          <FormField
            id="ya-year"
            label="Holiday Year"
            type="number"
            value={year}
            onChange={(v) => setYear(Number(v))}
            min={2000}
            max={2100}
            required
          />
          <CompanyCombobox
            id="ya-company"
            label="Company"
            value={company}
            onChange={setCompany}
            suggestions={companies}
          />
          <div>
            <label
              htmlFor="ya-holidayStartMonth"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Holiday Year Starts
            </label>
            <select
              id="ya-holidayStartMonth"
              value={holidayStartMonth}
              onChange={(e) => setHolidayStartMonth(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            >
              {MONTH_NAMES_LONG.map((month, index) => (
                <option key={index} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          {/* Hours / Days toggle */}
          <div>
            <span className="block text-sm font-medium text-gray-600 mb-1">Allowance Unit</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
              <button
                type="button"
                aria-pressed={!useHoursDisplay}
                onClick={() => handleToggleUnit(false)}
                className={`flex-1 py-1.5 font-medium transition-colors cursor-pointer ${
                  !useHoursDisplay
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Days
              </button>
              <button
                type="button"
                aria-pressed={useHoursDisplay}
                onClick={() => handleToggleUnit(true)}
                className={`flex-1 py-1.5 font-medium transition-colors cursor-pointer ${
                  useHoursDisplay
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Hours
              </button>
            </div>
          </div>

          {/* Core Daily Hours — only shown when Hours mode is active */}
          {useHoursDisplay && (
            <FormField
              id="ya-coreHoursPerDay"
              label="Core Daily Hours"
              type="number"
              value={coreHoursPerDay}
              onChange={(v) => setCoreHoursPerDay(Number(v))}
              min={0.1}
              max={24}
              step={0.5}
            />
          )}

          <FormField
            id="ya-core"
            label={useHoursDisplay ? "Core Hours" : "Core Days"}
            type="number"
            value={core}
            onChange={(v) => setCore(Number(v))}
            min={useHoursDisplay ? 0.1 : 1}
            max={useHoursDisplay ? 9999 : 365}
            step={useHoursDisplay ? 0.5 : 1}
            required
          />
          <FormField
            id="ya-bought"
            label={useHoursDisplay ? "Hours Bought" : "Days Bought"}
            type="number"
            value={bought}
            onChange={(v) => setBought(Number(v))}
            min={0}
            max={useHoursDisplay ? 9999 : 365}
            step={useHoursDisplay ? 0.5 : 1}
          />
          <FormField
            id="ya-carried"
            label={useHoursDisplay ? "Hours Carried Over" : "Days Carried Over"}
            type="number"
            value={carried}
            onChange={(v) => setCarried(Number(v))}
            min={0}
            max={useHoursDisplay ? 9999 : 365}
            step={useHoursDisplay ? 0.5 : 1}
          />
          <div>
            <label
              htmlFor="ya-bankHolidayHandling"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Bank Holidays
            </label>
            <select
              id="ya-bankHolidayHandling"
              value={bankHolidayHandling}
              onChange={(e) => setBankHolidayHandling(e.target.value as BankHolidayHandling)}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            >
              <option value={BankHolidayHandling.None}>
                Do not use annual leave for bank holidays
              </option>
              <option value={BankHolidayHandling.Deduct}>
                Use annual leave for bank holidays on working days
              </option>
            </select>
          </div>
          {overlapError && <p className="text-red-500 text-sm">{overlapError}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="primary" fullWidth onClick={handleSave}>
            Save
          </Button>
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  function handleSave() {
    if (!triggerAllValidations()) return;

    // Check for overlapping date ranges within the same company
    const normalizedCompany = company.trim().toLowerCase();
    const { startDate, endDate } = yearAllowanceDates(year, holidayStartMonth);
    const conflict = existingAllowances.find((a) => {
      // Skip the allowance being edited and inactive allowances
      if (a.active === false) return false;
      if (
        existing &&
        a.year === existing.year &&
        a.company.trim().toLowerCase() === existing.company.trim().toLowerCase()
      ) {
        return false;
      }
      // Only check allowances for the same company (empty company only matches empty company)
      if (a.company.trim().toLowerCase() !== normalizedCompany) return false;
      const aComputed = yearAllowanceDates(a.year, a.holidayStartMonth ?? 1);
      const aStart = a.startDate ?? aComputed.startDate;
      const aEnd = a.endDate ?? aComputed.endDate;
      return yearAllowancesOverlap({ startDate, endDate }, { startDate: aStart, endDate: aEnd });
    });

    if (conflict) {
      const conflictStart =
        conflict.startDate ??
        yearAllowanceDates(conflict.year, conflict.holidayStartMonth ?? 1).startDate;
      const conflictEnd =
        conflict.endDate ??
        yearAllowanceDates(conflict.year, conflict.holidayStartMonth ?? 1).endDate;
      setOverlapError(
        `This date range overlaps with an existing allowance (${conflictStart} – ${conflictEnd}).`
      );
      return;
    }

    setOverlapError("");

    // When the user is working in Hours mode, convert the displayed values back
    // to decimal days before persisting.  The `useHoursDisplay` preference and
    // the `coreHoursPerDay` rate are stored alongside the allowance so the
    // modal can restore the same unit next time it opens.
    const toDays = (v: number) =>
      useHoursDisplay ? parseFloat((v / coreHoursPerDay).toFixed(10)) : v;

    onSave({
      year,
      company,
      holidayStartMonth,
      core: toDays(core),
      bought: toDays(bought),
      carried: toDays(carried),
      bankHolidayHandling,
      useHoursDisplay,
      coreHoursPerDay: useHoursDisplay ? coreHoursPerDay : undefined,
    });
  }
}

interface YearAllowanceModalProps {
  initialYear?: number;
  existing?: YearAllowance;
  /** Existing company names to pre-populate the suggestions list (will be merged with API results) */
  existingCompanies?: string[];
  /** All current allowances — used to detect overlapping date ranges before saving */
  existingAllowances?: YearAllowance[];
  onClose: () => void;
  onSave: (allowance: YearAllowance) => void;
}
