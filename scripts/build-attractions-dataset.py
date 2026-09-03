#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regenerates src/data/attractions.json.

Neither wait-time API carries coordinates, and Wartezeiten.APP only speaks
de/en, so this script joins three sources:

  * the wait-time API's own attraction list (uuid, code, name) — the key
    everything hangs off, since those ids are stable across renames. Which API
    depends on the park, exactly as in `src/lib/parks.ts`;
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
QUEUE_TIMES = "https://queue-times.com"
OVERPASS_MIRRORS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]
OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src/data/attractions.json",
)

# Keep in sync with `src/lib/parks.ts`: same ids, same sources.
PARKS = {
    "parcasterix": {
        "source": ("wartezeiten", "parcasterix"),
        # Language whose ride names we want to display.
        "language": "de",
        # Overpass bounding box, S,W,N,E.
        "bbox": (49.1250, 2.5550, 49.1470, 2.5900),
    },
    "europapark": {
        "source": ("wartezeiten", "europapark"),
        "language": "en",
        "bbox": (48.2530, 7.7050, 48.2760, 7.7400),
    },
    "walibirhonealpes": {
        # Absent from Wartezeiten.APP; Queue-Times carries it as park 301.
        "source": ("queuetimes", 301),
        "bbox": (45.6180, 5.5650, 45.6250, 5.5760),
    },
    # The boxes below are the `tourism=theme_park` polygons OpenStreetMap
    # carries for each park. The two Disney ones are neighbours, so they have
    # to stay tight: a loose box would pull the other park's rides in.
    "disneylandparis": {
        "source": ("wartezeiten", "disneylandparis"),
        "language": "en",
        "bbox": (48.8685, 2.7700, 48.8761, 2.7821),
    },
    "disneyadventureworld": {
        "source": ("wartezeiten", "disneyadventureworld"),
        "language": "en",
        "bbox": (48.8621, 2.7716, 48.8687, 2.7811),
    },
    "futuroscope": {
        "source": ("wartezeiten", "futuroscope"),
        # The API answers in English whichever language we ask for, so the
        # French labels can only come from OpenStreetMap.
        "language": "en",
        "frenchFromOsm": True,
        "bbox": (46.6664, 0.3638, 46.6743, 0.3772),
    },
    "nigloland": {
        "source": ("wartezeiten", "nigloland"),
        "language": "en",
        "bbox": (48.2572, 4.6080, 48.2660, 4.6197),
    },
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
    "walibirhonealpes": {
        # "Repar'Ta Kar" is too recent to be in OpenStreetMap: left without
        # GPS, the app lists it separately under the map.
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
    if not name:
        return ""
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


def queue_times(park_id: int) -> list:
    """Rides for one Queue-Times park, flattened out of its `lands`."""
    req = urllib.request.Request(
        f"{QUEUE_TIMES}/parks/{park_id}/queue_times.json",
        headers={"accept": "application/json", "user-agent": "parc-attraction/1.0"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    rides = list(data.get("rides") or [])
    for land in data.get("lands") or []:
        rides.extend(land.get("rides") or [])
    return rides


def attraction_rows(park: str) -> list:
    """`(uuid, code, name, localised name)` for a park, whatever its source.

    Queue-Times has no notion of language: the ride names it serves for a
    French park are already the French ones, so there is nothing to localise.
    """
    config = PARKS[park]
    provider, park_id = config["source"]

    if provider == "queuetimes":
        return [
            (f"qt-{row['id']}", str(row["id"]), row["name"], None)
            for row in queue_times(park_id)
        ]

    english = api_get("waitingtimes", {"park": park_id, "language": "en"})
    localised = {
        row["uuid"]: row["name"]
        for row in api_get(
            "waitingtimes", {"park": park_id, "language": config["language"]}
        )
        if row.get("uuid")
    }
    # Futuroscope serves a row with neither name nor uuid: nothing to display,
    # nothing to key on, nothing to match against OpenStreetMap.
    usable = [row for row in english if row.get("name") and row.get("uuid")]
    if len(usable) != len(english):
        print(f"  dropped {len(english) - len(usable)} unusable row(s)")
    return [
        (row["uuid"], row.get("code") or "", row["name"], localised.get(row["uuid"]))
        for row in usable
    ]


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


# Every tag a ride may be findable under. `name` is the local one (French, in
# a French park) and stays the label we display; the others only widen the net,
# which is what lets a park whose API answers in English — Futuroscope — still
# find its OpenStreetMap feature.
NAME_TAGS = ("name", "name:en", "name:fr", "name:de", "alt_name", "official_name", "short_name")


def index_osm(elements: list) -> dict:
    best = {}
    for element in elements:
        tags = element.get("tags", {})
        name = tags.get("name")
        if not name:
            continue
        lat = element.get("lat") or (element.get("center") or {}).get("lat")
        lon = element.get("lon") or (element.get("center") or {}).get("lon")
        if lat is None or lon is None:
            continue
        candidate = {
            "name": name,
            "lat": lat,
            "lon": lon,
            "score": tag_score(tags),
            "kind": tags.get("attraction") or tags.get("leisure") or "",
        }
        for tag in NAME_TAGS:
            key = normalise(tags.get(tag, ""))
            if not key:
                continue
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
    print(f"### {park}")
    rows = attraction_rows(park)
    osm = index_osm(overpass(PARKS[park]["bbox"]))

    entries, missing = [], []
    for uuid, code, name, localised in rows:
        entry = {
            "uuid": uuid,
            "code": code,
            "name": name,
            "slug": normalise(name).replace(" ", "-"),
        }

        french = FRENCH_NAMES.get(park, {}).get(name) or localised
        if french and french != name:
            entry["nameFr"] = french

        hit, how = match(name, osm)
        if hit:
            entry["lat"] = round(hit["lat"], 6)
            entry["lon"] = round(hit["lon"], 6)
            if hit["kind"]:
                entry["kind"] = hit["kind"]
            entry["osmName"] = hit["name"]
            # Futuroscope's API answers in English whichever language we ask
            # for, so the only French name available is the OpenStreetMap one.
            if (
                PARKS[park].get("frenchFromOsm")
                and "nameFr" not in entry
                and hit["name"] != name
            ):
                entry["nameFr"] = hit["name"]
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
