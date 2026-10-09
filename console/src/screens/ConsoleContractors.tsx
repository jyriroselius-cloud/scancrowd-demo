import React, { useState } from 'react';
import type { GeneratedData, Contractor } from '@shared/types';
import { StatusPill } from '../components/StatusPill';

interface Props {
  data: GeneratedData;
  onReassign: (issueId: string, fromContractorId: string, toContractorId: string) => void;
}

export function ConsoleContractors({ data, onReassign }: Props) {
  const [selected, setSelected] = useState<Contractor | null>(null);
  const [reassigning, setReassigning] = useState<string | null>(null); // issueId being reassigned

  const th: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    font: '700 11px Manrope, sans-serif',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text2)',
    whiteSpace: 'nowrap',
  };

  const td: React.CSSProperties = { padding: '14px 12px', font: '500 14px Manrope, sans-serif' };

  const selectedIssues = selected
    ? data.issues.filter((i) => selected.assignedIssueIds.includes(i.id))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, font: '800 30px Manrope, sans-serif' }}>Contractors</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Contractor table */}
        <section style={{ flex: '3 1 500px', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Type</th>
                <th style={th}>Open jobs</th>
                <th style={th}>This week</th>
                <th style={th}>On-time</th>
                <th style={th}>Avg fix (days)</th>
              </tr>
            </thead>
            <tbody>
              {data.contractors.map((c) => {
                const isActive = selected?.id === c.id;
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(isActive ? null : c)}
                    style={{
                      borderTop: '1px solid #1f3a44',
                      background: isActive ? 'rgba(61,220,151,0.08)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ ...td, fontWeight: 700, color: isActive ? 'var(--mint)' : 'var(--text)' }}>{c.name}</td>
                    <td style={td}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 8,
                        background: c.type === 'crew' ? 'rgba(61,220,151,0.12)' : 'rgba(100,160,200,0.12)',
                        color: c.type === 'crew' ? 'var(--mint)' : '#64a0c8',
                        font: '700 12px Manrope, sans-serif',
                      }}>
                        {c.type === 'crew' ? 'City crew' : 'Contractor'}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>{c.openJobs}</td>
                    <td style={td}>{c.jobsThisWeek}</td>
                    <td style={{ ...td, color: c.onTimeRate >= 85 ? 'var(--mint)' : c.onTimeRate >= 70 ? '#ffb547' : '#ff8a8a', fontWeight: 700 }}>
                      {c.onTimeRate} %
                    </td>
                    <td style={td}>{c.avgDaysToFix} d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Assigned issues panel */}
        {selected && (
          <section style={{ flex: '2 1 300px', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ font: '700 11px Manrope, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mint)' }}>Assigned issues</div>
              <div style={{ font: '800 16px Manrope, sans-serif', marginTop: 4 }}>{selected.name}</div>
            </div>
            {selectedIssues.length === 0 && (
              <div style={{ font: '500 13px Manrope, sans-serif', color: 'var(--text3)' }}>No issues assigned.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 500, overflowY: 'auto' }}>
              {selectedIssues.map((issue) => (
                <div key={issue.id} style={{ background: 'var(--raised)', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ font: '700 13px Manrope, sans-serif' }}>{issue.title}</div>
                      <div style={{ font: '500 12px Manrope, sans-serif', color: 'var(--text2)', marginTop: 2 }}>{issue.address} · {issue.id}</div>
                    </div>
                    <StatusPill status={issue.status} />
                  </div>
                  {reassigning === issue.id ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        defaultValue=""
                        style={{ flex: 1, minWidth: 0, height: 34, borderRadius: 8, background: '#0f232b', border: '1px solid var(--line)', color: 'var(--text)', font: '600 13px Manrope, sans-serif', padding: '0 8px' }}
                        onChange={(e) => {
                          if (e.target.value) {
                            onReassign(issue.id, selected.id, e.target.value);
                            setReassigning(null);
                          }
                        }}
                      >
                        <option value="" disabled>Reassign to…</option>
                        {data.contractors.filter((c) => c.id !== selected.id).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setReassigning(null)}
                        style={{ height: 34, padding: '0 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text2)', font: '600 13px Manrope, sans-serif' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReassigning(issue.id)}
                      style={{ alignSelf: 'flex-start', height: 30, padding: '0 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--mint)', color: 'var(--mint)', font: '700 12px Manrope, sans-serif', cursor: 'pointer' }}
                    >
                      Reassign →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
