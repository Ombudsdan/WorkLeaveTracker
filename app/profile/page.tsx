"use client";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, YearAllowance, UkCountry } from "@/types";
import { CheckCircle, Check } from "lucide-react";
import NavBar from "@/components/NavBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import SessionExpiredScreen from "@/components/SessionExpiredScreen";
import FormField from "@/components/FormField";
import FormErrorOutlet from "@/components/FormErrorOutlet";
import Button from "@/components/Button";
import { useFormValidation } from "@/contexts/FormValidationContext";
import { DAY_NAMES_SHORT } from "@/variables/calendar";

import { usersController } from "@/controllers/usersController";
import YearAllowanceModal from "@/components/dashboard/YearAllowanceModal";
import { getActiveYearAllowance } from "@/utils/dateHelpers";

const UK_COUNTRIES: { value: UkCountry; label: string }[] = [
  { value: "england-and-wales", label: "England & Wales" },
  { value: "scotland", label: "Scotland" },
  { value: "northern-ireland", label: "Northern Ireland" },
];

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
/** How long to wait before retrying when the user record is not found. */
const PROFILE_RETRY_DELAY_MS = 400;

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setError, triggerAllValidations, clearAllErrors } = useFormValidation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [country, setCountry] = useState<UkCountry | "">("");
  const [yearAllowances, setYearAllowances] = useState<YearAllowance[]>([]);
  const [pinnedUserIds, setPinnedUserIds] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState<YearAllowance | undefined>(undefined);
  /** Pending company-change confirmation: the allowance the user wants to save */
  const [pendingCompanyChange, setPendingCompanyChange] = useState<{
    allowance: YearAllowance;
    existingCompany: string;
    message: string;
  } | null>(null);

  // Track whether the user was previously authenticated in this tab so we can
  // show the "session expired" screen instead of silently redirecting to login.
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated") wasAuthenticatedRef.current = true;
    if (status === "unauthenticated" && !wasAuthenticatedRef.current) {
      router.push("/login");
    }
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
    let active = true;
    setLoading(true);
    setProfileError(false);
    const sessionId = (session?.user as { id?: string })?.id;

    async function loadProfile() {
      // Retry a few times before showing an error — handles the case where the
      // server-side data is transiently unavailable (e.g. Vercel cold start on
      // a Lambda instance that hasn't yet received the user's data).
      // 3 total attempts (initial + 2 retries) before showing an error.
      for (let attempt = 0; attempt <= 2; attempt++) {
        if (attempt > 0) await new Promise<void>((r) => setTimeout(r, PROFILE_RETRY_DELAY_MS));
        if (!active) return;
        const result = await usersController.fetchAll();
        if (!active) return;
        if (!Array.isArray(result)) continue;
        // Prefer ID-based lookup; fall back to email for robustness
        const me =
          (sessionId ? result.find((u) => u.id === sessionId) : undefined) ??
          result.find((u) => u.profile.email === session?.user?.email);
        if (me) {
          applyUserProfile(me);
          setLoading(false);
          return;
        }
      }
      // All retries exhausted — show an error state.  We deliberately do NOT
      // call signOut here: the session JWT may still be valid, and on Vercel
      // the user's data simply may not be present on this Lambda instance.
      // Signing out would destroy the valid session and the user would be
      // unable to log back in on the same Lambda instance.
      if (active) {
        setLoading(false);
        setProfileError(true);
      }
    }

    loadProfile().catch(() => {
      if (active) {
        setLoading(false);
        setProfileError(true);
      }
    });

    return () => {
      active = false;
    };
  }, [status, session]);

  if (status === "loading" || loading) {
    return <LoadingSpinner />;
  }

  // Session expired after the user was previously authenticated in this tab
  if (status === "unauthenticated" && wasAuthenticatedRef.current) {
    return <SessionExpiredScreen />;
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar activePage="profile" />
        <main className="max-w-2xl mx-auto py-8 px-4">
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

  const activeYa = getActiveYearAllowance(yearAllowances);
  const currentHolidayYear = activeYa?.year ?? new Date().getFullYear();
  /** Active companies across all allowances — used as combobox suggestions */
  const existingCompanies = [...new Set(yearAllowances.map((ya) => ya.company).filter(Boolean))];

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

          {/* UK Country */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
              Bank Holidays Region
            </h3>
            <div className="flex gap-2 flex-wrap">
              {UK_COUNTRIES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCountry(country === opt.value ? "" : opt.value)}
                  aria-pressed={country === opt.value}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition cursor-pointer ${
                    country === opt.value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Select your region to show the correct UK bank holidays
            </p>
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
                  .sort((a, b) => b.year - a.year || (a.active === false ? 1 : -1))
                  .map((ya, idx) => {
                    const isInactive = ya.active === false;
                    return (
                      <div
                        key={`${ya.year}-${ya.company}-${idx}`}
                        className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 border ${
                          isInactive
                            ? "bg-gray-50 border-gray-200 text-gray-400 opacity-60"
                            : ya.year === currentHolidayYear
                              ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                              : "bg-gray-50 border-gray-200 text-gray-600"
                        }`}
                      >
                        <span className="font-medium">
                          {ya.year}
                          {ya.company ? (
                            <span className="ml-1 font-normal text-xs opacity-70">
                              — {ya.company}
                            </span>
                          ) : null}
                          {ya.year === currentHolidayYear && !isInactive && (
                            <span className="ml-2 text-xs text-indigo-500">(current)</span>
                          )}
                          {isInactive && (
                            <span className="ml-2 text-xs text-gray-400">(ended)</span>
                          )}
                        </span>
                        <span>
                          {ya.core + ya.bought + ya.carried} days ({ya.core} core
                          {ya.bought > 0 ? ` + ${ya.bought} bought` : ""}
                          {ya.carried > 0 ? ` + ${ya.carried} carried` : ""})
                        </span>
                        {!isInactive && (
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
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">
              If you change companies, add a new allowance for the same year with your new company.
              Your previous allowance will be marked as ended.
            </p>
          </section>

          {/* Connections link */}
          <section>
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-1">
              Connections
            </h3>
            <p className="text-sm text-gray-500">
              Manage your colleague connections (view their calendar) from the{" "}
              <a href="/connections" className="text-indigo-600 underline hover:text-indigo-800">
                Connections page
              </a>
              .
            </p>
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
          existingCompanies={existingCompanies}
          onClose={() => setShowAllowanceModal(false)}
          onSave={handleSaveAllowance}
        />
      )}

      {/* Company change confirmation dialog */}
      {pendingCompanyChange && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 mb-3">Company Change Detected</h3>
            <p className="text-sm text-gray-600 mb-4">{pendingCompanyChange.message}</p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                fullWidth
                onClick={() => confirmCompanyChange(pendingCompanyChange.allowance)}
              >
                Confirm Change
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setPendingCompanyChange(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
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

    // updateProfile now returns the full updated user so we can sync all
    // local state (including yearAllowances) directly from the PATCH response,
    // without a separate fetchAll() round-trip that could hit a different
    // Vercel Lambda instance.
    const updated = await usersController.updateProfile({
      firstName,
      lastName,
      email,
      nonWorkingDays,
      pinnedUserIds,
      ...(country && { country }),
    });

    if (!updated) {
      setSubmitError("Failed to save. Please try again.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      applyUserProfile(updated);
    }
  }

  async function handleSaveAllowance(ya: YearAllowance) {
    const result = await usersController.addYearAllowance(ya);
    if (!result) {
      // Network error
      return;
    }
    if ("conflict" in result) {
      // Company change detected — ask the user to confirm
      setPendingCompanyChange({
        allowance: ya,
        existingCompany: result.existingCompany,
        message: result.message,
      });
      setShowAllowanceModal(false);
      return;
    }
    // Successfully saved
    setYearAllowances((prev) => {
      const rest = prev.filter(
        (a) =>
          !(
            a.year === result.year &&
            a.company.trim().toLowerCase() === result.company.trim().toLowerCase() &&
            a.active !== false
          )
      );
      return [...rest, result].sort((a, b) => a.year - b.year);
    });
    setShowAllowanceModal(false);
  }

  async function confirmCompanyChange(ya: YearAllowance) {
    const result = await usersController.addYearAllowance({ ...ya, forceCompanyChange: true });
    setPendingCompanyChange(null);
    if (!result || "conflict" in result) return;
    // Refresh all allowances from server to get the deactivated old entry
    const users = await usersController.fetchAll();
    if (!Array.isArray(users)) return;
    const sessionId = (session?.user as { id?: string })?.id;
    const me =
      (sessionId ? users.find((u) => u.id === sessionId) : undefined) ??
      users.find((u) => u.profile.email === session?.user?.email);
    if (me) applyUserProfile(me);
  }

  function toggleWorkingDay(day: number) {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function applyUserProfile(me: PublicUser) {
    setFirstName(me.profile.firstName);
    setLastName(me.profile.lastName);
    setEmail(me.profile.email);
    setWorkingDays(ALL_DAYS.filter((d) => !me.profile.nonWorkingDays.includes(d)));
    setYearAllowances(me.yearAllowances ?? []);
    setPinnedUserIds(me.profile.pinnedUserIds ?? []);
    setCountry(me.profile.country ?? "");
  }
}
