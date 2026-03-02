import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAllUsers } from "@/lib/db";

/** GET /api/companies - list all unique company names across all users' allowances */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allUsers = await listAllUsers();
  const companies = [
    ...new Set(
      allUsers
        .flatMap((u) => u.yearAllowances.map((ya) => ya.company))
        .filter(Boolean)
        .map((c) => c.trim())
    ),
  ].sort();

  return NextResponse.json(companies, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
