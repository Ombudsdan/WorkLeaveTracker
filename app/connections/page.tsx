"use client";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, BankHolidayEntry, LeaveEntry } from "@/types";
import NavBar from "@/components/organisms/NavBar";
import LoadingSpinner from "@/components/atoms/LoadingSpinner";
import ConnectionsPanel from "@/components/organisms/ConnectionsPanel";
import SharedCalendarView from "@/components/organisms/SharedCalendarView";
import AddLeaveModal from "@/components/organisms/AddLeaveModal";
import EditLeaveModal from "@/components/organisms/EditLeaveModal";
import ManageConnectionsDrawer from "@/components/organisms/ManageConnectionsDrawer";
import NotificationBlob from "@/components/atoms/NotificationBlob";
import { Settings2 } from "lucide-react";
import { usersController } from "@/controllers/usersController";
import { holidaysController } from "@/controllers/holidaysController";
import { entriesController } from "@/controllers/entriesController";

export default function ConnectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [bankHolidays, setBankHolidays] = useState<BankHolidayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManagePanel, setShowManagePanel] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const sessionId = (session?.user as { id?: string })?.id;
    let active = true;

    async function load() {
      setLoading(true);
      const result = await usersController.fetchAll();
      if (!active) return;
      if (Array.isArray(result)) {
        setAllUsers(result);
        const me =
          (sessionId ? result.find((u) => u.id === sessionId) : undefined) ??
          result.find((u) => u.profile.email === session?.user?.email);
        if (me) {
          setCurrentUser(me);
          const bh = await holidaysController.fetchBankHolidays(me.profile.country);
          if (!active) return;
          setBankHolidays(Array.isArray(bh) ? bh : []);
        }
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [status, session]);

  if (status === "loading" || loading) return <LoadingSpinner />;

  const pendingCount = (currentUser?.profile.pendingPinRequestsReceived ?? []).length;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar activePage="connections" pendingRequestCount={pendingCount} />
        <main className="max-w-2xl mx-auto py-8 px-4">
          <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm">
            Your profile could not be loaded. Please{" "}
            <button
              onClick={() => router.refresh()}
              className="underline font-medium hover:text-amber-900 cursor-pointer"
            >
              refresh the page
            </button>
            .
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar activePage="connections" pendingRequestCount={pendingCount} />
      <main className="w-full py-6 px-6">
        {/* Page heading with Manage Connections button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Connections</h2>
          <button
            onClick={() => setShowManagePanel(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
          >
            <Settings2 size={15} aria-hidden="true" />
            Manage Connections
            {pendingCount > 0 && <NotificationBlob count={pendingCount} label="pending requests" />}
          </button>
        </div>

        <SharedView
          currentUser={currentUser}
          allUsers={allUsers}
          bankHolidays={bankHolidays}
          onCurrentUserChange={setCurrentUser}
        />
      </main>

      {/* Manage Connections overlay */}
      <ManageConnectionsDrawer
        isOpen={showManagePanel}
        onClose={() => setShowManagePanel(false)}
      >
        <ConnectionsPanel
          currentUser={currentUser}
          allUsers={allUsers}
          onUserChange={(updated) => {
            setCurrentUser(updated);
          }}
          onAllUsersChange={setAllUsers}
        />
      </ManageConnectionsDrawer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SharedView sub-component
// ---------------------------------------------------------------------------

interface SharedViewProps {
  currentUser: PublicUser;
  allUsers: PublicUser[];
  bankHolidays: BankHolidayEntry[];
  onCurrentUserChange: (user: PublicUser) => void;
}

function SharedView({ currentUser, allUsers, bankHolidays, onCurrentUserChange }: SharedViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLeaveDate, setAddLeaveDate] = useState<string | undefined>(undefined);
  const [editingEntry, setEditingEntry] = useState<LeaveEntry | null>(null);

  const pinnedUsers = useMemo<PublicUser[]>(() => {
    const ids = currentUser.profile.pinnedUserIds ?? [];
    return ids
      .map((id) => allUsers.find((u) => u.id === id))
      .filter((u): u is PublicUser => u !== undefined);
  }, [currentUser, allUsers]);

  function applyEntryUpdate(updater: (entries: LeaveEntry[]) => LeaveEntry[]) {
    onCurrentUserChange({ ...currentUser, entries: updater(currentUser.entries) });
  }

  async function handleSaveEntry(entry: Omit<LeaveEntry, "id">) {
    const created = await entriesController.create(entry);
    if (created) {
      setShowAddModal(false);
      setAddLeaveDate(undefined);
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

  return (
    <>
      <SharedCalendarView
        currentUser={currentUser}
        pinnedUsers={pinnedUsers}
        bankHolidays={bankHolidays}
        onAddLeave={(dateStr) => {
          setAddLeaveDate(dateStr);
          setShowAddModal(true);
        }}
        onEdit={setEditingEntry}
        onDelete={handleDeleteEntry}
      />

      {showAddModal && (
        <AddLeaveModal
          onClose={() => {
            setShowAddModal(false);
            setAddLeaveDate(undefined);
          }}
          onSave={handleSaveEntry}
          user={currentUser}
          bankHolidays={bankHolidays}
          initialDate={addLeaveDate}
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
    </>
  );
}
