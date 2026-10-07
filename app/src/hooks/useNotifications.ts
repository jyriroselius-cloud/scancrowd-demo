import type { DemoSpeed } from '../lib/storage';

const MESSAGES = [
  { title: 'Report accepted', body: (cat: string) => `City confirmed your ${cat} report. +10 pts` },
  { title: 'Fix planned', body: (_: string) => `Your report has been scheduled for this week` },
  { title: 'Work started', body: (_: string) => 'Maintenance crew is on the way' },
  { title: 'Issue fixed! 🎉', body: (_: string) => '+10 bonus points. Thank you for reporting!' },
];

export function useNotifications(speed: DemoSpeed) {
  const schedule = async (issueId: string, category: string) => {
    const delays =
      speed === 'fast' ? [20, 40, 60, 90] :
      speed === 'slow' ? [120, 300, 600, 900] :
      [];
    if (delays.length === 0) return;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const notifs = delays.map((d, i) => ({
        id: Math.floor(Math.random() * 1_000_000),
        title: MESSAGES[i].title,
        body: MESSAGES[i].body(category),
        extra: { issueId },
        schedule: { at: new Date(Date.now() + d * 1000), allowWhileIdle: true },
      }));
      await LocalNotifications.schedule({ notifications: notifs });
    } catch {
      // browser fallback — no-op
    }
  };

  const cancelAll = async () => {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { notifications: pending } = await LocalNotifications.getPending();
      if (pending.length > 0) {
        await LocalNotifications.cancel({ notifications: pending });
      }
    } catch { /* browser fallback */ }
  };

  return { schedule, cancelAll };
}
