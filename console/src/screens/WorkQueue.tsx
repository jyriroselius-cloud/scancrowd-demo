import React, { useState, useMemo } from 'react';
import type { GeneratedData, Issue, CityData } from '@shared/types';
import { StatusPill } from '../components/StatusPill';
import { FallbackMap } from '../components/FallbackMap';

type Filter = 'All' | 'New' | 'Accepted' | 'Planned' | 'In repair';

interface Props {
  data: GeneratedData;
  cityData: CityData;
  onOpenIssue: (issue: Issue) => void;
}

const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export function WorkQueue({ data, cityData, onOpenIssue }: Props) {
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    data.issues.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [data]);

  const filtered = useMemo(() => {
    let issues = data.issues.filter((i) => i.status !== 'Fixed' && i.status !== 'Declined');
    if (filter !== 'All') issues = issues.filter((i) => i.status === filter);
    if (search) {
      const q = search.toLowerCase();
      issues = issues.filter((i) => i.address.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || i.title.toLowerCase().includes(q));
    }
    return issues;
  }, [data, filter, search]);

  const FILTERS: Filter[] = ['All', 'New', 'Accepted', 'Planned', 'In repair'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <div style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mint)' }}>{today}</div>
          <h1 style={{ margin: '4px 0 0', font: '800 30px Manrope, sans-serif' }}>Work queue</h1>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <label style={{ height: 42, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
            <input
              type="text"
              placeholder="Search address or ID"
              aria-label="Search issues"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200, background: 'transparent', border: 0, outline: 'none', color: 'var(--text)', font: '500 14px Manrope, sans-serif' }}
            />
          </label>
          <button style={{ height: 42, padding: '0 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)', font: '700 14px Manrope, sans-serif' }}>Export CSV</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {data.kpis.map((k) => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ font: '600 12px Manrope, sans-serif', color: 'var(--text2)' }}>{k.label}</div>
            <div style={{ font: '800 28px Manrope, sans-serif' }}>{k.value}</div>
            <div style={{ font: '600 12px Manrope, sans-serif', color: 'var(--mint)' }}>{k.note}</div>
          </div>
        ))}
      </div>

      {/* table + map */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* table */}
        <section style={{ flex: '3 1 560px', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    height: 32, padding: '0 12px', borderRadius: 16,
                    background: filter === f ? 'var(--mint)' : 'transparent',
                    color: filter === f ? 'var(--mint-text)' : 'var(--text)',
                    border: filter === f ? '0' : '1px solid var(--line)',
                    font: `${filter === f ? 700 : 600} 13px Manrope, sans-serif`,
                  }}
                >
                  {f} {f === 'All' ? data.issues.filter(i => i.status !== 'Fixed' && i.status !== 'Declined').length : (counts[f] ?? 0)}
                </button>
              ))}
            </div>
            <div style={{ font: '600 13px Manrope, sans-serif', color: 'var(--text2)' }}>Sorted by priority</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', font: '500 14px Manrope, sans-serif' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text2)', font: '700 11px Manrope, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px' }}>Priority</th>
                  <th style={{ padding: '8px' }}>Issue</th>
                  <th style={{ padding: '8px' }}>Reports</th>
                  <th style={{ padding: '8px' }}>Severity</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Fix</th>
                  <th style={{ padding: '8px' }}><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((issue) => (
                  <tr key={issue.id} style={{ borderTop: '1px solid #1f3a44' }}>
                    <td style={{ padding: '12px 8px', width: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ font: '800 14px Manrope, sans-serif', width: 26 }}>{issue.priority}</span>
                        <span style={{ flexGrow: 1, height: 6, borderRadius: 3, background: '#1f3a44' }}>
                          <span style={{ display: 'block', height: 6, borderRadius: 3, width: `${issue.priority}%`, background: issue.priority >= 75 ? 'var(--mint)' : '#5f8a96' }} />
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ font: '700 14px Manrope, sans-serif' }}>{issue.title}</div>
                      <div style={{ font: '500 12px Manrope, sans-serif', color: 'var(--text2)' }}>{issue.address} · {issue.id}</div>
                    </td>
                    <td style={{ padding: '12px 8px', fontWeight: 700 }}>{issue.reports}</td>
                    <td style={{ padding: '12px 8px' }}>{issue.severity}/5</td>
                    <td style={{ padding: '12px 8px' }}><StatusPill status={issue.status} /></td>
                    <td style={{ padding: '12px 8px', color: 'var(--text3)' }}>{issue.plannedWeek ?? '—'}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <button
                        onClick={() => onOpenIssue(issue)}
                        style={{ display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 10, border: '1px solid var(--mint)', background: 'transparent', color: 'var(--mint)', font: '700 13px Manrope, sans-serif' }}
                      >Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* map */}
        <section style={{ flex: '2 1 340px', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, font: '800 16px Manrope, sans-serif' }}>Open issues on the map</h2>
            <span style={{ font: '600 12px Manrope, sans-serif', color: 'var(--text2)' }}>Last 30 days</span>
          </div>
          <FallbackMap
            issues={data.issues.filter(i => i.status !== 'Fixed' && i.status !== 'Declined')}
            centerLat={cityData.lat}
            centerLon={cityData.lon}
            height={380}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, font: '600 12px Manrope, sans-serif', color: 'var(--text3)' }}>
            {[['New', 'var(--new)'], ['Accepted', 'var(--accepted)'], ['In repair', 'var(--repair)'], ['Fixed', 'var(--fixed)']].map(([label, bg]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: bg }} />{label}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
