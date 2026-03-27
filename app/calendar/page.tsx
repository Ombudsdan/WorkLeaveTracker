"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, BankHolidayEntry, LeaveEntry } from "@/types";
import NavBar from "@/components/NavBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import SessionExpiredScreen from "@/components/SessionExpiredScreen";
import CalendarView from "@/components/dashboard/CalendarView";
import AddLeaveModal from "@/components/dashboard/AddLeaveModal";
import EditLeaveModal from "@/components/dashboard/EditLeaveModal";
import { usersController } from "@/controllers/usersController";
import { holidaysController } from "@/controllers/holidaysController";
import { entriesController } from "@/controllers/entriesController";

/** How long to wait between retries when the user record is not found. */
const RETRY_DELAY_MS = 400;

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [bankHolidays, setBankHolidays] = useState<BankHolidayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalInitialDate, setAddModalInitialDate] = useState<string | undefined>(undefined);
  const [editingEntry, setEditingEntry] = useState<LeaveEntry | null>(null);

  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated") {
      wasAuthenticatedRef.current = true;
    }
    if (status === "unauthenticated") {
      if (!wasAuthenticatedRef.current) {
        router.push("/login");
      }
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const sessionEmail = session?.user?.email;
    const sessionId = (session?.user as { id?: string })?.id;
    if (!sessionEmail && !sessionId) return;

    let cancelled = false;
    async function initPage() {
      setLoading(true);
      try {
        for (let attempt = 0; attempt <= 4; attempt++) {
          if (attempt > 0) await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          const rawUsers = await usersController.fetchAll();
          if (cancelled) return;
          const users = Array.isArray(rawUsers) ? rawUsers : [];
          const me = users.find(
            (u) =>
              (sessionId != null && u.id === sessionId) ||
              (sessionEmail != null && u.profile.email === sessionEmail)
          );
          if (me) {
            if (me.yearAllowances.length === 0) {
              router.replace("/setup");
              return;
            }
            const holidays = await holidaysController.fetchBankHolidays(me.profile.country);
            if (cancelled) return;
            setBankHolidays(Array.isArray(holidays) ? holidays : []);
            setCurrentUser(me);
            break;
          }
        }
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    initPage();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  if (status === "loading" || loading) {
    return <LoadingSpinner />;
  }

  if (status === "unauthenticated" && wasAuthenticatedRef.current) {
    return <SessionExpiredScreen />;
  }

  const pendingCount = (currentUser?.profile.pendingPinRequestsReceived ?? []).length;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar activePage="calendar" pendingRequestCount={pendingCount} />
        <main className="max-w-2xl mx-auto py-6 px-4">
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

  async function handleAddEntry(entry: Omit<LeaveEntry, "id">) {
    const created = await entriesController.create(entry);
    if (created) {
      setShowAddModal(false);
      setAddModalInitialDate(undefined);
      setCurrentUser((prev) => (prev ? { ...prev, entries: [...prev.entries, created] } : prev));
    }
  }

  async function handleUpdateEntry(entry: LeaveEntry) {
    const updated = await entriesController.update(entry);
    if (updated) {
      setEditingEntry(null);
      setCurrentUser((prev) =>
        prev
          ? { ...prev, entries: prev.entries.map((e) => (e.id === updated.id ? updated : e)) }
          : prev
      );
    }
  }

  async function handleDeleteEntry(id: string) {
    const ok = await entriesController.remove(id);
    if (ok) {
      setCurrentUser((prev) =>
        prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== id) } : prev
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar activePage="calendar" pendingRequestCount={pendingCount} />
      <main className="max-w-2xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Calendar</h1>
        <CalendarView
          user={currentUser}
          bankHolidays={bankHolidays}
          isOwnProfile
          onAdd={(date) => {
            setAddModalInitialDate(date);
            setShowAddModal(true);
          }}
          onEdit={setEditingEntry}
          onDelete={handleDeleteEntry}
        />
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
    </div>
  );
}
