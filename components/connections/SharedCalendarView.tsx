"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import type { PublicUser, BankHolidayEntry, LeaveEntry } from "@/types";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import {
  getDaysInMonth,
  getEntriesForDate,
  toIsoDate,
  getEntryDuration,
  countEntryDays,
  getLeaveDataBounds,
} from "@/utils/dateHelpers";
import { findClashes } from "@/utils/clashFinder";
import { STATUS_COLORS, SICK_LEAVE_CARD_COLORS } from "@/variables/colours";
import { X, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import MonthYearPicker from "@/components/molecules/MonthYearPicker";
import { LeaveKey, LEAVE_KEY_ITEMS_BASE } from "@/components/atoms/LeaveKey";

interface SharedCalendarViewProps {
  /** The signed-in user, always shown as the first row */
  currentUser: PublicUser;
  /** The users the current user has pinned (their connections) */
  pinnedUsers: PublicUser[];
  bankHolidays: BankHolidayEntry[];
  /** Called when the user clicks an empty day cell in their own row */
  onAddLeave?: (dateStr: string) => void;
  /** Called when the user chooses to edit one of their own leave entries */
  onEdit?: (entry: LeaveEntry) => void;
  /** Called when the user chooses to delete one of their own leave entries */
  onDelete?: (id: string) => void;
}

interface PopoverState {
  entry: LeaveEntry;
  /** true when the entry belongs to the currently signed-in user */
  isOwnEntry: boolean;
  /** non-working days of the entry's owner (for duration calculation) */
  nonWorkingDays: number[];
  top: number;
  left: number;
}

/** Tiny colour map for leave status within this component */
const CELL_CLASS: Record<LeaveStatus, string> = {
  [LeaveStatus.Approved]: "bg-green-300",
  [LeaveStatus.Requested]: "bg-orange-200",
  [LeaveStatus.Planned]: "bg-yellow-200",
};

/** Return initials from a first + last name */
function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** Format a date range as a readable string (e.g. "10 Mar – 14 Mar") */
function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = new Date(startDate).toLocaleDateString("en-GB", opts);
  if (startDate === endDate) return start;
  const end = new Date(endDate).toLocaleDateString("en-GB", opts);
  return `${start} – ${end}`;
}

/** Build a display label from notes + AM/PM duration suffix */
function getNoteLabel(entry: LeaveEntry): string {
  const base = entry.notes ?? "";
  const dur = getEntryDuration(entry);
  if (dur === LeaveDuration.HalfMorning) return base ? `${base} (AM)` : "(AM)";
  if (dur === LeaveDuration.HalfAfternoon) return base ? `${base} (PM)` : "(PM)";
  return base;
}

export default function SharedCalendarView({
  currentUser,
  pinnedUsers,
  bankHolidays,
  onAddLeave,
  onEdit,
  onDelete,
}: SharedCalendarViewProps) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [isMobileSheet, setIsMobileSheet] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const todayStr = toIsoDate(today);
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const bhDates = useMemo(() => bankHolidays.map((bh) => bh.date), [bankHolidays]);

  /** All rows: current user first, then pinned users */
  const allUsers = useMemo<PublicUser[]>(
    () => [currentUser, ...pinnedUsers],
    [currentUser, pinnedUsers]
  );

  // Compute min/max picker bounds from all visible users' leave data
  const { min: pickerMin, max: pickerMax } = useMemo(
    () => getLeaveDataBounds(allUsers),
    [allUsers]
  );

  // Detect mobile layout to switch between bottom sheet and floating popover
  useEffect(() => {
    function checkMobile() {
      setIsMobileSheet(window.innerWidth < 640);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close popover when clicking outside the component
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    }
    if (popover) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [popover]);

  const atMin =
    calYear < pickerMin.year || (calYear === pickerMin.year && calMonth <= pickerMin.month);
  const atMax =
    calYear > pickerMax.year || (calYear === pickerMax.year && calMonth >= pickerMax.month);

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }

  function handleLeaveClick(
    entry: LeaveEntry,
    isOwnEntry: boolean,
    nonWorkingDays: number[],
    cellEl: HTMLElement
  ) {
    if (popover?.entry.id === entry.id) {
      setPopover(null);
      return;
    }
    const rect = cellEl.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const top = rect.bottom - containerRect.top + 6;
    // 220 ≈ popover card width (w-52 = 208px) + a small margin — keep the card within bounds
    const left = Math.min(rect.left - containerRect.left, containerRect.width - 220);
    setPopover({ entry, isOwnEntry, nonWorkingDays, top, left });
  }

  /** Build sorted day strings for the current month */
  const dayStrings = useMemo<string[]>(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    });
  }, [calYear, calMonth, daysInMonth]);

  /** Set of dates in this month where 2+ users clash */
  const clashDates = useMemo<Set<string>>(() => {
    const userEntryData = allUsers.map((u) => ({
      id: u.id,
      name: `${u.profile.firstName} ${u.profile.lastName}`,
      entries: u.entries,
    }));
    const startDate = dayStrings[0];
    const endDate = dayStrings[dayStrings.length - 1];
    const clashes = findClashes(userEntryData, startDate, endDate);
    return new Set(clashes.map((c) => c.date));
  }, [allUsers, dayStrings]);

  /** Render a single cell for one user on one day */
  function renderUserCell(user: PublicUser, dateStr: string, isCurrentUser: boolean) {
    const isBH = bhDates.includes(dateStr);

    // Don't show leave on non-working days (weekends / bank holidays have no leave to display)
    const entries = getEntriesForDate(dateStr, user.entries).filter(
      (e) => e.type !== LeaveType.Sick
    );

    const topEntry = entries[0] ?? null;

    const isNWD = user.profile.nonWorkingDays.includes(new Date(dateStr).getDay());

    let bgClass = "bg-white";
    if (topEntry) {
      /* c8 ignore next */
      bgClass = CELL_CLASS[topEntry.status] ?? "bg-white";
    } else if (isBH) {
      bgClass = "bg-purple-300";
    } else if (isNWD) {
      bgClass = "bg-gray-300";
    }

    // Empty cells in the current user's row are clickable to add leave
    const isEmptyClickable = !topEntry && isCurrentUser && !!onAddLeave;

    return (
      <td
        key={dateStr}
        className={`min-w-[28px] h-7 border border-gray-100 text-center text-[10px] relative ${bgClass} ${
          topEntry
            ? "cursor-pointer"
            : isEmptyClickable
              ? "cursor-pointer hover:ring-2 hover:ring-inset hover:ring-indigo-300"
              : ""
        }`}
        title={
          topEntry ? `${topEntry.status}: ${topEntry.startDate} – ${topEntry.endDate}` : undefined
        }
        onClick={
          topEntry
            ? (ev) =>
                handleLeaveClick(
                  topEntry,
                  isCurrentUser,
                  user.profile.nonWorkingDays,
                  ev.currentTarget as HTMLElement
                )
            : isEmptyClickable
              ? () => onAddLeave!(dateStr)
              : undefined
        }
      >
        {topEntry && <span className="sr-only">{topEntry.status}</span>}
      </td>
    );
  }

  return (
    <div ref={containerRef} className="bg-white rounded-2xl shadow p-5 relative">
      {/* Month navigation */}
      <div className="flex items-center mb-4">
        <div className="flex-1" aria-hidden="true" />
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            disabled={atMin}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <MonthYearPicker
            year={calYear}
            month={calMonth}
            onChange={(y, m) => {
              setCalYear(y);
              setCalMonth(m);
            }}
            minYear={pickerMin.year}
            minMonth={pickerMin.month}
            maxYear={pickerMax.year}
            maxMonth={pickerMax.month}
          />
          <button
            onClick={nextMonth}
            disabled={atMax}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex-1" aria-hidden="true" />
      </div>

      {/* Scrollable calendar table */}
      <div className="overflow-x-auto pb-3">
        <table
          className="border-collapse w-full"
          style={{ tableLayout: "fixed", minWidth: `${daysInMonth * 28 + 100}px` }}
        >
          <colgroup>
            {/* Name column */}
            <col style={{ width: "100px" }} />
            {/* One column per day */}
            {dayStrings.map((d) => (
              <col key={d} style={{ width: "28px" }} />
            ))}
          </colgroup>

          {/* Header: day numbers */}
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-white text-left text-xs font-medium text-gray-400 pb-1 pr-2">
                Person
              </th>
              {dayStrings.map((dateStr) => {
                const day = parseInt(dateStr.slice(8), 10);
                const isClash = clashDates.has(dateStr);
                const isToday = dateStr === todayStr;
                return (
                  <th
                    key={dateStr}
                    className={`text-center text-[10px] font-medium pb-1 h-6 ${
                      isClash
                        ? "text-red-600 font-bold"
                        : isToday
                          ? "text-indigo-600 font-bold underline decoration-2"
                          : "text-gray-400"
                    }`}
                  >
                    {day}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body: one row per user */}
          <tbody>
            {allUsers.map((user, idx) => (
              <tr key={user.id}>
                {/* User label */}
                <td
                  className="sticky left-0 z-10 bg-white text-xs font-medium text-gray-700 pr-2 py-0.5 truncate"
                  title={`${user.profile.firstName} ${user.profile.lastName}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold shrink-0">
                      {initials(user.profile.firstName, user.profile.lastName)}
                    </span>
                    <span className="truncate">{idx === 0 ? "You" : user.profile.firstName}</span>
                  </span>
                </td>

                {/* Day cells */}
                {dayStrings.map((dateStr) => renderUserCell(user, dateStr, idx === 0))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <LeaveKey className="mt-4" items={LEAVE_KEY_ITEMS_BASE} />

      {/* Mobile backdrop — tap outside the sheet to dismiss */}
      {popover && isMobileSheet && (
        <div
          data-testid="mobile-backdrop"
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setPopover(null)}
          aria-hidden="true"
        />
      )}

      {/* Leave entry popover — bottom sheet on mobile, floating card on desktop */}
      {popover && (
        <div
          className={
            isMobileSheet
              ? "fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 p-5 text-sm"
              : "absolute z-30 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-52 text-xs"
          }
          style={!isMobileSheet ? { top: popover.top, left: popover.left } : undefined}
          role="tooltip"
        >
          <button
            onClick={() => setPopover(null)}
            className={
              isMobileSheet
                ? "absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                : "absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            }
            aria-label="Close"
          >
            <X className={isMobileSheet ? "w-5 h-5" : "w-3 h-3"} />
          </button>

          {/* Status / type badge */}
          {(() => {
            const isSick = popover.entry.type === LeaveType.Sick;
            const badgeClass = isSick
              ? SICK_LEAVE_CARD_COLORS
              : STATUS_COLORS[popover.entry.status];
            const badgeLabel = isSick
              ? "Sick Leave"
              : popover.entry.status.charAt(0).toUpperCase() + popover.entry.status.slice(1);
            return (
              <div
                className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold mb-2 border ${badgeClass} ${isMobileSheet ? "text-xs" : "text-[10px]"}`}
              >
                {badgeLabel}
              </div>
            );
          })()}

          <p
            className={`font-medium text-gray-800 mb-1 ${isMobileSheet ? "pr-8 text-base" : "pr-4"}`}
          >
            {getNoteLabel(popover.entry) || "No description"}
          </p>

          <p className="text-gray-500 mb-1">
            {formatDateRange(popover.entry.startDate, popover.entry.endDate)}
          </p>

          <p className={`text-gray-500 ${isMobileSheet ? "mb-4" : "mb-2"}`}>
            {(() => {
              const dur = getEntryDuration(popover.entry);
              if (dur === LeaveDuration.HalfMorning) return "Half day (AM)";
              if (dur === LeaveDuration.HalfAfternoon) return "Half day (PM)";
              return `${countEntryDays(popover.entry, popover.nonWorkingDays, bhDates)} working day(s)`;
            })()}
          </p>

          {popover.isOwnEntry && (onEdit || onDelete) && (
            <div
              className={`flex border-t border-gray-100 ${isMobileSheet ? "gap-3 pt-4" : "gap-2 pt-2"}`}
            >
              {onEdit && (
                <button
                  onClick={() => {
                    onEdit(popover.entry);
                    setPopover(null);
                  }}
                  className={
                    isMobileSheet
                      ? "flex-1 flex items-center justify-center gap-2 py-3 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer rounded-xl border border-indigo-100 hover:bg-indigo-50"
                      : "flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  }
                  aria-label="Edit"
                >
                  <Pencil className={isMobileSheet ? "w-4 h-4" : "w-3 h-3"} /> Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(popover.entry.id);
                    setPopover(null);
                  }}
                  className={
                    isMobileSheet
                      ? "flex-1 flex items-center justify-center gap-2 py-3 text-red-500 hover:text-red-700 font-medium cursor-pointer rounded-xl border border-red-100 hover:bg-red-50"
                      : "flex items-center gap-1 text-red-500 hover:text-red-700 font-medium cursor-pointer"
                  }
                  aria-label="Delete"
                >
                  <Trash2 className={isMobileSheet ? "w-4 h-4" : "w-3 h-3"} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
