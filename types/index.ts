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

export interface UserProfile {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  /** 0=Sun, 1=Mon, ..., 6=Sat */
  nonWorkingDays: number[];
  /** 1-12, e.g. 1 for Jan, 4 for Apr */
  holidayStartMonth: number;
}

export interface AppUser {
  id: string;
  password: string;
  profile: UserProfile;
  allowance: UserAllowance;
  entries: LeaveEntry[];
}

/** AppUser without the password field — safe to return from API routes */
export type PublicUser = Omit<AppUser, "password">;

export interface Database {
  users: AppUser[];
}
