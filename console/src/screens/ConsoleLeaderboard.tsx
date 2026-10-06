import React from 'react';
import type { Reporter } from '@shared/types';

interface Props {
  reporters: Reporter[];
}

export function ConsoleLeaderboard({ reporters }: Props) {
  const top3 = reporters.slice(0, 3);
  const rest = reporters.slice(3, 20);

  // Reorder top3 as: [#2, #1, #3] for podium display
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumRanks = [2, 1, 3];
  const podiumHeights = [64, 92, 48];
  const podiumColors = ['#c9d3d6', 'var(--mint)', '#d39a5c'];
  const podiumBorders = ['2px solid #c9d3d6', '3px solid var(--mint)', '2px solid #d39a5c'];
  const podiumSizes = [56, 68, 56];

  const bestReport = reporters[3] ?? reporters[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, font: '800 30px Manrope, sans-serif' }}>Leaderboard</h1>

      {/* podium */}
      <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignItems: 'end' }}>
          {podium.map((rep, idx) => {
            const rank = podiumRanks[idx];
            const height = podiumHeights[idx];
            const color = podiumColors[idx];
            const border = podiumBorders[idx];
            const size = podiumSizes[idx];
            return (
              <div key={rep?.nickname ?? idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ width: size, height: size, borderRadius: size / 2, background: 'var(--raised)', border, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 ${idx === 1 ? 22 : 18}px Manrope, sans-serif` }}>
                  {rep?.initials ?? '?'}
                </span>
                <span style={{ font: `${idx === 1 ? 800 : 700} 13px Manrope, sans-serif` }}>{rep?.nickname}</span>
                <span style={{ font: '600 12px Manrope, sans-serif', color: idx === 1 ? 'var(--mint)' : 'var(--text2)' }}>{rep?.points.toLocaleString()} pts</span>
                <span style={{ width: '100%', height, borderRadius: '12px 12px 0 0', background: idx === 1 ? 'rgba(61,220,151,0.14)' : 'var(--surface)', border: idx === 1 ? '1px solid rgba(61,220,151,0.5)' : '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 ${idx === 1 ? 30 : 22}px Manrope, sans-serif`, color }}>
                  {rank}
                </span>
              </div>
            );
          })}
        </div>

        {/* best report */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 14px' }}>
          <span style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>
          </span>
          <div>
            <div style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mint)' }}>Best report this month</div>
            <div style={{ font: '700 14px Manrope, sans-serif', marginTop: 2 }}>Collapsed kerb — reported by {bestReport?.nickname}</div>
            <div style={{ font: '500 12px Manrope, sans-serif', color: 'var(--text2)' }}>Picked by city staff</div>
          </div>
        </div>

        {/* rest of leaderboard */}
        <div>
          {rest.map((rep, idx) => (
            <div key={rep.nickname} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: idx < rest.length - 1 ? '1px solid #1f3a44' : undefined }}>
              <span style={{ width: 24, font: '800 14px Manrope, sans-serif', color: 'var(--text2)' }}>{idx + 4}</span>
              <span style={{ flexGrow: 1, font: '700 14px Manrope, sans-serif' }}>{rep.nickname}</span>
              <span style={{ font: '700 14px Manrope, sans-serif' }}>{rep.points.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
