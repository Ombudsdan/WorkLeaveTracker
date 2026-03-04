"use client";
import { useState, useMemo } from "react";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import type { LeaveEntry, PublicUser, BankHolidayEntry } from "@/types";
import {
  LEAVE_STATUS_ORDER,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_ORDER,
  LEAVE_TYPE_LABELS,
} from "@/variables/leaveConfig";
import { STATUS_COLORS } from "@/variables/colours";
import FormField from "@/components/FormField";
import DateRangePicker from "@/components/DateRangePicker";
import LeaveOptionPicker from "@/components/LeaveOptionPicker";
import Button from "@/components/Button";
import { useFormValidation } from "@/contexts/FormValidationContext";
import {
  getEntryDuration,
  countEntryDays,
  getActiveYearAllowance,
  toIsoDate,
} from "@/utils/dateHelpers";
import { calcLeaveSummary } from "@/utils/leaveCalc";
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

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const s = new Date(start).toLocaleDateString("en-GB", opts);
  if (start === end) return s;
  const e = new Date(end).toLocaleDateString("en-GB", opts);
  return `${s} – ${e}`;
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
  /**
   * If provided, the form will validate that adding / editing this leave
   * does not exceed the user's holiday allowance.
   */
  user?: PublicUser;
  bankHolidays?: BankHolidayEntry[];
  /**
   * The ID of the entry currently being edited.  When provided, that entry
   * is excluded from the running total so that editing it doesn't inflate
   * the "used" count.
   */
  editingEntryId?: string;
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
  user,
  bankHolidays,
  editingEntryId,
}: LeaveFormProps) {
  const { triggerAllValidations, hasErrors } = useFormValidation();

  const [duration, setDuration] = useState<DurationType>(initial?.duration ?? "full");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [type, setType] = useState<LeaveType | "">(
    SICK_LEAVE_ENABLED ? (initial?.type ?? "") : LeaveType.Holiday
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [status, setStatus] = useState<LeaveStatus | "">(initial?.status ?? "");
  const [showTopError, setShowTopError] = useState(false);

  const isHalfDay = duration !== "full";
  const isSick = type === LeaveType.Sick;

  const typeOptions = LEAVE_TYPE_ORDER.filter(
    (t) => t !== LeaveType.Sick || SICK_LEAVE_ENABLED
  ).map((t) => ({
    value: t,
    label: LEAVE_TYPE_LABELS[t],
  }));

  const statusOptions = LEAVE_STATUS_ORDER.map((s) => ({
    value: s,
    label: LEAVE_STATUS_LABELS[s],
  }));

  // ---------------------------------------------------------------------------
  // Allowance limit check (only for holiday-type entries with a valid user)
  // ---------------------------------------------------------------------------
  const limitCheck = useMemo(() => {
    if (
      !user ||
      !startDate ||
      !endDate ||
      !status ||
      !type ||
      type !== LeaveType.Holiday ||
      endDate < startDate
    ) {
      return null;
    }

    const bankHolidayDates = (bankHolidays ?? []).map((bh) => bh.date);
    const nonWorkingDays = user.profile.nonWorkingDays;

    const prospectiveEntry: LeaveEntry = {
      id: "__new__",
      startDate,
      endDate,
      status: status as LeaveStatus,
      type: type as LeaveType,
      duration: DURATION_TYPE_TO_ENUM[duration],
    };

    // Build a virtual user that excludes the entry being edited and includes
    // the prospective new entry.
    const filteredEntries = user.entries.filter((e) => e.id !== editingEntryId);
    const virtualUser: PublicUser = {
      ...user,
      entries: [...filteredEntries, prospectiveEntry],
    };

    const summary = calcLeaveSummary(virtualUser, bankHolidayDates);
    if (summary.remaining >= 0) return null; // within allowance

    const shortfall = -summary.remaining;

    // Find holiday entries that are future/in-progress and could be cancelled.
    const todayStr = toIsoDate(new Date());
    // activeYa is always defined here — calcLeaveSummary only yields negative remaining
    // when it finds an active allowance, so getActiveYearAllowance returns a value.
    const activeYa = getActiveYearAllowance(user.yearAllowances)!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    /* c8 ignore next -- holidayStartMonth is required in YearAllowance; fallback is unreachable */
    const sm = activeYa.holidayStartMonth ?? 1;
    const yrStart = new Date(activeYa.year, sm - 1, 1);
    const yrEnd = new Date(activeYa.year + 1, sm - 1, 1);

    const cancellable = user.entries
      .filter(
        (e) =>
          e.type === LeaveType.Holiday &&
          e.id !== editingEntryId &&
          e.endDate >= todayStr &&
          new Date(e.startDate) < yrEnd &&
          new Date(e.endDate) >= yrStart
      )
      .map((e) => ({
        entry: e,
        days: countEntryDays(e, nonWorkingDays, bankHolidayDates),
      }))
      .filter((x) => x.days > 0)
      .sort((a, b) => a.entry.startDate.localeCompare(b.entry.startDate));

    return { shortfall, cancellable };
  }, [user, startDate, endDate, status, type, duration, editingEntryId, bankHolidays]);

  const isLimitExceeded = limitCheck !== null;

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
    /* c8 ignore start -- defensive guard; Save button is already disabled when limit exceeded */
    if (isLimitExceeded) {
      return;
    }
    /* c8 ignore stop */
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

      {/* Type — only shown when sick leave is enabled (user has a choice to make) */}
      {SICK_LEAVE_ENABLED && (
        <LeaveOptionPicker
          id="leave-type"
          label="Type"
          options={typeOptions}
          value={type}
          onChange={(v) => handleTypeChange(v)}
          required
        />
      )}

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

      {/* Allowance limit warning */}
      {isLimitExceeded && limitCheck && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-3 text-sm"
        >
          <p className="font-semibold text-amber-800 mb-1">
            ⚠ Allowance exceeded by {limitCheck.shortfall} day
            {limitCheck.shortfall !== 1 ? "s" : ""}
          </p>
          <p className="text-amber-700 mb-2">
            Adding this leave would exceed your holiday allowance. To proceed you
            would need to cancel some existing leave first.
          </p>
          {limitCheck.cancellable.length > 0 ? (
            <>
              <p className="text-amber-800 font-medium mb-1 text-xs uppercase tracking-wide">
                Upcoming leave you could cancel:
              </p>
              <ul className="space-y-1">
                {limitCheck.cancellable.map(({ entry, days }) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-gray-700">
                      {formatDateRange(entry.startDate, entry.endDate)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-xs font-medium ${STATUS_COLORS[entry.status]}`}
                    >
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                    <span className="text-gray-600 ml-auto">
                      {days} day{days !== 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-amber-700 text-xs">
              No upcoming leave found to cancel. Please adjust the dates or duration of
              this request.
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="primary" fullWidth onClick={handleSave} disabled={isLimitExceeded}>
          {saveLabel}
        </Button>
        <Button variant="secondary" fullWidth onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
