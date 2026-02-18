# NiiVue Desktop CLI

Command-line interface for headless brain segmentation, DICOM conversion, and image processing. All processing runs client-side via Electron — no data leaves the machine.

---

## Setup

### Prerequisites

From the monorepo root:

```bash
npm install
npm run setup:desktop
```

This downloads niimath, dcm2niix, and brainchop models. Alternatively, `npm run dev:desktop` runs setup automatically before starting the dev server.

### Install the CLI

The CLI runs through a wrapper script that launches Electron in dev mode:

```bash
# Make the wrapper executable (one-time)
chmod +x packages/niivue-desktop/niivue-desktop-cli.sh

# Option A: Use the wrapper directly
./packages/niivue-desktop/niivue-desktop-cli.sh segment --help

# Option B: Symlink it into your PATH
mkdir -p ~/bin
ln -sf "$(pwd)/packages/niivue-desktop/niivue-desktop-cli.sh" ~/bin/niivue-desktop
export PATH=$HOME/bin:$PATH
niivue-desktop segment --help
```

> **Note:** If `ELECTRON_RUN_AS_NODE` is set in your environment (e.g. by vitest), it must be unset before running Electron. The wrapper script handles this automatically.

---

## Quick Reference

### Subcommands

```
niivue-desktop view        Load and render a volume (screenshot or pass-through)
niivue-desktop segment     Run brain segmentation model
niivue-desktop extract     Extract subvolume using label mask
niivue-desktop dcm2niix    Convert DICOM to NIfTI (list | convert)
niivue-desktop niimath     Apply niimath operations
```

### Common Flags

```
--input, -i     Input file, URL, standard name (mni152, chris_t1), or "-" for stdin
--output, -o    Output file or "-" for stdout
--help, -h      Show help
```

### Available Models

| Model ID | Type | Time | Memory |
|---|---|---|---|
| `tissue-seg-light` | Tissue Segmentation | ~3s | 400 MB |
| `tissue-seg-full` | Tissue Segmentation | ~8s | 1200 MB |
| `brain-extract-light` | Brain Extraction | ~3s | 400 MB |
| `brain-extract-full` | Brain Extraction | ~6s | 800 MB |
| `parcellation-50` | Parcellation (50 regions) | ~15s | 1800 MB |
| `parcellation-104` | Parcellation (104 regions) | ~20s | 2000 MB |

### Bundled Standard Images

| Name | Description |
|---|---|
| `mni152` | MNI152 T1 template (skull-stripped) |
| `chris_t1` | T1-weighted scan (with skull) |

---

## Examples

All examples below assume `niivue-desktop` is on your PATH (see [Setup](#install-the-cli)). Replace with the full wrapper path if not.

### Brain Segmentation

**Show help:**

```bash
niivue-desktop segment --help
niivue-desktop extract --help
```

**Tissue segmentation on a bundled image:**

```bash
niivue-desktop segment \
  --input mni152 \
  --model tissue-seg-light \
  --output ~/Desktop/tissue_seg.nii.gz
```

**Segmentation on a remote URL:**

```bash
niivue-desktop segment \
  --input https://niivue.github.io/niivue-demo-images/chris_t1.nii.gz \
  --model brain-extract-light \
  --output ~/Desktop/brain_mask.nii.gz
```

**Pipe segment → extract (hippocampus + thalamus):**

```bash
niivue-desktop segment \
  --input mni152 \
  --model parcellation-50 \
  --output - | \
niivue-desktop extract \
  --input mni152 \
  --labels - \
  --values 10,5 \
  --output ~/Desktop/hippo_thal.nii.gz
```

**Binarize a hippocampus mask:**

```bash
niivue-desktop segment \
  --input mni152 \
  --model parcellation-50 \
  --output - | \
niivue-desktop extract \
  --input mni152 \
  --labels - \
  --values 10 \
  --binarize \
  --output ~/Desktop/hippo_mask.nii.gz
```

### DICOM to NIfTI

**List DICOM series:**

```bash
niivue-desktop dcm2niix list \
  --input /path/to/dicom/directory
```

**Convert all series:**

```bash
mkdir -p ~/Desktop/converted
niivue-desktop dcm2niix convert \
  --input /path/to/dicom/directory \
  --series all \
  --output ~/Desktop/converted/
```

**Pipe DICOM → segment:**

```bash
niivue-desktop dcm2niix convert \
  --input /path/to/dicom/directory \
  --series all \
  --output - | \
niivue-desktop segment \
  --input - \
  --model brain-extract-light \
  --output ~/Desktop/brain_mask.nii.gz
```

### niimath Post-processing

**Gaussian smoothing:**

```bash
niivue-desktop niimath \
  --input mni152 \
  --ops "-s 2" \
  --output ~/Desktop/smooth_brain.nii.gz
```

**Threshold + binarize:**

```bash
niivue-desktop niimath \
  --input mni152 \
  --ops "-thr 100 -bin" \
  --output ~/Desktop/intensity_mask.nii.gz
```

**Segment → niimath pipeline:**

```bash
niivue-desktop segment \
  --input mni152 \
  --model tissue-seg-light \
  --output - | \
niivue-desktop niimath \
  --input - \
  --ops "-s 1 -thr 0.5 -bin" \
  --output ~/Desktop/smooth_tissue_mask.nii.gz
```

**Triple pipe — segment → extract → smooth:**

```bash
niivue-desktop segment \
  --input mni152 \
  --model parcellation-50 \
  --output - | \
niivue-desktop extract \
  --input mni152 \
  --labels - \
  --values 10 \
  --output - | \
niivue-desktop niimath \
  --input - \
  --ops "-s 2" \
  --output ~/Desktop/smooth_hippocampus.nii.gz
```

---

## Flag Reference

### segment

```
--model, -m     Model name (see Available Models table)
```

### extract

```
--labels, -l        Label/mask volume or "-" for stdin
--values, -v        Comma-separated label values (e.g. "10,5")
--range, -r         Label range (e.g. "10-20")
--label-json, -j    Path to labels.json for named lookup
--label-names, -n   Comma-separated label names (requires --label-json)
--invert            Invert selection
--binarize          Output as binary mask (0/1)
```

### dcm2niix

```
niivue-desktop dcm2niix list    --input <dicom-dir>
niivue-desktop dcm2niix convert --input <dicom-dir> --series <n|all> --output <dir|->
--compress, -z    Gzip compression (y/n, default: y)
--bids, -b        BIDS sidecar JSON (y/n, default: y)
```

### niimath

```
--ops    Operations string (e.g. "-s 2 -thr 100 -bin")
```

Common niimath operations:

```
-s <sigma>      Gaussian smoothing (mm)
-thr <value>    Threshold below value (set to 0)
-bin            Binarize (non-zero -> 1)
-add <value>    Add value to all voxels
-mul <value>    Multiply all voxels by value
```

### Piping

Use `-` for stdin/stdout to chain commands with Unix pipes. Data is transferred as base64-encoded gzipped NIfTI.

```bash
# segment → extract → niimath in one pipeline
niivue-desktop segment --input mni152 --model parcellation-50 --output - | \
niivue-desktop extract --input mni152 --labels - --values 10 --output - | \
niivue-desktop niimath --input - --ops "-s 2" --output result.nii.gz
```

---

## Running Tests

```bash
# CLI tests (39 tests, ~18s)
npm run test:cli

# E2E tests (requires display)
npm run test:e2e
```

## Troubleshooting

**`command not found` or `MODULE_NOT_FOUND` errors**
- Ensure you're using the `niivue-desktop-cli.sh` wrapper, not the packaged `.app` binary directly
- Run `npm install` from the monorepo root
- Unset `ELECTRON_RUN_AS_NODE` if set in your shell

**Piped command times out**
- Parcellation models take ~15-20s; combined with Electron startup the pipeline may need up to 60s
- The stdin timeout is 120s by default

**Segmentation takes too long**
- Try the "Light" model variants first
- Close other GPU-intensive applications

**Out of memory errors**
- Use lighter model variants
