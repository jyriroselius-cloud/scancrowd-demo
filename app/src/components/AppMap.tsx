import React, { useEffect, useRef, useState } from 'react';
import type { Issue, StreetPoint } from '@shared/types';
import { extractStreets } from '@shared/extractStreets';
import MapSvg from './MapSvg';

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const STATUS_COLORS: Record<string, string> = {
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
  centerLat: number;
  centerLon: number;
  onStreetsReady?: (streets: StreetPoint[]) => void;
  onIssueTap?: (id: string) => void;
}

export default function AppMap({ issues, centerLat, centerLon, onStreetsReady, onIssueTap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const MarkerRef = useRef<typeof import('maplibre-gl').Marker | null>(null);
  const markersRef = useRef<import('maplibre-gl').Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const streetsReadyRef = useRef(false);

  // Initialize map when center changes
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    streetsReadyRef.current = false;

    const failTimeout = setTimeout(() => {
      if (!destroyed) setFailed(true);
    }, 12000);

    import('maplibre-gl').then((mlgl) => {
      if (destroyed) return;

      MarkerRef.current = mlgl.Marker;

      const map = new mlgl.Map({
        container: containerRef.current!,
        style: STYLE,
        center: [centerLon, centerLat],
        zoom: 15,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false,
      });
      mapRef.current = map;

      map.on('error', () => {
        clearTimeout(failTimeout);
        if (!destroyed) setFailed(true);
      });

      // `idle` fires when all tiles for the viewport are loaded
      map.once('idle', () => {
        clearTimeout(failTimeout);
        if (destroyed) return;

        // Extract streets from tiles (one-shot)
        if (!streetsReadyRef.current && onStreetsReady) {
          try {
            // OpenFreeMap Liberty style source name is 'openmaptiles'
            const features = map.querySourceFeatures('openmaptiles', {
              sourceLayer: 'transportation_name',
            }) as unknown as Parameters<typeof extractStreets>[0];

            const streets = extractStreets(features, centerLat, centerLon);
            if (streets.length >= 3) {
              streetsReadyRef.current = true;
              onStreetsReady(streets);
            }
          } catch {
            // tile query failed — parent keeps bundled streets
          }
        }

        if (!destroyed) setMapLoaded(true);
      });
    }).catch(() => {
      clearTimeout(failTimeout);
      if (!destroyed) setFailed(true);
    });

    return () => {
      destroyed = true;
      clearTimeout(failTimeout);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [centerLat, centerLon]); // reinit only when position changes >1km (controlled by parent)

  // Sync markers when issues change or map finishes loading
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !MarkerRef.current) return;
    const MLMarker = MarkerRef.current;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    issues.forEach((issue) => {
      const r = 5 + issue.severity * 1.5;
      const el = document.createElement('div');
      el.style.cssText = `
        width:${r * 2}px;height:${r * 2}px;
        border-radius:50%;
        background:${STATUS_COLORS[issue.status] ?? '#9aa7ab'};
        border:2px solid #0c1d24;
        cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,0.45);
      `;
      const marker = new MLMarker({ element: el, anchor: 'center' })
        .setLngLat([issue.lon, issue.lat])
        .addTo(map);
      if (onIssueTap) el.addEventListener('click', () => onIssueTap(issue.id));
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [issues, mapLoaded, onIssueTap]);

  if (failed) {
    // SVG fallback — shows grid + markers; no tiles needed
    return (
      <MapSvg
        issues={issues}
        centerLat={centerLat}
        centerLon={centerLon}
        userLat={undefined}
        userLon={undefined}
        width={window.innerWidth || 390}
        height={window.innerHeight || 760}
        onIssueTap={onIssueTap}
      />
    );
  }

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
