import React, { useState, useEffect, useRef } from 'react';
import type { Issue, Category, GeneratedData, CityData } from '@shared/types';
import MapSvg from '../components/MapSvg';
import TabBar from '../components/TabBar';
import StatusPill from '../components/StatusPill';

interface Props {
  generated: GeneratedData;
  cityData: CityData;
  userReports: Issue[];
  points: number;
  onCapture: () => void;
  onIssueSelect: (id: string) => void;
  onActivity: () => void;
  onLeaderboard: () => void;
  onSettings: () => void;
  onReset: () => void;
}

const CATEGORY_ICON: Record<Category, React.ReactNode> = {
  Pothole: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb547" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="14" rx="8" ry="4" />
      <path d="M8 13c1-1 3-1 4 0s3 1 4 0" />
    </svg>
  ),
  'Traffic sign': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5aa9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l9 15H3z" />
      <path d="M12 18v4" />
    </svg>
  ),
  'Road marking': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3ddc97" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3v18M8 5v4M16 5v4M8 15v4M16 15v4" />
    </svg>
  ),
  'Street light': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb547" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 2a4 4 0 0 1 4 4H8a4 4 0 0 1 4-4z" />
      <path d="M12 6v16M5 22h14" />
    </svg>
  ),
  Manhole: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9aa7ab" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  Other: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a9b8bd" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
};

export default function Home({ generated, cityData, userReports, points, onCapture, onIssueSelect, onActivity, onLeaderboard, onSettings, onReset }: Props) {
  const [userLat, setUserLat] = useState<number | undefined>(undefined);
  const [userLon, setUserLon] = useState<number | undefined>(undefined);
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [resetConfirm, setResetConfirm] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const pos = await Geolocation.getCurrentPosition({ timeout: 5000 });
        setUserLat(pos.coords.latitude);
        setUserLon(pos.coords.longitude);
      } catch {
        // use city center as fallback
      }
    })();
  }, []);

  const allIssues = [...generated.issues, ...userReports];
  const filtered = filter === 'All' ? allIssues : allIssues.filter(i => i.category === filter);
  const openIssues = filtered.filter(i => i.status !== 'Fixed' && i.status !== 'Declined');
  const topIssues = openIssues.slice(0, 2);

  const rank = generated.reporters.length > 0 ? Math.floor(Math.random() * 5) + 2 : 9;

  const startHold = () => {
    holdTimer.current = setTimeout(() => {
      setResetConfirm(true);
      confirmTimer.current = setTimeout(() => {
        setResetConfirm(false);
        onReset();
      }, 1500);
    }, 2000);
  };

  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (confirmTimer.current) {
      clearTimeout(confirmTimer.current);
      setResetConfirm(false);
    }
  };

  const CATEGORIES: Category[] = ['Pothole', 'Traffic sign', 'Road marking', 'Street light', 'Manhole'];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: '#0e2229', fontFamily: 'Manrope, system-ui, sans-serif', color: '#ffffff' }}>
      {/* Full-screen map */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapSvg
          issues={allIssues}
          userLat={userLat ?? cityData.lat}
          userLon={userLon ?? cityData.lon}
          centerLat={userLat ?? cityData.lat}
          centerLon={userLon ?? cityData.lon}
          width={window.innerWidth || 390}
          height={window.innerHeight || 760}
          onIssueTap={onIssueSelect}
        />
      </div>

      {/* Top bar */}
      <div style={{ position: 'absolute', left: 16, right: 16, top: 20, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            flexGrow: 1,
            height: 48,
            borderRadius: 24,
            background: '#132a33',
            border: '1px solid #2a4650',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a9b8bd" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
            </svg>
            <span style={{ font: '500 15px Manrope, sans-serif', color: '#a9b8bd' }}>Search streets in {cityData.name}</span>
          </div>
          {/* Long-press logo for reset */}
          <button
            aria-label="Settings / reset"
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
            onClick={onSettings}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: '#132a33',
              border: '1px solid #2a4650',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {(['All', ...CATEGORIES] as (Category | 'All')[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 17,
                background: filter === cat ? '#3ddc97' : '#132a33',
                color: filter === cat ? '#06291b' : '#ffffff',
                border: filter === cat ? 'none' : '1px solid #2a4650',
                font: filter === cat ? '700 13px Manrope, sans-serif' : '600 13px Manrope, sans-serif',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Reset confirm banner */}
      {resetConfirm && (
        <div style={{
          position: 'absolute',
          top: 120,
          left: 16,
          right: 16,
          background: '#ff6b6b',
          color: '#ffffff',
          borderRadius: 12,
          padding: '12px 16px',
          font: '700 14px Manrope, sans-serif',
          textAlign: 'center',
          zIndex: 20,
        }}>
          Resetting demo data…
        </div>
      )}

      {/* Points badge */}
      <div style={{
        position: 'absolute',
        left: 16,
        top: 360,
        width: 44,
        height: 44,
        borderRadius: 22,
        background: '#132a33',
        border: '2px solid #3ddc97',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: '800 14px Manrope, sans-serif',
        zIndex: 5,
      }}>
        {points}
      </div>

      {/* Bottom sheet */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 'calc(84px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))',
        height: 280,
        background: '#132a33',
        borderRadius: '28px 28px 0 0',
        borderTop: '1px solid #2a4650',
        boxShadow: '0 -12px 32px rgba(0,0,0,0.35)',
        padding: '10px 16px 0',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        zIndex: 10,
        overflow: 'hidden',
      }}>
        <div style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, background: '#3a5862' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3ddc97' }}>Near you</div>
            <div style={{ font: '800 18px Manrope, sans-serif' }}>{openIssues.length} open issues within 1 km</div>
          </div>
          <div style={{ font: '700 12px Manrope, sans-serif', color: '#06291b', background: '#3ddc97', borderRadius: 10, padding: '5px 9px' }}>
            #{rank} in {cityData.name}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          {topIssues.map(issue => (
            <button
              key={issue.id}
              onClick={() => onIssueSelect(issue.id)}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                background: '#0f232b',
                border: '1px solid #2a4650',
                borderRadius: 16,
                padding: 10,
                color: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                flexShrink: 0,
              }}
            >
              <span style={{ width: 52, height: 52, borderRadius: 12, background: '#1a3540', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {CATEGORY_ICON[issue.category]}
              </span>
              <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ font: '700 15px Manrope, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</span>
                <span style={{ font: '500 13px Manrope, sans-serif', color: '#a9b8bd' }}>{issue.address}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <StatusPill status={issue.status} />
                <span style={{ font: '600 12px Manrope, sans-serif', color: '#a9b8bd' }}>+{issue.severity * 5}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <TabBar active="home" onMap={() => {}} onActivity={onActivity} onCapture={onCapture} onRanks={onLeaderboard} onProfile={onSettings} />
    </div>
  );
}
