import { NextResponse } from "next/server";
import { isParkId } from "@/lib/parks";
import { listSharedDays, readSharedDay } from "@/lib/history/shared";

/**
 * Shared (cross-device) history, collected by a GitHub Action. Always answers
 * 200 so the client can merge whatever it gets with its own local history —
 * an unconfigured or empty store is a normal, non-error state.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const park = url.searchParams.get("park") ?? "";
  const date = url.searchParams.get("date");

  if (!isParkId(park)) {
    return NextResponse.json({ error: "Parc inconnu" }, { status: 404 });
  }

  try {
    if (!date) {
      return NextResponse.json({ park, dates: await listSharedDays(park) });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Date invalide" }, { status: 400 });
    }
    const day = await readSharedDay(park, date);
    return NextResponse.json(
      { park, date, points: day?.points ?? [], available: day != null },
      { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=1800" } },
    );
  } catch (error) {
    console.error("[api/history]", error);
    return NextResponse.json({ park, date, points: [], available: false });
  }
}
