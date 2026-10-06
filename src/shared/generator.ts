import type { Issue, Reporter, GeneratedData, Kpi, Category, Status } from './types';
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

export function generateData(cityData: CityData, seedOverride?: number): GeneratedData {
  const seed = seedOverride ?? hashString(cityData.name);
  const rng = mulberry32(seed);

  const streets = cityData.streets.length > 0 ? cityData.streets : [
    { name: 'Main Street', lat: cityData.lat, lon: cityData.lon },
  ];

  // Hotspots: 2–3 clusters
  const hotspotCount = 2 + Math.floor(rng() * 2);
  const hotspots = Array.from({ length: hotspotCount }, () => {
    const base = streets[Math.floor(rng() * streets.length)];
    return {
      lat: base.lat + (rng() - 0.5) * 0.02,
      lon: base.lon + (rng() - 0.5) * 0.04,
    };
  });

  const issueCount = 120 + Math.floor(rng() * 61);
  const issues: Issue[] = [];

  for (let i = 0; i < issueCount; i++) {
    const isHotspot = rng() < 0.25;
    let baseLat: number, baseLon: number, address: string;

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

    const catItem = pickWeighted<{ cat: Category; weight: number }>(CATEGORIES, rng);
    const statusItem = pickWeighted<{ status: Status; weight: number }>(STATUS_WEIGHTS, rng);
    const cat = catItem.cat;
    const status = statusItem.status;
    const titles = TITLE_MAP[cat];
    const title = titles[Math.floor(rng() * titles.length)];

    const severity = (Math.floor(rng() * 5) + 1) as 1 | 2 | 3 | 4 | 5;
    const reports = Math.max(1, Math.floor(Math.pow(rng(), 2) * 15));
    const roadClass = Math.floor(rng() * 3) + 1; // 1=major 2=secondary 3=minor
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
  const fixed = issues.filter((i) => i.status === 'Fixed');

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

  return { issues, reporters, kpis };
}
