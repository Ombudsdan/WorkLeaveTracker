"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, YearAllowance, UkCountry, LeaveEntry } from "@/types";
import NavBar from "@/components/organisms/NavBar";
import LoadingSpinner from "@/components/atoms/LoadingSpinner";
import SessionExpiredScreen from "@/components/organisms/SessionExpiredScreen";
import Button from "@/components/atoms/Button";
import FormErrorOutlet from "@/components/molecules/FormErrorOutlet";
import { useFormValidation } from "@/contexts/FormValidationContext";
import { getActiveYearAllowance } from "@/utils/dateHelpers";
import ProfileForm from "@/components/organisms/ProfileForm";
import PastLeaveExplorer from "@/components/organisms/PastLeaveExplorer";

import { usersController } from "@/controllers/usersController";
import YearAllowanceModal from "@/components/organisms/YearAllowanceModal";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const PROFILE_RETRY_DELAY_MS = 400;

type ProfileTab = "profile" | "past-leave";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setError, triggerAllValidations, clearAllErrors } = useFormValidation();

  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [country, setCountry] = useState<UkCountry | "">("");
  const [yearAllowances, setYearAllowances] = useState<YearAllowance[]>([]);
  const [pinnedUserIds, setPinnedUserIds] = useState<string[]>([]);
  const [entries, setEntries] = useState<LeaveEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState<YearAllowance | undefined>(undefined);
  const [selectedPastPeriod, setSelectedPastPeriod] = useState<string>("");
  const [pendingCompanyChange, setPendingCompanyChange] = useState<{
    allowance: YearAllowance;
    existingCompany: string;
    message: string;
  } | null>(null);
  const initialFormRef = useRef<{
    firstName: string;
    lastName: string;
    workingDays: number[];
    country: UkCountry | "";
  } | null>(null);

  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated") wasAuthenticatedRef.current = true;
    if (status === "unauthenticated" && !wasAuthenticatedRef.current) {
      router.push("/login");
    }
  }, [status, router]);

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
      for (let attempt = 0; attempt <= 2; attempt++) {
        if (attempt > 0) await new Promise<void>((r) => setTimeout(r, PROFILE_RETRY_DELAY_MS));
        if (!active) return;
        const result = await usersController.fetchAll();
        if (!active) return;
        if (!Array.isArray(result)) continue;
        const me =
          (sessionId ? result.find((u) => u.id === sessionId) : undefined) ??
          result.find((u) => u.profile.email === session?.user?.email);
        if (me) {
          applyUserProfile(me);
          setLoading(false);
          return;
        }
      }
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

  function hasUnsavedChanges(): boolean {
    const init = initialFormRef.current;
    if (!init) return false;
    if (firstName !== init.firstName) return true;
    if (lastName !== init.lastName) return true;
    if (country !== init.country) return true;
    const sortedCurrent = [...workingDays].sort().join(",");
    const sortedInit = [...init.workingDays].sort().join(",");
    return sortedCurrent !== sortedInit;
  }

  function handleTabSwitch(tab: ProfileTab) {
    if (tab !== "profile" && hasUnsavedChanges()) {
      if (!window.confirm("You have unsaved changes. Leave the form without saving?")) {
        return;
      }
    }
    setActiveTab(tab);
  }

  // Derive "past leave" data from state up here — before any conditional returns — so
  // that useMemo is always called unconditionally (Rules of Hooks).

  // ISO string for today — used for timezone-safe date comparisons
  const todayStr = new Date().toISOString().slice(0, 10);

  // Include periods whose end date has passed AND the active period if it contains
  // any entries that have already finished (endDate < today).
  const pastPeriods = [...yearAllowances]
    .sort((a, b) => b.year - a.year || (a.active === false ? -1 : 1))
    .filter((ya) => {
      const sm = ya.holidayStartMonth ?? 1;
      const smPadded = String(sm).padStart(2, "0");
      const periodEndStr = `${ya.year + 1}-${smPadded}-01`; // exclusive
      // Period has fully ended
      if (periodEndStr <= todayStr) return true;
      // Active/future period — include only if it has entries that have already ended
      const periodStartStr = `${ya.year}-${smPadded}-01`;
      return entries.some(
        (e) => e.endDate < todayStr && e.endDate >= periodStartStr && e.startDate < periodEndStr
      );
    });

  const selectedPeriodYa = pastPeriods.find(
    (ya) => `${ya.year}-${ya.company}` === selectedPastPeriod
  );

  const pastLeaveEntries = useMemo(() => {
    if (!selectedPeriodYa) return [];
    const sm = selectedPeriodYa.holidayStartMonth ?? 1;
    const smPadded = String(sm).padStart(2, "0");
    const periodStartStr = `${selectedPeriodYa.year}-${smPadded}-01`;
    const periodEndStr = `${selectedPeriodYa.year + 1}-${smPadded}-01`; // exclusive
    // Only show entries whose end date is before today (truly past) and that
    // fall within the selected period window.
    return entries.filter(
      (e) => e.endDate < todayStr && e.endDate >= periodStartStr && e.startDate < periodEndStr
    );
  }, [entries, selectedPeriodYa, todayStr]);

  if (status === "loading" || loading) {
    return <LoadingSpinner />;
  }

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
  const existingCompanies = [...new Set(yearAllowances.map((ya) => ya.company).filter(Boolean))];
  const pendingConnectionRequests = (currentUser?.profile.pendingPinRequestsReceived ?? []).length;

  const nonWorkingDays = ALL_DAYS.filter((d) => !workingDays.includes(d));

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar activePage="profile" pendingRequestCount={pendingConnectionRequests} />

      <main className="max-w-2xl mx-auto py-8 px-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">My Profile</h2>

        {/* Tab strip */}
        <div className="flex mb-6 bg-white rounded-2xl shadow overflow-hidden border border-gray-200">
          {[
            { id: "profile" as ProfileTab, label: "Profile" },
            { id: "past-leave" as ProfileTab, label: "Past Leave" },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => handleTabSwitch(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === id
                  ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Profile form tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl shadow p-6 space-y-6">
            <FormErrorOutlet />
            <ProfileForm
              firstName={firstName}
              onFirstNameChange={setFirstName}
              lastName={lastName}
              onLastNameChange={setLastName}
              email={email}
              workingDays={workingDays}
              onWorkingDaysChange={setWorkingDays}
              country={country}
              onCountryChange={setCountry}
              yearAllowances={yearAllowances}
              currentYear={currentHolidayYear}
              onAddYear={() => {
                setEditingAllowance(undefined);
                setShowAllowanceModal(true);
              }}
              onEditYear={(ya) => {
                setEditingAllowance(ya);
                setShowAllowanceModal(true);
              }}
              onSave={handleSaveProfile}
              saved={saved}
              submitError={submitError}
            />
          </div>
        )}

        {/* Past Leave tab */}
        {activeTab === "past-leave" && (
          <div className="bg-white rounded-2xl shadow p-6 space-y-5">
            <PastLeaveExplorer
              pastPeriods={pastPeriods}
              selectedPastPeriod={selectedPastPeriod}
              onSelectPeriod={setSelectedPastPeriod}
              pastLeaveEntries={pastLeaveEntries}
              nonWorkingDays={nonWorkingDays}
              bankHolidays={[]}
            />
          </div>
        )}
      </main>

      {showAllowanceModal && (
        <YearAllowanceModal
          initialYear={editingAllowance?.year ?? currentHolidayYear + 1}
          existing={editingAllowance}
          existingCompanies={existingCompanies}
          existingAllowances={yearAllowances}
          onClose={() => setShowAllowanceModal(false)}
          onSave={handleSaveAllowance}
        />
      )}

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

  async function handleSaveProfile() {
    clearAllErrors();

    const fieldsValid = triggerAllValidations();

    if (workingDays.length === 0) {
      setError("workingDays", "At least one working day must be selected");
      return;
    }

    if (!fieldsValid) return;

    setSubmitError("");
    setSaved(false);

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
      return;
    }
    if ("conflict" in result) {
      setPendingCompanyChange({
        allowance: ya,
        existingCompany: result.existingCompany,
        message: result.message,
      });
      setShowAllowanceModal(false);
      return;
    }
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
    const users = await usersController.fetchAll();
    if (!Array.isArray(users)) return;
    const sessionId = (session?.user as { id?: string })?.id;
    const me =
      (sessionId ? users.find((u) => u.id === sessionId) : undefined) ??
      users.find((u) => u.profile.email === session?.user?.email);
    if (me) applyUserProfile(me);
  }

  function applyUserProfile(me: PublicUser) {
    const wd = ALL_DAYS.filter((d) => !me.profile.nonWorkingDays.includes(d));
    setFirstName(me.profile.firstName);
    setLastName(me.profile.lastName);
    setEmail(me.profile.email);
    setWorkingDays(wd);
    setYearAllowances(me.yearAllowances ?? []);
    setPinnedUserIds(me.profile.pinnedUserIds ?? []);
    setCountry(me.profile.country ?? "");
    setEntries(me.entries ?? []);
    setCurrentUser(me);
    initialFormRef.current = {
      firstName: me.profile.firstName,
      lastName: me.profile.lastName,
      workingDays: wd,
      country: me.profile.country ?? "",
    };
  }
}
