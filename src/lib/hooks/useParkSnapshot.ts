"use client";

import { useQuery } from "@tanstack/react-query";
import type { ParkId } from "@/lib/parks";
import type { ParkSnapshot } from "@/lib/snapshot";

const REFRESH_MS = 60_000;

async function fetchSnapshot(park: ParkId): Promise<ParkSnapshot> {
  const res = await fetch(`/api/park/${park}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Impossible de récupérer les temps d'attente.");
  }
  return res.json();
}

export function useParkSnapshot(park: ParkId, initialData?: ParkSnapshot) {
  return useQuery({
    queryKey: ["park", park],
    queryFn: () => fetchSnapshot(park),
    initialData,
    // The page is server-rendered up to two minutes stale; treat the injected
    // snapshot as that old so the first client refresh happens promptly.
    initialDataUpdatedAt: initialData
      ? new Date(initialData.fetchedAt).getTime()
      : undefined,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}
