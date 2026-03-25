"use client";

export interface NotificationBlobProps {
  /** The count to display inside the blob */
  count: number;
  /** Accessible label suffix (e.g. "pending requests") */
  label?: string;
  className?: string;
}

/**
 * A small circular badge that displays a numeric count — used for pending
 * notification counts in the NavBar and similar surfaces.
 *
 * Only renders when count > 0.
 */
export default function NotificationBlob({
  count,
  label = "notifications",
  className = "",
}: NotificationBlobProps) {
  if (count <= 0) return null;

  return (
    <span
      aria-label={`${count} ${label}`}
      className={`inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 leading-none ${className}`.trim()}
    >
      {count}
    </span>
  );
}
