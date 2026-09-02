const LEVELS: [number, string, string][] = [
  [20, "Très faible", "#16a34a"],
  [40, "Faible", "#65a30d"],
  [60, "Modérée", "#ca8a04"],
  [80, "Forte", "#ea580c"],
  [Infinity, "Très forte", "#dc2626"],
];

/**
 * The API's `crowd_level`, a 0–100 index of how busy the park is right now.
 */
export default function CrowdGauge({ level }: { level: number }) {
  const clamped = Math.max(0, Math.min(100, level));
  const [, label, color] = LEVELS.find(([max]) => clamped < max)!;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted">Affluence</span>
        <span className="text-xs font-medium" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(clamped, 2)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
