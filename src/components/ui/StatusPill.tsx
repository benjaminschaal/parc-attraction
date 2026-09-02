import { STATUS_SHORT } from "@/lib/format";
import type { RideStatus } from "@/lib/wartezeiten/types";

const TONE: Record<RideStatus, string> = {
  opened: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  virtualqueue: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  maintenance: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  closedweather: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
  closedice: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
  closed: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
};

export default function StatusPill({ status }: { status: RideStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[status]}`}
    >
      {STATUS_SHORT[status]}
    </span>
  );
}
