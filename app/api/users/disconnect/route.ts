import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, findUserByEmail, updateUser } from "@/lib/db";

/**
 * POST /api/users/disconnect
 * Remove a mutual connection between the current user and a target user.
 * Both parties lose the connection simultaneously.
 * Body: { targetId: string }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUserId = (session.user as { id?: string }).id;
  let me = sessionUserId ? await findUserById(sessionUserId) : undefined;
  if (!me && session.user?.email) me = await findUserByEmail(session.user.email);
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const meId = me.id;
  const body = (await request.json()) as { targetId?: string };
  const { targetId } = body;

  if (!targetId) return NextResponse.json({ error: "Missing targetId" }, { status: 400 });
  if (targetId === meId)
    return NextResponse.json({ error: "Cannot disconnect yourself" }, { status: 400 });

  const target = await findUserById(targetId);
  if (!target) return NextResponse.json({ error: "Target user not found" }, { status: 404 });

  // Remove target from my pinned list
  await updateUser(meId, {
    profile: {
      ...me.profile,
      pinnedUserIds: (me.profile.pinnedUserIds ?? []).filter((id) => id !== targetId),
    },
  });

  // Remove me from target's pinned list
  await updateUser(targetId, {
    profile: {
      ...target.profile,
      pinnedUserIds: (target.profile.pinnedUserIds ?? []).filter((id) => id !== meId),
    },
  });

  return NextResponse.json({ ok: true });
}
