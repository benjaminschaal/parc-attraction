"use client";

import { RotateCw } from "lucide-react";
import { getSource, type Park } from "@/lib/parks";
import {
  formatDateLong,
  formatTime,
  relativeFromNow,
} from "@/lib/format";
import CrowdGauge from "@/components/ui/CrowdGauge";
import ParkHero from "@/components/ParkHero";
import ParkPicker from "@/components/ParkPicker";
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
    <header className="park-wash border-b border-border">
      <ParkHero key={park.id} park={park} />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-3 pb-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {/* The picker is the page title: the park's name appears once. */}
            <ParkPicker key={park.id} park={park} />
            <p className="mt-0.5 pl-0.5 text-xs text-muted first-letter:uppercase">
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
            aria-label="Actualiser les temps d'attente"
            title="Actualiser"
            className="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-border bg-surface/70 text-muted transition-colors hover:text-foreground disabled:cursor-progress"
          >
            <RotateCw
              aria-hidden
              className={`size-4 ${isFetching ? "spin" : ""}`}
              strokeWidth={2}
            />
          </button>
        </div>

        {/* Three figures read as one sentence, not three boxes. */}
        <dl className="grid grid-cols-3 divide-x divide-border">
          <Stat label="ouvertes" value={`${open.length}`} />
          <Stat
            label="d'attente moyenne"
            value={average == null ? "—" : `${average}`}
            unit={average == null ? undefined : "min"}
          />
          <Stat
            label="au plus long"
            value={peak == null ? "—" : `${peak}`}
            unit={peak == null ? undefined : "min"}
          />
        </dl>

        {snapshot?.crowdLevel && <CrowdGauge level={snapshot.crowdLevel.level} />}

        <p className="flex items-center gap-1.5 text-[11px] text-muted">
          <span
            className={`inline-block size-1.5 shrink-0 rounded-full ${isFetching ? "live-dot bg-amber-500" : "bg-emerald-500"}`}
            aria-hidden
          />
          <span>
            {getSource(park).credit}
            {snapshot?.updatedAt
              ? ` · relevé de ${formatTime(snapshot.updatedAt, park.timeZone)} (${relativeFromNow(snapshot.updatedAt)})`
              : ""}
          </span>
        </p>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex flex-col-reverse px-3 first:pl-0.5 last:pr-0">
      <dt className="text-[11px] leading-tight text-muted">{label}</dt>
      <dd className="text-2xl font-semibold tracking-tight tabular-nums">
        {value}
        {unit && (
          <span className="ml-0.5 text-sm font-medium text-muted">{unit}</span>
        )}
      </dd>
    </div>
  );
}
