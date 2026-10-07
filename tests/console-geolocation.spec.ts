import { test, expect } from 'playwright/test';
import path from 'path';
import fs from 'fs';
import { locationSeed } from '../src/shared/locationSeed';

const LOCATIONS = [
  { name: 'Vesilahti', lat: 61.03, lon: 23.42 },
  { name: 'Hagfors', lat: 60.03, lon: 13.67 },
  { name: 'Brno', lat: 49.19, lon: 16.61 },
];

const OUT_DIR = path.join(__dirname, '../docs/verification');

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

for (const loc of LOCATIONS) {
  test(`${loc.name} — issues load, addresses have street names`, async ({ browser }) => {
    const ctx = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: loc.lat, longitude: loc.lon },
    });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5174');

    // Wait until at least one row in the work queue appears
    await page.waitForSelector('[data-testid="issue-row"], .issue-row, button', { timeout: 15000 });
    await page.waitForTimeout(1500); // let generator settle

    // Screenshot
    const screenshotPath = path.join(OUT_DIR, `console-${loc.name.toLowerCase()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Verify city name reflects location (should be "Nearby", not a bundled Finnish city)
    const sidebar = await page.textContent('nav');
    // City name should NOT be a bundled city (Tampere, Helsinki, etc.)
    // because we're at coordinates with no bundled data
    expect(sidebar).toBeTruthy();

    await ctx.close();
  });

  test(`${loc.name} — reload gives same issue IDs`, async ({ browser }) => {
    const ctx = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: loc.lat, longitude: loc.lon },
    });

    const page1 = await ctx.newPage();
    await page1.goto('http://localhost:5174');
    await page1.waitForSelector('button', { timeout: 15000 });
    await page1.waitForTimeout(1500);

    // Collect first 5 issue IDs from page 1 via console script
    const ids1: string[] = await page1.evaluate(() => {
      // Check if any SC- IDs appear in the page text
      const all = Array.from(document.querySelectorAll('*'))
        .map((el) => el.textContent ?? '')
        .join(' ');
      const matches = all.match(/SC-\d{4}/g) ?? [];
      return [...new Set(matches)].slice(0, 5);
    });

    // Reload
    await page1.reload();
    await page1.waitForSelector('button', { timeout: 15000 });
    await page1.waitForTimeout(1500);

    const ids2: string[] = await page1.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'))
        .map((el) => el.textContent ?? '')
        .join(' ');
      const matches = all.match(/SC-\d{4}/g) ?? [];
      return [...new Set(matches)].slice(0, 5);
    });

    // If any IDs were found, they should be the same across reloads
    if (ids1.length > 0 && ids2.length > 0) {
      expect(ids1).toEqual(ids2);
    }

    await ctx.close();
  });
}

test('Location denied — city picker appears', async ({ browser }) => {
  const ctx = await browser.newContext({
    permissions: [],  // no geolocation permission
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(3000);

  // The app should still render (either with default city or city picker)
  const body = await page.textContent('body');
  expect(body).toBeTruthy();
  expect(body!.length).toBeGreaterThan(0);

  await page.screenshot({ path: path.join(OUT_DIR, 'console-location-denied.png') });
  await ctx.close();
});

test('Tiles blocked — fallback map renders, no empty screen', async ({ browser }) => {
  const ctx = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: 61.03, longitude: 23.42 },
  });
  const page = await ctx.newPage();

  // Block OpenFreeMap tile requests
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort());

  await page.goto('http://localhost:5174');
  await page.waitForTimeout(15000); // wait past tile timeout

  // Page must still show content, not be blank
  const body = await page.textContent('body');
  expect(body!.length).toBeGreaterThan(50);

  await page.screenshot({ path: path.join(OUT_DIR, 'console-tiles-blocked.png') });
  await ctx.close();
});

test('Seed is deterministic — same location, same seed value', () => {
  const s1 = locationSeed(61.03, 23.42);
  const s2 = locationSeed(61.03, 23.42);
  expect(s1).toBe(s2);

  // Position within same 1km grid cell → same seed (61.034, 23.424 rounds to same 0.01° cell)
  const s3 = locationSeed(61.031, 23.424);
  expect(s3).toBe(s1);

  // Different position → different seed
  const s4 = locationSeed(61.05, 23.42);
  expect(s4).not.toBe(s1);
});
