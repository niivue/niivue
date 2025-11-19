# NVImage Modularization Migration Plan

## Executive Summary

This document outlines the plan to further modularize the NVImage class from a 3,898-line file into a collection of focused, single-responsibility modules. The current `packages/niivue/src/nvimage/index.ts` file contains ~45 core methods plus extensive format-specific readers, coordinate transformations, and data processing logic.

**Current State:**
- **File:** `packages/niivue/src/nvimage/index.ts`
- **Size:** 3,898 lines (~132KB)
- **Methods:** ~45 core methods (excluding already delegated methods)
- **Properties:** ~90 state variables
- **Existing Modules:** ImageWriter, VolumeUtils, ImageReaders (partial), utils, RenderingUtils

**Goal:** Complete the modularization of NVImage by extracting remaining format readers, coordinate transforms, and data processing logic into focused modules while maintaining backward compatibility.

---

## Analysis Summary

### Current Modularization Status

| Module | File | Status | Methods |
|--------|------|--------|---------|
| **ImageWriter** | ImageWriter.ts (13KB) | ✅ Complete | saveToUint8Array, saveToDisk, createNiftiArray, createNiftiHeader, toUint8Array |
| **VolumeUtils** | VolumeUtils.ts (13KB) | ✅ Complete | getVolumeData, setVolumeData, getValue, getValues |
| **ImageReaders** | ImageReaders/ | 🟡 Partial | Nii, Mgh, Nrrd (12 more readers still in index.ts) |
| **Utils** | utils.ts (20KB) | ✅ Complete | Type definitions, helper functions |
| **RenderingUtils** | RenderingUtils.ts (5KB) | ✅ Complete | Rendering helpers |

### Method Distribution

| Category | Method Count | Current Location | Examples |
|----------|--------------|------------------|----------|
| **Static Factory Methods** | 13 | index.ts | `loadFromUrl`, `loadFromFile`, `loadFromBase64`, `new` |
| **Format Readers** | 12 | index.ts | `readECAT`, `readVMR`, `readFIB`, `readSRC`, `readMIF`, etc. |
| **Coordinate Transforms** | 6 | index.ts | `vox2mm`, `mm2vox`, `convertVox2Frac`, `convertFrac2MM` |
| **Data Processing** | 9 | index.ts | `calculateRAS`, `calculateOblique`, `init`, `img2RAS`, `hdr2RAS` |
| **Colormap/Intensity** | 5 | index.ts | `calMinMax`, `setColormap`, `intensityRaw2Scaled` |
| **Image Operations** | 3 | Delegated to VolumeUtils | `getValue`, `getVolumeData`, `setVolumeData` |
| **Export/Serialization** | 5 | Delegated to ImageWriter | `saveToUint8Array`, `toUint8Array`, `createNiftiArray` |

### Key Dependencies

1. **nifti-reader-js** - NIfTI header parsing
2. **gl-matrix** - Matrix and vector operations (mat3, mat4, vec3, vec4)
3. **zarrita** - Zarr format support
4. **fflate** - Compression/decompression
5. **@lukeed/uuid** - UUID generation
6. **Internal modules** - colortables, logger, nvutilities

---

## Proposed Module Structure

### Phase 1: Extract Remaining Format Readers

These format readers are still embedded in index.ts and should be moved to the ImageReaders directory.

#### 1.1 ECAT Reader
**File:** `packages/niivue/src/nvimage/ImageReaders/ecat.ts`
**Responsibility:** Read ECAT7 PET format images
**Line Range:** ~1014-1119
**Key Methods:**
- `readECAT()` - Parse ECAT7 format

**Dependencies:** NIFTI1 (from nifti-reader-js)
**Status:** Completed

---

#### 1.2 BrainVoyager Readers
**File:** `packages/niivue/src/nvimage/ImageReaders/brainvoyager.ts`
**Responsibility:** Read BrainVoyager V16 and VMR formats
**Line Range:** ~1121-1471
**Key Methods:**
- `readV16()` - Read BrainVoyager V16 format
- `readVMR()` - Read BrainVoyager VMR format

**Dependencies:** NIFTI1 (from nifti-reader-js)
**Status:** ✅ Completed

---

#### 1.3 DSI Studio Readers
**File:** `packages/niivue/src/nvimage/ImageReaders/dsistudio.ts`
**Responsibility:** Read DSI Studio FIB and SRC formats
**Line Range:** ~1478-1635
**Key Methods:**
- `readFIB()` - Read DSI Studio FIB format (fiber orientation data)
- `readSRC()` - Read DSI Studio SRC format (DWI source data)

**Dependencies:** NIFTI1, NVUtilities.readMatV4, mat4, vec3
**Status:** Completed

---

#### 1.4 NumPy Readers
**File:** `packages/niivue/src/nvimage/ImageReaders/numpy.ts`
**Responsibility:** Read NumPy NPY and NPZ formats
**Line Range:** ~1147-1251
**Key Methods:**
- `readNPY()` - Read NumPy .npy format
- `readNPZ()` - Read NumPy .npz format (zipped arrays)

**Dependencies:** NIFTI1, Zip (from nvutilities)
**Status:** Completed

---

#### 1.5 Image Format Readers
**File:** `packages/niivue/src/nvimage/ImageReaders/image.ts`
**Responsibility:** Read standard image formats (BMP, PNG, JPG via browser)
**Line Range:** ~1253-1311
**Key Methods:**
- `readBMP()` - Read bitmap images via browser Image API
- `imageDataFromArrayBuffer()` - Convert ArrayBuffer to ImageData

**Dependencies:** NIFTI1, browser Image API
**Status:** Completed

---

#### 1.6 Zarr Reader
**File:** `packages/niivue/src/nvimage/ImageReaders/zarr.ts`
**Responsibility:** Read Zarr multi-dimensional array format
**Line Range:** ~1313-1378
**Key Methods:**
- `readZARR()` - Read Zarr format with RGB handling

**Dependencies:** NIFTI1, zarrita library
**Status:** Completed

---

#### 1.7 MRtrix Reader
**File:** `packages/niivue/src/nvimage/ImageReaders/mrtrix.ts`
**Responsibility:** Read MRtrix MIF format
**Line Range:** ~1928-2284
**Key Methods:**
- `readMIF()` - Read MRtrix MIF format (supports 3D-5D data)

**Dependencies:** NIFTI1, NVUtilities.decompressToBuffer, NVUtilities.range
**Status:** Completed

---

#### 1.8 ITK Reader
**File:** `packages/niivue/src/nvimage/ImageReaders/itk.ts`
**Responsibility:** Read ITK MHA/MHD formats
**Line Range:** ~1783-1923
**Key Methods:**
- `readMHA()` - Read ITK MetaImage format (MHA/MHD)

**Dependencies:** NIFTI1, mat3, vec3, NVUtilities.decompressToBuffer
**Status:** Completed

---

#### 1.9 AFNI Reader
**File:** `packages/niivue/src/nvimage/ImageReaders/afni.ts`
**Responsibility:** Read AFNI HEAD/BRIK format
**Line Range:** ~1639-1778
**Key Methods:**
- `readHEAD()` - Read AFNI HEAD header and BRIK data

**Dependencies:** NIFTI1, NIFTIEXTENSION, NVUtilities.decompressToBuffer
**Status:** Completed

---

### Phase 2: Coordinate Transform Module

#### 2.1 CoordinateTransform Module
**File:** `packages/niivue/src/nvimage/CoordinateTransform.ts`
**Responsibility:** All coordinate system transformations
**Line Range:** ~2562-2897
**Key Methods:**
- `vox2mm()` - Convert voxel to millimeter coordinates
- `mm2vox()` - Convert millimeter to voxel coordinates
- `convertVox2Frac()` - Convert voxel to fractional texture coordinates
- `convertFrac2Vox()` - Convert fractional to voxel coordinates
- `convertFrac2MM()` - Convert fractional to millimeter coordinates
- `convertMM2Frac()` - Convert millimeter to fractional coordinates

**Properties to migrate:**
- Matrix properties: `matRAS`, `frac2mm`, `frac2mmOrtho`, `mm2ortho`, `toRAS`, `toRASvox`
- Dimension properties: `dimsRAS`, `pixDimsRAS`, `permRAS`
- Extent properties: `extentsMinOrtho`, `extentsMaxOrtho`
- Corner coordinates: `mm000`, `mm100`, `mm010`, `mm001`

**Dependencies:** gl-matrix (mat4, vec3, vec4)
**Status:** ⬜ Not Started

---

### Phase 3: Data Processing Modules

#### 3.1 ImageOrientation Module
**File:** `packages/niivue/src/nvimage/ImageOrientation.ts`
**Responsibility:** Handle image orientation, RAS calculation, and reorientation
**Line Range:** ~2288-2459, ~2464-2558
**Key Methods:**
- `calculateRAS()` - Determine RAS orientation from NIfTI header
- `calculateOblique()` - Calculate oblique transformation matrices
- `computeObliqueAngle()` - Detect misalignment between voxel and world space
- `img2RAS()` - Reorient image data to RAS
- `hdr2RAS()` - Reorient header to RAS

**Properties to migrate:**
- `oblique_angle`, `maxShearDeg`
- `obliqueRAS`
- `img2RASstep`, `img2RASstart`

**Helper Methods:**
- `arrayEquals()` - Array comparison utility

**Dependencies:** gl-matrix (mat3, mat4, vec3, vec4), logger
**Status:** ⬜ Not Started

---

#### 3.2 HeaderTransform Module
**File:** `packages/niivue/src/nvimage/HeaderTransform.ts`
**Responsibility:** NIfTI header transformations and format conversions
**Line Range:** ~794-879
**Key Methods:**
- `THD_daxes_to_NIFTI()` - Convert AFNI header to NIfTI format
- `SetPixDimFromSForm()` - Calculate voxel spacing from affine matrix

**Dependencies:** NIFTI1/NIFTI2, mat4, vec3
**Status:** ⬜ Not Started

---

#### 3.3 TensorProcessing Module
**File:** `packages/niivue/src/nvimage/TensorProcessing.ts`
**Responsibility:** Diffusion tensor and vector field processing
**Line Range:** ~627-699
**Key Methods:**
- `float32V1asRGBA()` - Convert vector field to RGBA representation
- `loadImgV1()` - Load and process V1 vector data with optional flips

**Dependencies:** None (pure data processing)
**Status:** ⬜ Not Started

---

### Phase 4: Intensity and Colormap Module

#### 4.1 IntensityCalibration Module
**File:** `packages/niivue/src/nvimage/IntensityCalibration.ts`
**Responsibility:** Intensity calibration, windowing, and histogram analysis
**Line Range:** ~2655-2914
**Key Methods:**
- `calMinMax()` - Calculate robust intensity range (2%..98% percentile)
- `intensityRaw2Scaled()` - Convert raw to calibrated intensity
- `intensityScaled2Raw()` - Convert calibrated to raw intensity

**Properties to migrate:**
- `cal_min`, `cal_max` - Calibrated intensity range
- `cal_minNeg`, `cal_maxNeg` - Negative colormap range
- `robust_min`, `robust_max` - Robust intensity estimates
- `global_min`, `global_max` - Full intensity range
- `percentileFrac` - Percentile fraction for robust range
- `ignoreZeroVoxels` - Flag to ignore zero voxels in calculations
- `trustCalMinMax` - Flag to trust header cal_min/cal_max

**Dependencies:** cmapper (colortables), logger
**Status:** ⬜ Not Started

---

#### 4.2 ColormapManager Module
**File:** `packages/niivue/src/nvimage/ColormapManager.ts`
**Responsibility:** Colormap assignment and management
**Line Range:** ~2601-2646
**Key Methods:**
- `setColormap()` - Set continuous colormap
- `setColormapLabel()` - Set discrete label colormap
- `setColormapLabelFromUrl()` - Load label colormap from URL
- Getters/setters for `colormap`/`colorMap` properties

**Properties to migrate:**
- `_colormap` - Current colormap name
- `colormapNegative` - Negative value colormap
- `colormapLabel` - Discrete label lookup table
- `colormapInvert` - Invert colormap flag
- `colormapType` - Colormap type (min-to-max vs symmetric)
- `_opacity` - Image opacity

**Callbacks:**
- `onColormapChange` - Triggered when colormap changes
- `onOpacityChange` - Triggered when opacity changes

**Dependencies:** cmapper (colortables)
**Status:** ⬜ Not Started

---

### Phase 5: Factory and Loader Module

#### 5.1 ImageFactory Module
**File:** `packages/niivue/src/nvimage/ImageFactory.ts`
**Responsibility:** Factory methods for creating NVImage instances
**Line Range:** ~469-603, ~3164-3420, ~3477-3566, ~3635-3699
**Key Static Methods:**
- `NVImage.new()` - Create from ArrayBuffer with format detection
- `loadFromUrl()` - Load from URL with streaming support
- `loadFromFile()` - Load from browser File object
- `loadFromBase64()` - Load from base64 string
- `zerosLike()` - Create zero-filled image matching another
- `clone()` - Create a copy of an image

**Helper Static Methods:**
- `fetchDicomData()` - Fetch DICOM manifest
- `readFirstDecompressedBytes()` - Stream decompression helper
- `extractFilenameFromUrl()` - Parse filename from URL
- `loadInitialVolumes()` - Load partial 4D volumes (uncompressed)
- `loadInitialVolumesGz()` - Load partial 4D volumes (gzipped)
- `readFileAsync()` - Read browser File with streaming

**Dependencies:** All format readers, coordinate transforms, data processing
**Status:** ⬜ Not Started

---

### Phase 6: Metadata and Options Module

#### 6.1 ImageMetadata Module
**File:** `packages/niivue/src/nvimage/ImageMetadata.ts`
**Responsibility:** Image metadata access and configuration management
**Line Range:** ~3733-3822
**Key Methods:**
- `getImageMetadata()` - Get NIfTI metadata (dimensions, datatypes, etc.)
- `getImageOptions()` - Get current image options
- `applyOptionsUpdate()` - Update image options

**Properties to migrate:**
- `name` - Image name/filename
- `id` - Unique identifier (UUID)
- `url` - Source URL (if loaded from URL)
- `headers` - HTTP headers for fetching
- `fileObject` - Browser File reference
- `imageType` - Image format type
- `colorbarVisible` - Show/hide colorbar
- `modulationImage` - Modulation layer index
- `modulateAlpha` - Modulation alpha blending

**Dependencies:** None (pure data access)
**Status:** ⬜ Not Started

---

### Phase 7: Core NVImage Class Refactor

#### 7.1 NVImage Core Class
**File:** `packages/niivue/src/nvimage/index.ts` (refactored)
**Responsibility:** Facade and orchestration of all modules
**Key Methods (retained):**
- `constructor()` - Initialize with all modules
- `init()` - Main initialization logic
- Public API methods that delegate to modules

**Structure:**
```typescript
// Import module functions (not classes)
import * as CoordinateTransform from './CoordinateTransform'
import * as ImageOrientation from './ImageOrientation'
import * as IntensityCalibration from './IntensityCalibration'
import * as ColormapManager from './ColormapManager'
import * as ImageFactory from './ImageFactory'
import * as ImageWriter from './ImageWriter'
import * as VolumeUtils from './VolumeUtils'

export class NVImage {
  // Core properties (retained in main class)
  name: string
  id: string
  hdr: NIFTI1 | NIFTI2 | null = null
  img?: TypedVoxelArray
  extensions?: NIFTIEXTENSION[]

  // Dimension properties
  dims?: number[]
  pixDims?: number[]
  nVox3D?: number
  nFrame4D?: number
  nTotalFrame4D?: number
  frame4D: number = 0

  // Coordinate transform matrices (used by CoordinateTransform module)
  matRAS?: mat4
  frac2mm?: mat4
  frac2mmOrtho?: mat4
  toRAS?: mat4
  toRASvox?: mat4
  // ... etc

  // Special data
  imaginary?: Float32Array // complex data
  v1?: Float32Array // FIB files
  series: any = [] // DICOM series

  // Callbacks (preserved for backward compatibility)
  onColormapChange: (img: NVImage) => void = () => {}
  onOpacityChange: (img: NVImage) => void = () => {}

  constructor(dataBuffer, name, colormap, ...) {
    // No module initialization needed - they're just function namespaces
    this.id = uuidv4()
    this.name = name
    // ... initialize properties
  }

  // Public API methods delegate to module functions
  vox2mm(XYZ: number[], mtx: mat4): vec3 {
    return CoordinateTransform.vox2mm(this, XYZ, mtx)
  }

  calculateRAS(): void {
    ImageOrientation.calculateRAS(this)
  }

  calMinMax(vol = Infinity, isBorder = true): number[] {
    return IntensityCalibration.calMinMax(this, vol, isBorder)
  }

  setColormap(cm: string): void {
    ColormapManager.setColormap(this, cm)
  }

  getValue(x: number, y: number, z: number, frame4D = 0): number {
    return VolumeUtils.getValue(this, x, y, z, frame4D)
  }

  // Static factory methods delegate to ImageFactory module
  static async loadFromUrl(options: ImageFromUrlOptions): Promise<NVImage> {
    return ImageFactory.loadFromUrl(options)
  }

  async saveToUint8Array(fnm: string, drawing8?: Uint8Array): Promise<Uint8Array> {
    return ImageWriter.saveToUint8Array(this, fnm, drawing8)
  }

  // ... all other public methods
}
```

**Status:** ⬜ Not Started

---

## Implementation Strategy

### Guiding Principles

1. **Backward Compatibility:** Maintain 100% backward compatibility with the existing public API
2. **Incremental Migration:** Move one module at a time, testing after each change
3. **Pure Functions:** Modules are namespaces of pure functions (following existing ImageWriter/VolumeUtils pattern)
   - Functions that need NVImage data receive it as first parameter
   - Utility functions are completely pure with explicit parameters
   - No circular dependencies or instance references
4. **Interface Contracts:** Define clear interfaces for each module
5. **Leverage Existing Work:** Build on already-extracted modules (ImageWriter, VolumeUtils, ImageReaders)
6. **Test Coverage:** Update Playwright tests as modules are created

### Module Pattern (Following ImageWriter/VolumeUtils)

Each module should follow this pattern:

```typescript
// Example: CoordinateTransform.ts
import { mat4, vec3, vec4 } from 'gl-matrix'
import type { NVImage } from './index'

/**
 * Convert voxel location to millimeter coordinates.
 * @param nvImage - The NVImage instance
 * @param XYZ - Voxel coordinates [x, y, z]
 * @param mtx - Transformation matrix
 * @returns Millimeter coordinates
 */
export function vox2mm(nvImage: NVImage, XYZ: number[], mtx: mat4): vec3 {
  const sform = mat4.clone(mtx)
  mat4.transpose(sform, sform)
  const pos = vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1)
  vec4.transformMat4(pos, pos, sform)
  return vec3.fromValues(pos[0], pos[1], pos[2])
}

/**
 * Pure utility function that doesn't need NVImage.
 * @param a - First array
 * @param b - Second array
 * @returns true if arrays are equal
 */
export function arrayEquals(a: unknown[], b: unknown[]): boolean {
  return Array.isArray(a) && Array.isArray(b) &&
         a.length === b.length &&
         a.every((val, index) => val === b[index])
}

// More functions...
```

**Key Principles:**
- Export individual functions (not a class)
- Functions that need NVImage data take it as first parameter
- Pure utilities have explicit parameters only
- Use JSDoc for documentation
- Import types using `import type` for better tree-shaking

**Before/After Example:**

```typescript
// BEFORE: Method in NVImage class (index.ts)
export class NVImage {
  vox2mm(XYZ: number[], mtx: mat4): vec3 {
    const sform = mat4.clone(mtx)
    mat4.transpose(sform, sform)
    const pos = vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1)
    vec4.transformMat4(pos, pos, sform)
    return vec3.fromValues(pos[0], pos[1], pos[2])
  }
}

// AFTER: Extracted to CoordinateTransform.ts
export function vox2mm(nvImage: NVImage, XYZ: number[], mtx: mat4): vec3 {
  const sform = mat4.clone(mtx)
  mat4.transpose(sform, sform)
  const pos = vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1)
  vec4.transformMat4(pos, pos, sform)
  return vec3.fromValues(pos[0], pos[1], pos[2])
}

// AFTER: Delegation in NVImage class (index.ts)
import * as CoordinateTransform from './CoordinateTransform'

export class NVImage {
  vox2mm(XYZ: number[], mtx: mat4): vec3 {
    return CoordinateTransform.vox2mm(this, XYZ, mtx)
  }
}
```

### Migration Process (Per Module)

For each module in the plan above:

1. **Create Module File**
   - Create new .ts file in appropriate directory
   - Set up imports (dependencies and types)
   - Add module-level JSDoc comment

2. **Extract Functions**
   - Copy relevant methods from index.ts
   - Convert methods to exported functions
   - Add `nvImage: NVImage` as first parameter (if needed)
   - Replace `this.` with `nvImage.`

3. **Update Main Class**
   - Import module functions at top of index.ts
   - Replace method bodies with delegation to module functions
   - Example: `vox2mm(XYZ, mtx) { return CoordinateTransform.vox2mm(this, XYZ, mtx) }`

4. **Test**
   - Run existing unit tests
   - Run e2e tests
   - Verify no regressions

5. **Clean Up**
   - Remove old method bodies from index.ts (keep delegation)
   - Update any internal references

6. **Document**
   - Add JSDoc comments to all exported functions
   - Update README if needed
   - Add examples if helpful

### Phased Rollout

**Phase 1: Extract Format Readers (Low Risk)**
- Move remaining format readers to ImageReaders/
- Each reader is independent
- Easy to test in isolation
- Already have 3 readers extracted as examples

**Phase 2: Coordinate Transforms (Medium Risk)**
- Extract coordinate transformation logic
- Well-defined mathematical operations
- Used throughout the codebase

**Phase 3: Data Processing (Medium Risk)**
- Extract orientation and header transforms
- Extract tensor processing
- Clear separation of concerns

**Phase 4: Intensity & Colormap (Medium Risk)**
- Extract intensity calibration
- Extract colormap management
- Preserve callback system

**Phase 5: Factory Methods (Higher Risk)**
- Extract factory and loader methods
- Most complex due to dependencies on all other modules
- Requires careful orchestration

**Phase 6: Metadata & Options (Low Risk)**
- Extract metadata and options management
- Simple data access methods

**Phase 7: Core Refactor (Final Integration)**
- Refactor main NVImage class
- Wire up all modules
- Final integration testing

---

## Success Criteria

- ✅ All existing unit tests pass (unless they need to be updated DUE to refactor)
- ✅ All e2e tests pass (unless they need to be updated DUE to refactor)
- ✅ Minimal breaking changes to public API (only if it is a justified improvement)
- ✅ Code coverage maintained or improved
- ✅ Documentation updated
- ✅ Each module has < 500 lines of code
- ✅ Clear separation of concerns
- ✅ Reduced coupling between modules
- ✅ All format readers in ImageReaders/ directory
- ✅ Coordinate transforms isolated and reusable

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking changes to public API | High | Low | Maintain facade pattern, comprehensive testing |
| Format reader regressions | High | Medium | Test with real-world files from each format |
| Coordinate transform errors | High | Low | Extensive unit tests with known transformations |
| Performance degradation | Medium | Low | Benchmark before/after, optimize hot paths |
| Merge conflicts | Medium | Medium | Small PRs, frequent merges, clear communication |

---

## Task Tracking

### Phase 1: Extract Format Readers ✅

- ✅ 1.1 ECAT Reader
- ✅ 1.2 BrainVoyager Readers
- ✅ 1.3 DSI Studio Readers
- ✅ 1.4 NumPy Readers
- ✅ 1.5 Image Format Readers
- ✅ 1.6 Zarr Reader
- ✅ 1.7 MRtrix Reader
- ✅ 1.8 ITK Reader
- ✅ 1.9 AFNI Reader

### Phase 2: Coordinate Transform Module ⬜

- ⬜ 2.1 CoordinateTransform Module

### Phase 3: Data Processing Modules ⬜

- ⬜ 3.1 ImageOrientation Module
- ⬜ 3.2 HeaderTransform Module
- ⬜ 3.3 TensorProcessing Module

### Phase 4: Intensity and Colormap Module ⬜

- ⬜ 4.1 IntensityCalibration Module
- ⬜ 4.2 ColormapManager Module

### Phase 5: Factory and Loader Module ⬜

- ⬜ 5.1 ImageFactory Module

### Phase 6: Metadata and Options Module ⬜

- ⬜ 6.1 ImageMetadata Module

### Phase 7: Core Refactor ⬜

- ⬜ 7.1 NVImage Core Class Refactor
- ⬜ Integration Testing
- ⬜ Performance Benchmarking
- ⬜ Documentation Update
- ⬜ Final Release

---

## Appendix

### A. Current File Statistics

```
File: packages/niivue/src/nvimage/index.ts
Lines: 3,898
Size: ~132KB
Methods: ~45 core methods
Properties: ~90 properties
Format Readers: 12 (9 need extraction)
Existing Modules: 5 (ImageWriter, VolumeUtils, ImageReaders (partial), utils, RenderingUtils)
```

### B. Module Size Targets

Each module should aim for:
- **Lines of Code:** < 500 lines (format readers), < 300 lines (others)
- **Methods:** < 15 methods
- **Properties:** < 10 properties per module
- **Dependencies:** < 5 direct dependencies
- **Cyclomatic Complexity:** < 10 per method

### C. Testing Requirements

Each module must have:
- **Unit Tests:** 80%+ code coverage
- **Format-specific Tests:** Each format reader tested with real files
- **E2E Tests:** No regressions in existing tests (or fix them if there are any)

### D. Documentation Requirements

Each module must have:
- **README:** Purpose, usage, examples
- **JSDoc:** All public methods documented
- **TypeScript Types:** Full type coverage
- **Format Specs:** Links to format specifications for readers

---

## Existing Modularization Examples

The following modules are already well-structured and serve as templates:

### ImageWriter.ts (13KB)
- Handles all export/serialization operations
- Clean delegation pattern from NVImage
- Good separation of concerns

### VolumeUtils.ts (13KB)
- Handles volume data access operations
- Pure functions that operate on NVImage instances
- Clear, focused responsibility

### ImageReaders/nii.ts, mgh.ts, nrrd.ts
- Each reader is self-contained
- Returns parsed header and image data
- Follows consistent pattern across formats

These should be used as templates for the new modules.

---

## Module Dependencies

Since modules are function namespaces (not class instances), dependencies are simple import relationships:

```
ImageFactory functions
  ├─> Import all Format Reader modules
  ├─> Import CoordinateTransform functions
  ├─> Import ImageOrientation functions
  ├─> Import IntensityCalibration functions
  └─> Import ColormapManager functions

ImageOrientation functions
  └─> Import CoordinateTransform functions (for calculations)

IntensityCalibration functions
  └─> Import ColormapManager functions (for colormap lookup)

All module functions
  ├─> Receive NVImage as first parameter (when needed)
  └─> Access NVImage properties directly (no getters/setters needed)
```

**No Circular Dependencies:** Because modules are just function namespaces that receive NVImage as a parameter, there are no circular dependency issues. The NVImage class imports the modules, and the module functions receive NVImage instances as parameters.

---

## Conclusion

This migration plan provides a structured approach to completing the modularization of the NVImage class. By extracting the remaining format readers and organizing core functionality into focused modules, we can significantly improve code maintainability while preserving the existing API and functionality.

The modularization will result in:
- ✅ Better code organization
- ✅ Format readers isolated in ImageReaders/ directory
- ✅ Improved testability (each format tested independently)
- ✅ Easier maintenance (bugs isolated to specific modules)
- ✅ Better documentation (each module self-contained)
- ✅ Reduced coupling between components
- ✅ Increased cohesion within modules
- ✅ Simpler debugging (smaller code units)
- ✅ Easier onboarding for new developers
- ✅ Reusable coordinate transform utilities

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1 implementation (format readers - lowest risk)
3. Regular check-ins and progress updates
4. Update this document as modules are completed
