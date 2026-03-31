"use client";
import type { ReactNode, FormEvent } from "react";
import AuthCard from "@/components/molecules/AuthCard";

export interface AuthFormLayoutProps {
  title: string;
  subtitle?: string;
  /** Called when the form is submitted. */
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  /** Optional footer content rendered below the form (e.g. "Don't have an account?"). */
  footer?: ReactNode;
  /** Error message rendered in red above the submit button area. */
  error?: string;
}

/**
 * Full-page authentication layout organism.
 * Combines the gradient background + white card shell (AuthCard) with a
 * `<form>` element, optional error text, and a footer link row.
 *
 * Use as the top-level wrapper for login, register and any other auth flows.
 */
export default function AuthFormLayout({
  title,
  subtitle,
  onSubmit,
  children,
  footer,
  error,
}: AuthFormLayoutProps) {
  return (
    <AuthCard title={title} subtitle={subtitle} footer={footer}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {children}
        {error && (
          <p role="alert" className="text-red-500 text-sm">
            {error}
          </p>
        )}
      </form>
    </AuthCard>
  );
}
