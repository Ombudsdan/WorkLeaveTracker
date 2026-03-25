import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, findUserByEmail, updateUser } from "@/lib/db";

/**
 * POST /api/users/revoke-connection
 * Revoke a connection from someone who is following the current user.
 * This removes both parties from each other's pinned lists (bidirectional)
 * and records the revocation in the follower's revokedConnections.
 * Body: { followerId: string }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUserId = (session.user as { id?: string }).id;
  let me = sessionUserId ? await findUserById(sessionUserId) : undefined;
  if (!me && session.user?.email) me = await findUserByEmail(session.user.email);
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const meId = me.id;
  const body = (await request.json()) as { followerId?: string };
  const { followerId } = body;

  if (!followerId) return NextResponse.json({ error: "Missing followerId" }, { status: 400 });
  if (followerId === meId)
    return NextResponse.json({ error: "Cannot revoke yourself" }, { status: 400 });

  const follower = await findUserById(followerId);
  if (!follower) return NextResponse.json({ error: "Follower not found" }, { status: 404 });

  const followerProfile = follower.profile;
  const followerPinned = followerProfile.pinnedUserIds ?? [];

  // Only revoke if they are actually following
  if (!followerPinned.includes(meId)) {
    return NextResponse.json({ error: "Not a follower" }, { status: 409 });
  }

  const revokedDate = new Date().toISOString();
  const existingRevoked = followerProfile.revokedConnections ?? [];

  // Remove duplicate if the same connection was previously revoked and reconnected
  const filteredRevoked = existingRevoked.filter((r) => r.userId !== meId);

  // Remove follower from their own pinned list and record the revocation
  await updateUser(follower.id, {
    profile: {
      ...followerProfile,
      pinnedUserIds: followerPinned.filter((id) => id !== meId),
      revokedConnections: [...filteredRevoked, { userId: meId, date: revokedDate }],
    },
  });

  // Also remove the follower from the current user's pinned list (bidirectional)
  const myProfile = me.profile;
  await updateUser(meId, {
    profile: {
      ...myProfile,
      pinnedUserIds: (myProfile.pinnedUserIds ?? []).filter((id) => id !== followerId),
    },
  });

  return NextResponse.json({ ok: true });
}
