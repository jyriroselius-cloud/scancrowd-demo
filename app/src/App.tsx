import React, { useState, useEffect } from 'react';
import { defaultCity } from '@shared/cities';
import { generateData } from '@shared/generator';
import {
  loadReports, saveReports, loadPoints, savePoints,
  loadDemoSpeed, saveDemoSpeed, loadNickname, clearAll,
} from './lib/storage';
import type { Issue, Category, GeneratedData, CityData } from '@shared/types';
import type { DemoSpeed } from './lib/storage';

import Welcome from './screens/Welcome';
import Home from './screens/Home';
import Capture from './screens/Capture';
import ReportDetails from './screens/ReportDetails';
import Sent from './screens/Sent';
import IssueTracking from './screens/IssueTracking';
import Activity from './screens/Activity';
import Leaderboard from './screens/Leaderboard';
import Settings from './screens/Settings';

type AppScreen =
  | 'welcome' | 'home' | 'capture' | 'details'
  | 'sent' | 'tracking' | 'activity' | 'leaderboard' | 'settings';

const CITY_DATA: CityData = defaultCity();

export function App() {
  const [generated, setGenerated] = useState<GeneratedData>(() => generateData(CITY_DATA));
  const [screen, setScreen] = useState<AppScreen>('welcome');
  const [history, setHistory] = useState<AppScreen[]>([]);
  const [reports, setReports] = useState<Issue[]>([]);
  const [points, setPoints] = useState(0);
  const [speed, setSpeed] = useState<DemoSpeed>('fast');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [sentIssue, setSentIssue] = useState<Issue | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [r, p, s] = await Promise.all([loadReports(), loadPoints(), loadDemoSpeed(), loadNickname()]);
      setReports(r);
      setPoints(p);
      setSpeed(s);
      setScreen(r.length === 0 ? 'welcome' : 'home');
      setLoaded(true);
    })();
  }, []);

  const navigate = (s: AppScreen) => {
    setHistory(h => [...h, screen]);
    setScreen(s);
  };

  const back = () => {
    setHistory(h => {
      const next = [...h];
      const prev = next.pop() ?? 'home';
      setScreen(prev);
      return next;
    });
  };

  const goTab = (s: AppScreen) => {
    setHistory([]);
    setScreen(s);
  };

  const handlePhotoTaken = (photo: string, cat: Category) => {
    setPendingPhoto(photo);
    setPendingCategory(cat);
    navigate('details');
  };

  const handleSendReport = async (note: string, cat: Category) => {
    const streets = CITY_DATA.streets;
    const street = streets[Math.floor(Math.random() * streets.length)];
    const num = Math.floor(Math.random() * 80) + 1;

    const TITLE_MAP: Record<Category, string> = {
      Pothole: 'Pothole',
      'Traffic sign': 'Damaged traffic sign',
      'Road marking': 'Faded marking',
      'Street light': 'Street light out',
      Manhole: 'Raised manhole cover',
      Other: 'Road defect',
    };

    const newIssue: Issue = {
      id: `SC-USER-${Date.now()}`,
      title: note ? note.slice(0, 40) : TITLE_MAP[cat],
      category: cat,
      lat: CITY_DATA.lat + (Math.random() - 0.5) * 0.01,
      lon: CITY_DATA.lon + (Math.random() - 0.5) * 0.02,
      address: street ? `${street.name} ${num}` : CITY_DATA.name,
      status: 'New',
      reports: 1,
      severity: 3,
      priority: 50,
      firstReported: new Date().toISOString().split('T')[0],
    };

    const newReports = [...reports, newIssue];
    const newPoints = points + 10;
    setReports(newReports);
    setPoints(newPoints);
    setSentIssue(newIssue);
    await saveReports(newReports);
    await savePoints(newPoints);
    setHistory([]);
    setScreen('sent');
  };

  const handleReset = async () => {
    await clearAll();
    setReports([]);
    setPoints(0);
    setSpeed('fast');
    setGenerated(generateData(CITY_DATA));
    setHistory([]);
    setScreen('welcome');
  };

  const handleSpeedChange = async (s: DemoSpeed) => {
    setSpeed(s);
    await saveDemoSpeed(s);
  };

  if (!loaded) return null;

  switch (screen) {
    case 'welcome':
      return (
        <Welcome
          onContinue={() => { setHistory([]); setScreen('home'); }}
        />
      );

    case 'home':
      return (
        <Home
          generated={generated}
          cityData={CITY_DATA}
          userReports={reports}
          points={points}
          onCapture={() => navigate('capture')}
          onIssueSelect={(id) => { setSelectedIssueId(id); navigate('tracking'); }}
          onActivity={() => goTab('activity')}
          onLeaderboard={() => goTab('leaderboard')}
          onSettings={() => navigate('settings')}
          onReset={handleReset}
        />
      );

    case 'capture':
      return (
        <Capture
          cityData={CITY_DATA}
          onPhoto={handlePhotoTaken}
          onClose={back}
        />
      );

    case 'details':
      return (
        <ReportDetails
          photo={pendingPhoto ?? ''}
          category={pendingCategory ?? 'Other'}
          cityData={CITY_DATA}
          userLat={CITY_DATA.lat}
          userLon={CITY_DATA.lon}
          onSend={handleSendReport}
          onBack={back}
        />
      );

    case 'sent':
      return sentIssue ? (
        <Sent
          issue={sentIssue}
          speed={speed}
          onTrack={() => {
            setSelectedIssueId(sentIssue.id);
            setHistory([]);
            setScreen('tracking');
          }}
          onHome={() => goTab('home')}
        />
      ) : null;

    case 'tracking': {
      const allIssues = [...generated.issues, ...reports];
      const issue = selectedIssueId
        ? allIssues.find(i => i.id === selectedIssueId) ?? null
        : null;
      return issue ? (
        <IssueTracking
          issue={issue}
          isOwnReport={reports.some(r => r.id === issue.id)}
          onBack={back}
          onConfirm={() => {}}
        />
      ) : null;
    }

    case 'activity':
      return (
        <Activity
          reports={reports}
          generated={generated}
          onIssueSelect={(id) => { setSelectedIssueId(id); navigate('tracking'); }}
          onCapture={() => navigate('capture')}
          onHome={() => goTab('home')}
          onLeaderboard={() => goTab('leaderboard')}
        />
      );

    case 'leaderboard':
      return (
        <Leaderboard
          cityData={CITY_DATA}
          reporters={generated.reporters}
          userPoints={points}
          onHome={() => goTab('home')}
          onActivity={() => goTab('activity')}
          onCapture={() => navigate('capture')}
        />
      );

    case 'settings':
      return (
        <Settings
          speed={speed}
          onSpeedChange={handleSpeedChange}
          onClose={back}
        />
      );

    default:
      return null;
  }
}
