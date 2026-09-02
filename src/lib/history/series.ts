import { parkMinutes } from "@/lib/format";
import type { DayHistory, HistoryPoint } from "./localHistory";

export interface SeriePoint {
  /** Minutes since local midnight, used as the x axis. */
  m: number;
  /** Wait in minutes, or `null` while the ride was closed. */
  v: number | null;
}

/** Wait-time curve of one attraction over a recorded day. */
export function attractionSeries(
  day: DayHistory,
  uuid: string,
  timeZone: string,
): SeriePoint[] {
  return day.points.map((p) => ({
    m: parkMinutes(new Date(p.t), timeZone),
    v: uuid in p.w ? p.w[uuid] : null,
  }));
}

/** Mean wait across every open attraction, point by point. */
export function parkAverageSeries(
  day: DayHistory,
  timeZone: string,
): SeriePoint[] {
  return day.points.map((p) => {
    const values = Object.values(p.w);
    return {
      m: parkMinutes(new Date(p.t), timeZone),
      v: values.length
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : null,
    };
  });
}

export function crowdSeries(
  day: DayHistory,
  timeZone: string,
): SeriePoint[] {
  return day.points
    .filter((p) => p.c != null)
    .map((p) => ({ m: parkMinutes(new Date(p.t), timeZone), v: p.c }));
}

/**
 * Change in wait time over the last `window` minutes of recorded history,
 * used for the trend arrows in the list. `null` when there is not enough
 * history yet to say anything.
 */
export function trend(
  day: DayHistory | null,
  uuid: string,
  windowMinutes = 45,
): number | null {
  if (!day || day.points.length < 2) return null;
  const last = day.points.at(-1)!;
  if (!(uuid in last.w)) return null;

  const cutoff = new Date(last.t).getTime() - windowMinutes * 60_000;
  let reference: HistoryPoint | null = null;
  for (let i = day.points.length - 2; i >= 0; i--) {
    const p = day.points[i];
    if (!(uuid in p.w)) continue;
    reference = p;
    if (new Date(p.t).getTime() <= cutoff) break;
  }
  if (!reference) return null;
  return last.w[uuid] - reference.w[uuid];
}

/** Averages several days into a per-hour profile, for the typical-day chart. */
export function hourlyProfile(
  days: DayHistory[],
  uuid: string | null,
  timeZone: string,
): { hour: number; avg: number; max: number; samples: number }[] {
  const buckets = new Map<number, number[]>();
  for (const day of days) {
    for (const p of day.points) {
      const values = uuid
        ? uuid in p.w
          ? [p.w[uuid]]
          : []
        : Object.values(p.w);
      if (!values.length) continue;
      const hour = Math.floor(parkMinutes(new Date(p.t), timeZone) / 60);
      const bucket = buckets.get(hour) ?? [];
      bucket.push(values.reduce((a, b) => a + b, 0) / values.length);
      buckets.set(hour, bucket);
    }
  }
  return [...buckets.entries()]
    .map(([hour, values]) => ({
      hour,
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      max: Math.round(Math.max(...values)),
      samples: values.length,
    }))
    .sort((a, b) => a.hour - b.hour);
}

export interface DaySummary {
  date: string;
  points: number;
  avgWait: number | null;
  peakWait: number | null;
  peakAt: number | null;
  busiest: { uuid: string; wait: number } | null;
}

export function summariseDay(day: DayHistory, timeZone: string): DaySummary {
  let sum = 0;
  let count = 0;
  let peakWait: number | null = null;
  let peakAt: number | null = null;
  let busiest: { uuid: string; wait: number } | null = null;

  for (const p of day.points) {
    const values = Object.values(p.w);
    if (!values.length) continue;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    sum += avg;
    count += 1;
    if (peakWait == null || avg > peakWait) {
      peakWait = avg;
      peakAt = parkMinutes(new Date(p.t), timeZone);
    }
    for (const [uuid, wait] of Object.entries(p.w)) {
      if (!busiest || wait > busiest.wait) busiest = { uuid, wait };
    }
  }

  return {
    date: day.date,
    points: day.points.length,
    avgWait: count ? Math.round(sum / count) : null,
    peakWait: peakWait == null ? null : Math.round(peakWait),
    peakAt,
    busiest,
  };
}

export interface AttractionRanking {
  uuid: string;
  avg: number;
  max: number;
  samples: number;
}

/** Per-attraction averages over a recorded day, busiest first. */
export function rankAttractions(day: DayHistory): AttractionRanking[] {
  const totals = new Map<string, { sum: number; max: number; n: number }>();
  for (const p of day.points) {
    for (const [uuid, wait] of Object.entries(p.w)) {
      const t = totals.get(uuid) ?? { sum: 0, max: 0, n: 0 };
      t.sum += wait;
      t.max = Math.max(t.max, wait);
      t.n += 1;
      totals.set(uuid, t);
    }
  }
  return [...totals.entries()]
    .map(([uuid, t]) => ({
      uuid,
      avg: Math.round(t.sum / t.n),
      max: t.max,
      samples: t.n,
    }))
    .sort((a, b) => b.avg - a.avg);
}
