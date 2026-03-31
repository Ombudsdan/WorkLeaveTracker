"use client";
import type { ReactNode } from "react";
import ViewToggle from "@/components/molecules/ViewToggle";

type DashboardView = "list" | "calendar";

const TOGGLE_OPTIONS: [
  { value: DashboardView; label: string },
  { value: DashboardView; label: string },
] = [
  { value: "list", label: "Upcoming Leave" },
  { value: "calendar", label: "Calendar" },
];

export interface DashboardColumnsProps {
  /** Which panel is currently active on mobile. */
  mobileView: DashboardView;
  onMobileViewChange: (view: DashboardView) => void;
  /** Left column (stats, summary). */
  left: ReactNode;
  /** Centre column (calendar / annual planner). */
  center: ReactNode;
  /** Right column (connections widget + leave list). */
  right: ReactNode;
}

/**
 * Responsive three-column dashboard layout organism.
 *
 * On desktop (lg+) all three columns are visible.
 * On mobile a ViewToggle switches between the "list" panels (left + right)
 * and the "calendar" panel (centre).
 */
export default function DashboardColumns({
  mobileView,
  onMobileViewChange,
  left,
  center,
  right,
}: DashboardColumnsProps) {
  return (
    <div data-testid="dashboard-columns">
      {/* Mobile-only toggle */}
      <ViewToggle
        options={TOGGLE_OPTIONS}
        value={mobileView}
        onChange={onMobileViewChange}
        className="flex lg:hidden mb-4"
      />

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Left column */}
        <div
          data-testid="left-column"
          className={`lg:col-span-2 space-y-4 ${mobileView === "list" ? "block" : "hidden"} lg:block`}
        >
          {left}
        </div>

        {/* Centre column */}
        <div
          data-testid="center-column"
          className={`lg:col-span-3 space-y-4 ${mobileView === "calendar" ? "block" : "hidden"} lg:block`}
        >
          {center}
        </div>

        {/* Right column */}
        <div
          data-testid="right-column"
          className={`lg:col-span-2 space-y-4 ${mobileView === "list" ? "block" : "hidden"} lg:block`}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
