// MapLibre GL JS derives its worker script URL from `import.meta.url` of its
// own module. Under Turbopack (Next.js 16's default engine), that URL isn't a
// plain http(s) URL, so MapLibre's auto-detection silently returns an empty
// string and the map never receives vector tiles — no error is surfaced, the
// map simply stays blank.
//
// The fix is to serve the worker script (and its one internal dependency)
// ourselves and point MapLibre at it with `setWorkerUrl()` (see ParkMap.tsx).
// This copies both files out of node_modules on every install, so they stay in
// sync with the installed maplibre-gl version.
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const dist = path.join(projectRoot, "node_modules/maplibre-gl/dist");
const publicDir = path.join(projectRoot, "public");

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  const src = path.join(dist, file);
  if (!existsSync(src)) {
    console.warn(`[copy-maplibre-worker] Missing ${src}, skipping.`);
    continue;
  }
  copyFileSync(src, path.join(publicDir, file));
  console.log(`[copy-maplibre-worker] Copied ${file} to public/`);
}
