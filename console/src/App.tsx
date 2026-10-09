import React, { useState, useMemo, useRef, useCallback } from 'react';
import { generateData } from '@shared/generator';
import { findCity, defaultCity, CITIES } from '@shared/cities/index';
import { locationSeed } from '@shared/locationSeed';
import type { CityData, AppSettings } from '@shared/types';
import type { GeneratedData, Issue, StreetPoint } from '@shared/types';
import { ConsoleSidebar } from './components/ConsoleSidebar';
import { WorkQueue } from './screens/WorkQueue';
import { IssueReview } from './screens/IssueReview';
import { ConsoleMap } from './screens/ConsoleMap';
import { ConsoleLeaderboard } from './screens/ConsoleLeaderboard';
import { ConsoleContractors } from './screens/ConsoleContractors';
import { ConsoleMissions } from './screens/ConsoleMissions';
import { ConsoleAnalytics } from './screens/ConsoleAnalytics';
import { ConsoleSettings } from './screens/ConsoleSettings';

export type Screen = 'queue' | 'issue' | 'map' | 'leaderboard' | 'contractors' | 'missions' | 'analytics' | 'settings';

type GeoStatus = 'requesting' | 'ready' | 'denied' | 'error';

const DEFAULT_SETTINGS: AppSettings = {
  categoryPriorities: { Pothole: 80, 'Traffic sign': 60, 'Road marking': 50, 'Street light': 55, Manhole: 45, Other: 40 },
  fixTimeTargets: { Pothole: 7, 'Traffic sign': 14, 'Road marking': 21, 'Street light': 10, Manhole: 14, Other: 21 },
  notificationTemplates: {
    accept: 'Thanks for reporting! Your issue has been accepted and scheduled for repair.',
    decline: 'Thanks for reporting! After review this issue has been declined.',
  },
  roles: [
    { name: 'City Admin', email: 'admin@city.fi', role: 'Admin' },
    { name: 'Field Staff', email: 'staff@city.fi', role: 'Staff' },
  ],
};

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
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('ready');
  const [screen, setScreen] = useState<Screen>('queue');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

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

  function handleMerge(sourceId: string, targetId: string) {
    const src = data.issues.find((i) => i.id === sourceId);
    setData((prev) => ({
      ...prev,
      issues: prev.issues.map((i) => {
        if (i.id === targetId) return { ...i, reports: i.reports + (src?.reports ?? 1) };
        if (i.id === sourceId) return { ...i, status: 'Declined' };
        return i;
      }),
    }));
    setScreen('queue');
  }

  function handleReassign(issueId: string, fromId: string, toId: string) {
    setData((prev) => ({
      ...prev,
      contractors: prev.contractors.map((c) => {
        if (c.id === fromId) return { ...c, assignedIssueIds: c.assignedIssueIds.filter((id) => id !== issueId) };
        if (c.id === toId) return { ...c, assignedIssueIds: [...c.assignedIssueIds, issueId] };
        return c;
      }),
    }));
  }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 0 16px', marginBottom: 0 }}>
      {geoStatus === 'requesting' && (
        <span style={{ font: '500 13px Manrope', color: 'var(--text2)' }}>Locating…</span>
      )}
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
      <button
        style={{
          height: 32, padding: '0 12px', borderRadius: 8,
          background: geoStatus === 'requesting' ? 'var(--surface)' : 'var(--mint)',
          color: geoStatus === 'requesting' ? 'var(--text2)' : 'var(--mint-text)',
          border: '1px solid var(--line)', font: '700 13px Manrope', cursor: 'pointer',
          opacity: geoStatus === 'requesting' ? 0.6 : 1,
        }}
        disabled={geoStatus === 'requesting'}
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
      <main className="console-main" style={{ flex: '999 1 560px', minWidth: 0, padding: '28px 32px 40px', boxSizing: 'border-box' }}>
        {screen === 'queue' && (
          <WorkQueue data={data} cityData={cityData} onOpenIssue={openIssue} />
        )}
        {screen === 'issue' && selectedIssue && (
          <IssueReview
            issue={selectedIssue}
            cityData={cityData}
            allIssues={data.issues}
            onBack={() => setScreen('queue')}
            onUpdate={updateIssue}
            onMerge={handleMerge}
          />
        )}
        {screen === 'map' && (
          <ConsoleMap data={data} cityData={cityData} onOpenIssue={openIssue} onStreetsReady={handleStreetsReady} />
        )}
        {screen === 'leaderboard' && (
          <ConsoleLeaderboard reporters={data.reporters} />
        )}
        {screen === 'contractors' && (
          <ConsoleContractors data={data} onReassign={handleReassign} />
        )}
        {screen === 'missions' && (
          <ConsoleMissions
            data={data}
            cityData={cityData}
            onAddMission={(m) => setData((prev) => ({ ...prev, missions: [...prev.missions, m] }))}
          />
        )}
        {screen === 'analytics' && (
          <ConsoleAnalytics data={data} />
        )}
        {screen === 'settings' && (
          <ConsoleSettings
            settings={appSettings}
            onUpdate={setAppSettings}
            cityData={cityData}
            onCityUpdate={(name, lat, lon) => {
              const cd: CityData = { ...cityData, name, lat, lon };
              setCityData(cd);
              setData(generateData(cd));
            }}
          />
        )}
      </main>
    </div>
  );
}
