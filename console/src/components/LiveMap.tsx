import React, { useEffect, useRef, useState } from 'react';
import type { Map as MLMap, Marker } from 'maplibre-gl';
import type { Issue, StreetPoint } from '@shared/types';
import { statusColors } from '@shared/theme';
import { extractStreets } from '@shared/extractStreets';
import { FallbackMap } from './FallbackMap';

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

interface Props {
  issues: Issue[];
  centerLat: number;
  centerLon: number;
  height?: number;
  zoom?: number;
  onClickIssue?: (issue: Issue) => void;
  onStreetsReady?: (streets: StreetPoint[]) => void;
}

export function LiveMap({ issues, centerLat, centerLon, height = 400, zoom = 13, onClickIssue, onStreetsReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [failed, setFailed] = useState(false);
  const streetsReadyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || failed) return;
    let map: MLMap;
    streetsReadyRef.current = false;

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
        // Add issue markers on load (tiles not needed for markers)
        issues.forEach((issue) => {
          const el = document.createElement('div');
          el.style.cssText = `
            width: 22px; height: 22px; border-radius: 11px;
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

      // `idle` fires when all tiles for the initial viewport are loaded
      map.once('idle', () => {
        if (!streetsReadyRef.current && onStreetsReady) {
          try {
            const features = map.querySourceFeatures('openmaptiles', {
              sourceLayer: 'transportation_name',
            }) as unknown as Parameters<typeof extractStreets>[0];
            const streets = extractStreets(features, centerLat, centerLon);
            if (streets.length >= 3) {
              streetsReadyRef.current = true;
              onStreetsReady(streets);
            }
          } catch { /* ignore */ }
        }
      });
    }).catch(() => setFailed(true));

    const timeout = setTimeout(() => setFailed(true), 10000);
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
