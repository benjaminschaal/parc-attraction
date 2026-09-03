#!/usr/bin/env node
/**
 * Fichier jetable. Le proxy réseau de la session de développement bloque les
 * API de temps d'attente ; un runner GitHub y accède. Deuxième passe : caractériser
 * queue-times.com, seule source publique qui couvre Walibi Rhône-Alpes.
 */
async function get(url, headers = {}) {
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "parc-attraction/1.0", ...headers },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

// 1. Les parcs de queue-times, et ceux qui nous intéressent.
try {
  const groups = await get("https://queue-times.com/parks.json");
  const flat = groups.flatMap((g) => (g.parks ?? []).map((p) => ({ ...p, group: g.name })));
  console.log(`QT_COUNT ${flat.length}`);
  const wanted = flat.filter((p) =>
    /walibi|ast|europa/i.test(p.name),
  );
  console.log(`QT_MATCHES ${JSON.stringify(wanted, null, 2)}`);
} catch (error) {
  console.log(`QT_PARKS_ERROR ${error.message}`);
}

// 2. Le détail d'un parc : structure exacte de la réponse temps réel.
for (const id of [301, 9, 51]) {
  try {
    const data = await get(`https://queue-times.com/parks/${id}/queue_times.json`);
    const lands = data.lands ?? [];
    const rides = [...(data.rides ?? []), ...lands.flatMap((l) => l.rides ?? [])];
    console.log(`QT_PARK ${id} lands=${lands.length} rides=${rides.length}`);
    console.log(`QT_KEYS ${id} ${JSON.stringify(Object.keys(data))}`);
    console.log(`QT_SAMPLE ${id} ${JSON.stringify(rides.slice(0, 4), null, 2)}`);
    console.log(
      `QT_RIDES ${id} ${JSON.stringify(
        rides.map((r) => ({ id: r.id, name: r.name, open: r.is_open, wait: r.wait_time })),
      )}`,
    );
  } catch (error) {
    console.log(`QT_PARK_ERROR ${id} ${error.message}`);
  }
}

// 3. Les attractions de Walibi Rhône-Alpes dans OpenStreetMap, pour la carte.
const BBOX = "45.6180,5.5650,45.6250,5.5760";
const query = `[out:json][timeout:120];
(
  nwr["attraction"](${BBOX});
  nwr["tourism"="attraction"](${BBOX});
  nwr["leisure"="playground"]["name"](${BBOX});
);
out center tags;`;
for (const mirror of [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
]) {
  try {
    const res = await fetch(mirror, {
      method: "POST",
      body: new URLSearchParams({ data: query }),
      headers: { "user-agent": "parc-attraction/1.0" },
    });
    const body = await res.text();
    if (!body.trimStart().startsWith("{")) throw new Error(body.slice(0, 120));
    const elements = JSON.parse(body).elements ?? [];
    console.log(`OSM_COUNT ${elements.length}`);
    console.log(
      `OSM ${JSON.stringify(
        elements
          .filter((e) => e.tags?.name)
          .map((e) => ({
            name: e.tags.name,
            lat: e.lat ?? e.center?.lat,
            lon: e.lon ?? e.center?.lon,
            kind: e.tags.attraction ?? e.tags.leisure ?? "",
          })),
      )}`,
    );
    break;
  } catch (error) {
    console.log(`OSM_ERROR ${mirror} ${error.message}`);
  }
}
