# ScanCrowd Demo — Partner Install Guide

## Requirements

- Android 8.0 (API 26) or higher
- 50 MB free storage
- Location services enabled

## Install the APK

1. On the Android device, open **Settings → Security** (or **Biometrics and security**).
2. Enable **Install unknown apps** for your file manager or browser.
3. Open the `.apk` file received from EcoGreen360. Tap **Install**.
4. Open **ScanCrowd Demo** from the app drawer.

## First launch

The app requests three permissions:

| Permission | Why |
|---|---|
| Location | Shows your position on the map and geotags reports |
| Camera | Takes photos of road defects |
| Notifications | Sends demo status updates as the city responds |

Grant all three for the full demo experience. If you decline notifications, demo progression still works — you just won't see the push notifications.

## Running the demo

See `docs/demo-script.md` for the recommended 5-step flow.

## Resetting demo data

Long-press the **ScanCrowd** logo in the top bar for 2 seconds. A confirmation banner appears — hold for 1 more second to wipe all reports and return to the welcome screen.

## Troubleshooting

| Issue | Fix |
|---|---|
| Map tiles don't load | The app uses offline SVG fallback — this is expected without internet |
| Camera does not open | Check camera permission in Settings → Apps → ScanCrowd |
| Location shows city center | GPS may not have a fix indoors; walk outside briefly |

## Privacy

- No data leaves the device.
- Photos are stored only in app storage and deleted on reset.
- No analytics, crash reporters or third-party trackers are included.
