"use client";
import { useState, useEffect, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BankHolidayHandling } from "@/types";
import { FormValidationProvider, useFormValidation } from "@/contexts/FormValidationContext";
import LoadingSpinner from "@/components/atoms/LoadingSpinner";
import AuthCard from "@/components/molecules/AuthCard";
import SetupWizardStep from "@/components/organisms/SetupWizardStep";
import { usersController } from "@/controllers/usersController";
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
  const { triggerAllValidations, clearAllErrors } = useFormValidation();

  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [company, setCompany] = useState("");
  const [companies, setCompanies] = useState<string[]>([]);
  const [holidayStartMonth, setHolidayStartMonth] = useState(1);
  const [coreDays, setCoreDays] = useState(25);
  const [boughtDays, setBoughtDays] = useState(0);
  const [carriedDays, setCarriedDays] = useState(0);
  const [bankHolidayHandling, setBankHolidayHandling] = useState<BankHolidayHandling>(
    BankHolidayHandling.None
  );
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

  useEffect(() => {
    if (status !== "authenticated") return;
    usersController.fetchCompanies().then((fetched) => {
      if (fetched.length > 0) setCompanies(fetched);
    });
  }, [status]);

  if (status === "loading" || checking) {
    return <LoadingSpinner />;
  }

  const { start: hyStart } = getHolidayYearBounds(holidayStartMonth);
  const currentHolidayYear = hyStart.getFullYear();

  return (
    <AuthCard
      title="Welcome!"
      subtitle="Let's set up your leave configuration before you get started."
    >
      <SetupWizardStep
        workingDays={workingDays}
        onWorkingDaysChange={setWorkingDays}
        company={company}
        onCompanyChange={setCompany}
        companies={companies}
        holidayStartMonth={holidayStartMonth}
        onHolidayStartMonthChange={setHolidayStartMonth}
        coreDays={coreDays}
        onCoreDaysChange={setCoreDays}
        boughtDays={boughtDays}
        onBoughtDaysChange={setBoughtDays}
        carriedDays={carriedDays}
        onCarriedDaysChange={setCarriedDays}
        bankHolidayHandling={bankHolidayHandling}
        onBankHolidayHandlingChange={setBankHolidayHandling}
        currentYear={currentHolidayYear}
        onSubmit={handleSubmit}
        saving={saving}
        submitError={submitError}
      />
    </AuthCard>
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearAllErrors();

    if (workingDays.length === 0) {
      setSubmitError("At least one working day must be selected");
      return;
    }

    if (!triggerAllValidations()) return;

    setSubmitError("");
    setSaving(true);

    const nonWorkingDays = ALL_DAYS.filter((d) => !workingDays.includes(d));
    const nameParts = (session?.user?.name ?? "").split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");

    // Save profile then allowance sequentially to avoid a read-modify-write race
    // on the JSON database file (concurrent writes can overwrite each other).
    const profileOk = await usersController.updateProfile({
      firstName,
      lastName,
      email: session?.user?.email ?? "",
      nonWorkingDays,
      pinnedUserIds: [],
    });

    if (!profileOk) {
      setSaving(false);
      setSubmitError("Failed to save. Please try again.");
      return;
    }

    const allowanceOk = await usersController.addYearAllowance({
      year: currentHolidayYear,
      company,
      holidayStartMonth,
      core: coreDays,
      bought: boughtDays,
      carried: carriedDays,
      bankHolidayHandling,
    });

    setSaving(false);

    if (!allowanceOk) {
      setSubmitError("Failed to save. Please try again.");
      return;
    }

    router.replace("/dashboard");
  }
}
