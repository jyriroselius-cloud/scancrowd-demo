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

interface WaterFeature {
  geometry: { type: string; coordinates: number[][][] | number[][] } | null;
  properties: Record<string, unknown> | null;
}

export function extractWaterPolygons(
  features: WaterFeature[],
  centerLat: number,
  centerLon: number,
  maxKm = 2,
): [number, number][][] {
  const rings: [number, number][][] = [];
  for (const f of features) {
    if (!f.geometry) continue;
    let coords: number[][];
    const geo = f.geometry;
    if (geo.type === 'Polygon' && Array.isArray(geo.coordinates[0]) && Array.isArray((geo.coordinates[0] as number[][])[0])) {
      coords = geo.coordinates[0] as number[][];
    } else if (geo.type === 'LineString') {
      coords = geo.coordinates as number[][];
    } else {
      continue;
    }
    if (coords.length < 4) continue;
    const cx = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const cy = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    if (haversineKm(centerLat, centerLon, cy, cx) > maxKm) continue;
    const step = Math.max(1, Math.floor(coords.length / 30));
    const ring: [number, number][] = [];
    for (let i = 0; i < coords.length; i += step) ring.push([coords[i][0], coords[i][1]]);
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push(ring[0]);
    }
    if (ring.length >= 4) rings.push(ring);
  }
  return rings;
}
