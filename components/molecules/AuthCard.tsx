"use client";
import type { ReactNode } from "react";

export interface AuthCardProps {
  /** Large heading, e.g. "Work Leave Tracker" or "Create your account". */
  title: string;
  /** Smaller sub-heading below the title. */
  subtitle?: string;
  children: ReactNode;
  /** Optional content rendered below `children`, e.g. a "Don't have an account?" link. */
  footer?: ReactNode;
}

/**
 * Centred auth page shell.  Provides the gradient background, white card,
 * title / subtitle, a form area, and an optional footer link row.
 */
export default function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-indigo-700 mb-2">{title}</h1>
        {subtitle && <p className="text-gray-500 mb-6 text-sm">{subtitle}</p>}
        {children}
        {footer && (
          <div className="text-sm text-center mt-4 text-gray-500">{footer}</div>
        )}
      </div>
    </div>
  );
}
