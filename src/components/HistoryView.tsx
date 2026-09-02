"use client";

import { useMemo, useState } from "react";
import {
  formatClock,
  formatMinutes,
  parkDay,
  parkMinutes,
  waitColor,
} from "@/lib/format";
import type { Park } from "@/lib/parks";
import { clearHistory } from "@/lib/history/localHistory";
import { useHistoryDay, useRecentDays, useRecordedDays } from "@/lib/hooks/useHistory";
import {
  crowdSeries,
  hourlyProfile,
  parkAverageSeries,
  rankAttractions,
  summariseDay,
} from "@/lib/history/series";
import type { Attraction } from "@/lib/wartezeiten/types";
import HourlyBars from "@/components/charts/HourlyBars";
import TimeChart from "@/components/charts/TimeChart";

interface HistoryViewProps {
  park: Park;
  attractions: Attraction[];
  onSelect: (attraction: Attraction) => void;
}

export default function HistoryView({
  park,
  attractions,
  onSelect,
}: HistoryViewProps) {
  const today = parkDay(new Date(), park.timeZone);
  const { data: days, refetch: refetchDays } = useRecordedDays(park.id);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const date = selectedDate ?? days?.[0] ?? today;

  const { data: day } = useHistoryDay(park.id, date);
  const { data: recentDays } = useRecentDays(park.id);

  const labels = useMemo(
    () => new Map(attractions.map((a) => [a.uuid, a.label])),
    [attractions],
  );
  const byUuid = useMemo(
    () => new Map(attractions.map((a) => [a.uuid, a])),
    [attractions],
  );

  const summary = day ? summariseDay(day, park.timeZone) : null;
  const ranking = day ? rankAttractions(day).slice(0, 8) : [];
  const profile = hourlyProfile(recentDays ?? [], null, park.timeZone);
  const hasPoints = (day?.points.length ?? 0) > 1;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-border bg-surface p-3">
        <h2 className="text-sm font-medium">Historique</h2>
        <p className="mt-1 text-xs text-muted">
          L&apos;API ne publie que les temps d&apos;attente instantanés.
          L&apos;app enregistre donc chaque relevé qu&apos;elle reçoit — laissez-la
          ouverte pendant la visite pour couvrir toute la journée.
        </p>
        {(days?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {days!.slice(0, 14).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                aria-pressed={d === date}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  d === date
                    ? "border-transparent bg-foreground text-background"
                    : "border-border text-muted hover:bg-surface-2"
                }`}
              >
                {d === today ? "Aujourd'hui" : formatDayChip(d)}
              </button>
            ))}
          </div>
        )}
      </section>

      {!hasPoints ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          Aucun relevé pour cette journée pour l&apos;instant.
        </p>
      ) : (
        <>
          <section className="rounded-xl border border-border bg-surface p-3">
            <h3 className="mb-2 text-sm font-medium">
              Attente moyenne du parc
            </h3>
            <TimeChart
              series={[
                {
                  points: parkAverageSeries(day!, park.timeZone),
                  color: park.accent,
                  label: "Attente moyenne",
                  fill: true,
                },
              ]}
              height={170}
              nowMinutes={
                date === today ? parkMinutes(new Date(), park.timeZone) : null
              }
            />
            {summary && (
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric
                  label="Moyenne"
                  value={summary.avgWait == null ? "—" : formatMinutes(summary.avgWait)}
                />
                <Metric
                  label="Pic"
                  value={summary.peakWait == null ? "—" : formatMinutes(summary.peakWait)}
                />
                <Metric
                  label="Heure du pic"
                  value={summary.peakAt == null ? "—" : formatClock(summary.peakAt)}
                />
              </dl>
            )}
          </section>

          {crowdSeries(day!, park.timeZone).length > 1 && (
            <section className="rounded-xl border border-border bg-surface p-3">
              <h3 className="mb-2 text-sm font-medium">
                Indice d&apos;affluence
              </h3>
              <TimeChart
                series={[
                  {
                    points: crowdSeries(day!, park.timeZone),
                    color: "#8b5cf6",
                    label: "Affluence",
                    fill: true,
                  },
                ]}
                height={130}
                unit="/100"
              />
            </section>
          )}

          <section className="rounded-xl border border-border bg-surface p-3">
            <h3 className="mb-2 text-sm font-medium">
              Attractions les plus chargées
            </h3>
            <ul className="flex flex-col gap-1.5">
              {ranking.map((r) => {
                const attraction = byUuid.get(r.uuid);
                return (
                  <li key={r.uuid}>
                    <button
                      type="button"
                      disabled={!attraction}
                      onClick={() => attraction && onSelect(attraction)}
                      className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-surface-2 disabled:cursor-default"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {labels.get(r.uuid) ?? "Attraction retirée"}
                      </span>
                      <span className="text-[11px] text-muted">
                        max {r.max} min
                      </span>
                      <span
                        className="w-14 shrink-0 rounded-md py-1 text-center text-xs font-semibold text-white tabular-nums"
                        style={{ backgroundColor: waitColor(r.avg) }}
                      >
                        {r.avg} min
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <section className="rounded-xl border border-border bg-surface p-3">
        <h3 className="mb-1 text-sm font-medium">Journée type</h3>
        <p className="mb-2 text-xs text-muted">
          Attente moyenne par heure, tous relevés confondus sur{" "}
          {recentDays?.length ?? 0} jour{(recentDays?.length ?? 0) > 1 ? "s" : ""}.
        </p>
        <HourlyBars data={profile} />
      </section>

      <button
        type="button"
        onClick={async () => {
          if (!confirm("Effacer l'historique enregistré sur cet appareil ?")) return;
          await clearHistory(park.id);
          setSelectedDate(null);
          await refetchDays();
          location.reload();
        }}
        className="self-start text-xs text-muted underline underline-offset-2"
      >
        Effacer l&apos;historique local
      </button>
    </div>
  );
}

function formatDayChip(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-1.5">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
