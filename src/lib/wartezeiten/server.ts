import "server-only";

import type { Park, ParkId } from "@/lib/parks";
import { getGeoData } from "@/lib/attractions";
import type { Attraction, ParkSnapshot } from "@/lib/snapshot";
import {
  crowdLevelSchema,
  openingTimesSchema,
  waitingTimesSchema,
} from "./schema";

const API_BASE = "https://api.wartezeiten.app/v1";

/**
 * The upstream API is rate limited to 100 requests/minute per IP and blocks
 * for 15 minutes on overflow, so every call goes through Next's data cache
 * with the same TTL the API itself advertises for that endpoint.
 */
const TTL = { waitingtimes: 120, openingtimes: 3600, crowdlevel: 300 };

class UpstreamError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
  ) {
    super(`wartezeiten.app ${endpoint} responded ${status}`);
  }
}

async function call(
  endpoint: keyof typeof TTL,
  headers: Record<string, string>,
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    headers: { accept: "application/json", ...headers },
    next: { revalidate: TTL[endpoint] },
  });
  if (!res.ok) throw new UpstreamError(endpoint, res.status);
  return res.json();
}

/** Fetches wait times, opening hours and crowd level for a park in one go. */
export async function fetchWartezeitenSnapshot(
  park: Park & { id: ParkId },
  parkId: string,
  language: string,
): Promise<ParkSnapshot> {
  // Only the wait times are essential — a park with no crowd-level or
  // opening-hours data should still render its queue list.
  const [waiting, opening, crowd] = await Promise.all([
    call("waitingtimes", { park: parkId, language }),
    call("openingtimes", { park: parkId }).catch(() => null),
    call("crowdlevel", { park: parkId }).catch(() => null),
  ]);

  const rows = waitingTimesSchema.parse(waiting);
  const geo = getGeoData(park.id);

  const attractions: Attraction[] = rows.map((row) => {
    const g = geo.get(row.uuid);
    return {
      uuid: row.uuid,
      code: row.code,
      name: row.name,
      label: g?.nameFr ?? row.name,
      waitingTime: row.waitingtime,
      status: row.status,
      ...(g?.lat != null ? { lat: g.lat, lon: g.lon } : {}),
      ...(g?.kind ? { kind: g.kind } : {}),
    };
  });

  attractions.sort((a, b) => a.label.localeCompare(b.label, "fr"));

  const hours = opening ? openingTimesSchema.parse(opening)[0] : undefined;
  const level = crowd ? crowdLevelSchema.parse(crowd) : null;

  return {
    park: park.id,
    fetchedAt: new Date().toISOString(),
    updatedAt: rows[0]?.datetime ?? null,
    opening: hours
      ? {
          openedToday: hours.opened_today,
          openFrom: hours.open_from ?? null,
          closedFrom: hours.closed_from ?? null,
        }
      : null,
    crowdLevel: level
      ? { level: level.crowd_level, timestamp: level.timestamp ?? null }
      : null,
    attractions,
  };
}
