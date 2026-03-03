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
    <div className="flex overflow-x-auto" role="tablist" aria-label="Calendar view">
      {tabs.map((tab) => {
        const isActive = tab.id === viewingUserId;
        return (
          <button
            key={tab.id ?? "__me__"}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectUser(tab.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors cursor-pointer focus:outline-none whitespace-nowrap border-b-2 ${
              isActive
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
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
