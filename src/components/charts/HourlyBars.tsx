"use client";

import { waitColor } from "@/lib/format";

/** Average wait per hour across every recorded day — the "typical day" view. */
export default function HourlyBars({
  data,
  height = 140,
}: {
  data: { hour: number; avg: number; samples: number }[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted"
        style={{ height }}
      >
        Pas encore de relevés
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.avg), 10);

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d) => (
        <div key={d.hour} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] tabular-nums text-muted">{d.avg}</span>
          <div
            className="w-full rounded-t"
            style={{
              height: `${Math.max((d.avg / max) * (height - 34), 2)}px`,
              backgroundColor: waitColor(d.avg),
            }}
            title={`${d.hour}h — ${d.avg} min de moyenne (${d.samples} relevés)`}
          />
          <span className="text-[10px] tabular-nums text-muted">{d.hour}</span>
        </div>
      ))}
    </div>
  );
}
