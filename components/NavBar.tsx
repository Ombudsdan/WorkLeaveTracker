"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Menu, X } from "lucide-react";
import NotificationBlob from "@/components/atoms/NotificationBlob";

interface NavBarProps {
  activePage: "dashboard" | "profile" | "connections" | "annual-planner" | "calendar";
  pendingRequestCount?: number;
}

export default function NavBar({ activePage, pendingRequestCount = 0 }: NavBarProps) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center justify-between relative">
      <a href="/dashboard" className="text-lg font-bold text-indigo-700 hover:text-indigo-800">
        Work Leave Tracker
      </a>

      {/* Desktop navigation */}
      <div className="hidden sm:flex items-center gap-4 text-sm">
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
          href="/calendar"
          className={
            activePage === "calendar"
              ? "text-indigo-700 font-semibold"
              : "text-gray-600 hover:text-indigo-700"
          }
        >
          Calendar
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
            <NotificationBlob count={pendingRequestCount} label="pending requests" />
          )}
        </a>
        <a
          href="/annual-planner"
          className={
            activePage === "annual-planner"
              ? "text-indigo-700 font-semibold"
              : "text-gray-600 hover:text-indigo-700"
          }
        >
          Annual Planner
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
        {session && (
          <>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">{session.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-500 hover:text-red-700 cursor-pointer"
            >
              Sign Out
            </button>
          </>
        )}
      </div>

      {/* Mobile hamburger button */}
      <button
        className="sm:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-white border-b shadow-md z-50">
          <div className="flex flex-col text-sm px-6 py-3 gap-3">
            <a
              href="/dashboard"
              onClick={closeMenu}
              className={
                activePage === "dashboard"
                  ? "text-indigo-700 font-semibold"
                  : "text-gray-600 hover:text-indigo-700"
              }
            >
              Dashboard
            </a>
            <a
              href="/calendar"
              onClick={closeMenu}
              className={
                activePage === "calendar"
                  ? "text-indigo-700 font-semibold"
                  : "text-gray-600 hover:text-indigo-700"
              }
            >
              Calendar
            </a>
            <a
              href="/connections"
              onClick={closeMenu}
              className={`flex items-center gap-1 ${
                activePage === "connections"
                  ? "text-indigo-700 font-semibold"
                  : "text-gray-600 hover:text-indigo-700"
              }`}
            >
              Connections
              {pendingRequestCount > 0 && (
                <NotificationBlob count={pendingRequestCount} label="pending requests" />
              )}
            </a>
            <a
              href="/annual-planner"
              onClick={closeMenu}
              className={
                activePage === "annual-planner"
                  ? "text-indigo-700 font-semibold"
                  : "text-gray-600 hover:text-indigo-700"
              }
            >
              Annual Planner
            </a>
            <a
              href="/profile"
              onClick={closeMenu}
              className={
                activePage === "profile"
                  ? "text-indigo-700 font-semibold"
                  : "text-gray-600 hover:text-indigo-700"
              }
            >
              Profile
            </a>
            {session && (
              <>
                <span className="text-gray-600">{session.user?.name}</span>
                <button
                  onClick={() => {
                    closeMenu();
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="text-red-500 hover:text-red-700 cursor-pointer text-left"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
