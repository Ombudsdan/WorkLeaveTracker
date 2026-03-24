"use client";
import { useState } from "react";
import type { PublicUser } from "@/types";
import PinUserModal from "@/components/dashboard/PinUserModal";
import { usersController } from "@/controllers/usersController";
import {
  UserRoundCheck,
  UserRoundX,
  UserRoundPlus,
  Clock,
  Info,
  X,
  ShieldOff,
  Archive,
} from "lucide-react";

/** Format an ISO date string as DD/MM/YYYY in UTC */
function formatUtcDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

interface ConnectionsPanelProps {
  currentUser: PublicUser;
  allUsers: PublicUser[];
  onUserChange: (updated: PublicUser) => void;
  onAllUsersChange: (users: PublicUser[]) => void;
}

export default function ConnectionsPanel({
  currentUser,
  allUsers,
  onUserChange,
  onAllUsersChange,
}: ConnectionsPanelProps) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [actionError, setActionError] = useState("");

  const profile = currentUser.profile;
  const pinnedIds = profile.pinnedUserIds ?? [];
  const sentIds = profile.pendingPinRequestsSent ?? [];
  const receivedIds = profile.pendingPinRequestsReceived ?? [];
  const revokedConnections = profile.revokedConnections ?? [];

  const connectedUsers = allUsers.filter((u) => pinnedIds.includes(u.id));
  const sentUsers = allUsers.filter((u) => sentIds.includes(u.id));
  const receivedUsers = allUsers.filter((u) => receivedIds.includes(u.id));
  // People following me = users who have my id in their pinnedUserIds
  const followers = allUsers.filter(
    (u) => u.id !== currentUser.id && (u.profile.pinnedUserIds ?? []).includes(currentUser.id)
  );
  const otherUsers = allUsers.filter((u) => u.id !== currentUser.id);

  async function handleAccept(requesterId: string) {
    setActionError("");
    const result = await usersController.respondToPinRequest(requesterId, true);
    if (!result.ok) {
      setActionError(result.error ?? "Failed to accept.");
      return;
    }
    await refreshUsers();
  }

  async function handleDecline(requesterId: string) {
    setActionError("");
    const result = await usersController.respondToPinRequest(requesterId, false);
    if (!result.ok) {
      setActionError(result.error ?? "Failed to decline.");
      return;
    }
    await refreshUsers();
  }

  async function handleUnpin(userId: string) {
    setActionError("");
    const result = await usersController.disconnect(userId);
    if (!result.ok) {
      setActionError(result.error ?? "Failed to remove connection.");
      return;
    }
    await refreshUsers();
  }

  async function handleRevokeFollower(followerId: string) {
    setActionError("");
    const result = await usersController.revokeConnection(followerId);
    if (!result.ok) {
      setActionError(result.error ?? "Failed to revoke connection.");
      return;
    }
    await refreshUsers();
  }

  async function handleReconnect(userId: string) {
    setActionError("");
    const result = await usersController.sendPinRequest(userId);
    if (!result.ok) {
      setActionError(result.error ?? "Failed to send request.");
      return;
    }
    // Optimistically update local state: move from revoked to sent
    onUserChange({
      ...currentUser,
      profile: {
        ...currentUser.profile,
        pendingPinRequestsSent: [...sentIds, userId],
        revokedConnections: revokedConnections.filter((r) => r.userId !== userId),
      },
    });
  }

  function handleRequestSent(userId: string) {
    onUserChange({
      ...currentUser,
      profile: {
        ...currentUser.profile,
        pendingPinRequestsSent: [...sentIds, userId],
      },
    });
    setShowPinModal(false);
  }

  async function refreshUsers() {
    const result = await usersController.fetchAll();
    if (!Array.isArray(result)) return;
    onAllUsersChange(result);
    const me = result.find((u) => u.id === currentUser.id);
    if (me) onUserChange(me);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Connections</h3>
        <button
          onClick={() => setShowPinModal(true)}
          disabled={pinnedIds.length >= 3}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-40 cursor-pointer"
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
          <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock size={14} className="text-amber-500" />
            Pending Requests ({receivedUsers.length})
          </h4>
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
                    className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium cursor-pointer"
                    aria-label={`Accept request from ${u.profile.firstName}`}
                  >
                    <UserRoundCheck size={14} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(u.id)}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
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
          <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
            Awaiting Approval
          </h4>
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

      {/* People I'm following */}
      <section className="bg-white rounded-2xl shadow p-5">
        <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
          People I&apos;m Following
          <button
            onClick={() => setShowInfoModal(true)}
            aria-label="What are connections?"
            className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <Info size={14} />
          </button>
        </h4>
        {connectedUsers.length === 0 ? (
          <p className="text-sm text-gray-400">Not following anyone yet.</p>
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
                  className="text-xs text-red-500 hover:text-red-700 ml-3 cursor-pointer"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* People following me */}
      <section className="bg-white rounded-2xl shadow p-5">
        <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
          People Following Me
        </h4>
        {followers.length === 0 ? (
          <p className="text-sm text-gray-400">Nobody is following you yet.</p>
        ) : (
          <ul className="space-y-2">
            {followers.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-green-800 font-medium">
                  {u.profile.firstName} {u.profile.lastName}
                  <span className="ml-1 text-green-600 font-normal text-xs">
                    ({u.profile.email})
                  </span>
                </span>
                <button
                  onClick={() => handleRevokeFollower(u.id)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 ml-3 cursor-pointer"
                  aria-label={`Revoke ${u.profile.firstName}'s access`}
                >
                  <ShieldOff size={13} />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Archive — connections revoked by others */}
      {revokedConnections.length > 0 && (
        <section className="bg-white rounded-2xl shadow p-5">
          <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
            <Archive size={14} className="text-gray-400" />
            Archive
          </h4>
          <ul className="space-y-2">
            {revokedConnections.map((rc) => {
              const revoker = allUsers.find((u) => u.id === rc.userId);
              const displayName = revoker
                ? `${revoker.profile.firstName} ${revoker.profile.lastName}`
                : "Unknown user";
              const alreadySent = sentIds.includes(rc.userId);
              return (
                <li
                  key={rc.userId}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="text-gray-700">
                    <span className="font-medium">{displayName}</span>
                    <span className="ml-2 text-gray-500 text-xs">
                      Connection removed on {formatUtcDate(rc.date)}
                    </span>
                  </span>
                  {alreadySent ? (
                    <span className="text-xs text-amber-600 font-medium ml-3">Pending</span>
                  ) : (
                    <button
                      onClick={() => handleReconnect(rc.userId)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 ml-3 cursor-pointer font-medium"
                      aria-label={`Request to reconnect with ${displayName}`}
                    >
                      Request to reconnect
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* What are connections? info modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative">
            <button
              onClick={() => setShowInfoModal(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="font-bold text-gray-800 mb-3">What are Connections?</h3>
            <p className="text-sm text-gray-600 mb-2">
              Connections let you view another person&apos;s leave calendar directly from your
              dashboard. This makes it easy to coordinate time off with others.
            </p>
            <p className="text-sm text-gray-600 mb-2">
              To connect with someone, send them a request using their email address. They will need
              to approve it before their calendar becomes visible to you — and vice versa.
            </p>
            <p className="text-sm text-gray-600">
              You can have up to <strong>3</strong> active connections at a time.
            </p>
          </div>
        </div>
      )}

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
