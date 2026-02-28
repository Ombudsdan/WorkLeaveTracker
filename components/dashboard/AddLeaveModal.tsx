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
import FormSelect from "@/components/FormSelect";
import Button from "@/components/Button";

export default function AddLeaveModal({ onClose, onSave }: AddLeaveModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<LeaveStatus>(LeaveStatus.Planned);
  const [type, setType] = useState<LeaveType>(LeaveType.Holiday);
  const [notes, setNotes] = useState("");

  const statusOptions = LEAVE_STATUS_ORDER.map((leaveStatus) => ({
    value: leaveStatus,
    label: LEAVE_STATUS_LABELS[leaveStatus],
  }));

  const typeOptions = LEAVE_TYPE_ORDER.map((leaveType) => ({
    value: leaveType,
    label: LEAVE_TYPE_LABELS[leaveType],
  }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-bold text-gray-800 mb-4">Add Leave</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="add-startDate"
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(v) => setStartDate(v)}
              required
            />
            <FormField
              id="add-endDate"
              label="End Date"
              type="date"
              value={endDate}
              onChange={(v) => setEndDate(v)}
              required
            />
          </div>
          <FormSelect
            id="add-status"
            label="Status"
            value={status}
            onChange={(v) => setStatus(v)}
            options={statusOptions}
          />
          <FormSelect
            id="add-type"
            label="Type"
            value={type}
            onChange={(v) => setType(v)}
            options={typeOptions}
          />
          <FormField
            id="add-notes"
            label="Notes (optional)"
            value={notes}
            onChange={(v) => setNotes(v)}
            placeholder="e.g. Beach holiday"
          />
        </div>
        <div className="flex gap-2 mt-5">
          <Button
            variant="primary"
            fullWidth
            onClick={handleSave}
            disabled={!startDate || !endDate}
          >
            Add Leave
          </Button>
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  function handleSave() {
    onSave({ startDate, endDate, status, type, notes });
  }
}

interface AddLeaveModalProps {
  onClose: () => void;
  onSave: (entry: Omit<LeaveEntry, "id">) => void;
}
