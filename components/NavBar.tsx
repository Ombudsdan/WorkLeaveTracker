"use client";
import { useSession, signOut } from "next-auth/react";

interface NavBarProps {
  activePage: "dashboard" | "profile" | "connections";
  pendingRequestCount?: number;
}

export default function NavBar({ activePage, pendingRequestCount = 0 }: NavBarProps) {
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <h1 className="text-lg font-bold text-indigo-700">Work Leave Tracker</h1>
      <div className="flex items-center gap-4 text-sm">
        <a
          href="/dashboard"
          className={
            activePage === "dashboard"
              ? "text-indigo-700 font-semibold"
              : "text-gray-600 hover:text-indigo-700"
          }
        >
          Dashboard
        </a>
        <a
          href="/profile"
          className={
            activePage === "profile"
              ? "text-indigo-700 font-semibold"
              : "text-gray-600 hover:text-indigo-700"
          }
        >
          Profile
        </a>
        <a
          href="/connections"
          className={`relative flex items-center gap-1 ${
            activePage === "connections"
              ? "text-indigo-700 font-semibold"
              : "text-gray-600 hover:text-indigo-700"
          }`}
          aria-label={`Connections${pendingRequestCount > 0 ? ` (${pendingRequestCount} pending)` : ""}`}
        >
          Connections
          {pendingRequestCount > 0 && (
            <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 leading-none">
              {pendingRequestCount}
            </span>
          )}
        </a>
        {session && (
          <>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">{session.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-500 hover:text-red-700"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
