import type { YearAllowance } from "@/types";
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
