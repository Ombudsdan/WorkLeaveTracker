"use client";
import { useState, useEffect, useRef, useMemo, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, YearAllowance, UkCountry, LeaveEntry } from "@/types";
import { CheckCircle, Check, Circle } from "lucide-react";
import { LeaveType, LeaveDuration } from "@/types";
import NavBar from "@/components/NavBar";
import LoadingSpinner from "@/components/LoadingSpinner";
import SessionExpiredScreen from "@/components/SessionExpiredScreen";
import FormField from "@/components/FormField";
import FormErrorOutlet from "@/components/FormErrorOutlet";
import Button from "@/components/Button";
import ConnectionsPanel from "@/components/ConnectionsPanel";
import { useFormValidation } from "@/contexts/FormValidationContext";
import { DAY_NAMES_SHORT } from "@/variables/calendar";
import { countEntryDays, getActiveYearAllowance } from "@/utils/dateHelpers";

import { usersController } from "@/controllers/usersController";
import YearAllowanceModal from "@/components/dashboard/YearAllowanceModal";

const UK_COUNTRIES: { value: UkCountry; label: string }[] = [
  { value: "england-and-wales", label: "England & Wales" },
  { value: "scotland", label: "Scotland" },
  { value: "northern-ireland", label: "Northern Ireland" },
];

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const PROFILE_RETRY_DELAY_MS = 400;

type ProfileTab = "profile" | "past-leave" | "connections";

function formatDateRange(startDate: string, endDate: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = new Date(startDate).toLocaleDateString("en-GB", opts);
  if (startDate === endDate) return start;
  const end = new Date(endDate).toLocaleDateString("en-GB", opts);
  return `${start} \u2013 ${end}`;
}

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
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
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
          setAllUsers(result);
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
  const pastPeriods = [...yearAllowances]
    .sort((a, b) => b.year - a.year || (a.active === false ? -1 : 1))
    .filter((ya) => {
      const periodEnd = new Date(ya.year + 1, (ya.holidayStartMonth ?? 1) - 1, 1);
      periodEnd.setDate(periodEnd.getDate() - 1);
      return periodEnd < new Date();
    });

  const selectedPeriodYa = pastPeriods.find(
    (ya) => `${ya.year}-${ya.company}` === selectedPastPeriod
  );

  const pastLeaveEntries = useMemo(() => {
    if (!selectedPeriodYa) return [];
    const sm = selectedPeriodYa.holidayStartMonth ?? 1;
    const start = new Date(selectedPeriodYa.year, sm - 1, 1);
    const end = new Date(selectedPeriodYa.year + 1, sm - 1, 1);
    end.setDate(end.getDate() - 1);
    return entries.filter((e) => {
      const es = new Date(e.startDate);
      const ee = new Date(e.endDate);
      return ee >= start && es <= end;
    });
  }, [entries, selectedPeriodYa]);

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
            { id: "profile" as ProfileTab, label: "Profile", badge: undefined },
            { id: "past-leave" as ProfileTab, label: "Past Leave", badge: undefined },
            {
              id: "connections" as ProfileTab,
              label: "Connections",
              badge: pendingConnectionRequests,
            },
          ].map(({ id, label, badge }) => (
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
              {badge != null && badge > 0 && (
                <span className="inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 leading-none">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Profile form tab */}
        {activeTab === "profile" && (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-2xl shadow p-6 space-y-6"
          >
            <FormErrorOutlet />

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
                          className={`flex items-center gap-3 text-sm rounded-lg px-3 py-2 border ${
                            isInactive
                              ? "bg-gray-50 border-gray-200 text-gray-400 opacity-60"
                              : ya.year === currentHolidayYear
                                ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                                : "bg-gray-50 border-gray-200 text-gray-600"
                          }`}
                        >
                          {ya.year === currentHolidayYear && !isInactive ? (
                            <CheckCircle size={16} className="shrink-0 text-indigo-600" />
                          ) : (
                            <Circle size={16} className="shrink-0 text-gray-300" />
                          )}
                          <span className="font-medium flex-1">
                            {ya.year}
                            {ya.company ? (
                              <span className="ml-1 font-normal text-xs opacity-70">
                                — {ya.company}
                              </span>
                            ) : null}
                            {isInactive && (
                              <span className="ml-2 text-xs text-gray-400">(ended)</span>
                            )}
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
                If you change companies, add a new allowance for the same year with your new
                company. Your previous allowance will be marked as ended.
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
        )}

        {/* Past Leave tab */}
        {activeTab === "past-leave" && (
          <div className="bg-white rounded-2xl shadow p-6 space-y-5">
            <p className="text-sm text-gray-500">
              Select a leave allowance period to view the leave you took during that time.
            </p>
            {pastPeriods.length === 0 ? (
              <p className="text-sm text-gray-400">No past leave allowance periods found.</p>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap">
                  {pastPeriods.map((ya) => {
                    const key = `${ya.year}-${ya.company}`;
                    const sm = ya.holidayStartMonth ?? 1;
                    const startDate = new Date(ya.year, sm - 1, 1);
                    const endDate = new Date(ya.year + 1, sm - 1, 1);
                    endDate.setDate(endDate.getDate() - 1);
                    const label =
                      sm === 1
                        ? `${ya.year}${ya.company ? ` \u2014 ${ya.company}` : ""}`
                        : `${startDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })} \u2013 ${endDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}${ya.company ? ` \u2014 ${ya.company}` : ""}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedPastPeriod(key)}
                        aria-pressed={selectedPastPeriod === key}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition cursor-pointer ${
                          selectedPastPeriod === key
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {selectedPeriodYa && (
                  <div className="space-y-2 mt-4">
                    {pastLeaveEntries.length === 0 ? (
                      <p className="text-sm text-gray-400">No leave entries for this period.</p>
                    ) : (
                      [...pastLeaveEntries]
                        .sort((a, b) => a.startDate.localeCompare(b.startDate))
                        .map((entry) => {
                          const isSick = entry.type === LeaveType.Sick;
                          const isHalf =
                            entry.duration != null && entry.duration !== LeaveDuration.Full;
                          const days = countEntryDays(entry, nonWorkingDays, []);
                          const statusLabel = isSick
                            ? "Sick"
                            : entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
                          return (
                            <div
                              key={entry.id}
                              className="border rounded-lg p-2 text-xs bg-gray-50 border-gray-200 text-gray-700"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate mr-2">
                                  {entry.notes ?? "\u2013"}
                                </span>
                                <span>{statusLabel}</span>
                              </div>
                              <div className="mt-1 text-gray-500">
                                {formatDateRange(entry.startDate, entry.endDate)}{" "}
                                <span className="opacity-70">
                                  ({isHalf ? "Half Day" : `${days}d`})
                                </span>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Connections tab */}
        {activeTab === "connections" && currentUser && (
          <ConnectionsPanel
            currentUser={currentUser}
            allUsers={allUsers}
            onUserChange={(updated) => {
              setCurrentUser(updated);
              applyUserProfile(updated);
            }}
            onAllUsersChange={(users) => {
              setAllUsers(users);
              const me = users.find((u) => u.id === currentUser.id);
              if (me) {
                setCurrentUser(me);
                applyUserProfile(me);
              }
            }}
          />
        )}
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
    setAllUsers(users);
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
