#!/usr/bin/env node
/**
 * Appends one wait-time snapshot per park to the shared history store.
 *
 * Run by `.github/workflows/collect-history.yml` every 30 minutes: it checks
 * out the `history` branch into $HISTORY_DIR, runs this script, and commits
 * whatever changed. Neither wait-time API exposes anything but the *current*
 * wait times, so this is the only way to accumulate a history that also covers
 * the hours nobody has the app open.
 *
 * The park list and the sources mirror `src/lib/parks.ts` — same ids, same
 * providers, same attraction ids, so a point written here merges with one the
 * app recorded on a device.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const WARTEZEITEN = "https://api.wartezeiten.app/v1";
const QUEUE_TIMES = "https://queue-times.com";
const OUT_DIR = process.env.HISTORY_DIR ?? "history-data";

const PARKS = [
  {
    id: "parcasterix",
    timeZone: "Europe/Paris",
    source: { provider: "wartezeiten", parkId: "parcasterix", language: "de" },
  },
  {
    id: "europapark",
    timeZone: "Europe/Berlin",
    source: { provider: "wartezeiten", parkId: "europapark", language: "en" },
  },
  {
    id: "walibirhonealpes",
    timeZone: "Europe/Paris",
    source: { provider: "queuetimes", parkId: 301 },
  },
  {
    id: "disneylandparis",
    timeZone: "Europe/Paris",
    source: {
      provider: "wartezeiten",
      parkId: "disneylandparis",
      language: "en",
    },
  },
  {
    id: "disneyadventureworld",
    timeZone: "Europe/Paris",
    source: {
      provider: "wartezeiten",
      parkId: "disneyadventureworld",
      language: "en",
    },
  },
  {
    id: "futuroscope",
    timeZone: "Europe/Paris",
    source: { provider: "wartezeiten", parkId: "futuroscope", language: "en" },
  },
  {
    id: "nigloland",
    timeZone: "Europe/Paris",
    source: { provider: "wartezeiten", parkId: "nigloland", language: "en" },
  },
];

async function json(url, headers) {
  const res = await fetch(url, {
    headers: { accept: "application/json", ...headers },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

const parkDay = (date, timeZone) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);

/** `{ stamp, crowd, w, x }` for a park, whatever API it is served by. */
async function readSource(source) {
  if (source.provider === "queuetimes") {
    const data = await json(
      `${QUEUE_TIMES}/parks/${source.parkId}/queue_times.json`,
    );
    const rides = [
      ...(data.rides ?? []),
      ...(data.lands ?? []).flatMap((l) => l.rides ?? []),
    ];
    if (rides.length === 0) return null;

    // Null-prototype: `w` is keyed by ids an API gave us, and "__proto__" on
    // an object literal would set the prototype instead of storing the wait.
    const w = Object.create(null);
    const x = [];
    for (const ride of rides) {
      // Ids are namespaced exactly as in src/lib/queuetimes/server.ts, so the
      // shared history and a device's local history key on the same strings.
      const uuid = `qt-${ride.id}`;
      if (ride.is_open) w[uuid] = ride.wait_time ?? 0;
      else x.push(uuid);
    }

    // Queue-Times timestamps each ride separately; the most recent one is the
    // reading's own time, and what the de-duplication below keys on.
    const stamps = rides
      .map((r) => Date.parse(r.last_updated ?? ""))
      .filter((t) => !Number.isNaN(t));
    const stamp = stamps.length
      ? new Date(Math.max(...stamps)).toISOString()
      : new Date().toISOString();

    // Queue-Times publishes no crowd index.
    return { stamp, crowd: null, w, x };
  }

  const rows = await json(`${WARTEZEITEN}/waitingtimes`, {
    park: source.parkId,
    language: source.language,
  });
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const crowd = await json(`${WARTEZEITEN}/crowdlevel`, {
    park: source.parkId,
  }).catch(() => null);
  const level = Array.isArray(crowd) ? crowd[0] : crowd;

  const w = Object.create(null);
  const x = [];
  for (const row of rows) {
    if (row.status === "opened") w[row.uuid] = row.waitingtime ?? 0;
    else x.push(row.uuid);
  }

  return {
    stamp: rows[0].datetime ?? new Date().toISOString(),
    crowd: typeof level?.crowd_level === "number" ? level.crowd_level : null,
    w,
    x,
  };
}

async function collect(park) {
  const reading = await readSource(park.source);
  if (!reading) {
    console.log(`${park.id}: no data, skipped`);
    return;
  }

  const { stamp, crowd, w, x } = reading;
  const date = parkDay(new Date(stamp), park.timeZone);

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

  day.points.push({ t: stamp, c: crowd, w, x });
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
// A single park failing must not lose the other parks' snapshots, but the run
// should still be visibly red so an API change does not rot silently.
process.exit(failed ? 1 : 0);
