"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, LeaveEntry, UserAllowance } from "@/types";
import NavBar from "@/components/NavBar";
import UserSelector from "@/components/dashboard/UserSelector";
import SummaryCard from "@/components/dashboard/SummaryCard";
import AllowanceBreakdown from "@/components/dashboard/AllowanceBreakdown";
import LeaveList from "@/components/dashboard/LeaveList";
import CalendarView from "@/components/dashboard/CalendarView";
import AddLeaveModal from "@/components/dashboard/AddLeaveModal";
import EditLeaveModal from "@/components/dashboard/EditLeaveModal";
import YearAllowanceModal from "@/components/dashboard/YearAllowanceModal";
import { usersController } from "@/controllers/usersController";
import { holidaysController } from "@/controllers/holidaysController";
import { entriesController } from "@/controllers/entriesController";
import { getHolidayYearBounds } from "@/utils/dateHelpers";
import type { YearAllowance } from "@/types";

/** How long to wait before retrying initDashboard when the user record is not found. */
const DASHBOARD_RETRY_DELAY_MS = 400;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [bankHolidays, setBankHolidays] = useState<string[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LeaveEntry | null>(null);
  const [showAllowanceWarningModal, setShowAllowanceWarningModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
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
        // Retry once (after a brief delay) if the user record is not found on
        // the first attempt — handles the rare case where a preceding write
        // (e.g. setup page save) hasn't fully persisted yet.
        for (let attempt = 0; attempt <= 1; attempt++) {
          if (attempt > 0) await new Promise<void>((r) => setTimeout(r, DASHBOARD_RETRY_DELAY_MS));
          const [rawUsers, holidays] = await Promise.all([
            usersController.fetchAll(),
            holidaysController.fetchBankHolidays(),
          ]);
          if (cancelled) return;
          const result = applyUserData(
            Array.isArray(rawUsers) ? rawUsers : [],
            holidays,
            sessionEmail,
            sessionId
          );
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
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
    );
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
            </button>{" "}
            or{" "}
            <a href="/profile" className="underline font-medium hover:text-amber-900">
              update your profile
            </a>
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

  const displayedAllowance = getCurrentYearAllowance(displayedUser);
  const allowanceWarning = getYearAllowanceWarning(currentUser);
  /** The year we need to configure if the warning is visible */
  const nextAllowanceYear = (() => {
    const { start } = getHolidayYearBounds(currentUser.profile.holidayStartMonth);
    return start.getFullYear() + 1;
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar activePage="dashboard" />

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

        <UserSelector
          currentUser={currentUser}
          allUsers={allUsers}
          viewingUserId={viewingUserId}
          onSelectUser={setViewingUserId}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <SummaryCard
              user={displayedUser}
              bankHolidays={bankHolidays}
              isOwnProfile={isOwnProfile}
            />
            <AllowanceBreakdown allowance={displayedAllowance} />
            <LeaveList
              user={displayedUser}
              bankHolidays={bankHolidays}
              isOwnProfile={isOwnProfile}
              onAdd={() => setShowAddModal(true)}
              onEdit={setEditingEntry}
              onDelete={handleDeleteEntry}
            />
          </div>

          <div className="lg:col-span-2">
            <CalendarView
              user={displayedUser}
              bankHolidays={bankHolidays}
              isOwnProfile={isOwnProfile}
              onAdd={() => setShowAddModal(true)}
            />
          </div>
        </div>
      </main>

      {showAddModal && (
        <AddLeaveModal onClose={() => setShowAddModal(false)} onSave={handleAddEntry} />
      )}

      {editingEntry && (
        <EditLeaveModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleUpdateEntry}
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

  async function refreshData() {
    const sessionEmail = session?.user?.email;
    const sessionId = (session?.user as { id?: string })?.id;
    try {
      const [rawUsers, holidays] = await Promise.all([
        usersController.fetchAll(),
        holidaysController.fetchBankHolidays(),
      ]);
      applyUserData(Array.isArray(rawUsers) ? rawUsers : [], holidays, sessionEmail, sessionId);
    } catch {
      // silently ignore refresh errors
    }
  }

  /**
   * Apply fetched user data to component state.
   * Returns:
   *  "redirected" – a navigation to /setup was triggered (don't stop loading)
   *  "found"      – current user was located and currentUser state was updated
   *  "not_found"  – current user was not present in the fetched list
   */
  function applyUserData(
    users: PublicUser[],
    holidays: string[],
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
    const ok = await entriesController.create(entry);
    if (ok) {
      setShowAddModal(false);
      await refreshData();
    }
  }

  async function handleUpdateEntry(entry: LeaveEntry) {
    const ok = await entriesController.update(entry);
    if (ok) {
      setEditingEntry(null);
      await refreshData();
    }
  }

  async function handleDeleteEntry(id: string) {
    await entriesController.remove(id);
    await refreshData();
  }

  async function handleSaveWarningAllowance(ya: YearAllowance) {
    const ok = await usersController.addYearAllowance(ya);
    if (ok) {
      setShowAllowanceWarningModal(false);
      await refreshData();
    }
  }
}

function getCurrentYearAllowance(user: PublicUser): UserAllowance {
  const { start } = getHolidayYearBounds(user.profile.holidayStartMonth);
  const ya = user.yearAllowances.find((a) => a.year === start.getFullYear());
  return ya ?? { core: 0, bought: 0, carried: 0 };
}

function getYearAllowanceWarning(user: PublicUser): string | null {
  const { end, start } = getHolidayYearBounds(user.profile.holidayStartMonth);
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
