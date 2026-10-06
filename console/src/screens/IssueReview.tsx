import React, { useState } from 'react';
import type { Issue, CityData } from '@shared/types';
import { StatusPill } from '../components/StatusPill';

interface Props {
  issue: Issue;
  cityData: CityData;
  onBack: () => void;
  onUpdate: (updated: Issue) => void;
}

const WEEKS = Array.from({ length: 8 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i * 7 + 1);
  const wk = Math.ceil((d.getDate() + new Date(d.getFullYear(), 0, 1).getDay()) / 7);
  return `Week ${wk} · ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
});

const CATEGORY_SVG: Record<string, string> = {
  Pothole: `<ellipse cx="50" cy="140" rx="80" ry="30" fill="#0d1a1f"/><ellipse cx="160" cy="110" rx="50" ry="18" fill="#0d1a1f"/>`,
  'Traffic sign': `<g transform="rotate(-9 110 90)"><path d="M110 40 L155 115 L65 115 Z" fill="#e9eef0" fill-opacity="0.9" stroke="#c94f4f" stroke-width="7" stroke-linejoin="round"/><rect x="106" y="115" width="8" height="80" fill="#7f9097"/></g>`,
  'Street light': `<rect x="95" y="20" width="10" height="120" fill="#4a6a78"/><path d="M105 20 Q160 20 160 60" stroke="#4a6a78" stroke-width="10" fill="none"/><ellipse cx="160" cy="65" rx="20" ry="10" fill="#ffe066"/>`,
  Manhole: `<circle cx="110" cy="130" r="70" fill="#1c3038"/><circle cx="110" cy="130" r="55" fill="#0d1a1f"/><rect x="90" y="90" width="40" height="80" rx="4" fill="#1c3038"/>`,
  'Road marking': `<rect x="0" y="120" width="220" height="60" fill="#22383f"/><rect x="30" y="135" width="40" height="12" fill="#ffffff" fill-opacity="0.3"/><rect x="120" y="135" width="40" height="12" fill="#ffffff" fill-opacity="0.3"/>`,
  Other: `<rect x="20" y="100" width="180" height="80" rx="8" fill="#1c3038"/><path d="M20 100 L200 180" stroke="#0d1a1f" stroke-width="4"/>`,
};

export function IssueReview({ issue, cityData, onBack, onUpdate }: Props) {
  const [crew, setCrew] = useState('Street maintenance · crew North');
  const [plannedWeek, setPlannedWeek] = useState(WEEKS[1]);
  const [message, setMessage] = useState(`Thanks for reporting! The repair is planned for ${WEEKS[1].split(' · ')[0]}.`);
  const [notify, setNotify] = useState(true);
  const [toast, setToast] = useState('');

  const svg = CATEGORY_SVG[issue.category] ?? CATEGORY_SVG['Other'];
  const confidence = 85 + Math.floor(Math.abs(issue.id.charCodeAt(3) - 48) * 2);

  function handleAccept() {
    const week = plannedWeek.split(' · ')[0];
    const updated: Issue = { ...issue, status: 'Planned', plannedWeek: week.replace('Week ', 'Wk ') };
    onUpdate(updated);
    setToast(`${issue.reports} reporters notified`);
    setTimeout(() => setToast(''), 3000);
  }

  function handleDecline() {
    onUpdate({ ...issue, status: 'Declined' });
    onBack();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* breadcrumb */}
      <div style={{ font: '600 13px Manrope, sans-serif', color: 'var(--text2)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 0, color: 'var(--mint)', font: 'inherit', cursor: 'pointer', padding: 0 }}>Work queue</button>
        {' / '}{issue.id}
      </div>

      {/* title row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, font: '800 30px Manrope, sans-serif' }}>{issue.title}</h1>
            <StatusPill status={issue.status} size="md" />
          </div>
          <div style={{ font: '500 14px Manrope, sans-serif', color: 'var(--text2)', marginTop: 4 }}>
            {issue.address} · first reported {issue.firstReported} · {issue.reports} report{issue.reports !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleDecline} style={{ height: 44, padding: '0 18px', borderRadius: 12, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', font: '700 14px Manrope, sans-serif' }}>Decline</button>
          <button style={{ height: 44, padding: '0 18px', borderRadius: 12, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', font: '700 14px Manrope, sans-serif' }}>Merge into…</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* left column */}
        <div style={{ flex: '3 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* photo */}
          <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ borderRadius: 14, overflow: 'hidden', height: 280, background: '#152f39' }}>
              <svg width="100%" height="280" viewBox="0 0 220 200" preserveAspectRatio="xMidYMid slice" aria-label={`Illustration: ${issue.category}`}>
                <rect width="220" height="200" fill="#1a3038"/>
                <path d="M0 80 L220 60 L220 200 L0 200 Z" fill="#22383f"/>
                <g dangerouslySetInnerHTML={{ __html: svg }} />
                <rect x="30" y="65" width="110" height="75" rx="6" fill="none" stroke="var(--mint)" strokeWidth="2.5"/>
                <rect x="30" y="45" width="90" height="20" rx="5" fill="var(--mint)"/>
                <text x="38" y="59" fontFamily="Manrope, sans-serif" fontSize="11" fontWeight="800" fill="#06291b">{issue.category} · 0.{confidence}</text>
              </svg>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} style={{ height: 64, borderRadius: 10, background: 'var(--raised)', border: i === 0 ? '2px solid var(--mint)' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 13px Manrope, sans-serif', color: 'var(--text2)' }}>
                  {i === 3 && issue.reports > 4 ? `+${issue.reports - 4}` : ''}
                </span>
              ))}
            </div>
          </section>

          {/* AI analysis */}
          <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, font: '800 16px Manrope, sans-serif' }}>AI analysis</h2>
              <span style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mint)' }}>ScanwAi</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
              {[
                { label: 'Category', value: `${issue.category}` },
                { label: 'Confidence', value: `${confidence} %` },
                { label: 'Severity', value: `${issue.severity} / 5`, red: issue.severity >= 4 },
                { label: 'Privacy', value: 'Blurred' },
              ].map((item) => (
                <div key={item.label} style={{ background: '#0f232b', borderRadius: 12, padding: 12 }}>
                  <div style={{ font: '600 12px Manrope, sans-serif', color: 'var(--text2)' }}>{item.label}</div>
                  <div style={{ font: '800 16px Manrope, sans-serif', color: item.red ? '#ff8a8a' : 'var(--text)' }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ font: '500 13px Manrope, sans-serif', color: 'var(--text3)' }}>
              {issue.reports} report{issue.reports !== 1 ? 's' : ''} within 15 m merged automatically.
            </div>
          </section>
        </div>

        {/* right column */}
        <div style={{ flex: '2 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ECO360 priority */}
          <section style={{ background: 'rgba(61,220,151,0.08)', border: '1px solid rgba(61,220,151,0.45)', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mint)' }}>ECO360 priority</span>
              <span style={{ font: '800 22px Manrope, sans-serif' }}>{issue.priority}<span style={{ fontSize: 13, color: 'var(--text2)' }}> / 100</span></span>
            </div>
            <div style={{ font: '800 20px Manrope, sans-serif' }}>{issue.priority >= 75 ? 'Repair now' : issue.priority >= 50 ? 'Schedule soon' : 'Low priority'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, font: '500 13px Manrope, sans-serif', color: 'var(--text3)' }}>
              {issue.priority >= 70 && <div>High-traffic segment · pedestrian path nearby</div>}
              <div>Deferring 3 months: damage area roughly doubles</div>
              <div>Repair cost if deferred: +€ [estimate]</div>
              <div>CO₂ effect, repair now vs. deferral: [t CO₂e]</div>
            </div>
          </section>

          {/* Accept form */}
          <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ margin: 0, font: '800 16px Manrope, sans-serif' }}>Accept and schedule</h2>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, font: '600 13px Manrope, sans-serif', color: 'var(--text2)' }}>Assign to
              <select value={crew} onChange={(e) => setCrew(e.target.value)} style={{ height: 44, borderRadius: 12, background: '#0f232b', border: '1px solid var(--line)', color: 'var(--text)', padding: '0 12px', font: '600 14px Manrope, sans-serif' }}>
                <option>Street maintenance · crew North</option>
                <option>Street maintenance · crew South</option>
                <option>Contractor · [name]</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, font: '600 13px Manrope, sans-serif', color: 'var(--text2)' }}>Planned fix
              <select value={plannedWeek} onChange={(e) => setPlannedWeek(e.target.value)} style={{ height: 44, borderRadius: 12, background: '#0f232b', border: '1px solid var(--line)', color: 'var(--text)', padding: '0 12px', font: '600 14px Manrope, sans-serif' }}>
                {WEEKS.map((w) => <option key={w}>{w}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, font: '600 13px Manrope, sans-serif', color: 'var(--text2)' }}>Message to reporters
              <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} style={{ borderRadius: 12, background: '#0f232b', border: '1px solid var(--line)', color: 'var(--text)', padding: '10px 12px', font: '500 14px Manrope, sans-serif', resize: 'vertical' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, font: '600 14px Manrope, sans-serif' }}>
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--mint)' }} />
              Notify {issue.reports} reporter{issue.reports !== 1 ? 's' : ''} and award +10 points
            </label>
            <button onClick={handleAccept} style={{ height: 52, borderRadius: 14, background: 'var(--mint)', border: 0, color: 'var(--mint-text)', font: '800 15px Manrope, sans-serif', cursor: 'pointer' }}>
              Accept and schedule
            </button>
          </section>

          {/* activity */}
          <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ margin: 0, font: '800 16px Manrope, sans-serif' }}>Activity</h2>
            <div style={{ font: '500 13px Manrope, sans-serif', color: 'var(--text3)' }}>First reported {issue.firstReported}</div>
            {issue.reports > 1 && <div style={{ font: '500 13px Manrope, sans-serif', color: 'var(--text3)' }}>{issue.reports - 1} additional confirmations</div>}
          </section>
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, background: 'var(--mint)', color: 'var(--mint-text)', borderRadius: 14, padding: '12px 20px', font: '700 15px Manrope, sans-serif', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
