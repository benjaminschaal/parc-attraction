"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LngLatBounds, Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { kindIcon, waitColor } from "@/lib/format";
import type { Park } from "@/lib/parks";
import type { Attraction } from "@/lib/snapshot";
import StatusPill from "@/components/ui/StatusPill";

// OpenFreeMap: free vector tiles, no API key, no usage cap.
const MAP_STYLE = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/fiord",
};

const DARK_QUERY = "(prefers-color-scheme: dark)";

// See scripts/copy-maplibre-worker.mjs for why this is set by hand.
setWorkerUrl("/maplibre-gl-worker.mjs");

interface ParkMapProps {
  park: Park;
  attractions: Attraction[];
  /** Attraction to centre on when the user arrives from the list. */
  focusUuid: string | null;
  onSelect: (attraction: Attraction) => void;
}

export default function ParkMap({
  park,
  attractions,
  focusUuid,
  onSelect,
}: ParkMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<
    Map<string, { marker: Marker; el: HTMLButtonElement }>
  >(new Map());
  const [ready, setReady] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const framedParkRef = useRef<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  const located = useMemo(
    () => attractions.filter((a) => a.lat != null && a.lon != null),
    [attractions],
  );
  const unlocated = useMemo(
    () => attractions.filter((a) => a.lat == null),
    [attractions],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: window.matchMedia(DARK_QUERY).matches
        ? MAP_STYLE.dark
        : MAP_STYLE.light,
      center: park.center,
      zoom: park.zoom,
      attributionControl: { compact: true },
    });
    // In dev, Strict Mode can unmount before "style.load" fires; without this
    // guard the stale handler would mark an already-removed map as ready.
    let removed = false;
    map.on("style.load", () => {
      if (!removed) setReady(true);
    });
    // OpenFreeMap can take several seconds to answer on a cold cache; until
    // then the map is a blank rectangle, so the overlay says why. The timeout
    // is the backstop: a backgrounded tab stops painting and never reaches
    // "idle", and a stuck overlay would be worse than a bare map.
    const idleTimer = setTimeout(() => setTilesLoaded(true), 6000);
    map.on("idle", () => {
      if (!removed) setTilesLoaded(true);
    });
    map.on("error", (e) => console.error("MapLibre:", e.error));
    mapRef.current = map;
    const markers = markersRef.current;

    return () => {
      removed = true;
      clearTimeout(idleTimer);
      markers.clear();
      map.remove();
      mapRef.current = null;
      setReady(false);
      setTilesLoaded(false);
    };
  }, [park.center, park.zoom]);

  // Frame the whole park from its own attractions rather than a hand-tuned
  // zoom, so both parks (and any added later) open at a sensible extent. Only
  // on first load per park — re-framing after every refresh would fight the
  // user's own panning.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || located.length === 0) return;
    if (framedParkRef.current === park.id) return;
    framedParkRef.current = park.id;

    const bounds = located.reduce(
      (acc, a) => acc.extend([a.lon!, a.lat!]),
      new LngLatBounds(
        [located[0].lon!, located[0].lat!],
        [located[0].lon!, located[0].lat!],
      ),
    );
    map.fitBounds(bounds, { padding: 48, animate: false, maxZoom: 16 });
  }, [park.id, located, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const markers = markersRef.current;
    const seen = new Set<string>();

    for (const a of located) {
      seen.add(a.uuid);
      const open = a.status === "opened";
      const existing = markers.get(a.uuid);
      const el = existing?.el ?? document.createElement("button");

      if (!existing) {
        el.type = "button";
        el.className = "block cursor-pointer border-0 bg-transparent p-0";
      }
      el.setAttribute("aria-label", `${a.label}, ${open ? `${a.waitingTime} minutes` : "fermée"}`);
      el.innerHTML = `
        <span style="
          display:flex;align-items:center;justify-content:center;
          width:${open ? 32 : 22}px;height:${open ? 32 : 22}px;border-radius:999px;
          background:${open ? waitColor(a.waitingTime) : "#64748b"};
          color:#fff;font:600 ${open ? 12 : 10}px/1 system-ui,sans-serif;
          border:2px solid rgba(255,255,255,.9);
          box-shadow:0 1px 4px rgba(0,0,0,.35);
        ">${open ? a.waitingTime : "·"}</span>`;
      el.onclick = (event) => {
        event.stopPropagation();
        setSelected(a.uuid);
        map.easeTo({ center: [a.lon!, a.lat!], zoom: Math.max(map.getZoom(), 16) });
      };

      if (existing) {
        existing.marker.setLngLat([a.lon!, a.lat!]);
      } else {
        const marker = new Marker({ element: el })
          .setLngLat([a.lon!, a.lat!])
          .addTo(map);
        markers.set(a.uuid, { marker, el });
      }
    }

    for (const [uuid, entry] of markers) {
      if (!seen.has(uuid)) {
        entry.marker.remove();
        markers.delete(uuid);
      }
    }
  }, [located, ready]);

  // Arriving from the list ("Voir sur la carte") selects that attraction.
  // Derived during render — the sanctioned way to mirror a prop into state,
  // and it avoids a wasted render pass compared to doing it in an effect.
  const [lastFocus, setLastFocus] = useState(focusUuid);
  if (focusUuid !== lastFocus) {
    setLastFocus(focusUuid);
    setSelected(focusUuid);
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focusUuid) return;
    const target = located.find((a) => a.uuid === focusUuid);
    if (!target) return;
    map.easeTo({ center: [target.lon!, target.lat!], zoom: 16.5 });
  }, [focusUuid, located, ready]);

  // Follow the system theme: the markers are DOM elements, so they survive
  // `setStyle` untouched.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const apply = () =>
      mapRef.current?.setStyle(media.matches ? MAP_STYLE.dark : MAP_STYLE.light);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !userPosition) return;
    const el = document.createElement("div");
    el.style.cssText =
      "width:14px;height:14px;border-radius:999px;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.25)";
    const marker = new Marker({ element: el }).setLngLat(userPosition).addTo(map);
    return () => {
      marker.remove();
    };
  }, [userPosition, ready]);

  const selectedAttraction = located.find((a) => a.uuid === selected) ?? null;

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [
          pos.coords.longitude,
          pos.coords.latitude,
        ];
        setUserPosition(coords);
        mapRef.current?.easeTo({ center: coords, zoom: 16 });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[62vh] min-h-80 overflow-hidden rounded-xl border border-border">
        {/* Inline style, not Tailwind classes: maplibre-gl.css declares
            `.maplibregl-map { position: relative }` and is injected after
            Tailwind's utilities, so a `.absolute` class here loses and the
            container collapses to zero height. */}
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

        {!tilesLoaded && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface-2/70 text-xs text-muted">
            Chargement de la carte…
          </div>
        )}

        <button
          type="button"
          onClick={locate}
          className="absolute top-3 right-3 rounded-lg border border-border bg-surface/95 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur hover:bg-surface"
        >
          {locating ? "Localisation…" : "Ma position"}
        </button>

        {selectedAttraction && (
          <div className="absolute inset-x-3 bottom-3 rounded-xl border border-border bg-surface/97 p-3 shadow-lg backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  <span aria-hidden>{kindIcon(selectedAttraction.kind)}</span>
                  {selectedAttraction.label}
                </p>
                <div className="mt-1">
                  <StatusPill status={selectedAttraction.status} />
                </div>
              </div>
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-lg text-lg font-semibold tabular-nums text-white"
                style={{
                  backgroundColor:
                    selectedAttraction.status === "opened"
                      ? waitColor(selectedAttraction.waitingTime)
                      : "#64748b",
                }}
              >
                {selectedAttraction.status === "opened"
                  ? selectedAttraction.waitingTime
                  : "—"}
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onSelect(selectedAttraction)}
                className="flex-1 rounded-lg bg-foreground py-2 text-xs font-medium text-background"
              >
                Détails et historique
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted">
        Positions des attractions issues d&apos;OpenStreetMap (ODbL) · fond de
        carte OpenFreeMap
      </p>

      {unlocated.length > 0 && (
        <details className="rounded-xl border border-border bg-surface px-3 py-2 text-xs">
          <summary className="cursor-pointer text-muted">
            {unlocated.length} attraction{unlocated.length > 1 ? "s" : ""} sans
            position connue
          </summary>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {unlocated.map((a) => (
              <li
                key={a.uuid}
                className="rounded-full bg-surface-2 px-2 py-0.5 text-muted"
              >
                {a.label}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
