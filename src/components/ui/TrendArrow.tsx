import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

/** Change in wait time over the last stretch of recorded history. */
export default function TrendArrow({ delta }: { delta: number | null }) {
  // No history yet for this ride: show nothing rather than a neutral arrow
  // that would read as "stable".
  if (delta == null) return null;

  if (Math.abs(delta) < 5) {
    return (
      <span
        className="inline-flex items-center text-muted"
        title="Stable depuis 45 minutes"
        aria-label="Stable"
      >
        <ArrowRight aria-hidden className="size-3.5" strokeWidth={2.25} />
      </span>
    );
  }

  const up = delta > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${
        up
          ? "text-rose-600 dark:text-rose-400"
          : "text-emerald-600 dark:text-emerald-400"
      }`}
      title={`${up ? "+" : ""}${delta} min sur les 45 dernières minutes`}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
      {up ? "+" : "−"}
      {Math.abs(delta)} min
    </span>
  );
}
