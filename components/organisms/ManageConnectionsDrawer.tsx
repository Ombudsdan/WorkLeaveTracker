"use client";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export interface ManageConnectionsDrawerProps {
  /** Whether the drawer is currently open. */
  isOpen: boolean;
  onClose: () => void;
  /** Drawer heading text. Defaults to "Manage Connections". */
  title?: string;
  /** The body content — typically a `<ConnectionsPanel>`. */
  children: ReactNode;
}

/**
 * Right-side slide-over drawer with a semi-transparent backdrop.
 *
 * When `isOpen` is false nothing is rendered (avoids focus traps).
 * Clicking the backdrop or the × button calls `onClose`.
 */
export default function ManageConnectionsDrawer({
  isOpen,
  onClose,
  title = "Manage Connections",
  children,
}: ManageConnectionsDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="drawer-backdrop"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-drawer-title"
        data-testid="manage-connections-drawer"
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3
            id="manage-drawer-title"
            className="text-base font-semibold text-gray-800"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </>
  );
}
