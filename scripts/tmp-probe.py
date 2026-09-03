#!/usr/bin/env python3
"""Fichier jetable : exécute le générateur pour un seul parc et imprime le JSON.

Le proxy de la session de développement bloque queue-times.com et Overpass ;
ce script fait tourner `build-attractions-dataset.py` sur un runner, dont le
réseau est ouvert, pour produire les entrées à committer.
"""
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "builder", os.path.join(HERE, "build-attractions-dataset.py")
)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

park = sys.argv[1]
entries = builder.build(park)
print(f"DATASET {json.dumps(entries, ensure_ascii=False)}")
