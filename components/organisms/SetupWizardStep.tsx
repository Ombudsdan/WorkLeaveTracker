"use client";
import type { FormEvent } from "react";
import { BankHolidayHandling } from "@/types";
import FormField from "@/components/FormField";
import Button from "@/components/Button";
import CompanySelect from "@/components/CompanySelect";
import WorkingDaysPicker from "@/components/molecules/WorkingDaysPicker";
import { MONTH_NAMES_LONG } from "@/variables/calendar";

export interface SetupWizardStepProps {
  /** Selected working days (0 = Sun … 6 = Sat). */
  workingDays: number[];
  onWorkingDaysChange: (days: number[]) => void;
  company: string;
  onCompanyChange: (v: string) => void;
  /** Existing company names for the dropdown. */
  companies: string[];
  /** 1-indexed month (1 = January). */
  holidayStartMonth: number;
  onHolidayStartMonthChange: (v: number) => void;
  coreDays: number;
  onCoreDaysChange: (v: number) => void;
  boughtDays: number;
  onBoughtDaysChange: (v: number) => void;
  carriedDays: number;
  onCarriedDaysChange: (v: number) => void;
  bankHolidayHandling: BankHolidayHandling;
  onBankHolidayHandlingChange: (v: BankHolidayHandling) => void;
  /** The leave year being configured — shown in the section heading. */
  currentYear: number;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  /** When true, the submit button shows "Saving…" and is disabled. */
  saving?: boolean;
  submitError?: string;
}

/**
 * Setup wizard step organism.
 * Renders Working Days, Leave Allowance inputs and an action button.
 * Must be rendered inside a `FormValidationProvider`.
 */
export default function SetupWizardStep({
  workingDays,
  onWorkingDaysChange,
  company,
  onCompanyChange,
  companies,
  holidayStartMonth,
  onHolidayStartMonthChange,
  coreDays,
  onCoreDaysChange,
  boughtDays,
  onBoughtDaysChange,
  carriedDays,
  onCarriedDaysChange,
  bankHolidayHandling,
  onBankHolidayHandlingChange,
  currentYear,
  onSubmit,
  saving = false,
  submitError,
}: SetupWizardStepProps) {
  const total = coreDays + boughtDays + carriedDays;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" data-testid="setup-wizard-step">
      {/* Working Days */}
      <section>
        <h3 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">
          Working Days
        </h3>
        <WorkingDaysPicker
          value={workingDays}
          onChange={onWorkingDaysChange}
          hint="Select the days you work"
        />
      </section>

      {/* Leave Allowance */}
      <section>
        <h3 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">
          Leave Allowance for {currentYear}
        </h3>
        <div className="space-y-3">
          <CompanySelect
            id="setup-company"
            label="Company"
            value={company}
            onChange={onCompanyChange}
            companies={companies}
          />

          <div>
            <label
              htmlFor="setup-holidayStartMonth"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Holiday Year Starts
            </label>
            <select
              id="setup-holidayStartMonth"
              value={holidayStartMonth}
              onChange={(e) => onHolidayStartMonthChange(Number(e.target.value))}
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
            id="setup-core"
            label="Core Days"
            type="number"
            value={coreDays}
            onChange={(v) => onCoreDaysChange(Number(v))}
            min={1}
            max={365}
            required
          />
          <FormField
            id="setup-bought"
            label="Days Bought"
            type="number"
            value={boughtDays}
            onChange={(v) => onBoughtDaysChange(Number(v))}
            min={0}
            max={365}
          />
          <FormField
            id="setup-carried"
            label="Days Carried Over"
            type="number"
            value={carriedDays}
            onChange={(v) => onCarriedDaysChange(Number(v))}
            min={0}
            max={365}
          />

          <div>
            <label
              htmlFor="setup-bankHolidayHandling"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Bank Holidays
            </label>
            <select
              id="setup-bankHolidayHandling"
              value={bankHolidayHandling}
              onChange={(e) =>
                onBankHolidayHandlingChange(e.target.value as BankHolidayHandling)
              }
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

          <p className="text-sm text-gray-500" data-testid="allowance-total">
            Total: <strong>{total}</strong> days
          </p>
        </div>
      </section>

      {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

      <Button type="submit" variant="primary" fullWidth disabled={saving}>
        {saving ? "Saving…" : "Save & Go to Dashboard"}
      </Button>
    </form>
  );
}
