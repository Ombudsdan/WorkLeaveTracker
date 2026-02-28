import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateEntry, deleteEntry, findUserById } from "@/lib/db";
import type { LeaveEntry } from "@/types";

/** PATCH /api/entries/[id] - update an entry */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: entryId } = await params;
  const body = (await request.json()) as Partial<LeaveEntry>;
  const ok = updateEntry(userId, entryId, body);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = findUserById(userId);
  const entry = user?.entries.find((e) => e.id === entryId);
  return NextResponse.json(entry);
}

/** DELETE /api/entries/[id] - delete an entry */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: entryId } = await params;
  const ok = deleteEntry(userId, entryId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
