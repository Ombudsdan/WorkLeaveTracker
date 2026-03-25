import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAllUsers, updateUser } from "@/lib/db";
import { migrateUsersAllowances, migrateConnectionsBidirectional } from "@/utils/migration";

/**
 * POST /api/migrate
 *
 * Runs all pending data migrations:
 * 1. Ensures every YearAllowance record has `id`, `startDate`, and `endDate`.
 * 2. Ensures connections are bidirectional (if A has B pinned, B also has A).
 *
 * Returns a summary: { allowances: { migrated, skipped }, connections: { migrated, skipped } }
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allUsers = await listAllUsers();

  // --- Allowance migration ---
  const afterAllowances = migrateUsersAllowances(allUsers);
  let allowancesMigrated = 0;
  let allowancesSkipped = 0;
  for (let i = 0; i < allUsers.length; i++) {
    if (afterAllowances[i] === allUsers[i]) {
      allowancesSkipped++;
    } else {
      await updateUser(allUsers[i].id, { yearAllowances: afterAllowances[i].yearAllowances });
      allowancesMigrated++;
    }
  }

  // --- Connection bidirectionality migration ---
  const afterConnections = migrateConnectionsBidirectional(afterAllowances);
  let connectionsMigrated = 0;
  let connectionsSkipped = 0;
  for (let i = 0; i < afterAllowances.length; i++) {
    if (afterConnections[i] === afterAllowances[i]) {
      connectionsSkipped++;
    } else {
      await updateUser(afterAllowances[i].id, {
        profile: afterConnections[i].profile,
      });
      connectionsMigrated++;
    }
  }

  return NextResponse.json({
    allowances: { migrated: allowancesMigrated, skipped: allowancesSkipped },
    connections: { migrated: connectionsMigrated, skipped: connectionsSkipped },
  });
}
