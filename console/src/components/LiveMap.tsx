import React, { useEffect, useRef, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import type { Issue, StreetPoint } from '@shared/types';
import { extractStreets } from '@shared/extractStreets';
import { FallbackMap } from './FallbackMap';

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
// Fixed layer ids — always the same, reused across rebuilds.
const LAYER_IDS = ['cluster-count', 'unclustered-point', 'clusters'] as const;

// Module-level counter: each rebuildSource call gets a new source id
// ('issues-1', 'issues-2', …) so the GeoJSON worker never reuses
// a stale id whose loadData call was left pending.
let srcVer = 0;

interface Props {
  issues: Issue[];
  centerLat: number;
  centerLon: number;
  height?: number;
  zoom?: number;
  onClickIssue?: (issue: Issue) => void;
  onStreetsReady?: (streets: StreetPoint[]) => void;
}

function toGeoJSON(issues: Issue[]) {
  return {
    type: 'FeatureCollection' as const,
    features: issues.map((i) => ({
      type: 'Feature' as const,
      properties: { id: i.id, status: i.status, title: i.title },
      geometry: { type: 'Point' as const, coordinates: [i.lon, i.lat] },
    })),
  };
}

function fitToIssues(map: MLMap, iss: Issue[], instant: boolean) {
  if (iss.length === 0) return;
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const { lon, lat } of iss) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  map.fitBounds([[minLon, minLat], [maxLon, maxLat]], {
    padding: 64, maxZoom: 15, duration: instant ? 0 : 500,
  });
}

function updateProxy(map: MLMap, iss: Issue[]) {
  const container = map.getContainer();
  let proxy = container.querySelector<HTMLDivElement>('[data-pin-proxy]');
  if (!proxy) {
    proxy = document.createElement('div');
    proxy.setAttribute('data-pin-proxy', '');
    proxy.setAttribute('aria-hidden', 'true');
    proxy.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
    container.appendChild(proxy);
  }
  proxy.replaceChildren(
    ...iss.map((i) => {
      const span = document.createElement('span');
      span.setAttribute('data-testid', 'map-pin');
      span.setAttribute('data-id', String(i.id));
      return span;
    }),
  );
}

// Remove old layers + source (if any), then add a fresh source under a new
// versioned id and re-add the layers pointing at it.
// Returns the new source id so callers can store it.
function rebuildSource(map: MLMap, iss: Issue[], oldSrcId: string | null): string {
  // Remove layers before the source they depend on
  for (const id of LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (oldSrcId && map.getSource(oldSrcId)) map.removeSource(oldSrcId);

  // New id — avoids the GeoJSON worker's stale state for the previous id
  const sid = `issues-${++srcVer}`;

  // Always pass a valid FeatureCollection
  const geojson = toGeoJSON(iss);
  console.log(`[LiveMap] addSource ${sid} with ${geojson.features.length} features`);

  map.addSource(sid, {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 36,
  });

  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: sid,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#5aa9ff',
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 30, 30],
      'circle-stroke-width': 2.5,
      'circle-stroke-color': '#0c1d24',
      'circle-opacity': 0.92,
    },
  });
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: sid,
    filter: ['has', 'point_count'],
    layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
    paint: { 'text-color': '#0c1d24' },
  });
  map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: sid,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match', ['get', 'status'],
        'New',       '#9aa7ab',
        'Accepted',  '#5aa9ff',
        'Planned',   '#ffb547',
        'In repair', '#ffb547',
        'Fixed',     '#3ddc97',
        'Declined',  '#ff6b6b',
        '#9aa7ab',
      ],
      'circle-radius': 10,
      'circle-stroke-width': 2.5,
      'circle-stroke-color': '#0c1d24',
    },
  });

  return sid;
}

export function LiveMap({
  issues, centerLat, centerLon, height = 400, zoom = 13, onClickIssue, onStreetsReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const srcIdRef = useRef<string | null>(null);   // current versioned source id
  const issuesRef = useRef(issues);
  const onClickRef = useRef(onClickIssue);
  const [failed, setFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const streetsReadyRef = useRef(false);

  issuesRef.current = issues;
  onClickRef.current = onClickIssue;

  // ── Effect 1: create / destroy the MapLibre instance ─────────────────────
  useEffect(() => {
    if (!containerRef.current || failed) return;

    // Ensure only one map instance exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    srcIdRef.current = null;

    let map: MLMap;
    let cancelled = false;

    streetsReadyRef.current = false;
    setMapReady(false);

    const initTimeout = setTimeout(() => setFailed(true), 12000);

    import('maplibre-gl').then(({ Map }) => {
      if (cancelled || !containerRef.current) return;

      map = new Map({
        container: containerRef.current,
        style: STYLE,
        center: [centerLon, centerLat],
        zoom,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__scanMap = map;
      mapRef.current = map;

      map.on('error', (e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = String((e as any).error?.message ?? '').toLowerCase();
        console.error('[LiveMap] map error:', msg, e);
        if (msg.includes('webgl') || msg.includes('context lost')) setFailed(true);
      });

      map.on('load', () => {
        clearTimeout(initTimeout);
        map.resize();

        // Wire interaction handlers once. They survive layer removal because
        // MapLibre stores them on the map object keyed by layer id.
        map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
        map.on('click', 'clusters', (e) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const feats = map.queryRenderedFeatures(e.point, { layers: ['clusters'] }) as any[];
          if (!feats.length) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (map.getSource(srcIdRef.current!) as any)?.getClusterExpansionZoom(
            feats[0].properties.cluster_id,
            (err: unknown, z: number) => {
              if (!err) map.easeTo({ center: feats[0].geometry.coordinates, zoom: z });
            },
          );
        });
        map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });
        map.on('click', 'unclustered-point', (e) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const issueId = (e.features as any)?.[0]?.properties?.id;
          const issue = issuesRef.current.find((i) => i.id === issueId);
          if (issue) onClickRef.current?.(issue);
        });

        // If style ever reloads (setStyle / theme swap), rebuild with next version
        map.on('style.load', () => {
          const iss = issuesRef.current;
          srcIdRef.current = rebuildSource(map, iss, srcIdRef.current);
          updateProxy(map, iss);
          fitToIssues(map, iss, false);
        });

        // Idle counter for test polling
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('idle', () => { (window as any).__scanMapIdle = ((window as any).__scanMapIdle ?? 0) + 1; });

        // Initial source + layers under a fresh versioned id
        const iss = issuesRef.current;
        srcIdRef.current = rebuildSource(map, iss, null);
        updateProxy(map, iss);
        fitToIssues(map, iss, true);
        setMapReady(true);

        map.once('idle', () => {
          if (!streetsReadyRef.current && onStreetsReady) {
            try {
              const feats = map.querySourceFeatures('openmaptiles', {
                sourceLayer: 'transportation_name',
              }) as unknown as Parameters<typeof extractStreets>[0];
              const streets = extractStreets(feats, centerLat, centerLon);
              if (streets.length >= 3) {
                streetsReadyRef.current = true;
                onStreetsReady(streets);
              }
            } catch { /* ignore */ }
          }
        });
      });
    }).catch((err) => {
      console.error('[LiveMap] import error:', err);
      clearTimeout(initTimeout);
      setFailed(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(initTimeout);
      map?.remove();
      mapRef.current = null;
      srcIdRef.current = null;
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLon, zoom, failed]);

  // ── Effect 2: rebuild source+layers when filtered issues change ───────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const iss = issuesRef.current;
    srcIdRef.current = rebuildSource(map, iss, srcIdRef.current);
    updateProxy(map, iss);
    fitToIssues(map, iss, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues]);

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
