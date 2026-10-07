import type { StreetPoint } from './types';
import { haversineKm } from './locationSeed';

// Road classes to include (no motorways, no rail, no water)
const ALLOWED_CLASSES = new Set([
  'residential', 'tertiary', 'secondary', 'primary',
  'minor', 'service', 'unclassified', 'living_street', 'pedestrian', 'track',
]);

interface RoadFeature {
  properties: Record<string, unknown> | null;
  geometry: { type: string; coordinates: number[][] } | null;
}

/**
 * Parse MapLibre querySourceFeatures results into StreetPoints.
 * Works with the transportation_name layer from the OpenFreeMap/OpenMapTiles schema.
 */
export function extractStreets(
  features: RoadFeature[],
  centerLat: number,
  centerLon: number,
  maxKm = 1.5,
): StreetPoint[] {
  const seen = new Set<string>();
  const out: StreetPoint[] = [];

  for (const f of features) {
    if (!f.properties || !f.geometry) continue;
    if (f.geometry.type !== 'LineString') continue;

    const cls = f.properties['class'] as string | undefined;
    if (cls && !ALLOWED_CLASSES.has(cls)) continue;

    const name =
      (f.properties['name'] as string | undefined) ??
      (f.properties['name:en'] as string | undefined);
    if (!name || name.trim() === '') continue;
    if (seen.has(name)) continue;

    const coords = f.geometry.coordinates;
    if (!coords || coords.length === 0) continue;
    const mid = coords[Math.floor(coords.length / 2)];
    if (!mid || mid.length < 2) continue;
    const [lon, lat] = mid;

    if (haversineKm(centerLat, centerLon, lat, lon) > maxKm) continue;

    seen.add(name);
    out.push({ name, lat, lon });
  }

  return out;
}
