/**
 * Parks the app supports, and where each one's wait times come from.
 *
 * Two sources, because no single free API covers all three parks:
 *
 *   * **Wartezeiten.APP** (https://api.wartezeiten.app/) — 46 parks, and the
 *     only one of the two that publishes opening hours and a crowd index. It
 *     speaks `de` and `en` only: for Parc Astérix the `de` response leaves the
 *     ride names untranslated (i.e. French), which is what we want to display;
 *     for Europa-Park the French names live in `src/data/attractions.json`.
 *   * **Queue-Times** (https://queue-times.com/) — covers Walibi Rhône-Alpes,
 *     which Wartezeiten.APP does not carry at all. Wait times only: no opening
 *     hours, no crowd index, and open/closed rather than a detailed status.
 *     Free, but its terms require the "Powered by Queue-Times.com" credit
 *     below to stay visible, with a link.
 */
export type ParkSource =
  | { provider: "wartezeiten"; parkId: string; language: "de" | "en" }
  | { provider: "queuetimes"; parkId: number };

export type SourceId = ParkSource["provider"];

/** How each source has to be credited in the interface. */
export const SOURCES = {
  wartezeiten: {
    label: "wartezeiten.app",
    credit: "Données fournies par wartezeiten.app",
    url: "https://www.wartezeiten.app/",
  },
  queuetimes: {
    label: "Queue-Times.com",
    // Wording imposed by https://queue-times.com/pages/api — do not reword.
    credit: "Powered by Queue-Times.com",
    url: "https://queue-times.com/",
  },
} as const satisfies Record<SourceId, { label: string; credit: string; url: string }>;

export const PARKS = [
  {
    id: "parcasterix",
    name: "Parc Astérix",
    country: "France",
    flag: "🇫🇷",
    timeZone: "Europe/Paris",
    source: {
      provider: "wartezeiten",
      parkId: "parcasterix",
      language: "de",
    } as ParkSource,
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
    source: {
      provider: "wartezeiten",
      parkId: "europapark",
      language: "en",
    } as ParkSource,
    center: [7.7215, 48.2655] as [number, number],
    zoom: 14.6,
    accent: "#f97316",
    website: "https://www.europapark.de/fr",
  },
  {
    id: "walibirhonealpes",
    name: "Walibi Rhône-Alpes",
    country: "France",
    flag: "🇫🇷",
    timeZone: "Europe/Paris",
    // Absent from Wartezeiten.APP's 46 parks; Queue-Times carries it as 301.
    source: { provider: "queuetimes", parkId: 301 } as ParkSource,
    center: [5.5699, 45.6219] as [number, number],
    zoom: 15.8,
    accent: "#65a30d",
    website: "https://www.walibi.fr",
  },
  {
    id: "disneylandparis",
    name: "Disneyland Paris",
    country: "France",
    flag: "🇫🇷",
    timeZone: "Europe/Paris",
    // `de` translates the sponsor mentions into German; `en` leaves the ride
    // names as the park itself uses them.
    source: {
      provider: "wartezeiten",
      parkId: "disneylandparis",
      language: "en",
    } as ParkSource,
    center: [2.7761, 48.8723] as [number, number],
    zoom: 15.6,
    accent: "#6366f1",
    website: "https://www.disneylandparis.com/fr-fr/",
  },
  {
    id: "disneyadventureworld",
    name: "Disney Adventure World",
    country: "France",
    flag: "🇫🇷",
    timeZone: "Europe/Paris",
    source: {
      provider: "wartezeiten",
      parkId: "disneyadventureworld",
      language: "en",
    } as ParkSource,
    center: [2.7764, 48.8654] as [number, number],
    zoom: 15.8,
    accent: "#a855f7",
    website: "https://www.disneylandparis.com/fr-fr/",
  },
  {
    id: "futuroscope",
    name: "Futuroscope",
    country: "France",
    flag: "🇫🇷",
    timeZone: "Europe/Paris",
    // The only park whose API answers in English whichever language we ask
    // for: its French labels come from OpenStreetMap, via `nameFr`.
    source: {
      provider: "wartezeiten",
      parkId: "futuroscope",
      language: "en",
    } as ParkSource,
    center: [0.3705, 46.6704] as [number, number],
    zoom: 15.4,
    accent: "#14b8a6",
    website: "https://www.futuroscope.com/",
  },
  {
    id: "nigloland",
    name: "Nigloland",
    country: "France",
    flag: "🇫🇷",
    timeZone: "Europe/Paris",
    source: {
      provider: "wartezeiten",
      parkId: "nigloland",
      language: "en",
    } as ParkSource,
    center: [4.6138, 48.2616] as [number, number],
    zoom: 15.5,
    accent: "#dc2626",
    website: "https://www.nigloland.fr/",
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

/** The credit line the park's source requires. */
export function getSource(park: Park) {
  return SOURCES[park.source.provider];
}
