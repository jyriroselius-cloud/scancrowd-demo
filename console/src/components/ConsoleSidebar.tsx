import React from 'react';
import type { Screen } from '../App';

interface Props {
  cityName: string;
  screen: Screen;
  setScreen: (s: Screen) => void;
  queueCount: number;
  onReset: () => void;
  headerSlot?: React.ReactNode;
}

const NAV: { id: Screen | 'contractors' | 'missions' | 'analytics' | 'settings'; label: string }[] = [
  { id: 'queue', label: 'Work queue' },
  { id: 'map', label: 'Map' },
  { id: 'contractors', label: 'Contractors' },
  { id: 'missions', label: 'Missions and rewards' },
  { id: 'leaderboard', label: 'Leaderboard and prizes' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
];

const ACTIVE_SCREENS: Screen[] = ['queue', 'issue', 'map', 'leaderboard'];

export function ConsoleSidebar({ cityName, screen, setScreen, queueCount, onReset, headerSlot }: Props) {
  return (
    <nav
      aria-label="Console"
      style={{
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
      }}
    >
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
          const isClickable = (ACTIVE_SCREENS as string[]).includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => isClickable && setScreen(item.id as Screen)}
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
                cursor: isClickable ? 'pointer' : 'default',
              }}
            >
              {item.label}
              {item.id === 'queue' && (
                <span
                  style={{
                    background: 'var(--mint)',
                    color: 'var(--mint-text)',
                    borderRadius: 8,
                    padding: '2px 8px',
                    fontSize: 12,
                  }}
                >
                  {queueCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
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
          }}
        >
          Demo data · Reset
        </button>
      </div>
    </nav>
  );
}
