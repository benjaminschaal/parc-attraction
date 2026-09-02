/**
 * Parks the app supports. `id` is the identifier the Wartezeiten.APP API
 * expects in its `park` header (see https://api.wartezeiten.app/).
 *
 * The API only speaks `de` and `en`. For Parc Astérix, `de` leaves the ride
 * names untranslated (i.e. French), which is what we want to display; for
 * Europa-Park the French names live in `src/data/attractions.json`.
 */
export const PARKS = [
  {
    id: "parcasterix",
    name: "Parc Astérix",
    country: "France",
    flag: "🇫🇷",
    timeZone: "Europe/Paris",
    apiLanguage: "de",
    center: [2.5706, 49.1339] as [number, number],
    zoom: 15.2,
    accent: "#0ea5e9",
    website: "https://www.parcasterix.fr",
  },
  {
    id: "europapark",
    name: "Europa-Park",
    country: "Allemagne",
    flag: "🇩🇪",
    timeZone: "Europe/Berlin",
    apiLanguage: "en",
    center: [7.7215, 48.2655] as [number, number],
    zoom: 14.6,
    accent: "#f97316",
    website: "https://www.europapark.de/fr",
  },
] as const;

export type Park = (typeof PARKS)[number];
export type ParkId = Park["id"];

export const PARK_IDS = PARKS.map((p) => p.id) as ParkId[];

export const DEFAULT_PARK: ParkId = "parcasterix";

export function getPark(id: string): Park | undefined {
  return PARKS.find((p) => p.id === id);
}

export function isParkId(id: string): id is ParkId {
  return PARKS.some((p) => p.id === id);
}
