import { NextResponse } from "next/server";
import { isParkId } from "@/lib/parks";
import { fetchParkSnapshot } from "@/lib/wartezeiten/server";

/**
 * Server-side proxy for the Wartezeiten.APP API, which sends no CORS headers
 * and therefore cannot be called from the browser. Responses are cached at
 * the edge for two minutes (the upstream wait times refresh every five).
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/park/[park]">,
) {
  const { park } = await ctx.params;
  if (!isParkId(park)) {
    return NextResponse.json({ error: "Parc inconnu" }, { status: 404 });
  }

  try {
    const snapshot = await fetchParkSnapshot(park);
    return NextResponse.json(snapshot, {
      headers: {
        "cache-control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error(`[api/park/${park}]`, error);
    return NextResponse.json(
      { error: "Les temps d'attente sont momentanément indisponibles." },
      { status: 502 },
    );
  }
}
