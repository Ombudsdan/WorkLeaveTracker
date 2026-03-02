import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addEntry, findUserById, findUserByEmail } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry } from "@/types";

const SICK_LEAVE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_FEATURE_SICK_LEAVE === "true";

/** GET /api/entries - get current user's entries */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let user = await findUserById(userId);
  if (!user && session.user?.email) {
    user = await findUserByEmail(session.user.email);
  }
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entries = SICK_LEAVE_ENABLED
    ? user.entries
    : user.entries.filter((e) => e.type !== LeaveType.Sick);
  return NextResponse.json(entries);
}

/** POST /api/entries - create a new entry for the current user */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Try ID first; fall back to email lookup in case the session ID is stale
  let resolvedUser = await findUserById(userId);
  if (!resolvedUser && session.user?.email) {
    resolvedUser = await findUserByEmail(session.user.email);
  }
  if (!resolvedUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = (await request.json()) as Omit<LeaveEntry, "id">;
  const entry: LeaveEntry = {
    id: uuidv4(),
    startDate: body.startDate,
    endDate: body.endDate,
    status: body.status ?? LeaveStatus.Planned,
    type: body.type ?? LeaveType.Holiday,
    notes: body.notes,
    ...(body.duration && { duration: body.duration }),
  };

  const ok = await addEntry(resolvedUser.id, entry);
  if (!ok) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(entry, { status: 201 });
}
