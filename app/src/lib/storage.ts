import type { Issue } from '@shared/types';

const KEY_REPORTS = 'sc_reports';
const KEY_POINTS = 'sc_points';
const KEY_SPEED = 'sc_demo_speed';
const KEY_NICKNAME = 'sc_nickname';

export type DemoSpeed = 'fast' | 'slow' | 'manual';

async function getPrefs(): Promise<typeof import('@capacitor/preferences').Preferences | null> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    return Preferences;
  } catch {
    return null;
  }
}

export async function loadReports(): Promise<Issue[]> {
  const prefs = await getPrefs();
  if (prefs) {
    const { value } = await prefs.get({ key: KEY_REPORTS });
    return value ? JSON.parse(value) : [];
  }
  const raw = localStorage.getItem(KEY_REPORTS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveReports(reports: Issue[]): Promise<void> {
  const prefs = await getPrefs();
  const serialised = JSON.stringify(reports);
  if (prefs) {
    await prefs.set({ key: KEY_REPORTS, value: serialised });
  } else {
    localStorage.setItem(KEY_REPORTS, serialised);
  }
}

export async function loadPoints(): Promise<number> {
  const prefs = await getPrefs();
  if (prefs) {
    const { value } = await prefs.get({ key: KEY_POINTS });
    return value ? parseInt(value, 10) : 0;
  }
  return parseInt(localStorage.getItem(KEY_POINTS) ?? '0', 10);
}

export async function savePoints(pts: number): Promise<void> {
  const prefs = await getPrefs();
  if (prefs) {
    await prefs.set({ key: KEY_POINTS, value: String(pts) });
  } else {
    localStorage.setItem(KEY_POINTS, String(pts));
  }
}

export async function loadDemoSpeed(): Promise<DemoSpeed> {
  const prefs = await getPrefs();
  if (prefs) {
    const { value } = await prefs.get({ key: KEY_SPEED });
    return (value as DemoSpeed) ?? 'fast';
  }
  return (localStorage.getItem(KEY_SPEED) as DemoSpeed) ?? 'fast';
}

export async function saveDemoSpeed(speed: DemoSpeed): Promise<void> {
  const prefs = await getPrefs();
  if (prefs) {
    await prefs.set({ key: KEY_SPEED, value: speed });
  } else {
    localStorage.setItem(KEY_SPEED, speed);
  }
}

export async function loadNickname(): Promise<string> {
  const prefs = await getPrefs();
  if (prefs) {
    const { value } = await prefs.get({ key: KEY_NICKNAME });
    return value ?? 'You';
  }
  return localStorage.getItem(KEY_NICKNAME) ?? 'You';
}

export async function clearAll(): Promise<void> {
  const prefs = await getPrefs();
  if (prefs) {
    await prefs.clear();
  } else {
    localStorage.clear();
  }
}
