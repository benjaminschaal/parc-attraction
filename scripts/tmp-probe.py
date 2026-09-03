#!/usr/bin/env python3
"""Fichier jetable : exécute le générateur, parc par parc, et imprime le JSON.

Le proxy de la session de développement bloque api.wartezeiten.app et
Overpass ; ce script fait tourner `build-attractions-dataset.py` sur un runner,
dont le réseau est ouvert. Overpass renvoie régulièrement des 504, d'où les
tentatives successives.
"""
import importlib.util
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "builder", os.path.join(HERE, "build-attractions-dataset.py")
)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

for park in sys.argv[1:]:
    for attempt in range(1, 6):
        try:
            entries = builder.build(park)
            print(f"DATASET {park} {json.dumps(entries, ensure_ascii=False)}")
            break
        except SystemExit as error:
            print(f"{park} attempt {attempt}: {error}", file=sys.stderr)
            time.sleep(15)
    else:
        print(f"DATASET_FAILED {park}")
