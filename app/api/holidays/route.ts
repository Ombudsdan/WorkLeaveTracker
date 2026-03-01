import { NextResponse } from "next/server";
import bankHolidays from "@/data/bank-holidays.json";

/** GET /api/holidays - returns England/Wales bank holiday dates as ISO strings */
export async function GET() {
  return NextResponse.json(bankHolidays);
}
