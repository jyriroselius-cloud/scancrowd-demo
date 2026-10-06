import React from 'react';
import type { DemoSpeed } from '../lib/storage';

interface Props {
  speed: DemoSpeed;
  onSpeedChange: (s: DemoSpeed) => void;
  onClose: () => void;
}

const SPEEDS: { value: DemoSpeed; label: string; detail: string }[] = [
  { value: 'fast', label: 'Fast', detail: 'Notifications at 20 s / 40 s / 60 s / 90 s' },
  { value: 'slow', label: 'Slow', detail: 'Notifications at 2 min / 5 min / 10 min / 15 min' },
  { value: 'manual', label: 'Manual', detail: 'No automatic notifications' },
];

export default function Settings({ speed, onSpeedChange, onClose }: Props) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#0c1d24', fontFamily: 'Manrope, system-ui, sans-serif', color: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 16px', borderBottom: '1px solid #2a4650' }}>
        <button
          onClick={onClose}
          style={{ width: 44, height: 44, borderRadius: 22, background: '#132a33', border: '1px solid #2a4650', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h1 style={{ margin: 0, font: '800 22px Manrope, sans-serif' }}>Settings</h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <div style={{ font: '700 12px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3ddc97', marginBottom: 12 }}>Demo speed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SPEEDS.map(s => (
              <button
                key={s.value}
                onClick={() => onSpeedChange(s.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: speed === s.value ? 'rgba(61,220,151,0.12)' : '#132a33',
                  border: speed === s.value ? '1px solid rgba(61,220,151,0.5)' : '1px solid #2a4650',
                  color: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  border: speed === s.value ? 'none' : '2px solid #2a4650',
                  background: speed === s.value ? '#3ddc97' : 'transparent',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {speed === s.value && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#06291b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ font: '700 15px Manrope, sans-serif' }}>{s.label}</span>
                  <span style={{ font: '500 12px Manrope, sans-serif', color: '#a9b8bd' }}>{s.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '0 16px 40px', textAlign: 'center', font: '500 12px Manrope, sans-serif', color: '#3a5862' }}>
        ScanCrowd Demo v1.0.0
      </div>
    </div>
  );
}
