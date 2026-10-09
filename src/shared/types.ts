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

export interface Contractor {
  id: string;
  name: string;
  type: 'crew' | 'contractor';
  openJobs: number;
  jobsThisWeek: number;
  onTimeRate: number; // 0-100
  avgDaysToFix: number;
  assignedIssueIds: string[];
}

export interface Mission {
  id: string;
  name: string;
  polygon: { lat: number; lon: number }[];
  rewardRule: string;
  budget: number;
  spent: number;
  participants: number;
  status: 'Active' | 'Upcoming' | 'Completed';
}

export interface AppSettings {
  categoryPriorities: Record<string, number>;
  fixTimeTargets: Record<string, number>;
  notificationTemplates: { accept: string; decline: string };
  roles: { name: string; email: string; role: string }[];
}

export interface GeneratedData {
  issues: Issue[];
  reporters: Reporter[];
  kpis: Kpi[];
  contractors: Contractor[];
  missions: Mission[];
}

export interface Kpi {
  label: string;
  value: string;
  note: string;
}
