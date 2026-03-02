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

export default function AddLeaveModal({ onClose, onSave }: AddLeaveModalProps) {
  return (
    <FormValidationProvider>
      <AddLeaveModalInner onClose={onClose} onSave={onSave} />
    </FormValidationProvider>
  );
}

function AddLeaveModalInner({ onClose, onSave }: AddLeaveModalProps) {
  const { triggerAllValidations, hasErrors } = useFormValidation();
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [halfDayPeriod, setHalfDayPeriod] = useState<"am" | "pm" | "">("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<LeaveType | "">("");
  const [status, setStatus] = useState<LeaveStatus | "">("");
  const [showTopError, setShowTopError] = useState(false);

  const isSick = type === LeaveType.Sick;

  const typeOptions = LEAVE_TYPE_ORDER.map((leaveType) => ({
    value: leaveType,
    label: LEAVE_TYPE_LABELS[leaveType],
  }));

  const statusOptions = LEAVE_STATUS_ORDER.map((leaveStatus) => ({
    value: leaveStatus,
    label: LEAVE_STATUS_LABELS[leaveStatus],
  }));

  const halfDayPeriodOptions = [
    { value: "am" as const, label: "AM" },
    { value: "pm" as const, label: "PM" },
  ];

  function handleTypeChange(v: LeaveType) {
    setType(v);
    if (v === LeaveType.Sick) {
      setStatus(LeaveStatus.Approved);
    } else if (status === LeaveStatus.Approved && type === LeaveType.Sick) {
      // Reset status if switching away from sick
      setStatus("");
    }
  }

  function handleHalfDayToggle(value: boolean) {
    setIsHalfDay(value);
    // Reset dates and period when toggling mode
    setStartDate("");
    setEndDate("");
    setHalfDayPeriod("");
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
          {/* Full day / Half day toggle */}
          <div>
            <span className="block text-sm font-medium text-gray-600 mb-2">Duration</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleHalfDayToggle(false)}
                aria-pressed={!isHalfDay}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  !isHalfDay
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                }`}
              >
                Full day(s)
              </button>
              <button
                type="button"
                onClick={() => handleHalfDayToggle(true)}
                aria-pressed={isHalfDay}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  isHalfDay
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                }`}
              >
                Half day
              </button>
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

          {/* AM/PM picker — only shown in half-day mode after a date is selected */}
          {isHalfDay && startDate && (
            <LeaveOptionPicker
              id="add-halfDayPeriod"
              label="Time of day"
              options={halfDayPeriodOptions}
              value={halfDayPeriod}
              onChange={(v) => setHalfDayPeriod(v)}
              required="Please select AM or PM"
            />
          )}

          {/* Reason — required, shown before Type */}
          <FormField
            id="add-reason"
            label="Reason"
            value={notes}
            onChange={(v) => setNotes(v)}
            placeholder="e.g. Beach holiday"
            required
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
        halfDayPeriod: halfDayPeriod as "am" | "pm",
      }),
    });
  }
}

interface AddLeaveModalProps {
  onClose: () => void;
  onSave: (entry: Omit<LeaveEntry, "id">) => void;
}
