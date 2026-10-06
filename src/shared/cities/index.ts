import type { CityData } from '../types';

// Statically bundled cities — loaded at build time
import tampere from './tampere.json';
import helsinki from './helsinki.json';
import espoo from './espoo.json';
import vantaa from './vantaa.json';
import turku from './turku.json';
import oulu from './oulu.json';
import jyvaskyla from './jyvaskyla.json';
import lahti from './lahti.json';
import kuopio from './kuopio.json';
import lempaala from './lempaala.json';

const CITIES: CityData[] = [
  tampere, helsinki, espoo, vantaa, turku, oulu, jyvaskyla, lahti, kuopio, lempaala,
] as CityData[];

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '_');
}

export function findCity(name: string): CityData | undefined {
  const n = normalize(name);
  return CITIES.find((c) => normalize(c.name) === n || normalize(c.name).startsWith(n.slice(0, 4)));
}

export function defaultCity(): CityData {
  return tampere as CityData;
}

export { CITIES };
