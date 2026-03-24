"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, BankHolidayEntry } from "@/types";
import NavBar from "@/components/NavBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import SessionExpiredScreen from "@/components/SessionExpiredScreen";
import AnnualPlannerView from "@/components/annual-planner/AnnualPlannerView";
import { usersController } from "@/controllers/usersController";
import { holidaysController } from "@/controllers/holidaysController";

/** How long to wait between retries when the user record is not found. */
const RETRY_DELAY_MS = 400;

export default function AnnualPlannerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [bankHolidays, setBankHolidays] = useState<BankHolidayEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated") {
      wasAuthenticatedRef.current = true;
    }
    if (status === "unauthenticated") {
      if (!wasAuthenticatedRef.current) {
        router.push("/login");
      }
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const sessionEmail = session?.user?.email;
    const sessionId = (session?.user as { id?: string })?.id;
    if (!sessionEmail && !sessionId) return;

    let cancelled = false;
    async function initPage() {
      setLoading(true);
      try {
        for (let attempt = 0; attempt <= 4; attempt++) {
          if (attempt > 0) await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
          const rawUsers = await usersController.fetchAll();
          if (cancelled) return;
          const users = Array.isArray(rawUsers) ? rawUsers : [];
          const me = users.find(
            (u) =>
              (sessionId != null && u.id === sessionId) ||
              (sessionEmail != null && u.profile.email === sessionEmail)
          );
          if (me) {
            if (me.yearAllowances.length === 0) {
              router.replace("/setup");
              return;
            }
            const holidays = await holidaysController.fetchBankHolidays(me.profile.country);
            if (cancelled) return;
            setBankHolidays(holidays);
            setCurrentUser(me);
            break;
          }
        }
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    initPage();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  if (status === "loading" || loading) {
    return <LoadingSpinner />;
  }

  if (status === "unauthenticated" && wasAuthenticatedRef.current) {
    return <SessionExpiredScreen />;
  }

  const pendingConnectionRequests = (currentUser?.profile.pendingPinRequestsReceived ?? []).length;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar activePage="annual-planner" pendingRequestCount={pendingConnectionRequests} />
        <main className="max-w-4xl mx-auto py-6 px-4">
          <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm">
            Your profile could not be loaded. Please{" "}
            <button
              onClick={() => window.location.reload()}
              className="underline font-medium hover:text-amber-900"
            >
              refresh the page
            </button>
            .
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar activePage="annual-planner" pendingRequestCount={pendingConnectionRequests} />
      <main className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Annual Leave Planner</h1>
        <AnnualPlannerView user={currentUser} bankHolidays={bankHolidays} />
      </main>
    </div>
  );
}
