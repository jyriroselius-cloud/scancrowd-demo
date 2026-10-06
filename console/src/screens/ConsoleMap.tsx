import React, { useState } from 'react';
import type { GeneratedData, CityData, Issue } from '@shared/types';
import type { Status } from '@shared/types';
import { FallbackMap } from '../components/FallbackMap';
import { StatusPill } from '../components/StatusPill';

interface Props {
  data: GeneratedData;
  cityData: CityData;
  onOpenIssue: (issue: Issue) => void;
}

const STATUSES: Status[] = ['New', 'Accepted', 'Planned', 'In repair', 'Fixed', 'Declined'];

export function ConsoleMap({ data, cityData, onOpenIssue }: Props) {
  const [activeStatuses, setActiveStatuses] = useState<Set<Status>>(
    new Set(['New', 'Accepted', 'Planned', 'In repair'])
  );

  function toggle(s: Status) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const visible = data.issues.filter((i) => activeStatuses.has(i.status as Status));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ margin: 0, font: '800 30px Manrope, sans-serif' }}>Map</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => toggle(s)}
            style={{
              height: 34, padding: '0 14px', borderRadius: 17,
              background: activeStatuses.has(s) ? 'var(--surface)' : 'transparent',
              border: activeStatuses.has(s) ? '1px solid var(--mint)' : '1px solid var(--line)',
              color: activeStatuses.has(s) ? 'var(--text)' : 'var(--text2)',
              font: '600 13px Manrope, sans-serif',
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden' }}>
        <FallbackMap
          issues={visible}
          centerLat={cityData.lat}
          centerLon={cityData.lon}
          height={560}
        />
      </div>
      <div style={{ font: '600 13px Manrope, sans-serif', color: 'var(--text2)' }}>{visible.length} issues shown</div>
    </div>
  );
}
