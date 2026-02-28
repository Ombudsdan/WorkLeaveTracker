import { NextResponse } from "next/server";

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
let cache: { data: string[]; ts: number } | null = null;

/** GET /api/holidays - returns England/Wales bank holiday dates as ISO strings */
export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch("https://www.gov.uk/bank-holidays.json", {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error("Upstream error");
    const json = await res.json();
    const events: { date: string }[] = json["england-and-wales"]?.events ?? [];
    const dates = events.map((e) => e.date);
    cache = { data: dates, ts: Date.now() };
    return NextResponse.json(dates);
  } catch (err) {
    console.error("[/api/holidays] Failed to fetch UK bank holidays:", err);
    // Return empty array on failure so the app still works
    return NextResponse.json([]);
  }
}
