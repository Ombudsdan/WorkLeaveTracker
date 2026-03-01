"use client";
import { useState } from "react";
import type { PublicUser } from "@/types";
import Button from "@/components/Button";
import EmailField from "@/components/EmailField";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";

interface PinUserModalProps {
  /** All users except the current user */
  otherUsers: PublicUser[];
  /** IDs already pinned (to enforce cap and skip duplicates) */
  pinnedUserIds: string[];
  onClose: () => void;
  onPin: (userId: string) => void;
}

/**
 * Inner content rendered inside its own FormValidationProvider so the email
 * field's validators don't register in the parent page's form context.
 */
function PinUserModalContent({
  otherUsers,
  pinnedUserIds,
  onClose,
  onPin,
}: PinUserModalProps) {
  const { triggerAllValidations } = useFormValidation();
  const [emailInput, setEmailInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  function handleSearch() {
    setSearchError(null);
    const formatValid = triggerAllValidations();
    if (!formatValid) return;

    const trimmed = emailInput.trim().toLowerCase();

    const found = otherUsers.find((u) => u.profile.email.toLowerCase() === trimmed);
    if (!found) {
      setSearchError("No user found with that email address.");
      return;
    }

    if (pinnedUserIds.includes(found.id)) {
      setSearchError(`${found.profile.firstName} ${found.profile.lastName} is already pinned.`);
      return;
    }

    if (pinnedUserIds.length >= 3) {
      setSearchError("You can pin a maximum of 3 users.");
      return;
    }

    onPin(found.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-800 mb-4">Search for a User</h3>
        <p className="text-sm text-gray-500 mb-4">
          Enter an email address to find and pin a user.
        </p>
        <EmailField
          id="pin-email"
          label="Email address"
          value={emailInput}
          onChange={(v) => {
            setEmailInput(v);
            setSearchError(null);
          }}
          placeholder="colleague@example.com"
          required="Please enter an email address."
        />
        {searchError && <p className="text-sm mt-2 text-red-600">{searchError}</p>}
        <div className="flex gap-2 mt-4">
          <Button
            variant="primary"
            fullWidth
            onClick={handleSearch}
          >
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

export default function PinUserModal(props: PinUserModalProps) {
  return (
    <FormValidationProvider>
      <PinUserModalContent {...props} />
    </FormValidationProvider>
  );
}
