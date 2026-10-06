import React, { useState } from 'react';
import type { Issue, Status } from '@shared/types';

interface Props {
  issue: Issue;
  isOwnReport: boolean;
  onBack: () => void;
  onConfirm: (id: string) => void;
}

const STATUS_ORDER: Status[] = ['New', 'Accepted', 'Planned', 'In repair', 'Fixed'];

const STATUS_COLOR: Record<Status, string> = {
  New: '#9aa7ab',
  Reported: '#9aa7ab',
  Accepted: '#5aa9ff',
  Planned: '#5aa9ff',
  'In repair': '#ffb547',
  Fixed: '#3ddc97',
  Declined: '#ff6b6b',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function IssueTracking({ issue, isOwnReport, onBack, onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [following, setFollowing] = useState(isOwnReport);

  const statusIdx = STATUS_ORDER.indexOf(issue.status);
  const completedSteps = statusIdx < 0 ? 0 : statusIdx + 1;

  const timelineSteps: Array<{ text: string; sub: string; done: boolean }> = [];
  if (completedSteps >= 1) {
    timelineSteps.push({
      text: isOwnReport ? 'You reported it' : `Reported · ${issue.reports} confirmations`,
      sub: `${formatDate(issue.firstReported)} · AI: ${issue.category}`,
      done: true,
    });
  }
  if (completedSteps >= 2) {
    timelineSteps.push({
      text: 'Accepted by the city · +10 points',
      sub: `${issue.reports} others confirmed it`,
      done: true,
    });
  }
  if (completedSteps >= 3) {
    timelineSteps.push({
      text: `Fix date set for ${issue.plannedWeek ?? 'this week'}`,
      sub: issue.plannedRange ?? 'City street maintenance',
      done: true,
    });
  }
  if (completedSteps >= 4) {
    timelineSteps.push({ text: 'Work started', sub: 'Maintenance crew on site', done: true });
  }
  if (completedSteps >= 5) {
    timelineSteps.push({ text: 'Issue fixed! +10 bonus points 🎉', sub: 'Resolved by city maintenance', done: true });
  }

  // Show upcoming step
  if (completedSteps < STATUS_ORDER.length) {
    const nextStatus = STATUS_ORDER[completedSteps];
    const nextTexts: Record<Status, string> = {
      New: 'Awaiting city review',
      Reported: 'Awaiting city review',
      Accepted: 'City will review and schedule',
      Planned: 'Fix will be scheduled',
      'In repair': 'Work in progress',
      Fixed: 'Issue will be resolved',
      Declined: 'Under review',
    };
    timelineSteps.push({ text: nextTexts[nextStatus] ?? 'Pending', sub: 'Coming up', done: false });
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: '#0c1d24', fontFamily: 'Manrope, system-ui, sans-serif', color: '#ffffff' }}>
      {/* Photo header */}
      <div style={{ position: 'relative', width: '100%', height: 230, overflow: 'hidden' }}>
        <svg width="100%" height="230" viewBox="0 0 390 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="390" height="230" fill="#152f39" />
          <path d="M140 120 L250 120 L390 230 L0 230 Z" fill="#0d1f25" />
          <g transform="rotate(-9 200 110)">
            <path d="M200 40 L245 118 L155 118 Z" fill="#e9eef0" fillOpacity="0.9" stroke="#c94f4f" strokeWidth="8" strokeLinejoin="round" />
            <rect x="196" y="118" width="8" height="100" fill="#7f9097" />
          </g>
          <rect y="150" width="390" height="80" fill="#0c1d24" fillOpacity="0.55" />
        </svg>
        <button
          aria-label="Back"
          onClick={onBack}
          style={{ position: 'absolute', left: 16, top: 20, width: 44, height: 44, borderRadius: 22, background: 'rgba(12,29,36,0.8)', border: '1px solid #2a4650', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div style={{ position: 'absolute', right: 16, top: 28, background: 'rgba(12,29,36,0.8)', borderRadius: 12, padding: '5px 10px', font: '700 12px Manrope, sans-serif' }}>
          1/1
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 196, bottom: 80, overflowY: 'auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Progress card */}
        <div style={{ background: '#132a33', border: '1px solid #2a4650', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: STATUS_COLOR[issue.status] }}>{issue.status}</div>
            {issue.plannedWeek && (
              <div style={{ font: '800 24px Manrope, sans-serif', lineHeight: 1.1 }}>{issue.plannedWeek}</div>
            )}
            {issue.plannedRange && (
              <div style={{ font: '500 13px Manrope, sans-serif', color: '#a9b8bd' }}>{issue.plannedRange} · City of {issue.address.split(',').pop()?.trim() ?? ''} maintenance</div>
            )}
          </div>
          {/* Progress bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {STATUS_ORDER.map((s, i) => (
              <span key={s} style={{ height: 6, borderRadius: 3, background: i < completedSteps ? '#3ddc97' : '#2a4650' }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, font: '600 10px Manrope, sans-serif', color: '#a9b8bd' }}>
            {STATUS_ORDER.map((s, i) => (
              <span key={s} style={{ color: i === statusIdx ? '#ffffff' : '#a9b8bd', fontWeight: i === statusIdx ? 800 : 600 }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h1 style={{ margin: 0, font: '800 22px Manrope, sans-serif' }}>{issue.title}</h1>
            <div style={{ font: '500 14px Manrope, sans-serif', color: '#a9b8bd' }}>{issue.address}</div>
          </div>
          <div style={{ font: '700 12px Manrope, sans-serif', background: '#1a3540', border: '1px solid #2a4650', borderRadius: 10, padding: '6px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Severity {issue.severity}/5
          </div>
        </div>

        {/* Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {timelineSteps.map((step, i) => {
            const isLast = i === timelineSteps.length - 1;
            return (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 7, background: step.done ? '#3ddc97' : '#2a4650', marginTop: 3, flexShrink: 0 }} />
                  {!isLast && <span style={{ width: 2, flexGrow: 1, background: step.done ? '#3ddc97' : '#2a4650' }} />}
                </div>
                <div style={{ paddingBottom: isLast ? 0 : 14 }}>
                  <div style={{ font: '700 14px Manrope, sans-serif', color: step.done ? '#ffffff' : '#a9b8bd' }}>{step.text}</div>
                  <div style={{ font: '500 12px Manrope, sans-serif', color: '#a9b8bd' }}>{step.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Points pending */}
        {issue.status !== 'Fixed' && issue.status !== 'Declined' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(61,220,151,0.1)', border: '1px solid rgba(61,220,151,0.4)', borderRadius: 16, padding: '12px 14px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3ddc97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />
            </svg>
            <div style={{ font: '600 13px Manrope, sans-serif' }}>+10 more points when it is fixed</div>
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, background: '#0a1920', borderTop: '1px solid #1f3a44', padding: '12px 16px 20px', boxSizing: 'border-box', display: 'flex', gap: 12 }}>
        <button
          onClick={() => { setConfirmed(true); onConfirm(issue.id); }}
          disabled={confirmed}
          style={{ flex: '1 1 0', height: 48, borderRadius: 24, background: '#132a33', border: '1px solid #2a4650', color: confirmed ? '#a9b8bd' : '#ffffff', font: '700 14px Manrope, sans-serif', cursor: confirmed ? 'default' : 'pointer' }}
        >
          {confirmed ? '✓ Confirmed' : '+1 I see it too'}
        </button>
        <button
          onClick={() => setFollowing(f => !f)}
          style={{ flex: '1 1 0', height: 48, borderRadius: 24, background: following ? '#3ddc97' : '#132a33', border: following ? 'none' : '1px solid #2a4650', color: following ? '#06291b' : '#ffffff', font: '800 14px Manrope, sans-serif', cursor: 'pointer' }}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      </div>
    </div>
  );
}
