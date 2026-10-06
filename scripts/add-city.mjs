#!/usr/bin/env node
/**
 * npm run add-city -- "Lempäälä"
 * Fetches street names + GPS points from OpenStreetMap Overpass API
 * and writes src/shared/cities/<slug>.json
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CITIES_DIR = join(__dirname, '../src/shared/cities');
const OVERPASS = 'https://overpass-api.de/api/interpreter';

function slug(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '_');
}

async function getCenter(cityName) {
  const resp = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'scancrowd-demo/1.0' } }
  );
  const data = await resp.json();
  if (!data.length) throw new Error(`City not found: ${cityName}`);
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

async function fetchStreets(lat, lon, radius = 3000) {
  const query = `
[out:json][timeout:30];
(
  way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street)$"]
     ["name"]
     (around:${radius},${lat},${lon});
);
out center tags;
`;
  const resp = await fetch(OVERPASS, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const data = await resp.json();
  return data.elements || [];
}

async function main() {
  const cityName = process.argv[2];
  if (!cityName) {
    console.error('Usage: npm run add-city -- "City Name"');
    process.exit(1);
  }

  console.log(`Fetching data for: ${cityName}`);
  const center = await getCenter(cityName);
  console.log(`  Center: ${center.lat}, ${center.lon}`);

  const ways = await fetchStreets(center.lat, center.lon);
  console.log(`  Found ${ways.length} street segments`);

  // Deduplicate by name, keep one point per street
  const seen = new Set();
  const streets = [];
  for (const way of ways) {
    const name = way.tags?.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    streets.push({
      name,
      lat: way.center?.lat ?? center.lat,
      lon: way.center?.lon ?? center.lon,
    });
  }
  console.log(`  Unique streets: ${streets.length}`);

  const cityData = {
    name: cityName,
    lat: center.lat,
    lon: center.lon,
    streets,
  };

  mkdirSync(CITIES_DIR, { recursive: true });
  const outPath = join(CITIES_DIR, `${slug(cityName)}.json`);
  writeFileSync(outPath, JSON.stringify(cityData, null, 2));
  console.log(`  Written: ${outPath}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
