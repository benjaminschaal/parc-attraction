"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { getPark, PARKS, type Park, type ParkId } from "@/lib/parks";

/**
 * A plain `<select>`, on purpose: on iOS it opens the native wheel picker,
 * which stays usable however many parks the list grows to, costs no JavaScript
 * beyond the navigation, and is keyboard- and screen-reader-friendly for free.
 * The row of buttons it replaces only fit three parks on a phone.
 *
 * It is drawn as the page title rather than as a form field: the select sits,
 * transparent, over the park's name, so tapping the title opens the native
 * picker. The name appears once on the page, and stays the `<h1>`.
 */
export default function ParkPicker({ park }: { park: Park }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The park the user just chose, shown while its page loads instead of
  // snapping back to the current one. The header remounts the picker (`key`)
  // once the new page arrives.
  const [choice, setChoice] = useState<ParkId>(park.id);
  const shown = getPark(choice) ?? park;

  // Parks grouped by country, in the order they first appear in PARKS.
  const countries = [...new Set(PARKS.map((p) => p.country))];

  return (
    <div
      className={`relative -ml-1.5 inline-flex max-w-full items-center gap-1 rounded-xl px-1.5 py-0.5 transition-[opacity,background-color] has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-accent hover:bg-foreground/5 ${
        pending ? "opacity-60" : ""
      }`}
    >
      {/* What the eye reads: the page title. */}
      <h1 className="truncate text-2xl font-semibold tracking-tight">
        <span aria-hidden className="mr-2">
          {shown.flag}
        </span>
        {shown.name}
      </h1>
      <ChevronDown
        aria-hidden
        strokeWidth={2.25}
        className="size-5 shrink-0 text-muted"
      />
      {/* What the finger hits: the native picker, invisible, over the title. */}
      <select
        value={choice}
        aria-label="Choix du parc"
        aria-busy={pending}
        onChange={(event) => {
          const next = event.target.value as ParkId;
          setChoice(next);
          if (next !== park.id) {
            startTransition(() => router.push(`/parc/${next}`));
          }
        }}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0 focus-visible:outline-none"
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
    </div>
  );
}
