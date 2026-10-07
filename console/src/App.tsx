import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { generateData } from '@shared/generator';
import { findCity, defaultCity, CITIES } from '@shared/cities/index';
import { locationSeed } from '@shared/locationSeed';
import type { CityData } from '@shared/types';
import type { GeneratedData, Issue, StreetPoint } from '@shared/types';
import { ConsoleSidebar } from './components/ConsoleSidebar';
import { WorkQueue } from './screens/WorkQueue';
import { IssueReview } from './screens/IssueReview';
import { ConsoleMap } from './screens/ConsoleMap';
import { ConsoleLeaderboard } from './screens/ConsoleLeaderboard';

export type Screen = 'queue' | 'issue' | 'map' | 'leaderboard';

type GeoStatus = 'requesting' | 'ready' | 'denied' | 'error';

function parseParams(): { cityName: string; lat?: number; lon?: number; customName?: string; seed?: number } {
  const p = new URLSearchParams(window.location.search);
  const seed = p.has('seed') ? parseInt(p.get('seed')!, 10) : undefined;
  if (p.has('lat') && p.has('lon')) {
    return {
      cityName: p.get('name') ?? 'Custom',
      lat: parseFloat(p.get('lat')!),
      lon: parseFloat(p.get('lon')!),
      customName: p.get('name') ?? 'Custom',
      seed,
    };
  }
  return { cityName: p.get('city') ?? '', seed };
}

export function App() {
  const params = useMemo(parseParams, []);
  const seedRef = useRef<number | undefined>(params.seed);
  const streetsAppliedRef = useRef(false);

  // If URL has explicit lat/lon or ?city=, skip geolocation
  const hasUrlOverride = params.lat !== undefined || params.cityName !== '';

  const initialCity: CityData = useMemo(() => {
    if (params.lat !== undefined && params.lon !== undefined) {
      return { name: params.customName!, lat: params.lat!, lon: params.lon!, streets: [] };
    }
    if (params.cityName) return findCity(params.cityName) ?? defaultCity();
    return defaultCity();
  }, [params]);

  const [cityData, setCityData] = useState<CityData>(initialCity);
  const [data, setData] = useState<GeneratedData>(() => generateData(initialCity, params.seed));
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(hasUrlOverride ? 'ready' : 'requesting');

  const [screen, setScreen] = useState<Screen>('queue');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Browser geolocation on load (skip if URL override present)
  useEffect(() => {
    if (hasUrlOverride || !('geolocation' in navigator)) {
      if (!hasUrlOverride) setGeoStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        applyPosition(lat, lon);
        setGeoStatus('ready');
      },
      () => setGeoStatus('denied'),
      { timeout: 8000, enableHighAccuracy: false },
    );
  }, []);

  function applyPosition(lat: number, lon: number, name = 'Nearby') {
    const seed = locationSeed(lat, lon);
    seedRef.current = seed;
    streetsAppliedRef.current = false;
    const cd: CityData = { name, lat, lon, streets: [] };
    setCityData(cd);
    setData(generateData(cd, seed));
    setSelectedIssue(null);
    setScreen('queue');
  }

  const handleStreetsReady = useCallback((streets: StreetPoint[]) => {
    if (streetsAppliedRef.current) return;
    streetsAppliedRef.current = true;
    const seed = seedRef.current;
    setCityData((prev) => {
      const updated: CityData = { ...prev, streets };
      setData(generateData(updated, seed));
      return updated;
    });
  }, []);

  function resetData() {
    streetsAppliedRef.current = false;
    setData(generateData(cityData, seedRef.current ?? params.seed));
    setScreen('queue');
    setSelectedIssue(null);
  }

  function openIssue(issue: Issue) {
    setSelectedIssue(issue);
    setScreen('issue');
  }

  function updateIssue(updated: Issue) {
    setData((prev) => ({
      ...prev,
      issues: prev.issues.map((i) => (i.id === updated.id ? updated : i)),
    }));
    setSelectedIssue(updated);
  }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 0 16px', marginBottom: 0 }}>
      {geoStatus === 'denied' && (
        <select
          style={{
            height: 32, borderRadius: 8, border: '1px solid var(--line)',
            background: 'var(--surface)', color: 'var(--text)',
            font: '600 13px Manrope, sans-serif', padding: '0 10px',
          }}
          defaultValue=""
          onChange={(e) => {
            const city = CITIES.find((c) => c.name === e.target.value);
            if (city) {
              seedRef.current = undefined;
              streetsAppliedRef.current = false;
              setCityData(city);
              setData(generateData(city));
              setSelectedIssue(null);
              setScreen('queue');
            }
          }}
        >
          <option value="" disabled>Pick a city…</option>
          {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      )}
      {geoStatus === 'requesting' && (
        <span style={{ font: '500 13px Manrope', color: 'var(--text2)' }}>Locating…</span>
      )}
      {(geoStatus === 'error' || geoStatus === 'denied') && (
        <button
          style={{
            height: 32, padding: '0 12px', borderRadius: 8,
            background: 'var(--mint)', color: 'var(--mint-text)',
            border: 'none', font: '700 13px Manrope', cursor: 'pointer',
          }}
          onClick={() => {
            if (!('geolocation' in navigator)) return;
            setGeoStatus('requesting');
            navigator.geolocation.getCurrentPosition(
              (pos) => { applyPosition(pos.coords.latitude, pos.coords.longitude); setGeoStatus('ready'); },
              () => setGeoStatus('denied'),
              { timeout: 8000 },
            );
          }}
        >
          Use my location
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', minHeight: '100vh', background: 'var(--bg)' }}>
      <ConsoleSidebar
        cityName={cityData.name}
        screen={screen}
        setScreen={setScreen}
        queueCount={data.issues.filter((i) => i.status === 'New' || i.status === 'Accepted').length}
        onReset={resetData}
        headerSlot={header}
      />
      <main style={{ flex: '999 1 560px', minWidth: 0, padding: '28px 32px 40px', boxSizing: 'border-box' }}>
        {screen === 'queue' && (
          <WorkQueue data={data} cityData={cityData} onOpenIssue={openIssue} />
        )}
        {screen === 'issue' && selectedIssue && (
          <IssueReview
            issue={selectedIssue}
            cityData={cityData}
            onBack={() => setScreen('queue')}
            onUpdate={updateIssue}
          />
        )}
        {screen === 'map' && (
          <ConsoleMap data={data} cityData={cityData} onOpenIssue={openIssue} onStreetsReady={handleStreetsReady} />
        )}
        {screen === 'leaderboard' && (
          <ConsoleLeaderboard reporters={data.reporters} />
        )}
      </main>
    </div>
  );
}
