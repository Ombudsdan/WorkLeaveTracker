"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/types";
import NavBar from "@/components/NavBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import PinUserModal from "@/components/dashboard/PinUserModal";
import { usersController } from "@/controllers/usersController";
import { UserRoundCheck, UserRoundX, UserRoundPlus, Clock } from "lucide-react";

export default function ConnectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [actionError, setActionError] = useState("");

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
        if (me) setCurrentUser(me);
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [status, session]);

  if (status === "loading" || loading) return <LoadingSpinner />;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar activePage="connections" />
        <main className="max-w-2xl mx-auto py-8 px-4">
          <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm">
            Your profile could not be loaded. Please{" "}
            <button
              onClick={() => router.refresh()}
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

  const profile = currentUser.profile;
  const pinnedIds = profile.pinnedUserIds ?? [];
  const sentIds = profile.pendingPinRequestsSent ?? [];
  const receivedIds = profile.pendingPinRequestsReceived ?? [];
  const pendingCount = receivedIds.length;

  const connectedUsers = allUsers.filter((u) => pinnedIds.includes(u.id));
  const sentUsers = allUsers.filter((u) => sentIds.includes(u.id));
  const receivedUsers = allUsers.filter((u) => receivedIds.includes(u.id));
  const otherUsers = allUsers.filter((u) => u.id !== currentUser.id);

  async function handleAccept(requesterId: string) {
    setActionError("");
    const result = await usersController.respondToPinRequest(requesterId, true);
    if (!result.ok) {
      setActionError(result.error ?? "Failed to accept.");
      return;
    }
    refreshUser();
  }

  async function handleDecline(requesterId: string) {
    setActionError("");
    const result = await usersController.respondToPinRequest(requesterId, false);
    if (!result.ok) {
      setActionError(result.error ?? "Failed to decline.");
      return;
    }
    refreshUser();
  }

  async function handleUnpin(userId: string) {
    setActionError("");
    const newPinned = pinnedIds.filter((id) => id !== userId);
    const updated = await usersController.updateProfile({
      ...profile,
      pinnedUserIds: newPinned,
    });
    if (!updated) {
      setActionError("Failed to remove connection.");
      return;
    }
    setCurrentUser(updated);
  }

  function handleRequestSent(userId: string) {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const sent = prev.profile.pendingPinRequestsSent ?? [];
      return {
        ...prev,
        profile: { ...prev.profile, pendingPinRequestsSent: [...sent, userId] },
      };
    });
    setShowPinModal(false);
  }

  async function refreshUser() {
    const result = await usersController.fetchAll();
    if (!Array.isArray(result)) return;
    const sessionId = (session?.user as { id?: string })?.id;
    const me =
      (sessionId ? result.find((u) => u.id === sessionId) : undefined) ??
      result.find((u) => u.profile.email === session?.user?.email);
    if (me) {
      setCurrentUser(me);
      setAllUsers(result);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar activePage="connections" pendingRequestCount={pendingCount} />

      <main className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Connections</h2>
          <button
            onClick={() => setShowPinModal(true)}
            disabled={pinnedIds.length >= 3}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-40"
          >
            <UserRoundPlus size={16} />
            Add Connection
          </button>
        </div>

        {actionError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {actionError}
          </p>
        )}

        {/* Incoming requests */}
        {receivedUsers.length > 0 && (
          <section className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              Pending Requests ({receivedUsers.length})
            </h3>
            <ul className="space-y-2">
              {receivedUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="text-gray-800 font-medium">
                    {u.profile.firstName} {u.profile.lastName}
                    <span className="ml-1 text-gray-500 font-normal text-xs">
                      ({u.profile.email})
                    </span>
                  </span>
                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={() => handleAccept(u.id)}
                      className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
                      aria-label={`Accept request from ${u.profile.firstName}`}
                    >
                      <UserRoundCheck size={14} />
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(u.id)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
                      aria-label={`Decline request from ${u.profile.firstName}`}
                    >
                      <UserRoundX size={14} />
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Sent / awaiting approval */}
        {sentUsers.length > 0 && (
          <section className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
              Awaiting Approval
            </h3>
            <ul className="space-y-2">
              {sentUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                >
                  <span>
                    {u.profile.firstName} {u.profile.lastName}
                    <span className="ml-1 text-gray-400 text-xs">({u.profile.email})</span>
                  </span>
                  <span className="text-xs text-amber-600 font-medium">Pending</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Active connections */}
        <section className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
            My Connections
          </h3>
          {connectedUsers.length === 0 ? (
            <p className="text-sm text-gray-400">
              No connections yet. Send a request to a colleague to see their calendar.
            </p>
          ) : (
            <ul className="space-y-2">
              {connectedUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="text-indigo-800 font-medium">
                    {u.profile.firstName} {u.profile.lastName}
                    <span className="ml-1 text-indigo-500 font-normal text-xs">
                      ({u.profile.email})
                    </span>
                  </span>
                  <button
                    onClick={() => handleUnpin(u.id)}
                    className="text-xs text-red-500 hover:text-red-700 ml-3"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-400 mt-2">
            You can connect with up to 3 people. Their calendars will appear in your dashboard.
          </p>
        </section>
      </main>

      {showPinModal && (
        <PinUserModal
          otherUsers={otherUsers}
          pinnedUserIds={pinnedIds}
          pendingRequestsSent={sentIds}
          onClose={() => setShowPinModal(false)}
          onRequestSent={handleRequestSent}
        />
      )}
    </div>
  );
}
