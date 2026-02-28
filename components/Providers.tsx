"use client";
import { SessionProvider } from "next-auth/react";
import { FormValidationProvider } from "@/contexts/FormValidationContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FormValidationProvider>{children}</FormValidationProvider>
    </SessionProvider>
  );
}
