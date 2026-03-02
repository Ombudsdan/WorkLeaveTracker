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
    <div className="flex px-2 pt-2 gap-1" role="tablist" aria-label="Calendar view">
      {tabs.map((tab) => {
        const isActive = tab.id === viewingUserId;
        return (
          <button
            key={tab.id ?? "__me__"}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectUser(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer focus:outline-none whitespace-nowrap ${
              isActive
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
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
