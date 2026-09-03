import type { ParkId } from "@/lib/parks";

/**
 * The shape every data source is normalised into. Two APIs feed the app —
 * Wartezeiten.APP and Queue-Times — and they disagree on almost everything:
 * only `attractions` is guaranteed, the rest is nullable because one source
 * or the other simply does not publish it. See `src/lib/sources.ts`.
 */

/** Ride statuses, in the order we want them listed. */
export const RIDE_STATUSES = [
  "opened",
  "virtualqueue",
  "maintenance",
  "closedweather",
  "closedice",
  "closed",
] as const;

export type RideStatus = (typeof RIDE_STATUSES)[number];

export interface Attraction {
  /** Stable identifier, namespaced by source — see `src/lib/sources.ts`. */
  uuid: string;
  code: string;
  /** Name as returned by the source (already French for the French parks). */
  name: string;
  /** Localised label to display: `nameFr` when we have one, else `name`. */
  label: string;
  waitingTime: number;
  status: RideStatus;
  lat?: number;
  lon?: number;
  /** OpenStreetMap `attraction=*` value, e.g. `roller_coaster`. */
  kind?: string;
}

export interface OpeningTimes {
  openedToday: boolean;
  openFrom: string | null;
  closedFrom: string | null;
}

export interface ParkSnapshot {
  park: ParkId;
  /** When our server fetched this, ISO 8601. */
  fetchedAt: string;
  /** Timestamp the source itself reports for the wait times, ISO 8601. */
  updatedAt: string | null;
  /** Null when the source publishes no opening hours (Queue-Times). */
  opening: OpeningTimes | null;
  /** Null when the source publishes no crowd index (Queue-Times). */
  crowdLevel: { level: number; timestamp: string | null } | null;
  attractions: Attraction[];
}
