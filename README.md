# Files d'attente — Parc Astérix & Europa-Park

Webapp de suivi des temps d'attente, construite sur l'API publique de
[wartezeiten.app](https://api.wartezeiten.app/).

- **Attentes en direct** — temps d'attente par attraction, statut (ouverte,
  entretien, file virtuelle, fermée météo/gel), tri, recherche, favoris,
  tendance sur 45 minutes et mini-courbe de la journée.
- **En-tête de parc** — horaires du jour, nombre d'attractions ouvertes,
  attente moyenne et maximale, indice d'affluence.
- **Carte** — position GPS de chaque attraction avec son temps d'attente,
  géolocalisation, fiche au clic.
- **Historique** — courbe d'attente moyenne du parc, indice d'affluence,
  classement des attractions les plus chargées, « journée type » heure par
  heure, et par attraction sa courbe du jour et ses moyennes.

Parcs couverts : Parc Astérix (France) et Europa-Park (Allemagne). Ajouter un
parc = une entrée dans `src/lib/parks.ts` + une passe de
`scripts/build-attractions-dataset.py`.

## Développement

```bash
npm install
npm run dev
```

## Comment ça marche

### Le proxy est obligatoire

L'API wartezeiten.app **n'envoie aucun en-tête CORS** : elle est injoignable
depuis le navigateur. Toutes les données passent par
`src/app/api/park/[park]/route.ts`, qui appelle les trois endpoints
(`waitingtimes`, `openingtimes`, `crowdlevel`) et renvoie un instantané unique.
L'API limite à 100 requêtes/minute avec blocage de 15 minutes au-delà, donc les
réponses sont mises en cache côté serveur et côté CDN.

### Les coordonnées GPS ne viennent pas de l'API

L'API ne publie aucune position. `src/data/attractions.json` associe chaque
`uuid` d'attraction à des coordonnées OpenStreetMap (licence ODbL), récupérées
via Overpass et complétées à la main pour la dizaine d'attractions qu'OSM nomme
autrement. Le fond de carte est [OpenFreeMap](https://openfreemap.org/) (pas de
clé API).

Régénérer le jeu de données après l'ouverture ou le renommage d'une attraction :

```bash
python3 scripts/build-attractions-dataset.py
```

Le script affiche les correspondances approximatives (`fuzzy`, `substr`) et les
attractions sans GPS — à relire avant de committer.

### Les noms français

L'API ne parle que `de` et `en`. Pour le Parc Astérix, la réponse `de` conserve
les noms français d'origine ; pour Europa-Park, les libellés français sont dans
`attractions.json` (`nameFr`).

### L'historique

L'API ne publie que l'instant présent. L'historique est donc constitué par
l'app elle-même, depuis deux sources fusionnées par horodatage :

1. **Local (IndexedDB)** — chaque relevé reçu pendant que l'app est ouverte est
   enregistré sur l'appareil, conservé 120 jours. Aucune donnée ne sort du
   téléphone. C'est pour ça que laisser l'app ouverte pendant la visite donne la
   journée complète.
2. **Partagé (GitHub Actions)** — `.github/workflows/collect-history.yml` prend
   un instantané toutes les 30 minutes entre 7h et 21h UTC et l'écrit dans la
   branche orpheline `history` du dépôt. `vercel.json` désactive les
   déploiements sur cette branche, donc ces commits ne déclenchent aucun build.
   La cadence est calée pour tenir dans les 2 000 minutes Actions/mois offertes
   sur un dépôt privé (28 exécutions/jour, facturées une minute chacune) ;
   passer à `*/20` la ferait dépasser.

Le second est lu par `/api/history`. **Ce dépôt étant privé**, la lecture de la
branche `history` demande un jeton — à ajouter dans les variables
d'environnement du projet Vercel :

| Variable | Rôle |
| --- | --- |
| `HISTORY_GITHUB_TOKEN` | jeton en lecture seule sur le dépôt (permet aussi de lister les jours disponibles) |
| `HISTORY_REPO` | `owner/repo`, si différent de la valeur par défaut |
| `HISTORY_BRANCH` | branche de stockage, `history` par défaut |

Le jeton se crée sur
[github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens)
(fine-grained, ce seul dépôt, permission **Contents: read-only**). En attendant,
l'app se rabat proprement sur l'historique local — la collecte, elle, tourne
déjà et l'historique accumulé sera lisible rétroactivement dès l'ajout du jeton.

Ce que ce stockage sait faire, ce qui casserait en premier et quand il vaudrait
la peine de passer à une vraie base de données : `docs/historique-et-stockage.md`.

## Déploiement

Hébergé sur Vercel, déployé à chaque push sur `main`.

## Limites connues

- « L'Aventure Astérix » n'a pas de position : aucune donnée OpenStreetMap. Elle
  est listée sous la carte plutôt que placée au hasard.
- Pas encore de service worker : l'app est installable (manifeste + icônes) mais
  ne fonctionne pas hors-ligne.
- Les données sont fournies sans garantie par wartezeiten.app.
