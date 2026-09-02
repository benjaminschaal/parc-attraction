"use client";

import { useMemo, useState } from "react";
import { kindIcon, waitColor } from "@/lib/format";
import { attractionSeries, trend } from "@/lib/history/series";
import type { DayHistory } from "@/lib/history/localHistory";
import type { Attraction } from "@/lib/wartezeiten/types";
import Sparkline from "@/components/charts/Sparkline";
import StatusPill from "@/components/ui/StatusPill";
import TrendArrow from "@/components/ui/TrendArrow";
import WaitBadge from "@/components/ui/WaitBadge";

export type SortKey = "nom" | "attente" | "attente-asc";

interface AttractionListProps {
  attractions: Attraction[];
  history: DayHistory | undefined;
  timeZone: string;
  favorites: Set<string>;
  onToggleFavorite: (uuid: string) => void;
  onSelect: (attraction: Attraction) => void;
}

const STATUS_ORDER: Record<string, number> = {
  opened: 0,
  virtualqueue: 1,
  maintenance: 2,
  closedweather: 3,
  closedice: 3,
  closed: 4,
};

export default function AttractionList({
  attractions,
  history,
  timeZone,
  favorites,
  onToggleFavorite,
  onSelect,
}: AttractionListProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("attente");
  const [openOnly, setOpenOnly] = useState(false);

  const rows = useMemo(() => {
    const needle = query
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();

    const filtered = attractions.filter((a) => {
      if (openOnly && a.status !== "opened") return false;
      if (!needle) return true;
      return a.label
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .includes(needle);
    });

    return [...filtered].sort((a, b) => {
      const favA = favorites.has(a.uuid) ? 0 : 1;
      const favB = favorites.has(b.uuid) ? 0 : 1;
      if (favA !== favB) return favA - favB;

      if (sort === "nom") return a.label.localeCompare(b.label, "fr");

      const orderA = STATUS_ORDER[a.status] ?? 9;
      const orderB = STATUS_ORDER[b.status] ?? 9;
      if (orderA !== orderB) return orderA - orderB;
      if (a.status !== "opened") return a.label.localeCompare(b.label, "fr");

      const diff =
        sort === "attente"
          ? b.waitingTime - a.waitingTime
          : a.waitingTime - b.waitingTime;
      return diff !== 0 ? diff : a.label.localeCompare(b.label, "fr");
    });
  }, [attractions, query, sort, openOnly, favorites]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une attraction"
          aria-label="Rechercher une attraction"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-foreground/30"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={sort === "attente"} onClick={() => setSort("attente")}>
            Plus longues
          </Chip>
          <Chip
            active={sort === "attente-asc"}
            onClick={() => setSort("attente-asc")}
          >
            Plus courtes
          </Chip>
          <Chip active={sort === "nom"} onClick={() => setSort("nom")}>
            A → Z
          </Chip>
          <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
          <Chip active={openOnly} onClick={() => setOpenOnly((v) => !v)}>
            Ouvertes seulement
          </Chip>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          Aucune attraction ne correspond.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {rows.map((a, i) => (
            <li key={a.uuid}>
              {i > 0 && <div className="ml-4 h-px bg-border" aria-hidden />}
              <Row
                attraction={a}
                history={history}
                timeZone={timeZone}
                isFavorite={favorites.has(a.uuid)}
                onToggleFavorite={onToggleFavorite}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  attraction: a,
  history,
  timeZone,
  isFavorite,
  onToggleFavorite,
  onSelect,
}: {
  attraction: Attraction;
  history: DayHistory | undefined;
  timeZone: string;
  isFavorite: boolean;
  onToggleFavorite: (uuid: string) => void;
  onSelect: (a: Attraction) => void;
}) {
  const series = history ? attractionSeries(history, a.uuid, timeZone) : [];
  const delta = trend(history ?? null, a.uuid);

  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <button
        type="button"
        onClick={() => onToggleFavorite(a.uuid)}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite
            ? `Retirer ${a.label} des favoris`
            : `Ajouter ${a.label} aux favoris`
        }
        className={`shrink-0 rounded-md p-1 text-base leading-none transition-colors ${
          isFavorite ? "text-amber-500" : "text-muted/40 hover:text-muted"
        }`}
      >
        {isFavorite ? "★" : "☆"}
      </button>

      <button
        type="button"
        onClick={() => onSelect(a)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="text-sm">
              {kindIcon(a.kind)}
            </span>
            <span className="truncate text-sm font-medium">{a.label}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <StatusPill status={a.status} />
            {a.status === "opened" && <TrendArrow delta={delta} />}
          </div>
        </div>

        <Sparkline
          points={series}
          color={a.status === "opened" ? waitColor(a.waitingTime) : "#94a3b8"}
        />
        <WaitBadge minutes={a.waitingTime} status={a.status} />
      </button>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-transparent bg-foreground text-background"
          : "border-border text-muted hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
