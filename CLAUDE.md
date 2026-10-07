# ScanCrowd Demo — CLAUDE.md

Repo: https://github.com/jyriroselius-cloud/scancrowd-demo
Hakemisto: `/Users/jyriroselius/Claude/Projects/scancrowd-demo/`

## Rakenne

```
app/          Capacitor 6 + React+Vite+TypeScript — Android APK
console/      Static console site
shared/       Shared types + city data (npm workspace)
scripts/      City generation scripts
docs/         Demo script, install guide, release notes
```

## Versio

- Nykyinen: **0.1.4** (versionCode 5)
- APK: `scancrowd-demo-0.1.4.apk` (signed, keystore `~/keys/scancrowd-demo.jks`)
- Seuraava: 0.1.5 (versionCode 6)

## Keystore

- Tiedosto: `~/keys/scancrowd-demo.jks`
- Alias: `scancrowd`
- Store password: `ScDemo2026!`
- Key password: `ScDemo2026!`

## Build (signed release APK)

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
cd app
npx cap sync android
cd android
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=$HOME/keys/scancrowd-demo.jks \
  -Pandroid.injected.signing.store.password=ScDemo2026! \
  -Pandroid.injected.signing.key.alias=scancrowd \
  -Pandroid.injected.signing.key.password=ScDemo2026!
```

APK: `app/android/app/build/outputs/apk/release/app-release.apk`

## Asennus emulaattorille

```bash
adb -s emulator-5554 install -r scancrowd-demo-0.1.4.apk
```

## Tärkeät tekniset yksityiskohdat

- **Java 21** vaaditaan (Capacitor 6): `JAVA_HOME=/opt/homebrew/opt/openjdk@21/...`
- `app/android/` on `.gitignore`:ssa — build.gradle on silti trackattuna (lisätty `git add -f`)
- `USE_EXACT_ALARM` AndroidManifestissa — auto-granted sideloaded APK:lle, ei tarvitse käyttäjän lupaa
- `SCHEDULE_EXACT_ALARM` fallback vanhemmille Android-versioille
- Ilmoitusajat: T+20/40/60/90 s (fast mode), `allowWhileIdle: true`
- Reset: stored IDs + pending + `removeAllDeliveredNotifications()` + 4 s sweep

## Testaus (CDP / adb)

- CDP: `adb forward tcp:9222 localabstract:webview_devtools_remote_<PID>`
- UIAutomator ei näe WebView-sisältöä (NAF=true) — käytä CDP:tä
- React state injektio: `__reactFiber$xxx` → `.memoizedState.next.next.queue.dispatch()`

## Muuta

- Emulattori: `emulator-5554` (Pixel 6, API 35)
- PKG: `ai.scanwai.scancrowd.demo`
- MainActivity: `ai.scanwai.scancrowd.demo/.MainActivity`
