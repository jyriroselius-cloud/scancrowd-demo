# ScanCrowd Demo — CLAUDE.md

Repo: https://github.com/jyriroselius-cloud/scancrowd-demo  
Hakemisto: `/Users/jyriroselius/Claude/Projects/scancrowd-demo/`

## Versio

- Nykyinen: **0.2.21** (versionCode 32) — 2026-10-08
- APK: `releases/scancrowd-demo-0.2.21.apk` (6.2 MB, signed)
- Seuraava: 0.2.22 (versionCode 33)

## Console (web)

- URL: **https://scancrowd-demo.vercel.app** (salasanasuojattu, HTTP Basic Auth)
- Vercel projekti: `scancrowd-demo` (prj_AY7PY5NDLB0aErpxQUJbwkvz3PWA)
- rootDirectory: `console`, buildCommand: `npm run build`, outputDirectory: `dist`
- Salasanan vaihto: Vercel Dashboard → Projects → scancrowd-demo → Settings → Environment Variables → DEMO_PASSWORD
- Oletussalasana: tallessa Vercel env varissa (ei tässä tiedostossa)
- Deploy: automaattinen GitHub-pushista; `.vercel/project.json` gitignoressa (luo tarvittaessa)

## Rakenne

```
app/          Capacitor 6 + React+Vite+TypeScript → Android APK
console/      Static console site
shared/       Shared types + city data (npm workspace)
scripts/      City generation scripts
docs/         Demo script, install guide, release notes
releases/     Valmiit signed APK:t (scancrowd-demo-<versio>.apk)
```

## Keystore

- Tiedosto: `~/keys/scancrowd-demo.jks`
- Alias: `scancrowd`
- Store + key password: `ScDemo2026!`

## ⚠️ Build — AINA TÄSSÄ JÄRJESTYKSESSÄ

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
cd app
npm run build              # 1. PAKOLLINEN — cap sync ei buildaa
npx cap sync android       # 2. Kopioi dist/ Androidiin
cd android
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=$HOME/keys/scancrowd-demo.jks \
  -Pandroid.injected.signing.store.password=ScDemo2026! \
  -Pandroid.injected.signing.key.alias=scancrowd \
  -Pandroid.injected.signing.key.password=ScDemo2026!
```

APK: `app/android/app/build/outputs/apk/release/app-release.apk`

Kopioi releases-kansioon jokaisen version jälkeen:
```bash
cp app/android/app/build/outputs/apk/release/app-release.apk \
   releases/scancrowd-demo-<versio>.apk
```

## adb (real device)

```bash
/opt/homebrew/share/android-commandlinetools/platform-tools/adb \
  -s RZCY90GPL6H install -r <apk>
```

Device: Samsung SM-A266B, Android 16, serial `RZCY90GPL6H`

## Kriittiset tekniset yksityiskohdat

### Edge-to-edge Android safe area
- `env(safe-area-inset-bottom)` = 0 Capacitor 6 WebViewissä — **ei toimi**
- CSS `max(calc(var(--safe-bottom, 48px) + 16px), 80px)` **ei toimi** Android WebViewissä
- **Toimiva ratkaisu:** lue CSS-muuttuja JS:llä:
  ```ts
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom').trim();
  const n = parseInt(raw, 10);  // käytä fallback 48 jos NaN tai 0
  ```
  Lisää 800 ms setTimeout uudelleenluku native-injektiota varten.
- `--safe-top` ja `--safe-bottom` injektoidaan `MainActivity.java`:ssa `onWindowFocusChanged`:ssa
- `onResume()` on `final` Capacitor 6 BridgeActivityssä — älä yritä overrideta

### Pinch-to-zoom
- `user-scalable=no` viewport → tukahduttaa **kaiken** multi-touchin Android WebViewissä
- React synteettiset touch-eventit = passive → `preventDefault()` ei toimi
- **Toimiva:** Pointer Events API + `touchAction: 'none'` CSS elementillä

### LocationConfirm (Wolt-style)
- MapLibre Marker = maailmakoordinaatti → liikkuu kartan mukana → ei voi "vetää" paikkaa
- **Toimiva:** kiinteä CSS-overlay pin + `map.getCenter()` confirm-napilla

### Muuta
- Java 21 vaaditaan: `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`
- `app/android/` on `.gitignore`:ssa — `build.gradle` lisätty `git add -f`:llä
- PKG: `ai.scanwai.scancrowd.demo`

## Playwright-testit

```bash
cd app && npx playwright test tests/console-geolocation.spec.ts
```
9 testiä (Vesilahti/Hagfors/Brno + siemen-yksikkötesti)
