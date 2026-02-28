"use client";
import type { PublicUser } from "@/types";

interface UserSelectorProps {
  currentUser: PublicUser;
  allUsers: PublicUser[];
  viewingUserId: string | null;
  onSelectUser: (id: string | null) => void;
}

export default function UserSelector({
  currentUser,
  allUsers,
  viewingUserId,
  onSelectUser,
}: UserSelectorProps) {
  return (
    <div className="flex items-center gap-3 mb-6 flex-wrap">
      <span className="text-sm font-medium text-gray-600">Viewing:</span>
      <button
        onClick={() => onSelectUser(null)}
        className={`px-3 py-1 rounded-full text-sm border transition ${
          !viewingUserId
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
        }`}
      >
        My Calendar
      </button>
      {allUsers
        .filter((u) => u.id !== currentUser.id)
        .map((u) => (
          <button
            key={u.id}
            onClick={() => onSelectUser(u.id)}
            className={`px-3 py-1 rounded-full text-sm border transition ${
              viewingUserId === u.id
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
            }`}
          >
            {u.profile.firstName} {u.profile.lastName}
          </button>
        ))}
    </div>
  );
}
