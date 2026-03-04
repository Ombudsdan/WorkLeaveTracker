"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/types";
import NavBar from "@/components/NavBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConnectionsPanel from "@/components/ConnectionsPanel";
import { usersController } from "@/controllers/usersController";

export default function ConnectionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const sessionId = (session?.user as { id?: string })?.id;
    let active = true;

    async function load() {
      setLoading(true);
      const result = await usersController.fetchAll();
      if (!active) return;
      if (Array.isArray(result)) {
        setAllUsers(result);
        const me =
          (sessionId ? result.find((u) => u.id === sessionId) : undefined) ??
          result.find((u) => u.profile.email === session?.user?.email);
        if (me) setCurrentUser(me);
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [status, session]);

  if (status === "loading" || loading) return <LoadingSpinner />;

  const pendingCount = (currentUser?.profile.pendingPinRequestsReceived ?? []).length;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar activePage="connections" pendingRequestCount={pendingCount} />
        <main className="max-w-2xl mx-auto py-8 px-4">
          <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm">
            Your profile could not be loaded. Please{" "}
            <button
              onClick={() => router.refresh()}
              className="underline font-medium hover:text-amber-900 cursor-pointer"
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
      <NavBar activePage="connections" pendingRequestCount={pendingCount} />
      <main className="max-w-2xl mx-auto py-8 px-4">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Connections</h2>
        <ConnectionsPanel
          currentUser={currentUser}
          allUsers={allUsers}
          onUserChange={setCurrentUser}
          onAllUsersChange={setAllUsers}
        />
      </main>
    </div>
  );
}
