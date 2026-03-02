"use client";
import { useState } from "react";
import type { PublicUser } from "@/types";
import Button from "@/components/Button";
import EmailField from "@/components/EmailField";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";
import { usersController } from "@/controllers/usersController";

interface PinUserModalProps {
  /** All users except the current user */
  otherUsers: PublicUser[];
  /** IDs already pinned (to enforce cap and skip duplicates) */
  pinnedUserIds: string[];
  /** IDs to whom a request has already been sent */
  pendingRequestsSent?: string[];
  onClose: () => void;
  /** Called after a request has been sent successfully */
  onRequestSent?: (userId: string) => void;
}

/**
 * Inner content rendered inside its own FormValidationProvider so the email
 * field's validators don't register in the parent page's form context.
 */
function PinUserModalContent({
  otherUsers,
  pinnedUserIds,
  pendingRequestsSent = [],
  onClose,
  onRequestSent,
}: PinUserModalProps) {
  const { triggerAllValidations } = useFormValidation();
  const [emailInput, setEmailInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSearch() {
    setSearchError(null);
    setSuccessMsg(null);
    const formatValid = triggerAllValidations();
    if (!formatValid) return;

    const trimmed = emailInput.trim().toLowerCase();
    const found = otherUsers.find((u) => u.profile.email.toLowerCase() === trimmed);

    if (!found) {
      setSearchError("No user found with that email address.");
      return;
    }

    if (pinnedUserIds.includes(found.id)) {
      setSearchError(`${found.profile.firstName} ${found.profile.lastName} is already connected.`);
      return;
    }

    if (pendingRequestsSent.includes(found.id)) {
      setSearchError(
        `A connection request has already been sent to ${found.profile.firstName} ${found.profile.lastName}.`
      );
      return;
    }

    if (pinnedUserIds.length >= 3) {
      setSearchError("You can have a maximum of 3 connections.");
      return;
    }

    setSending(true);
    const result = await usersController.sendPinRequest(found.id);
    setSending(false);

    if (!result.ok) {
      if (result.error === "Request already sent") {
        setSearchError(
          `A connection request has already been sent to ${found.profile.firstName} ${found.profile.lastName}.`
        );
      } else if (result.error === "Already connected") {
        setSearchError(`${found.profile.firstName} ${found.profile.lastName} is already connected.`);
      } else {
        setSearchError(result.error ?? "Failed to send request. Please try again.");
      }
      return;
    }

    onRequestSent?.(found.id);
    setSuccessMsg(
      `Connection request sent to ${found.profile.firstName} ${found.profile.lastName}. They will need to approve it.`
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-800 mb-2">Send Connection Request</h3>
        <p className="text-sm text-gray-500 mb-4">
          Enter a colleague&apos;s email to send them a connection request. They will need to
          approve it before their calendar is shown here.
        </p>
        <EmailField
          id="pin-email"
          label="Email address"
          value={emailInput}
          onChange={(v) => {
            setEmailInput(v);
            setSearchError(null);
            setSuccessMsg(null);
          }}
          placeholder="colleague@example.com"
          required="Please enter an email address."
        />
        {searchError && <p className="text-sm mt-2 text-red-600">{searchError}</p>}
        {successMsg && <p className="text-sm mt-2 text-green-600">{successMsg}</p>}
        <div className="flex gap-2 mt-4">
          <Button variant="primary" fullWidth onClick={handleSearch} disabled={sending}>
            {sending ? "Sending…" : "Send Request"}
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
