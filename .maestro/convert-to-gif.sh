#!/bin/bash
# Convert Maestro recording to optimized GIF
# Usage: ./convert-to-gif.sh <input.mp4> [output.gif] [width]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}⚠️  ffmpeg not found. Please install it:${NC}"
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt install ffmpeg"
    echo "  Windows: choco install ffmpeg"
    exit 1
fi

# Parse arguments
INPUT="${1}"
OUTPUT="${2:-demo.gif}"
WIDTH="${3:-720}"

if [ -z "$INPUT" ]; then
    echo -e "${YELLOW}Usage: $0 <input.mp4> [output.gif] [width]${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 recording.mp4"
    echo "  $0 recording.mp4 my-demo.gif"
    echo "  $0 recording.mp4 my-demo.gif 600"
    exit 1
fi

if [ ! -f "$INPUT" ]; then
    echo -e "${YELLOW}❌ Input file not found: $INPUT${NC}"

    # Try to find latest Maestro recording
    LATEST_RECORDING=$(find ~/.maestro/tests -name "recording.mp4" -type f -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)

    if [ -n "$LATEST_RECORDING" ]; then
        echo -e "${BLUE}💡 Found latest Maestro recording:${NC}"
        echo "  $LATEST_RECORDING"
        echo ""
        read -p "Use this file? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            INPUT="$LATEST_RECORDING"
        else
            exit 1
        fi
    else
        exit 1
    fi
fi

echo -e "${BLUE}🎬 Converting video to GIF...${NC}"
echo "  Input:  $INPUT"
echo "  Output: $OUTPUT"
echo "  Width:  ${WIDTH}px"
echo ""

# Convert with high-quality palette
ffmpeg -i "$INPUT" \
  -vf "fps=15,scale=${WIDTH}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  -loop 0 \
  "$OUTPUT" \
  -y

# Check if gifsicle is available for optimization
if command -v gifsicle &> /dev/null; then
    echo -e "${BLUE}🔧 Optimizing GIF with gifsicle...${NC}"
    TEMP_GIF="${OUTPUT}.tmp"
    mv "$OUTPUT" "$TEMP_GIF"
    gifsicle -O3 --lossy=80 -o "$OUTPUT" "$TEMP_GIF"
    rm "$TEMP_GIF"
fi

# Get file size
SIZE=$(du -h "$OUTPUT" | cut -f1)

echo ""
echo -e "${GREEN}✅ GIF created successfully!${NC}"
echo "  File: $OUTPUT"
echo "  Size: $SIZE"
echo ""

# Check if size is too large
SIZE_BYTES=$(stat -f%z "$OUTPUT" 2>/dev/null || stat -c%s "$OUTPUT" 2>/dev/null)
SIZE_MB=$((SIZE_BYTES / 1024 / 1024))

if [ $SIZE_MB -gt 10 ]; then
    echo -e "${YELLOW}⚠️  Warning: GIF is ${SIZE_MB}MB (GitHub limit is 10MB)${NC}"
    echo ""
    echo "To reduce size, try:"
    echo "  • Lower width:  $0 $INPUT $OUTPUT 600"
    echo "  • Lower width:  $0 $INPUT $OUTPUT 480"
    echo "  • Trim video:   ffmpeg -i $INPUT -ss 5 -t 20 trimmed.mp4"
fi

echo -e "${BLUE}🎉 Done!${NC}"
