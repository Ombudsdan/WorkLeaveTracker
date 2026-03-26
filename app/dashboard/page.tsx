"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { PublicUser, LeaveEntry, BankHolidayEntry } from "@/types";
import NavBar from "@/components/NavBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import SessionExpiredScreen from "@/components/SessionExpiredScreen";
import SummaryCard from "@/components/dashboard/SummaryCard";
import LeaveList from "@/components/dashboard/LeaveList";
import CalendarView from "@/components/dashboard/CalendarView";
import AddLeaveModal from "@/components/dashboard/AddLeaveModal";
import EditLeaveModal from "@/components/dashboard/EditLeaveModal";
import YearAllowanceModal from "@/components/dashboard/YearAllowanceModal";
import MiniCalendar from "@/components/dashboard/MiniCalendar";
import MicroAnnualPlanner from "@/components/dashboard/MicroAnnualPlanner";
import { usersController } from "@/controllers/usersController";
import { holidaysController } from "@/controllers/holidaysController";
import { entriesController } from "@/controllers/entriesController";
import { getHolidayYearBounds, getActiveYearAllowance } from "@/utils/dateHelpers";
import type { YearAllowance } from "@/types";

/** How long to wait before retrying initDashboard when the user record is not found. */
const DASHBOARD_RETRY_DELAY_MS = 400;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [activeProfileUser, setActiveProfileUser] = useState<PublicUser | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [bankHolidays, setBankHolidays] = useState<BankHolidayEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalInitialDate, setAddModalInitialDate] = useState<string | undefined>(undefined);
  const [editingEntry, setEditingEntry] = useState<LeaveEntry | null>(null);
  const [showAllowanceWarningModal, setShowAllowanceWarningModal] = useState(false);
  const [loading, setLoading] = useState(true);
  /** Mobile-only: which panel is currently visible ("list" | "calendar") */
  const [mobileView, setMobileView] = useState<"list" | "calendar">("list");

  // Track whether the user was previously authenticated in this browser tab so
  // we can distinguish a genuine "session expired" event from a first visit.
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated") {
      wasAuthenticatedRef.current = true;
    }
    if (status === "unauthenticated") {
      if (!wasAuthenticatedRef.current) {
        // Never authenticated in this tab — just redirect to login directly.
        router.push("/login");
      }
      // If wasAuthenticated is true the SessionExpiredScreen will be shown below.
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    // Capture identifiers before the async call so they're not stale
    const sessionEmail = session?.user?.email;
    const sessionId = (session?.user as { id?: string })?.id;
    if (!sessionEmail && !sessionId) return;

    let cancelled = false;
    async function initDashboard() {
      setLoading(true);
      try {
        // 5 total attempts (initial + 4 retries) with increasing delays:
        // 0ms, 400ms, 800ms, 1200ms, 1600ms between successive attempts.
        for (let attempt = 0; attempt <= 4; attempt++) {
          if (attempt > 0)
            await new Promise<void>((r) => setTimeout(r, DASHBOARD_RETRY_DELAY_MS * attempt));
          const rawUsers = await usersController.fetchAll();
          if (cancelled) return;
          const users = Array.isArray(rawUsers) ? rawUsers : [];
          // Find the current user so we can request their country's bank holidays
          const me = users.find(
            (u) =>
              (sessionId != null && u.id === sessionId) ||
              (sessionEmail != null && u.profile.email === sessionEmail)
          );
          const holidays = await holidaysController.fetchBankHolidays(me?.profile.country);
          if (cancelled) return;
          const result = applyUserData(users, holidays, sessionEmail, sessionId);
          // Keep loading=true if we're redirecting so we never flash the error UI.
          if (result === "redirected") return;
          if (result === "found") break;
          // "not_found" on first attempt → loop and retry
        }
        if (!cancelled) setLoading(false);
      } catch {
        // Stop loading on fetch failure so the "profile not found" banner shows
        if (!cancelled) setLoading(false);
      }
    }
    initDashboard();
    return () => {
      cancelled = true;
    };
    // applyUserData is defined later in this component and depends on stable
    // setter refs and router; adding it would trigger re-runs on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  if (status === "loading" || loading) {
    return <LoadingSpinner />;
  }

  // Session expired after the user was previously authenticated in this tab
  if (status === "unauthenticated" && wasAuthenticatedRef.current) {
    return <SessionExpiredScreen />;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar activePage="dashboard" />
        <main className="max-w-6xl mx-auto py-6 px-4">
          <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm">
            Your profile could not be loaded. Please{" "}
            <button
              onClick={() => window.location.reload()}
              className="underline font-medium hover:text-amber-900"
            >
              refresh the page
            </button>
            .
          </div>
        </main>
      </div>
    );
  }

  const allowanceWarning = getYearAllowanceWarning(currentUser);
  /** The year we need to configure if the warning is visible */
  const nextAllowanceYear = (() => {
    const activeYa = getActiveYearAllowance(currentUser.yearAllowances);
    const { start } = getHolidayYearBounds(activeYa?.holidayStartMonth ?? 1);
    return start.getFullYear() + 1;
  })();

  const pendingConnectionRequests = (currentUser.profile.pendingPinRequestsReceived ?? []).length;

  // Build the list of pinned users for the Connections widget
  const pinnedIds = currentUser.profile.pinnedUserIds ?? [];
  const pinnedUsers = allUsers.filter((u) => pinnedIds.includes(u.id));

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar activePage="dashboard" pendingRequestCount={pendingConnectionRequests} />

      <main className="max-w-6xl mx-auto py-6 px-4">
        {allowanceWarning && (
          <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
            <span className="text-amber-500 text-lg leading-none mt-0.5">⚠</span>
            <span>
              {allowanceWarning}{" "}
              <button
                onClick={() => setShowAllowanceWarningModal(true)}
                className="underline font-medium hover:text-amber-900 ml-1"
              >
                Configure now
              </button>
            </span>
          </div>
        )}

        {isReadOnly && activeProfileUser && (
          <div className="mb-4 bg-indigo-50 border border-indigo-300 text-indigo-800 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
            <span className="text-indigo-500 text-lg leading-none">👁</span>
            <span>
              Viewing {activeProfileUser.profile.firstName} {activeProfileUser.profile.lastName}&apos;s Dashboard
            </span>
          </div>
        )}

        {/* Mobile-only toggle between Upcoming Leave list and Calendar */}
        <div className="flex lg:hidden mb-4 bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              mobileView === "list"
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Upcoming Leave
          </button>
          <button
            type="button"
            onClick={() => setMobileView("calendar")}
            className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              mobileView === "calendar"
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Calendar
          </button>
        </div>

        {/* Add Leave button */}
        {!isReadOnly && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setAddModalInitialDate(undefined);
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium cursor-pointer"
            >
              <Plus size={14} />
              Add Leave
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column: mini-calendar, annual planner, leave list, connections */}
          <div
            className={`lg:col-span-2 space-y-4 ${mobileView === "list" ? "block" : "hidden"} lg:block`}
          >
            <MiniCalendar user={currentUser} bankHolidays={bankHolidays} />
            <MicroAnnualPlanner user={currentUser} bankHolidays={bankHolidays} />
            <LeaveList
              user={currentUser}
              bankHolidays={bankHolidays}
              isOwnProfile={true}
              onEdit={setEditingEntry}
              onDelete={handleDeleteEntry}
            />
            {!isReadOnly && (
              <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-700">Connections</h2>
                  {pendingConnectionRequests > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      {pendingConnectionRequests} pending
                    </span>
                  )}
                </div>
                {pinnedUsers.length === 0 ? (
                  <p className="text-xs text-gray-400 mb-2">No connections yet.</p>
                ) : (
                  <ul className="space-y-1.5 mb-3">
                    {pinnedUsers.map((u) => (
                      <li key={u.id} className="flex items-center gap-2 text-xs text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                          {u.profile.firstName.charAt(0)}
                          {u.profile.lastName.charAt(0)}
                        </span>
                        {u.profile.firstName} {u.profile.lastName}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/connections"
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Manage Connections →
                </Link>
              </div>
            )}
          </div>

          {/* Right column: summary card + main calendar */}
          <div
            className={`lg:col-span-3 space-y-4 ${mobileView === "calendar" ? "block" : "hidden"} lg:block`}
          >
            <SummaryCard user={currentUser} bankHolidays={bankHolidays} />
            <CalendarView
              user={currentUser}
              bankHolidays={bankHolidays}
              isOwnProfile={true}
              onAdd={(date) => {
                setAddModalInitialDate(date);
                setShowAddModal(true);
              }}
              onEdit={setEditingEntry}
              onDelete={handleDeleteEntry}
            />
          </div>
        </div>
      </main>

      {showAddModal && (
        <AddLeaveModal
          onClose={() => {
            setShowAddModal(false);
            setAddModalInitialDate(undefined);
          }}
          onSave={handleAddEntry}
          user={currentUser}
          bankHolidays={bankHolidays}
          initialDate={addModalInitialDate}
        />
      )}

      {editingEntry && (
        <EditLeaveModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleUpdateEntry}
          user={currentUser}
          bankHolidays={bankHolidays}
        />
      )}

      {showAllowanceWarningModal && (
        <YearAllowanceModal
          initialYear={nextAllowanceYear}
          onClose={() => setShowAllowanceWarningModal(false)}
          onSave={handleSaveWarningAllowance}
        />
      )}
    </div>
  );

  /**
   * Apply fetched user data to component state.
   * Returns:
   *  "redirected" – a navigation to /setup was triggered (don't stop loading)
   *  "found"      – current user was located and currentUser state was updated
   *  "not_found"  – current user was not present in the fetched list
   */
  function applyUserData(
    users: PublicUser[],
    holidays: BankHolidayEntry[],
    sessionEmail: string | null | undefined,
    sessionId: string | null | undefined
  ): "redirected" | "found" | "not_found" {
    setBankHolidays(holidays);
    setAllUsers(users);
    const me = users.find(
      (u) =>
        (sessionId != null && u.id === sessionId) ||
        (sessionEmail != null && u.profile.email === sessionEmail)
    );
    if (me) {
      if (me.yearAllowances.length === 0) {
        router.replace("/setup");
        return "redirected";
      }
      setCurrentUser(me);
      setActiveProfileUser(me);
      return "found";
    }
    return "not_found";
  }

  async function handleAddEntry(entry: Omit<LeaveEntry, "id">) {
    const created = await entriesController.create(entry);
    if (created) {
      setShowAddModal(false);
      applyEntryUpdate((entries) => [...entries, created]);
    }
  }

  async function handleUpdateEntry(entry: LeaveEntry) {
    const updated = await entriesController.update(entry);
    if (updated) {
      setEditingEntry(null);
      applyEntryUpdate((entries) => entries.map((e) => (e.id === updated.id ? updated : e)));
    }
  }

  async function handleDeleteEntry(id: string) {
    const ok = await entriesController.remove(id);
    if (ok) {
      applyEntryUpdate((entries) => entries.filter((e) => e.id !== id));
    }
  }

  /** Update the current user's entries in the currentUser state. */
  function applyEntryUpdate(updater: (entries: LeaveEntry[]) => LeaveEntry[]) {
    setCurrentUser((prev) => (prev ? { ...prev, entries: updater(prev.entries) } : prev));
  }

  async function handleSaveWarningAllowance(ya: YearAllowance) {
    const result = await usersController.addYearAllowance(ya);
    if (result && !("conflict" in result)) {
      setShowAllowanceWarningModal(false);
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const rest = prev.yearAllowances.filter((a) => a.year !== result.year);
        return { ...prev, yearAllowances: [...rest, result].sort((a, b) => a.year - b.year) };
      });
    }
  }
}

function getYearAllowanceWarning(user: PublicUser): string | null {
  const activeYa = getActiveYearAllowance(user.yearAllowances);
  const holidayStartMonth = activeYa?.holidayStartMonth ?? 1;
  const { end, start } = getHolidayYearBounds(holidayStartMonth);
  const now = new Date();
  const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilEnd > 0 && daysUntilEnd <= 60) {
    const nextYear = start.getFullYear() + 1;
    const hasNextYear = user.yearAllowances.some((a) => a.year === nextYear);
    if (!hasNextYear) {
      return `Your holiday year ends in ${daysUntilEnd} day${daysUntilEnd === 1 ? "" : "s"}. Please configure your ${nextYear} leave allowance.`;
    }
  }

  return null;
}
