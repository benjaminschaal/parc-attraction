#!/usr/bin/env node
/**
 * Appends one wait-time snapshot per park to the shared history store.
 *
 * Run by `.github/workflows/collect-history.yml` every 20 minutes: it checks
 * out the `history` branch into $HISTORY_DIR, runs this script, and commits
 * whatever changed. The Wartezeiten API only exposes *current* wait times, so
 * this is the only way to accumulate a history that also covers the hours
 * nobody has the app open.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API = "https://api.wartezeiten.app/v1";
const OUT_DIR = process.env.HISTORY_DIR ?? "history-data";

const PARKS = [
  { id: "parcasterix", language: "de", timeZone: "Europe/Paris" },
  { id: "europapark", language: "en", timeZone: "Europe/Berlin" },
];

async function api(endpoint, headers) {
  const res = await fetch(`${API}/${endpoint}`, {
    headers: { accept: "application/json", ...headers },
  });
  if (!res.ok) throw new Error(`${endpoint} -> HTTP ${res.status}`);
  return res.json();
}

const parkDay = (date, timeZone) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);

async function collect(park) {
  const rows = await api("waitingtimes", {
    park: park.id,
    language: park.language,
  });
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`${park.id}: no data, skipped`);
    return;
  }

  const crowd = await api("crowdlevel", { park: park.id }).catch(() => null);
  const level = Array.isArray(crowd) ? crowd[0] : crowd;

  const stamp = rows[0].datetime ?? new Date().toISOString();
  const date = parkDay(new Date(stamp), park.timeZone);

  const w = {};
  const x = [];
  for (const row of rows) {
    if (row.status === "opened") w[row.uuid] = row.waitingtime ?? 0;
    else x.push(row.uuid);
  }

  const dir = path.join(OUT_DIR, park.id);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${date}.json`);

  let day = { park: park.id, date, points: [] };
  try {
    day = JSON.parse(await readFile(file, "utf8"));
    if (!Array.isArray(day.points)) day.points = [];
  } catch {
    // First snapshot of the day.
  }

  if (day.points.at(-1)?.t === stamp) {
    console.log(`${park.id}: ${stamp} already recorded, skipped`);
    return;
  }

  day.points.push({
    t: stamp,
    c: typeof level?.crowd_level === "number" ? level.crowd_level : null,
    w,
    x,
  });
  await writeFile(file, `${JSON.stringify(day)}\n`);
  console.log(
    `${park.id}: recorded ${stamp} (${Object.keys(w).length} open, ${x.length} closed) -> ${file}`,
  );
}

let failed = false;
for (const park of PARKS) {
  try {
    await collect(park);
  } catch (error) {
    failed = true;
    console.error(`${park.id}: ${error.message}`);
  }
}
// A single park failing must not lose the other park's snapshot, but the run
// should still be visibly red so an API change does not rot silently.
process.exit(failed ? 1 : 0);
