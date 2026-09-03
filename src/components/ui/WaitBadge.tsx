import { waitColor } from "@/lib/format";
import type { RideStatus } from "@/lib/snapshot";

/**
 * The wait time, or a dash for anything that isn't running. Sized so the list
 * stays aligned whatever the value.
 */
export default function WaitBadge({
  minutes,
  status,
  size = "md",
}: {
  minutes: number;
  status: RideStatus;
  size?: "md" | "lg";
}) {
  const isOpen = status === "opened";
  const box = size === "lg" ? "h-14 w-16 text-2xl" : "h-11 w-13 text-lg";

  if (!isOpen) {
    return (
      <div
        className={`flex ${box} shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 font-semibold text-muted`}
      >
        <span aria-hidden>—</span>
      </div>
    );
  }

  return (
    <div
      className={`flex ${box} shrink-0 flex-col items-center justify-center rounded-xl font-semibold tabular-nums text-white`}
      style={{ backgroundColor: waitColor(minutes) }}
    >
      <span className="leading-none">{minutes}</span>
      <span className="text-[9px] font-normal tracking-wide opacity-85">min</span>
    </div>
  );
}
