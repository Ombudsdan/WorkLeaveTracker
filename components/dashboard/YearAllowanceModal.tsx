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
  const [core, setCore] = useState(existing?.core ?? 25);
  const [bought, setBought] = useState(existing?.bought ?? 0);
  const [carried, setCarried] = useState(existing?.carried ?? 0);
  const [bankHolidayHandling, setBankHolidayHandling] = useState<BankHolidayHandling>(
    existing?.bankHolidayHandling ?? BankHolidayHandling.None
  );
  const [overlapError, setOverlapError] = useState("");

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
          <FormField
            id="ya-core"
            label="Core Days"
            type="number"
            value={core}
            onChange={(v) => setCore(Number(v))}
            min={1}
            max={365}
            required
          />
          <FormField
            id="ya-bought"
            label="Days Bought"
            type="number"
            value={bought}
            onChange={(v) => setBought(Number(v))}
            min={0}
            max={365}
          />
          <FormField
            id="ya-carried"
            label="Days Carried Over"
            type="number"
            value={carried}
            onChange={(v) => setCarried(Number(v))}
            min={0}
            max={365}
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
    onSave({ year, company, holidayStartMonth, core, bought, carried, bankHolidayHandling });
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
