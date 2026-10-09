import React, { useMemo } from 'react';
import type { GeneratedData } from '@shared/types';

interface Props {
  data: GeneratedData;
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return `${d.getUTCFullYear()}-W${String(isoWeek(date)).padStart(2, '0')}`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 20,
  padding: 20,
};

export function ConsoleAnalytics({ data }: Props) {
  const now = new Date();

  // Last 12 weeks: build week keys from oldest (12 ago) to current
  const weekKeys = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (11 - i) * 7);
      return isoWeekKey(d);
    });
  }, []);

  // Reports per week (count by firstReported)
  const reportsPerWeek = useMemo(() => {
    const counts: Record<string, number> = {};
    data.issues.forEach((iss) => {
      const key = isoWeekKey(new Date(iss.firstReported));
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return weekKeys.map((k) => ({ key: k, count: counts[k] ?? 0 }));
  }, [data.issues, weekKeys]);

  // Median days to fix trend (assume fixed issues took 7 days, spread across weeks)
  const fixTrend = useMemo(() => {
    const fixedByWeek: Record<string, number[]> = {};
    data.issues
      .filter((i) => i.status === 'Fixed')
      .forEach((i) => {
        const reportDate = new Date(i.firstReported);
        // simulate fix date = reportDate + 4-14 days deterministic from id
        const hash = i.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
        const daysToFix = 4 + (Math.abs(hash) % 11);
        const fixDate = new Date(reportDate.getTime() + daysToFix * 86400000);
        const key = isoWeekKey(fixDate);
        if (!fixedByWeek[key]) fixedByWeek[key] = [];
        fixedByWeek[key].push(daysToFix);
      });
    return weekKeys.map((k) => ({ key: k, median: median(fixedByWeek[k] ?? []) }));
  }, [data.issues, weekKeys]);

  // Issues by category
  const byCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    data.issues.forEach((i) => { counts[i.category] = (counts[i.category] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [data.issues]);

  // Issues by status
  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    data.issues.forEach((i) => { counts[i.status] = (counts[i.status] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [data.issues]);

  // Issues by district (first word of address as street name, omit last token = number)
  const byDistrict = useMemo(() => {
    const counts: Record<string, number> = {};
    data.issues.forEach((i) => {
      const parts = i.address.split(' ');
      const street = parts.slice(0, -1).join(' ') || parts[0];
      counts[street] = (counts[street] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [data.issues]);

  const activeReporters = data.reporters.filter((r) => r.points > 800).length;
  const medianFixAll = useMemo(() => {
    const fixed = data.issues.filter((i) => i.status === 'Fixed');
    const days = fixed.map((i) => {
      const hash = i.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
      return 4 + (Math.abs(hash) % 11);
    });
    return median(days).toFixed(1);
  }, [data.issues]);

  const maxReports = Math.max(...reportsPerWeek.map((w) => w.count), 1);
  const maxFix = Math.max(...fixTrend.map((w) => w.median), 14);
  const maxCat = byCategory[0]?.[1] ?? 1;
  const maxStatus = byStatus[0]?.[1] ?? 1;
  const maxDist = byDistrict[0]?.[1] ?? 1;

  const BAR_H = 120;
  const BAR_W = 460;

  const STATUS_COLORS: Record<string, string> = {
    New: '#9aa7ab', Reported: '#9aa7ab', Accepted: '#5aa9ff',
    Planned: '#5aa9ff', 'In repair': '#ffb547', Fixed: '#3ddc97', Declined: '#ff6b6b',
  };

  function weekLabel(key: string) {
    const wk = parseInt(key.split('-W')[1], 10);
    return `W${wk}`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, font: '800 30px Manrope, sans-serif' }}>Analytics</h1>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total reports', value: String(data.issues.length) },
          { label: 'Median time to fix', value: `${medianFixAll} d`, note: 'Target 10 d' },
          { label: 'Duplicate rate', value: data.kpis[4]?.value ?? '—', note: data.kpis[4]?.note },
          { label: 'Active reporters', value: String(activeReporters), note: `of ${data.reporters.length} total` },
        ].map((k) => (
          <div key={k.label} style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 6, padding: 16 }}>
            <div style={{ font: '600 12px Manrope, sans-serif', color: 'var(--text2)' }}>{k.label}</div>
            <div style={{ font: '800 28px Manrope, sans-serif' }}>{k.value}</div>
            {k.note && <div style={{ font: '600 12px Manrope, sans-serif', color: 'var(--mint)' }}>{k.note}</div>}
          </div>
        ))}
      </div>

      {/* Reports per week bar chart */}
      <section style={CARD}>
        <h2 style={{ margin: '0 0 16px', font: '800 16px Manrope, sans-serif' }}>Reports per week (last 12 weeks)</h2>
        <svg width="100%" height={BAR_H + 24} viewBox={`0 0 ${BAR_W} ${BAR_H + 24}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
          {reportsPerWeek.map((w, i) => {
            const barH = maxReports > 0 ? (w.count / maxReports) * BAR_H : 0;
            const x = i * (BAR_W / 12) + 4;
            const bw = BAR_W / 12 - 8;
            return (
              <g key={w.key}>
                <rect x={x} y={BAR_H - barH} width={bw} height={barH} rx="3" fill="var(--mint)" opacity={i === 11 ? 1 : 0.55} />
                <text x={x + bw / 2} y={BAR_H + 16} textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="10" fill="var(--text3)">
                  {weekLabel(w.key)}
                </text>
                {w.count > 0 && (
                  <text x={x + bw / 2} y={BAR_H - barH - 4} textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="700" fill="var(--text)">
                    {w.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </section>

      {/* Median time to fix trend */}
      <section style={CARD}>
        <h2 style={{ margin: '0 0 16px', font: '800 16px Manrope, sans-serif' }}>Median time to fix (days)</h2>
        <svg width="100%" height={BAR_H + 24} viewBox={`0 0 ${BAR_W} ${BAR_H + 24}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
          {/* target line at 10 days */}
          {(() => {
            const targetY = BAR_H - (10 / maxFix) * BAR_H;
            return (
              <g>
                <line x1={0} y1={targetY} x2={BAR_W} y2={targetY} stroke="#ff8a8a" strokeWidth="1.5" strokeDasharray="6,4" />
                <text x={BAR_W - 4} y={targetY - 4} textAnchor="end" fontFamily="Manrope, sans-serif" fontSize="10" fill="#ff8a8a">target 10 d</text>
              </g>
            );
          })()}
          {/* line path */}
          {(() => {
            const pts = fixTrend.map((w, i) => {
              const x = i * (BAR_W / 12) + BAR_W / 24;
              const y = w.median > 0 ? BAR_H - (w.median / maxFix) * BAR_H : BAR_H;
              return [x, y] as [number, number];
            });
            const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
            return (
              <g>
                <path d={d} fill="none" stroke="var(--mint)" strokeWidth="2.5" strokeLinejoin="round" />
                {pts.map(([x, y], i) => (
                  fixTrend[i].median > 0 ? <circle key={i} cx={x} cy={y} r={4} fill="var(--mint)" /> : null
                ))}
              </g>
            );
          })()}
          {fixTrend.map((w, i) => {
            const x = i * (BAR_W / 12) + 4;
            return (
              <text key={w.key} x={x + (BAR_W / 12 - 8) / 2} y={BAR_H + 16} textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="10" fill="var(--text3)">
                {weekLabel(w.key)}
              </text>
            );
          })}
        </svg>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* By category */}
        <section style={CARD}>
          <h2 style={{ margin: '0 0 14px', font: '800 16px Manrope, sans-serif' }}>By category</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byCategory.map(([cat, count]) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', font: '600 13px Manrope, sans-serif', marginBottom: 4 }}>
                  <span>{cat}</span><span style={{ fontWeight: 700 }}>{count}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#1f3a44' }}>
                  <div style={{ height: 8, borderRadius: 4, width: `${(count / maxCat) * 100}%`, background: 'var(--mint)' }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* By status */}
        <section style={CARD}>
          <h2 style={{ margin: '0 0 14px', font: '800 16px Manrope, sans-serif' }}>By status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byStatus.map(([status, count]) => (
              <div key={status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', font: '600 13px Manrope, sans-serif', marginBottom: 4 }}>
                  <span>{status}</span><span style={{ fontWeight: 700 }}>{count}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#1f3a44' }}>
                  <div style={{ height: 8, borderRadius: 4, width: `${(count / maxStatus) * 100}%`, background: STATUS_COLORS[status] ?? 'var(--mint)' }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* By district */}
        <section style={CARD}>
          <h2 style={{ margin: '0 0 14px', font: '800 16px Manrope, sans-serif' }}>Top streets</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byDistrict.map(([street, count]) => (
              <div key={street}>
                <div style={{ display: 'flex', justifyContent: 'space-between', font: '600 13px Manrope, sans-serif', marginBottom: 4 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{street}</span>
                  <span style={{ fontWeight: 700 }}>{count}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#1f3a44' }}>
                  <div style={{ height: 8, borderRadius: 4, width: `${(count / maxDist) * 100}%`, background: '#5aa9ff' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
