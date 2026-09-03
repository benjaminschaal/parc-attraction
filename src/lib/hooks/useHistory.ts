"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getPark, type ParkId } from "@/lib/parks";
import { parkDay } from "@/lib/format";
import {
  getDay,
  listDays,
  pruneHistory,
  recordSnapshot,
  type DayHistory,
  type HistoryPoint,
} from "@/lib/history/localHistory";
import type { ParkSnapshot } from "@/lib/wartezeiten/types";

/**
 * A day of history is the union of two sources: what this device recorded
 * while the app was open (IndexedDB) and what the GitHub Action recorded
 * around the clock (`/api/history`). Both use the same point shape and the
 * same upstream timestamps, so merging is a de-duplication on `t`.
 */
async function loadDay(park: ParkId, date: string): Promise<DayHistory> {
  const [local, sharedRes] = await Promise.all([
    getDay(park, date),
    fetch(`/api/history?park=${park}&date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const shared: HistoryPoint[] = Array.isArray(sharedRes?.points)
    ? sharedRes.points
    : [];

  const byTime = new Map<string, HistoryPoint>();
  for (const p of shared) byTime.set(p.t, p);
  // Local points win: they carry exactly what this device saw.
  for (const p of local?.points ?? []) byTime.set(p.t, p);

  return {
    park,
    date,
    points: [...byTime.values()].sort((a, b) => a.t.localeCompare(b.t)),
  };
}

/** `date` may be null while the first snapshot is still in flight. */
export function useHistoryDay(park: ParkId, date: string | null) {
  return useQuery({
    queryKey: ["history", park, date],
    queryFn: () => loadDay(park, date!),
    enabled: date != null,
    staleTime: 60_000,
  });
}

export function useRecordedDays(park: ParkId) {
  return useQuery({
    queryKey: ["history-days", park],
    queryFn: async () => {
      const [local, sharedRes] = await Promise.all([
        listDays(park),
        fetch(`/api/history?park=${park}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      const shared: string[] = Array.isArray(sharedRes?.dates)
        ? sharedRes.dates
        : [];
      return [...new Set([...local, ...shared])].sort().reverse();
    },
    staleTime: 300_000,
  });
}

/** Persists every fresh snapshot, so simply using the app builds the history. */
export function useHistoryRecorder(snapshot: ParkSnapshot | undefined) {
  const queryClient = useQueryClient();
  const stamp = snapshot?.updatedAt ?? snapshot?.fetchedAt;

  useEffect(() => {
    if (!snapshot) return;
    let cancelled = false;
    void (async () => {
      const day = await recordSnapshot(snapshot);
      if (cancelled || !day) return;
      const config = getPark(snapshot.park);
      if (!config) return;
      const today = parkDay(new Date(), config.timeZone);
      void queryClient.invalidateQueries({
        queryKey: ["history", snapshot.park, today],
      });
      void queryClient.invalidateQueries({
        queryKey: ["history-days", snapshot.park],
      });
    })();
    return () => {
      cancelled = true;
    };
    // `stamp` is what actually changes between polls; the snapshot object is
    // recreated on every refetch even when the data is identical.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, queryClient]);

  useEffect(() => {
    void pruneHistory();
  }, []);
}

/**
 * The most recent recorded days, used to build the "typical day" profile.
 * Capped because each day costs one request to the shared store.
 */
export function useRecentDays(park: ParkId, count = 7) {
  const { data: dates } = useRecordedDays(park);
  const wanted = (dates ?? []).slice(0, count);

  return useQuery({
    queryKey: ["history-recent", park, wanted],
    queryFn: async () => Promise.all(wanted.map((d) => loadDay(park, d))),
    enabled: wanted.length > 0,
    staleTime: 300_000,
  });
}
