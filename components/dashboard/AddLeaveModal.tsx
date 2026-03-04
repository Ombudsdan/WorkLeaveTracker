"use client";
import LeaveForm from "@/components/LeaveForm";
import type { LeaveEntry, PublicUser, BankHolidayEntry } from "@/types";
import { FormValidationProvider } from "@/contexts/FormValidationContext";

export default function AddLeaveModal({ onClose, onSave, user, bankHolidays }: AddLeaveModalProps) {
  return (
    <FormValidationProvider>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h3 className="font-bold text-gray-800 mb-4">Add Leave</h3>
          <LeaveForm onSave={onSave} onClose={onClose} user={user} bankHolidays={bankHolidays} />
        </div>
      </div>
    </FormValidationProvider>
  );
}

interface AddLeaveModalProps {
  onClose: () => void;
  onSave: (entry: Omit<LeaveEntry, "id">) => void;
  user?: PublicUser;
  bankHolidays?: BankHolidayEntry[];
}
