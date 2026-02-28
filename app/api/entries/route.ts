import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addEntry, findUserById } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { LeaveStatus, LeaveType } from "@/types";
import type { LeaveEntry } from "@/types";

/** GET /api/entries - get current user's entries */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = findUserById(userId);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user.entries);
}

/** POST /api/entries - create a new entry for the current user */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as Omit<LeaveEntry, "id">;
  const entry: LeaveEntry = {
    id: uuidv4(),
    startDate: body.startDate,
    endDate: body.endDate,
    status: body.status ?? LeaveStatus.Planned,
    type: body.type ?? LeaveType.Holiday,
    notes: body.notes,
  };

  const ok = addEntry(userId, entry);
  if (!ok) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(entry, { status: 201 });
}
