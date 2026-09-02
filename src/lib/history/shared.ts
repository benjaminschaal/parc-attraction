import "server-only";

import type { ParkId } from "@/lib/parks";

/**
 * Shared history is collected by `.github/workflows/collect-history.yml`, which
 * appends one file per park per day to the repository's `history` branch. This
 * module reads those files back.
 *
 * Public repositories work with no configuration. For a private repository, set
 * `HISTORY_GITHUB_TOKEN` in the Vercel project so the contents API can be used;
 * without it the app simply falls back to the device-local history.
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

/** Dates for which a shared history file exists, newest first. */
export async function listSharedDays(park: ParkId): Promise<string[]> {
  if (!TOKEN) {
    // The raw endpoint cannot list a directory; without a token we can only
    // read the files whose names the client already knows (today, yesterday…).
    return [];
  }
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${park}?ref=${BRANCH}`,
    {
      headers: {
        authorization: `Bearer ${TOKEN}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
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
