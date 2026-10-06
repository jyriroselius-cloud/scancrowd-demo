import React, { useState } from 'react';
import type { Reporter, CityData } from '@shared/types';
import TabBar from '../components/TabBar';

interface Props {
  cityData: CityData;
  reporters: Reporter[];
  userPoints: number;
  onHome: () => void;
  onActivity: () => void;
  onCapture: () => void;
}

type Period = 'Week' | 'Month' | 'Season';

const SILVER = '#c9d3d6';
const GOLD = '#3ddc97';
const BRONZE = '#d39a5c';

export default function Leaderboard({ cityData, reporters, userPoints, onHome, onActivity, onCapture }: Props) {
  const [period, setPeriod] = useState<Period>('Month');

  const now = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = months[now.getMonth()];
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();

  const sorted = [...reporters].sort((a, b) => b.points - a.points);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3, 6);

  const userRank = Math.max(7, sorted.findIndex(r => r.points <= userPoints) + 1) || 9;
  const userNextPoints = sorted[userRank - 4]?.points ?? userPoints + 630;
  const progressPct = Math.min(100, Math.round((userPoints / userNextPoints) * 100));

  const bestReport = rest[0];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: '#0c1d24', fontFamily: 'Manrope, system-ui, sans-serif', color: '#ffffff' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 84, overflowY: 'auto', padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3ddc97' }}>{cityData.name} · {monthName}</div>
            <h1 style={{ margin: 0, font: '800 28px Manrope, sans-serif' }}>Leaderboard</h1>
          </div>
          <div style={{ font: '600 12px Manrope, sans-serif', color: '#a9b8bd' }}>Ends in {daysLeft} days</div>
        </div>

        {/* Period tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, background: '#132a33', border: '1px solid #2a4650', borderRadius: 14, padding: 4 }}>
          {(['Week', 'Month', 'Season'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                height: 36,
                borderRadius: 10,
                border: 'none',
                background: period === p ? '#3ddc97' : 'transparent',
                color: period === p ? '#06291b' : '#a9b8bd',
                font: period === p ? '800 13px Manrope, sans-serif' : '700 13px Manrope, sans-serif',
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Podium: 2, 1, 3 order */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignItems: 'end' }}>
          {/* 2nd */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 56, height: 56, borderRadius: 28, background: '#1a3540', border: `2px solid ${SILVER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 18px Manrope, sans-serif' }}>{top3[1]?.initials ?? 'SS'}</span>
            <span style={{ font: '700 13px Manrope, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{top3[1]?.nickname ?? 'signspotter'}</span>
            <span style={{ font: '600 12px Manrope, sans-serif', color: '#a9b8bd' }}>{(top3[1]?.points ?? 1860).toLocaleString()} pts</span>
            <span style={{ width: '100%', height: 64, borderRadius: '12px 12px 0 0', background: '#132a33', border: '1px solid #2a4650', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 24px Manrope, sans-serif', color: SILVER }}>2</span>
          </div>
          {/* 1st */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 68, height: 68, borderRadius: 34, background: '#1a3540', border: `3px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 22px Manrope, sans-serif' }}>{top3[0]?.initials ?? 'PP'}</span>
            <span style={{ font: '800 14px Manrope, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{top3[0]?.nickname ?? 'potholepro'}</span>
            <span style={{ font: '700 12px Manrope, sans-serif', color: GOLD }}>{(top3[0]?.points ?? 2410).toLocaleString()} pts</span>
            <span style={{ width: '100%', height: 92, borderRadius: '12px 12px 0 0', background: 'rgba(61,220,151,0.14)', border: `1px solid rgba(61,220,151,0.5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 30px Manrope, sans-serif', color: GOLD }}>1</span>
          </div>
          {/* 3rd */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 56, height: 56, borderRadius: 28, background: '#1a3540', border: `2px solid ${BRONZE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 18px Manrope, sans-serif' }}>{top3[2]?.initials ?? 'HC'}</span>
            <span style={{ font: '700 13px Manrope, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{top3[2]?.nickname ?? 'hervanta_crew'}</span>
            <span style={{ font: '600 12px Manrope, sans-serif', color: '#a9b8bd' }}>{(top3[2]?.points ?? 1720).toLocaleString()} pts</span>
            <span style={{ width: '100%', height: 48, borderRadius: '12px 12px 0 0', background: '#132a33', border: '1px solid #2a4650', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 22px Manrope, sans-serif', color: BRONZE }}>3</span>
          </div>
        </div>

        {/* Best report */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#132a33', border: '1px solid #2a4650', borderRadius: 16, padding: 10 }}>
          <span style={{ width: 56, height: 56, borderRadius: 12, background: '#1a3540', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3ddc97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />
            </svg>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3ddc97' }}>Best report of {months[Math.max(0, now.getMonth() - 1)]}</span>
            <span style={{ font: '700 14px Manrope, sans-serif' }}>Collapsed kerb, Pispalan valtatie</span>
            <span style={{ font: '500 12px Manrope, sans-serif', color: '#a9b8bd' }}>by {bestReport?.nickname ?? 'nightowl_tre'} · picked by city staff</span>
          </span>
        </div>

        {/* Rows 4-6 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rest.map((r, i) => (
            <div key={r.nickname} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: i < rest.length - 1 ? '1px solid #1f3a44' : 'none' }}>
              <span style={{ width: 24, font: '800 14px Manrope, sans-serif', color: '#a9b8bd' }}>{i + 4}</span>
              <span style={{ flexGrow: 1, font: '700 14px Manrope, sans-serif' }}>{r.nickname}</span>
              <span style={{ font: '700 14px Manrope, sans-serif' }}>{r.points.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pinned user row */}
      <div style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 94,
        background: '#3ddc97',
        color: '#06291b',
        borderRadius: 18,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: '0 10px 28px rgba(61,220,151,0.25)',
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 24, font: '800 15px Manrope, sans-serif' }}>{userRank}</span>
          <span style={{ flexGrow: 1, font: '800 15px Manrope, sans-serif' }}>You</span>
          <span style={{ font: '800 15px Manrope, sans-serif' }}>{userPoints.toLocaleString()} pts</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(6,41,27,0.2)' }}>
          <div style={{ width: `${progressPct}%`, height: 6, borderRadius: 3, background: '#06291b' }} />
        </div>
        <div style={{ font: '600 12px Manrope, sans-serif' }}>
          {Math.max(0, userNextPoints - userPoints).toLocaleString()} pts to top 3 · top 3 win city service vouchers
        </div>
      </div>

      <TabBar active="leaderboard" onMap={onHome} onActivity={onActivity} onCapture={onCapture} onRanks={() => {}} onProfile={() => {}} />
    </div>
  );
}
