import type { YearAllowance, UserProfile } from "@/types";
import { yearAllowanceDates } from "@/utils/dateHelpers";

/**
 * Generate a simple deterministic ID for a YearAllowance when no UUID is
 * available (e.g. for server-side migration of existing records).
 * Format: `ya-<year>-<m>-<company-slug>`
 */
function deriveAllowanceId(ya: YearAllowance): string {
  /* c8 ignore next */
  const slug = (ya.company ?? "").trim().toLowerCase().replace(/\s+/g, "-") || "unknown";
  return `ya-${ya.year}-${ya.holidayStartMonth ?? 1}-${slug}`;
}

/**
 * Migrate a single YearAllowance record by filling in any missing
 * `id`, `startDate`, and `endDate` fields.
 *
 * Existing values are preserved; only absent fields are computed.
 */
export function migrateYearAllowance(ya: YearAllowance): YearAllowance {
  const sm = ya.holidayStartMonth ?? 1;
  const computed = yearAllowanceDates(ya.year, sm);
  return {
    ...ya,
    id: ya.id ?? deriveAllowanceId(ya),
    startDate: ya.startDate ?? computed.startDate,
    endDate: ya.endDate ?? computed.endDate,
  };
}

/**
 * Migrate all YearAllowance records for a list of users.
 *
 * Returns a new array of user objects with updated allowances.
 * Users whose allowances already have all fields set are returned unchanged.
 */
export function migrateUsersAllowances<T extends { yearAllowances: YearAllowance[] }>(
  users: T[]
): T[] {
  return users.map((user) => {
    const migrated = user.yearAllowances.map(migrateYearAllowance);
    const changed = migrated.some(
      (ya, i) =>
        ya.id !== user.yearAllowances[i].id ||
        ya.startDate !== user.yearAllowances[i].startDate ||
        ya.endDate !== user.yearAllowances[i].endDate
    );
    if (!changed) return user;
    return { ...user, yearAllowances: migrated };
  });
}

/**
 * Ensure connections are bidirectional: if user A has user B in their
 * pinnedUserIds but B does not have A, add A to B's pinnedUserIds (capped at 3).
 *
 * Returns a new array of user objects. Users whose profiles are unchanged
 * are returned as the same object reference.
 */
export function migrateConnectionsBidirectional<T extends { id: string; profile: UserProfile }>(
  users: T[]
): T[] {
  // Build a mutable map of pinnedUserIds per user so we can patch in bulk
  const pinnedMap = new Map<string, string[]>(
    users.map((u) => [u.id, [...(u.profile.pinnedUserIds ?? /* c8 ignore next */ [])]])
  );

  for (const user of users) {
    for (const targetId of user.profile.pinnedUserIds ?? /* c8 ignore next */ []) {
      const targetPinned = pinnedMap.get(targetId);
      if (targetPinned === undefined) continue; // target not in the users list
      if (!targetPinned.includes(user.id) && targetPinned.length < 3) {
        targetPinned.push(user.id);
      }
    }
  }

  return users.map((user) => {
    const original = user.profile.pinnedUserIds ?? /* c8 ignore next */ [];
    const updated = pinnedMap.get(user.id) ?? /* c8 ignore next */ original;
    if (updated.length === original.length && updated.every((id, i) => id === original[i])) {
      return user;
    }
    return { ...user, profile: { ...user.profile, pinnedUserIds: updated } };
  });
}
