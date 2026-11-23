"use client";

import Image from "next/image";
import { useState } from "react";
import { parkDay } from "@/lib/format";
import type { Park } from "@/lib/parks";
import { PARK_THEMES } from "@/lib/parkThemes";

/**
 * The park's photo and logo, above the header figures. One photo a day, so a
 * returning visitor sees the park change; tapping it shows the next one.
 */
export default function ParkHero({ park }: { park: Park }) {
  const theme = PARK_THEMES[park.id];
  const count = theme?.photos.length ?? 0;
  const [index, setIndex] = useState(() =>
    count ? dayHash(parkDay(new Date(), park.timeZone)) % count : 0,
  );

  if (!theme) return null;
  const photo = theme.photos[index];

  return (
    <div className="mx-auto w-full max-w-3xl sm:px-4 sm:pt-3">
      <div className="relative aspect-[16/8] max-h-64 w-full overflow-hidden bg-surface-2 sm:rounded-2xl">
        <Image
          key={photo.src}
          src={photo}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 736px"
          placeholder="blur"
          fetchPriority={index === 0 ? "high" : "auto"}
          loading="eager"
          className="photo-in object-cover"
        />
        {/* Fades the photo into the tinted header below it. */}
        <div aria-hidden className="hero-fade pointer-events-none absolute inset-0" />

        {count > 1 && (
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % count)}
            aria-label={`Photo suivante du parc (${index + 1} sur ${count})`}
            className="absolute inset-0 cursor-pointer focus-visible:outline-offset-[-4px]"
          />
        )}

        <div className="pointer-events-none absolute bottom-3 left-4 rounded-2xl bg-white px-3 py-2.5 shadow-[0_4px_16px_rgb(0_0_0/0.18)]">
          <Image
            src={theme.logo}
            alt=""
            sizes="176px"
            className="h-11 w-auto max-w-44 object-contain"
          />
        </div>

        {count > 1 && (
          <div
            aria-hidden
            className="pointer-events-none absolute right-4 bottom-4 flex gap-1.5"
          >
            {theme.photos.map((p, i) => (
              <span
                key={p.src}
                className={`h-1.5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.35)] transition-[width,opacity] duration-300 ${
                  i === index ? "w-4 opacity-100" : "w-1.5 opacity-60"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A small, stable number from a `YYYY-MM-DD` day. */
function dayHash(day: string): number {
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
