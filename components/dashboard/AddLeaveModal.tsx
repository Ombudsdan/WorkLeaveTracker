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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<LeaveType | "">("");
  const [status, setStatus] = useState<LeaveStatus | "">("");
  const [notes, setNotes] = useState("");
  const [showTopError, setShowTopError] = useState(false);

  const typeOptions = LEAVE_TYPE_ORDER.map((leaveType) => ({
    value: leaveType,
    label: LEAVE_TYPE_LABELS[leaveType],
  }));

  const statusOptions = LEAVE_STATUS_ORDER.map((leaveStatus) => ({
    value: leaveStatus,
    label: LEAVE_STATUS_LABELS[leaveStatus],
  }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
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
          <DateRangePicker
            id="add-dateRange"
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
          <LeaveOptionPicker
            id="add-type"
            label="Type"
            options={typeOptions}
            value={type}
            onChange={(v) => setType(v)}
            required
          />
          <LeaveOptionPicker
            id="add-status"
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(v) => setStatus(v)}
            required
          />
          <FormField
            id="add-reason"
            label="Reason (optional)"
            value={notes}
            onChange={(v) => setNotes(v)}
            placeholder="e.g. Beach holiday"
          />
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
    onSave({
      startDate,
      endDate,
      status: status as LeaveStatus,
      type: type as LeaveType,
      notes,
    });
  }
}

interface AddLeaveModalProps {
  onClose: () => void;
  onSave: (entry: Omit<LeaveEntry, "id">) => void;
}
