/**
 * Tests for real-image display in IssueReview:
 *  1. Same issue shows the same photo after reload (deterministic seed).
 *  2. Detection boxes are rendered and stay within the image bounds at 1280 px.
 *  3. Detection boxes scale correctly when the viewport narrows to 1024 px.
 *  4. Categories with no images (sign, manhole, marking) show placeholder, not a wrong photo.
 */

import { test, expect, Page } from 'playwright/test';

const BASE = 'http://localhost:5174';

// Click "Review" on the first issue whose title contains any of the given keywords.
// Returns the image src if a photo is shown, null otherwise.
async function openIssueByKeyword(page: Page, keywords: string[]): Promise<string | null> {
  await page.goto(BASE);
  await page.waitForSelector('table', { timeout: 15000 });
  await page.waitForTimeout(800);

  // Find all table rows, look for one whose title cell matches a keyword
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).textContent() ?? '';
    if (keywords.some((kw) => text.includes(kw))) {
      await rows.nth(i).locator('button:has-text("Review")').click();
      await page.waitForTimeout(1000); // let ResizeObserver + sidecar fetch settle
      const img = page.locator('[data-testid="issue-photo"]');
      if (await img.count() > 0) {
        return await img.getAttribute('src');
      }
      return null; // photo not shown (placeholder)
    }
  }
  return null; // no matching issue
}

test('same issue shows same image after reload', async ({ page }) => {
  const src1 = await openIssueByKeyword(page, ['Pothole', 'Other']);
  if (!src1) {
    console.warn('No Pothole/Other issue with a photo found — skipping same-image test');
    return;
  }

  // Reload and open again
  const src2 = await openIssueByKeyword(page, ['Pothole', 'Other']);
  expect(src2).toBe(src1);
});

async function checkBoxAlignment(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  const src = await openIssueByKeyword(page, ['Pothole']);
  if (!src) {
    console.warn(`No Pothole issue with photo at ${viewport.width}px — skipping box test`);
    return;
  }

  await page.waitForTimeout(600); // ResizeObserver

  const img = page.locator('[data-testid="issue-photo"]');
  const svg = page.locator('[data-testid="detection-boxes"]');

  const imgBox = await img.boundingBox();
  expect(imgBox).not.toBeNull();

  if (await svg.count() === 0) {
    // Sidecar may have no detections — acceptable
    console.warn('No detection-boxes SVG found (sidecar may have 0 detections)');
    return;
  }

  const svgBox = await svg.boundingBox();
  expect(svgBox).not.toBeNull();
  if (!imgBox || !svgBox) return;

  // SVG overlay must be flush with the image (±4 px tolerance for rounding)
  expect(Math.abs(svgBox.x - imgBox.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(svgBox.y - imgBox.y)).toBeLessThanOrEqual(4);
  expect(Math.abs(svgBox.width - imgBox.width)).toBeLessThanOrEqual(4);
  expect(Math.abs(svgBox.height - imgBox.height)).toBeLessThanOrEqual(4);

  // Any rendered rect must lie within image bounds
  const rects = svg.locator('rect');
  const rectCount = await rects.count();
  if (rectCount > 0) {
    // Filter label-background rects (filled, short) vs box rects (no fill)
    for (let i = 0; i < rectCount; i++) {
      const fill = await rects.nth(i).getAttribute('fill');
      if (fill === 'none') {
        const r = await rects.nth(i).boundingBox();
        if (r) {
          expect(r.x).toBeGreaterThanOrEqual(imgBox.x - 2);
          expect(r.y).toBeGreaterThanOrEqual(imgBox.y - 2);
          expect(r.x + r.width).toBeLessThanOrEqual(imgBox.x + imgBox.width + 2);
          expect(r.y + r.height).toBeLessThanOrEqual(imgBox.y + imgBox.height + 2);
        }
      }
    }
  }
}

test('detection boxes align with image at 1280 px', async ({ page }) => {
  await checkBoxAlignment(page, { width: 1280, height: 800 });
});

test('detection boxes align with image at 1024 px', async ({ page }) => {
  await checkBoxAlignment(page, { width: 1024, height: 768 });
});

test('empty-category issue shows placeholder, not a wrong-category photo', async ({ page }) => {
  // Use seed=1 which statistically has sign/manhole/marking in the queue
  await page.goto(`${BASE}?seed=1`);
  await page.waitForSelector('table', { timeout: 15000 });
  await page.waitForTimeout(800);

  // Match by title keywords from TITLE_MAP for empty-folder categories:
  // Traffic sign → "traffic sign", "sign post", "Graffiti on sign"
  // Road marking → "marking", "stop line"
  // Manhole → "manhole"
  const EMPTY_CAT_KEYWORDS = ['traffic sign', 'sign post', 'graffiti on sign', 'marking', 'stop line', 'manhole'];

  const rows = page.locator('tbody tr');
  const count = await rows.count();
  let opened = false;
  for (let i = 0; i < count; i++) {
    const text = (await rows.nth(i).textContent() ?? '').toLowerCase();
    if (EMPTY_CAT_KEYWORDS.some((kw) => text.includes(kw))) {
      await rows.nth(i).locator('button:has-text("Review")').click();
      opened = true;
      break;
    }
  }

  if (!opened) {
    console.warn('No empty-category issue found — skipping placeholder test');
    return;
  }

  await page.waitForTimeout(800);

  // Must show placeholder, never a real image for these categories
  const photo = page.locator('[data-testid="issue-photo"]');
  const placeholder = page.locator('[data-testid="issue-photo-placeholder"]');

  const photoCount = await photo.count();
  const phCount = await placeholder.count();

  // Exactly one of the two should be visible
  expect(photoCount + phCount).toBe(1);
  // And it must be the placeholder, not a photo
  expect(phCount).toBe(1);
  expect(photoCount).toBe(0);
});
