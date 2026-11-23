const LEVELS: [number, string, string][] = [
  [20, "Très faible", "#16a34a"],
  [40, "Faible", "#65a30d"],
  [60, "Modérée", "#ca8a04"],
  [80, "Forte", "#ea580c"],
  [Infinity, "Très forte", "#dc2626"],
];

/**
 * The API's `crowd_level`, a 0–100 index of how busy the park is right now,
 * shown as five steps that light up in turn — the same five words the label
 * uses, so the bar and the word never disagree.
 */
export default function CrowdGauge({ level }: { level: number }) {
  const clamped = Math.max(0, Math.min(100, level));
  const step = LEVELS.findIndex(([max]) => clamped < max);
  const [, label, color] = LEVELS[step];

  return (
    <div
      className="flex items-center gap-3"
      role="meter"
      aria-label="Affluence"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={label}
    >
      <span className="text-xs text-muted">Affluence</span>
      <div className="flex flex-1 gap-1" aria-hidden>
        {LEVELS.map(([max], i) => (
          <span
            key={max}
            className="h-2 flex-1 rounded-full bg-foreground/10 transition-colors duration-500"
            style={i <= step ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>
      <span className="min-w-[4.5rem] text-right text-xs font-semibold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
