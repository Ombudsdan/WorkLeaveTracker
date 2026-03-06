export enum ValidationRule {
  Required = "required",
  Min = "min",
  Max = "max",
}

/**
 * Controls how bank holidays are handled for a leave window.
 * - None (default): bank holidays do not consume annual leave.
 * - Deduct: bank holidays that fall on a working day reduce the total allowance.
 */
export enum BankHolidayHandling {
  None = "none",
  Deduct = "deduct",
}

export enum LeaveStatus {
  Planned = "planned",
  Requested = "requested",
  Approved = "approved",
}

export enum LeaveType {
  Holiday = "holiday",
  Sick = "sick",
  /** @deprecated No longer offered in the UI; kept for backward-compatibility with existing data */
  Other = "other",
}

/** Duration of a leave entry. Replaces the deprecated halfDay/halfDayPeriod fields. */
export enum LeaveDuration {
  Full = "full",
  HalfMorning = "halfMorning",
  HalfAfternoon = "halfAfternoon",
}

/** A UK bank holiday with its name, used for display and country-specific filtering. */
export interface BankHolidayEntry {
  date: string;
  title: string;
}

/**
 * UK country division used to select the correct regional bank holidays.
 * Matches the division keys returned by the UK government bank holidays API.
 */
export type UkCountry = "england-and-wales" | "scotland" | "northern-ireland";

export interface LeaveEntry {
  id: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  type: LeaveType;
  notes?: string;
  /** Duration of the leave entry. Use this in preference to the deprecated fields below. */
  duration?: LeaveDuration;
  /** @deprecated Use duration instead */
  halfDay?: boolean;
  /** @deprecated Use duration instead */
  halfDayPeriod?: "am" | "pm";
}

export interface UserAllowance {
  core: number;
  bought: number;
  carried: number;
}

export interface YearAllowance extends UserAllowance {
  /** The calendar year in which this holiday period begins */
  year: number;
  /** Name of the company this allowance applies to */
  company: string;
  /** 1-12, e.g. 1 for Jan, 4 for Apr — defines when this holiday year starts */
  holidayStartMonth: number;
  /**
   * Whether this allowance is currently active for the user.
   * Defaults to true. Set to false when the user changes company mid-period.
   */
  active?: boolean;
  /**
   * How bank holidays are handled for this leave window.
   * Defaults to None (bank holidays do not reduce annual leave).
   * When set to Deduct, bank holidays that fall on working days are subtracted
   * from the total allowance.
   */
  bankHolidayHandling?: BankHolidayHandling;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  /** 0=Sun, 1=Mon, ..., 6=Sat */
  nonWorkingDays: number[];
  /** IDs of up to 3 other users pinned in the dashboard user selector */
  pinnedUserIds?: string[];
  /** IDs of users to whom I have sent a pending connection request */
  pendingPinRequestsSent?: string[];
  /** IDs of users who have sent me a pending connection request */
  pendingPinRequestsReceived?: string[];
  /** UK country for country-specific bank holidays */
  country?: UkCountry;
  /** Connections that were revoked by the other person (they removed me from their followers) */
  revokedConnections?: Array<{ userId: string; date: string }>;
}

export interface AppUser {
  id: string;
  password: string;
  profile: UserProfile;
  yearAllowances: YearAllowance[];
  entries: LeaveEntry[];
}

/** AppUser without the password field — safe to return from API routes */
export type PublicUser = Omit<AppUser, "password">;

export interface Database {
  users: AppUser[];
}
