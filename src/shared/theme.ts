export const colors = {
  bg: '#0c1d24',
  surface: '#132a33',
  surfaceRaised: '#1a3540',
  line: '#2a4650',
  tabBar: '#0a1920',
  mint: '#3ddc97',
  mintText: '#06291b',
  text: '#ffffff',
  textSecondary: '#a9b8bd',
  statusNew: '#9aa7ab',
  statusAccepted: '#5aa9ff',
  statusInRepair: '#ffb547',
  statusFixed: '#3ddc97',
  statusDeclined: '#ff6b6b',
} as const;

export const statusColors: Record<string, string> = {
  New: colors.statusNew,
  Reported: colors.statusNew,
  Accepted: colors.statusAccepted,
  Planned: colors.statusFixed,
  'In repair': colors.statusInRepair,
  Fixed: colors.statusFixed,
  Declined: colors.statusDeclined,
};

export const statusTextColors: Record<string, string> = {
  New: '#ffffff',
  Reported: '#ffffff',
  Accepted: '#04213f',
  Planned: colors.mintText,
  'In repair': '#2a1a00',
  Fixed: colors.mintText,
  Declined: '#ffffff',
};

export type Status = 'New' | 'Reported' | 'Accepted' | 'Planned' | 'In repair' | 'Fixed' | 'Declined';

export const CATEGORY_ICONS: Record<string, string> = {
  Pothole: 'M8 13c1-1 3-1 4 0s3 1 4 0',
  'Traffic sign': 'M12 3l9 15H3z M12 18v4',
  'Road marking': 'M4 12h16 M4 6h16 M4 18h10',
  'Street light': 'M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z',
  Manhole: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
  Other: 'M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z',
};
