import React from 'react';
import type { Issue, Status } from '@shared/types';

const STATUS_COLOR: Record<Status, string> = {
  New: '#9aa7ab',
  Reported: '#9aa7ab',
  Accepted: '#5aa9ff',
  Planned: '#5aa9ff',
  'In repair': '#ffb547',
  Fixed: '#3ddc97',
  Declined: '#ff6b6b',
};

interface Props {
  issues: Issue[];
  userLat?: number;
  userLon?: number;
  centerLat: number;
  centerLon: number;
  width: number;
  height: number;
  onIssueTap?: (id: string) => void;
  highlightId?: string;
}

export default function MapSvg({ issues, userLat, userLon, centerLat, centerLon, width, height, onIssueTap, highlightId }: Props) {
  const latSpan = 0.04;
  const lonSpan = 0.08;
  const minLat = centerLat - latSpan / 2;
  const maxLat = centerLat + latSpan / 2;
  const minLon = centerLon - lonSpan / 2;
  const maxLon = centerLon + lonSpan / 2;

  function project(lat: number, lon: number): [number, number] {
    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * height;
    return [x, y];
  }

  const gridLines: React.ReactNode[] = [];
  const gridCount = 6;
  for (let i = 0; i <= gridCount; i++) {
    const t = i / gridCount;
    const x = t * width;
    const y = t * height;
    gridLines.push(
      <line key={`v${i}`} x1={x} y1={0} x2={x + 8} y2={height} stroke="#2d6578" strokeWidth="8" strokeLinecap="round" />,
      <line key={`h${i}`} x1={0} y1={y} x2={width} y2={y + 5} stroke="#2d6578" strokeWidth="6" strokeLinecap="round" />,
    );
  }

  const [ux, uy] = userLat != null && userLon != null ? project(userLat, userLon) : project(centerLat, centerLon);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <rect width={width} height={height} fill="#0e2229" />
      {gridLines}
      {issues.map((issue) => {
        const [x, y] = project(issue.lat, issue.lon);
        if (x < -20 || x > width + 20 || y < -20 || y > height + 20) return null;
        const r = 6 + issue.severity * 1.5;
        const isHighlight = issue.id === highlightId;
        return (
          <g
            key={issue.id}
            onClick={() => onIssueTap?.(issue.id)}
            style={{ cursor: onIssueTap ? 'pointer' : 'default' }}
          >
            {isHighlight && (
              <circle cx={x} cy={y} r={r + 6} fill={STATUS_COLOR[issue.status]} opacity={0.3} />
            )}
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={STATUS_COLOR[issue.status]}
              stroke="#0c1d24"
              strokeWidth={2}
            />
          </g>
        );
      })}
      {/* You are here */}
      <circle cx={ux} cy={uy} r={22} fill="rgba(61,220,151,0.18)" />
      <circle cx={ux} cy={uy} r={8} fill="#3ddc97" stroke="#ffffff" strokeWidth={3} />
    </svg>
  );
}
