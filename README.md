# Files d'attente — parcs français & Europa-Park

Webapp de suivi des temps d'attente, construite sur deux API publiques :
[wartezeiten.app](https://api.wartezeiten.app/) et
[Queue-Times](https://queue-times.com/).

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

Sept parcs : Parc Astérix, Disneyland Paris, Disney Adventure World,
Futuroscope, Nigloland, Walibi Rhône-Alpes et Europa-Park. Le sélecteur en haut
de l'écran est un menu déroulant natif, groupé par pays — il encaisse la liste
quelle que soit sa longueur, là où la rangée de boutons qu'il remplace ne tenait
qu'à trois sur un téléphone.

Ajouter un parc = une entrée dans `src/lib/parks.ts`, la même dans
`scripts/build-attractions-dataset.py` (avec son emprise Overpass) et
`scripts/collect-history.mjs`, puis une passe du générateur de données.

## Développement

```bash
npm install
npm run dev
```

## Comment ça marche

### Deux sources, un seul instantané

Aucune API gratuite ne couvre les sept parcs, donc chaque parc déclare la
sienne dans `src/lib/parks.ts` :

| Parc | Source | Ce qu'on obtient |
| --- | --- | --- |
| Parc Astérix | wartezeiten.app (`parcasterix`) | attentes, statut détaillé, horaires, affluence |
| Disneyland Paris | wartezeiten.app (`disneylandparis`) | idem |
| Disney Adventure World | wartezeiten.app (`disneyadventureworld`) | idem |
| Futuroscope | wartezeiten.app (`futuroscope`) | idem, mais noms en anglais — voir plus bas |
| Nigloland | wartezeiten.app (`nigloland`) | idem |
| Europa-Park | wartezeiten.app (`europapark`) | idem |
| Walibi Rhône-Alpes | Queue-Times (parc `301`) | attentes et ouvert/fermé, **rien d'autre** |

`src/lib/sources.ts` aiguille vers le bon lecteur et normalise les deux formats
en un `ParkSnapshot` unique (`src/lib/snapshot.ts`). Pour Walibi, `opening` et
`crowdLevel` valent `null` : l'en-tête masque simplement la jauge d'affluence et
les horaires.

Walibi Rhône-Alpes ne figure pas dans les 46 parcs de wartezeiten.app — vérifié
en interrogeant `/v1/parks`. C'est la seule raison de la deuxième source.

**Crédit obligatoire.** Les conditions de Queue-Times imposent d'afficher
« Powered by Queue-Times.com » avec un lien vers le site. C'est la mention en
pied de page pour ce parc ; ne pas la reformuler.

### Le proxy est obligatoire

L'API wartezeiten.app **n'envoie aucun en-tête CORS** : elle est injoignable
depuis le navigateur. Toutes les données passent par
`src/app/api/park/[park]/route.ts`, qui appelle les trois endpoints
(`waitingtimes`, `openingtimes`, `crowdlevel`) et renvoie un instantané unique.
L'API limite à 100 requêtes/minute avec blocage de 15 minutes au-delà, donc les
réponses sont mises en cache côté serveur et côté CDN. Queue-Times se
rafraîchit toutes les 5 minutes et demande de ne pas interroger plus vite : son
cache serveur est calé sur cette durée.

### Les coordonnées GPS ne viennent pas de l'API

Aucune des deux API ne publie de position. `src/data/attractions.json` associe
chaque identifiant d'attraction — l'`uuid` de wartezeiten.app, ou `qt-<id>` côté
Queue-Times — à des coordonnées OpenStreetMap (licence ODbL), récupérées
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

wartezeiten.app ne parle que `de` et `en` (Queue-Times sert déjà les noms
français pour un parc français). Trois cas cohabitent :

- **Noms déjà français dans la réponse** — Parc Astérix (en `de`), Nigloland et
  les deux parcs Disney (en `en`) : l'API renvoie les noms d'origine.
- **Table manuelle** — Europa-Park : les libellés français sont dans
  `attractions.json` (`nameFr`), via `FRENCH_NAMES` dans le générateur.
- **Noms repris d'OpenStreetMap** — Futuroscope, seul parc dont l'API répond en
  anglais *quelle que soit* la langue demandée. Le générateur indexe les
  attractions OSM sous tous leurs tags de nom (`name`, `name:en`, `name:fr`,
  `alt_name`…), ce qui permet de retrouver « L'Extraordinaire Voyage » à partir
  de « The Extraordinary Journey » — et de s'en servir comme `nameFr`. C'est le
  drapeau `frenchFromOsm` dans `scripts/build-attractions-dataset.py`.

### L'historique

Aucune des deux API ne publie autre chose que l'instant présent. L'historique
est donc constitué par l'app elle-même, depuis deux sources fusionnées par
horodatage :

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

- 21 attractions sur 221 n'ont pas de position : aucune donnée OpenStreetMap
  sous un nom reconnaissable. Elles sont listées sous la carte plutôt que
  placées au hasard. Le Futuroscope est le plus touché (12 sur 26) — ses
  attractions récentes et couvertes ne sont pas encore cartographiées.
- Le Futuroscope sert une ligne sans nom ni identifiant ; elle est écartée à la
  lecture (`fetchWartezeitenSnapshot`) et par le générateur. Sans ça, le schéma
  la rejetait et la page entière tombait en 502.
- Walibi Rhône-Alpes n'a ni horaires d'ouverture ni indice d'affluence, et ses
  attractions sont seulement « ouverte » ou « fermée » : Queue-Times ne publie
  rien de plus. Si wartezeiten.app ajoute le parc un jour, il suffira de changer
  son `source` dans `src/lib/parks.ts`.
- Pas encore de service worker : l'app est installable (manifeste + icônes) mais
  ne fonctionne pas hors-ligne.
- Les données sont fournies sans garantie par wartezeiten.app.
