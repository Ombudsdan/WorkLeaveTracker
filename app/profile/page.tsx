"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, YearAllowance } from "@/types";
import { CheckCircle, Check } from "lucide-react";
import NavBar from "@/components/NavBar";
import FormField from "@/components/FormField";
import FormErrorOutlet from "@/components/FormErrorOutlet";
import Button from "@/components/Button";
import { useFormValidation } from "@/contexts/FormValidationContext";
import { DAY_NAMES_SHORT } from "@/variables/calendar";

import { usersController } from "@/controllers/usersController";
import YearAllowanceModal from "@/components/dashboard/YearAllowanceModal";
import PinUserModal from "@/components/dashboard/PinUserModal";
import { getActiveYearAllowance } from "@/utils/dateHelpers";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setError, triggerAllValidations, clearAllErrors } = useFormValidation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [yearAllowances, setYearAllowances] = useState<YearAllowance[]>([]);
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [pinnedUserIds, setPinnedUserIds] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState<YearAllowance | undefined>(undefined);
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Clear any stale form errors carried over from other pages that share the
  // root-level FormValidationProvider. Empty dep array is intentional — this
  // should only run once on mount, not whenever the clearAllErrors ref changes.
  useEffect(() => {
    clearAllErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    const sessionId = (session?.user as { id?: string })?.id;
    usersController.fetchAll().then((result) => {
      setLoading(false);
      if (!Array.isArray(result)) return;
      setAllUsers(result);
      // Prefer ID-based lookup; fall back to email for robustness
      const me =
        (sessionId ? result.find((u) => u.id === sessionId) : undefined) ??
        result.find((u) => u.profile.email === session?.user?.email);
      if (me) {
        applyUserProfile(me);
      } else if (session?.user) {
        // User not found in DB (e.g. after a cold start on Vercel); pre-fill from session
        const nameParts = (session.user.name ?? "").split(" ");
        setFirstName(nameParts[0] ?? "");
        setLastName(nameParts.slice(1).join(" ") ?? "");
        setEmail(session.user.email ?? "");
      }
    });
  }, [status, session]);

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  const activeYa = getActiveYearAllowance(yearAllowances);
  const currentHolidayYear = activeYa?.year ?? new Date().getFullYear();
  const otherUsers = allUsers.filter((u) => u.profile.email !== email);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar activePage="profile" />

      <main className="max-w-2xl mx-auto py-8 px-4">
        <h2 className="text-xl font-bold text-gray-800 mb-6">My Profile</h2>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white rounded-2xl shadow p-6 space-y-6"
        >
          <FormErrorOutlet />

          {/* Personal details */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
              Personal Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="firstName"
                label="First Name"
                value={firstName}
                onChange={(v) => setFirstName(v)}
                required
              />
              <FormField
                id="lastName"
                label="Last Name"
                value={lastName}
                onChange={(v) => setLastName(v)}
                required
              />
              <FormField id="email" label="Email" type="email" value={email} readOnly />
            </div>
          </section>

          {/* Working week */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
              Working Days
            </h3>
            <div id="workingDays" className="flex gap-2 flex-wrap">
              {DAY_NAMES_SHORT.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleWorkingDay(index)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border transition ${
                    workingDays.includes(index)
                      ? "bg-green-100 border-green-400 text-green-700"
                      : "bg-gray-100 border-gray-300 text-gray-400"
                  }`}
                  aria-pressed={workingDays.includes(index)}
                >
                  {workingDays.includes(index) && <Check size={12} strokeWidth={3} />}
                  {day}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Select the days you work</p>
          </section>

          {/* Year Allowances */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Leave Allowances
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingAllowance(undefined);
                  setShowAllowanceModal(true);
                }}
                className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-indigo-700 transition"
              >
                + Add Year
              </button>
            </div>
            {yearAllowances.length === 0 ? (
              <p className="text-sm text-gray-400">No allowances configured yet.</p>
            ) : (
              <div className="space-y-2">
                {[...yearAllowances]
                  .sort((a, b) => b.year - a.year)
                  .map((ya) => (
                    <div
                      key={ya.year}
                      className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 border ${
                        ya.year === currentHolidayYear
                          ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                          : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    >
                      <span className="font-medium">
                        {ya.year}
                        {ya.company ? (
                          <span className="ml-1 font-normal text-xs opacity-70">— {ya.company}</span>
                        ) : null}
                        {ya.year === currentHolidayYear && (
                          <span className="ml-2 text-xs text-indigo-500">(current)</span>
                        )}
                      </span>
                      <span>
                        {ya.core + ya.bought + ya.carried} days ({ya.core} core
                        {ya.bought > 0 ? ` + ${ya.bought} bought` : ""}
                        {ya.carried > 0 ? ` + ${ya.carried} carried` : ""})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAllowance(ya);
                          setShowAllowanceModal(true);
                        }}
                        className="underline text-xs text-indigo-600"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Pinned Users */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Pinned Users
              </h3>
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                disabled={pinnedUserIds.length >= 3}
                className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-indigo-700 transition disabled:opacity-40"
              >
                + Search User
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Pin up to 3 users to show in the dashboard switcher.
            </p>
            {pinnedUserIds.length === 0 ? (
              <p className="text-sm text-gray-400">No users pinned yet.</p>
            ) : (
              <ul className="space-y-2">
                {pinnedUserIds.map((id) => {
                  const u = allUsers.find((user) => user.id === id);
                  if (!u) return null;
                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between text-sm bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2"
                    >
                      <span className="text-indigo-800">
                        {u.profile.firstName} {u.profile.lastName}{" "}
                        <span className="text-indigo-500 font-normal">({u.profile.email})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => unpinUser(id)}
                        className="text-xs text-red-500 hover:text-red-700 ml-3"
                      >
                        Unpin
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
          {saved && (
            <p className="flex items-center gap-1.5 text-green-600 text-sm">
              <CheckCircle size={16} />
              Saved successfully
            </p>
          )}

          <Button type="submit" variant="primary">
            Save Profile
          </Button>
        </form>
      </main>

      {showAllowanceModal && (
        <YearAllowanceModal
          initialYear={editingAllowance?.year ?? currentHolidayYear + 1}
          existing={editingAllowance}
          onClose={() => setShowAllowanceModal(false)}
          onSave={handleSaveAllowance}
        />
      )}

      {showPinModal && (
        <PinUserModal
          otherUsers={otherUsers}
          pinnedUserIds={pinnedUserIds}
          onClose={() => setShowPinModal(false)}
          onPin={handlePinUser}
        />
      )}
    </div>
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearAllErrors();

    const fieldsValid = triggerAllValidations();

    if (workingDays.length === 0) {
      setError("workingDays", "At least one working day must be selected");
      return;
    }

    if (!fieldsValid) return;

    setSubmitError("");
    setSaved(false);

    const nonWorkingDays = ALL_DAYS.filter((d) => !workingDays.includes(d));

    const ok = await usersController.updateProfile({
      firstName,
      lastName,
      email,
      nonWorkingDays,
      pinnedUserIds,
    });

    if (!ok) {
      setSubmitError("Failed to save. Please try again.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleSaveAllowance(ya: YearAllowance) {
    const saved = await usersController.addYearAllowance(ya);
    if (saved) {
      setYearAllowances((prev) => {
        const rest = prev.filter((a) => a.year !== saved.year);
        return [...rest, saved].sort((a, b) => a.year - b.year);
      });
    }
    setShowAllowanceModal(false);
  }

  function toggleWorkingDay(day: number) {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function handlePinUser(id: string) {
    setPinnedUserIds((prev) => {
      if (prev.includes(id) || prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function unpinUser(id: string) {
    setPinnedUserIds((prev) => prev.filter((p) => p !== id));
  }

  function applyUserProfile(me: PublicUser) {
    setFirstName(me.profile.firstName);
    setLastName(me.profile.lastName);
    setEmail(me.profile.email);
    setWorkingDays(ALL_DAYS.filter((d) => !me.profile.nonWorkingDays.includes(d)));
    setYearAllowances(me.yearAllowances ?? []);
    setPinnedUserIds(me.profile.pinnedUserIds ?? []);
  }
}
