import type { CityData } from '../types';

import tampere from './tampere.json';

export function findCity(_name: string): CityData | undefined {
  return tampere as CityData;
}

export function defaultCity(): CityData {
  return tampere as CityData;
}

export const CITIES: CityData[] = [tampere as CityData];
