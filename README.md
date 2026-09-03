# Branche `history`

Stockage seul — aucun code. Une capture des temps d'attente toutes les 30
minutes, écrite par `.github/workflows/collect-history.yml` (branche `main`),
sous `<parc>/<AAAA-MM-JJ>.json` :

```json
{ "park": "parcasterix", "date": "2026-09-02",
  "points": [ { "t": "…ISO…", "c": 4.71, "w": { "<uuid>": 25 }, "x": ["<uuid>"] } ] }
```

`w` = attente en minutes des attractions ouvertes, `x` = uuid des attractions
fermées, `c` = indice d'affluence du parc. L'app lit ces fichiers via
`/api/history` et les fusionne, par horodatage, avec l'historique local de
l'appareil.

`vercel.json` neutralise les déploiements : Vercel résout ce fichier depuis la
branche poussée, donc la copie sur `main` ne suffirait pas.
