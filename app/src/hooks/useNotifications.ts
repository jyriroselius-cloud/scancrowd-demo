import type { DemoSpeed } from '../lib/storage';
import { saveNotifIds, loadNotifIds } from '../lib/storage';

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
      const ids = delays.map(() => Math.floor(Math.random() * 1_000_000) + 1);
      const notifs = delays.map((d, i) => ({
        id: ids[i],
        title: MESSAGES[i].title,
        body: MESSAGES[i].body(category),
        extra: { issueId },
        schedule: { at: new Date(Date.now() + d * 1000), allowWhileIdle: true },
      }));
      await LocalNotifications.schedule({ notifications: notifs });
      await saveNotifIds(ids);
    } catch {
      // browser fallback — no-op
    }
  };

  const cancelAll = async () => {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      // Use stored IDs as primary source (reliable even if AlarmManager already fired)
      const storedIds = await loadNotifIds();
      // Also grab anything still pending (belt + suspenders)
      const { notifications: pending } = await LocalNotifications.getPending();
      const pendingIds = new Set(pending.map(p => p.id));
      const extraFromStore = storedIds
        .filter(id => !pendingIds.has(id))
        .map(id => ({ id }));
      const allToCancel = [...pending, ...extraFromStore];
      if (allToCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: allToCancel });
      }
      // Remove any notifications already delivered and visible in the shade
      await LocalNotifications.removeAllDeliveredNotifications();
      // Clear stored IDs
      await saveNotifIds([]);
    } catch { /* browser fallback */ }
  };

  return { schedule, cancelAll };
}
