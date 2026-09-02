import dataset from "@/data/attractions.json";
import type { ParkId } from "@/lib/parks";

export interface GeoEntry {
  uuid: string;
  code: string;
  name: string;
  slug: string;
  nameFr?: string;
  lat?: number;
  lon?: number;
  kind?: string;
  osmName?: string;
}

const parks = dataset.parks as Record<string, GeoEntry[]>;

const byUuid = new Map<ParkId, Map<string, GeoEntry>>();

/**
 * Coordinates come from OpenStreetMap (the Wartezeiten API carries none) and
 * are keyed by the API's stable attraction uuid — see
 * `scripts/build-attractions-dataset.py`.
 */
export function getGeoData(park: ParkId): Map<string, GeoEntry> {
  let map = byUuid.get(park);
  if (!map) {
    map = new Map((parks[park] ?? []).map((e) => [e.uuid, e]));
    byUuid.set(park, map);
  }
  return map;
}

export function getGeoList(park: ParkId): GeoEntry[] {
  return parks[park] ?? [];
}
