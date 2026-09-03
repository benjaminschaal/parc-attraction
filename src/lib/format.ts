import type { RideStatus } from "@/lib/snapshot";

export const STATUS_LABEL: Record<RideStatus, string> = {
  opened: "Ouverte",
  virtualqueue: "File virtuelle",
  maintenance: "Entretien",
  closedweather: "Fermée (météo)",
  closedice: "Fermée (gel)",
  closed: "Fermée",
};

export const STATUS_SHORT: Record<RideStatus, string> = {
  opened: "Ouverte",
  virtualqueue: "Virtuelle",
  maintenance: "Entretien",
  closedweather: "Météo",
  closedice: "Gel",
  closed: "Fermée",
};

/** OpenStreetMap `attraction=*` values, mapped to a French label + icon. */
const KINDS: Record<string, [string, string]> = {
  roller_coaster: ["Montagnes russes", "🎢"],
  log_flume: ["Bûches / eau", "🚿"],
  water_slide: ["Toboggan aquatique", "💦"],
  river_rafting: ["Rafting", "🛶"],
  boat_ride: ["Parcours en bateau", "⛵"],
  dark_ride: ["Parcours scénique", "🔦"],
  carousel: ["Manège", "🎠"],
  swing_carousel: ["Chaises volantes", "🎡"],
  swing_ride: ["Chaises volantes", "🎡"],
  pirate_ship: ["Bateau pirate", "🏴‍☠️"],
  bumper_car: ["Autos tamponneuses", "🚗"],
  drop_tower: ["Tour de chute", "🗼"],
  train: ["Petit train", "🚂"],
  amusement_ride: ["Attraction", "🎪"],
  flying_theater: ["Cinéma dynamique", "🕊️"],
  playground: ["Aire de jeux", "🧒"],
  animal: ["Spectacle animalier", "🐬"],
  yes: ["Attraction", "🎪"],
};

export function kindLabel(kind?: string): string | null {
  return kind ? (KINDS[kind]?.[0] ?? null) : null;
}

export function kindIcon(kind?: string): string {
  return (kind && KINDS[kind]?.[1]) || "🎪";
}

/**
 * Colour ramp for a wait time, shared by the list, the map markers and the
 * charts so a colour always means the same number of minutes.
 */
export function waitColor(minutes: number): string {
  if (minutes <= 10) return "#16a34a";
  if (minutes <= 20) return "#65a30d";
  if (minutes <= 30) return "#ca8a04";
  if (minutes <= 45) return "#ea580c";
  if (minutes <= 60) return "#dc2626";
  return "#9f1239";
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/** `2026-09-02T18:15:00+02:00` -> `18:15`, rendered in the park's timezone. */
export function formatTime(iso: string | null, timeZone: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

export function formatDateLong(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(date);
}

/** ISO calendar day (`2026-09-02`) as seen from the park's timezone. */
export function parkDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);
}

/** Minutes since local midnight in the park's timezone, for chart x-axes. */
export function parkMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

export function formatClock(minutesSinceMidnight: number): string {
  const h = Math.floor(minutesSinceMidnight / 60) % 24;
  const m = Math.round(minutesSinceMidnight % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function relativeFromNow(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min === 1) return "il y a 1 minute";
  if (min < 60) return `il y a ${min} minutes`;
  const h = Math.round(min / 60);
  return h === 1 ? "il y a 1 heure" : `il y a ${h} heures`;
}
