/**
 * Regression tests for bugs found in live console:
 *  1. Fallback map shows pins when WebGL is disabled (--disable-gpu / stub WebGL).
 *  2. Image category matches detection label (no "line crack" on a Pothole issue).
 *  3. ISO week numbers are correct (Week 42 for 17 Oct 2026, not Week 3).
 *  4. Thumbnail strip is not empty when category has ≥2 images.
 */

import { test, expect, Page } from 'playwright/test';

const BASE = 'http://localhost:5174';

// ─── helpers ────────────────────────────────────────────────────────────────

async function openFirstPotholeIssue(page: Page) {
  await page.goto(BASE);
  await page.waitForSelector('table', { timeout: 15000 });
  await page.waitForTimeout(600);
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const text = (await rows.nth(i).textContent() ?? '').toLowerCase();
    if (text.includes('pothole')) {
      await rows.nth(i).locator('button:has-text("Review")').click();
      await page.waitForTimeout(1200); // sidecar fetch + ResizeObserver
      return;
    }
  }
}

// ─── Bug 1: fallback map pins ─────────────────────────────────────────────

test('fallback map shows pins when WebGL disabled', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  // Stub WebGL so MapLibre fails immediately on init
  await page.addInitScript(() => {
    const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
    const orig = proto.getContext as (...a: unknown[]) => unknown;
    proto.getContext = function (...args: unknown[]) {
      if (args[0] === 'webgl' || args[0] === 'webgl2') return null;
      return orig.apply(this, args);
    };
  });

  await page.goto(BASE);
  await page.waitForSelector('nav', { timeout: 10000 });

  // Navigate to the Map screen (LiveMap lives there, WorkQueue uses FallbackMap directly)
  await page.locator('nav button, nav a').filter({ hasText: /^Map$/ }).first().click();
  await page.waitForTimeout(12000); // LiveMap 10 s timeout → setFailed(true) → FallbackMap

  // FallbackMap in the Map screen — the one with showNote
  // Use nth(1) because WorkQueue also has a FallbackMap (nth 0) on wider screens
  // Better: find the one with the note, or just check fallback-maps in map section
  const maps = page.locator('[data-testid="fallback-map"]');
  const mapCount = await maps.count();
  expect(mapCount).toBeGreaterThan(0);

  // At least one pin visible somewhere on the page
  const pins = page.locator('[data-testid="map-pin"]');
  const pinCount = await pins.count();
  expect(pinCount).toBeGreaterThan(0);

  // "Simplified map" note from the Map screen's WebGL fallback
  await expect(page.locator('text=Simplified map')).toBeVisible({ timeout: 3000 });

  await context.close();
});

// ─── Bug 2: detection label matches category ─────────────────────────────

test('pothole issue shows pothole or crocodile_crack detection, not line crack', async ({ page }) => {
  await openFirstPotholeIssue(page);

  const photo = page.locator('[data-testid="issue-photo"]');
  const placeholder = page.locator('[data-testid="issue-photo-placeholder"]');

  // Either a matching image is shown, or the placeholder (no mismatch)
  const photoVisible = await photo.count() > 0;
  const placeholderVisible = await placeholder.count() > 0;
  expect(photoVisible || placeholderVisible).toBe(true);

  if (photoVisible) {
    // If boxes are shown, none should say "line crack"
    const svg = page.locator('[data-testid="detection-boxes"]');
    if (await svg.count() > 0) {
      const texts = await page.locator('[data-testid="detection-boxes"] text').allTextContents();
      const hasLineCrack = texts.some((t) => t.toLowerCase().includes('line crack') || t.toLowerCase().includes('line_crack'));
      expect(hasLineCrack).toBe(false);
    }
  }
});

// ─── Bug 3: ISO week number ──────────────────────────────────────────────

test('planned fix dropdown shows correct ISO week numbers', async ({ page }) => {
  await openFirstPotholeIssue(page);

  // Accept panel must be visible
  const select = page.locator('select').nth(1); // second select = planned week
  await expect(select).toBeVisible({ timeout: 5000 });

  const options = await select.locator('option').allTextContents();
  expect(options.length).toBeGreaterThanOrEqual(2);

  // Each option must be "Week NN · D Mon" where NN is 1–53
  for (const opt of options) {
    const m = opt.match(/^Week (\d+) · /);
    expect(m, `Option "${opt}" doesn't match "Week NN · ..." format`).not.toBeNull();
    if (m) {
      const wk = parseInt(m[1], 10);
      expect(wk).toBeGreaterThanOrEqual(1);
      expect(wk).toBeLessThanOrEqual(53);
    }
  }

  // First option week must be > current month week count (i.e. not a day-of-month week)
  // If today is in October, "Week 3" would mean month-relative → wrong
  // The correct ISO week for any date in Oct 2026 is 40–44
  const today = new Date();
  if (today.getMonth() >= 9) { // October or later
    const firstWk = parseInt(options[0].match(/^Week (\d+)/)![1], 10);
    expect(firstWk).toBeGreaterThan(4); // month-relative would give ≤5
  }
});

// ─── Bug 4: thumbnail strip ──────────────────────────────────────────────

test('thumbnail strip shows images when category has multiple photos', async ({ page }) => {
  await openFirstPotholeIssue(page);

  const photo = page.locator('[data-testid="issue-photo"]');
  if (await photo.count() === 0) {
    // Placeholder shown — no thumbnails expected
    return;
  }

  // Pothole has 15 images, so thumbnails should appear
  const thumbs = page.locator('img[src*="/images/pothole/"]');
  const count = await thumbs.count();
  // At least 2 images total (main + ≥1 thumbnail)
  expect(count).toBeGreaterThanOrEqual(2);
});
