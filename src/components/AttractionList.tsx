"use client";

import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { kindLabel, waitColor } from "@/lib/format";
import { attractionSeries, trend } from "@/lib/history/series";
import type { DayHistory } from "@/lib/history/localHistory";
import type { Attraction } from "@/lib/snapshot";
import Sparkline from "@/components/charts/Sparkline";
import KindIcon from "@/components/ui/KindIcon";
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
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            strokeWidth={2}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une attraction"
            aria-label="Rechercher une attraction"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pr-3 pl-9 text-sm placeholder:text-muted focus:border-accent focus-visible:outline-none"
          />
        </div>
        <div className="scroll-row -mx-4 flex items-center gap-1.5 overflow-x-auto px-4">
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
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
          {rows.map((a, i) => (
            <li key={a.uuid}>
              {i > 0 && <div className="ml-12 h-px bg-border" aria-hidden />}
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

  const isOpen = a.status === "opened";
  const kind = kindLabel(a.kind);

  return (
    <div className="flex items-center gap-1 py-2 pr-3 pl-1.5">
      <button
        type="button"
        onClick={() => onToggleFavorite(a.uuid)}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite
            ? `Retirer ${a.label} des favoris`
            : `Ajouter ${a.label} aux favoris`
        }
        className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors ${
          isFavorite
            ? "text-amber-500"
            : "text-foreground/25 hover:text-muted"
        }`}
      >
        <Star
          aria-hidden
          className="size-[18px]"
          strokeWidth={2}
          fill={isFavorite ? "currentColor" : "none"}
        />
      </button>

      <button
        type="button"
        onClick={() => onSelect(a)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
      >
        <div className="min-w-0 flex-1">
          <div
            className={`truncate text-[15px] leading-snug font-medium ${
              isOpen ? "" : "text-muted"
            }`}
          >
            {a.label}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted">
            <KindIcon kind={a.kind} className="size-3.5 shrink-0" />
            {/* Open is the normal case: only say so when it is not. */}
            {isOpen ? (
              <span className="truncate">{kind ?? "Attraction"}</span>
            ) : (
              <StatusPill status={a.status} />
            )}
            {isOpen && <TrendArrow delta={delta} />}
          </div>
        </div>

        <Sparkline
          points={series}
          color={isOpen ? waitColor(a.waitingTime) : "#94a3b8"}
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
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? "border-transparent bg-accent text-accent-ink"
          : "border-border bg-surface text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
