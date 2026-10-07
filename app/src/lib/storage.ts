import type { Issue } from '@shared/types';

const KEY_REPORTS = 'sc_reports';
const KEY_POINTS = 'sc_points';
const KEY_SPEED = 'sc_demo_speed';
const KEY_NICKNAME = 'sc_nickname';

export type DemoSpeed = 'fast' | 'slow' | 'manual';

type PrefsPlugin = typeof import('@capacitor/preferences').Preferences;

// Wrapped to prevent JS from treating the Capacitor plugin proxy as a thenable.
// Returning a Capacitor plugin directly from an async function triggers
// Promise assimilation: JS calls .then() on it, which throws on web.
async function getPrefs(): Promise<{ prefs: PrefsPlugin } | null> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    const { Preferences } = await import('@capacitor/preferences');
    return { prefs: Preferences };
  } catch {
    return null;
  }
}

export async function loadReports(): Promise<Issue[]> {
  const container = await getPrefs();
  if (container) {
    const { value } = await container.prefs.get({ key: KEY_REPORTS });
    return value ? JSON.parse(value) : [];
  }
  const raw = localStorage.getItem(KEY_REPORTS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveReports(reports: Issue[]): Promise<void> {
  const container = await getPrefs();
  const serialised = JSON.stringify(reports);
  if (container) {
    await container.prefs.set({ key: KEY_REPORTS, value: serialised });
  } else {
    localStorage.setItem(KEY_REPORTS, serialised);
  }
}

export async function loadPoints(): Promise<number> {
  const container = await getPrefs();
  if (container) {
    const { value } = await container.prefs.get({ key: KEY_POINTS });
    return value ? parseInt(value, 10) : 0;
  }
  return parseInt(localStorage.getItem(KEY_POINTS) ?? '0', 10);
}

export async function savePoints(pts: number): Promise<void> {
  const container = await getPrefs();
  if (container) {
    await container.prefs.set({ key: KEY_POINTS, value: String(pts) });
  } else {
    localStorage.setItem(KEY_POINTS, String(pts));
  }
}

export async function loadDemoSpeed(): Promise<DemoSpeed> {
  const container = await getPrefs();
  if (container) {
    const { value } = await container.prefs.get({ key: KEY_SPEED });
    return (value as DemoSpeed) ?? 'fast';
  }
  return (localStorage.getItem(KEY_SPEED) as DemoSpeed) ?? 'fast';
}

export async function saveDemoSpeed(speed: DemoSpeed): Promise<void> {
  const container = await getPrefs();
  if (container) {
    await container.prefs.set({ key: KEY_SPEED, value: speed });
  } else {
    localStorage.setItem(KEY_SPEED, speed);
  }
}

export async function loadNickname(): Promise<string> {
  const container = await getPrefs();
  if (container) {
    const { value } = await container.prefs.get({ key: KEY_NICKNAME });
    return value ?? 'You';
  }
  return localStorage.getItem(KEY_NICKNAME) ?? 'You';
}

export async function clearAll(): Promise<void> {
  const container = await getPrefs();
  if (container) {
    await container.prefs.clear();
  } else {
    localStorage.clear();
  }
}
