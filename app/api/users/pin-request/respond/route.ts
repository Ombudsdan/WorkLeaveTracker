import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, findUserByEmail, updateUser } from "@/lib/db";

/**
 * POST /api/users/pin-request/respond
 * Accept or decline a connection request.
 * Body: { requesterId: string; accept: boolean }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUserId = (session.user as { id?: string }).id;
  let me = sessionUserId ? await findUserById(sessionUserId) : undefined;
  if (!me && session.user?.email) me = await findUserByEmail(session.user.email);
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as { requesterId?: string; accept?: boolean };
  const { requesterId, accept } = body;

  if (!requesterId) return NextResponse.json({ error: "Missing requesterId" }, { status: 400 });
  if (accept === undefined) return NextResponse.json({ error: "Missing accept" }, { status: 400 });

  const requester = await findUserById(requesterId);
  if (!requester) return NextResponse.json({ error: "Requester not found" }, { status: 404 });

  const myProfile = me.profile;
  const requesterProfile = requester.profile;

  // Remove the request from both sides
  const myReceived = (myProfile.pendingPinRequestsReceived ?? []).filter(
    (id) => id !== requesterId
  );
  const requesterSent = (requesterProfile.pendingPinRequestsSent ?? []).filter(
    (id) => id !== me!.id
  );

  let myPinned = myProfile.pinnedUserIds ?? [];

  if (accept) {
    // Add requester to my pinned list (cap at 3)
    if (!myPinned.includes(requesterId) && myPinned.length < 3) {
      myPinned = [...myPinned, requesterId];
    }
  }

  await updateUser(me.id, {
    profile: {
      ...myProfile,
      pendingPinRequestsReceived: myReceived,
      pinnedUserIds: myPinned,
    },
  });

  await updateUser(requester.id, {
    profile: {
      ...requesterProfile,
      pendingPinRequestsSent: requesterSent,
    },
  });

  return NextResponse.json({ ok: true });
}
