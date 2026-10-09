import React, { useState } from 'react';
import type { Reporter } from '@shared/types';

interface Props {
  reporters: Reporter[];
}

type Tab = 'Week' | 'Month' | 'Season';

const TAB_SCALE: Record<Tab, number> = { Week: 0.15, Month: 0.4, Season: 1.0 };

const BEST_IMAGES = ['/images/pothole/pothole-01.jpg', '/images/crack/crack-01.jpg'];
const BEST_TITLES = ['Collapsed kerb near bus stop', 'Deep pothole on main road'];

export function ConsoleLeaderboard({ reporters }: Props) {
  const [tab, setTab] = useState<Tab>('Season');
  const [bestReportIdx, setBestReportIdx] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  const scale = TAB_SCALE[tab];
  const minPoints: Record<Tab, number> = { Week: 200, Month: 400, Season: 0 };

  const tabReporters = reporters
    .filter((r) => r.points * scale >= minPoints[tab])
    .map((r) => ({ ...r, displayPoints: Math.round(r.points * scale) }))
    .slice(0, 20);

  const top3 = tabReporters.slice(0, 3);
  const rest = tabReporters.slice(3);

  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumRanks = [2, 1, 3];
  const podiumHeights = [64, 92, 48];
  const podiumColors = ['#c9d3d6', 'var(--mint)', '#d39a5c'];
  const podiumBorders = ['2px solid #c9d3d6', '3px solid var(--mint)', '2px solid #d39a5c'];
  const podiumSizes = [56, 68, 56];

  const bestReporter = reporters[bestReportIdx + 3] ?? reporters[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0, font: '800 30px Manrope, sans-serif' }}>Leaderboard and prizes</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['Week', 'Month', 'Season'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                height: 36, padding: '0 16px', borderRadius: 10,
                background: tab === t ? 'var(--mint)' : 'transparent',
                color: tab === t ? 'var(--mint-text)' : 'var(--text)',
                border: tab === t ? '0' : '1px solid var(--line)',
                font: `${tab === t ? 700 : 600} 13px Manrope, sans-serif`,
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* podium */}
        {top3.length >= 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignItems: 'end' }}>
            {podiumOrder.map((rep, idx) => {
              if (!rep) return <div key={idx} />;
              const rank = podiumRanks[idx];
              const height = podiumHeights[idx];
              const color = podiumColors[idx];
              const border = podiumBorders[idx];
              const size = podiumSizes[idx];
              return (
                <div key={rep.nickname} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: size, height: size, borderRadius: size / 2, background: 'var(--raised)', border, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 ${idx === 1 ? 22 : 18}px Manrope, sans-serif` }}>
                    {rep.initials}
                  </span>
                  <span style={{ font: `${idx === 1 ? 800 : 700} 13px Manrope, sans-serif` }}>{rep.nickname}</span>
                  <span style={{ font: '600 12px Manrope, sans-serif', color: idx === 1 ? 'var(--mint)' : 'var(--text2)' }}>
                    {rep.displayPoints.toLocaleString()} pts
                  </span>
                  <span style={{ width: '100%', height, borderRadius: '12px 12px 0 0', background: idx === 1 ? 'rgba(61,220,151,0.14)' : 'var(--surface)', border: idx === 1 ? '1px solid rgba(61,220,151,0.5)' : '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 ${idx === 1 ? 30 : 22}px Manrope, sans-serif`, color }}>
                    {rank}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Best report banner */}
        <div style={{ background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 80, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#1a3a45' }}>
            <img
              src={BEST_IMAGES[bestReportIdx % BEST_IMAGES.length]}
              alt="Best report"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mint)' }}>Best report this month</div>
            <div style={{ font: '700 14px Manrope, sans-serif', marginTop: 2 }}>{BEST_TITLES[bestReportIdx % BEST_TITLES.length]} — reported by {bestReporter?.nickname}</div>
            <div style={{ font: '500 12px Manrope, sans-serif', color: 'var(--text2)' }}>Picked by city staff</div>
          </div>
          <button
            onClick={() => setShowPicker((v) => !v)}
            style={{ height: 34, padding: '0 14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', font: '600 13px Manrope, sans-serif', cursor: 'pointer', flexShrink: 0 }}
          >
            Change best report
          </button>
        </div>

        {/* Picker modal */}
        {showPicker && (
          <div style={{ background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
            <div style={{ font: '700 13px Manrope, sans-serif', marginBottom: 10 }}>Select best report</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reporters.slice(3, 8).map((rep, i) => (
                <button
                  key={rep.nickname}
                  onClick={() => { setBestReportIdx(i); setShowPicker(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
                    background: bestReportIdx === i ? 'rgba(61,220,151,0.1)' : 'transparent',
                    border: bestReportIdx === i ? '1px solid var(--mint)' : '1px solid transparent',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 52, height: 36, borderRadius: 6, overflow: 'hidden', background: '#1a3a45', flexShrink: 0 }}>
                    <img
                      src={BEST_IMAGES[i % BEST_IMAGES.length]}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <div>
                    <div style={{ font: '700 13px Manrope, sans-serif', color: 'var(--text)' }}>{BEST_TITLES[i % BEST_TITLES.length]}</div>
                    <div style={{ font: '500 12px Manrope, sans-serif', color: 'var(--text2)' }}>by {rep.nickname}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rest of leaderboard */}
        <div>
          {rest.map((rep, idx) => (
            <div key={rep.nickname} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: idx < rest.length - 1 ? '1px solid #1f3a44' : undefined }}>
              <span style={{ width: 24, font: '800 14px Manrope, sans-serif', color: 'var(--text2)' }}>{idx + 4}</span>
              <span style={{ flexGrow: 1, font: '700 14px Manrope, sans-serif' }}>{rep.nickname}</span>
              <span style={{ font: '700 14px Manrope, sans-serif' }}>{rep.displayPoints.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Monthly prizes */}
      <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 20 }}>
        <h2 style={{ margin: '0 0 14px', font: '800 16px Manrope, sans-serif' }}>Monthly prize list</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {[
            { rank: '#1', prize: '€100 gift card', color: 'var(--mint)' },
            { rank: '#2', prize: '€50 gift card', color: '#c9d3d6' },
            { rank: '#3', prize: '€25 gift card', color: '#d39a5c' },
            { rank: 'Best report', prize: 'City merit badge', color: '#5aa9ff' },
          ].map((p) => (
            <div key={p.rank} style={{ background: 'var(--raised)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ font: '800 16px Manrope, sans-serif', color: p.color }}>{p.rank}</span>
              <span style={{ font: '600 14px Manrope, sans-serif' }}>{p.prize}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
