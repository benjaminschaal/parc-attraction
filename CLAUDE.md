@AGENTS.md

# parc-attraction

Temps d'attente en direct, carte et historique pour le Parc Astérix, Europa-Park
et Walibi Rhône-Alpes, à partir de deux API publiques :
[wartezeiten.app](https://api.wartezeiten.app/) et
[Queue-Times](https://queue-times.com/).

## Ce qu'il faut savoir avant de toucher au code

- **Deux sources, pas une.** Chaque parc déclare la sienne dans
  `src/lib/parks.ts` (`source`), et `src/lib/sources.ts` normalise les deux en
  un seul `ParkSnapshot` (`src/lib/snapshot.ts`). Walibi Rhône-Alpes est absent
  des 46 parcs de wartezeiten.app : il passe par Queue-Times, qui ne publie ni
  horaires d'ouverture ni indice d'affluence — d'où `opening: null` et
  `crowdLevel: null` pour ce parc. **Ne pas retoucher le crédit
  « Powered by Queue-Times.com »** : leurs conditions l'imposent.
- **wartezeiten.app n'envoie aucun en-tête CORS** : elle ne peut pas être appelée
  depuis le navigateur. Tout passe par `src/app/api/park/[park]/route.ts`.
- **wartezeiten.app ne parle que `de` et `en`.** Pour le Parc Astérix, `de` renvoie
  les noms français d'origine ; pour Europa-Park les noms français sont dans
  `src/data/attractions.json` (`nameFr`). Voir `src/lib/parks.ts`
  (`source.language`).
- **Aucune des deux API ne contient de coordonnée GPS.** Les positions viennent
  d'OpenStreetMap et sont figées dans `src/data/attractions.json`, indexées par
  l'`uuid` stable de l'attraction. Régénérer avec
  `python3 scripts/build-attractions-dataset.py`.
- **Aucune des deux ne publie autre chose que l'instant présent** : l'historique est construit par
  l'app (IndexedDB, `src/lib/history/localHistory.ts`) et par le job GitHub
  Actions `.github/workflows/collect-history.yml`, qui écrit dans la branche
  orpheline `history`.
- **Limite de débit** : wartezeiten.app plafonne à 100 requêtes/minute et bloque
  15 minutes au-delà ; Queue-Times se rafraîchit toutes les 5 minutes et demande
  de ne pas interroger plus souvent. Les appels serveur sont mis en cache
  (`src/lib/wartezeiten/server.ts`, `src/lib/queuetimes/server.ts`).
- `maplibre-gl.css` déclare `.maplibregl-map { position: relative }` et passe
  après les utilitaires Tailwind : le conteneur de la carte doit être positionné
  en style inline, pas avec une classe.
