"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ParkId } from "@/lib/parks";

const KEY = (park: ParkId) => `favorites:${park}`;
const EMPTY: string[] = [];

// localStorage is an external store, so it is read through
// `useSyncExternalStore` rather than an effect: that keeps the server snapshot
// (no favourites) consistent with the first client render, and avoids the
// extra render an effect-then-setState would cause.
const cache = new Map<ParkId, string[]>();
const listeners = new Set<() => void>();

function read(park: ParkId): string[] {
  const cached = cache.get(park);
  if (cached) return cached;
  let value: string[] = EMPTY;
  try {
    const raw = localStorage.getItem(KEY(park));
    if (raw) value = JSON.parse(raw) as string[];
  } catch {
    // Private browsing, or a corrupted entry: start from no favourites.
  }
  cache.set(park, value);
  return value;
}

function write(park: ParkId, value: string[]) {
  cache.set(park, value);
  try {
    localStorage.setItem(KEY(park), JSON.stringify(value));
  } catch {
    // Quota or private browsing: favourites just don't survive a reload.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Starred attractions, pinned to the top of the list. Per device. */
export function useFavorites(park: ParkId) {
  const stored = useSyncExternalStore(
    subscribe,
    () => read(park),
    () => EMPTY,
  );

  const favorites = useMemo(() => new Set(stored), [stored]);

  const toggle = useCallback(
    (uuid: string) => {
      const current = read(park);
      write(
        park,
        current.includes(uuid)
          ? current.filter((id) => id !== uuid)
          : [...current, uuid],
      );
    },
    [park],
  );

  return { favorites, toggle };
}
