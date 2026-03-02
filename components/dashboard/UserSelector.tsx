"use client";
import type { PublicUser } from "@/types";

export default function UserSelector({
  currentUser,
  allUsers,
  viewingUserId,
  onSelectUser,
}: UserSelectorProps) {
  const pinnedUsers = getPinnedUsers(allUsers, currentUser);

  if (pinnedUsers.length === 0) return null;

  const tabs = [
    { id: null as string | null, label: "My Calendar" },
    ...pinnedUsers.map((u) => ({
      id: u.id,
      label: `${u.profile.firstName} ${u.profile.lastName}`,
    })),
  ];

  return (
    <div className="flex mb-0 border-b border-gray-200" role="tablist" aria-label="Calendar view">
      {tabs.map((tab) => {
        const isActive = tab.id === viewingUserId;
        return (
          <button
            key={tab.id ?? "__me__"}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectUser(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none whitespace-nowrap ${
              isActive
                ? "border-indigo-600 text-indigo-700 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-transparent"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function getPinnedUsers(allUsers: PublicUser[], currentUser: PublicUser): PublicUser[] {
  const pinnedIds = currentUser.profile.pinnedUserIds ?? [];
  return allUsers.filter((u) => u.id !== currentUser.id && pinnedIds.includes(u.id));
}

interface UserSelectorProps {
  currentUser: PublicUser;
  allUsers: PublicUser[];
  viewingUserId: string | null;
  onSelectUser: (id: string | null) => void;
}
