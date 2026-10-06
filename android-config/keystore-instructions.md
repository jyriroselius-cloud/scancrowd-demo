# Keystore Setup for Release APK

The release keystore is NOT stored in the repository. Follow these steps to create and use it.

## Create the keystore (one time)

Run this from any directory **outside** the repo:

```bash
keytool -genkey -v \
  -keystore ~/scancrowd-demo-release.jks \
  -alias scancrowd-demo \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Fill in the prompts. Save the keystore password and key password somewhere secure (e.g. 1Password).

## Configure Gradle signing

After `npx cap add android`, edit `android/app/build.gradle`:

```groovy
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH") ?: "${System.getProperty('user.home')}/scancrowd-demo-release.jks")
            storePassword System.getenv("KEYSTORE_PASS") ?: ""
            keyAlias "scancrowd-demo"
            keyPassword System.getenv("KEY_PASS") ?: ""
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Build the signed APK

```bash
cd /Users/jyriroselius/Claude/Projects/scancrowd-demo/app

# 1. Build the web assets
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Build release APK
cd android
KEYSTORE_PASS="<your-password>" KEY_PASS="<your-key-password>" \
  ./gradlew assembleRelease

# APK output:
# android/app/build/outputs/apk/release/app-release.apk
```

## Install on device

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

Or share the `.apk` file directly with partners.

## Notes

- Never commit the `.jks` file to the repository.
- The app ID is `ai.scanwai.scancrowd.demo` (set in `capacitor.config.ts`).
- Android SDK requirement: API 26 (Android 8.0) or higher.
- Java 17 is required for Gradle. Install via `brew install openjdk@17`.
- Android SDK: install via Android Studio or `sdkmanager`.
