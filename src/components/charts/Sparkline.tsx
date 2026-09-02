"use client";

import type { SeriePoint } from "@/lib/history/series";

/** Tiny inline curve of the last recorded readings, shown in the list rows. */
export default function Sparkline({
  points,
  color,
  width = 56,
  height = 20,
}: {
  points: SeriePoint[];
  color: string;
  width?: number;
  height?: number;
}) {
  const values = points.filter((p) => p.v != null);
  // Nothing to draw yet: give the space back to the attraction name, which
  // is tight on a phone.
  if (values.length < 2) return null;

  const xs = values.map((p) => p.m);
  const minX = Math.min(...xs);
  const spanX = Math.max(Math.max(...xs) - minX, 1);
  const maxY = Math.max(...values.map((p) => p.v!), 10);

  const d = values
    .map((p, i) => {
      const x = ((p.m - minX) / spanX) * (width - 2) + 1;
      const y = height - 2 - (p.v! / maxY) * (height - 4);
      return `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} aria-hidden className="shrink-0">
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}
