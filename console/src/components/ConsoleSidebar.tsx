import React, { useState, useEffect } from 'react';
import type { Screen } from '../App';

interface Props {
  cityName: string;
  screen: Screen;
  setScreen: (s: Screen) => void;
  queueCount: number;
  onReset: () => void;
  headerSlot?: React.ReactNode;
}

const NAV: { id: Screen; label: string }[] = [
  { id: 'queue', label: 'Work queue' },
  { id: 'map', label: 'Map' },
  { id: 'contractors', label: 'Contractors' },
  { id: 'missions', label: 'Missions and rewards' },
  { id: 'leaderboard', label: 'Leaderboard and prizes' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
];

const MOBILE_BP = 819;

export function ConsoleSidebar({ cityName, screen, setScreen, queueCount, onReset, headerSlot }: Props) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BP);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function handleNav(id: Screen) {
    setScreen(id);
    if (isMobile) setOpen(false);
  }

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        top: 0,
        left: open ? 0 : -280,
        width: 260,
        height: '100vh',
        zIndex: 200,
        transition: 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'var(--tabbar)',
        borderRight: '1px solid #1f3a44',
        padding: '24px 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        overflowY: 'auto',
      }
    : {
        flex: '1 1 220px',
        maxWidth: '260px',
        background: 'var(--tabbar)',
        borderRight: '1px solid #1f3a44',
        padding: '24px 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        minHeight: '100vh',
      };

  return (
    <>
      {/* Hamburger toggle — mobile only */}
      {isMobile && (
        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
          style={{
            position: 'fixed',
            top: 14,
            left: 14,
            zIndex: 300,
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          )}
        </button>
      )}

      {/* Backdrop */}
      {isMobile && open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 150,
          }}
        />
      )}

      {/* Sidebar */}
      <nav aria-label="Console" style={sidebarStyle}>
        <div style={{ paddingLeft: 8 }}>
          <div style={{ font: '800 20px Manrope, sans-serif' }}>
            Scan<span style={{ color: 'var(--mint)' }}>Crowd</span>
          </div>
          <div style={{ font: '600 12px Manrope, sans-serif', color: 'var(--text2)', marginTop: 2 }}>
            City of {cityName} · Street maintenance
          </div>
        </div>
        {headerSlot && <div>{headerSlot}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map((item) => {
            const active = item.id === 'issue' ? screen === 'issue' : item.id === screen;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 10,
                  background: active ? 'rgba(61,220,151,0.12)' : 'transparent',
                  color: active ? 'var(--mint)' : 'var(--text3)',
                  font: `${active ? 700 : 600} 14px Manrope, sans-serif`,
                  border: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {item.label}
                {item.id === 'queue' && (
                  <span style={{ background: 'var(--mint)', color: 'var(--mint-text)', borderRadius: 8, padding: '2px 8px', fontSize: 12 }}>
                    {queueCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mint)' }}>
              Powered by
            </div>
            <div style={{ font: '600 13px Manrope, sans-serif', color: 'var(--text3)' }}>
              ScanwAi detection
            </div>
          </div>
          <button
            onClick={onReset}
            style={{
              height: 34,
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--text2)',
              font: '600 12px Manrope, sans-serif',
              cursor: 'pointer',
            }}
          >
            Demo data · Reset
          </button>
        </div>
      </nav>
    </>
  );
}
