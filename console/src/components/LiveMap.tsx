import React, { useEffect, useRef, useState } from 'react';
import type { Map as MLMap, Marker } from 'maplibre-gl';
import type { Issue } from '@shared/types';
import { statusColors } from '@shared/theme';
import { FallbackMap } from './FallbackMap';

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

interface Props {
  issues: Issue[];
  centerLat: number;
  centerLon: number;
  height?: number;
  zoom?: number;
  onClickIssue?: (issue: Issue) => void;
}

export function LiveMap({ issues, centerLat, centerLon, height = 400, zoom = 13, onClickIssue }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || failed) return;
    let map: MLMap;
    import('maplibre-gl').then(({ Map, Marker: MLMarker }) => {
      map = new Map({
        container: containerRef.current!,
        style: STYLE,
        center: [centerLon, centerLat],
        zoom,
      });
      mapRef.current = map;

      map.on('error', () => setFailed(true));
      map.on('load', () => {
        issues.forEach((issue) => {
          const el = document.createElement('div');
          el.style.cssText = `
            width: 24px; height: 24px; border-radius: 12px;
            background: ${statusColors[issue.status] ?? '#9aa7ab'};
            border: 2.5px solid #0c1d24;
            cursor: pointer;
          `;
          const marker = new MLMarker({ element: el })
            .setLngLat([issue.lon, issue.lat])
            .addTo(map);
          if (onClickIssue) el.addEventListener('click', () => onClickIssue(issue));
          markersRef.current.push(marker);
        });
      });
    }).catch(() => setFailed(true));

    const timeout = setTimeout(() => setFailed(true), 8000);
    return () => {
      clearTimeout(timeout);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, [centerLat, centerLon, zoom, failed]);

  if (failed) {
    return <FallbackMap issues={issues} centerLat={centerLat} centerLon={centerLon} height={height} />;
  }

  return (
    <div style={{ position: 'relative', height, borderRadius: 14, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
