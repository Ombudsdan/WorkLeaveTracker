import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAllUsers, updateUser, addUser, findUserByEmail, findUserById } from "@/lib/db";
import type { AppUser } from "@/types";
import { LeaveType } from "@/types";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const SICK_LEAVE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_FEATURE_SICK_LEAVE === "true";

/** GET /api/users - list all users (profiles only, no passwords) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allUsers = await listAllUsers();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const users = allUsers.map(({ password: _p, ...rest }) => {
    if (!SICK_LEAVE_ENABLED) {
      return { ...rest, entries: rest.entries.filter((e) => e.type !== LeaveType.Sick) };
    }
    return rest;
  });
  return NextResponse.json(users, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

/** POST /api/users - register a new user */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    company?: string;
  };

  const { firstName, lastName, email, password } = body;
  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);

  const newUser: AppUser = {
    id: randomUUID(),
    password: hashed,
    profile: {
      firstName,
      lastName,
      email,
      nonWorkingDays: [0, 6],
      pinnedUserIds: [],
    },
    yearAllowances: [],
    entries: [],
  };

  await addUser(newUser);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...result } = newUser;
  return NextResponse.json(result, { status: 201 });
}

/** PATCH /api/users - update current user's profile/allowance */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fall back to email lookup in case the session ID is stale
  let resolvedUser = await findUserById(userId);
  if (!resolvedUser && session.user?.email) {
    resolvedUser = await findUserByEmail(session.user.email);
  }
  if (!resolvedUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as Partial<AppUser>;
  // Never allow updating password or id via this endpoint
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _p, id: _i, entries: _e, ...safe } = body;

  const updated = await updateUser(resolvedUser.id, safe);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...result } = updated;
  return NextResponse.json(result);
}
