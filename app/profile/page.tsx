"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/types";
import { CheckCircle } from "lucide-react";
import NavBar from "@/components/NavBar";
import FormField from "@/components/FormField";
import FormErrorOutlet from "@/components/FormErrorOutlet";
import Button from "@/components/Button";
import { useFormValidation } from "@/contexts/FormValidationContext";
import { DAY_NAMES_SHORT, MONTH_NAMES_LONG } from "@/variables/calendar";

import { usersController } from "@/controllers/usersController";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setError, triggerAllValidations, clearAllErrors } = useFormValidation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [nonWorkingDays, setNonWorkingDays] = useState<number[]>([0, 6]);
  const [holidayStartMonth, setHolidayStartMonth] = useState(1);
  const [core, setCore] = useState(25);
  const [bought, setBought] = useState(0);
  const [carried, setCarried] = useState(0);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    usersController.fetchAll().then((users) => {
      const me = users.find((user) => user.profile.email === session?.user?.email);
      if (me) applyUserProfile(me);
    });
  }, [status, session]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

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
              <FormField
                id="email"
                label="Email"
                type="email"
                value={email}
                readOnly
              />
            </div>
          </section>

          {/* Working week */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
              Non-Working Days
            </h3>
            <div id="nonWorkingDays" className="flex gap-2 flex-wrap">
              {DAY_NAMES_SHORT.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
                    nonWorkingDays.includes(index)
                      ? "bg-red-100 border-red-300 text-red-700"
                      : "bg-green-100 border-green-300 text-green-700"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Red = non-working, Green = working
            </p>
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
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              >
                {MONTH_NAMES_LONG.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Allowance */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
              Leave Allowance
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                id="core"
                label="Core Days"
                type="number"
                value={core}
                onChange={(v) => setCore(Number(v))}
                min={1}
                max={365}
              />
              <FormField
                id="bought"
                label="Days Bought"
                type="number"
                value={bought}
                onChange={(v) => setBought(Number(v))}
                min={0}
                max={365}
              />
              <FormField
                id="carried"
                label="Days Carried Over"
                type="number"
                value={carried}
                onChange={(v) => setCarried(Number(v))}
                min={0}
                max={365}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Total allowance:{" "}
              <strong>{core + bought + carried}</strong> days
            </p>
          </section>

          {submitError && (
            <p className="text-red-500 text-sm">{submitError}</p>
          )}
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
    </div>
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearAllErrors();

    const fieldsValid = triggerAllValidations();

    if (nonWorkingDays.length >= 7) {
      setError("nonWorkingDays", "At least one working day must remain");
    }

    if (!fieldsValid || nonWorkingDays.length >= 7) return;

    setSubmitError("");
    setSaved(false);

    const ok = await usersController.updateProfile(
      { firstName, lastName, company, email, nonWorkingDays, holidayStartMonth },
      { core, bought, carried }
    );

    if (!ok) {
      setSubmitError("Failed to save. Please try again.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  function toggleDay(day: number) {
    setNonWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function applyUserProfile(me: PublicUser) {
    setFirstName(me.profile.firstName);
    setLastName(me.profile.lastName);
    setCompany(me.profile.company);
    setEmail(me.profile.email);
    setNonWorkingDays(me.profile.nonWorkingDays);
    setHolidayStartMonth(me.profile.holidayStartMonth);
    setCore(me.allowance.core);
    setBought(me.allowance.bought);
    setCarried(me.allowance.carried);
  }
}

