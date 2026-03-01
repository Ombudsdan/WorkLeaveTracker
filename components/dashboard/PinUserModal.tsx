"use client";
import { useState } from "react";
import type { PublicUser } from "@/types";
import Button from "@/components/Button";

interface PinUserModalProps {
  /** All users except the current user */
  otherUsers: PublicUser[];
  /** IDs already pinned (to enforce cap and skip duplicates) */
  pinnedUserIds: string[];
  onClose: () => void;
  onPin: (userId: string) => void;
}

export default function PinUserModal({
  otherUsers,
  pinnedUserIds,
  onClose,
  onPin,
}: PinUserModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function handleSearch() {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) {
      setMessage({ type: "error", text: "Please enter an email address." });
      return;
    }

    const found = otherUsers.find((u) => u.profile.email.toLowerCase() === trimmed);
    if (!found) {
      setMessage({ type: "error", text: "No user found with that email address." });
      return;
    }

    if (pinnedUserIds.includes(found.id)) {
      setMessage({
        type: "error",
        text: `${found.profile.firstName} ${found.profile.lastName} is already pinned.`,
      });
      return;
    }

    if (pinnedUserIds.length >= 3) {
      setMessage({ type: "error", text: "You can pin a maximum of 3 users." });
      return;
    }

    onPin(found.id);
    setMessage({
      type: "success",
      text: `${found.profile.firstName} ${found.profile.lastName} has been pinned.`,
    });
    setEmailInput("");
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-800 mb-4">Search for a User</h3>
        <p className="text-sm text-gray-500 mb-4">
          Enter an email address to find and pin a user.
        </p>
        <label htmlFor="pin-email" className="block text-sm font-medium text-gray-600 mb-1">
          Email address
        </label>
        <input
          id="pin-email"
          type="email"
          value={emailInput}
          onChange={(e) => {
            setEmailInput(e.target.value);
            setMessage(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
          placeholder="colleague@example.com"
          autoFocus
        />
        {message && (
          <p
            className={`text-sm mb-3 ${message.type === "error" ? "text-red-600" : "text-green-600"}`}
          >
            {message.text}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="primary" fullWidth onClick={handleSearch}>
            Search &amp; Pin
          </Button>
          <Button variant="secondary" fullWidth onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
