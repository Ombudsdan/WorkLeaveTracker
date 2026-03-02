"use client";
import { useState } from "react";
import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry } from "@/types";
import { LEAVE_STATUS_ORDER, LEAVE_STATUS_LABELS } from "@/variables/leaveConfig";
import FormField from "@/components/FormField";
import LeaveOptionPicker from "@/components/LeaveOptionPicker";
import Button from "@/components/Button";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";

export default function EditLeaveModal({ entry, onClose, onSave }: EditLeaveModalProps) {
  return (
    <FormValidationProvider>
      <EditLeaveModalInner entry={entry} onClose={onClose} onSave={onSave} />
    </FormValidationProvider>
  );
}

function EditLeaveModalInner({ entry, onClose, onSave }: EditLeaveModalProps) {
  const { triggerAllValidations } = useFormValidation();
  const [startDate, setStartDate] = useState(entry.startDate);
  const [endDate, setEndDate] = useState(entry.endDate);
  const [status, setStatus] = useState<LeaveStatus>(entry.status);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [halfDayPeriod, setHalfDayPeriod] = useState<"am" | "pm" | "">(
    entry.halfDayPeriod ?? ""
  );

  const isSick = entry.type === LeaveType.Sick;
  const isHalfDay = entry.halfDay ?? false;

  const statusOptions = LEAVE_STATUS_ORDER.map((leaveStatus) => ({
    value: leaveStatus,
    label: LEAVE_STATUS_LABELS[leaveStatus],
  }));

  const halfDayPeriodOptions = [
    { value: "am" as const, label: "AM" },
    { value: "pm" as const, label: "PM" },
  ];

  function handleSave() {
    const valid = triggerAllValidations();
    if (!valid) return;
    const resolvedStatus = isSick ? LeaveStatus.Approved : status;
    onSave({
      ...entry,
      startDate,
      endDate,
      status: resolvedStatus,
      notes,
      ...(isHalfDay && { halfDayPeriod: halfDayPeriod as "am" | "pm" }),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-bold text-gray-800 mb-4">Edit Leave</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="edit-startDate"
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(v) => setStartDate(v)}
              required
            />
            <FormField
              id="edit-endDate"
              label="End Date"
              type="date"
              value={endDate}
              onChange={(v) => setEndDate(v)}
              required
            />
          </div>

          {/* Reason — required */}
          <FormField
            id="edit-reason"
            label="Reason"
            value={notes}
            onChange={(v) => setNotes(v)}
            placeholder="e.g. Beach holiday"
            required
          />

          {/* AM/PM picker for half-day entries */}
          {isHalfDay && (
            <LeaveOptionPicker
              id="edit-halfDayPeriod"
              label="Time of day"
              options={halfDayPeriodOptions}
              value={halfDayPeriod}
              onChange={(v) => setHalfDayPeriod(v)}
              required="Please select AM or PM"
            />
          )}

          {/* Status pills — hidden for sick leave */}
          {!isSick && (
            <LeaveOptionPicker
              id="edit-status"
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
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="primary" fullWidth onClick={handleSave}>
            Save Changes
          </Button>
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

interface EditLeaveModalProps {
  entry: LeaveEntry;
  onClose: () => void;
  onSave: (entry: LeaveEntry) => void;
}
