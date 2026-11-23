"use client";

import { useEffect } from "react";
import { MapPin, X } from "lucide-react";
import {
  formatMinutes,
  formatTime,
  kindLabel,
  parkDay,
  parkMinutes,
  STATUS_LABEL,
  waitColor,
} from "@/lib/format";
import type { Park } from "@/lib/parks";
import { useHistoryDay, useRecentDays } from "@/lib/hooks/useHistory";
import { attractionSeries, hourlyProfile } from "@/lib/history/series";
import type { Attraction } from "@/lib/snapshot";
import HourlyBars from "@/components/charts/HourlyBars";
import TimeChart from "@/components/charts/TimeChart";
import KindIcon from "@/components/ui/KindIcon";
import StatusPill from "@/components/ui/StatusPill";

interface AttractionSheetProps {
  attraction: Attraction;
  park: Park;
  /** Calendar day the current reading belongs to, `YYYY-MM-DD`. */
  day: string;
  /** Timestamp of the reading being shown, ISO 8601. */
  updatedAt: string | null;
  onClose: () => void;
  onShowOnMap: (attraction: Attraction) => void;
}

export default function AttractionSheet({
  attraction,
  park,
  day: date,
  updatedAt,
  onClose,
  onShowOnMap,
}: AttractionSheetProps) {
  const today = parkDay(new Date(), park.timeZone);
  const { data: day } = useHistoryDay(park.id, date || null);
  const { data: recentDays } = useRecentDays(park.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const series = day ? attractionSeries(day, attraction.uuid, park.timeZone) : [];
  const recorded = series.filter((p) => p.v != null).map((p) => p.v!);
  const profile = hourlyProfile(
    recentDays ?? [],
    attraction.uuid,
    park.timeZone,
  );

  return (
    <div
      className="scrim-in fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={attraction.label}
        onClick={(e) => e.stopPropagation()}
        className="sheet-in pad-safe-bottom max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface px-4 pt-2 pb-4 shadow-[0_-8px_32px_rgb(0_0_0/0.18)] sm:rounded-3xl sm:pt-4"
      >
        <div
          aria-hidden
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/15 sm:hidden"
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg leading-snug font-semibold tracking-tight">
              {attraction.label}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <KindIcon kind={attraction.kind} className="size-3.5 shrink-0" />
              {kindLabel(attraction.kind) ?? "Attraction"}
              {attraction.label !== attraction.name && ` · ${attraction.name}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition-colors hover:text-foreground"
          >
            <X aria-hidden className="size-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div
            className="flex h-16 w-20 flex-col items-center justify-center rounded-2xl font-semibold text-white"
            style={
              attraction.status === "opened"
                ? { backgroundColor: waitColor(attraction.waitingTime), color: "#fff" }
                : { backgroundColor: "var(--surface-2)", color: "var(--muted)" }
            }
          >
            <span className="text-2xl leading-none tabular-nums">
              {attraction.status === "opened" ? attraction.waitingTime : "—"}
            </span>
            <span className="text-[10px] tracking-wide opacity-85">
              minutes
            </span>
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <StatusPill status={attraction.status} />
            <span className="text-xs text-muted">
              {attraction.status === "opened"
                ? `Relevé de ${formatTime(updatedAt, park.timeZone)}`
                : STATUS_LABEL[attraction.status]}
            </span>
          </div>
        </div>

        <section className="mt-5">
          <h3 className="mb-2 text-sm font-medium">
            {date === today ? "Aujourd'hui" : "Dernière journée relevée"}
          </h3>
          <TimeChart
            series={[
              {
                points: series,
                // The park accent, not the current wait's colour: a ride that
                // just closed would otherwise paint its whole busy day green.
                color: park.accent,
                label: `Attente — ${attraction.label}`,
                fill: true,
              },
            ]}
            nowMinutes={
              date === today ? parkMinutes(new Date(), park.timeZone) : null
            }
          />
          {recorded.length > 1 && (
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              <Metric
                label="Moyenne"
                value={formatMinutes(
                  Math.round(recorded.reduce((a, b) => a + b, 0) / recorded.length),
                )}
              />
              <Metric label="Maximum" value={formatMinutes(Math.max(...recorded))} />
              <Metric label="Minimum" value={formatMinutes(Math.min(...recorded))} />
            </dl>
          )}
        </section>

        <section className="mt-5">
          <h3 className="mb-1 text-sm font-medium">Journée type</h3>
          <p className="mb-2 text-xs text-muted">
            Moyenne par heure sur {recentDays?.length ?? 0} jour
            {(recentDays?.length ?? 0) > 1 ? "s" : ""} enregistré
            {(recentDays?.length ?? 0) > 1 ? "s" : ""}.
          </p>
          <HourlyBars data={profile} />
        </section>

        {attraction.lat != null && (
          <button
            type="button"
            onClick={() => onShowOnMap(attraction)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90"
          >
            <MapPin aria-hidden className="size-4" strokeWidth={2.25} />
            Voir sur la carte
          </button>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1.5">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
