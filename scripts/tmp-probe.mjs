#!/usr/bin/env node
/**
 * Fichier jetable, supprimé avant l'ouverture de la pull request. Le proxy
 * réseau de la session de développement bloque api.wartezeiten.app et
 * Nominatim ; un runner GitHub y accède. Sert ici à choisir, pour chaque
 * nouveau parc, la langue qui rend les noms français, et à relever l'emprise
 * géographique que la requête Overpass utilisera.
 */
const API = "https://api.wartezeiten.app/v1";

const PARKS = [
  ["disneylandparis", "Parc Disneyland, Marne-la-Vallée"],
  ["disneyadventureworld", "Walt Disney Studios Park, Marne-la-Vallée"],
  ["futuroscope", "Futuroscope, Chasseneuil-du-Poitou"],
  ["nigloland", "Nigloland, Dolancourt"],
];

async function api(endpoint, headers) {
  const res = await fetch(`${API}/${endpoint}`, {
    headers: { accept: "application/json", "user-agent": "parc-attraction/1.0", ...headers },
  });
  if (!res.ok) throw new Error(`${endpoint} -> HTTP ${res.status}`);
  return res.json();
}

for (const [id] of PARKS) {
  for (const language of ["de", "en"]) {
    try {
      const rows = await api("waitingtimes", { park: id, language });
      console.log(`NAMES ${id} ${language} ${rows.length} ${JSON.stringify(rows.slice(0, 12).map((r) => r.name))}`);
    } catch (error) {
      console.log(`NAMES_ERROR ${id} ${language} ${error.message}`);
    }
  }
  try {
    const hours = await api("openingtimes", { park: id });
    console.log(`HOURS ${id} ${JSON.stringify(hours).slice(0, 200)}`);
  } catch (error) {
    console.log(`HOURS_ERROR ${id} ${error.message}`);
  }
}

for (const [id, query] of PARKS) {
  try {
    const res = await fetch(
      "https://nominatim.openstreetmap.org/search?" +
        new URLSearchParams({ q: query, format: "json", limit: "3" }),
      { headers: { "user-agent": "parc-attraction/1.0 (probe)" } },
    );
    const hits = await res.json();
    console.log(
      `GEO ${id} ${JSON.stringify(
        hits.map((h) => ({ n: h.display_name.slice(0, 70), lat: h.lat, lon: h.lon, bbox: h.boundingbox })),
      )}`,
    );
  } catch (error) {
    console.log(`GEO_ERROR ${id} ${error.message}`);
  }
  // Nominatim demande au plus une requête par seconde.
  await new Promise((r) => setTimeout(r, 1200));
}
