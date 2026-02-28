"use client";
import { useState } from "react";
import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry } from "@/types";

interface AddLeaveModalProps {
  onClose: () => void;
  onSave: (entry: Omit<LeaveEntry, "id">) => void;
}

export default function AddLeaveModal({ onClose, onSave }: AddLeaveModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<LeaveStatus>(LeaveStatus.Planned);
  const [type, setType] = useState<LeaveType>(LeaveType.Holiday);
  const [notes, setNotes] = useState("");

  function handleSave() {
    onSave({ startDate, endDate, status, type, notes });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-bold text-gray-800 mb-4">Add Leave</h3>
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
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm"
            >
              <option value={LeaveType.Holiday}>Holiday</option>
              <option value={LeaveType.Sick}>Sick</option>
              <option value={LeaveType.Other}>Other</option>
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
              placeholder="e.g. Beach holiday"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSave}
            disabled={!startDate || !endDate}
            className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            Add Leave
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
