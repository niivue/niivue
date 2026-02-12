#!/bin/bash
# Wrapper script for niivue-desktop CLI commands
# Usage: ./niivue-desktop-cli.sh segment --input mni152 --model tissue-seg-light --output output.nii.gz

# Resolve symlinks to find the real script location
SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SOURCE" ]; do
  DIR="$(cd "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd "$(dirname "$SOURCE")" && pwd)"
ELECTRON="$(cd "$SCRIPT_DIR/../../node_modules/electron/dist/Electron.app/Contents/MacOS" && pwd)/Electron"

if [ ! -f "$ELECTRON" ]; then
  echo "Error: Electron binary not found at $ELECTRON" >&2
  echo "Run 'npm install' from the monorepo root first." >&2
  exit 1
fi

unset ELECTRON_RUN_AS_NODE
exec "$ELECTRON" "$SCRIPT_DIR" "$@"
