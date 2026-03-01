import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateEntry, deleteEntry, findUserById, findUserByEmail } from "@/lib/db";
import type { LeaveEntry } from "@/types";

/** PATCH /api/entries/[id] - update an entry */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fall back to email lookup in case the session ID is stale
  let resolvedUser = findUserById(userId);
  if (!resolvedUser && session.user?.email) {
    resolvedUser = findUserByEmail(session.user.email);
  }
  if (!resolvedUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id: entryId } = await params;
  const body = (await request.json()) as Partial<LeaveEntry>;
  const ok = updateEntry(resolvedUser.id, entryId, body);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = findUserById(resolvedUser.id);
  const entry = updated?.entries.find((e) => e.id === entryId);
  return NextResponse.json(entry);
}

/** DELETE /api/entries/[id] - delete an entry */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fall back to email lookup in case the session ID is stale
  let resolvedUser = findUserById(userId);
  if (!resolvedUser && session.user?.email) {
    resolvedUser = findUserByEmail(session.user.email);
  }
  if (!resolvedUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id: entryId } = await params;
  const ok = deleteEntry(resolvedUser.id, entryId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
