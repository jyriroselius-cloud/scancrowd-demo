import React from 'react';
import type { Issue, GeneratedData } from '@shared/types';
import TabBar from '../components/TabBar';
import StatusPill from '../components/StatusPill';

interface Props {
  reports: Issue[];
  generated: GeneratedData;
  onIssueSelect: (id: string) => void;
  onCapture: () => void;
  onHome: () => void;
  onLeaderboard: () => void;
}

export default function Activity({ reports, onIssueSelect, onCapture, onHome, onLeaderboard }: Props) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: '#0c1d24', fontFamily: 'Manrope, system-ui, sans-serif', color: '#ffffff' }}>
      {/* Header */}
      <div style={{ padding: '24px 16px 16px', flexShrink: 0 }}>
        <div style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3ddc97', marginBottom: 4 }}>Your reports</div>
        <h1 style={{ margin: 0, font: '800 28px Manrope, sans-serif' }}>Activity</h1>
      </div>

      {/* Content */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 96, bottom: 'calc(84px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))', overflowY: 'auto', padding: '0 16px 16px' }}>
        {reports.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, height: '60%', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 36, background: '#132a33', border: '1px solid #2a4650', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3ddc97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
              </svg>
            </div>
            <div>
              <div style={{ font: '700 17px Manrope, sans-serif', marginBottom: 8 }}>No reports yet</div>
              <div style={{ font: '500 14px Manrope, sans-serif', color: '#a9b8bd', lineHeight: 1.5 }}>
                Tap the camera button to<br />report your first issue.
              </div>
            </div>
            <button
              onClick={onCapture}
              style={{ height: 48, padding: '0 28px', borderRadius: 24, background: '#3ddc97', color: '#06291b', border: 'none', font: '800 15px Manrope, sans-serif', cursor: 'pointer' }}
            >
              Report now
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports.map(issue => (
              <button
                key={issue.id}
                onClick={() => onIssueSelect(issue.id)}
                style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#132a33', border: '1px solid #2a4650', borderRadius: 16, padding: 12, color: '#ffffff', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ width: 48, height: 48, borderRadius: 12, background: '#1a3540', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3ddc97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
                  </svg>
                </span>
                <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ font: '700 15px Manrope, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</span>
                  <span style={{ font: '500 13px Manrope, sans-serif', color: '#a9b8bd' }}>{issue.address}</span>
                  <span style={{ font: '500 12px Manrope, sans-serif', color: '#a9b8bd' }}>{new Date(issue.firstReported).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </span>
                <StatusPill status={issue.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      <TabBar active="activity" onMap={onHome} onActivity={() => {}} onCapture={onCapture} onRanks={onLeaderboard} onProfile={() => {}} />
    </div>
  );
}
