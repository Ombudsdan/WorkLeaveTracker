"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, LeaveEntry, BankHolidayEntry } from "@/types";
import NavBar from "@/components/NavBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import SessionExpiredScreen from "@/components/SessionExpiredScreen";
import UserSelector from "@/components/dashboard/UserSelector";
import SummaryCard from "@/components/dashboard/SummaryCard";
import LeaveList from "@/components/dashboard/LeaveList";
import CalendarView from "@/components/dashboard/CalendarView";
import AddLeaveModal from "@/components/dashboard/AddLeaveModal";
import EditLeaveModal from "@/components/dashboard/EditLeaveModal";
import YearAllowanceModal from "@/components/dashboard/YearAllowanceModal";
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
  const [bankHolidays, setBankHolidays] = useState<BankHolidayEntry[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
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

  const displayedUser = viewingUserId
    ? (allUsers.find((user) => user.id === viewingUserId) ?? currentUser)
    : currentUser;

  const isOwnProfile = !viewingUserId || viewingUserId === currentUser.id;

  const allowanceWarning = getYearAllowanceWarning(currentUser);
  /** The year we need to configure if the warning is visible */
  const nextAllowanceYear = (() => {
    const activeYa = getActiveYearAllowance(currentUser.yearAllowances);
    const { start } = getHolidayYearBounds(activeYa?.holidayStartMonth ?? 1);
    return start.getFullYear() + 1;
  })();

  const pendingConnectionRequests = (currentUser.profile.pendingPinRequestsReceived ?? []).length;

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

        {/* Tab strip — only rendered when the user has pinned connections */}
        {(currentUser.profile.pinnedUserIds ?? []).length > 0 && (
          <div className="bg-white rounded-2xl shadow mb-6 border-b border-gray-200 overflow-hidden">
            <UserSelector
              currentUser={currentUser}
              allUsers={allUsers}
              viewingUserId={viewingUserId}
              onSelectUser={setViewingUserId}
            />
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`lg:col-span-1 space-y-4 ${mobileView === "list" ? "block" : "hidden"} lg:block`}
          >
            <SummaryCard user={displayedUser} bankHolidays={bankHolidays} />
            <LeaveList
              user={displayedUser}
              bankHolidays={bankHolidays}
              isOwnProfile={isOwnProfile}
              onEdit={setEditingEntry}
              onDelete={handleDeleteEntry}
            />
          </div>

          <div
            className={`lg:col-span-2 ${mobileView === "calendar" ? "block" : "hidden"} lg:block`}
          >
            <CalendarView
              user={displayedUser}
              bankHolidays={bankHolidays}
              isOwnProfile={isOwnProfile}
              onAdd={() => setShowAddModal(true)}
              onEdit={isOwnProfile ? setEditingEntry : undefined}
              onDelete={isOwnProfile ? handleDeleteEntry : undefined}
            />
          </div>
        </div>
      </main>

      {showAddModal && (
        <AddLeaveModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddEntry}
          user={currentUser}
          bankHolidays={bankHolidays}
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

  /** Update the current user's entries in both currentUser and allUsers state. */
  function applyEntryUpdate(updater: (entries: LeaveEntry[]) => LeaveEntry[]) {
    const userId = currentUser?.id;
    setCurrentUser((prev) => (prev ? { ...prev, entries: updater(prev.entries) } : prev));
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, entries: updater(u.entries) } : u))
    );
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
