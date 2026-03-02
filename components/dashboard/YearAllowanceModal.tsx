"use client";
import { useState, useEffect } from "react";
import type { YearAllowance } from "@/types";
import FormField from "@/components/FormField";
import Button from "@/components/Button";
import CompanySelect from "@/components/CompanySelect";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";
import { MONTH_NAMES_LONG } from "@/variables/calendar";
import { usersController } from "@/controllers/usersController";

export default function YearAllowanceModal({
  initialYear,
  existing,
  existingCompanies,
  onClose,
  onSave,
}: YearAllowanceModalProps) {
  return (
    <FormValidationProvider>
      <YearAllowanceModalInner
        initialYear={initialYear}
        existing={existing}
        existingCompanies={existingCompanies}
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
          <CompanySelect
            id="ya-company"
            label="Company"
            value={company}
            onChange={setCompany}
            companies={companies}
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
          <p className="text-sm text-gray-500">
            Total: <strong>{core + bought + carried}</strong> days
          </p>
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
    onSave({ year, company, holidayStartMonth, core, bought, carried });
  }
}

interface YearAllowanceModalProps {
  initialYear?: number;
  existing?: YearAllowance;
  /** Existing company names to pre-populate the selector (will be merged with API results) */
  existingCompanies?: string[];
  onClose: () => void;
  onSave: (allowance: YearAllowance) => void;
}
