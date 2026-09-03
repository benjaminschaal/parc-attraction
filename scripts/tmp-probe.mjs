#!/usr/bin/env node
/** Fichier jetable : liste des attractions de Walibi Rhône-Alpes chez queue-times. */
const res = await fetch("https://queue-times.com/parks/301/queue_times.json", {
  headers: { accept: "application/json", "user-agent": "parc-attraction/1.0" },
});
const data = await res.json();
const rides = [
  ...(data.rides ?? []),
  ...(data.lands ?? []).flatMap((l) => l.rides ?? []),
];
console.log(`LANDS ${JSON.stringify((data.lands ?? []).map((l) => l.name))}`);
console.log(`COUNT ${rides.length}`);
console.log(
  `RIDES ${JSON.stringify(rides.map((r) => [r.id, r.name, r.is_open ? 1 : 0]))}`,
);
console.log(`STAMP ${rides[0]?.last_updated ?? "?"}`);
