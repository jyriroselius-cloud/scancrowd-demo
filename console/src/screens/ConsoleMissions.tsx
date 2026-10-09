import React, { useState } from 'react';
import type { GeneratedData, CityData, Mission } from '@shared/types';

interface Props {
  data: GeneratedData;
  cityData: CityData;
  onAddMission: (m: Mission) => void;
}

const MISSION_COLORS: Record<Mission['status'], string> = {
  Active: '#3ddc97',
  Upcoming: '#ffb347',
  Completed: '#9aa7ab',
};

function project(lat: number, lon: number, centerLat: number, centerLon: number, w: number, h: number): [number, number] {
  const scale = 2000;
  const x = w / 2 + (lon - centerLon) * scale;
  const y = h / 2 - (lat - centerLat) * scale * 1.4;
  return [x, y];
}

function polygonCentroid(pts: { lat: number; lon: number }[]): { lat: number; lon: number } {
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
  return { lat, lon };
}

export function ConsoleMissions({ data, cityData, onAddMission }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRule, setFormRule] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Upcoming'>('Active');

  const SVG_W = 500;
  const SVG_H = 360;

  const totalBudget = data.missions.reduce((s, m) => s + m.budget, 0);
  const totalSpent = data.missions.reduce((s, m) => s + m.spent, 0);
  const seasonLeader = [...data.missions].sort((a, b) => b.participants - a.participants)[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    const newMission: Mission = {
      id: `mission-${Date.now()}`,
      name: formName.trim(),
      polygon: Array.from({ length: 6 }, (_, k) => {
        const angle = (k / 6) * Math.PI * 2;
        const r = 0.006;
        return {
          lat: cityData.lat + Math.cos(angle) * r + (Math.random() - 0.5) * 0.004,
          lon: cityData.lon + Math.sin(angle) * r * 1.5 + (Math.random() - 0.5) * 0.004,
        };
      }),
      rewardRule: formRule.trim() || '€1 per item',
      budget: parseInt(formBudget, 10) || 500,
      spent: 0,
      participants: 0,
      status: formStatus,
    };
    onAddMission(newMission);
    setFormName('');
    setFormRule('');
    setFormBudget('');
    setFormStatus('Active');
    setShowForm(false);
  }

  const inputStyle: React.CSSProperties = {
    height: 42,
    borderRadius: 10,
    background: '#0f232b',
    border: '1px solid var(--line)',
    color: 'var(--text)',
    font: '500 14px Manrope, sans-serif',
    padding: '0 12px',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    font: '600 13px Manrope, sans-serif',
    color: 'var(--text2)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <h1 style={{ margin: 0, font: '800 30px Manrope, sans-serif' }}>Missions and rewards</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ height: 42, padding: '0 18px', borderRadius: 12, background: 'var(--mint)', border: 0, color: 'var(--mint-text)', font: '700 14px Manrope, sans-serif', cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ New mission'}
        </button>
      </div>

      {/* Reward pot summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Season budget', value: `€ ${totalBudget.toLocaleString()}` },
          { label: 'Season spent', value: `€ ${totalSpent.toLocaleString()}`, sub: `${Math.round((totalSpent / totalBudget) * 100)} % used` },
          { label: 'Season leader', value: seasonLeader?.name ?? '—', sub: `${seasonLeader?.participants ?? 0} participants` },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ font: '600 12px Manrope, sans-serif', color: 'var(--text2)' }}>{k.label}</div>
            <div style={{ font: '800 22px Manrope, sans-serif' }}>{k.value}</div>
            {k.sub && <div style={{ font: '600 12px Manrope, sans-serif', color: 'var(--mint)' }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* New mission form */}
      {showForm && (
        <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 20 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ margin: 0, font: '800 16px Manrope, sans-serif' }}>New mission</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={labelStyle}>
                Mission name
                <input style={inputStyle} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. City Centre Spring" required />
              </label>
              <label style={labelStyle}>
                Reward rule
                <input style={inputStyle} value={formRule} onChange={(e) => setFormRule(e.target.value)} placeholder="e.g. €2 per pothole fixed" />
              </label>
              <label style={labelStyle}>
                Budget (€)
                <input style={inputStyle} type="number" min="100" value={formBudget} onChange={(e) => setFormBudget(e.target.value)} placeholder="500" />
              </label>
              <label style={labelStyle}>
                Status
                <select
                  style={{ ...inputStyle }}
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Upcoming')}
                >
                  <option value="Active">Active</option>
                  <option value="Upcoming">Upcoming</option>
                </select>
              </label>
            </div>
            <button type="submit" style={{ alignSelf: 'flex-start', height: 44, padding: '0 24px', borderRadius: 12, background: 'var(--mint)', border: 0, color: 'var(--mint-text)', font: '700 14px Manrope, sans-serif', cursor: 'pointer' }}>
              Add mission
            </button>
          </form>
        </section>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Mission list */}
        <div style={{ flex: '2 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.missions.map((m) => {
            const pct = Math.min(100, Math.round((m.spent / m.budget) * 100));
            const color = MISSION_COLORS[m.status];
            return (
              <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ font: '800 15px Manrope, sans-serif' }}>{m.name}</div>
                  <span style={{ padding: '2px 10px', borderRadius: 8, background: `${color}22`, color, font: '700 12px Manrope, sans-serif', whiteSpace: 'nowrap' }}>
                    {m.status}
                  </span>
                </div>
                <div style={{ font: '500 13px Manrope, sans-serif', color: 'var(--text2)' }}>{m.rewardRule}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', font: '600 12px Manrope, sans-serif', color: 'var(--text2)' }}>
                  <span>€{m.spent.toLocaleString()} / €{m.budget.toLocaleString()}</span>
                  <span>{m.participants} participants</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: '#1f3a44' }}>
                  <div style={{ height: 6, borderRadius: 3, width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Map with mission polygons */}
        <section style={{ flex: '3 1 360px', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 16 }}>
          <div style={{ font: '700 13px Manrope, sans-serif', color: 'var(--text2)', marginBottom: 10 }}>Mission areas</div>
          <svg
            width="100%"
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            preserveAspectRatio="xMidYMid slice"
            style={{ display: 'block', background: '#0e2229', borderRadius: 14 }}
          >
            {/* stylised streets */}
            <g stroke="#1b3943" strokeWidth="12" fill="none" strokeLinecap="round">
              <path d={`M-10 ${SVG_H * 0.4} L${SVG_W + 10} ${SVG_H * 0.32}`} />
              <path d={`M-10 ${SVG_H * 0.75} L${SVG_W + 10} ${SVG_H * 0.67}`} />
              <path d={`M${SVG_W * 0.32} -10 L${SVG_W * 0.4} ${SVG_H + 10}`} />
              <path d={`M${SVG_W * 0.72} -10 L${SVG_W * 0.78} ${SVG_H + 10}`} />
            </g>

            {/* Mission polygons */}
            {data.missions.map((m) => {
              const color = MISSION_COLORS[m.status];
              const points = m.polygon
                .map((p) => {
                  const [x, y] = project(p.lat, p.lon, cityData.lat, cityData.lon, SVG_W, SVG_H);
                  return `${x},${y}`;
                })
                .join(' ');
              const centroid = polygonCentroid(m.polygon);
              const [cx, cy] = project(centroid.lat, centroid.lon, cityData.lat, cityData.lon, SVG_W, SVG_H);
              return (
                <g key={m.id}>
                  <polygon points={points} fill={`${color}33`} stroke={color} strokeWidth="2" />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="Manrope, sans-serif"
                    fontSize="11"
                    fontWeight="700"
                    fill={color}
                  >
                    {m.name.split(' ').slice(0, 2).join(' ')}
                  </text>
                </g>
              );
            })}

            {/* Issue pins */}
            {data.issues.slice(0, 80).map((issue) => {
              const [x, y] = project(issue.lat, issue.lon, cityData.lat, cityData.lon, SVG_W, SVG_H);
              if (x < 4 || x > SVG_W - 4 || y < 4 || y > SVG_H - 4) return null;
              return (
                <circle key={issue.id} cx={x} cy={y} r={4} fill="#9aa7ab88" stroke="#0c1d24" strokeWidth="1" />
              );
            })}
          </svg>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, font: '600 12px Manrope, sans-serif' }}>
            {(['Active', 'Upcoming', 'Completed'] as Mission['status'][]).map((s) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, color: MISSION_COLORS[s] }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: MISSION_COLORS[s] }} />
                {s}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
