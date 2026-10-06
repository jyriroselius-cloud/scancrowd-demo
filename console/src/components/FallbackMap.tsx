import React from 'react';
import type { Issue } from '@shared/types';
import { statusColors } from '@shared/theme';

interface Props {
  issues: Issue[];
  width?: number;
  height?: number;
  centerLat: number;
  centerLon: number;
  label?: string;
}

function project(lat: number, lon: number, cx: number, cy: number, w: number, h: number): [number, number] {
  const scale = 2000;
  const x = w / 2 + (lon - cx) * scale;
  const y = h / 2 - (lat - cy) * scale * 1.4;
  return [x, y];
}

export function FallbackMap({ issues, width = 420, height = 400, centerLat, centerLon, label }: Props) {
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      aria-label={label ?? 'Issues on map'}
      style={{ display: 'block', background: '#0e2229', borderRadius: 14 }}
    >
      <rect width={width} height={height} fill="#0e2229" />
      {/* stylised streets */}
      <g stroke="#1b3943" strokeWidth="12" fill="none" strokeLinecap="round">
        <path d={`M-10 ${height * 0.4} L${width + 10} ${height * 0.32}`} />
        <path d={`M-10 ${height * 0.75} L${width + 10} ${height * 0.67}`} />
        <path d={`M${width * 0.32} -10 L${width * 0.4} ${height + 10}`} />
        <path d={`M${width * 0.72} -10 L${width * 0.78} ${height + 10}`} />
      </g>
      <g stroke="#162f38" strokeWidth="5" fill="none">
        <path d={`M-10 ${height * 0.2} L${width + 10} ${height * 0.15}`} />
        <path d={`M-10 ${height * 0.57} L${width + 10} ${height * 0.52}`} />
        <path d={`M${width * 0.15} -10 L${width * 0.18} ${height + 10}`} />
        <path d={`M${width * 0.55} -10 L${width * 0.58} ${height + 10}`} />
        <path d={`M${width * 0.92} -10 L${width * 0.94} ${height + 10}`} />
      </g>
      {/* issue pins */}
      {issues.slice(0, 60).map((issue) => {
        const [x, y] = project(issue.lat, issue.lon, centerLat, centerLon, width, height);
        if (x < 0 || x > width || y < 0 || y > height) return null;
        return (
          <circle
            key={issue.id}
            cx={x}
            cy={y}
            r={8}
            fill={statusColors[issue.status] ?? '#9aa7ab'}
            stroke="#0c1d24"
            strokeWidth="2.5"
          />
        );
      })}
    </svg>
  );
}
