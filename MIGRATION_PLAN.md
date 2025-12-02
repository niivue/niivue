# Niivue Modularization Migration Plan

## Executive Summary

This document outlines the plan to modularize the Niivue class from a monolithic 15,945-line file into a collection of focused, single-responsibility modules. The current `packages/niivue/src/niivue/index.ts` file contains 280+ methods and manages WebGL rendering, user input, data loading, coordinate transformations, drawing tools, and much more - all within a single class.

**Current State:**
- **File:** `packages/niivue/src/niivue/index.ts`
- **Size:** 15,945 lines (~552KB)
- **Methods:** 280+ unique methods
- **Properties:** 100+ state variables
- **Complexity:** High coupling between rendering, input handling, data management, and business logic

**Goal:** Break down the Niivue class into focused modules that follow the Single Responsibility Principle while maintaining backward compatibility.

---

## Analysis Summary

### Method Distribution by Functional Area

| Category | Method Count | Examples |
|----------|--------------|----------|
| **Data Management** | ~106 | `addVolume`, `removeMesh`, `loadConnectome`, `setVolume` |
| **Rendering/Drawing** | ~54 | `drawScene`, `drawMesh3D`, `draw2DMain`, `drawColorbar` |
| **Coordinate Systems** | ~32 | `mm2frac`, `vox2mm`, `screenXY2mm`, `frac2canvasPos` |
| **Drawing Tools** | ~30 | `drawPt`, `drawFloodFillCore`, `drawGrowCut`, `drawPenLine` |
| **Slice Navigation** | ~25 | `sliceScroll2D`, `setSliceType`, `getCurrentSliceInfo` |
| **Event/Input Handling** | ~22 | `mouseDownListener`, `touchMoveListener`, `keyUpListener` |
| **Scene Management** | ~20 | `setMultiplanarLayout`, `setPivot3D`, `sceneExtentsMinMax` |
| **Colormaps** | ~17 | `setColormap`, `refreshColormaps`, `addColormapList` |
| **Labels/Text** | ~15 | `drawText`, `draw3DLabels`, `getAllLabels` |
| **Synchronization** | ~10 | `syncWith`, `doSync3d`, `broadcastTo` |
| **Utilities** | ~20 | Various helper functions |

### Key Dependencies Identified

1. **WebGL Context** - Central to all rendering operations
2. **Canvas Element** - Required for user interaction and rendering
3. **State Management** - 100+ properties tracking volumes, meshes, UI state, drawing state
4. **gl-matrix** - Matrix and vector operations
5. **Shader System** - 30+ shader programs for different rendering modes
6. **Event System** - Mouse, touch, keyboard, wheel event handlers
7. **External Data Classes** - NVImage, NVMesh, NVLabel3D, etc.

---

## Proposed Module Structure

### Phase 1: Core Infrastructure Modules (Foundation)

These modules form the foundation and have minimal dependencies on each other.

#### 1.1 WebGL Utilities Module
**File:** `packages/niivue/src/niivue/core/gl.ts`
**Responsibility:** WebGL context initialization, management, and basic operations
**Line Range:** ~800-1000, ~7000-7200 (texture creation methods)
**Implementation Pattern:** Pure functions (not classes)
**Key Functions:**
- `initGL(canvas, isAntiAlias)` - Initialize WebGL context, returns `{ gl, max2D, max3D }`
- `r8Tex(gl, ...)`, `r16Tex(gl, ...)`, `rgbaTex(gl, ...)`, `rgbaTex2D(gl, ...)`, `rgba16Tex(gl, ...)` - Texture creation
- `requestCORSIfNotSameOrigin(img, url)` - CORS handling
- `loadPngAsTexture(gl, ...)` - PNG image loading

**Design Decision:** Using pure functions instead of classes for better reusability, testability, and tree-shaking. All functions accept WebGL context as first parameter.

**Status:** ✅ Completed

---

#### 1.2 CoordinateTransform Module
**File:** `packages/niivue/src/niivue/core/CoordinateTransform.ts`
**Responsibility:** All coordinate system transformations
**Line Range:** ~5026-5038, ~14063-14320
**Key Methods:**
- `mm2frac()`, `frac2mm()` - Millimeter to fractional coordinates
- `vox2frac()`, `frac2vox()` - Voxel to fractional coordinates
- `vox2mm()` - Voxel to millimeter
- `screenXY2mm()`, `screenXY2TextureFrac()` - Screen to world coordinates
- `canvasPos2frac()`, `frac2canvasPos()` - Canvas to fractional
- `swizzleVec3MM()` - Coordinate swizzling for different orientations

**Design Decision:** Using pure functions instead of classes for better reusability, testability, and tree-shaking.
**Dependencies:** NVImage, NVMesh, NiivueObject3D, swizzleVec3, NVUtilities
**Status:** ✅ Completed

---

#### 1.3 ShaderManager Module
**File:** `packages/niivue/src/niivue/core/ShaderManager.ts`
**Responsibility:** Shader compilation, management, and lifecycle
**Line Range:** ~7378-7520
**Key Methods:**
- `initRenderShader()` - Initialize rendering shaders
- `setCustomSliceShader()` - Custom slice shaders
- `setCustomMeshShader()` - Custom mesh shaders
- `meshShaderNameToNumber()` - Shader lookup
- `meshShaderNames()` - Available shader names

**Properties to migrate:**
- `sliceMMShader`, `slice2DShader`, `sliceV1Shader`
- `orientCubeShader`, `rectShader`, `lineShader`
- `renderShader`, `renderGradientShader`
- `meshShaders` array (15 mesh shader variants)
- All shader-related WebGLTexture objects

**Status:** ✅ Completed

---

### Phase 2: Data Management Modules

#### 2.1 VolumeManager Module
**File:** `packages/niivue/src/niivue/data/VolumeManager.ts`
**Responsibility:** Volume loading, management, and operations
**Line Range:** ~3600-3631, ~4333-4507, ~8270-8932
**Key Methods:**
- `addVolume()`, `removeVolume()`, `removeVolumeByIndex()` ✅
- `setVolume()`, `cloneVolume()` ✅
- `getVolumeIndexByID()`, `getOverlayIndexByID()` ✅
- `moveVolumeUp()`, `moveVolumeDown()`, `moveVolumeToTop()`, `moveVolumeToBottom()` ✅
- `updateGLVolume()` - Update GPU textures (uses helper functions) ✅
- `refreshLayers()` - Layer management (uses helper functions) ✅
- `setFrame4D()`, `getFrame4D()` - 4D volume time series ✅
- `setOpacity()` - Volume opacity ✅
- `overlayRGBA()` - Overlay rendering data ✅

**Related Modules Created:**
- `VolumeTexture.ts` - Texture-related operations (prepareLayerData, checkImageSizeLimits, create2DRGBATextureData, selectOrientShader, create3DTextureByDatatype)
- `VolumeColormap.ts` - Colormap operations (refreshColormaps, setupColormapLabel)
- `VolumeModulation.ts` - Modulation operations (setupModulation)

**Properties to migrate:**
- `volumes: NVImage[]` ✅ Handled via delegation
- `volumeTexture: WebGLTexture` (remains in Niivue class - tightly coupled to WebGL state)
- `overlayTexture: WebGLTexture` (remains in Niivue class - tightly coupled to WebGL state)
- `backgroundMasksOverlays` (remains in Niivue class - tightly coupled to WebGL state)

**Dependencies:** WebGLContext, ShaderManager
**Status:** ✅ Completed (with GPU texture management remaining in Niivue class)

**Implementation Notes:**
- Core volume array management functions extracted to VolumeManager.ts as pure functions
- GPU-related helper functions extracted to VolumeTexture.ts, VolumeColormap.ts, and VolumeModulation.ts
- `updateGLVolume()` and `refreshLayers()` remain in Niivue class but now use helper functions for better separation
- All functions use pure functional approach with immutable data where possible
- Niivue class delegates to VolumeManager functions and maintains backward compatibility

**Refactoring Completed:**
- ✅ `prepareLayerData()` - Extract 4D volume frame selection (7 lines → function call)
- ✅ `checkImageSizeLimits()` - Check hardware texture size limits
- ✅ `setupColormapLabel()` - Setup colormap for label volumes (~25 lines → function call)
- ✅ `setupModulation()` - Setup modulation textures (~95 lines → function call)
- ✅ `selectOrientShader()` - Select shader based on datatype and intent
- ✅ `create3DTextureByDatatype()` - Create 3D textures based on NIfTI datatype
- ✅ `refreshColormaps()` - Refresh colormap textures (extracted to VolumeColormap.ts)

**Next Refactoring Opportunities:**
- Note: this is now complete!
The following complex operations in `refreshLayers()` (~650 lines) could be further extracted for better code reuse and separation of responsibilities:

1. **Volume Object 3D Setup** (~20 lines, lines 7712-7723)
   - `setupVolumeObject3D()` - Create volumeObject3D, set scale, calculate volScale/vox
   - Dependencies: overlayItem, gl, toNiivueObject3D, sliceScale

2. **Matrix Transformation** (~30 lines, lines 7795-7822)
   - `calculateOverlayTransformMatrix()` - Calculate transformation matrix for overlay volumes
   - Dependencies: overlayItem, back, mm2frac

3. **Texture Allocation** (~15 lines, lines 7774, 7824-7829)
   - `allocateVolumeTextures()` - Create volumeTexture and overlayTexture
   - Dependencies: gl, layer, volumeTexture, overlayTexture, back.dims, rgbaTex

4. **Framebuffer Setup** (~10 lines, lines 7831-7835)
   - `setupFramebuffer()` - Create and configure framebuffer for rendering
   - Dependencies: gl, back.dims

5. **Blend Texture Management** (~30 lines, lines 8010-8048)
   - `setupBlendTexture()` - Handle texture blending for multi-layer rendering
   - Dependencies: gl, layer, overlayTexture, back.dims, passThroughShader, rgbaTex

6. **Colormap Configuration** (~50 lines, lines 8063-8117)
   - `configureColormapUniforms()` - Setup colormap uniforms (cal_min, cal_max, negative maps, etc.)
   - Dependencies: gl, overlayItem, orientShader, layer, overlayOutlineWidth

7. **Output Texture Rendering** (~30 lines, lines 8127-8260)
   - `renderToOutputTexture()` - Render volume slices to output texture using framebuffer
   - Dependencies: gl, orientShader, back.dims, outTexture, mtx, hdr, opts

8. **Gradient Texture Generation** (~10 lines, lines 8261-8271)
   - `updateGradientTexture()` - Generate gradient texture for lighting
   - Dependencies: gl, hdr, gradientTextureAmount, useCustomGradientTexture, gradientGL

9. **Shader Uniform Updates** (~20 lines, lines 8273-8330)
   - `updateShaderUniforms()` - Update all shader uniforms after texture operations
   - Dependencies: renderShader, pickingImageShader, sliceMMShader, volumes, overlays, scene

**`updateGLVolume()` Orchestration** (~30 lines, lines 7406-7436)
This method orchestrates the entire volume update process and could remain as-is since it's already quite clean:
- Calls refreshColormaps()
- Calls closePAQD()
- Iterates volumes and calls refreshLayers()
- Updates furthestVertexFromOrigin
- Triggers callbacks and drawScene()

**Benefits of Further Refactoring:**
- Each function would be < 50 lines
- Better testability (can test texture creation, matrix calculations independently)
- Easier to understand the rendering pipeline
- Potential for reuse in other rendering contexts
- Better separation of WebGL state management from business logic

---

#### 2.2 MeshManager Module
**File:** `packages/niivue/src/niivue/data/MeshManager.ts`
**Responsibility:** Mesh loading, management, and operations
**Line Range:** ~3617-3631, ~4168-4286, ~4373-4456
**Key Methods:**
- `addMesh()` ✅
- `removeMesh()` ✅ (via setMesh with toIndex=-1)
- `setMesh()`, `getMeshIndexByID()` ✅
- `setMeshProperty()` ✅
- `indexNearestXYZmm()` ✅ - Find nearest vertex
- `decimateHierarchicalMesh()` ✅ - Mesh decimation
- `reverseFaces()` ✅ - Flip mesh normals
- `setMeshLayerProperty()` ✅ - Set mesh layer property
- `setMeshShader()` ✅ - Shader assignment
- `findMeshByUrl()` ✅ - Find mesh by URL helper
- `setMeshThicknessOn2D()` - Remains in Niivue (simple option setter)

**Properties to migrate:**
- `meshes: NVMesh[]` - Handled via delegation
- `matCapTexture: WebGLTexture` - Remains in Niivue (tightly coupled to WebGL state)

**Dependencies:** WebGLContext, ShaderManager
**Status:** ✅ Completed

**Implementation Notes:**
- Core mesh array management functions extracted to MeshManager.ts as pure functions
- All functions use pure functional approach with immutable data where possible
- Niivue class delegates to MeshManager functions and maintains backward compatibility
- Functions with more than 3 parameters use object parameters for clarity

---

#### 2.3 ConnectomeManager Module
**File:** `packages/niivue/src/niivue/data/ConnectomeManager.ts`
**Responsibility:** Connectome-specific data handling
**Line Range:** ~5660-5709
**Key Methods:**
- `loadConnectomeAsMesh()` ✅ - Convert to mesh representation
- `createNodeAddedLabelData()` ✅ - Create label data for node-added events
- `getAllLabels()` ✅ - Get all labels from meshes and document
- `getConnectomeLabels()` ✅ - Get visible connectome labels
- `convertFreeSurferConnectome()` ✅ - Convert FreeSurfer format (wrapper)
- `convertLegacyConnectome()` ✅ - Convert legacy format (wrapper)

**Dependencies:** NVConnectome, NVLabel3D
**Status:** ✅ Completed

**Implementation Notes:**
- Pure functions extracted to ConnectomeManager.ts
- `loadConnectome()`, `loadConnectomeFromUrl()`, etc. remain in Niivue class as they are orchestration methods
- Label filtering functions (`getAllLabels`, `getConnectomeLabels`) extracted as pure functions
- Niivue class delegates to ConnectomeManager functions and maintains backward compatibility

---

#### 2.4 FileLoader Module
**File:** `packages/niivue/src/niivue/data/FileLoader.ts`
**Responsibility:** File loading, format detection, drag-and-drop
**Line Range:** ~2747-3070
**Key Methods:**
- `handleDragEnter()`, `handleDragOver()` ✅ - Drag-and-drop event handlers
- `getFileExt()` ✅ - File extension detection
- `isMeshExt()` ✅ - Check if file is mesh format
- `getMediaByUrl()` ✅ - Retrieve loaded media by URL
- `removeVolumeByUrl()` - Remains in Niivue (delegates to getMediaByUrl + removeVolume)
- `readDirectory()` ✅ - Directory reading
- `traverseFileTree()` ✅ - File tree traversal
- `readFileAsDataURL()` ✅ - Read file as data URL
- `registerLoader()` ✅ - Register custom loader (used by useLoader)
- `getLoader()` ✅ - Get loader for extension
- `isDicomExtension()` ✅ - Check if extension is DICOM
- `useDicomLoader()`, `getDicomLoader()` - Remain in Niivue (simple property setters/getters)

**Exported Constants:**
- `MESH_EXTENSIONS` ✅ - Array of mesh file extensions

**Exported Types:**
- `DicomLoaderInput`, `DicomLoader` ✅ - DICOM loader types
- `CustomLoader`, `LoaderRegistry` ✅ - Custom loader types
- `MeshLoaderResult` ✅ - Mesh loader result type
- `GetFileExtOptions`, `RegisterLoaderParams` ✅ - Function parameter types

**Properties:**
- `loaders: LoaderRegistry` ✅ - Now typed with LoaderRegistry
- `dicomLoader: DicomLoader | null` ✅ - Now typed with FileLoader.DicomLoader

**Dependencies:** NVImage, NVMesh, logger
**Status:** ✅ Completed

**Implementation Notes:**
- Pure functions extracted to FileLoader.ts
- All functions use pure functional approach
- MESH_EXTENSIONS constant moved from Niivue class to FileLoader module
- DicomLoaderInput and DicomLoader types moved to FileLoader and re-exported for backward compatibility
- Niivue class delegates to FileLoader functions and maintains backward compatibility

---

### Phase 3: Rendering Modules

#### 3.1 SliceRenderer Module
**File:** `packages/niivue/src/niivue/rendering/SliceRenderer.ts`
**Responsibility:** 2D slice rendering helper functions
**Key Functions Extracted:**
- `updateInterpolation()` ✅ - Texture interpolation mode (nearest/linear)
- `parseMosaicString()` ✅ - Parse mosaic specification strings
- `calculateMosaicLayout()` ✅ - Calculate tile positions for mosaics
- `getCrossLinesForSliceType()` ✅ - Get lines arrays for slice orientation
- `getSliceDimension()` ✅ - Get dimension index for slice type
- `getSliceAngles()` ✅ - Calculate azimuth/elevation angles
- `determineRadiologicalConvention()` ✅ - Determine radiological convention
- `calculateSliceDimensions()` ✅ - Calculate slice dimensions preserving aspect ratio

**Niivue Methods Updated:**
- `updateInterpolation()` - Delegates to SliceRenderer.updateInterpolation()
- `calculateWidthHeight()` - Delegates to SliceRenderer.calculateSliceDimensions()
- `drawCrossLinesMM()` - Uses getCrossLinesForSliceType helper
- `drawCrossLines()` - Uses getCrossLinesForSliceType helper

**Implementation Notes:**
- Pure functions pattern following established conventions
- Line calculation logic kept inline in drawCrossLinesMM to avoid per-frame object allocations that caused memory pressure during parallel test execution
- Complex rendering methods (draw2DMain, drawMosaic) remain in Niivue class due to heavy WebGL state dependencies

**Dependencies:** SLICE_TYPE from nvdocument
**Status:** ✅ Completed

---

#### 3.2 VolumeRenderer Module
**File:** `packages/niivue/src/niivue/rendering/VolumeRenderer.ts`
**Responsibility:** 3D volume rendering (ray-casting, MIP, etc.)
**Key Functions Extracted:**
- `sph2cartDeg()` ✅ - Convert spherical coordinates to Cartesian
- `calculateModelMatrix()` ✅ - Compute model transformation matrix
- `calculateRayDirection()` ✅ - Calculate normalized ray direction for volume rendering
- `gradientGL()` ✅ - Gradient texture generation for lighting
- `getGradientTextureData()` ✅ - Retrieve gradient data as TypedArray
- `setCustomGradientTexture()` ✅ - Set custom gradient textures
- `drawImage3D()` ✅ - 3D volume rendering

**Niivue Methods Updated:**
- `sph2cartDeg()` - Delegates to VolumeRenderer.sph2cartDeg()
- `calculateModelMatrix()` - Delegates to VolumeRenderer.calculateModelMatrix()
- `calculateRayDirection()` - Delegates to VolumeRenderer.calculateRayDirection()
- `gradientGL()` - Delegates to VolumeRenderer.gradientGL()
- `getGradientTextureData()` - Delegates to VolumeRenderer.getGradientTextureData()
- `setCustomGradientTexture()` - Delegates to VolumeRenderer.setCustomGradientTexture()
- `drawImage3D()` - Delegates to VolumeRenderer.drawImage3D()

**Properties (remain in Niivue class - tightly coupled to WebGL state):**
- `gradientTexture: WebGLTexture`
- `gradientTextureAmount`
- `useCustomGradientTexture`
- `renderGradientValues`

**Implementation Notes:**
- Pure functions pattern following established conventions
- All functions accept required dependencies as parameters
- Functions with >3 parameters use object parameters for clarity
- State management remains in Niivue class; pure functions handle computation

**Dependencies:** gl-matrix, Shader, NiivueObject3D, NiftiHeader
**Status:** ✅ Completed

---

#### 3.3 MeshRenderer Module
**File:** `packages/niivue/src/niivue/rendering/MeshRenderer.ts`
**Responsibility:** 3D mesh rendering
**Key Functions Extracted:**
- `shouldRenderMesh()` ✅ - Determine if mesh should be rendered
- `selectMeshShader()` ✅ - Select appropriate shader for mesh
- `calculateMeshAlpha()` ✅ - Calculate combined alpha value
- `isFiberMesh()` ✅ - Check if mesh is fiber-based
- `calculateCrosscutSlice()` ✅ - Calculate crosscut slice position for 2D views
- `getMeshThickness()` ✅ - Get valid mesh thickness value
- `configureMeshGLState()` ✅ - Configure WebGL state for rendering
- `setupCrosscutShader()` ✅ - Setup crosscut shader uniforms
- `setMeshUniforms()` ✅ - Set common mesh shader uniforms
- `bindMatcapTexture()` ✅ - Bind matcap texture
- `drawSingleMesh()` ✅ - Draw single mesh using VAO
- `drawFiberMesh()` ✅ - Draw fiber mesh using line strips
- `configureXRayPass()` ✅ - Configure GL state for X-ray pass
- `resetAfterXRayPass()` ✅ - Reset GL state after X-ray
- `resetMeshGLState()` ✅ - Reset GL state after mesh rendering
- `drawMesh3D()` ✅ - Full mesh 3D rendering pass

**Niivue Methods Updated:**
- `drawMesh3D()` - Delegates to MeshRenderer.drawMesh3D()

**Implementation Notes:**
- Pure functions pattern following established conventions
- All functions accept required dependencies as parameters
- Functions with >3 parameters use object parameters for clarity
- WebGL state management encapsulated in helper functions

**Dependencies:** NVMesh, Shader, gl-matrix
**Status:** ✅ Completed

---

#### 3.4 SceneRenderer Module
**File:** `packages/niivue/src/niivue/rendering/SceneRenderer.ts`
**Responsibility:** Overall scene composition and rendering orchestration
**Key Functions Extracted:**
- `calculateMvpMatrix()` ✅ - Build MVP, Model, and Normal matrices
- `calculatePivot3D()` ✅ - Calculate 3D pivot point and scene scale
- `scaleSlice()` ✅ - Calculate scaled dimensions for slice panels
- `effectiveCanvasWidth()` ✅ - Calculate effective canvas width
- `effectiveCanvasHeight()` ✅ - Calculate effective canvas height
- `getMaxVols()` ✅ - Get maximum number of 4D volumes
- `getBoundsRegion()` ✅ - Get bounds region for rendering
- `clearBounds()` ✅ - Clear specified region with scissor test
- `setupViewport()` ✅ - Setup viewport for rendering
- `calculatePadPixels()` ✅ - Calculate padding for grid layouts
- `determineLayoutType()` ✅ - Determine optimal layout type

**Niivue Methods Updated:**
- `calculateMvpMatrix()` - Delegates to SceneRenderer.calculateMvpMatrix()
- `setPivot3D()` - Delegates to SceneRenderer.calculatePivot3D()
- `getMaxVols()` - Delegates to SceneRenderer.getMaxVols()

**Properties (remain in Niivue class):**
- `isBusy`, `needsRefresh` - Rendering state flags
- Scene-related matrices and transforms

**Implementation Notes:**
- Pure functions pattern following established conventions
- `drawSceneCore()` and `drawScene()` remain in Niivue class due to heavy state dependencies
- Helper functions extracted for matrix calculations and layout computations
- Niivue class maintains backward compatibility through delegation

**Dependencies:** gl-matrix, deg2rad utility
**Status:** ✅ Completed

---

#### 3.5 UIElementRenderer Module
**File:** `packages/niivue/src/niivue/rendering/UIElementRenderer.ts`
**Responsibility:** Render UI overlays (colorbar, labels, rulers, etc.)
**Key Functions Extracted:**
- `calculateTextWidth()` ✅ - Calculate pixel width of text string
- `calculateTextHeight()` ✅ - Calculate pixel height of text
- `calculateTextBelowPosition()` ✅ - Calculate text position centered below a point
- `calculateTextAbovePosition()` ✅ - Calculate text position centered above a point
- `calculateTextBetweenPosition()` ✅ - Calculate text position between two points
- `getTextBetweenBackgroundColor()` ✅ - Determine background color for text
- `calculateRulerGeometry()` ✅ - Calculate ruler geometry for 10cm ruler
- `getRulerOutlineColor()` ✅ - Determine ruler outline color
- `calculateRulerTicks()` ✅ - Calculate tick mark positions for ruler
- `extendMeasurementLine()` ✅ - Calculate extended line coordinates for measurement tool
- `calculateDottedLineSegments()` ✅ - Calculate dotted line segments
- `calculateThumbnailDimensions()` ✅ - Calculate thumbnail dimensions to fit region
- `calculateScreenPxRange()` ✅ - Calculate screen pixel range for MSDF font rendering
- `calculateOrientationCubePosition()` ✅ - Calculate orientation cube position and size
- `calculateGraphLayout()` ✅ - Calculate graph layout dimensions
- `calculateGraphColors()` ✅ - Calculate graph background colors
- `calculateGraphLineStride()` ✅ - Calculate stride for graph vertical lines
- `calculateTickSpacing()` ✅ - Calculate tick spacing for colorbar/graph axis
- `humanizeNumber()` ✅ - Format number by dropping trailing zeros
- `calculateBulletMarginWidth()` ✅ - Calculate bullet margin width for labels
- `calculateLegendPanelHeight()` ✅ - Calculate legend panel height
- `calculateLegendPanelWidth()` ✅ - Calculate legend panel width
- `calculateColorbarPanel()` ✅ - Calculate colorbar panel area

**Niivue Methods Updated:**
- `textWidth()` - Delegates to UIElementRenderer.calculateTextWidth()
- `textHeight()` - Delegates to UIElementRenderer.calculateTextHeight()
- `drawTextBelow()` - Uses UIElementRenderer.calculateTextBelowPosition()
- `drawTextAbove()` - Uses UIElementRenderer.calculateTextAbovePosition()
- `drawTextBetween()` - Uses UIElementRenderer.calculateTextBetweenPosition()
- `drawRuler()` - Uses UIElementRenderer.calculateRulerGeometry()
- `drawRuler10cm()` - Uses UIElementRenderer.calculateRulerTicks()
- `drawMeasurementTool()` - Uses UIElementRenderer.extendMeasurementLine()
- `drawDottedLine()` - Uses UIElementRenderer.calculateDottedLineSegments()
- `drawThumbnail()` - Uses UIElementRenderer.calculateThumbnailDimensions()

**Properties (remain in Niivue class - tightly coupled to WebGL state):**
- `fontShader`, `fontTexture`, `fontMets`, `fontPx`
- `colorbarHeight`
- `legendFontScaling`
- `bmpShader`, `bmpTexture`, `bmpTextureWH`, `thumbnailVisible`

**Implementation Notes:**
- Pure functions pattern following established conventions
- All calculation logic extracted to pure functions
- WebGL rendering methods remain in Niivue class due to heavy state dependencies
- Niivue class delegates to UIElementRenderer functions and maintains backward compatibility

**Dependencies:** gl-matrix, NVLabel3D
**Status:** ✅ Completed

---

### Phase 4: Interaction Modules

#### 4.1 EventController Module
**File:** `packages/niivue/src/niivue/interaction/EventController.ts`
**Responsibility:** Central event listener registration and management
**Key Functions Extracted:**
- `getRelativeMousePosition()` ✅ - Mouse position calculation
- `getNoPaddingNoBorderCanvasRelativeMousePosition()` ✅ - Adjusted mouse position
- `calculateDpr()` ✅ - Calculate device pixel ratio
- `calculateResizeDimensions()` ✅ - Calculate resize dimensions
- `createResizeHandler()` ✅ - Create debounced resize handler
- `createResizeObserver()` ✅ - Create ResizeObserver instance
- `createCanvasObserver()` ✅ - Create MutationObserver instance
- `applyCanvasResizeStyles()` ✅ - Apply canvas resize styles
- `isValidForResize()` ✅ - Type guard for resize validation
- `cleanupResizeObservers()` ✅ - Clean up resize observers
- `cleanupEventController()` ✅ - Clean up event controller

**Niivue Methods Updated:**
- `getRelativeMousePosition()` - Delegates to EventController.getRelativeMousePosition()
- `getNoPaddingNoBorderCanvasRelativeMousePosition()` - Delegates to EventController.getNoPaddingNoBorderCanvasRelativeMousePosition()
- `resizeListener()` - Uses EventController.calculateResizeDimensions() and applyCanvasResizeStyles()
- `attachToCanvas()` - Uses EventController.createResizeHandler(), createResizeObserver(), createCanvasObserver()
- `cleanup()` - Uses EventController.cleanupResizeObservers() and cleanupEventController()

**Properties (remain in Niivue class - state management):**
- `resizeObserver`, `resizeEventListener`, `canvasObserver`
- `#eventsController` (private)

**Implementation Notes:**
- Pure functions pattern following established conventions
- All functions accept required dependencies as parameters
- Factory functions for creating observers with callbacks
- Cleanup functions for proper resource disposal
- `registerInteractions()` remains in Niivue class due to complex handler binding requirements

**Dependencies:** None (pure event handling)
**Status:** ✅ Completed

---

#### 4.2 MouseController Module
**File:** `packages/niivue/src/niivue/interaction/MouseController.ts`
**Responsibility:** Mouse event handling helper functions
**Key Functions Extracted:**
- `getMouseButtonDragMode()` ✅ - Determine drag mode from button/modifiers
- `determineButtonState()` ✅ - Determine which button flags to set
- `calculateMouseDownPosition()` ✅ - Calculate scaled mouse down position
- `calculateMouseMovePosition()` ✅ - Calculate mouse move delta and new position
- `initializeDragState()` ✅ - Initialize drag state for drag operations
- `createResetButtonState()` ✅ - Create reset state for button flags
- `hasDragMoved()` ✅ - Check if drag has moved
- `isOffCanvas()` ✅ - Check if position is off canvas
- `createOffCanvasPosition()` ✅ - Create off-canvas position marker
- `calculateWindowingValues()` ✅ - Calculate cal_min/cal_max for windowing drag
- `getNextAngleState()` ✅ - Determine next angle measurement state
- `isAngleMeasurementInProgress()` ✅ - Check if angle measurement is in progress
- `shouldTrackDrag()` ✅ - Check if drag mode should track drag start/end
- `isFunction()` ✅ - Check if value is a function

**Exported Constants:**
- `LEFT_MOUSE_BUTTON`, `CENTER_MOUSE_BUTTON`, `RIGHT_MOUSE_BUTTON` ✅

**Niivue Methods Updated:**
- `getMouseButtonDragMode()` - Delegates to MouseController.getMouseButtonDragMode()
- `mouseDown()` - Uses MouseController.calculateMouseDownPosition()
- `updateMousePos()` - Uses MouseController.calculateMouseDownPosition()
- `mouseMove()` - Uses MouseController.calculateMouseMovePosition()
- `mouseLeaveListener()` - Uses MouseController.createResetButtonState() and createOffCanvasPosition()
- `mouseUpListener()` - Uses MouseController.isFunction()
- `calculateNewRange()` - Uses MouseController.hasDragMoved()

**Properties (remain in Niivue class - state management):**
- `uiData.mousedown`, `uiData.mouseButtonLeftDown`, etc.
- `uiData.prevX`, `uiData.prevY`, `uiData.currX`, `uiData.currY`
- `mousePos` - Current mouse position

**Implementation Notes:**
- Pure functions pattern following established conventions
- Event listener methods remain in Niivue class due to heavy state dependencies
- Pure functions handle calculation logic; state management stays in Niivue
- Mouse button constants moved from Niivue class to MouseController module

**Dependencies:** DRAG_MODE, MouseEventConfig, vec4
**Status:** ✅ Completed

---

#### 4.3 TouchController Module
**File:** `packages/niivue/src/niivue/interaction/TouchController.ts`
**Responsibility:** Touch event handling helper functions
**Key Functions Extracted:**
- `getTouchDragMode()` ✅ - Determine drag mode for touch
- `calculateTouchPosition()` ✅ - Calculate touch position relative to canvas
- `detectDoubleTap()` ✅ - Detect double tap based on timing
- `initializeTouchState()` ✅ - Initialize touch state on touch start
- `createTouchEndState()` ✅ - Create reset state for touch end
- `createNewTouchSequenceState()` ✅ - Reset state for new touch sequence
- `createDoubleTapState()` ✅ - Create state for double tap
- `calculatePinchZoom()` ✅ - Calculate pinch-to-zoom gesture
- `shouldProcessPinchZoom()` ✅ - Check if pinch zoom should be processed
- `initializeTouchDragState()` ✅ - Initialize drag state for touch
- `calculateTouchMovePosition()` ✅ - Calculate touch move position values
- `shouldSimulateMouseBehavior()` ✅ - Determine if touch should simulate mouse
- `isSingleFingerTouch()` ✅ - Check for single-finger touch
- `isMultiFingerGesture()` ✅ - Check for multi-finger gesture
- `getMousePosFromTouch()` ✅ - Convert touch to mouse position array
- `shouldUpdateDoubleTouchDrag()` ✅ - Check if double touch drag should update
- `shouldStartLongPressTimer()` ✅ - Check if long press timer should start

**Niivue Methods Updated:**
- `getTouchDragMode()` - Delegates to TouchController.getTouchDragMode()
- `checkMultitouch()` - Uses TouchController.shouldSimulateMouseBehavior() and calculateTouchPosition()
- `touchStartListener()` - Uses TouchController.initializeTouchState(), detectDoubleTap(), createDoubleTapState(), etc.
- `touchEndListener()` - Uses TouchController.createTouchEndState()
- `touchMoveListener()` - Uses TouchController.isSingleFingerTouch(), shouldUpdateDoubleTouchDrag(), calculateTouchMovePosition()
- `handlePinchZoom()` - Uses TouchController.shouldProcessPinchZoom(), calculatePinchZoom(), getMousePosFromTouch()

**Properties (remain in Niivue class - state management):**
- `uiData.touchdown`, `uiData.doubleTouch`
- `uiData.currentTouchTime`, `uiData.lastTouchTime`, `uiData.touchTimer`
- `uiData.lastTwoTouchDistance`, `uiData.multiTouchGesture`

**Implementation Notes:**
- Pure functions pattern following established conventions
- Event listener methods remain in Niivue class due to heavy state dependencies
- Pure functions handle calculation logic; state management stays in Niivue
- All functions use object parameters for clarity when >3 parameters

**Dependencies:** gl-matrix (vec4), DRAG_MODE, TouchEventConfig
**Status:** ✅ Completed

---

#### 4.4 KeyboardController Module
**File:** `packages/niivue/src/niivue/interaction/KeyboardController.ts`
**Responsibility:** Keyboard event handling helper functions
**Key Functions Extracted:**
- `getKeyDownAction()` ✅ - Determine action from key event
- `getNextDragMode()` ✅ - Calculate next drag mode
- `shouldProcessKey()` ✅ - Debounce check for key events
- `cycleActiveClipPlane()` ✅ - Cycle to next clip plane index
- `getNextClipPlanePreset()` ✅ - Get next clip plane preset values
- `getNextViewMode()` ✅ - Get next slice type for view mode cycling
- `isHotkeyMatch()` ✅ - Check if key matches hotkey

**Exported Constants:**
- `CLIP_PLANE_PRESETS` ✅ - Array of clip plane depth/azi/elev values

**Niivue Methods Updated:**
- `cycleActiveClipPlane()` - Delegates to KeyboardController.cycleActiveClipPlane()
- `keyUpListener()` - Uses KeyboardController.shouldProcessKey(), isHotkeyMatch(), getNextClipPlanePreset(), getNextViewMode()
- `keyDownListener()` - Uses KeyboardController.getKeyDownAction(), getNextDragMode()

**Implementation Notes:**
- Pure functions pattern following established conventions
- Event listener methods remain in Niivue class due to heavy state dependencies
- All functions accept required dependencies as parameters
- Functions with >3 parameters use object parameters for clarity

**Dependencies:** DRAG_MODE, SLICE_TYPE from nvdocument
**Status:** ✅ Completed

---

#### 4.5 WheelController Module
**File:** `packages/niivue/src/niivue/interaction/WheelController.ts`
**Responsibility:** Mouse wheel/trackpad scrolling helper functions
**Key Functions Extracted:**
- `calculateScrollAmount()` ✅ - Calculate normalized scroll amount
- `isValidRoiResize()` ✅ - Check if ROI selection resize is valid
- `updateRoiSelection()` ✅ - Calculate updated ROI bounds
- `getRoiScrollDelta()` ✅ - Get scroll delta direction for ROI
- `calculateZoom()` ✅ - Calculate zoom level and change
- `calculatePanOffsetAfterZoom()` ✅ - Calculate pan offset to keep crosshair in place
- `adjustSegmentThreshold()` ✅ - Adjust click-to-segment threshold
- `determineWheelAction()` ✅ - Determine if wheel event should be processed
- `shouldApplyZoom()` ✅ - Check if zoom should be applied
- `getWheelEventPosition()` ✅ - Get mouse position from wheel event

**Niivue Methods Updated:**
- `wheelListener()` - Delegates to WheelController helper functions

**Implementation Notes:**
- Pure functions pattern following established conventions
- Event listener method remains in Niivue class due to heavy state dependencies
- All functions accept required dependencies as parameters
- Functions with >3 parameters use object parameters for clarity

**Dependencies:** DRAG_MODE from nvdocument
**Status:** ✅ Completed

---

#### 4.6 DragModeManager Module
**File:** `packages/niivue/src/niivue/interaction/DragModeManager.ts`
**Responsibility:** Manage different drag interaction modes
**Key Functions Extracted:**
- `parseDragModeString()` ✅ - Convert string to DRAG_MODE enum
- `getCurrentDragModeValue()` ✅ - Get current drag mode or fallback
- `createClearedDragModeState()` ✅ - Create state for cleared drag mode
- `createActiveDragModeState()` ✅ - Create state for active drag mode
- `calculateMinMaxVoxIdx()` ✅ - Calculate min/max voxel indices
- `calculateAngleBetweenLines()` ✅ - Calculate angle between two lines
- `createResetAngleMeasurementState()` ✅ - Reset angle measurement state
- `calculateDragPosition()` ✅ - Scale position by dpr
- `calculatePanZoomFromDrag()` ✅ - Calculate pan offset from drag
- `calculateSlicer3DZoomFromDrag()` ✅ - Calculate 3D slicer zoom
- `calculateWindowingAdjustment()` ✅ - Calculate windowing cal_min/cal_max
- `calculateIntensityRangeFromVoxels()` ✅ - Calculate intensity range from voxel region
- `adjustRangesForConstantDimension()` ✅ - Adjust ranges for constant dimensions
- `shouldTrackDragPositions()` ✅ - Check if drag mode tracks positions
- `getNextAngleMeasurementState()` ✅ - Get next angle measurement state
- `isAngleDragMode()`, `isContrastDragMode()`, etc. ✅ - Drag mode type checks

**Niivue Methods Updated:**
- `calculateMinMaxVoxIdx()` - Delegates to DragModeManager.calculateMinMaxVoxIdx()
- `calculateNewRange()` - Uses DragModeManager helper functions
- `setDragStart()`, `setDragEnd()` - Uses DragModeManager.calculateDragPosition()
- `windowingHandler()` - Uses DragModeManager.calculateWindowingAdjustment()
- `setActiveDragMode()` - Uses DragModeManager.createActiveDragModeState()
- `getCurrentDragMode()` - Uses DragModeManager.getCurrentDragModeValue()
- `clearActiveDragMode()` - Uses DragModeManager.createClearedDragModeState()
- `setDragMode()` - Uses DragModeManager.parseDragModeString()
- `calculateAngleBetweenLines()` - Delegates to DragModeManager
- `resetAngleMeasurement()` - Uses DragModeManager.createResetAngleMeasurementState()
- `dragForPanZoom()` - Uses DragModeManager.calculatePanZoomFromDrag()
- `dragForSlicer3D()` - Uses DragModeManager.calculateSlicer3DZoomFromDrag()

**Properties (remain in Niivue class - state management):**
- `uiData.isDragging`, `uiData.dragStart`, `uiData.dragEnd`
- `uiData.activeDragMode`, `uiData.activeDragButton`
- `uiData.windowX`, `uiData.windowY`
- `uiData.angleFirstLine`, `uiData.angleState`
- `uiData.dragClipPlaneStartDepthAziElev`
- `opts.dragMode`, `opts.mouseButtonConfig`, `opts.touchConfig`

**Implementation Notes:**
- Pure functions pattern following established conventions
- Event listener methods remain in Niivue class due to heavy state dependencies
- All calculation logic extracted to pure functions
- State management stays in Niivue class

**Dependencies:** gl-matrix (vec4), DRAG_MODE from nvdocument
**Status:** ✅ Completed

---

### Phase 5: Navigation & Layout Modules

#### 5.1 SliceNavigation Module
**File:** `packages/niivue/src/niivue/navigation/SliceNavigation.ts`
**Responsibility:** Slice plane navigation and positioning
**Line Range:** ~4805-4855, ~10091-10292
**Key Methods:**
- `sliceScroll2D()` - Scroll through 2D slices
- `sliceScroll3D()` - Scroll in 3D rendering
- `setSliceType()` - Change slice orientation
- `moveCrosshairInVox()` - Move crosshair in voxel coordinates
- `getCurrentSliceInfo()` - Get current slice information
- `getCurrentSlicePosition()` - Get slice position
- `mouseClick()` - Handle slice navigation clicks
- `tileIndex()` - Get tile index from screen position
- `inRenderTile()`, `inGraphTile()` - Check if position is in tile
- `inBounds()` - Check if coordinates are in bounds

**Properties to migrate:**
- `opts.sliceType`
- `scene.crosshairPos`
- `screenSlices` array

**Dependencies:** CoordinateTransform, SliceRenderer
**Status:** ✅ Completed

**Implementation Notes:**
- Pure functions extracted to SliceNavigation.ts
- Key functions: `findTileIndex()`, `findRenderTileIndex()`, `isInGraphTile()`, `isInBounds()`, `getSlicePosition()`, `getCurrentSliceInfo()`, `shouldDrawOnCurrentSlice()`, `calculateSliceScroll3D()`, `calculateZoomScroll()`, `calculateMoveCrosshairInVox()`, `shouldProcessScroll()`, `shouldApplyZoomScroll()`
- Niivue class delegates to SliceNavigation functions and maintains backward compatibility
- All functions use object parameters when >3 parameters for clarity

---

#### 5.2 LayoutManager Module
**File:** `packages/niivue/src/niivue/navigation/LayoutManager.ts`
**Responsibility:** Manage multiplanar layouts, tile arrangements, and canvas dimension calculations
**Key Functions Extracted:**
- `validateCustomLayout()` ✅ - Validate custom layout for overlapping tiles
- `calculateBoundsRegion()` ✅ - Calculate bounds region in device pixels
- `calculateBoundsRegionCSS()` ✅ - Calculate bounds region in CSS pixels
- `calculateEffectiveCanvasHeight()` ✅ - Calculate canvas height minus colorbar
- `calculateEffectiveCanvasWidth()` ✅ - Calculate canvas width minus legend panel
- `calculateSliceScale()` ✅ - Calculate volume scaling factors and voxel dimensions
- `calculateXyMM2xyzMM()` ✅ - Compute plane in mm space for slice orientation
- `calculateBulletMarginWidth()` ✅ - Calculate bullet margin width for labels
- `calculateLegendPanelWidth()` ✅ - Calculate legend panel width
- `calculateLegendPanelHeight()` ✅ - Calculate legend panel height
- `calculateColorbarPanel()` ✅ - Calculate colorbar panel area
- `isPointInBoundsCSS()` ✅ - Check if point is inside CSS bounds region
- `isCursorInBounds()` ✅ - Check if cursor is inside bounds region
- `getSliceDimension()` ✅ - Get dimension index for slice type
- `calculateScreenFieldOfViewVox()` ✅ - Get FOV in voxels for slice orientation
- `calculateScreenFieldOfViewMM()` ✅ - Get FOV in mm for slice orientation
- `calculateScreenFieldOfViewExtendedVox()` ✅ - Extended FOV in voxels
- `calculateScreenFieldOfViewExtendedMM()` ✅ - Extended FOV in mm

**Niivue Methods Updated:**
- `setCustomLayout()` - Uses LayoutManager.validateCustomLayout()
- `getBoundsRegion()` - Delegates to LayoutManager.calculateBoundsRegion()
- `getBoundsRegionCSS()` - Delegates to LayoutManager.calculateBoundsRegionCSS()
- `effectiveCanvasHeight()` - Delegates to LayoutManager.calculateEffectiveCanvasHeight()
- `effectiveCanvasWidth()` - Delegates to LayoutManager.calculateEffectiveCanvasWidth()
- `sliceScale()` - Delegates to LayoutManager.calculateSliceScale()
- `xyMM2xyzMM()` - Delegates to LayoutManager.calculateXyMM2xyzMM()
- `getBulletMarginWidth()` - Delegates to LayoutManager.calculateBulletMarginWidth()
- `getLegendPanelWidth()` - Delegates to LayoutManager.calculateLegendPanelWidth()
- `getLegendPanelHeight()` - Delegates to LayoutManager.calculateLegendPanelHeight()
- `reserveColorbarPanel()` - Delegates to LayoutManager.calculateColorbarPanel()
- `cursorInBounds()` - Delegates to LayoutManager.isCursorInBounds()
- `eventInBounds()` - Uses LayoutManager.isPointInBoundsCSS()

**Properties (remain in Niivue class - state management):**
- `opts.multiplanarLayout`, `opts.multiplanarPadPixels`
- `customLayout` array
- `graph` object
- `screenSlices`
- `colorbarHeight`

**Implementation Notes:**
- Pure functions pattern following established conventions
- All functions accept required dependencies as parameters
- Functions with >3 parameters use object parameters for clarity
- Simple setter methods (setMultiplanarLayout, setMultiplanarPadPixels, setHeroImage, clearCustomLayout, getCustomLayout) remain in Niivue class as they primarily set options and call drawScene()
- Niivue class delegates to LayoutManager functions and maintains backward compatibility

**Dependencies:** gl-matrix, SLICE_TYPE from nvdocument
**Status:** ✅ Completed

---

#### 5.3 CameraController Module
**File:** `packages/niivue/src/niivue/navigation/CameraController.ts`
**Responsibility:** 3D camera rotation calculations
**Key Functions Extracted:**
- `normalizeAzimuth()` ✅ - Normalize azimuth angle to 0-360 range
- `clampElevation()` ✅ - Clamp elevation angle to valid range
- `calculateDragRotation()` ✅ - Calculate azimuth/elevation from mouse drag
- `shouldUpdateCameraRotation()` ✅ - Check if drag is significant enough to update
- `calculateKeyboardRotation()` ✅ - Calculate rotation from keyboard input

**Niivue Methods Updated:**
- `mouseMove()` - Uses CameraController.shouldUpdateCameraRotation() and calculateDragRotation()

**Methods Unchanged (simple setters don't benefit from extraction):**
- `setRenderAzimuthElevation()` - Direct property assignment
- `setPan2Dxyzmm()` - Direct property assignment
- `setScale()` - Direct property assignment

**Properties (remain in Niivue class - state management):**
- `scene.renderAzimuth`, `scene.renderElevation`
- `scene.pan2Dxyzmm`
- `scene.volScaleMultiplier`

**Implementation Notes:**
- Pure functions pattern following established conventions
- Only functions with actual computation logic were extracted
- Simple pass-through "prepare" functions were intentionally avoided
- `sph2cartDeg()` remains in VolumeRenderer.ts (already extracted in Phase 3.2)

**Dependencies:** None
**Status:** ✅ Completed

---

#### 5.4 ClipPlaneManager Module
**File:** `packages/niivue/src/niivue/navigation/ClipPlaneManager.ts`
**Responsibility:** Manage clipping planes for 3D rendering
**Key Functions Extracted:**
- `depthAziElevToClipPlane()` ✅ - Convert depth/azimuth/elevation to clip plane format (with 180° offset)
- `depthAziElevToClipPlaneNoOffset()` ✅ - Convert depth/azimuth/elevation to clip plane format (no offset)
- `calculateClipPlaneDrag()` ✅ - Calculate new azimuth/elevation from drag deltas
- `ensureClipPlaneArrays()` ✅ - Ensure clip plane arrays exist and are large enough
- `isClipPlaneActive()` ✅ - Check if clip plane is active (depth below threshold)
- `convertMultipleClipPlanes()` ✅ - Convert array of depth/azi/elev to clip planes
- `shouldUpdateClipPlaneDrag()` ✅ - Check if clip plane drag should update view
- `createDefaultClipPlane()` ✅ - Create default disabled clip plane
- `createDefaultDepthAziElev()` ✅ - Create default depth/azimuth/elevation values
- `updateClipPlaneAtIndex()` ✅ - Update clip plane at specific index
- `isValidDepthAziElev()` ✅ - Validate depth/azimuth/elevation input

**Exported Constants:**
- `DEFAULT_CLIP_PLANE` ✅ - Default clip plane [0, 0, 0, 2]
- `DEFAULT_DEPTH_AZI_ELEV` ✅ - Default depth/azi/elev [2, 0, 0]
- `CLIP_PLANE_ACTIVE_THRESHOLD` ✅ - Threshold for active clip plane (1.8)

**Niivue Methods Updated:**
- `setClipPlane()` - Delegates to ClipPlaneManager.updateClipPlaneAtIndex()
- `setClipPlanes()` - Delegates to ClipPlaneManager.convertMultipleClipPlanes()
- `drawSceneCore()` - Uses ClipPlaneManager.shouldUpdateClipPlaneDrag() and calculateClipPlaneDrag()

**Properties (remain in Niivue class - state management):**
- `scene.clipPlanes`, `scene.clipPlaneDepthAziElevs`
- `uiData.activeClipPlaneIndex`
- `uiData.dragClipPlaneStartDepthAziElev`

**Implementation Notes:**
- Pure functions pattern following established conventions
- `setClipPlaneColor()` remains in Niivue class (requires WebGL shader state)
- `setClipPlaneThick()` and `setClipVolume()` are deprecated stubs
- `cycleActiveClipPlane()` remains in KeyboardController (already extracted there)
- All functions accept required dependencies as parameters
- Functions with >3 parameters use object parameters for clarity

**Dependencies:** VolumeRenderer (sph2cartDeg)
**Status:** ✅ Completed

---

### Phase 6: Drawing Tools Modules

#### 6.1 DrawingManager Module
**File:** `packages/niivue/src/niivue/drawing/DrawingManager.ts`
**Responsibility:** Drawing state management and undo/redo
**Key Functions Extracted:**
- `clearAllUndoBitmaps()` ✅ - Clear undo history (pure function)
- `addUndoBitmap()` ✅ - Save undo state with RLE compression (pure function)
- `calculateLoadDrawingTransform()` ✅ - Calculate permutation transform for loading drawings
- `transformBitmap()` ✅ - Transform bitmap using lookup tables
- `validateDrawingDimensions()` ✅ - Validate drawing dimensions match background
- `isDrawingInitialized()` ✅ - Check if drawing bitmap exists
- `calculateVoxelCount()` ✅ - Calculate total voxels from dimensions
- `createEmptyBitmap()` ✅ - Create empty Uint8Array bitmap
- `determineBitmapDataSource()` ✅ - Determine which bitmap to use (main or clickToSegment)
- `createDisabledDrawingState()` ✅ - Reset drawing state when disabled
- `adjustDimensionsForSpecialCase()` ✅ - Handle 2x2x2 texture special case
- `validateBitmapLength()` ✅ - Validate bitmap length matches expected

**Niivue Methods Updated:**
- `drawClearAllUndoBitmaps()` - Delegates to DrawingManager.clearAllUndoBitmaps()
- `drawAddUndoBitmap()` - Delegates to DrawingManager.addUndoBitmap()
- `loadDrawing()` - Uses DrawingManager transform functions
- `createEmptyDrawing()` - Uses DrawingManager.calculateVoxelCount() and createEmptyBitmap()
- `setDrawingEnabled()` - Uses DrawingManager.createDisabledDrawingState()
- `refreshDrawing()` - Uses DrawingManager.determineBitmapDataSource() and validation functions

**Properties (remain in Niivue class - tightly coupled to WebGL state):**
- `drawTexture: WebGLTexture`
- `paqdTexture: WebGLTexture`
- `drawUndoBitmaps: Uint8Array[]`
- `drawLut` - Drawing color lookup table
- `drawOpacity`, `drawRimOpacity`
- `renderDrawAmbientOcclusion`
- `opts.drawingEnabled`

**Implementation Notes:**
- Pure functions pattern following established conventions
- All functions accept required dependencies as parameters
- Functions with >3 parameters use object parameters for clarity
- WebGL texture operations remain in Niivue class
- Niivue class delegates to DrawingManager functions and maintains backward compatibility

**Dependencies:** @/drawing (encodeRLE, decodeRLE), @/logger
**Status:** ✅ Completed

---

#### 6.2 PenTool Module
**File:** `packages/niivue/src/niivue/drawing/PenTool.ts`
**Responsibility:** Pen drawing tool pure functions
**Key Functions Extracted:**
- `drawPoint()` ✅ - Draw single point with pen size handling
- `drawLine()` ✅ - Draw 3D line using Bresenham's algorithm
- `drawPenFilled()` ✅ - Fill interior of pen strokes
- `floodFillSection()` ✅ - Fill exterior regions of 2D bitmap (FIFO flood fill)
- `voxelIndex()` ✅ - Calculate voxel index from coordinates
- `clampToDimension()` ✅ - Clamp value to dimension bounds
- `getSliceIndices()` ✅ - Get horizontal/vertical indices for slice orientation
- `isPenLocationValid()` ✅ - Check if pen location is valid
- `isSamePoint()` ✅ - Check if two points are the same
- `createInitialPenState()` ✅ - Create initial pen state
- `createResetPenState()` ✅ - Create reset pen state

**Niivue Methods Updated:**
- `drawPt()` - Delegates to PenTool.drawPoint()
- `drawPenLine()` - Delegates to PenTool.drawLine()
- `drawPenFilled()` - Delegates to PenTool.drawPenFilled()
- `floodFillSectionFIFO()` - Delegates to PenTool.floodFillSection()

**Properties (remain in Niivue class - state management):**
- `drawPenLocation`, `drawPenAxCorSag`, `drawPenFillPts`
- `drawFillOverwrites`, `opts.penValue`, `opts.penSize`

**Implementation Notes:**
- Pure functions pattern following established conventions
- All functions accept required dependencies as parameters
- Functions with >3 parameters use object parameters for clarity
- State management remains in Niivue class; pure functions handle computation
- Removed unused `encodeRLE` and `decodeRLE` imports from Niivue class

**Dependencies:** @/drawing (decodeRLE), @/logger
**Status:** ✅ Completed

---

#### 6.3 ShapeTool Module
**File:** `packages/niivue/src/niivue/drawing/ShapeTool.ts`
**Responsibility:** Rectangle and ellipse drawing
**Key Functions Extracted:**
- `calculateBounds()` ✅ - Calculate clamped bounding box from two corner points
- `calculateEllipsoidGeometry()` ✅ - Calculate center and radii from bounding box
- `isPointInEllipsoid()` ✅ - Check if point is inside ellipsoid using standard equation
- `drawRectangle()` ✅ - Draw filled 3D rectangle (rectangular prism)
- `drawEllipse()` ✅ - Draw filled 3D ellipse (ellipsoid)
- `isShapeDrawingInProgress()` ✅ - Check if shape drawing is active
- `createInitialShapeState()` ✅ - Create initial shape state
- `createResetShapeState()` ✅ - Create reset shape state

**Niivue Methods Updated:**
- `drawRectangleMask()` - Delegates to ShapeTool.drawRectangle()
- `drawEllipseMask()` - Delegates to ShapeTool.drawEllipse()

**Properties (remain in Niivue class - state management):**
- `drawShapeStartLocation` - Start location for rectangle/ellipse drawing
- `drawShapePreviewBitmap` - Preview bitmap for shape drawing

**Implementation Notes:**
- Pure functions pattern following established conventions
- All functions accept required dependencies as parameters
- Functions with >3 parameters use object parameters for clarity
- State management remains in Niivue class; pure functions handle computation
- Uses PenTool.drawPoint() for drawing individual voxels with pen size support

**Dependencies:** PenTool (drawPoint, DrawPointParams)
**Status:** ✅ Completed

---

#### 6.4 FloodFillTool Module
**File:** `packages/niivue/src/niivue/drawing/FloodFillTool.ts`
**Responsibility:** Flood fill and click-to-segment
**Line Range:** ~6256-6679, ~10144-10292
**Key Methods:**
- `drawFloodFillCore()` - Core flood fill algorithm
- `doClickToSegment()` - Smart segmentation
- `updateBitmapFromClickToSegment()` - Update from segmentation

**Properties to migrate:**
- `clickToSegmentIsGrowing`
- `clickToSegmentGrowingBitmap`
- `clickToSegmentXY`
- `opts.clickToSegment`

**Dependencies:** DrawingManager, CoordinateTransform
**Status:** ⬜ Not Started

---

#### 6.5 GrowCutTool Module
**File:** `packages/niivue/src/niivue/drawing/GrowCutTool.ts`
**Responsibility:** GrowCut segmentation algorithm
**Line Range:** ~5789-5919
**Key Methods:**
- `drawGrowCut()` - Execute GrowCut algorithm

**Properties to migrate:**
- `growCutShader: Shader`

**Dependencies:** DrawingManager, WebGLContext, ShaderManager
**Status:** ⬜ Not Started

---

### Phase 7: Visualization Modules

#### 7.1 ColormapManager Module
**File:** `packages/niivue/src/niivue/visualization/ColormapManager.ts`
**Responsibility:** Colormap management and application
**Line Range:** ~8932-9921
**Key Methods:**
- `colormaps()` - List available colormaps
- `addColormap()` - Add custom colormap
- `setColormap()`, `setColorMap()` - Apply colormap to volume
- `setColormapNegative()` - Set negative colormap
- `colormapFromKey()` - Get colormap by name
- `colormap()` - Generate colormap texture data
- `createColormapTexture()` - Create GPU texture
- `addColormapList()` - Add to colormap list
- `refreshColormaps()` - Update all colormaps

**Properties to migrate:**
- `colormapTexture: WebGLTexture`
- `colormapLists: ColormapListEntry[]`

**Dependencies:** WebGLContext
**Status:** ⬜ Not Started

---

#### 7.2 LabelManager Module
**File:** `packages/niivue/src/niivue/visualization/LabelManager.ts`
**Responsibility:** 3D label management
**Line Range:** ~11304-11353, ~13215-13637
**Key Methods:**
- `getAllLabels()` - Get all labels
- `getConnectomeLabels()` - Get connectome-specific labels
- `getLabelAtPoint()` - Pick label at screen position
- `createOnLocationChange()` - Create location change callback
- `calculateScreenPoint()` - Project 3D point to screen
- `drawLabelLine()` - Draw label leader line

**Dependencies:** CoordinateTransform, MeshManager
**Status:** ⬜ Not Started

---

#### 7.3 MeasurementTool Module
**File:** `packages/niivue/src/niivue/visualization/MeasurementTool.ts`
**Responsibility:** Distance and angle measurements
**Line Range:** ~10867-11038
**Key Methods:**
- `calculateAngleBetweenLines()` - Angle calculation
- `resetAngleMeasurement()` - Reset angle tool
- `clearMeasurements()` - Clear distance measurements
- `clearAngles()` - Clear angle measurements
- `clearAllMeasurements()` - Clear all measurements
- `shouldDrawOnCurrentSlice()` - Check if measurement should be drawn

**Dependencies:** CoordinateTransform, UIElementRenderer
**Status:** ⬜ Not Started

---

#### 7.4 DepthPicker Module
**File:** `packages/niivue/src/niivue/visualization/DepthPicker.ts`
**Responsibility:** 3D depth picking for object selection
**Line Range:** ~13039-13084
**Key Methods:**
- `depthPicker()` - Pick depth at screen position

**Properties to migrate:**
- `pickingMeshShader`, `pickingImageShader`
- `uiData.mouseDepthPicker`

**Dependencies:** WebGLContext, ShaderManager
**Status:** ⬜ Not Started

---

### Phase 8: Synchronization & Configuration

#### 8.1 ViewSynchronizer Module
**File:** `packages/niivue/src/niivue/sync/ViewSynchronizer.ts`
**Responsibility:** Multi-viewer synchronization
**Line Range:** ~1135-1326
**Key Methods:**
- `syncWith()` - Set up bidirectional sync
- `broadcastTo()` - Set up one-way broadcast
- `sync()` - Execute synchronization
- `doSync3d()`, `doSync2d()` - Sync 3D/2D views
- `doSyncGamma()`, `doSyncZoomPan()`, `doSyncCrosshair()` - Sync specific properties
- `doSyncCalMin()`, `doSyncCalMax()`, `doSyncSliceType()`, `doSyncClipPlane()` - More sync
- `arrayEquals()` - Utility for comparison

**Properties to migrate:**
- `otherNV: Niivue[]` - Other Niivue instances
- `syncOpts: SyncOpts` - Sync options
- `readyForSync` - Sync readiness flag

**Dependencies:** None (orchestration)
**Status:** ⬜ Not Started

---

#### 8.2 ConfigurationManager Module
**File:** `packages/niivue/src/niivue/config/ConfigurationManager.ts`
**Responsibility:** Configuration and options management
**Line Range:** ~3338-3588
**Key Methods:**
- `setDefaults()` - Set default options
- `setCornerOrientationText()` - Orientation text display
- `setIsOrientationTextVisible()` - Orientation markers visibility
- `setShowAllOrientationMarkers()` - Show all orientation markers
- `setRadiologicalConvention()` - Radiological vs neurological
- `getRadiologicalConvention()` - Get convention
- `setHighResolutionCapable()` - High-DPI settings
- `setScale()` - Global scale
- `setInterpolation()` - Interpolation mode
- `setSliceMM()` - Slice mm mode
- `setSliceMosaicString()` - Mosaic string
- `setAdditiveBlend()` - Additive blending
- `unwatchOptsChanges()` - Stop watching options
- `setMouseEventConfig()`, `getMouseEventConfig()` - Mouse config
- `setTouchEventConfig()`, `getTouchEventConfig()` - Touch config
- `setCrosshairColor()`, `setCrosshairWidth()` - Crosshair appearance
- `setSelectionBoxColor()` - Selection box appearance
- `setGamma()` - Gamma correction
- `setModulationImage()` - Image modulation

**Properties to migrate:**
- `opts: NVConfigOptions` - All configuration options
- `onOptsChange` callback

**Dependencies:** None
**Status:** ⬜ Not Started

---

### Phase 9: Utilities & Processing

#### 9.1 ImageProcessing Module
**File:** `packages/niivue/src/niivue/processing/ImageProcessing.ts`
**Responsibility:** Image processing algorithms
**Line Range:** ~3810-4168, ~9061-9712
**Key Methods:**
- `binarize()` - Binary threshold
- `findOtsu()` - Otsu threshold calculation
- `drawOtsu()` - Apply Otsu threshold
- `removeHaze()` - Haze removal filter
- `do_initial_labelling()` - Connected component labeling
- `fill_tratab()` - Translation table filling
- `translate_labels()` - Label translation
- `largest_original_cluster_labels()` - Find largest cluster
- `idx()` - Index calculation helper
- `sumBitmap()` - Sum bitmap values
- `findDrawingBoundarySlices()` - Find drawing boundaries

**Dependencies:** VolumeManager, DrawingManager
**Status:** ⬜ Not Started

---

#### 9.2 GeometryUtilities Module
**File:** `packages/niivue/src/niivue/utils/GeometryUtilities.ts`
**Responsibility:** Geometric calculations and transformations
**Line Range:** ~9457-9712
**Key Methods:**
- `conformVox2Vox()` - Voxel space conforming
- Matrix manipulation utilities

**Dependencies:** None (pure math)
**Status:** ⬜ Not Started

---

#### 9.3 DocumentSerializer Module
**File:** `packages/niivue/src/niivue/utils/DocumentSerializer.ts`
**Responsibility:** JSON export/import of Niivue documents
**Line Range:** ~5325-5660
**Key Methods:**
- `json()` - Export to JSON

**Dependencies:** VolumeManager, MeshManager, ConfigurationManager
**Status:** ⬜ Not Started

---

### Phase 10: Main Niivue Class Refactor

#### 10.1 Niivue Core Class
**File:** `packages/niivue/src/niivue/index.ts` (refactored)
**Responsibility:** Facade and orchestration
**Key Methods (retained):**
- `constructor()` - Initialize with all modules
- `attachToCanvas()` - Attach to DOM
- `cleanup()` - Cleanup all modules
- Public API methods that delegate to modules
- Callback hooks (onLocationChange, onImageLoaded, etc.)

**Structure:**
```typescript
export class Niivue {
  // Module instances (composition)
  private webgl: WebGLContext
  private coordinateTransform: CoordinateTransform
  private shaderManager: ShaderManager
  private volumeManager: VolumeManager
  private meshManager: MeshManager
  private sliceRenderer: SliceRenderer
  private volumeRenderer: VolumeRenderer
  private meshRenderer: MeshRenderer
  private sceneRenderer: SceneRenderer
  private eventController: EventController
  private mouseController: MouseController
  private touchController: TouchController
  private keyboardController: KeyboardController
  private wheelController: WheelController
  private dragModeManager: DragModeManager
  private sliceNavigation: SliceNavigation
  private layoutManager: LayoutManager
  private cameraController: CameraController
  private clipPlaneManager: ClipPlaneManager
  private drawingManager: DrawingManager
  private penTool: PenTool
  private shapeTool: ShapeTool
  private floodFillTool: FloodFillTool
  private growCutTool: GrowCutTool
  private colormapManager: ColormapManager
  private labelManager: LabelManager
  private measurementTool: MeasurementTool
  private viewSynchronizer: ViewSynchronizer
  private configurationManager: ConfigurationManager

  // Canvas reference
  canvas: HTMLCanvasElement | null = null

  // Public callbacks (preserved for backward compatibility)
  onLocationChange: (...) => void = () => {}
  onImageLoaded: (...) => void = () => {}
  // ... all other callbacks

  constructor(options: Partial<NVConfigOptions>) {
    // Initialize all modules with dependencies
    this.webgl = new WebGLContext()
    this.coordinateTransform = new CoordinateTransform()
    this.shaderManager = new ShaderManager(this.webgl)
    // ... initialize all modules
  }

  // Public API methods delegate to modules
  addVolume(volume: NVImage): void {
    this.volumeManager.addVolume(volume)
  }

  setSliceType(st: SLICE_TYPE): this {
    this.sliceNavigation.setSliceType(st)
    return this
  }

  // ... all other public methods

  cleanup(): void {
    // Call cleanup on all modules
  }
}
```

**Status:** ⬜ Not Started

---

## Implementation Strategy

### Guiding Principles

1. **Backward Compatibility:** Maintain 100% backward compatibility with the existing public API
2. **Incremental Migration:** Move one module at a time, testing after each change. Update playwright tests as needed.
3. **Pure Functions Over Classes:** Prefer pure functions for utility modules (better reusability, testability, and tree-shaking)
4. **Explicit Dependencies:** Pass dependencies as function parameters (e.g., `gl` as first parameter)
5. **Test Coverage:** Add playwright tests for each module as it's created
6. **Documentation:** Update docs as modules are created

**Module Pattern Decision:** After implementing the WebGL module, we've adopted a **pure functions** approach instead of classes for utility modules. This provides:
- Better reusability across the codebase
- Easier testing (just pass in dependencies)
- Better tree-shaking (unused functions can be eliminated)
- No class instantiation overhead
- Simpler mental model (no `this` binding)

### Migration Process (Per Module)

For each module in the plan above:

1. **Extract Interface**
   - Define TypeScript interface for the module
   - Document all public methods and properties

2. **Create Module File**
   - Create new file in appropriate directory
   - Implement interface
   - Copy relevant methods from index.ts

3. **Update Dependencies**
   - Replace direct property access with module method calls
   - Pass dependencies via constructor

4. **Add to Main Class**
   - Instantiate module in Niivue constructor
   - Create delegation methods if needed

5. **Test**
   - Run existing unit tests
   - Run e2e tests
   - Verify no regressions

6. **Remove from index.ts**
   - Delete extracted code from original file
   - Update imports

7. **Document**
   - Add JSDoc comments
   - Update README if needed
   - Add to migration tracking

### Phased Rollout

**Phase 1: Foundation**
- Core infrastructure modules with no dependencies
- WebGLContext, CoordinateTransform, ShaderManager
- Low risk, high value

**Phase 2: Data**
- VolumeManager, MeshManager, ConnectomeManager, FileLoader
- Essential for application functionality

**Phase 3: Rendering**
- All renderer modules
- Complex but well-isolated

**Phase 4: Interaction**
- Event controllers and drag mode management
- Critical for user experience

**Phase 5: Navigation**
- Layout, camera, slice navigation
- Depends on interaction modules

**Phase 6: Drawing**
- All drawing tools
- Optional feature, can be done carefully

**Phase 7: Visualization**
- Colormap, labels, measurements
- Mostly independent

**Phase 8: Sync & Config**
- Synchronization and configuration
- Final orchestration pieces

**Phase 9: Processing & Utils**
- Image processing, utilities
- Can be done in parallel

**Phase 10: Main Class**
- Refactor main Niivue class
- Integration and final testing

---

## Success Criteria

- ✅ All existing unit tests pass (unless they need to be updated DUE to refactor)
- ✅ All e2e tests pass (unless they need to be updated DUE to refactor)
- ✅ Minimal breaking changes to public API (only if it is a justified improvement)
- ✅ Code coverage maintained or improved
- ✅ Documentation updated
- ✅ Each module has < 1000 lines of code
- ✅ Clear separation of concerns
- ✅ Reduced coupling between modules

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking changes to public API | High | Medium | Maintain facade pattern, testing |
| Increased complexity | Medium | Medium | Clear documentation, well-defined interfaces |
| Merge conflicts | Medium | High | Small PRs are crucial, frequent merges, clear communication |

---

## Task Tracking

### Phase 1: Core Infrastructure Modules ✅

- ✅ 1.1 WebGLContext Module
- ✅ 1.2 CoordinateTransform Module
- ✅ 1.3 ShaderManager Module

### Phase 2: Data Management Modules ✅

- ✅ 2.1 VolumeManager Module
- ✅ 2.2 MeshManager Module
- ✅ 2.3 ConnectomeManager Module
- ✅ 2.4 FileLoader Module

### Phase 3: Rendering Modules ✅

- ✅ 3.1 SliceRenderer Module
- ✅ 3.2 VolumeRenderer Module
- ✅ 3.3 MeshRenderer Module
- ✅ 3.4 SceneRenderer Module
- ✅ 3.5 UIElementRenderer Module

### Phase 4: Interaction Modules ✅

- ✅ 4.1 EventController Module
- ✅ 4.2 MouseController Module
- ✅ 4.3 TouchController Module
- ✅ 4.4 KeyboardController Module
- ✅ 4.5 WheelController Module
- ✅ 4.6 DragModeManager Module

### Phase 5: Navigation & Layout Modules ✅

- ✅ 5.1 SliceNavigation Module
- ✅ 5.2 LayoutManager Module
- ✅ 5.3 CameraController Module
- ✅ 5.4 ClipPlaneManager Module

### Phase 6: Drawing Tools Modules 🔄

- ✅ 6.1 DrawingManager Module
- ✅ 6.2 PenTool Module
- ✅ 6.3 ShapeTool Module
- ⬜ 6.4 FloodFillTool Module
- ⬜ 6.5 GrowCutTool Module

### Phase 7: Visualization Modules ⬜

- ⬜ 7.1 ColormapManager Module
- ⬜ 7.2 LabelManager Module
- ⬜ 7.3 MeasurementTool Module
- ⬜ 7.4 DepthPicker Module

### Phase 8: Synchronization & Configuration ⬜

- ⬜ 8.1 ViewSynchronizer Module
- ⬜ 8.2 ConfigurationManager Module

### Phase 9: Utilities & Processing ⬜

- ⬜ 9.1 ImageProcessing Module
- ⬜ 9.2 GeometryUtilities Module
- ⬜ 9.3 DocumentSerializer Module

### Phase 10: Main Class Refactor ⬜

- ⬜ 10.1 Niivue Core Class Refactor
- ⬜ Integration Testing
- ⬜ Performance Benchmarking
- ⬜ Documentation Update
- ⬜ Final Release

---

## Appendix

### A. Current File Statistics

```
File: packages/niivue/src/niivue/index.ts
Lines: 15,945
Size: ~552KB
Methods: 280+
Properties: 100+
Imports: 50+
Exports: 20+
```

### B. Module Size Targets

Each module should aim for:
- **Lines of Code:** < 1000 lines
- **Methods:** < 30 methods
- **Properties:** < 20 properties
- **Dependencies:** < 5 direct dependencies
- **Cyclomatic Complexity:** < 10 per method

### C. Testing Requirements

Each module must have:
- **Unit Tests:** 80%+ code coverage
- **Integration Tests:** Key workflows tested
- **E2E Tests:** No regressions in existing tests (or fix them if there are any)

### D. Documentation Requirements

Each module must have:
- **README:** Purpose, usage, short examples
- **JSDoc:** All public methods documented
- **TypeScript Types:** Full type coverage
- **Examples:** At least one demo showing usage

---

## Conclusion

This migration plan provides a structured approach to modularizing the massive Niivue class into maintainable, single-responsibility modules. By following the phased approach and maintaining backward compatibility, we can significantly improve code maintainability while preserving the existing API and functionality.

The modularization will result in:
- ✅ Better code organization
- ✅ Improved testability
- ✅ Easier maintenance
- ✅ Better documentation
- ✅ Reduced coupling
- ✅ Increased cohesion
- ✅ Simpler debugging
- ✅ Easier onboarding for new developers

**Next Steps:**
1. DONE - Review and approve this plan
2. Begin Phase based implementation and track completion progress in this document
3. Regular check-ins and progress updates
