import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDb, updateUser, addUser, findUserByEmail } from "@/lib/db";
import type { AppUser } from "@/types";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

/** GET /api/users - list all users (profiles only, no passwords) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = readDb();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const users = db.users.map(({ password: _p, ...rest }) => rest);
  return NextResponse.json(users);
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

  const { firstName, lastName, email, password, company } = body;
  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const now = new Date();
  const currentYear = now.getFullYear();

  const newUser: AppUser = {
    id: randomUUID(),
    password: hashed,
    profile: {
      firstName,
      lastName,
      email,
      company: company ?? "",
      nonWorkingDays: [0, 6],
      holidayStartMonth: 1,
      pinnedUserIds: [],
    },
    yearAllowances: [{ year: currentYear, core: 25, bought: 0, carried: 0 }],
    entries: [],
  };

  addUser(newUser);

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
