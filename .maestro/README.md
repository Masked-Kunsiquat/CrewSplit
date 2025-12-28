# CrewSplit E2E Testing & Demo Generation

This directory contains Maestro flows for end-to-end testing and generating demo GIFs/videos of the CrewSplit app.

## Overview

- **Tool**: [Maestro](https://maestro.dev/) - Mobile UI testing framework
- **Purpose**: Automated E2E tests + Demo video/GIF generation
- **Platform Support**: Android (APK) & iOS (Simulator)

## Quick Start

### 1. Install Maestro CLI

```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows (via WSL)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

### 2. Build the App for E2E

```bash
# Build Android APK for E2E testing
eas build --profile e2e-test --platform android --local

# Build iOS for simulator (macOS only)
eas build --profile e2e-test --platform ios --local
```

This creates optimized builds in the `e2e-test` profile configured in [eas.json](../eas.json).

### 3. Run Maestro Flows Locally

#### Option A: Run against local dev build

```bash
# Start Expo dev server
npm start

# In another terminal, run Maestro flow
maestro test .maestro/demo-flow.yaml
```

#### Option B: Run against APK/App build

```bash
# Android
maestro test .maestro/demo-flow.yaml --app path/to/app.apk

# iOS (simulator)
maestro test .maestro/demo-flow.yaml --app path/to/app.app
```

### 4. Record Demo Video/GIF

Maestro automatically records screen during test execution:

```bash
# Run with video recording (default format: .mp4)
maestro test .maestro/demo-flow.yaml --format mp4

# Recording will be saved to: ~/.maestro/tests/[timestamp]/recording.mp4
```

## Available Flows

### `demo-flow.yaml`

**Purpose**: Complete feature showcase for marketing/documentation

**Duration**: ~30 seconds at 1x speed

**Showcases**:
- ✅ Quick trip creation UX
- ✅ Browsing expenses with sample data (Weekend Ski Trip)
- ✅ Settlement recommendations
- ✅ Statistics with pie charts & breakdowns
- ✅ Participant detail view
- ✅ Settlement detail modal

**Ideal for**: README demos, social media, onboarding videos

---

## Converting Video to GIF

Maestro outputs `.mp4` videos by default. To create GIFs for GitHub/documentation:

### Option 1: Using `ffmpeg` (Recommended)

```bash
# Install ffmpeg
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows (via Chocolatey)
choco install ffmpeg

# Convert MP4 to optimized GIF
ffmpeg -i recording.mp4 \
  -vf "fps=15,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 \
  demo.gif

# For smaller file size (lower quality)
ffmpeg -i recording.mp4 \
  -vf "fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 \
  demo-small.gif
```

**Parameters explained**:
- `fps=15` - Frame rate (15fps = smooth, smaller than 30fps)
- `scale=720:-1` - Width 720px, height auto-scaled
- `loop=0` - Infinite loop
- `palettegen/paletteuse` - High-quality color optimization

### Option 2: Using Online Tools

1. **Ezgif.com** - https://ezgif.com/video-to-gif
   - Upload `.mp4`
   - Adjust size, frame rate, speed
   - Download optimized GIF

2. **CloudConvert** - https://cloudconvert.com/mp4-to-gif
   - Batch conversion
   - Quality presets

### Option 3: Using Gifski (Best Quality)

```bash
# Install gifski
brew install gifski

# Convert with highest quality
gifski -o demo.gif recording.mp4 --fps 20 --quality 90 --width 720
```

---

## GIF Optimization Tips

### Target Specs for Demos

| Platform | Max Size | Recommended Resolution | FPS | Duration |
|----------|----------|----------------------|-----|----------|
| GitHub README | 10MB | 720px width | 15-20 | <30s |
| Twitter/X | 15MB | 720px width | 20 | <30s |
| Discord | 8MB | 600px width | 15 | <20s |
| Documentation | 5MB | 600px width | 10-15 | <30s |

### Reducing File Size

**1. Lower FPS**: 10-15fps instead of 20+
```bash
ffmpeg -i recording.mp4 -vf "fps=10,scale=720:-1" demo.gif
```

**2. Reduce dimensions**: 600px or 480px width
```bash
ffmpeg -i recording.mp4 -vf "fps=15,scale=600:-1" demo.gif
```

**3. Trim duration**: Cut to only essential parts
```bash
# Extract 5-25 second segment
ffmpeg -i recording.mp4 -ss 5 -t 20 -vf "fps=15,scale=720:-1" demo.gif
```

**4. Optimize with gifsicle**:
```bash
brew install gifsicle
gifsicle -O3 --lossy=80 -o demo-optimized.gif demo.gif
```

---

## Adjusting Demo Speed

If the flow is too slow/fast:

### Speed Up Video Before Converting

```bash
# 1.5x speed
ffmpeg -i recording.mp4 -filter:v "setpts=0.67*PTS" -an recording-fast.mp4

# 2x speed
ffmpeg -i recording.mp4 -filter:v "setpts=0.5*PTS" -an recording-2x.mp4

# Then convert to GIF
ffmpeg -i recording-fast.mp4 -vf "fps=15,scale=720:-1" demo.gif
```

### Slow Down Video

```bash
# 0.75x speed (slower)
ffmpeg -i recording.mp4 -filter:v "setpts=1.33*PTS" recording-slow.mp4
```

---

## Running on EAS Cloud

To run E2E tests in CI/CD with EAS:

### 1. Create EAS Workflow

Create `.eas/workflows/e2e-test.yml`:

```yaml
build:
  name: Build E2E Test APK
  steps:
    - eas/checkout
    - eas/install_dependencies
    - eas/prebuild
    - eas/build:
        profile: e2e-test
        platform: android

test:
  name: Run Maestro E2E Tests
  steps:
    - eas/checkout
    - eas/install_dependencies
    - run:
        name: Install Maestro CLI
        command: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          export PATH="$PATH:$HOME/.maestro/bin"
    - run:
        name: Run demo flow
        command: maestro test .maestro/demo-flow.yaml --app build-output.apk
```

### 2. Trigger on PR

Configure trigger in workflow file:

```yaml
on:
  pull_request:
    branches: [main]
```

---

## Customizing Flows

### Adding New Test Scenarios

Create new `.yaml` files in `.maestro/`:

```bash
.maestro/
├── demo-flow.yaml           # Main demo (30s)
├── quick-demo.yaml          # Short version (15s)
├── settlement-focus.yaml    # Only settlement features
└── multi-currency-demo.yaml # Multi-currency showcase
```

### Maestro Flow Syntax Reference

```yaml
# Launch app
- launchApp

# Tap on element (by text)
- tapOn: "Button Text"

# Tap on element (by ID)
- tapOn:
    id: "element-id"

# Input text
- inputText: "Text to type"

# Scroll
- scroll

# Wait (milliseconds)
- wait: 1000

# Assert element is visible
- assertVisible: "Expected Text"

# Navigate back
- back
```

**Full docs**: https://maestro.dev/reference/commands

---

## Troubleshooting

### "App not installed" error

```bash
# Make sure app is built and path is correct
maestro test .maestro/demo-flow.yaml --app ./path/to/app.apk
```

### "Element not found" errors

- Check element IDs/text in flow match actual UI
- Add `optional: true` for non-critical taps
- Increase `timeout` values for slow screens

### Recording not saved

```bash
# Check Maestro recordings directory
ls ~/.maestro/tests/

# Latest recording
ls -lt ~/.maestro/tests/ | head -5
```

### GIF too large

- Reduce resolution: `scale=480:-1` instead of `720:-1`
- Lower FPS: `fps=10` instead of `fps=15`
- Trim duration: Use `-ss` and `-t` flags
- Use lossy compression: `gifsicle --lossy=80`

---

## Sample Data Setup

The demo flow expects the **Weekend Ski Trip** sample to be loaded. To ensure consistent demos:

### Auto-load Sample Data on App Launch (for E2E builds)

Add to app initialization (e.g., `app/_layout.tsx`):

```typescript
// Only for E2E/demo builds
if (process.env.DETOX_ENABLED === 'true') {
  const { loadSampleTrip } = useSampleData();

  useEffect(() => {
    loadSampleTrip('weekend_ski_trip');
  }, []);
}
```

This ensures fresh sample data on every E2E run.

---

## Resources

- **Maestro Docs**: https://maestro.dev/
- **Maestro CLI Reference**: https://maestro.dev/reference/cli
- **FFmpeg Docs**: https://ffmpeg.org/documentation.html
- **Gifski**: https://gif.ski/
- **EAS Workflows**: https://docs.expo.dev/eas/workflows/

---

## Quick Reference: End-to-End Workflow

```bash
# 1. Build E2E app
eas build --profile e2e-test --platform android --local

# 2. Run Maestro flow with recording
maestro test .maestro/demo-flow.yaml --app app.apk

# 3. Convert to GIF
ffmpeg -i ~/.maestro/tests/latest/recording.mp4 \
  -vf "fps=15,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 \
  demo.gif

# 4. Optimize GIF
gifsicle -O3 --lossy=80 -o demo-optimized.gif demo.gif

# Done! 🎉
```
