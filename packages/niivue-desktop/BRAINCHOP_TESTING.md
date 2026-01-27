# Brain Segmentation Testing Guide

## Quick Start

The NiiVue Desktop app now includes brain segmentation powered by Brainchop and TensorFlow.js.

### Step 1: Load Sample Brain Image

Two sample brain images are included:

**For Tissue Segmentation & Parcellation:**
- Go to: **Tools → Brain Segmentation → Load Sample Brain (MNI152 - Skull Stripped)**
- This is a standard T1-weighted brain template (MNI152) already skull-stripped
- Perfect for tissue segmentation and parcellation

**For Brain Extraction:**
- Go to: **Tools → Brain Segmentation → Load Sample Brain (T1 with Skull)**
- This is a T1-weighted brain scan with skull intact (chris_t1.nii.gz)
- Perfect for testing brain extraction/skull stripping

### Step 2: Run Segmentation

Choose one of the segmentation models from the menu:

**Tissue Segmentation**
- **Light** (~3 seconds): Fast tissue classification into gray matter, white matter, and background
- **Full** (~8 seconds): More accurate tissue segmentation with 20 channels

**Brain Extraction**
- **Light** (~3 seconds): Fast brain/skull separation
- **Full** (~6 seconds): More accurate brain mask extraction

**Parcellation**
- **50 regions** (~15 seconds): Aparc+Aseg 50-class cortical parcellation
- **104 regions** (~20 seconds): Desikan-Killiany 104-class atlas parcellation

### Step 3: View Results

The segmentation result will be automatically added as an overlay on top of the original brain image. You can:
- Adjust the opacity slider to blend the segmentation with the original
- Change the colormap to visualize different tissue types
- Save the segmented result as a new volume

## Alternative: Use Segmentation Panel

1. Go to **Tools → Brain Segmentation → Show Segmentation Panel**
2. Load your brain image (or use the sample)
3. Select a model from the dropdown
4. Configure advanced options if needed (e.g., subvolume processing for memory-constrained systems)
5. Click **Run Segmentation**

## Models Included

All models are bundled offline (~1.6 MB total):
- `tissue-seg-light`: Fast tissue segmentation (model5_gw_ae)
- `tissue-seg-full`: High accuracy tissue segmentation (model20chan3cls)
- `brain-extract-light`: Fast brain extraction (model5_gw_ae)
- `brain-extract-full`: Accurate brain mask (model11_gw_ae)
- `parcellation-50`: 50-region parcellation (model30chan50cls)
- `parcellation-104`: 104-region parcellation (model21_104class)

## System Requirements

- **GPU**: WebGL 2.0 capable GPU (most modern GPUs)
- **Memory**: 2-4 GB RAM recommended
- **Disk**: ~6 MB for models + bundled sample image

## Performance

Estimated processing times on typical hardware:
- Tissue segmentation: 3-8 seconds
- Brain extraction: 3-6 seconds
- Parcellation: 15-20 seconds

For memory-constrained systems, enable "Use Subvolumes" in the advanced options.

## Technical Details

### Models Source
Models are from the [neuroneural/brainchop](https://github.com/neuroneural/brainchop) project (MIT license).

### Architecture
- **TensorFlow.js v4.20.0** with WebGL2 backend
- **MeshNet-based models** with dilated convolutions
- **Input**: 256×256×256 voxels, 1mm isotropic resolution
- **Processing**: In-browser, fully offline, no data sent to servers

### Sample Brain Images

**1. MNI152 T1-weighted brain template (skull stripped)**
- Standard neuroimaging template used in research
- Location: `resources/images/standard/mni152.nii.gz`
- Size: 4.1 MB (compressed), 11 MB (uncompressed)
- Best for: Tissue segmentation and parcellation

**2. Chris T1 brain scan (with skull)**
- Real brain MRI scan with skull intact
- Location: `resources/images/standard/chris_t1.nii.gz`
- Size: 4.0 MB (compressed), 9.1 MB (uncompressed)
- Source: [niivue-images repository](https://github.com/neurolabusc/niivue-images) (CC BY-NC 4.0)
- Best for: Brain extraction and skull stripping

## Troubleshooting

**"Please load a volume first"**
- Load a brain image before running segmentation
- Use Tools → Brain Segmentation → Load Sample Brain for testing

**Segmentation takes too long**
- Try the "Light" model variants first
- Enable "Use Subvolumes" in advanced options
- Close other GPU-intensive applications

**Out of memory errors**
- Enable "Use Subvolumes" in the segmentation panel
- Close other applications to free up RAM
- Try the lighter model variants

**Results don't look right**
- Ensure the input is a T1-weighted MRI scan
- Check that the image is properly oriented
- Try a different model variant

## License

- **Brainchop Models**: MIT License
- **TensorFlow.js**: Apache 2.0 License
- **NiiVue**: BSD 2-Clause License
