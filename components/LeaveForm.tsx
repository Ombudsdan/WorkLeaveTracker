"use client";
import { useState } from "react";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
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
import { useFormValidation } from "@/contexts/FormValidationContext";
import { getEntryDuration } from "@/utils/dateHelpers";
import { SICK_LEAVE_ENABLED } from "@/utils/features";

export type DurationType = "full" | "am" | "pm";

export const DURATION_OPTIONS: { value: DurationType; label: string }[] = [
  { value: "full", label: "Full day(s)" },
  { value: "am", label: "Half Day AM" },
  { value: "pm", label: "Half Day PM" },
];

/** Map DurationType UI value to the canonical LeaveDuration enum */
const DURATION_TYPE_TO_ENUM: Record<DurationType, LeaveDuration> = {
  full: LeaveDuration.Full,
  am: LeaveDuration.HalfMorning,
  pm: LeaveDuration.HalfAfternoon,
};

/** Map LeaveDuration enum back to the DurationType used in the form */
function durationEnumToType(d: LeaveDuration): DurationType {
  if (d === LeaveDuration.HalfMorning) return "am";
  if (d === LeaveDuration.HalfAfternoon) return "pm";
  return "full";
}

/** Derive the DurationType from an existing LeaveEntry (handles legacy data) */
export function durationFromEntry(entry: LeaveEntry): DurationType {
  return durationEnumToType(getEntryDuration(entry));
}

export interface LeaveFormInitial {
  duration: DurationType;
  startDate: string;
  endDate: string;
  type: LeaveType | "";
  notes: string;
  status: LeaveStatus | "";
}

export interface LeaveFormProps {
  /**
   * Pre-filled values for edit mode.
   * Omitted fields fall back to empty / unselected defaults.
   */
  initial?: Partial<LeaveFormInitial>;
  /** Label for the primary save button. Defaults to "Save". */
  saveLabel?: string;
  /**
   * Called with the entry payload when the form is valid and the user
   * clicks save.  Does NOT include an `id`; callers in edit mode should
   * merge it themselves.
   */
  onSave: (entry: Omit<LeaveEntry, "id">) => void;
  onClose: () => void;
}

/**
 * Shared leave-entry form body (Duration, DatePicker, Type, Reason, Status).
 *
 * Must be rendered inside a `FormValidationProvider` — both `AddLeaveModal`
 * and `EditLeaveModal` provide one.
 */
export default function LeaveForm({
  initial,
  saveLabel = "Save",
  onSave,
  onClose,
}: LeaveFormProps) {
  const { triggerAllValidations, hasErrors } = useFormValidation();

  const [duration, setDuration] = useState<DurationType>(initial?.duration ?? "full");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [type, setType] = useState<LeaveType | "">(
    initial?.type ?? (SICK_LEAVE_ENABLED ? "" : LeaveType.Holiday)
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [status, setStatus] = useState<LeaveStatus | "">(initial?.status ?? "");
  const [showTopError, setShowTopError] = useState(false);

  const isHalfDay = duration !== "full";
  const isSick = type === LeaveType.Sick;

  const typeOptions = LEAVE_TYPE_ORDER
    .filter((t) => t !== LeaveType.Sick || SICK_LEAVE_ENABLED)
    .map((t) => ({
      value: t,
      label: LEAVE_TYPE_LABELS[t],
    }));

  const statusOptions = LEAVE_STATUS_ORDER.map((s) => ({
    value: s,
    label: LEAVE_STATUS_LABELS[s],
  }));

  function handleDurationChange(value: DurationType) {
    setDuration(value);
    // Clear dates only — type, notes and status are intentionally preserved
    setStartDate("");
    setEndDate("");
  }

  function handleTypeChange(v: LeaveType) {
    setType(v);
    if (v === LeaveType.Sick) {
      setStatus(LeaveStatus.Approved);
    } else if (type === LeaveType.Sick) {
      // Switching away from sick: reset status so user must re-pick
      setStatus("");
    }
  }

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
      duration: DURATION_TYPE_TO_ENUM[duration],
    });
  }

  return (
    <div className="space-y-4">
      {showTopError && hasErrors && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700"
        >
          Please fix the highlighted fields before saving.
        </div>
      )}

      {/* Duration */}
      <div>
        <span className="block text-sm font-medium text-gray-600 mb-2">Duration</span>
        <div className="flex gap-2 flex-wrap">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleDurationChange(opt.value)}
              aria-pressed={duration === opt.value}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition cursor-pointer ${
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
        id="leave-dateRange"
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
        halfDayMode={isHalfDay}
      />

      {/* Type */}
      <LeaveOptionPicker
        id="leave-type"
        label="Type"
        options={typeOptions}
        value={type}
        onChange={(v) => handleTypeChange(v)}
        required
      />

      {/* Reason */}
      <FormField
        id="leave-reason"
        label="Reason"
        value={notes}
        onChange={(v) => setNotes(v)}
        placeholder="e.g. Beach holiday"
        required
      />

      {/* Status — hidden when sick (auto-set to Approved) */}
      {!isSick && (
        <LeaveOptionPicker
          id="leave-status"
          label="Status"
          options={statusOptions}
          value={status}
          onChange={(v) => setStatus(v)}
          required
        />
      )}
      {isSick && (
        <p className="text-xs text-gray-400">
          Status is automatically set to <strong>Approved</strong> for sick leave.
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="primary" fullWidth onClick={handleSave}>
          {saveLabel}
        </Button>
        <Button variant="secondary" fullWidth onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
