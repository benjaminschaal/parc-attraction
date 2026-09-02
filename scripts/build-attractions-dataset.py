#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regenerates src/data/attractions.json.

The Wartezeiten.APP API carries no coordinates and only speaks de/en, so this
script joins three sources:

  * the API's own attraction list (uuid, code, name) — the key everything hangs
    off, since uuids are stable across renames;
  * OpenStreetMap, queried through Overpass, for the GPS positions;
  * the manual tables below, for the handful of rides Overpass names
    differently and for Europa-Park's French labels.

Run it when a park adds or renames an attraction:

    python3 scripts/build-attractions-dataset.py

Matching is reported on stdout — check the `fuzzy` lines and the "no GPS" list
before committing the result.
"""
import difflib
import json
import os
import re
import sys
import unicodedata
import urllib.parse
import urllib.request

API = "https://api.wartezeiten.app/v1"
OVERPASS_MIRRORS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src/data/attractions.json",
)

PARKS = {
    # id: (api language for the name list, Overpass bounding box S,W,N,E)
    "parcasterix": ("de", (49.1250, 2.5550, 49.1470, 2.5900)),
    "europapark": ("en", (48.2530, 7.7050, 48.2760, 7.7400)),
}

# Rides Overpass carries under a different name, or not at all under the name
# the API uses. Coordinates checked by hand against the OSM feature named in
# the comment.
MANUAL_COORDS = {
    "parcasterix": {
        "The Descent of the Nile": (49.133465, 2.567453, "log_flume"),      # La Descente du Nil
        "The Flight of Ibis": (49.133799, 2.568033, "swing_carousel"),      # L'Envol d'Ibis
        "Panoramix Play Area": (49.133930, 2.571662, "playground"),         # Aire de Jeux Panoramix
        "Petit Chêne Play Area": (49.134127, 2.570858, "playground"),       # Aire de Jeux du Petit Chêne
        "Sanglier d'Or playground": (49.135855, 2.568660, "playground"),    # Aire de jeux du Sanglier d'Or
        "Etamine": (49.133739, 2.571351, "carousel"),
        "Le Petit Train": (49.134335, 2.571950, "train"),
        # "L'Aventure Astérix" has no OpenStreetMap feature: left without GPS,
        # the app lists it separately under the map.
    },
    "europapark": {
        "Atlantis Adventure": (48.266270, 7.720209, "dark_ride"),               # Abenteuer Atlantis
        "Jim Button - Journey through Morrowland": (48.267241, 7.722689, "roller_coaster"),
        "Josefina’s Magical Imperial Journey": (48.263839, 7.721993, "roller_coaster"),
        "Swiss Bob Run": (48.266266, 7.721562, "roller_coaster"),               # Schweizer Bobbahn
        "Tirol Log Flume": (48.262526, 7.722238, "log_flume"),                  # Tiroler Wildwasserbahn
        "Vienna Wave Swing - 'Glückspilz'": (48.262339, 7.722945, "swing_carousel"),
        "Voletarium": (48.269016, 7.722806, "flying_theater"),
        "Voltron Nevera powered by Rimac": (48.265717, 7.719798, "roller_coaster"),
        "Water rollercoaster Poseidon": (48.266666, 7.719271, "roller_coaster"),  # Wasserachterbahn Poseidon
    },
}

# Europa-Park's French labels, as used by wartezeiten.app's own /fr/ pages.
# Parc Astérix needs none: its `de` response is already in French.
FRENCH_NAMES = {
    "europapark": {
        "Atlantis Adventure": "A la découverte d'Atlantis",
        "Swiss Bob Run": "Bobsleigh Suisse",
        "Alpine Express 'Enzian'": "Express des Alpes «Enzian»",
        "Jim Button - Journey through Morrowland": "Jim Bouton - Voyage à travers Lummerland",
        "Josefina’s Magical Imperial Journey": "Josefina et son voyage magique",
        "Matterhorn-Blitz": "L'éclair du Cervin « Matterhorn-Blitz »",
        "Vienna Wave Swing - 'Glückspilz'": "Les chaises volantes de Vienne",
        "Tirol Log Flume": "Les Rapides du Tyrol",
        "Pirates in Batavia": "Pirates de Batavia",
        "Water rollercoaster Poseidon": "Poseidon grand huit aquatique",
        "Poppy Towers": "Tourlicots",
    },
}


def normalise(name: str) -> str:
    """Folds accents, articles and OSM's trailing '(12)' suffixes away."""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"\(\s*\d+\s*\)", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\b(le|la|les|l|de|du|des|d|the|der|die|das|von|el)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def api_get(endpoint: str, headers: dict) -> list:
    # Cloudflare rejects urllib's default User-Agent outright.
    req = urllib.request.Request(
        f"{API}/{endpoint}",
        headers={
            "accept": "application/json",
            "user-agent": "parc-attraction/1.0",
            **headers,
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def overpass(bbox) -> list:
    s, w, n, e = bbox
    box = f"{s},{w},{n},{e}"
    query = f"""[out:json][timeout:150];
(
  nwr["attraction"]({box});
  nwr["tourism"="attraction"]({box});
  nwr["leisure"="playground"]["name"]({box});
);
out center tags;"""
    for mirror in OVERPASS_MIRRORS:
        try:
            data = urllib.parse.urlencode({"data": query}).encode()
            req = urllib.request.Request(
                mirror, data=data, headers={"User-Agent": "parc-attraction/1.0"}
            )
            with urllib.request.urlopen(req, timeout=180) as r:
                body = r.read().decode()
            if body.lstrip().startswith("{"):
                return json.loads(body)["elements"]
            print(f"  {mirror}: {body[:120]}", file=sys.stderr)
        except Exception as error:  # noqa: BLE001 - mirrors fail routinely
            print(f"  {mirror}: {error!r}", file=sys.stderr)
    raise SystemExit("every Overpass mirror failed")


def tag_score(tags: dict) -> int:
    """Prefers the element that actually describes the ride.

    A single ride is often several OSM features (the track way, the station
    node, a playground polygon); the one carrying `attraction=<something>` and
    `tourism=attraction` is the one we want.
    """
    score = 0
    kind = tags.get("attraction", "")
    if kind and kind != "yes":
        score += 3
    elif kind == "yes":
        score += 1
    if tags.get("tourism") == "attraction":
        score += 2
    return score


def index_osm(elements: list) -> dict:
    best = {}
    for element in elements:
        tags = element.get("tags", {})
        name = tags.get("name")
        if not name:
            continue
        lat = element.get("lat") or (element.get("center") or {}).get("lat")
        lon = element.get("lon") or (element.get("center") or {}).get("lon")
        key = normalise(name)
        if lat is None or lon is None or not key:
            continue
        candidate = {
            "name": name,
            "lat": lat,
            "lon": lon,
            "score": tag_score(tags),
            "kind": tags.get("attraction") or tags.get("leisure") or "",
        }
        if key not in best or candidate["score"] > best[key]["score"]:
            best[key] = candidate
    return best


def match(name: str, osm: dict):
    key = normalise(name)
    if key in osm:
        return osm[key], "exact"
    contained = [
        k for k in osm if (key in k or k in key) and abs(len(k) - len(key)) < 14
    ]
    if contained:
        contained.sort(key=lambda k: (-osm[k]["score"], abs(len(k) - len(key))))
        return osm[contained[0]], "substr"
    close = difflib.get_close_matches(key, list(osm), n=1, cutoff=0.82)
    if close:
        return osm[close[0]], "fuzzy"
    return None, None


def build(park: str) -> list:
    language, bbox = PARKS[park]
    print(f"### {park}")
    attractions = api_get("waitingtimes", {"park": park, "language": "en"})
    localised = {
        row["uuid"]: row["name"]
        for row in api_get("waitingtimes", {"park": park, "language": language})
    }
    osm = index_osm(overpass(bbox))

    entries, missing = [], []
    for row in attractions:
        name = row["name"]
        entry = {
            "uuid": row["uuid"],
            "code": row["code"],
            "name": name,
            "slug": normalise(name).replace(" ", "-"),
        }

        french = FRENCH_NAMES.get(park, {}).get(name) or localised.get(row["uuid"])
        if french and french != name:
            entry["nameFr"] = french

        hit, how = match(name, osm)
        if hit:
            entry["lat"] = round(hit["lat"], 6)
            entry["lon"] = round(hit["lon"], 6)
            if hit["kind"]:
                entry["kind"] = hit["kind"]
            entry["osmName"] = hit["name"]
            if how != "exact":
                print(f"  [{how}] {name} -> {hit['name']}")
        elif name in MANUAL_COORDS.get(park, {}):
            lat, lon, kind = MANUAL_COORDS[park][name]
            entry["lat"], entry["lon"], entry["kind"] = lat, lon, kind
        else:
            missing.append(name)

        entries.append(entry)

    entries.sort(key=lambda e: normalise(e.get("nameFr") or e["name"]))
    located = sum(1 for e in entries if "lat" in e)
    print(f"  {len(entries)} attractions, {located} with GPS")
    for name in missing:
        print(f"  no GPS: {name}")
    return entries


def main() -> None:
    from datetime import date

    data = {
        "generatedAt": date.today().isoformat(),
        "source": "OpenStreetMap (ODbL) via Overpass API + manual curation",
        "parks": {park: build(park) for park in PARKS},
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
