import React, { useState, useEffect, useRef, useCallback } from 'react';
import { defaultCity } from '@shared/cities';
import { generateData } from '@shared/generator';
import { locationSeed, haversineKm } from '@shared/locationSeed';
import {
  loadReports, saveReports, loadPoints, savePoints,
  loadDemoSpeed, saveDemoSpeed, loadNickname, clearAll,
} from './lib/storage';
import type { Issue, Category, GeneratedData, CityData, StreetPoint } from '@shared/types';
import type { DemoSpeed } from './lib/storage';

import Welcome from './screens/Welcome';
import Home from './screens/Home';
import Capture from './screens/Capture';
import LocationConfirm from './screens/LocationConfirm';
import ReportDetails from './screens/ReportDetails';
import Sent from './screens/Sent';
import IssueTracking from './screens/IssueTracking';
import Activity from './screens/Activity';
import Leaderboard from './screens/Leaderboard';
import Settings from './screens/Settings';
import MapScreen from './screens/MapScreen';
import CityPicker from './components/CityPicker';

type AppScreen =
  | 'welcome' | 'home' | 'capture' | 'location_confirm' | 'details'
  | 'sent' | 'tracking' | 'activity' | 'leaderboard' | 'settings' | 'map';

export function App() {
  const [cityData, setCityData] = useState<CityData>(defaultCity());
  const [seedOverride, setSeedOverride] = useState<number | undefined>(undefined);
  const [generated, setGenerated] = useState<GeneratedData>(() => generateData(defaultCity()));

  const [screen, setScreen] = useState<AppScreen>('welcome');
  const [history, setHistory] = useState<AppScreen[]>([]);
  const [reports, setReports] = useState<Issue[]>([]);
  const [points, setPoints] = useState(0);
  const [speed, setSpeed] = useState<DemoSpeed>('fast');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null);
  const [pendingLat, setPendingLat] = useState<number | null>(null);
  const [pendingLon, setPendingLon] = useState<number | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [sentIssue, setSentIssue] = useState<Issue | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [gpsPos, setGpsPos] = useState<{ lat: number; lon: number } | null>(null);

  const demoTimerIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  const watchIdRef = useRef<string | null>(null);
  const lastGpsRef = useRef<{ lat: number; lon: number } | null>(null);
  const seedRef = useRef<number | undefined>(undefined);
  const streetsAppliedRef = useRef(false);

  // System insets: native MainActivity injects --safe-top and --safe-bottom via onWindowFocusChanged.
  // This effect only overrides --safe-bottom when the keyboard is open.
  useEffect(() => {
    // Ensure defaults so layout works before native fires
    const el = document.documentElement;
    if (!el.style.getPropertyValue('--safe-top')) el.style.setProperty('--safe-top', '0px');
    if (!el.style.getPropertyValue('--safe-bottom')) el.style.setProperty('--safe-bottom', '0px');

    const updateKeyboard = () => {
      const vvh = window.visualViewport?.height ?? window.innerHeight;
      const keyboard = Math.max(0, Math.round(window.innerHeight - vvh));
      if (keyboard > 0) {
        el.style.setProperty('--safe-bottom', `${keyboard}px`);
      }
      // When keyboard closes, native value is restored by onWindowFocusChanged
    };
    window.visualViewport?.addEventListener('resize', updateKeyboard);
    return () => window.visualViewport?.removeEventListener('resize', updateKeyboard);
  }, []);

  // Persist / restore storage
  useEffect(() => {
    (async () => {
      try {
        const [r, p, s] = await Promise.all([loadReports(), loadPoints(), loadDemoSpeed(), loadNickname()]);
        setReports(r);
        setPoints(p);
        setSpeed(s as DemoSpeed);
        setScreen(r.length === 0 ? 'welcome' : 'home');
      } catch {
        setScreen('welcome');
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // GPS via Capacitor Geolocation
  useEffect(() => {
    (async () => {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');

        // requestPermissions handles 'prompt', 'granted', and 'denied' in one call
        const req = await Geolocation.requestPermissions();
        if (req.location === 'denied') {
          setShowCityPicker(true);
          return;
        }

        const pos = await Geolocation.getCurrentPosition({ timeout: 15000, enableHighAccuracy: false });
        const { latitude: lat, longitude: lon } = pos.coords;
        applyPosition(lat, lon);

        // Watch for moves >1 km
        const id = await Geolocation.watchPosition({ enableHighAccuracy: false }, (update) => {
          if (!update) return;
          const { latitude, longitude } = update.coords;
          if (lastGpsRef.current && haversineKm(lastGpsRef.current.lat, lastGpsRef.current.lon, latitude, longitude) > 1) {
            applyPosition(latitude, longitude);
          }
        });
        watchIdRef.current = id;
      } catch {
        // Location services off or GPS timeout → let user pick city
        setShowCityPicker(true);
      }
    })();

    return () => {
      if (watchIdRef.current) {
        import('@capacitor/geolocation').then(({ Geolocation }) => {
          Geolocation.clearWatch({ id: watchIdRef.current! });
        });
      }
    };
  }, []);

  function applyPosition(lat: number, lon: number) {
    const seed = locationSeed(lat, lon);
    const cd: CityData = { name: 'Nearby', lat, lon, streets: [] };
    lastGpsRef.current = { lat, lon };
    seedRef.current = seed;
    streetsAppliedRef.current = false;
    setSeedOverride(seed);
    setCityData(cd);
    setGpsPos({ lat, lon });
    setGenerated(generateData(cd, seed));
  }

  // Notification tap listener
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    (async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        handle = await LocalNotifications.addListener(
          'localNotificationActionPerformed',
          (event) => {
            const issueId = event.notification.extra?.issueId as string | undefined;
            if (issueId) {
              setSelectedIssueId(issueId);
              setHistory([]);
              setScreen('tracking');
            }
          },
        );
      } catch { /* browser fallback */ }
    })();
    return () => { handle?.remove(); };
  }, []);

  // Called by Home when AppMap has extracted real streets from tiles
  const handleStreetsReady = useCallback((streets: StreetPoint[]) => {
    if (streetsAppliedRef.current) return;
    streetsAppliedRef.current = true;
    const seed = seedRef.current;
    setCityData((prev) => {
      const updated: CityData = { ...prev, streets };
      setGenerated(generateData(updated, seed));
      return updated;
    });
  }, []);

  const navigate = (s: AppScreen) => {
    setHistory((h) => [...h, screen]);
    setScreen(s);
  };

  const back = () => {
    setHistory((h) => {
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
    navigate('location_confirm');
  };

  const handleSendReport = async (note: string, cat: Category) => {
    const streets = cityData.streets;
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
      lat: pendingLat ?? cityData.lat + (Math.random() - 0.5) * 0.01,
      lon: pendingLon ?? cityData.lon + (Math.random() - 0.5) * 0.02,
      address: street ? `${street.name} ${num}` : cityData.name,
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

    demoTimerIds.current.forEach(clearTimeout);
    demoTimerIds.current = [];
    const fgDelays =
      speed === 'fast' ? [20000, 40000, 60000, 90000] :
      speed === 'slow' ? [120000, 300000, 600000, 900000] : [];
    const fgStatuses: Issue['status'][] = ['Accepted', 'Planned', 'In repair', 'Fixed'];
    fgDelays.forEach((d, i) => {
      const tid = setTimeout(() => {
        setReports((prev) => prev.map((r) => r.id === newIssue.id ? { ...r, status: fgStatuses[i] } : r));
      }, d);
      demoTimerIds.current.push(tid);
    });

    setHistory([]);
    setScreen('sent');
  };

  const handleReset = async () => {
    demoTimerIds.current.forEach(clearTimeout);
    demoTimerIds.current = [];
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { loadNotifIds } = await import('./lib/storage');
      const storedIds = await loadNotifIds();
      const { notifications: pending } = await LocalNotifications.getPending();
      const pendingSet = new Set(pending.map((p) => p.id));
      const extra = storedIds.filter((id) => !pendingSet.has(id)).map((id) => ({ id }));
      const allToCancel = [...pending, ...extra];
      if (allToCancel.length > 0) await LocalNotifications.cancel({ notifications: allToCancel });
      await LocalNotifications.removeAllDeliveredNotifications();
      const sweep = setInterval(() => {
        LocalNotifications.removeAllDeliveredNotifications().catch(() => {});
      }, 250);
      setTimeout(() => clearInterval(sweep), 4000);
    } catch { /* browser fallback */ }
    await clearAll();
    setReports([]);
    setPoints(0);
    setSpeed('fast');
    setPendingPhoto(null);
    setPendingCategory(null);
    // Regenerate with same location seed (keeps real streets)
    setGenerated(generateData(cityData, seedRef.current));
    setHistory([]);
    setScreen('welcome');
  };

  const handleSpeedChange = async (s: DemoSpeed) => {
    setSpeed(s);
    await saveDemoSpeed(s);
  };

  if (!loaded) return null;

  if (showCityPicker) {
    return (
      <CityPicker
        onPick={(city) => {
          seedRef.current = undefined;
          streetsAppliedRef.current = false;
          setSeedOverride(undefined);
          setCityData(city);
          setGenerated(generateData(city));
          setShowCityPicker(false);
        }}
      />
    );
  }

  switch (screen) {
    case 'welcome':
      return <Welcome onContinue={() => { setHistory([]); setScreen('home'); }} />;

    case 'home':
      return (
        <Home
          generated={generated}
          cityData={cityData}
          userReports={reports}
          points={points}
          userLat={gpsPos?.lat}
          userLon={gpsPos?.lon}
          onCapture={() => navigate('capture')}
          onIssueSelect={(id) => { setSelectedIssueId(id); navigate('tracking'); }}
          onActivity={() => goTab('activity')}
          onLeaderboard={() => goTab('leaderboard')}
          onSettings={() => navigate('settings')}
          onMap={() => navigate('map')}
          onReset={handleReset}
          onStreetsReady={handleStreetsReady}
        />
      );

    case 'capture':
      return <Capture cityData={cityData} onPhoto={handlePhotoTaken} onClose={back} />;

    case 'location_confirm':
      return (
        <LocationConfirm
          photo={pendingPhoto ?? ''}
          category={pendingCategory ?? 'Other'}
          cityData={cityData}
          onConfirm={(lat, lon) => { setPendingLat(lat); setPendingLon(lon); setHistory((h) => [...h, 'location_confirm']); setScreen('details'); }}
          onBack={back}
        />
      );

    case 'details':
      return (
        <ReportDetails
          photo={pendingPhoto ?? ''}
          category={pendingCategory ?? 'Other'}
          cityData={cityData}
          userLat={cityData.lat}
          userLon={cityData.lon}
          onSend={handleSendReport}
          onBack={back}
        />
      );

    case 'sent':
      return sentIssue ? (
        <Sent
          issue={sentIssue}
          speed={speed}
          onTrack={() => { setSelectedIssueId(sentIssue.id); setHistory([]); setScreen('tracking'); }}
          onHome={() => goTab('home')}
        />
      ) : null;

    case 'tracking': {
      const allIssues = [...generated.issues, ...reports];
      const issue = selectedIssueId ? allIssues.find((i) => i.id === selectedIssueId) ?? null : null;
      return issue ? (
        <IssueTracking issue={issue} isOwnReport={reports.some((r) => r.id === issue.id)} onBack={back} onConfirm={() => {}} />
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
          cityData={cityData}
          reporters={generated.reporters}
          userPoints={points}
          onHome={() => goTab('home')}
          onActivity={() => goTab('activity')}
          onCapture={() => navigate('capture')}
        />
      );

    case 'settings':
      return <Settings speed={speed} onSpeedChange={handleSpeedChange} onClose={back} />;

    case 'map':
      return (
        <MapScreen
          generated={generated}
          cityData={cityData}
          userReports={reports}
          userLat={gpsPos?.lat}
          userLon={gpsPos?.lon}
          onIssueSelect={(id) => { setSelectedIssueId(id); navigate('tracking'); }}
          onBack={back}
        />
      );

    default:
      return null;
  }
}
