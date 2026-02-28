"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LeaveStatus = "planned" | "requested" | "approved";
type LeaveType = "holiday" | "sick" | "other";

interface LeaveEntry {
  id: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  type: LeaveType;
  notes?: string;
}

interface UserData {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    nonWorkingDays: number[];
    holidayStartMonth: number;
  };
  allowance: { core: number; bought: number; carried: number };
  entries: LeaveEntry[];
}

const STATUS_COLORS: Record<LeaveStatus, string> = {
  planned: "bg-yellow-100 text-yellow-800 border-yellow-300",
  requested: "bg-blue-100 text-blue-800 border-blue-300",
  approved: "bg-green-100 text-green-800 border-green-300",
};

const STATUS_DOT: Record<LeaveStatus, string> = {
  planned: "bg-yellow-400",
  requested: "bg-blue-500",
  approved: "bg-green-500",
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function countWorkingDays(
  startDate: string,
  endDate: string,
  nonWorkingDays: number[],
  bankHolidays: string[]
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    const iso = cur.toISOString().slice(0, 10);
    if (!nonWorkingDays.includes(dow) && !bankHolidays.includes(iso)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function getHolidayYearBounds(startMonth: number): { start: Date; end: Date } {
  const now = new Date();
  const year =
    now.getMonth() + 1 >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
  const start = new Date(year, startMonth - 1, 1);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return { start, end };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [bankHolidays, setBankHolidays] = useState<string[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ startDate: "", endDate: "", status: "planned" as LeaveStatus, type: "holiday" as LeaveType, notes: "" });
  const [editingEntry, setEditingEntry] = useState<LeaveEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      const [usersRes, holidaysRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/holidays"),
      ]);
      const users: UserData[] = await usersRes.json();
      const holidays: string[] = await holidaysRes.json();
      if (!cancelled) {
        setBankHolidays(holidays);
        setAllUsers(users);
        const me = users.find((u) => u.profile.email === session?.user?.email);
        if (me) setCurrentUser(me);
        setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [status, session]);

  const loadData = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    const [usersRes, holidaysRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/holidays"),
    ]);
    const users: UserData[] = await usersRes.json();
    const holidays: string[] = await holidaysRes.json();
    setBankHolidays(holidays);
    setAllUsers(users);
    const me = users.find((u) => u.profile.email === session?.user?.email);
    if (me) setCurrentUser(me);
    setLoading(false);
  }, [status, session]);

  const displayedUser = viewingUserId
    ? allUsers.find((u) => u.id === viewingUserId) ?? currentUser
    : currentUser;

  const isOwnProfile = !viewingUserId || viewingUserId === currentUser?.id;

  function calcSummary(user: UserData) {
    const total = user.allowance.core + user.allowance.bought + user.allowance.carried;
    const { start, end } = getHolidayYearBounds(user.profile.holidayStartMonth);
    let approved = 0, requested = 0, planned = 0;
    for (const e of user.entries) {
      if (e.type !== "holiday") continue;
      const es = new Date(e.startDate);
      const ee = new Date(e.endDate);
      if (ee < start || es > end) continue;
      const bh = bankHolidays.filter((d) => {
        const date = new Date(d);
        return date >= start && date <= end && !user.profile.nonWorkingDays.includes(date.getDay());
      });
      const days = countWorkingDays(e.startDate, e.endDate, user.profile.nonWorkingDays, bh);
      if (e.status === "approved") approved += days;
      else if (e.status === "requested") requested += days;
      else if (e.status === "planned") planned += days;
    }
    return { total, approved, requested, planned, used: approved + requested + planned, remaining: total - approved - requested - planned };
  }

  async function handleAddEntry() {
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEntry),
    });
    if (res.ok) {
      setShowAddModal(false);
      setNewEntry({ startDate: "", endDate: "", status: "planned", type: "holiday", notes: "" });
      await loadData();
    }
  }

  async function handleUpdateEntry() {
    if (!editingEntry) return;
    const res = await fetch(`/api/entries/${editingEntry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingEntry),
    });
    if (res.ok) {
      setEditingEntry(null);
      await loadData();
    }
  }

  async function handleDeleteEntry(id: string) {
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    await loadData();
  }

  // Calendar helpers
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  function getEntryForDate(date: string, user: UserData): LeaveEntry | undefined {
    return user.entries.find((e) => {
      const s = new Date(e.startDate);
      const en = new Date(e.endDate);
      const d = new Date(date);
      return d >= s && d <= en;
    });
  }

  function isBankHoliday(date: string) {
    return bankHolidays.includes(date);
  }

  function isNonWorkingDay(date: string, user: UserData) {
    return user.profile.nonWorkingDays.includes(new Date(date).getDay());
  }

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  }

  if (!currentUser || !displayedUser) return null;

  const summary = calcSummary(displayedUser);
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);

  // Holiday year info
  const { start: hyStart, end: hyEnd } = getHolidayYearBounds(displayedUser.profile.holidayStartMonth);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-indigo-700">Work Leave Tracker</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-indigo-700 font-semibold">Dashboard</Link>
          <Link href="/profile" className="text-gray-600 hover:text-indigo-700">Profile</Link>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">{session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-red-500 hover:text-red-700">Sign Out</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-6 px-4">
        {/* User selector for global view */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-sm font-medium text-gray-600">Viewing:</span>
          <button
            onClick={() => setViewingUserId(null)}
            className={`px-3 py-1 rounded-full text-sm border transition ${!viewingUserId ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}
          >
            My Calendar
          </button>
          {allUsers
            .filter((u) => u.id !== currentUser.id)
            .map((u) => (
              <button
                key={u.id}
                onClick={() => setViewingUserId(u.id)}
                className={`px-3 py-1 rounded-full text-sm border transition ${viewingUserId === u.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}
              >
                {u.profile.firstName} {u.profile.lastName}
              </button>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Summary + Entries */}
          <div className="lg:col-span-1 space-y-4">
            {/* Summary card */}
            <div className="bg-white rounded-2xl shadow p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">
                  {displayedUser.profile.firstName} {displayedUser.profile.lastName}
                </h2>
                {!isOwnProfile && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Read-only</span>}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Holiday year: {hyStart.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} –{" "}
                {hyEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Allowance</span>
                  <span className="font-semibold">{summary.total} days</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT.approved}`} />
                    Approved
                  </span>
                  <span>{summary.approved} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT.requested}`} />
                    Requested
                  </span>
                  <span>{summary.requested} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT.planned}`} />
                    Planned
                  </span>
                  <span>{summary.planned} days</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Used So Far</span>
                  <span>{summary.used} days</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-indigo-700">Remaining</span>
                  <span className={`text-indigo-700 ${summary.remaining < 0 ? "text-red-600" : ""}`}>
                    {summary.remaining} days
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-indigo-500 rounded-full h-2 transition-all"
                  style={{ width: `${Math.min(100, (summary.used / (summary.total || 1)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">
                {summary.total > 0 ? Math.round((summary.used / summary.total) * 100) : 0}% used
              </p>
            </div>

            {/* Allowance breakdown */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="font-semibold text-gray-700 text-sm mb-3">Allowance Breakdown</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between"><span>Core Days</span><span>{displayedUser.allowance.core}</span></div>
                <div className="flex justify-between"><span>Bought</span><span>+{displayedUser.allowance.bought}</span></div>
                <div className="flex justify-between"><span>Carried Over</span><span>+{displayedUser.allowance.carried}</span></div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total</span><span>{summary.total}</span></div>
              </div>
            </div>

            {/* Leave entries list */}
            {isOwnProfile && (
              <div className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700 text-sm">My Leave</h3>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-indigo-700 transition"
                  >
                    + Add
                  </button>
                </div>
                {currentUser.entries.length === 0 ? (
                  <p className="text-xs text-gray-400">No leave entries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {[...currentUser.entries]
                      .sort((a, b) => a.startDate.localeCompare(b.startDate))
                      .map((entry) => {
                        const days = countWorkingDays(
                          entry.startDate,
                          entry.endDate,
                          currentUser.profile.nonWorkingDays,
                          bankHolidays
                        );
                        return (
                          <div key={entry.id} className={`border rounded-lg p-2 text-xs ${STATUS_COLORS[entry.status]}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {new Date(entry.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                {entry.startDate !== entry.endDate && (
                                  <> – {new Date(entry.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
                                )}
                              </span>
                              <span>{days}d</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="capitalize">{entry.status}</span>
                              <div className="flex gap-1">
                                <button onClick={() => setEditingEntry(entry)} className="underline">Edit</button>
                                <button onClick={() => handleDeleteEntry(entry.id)} className="underline text-red-600">Del</button>
                              </div>
                            </div>
                            {entry.notes && <p className="mt-0.5 text-gray-500">{entry.notes}</p>}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Other user's entries (read-only) */}
            {!isOwnProfile && displayedUser && (
              <div className="bg-white rounded-2xl shadow p-5">
                <h3 className="font-semibold text-gray-700 text-sm mb-3">
                  {displayedUser.profile.firstName}&apos;s Leave
                </h3>
                {displayedUser.entries.length === 0 ? (
                  <p className="text-xs text-gray-400">No leave entries.</p>
                ) : (
                  <div className="space-y-2">
                    {[...displayedUser.entries]
                      .sort((a, b) => a.startDate.localeCompare(b.startDate))
                      .map((entry) => {
                        const days = countWorkingDays(
                          entry.startDate,
                          entry.endDate,
                          displayedUser.profile.nonWorkingDays,
                          bankHolidays
                        );
                        return (
                          <div key={entry.id} className={`border rounded-lg p-2 text-xs ${STATUS_COLORS[entry.status]}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {new Date(entry.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                {entry.startDate !== entry.endDate && (
                                  <> – {new Date(entry.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
                                )}
                              </span>
                              <span>{days}d</span>
                            </div>
                            <span className="capitalize">{entry.status}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow p-5">
              {/* Calendar header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
                    else setCalendarMonth(m => m - 1);
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  ‹
                </button>
                <h3 className="font-bold text-gray-800">
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </h3>
                <button
                  onClick={() => {
                    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
                    else setCalendarMonth(m => m + 1);
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  ›
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const entry = getEntryForDate(dateStr, displayedUser);
                  const isBH = isBankHoliday(dateStr);
                  const isNWD = isNonWorkingDay(dateStr, displayedUser);
                  const isToday = dateStr === new Date().toISOString().slice(0, 10);

                  return (
                    <div
                      key={day}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition cursor-default
                        ${isToday ? "ring-2 ring-indigo-500" : ""}
                        ${entry
                          ? entry.status === "approved"
                            ? "bg-green-200 text-green-800"
                            : entry.status === "requested"
                            ? "bg-blue-200 text-blue-800"
                            : "bg-yellow-200 text-yellow-800"
                          : isBH
                          ? "bg-purple-100 text-purple-700"
                          : isNWD
                          ? "bg-gray-100 text-gray-400"
                          : "hover:bg-gray-50 text-gray-700"
                        }`}
                    >
                      <span>{day}</span>
                      {isBH && !entry && <span className="text-purple-400 text-[8px] leading-none">BH</span>}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200" /> Approved</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200" /> Requested</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200" /> Planned</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100" /> Bank Holiday</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100" /> Non-Working</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-4">Add Leave</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newEntry.startDate}
                    onChange={(e) => setNewEntry(n => ({ ...n, startDate: e.target.value }))}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newEntry.endDate}
                    onChange={(e) => setNewEntry(n => ({ ...n, endDate: e.target.value }))}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={newEntry.status}
                  onChange={(e) => setNewEntry(n => ({ ...n, status: e.target.value as LeaveStatus }))}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="planned">Planned (Draft)</option>
                  <option value="requested">Requested (Pending)</option>
                  <option value="approved">Approved (Confirmed)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={newEntry.type}
                  onChange={(e) => setNewEntry(n => ({ ...n, type: e.target.value as LeaveType }))}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="holiday">Holiday</option>
                  <option value="sick">Sick</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry(n => ({ ...n, notes: e.target.value }))}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  placeholder="e.g. Beach holiday"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleAddEntry}
                disabled={!newEntry.startDate || !newEntry.endDate}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                Add Leave
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-4">Edit Leave</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editingEntry.startDate}
                    onChange={(e) => setEditingEntry(en => en ? { ...en, startDate: e.target.value } : null)}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editingEntry.endDate}
                    onChange={(e) => setEditingEntry(en => en ? { ...en, endDate: e.target.value } : null)}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={editingEntry.status}
                  onChange={(e) => setEditingEntry(en => en ? { ...en, status: e.target.value as LeaveStatus } : null)}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="planned">Planned (Draft)</option>
                  <option value="requested">Requested (Pending)</option>
                  <option value="approved">Approved (Confirmed)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={editingEntry.notes ?? ""}
                  onChange={(e) => setEditingEntry(en => en ? { ...en, notes: e.target.value } : null)}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleUpdateEntry}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 transition"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingEntry(null)}
                className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
