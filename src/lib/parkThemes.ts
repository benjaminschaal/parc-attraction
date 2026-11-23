import type { StaticImageData } from "next/image";
import type { ParkId } from "@/lib/parks";
import asterixLogo from "@/assets/parks/parcasterix/logo.webp";
import asterix1 from "@/assets/parks/parcasterix/photo-1.webp";
import asterix2 from "@/assets/parks/parcasterix/photo-2.webp";
import europaparkLogo from "@/assets/parks/europapark/logo.webp";
import europapark1 from "@/assets/parks/europapark/photo-1.webp";
import europapark2 from "@/assets/parks/europapark/photo-2.webp";
import europapark3 from "@/assets/parks/europapark/photo-3.webp";
import europapark4 from "@/assets/parks/europapark/photo-4.webp";
import europapark5 from "@/assets/parks/europapark/photo-5.webp";
import walibiLogo from "@/assets/parks/walibirhonealpes/logo.webp";
import walibi1 from "@/assets/parks/walibirhonealpes/photo-1.webp";
import walibi2 from "@/assets/parks/walibirhonealpes/photo-2.webp";
import walibi3 from "@/assets/parks/walibirhonealpes/photo-3.webp";
import walibi4 from "@/assets/parks/walibirhonealpes/photo-4.webp";
import futuroscopeLogo from "@/assets/parks/futuroscope/logo.webp";
import futuroscope1 from "@/assets/parks/futuroscope/photo-1.webp";
import futuroscope2 from "@/assets/parks/futuroscope/photo-2.webp";
import futuroscope3 from "@/assets/parks/futuroscope/photo-3.webp";
import futuroscope4 from "@/assets/parks/futuroscope/photo-4.webp";
import futuroscope5 from "@/assets/parks/futuroscope/photo-5.webp";
import disneyLogo from "@/assets/parks/disneylandparis/logo.webp";
import disney1 from "@/assets/parks/disneylandparis/photo-1.webp";

/**
 * Photos and logo of each park, shown at the top of its page.
 *
 * The files are pre-shrunk (WebP, 16:9, 800 px wide at most, logos trimmed to
 * 160 px tall) by hand from the originals; `next/image` then serves each
 * phone the width it needs and a blurred placeholder while it loads. Parks
 * without an entry keep the plain tinted header.
 */
export interface ParkTheme {
  logo: StaticImageData;
  photos: StaticImageData[];
}

export const PARK_THEMES: Partial<Record<ParkId, ParkTheme>> = {
  parcasterix: { logo: asterixLogo, photos: [asterix1, asterix2] },
  europapark: {
    logo: europaparkLogo,
    photos: [
      europapark1,
      europapark2,
      europapark3,
      europapark4,
      europapark5,
    ],
  },
  walibirhonealpes: {
    logo: walibiLogo,
    photos: [
      walibi1,
      walibi2,
      walibi3,
      walibi4,
    ],
  },
  futuroscope: {
    logo: futuroscopeLogo,
    photos: [
      futuroscope1,
      futuroscope2,
      futuroscope3,
      futuroscope4,
      futuroscope5,
    ],
  },
  disneylandparis: { logo: disneyLogo, photos: [disney1] },
};
