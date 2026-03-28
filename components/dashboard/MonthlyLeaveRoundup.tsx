"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import type { PublicUser, BankHolidayEntry, LeaveEntry } from "@/types";
import { LeaveStatus, LeaveType, LeaveDuration } from "@/types";
import { STATUS_COLORS } from "@/variables/colours";
import {
  countWorkingDays,
  getActiveYearAllowance,
  formatYearWindow,
  getEntryDuration,
  countEntryDays,
} from "@/utils/dateHelpers";
import { X } from "lucide-react";
import { LeaveKey, LEAVE_KEY_ITEMS_BASE } from "@/components/atoms/LeaveKey";

export interface MonthlyLeaveRoundupProps {
  user: PublicUser;
  bankHolidays: BankHolidayEntry[];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS_BAR_COLORS: Record<LeaveStatus, string> = {
  [LeaveStatus.Approved]: "bg-green-300",
  [LeaveStatus.Requested]: "bg-orange-200",
  [LeaveStatus.Planned]: "bg-yellow-200",
};

interface Segment {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  status?: LeaveStatus;
  entry?: LeaveEntry;
  isBankHoliday?: boolean;
  bankHolidayTitle?: string;
}

interface MonthData {
  year: number;
  month: number;
  monthName: string;
  segments: Segment[];
  totalDays: number;
}

interface PopoverInfo {
  segmentId: string;
  segment: Segment;
  top: number;
  left: number;
}

const POPOVER_WIDTH = 208;

function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = new Date(startDate).toLocaleDateString("en-GB", opts);
  if (startDate === endDate) return start;
  const end = new Date(endDate).toLocaleDateString("en-GB", opts);
  return `${start} – ${end}`;
}

function getEntryLabel(entry: LeaveEntry): string {
  const dur = getEntryDuration(entry);
  const base = entry.notes ?? "";
  if (dur === LeaveDuration.HalfMorning) return base ? `${base} (AM)` : "(AM)";
  if (dur === LeaveDuration.HalfAfternoon) return base ? `${base} (PM)` : "(PM)";
  return base || "No description";
}

function getDurationLabel(entry: LeaveEntry, nonWorkingDays: number[], bhDates: string[]): string {
  const dur = getEntryDuration(entry);
  if (dur === LeaveDuration.HalfMorning) return "Half day (AM)";
  if (dur === LeaveDuration.HalfAfternoon) return "Half day (PM)";
  const days = countEntryDays(entry, nonWorkingDays, bhDates);
  return `${days} working day${days === 1 ? "" : "s"}`;
}

export default function MonthlyLeaveRoundup({ user, bankHolidays }: MonthlyLeaveRoundupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<PopoverInfo | null>(null);

  const availableYas = useMemo(() => {
    const notDeactivated = user.yearAllowances.filter((ya) => ya.active !== false);
    return (notDeactivated.length > 0 ? notDeactivated : user.yearAllowances).sort(
      (a, b) => b.year - a.year
    );
  }, [user.yearAllowances]);

  const defaultYa = getActiveYearAllowance(user.yearAllowances);
  const [selectedYear, setSelectedYear] = useState<number>(
    defaultYa?.year ?? availableYas[0]?.year ?? new Date().getFullYear()
  );

  const selectedYa = useMemo(
    () => availableYas.find((ya) => ya.year === selectedYear) ?? availableYas[0],
    [availableYas, selectedYear]
  );

  const bankHolidayDates = useMemo(() => bankHolidays.map((bh) => bh.date), [bankHolidays]);

  const { months, chartScale } = useMemo<{ months: MonthData[]; chartScale: number }>(() => {
    if (!selectedYa) return { months: [], chartScale: 5 };

    const sm = selectedYa.holidayStartMonth ?? 1;
    const smPadded = String(sm).padStart(2, "0");
    const yearStartStr = `${selectedYa.year}-${smPadded}-01`;
    const yearEndStr = `${selectedYa.year + 1}-${smPadded}-01`;

    const relevantBankHolidays = bankHolidayDates.filter(
      (d) =>
        d >= yearStartStr &&
        d < yearEndStr &&
        !user.profile.nonWorkingDays.includes(new Date(d).getDay())
    );

    const bhMap = new Map(bankHolidays.map((bh) => [bh.date, bh.title]));

    const monthDataList: MonthData[] = [];

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(selectedYa.year, sm - 1 + i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const monthPadded = String(month + 1).padStart(2, "0");
      const lastDay = new Date(year, month + 1, 0).getDate();
      const monthStartStr = `${year}-${monthPadded}-01`;
      const monthEndStr = `${year}-${monthPadded}-${String(lastDay).padStart(2, "0")}`;

      const segments: Segment[] = [];

      const monthBankHolidays = relevantBankHolidays.filter(
        (d) => d >= monthStartStr && d <= monthEndStr
      );
      for (const bhDate of monthBankHolidays) {
        segments.push({
          id: `bh-${bhDate}`,
          startDate: bhDate,
          endDate: bhDate,
          days: 1,
          isBankHoliday: true,
          bankHolidayTitle: bhMap.get(bhDate) ?? "Bank Holiday",
        });
      }

      for (const entry of user.entries) {
        if (entry.type !== LeaveType.Holiday) continue;
        if (entry.endDate < monthStartStr || entry.startDate > monthEndStr) continue;

        const dur = getEntryDuration(entry);
        let days: number;
        if (dur !== LeaveDuration.Full) {
          days = 0.5;
        } else {
          const clippedStart = entry.startDate < monthStartStr ? monthStartStr : entry.startDate;
          const clippedEnd = entry.endDate > monthEndStr ? monthEndStr : entry.endDate;
          days = countWorkingDays(
            clippedStart,
            clippedEnd,
            user.profile.nonWorkingDays,
            relevantBankHolidays
          );
        }

        if (days <= 0) continue;

        const segStartDate = entry.startDate < monthStartStr ? monthStartStr : entry.startDate;
        const segEndDate = entry.endDate > monthEndStr ? monthEndStr : entry.endDate;

        segments.push({
          id: `entry-${entry.id}-${monthStartStr}`,
          startDate: segStartDate,
          endDate: segEndDate,
          days,
          status: entry.status,
          entry,
        });
      }

      segments.sort((a, b) => a.startDate.localeCompare(b.startDate));

      const totalDays = segments.reduce((sum, s) => sum + s.days, 0);

      monthDataList.push({
        year,
        month,
        monthName: MONTH_NAMES[month],
        segments,
        totalDays,
      });
    }

    const maxDays = Math.max(...monthDataList.map((m) => m.totalDays), 0);
    const scale = Math.max(Math.ceil(maxDays / 5) * 5, 5);

    return { months: monthDataList, chartScale: scale };
  }, [selectedYa, user.entries, user.profile.nonWorkingDays, bankHolidays, bankHolidayDates]);

  useEffect(() => {
    if (!popover) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [popover]);

  function handleSegmentClick(segment: Segment, el: HTMLElement) {
    if (popover?.segmentId === segment.id) {
      setPopover(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const top = rect.bottom - containerRect.top + 4;
    const left = Math.min(rect.left - containerRect.left, containerRect.width - POPOVER_WIDTH);
    setPopover({ segmentId: segment.id, segment, top, left });
  }

  if (!selectedYa) return null;

  const hasMultipleYears = availableYas.length > 1;

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl shadow border border-gray-100 p-4 relative"
      data-testid="monthly-leave-roundup"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Monthly Overview</h2>
        {hasMultipleYears ? (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs text-gray-600 border border-gray-200 rounded-md px-1.5 py-0.5 bg-white cursor-pointer"
            aria-label="Select year"
          >
            {availableYas.map((ya) => (
              <option key={ya.year} value={ya.year}>
                {formatYearWindow(ya)}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-gray-400">{formatYearWindow(selectedYa)}</span>
        )}
      </div>

      <div className="space-y-0.5">
        {months.map((monthData) => {
          const pct = (days: number) => `${Math.min((days / chartScale) * 100, 100)}%`;

          return (
            <div
              key={`${monthData.year}-${monthData.month}`}
              className="flex items-center gap-3 py-0.5"
            >
              <span className="w-24 text-sm font-medium text-gray-700 shrink-0">
                {monthData.monthName}
              </span>

              <span className="w-10 text-xs text-gray-500 text-right shrink-0 tabular-nums">
                {monthData.totalDays > 0 ? `${monthData.totalDays}d` : "–"}
              </span>

              <div className="flex-1 relative h-5 rounded-sm overflow-hidden bg-gray-100">
                <div className="absolute inset-0 flex">
                  {monthData.segments.flatMap((seg, idx) => {
                    const prevSeg = idx > 0 ? monthData.segments[idx - 1] : null;
                    const needsSeparator =
                      prevSeg !== null &&
                      !prevSeg.isBankHoliday &&
                      !seg.isBankHoliday &&
                      prevSeg.status === seg.status;

                    const segColorClass = seg.isBankHoliday
                      ? "bg-purple-300"
                      : seg.status
                        ? STATUS_BAR_COLORS[seg.status]
                        : "bg-gray-200";

                    const elements = [];
                    if (needsSeparator) {
                      elements.push(
                        <div key={`sep-${seg.id}`} className="w-px h-full bg-white shrink-0" />
                      );
                    }
                    elements.push(
                      <div
                        key={seg.id}
                        className={`${segColorClass} h-full cursor-pointer hover:brightness-95 transition-[filter] shrink-0`}
                        style={{ width: pct(seg.days) }}
                        onClick={(ev) => handleSegmentClick(seg, ev.currentTarget)}
                        title={
                          seg.isBankHoliday
                            ? seg.bankHolidayTitle
                            : seg.entry
                              ? `${seg.status}: ${seg.entry.startDate} – ${seg.entry.endDate}`
                              : undefined
                        }
                      />
                    );
                    return elements;
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <LeaveKey className="mt-3" items={LEAVE_KEY_ITEMS_BASE} />

      {popover && (
        <div
          className="absolute z-30 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-52 text-xs"
          style={{ top: popover.top, left: popover.left }}
          role="tooltip"
          data-testid="roundup-popover"
        >
          <button
            onClick={() => setPopover(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            aria-label="Close popover"
          >
            <X className="w-3 h-3" />
          </button>

          {popover.segment.isBankHoliday && (
            <>
              <div className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold mb-2 border text-[10px] bg-purple-300 text-purple-900 border-purple-500">
                Bank Holiday
              </div>
              <p className="font-medium text-gray-800 mb-1 pr-4">
                {popover.segment.bankHolidayTitle}
              </p>
              <p className="text-gray-500">
                {formatDateRange(popover.segment.startDate, popover.segment.startDate)}
              </p>
            </>
          )}

          {popover.segment.entry && popover.segment.status && (
            <>
              <div
                className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold mb-2 border text-[10px] ${STATUS_COLORS[popover.segment.status]}`}
              >
                {popover.segment.status.charAt(0).toUpperCase() + popover.segment.status.slice(1)}
              </div>
              <p className="font-medium text-gray-800 mb-1 pr-4">
                {getEntryLabel(popover.segment.entry)}
              </p>
              <p className="text-gray-500 mb-1">
                {formatDateRange(popover.segment.entry.startDate, popover.segment.entry.endDate)}
              </p>
              <p className="text-gray-500">
                {getDurationLabel(
                  popover.segment.entry,
                  user.profile.nonWorkingDays,
                  bankHolidayDates
                )}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
