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
  const MLMarkerRef = useRef<typeof Marker | null>(null); // stored after first import
  const markersRef = useRef<Marker[]>([]);
  const issuesRef = useRef(issues);
  const onClickRef = useRef(onClickIssue);
  const [failed, setFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const streetsReadyRef = useRef(false);

  // Keep refs current on every render — avoids stale closures without triggering effects
  issuesRef.current = issues;
  onClickRef.current = onClickIssue;

  // ── Helper: add markers from issuesRef (always current) ──────────────────
  function syncMarkers() {
    const map = mapRef.current;
    const MLMarker = MLMarkerRef.current;
    if (!map || !MLMarker) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    issuesRef.current.forEach((issue) => {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 22px; height: 22px; border-radius: 11px;
        background: ${statusColors[issue.status] ?? '#9aa7ab'};
        border: 2.5px solid #0c1d24;
        cursor: pointer;
        flex-shrink: 0;
      `;
      const marker = new MLMarker({ element: el })
        .setLngLat([issue.lon, issue.lat])
        .addTo(map);
      el.addEventListener('click', () => onClickRef.current?.(issue));
      markersRef.current.push(marker);
    });
  }

  // ── Effect 1: create the MapLibre instance ────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || failed) return;

    let map: MLMap;
    streetsReadyRef.current = false;
    setMapReady(false);

    // Timeout only covers initial style load — cleared as soon as 'load' fires
    const initTimeout = setTimeout(() => setFailed(true), 12000);

    import('maplibre-gl').then(({ Map, Marker: MLMarker }) => {
      if (!containerRef.current) return;

      MLMarkerRef.current = MLMarker; // store class for sync use in Effect 2

      map = new Map({
        container: containerRef.current,
        style: STYLE,
        center: [centerLon, centerLat],
        zoom,
      });
      mapRef.current = map;

      map.on('error', (e) => {
        // Only hard-fail on WebGL / context-loss — tile errors during pan/zoom are normal
        const msg = String(
          (e as unknown as { error?: { message?: string } }).error?.message ?? ''
        ).toLowerCase();
        if (msg.includes('webgl') || msg.includes('context lost')) {
          setFailed(true);
        }
      });

      map.on('load', () => {
        clearTimeout(initTimeout); // style loaded — disarm the failsafe
        syncMarkers();             // add pins synchronously (MLMarkerRef is set)
        setMapReady(true);         // tells Effect 2 it can call syncMarkers on future changes

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
  // Re-create only when the map centre or initial zoom changes, not on every issues update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLon, zoom, failed]);

  // ── Effect 2: re-sync markers when issues change after map is ready ───────
  useEffect(() => {
    if (!mapReady) return;
    syncMarkers();
  // syncMarkers reads issuesRef.current so issues don't need to be in deps;
  // mapReady is here so markers are added as soon as the map finishes loading
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, issues]);

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
