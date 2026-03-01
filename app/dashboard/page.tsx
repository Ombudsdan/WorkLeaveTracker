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
import { usersController } from "@/controllers/usersController";
import { holidaysController } from "@/controllers/holidaysController";
import { entriesController } from "@/controllers/entriesController";
import { getHolidayYearBounds } from "@/utils/dateHelpers";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [bankHolidays, setBankHolidays] = useState<string[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LeaveEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    async function initDashboard() {
      setLoading(true);
      const [users, holidays] = await Promise.all([
        usersController.fetchAll(),
        holidaysController.fetchBankHolidays(),
      ]);
      if (!cancelled) {
        applyUserData(users, holidays);
        setLoading(false);
      }
    }
    initDashboard();
    return () => {
      cancelled = true;
    };
    // applyUserData uses session which is already in the dep array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
    );
  }

  if (!currentUser) return null;

  const displayedUser = viewingUserId
    ? (allUsers.find((user) => user.id === viewingUserId) ?? currentUser)
    : currentUser;

  const isOwnProfile = !viewingUserId || viewingUserId === currentUser.id;

  const currentAllowance = getCurrentYearAllowance(currentUser);
  const allowanceWarning = getYearAllowanceWarning(currentUser);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar activePage="dashboard" />

      <main className="max-w-6xl mx-auto py-6 px-4">
        {allowanceWarning && (
          <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
            <span className="text-amber-500 text-lg leading-none mt-0.5">⚠</span>
            <span>{allowanceWarning}</span>
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
            <AllowanceBreakdown allowance={currentAllowance} />
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
    </div>
  );

  async function refreshData() {
    const [users, holidays] = await Promise.all([
      usersController.fetchAll(),
      holidaysController.fetchBankHolidays(),
    ]);
    applyUserData(users, holidays);
  }

  function applyUserData(users: PublicUser[], holidays: string[]) {
    setBankHolidays(holidays);
    setAllUsers(users);
    const me = users.find((user) => user.profile.email === session?.user?.email);
    if (me) setCurrentUser(me);
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
      return `Your holiday year ends in ${daysUntilEnd} day${daysUntilEnd === 1 ? "" : "s"}. Please configure your ${nextYear} leave allowance in your profile.`;
    }
  }

  return null;
}
