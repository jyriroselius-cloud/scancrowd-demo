/**
 * Deterministic seed from a geographic position.
 * Resolution: ~1.1 km grid (0.01° step).
 * Same lat/lon within that grid → same seed on phone and console.
 */
export function locationSeed(lat: number, lon: number): number {
  const a = Math.round(lat * 100) + 9000;   // 0 – 18 000
  const b = Math.round(lon * 100) + 18000;  // 0 – 36 000
  return a * 36001 + b;                      // unique, positive, fits in 32-bit
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
