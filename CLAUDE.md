@AGENTS.md

# parc-attraction

Temps d'attente en direct, carte et historique pour le Parc Astérix et Europa-Park,
à partir de l'API publique de [wartezeiten.app](https://api.wartezeiten.app/).

## Ce qu'il faut savoir avant de toucher au code

- **L'API n'envoie aucun en-tête CORS** : elle ne peut pas être appelée depuis le
  navigateur. Tout passe par `src/app/api/park/[park]/route.ts`.
- **L'API ne parle que `de` et `en`.** Pour le Parc Astérix, `de` renvoie les noms
  français d'origine ; pour Europa-Park les noms français sont dans
  `src/data/attractions.json` (`nameFr`). Voir `src/lib/parks.ts` (`apiLanguage`).
- **L'API ne contient aucune coordonnée GPS.** Les positions viennent
  d'OpenStreetMap et sont figées dans `src/data/attractions.json`, indexées par
  l'`uuid` stable de l'attraction. Régénérer avec
  `python3 scripts/build-attractions-dataset.py`.
- **L'API ne publie que l'instant présent** : l'historique est construit par
  l'app (IndexedDB, `src/lib/history/localHistory.ts`) et par le job GitHub
  Actions `.github/workflows/collect-history.yml`, qui écrit dans la branche
  orpheline `history`.
- **Limite de débit** : 100 requêtes/minute, blocage de 15 minutes au-delà. Les
  appels serveur sont mis en cache (`src/lib/wartezeiten/server.ts`).
- `maplibre-gl.css` déclare `.maplibregl-map { position: relative }` et passe
  après les utilitaires Tailwind : le conteneur de la carte doit être positionné
  en style inline, pas avec une classe.
