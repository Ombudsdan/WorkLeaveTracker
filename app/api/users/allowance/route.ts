import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, findUserByEmail, updateUser } from "@/lib/db";
import type { YearAllowance } from "@/types";

/** POST /api/users/allowance - add or update a year's allowance for the current user */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as YearAllowance & { forceCompanyChange?: boolean };
  const {
    year,
    core,
    bought,
    carried,
    company,
    holidayStartMonth,
    bankHolidayHandling,
    forceCompanyChange,
  } = body;

  if (!year || core === undefined || bought === undefined || carried === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let user = await findUserById(userId);
  if (!user && session.user?.email) {
    user = await findUserByEmail(session.user.email);
  }
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const normalizedCompany = (company ?? "").trim();

  // Find any existing active allowance for this year
  const existing = user.yearAllowances.find((a) => a.year === year && a.active !== false);

  // Prevent adding a duplicate (same year + same company, both active)
  if (
    existing &&
    existing.company.trim().toLowerCase() === normalizedCompany.toLowerCase() &&
    !forceCompanyChange
  ) {
    // Editing the same entry — allow it through
    // (it's only a duplicate if both year AND company match an EXISTING entry that is NOT the one
    //  being edited; since we match by year the caller must explicitly confirm via forceCompanyChange
    //  when the company name is unchanged)
  }

  // Detect a company change: same year, different company, existing active allowance
  if (
    existing &&
    normalizedCompany &&
    existing.company.trim().toLowerCase() !== normalizedCompany.toLowerCase() &&
    !forceCompanyChange
  ) {
    return NextResponse.json(
      {
        error: "company_change_required",
        message: `You already have an active allowance for ${year} with "${existing.company}". Adding a new one will deactivate it. Confirm to continue.`,
        existingCompany: existing.company,
      },
      { status: 409 }
    );
  }

  const newAllowance: YearAllowance = {
    year,
    core,
    bought,
    carried,
    company: normalizedCompany,
    holidayStartMonth: holidayStartMonth ?? 1,
    bankHolidayHandling: bankHolidayHandling,
    active: true,
  };

  // If this is a confirmed company change, deactivate the old allowance for this year
  const yearAllowances = user.yearAllowances.map((a) => {
    if (a.year === year && a.active !== false && forceCompanyChange) {
      return { ...a, active: false };
    }
    return a;
  });

  // Remove any existing entry for the same year+company (upsert)
  const filtered = yearAllowances.filter(
    (a) =>
      !(
        a.year === year &&
        a.company.trim().toLowerCase() === normalizedCompany.toLowerCase() &&
        a.active !== false
      )
  );
  filtered.push(newAllowance);
  filtered.sort((a, b) => a.year - b.year);

  const updated = await updateUser(user.id, { yearAllowances: filtered });
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  return NextResponse.json(newAllowance);
}
