import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, findUserByEmail, updateUser } from "@/lib/db";

/**
 * POST /api/users/revoke-connection
 * Revoke a connection from someone who is following the current user.
 * This removes the current user from the follower's pinned list and records
 * the revocation in the follower's revokedConnections so they can see it.
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

  await updateUser(follower.id, {
    profile: {
      ...followerProfile,
      pinnedUserIds: followerPinned.filter((id) => id !== meId),
      revokedConnections: [...filteredRevoked, { userId: meId, date: revokedDate }],
    },
  });

  return NextResponse.json({ ok: true });
}
