import React from 'react';
import type { Issue, GeneratedData, CityData } from '@shared/types';
import AppMap from '../components/AppMap';

interface Props {
  generated: GeneratedData;
  cityData: CityData;
  userReports: Issue[];
  userLat?: number;
  userLon?: number;
  onIssueSelect: (id: string) => void;
  onBack: () => void;
}

export default function MapScreen({ generated, cityData, userReports, userLat, userLon, onIssueSelect, onBack }: Props) {
  const allIssues = [...generated.issues, ...userReports].filter(
    (i) => i.status !== 'Fixed' && i.status !== 'Declined',
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', background: '#0e2229' }}>
      <AppMap
        issues={allIssues}
        centerLat={cityData.lat}
        centerLon={cityData.lon}
        userLat={userLat}
        userLon={userLon}
        onIssueTap={onIssueSelect}
      />
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 'calc(16px + var(--safe-top, env(safe-area-inset-top, 0px)))',
          left: 16,
          zIndex: 20,
          height: 44,
          padding: '0 16px',
          borderRadius: 22,
          background: '#132a33',
          border: '1px solid #2a4650',
          color: '#ffffff',
          font: '700 14px Manrope, system-ui, sans-serif',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back
      </button>
      <div style={{
        position: 'absolute',
        bottom: 'calc(16px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#132a33cc',
        border: '1px solid #2a4650',
        borderRadius: 20,
        padding: '6px 14px',
        font: '600 12px Manrope, system-ui, sans-serif',
        color: '#a9b8bd',
        whiteSpace: 'nowrap',
      }}>
        {allIssues.length} open issues
      </div>
    </div>
  );
}
