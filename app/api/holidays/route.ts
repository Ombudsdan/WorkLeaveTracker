import { NextResponse } from "next/server";
import bankHolidaysRaw from "@/data/bank-holidays.json";
import type { BankHolidayEntry, UkCountry } from "@/types";

const DEFAULT_COUNTRY: UkCountry = "england-and-wales";

const bankHolidaysByCountry = bankHolidaysRaw as Record<UkCountry, BankHolidayEntry[]>;

/** GET /api/holidays?country=<division> - returns bank holiday entries for the given country */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countryParam = searchParams.get("country");
  const country: UkCountry =
    countryParam && countryParam in bankHolidaysByCountry
      ? (countryParam as UkCountry)
      : DEFAULT_COUNTRY;

  const entries: BankHolidayEntry[] = bankHolidaysByCountry[country] ?? [];
  return NextResponse.json(entries);
}
