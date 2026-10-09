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
  const MLMarkerRef = useRef<typeof Marker | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const issuesRef = useRef(issues);
  const onClickRef = useRef(onClickIssue);
  const firstFitRef = useRef(true); // animate only after initial fit
  const [failed, setFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const streetsReadyRef = useRef(false);

  // Always-current refs — no stale closures without triggering effects
  issuesRef.current = issues;
  onClickRef.current = onClickIssue;

  // ── syncMarkers: place all filtered issues and fit the viewport ───────────
  function syncMarkers() {
    const map = mapRef.current;
    const MLMarker = MLMarkerRef.current;
    if (!map || !MLMarker) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const iss = issuesRef.current;
    if (iss.length === 0) return;

    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;

    iss.forEach((issue) => {
      if (issue.lon < minLon) minLon = issue.lon;
      if (issue.lon > maxLon) maxLon = issue.lon;
      if (issue.lat < minLat) minLat = issue.lat;
      if (issue.lat > maxLat) maxLat = issue.lat;

      const el = document.createElement('div');
      el.setAttribute('data-testid', 'map-pin');
      el.setAttribute('title', issue.title);
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

    // Fit the viewport to the bounding box of all markers.
    // First call is instant (tiles haven't loaded yet); subsequent calls animate.
    const isFirst = firstFitRef.current;
    firstFitRef.current = false;
    map.fitBounds(
      [[minLon, minLat], [maxLon, maxLat]],
      { padding: 64, maxZoom: 15, duration: isFirst ? 0 : 500 },
    );
  }

  // ── Effect 1: create / destroy the MapLibre instance ─────────────────────
  useEffect(() => {
    if (!containerRef.current || failed) return;

    let map: MLMap;
    streetsReadyRef.current = false;
    firstFitRef.current = true;
    setMapReady(false);

    const initTimeout = setTimeout(() => setFailed(true), 12000);

    import('maplibre-gl').then(({ Map, Marker: MLMarker }) => {
      if (!containerRef.current) return;

      MLMarkerRef.current = MLMarker;

      map = new Map({
        container: containerRef.current,
        style: STYLE,
        center: [centerLon, centerLat],
        zoom,
      });
      mapRef.current = map;
      (window as unknown as Record<string, unknown>).__scanMap = map;

      map.on('error', (e) => {
        // Only hard-fail on WebGL/context-loss — tile 404s during pan/zoom are normal
        const msg = String(
          (e as unknown as { error?: { message?: string } }).error?.message ?? ''
        ).toLowerCase();
        if (msg.includes('webgl') || msg.includes('context lost')) {
          setFailed(true);
        }
      });

      map.on('load', () => {
        clearTimeout(initTimeout);
        map.resize(); // ensure canvas matches container dimensions (important for headless)
        syncMarkers(); // add all pins and fit viewport synchronously
        setMapReady(true);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLon, zoom, failed]);

  // ── Effect 2: re-sync + re-fit when filtered issues change ───────────────
  useEffect(() => {
    if (!mapReady) return;
    syncMarkers();
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
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}
