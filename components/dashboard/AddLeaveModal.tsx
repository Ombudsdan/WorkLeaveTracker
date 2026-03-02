"use client";
import { useState } from "react";
import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry } from "@/types";
import {
  LEAVE_STATUS_ORDER,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_ORDER,
  LEAVE_TYPE_LABELS,
} from "@/variables/leaveConfig";
import FormField from "@/components/FormField";
import DateRangePicker from "@/components/DateRangePicker";
import LeaveOptionPicker from "@/components/LeaveOptionPicker";
import Button from "@/components/Button";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";

type DurationType = "full" | "am" | "pm";

const DURATION_OPTIONS: { value: DurationType; label: string }[] = [
  { value: "full", label: "Full day(s)" },
  { value: "am", label: "Half Day AM" },
  { value: "pm", label: "Half Day PM" },
];

export default function AddLeaveModal({ onClose, onSave }: AddLeaveModalProps) {
  return (
    <FormValidationProvider>
      <AddLeaveModalInner onClose={onClose} onSave={onSave} />
    </FormValidationProvider>
  );
}

function AddLeaveModalInner({ onClose, onSave }: AddLeaveModalProps) {
  const { triggerAllValidations, hasErrors } = useFormValidation();
  const [duration, setDuration] = useState<DurationType>("full");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<LeaveType | "">("");
  const [status, setStatus] = useState<LeaveStatus | "">("");
  const [showTopError, setShowTopError] = useState(false);

  const isHalfDay = duration !== "full";
  const isSick = type === LeaveType.Sick;

  const typeOptions = LEAVE_TYPE_ORDER.map((leaveType) => ({
    value: leaveType,
    label: LEAVE_TYPE_LABELS[leaveType],
  }));

  const statusOptions = LEAVE_STATUS_ORDER.map((leaveStatus) => ({
    value: leaveStatus,
    label: LEAVE_STATUS_LABELS[leaveStatus],
  }));

  function handleDurationChange(value: DurationType) {
    setDuration(value);
    // Reset dates when switching mode so the picker is fresh
    setStartDate("");
    setEndDate("");
  }

  function handleTypeChange(v: LeaveType) {
    setType(v);
    if (v === LeaveType.Sick) {
      setStatus(LeaveStatus.Approved);
    } else if (type === LeaveType.Sick) {
      // Reset status when switching away from sick
      setStatus("");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-gray-800 mb-4">Add Leave</h3>
        {showTopError && hasErrors && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700"
          >
            Please fix the highlighted fields before saving.
          </div>
        )}
        <div className="space-y-4">
          {/* Duration — Full day(s) / Half Day AM / Half Day PM */}
          <div>
            <span className="block text-sm font-medium text-gray-600 mb-2">Duration</span>
            <div className="flex gap-2 flex-wrap">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleDurationChange(opt.value)}
                  aria-pressed={duration === opt.value}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    duration === opt.value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date picker */}
          <DateRangePicker
            id="add-dateRange"
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
            halfDayMode={isHalfDay}
          />

          {/* Type */}
          <LeaveOptionPicker
            id="add-type"
            label="Type"
            options={typeOptions}
            value={type}
            onChange={(v) => handleTypeChange(v)}
            required
          />

          {/* Reason — required */}
          <FormField
            id="add-reason"
            label="Reason"
            value={notes}
            onChange={(v) => setNotes(v)}
            placeholder="e.g. Beach holiday"
            required
          />

          {/* Status — hidden for sick leave (auto-set to Approved) */}
          {!isSick && (
            <LeaveOptionPicker
              id="add-status"
              label="Status"
              options={statusOptions}
              value={status}
              onChange={(v) => setStatus(v)}
              required
            />
          )}
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
    const valid = triggerAllValidations();
    if (!valid) {
      setShowTopError(true);
      return;
    }
    setShowTopError(false);
    const resolvedStatus = isSick ? LeaveStatus.Approved : (status as LeaveStatus);
    onSave({
      startDate,
      endDate,
      status: resolvedStatus,
      type: type as LeaveType,
      notes,
      ...(isHalfDay && {
        halfDay: true,
        halfDayPeriod: duration as "am" | "pm",
      }),
    });
  }
}

interface AddLeaveModalProps {
  onClose: () => void;
  onSave: (entry: Omit<LeaveEntry, "id">) => void;
}
