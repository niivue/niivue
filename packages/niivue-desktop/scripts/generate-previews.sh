#!/bin/bash
# Generate preview images for all bundled brainchop models
# Run from niivue-desktop directory after building the app

set -e

# Determine app path based on platform
if [[ "$OSTYPE" == "darwin"* ]]; then
  APP="./dist/mac-arm64/niivue-desktop.app/Contents/MacOS/niivue-desktop"
  if [[ ! -f "$APP" ]]; then
    APP="./dist/mac/niivue-desktop.app/Contents/MacOS/niivue-desktop"
  fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  APP="./dist/linux-unpacked/niivue-desktop"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
  APP="./dist/win-unpacked/niivue-desktop.exe"
else
  echo "Unsupported platform: $OSTYPE"
  exit 1
fi

# Check if app exists
if [[ ! -f "$APP" ]]; then
  echo "App not found at: $APP"
  echo "Please build the app first with: npm run build:mac (or build:linux/build:win)"
  exit 1
fi

# Models to generate previews for
MODELS=(
  tissue-seg-light
  tissue-seg-full
  brain-extract-light
  brain-extract-full
  parcellation-50
  parcellation-104
)

# Output directory
OUTPUT_DIR="./resources/brainchop-models"

echo "Generating preview images for brainchop models..."
echo "Using app: $APP"
echo ""

for model in "${MODELS[@]}"; do
  OUTPUT_PATH="$OUTPUT_DIR/$model/preview.png"
  echo "Generating preview for $model..."

  "$APP" --headless \
    --input chris_t1 \
    --model "$model" \
    --output "$OUTPUT_PATH"

  if [[ -f "$OUTPUT_PATH" ]]; then
    echo "  ✓ Created: $OUTPUT_PATH"
  else
    echo "  ✗ Failed to create: $OUTPUT_PATH"
  fi
done

echo ""
echo "Done! Preview generation complete."
