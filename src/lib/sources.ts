import "server-only";

import { getPark, type ParkId } from "@/lib/parks";
import type { ParkSnapshot } from "@/lib/snapshot";
import { fetchQueueTimesSnapshot } from "@/lib/queuetimes/server";
import { fetchWartezeitenSnapshot } from "@/lib/wartezeiten/server";

/**
 * The single entry point the routes and pages use: it picks the API the park
 * is declared against in `src/lib/parks.ts` and normalises whatever comes back
 * into one `ParkSnapshot` shape. Adding a park is a matter of declaring its
 * source there — no caller changes.
 */
export async function fetchParkSnapshot(park: ParkId): Promise<ParkSnapshot> {
  const config = getPark(park);
  if (!config) throw new Error(`Unknown park: ${park}`);

  const source = config.source;
  switch (source.provider) {
    case "wartezeiten":
      return fetchWartezeitenSnapshot(config, source.parkId, source.language);
    case "queuetimes":
      return fetchQueueTimesSnapshot(config, source.parkId);
  }
}
