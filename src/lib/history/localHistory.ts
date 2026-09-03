"use client";

import { del, get, keys, set } from "idb-keyval";
import { getPark, type ParkId } from "@/lib/parks";
import { parkDay } from "@/lib/format";
import type { ParkSnapshot } from "@/lib/snapshot";

/**
 * The Wartezeiten API only exposes the *current* wait times, so the app builds
 * its own history: every refresh received while the app is open is appended to
 * an IndexedDB day file. It costs nothing to run, works offline, and never
 * leaves the device — the trade-off being that a day only gets covered for the
 * stretches during which the app was actually open. `scripts/collect-history.mjs`
 * (run by a GitHub Action) fills the gaps with a shared, always-on history.
 */

export interface HistoryPoint {
  /** Snapshot time, ISO 8601. */
  t: string;
  /** Park crowd level, when the API reported one. */
  c: number | null;
  /** uuid -> wait in minutes, for rides that were open. */
  w: Record<string, number>;
  /** uuids of rides that were not open (closed, maintenance, …). */
  x: string[];
}

export interface DayHistory {
  park: ParkId;
  date: string;
  points: HistoryPoint[];
}

const DAY_KEY = (park: ParkId, date: string) => `hist:${park}:${date}`;
const RETENTION_DAYS = 120;

function isDayKey(key: IDBValidKey): key is string {
  return typeof key === "string" && key.startsWith("hist:");
}

export async function listDays(park: ParkId): Promise<string[]> {
  const all = await keys();
  const prefix = `hist:${park}:`;
  return all
    .filter(isDayKey)
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length))
    .sort()
    .reverse();
}

export async function getDay(
  park: ParkId,
  date: string,
): Promise<DayHistory | null> {
  return (await get<DayHistory>(DAY_KEY(park, date))) ?? null;
}

/**
 * Appends a snapshot to today's history. Returns the updated day, or `null`
 * when the snapshot carried nothing new (the upstream API only refreshes every
 * five minutes, so most polls repeat the previous reading).
 */
export async function recordSnapshot(
  snapshot: ParkSnapshot,
): Promise<DayHistory | null> {
  const config = getPark(snapshot.park);
  if (!config) return null;

  const stamp = snapshot.updatedAt ?? snapshot.fetchedAt;
  const date = parkDay(new Date(stamp), config.timeZone);
  const key = DAY_KEY(snapshot.park, date);
  const day: DayHistory = (await get<DayHistory>(key)) ?? {
    park: snapshot.park,
    date,
    points: [],
  };

  if (day.points.at(-1)?.t === stamp) return null;

  const w: Record<string, number> = {};
  const x: string[] = [];
  for (const a of snapshot.attractions) {
    if (a.status === "opened") w[a.uuid] = a.waitingTime;
    else x.push(a.uuid);
  }

  day.points.push({ t: stamp, c: snapshot.crowdLevel?.level ?? null, w, x });
  await set(key, day);
  return day;
}

/** Drops day files older than the retention window. */
export async function pruneHistory(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const all = (await keys()).filter(isDayKey);
  await Promise.all(
    all.filter((k) => k.split(":")[2] < cutoff).map((k) => del(k)),
  );
}

export async function clearHistory(park?: ParkId): Promise<void> {
  const all = (await keys()).filter(isDayKey);
  const prefix = park ? `hist:${park}:` : "hist:";
  await Promise.all(
    all.filter((k) => k.startsWith(prefix)).map((k) => del(k)),
  );
}

export async function historySize(
  park: ParkId,
): Promise<{ days: number; points: number }> {
  const days = await listDays(park);
  const loaded = await Promise.all(days.map((d) => getDay(park, d)));
  return {
    days: days.length,
    points: loaded.reduce((n, d) => n + (d?.points.length ?? 0), 0),
  };
}
