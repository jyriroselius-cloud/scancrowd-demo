import React, { useEffect, useRef, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import type { Issue, StreetPoint } from '@shared/types';
import { statusColors } from '@shared/theme';
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

export function LiveMap({ issues, centerLat, centerLon, height = 400, zoom = 13, onClickIssue, onStreetsReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const issuesRef = useRef(issues);
  const onClickRef = useRef(onClickIssue);
  const firstFitRef = useRef(true);
  const layersAddedRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const streetsReadyRef = useRef(false);

  issuesRef.current = issues;
  onClickRef.current = onClickIssue;

  // ── syncData: update GeoJSON source and fit viewport ─────────────────────
  function syncData() {
    const map = mapRef.current;
    if (!map) return;

    const iss = issuesRef.current;
    const geojson = toGeoJSON(iss);

    if (map.getSource(SOURCE)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map.getSource(SOURCE) as any).setData(geojson);
    } else {
      map.addSource(SOURCE, {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 36,
      });

      // Cluster circles
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

      // Cluster count labels
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

      // Individual unclustered points, color by status
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

      // Cursor + click: cluster → zoom in
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

      // Cursor + click: individual point → open issue
      map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });
      map.on('click', 'unclustered-point', (e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const feat = (e.features as any)?.[0];
        const issueId = feat?.properties?.id;
        const issue = issuesRef.current.find((i) => i.id === issueId);
        if (issue) onClickRef.current?.(issue);
      });

      layersAddedRef.current = true;
    }

    // Hidden proxy elements so Playwright can count filtered issues via data-testid="map-pin"
    {
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

    if (iss.length === 0) return;

    // Fit viewport to all markers
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    iss.forEach(({ lon, lat }) => {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

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
    layersAddedRef.current = false;
    setMapReady(false);

    const initTimeout = setTimeout(() => setFailed(true), 12000);

    import('maplibre-gl').then(({ Map }) => {
      if (!containerRef.current) return;

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
        syncData();
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
      map?.remove();
      mapRef.current = null;
      layersAddedRef.current = false;
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLon, zoom, failed]);

  // ── Effect 2: update data + re-fit when filtered issues change ────────────
  useEffect(() => {
    if (!mapReady) return;
    syncData();
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
