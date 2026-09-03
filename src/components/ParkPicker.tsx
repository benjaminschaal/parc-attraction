"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PARKS, type Park, type ParkId } from "@/lib/parks";

/**
 * A plain `<select>`, on purpose: on iOS it opens the native wheel picker,
 * which stays usable however many parks the list grows to, costs no JavaScript
 * beyond the navigation, and is keyboard- and screen-reader-friendly for free.
 * The row of buttons it replaces only fit three parks on a phone.
 */
export default function ParkPicker({ park }: { park: Park }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Parks grouped by country, in the order they first appear in PARKS.
  const countries = [...new Set(PARKS.map((p) => p.country))];

  return (
    <div className="relative">
      <select
        // Uncontrolled, and remounted on arrival: the picker shows the park the
        // user just chose while the new page loads, instead of snapping back.
        key={park.id}
        defaultValue={park.id}
        aria-label="Choix du parc"
        aria-busy={pending}
        onChange={(event) => {
          const next = event.target.value as ParkId;
          if (next !== park.id) {
            startTransition(() => router.push(`/parc/${next}`));
          }
        }}
        className={`w-full appearance-none rounded-lg border border-border bg-surface-2 py-2.5 pr-10 pl-3 text-sm font-medium text-foreground transition-opacity ${
          pending ? "opacity-60" : ""
        }`}
      >
        {countries.map((country) => (
          <optgroup key={country} label={country}>
            {PARKS.filter((p) => p.country === country).map((p) => (
              <option key={p.id} value={p.id}>
                {p.flag} {p.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[10px] text-muted"
      >
        ▼
      </span>
    </div>
  );
}
