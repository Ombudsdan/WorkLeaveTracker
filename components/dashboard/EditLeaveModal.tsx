"use client";
import LeaveForm, { durationFromEntry } from "@/components/LeaveForm";
import type { LeaveEntry, PublicUser, BankHolidayEntry } from "@/types";
import { FormValidationProvider } from "@/contexts/FormValidationContext";

export default function EditLeaveModal({
  entry,
  onClose,
  onSave,
  user,
  bankHolidays,
}: EditLeaveModalProps) {
  const initial = {
    duration: durationFromEntry(entry),
    startDate: entry.startDate,
    endDate: entry.endDate,
    type: entry.type,
    notes: entry.notes ?? "",
    status: entry.status,
  };

  return (
    <FormValidationProvider>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h3 className="font-bold text-gray-800 mb-4">Edit Leave</h3>
          <LeaveForm
            initial={initial}
            saveLabel="Save Changes"
            onSave={(values) => onSave({ ...values, id: entry.id })}
            onClose={onClose}
            user={user}
            bankHolidays={bankHolidays}
            editingEntryId={entry.id}
          />
        </div>
      </div>
    </FormValidationProvider>
  );
}

interface EditLeaveModalProps {
  entry: LeaveEntry;
  onClose: () => void;
  onSave: (entry: LeaveEntry) => void;
  user?: PublicUser;
  bankHolidays?: BankHolidayEntry[];
}
