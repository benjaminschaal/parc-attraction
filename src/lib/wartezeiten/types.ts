import type { ParkId } from "@/lib/parks";

/** Ride statuses returned by the API, in the order we want them listed. */
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
  uuid: string;
  code: string;
  /** Name as returned by the API (already French for Parc Astérix). */
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
  /** Timestamp the API itself reports for the wait times, ISO 8601. */
  updatedAt: string | null;
  opening: OpeningTimes | null;
  crowdLevel: { level: number; timestamp: string | null } | null;
  attractions: Attraction[];
}
