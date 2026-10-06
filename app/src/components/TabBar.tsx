import React from 'react';

type ActiveTab = 'home' | 'activity' | 'leaderboard';

interface Props {
  active: ActiveTab;
  onMap: () => void;
  onActivity: () => void;
  onCapture: () => void;
  onRanks: () => void;
  onProfile: () => void;
}

const mint = '#3ddc97';
const inactive = '#a9b8bd';

const MapIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
);

const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06291b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

const RanksIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
  </svg>
);

export default function TabBar({ active, onMap, onActivity, onCapture, onRanks, onProfile }: Props) {
  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    width: 64,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    color: isActive ? mint : inactive,
    font: isActive ? '700 11px Manrope, sans-serif' : '600 11px Manrope, sans-serif',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  });

  return (
    <nav
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 84,
        background: '#0a1920',
        borderTop: '1px solid #1f3a44',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        paddingTop: 10,
        boxSizing: 'border-box',
        zIndex: 100,
      }}
    >
      <button style={tabStyle(active === 'home')} onClick={onMap}>
        <MapIcon />
        Map
      </button>
      <button style={tabStyle(active === 'activity')} onClick={onActivity}>
        <ActivityIcon />
        Activity
      </button>
      <button
        aria-label="Report a problem"
        onClick={onCapture}
        style={{
          width: 68,
          height: 68,
          marginTop: -34,
          borderRadius: 34,
          background: mint,
          border: '5px solid #0a1920',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 28px rgba(61,220,151,0.35)',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <CameraIcon />
      </button>
      <button style={tabStyle(active === 'leaderboard')} onClick={onRanks}>
        <RanksIcon />
        Ranks
      </button>
      <button style={tabStyle(false)} onClick={onProfile}>
        <ProfileIcon />
        Profile
      </button>
    </nav>
  );
}
