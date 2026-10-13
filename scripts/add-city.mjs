#!/usr/bin/env node
/**
 * npm run add-city -- "Lempäälä"
 * Fetches street segments + water polygons from OpenStreetMap Overpass API
 * and writes src/shared/cities/<slug>.json
 *
 * Uses Node.js https module (not fetch) to avoid undici Accept-header issues with Overpass.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CITIES_DIR = join(__dirname, '../src/shared/cities');
const OVERPASS_SERVERS = [
  'overpass-api.de',
  'lz4.overpass-api.de',
  'gall.openstreetmap.de',
];

function slug(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '_');
}

function httpsPost(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'scancrowd-demo/1.0 (build script)',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (d) => { data += d; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function overpassPost(query) {
  const body = 'data=' + encodeURIComponent(query);
  let lastErr;
  for (const server of OVERPASS_SERVERS) {
    try {
      return await httpsPost(server, '/api/interpreter', body);
    } catch (e) {
      lastErr = e;
      console.warn(`  ${server} failed: ${e.message}, trying next...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw lastErr;
}

async function getCenter(cityName) {
  return new Promise((resolve, reject) => {
    const path = '/search?q=' + encodeURIComponent(cityName) + '&format=json&limit=1';
    const options = {
      hostname: 'nominatim.openstreetmap.org',
      path,
      method: 'GET',
      headers: { 'User-Agent': 'scancrowd-demo/1.0' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (d) => { data += d; });
      res.on('end', () => {
        try {
          const arr = JSON.parse(data);
          if (!arr.length) { reject(new Error(`City not found: ${cityName}`)); return; }
          resolve({ lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchSegments(lat, lon, radius = 3000) {
  const query = `
[out:json][timeout:60];
(
  way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|service)$"]
     ["name"]
     (around:${radius},${lat},${lon});
);
out geom tags;
`;
  const data = await overpassPost(query);
  return data.elements || [];
}

async function fetchWater(lat, lon, radius = 3000) {
  const query = `
[out:json][timeout:30];
(
  way["natural"="water"](around:${radius},${lat},${lon});
  way["waterway"="riverbank"](around:${radius},${lat},${lon});
);
out geom;
`;
  const data = await overpassPost(query);
  return data.elements || [];
}

function simplifyRing(coords, maxPoints = 30) {
  if (coords.length <= maxPoints) return coords;
  const step = Math.floor(coords.length / maxPoints);
  const out = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[i]);
  // Sulje rengas
  if (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1]) {
    out.push(out[0]);
  }
  return out;
}

async function main() {
  const cityName = process.argv[2];
  if (!cityName) {
    console.error('Usage: npm run add-city -- "City Name" [radius_m]');
    process.exit(1);
  }
  const radius = parseInt(process.argv[3] ?? '3000', 10);

  console.log(`Fetching data for: ${cityName}`);
  const center = await getCenter(cityName);
  console.log(`  Center: ${center.lat}, ${center.lon}`);

  // Hae katusegmentit
  const ways = await fetchSegments(center.lat, center.lon, radius);
  console.log(`  Found ${ways.length} street ways`);

  const segments = [];
  const streetsSeen = new Set();
  const streets = [];

  for (const way of ways) {
    const name = way.tags?.name;
    const highway = way.tags?.highway ?? 'unclassified';
    if (!name || !way.geometry || way.geometry.length < 2) continue;

    const coords = way.geometry.map(n => [
      parseFloat(n.lon.toFixed(7)),
      parseFloat(n.lat.toFixed(7)),
    ]);
    segments.push({ name, highway, coords });

    // Streets: yksi center-piste per nimi (backwards compat)
    if (!streetsSeen.has(name)) {
      streetsSeen.add(name);
      const mid = way.geometry[Math.floor(way.geometry.length / 2)];
      streets.push({ name, lat: mid.lat, lon: mid.lon });
    }
  }
  console.log(`  Segments: ${segments.length}, unique streets: ${streets.length}`);

  // Odota ennen seuraavaa Overpass-kutsua
  await new Promise(r => setTimeout(r, 3000));

  // Hae vesialueet (retry kerran jos 504)
  let waterWays = [];
  try {
    waterWays = await fetchWater(center.lat, center.lon, radius);
  } catch (e1) {
    console.warn(`  Water fetch failed (${e1.message}), retrying in 8s...`);
    await new Promise(r => setTimeout(r, 8000));
    try {
      waterWays = await fetchWater(center.lat, center.lon, radius);
    } catch (e2) {
      console.warn(`  Water fetch retry failed (${e2.message}), continuing without water polygons`);
    }
  }
  console.log(`  Found ${waterWays.length} water ways`);

  const waterPolygons = [];
  for (const way of waterWays) {
    if (!way.geometry || way.geometry.length < 4) continue;
    let coords = way.geometry.map(n => [
      parseFloat(n.lon.toFixed(7)),
      parseFloat(n.lat.toFixed(7)),
    ]);
    // Sulje rengas
    if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
      coords.push(coords[0]);
    }
    coords = simplifyRing(coords, 30);
    if (coords.length >= 4) waterPolygons.push(coords);
  }
  console.log(`  Water polygons: ${waterPolygons.length}`);

  const cityData = {
    name: cityName,
    lat: center.lat,
    lon: center.lon,
    streets,
    segments,
    waterPolygons,
  };

  mkdirSync(CITIES_DIR, { recursive: true });
  const outPath = join(CITIES_DIR, `${slug(cityName)}.json`);
  writeFileSync(outPath, JSON.stringify(cityData, null, 2));
  console.log(`  Written: ${outPath}`);
  console.log(`  Summary: ${segments.length} segments, ${waterPolygons.length} water polygons`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
