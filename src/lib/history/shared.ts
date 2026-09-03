import "server-only";

import type { ParkId } from "@/lib/parks";

/**
 * Shared history is collected by `.github/workflows/collect-history.yml`, which
 * appends one file per park per day to the repository's `history` branch. This
 * module reads those files back.
 *
 * The repository is public, so both reads below work with no configuration.
 * `HISTORY_GITHUB_TOKEN` is optional: it only raises GitHub's unauthenticated
 * rate limit (60 requests/hour per IP) to 5 000, which the caching below keeps
 * us well clear of anyway.
 */

const REPO = process.env.HISTORY_REPO ?? "benjaminschaal/parc-attraction";
const BRANCH = process.env.HISTORY_BRANCH ?? "history";
const TOKEN = process.env.HISTORY_GITHUB_TOKEN;

export interface SharedPoint {
  t: string;
  c: number | null;
  w: Record<string, number>;
  x: string[];
}

async function fetchFromGitHub(path: string): Promise<string | null> {
  const url = TOKEN
    ? `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`
    : `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;

  const res = await fetch(url, {
    headers: {
      ...(TOKEN
        ? {
            authorization: `Bearer ${TOKEN}`,
            accept: "application/vnd.github.raw+json",
            "x-github-api-version": "2022-11-28",
          }
        : {}),
    },
    // Past days never change; today's file grows every 20 minutes.
    next: { revalidate: 300 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub responded ${res.status} for ${path}`);
  return res.text();
}

export async function readSharedDay(
  park: ParkId,
  date: string,
): Promise<{ points: SharedPoint[] } | null> {
  const body = await fetchFromGitHub(`${park}/${date}.json`);
  if (!body) return null;
  const parsed = JSON.parse(body) as { points?: SharedPoint[] };
  return { points: Array.isArray(parsed.points) ? parsed.points : [] };
}

/**
 * Dates for which a shared history file exists, newest first.
 *
 * The collector writes an index next to the day files, so the common path goes
 * through the same CDN-backed raw endpoint as the data: no token, and none of
 * the 60-requests-per-hour-per-IP cap the contents API applies without one —
 * a cap we would be sharing with every other tenant of this host. The contents
 * API stays as a fallback for park directories written before the index
 * existed.
 */
export async function listSharedDays(park: ParkId): Promise<string[]> {
  try {
    const body = await fetchFromGitHub(`${park}/index.json`);
    if (body) {
      const parsed = JSON.parse(body) as { dates?: unknown };
      if (Array.isArray(parsed.dates)) {
        return parsed.dates.filter((d): d is string => typeof d === "string");
      }
    }
  } catch {
    // Index missing or unreadable — fall through to the contents API.
  }

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${park}?ref=${BRANCH}`,
    {
      headers: {
        ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
      // Fifteen minutes: a new day file appears at most once a day, and this
      // keeps us far below the 60 requests/hour granted without a token.
      next: { revalidate: 900 },
    },
  );
  if (!res.ok) return [];
  const entries = (await res.json()) as { name: string }[];
  return entries
    .filter((e) => e.name.endsWith(".json"))
    .map((e) => e.name.replace(/\.json$/, ""))
    .sort()
    .reverse();
}
