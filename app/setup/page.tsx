"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";
import FormField from "@/components/FormField";
import FormErrorOutlet from "@/components/FormErrorOutlet";
import Button from "@/components/Button";
import { usersController } from "@/controllers/usersController";
import { DAY_NAMES_SHORT, MONTH_NAMES_LONG } from "@/variables/calendar";
import { getHolidayYearBounds } from "@/utils/dateHelpers";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function SetupPage() {
  return (
    <FormValidationProvider>
      <SetupPageInner />
    </FormValidationProvider>
  );
}

function SetupPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setError, triggerAllValidations, clearAllErrors } = useFormValidation();

  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [holidayStartMonth, setHolidayStartMonth] = useState(1);
  const [coreDays, setCoreDays] = useState(25);
  const [boughtDays, setBoughtDays] = useState(0);
  const [carriedDays, setCarriedDays] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;

    // If the user already has allowances, they don't need setup
    usersController.fetchAll().then((result) => {
      if (!Array.isArray(result)) {
        setChecking(false);
        return;
      }
      const me = result.find((u) => u.profile.email === session?.user?.email);
      if (me && me.yearAllowances.length > 0) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [status, session, router]);

  if (status === "loading" || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
    );
  }

  const { start: hyStart } = getHolidayYearBounds(holidayStartMonth);
  const currentHolidayYear = hyStart.getFullYear();
  const total = coreDays + boughtDays + carriedDays;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-10 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-indigo-700 mb-1">Welcome!</h1>
        <p className="text-gray-500 text-sm mb-6">
          Let&apos;s set up your leave configuration before you get started.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormErrorOutlet />

          {/* Working days */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">
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

          {/* Holiday period */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">
              Holiday Year
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

          {/* Leave allowance */}
          <section>
            <h3 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">
              Leave Allowance for {currentHolidayYear}
            </h3>
            <div className="space-y-3">
              <FormField
                id="setup-core"
                label="Core Days"
                type="number"
                value={coreDays}
                onChange={(v) => setCoreDays(Number(v))}
                min={1}
                max={365}
                required
              />
              <FormField
                id="setup-bought"
                label="Days Bought"
                type="number"
                value={boughtDays}
                onChange={(v) => setBoughtDays(Number(v))}
                min={0}
                max={365}
              />
              <FormField
                id="setup-carried"
                label="Days Carried Over"
                type="number"
                value={carriedDays}
                onChange={(v) => setCarriedDays(Number(v))}
                min={0}
                max={365}
              />
              <p className="text-sm text-gray-500">
                Total: <strong>{total}</strong> days
              </p>
            </div>
          </section>

          {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

          <Button type="submit" variant="primary" fullWidth disabled={saving}>
            {saving ? "Saving…" : "Save & Go to Dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearAllErrors();

    if (workingDays.length === 0) {
      setError("workingDays", "At least one working day must be selected");
      return;
    }

    if (!triggerAllValidations()) return;

    setSubmitError("");
    setSaving(true);

    const nonWorkingDays = ALL_DAYS.filter((d) => !workingDays.includes(d));
    const nameParts = (session?.user?.name ?? "").split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");

    // Save profile (working days + holiday start month) and allowance in parallel.
    // Company is intentionally omitted here; the user can fill it in via Profile later.
    const [profileOk, allowanceOk] = await Promise.all([
      usersController.updateProfile({
        firstName,
        lastName,
        company: "",
        email: session?.user?.email ?? "",
        nonWorkingDays,
        holidayStartMonth,
        pinnedUserIds: [],
      }),
      usersController.addYearAllowance({
        year: currentHolidayYear,
        core: coreDays,
        bought: boughtDays,
        carried: carriedDays,
      }),
    ]);

    setSaving(false);

    if (!profileOk || !allowanceOk) {
      setSubmitError("Failed to save. Please try again.");
      return;
    }

    router.replace("/dashboard");
  }

  function toggleWorkingDay(day: number) {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }
}
