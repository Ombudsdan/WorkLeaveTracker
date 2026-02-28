"use client";
import type { UserAllowance } from "@/types";

interface AllowanceBreakdownProps {
  allowance: UserAllowance;
}

export default function AllowanceBreakdown({ allowance }: AllowanceBreakdownProps) {
  const total = allowance.core + allowance.bought + allowance.carried;

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h3 className="font-semibold text-gray-700 text-sm mb-3">Allowance Breakdown</h3>
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Core Days</span>
          <span>{allowance.core}</span>
        </div>
        <div className="flex justify-between">
          <span>Bought</span>
          <span>+{allowance.bought}</span>
        </div>
        <div className="flex justify-between">
          <span>Carried Over</span>
          <span>+{allowance.carried}</span>
        </div>
        <div className="flex justify-between font-semibold border-t pt-1 mt-1">
          <span>Total</span>
          <span>{total}</span>
        </div>
      </div>
    </div>
  );
}
