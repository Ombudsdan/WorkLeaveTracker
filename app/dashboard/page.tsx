"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, LeaveEntry } from "@/types";
import NavBar from "@/components/NavBar";
import UserSelector from "@/components/dashboard/UserSelector";
import SummaryCard from "@/components/dashboard/SummaryCard";
import AllowanceBreakdown from "@/components/dashboard/AllowanceBreakdown";
import LeaveList from "@/components/dashboard/LeaveList";
import CalendarView from "@/components/dashboard/CalendarView";
import AddLeaveModal from "@/components/dashboard/AddLeaveModal";
import EditLeaveModal from "@/components/dashboard/EditLeaveModal";

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
    async function fetchData() {
      setLoading(true);
      const [usersRes, holidaysRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/holidays"),
      ]);
      const users: PublicUser[] = await usersRes.json();
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
    return () => {
      cancelled = true;
    };
  }, [status, session]);

  async function refreshData() {
    const [usersRes, holidaysRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/holidays"),
    ]);
    const users: PublicUser[] = await usersRes.json();
    const holidays: string[] = await holidaysRes.json();
    setBankHolidays(holidays);
    setAllUsers(users);
    const me = users.find((u) => u.profile.email === session?.user?.email);
    if (me) setCurrentUser(me);
  }

  async function handleAddEntry(entry: Omit<LeaveEntry, "id">) {
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (res.ok) {
      setShowAddModal(false);
      await refreshData();
    }
  }

  async function handleUpdateEntry(entry: LeaveEntry) {
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (res.ok) {
      setEditingEntry(null);
      await refreshData();
    }
  }

  async function handleDeleteEntry(id: string) {
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    await refreshData();
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!currentUser) return null;

  const displayedUser =
    viewingUserId
      ? allUsers.find((u) => u.id === viewingUserId) ?? currentUser
      : currentUser;

  const isOwnProfile = !viewingUserId || viewingUserId === currentUser.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar activePage="dashboard" />

      <main className="max-w-6xl mx-auto py-6 px-4">
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
            <AllowanceBreakdown allowance={displayedUser.allowance} />
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
            <CalendarView user={displayedUser} bankHolidays={bankHolidays} />
          </div>
        </div>
      </main>

      {showAddModal && (
        <AddLeaveModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddEntry}
        />
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
}

