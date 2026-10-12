import React, { useEffect, useRef, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import type { Issue, StreetPoint } from '@shared/types';
import { extractStreets } from '@shared/extractStreets';
import { FallbackMap } from './FallbackMap';

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const SOURCE = 'issues';

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
  iss.forEach(({ lon, lat }) => {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  map.fitBounds(
    [[minLon, minLat], [maxLon, maxLat]],
    { padding: 64, maxZoom: 15, duration: instant ? 0 : 500 },
  );
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

export function LiveMap({ issues, centerLat, centerLon, height = 400, zoom = 13, onClickIssue, onStreetsReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const issuesRef = useRef(issues);
  const onClickRef = useRef(onClickIssue);
  const [failed, setFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const streetsReadyRef = useRef(false);

  issuesRef.current = issues;
  onClickRef.current = onClickIssue;

  // Add source + layers. Called only from map.on('load') and map.on('style.load').
  // Never adds event handlers — those are wired once in map.on('load').
  function addSourceAndLayers(map: MLMap) {
    if (map.getSource(SOURCE)) return;

    map.addSource(SOURCE, {
      type: 'geojson',
      data: toGeoJSON(issuesRef.current),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 36,
    });

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: SOURCE,
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
      source: SOURCE,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 12,
      },
      paint: { 'text-color': '#0c1d24' },
    });

    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: SOURCE,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match', ['get', 'status'],
          'New',      '#9aa7ab',
          'Accepted', '#5aa9ff',
          'Planned',  '#ffb547',
          'In repair','#ffb547',
          'Fixed',    '#3ddc97',
          'Declined', '#ff6b6b',
          /* default */ '#9aa7ab',
        ],
        'circle-radius': 10,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#0c1d24',
      },
    });
  }

  // ── Effect 1: create / destroy the MapLibre instance ─────────────────────
  useEffect(() => {
    if (!containerRef.current || failed) return;

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
      mapRef.current = map;
      (window as unknown as Record<string, unknown>).__scanMap = map;

      map.on('error', (e) => {
        const msg = String(
          (e as unknown as { error?: { message?: string } }).error?.message ?? ''
        ).toLowerCase();
        if (msg.includes('webgl') || msg.includes('context lost')) {
          setFailed(true);
        }
      });

      map.on('load', () => {
        clearTimeout(initTimeout);
        map.resize();

        // Source and layers live here — never in syncData
        addSourceAndLayers(map);

        // Event handlers wired once; they persist even if style reloads re-add layers
        map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
        map.on('click', 'clusters', (e) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] }) as any[];
          if (!features.length) return;
          const clusterId = features[0].properties.cluster_id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (map.getSource(SOURCE) as any).getClusterExpansionZoom(clusterId, (err: unknown, z: number) => {
            if (err) return;
            map.easeTo({ center: features[0].geometry.coordinates, zoom: z });
          });
        });

        map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });
        map.on('click', 'unclustered-point', (e) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const feat = (e.features as any)?.[0];
          const issueId = feat?.properties?.id;
          const issue = issuesRef.current.find((i) => i.id === issueId);
          if (issue) onClickRef.current?.(issue);
        });

        // If the style ever reloads (setStyle / theme swap), re-add source+layers
        map.on('style.load', () => {
          addSourceAndLayers(map);
          const iss = issuesRef.current;
          updateProxy(map, iss);
          fitToIssues(map, iss, false);
        });

        const iss = issuesRef.current;
        updateProxy(map, iss);
        fitToIssues(map, iss, true);
        setMapReady(true);

        // Expose idle counter so tests can wait for a rendered frame
        map.on('idle', () => {
          const w = window as unknown as Record<string, unknown>;
          w.__scanMapIdle = ((w.__scanMapIdle as number) || 0) + 1;
        });

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
      cancelled = true;
      clearTimeout(initTimeout);
      map?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLon, zoom, failed]);

  // ── Effect 2: push updated data when filtered issues change ───────────────
  // mapReady guards execution but is NOT in deps — initial data is set by map.on('load').
  // Adding mapReady as dep would trigger a redundant setData call right after load.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const iss = issuesRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const src = map.getSource(SOURCE) as any;
    if (src) src.setData(toGeoJSON(iss));

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
