# Brain Segmentation Guide

NiiVue Desktop includes brain segmentation powered by [Brainchop](https://github.com/neuroneural/brainchop) and TensorFlow.js. All processing runs client-side — no data leaves the machine.

For CLI usage, see [CLI.md](CLI.md).

---

## Prerequisites

From the monorepo root:

```bash
npm install
npm run setup:desktop
```

This downloads niimath, dcm2niix, and brainchop models. Alternatively, `npm run dev:desktop` runs setup automatically before starting the dev server.

## Available Models

| Model ID | Type | Time | Memory |
|---|---|---|---|
| `tissue-seg-light` | Tissue Segmentation | ~3s | 400 MB |
| `tissue-seg-full` | Tissue Segmentation | ~8s | 1200 MB |
| `brain-extract-light` | Brain Extraction | ~3s | 400 MB |
| `brain-extract-full` | Brain Extraction | ~6s | 800 MB |
| `parcellation-50` | Parcellation (50 regions) | ~15s | 1800 MB |
| `parcellation-104` | Parcellation (104 regions) | ~20s | 2000 MB |

## Bundled Standard Images

| Name | Description |
|---|---|
| `mni152` | MNI152 T1 template (skull-stripped) |
| `chris_t1` | T1-weighted scan (with skull) |

---

## GUI Demos

### Launch the App

```bash
# Development mode
npm run dev

# Or use the built .app (after npm run build-release:mac)
open dist/mac-arm64/niivue-desktop.app
```

### Tissue Segmentation

1. **File → Open Standard → mni152.nii.gz (skull stripped)**
2. **View → Panel → Segmentation** (or `Ctrl+5`)
3. Category filter: **Tissue Segmentation**
4. Model: **Tissue Segmentation (Light)**
5. Click **Run Segmentation**
6. Result: colored overlay showing gray matter (label 1) and white matter (label 2)

### Brain Extraction

1. **File → Open Standard → chris_t1.nii.gz (with skull)**
2. **View → Panel → Segmentation** (or `Ctrl+5`)
3. Category filter: **Brain Extraction**
4. Model: **Brain Extraction (Light)**
5. Click **Run Segmentation**
6. Result: binary mask overlay — brain vs. non-brain

### Parcellation + Extract Subvolume

1. **File → Open Standard → mni152.nii.gz (skull stripped)**
2. **View → Panel → Segmentation** (or `Ctrl+5`)
3. Category filter: **Regional Parcellation**
4. Model: **Parcellation (50 regions)**
5. Check **Extract Subvolume**
6. Click **None** to deselect all labels, then select **Hippocampus** (10) and **Thalamus-Proper** (5)
7. Click **Run & Extract**
8. Result: original MRI intensities shown only in the selected regions

> **Alternative (menu-based):** You can also run segmentation directly from **Tools → Brain Segmentation → [model name]** without opening the panel.

---

## System Requirements

- **GPU:** WebGL 2.0 capable (most modern GPUs)
- **Memory:** 2-4 GB RAM recommended
- **Disk:** ~6 MB for models + bundled sample images
- **Node.js:** 20+ (matches Electron's embedded Node)

## Technical Details

- **TensorFlow.js v4.20.0** with WebGL2 backend (WebGPU when available)
- **MeshNet-based models** with dilated convolutions
- **Input:** 256x256x256 voxels, 1mm isotropic resolution
- All processing is fully offline — zero server dependency
- Models source: [neuroneural/brainchop](https://github.com/neuroneural/brainchop) (MIT license)

## Troubleshooting

**Segmentation takes too long**
- Try the "Light" model variants first
- Close other GPU-intensive applications

**Out of memory errors**
- Enable "Use Subvolumes" in the segmentation panel
- Use lighter model variants

## Running Tests

```bash
# CLI tests (39 tests, ~18s)
npm run test:cli

# E2E tests (requires display)
npm run test:e2e
```

## License

- **Brainchop Models:** MIT License
- **TensorFlow.js:** Apache 2.0 License
- **NiiVue:** BSD 2-Clause License
