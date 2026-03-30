"use client";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: "w-5 h-5", text: "text-[9px]" },
  sm: { container: "w-7 h-7", text: "text-[11px]" },
  md: { container: "w-9 h-9", text: "text-sm" },
  lg: { container: "w-12 h-12", text: "text-base" },
};

export interface AvatarInitialsProps {
  firstName: string;
  lastName: string;
  size?: AvatarSize;
  className?: string;
}

/**
 * A small circular badge displaying the first letter of each name component.
 * Used in pinned-user lists, connection chips, NavBar user indicators, and
 * any other compact surface that needs a visual identity for a user.
 */
export default function AvatarInitials({
  firstName,
  lastName,
  size = "sm",
  className = "",
}: AvatarInitialsProps) {
  const initials = `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  const { container, text } = SIZE_CLASSES[size];

  return (
    <span
      aria-label={`${firstName} ${lastName}`}
      className={`rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 select-none ${container} ${text} ${className}`.trim()}
    >
      {initials}
    </span>
  );
}
