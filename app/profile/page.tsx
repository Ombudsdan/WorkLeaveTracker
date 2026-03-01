"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser, YearAllowance } from "@/types";
import { CheckCircle } from "lucide-react";
import NavBar from "@/components/NavBar";
import FormField from "@/components/FormField";
import FormErrorOutlet from "@/components/FormErrorOutlet";
import Button from "@/components/Button";
import { useFormValidation } from "@/contexts/FormValidationContext";
import { DAY_NAMES_SHORT, MONTH_NAMES_LONG } from "@/variables/calendar";

import { usersController } from "@/controllers/usersController";
import YearAllowanceModal from "@/components/dashboard/YearAllowanceModal";
import { getHolidayYearBounds } from "@/utils/dateHelpers";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setError, triggerAllValidations, clearAllErrors } = useFormValidation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  /** Selected days are WORKING days (the opposite of the stored nonWorkingDays) */
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [holidayStartMonth, setHolidayStartMonth] = useState(1);
  const [yearAllowances, setYearAllowances] = useState<YearAllowance[]>([]);
  const [allUsers, setAllUsers] = useState<PublicUser[]>([]);
  const [pinnedUserIds, setPinnedUserIds] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState<YearAllowance | undefined>(undefined);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    usersController.fetchAll().then((users) => {
      setAllUsers(users);
      const me = users.find((user) => user.profile.email === session?.user?.email);
      if (me) applyUserProfile(me);
    });
  }, [status, session]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  const { start: hyStart } = getHolidayYearBounds(holidayStartMonth);
  const currentHolidayYear = hyStart.getFullYear();
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
              <FormField
                id="company"
                label="Company"
                value={company}
                onChange={(v) => setCompany(v)}
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
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
                    workingDays.includes(index)
                      ? "bg-green-100 border-green-300 text-green-700"
                      : "bg-gray-100 border-gray-300 text-gray-400"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Select the days you work</p>
          </section>

          {/* Holiday period */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
              Holiday Period
            </h3>
            <div>
              <label
                htmlFor="holidayStartMonth"
                className="block text-sm font-medium text-gray-600 mb-1"
              >
                Holiday Year Starts
              </label>
              <select
                id="holidayStartMonth"
                value={holidayStartMonth}
                onChange={(e) => setHolidayStartMonth(Number(e.target.value))}
                className="border rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              >
                {MONTH_NAMES_LONG.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
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
          {otherUsers.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-700 mb-1 text-sm uppercase tracking-wide">
                Pinned Users
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                Select up to 3 users to show in the dashboard switcher.
              </p>
              <div className="flex gap-2 flex-wrap">
                {otherUsers.map((u) => {
                  const isPinned = pinnedUserIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => togglePinnedUser(u.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
                        isPinned
                          ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                          : "bg-gray-100 border-gray-300 text-gray-500"
                      }`}
                    >
                      {u.profile.firstName} {u.profile.lastName}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

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
    </div>
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearAllErrors();

    const fieldsValid = triggerAllValidations();

    if (workingDays.length === 0) {
      setError("workingDays", "At least one working day must be selected");
    }

    if (!fieldsValid || workingDays.length === 0) return;

    setSubmitError("");
    setSaved(false);

    const nonWorkingDays = ALL_DAYS.filter((d) => !workingDays.includes(d));

    const ok = await usersController.updateProfile({
      firstName,
      lastName,
      company,
      email,
      nonWorkingDays,
      holidayStartMonth,
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
    const ok = await usersController.addYearAllowance(ya);
    if (ok) {
      setYearAllowances((prev) => {
        const rest = prev.filter((a) => a.year !== ya.year);
        return [...rest, ya].sort((a, b) => a.year - b.year);
      });
    }
    setShowAllowanceModal(false);
  }

  function toggleWorkingDay(day: number) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function togglePinnedUser(id: string) {
    setPinnedUserIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  }

  function applyUserProfile(me: PublicUser) {
    setFirstName(me.profile.firstName);
    setLastName(me.profile.lastName);
    setCompany(me.profile.company);
    setEmail(me.profile.email);
    setWorkingDays(ALL_DAYS.filter((d) => !me.profile.nonWorkingDays.includes(d)));
    setHolidayStartMonth(me.profile.holidayStartMonth);
    setYearAllowances(me.yearAllowances ?? []);
    setPinnedUserIds(me.profile.pinnedUserIds ?? []);
  }
}
