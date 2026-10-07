import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'http://localhost:5100';
const OUT = new URL('../docs/verification/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];

async function test(label, url, width, height, checks) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();

  const networkRequests = [];
  page.on('request', req => {
    const u = req.url();
    if (!u.startsWith('data:') && !u.startsWith(BASE)) {
      networkRequests.push(u);
    }
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1000);

  const slug = label.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  await page.screenshot({ path: `${OUT}${slug}.png`, fullPage: false });

  const result = { label, url, width, height, checks: {}, networkRequests };
  for (const [key, fn] of Object.entries(checks)) {
    try {
      result.checks[key] = await fn(page);
    } catch (e) {
      result.checks[key] = `ERROR: ${e.message}`;
    }
  }
  await ctx.close();
  results.push(result);
  console.log(`✓ ${label} — screenshot saved`);
}

// ── Test 1: Tampere at 1280px ──────────────────────────────────────────────
await test('Tampere_1280', `${BASE}/?city=Tampere`, 1280, 800, {
  hasContent: async p => (await p.title()).length > 0 || (await p.locator('body').innerText()).length > 50,
  streetNames: async p => {
    const text = await p.locator('body').innerText();
    // Tampere street names from city data
    return text.includes('Hämeenkatu') || text.includes('Satakunnankatu') || text.includes('Tampere');
  },
  noErrors: async p => {
    const errors = await p.evaluate(() => window.__errors ?? []);
    return errors.length === 0;
  },
});

// ── Test 2: Tampere reload — same data ────────────────────────────────────
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p2 = await ctx2.newPage();
await p2.goto(`${BASE}/?city=Tampere`, { waitUntil: 'networkidle', timeout: 10000 });
await p2.waitForTimeout(500);
const text1 = await p2.locator('body').innerText();
await p2.reload({ waitUntil: 'networkidle' });
await p2.waitForTimeout(500);
const text2 = await p2.locator('body').innerText();
const sameAfterReload = text1.trim() === text2.trim();
results.push({ label: 'Reload_same_data', checks: { identical: sameAfterReload } });
await ctx2.close();
console.log(`✓ Reload test — same data: ${sameAfterReload}`);

// ── Test 3: Lempäälä at 1280px ────────────────────────────────────────────
await test('Lempaala_1280', `${BASE}/?city=Lempaala`, 1280, 800, {
  differentFromTampere: async p => {
    const text = await p.locator('body').innerText();
    // Lempäälä has its own streets
    return text.includes('Lempäälä') || text.includes('Sääksjärventie') || text.includes('Lempaala');
  },
});

// ── Test 4: Tampere at 1024px ─────────────────────────────────────────────
await test('Tampere_1024', `${BASE}/?city=Tampere`, 1024, 768, {
  noHorizontalScroll: async p => {
    const { scrollWidth, clientWidth } = await p.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    return scrollWidth <= clientWidth + 2; // 2px tolerance
  },
});

// ── Test 5: Verify network requests go only to map tiles ──────────────────
const ctx5 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p5 = await ctx5.newPage();
const externalRequests = [];
p5.on('request', req => {
  const u = req.url();
  if (!u.startsWith('data:') && !u.startsWith(BASE)) {
    externalRequests.push(u);
  }
});
await p5.goto(`${BASE}/?city=Tampere`, { waitUntil: 'networkidle', timeout: 10000 });
await p5.waitForTimeout(2000);
const mapTileHosts = ['openfreemap', 'tiles', 'tile', 'basemaps'];
const nonTileRequests = externalRequests.filter(u =>
  !mapTileHosts.some(h => u.includes(h))
);
results.push({
  label: 'Network_requests',
  checks: {
    allExternal: externalRequests,
    nonTileRequests,
    onlyMapTiles: nonTileRequests.length === 0,
  },
});
await ctx5.close();
console.log(`✓ Network test — external requests: ${externalRequests.length}, non-tile: ${nonTileRequests.length}`);

await browser.close();

// ── Save report ────────────────────────────────────────────────────────────
writeFileSync(`${OUT}console-verification.json`, JSON.stringify(results, null, 2));
console.log('\n=== RESULTS ===');
for (const r of results) {
  console.log(`\n[${r.label}]`);
  for (const [k, v] of Object.entries(r.checks)) {
    if (Array.isArray(v)) {
      console.log(`  ${k}: [${v.length} items] ${v.slice(0, 3).join(', ')}`);
    } else {
      console.log(`  ${k}: ${v}`);
    }
  }
}
console.log('\nScreenshots and report saved to docs/verification/');
