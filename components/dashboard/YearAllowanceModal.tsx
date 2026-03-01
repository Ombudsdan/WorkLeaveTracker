"use client";
import { useState } from "react";
import type { YearAllowance } from "@/types";
import FormField from "@/components/FormField";
import Button from "@/components/Button";

export default function YearAllowanceModal({
  initialYear,
  existing,
  onClose,
  onSave,
}: YearAllowanceModalProps) {
  const [year, setYear] = useState(existing?.year ?? initialYear ?? new Date().getFullYear());
  const [core, setCore] = useState(existing?.core ?? 25);
  const [bought, setBought] = useState(existing?.bought ?? 0);
  const [carried, setCarried] = useState(existing?.carried ?? 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-800 mb-4">
          {existing ? "Edit" : "Add"} Year Allowance
        </h3>
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
    onSave({ year, core, bought, carried });
  }
}

interface YearAllowanceModalProps {
  initialYear?: number;
  existing?: YearAllowance;
  onClose: () => void;
  onSave: (allowance: YearAllowance) => void;
}
