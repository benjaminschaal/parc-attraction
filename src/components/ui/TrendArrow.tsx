/** Change in wait time over the last stretch of recorded history. */
export default function TrendArrow({ delta }: { delta: number | null }) {
  // No history yet for this ride: show nothing rather than a neutral arrow
  // that would read as "stable".
  if (delta == null) return null;

  if (Math.abs(delta) < 5) {
    return (
      <span className="text-xs text-muted" title="Stable depuis 45 minutes">
        \u2192
      </span>
    );
  }

  const up = delta > 0;
  return (
    <span
      className={`text-xs font-medium tabular-nums ${
        up
          ? "text-rose-600 dark:text-rose-400"
          : "text-emerald-600 dark:text-emerald-400"
      }`}
      title={`${up ? "+" : ""}${delta} min sur les 45 derni\u00e8res minutes`}
    >
      {up ? "\u2191" : "\u2193"}
      {Math.abs(delta)}
    </span>
  );
}
