"use client";
import { useState } from "react";
import { LeaveStatus } from "@/types";
import type { LeaveEntry } from "@/types";
import { LEAVE_STATUS_ORDER, LEAVE_STATUS_LABELS } from "@/variables/leaveConfig";
import FormField from "@/components/FormField";
import FormSelect from "@/components/FormSelect";
import Button from "@/components/Button";

export default function EditLeaveModal({
  entry,
  onClose,
  onSave,
}: EditLeaveModalProps) {
  const [startDate, setStartDate] = useState(entry.startDate);
  const [endDate, setEndDate] = useState(entry.endDate);
  const [status, setStatus] = useState<LeaveStatus>(entry.status);
  const [notes, setNotes] = useState(entry.notes ?? "");

  const statusOptions = LEAVE_STATUS_ORDER.map((leaveStatus) => ({
    value: leaveStatus,
    label: LEAVE_STATUS_LABELS[leaveStatus],
  }));

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
          <FormSelect
            id="edit-status"
            label="Status"
            value={status}
            onChange={(v) => setStatus(v)}
            options={statusOptions}
          />
          <FormField
            id="edit-notes"
            label="Notes (optional)"
            value={notes}
            onChange={(v) => setNotes(v)}
            placeholder="e.g. Beach holiday"
          />
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

  function handleSave() {
    onSave({ ...entry, startDate, endDate, status, notes });
  }
}

interface EditLeaveModalProps {
  entry: LeaveEntry;
  onClose: () => void;
  onSave: (entry: LeaveEntry) => void;
}
