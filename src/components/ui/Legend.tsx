import { waitColor } from "@/lib/format";

const STEPS: [string, number][] = [
  ["≤ 10 min", 5],
  ["≤ 20", 15],
  ["≤ 30", 25],
  ["≤ 45", 40],
  ["≤ 60", 55],
  ["> 60", 90],
];

export default function Legend() {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <h2 className="mb-2 text-xs font-medium text-muted">Légende</h2>
      <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
        {STEPS.map(([label, value]) => (
          <li key={label} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="size-3 rounded"
              style={{ backgroundColor: waitColor(value) }}
              aria-hidden
            />
            {label}
          </li>
        ))}
        <li className="flex items-center gap-1.5 text-[11px]">
          <span className="size-3 rounded bg-surface-2 ring-1 ring-border" aria-hidden />
          Fermée / entretien
        </li>
      </ul>
    </div>
  );
}
