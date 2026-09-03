"use client";

import Link from "next/link";
import { PARKS, type Park } from "@/lib/parks";
import {
  formatDateLong,
  formatTime,
  relativeFromNow,
} from "@/lib/format";
import CrowdGauge from "@/components/ui/CrowdGauge";
import type { ParkSnapshot } from "@/lib/snapshot";

interface ParkHeaderProps {
  park: Park;
  snapshot: ParkSnapshot | undefined;
  isFetching: boolean;
  onRefresh: () => void;
}

export default function ParkHeader({
  park,
  snapshot,
  isFetching,
  onRefresh,
}: ParkHeaderProps) {
  const open = snapshot?.attractions.filter((a) => a.status === "opened") ?? [];
  const waits = open.map((a) => a.waitingTime);
  const average = waits.length
    ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
    : null;
  const peak = waits.length ? Math.max(...waits) : null;

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pt-3 pb-4">
        <nav className="flex gap-1.5" aria-label="Choix du parc">
          {PARKS.map((p) => (
            <Link
              key={p.id}
              href={`/parc/${p.id}`}
              aria-current={p.id === park.id ? "page" : undefined}
              className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
                p.id === park.id
                  ? "border-transparent bg-foreground text-background"
                  : "border-border text-muted hover:bg-surface-2"
              }`}
            >
              <span aria-hidden className="mr-1.5">
                {p.flag}
              </span>
              {p.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{park.name}</h1>
            <p className="text-xs text-muted first-letter:uppercase">
              {formatDateLong(new Date(), park.timeZone)}
              {snapshot?.opening?.openedToday
                ? ` · ouvert de ${formatTime(snapshot.opening.openFrom, park.timeZone)} à ${formatTime(snapshot.opening.closedFrom, park.timeZone)}`
                : snapshot?.opening
                  ? " · fermé aujourd'hui"
                  : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {isFetching ? "…" : "Actualiser"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Ouvertes" value={open.length ? `${open.length}` : "0"} />
          <Stat
            label="Attente moy."
            value={average == null ? "—" : `${average} min`}
          />
          <Stat label="Max" value={peak == null ? "—" : `${peak} min`} />
        </div>

        {snapshot?.crowdLevel && <CrowdGauge level={snapshot.crowdLevel.level} />}

        <p className="flex items-center gap-1.5 text-[11px] text-muted">
          <span
            className={`inline-block size-1.5 rounded-full ${isFetching ? "live-dot bg-amber-500" : "bg-emerald-500"}`}
            aria-hidden
          />
          Données wartezeiten.app
          {snapshot?.updatedAt
            ? ` · relevé de ${formatTime(snapshot.updatedAt, park.timeZone)} (${relativeFromNow(snapshot.updatedAt)})`
            : ""}
        </p>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
