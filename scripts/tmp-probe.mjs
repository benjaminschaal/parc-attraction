#!/usr/bin/env node
/**
 * Fichier jetable. Le proxy réseau de la session de développement bloque
 * api.wartezeiten.app, Overpass et Nominatim ; un runner GitHub y accède.
 * Ce script y interroge l'API et imprime tout sur stdout, pour vérifier
 * l'identifiant exact d'un parc avant de l'ajouter à `src/lib/parks.ts`.
 * Supprimé une fois la vérification faite.
 */
const API = "https://api.wartezeiten.app/v1";

async function api(endpoint, headers = {}) {
  const res = await fetch(`${API}/${endpoint}`, {
    headers: {
      accept: "application/json",
      "user-agent": "parc-attraction/1.0",
      ...headers,
    },
  });
  if (!res.ok) {
    throw new Error(`${endpoint} ${JSON.stringify(headers)} -> HTTP ${res.status}`);
  }
  return res.json();
}

// 1. Tous les parcs connus de l'API, et ceux dont le nom évoque Walibi.
let walibi = [];
try {
  const parks = await api("parks", { language: "en" });
  console.log(`PARKS_COUNT ${Array.isArray(parks) ? parks.length : "?"}`);
  console.log(`PARKS_ALL ${JSON.stringify(parks)}`);
  walibi = (parks ?? []).filter((p) =>
    JSON.stringify(p).toLowerCase().includes("walibi"),
  );
  console.log(`WALIBI ${JSON.stringify(walibi, null, 2)}`);
} catch (error) {
  console.log(`PARKS_ERROR ${error.message}`);
}

// 2. Les attractions du parc trouvé, ou des identifiants plausibles.
const candidates = [
  ...new Set(
    [
      ...walibi.map((p) => p.id ?? p.park ?? p.slug),
      "walibirhonealpes",
      "walibirhonealpen",
    ].filter(Boolean),
  ),
];
for (const id of candidates) {
  for (const language of ["en", "de"]) {
    try {
      const rows = await api("waitingtimes", { park: id, language });
      console.log(`RIDES ${id} ${language} ${rows.length}`);
      console.log(
        `RIDES_JSON ${id} ${language} ${JSON.stringify(
          rows.map((r) => ({ uuid: r.uuid, code: r.code, name: r.name })),
        )}`,
      );
    } catch (error) {
      console.log(`RIDES_ERROR ${id} ${language} ${error.message}`);
    }
  }
}

// 3. L'emprise géographique du parc, pour la requête Overpass du générateur.
try {
  const res = await fetch(
    "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: "Walibi Rhône-Alpes, Les Avenières",
        format: "json",
        limit: "5",
      }),
    { headers: { "user-agent": "parc-attraction/1.0 (probe)" } },
  );
  const hits = await res.json();
  console.log(
    `NOMINATIM ${JSON.stringify(
      hits.map((h) => ({
        name: h.display_name,
        lat: h.lat,
        lon: h.lon,
        bbox: h.boundingbox,
      })),
    )}`,
  );
} catch (error) {
  console.log(`NOMINATIM_ERROR ${error.message}`);
}
