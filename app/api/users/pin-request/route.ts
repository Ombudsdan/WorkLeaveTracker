import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, findUserByEmail, updateUser } from "@/lib/db";

/**
 * POST /api/users/pin-request
 * Send a connection request to another user.
 * Body: { targetUserId: string }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUserId = (session.user as { id?: string }).id;
  let me = sessionUserId ? await findUserById(sessionUserId) : undefined;
  if (!me && session.user?.email) me = await findUserByEmail(session.user.email);
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as { targetUserId?: string };
  const { targetUserId } = body;

  if (!targetUserId) return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
  if (targetUserId === me.id)
    return NextResponse.json({ error: "Cannot request yourself" }, { status: 400 });

  const target = await findUserById(targetUserId);
  if (!target) return NextResponse.json({ error: "Target user not found" }, { status: 404 });

  const myProfile = me.profile;
  const targetProfile = target.profile;

  const myPinned = myProfile.pinnedUserIds ?? [];
  const mySent = myProfile.pendingPinRequestsSent ?? [];
  const targetReceived = targetProfile.pendingPinRequestsReceived ?? [];

  // Already connected
  if (myPinned.includes(targetUserId)) {
    return NextResponse.json({ error: "Already connected" }, { status: 409 });
  }
  // Already sent
  if (mySent.includes(targetUserId)) {
    return NextResponse.json({ error: "Request already sent" }, { status: 409 });
  }

  await updateUser(me.id, {
    profile: { ...myProfile, pendingPinRequestsSent: [...mySent, targetUserId] },
  });
  await updateUser(target.id, {
    profile: { ...targetProfile, pendingPinRequestsReceived: [...targetReceived, me.id] },
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/users/pin-request
 * Cancel a pending connection request that the current user previously sent.
 * Body: { targetUserId: string }
 */
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUserId = (session.user as { id?: string }).id;
  let me = sessionUserId ? await findUserById(sessionUserId) : undefined;
  if (!me && session.user?.email) me = await findUserByEmail(session.user.email);
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as { targetUserId?: string };
  const { targetUserId } = body;

  if (!targetUserId) return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });

  const target = await findUserById(targetUserId);
  if (!target) return NextResponse.json({ error: "Target user not found" }, { status: 404 });

  const myProfile = me.profile;
  const targetProfile = target.profile;

  await updateUser(me.id, {
    profile: {
      ...myProfile,
      pendingPinRequestsSent: (myProfile.pendingPinRequestsSent ?? []).filter(
        (id) => id !== targetUserId
      ),
    },
  });

  await updateUser(target.id, {
    profile: {
      ...targetProfile,
      pendingPinRequestsReceived: (targetProfile.pendingPinRequestsReceived ?? []).filter(
        (id) => id !== me!.id
      ),
    },
  });

  return NextResponse.json({ ok: true });
}
