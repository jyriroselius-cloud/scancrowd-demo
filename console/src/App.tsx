import React, { useState, useMemo, useEffect } from 'react';
import { generateData } from '@shared/generator';
import { findCity, defaultCity } from '@shared/cities/index';
import type { CityData } from '@shared/types';
import type { GeneratedData, Issue } from '@shared/types';
import { ConsoleSidebar } from './components/ConsoleSidebar';
import { WorkQueue } from './screens/WorkQueue';
import { IssueReview } from './screens/IssueReview';
import { ConsoleMap } from './screens/ConsoleMap';
import { ConsoleLeaderboard } from './screens/ConsoleLeaderboard';

export type Screen = 'queue' | 'issue' | 'map' | 'leaderboard';

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
  return { cityName: p.get('city') ?? 'Tampere', seed };
}

export function App() {
  const params = useMemo(parseParams, []);

  const cityData: CityData = useMemo(() => {
    if (params.lat !== undefined && params.lon !== undefined) {
      return { name: params.customName!, lat: params.lat!, lon: params.lon!, streets: [] };
    }
    return findCity(params.cityName) ?? defaultCity();
  }, [params]);

  const [data, setData] = useState<GeneratedData>(() => generateData(cityData, params.seed));

  const [screen, setScreen] = useState<Screen>('queue');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // allow reset of in-memory changes
  function resetData() {
    setData(generateData(cityData, params.seed));
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

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', minHeight: '100vh', background: 'var(--bg)' }}>
      <ConsoleSidebar
        cityName={cityData.name}
        screen={screen}
        setScreen={setScreen}
        queueCount={data.issues.filter((i) => i.status === 'New' || i.status === 'Accepted').length}
        onReset={resetData}
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
          <ConsoleMap data={data} cityData={cityData} onOpenIssue={openIssue} />
        )}
        {screen === 'leaderboard' && (
          <ConsoleLeaderboard reporters={data.reporters} />
        )}
      </main>
    </div>
  );
}
