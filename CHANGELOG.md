# ScanCrowd Demo — Changelog

## [0.2.23] — 2026-10-09
versionCode 34

### Added
- **Console — kaikki sivut toimivat**: Contractors, Missions and rewards, Leaderboard (Week/Month/Season + best report picker), Analytics (SVG-kaaviot + KPI-kortit), Settings (kategoriaprioriteetit, korjausaika-tavoitteet, ilmoituspohjat, kaupunkiasetus, roolit)
- **Export CSV** WorkQueuessa — lataa tiedoston suoraan selaimelta
- **Merge into...** IssueReview'ssa — dropdown saman kategorian issueille, yhdistää report-laskurin
- **Mobile Map-näyttö** — Home-näytön karttanappi avaa täysruudun MapScreenin (takaisin-nappi + avointen issueiden laskuri)
- **Playwright-testit** `tests/console-all-interactions.spec.ts` — 11 testiä kattavat kaikki sidebar-kohteet, Export CSV, suodatinsiput, Accept/Decline, Merge, Contractors, Leaderboard-välilehdet, Analytics SVG-kaaviot, Settings-syötteet, Missions-lomake; 11/11 läpi
- **Kuvakaappaukset** `docs/verification/` — 9 screenshotin setti kaikista pääskuuluvista näytöistä

### Changed
- Sidebar: kaikki 7 kohdetta aktiivisia (ei enää "tulossa" -tilaa)

### Tested
- `npm --workspace console run build` — TypeScript virheetön
- `npx playwright test tests/console-all-interactions.spec.ts` — 11/11 passed (21.4s)

---

## [0.2.7] — 2026-10-08
versionCode 18

### Fixed
- **GPS käytti checkPermissions() → requestPermissions()**: `checkPermissions()` ei pyydä lupaa käyttäjältä, vain tarkistaa nykyisen tilan. `requestPermissions()` hoitaa sekä 'prompt'- että 'granted'-tilat oikein — GPS toimii nyt ensimmäisellä asennuksella.
- **15 s timeout (aiemmin 8 s)**: riittää hitaampiin GPS-signaaleihin (sisätilat, pilvisyys)
- **Virheenkäsittely**: catch-blokki näyttää CityPickerin hiljaa failaamisen sijaan
- **Build-prosessin vika**: v0.2.1–v0.2.6 APK:t sisälsivät vanhaa JS:ää koska `npm run build` puuttui `cap sync`:n edeltä — korjattu build-prosessissa

### Tested
- Real device Samsung SM-A266B (Android 16, adb RZCY90GPL6H)
- GPS-sijainti Fuengirola (Espanja) tunnistettu oikein
- MapLibre näyttää espanjankieliset kadunnimet: Avenida de las Salinas, Calle Las Deblas
- Hotel ILUNION Fuengirola näkyy kartan läheisyydessä

---

## [0.1.4] — 2026-10-07
versionCode 5

### Fixed
- **Reset race:** post-reset sweep calls `removeAllDeliveredNotifications()` every 250 ms for 4 s after cancel, preventing ghost notifications when AlarmManager BroadcastReceiver fires during the cancel window
- **Notification tap (background + closed):** `localNotificationActionPerformed` listener confirmed working; Capacitor queues the event and delivers it on first listener registration

### Tested (emulator, screen off)
| | Target | Actual | Result |
|---|---|---|---|
| Notif 1 | T+20 s | T+21.4 s | ✅ |
| Notif 2 | T+40 s | T+41.3 s | ✅ |
| Notif 3 | T+60 s | T+61.1 s | ✅ |
| Notif 4 | T+90 s | T+91.1 s | ✅ |
| Reset T+10 s | no notifs | clean | ✅ |
| Reset T+30 s | no notifs | clean | ✅ |
| Tap (background) | IssueTracking | IssueTracking | ✅ |
| Tap (closed) | IssueTracking | IssueTracking | ✅ |

---

## [0.1.3] — 2026-10-07
versionCode 4

### Added
- `USE_EXACT_ALARM` + `SCHEDULE_EXACT_ALARM` in AndroidManifest — exact AlarmManager alarms auto-granted for sideloaded APK
- `allowWhileIdle: true` on all scheduled notifications
- Welcome screen uses `checkExactNotificationSetting()` instead of display permission; "Open Settings" button calls `changeExactNotificationSetting()`
- `saveNotifIds` / `loadNotifIds` in storage.ts — stored IDs used for exact cancel
- Foreground status timers in App.tsx drive IssueTracking state updates without requiring notifications
- `localNotificationActionPerformed` listener in App.tsx — opens issue from `extra.issueId`
- App icon (adaptive) + label "ScanCrowd"

### Fixed
- Notifications arrived together (all at +71 s) → fixed with exact alarms
- Reset did not cancel already-dispatched notifications → cancel union of pending + stored IDs + `removeAllDeliveredNotifications()`

---

## [0.1.2] — 2026-10-06
versionCode 3

### Added
- Adaptive icon + foreground/background layers
- App label set to "ScanCrowd"

---

## [0.1.1] — 2026-10-05
versionCode 2

### Added
- Playwright + adb console test suite
- Blank screen bug fix (WebView initialization)

---

## [0.1.0] — 2026-10-04
versionCode 1

Initial signed demo APK. Capacitor 6, React+Vite+TypeScript, local notifications demo flow.

## [0.1.5] — 2026-10-07
versionCode 6

### Fixed
- **Edge-to-edge (Android 15+/16):** All bottom-anchored elements now use `env(safe-area-inset-bottom)` so Samsung gesture navigation bar no longer overlaps TabBar, Capture panel, IssueTracking bottom bar
- **Map visibility:** Grid line color changed from #1b3943 → #2d6578 (higher contrast on dark background)

## [0.1.6] — 2026-10-07
versionCode 7

### Fixed
- **Map fills full screen:** SVG changed from hardcoded 390×560 to `width/height: 100%` with `preserveAspectRatio="xMidYMid slice"`, and Home.tsx passes `window.innerWidth/Height` as coordinate space — fixes blank map and missing issue markers on Samsung (wider/taller screens)

## [0.1.7] — 2026-10-07
versionCode 8

### Fixed
- **Navigation bar coverage (reliable fix):** `env(safe-area-inset-bottom)` is not reliably forwarded by Capacitor 6 WebView on Android 15/16. New approach: `visualViewport` listener in App.tsx detects actual inset (`window.innerHeight - visualViewport.height`) and writes it directly to `--safe-bottom` CSS variable on mount
- **Map fills screen + all markers visible:** SVG changed to `position: absolute, top: 0, left: 0, width: 100vw, height: 100vh, preserveAspectRatio: none` — guaranteed to cover the full screen on any Samsung/Android screen size

## [0.1.8] — 2026-10-07
versionCode 9

### Fixed
- **Navigation bar gap propagates correctly:** All bottom-anchored components (TabBar, Home bottom sheet, Activity, IssueTracking, Leaderboard, Capture) changed from `env(safe-area-inset-bottom, 0px)` → `var(--safe-bottom, env(safe-area-inset-bottom, 0px))` so the visualViewport-detected inset (set by App.tsx) actually applies

## [0.1.9] — 2026-10-07
versionCode 10

### Fixed
- **Map markers always visible:** Map now centers on the demo city (Tampere) regardless of the user's real GPS location. Previously `centerLat/Lon` was set to the GPS position, so all Tampere-based issues projected off-screen when the user is in a different city. GPS is now used only for the "you are here" dot.

## [0.2.0] — 2026-10-07
versionCode 11

### Added
- **Location-driven data**: app and console centre on GPS/browser position; issues are generated from that location using a deterministic seed (lat/lon rounded to 0.01° ≈ 1 km grid)
- **Real street names from map tiles**: after the MapLibre map loads, `querySourceFeatures('openmaptiles', {sourceLayer:'transportation_name'})` extracts named roads within 1.5 km and feeds them to the generator — no extra API calls
- **`src/shared/locationSeed.ts`**: `locationSeed(lat, lon)` produces same integer for any position within the same grid cell; shared between app and console
- **`src/shared/extractStreets.ts`**: pure function parsing MapLibre feature arrays into StreetPoints; filters to residential/tertiary/secondary, excludes motorways/rail, deduplicates by name
- **App: MapLibre map** (`AppMap.tsx`) replaces SVG grid; falls back to SVG on tile failure; issue markers as coloured circles
- **App: city picker** (`CityPicker.tsx`) shown when location permission is denied
- **App: GPS watch**: moves > 1 km trigger regeneration with new location seed
- **Console: browser geolocation** on load; "Use my location" button; `?city=` and `?lat=&lon=` URL overrides still work
- **Console: city picker dropdown** when location denied
- **`ConsoleMap` uses `LiveMap`** (real tiles) instead of FallbackMap

### Tests
- 9 Playwright tests: Vesilahti / Hagfors / Brno with mocked geolocation, reload determinism, location denied fallback, tiles blocked fallback, seed function unit test — all pass

### APK
- Signed release APK `scancrowd-demo-0.2.0.apk` ready for real-phone test
