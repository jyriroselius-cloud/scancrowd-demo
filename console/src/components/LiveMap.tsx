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
  const [mapReady, setMapReady] = useState(false);
  const streetsReadyRef = useRef(false);

  // ── Effect 1: create / destroy the MapLibre instance ──────────────────────
  useEffect(() => {
    if (!containerRef.current || failed) return;

    let map: MLMap;
    let MLMarker: typeof Marker;
    streetsReadyRef.current = false;
    setMapReady(false);

    // Timeout only covers the initial style load. Once 'load' fires we clear it.
    const initTimeout = setTimeout(() => setFailed(true), 12000);

    import('maplibre-gl').then((gl) => {
      if (!containerRef.current) return;
      map = new gl.Map({
        container: containerRef.current,
        style: STYLE,
        center: [centerLon, centerLat],
        zoom,
      });
      MLMarker = gl.Marker;
      mapRef.current = map;

      map.on('error', (e) => {
        // Only hard-fail on WebGL / context-loss errors.
        // Tile 404s and network errors during panning/zooming are normal and
        // should NOT tear down the map.
        const msg = String(
          (e as unknown as { error?: { message?: string } }).error?.message ?? ''
        ).toLowerCase();
        if (msg.includes('webgl') || msg.includes('context lost') || msg.includes('context')) {
          setFailed(true);
        }
      });

      map.on('load', () => {
        clearTimeout(initTimeout);   // style loaded — no longer need the failsafe
        setMapReady(true);           // triggers Effect 2 to add markers

        // Query streets from the loaded tiles
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
            } catch { /* ignore query errors */ }
          }
        });
      });
    }).catch(() => {
      clearTimeout(initTimeout);
      setFailed(true);
    });

    return () => {
      clearTimeout(initTimeout);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  // Re-create the map only when the centre or initial zoom changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLon, zoom, failed]);

  // ── Effect 2: sync issue markers whenever issues or readiness changes ──────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Import is already cached at this point, so this is synchronous in practice
    import('maplibre-gl').then(({ Marker: MLMarker }) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

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
  }, [issues, mapReady, onClickIssue]);

  if (failed) {
    return (
      <FallbackMap
        issues={issues}
        centerLat={centerLat}
        centerLon={centerLon}
        height={height}
        showNote
        onClickIssue={onClickIssue}
      />
    );
  }

  return (
    <div style={{ position: 'relative', height, borderRadius: 14, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
