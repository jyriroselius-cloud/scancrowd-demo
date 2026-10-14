import React, { useEffect, useRef, useState } from 'react';
import type { Map as MLMap, ExpressionSpecification } from 'maplibre-gl';
import type { Issue, StreetPoint } from '@shared/types';
import { extractStreets, extractWaterPolygons } from '@shared/extractStreets';
import { FallbackMap } from './FallbackMap';

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const LAYER_IDS = ['cluster-count', 'unclustered-point', 'clusters'] as const;

// Padding object: bottom 56 px keeps fitBounds clear of the attribution bar.
const FIT_PADDING = { top: 40, bottom: 56, left: 40, right: 40 } as const;

// Versioned source id — avoids GeoJSON worker stale state on same id.
let srcVer = 0;

interface Props {
  issues: Issue[];
  centerLat: number;
  centerLon: number;
  height?: number;
  zoom?: number;
  /** Namespaces window globals: __scanMap_<key>, __scanMapSrcId_<key>, __scanMapIdle_<key>.
   *  'main' also sets legacy window.__scanMap / __scanMapSrcId / __scanMapIdle. */
  instanceKey?: string;
  onClickIssue?: (issue: Issue) => void;
  onStreetsReady?: (streets: StreetPoint[], waterPolygons: [number, number][][]) => void;
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
    padding: FIT_PADDING,
    maxZoom: 15,
    duration: instant ? 0 : 500,
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
      span.setAttribute('data-lat', String(i.lat));
      span.setAttribute('data-lon', String(i.lon));
      return span;
    }),
  );
}

function rebuildSource(map: MLMap, iss: Issue[], oldSrcId: string | null): string {
  for (const id of LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (oldSrcId && map.getSource(oldSrcId)) map.removeSource(oldSrcId);

  const sid = `issues-${++srcVer}`;
  const geojson = toGeoJSON(iss);
  console.log(`[LiveMap] addSource ${sid} with ${geojson.features.length} features`);

  map.addSource(sid, {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 40,
    // Accumulate per-status counts so cluster color reflects dominant status.
    clusterProperties: {
      cnt_new:      ['+', ['case', ['==', ['get', 'status'], 'New'],       1, 0]],
      cnt_accepted: ['+', ['case', ['==', ['get', 'status'], 'Accepted'],  1, 0]],
      cnt_planned:  ['+', ['case', ['==', ['get', 'status'], 'Planned'],   1, 0]],
      cnt_repair:   ['+', ['case', ['==', ['get', 'status'], 'In repair'], 1, 0]],
      cnt_fixed:    ['+', ['case', ['==', ['get', 'status'], 'Fixed'],     1, 0]],
      cnt_declined: ['+', ['case', ['==', ['get', 'status'], 'Declined'],  1, 0]],
    },
  });

  // Cluster circle color = color of the dominant status within the cluster.
  const dominantColor: ExpressionSpecification = [
    'let', 'mx',
    ['max',
      ['get', 'cnt_new'], ['get', 'cnt_accepted'], ['get', 'cnt_planned'],
      ['get', 'cnt_repair'], ['get', 'cnt_fixed'], ['get', 'cnt_declined'],
    ] as ExpressionSpecification,
    ['case',
      ['==', ['var', 'mx'], ['get', 'cnt_repair']],   '#ffb547',
      ['==', ['var', 'mx'], ['get', 'cnt_planned']],  '#b18cff',
      ['==', ['var', 'mx'], ['get', 'cnt_accepted']], '#5aa9ff',
      ['==', ['var', 'mx'], ['get', 'cnt_fixed']],    '#3ddc97',
      ['==', ['var', 'mx'], ['get', 'cnt_declined']], '#ff6b6b',
      '#9aa7ab',
    ] as ExpressionSpecification,
  ] as ExpressionSpecification;

  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: sid,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': dominantColor,
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
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 12,
      // Must match the glyph fontstack served by OpenFreeMap liberty style.
      // Missing text-font causes MapLibre to request "Open Sans Regular" →
      // 404 → all source tiles enter "errored" state → 0 rendered features.
      'text-font': ['Noto Sans Regular'],
    },
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
        'Planned',   '#b18cff',
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
  issues, centerLat, centerLon, height = 400, zoom = 13,
  instanceKey, onClickIssue, onStreetsReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const srcIdRef = useRef<string | null>(null);
  const issuesRef = useRef(issues);
  const onClickRef = useRef(onClickIssue);
  const mapReadyRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const streetsReadyRef = useRef(false);
  const retryRef = useRef(0);

  issuesRef.current = issues;
  onClickRef.current = onClickIssue;

  function setSrcIdGlobal(sid: string) {
    if (!instanceKey) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const W = window as any;
    W[`__scanMapSrcId_${instanceKey}`] = sid;
    if (instanceKey === 'main') W.__scanMapSrcId = sid;
  }

  // ── Effect 1: create / destroy the MapLibre instance ─────────────────────
  useEffect(() => {
    if (!containerRef.current || failed) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    srcIdRef.current = null;
    mapReadyRef.current = false;

    let map: MLMap;
    let cancelled = false;

    streetsReadyRef.current = false;
    setMapReady(false);

    // Visibility-aware timeout:
    // - No timeout at all while the tab is hidden.
    // - A fresh 12 s clock starts every time the tab becomes visible.
    // - If the tab hides again, the clock stops immediately.
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function startVisibleTimeout() {
      if (timeoutId) clearTimeout(timeoutId);
      if (!document.hidden && !cancelled && !mapReadyRef.current) {
        timeoutId = setTimeout(() => {
          // Safety net: only fail if still visible when the clock expires.
          if (!cancelled && !document.hidden) setFailed(true);
        }, 12000);
      }
    }

    // Start the clock only when already visible; no-op when hidden.
    startVisibleTimeout();

    const onVisibility = () => {
      if (document.hidden) {
        // Tab hidden → stop the clock.
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      } else {
        // Tab visible → fresh 12 s clock + resize map canvas.
        if (!mapReadyRef.current && !cancelled) {
          startVisibleTimeout();
          mapRef.current?.resize();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // ResizeObserver — keeps the map canvas in sync with its flex container.
    const ro = new ResizeObserver(() => {
      if (!cancelled && mapRef.current) mapRef.current.resize();
    });
    if (containerRef.current) ro.observe(containerRef.current);

    import('maplibre-gl').then(({ Map }) => {
      if (cancelled || !containerRef.current) return;

      map = new Map({
        container: containerRef.current,
        style: STYLE,
        center: [centerLon, centerLat],
        zoom,
        // compact: true shrinks the attribution bar so it doesn't overlap pins.
        attributionControl: { compact: true },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const W = window as any;
      if (instanceKey) {
        W[`__scanMap_${instanceKey}`] = map;
        if (instanceKey === 'main') W.__scanMap = map;
      }
      mapRef.current = map;

      map.on('error', (e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = String((e as any).error?.message ?? '').toLowerCase();
        console.error('[LiveMap] map error:', msg, e);
        if (msg.includes('webgl') || msg.includes('context lost')) {
          // WebGL failure is always fatal regardless of visibility.
          setFailed(true);
        } else if (!document.hidden) {
          // Other errors (network, style) only trigger fallback when visible.
          // Errors while hidden are silently ignored — the map will retry on visibility.
          setFailed(true);
        }
      });

      map.on('load', () => {
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        map.resize();

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

        map.on('style.load', () => {
          const iss = issuesRef.current;
          const sid = rebuildSource(map, iss, srcIdRef.current);
          srcIdRef.current = sid;
          setSrcIdGlobal(sid);
          updateProxy(map, iss);
          fitToIssues(map, iss, false);
        });

        map.on('idle', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const W2 = window as any;
          if (instanceKey) {
            W2[`__scanMapIdle_${instanceKey}`] = (W2[`__scanMapIdle_${instanceKey}`] ?? 0) + 1;
            if (instanceKey === 'main') W2.__scanMapIdle = W2[`__scanMapIdle_${instanceKey}`];
          }
        });

        const iss = issuesRef.current;
        const initSid = rebuildSource(map, iss, null);
        srcIdRef.current = initSid;
        setSrcIdGlobal(initSid);
        updateProxy(map, iss);

        // Defer fitBounds to after the first idle so the flex container has
        // its final CSS-computed size and map.resize() has been processed.
        map.once('idle', () => {
          if (cancelled) return;
          map.resize();
          fitToIssues(map, iss, true);
          mapReadyRef.current = true;
          setMapReady(true);
        });

        map.once('idle', () => {
          if (!streetsReadyRef.current && onStreetsReady) {
            try {
              const feats = map.querySourceFeatures('openmaptiles', {
                sourceLayer: 'transportation_name',
              }) as unknown as Parameters<typeof extractStreets>[0];
              const streets = extractStreets(feats, centerLat, centerLon);
              const waterFeats = map.querySourceFeatures('openmaptiles', {
                sourceLayer: 'water',
              }) as unknown as Parameters<typeof extractWaterPolygons>[0];
              const waterPolygons = extractWaterPolygons(waterFeats, centerLat, centerLon);
              if (streets.length >= 3) {
                streetsReadyRef.current = true;
                onStreetsReady(streets, waterPolygons);
              }
            } catch { /* ignore */ }
          }
        });
      });
    }).catch((err) => {
      console.error('[LiveMap] import error:', err);
      if (timeoutId) clearTimeout(timeoutId);
      setFailed(true);
    });

    return () => {
      cancelled = true;
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      if (timeoutId) clearTimeout(timeoutId);
      map?.remove();
      mapRef.current = null;
      srcIdRef.current = null;
      mapReadyRef.current = false;
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLat, centerLon, zoom, failed]);

  // ── Effect: recovery — if fallback shown and tab becomes visible, retry once ─
  useEffect(() => {
    if (!failed) return;
    if (retryRef.current >= 1) return;

    const onVisible = () => {
      if (!document.hidden) {
        document.removeEventListener('visibilitychange', onVisible);
        retryRef.current++;
        setFailed(false); // re-triggers Effect 1 with failed=false
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [failed]);

  // ── Effect 2: rebuild source+layers when filtered issues change ───────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const iss = issuesRef.current;
    const sid = rebuildSource(map, iss, srcIdRef.current);
    srcIdRef.current = sid;
    setSrcIdGlobal(sid);
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
