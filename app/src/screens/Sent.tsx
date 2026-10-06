import React, { useEffect, useState } from 'react';
import type { Issue } from '@shared/types';
import type { DemoSpeed } from '../lib/storage';
import { useNotifications } from '../hooks/useNotifications';

interface Props {
  issue: Issue;
  speed: DemoSpeed;
  onTrack: () => void;
  onHome: () => void;
}

export default function Sent({ issue, speed, onTrack, onHome }: Props) {
  const [visible, setVisible] = useState(false);
  const { schedule } = useNotifications(speed);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    schedule(issue.id, issue.category);
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100dvh',
      background: '#0c1d24',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      fontFamily: 'Manrope, system-ui, sans-serif',
      color: '#ffffff',
      padding: '0 32px',
      boxSizing: 'border-box',
    }}>
      {/* Checkmark */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          background: 'rgba(61,220,151,0.15)',
          border: '3px solid #3ddc97',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: visible ? 'scale(1)' : 'scale(0)',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3ddc97" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
        <h1 style={{ margin: 0, font: '800 28px Manrope, sans-serif' }}>Report sent!</h1>
        <div style={{ font: '700 18px Manrope, sans-serif', color: '#3ddc97' }}>+10 points earned</div>
        <div style={{ font: '500 15px Manrope, sans-serif', color: '#a9b8bd', lineHeight: 1.5 }}>
          Notifications will update you as the city responds.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        <button
          onClick={onTrack}
          style={{
            width: '100%',
            height: 56,
            borderRadius: 28,
            background: '#3ddc97',
            color: '#06291b',
            border: 'none',
            font: '800 17px Manrope, sans-serif',
            cursor: 'pointer',
          }}
        >
          Track this issue
        </button>
        <button
          onClick={onHome}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 24,
            background: 'transparent',
            color: '#a9b8bd',
            border: 'none',
            font: '600 15px Manrope, sans-serif',
            cursor: 'pointer',
          }}
        >
          Back to map
        </button>
      </div>
    </div>
  );
}
