# ScanCrowd Demo — Release Signing

## Keystore location

The release keystore lives **outside the repository**, at:

```
~/keys/scancrowd-demo.jks
```

It is never committed. The `.gitignore` blocks `*.jks` and `*.keystore`.

## Passwords

The keystore password and key password are stored in `~/.gradle/gradle.properties` (outside the repo):

```properties
SCANCROWD_KEYSTORE_PATH=/Users/jyriroselius/keys/scancrowd-demo.jks
SCANCROWD_KEY_ALIAS=scancrowd
SCANCROWD_STORE_PASSWORD=<password>
SCANCROWD_KEY_PASSWORD=<password>
```

Gradle reads these automatically when building. Do not hard-code passwords in `build.gradle`.

## How signing is wired

`android/app/build.gradle` defines a `signingConfigs.release` block that reads the four properties above from Gradle properties (falling back to environment variables for CI):

```groovy
signingConfigs {
    release {
        storeFile file(SCANCROWD_KEYSTORE_PATH)
        storePassword SCANCROWD_STORE_PASSWORD
        keyAlias SCANCROWD_KEY_ALIAS
        keyPassword SCANCROWD_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

## Building a release APK

```bash
cd /Users/jyriroselius/Claude/Projects/scancrowd-demo/app

# 1. Build web assets
npm run build

# 2. Sync to Android
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/35.0.0:$PATH
../node_modules/.bin/cap sync android

# 3. Build signed release APK
cd android
./gradlew assembleRelease

# APK output:
# app/build/outputs/apk/release/app-release.apk
```

## Verifying the APK

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
$ANDROID_HOME/build-tools/35.0.0/apksigner verify --verbose \
  app/android/app/build/outputs/apk/release/app-release.apk
```

Expected output: `Verified using v2 scheme (APK Signature Scheme v2): true`

## Distributing to partners

Rename and share the APK directly:
```bash
cp app/android/app/build/outputs/apk/release/app-release.apk \
   scancrowd-demo-0.1.0.apk
```

No Play Store. Partners install via `adb install` or by opening the file on their device (see `docs/install.md`).

## Keystore backup

Back up `~/keys/scancrowd-demo.jks` to a secure location (e.g. encrypted disk, 1Password attachment). If lost, the app ID (`ai.scanwai.scancrowd.demo`) cannot be reused with a new keystore on the same device without uninstalling.
