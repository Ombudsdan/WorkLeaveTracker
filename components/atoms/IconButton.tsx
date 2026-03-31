"use client";
import type { ReactNode } from "react";

export type IconButtonVariant = "ghost" | "subtle";

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  /** Muted grey; suits close/dismiss actions in drawers and modals */
  ghost: "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
  /** Slightly accented; suits toolbar actions like settings or filters */
  subtle: "text-gray-600 hover:text-indigo-700 hover:bg-indigo-50",
};

export interface IconButtonProps {
  /** The icon element to render (e.g. <X size={18} />) */
  icon: ReactNode;
  /** Accessible label — always required for icon-only buttons */
  ariaLabel: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: IconButtonVariant;
  disabled?: boolean;
  className?: string;
}

/**
 * A minimal button wrapping a single icon. Always pass an ariaLabel so the
 * action is announced to screen reader users.
 *
 * Use in: modal/drawer close buttons, card action icons, NavBar controls.
 */
export default function IconButton({
  icon,
  ariaLabel,
  onClick,
  type = "button",
  variant = "ghost",
  disabled,
  className = "",
}: IconButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`p-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`.trim()}
    >
      {icon}
    </button>
  );
}
