/**
 * Validates that no generated issue falls inside a water polygon
 * and every issue is ≤10 m from a street segment.
 * Runs against each bundled city with 5 different seeds.
 *
 * Requires rebuilt city JSONs (with segments + waterPolygons).
 * Cities without those fields are auto-skipped.
 */
import { test, expect } from 'playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const PROD_PASSWORD = process.env.DEMO_PASSWORD || '';

const CITIES = ['Tampere', 'Helsinki', 'Turku', 'Lempaala', 'Espoo', 'Vantaa'];
const SEEDS = [0, 1234, 9999, 42, 77777];

const DEG_PER_M = 1 / 111320;
const BUFFER_DEG = 15 * DEG_PER_M;
const MAX_DIST_DEG = 10 * DEG_PER_M;

function pointInRing(lat: number, lon: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function distToSegmentDeg(
  lat: number, lon: number,
  a: [number, number], b: [number, number],
): number {
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((lon - ax) * dx + (lat - ay) * dy) / len2)) : 0;
  return Math.sqrt((lon - (ax + t * dx)) ** 2 + (lat - (ay + t * dy)) ** 2);
}

function nearWater(lat: number, lon: number, rings: [number, number][][]): boolean {
  for (const ring of rings) {
    if (pointInRing(lat, lon, ring)) return true;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      if (distToSegmentDeg(lat, lon, ring[j] as [number, number], ring[i] as [number, number]) < BUFFER_DEG) return true;
    }
  }
  return false;
}

function distToNearestSegment(
  lat: number,
  lon: number,
  segments: Array<{ coords: [number, number][] }>,
): number {
  let minD = Infinity;
  for (const seg of segments) {
    for (let i = 0; i < seg.coords.length - 1; i++) {
      const d = distToSegmentDeg(
        lat, lon,
        seg.coords[i] as [number, number],
        seg.coords[i + 1] as [number, number],
      );
      if (d < minD) minD = d;
    }
  }
  return minD;
}

for (const city of CITIES) {
  for (const seed of SEEDS) {
    test(`${city} seed=${seed}: no pins in water, all ≤10 m from street`, async ({ page }) => {
      if (BASE !== 'http://localhost:5174' && PROD_PASSWORD) {
        await page.authenticate({ username: 'demo', password: PROD_PASSWORD });
      }

      await page.goto(`${BASE}?city=${city}&seed=${seed}`);
      await page.waitForSelector('nav', { timeout: 10000 });

      // Navigate to Map to ensure proxy pins are rendered
      await page.locator('nav button').filter({ hasText: /^Map$/ }).first().click();

      await page.waitForFunction(
        () => document.querySelectorAll('[data-testid="map-pin"]').length > 0,
        { timeout: 20000 },
      );

      type WinData = {
        __cityData?: {
          waterPolygons?: [number, number][][];
          segments?: { coords: [number, number][] }[];
        };
      };

      const result = await page.evaluate(() => {
        const wins = window as unknown as WinData;
        const cityData = wins.__cityData;
        const pins = Array.from(document.querySelectorAll('[data-testid="map-pin"]'));
        return {
          waterPolygons: cityData?.waterPolygons ?? [],
          segments: cityData?.segments ?? [],
          pins: pins.map((p) => ({
            lat: parseFloat((p as HTMLElement).dataset.lat ?? 'NaN'),
            lon: parseFloat((p as HTMLElement).dataset.lon ?? 'NaN'),
          })),
        };
      });

      const { waterPolygons, segments, pins } = result;

      // Skip if city hasn't been rebuilt yet
      if (waterPolygons.length === 0 && segments.length === 0) {
        test.skip(true, 'City not yet rebuilt with segments/waterPolygons');
        return;
      }

      let waterViolations = 0;
      let segmentViolations = 0;

      for (const pin of pins) {
        if (isNaN(pin.lat) || isNaN(pin.lon)) continue;
        if (nearWater(pin.lat, pin.lon, waterPolygons as [number, number][][])) waterViolations++;
        if (
          segments.length > 0 &&
          distToNearestSegment(pin.lat, pin.lon, segments as { coords: [number, number][] }[]) > MAX_DIST_DEG
        ) segmentViolations++;
      }

      expect(waterViolations, `${waterViolations}/${pins.length} pins in/near water`).toBe(0);
      expect(segmentViolations, `${segmentViolations}/${pins.length} pins >10 m from any street segment`).toBe(0);
    });
  }
}
