"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatClock } from "@/lib/format";
import type { SeriePoint } from "@/lib/history/series";

export interface ChartSeries {
  points: SeriePoint[];
  color: string;
  label: string;
  /** Fills the area under the line — used for the single-series charts. */
  fill?: boolean;
  dashed?: boolean;
}

interface TimeChartProps {
  series: ChartSeries[];
  height?: number;
  unit?: string;
  /** Marks "now" with a vertical rule, in minutes since local midnight. */
  nowMinutes?: number | null;
}

const PADDING = { top: 10, right: 8, bottom: 20, left: 30 };

/**
 * A small dependency-free line chart over a single day. The x axis is minutes
 * since local park midnight, so points recorded in different timezones still
 * line up with the park's own clock.
 */
export default function TimeChart({
  series,
  height = 160,
  unit = "min",
  nowMinutes = null,
}: TimeChartProps) {
  const gradientId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // The viewBox tracks the rendered pixel width so the chart never has to be
  // stretched: with `preserveAspectRatio="none"` the axis labels would be
  // squashed horizontally by whatever the container happens to be.
  const [width, setWidth] = useState(320);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(Math.round(entry.contentRect.width), 200));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    const all = series.flatMap((s) => s.points).filter((p) => p.v != null);
    if (all.length < 2) return null;

    const xs = all.map((p) => p.m);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const spanX = Math.max(maxX - minX, 30);
    const maxY = Math.max(...all.map((p) => p.v!), 10);
    const niceMax = Math.ceil(maxY / 10) * 10;

    const px = (m: number) =>
      PADDING.left +
      ((m - minX) / spanX) * (width - PADDING.left - PADDING.right);
    const py = (v: number) =>
      height -
      PADDING.bottom -
      (v / niceMax) * (height - PADDING.top - PADDING.bottom);

    // Hour gridlines, thinned out so a full day doesn't turn into a comb.
    const step = spanX > 480 ? 180 : spanX > 240 ? 120 : 60;
    const ticks: number[] = [];
    for (let m = Math.ceil(minX / step) * step; m <= maxX; m += step) {
      ticks.push(m);
    }

    return { px, py, niceMax, ticks, minX, maxX };
  }, [series, height, width]);

  if (!geometry) {
    return (
      <div ref={wrapperRef}>
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted"
          style={{ height }}
        >
          Pas encore assez de relevés
        </div>
      </div>
    );
  }

  const { px, py, niceMax, ticks } = geometry;

  return (
    <div ref={wrapperRef}>
      <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height={height}
          role="img"
          aria-label={series.map((s) => s.label).join(", ")}
        >
        <defs>
          {series.map((s, i) => (
            <linearGradient
              key={i}
              id={`${gradientId}-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {[0, niceMax / 2, niceMax].map((v) => (
          <g key={v}>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={py(v)}
              y2={py(v)}
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PADDING.left - 5}
              y={py(v) + 3}
              textAnchor="end"
              className="fill-current text-[8px] opacity-45"
            >
              {v}
            </text>
          </g>
        ))}

        {ticks.map((m) => (
          <text
            key={m}
            x={px(m)}
            y={height - 6}
            textAnchor="middle"
            className="fill-current text-[8px] opacity-45"
          >
            {formatClock(m)}
          </text>
        ))}

        {nowMinutes != null &&
          nowMinutes >= geometry.minX &&
          nowMinutes <= geometry.maxX && (
            <line
              x1={px(nowMinutes)}
              x2={px(nowMinutes)}
              y1={PADDING.top}
              y2={height - PADDING.bottom}
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}

        {series.map((s, i) => {
          // Closed stretches are `null`; each run of consecutive readings is
          // drawn as its own path so the line never bridges a closure.
          const runs: SeriePoint[][] = [];
          let run: SeriePoint[] = [];
          for (const p of s.points) {
            if (p.v == null) {
              if (run.length) runs.push(run);
              run = [];
            } else {
              run.push(p);
            }
          }
          if (run.length) runs.push(run);

          return (
            <g key={i}>
              {s.fill &&
                runs
                  .filter((r) => r.length > 1)
                  .map((r, j) => (
                    <path
                      key={`f${j}`}
                      d={
                        `M ${px(r[0].m)} ${py(0)} ` +
                        r.map((p) => `L ${px(p.m)} ${py(p.v!)}`).join(" ") +
                        ` L ${px(r.at(-1)!.m)} ${py(0)} Z`
                      }
                      fill={`url(#${gradientId}-${i})`}
                    />
                  ))}
              {runs.map((r, j) =>
                r.length > 1 ? (
                  <path
                    key={`l${j}`}
                    d={r.map((p, k) => `${k ? "L" : "M"} ${px(p.m)} ${py(p.v!)}`).join(" ")}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={s.dashed ? "4 3" : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : (
                  <circle
                    key={`p${j}`}
                    cx={px(r[0].m)}
                    cy={py(r[0].v!)}
                    r="2.5"
                    fill={s.color}
                  />
                ),
              )}
            </g>
          );
        })}

          <text
            x={width - PADDING.right}
            y={PADDING.top - 1}
            textAnchor="end"
            className="fill-current text-[9px] opacity-45"
          >
            {unit}
          </text>
      </svg>
    </div>
  );
}
