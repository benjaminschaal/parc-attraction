import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Files d'attente — parcs d'attractions",
    short_name: "Files d'attente",
    description:
      "Temps d'attente en direct, carte des attractions et historique pour sept parcs : Parc Astérix, Disneyland Paris, Disney Adventure World, Futuroscope, Nigloland, Walibi Rhône-Alpes et Europa-Park.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0d10",
    theme_color: "#0b0d10",
    lang: "fr",
    categories: ["travel", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
