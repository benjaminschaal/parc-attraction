"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Park } from "@/lib/parks";
import { parkDay } from "@/lib/format";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useHistoryDay, useHistoryRecorder } from "@/lib/hooks/useHistory";
import { useParkSnapshot } from "@/lib/hooks/useParkSnapshot";
import type { Attraction, ParkSnapshot } from "@/lib/wartezeiten/types";
import AttractionList from "@/components/AttractionList";
import AttractionSheet from "@/components/AttractionSheet";
import HistoryView from "@/components/HistoryView";
import ParkHeader from "@/components/ParkHeader";
import Legend from "@/components/ui/Legend";

// MapLibre touches `window` at import time and pulls in ~200 kB, so the map
// only loads once the user actually opens that tab.
const ParkMap = dynamic(() => import("@/components/map/ParkMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[62vh] min-h-80 animate-pulse rounded-xl border border-border bg-surface-2" />
  ),
});

const TABS = [
  { id: "liste", label: "Attentes" },
  { id: "carte", label: "Carte" },
  { id: "historique", label: "Historique" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ParkView({
  park,
  initialSnapshot,
}: {
  park: Park;
  initialSnapshot?: ParkSnapshot;
}) {
  const [tab, setTab] = useState<TabId>("liste");
  const [sheet, setSheet] = useState<Attraction | null>(null);
  const [mapFocus, setMapFocus] = useState<string | null>(null);

  const { data, error, isFetching, refetch } = useParkSnapshot(
    park.id,
    initialSnapshot,
  );
  useHistoryRecorder(data);

  // The day the current reading belongs to, not the wall-clock day: parks
  // close in the evening and the API keeps serving that last reading all
  // night, so "today" would come up empty and drop every sparkline and trend.
  const readingStamp = data?.updatedAt ?? data?.fetchedAt ?? null;
  const readingDay = readingStamp
    ? parkDay(new Date(readingStamp), park.timeZone)
    : null;
  const { data: readingDayHistory } = useHistoryDay(park.id, readingDay);
  const { favorites, toggle } = useFavorites(park.id);

  const attractions = data?.attractions ?? [];

  return (
    <div className="flex min-h-dvh flex-col pad-safe-top pad-safe-x">
      <div className="safe-top-scrim" aria-hidden />

      <ParkHeader
        park={park}
        snapshot={data}
        isFetching={isFetching}
        onRefresh={() => void refetch()}
      />

      <div className="sticky stick-below-safe-top z-30 border-b border-border bg-background/92 backdrop-blur">
        <div
          role="tablist"
          aria-label="Vues"
          className="mx-auto flex w-full max-w-3xl gap-1 px-4 py-2"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:bg-surface-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        {error && (
          <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {error.message}
          </p>
        )}

        {!data && !error && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-border bg-surface-2"
              />
            ))}
          </div>
        )}

        {data && tab === "liste" && (
          <div className="flex flex-col gap-4">
            <AttractionList
              attractions={attractions}
              history={readingDayHistory}
              timeZone={park.timeZone}
              favorites={favorites}
              onToggleFavorite={toggle}
              onSelect={setSheet}
            />
            <Legend />
          </div>
        )}

        {data && tab === "carte" && (
          <ParkMap
            park={park}
            attractions={attractions}
            focusUuid={mapFocus}
            onSelect={setSheet}
          />
        )}

        {data && tab === "historique" && (
          <HistoryView
            park={park}
            attractions={attractions}
            onSelect={setSheet}
          />
        )}
      </main>

      <footer className="pad-safe-bottom border-t border-border px-4 py-4 text-center text-[11px] text-muted">
        Données fournies par{" "}
        <a
          href="https://www.wartezeiten.app/"
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-2"
        >
          wartezeiten.app
        </a>{" "}
        · sans garantie d&apos;exactitude
      </footer>

      {sheet && (
        <AttractionSheet
          attraction={
            attractions.find((a) => a.uuid === sheet.uuid) ?? sheet
          }
          park={park}
          day={readingDay ?? ""}
          updatedAt={data?.updatedAt ?? null}
          onClose={() => setSheet(null)}
          onShowOnMap={(a) => {
            setSheet(null);
            setMapFocus(a.uuid);
            setTab("carte");
          }}
        />
      )}
    </div>
  );
}
