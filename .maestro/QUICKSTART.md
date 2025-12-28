# E2E Demo Generation - Quick Start

Generate a demo GIF of CrewSplit in 3 steps! 🎬

## Prerequisites

1. **Install Maestro CLI**
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. **Install ffmpeg** (for GIF conversion)
   ```bash
   # macOS
   brew install ffmpeg

   # Ubuntu/Debian
   sudo apt install ffmpeg

   # Windows
   choco install ffmpeg
   ```

3. **Optional: Install gifsicle** (for optimization)
   ```bash
   brew install gifsicle  # macOS
   sudo apt install gifsicle  # Ubuntu
   ```

## Generate Demo (3 Steps)

### Step 1: Build E2E App

```bash
npm run e2e:build:android
```

This creates an optimized APK for testing. The build will be saved locally.

### Step 2: Run Demo Flow with Recording

```bash
npm run e2e:demo
```

This runs the demo flow and records a video. The recording is saved to `~/.maestro/tests/[timestamp]/recording.mp4`.

### Step 3: Convert to GIF

#### Option A: Using the helper script (recommended)

```bash
# macOS/Linux
./.maestro/convert-to-gif.sh ~/.maestro/tests/latest/recording.mp4

# Windows
.maestro\convert-to-gif.bat %USERPROFILE%\.maestro\tests\latest\recording.mp4
```

#### Option B: Manual conversion with ffmpeg

```bash
ffmpeg -i recording.mp4 \
  -vf "fps=15,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 \
  demo.gif
```

**Done!** Your demo GIF is ready 🎉

---

## One-Liner (after initial setup)

```bash
npm run e2e:demo && ./.maestro/convert-to-gif.sh
```

---

## Tips

### Reduce GIF Size

If your GIF is >10MB (GitHub limit):

```bash
# Lower resolution (600px width)
./.maestro/convert-to-gif.sh recording.mp4 demo.gif 600

# Lower resolution (480px width)
./.maestro/convert-to-gif.sh recording.mp4 demo.gif 480

# OR trim the video first
ffmpeg -i recording.mp4 -ss 5 -t 20 trimmed.mp4
./.maestro/convert-to-gif.sh trimmed.mp4
```

### Speed Up/Slow Down

```bash
# Speed up 1.5x
ffmpeg -i recording.mp4 -filter:v "setpts=0.67*PTS" -an recording-fast.mp4
./.maestro/convert-to-gif.sh recording-fast.mp4

# Slow down 0.75x
ffmpeg -i recording.mp4 -filter:v "setpts=1.33*PTS" recording-slow.mp4
./.maestro/convert-to-gif.sh recording-slow.mp4
```

### Different Quality Levels

```bash
# High quality (larger file)
ffmpeg -i recording.mp4 -vf "fps=20,scale=1080:-1" demo-hq.gif

# Medium quality (recommended)
ffmpeg -i recording.mp4 -vf "fps=15,scale=720:-1" demo.gif

# Low quality (smaller file)
ffmpeg -i recording.mp4 -vf "fps=10,scale=480:-1" demo-small.gif
```

---

## Troubleshooting

### "maestro: command not found"

Add Maestro to your PATH:

```bash
export PATH="$PATH:$HOME/.maestro/bin"

# Add to ~/.bashrc or ~/.zshrc to make permanent
echo 'export PATH="$PATH:$HOME/.maestro/bin"' >> ~/.zshrc
```

### "App not installed"

Specify the APK path explicitly:

```bash
maestro test .maestro/demo-flow.yaml --app ./path/to/app.apk
```

### "Element not found" errors

The flow might need adjustment for your UI. Edit [.maestro/demo-flow.yaml](.maestro/demo-flow.yaml) and:
- Add `optional: true` to non-critical taps
- Increase `timeout` values
- Adjust element text/IDs to match your app

### Recording file not found

Check Maestro recordings directory:

```bash
# Find latest recording
ls -lt ~/.maestro/tests/ | head -5

# On Windows
dir %USERPROFILE%\.maestro\tests /o-d
```

---

## Next Steps

- **Customize the flow**: Edit [.maestro/demo-flow.yaml](.maestro/demo-flow.yaml)
- **Create variations**: Copy and modify for different scenarios
- **Full documentation**: See [README.md](README.md) for advanced options

---

## Quick Reference

| Task | Command |
|------|---------|
| Build E2E app | `npm run e2e:build:android` |
| Run demo flow | `npm run e2e:demo` |
| Convert to GIF | `./.maestro/convert-to-gif.sh recording.mp4` |
| Optimize GIF | `gifsicle -O3 --lossy=80 -o out.gif in.gif` |
| Test locally | `maestro test .maestro/demo-flow.yaml` |

---

**🎬 Happy Demo-ing!**
