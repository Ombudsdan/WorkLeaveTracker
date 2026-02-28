"use client";
import { useState } from "react";
import { LeaveStatus } from "@/types";
import type { LeaveEntry } from "@/types";

interface EditLeaveModalProps {
  entry: LeaveEntry;
  onClose: () => void;
  onSave: (entry: LeaveEntry) => void;
}

export default function EditLeaveModal({
  entry,
  onClose,
  onSave,
}: EditLeaveModalProps) {
  const [startDate, setStartDate] = useState(entry.startDate);
  const [endDate, setEndDate] = useState(entry.endDate);
  const [status, setStatus] = useState<LeaveStatus>(entry.status);
  const [notes, setNotes] = useState(entry.notes ?? "");

  function handleSave() {
    onSave({ ...entry, startDate, endDate, status, notes });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-bold text-gray-800 mb-4">Edit Leave</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeaveStatus)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            >
              <option value={LeaveStatus.Planned}>Planned (Draft)</option>
              <option value={LeaveStatus.Requested}>Requested (Pending)</option>
              <option value={LeaveStatus.Approved}>Approved (Confirmed)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
