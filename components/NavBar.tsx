"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

interface NavBarProps {
  activePage: "dashboard" | "profile";
}

export default function NavBar({ activePage }: NavBarProps) {
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <h1 className="text-lg font-bold text-indigo-700">Work Leave Tracker</h1>
      <div className="flex items-center gap-4 text-sm">
        <Link
          href="/dashboard"
          className={
            activePage === "dashboard"
              ? "text-indigo-700 font-semibold"
              : "text-gray-600 hover:text-indigo-700"
          }
        >
          Dashboard
        </Link>
        <Link
          href="/profile"
          className={
            activePage === "profile"
              ? "text-indigo-700 font-semibold"
              : "text-gray-600 hover:text-indigo-700"
          }
        >
          Profile
        </Link>
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
