/**
 * Regression test: LiveMap must not fall back to FallbackMap when the tab is
 * hidden during load. The old 12 s initTimeout fired regardless of visibility.
 *
 * Strategy:
 *  1. Override document.visibilityState / .hidden to 'hidden' before page scripts run.
 *  2. Navigate to the Map tab while "hidden".
 *  3. Wait 14 s — the old 12 s timeout would have fired by now.
 *  4. Assert FallbackMap is NOT shown.
 *  5. Make the tab visible → map must load, erroredTiles === 0, no fallback.
 *
 * Test timeout is 60 s to cover the 14 s wait + tile loading.
 */
import { test, expect } from 'playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:5174';
const PROD_PASSWORD = process.env.DEMO_PASSWORD || '';

test('LiveMap: no fallback when loaded in hidden tab, recovers on visibility', async ({ page }) => {
  test.setTimeout(60000);

  // Intercept visibility APIs before any page scripts execute.
  await page.addInitScript(() => {
    let _hidden = true;
    const def = (prop: string, get: () => unknown) =>
      Object.defineProperty(document, prop, { configurable: true, get: get as () => unknown });
    def('visibilityState', () => (_hidden ? 'hidden' : 'visible'));
    def('hidden', () => _hidden);
    // Expose toggle so the test can make the tab "visible".
    (window as unknown as Record<string, unknown>).__setVisible = () => {
      _hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    };
  });

  if (BASE !== 'http://localhost:5174' && PROD_PASSWORD) {
    await page.authenticate({ username: 'demo', password: PROD_PASSWORD });
  }

  await page.goto(BASE);
  await page.waitForSelector('nav', { timeout: 10000 });

  // Navigate to Map tab while hidden.
  await page.locator('nav button').filter({ hasText: /^Map$/ }).first().click();

  // Fire visibilitychange so any listener registered after mount sees hidden=true.
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

  // Wait 14 s — 2 s beyond the old 12 s initTimeout.
  await page.waitForTimeout(14000);

  // ── Assert 1: FallbackMap must NOT be visible while tab is hidden ──────────
  expect(
    await page.locator('[data-testid="fallback-map"]').count(),
    'FallbackMap must not appear while tab is hidden',
  ).toBe(0);

  // ── Make the tab visible ───────────────────────────────────────────────────
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>).__setVisible?.();
  });

  // Wait for proxy pins — MapLibre loaded, tiles rendered.
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="map-pin"]').length > 0,
    { timeout: 25000 },
  );

  // ── Assert 2: FallbackMap still not shown after becoming visible ───────────
  expect(
    await page.locator('[data-testid="fallback-map"]').count(),
    'FallbackMap must not appear after tab becomes visible',
  ).toBe(0);

  // ── Assert 3: no errored tiles (mirrors console-map-pins test 6) ──────────
  // Only run tile-state check if __scanMapIdle is reachable (production run).
  const hasIdle = await page.evaluate(
    () => typeof (window as unknown as Record<string, unknown>).__scanMapIdle === 'number',
  );
  if (hasIdle) {
    const { erroredTiles, totalTiles, srcId } = await page.evaluate(() => {
      type W = Record<string, unknown>;
      const wins = window as unknown as W;
      const m = wins.__scanMap as {
        style: { sourceCaches: Record<string, { _tiles: Record<string, { state: string }> }> };
      };
      const srcId = String(wins.__scanMapSrcId ?? '');
      const sc = m?.style?.sourceCaches?.[srcId];
      const allTiles = sc ? Object.values(sc._tiles) : [];
      return {
        erroredTiles: allTiles.filter((t) => t.state === 'errored').length,
        totalTiles: allTiles.length,
        srcId,
      };
    });
    expect(
      erroredTiles,
      `${erroredTiles}/${totalTiles} tiles errored for source "${srcId}"`,
    ).toBe(0);
  }
});
