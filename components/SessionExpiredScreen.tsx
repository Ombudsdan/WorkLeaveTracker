"use client";
import { signOut } from "next-auth/react";

/**
 * Shown when a user's session has expired after being idle and they navigate to a
 * protected page.  Forces a clean sign-out and redirects to the sign-in screen.
 */
export default function SessionExpiredScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Session Expired</h2>
        <p className="text-sm text-gray-500 mb-5">
          Your session has timed out. Please sign back in to continue.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full bg-indigo-600 text-white rounded-lg py-2 font-semibold hover:bg-indigo-700 transition"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
