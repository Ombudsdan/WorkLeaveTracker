"use client";
import type { PublicUser } from "@/types";

export default function UserSelector({
  currentUser,
  allUsers,
  viewingUserId,
  onSelectUser,
}: UserSelectorProps) {
  const otherUsers = getOtherUsers(allUsers, currentUser.id);

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
      {otherUsers.map((user) => (
        <button
          key={user.id}
          onClick={() => onSelectUser(user.id)}
          className={`px-3 py-1 rounded-full text-sm border transition ${
            viewingUserId === user.id
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
          }`}
        >
          {user.profile.firstName} {user.profile.lastName}
        </button>
      ))}
    </div>
  );
}

function getOtherUsers(allUsers: PublicUser[], currentUserId: string): PublicUser[] {
  return allUsers.filter((user) => user.id !== currentUserId);
}

interface UserSelectorProps {
  currentUser: PublicUser;
  allUsers: PublicUser[];
  viewingUserId: string | null;
  onSelectUser: (id: string | null) => void;
}
