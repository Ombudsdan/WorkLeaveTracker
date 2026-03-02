export enum ValidationRule {
  Required = "required",
  Min = "min",
  Max = "max",
}

export enum LeaveStatus {
  Planned = "planned",
  Requested = "requested",
  Approved = "approved",
}

export enum LeaveType {
  Holiday = "holiday",
  Sick = "sick",
  Other = "other",
}

export interface LeaveEntry {
  id: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  type: LeaveType;
  notes?: string;
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
