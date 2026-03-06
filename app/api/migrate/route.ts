import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAllUsers, updateUser } from "@/lib/db";
import { migrateUsersAllowances } from "@/utils/migration";

/**
 * POST /api/migrate
 *
 * Iterates through all users and ensures every YearAllowance record has
 * `id`, `startDate`, and `endDate` populated.  Records that already have
 * all three fields are left untouched.
 *
 * Returns a summary: { migrated: number, skipped: number }
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allUsers = await listAllUsers();
  const migratedUsers = migrateUsersAllowances(allUsers);

  let migrated = 0;
  let skipped = 0;

  for (let i = 0; i < allUsers.length; i++) {
    const original = allUsers[i];
    const updated = migratedUsers[i];
    if (updated === original) {
      skipped++;
    } else {
      await updateUser(original.id, { yearAllowances: updated.yearAllowances });
      migrated++;
    }
  }

  return NextResponse.json({ migrated, skipped });
}
