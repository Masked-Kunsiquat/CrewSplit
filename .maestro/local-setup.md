# Local Maestro Testing Setup

## One-Time Setup

### 1. Build the APK

```bash
# Generate native Android project
npx expo prebuild --platform android --clean

# Build release APK
cd android && ./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### 2. Install on Your Phone

```bash
# Install via ADB
adb install android/app/build/outputs/apk/release/app-release.apk

# Or manually:
# - Copy APK to phone
# - Open file manager on phone
# - Tap APK to install
```

---

## Running Tests Locally

Once the APK is installed:

```bash
# Make sure phone is connected via ADB
adb devices

# Run Maestro test
npm run e2e:local

# Record demo video
npm run e2e:demo
```

---

## Rebuilding After Code Changes

When you change the app code:

```bash
# Quick rebuild (if android/ folder exists)
cd android && ./gradlew assembleRelease

# Then reinstall
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

**Note:** The `-r` flag reinstalls without uninstalling first, preserving app data.

---

## Troubleshooting

### "App not found"

Make sure the APK is installed:
```bash
adb shell pm list packages | grep crewsplit
```

Should show: `package:com.crewsplit.app`

### "Device not found"

Enable USB debugging on your phone and connect via ADB:
```bash
adb devices
```

### Build errors

Clean and rebuild:
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

---

## Alternative: Use EAS Cloud

To save local build time, use EAS cloud (manual trigger only to save quota):

```bash
npm run e2e:cloud
```

This builds and tests on EAS infrastructure (uses 1 build from your quota).
