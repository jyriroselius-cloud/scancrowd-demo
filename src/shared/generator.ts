import type { Issue, Reporter, GeneratedData, Kpi, Category, Status, Contractor, Mission, StreetSegment } from './types';
import type { CityData } from './types';

// Mulberry32 PRNG — deterministic, seedable
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const CATEGORIES: { cat: Category; weight: number }[] = [
  { cat: 'Pothole', weight: 35 },
  { cat: 'Traffic sign', weight: 20 },
  { cat: 'Road marking', weight: 15 },
  { cat: 'Street light', weight: 12 },
  { cat: 'Manhole', weight: 10 },
  { cat: 'Other', weight: 8 },
];

const STATUS_WEIGHTS: { status: Status; weight: number }[] = [
  { status: 'New', weight: 25 },
  { status: 'Accepted', weight: 15 },
  { status: 'Planned', weight: 15 },
  { status: 'In repair', weight: 10 },
  { status: 'Fixed', weight: 30 },
  { status: 'Declined', weight: 5 },
];

const TITLE_MAP: Record<Category, string[]> = {
  Pothole: ['Pothole', 'Pothole cluster', 'Deep pothole', 'Pavement crack'],
  'Traffic sign': ['Damaged traffic sign', 'Missing traffic sign', 'Bent sign post', 'Graffiti on sign'],
  'Road marking': ['Faded crossing marking', 'Worn lane markings', 'Missing stop line'],
  'Street light': ['Street light out', 'Broken street lamp', 'Flickering light'],
  Manhole: ['Raised manhole cover', 'Sunken manhole', 'Loose manhole cover'],
  Other: ['Collapsed kerb', 'Overgrown vegetation', 'Debris on road', 'Pothole near pavement'],
};

const NICKNAMES = [
  'potholepro', 'signspotter', 'hervanta_crew', 'nightowl_tre', 'kalevan_kulkija',
  'pyoraileva_pena', 'tammerkosken_tomi', 'keskusta_katselija', 'pispalalainen',
  'lahdeliike', 'roadwatcher_fin', 'fixitfinn', 'kerb_hunter', 'streetscout',
  'markings_master', 'puisto_poika', 'tie_tarkastaja', 'kaupunki_kartoittaja',
  'mobiili_matti', 'paremmantien_paula', 'liikennekaisa', 'asfaltti_antti',
  'kuoppa_kari', 'valo_veikko', 'merkinta_meeri', 'kansi_kristian',
  'road_ranger_rvn', 'city_spotter_tku', 'urban_eye_hki', 'fix_it_felix',
  'pothole_patrol', 'sign_squad', 'light_watch', 'asphalt_scout',
  'civic_reporter', 'streetfix_pro', 'city_guardian', 'road_hero',
  'urban_reporter', 'street_keeper',
];

function pickWeighted<T>(items: { weight: number; [k: string]: unknown }[], rng: () => number): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item as unknown as T;
  }
  return items[items.length - 1] as unknown as T;
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function nextWeekRange(weeksAhead: number): { label: string; range: string } {
  const now = new Date();
  const weekNum = isoWeek(now) + weeksAhead;
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + weeksAhead * 7);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const range =
    monday.getMonth() === friday.getMonth()
      ? `${monday.getDate()}–${friday.getDate()} ${months[friday.getMonth()]}`
      : `${monday.getDate()} ${months[monday.getMonth()]}–${friday.getDate()} ${months[friday.getMonth()]}`;
  return { label: `Wk ${weekNum}`, range };
}

// ── Segment-based placement helpers ────────────────────────────────────────

const DEG_PER_M = 1 / 111320;
const WATER_BUFFER_DEG = 15 * DEG_PER_M;

const ROAD_CATEGORIES = new Set<Category>(['Pothole', 'Road marking', 'Manhole']);
const ROAD_HIGHWAYS = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street']);

function pointOnSegment(seg: StreetSegment, rng: () => number): { lat: number; lon: number; address: string } {
  const coords = seg.coords;
  const idx = Math.floor(rng() * Math.max(1, coords.length - 1));
  const t = rng();
  const [lon0, lat0] = coords[idx];
  const [lon1, lat1] = coords[Math.min(idx + 1, coords.length - 1)];
  const offsetM = (rng() - 0.5) * 10;
  const lonPerM = 1 / (111320 * Math.cos((lat0 * Math.PI) / 180));
  const dx = lon1 - lon0;
  const dy = lat1 - lat0;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = len > 0 ? -dy / len : 0;
  const ny = len > 0 ? dx / len : 0;
  const num = Math.floor(rng() * 100) + 1;
  return {
    lat: lat0 + t * dy + offsetM * DEG_PER_M * ny,
    lon: lon0 + t * dx + offsetM * lonPerM * nx,
    address: `${seg.name} ${num}`,
  };
}

function pickSegment(segs: StreetSegment[], cat: Category, rng: () => number): StreetSegment {
  const isRoadOnly = ROAD_CATEGORIES.has(cat);
  if (isRoadOnly) {
    const roadPool = segs.filter(s => ROAD_HIGHWAYS.has(s.highway));
    const pool = roadPool.length > 0 ? roadPool : segs;
    return pool[Math.floor(rng() * pool.length)];
  }
  return segs[Math.floor(rng() * segs.length)];
}

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

function distToEdgeDeg(lat: number, lon: number, ring: [number, number][]): number {
  let minD = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j];
    const [bx, by] = ring[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((lon - ax) * dx + (lat - ay) * dy) / len2)) : 0;
    const d = Math.sqrt((lon - (ax + t * dx)) ** 2 + (lat - (ay + t * dy)) ** 2);
    if (d < minD) minD = d;
  }
  return minD;
}

function nearWater(lat: number, lon: number, waterPolygons: [number, number][][]): boolean {
  for (const ring of waterPolygons) {
    if (pointInRing(lat, lon, ring)) return true;
    if (distToEdgeDeg(lat, lon, ring) < WATER_BUFFER_DEG) return true;
  }
  return false;
}

// ── Main generator ──────────────────────────────────────────────────────────

export function generateData(cityData: CityData, seedOverride?: number): GeneratedData {
  const seed = seedOverride ?? hashString(cityData.name);
  const rng = mulberry32(seed);

  const useSegments = (cityData.segments?.length ?? 0) >= 5;
  const segs = useSegments ? cityData.segments! : [];
  const waterPolys = cityData.waterPolygons ?? [];

  const streets = cityData.streets.length > 0 ? cityData.streets : [
    { name: 'Main Street', lat: cityData.lat, lon: cityData.lon },
  ];

  // Hotspots: 2–3 kpl
  const hotspotCount = 2 + Math.floor(rng() * 2);
  let hotspots: { lat: number; lon: number }[];

  if (useSegments) {
    const mainSegs = segs.filter(s => s.highway === 'primary' || s.highway === 'secondary');
    const hotspotBase = mainSegs.length > 0 ? mainSegs : segs;
    hotspots = Array.from({ length: hotspotCount }, () => {
      const seg = hotspotBase[Math.floor(rng() * hotspotBase.length)];
      const midIdx = Math.floor(seg.coords.length / 2);
      return { lat: seg.coords[midIdx][1], lon: seg.coords[midIdx][0] };
    });
  } else {
    hotspots = Array.from({ length: hotspotCount }, () => {
      const base = streets[Math.floor(rng() * streets.length)];
      return {
        lat: base.lat + (rng() - 0.5) * 0.02,
        lon: base.lon + (rng() - 0.5) * 0.04,
      };
    });
  }

  const issueCount = 120 + Math.floor(rng() * 61);
  const issues: Issue[] = [];

  for (let i = 0; i < issueCount; i++) {
    const isHotspot = rng() < 0.25;
    let baseLat: number = cityData.lat;
    let baseLon: number = cityData.lon;
    let address: string = 'Unknown';

    const catItem = pickWeighted<{ cat: Category; weight: number }>(CATEGORIES, rng);
    const cat = catItem.cat;

    if (useSegments) {
      let placed = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        let seg: StreetSegment;
        if (isHotspot) {
          const hs = hotspots[Math.floor(rng() * hotspots.length)];
          let bestSeg = segs[0];
          let bestD = Infinity;
          for (const s of segs) {
            const midIdx = Math.floor(s.coords.length / 2);
            const d = Math.abs(s.coords[midIdx][1] - hs.lat) + Math.abs(s.coords[midIdx][0] - hs.lon);
            if (d < bestD) { bestD = d; bestSeg = s; }
          }
          seg = ROAD_CATEGORIES.has(cat) && !ROAD_HIGHWAYS.has(bestSeg.highway)
            ? pickSegment(segs, cat, rng)
            : bestSeg;
        } else {
          seg = pickSegment(segs, cat, rng);
        }
        const pt = pointOnSegment(seg, rng);
        if (!nearWater(pt.lat, pt.lon, waterPolys)) {
          baseLat = pt.lat;
          baseLon = pt.lon;
          address = pt.address;
          placed = true;
          break;
        }
      }
      if (!placed) {
        // Fallback: midsegment (ei rng-kulutusta joka sotkisi determinismin)
        const seg = segs[i % segs.length];
        const midIdx = Math.floor(seg.coords.length / 2);
        baseLat = seg.coords[midIdx][1];
        baseLon = seg.coords[midIdx][0];
        address = `${seg.name} ${(i % 100) + 1}`;
      }
    } else {
      // Vanha logiikka (GPS-mode / ei segmenttejä)
      if (isHotspot) {
        const hs = hotspots[Math.floor(rng() * hotspots.length)];
        baseLat = hs.lat + (rng() - 0.5) * 0.003;
        baseLon = hs.lon + (rng() - 0.5) * 0.006;
        const nearStreet = streets.reduce((best, s) => {
          const d = Math.abs(s.lat - baseLat) + Math.abs(s.lon - baseLon);
          return d < Math.abs(best.lat - baseLat) + Math.abs(best.lon - baseLon) ? s : best;
        });
        const num = Math.floor(rng() * 50) + 1;
        address = `${nearStreet.name} ${num}`;
      } else {
        const street = streets[Math.floor(rng() * streets.length)];
        baseLat = street.lat + (rng() - 0.5) * 0.03;
        baseLon = street.lon + (rng() - 0.5) * 0.06;
        const num = Math.floor(rng() * 100) + 1;
        address = `${street.name} ${num}`;
      }
    }

    const statusItem = pickWeighted<{ status: Status; weight: number }>(STATUS_WEIGHTS, rng);
    const status = statusItem.status;
    const titles = TITLE_MAP[cat];
    const title = titles[Math.floor(rng() * titles.length)];

    const severity = (Math.floor(rng() * 5) + 1) as 1 | 2 | 3 | 4 | 5;
    const reports = Math.max(1, Math.floor(Math.pow(rng(), 2) * 15));
    const roadClass = Math.floor(rng() * 3) + 1;
    const priority = Math.round(
      (severity / 5) * 50 + (reports / 15) * 30 + ((3 - roadClass) / 2) * 20
    );

    const daysAgo = Math.floor(rng() * 30);
    const firstReported = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];

    let plannedWeek: string | undefined;
    let plannedRange: string | undefined;
    if (status === 'Planned' || status === 'In repair') {
      const w = nextWeekRange(1 + Math.floor(rng() * 4));
      plannedWeek = w.label;
      plannedRange = w.range;
    }

    issues.push({
      id: `SC-${1000 + i + 1}`,
      title,
      category: cat,
      lat: baseLat,
      lon: baseLon,
      address,
      status,
      reports,
      severity,
      priority,
      firstReported,
      plannedWeek,
      plannedRange,
    });
  }

  // Sort by priority desc
  issues.sort((a, b) => b.priority - a.priority);

  // Reporters
  const shuffledNicks = [...NICKNAMES].sort(() => rng() - 0.5);
  const reporters = shuffledNicks.slice(0, 40).map((nick) => {
    const pts = 200 + Math.floor(rng() * 2200);
    return {
      nickname: nick,
      initials: nick.slice(0, 2).toUpperCase(),
      points: pts,
      reports: Math.floor(pts / 120),
    };
  });
  reporters.sort((a, b) => b.points - a.points);

  // KPIs
  const newIssues = issues.filter((i) => i.status === 'New');
  const awaitingReview = issues.filter((i) => i.status === 'New' || i.status === 'Accepted');
  const planned = issues.filter((i) => i.status === 'Planned' || i.status === 'In repair');

  const kpis: Kpi[] = [
    {
      label: 'New today',
      value: String(Math.floor(newIssues.length * 0.15)),
      note: `+${Math.floor(rng() * 8)} vs. last week`,
    },
    {
      label: 'Awaiting review',
      value: String(awaitingReview.length),
      note: `Oldest ${Math.floor(rng() * 5) + 1} days`,
    },
    {
      label: 'Planned this week',
      value: String(planned.length),
      note: `${Math.floor(rng() * 4) + 2} crews assigned`,
    },
    {
      label: 'Median time to fix',
      value: `${(4 + rng() * 8).toFixed(1)} d`,
      note: 'Target 10 d',
    },
    {
      label: 'Duplicates merged',
      value: `${Math.floor(25 + rng() * 20)} %`,
      note: `Saved ${Math.floor(rng() * 40) + 20} reviews`,
    },
  ];

  // Contractors — 4 internal crews + 2 external contractors
  const CREW_NAMES = ['Crew North', 'Crew South', 'Crew East', 'Crew West'];
  const CONTRACTOR_NAMES = ['Lemminkäinen Infra', 'YIT Road Services'];

  const contractors: Contractor[] = [
    ...CREW_NAMES.map((name, i) => {
      const slice = issues.filter((_, j) => j % 4 === i).slice(0, 8 + Math.floor(rng() * 6));
      return {
        id: `crew-${i + 1}`,
        name: `Street maintenance · ${name}`,
        type: 'crew' as const,
        openJobs: 3 + Math.floor(rng() * 8),
        jobsThisWeek: 1 + Math.floor(rng() * 5),
        onTimeRate: 72 + Math.floor(rng() * 26),
        avgDaysToFix: 4 + Math.floor(rng() * 8),
        assignedIssueIds: slice.map((iss) => iss.id),
      };
    }),
    ...CONTRACTOR_NAMES.map((name, i) => {
      const slice = issues.filter((_, j) => j % 6 === i).slice(0, 4 + Math.floor(rng() * 4));
      return {
        id: `contractor-${i + 1}`,
        name,
        type: 'contractor' as const,
        openJobs: 2 + Math.floor(rng() * 5),
        jobsThisWeek: 1 + Math.floor(rng() * 3),
        onTimeRate: 65 + Math.floor(rng() * 30),
        avgDaysToFix: 5 + Math.floor(rng() * 10),
        assignedIssueIds: slice.map((iss) => iss.id),
      };
    }),
  ];

  // Missions — 3 missions with polygon areas
  const MISSION_NAMES = ['Hervanta Road Safety', 'Kaleva District', 'Tampere Centre'];
  const MISSION_RULES = ['€2 per pothole fixed', '€1.50 per item', '€3 per km surveyed'];
  const missionStatuses: Mission['status'][] = ['Active', 'Active', 'Upcoming'];
  const missions: Mission[] = MISSION_NAMES.map((name, i) => {
    const baseLat = cityData.lat + (rng() - 0.5) * 0.04;
    const baseLon = cityData.lon + (rng() - 0.5) * 0.06;
    const r = 0.008 + rng() * 0.006;
    const polygon = Array.from({ length: 6 }, (_, k) => {
      const angle = (k / 6) * Math.PI * 2 + rng() * 0.5;
      return { lat: baseLat + Math.cos(angle) * r, lon: baseLon + Math.sin(angle) * r * 1.5 };
    });
    const budget = 800 + Math.floor(rng() * 1200);
    const spent = Math.floor(budget * (0.2 + rng() * 0.6));
    return {
      id: `mission-${i + 1}`,
      name,
      polygon,
      rewardRule: MISSION_RULES[i % MISSION_RULES.length],
      budget,
      spent,
      participants: 3 + Math.floor(rng() * 12),
      status: missionStatuses[i],
    };
  });

  return { issues, reporters, kpis, contractors, missions };
}
