import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDb, updateUser } from "@/lib/db";
import type { AppUser } from "@/types";

/** GET /api/users - list all users (profiles only, no passwords) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = readDb();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const users = db.users.map(({ password: _p, ...rest }) => rest);
  return NextResponse.json(users);
}

/** PATCH /api/users - update current user's profile/allowance */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<AppUser>;
  // Never allow updating password or id via this endpoint
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _p, id: _i, entries: _e, ...safe } = body;

  const updated = updateUser(userId, safe);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...result } = updated;
  return NextResponse.json(result);
}
