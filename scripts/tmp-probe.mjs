#!/usr/bin/env node
/**
 * Fichier jetable. Relève l'emprise exacte de chaque parc depuis les polygones
 * `tourism=theme_park` d'OpenStreetMap : Nominatim ne connaît pas « Disney
 * Adventure World » sous son nouveau nom, et les deux parcs Disney sont
 * mitoyens — leurs boîtes ne doivent pas se recouvrir, sinon les attractions
 * de l'un iraient se placer dans l'autre.
 */
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// Zones de recherche généreuses autour de chaque parc.
const AREAS = {
  "disney (Marne-la-Vallée)": "48.855,2.760,48.885,2.800",
  futuroscope: "46.660,0.360,46.680,0.390",
  nigloland: "48.253,4.600,48.272,4.625",
};

async function overpass(query) {
  for (const mirror of MIRRORS) {
    try {
      const res = await fetch(mirror, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        headers: { "user-agent": "parc-attraction/1.0" },
      });
      const body = await res.text();
      if (body.trimStart().startsWith("{")) return JSON.parse(body).elements ?? [];
      console.log(`  ${mirror}: ${body.slice(0, 100)}`);
    } catch (error) {
      console.log(`  ${mirror}: ${error.message}`);
    }
  }
  return null;
}

for (const [label, box] of Object.entries(AREAS)) {
  // `out bb` donne la boîte englobante de chaque polygone, ce qu'il nous faut.
  const query = `[out:json][timeout:120];
(
  way["tourism"="theme_park"](${box});
  relation["tourism"="theme_park"](${box});
);
out bb tags;`;
  const elements = await overpass(query);
  if (!elements) {
    console.log(`BBOX_ERROR ${label}`);
    continue;
  }
  console.log(
    `BBOX ${label} ${JSON.stringify(
      elements.map((e) => ({
        name: e.tags?.name,
        type: e.type,
        bounds: e.bounds,
      })),
    )}`,
  );
}
