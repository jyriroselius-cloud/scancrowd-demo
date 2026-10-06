export type Status = 'New' | 'Reported' | 'Accepted' | 'Planned' | 'In repair' | 'Fixed' | 'Declined';

export type Category =
  | 'Pothole'
  | 'Traffic sign'
  | 'Road marking'
  | 'Street light'
  | 'Manhole'
  | 'Other';

export interface Issue {
  id: string;            // SC-1xxx
  title: string;
  category: Category;
  lat: number;
  lon: number;
  address: string;
  status: Status;
  reports: number;
  severity: 1 | 2 | 3 | 4 | 5;
  priority: number;      // 0–100
  firstReported: string; // ISO date
  plannedWeek?: string;  // "Wk 42"
  plannedRange?: string; // "12–16 Oct"
  description?: string;
}

export interface Reporter {
  nickname: string;
  points: number;
  reports: number;
  initials: string;
}

export interface CityData {
  name: string;
  lat: number;
  lon: number;
  streets: StreetPoint[];
}

export interface StreetPoint {
  name: string;
  lat: number;
  lon: number;
}

export interface GeneratedData {
  issues: Issue[];
  reporters: Reporter[];
  kpis: Kpi[];
}

export interface Kpi {
  label: string;
  value: string;
  note: string;
}
