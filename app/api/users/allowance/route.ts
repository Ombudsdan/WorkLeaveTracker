import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, updateUser } from "@/lib/db";
import type { YearAllowance } from "@/types";

/** POST /api/users/allowance - add or update a year's allowance for the current user */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as YearAllowance;
  const { year, core, bought, carried } = body;

  if (!year || core === undefined || bought === undefined || carried === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const user = findUserById(userId);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const yearAllowances = user.yearAllowances.filter((a) => a.year !== year);
  yearAllowances.push({ year, core, bought, carried });
  yearAllowances.sort((a, b) => a.year - b.year);

  const updated = updateUser(userId, { yearAllowances });
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  return NextResponse.json({ year, core, bought, carried });
}
