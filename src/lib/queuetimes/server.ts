import "server-only";

import { getGeoData } from "@/lib/attractions";
import type { Park, ParkId } from "@/lib/parks";
import type { Attraction, ParkSnapshot } from "@/lib/snapshot";
import { queueTimesSchema } from "./schema";

const API_BASE = "https://queue-times.com";

/**
 * Queue-Times publishes wait times only — no opening hours, no crowd index,
 * and open/closed rather than the six statuses Wartezeiten distinguishes. The
 * snapshot it produces therefore carries `opening: null` and `crowdLevel:
 * null`, which the interface already handles for a park whose upstream is
 * having a bad day.
 *
 * Its data refreshes every five minutes and its terms ask that clients not
 * poll harder than that, so the cache TTL matches.
 */
const TTL = 300;

/** Ride ids are integers, namespaced so they cannot collide with a uuid. */
export const rideUuid = (id: number) => `qt-${id}`;

export async function fetchQueueTimesSnapshot(
  park: Park & { id: ParkId },
  parkId: number,
): Promise<ParkSnapshot> {
  const res = await fetch(`${API_BASE}/parks/${parkId}/queue_times.json`, {
    headers: { accept: "application/json" },
    next: { revalidate: TTL },
  });
  if (!res.ok) {
    throw new Error(`queue-times park ${parkId} responded ${res.status}`);
  }

  const parsed = queueTimesSchema.parse(await res.json());
  const rides = [...parsed.rides, ...parsed.lands.flatMap((l) => l.rides)];
  const geo = getGeoData(park.id);

  const attractions: Attraction[] = rides.map((ride) => {
    const uuid = rideUuid(ride.id);
    const g = geo.get(uuid);
    return {
      uuid,
      code: String(ride.id),
      name: ride.name,
      label: g?.nameFr ?? ride.name,
      waitingTime: ride.wait_time,
      status: ride.is_open ? "opened" : "closed",
      ...(g?.lat != null ? { lat: g.lat, lon: g.lon } : {}),
      ...(g?.kind ? { kind: g.kind } : {}),
    };
  });

  attractions.sort((a, b) => a.label.localeCompare(b.label, "fr"));

  // Each ride carries its own timestamp; the most recent one is what the park
  // as a whole was last known to look like, and it is what the history
  // de-duplicates on.
  const stamps = rides
    .map((r) => r.last_updated)
    .filter((t): t is string => typeof t === "string" && !Number.isNaN(Date.parse(t)));
  const updatedAt = stamps.length
    ? new Date(Math.max(...stamps.map((t) => Date.parse(t)))).toISOString()
    : null;

  return {
    park: park.id,
    fetchedAt: new Date().toISOString(),
    updatedAt,
    opening: null,
    crowdLevel: null,
    attractions,
  };
}
