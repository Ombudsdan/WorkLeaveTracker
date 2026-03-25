"use client";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, BankHolidayEntry } from "@/types";
import NavBar from "@/components/NavBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConnectionsPanel from "@/components/ConnectionsPanel";
import SharedCalendarView from "@/components/connections/SharedCalendarView";
import { usersController } from "@/controllers/usersController";
import { holidaysController } from "@/controllers/holidaysController";

type Tab = "shared-view" | "manage";

export default function ConnectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [bankHolidays, setBankHolidays] = useState<BankHolidayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("shared-view");

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
      <main className="max-w-5xl mx-auto py-8 px-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Connections</h2>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("shared-view")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition cursor-pointer ${
              activeTab === "shared-view"
                ? "text-indigo-700 border-b-2 border-indigo-600 bg-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Shared View
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition cursor-pointer ${
              activeTab === "manage"
                ? "text-indigo-700 border-b-2 border-indigo-600 bg-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Manage Connections
          </button>
        </div>

        {activeTab === "shared-view" && (
          <SharedView
            currentUser={currentUser}
            allUsers={allUsers}
            bankHolidays={bankHolidays}
          />
        )}

        {activeTab === "manage" && (
          <div className="max-w-2xl">
            <ConnectionsPanel
              currentUser={currentUser}
              allUsers={allUsers}
              onUserChange={setCurrentUser}
              onAllUsersChange={setAllUsers}
            />
          </div>
        )}
      </main>
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
}

function SharedView({ currentUser, allUsers, bankHolidays }: SharedViewProps) {
  const pinnedUsers = useMemo<PublicUser[]>(() => {
    const ids = currentUser.profile.pinnedUserIds ?? [];
    return ids
      .map((id) => allUsers.find((u) => u.id === id))
      .filter((u): u is PublicUser => u !== undefined);
  }, [currentUser, allUsers]);

  return (
    <SharedCalendarView
      currentUser={currentUser}
      pinnedUsers={pinnedUsers}
      bankHolidays={bankHolidays}
    />
  );
}
