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

#### 1.1 WebGLContext Module
**File:** `packages/niivue/src/niivue/core/gl.ts`
**Responsibility:** WebGL context initialization, management, and basic operations
**Line Range:** ~800-1000, ~7000-7200 (texture creation methods)
**Key Methods:**
- `initGL()` - Initialize WebGL context
- `r8Tex()`, `r16Tex()`, `rgbaTex()` - Texture creation
- `requestCORSIfNotSameOrigin()` - CORS handling

**Status:** ⬜ Not Started

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

**Dependencies:** None (pure math)
**Status:** ⬜ Not Started

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

**Status:** ⬜ Not Started

---

### Phase 2: Data Management Modules

#### 2.1 VolumeManager Module
**File:** `packages/niivue/src/niivue/data/VolumeManager.ts`
**Responsibility:** Volume loading, management, and operations
**Line Range:** ~3600-3631, ~4333-4507, ~8270-8932
**Key Methods:**
- `addVolume()`, `removeVolume()`, `removeVolumeByIndex()`
- `setVolume()`, `cloneVolume()`
- `getVolumeIndexByID()`, `getOverlayIndexByID()`
- `moveVolumeUp()`, `moveVolumeDown()`, `moveVolumeToTop()`, `moveVolumeToBottom()`
- `updateGLVolume()` - Update GPU textures
- `refreshLayers()` - Layer management
- `setFrame4D()`, `getFrame4D()` - 4D volume time series
- `setOpacity()` - Volume opacity
- `overlayRGBA()` - Overlay rendering data

**Properties to migrate:**
- `volumes: NVImage[]`
- `volumeTexture: WebGLTexture`
- `overlayTexture: WebGLTexture`
- `backgroundMasksOverlays`

**Dependencies:** WebGLContext, ShaderManager
**Status:** ⬜ Not Started

---

#### 2.2 MeshManager Module
**File:** `packages/niivue/src/niivue/data/MeshManager.ts`
**Responsibility:** Mesh loading, management, and operations
**Line Range:** ~3617-3631, ~4168-4286, ~4373-4456
**Key Methods:**
- `addMesh()`, `removeMesh()`, `removeMeshByUrl()`
- `setMesh()`, `getMeshIndexByID()`
- `indexNearestXYZmm()` - Find nearest vertex
- `decimateHierarchicalMesh()` - Mesh decimation
- `reverseFaces()` - Flip mesh normals
- `setMeshShader()` - Shader assignment
- `setMeshThicknessOn2D()` - 2D mesh rendering thickness

**Properties to migrate:**
- `meshes: NVMesh[]`
- `matCapTexture: WebGLTexture`

**Dependencies:** WebGLContext, ShaderManager
**Status:** ⬜ Not Started

---

#### 2.3 ConnectomeManager Module
**File:** `packages/niivue/src/niivue/data/ConnectomeManager.ts`
**Responsibility:** Connectome-specific data handling
**Line Range:** ~5660-5709
**Key Methods:**
- `loadConnectome()` - Load connectome JSON
- `loadConnectomeAsMesh()` - Convert to mesh representation
- `handleNodeAdded()` - Event handling for connectome nodes

**Dependencies:** MeshManager
**Status:** ⬜ Not Started

---

#### 2.4 FileLoader Module
**File:** `packages/niivue/src/niivue/data/FileLoader.ts`
**Responsibility:** File loading, format detection, drag-and-drop
**Line Range:** ~2747-3070
**Key Methods:**
- `dragEnterListener()`, `dragOverListener()` - Drag-and-drop
- `getFileExt()` - File extension detection
- `isMeshExt()` - Check if file is mesh format
- `getMediaByUrl()` - Retrieve loaded media by URL
- `removeVolumeByUrl()` - Remove by URL
- `readDirectory()` - Directory reading
- `useLoader()`, `useDicomLoader()` - Custom loaders
- `getDicomLoader()` - Get DICOM loader

**Properties to migrate:**
- `loaders` object
- `dicomLoader: DicomLoader | null`

**Dependencies:** VolumeManager, MeshManager
**Status:** ⬜ Not Started

---

### Phase 3: Rendering Modules

#### 3.1 SliceRenderer Module
**File:** `packages/niivue/src/niivue/rendering/SliceRenderer.ts`
**Responsibility:** 2D slice rendering (axial, coronal, sagittal)
**Line Range:** ~12213-12511, ~14651-14856
**Key Methods:**
- `draw2DMain()` - Main 2D slice rendering
- `drawMosaic()` - Mosaic view rendering
- `drawCrossLines()`, `drawCrossLinesMM()` - Crosshair rendering
- `updateInterpolation()` - Interpolation settings
- `setAtlasOutline()`, `setInterpolation()` - Rendering options

**Properties to migrate:**
- `crosshairs3D: NiivueObject3D`
- Related shader references

**Dependencies:** WebGLContext, ShaderManager, CoordinateTransform
**Status:** ⬜ Not Started

---

#### 3.2 VolumeRenderer Module
**File:** `packages/niivue/src/niivue/rendering/VolumeRenderer.ts`
**Responsibility:** 3D volume rendering (ray-casting, MIP, etc.)
**Line Range:** ~13084-13168, ~7744-7916
**Key Methods:**
- `drawImage3D()` - 3D volume rendering
- `gradientGL()` - Gradient texture generation for lighting
- `getGradientTextureData()` - Retrieve gradient data
- `setCustomGradientTexture()` - Custom gradient textures

**Properties to migrate:**
- `gradientTexture: WebGLTexture`
- `gradientTextureAmount`
- `useCustomGradientTexture`
- `renderGradientValues`

**Dependencies:** WebGLContext, ShaderManager, VolumeManager
**Status:** ⬜ Not Started

---

#### 3.3 MeshRenderer Module
**File:** `packages/niivue/src/niivue/rendering/MeshRenderer.ts`
**Responsibility:** 3D mesh rendering
**Line Range:** ~13800-14063
**Key Methods:**
- `drawMesh3D()` - Render 3D meshes with various shaders
- Shader-specific rendering logic

**Dependencies:** WebGLContext, ShaderManager, MeshManager
**Status:** ⬜ Not Started

---

#### 3.4 SceneRenderer Module
**File:** `packages/niivue/src/niivue/rendering/SceneRenderer.ts`
**Responsibility:** Overall scene composition and rendering orchestration
**Line Range:** ~15273-15860
**Key Methods:**
- `drawSceneCore()` - Core rendering loop
- `drawScene()` - Main scene rendering entry point
- `calculateMvpMatrix()` - Model-view-projection matrix calculation
- `calculateModelMatrix()` - Model matrix calculation
- `calculateRayDirection()` - Ray direction for picking
- `sceneExtentsMinMax()` - Scene bounds calculation
- `setPivot3D()` - 3D pivot point

**Properties to migrate:**
- `isBusy`, `needsRefresh` - Rendering state flags
- Scene-related matrices and transforms

**Dependencies:** SliceRenderer, VolumeRenderer, MeshRenderer, WebGLContext
**Status:** ⬜ Not Started

---

#### 3.5 UIElementRenderer Module
**File:** `packages/niivue/src/niivue/rendering/UIElementRenderer.ts`
**Responsibility:** Render UI overlays (colorbar, labels, rulers, etc.)
**Line Range:** ~10491-10808, ~11151-11832, ~13637-13800
**Key Methods:**
- `drawColorbar()` - Colorbar rendering
- `drawText()`, `drawTextRight()`, `drawTextLeft()`, `drawTextBelow()`, `drawTextAbove()` - Text rendering
- `drawRect()`, `drawCircle()`, `drawSelectionBox()` - Shape rendering
- `drawLine()`, `draw3DLine()`, `drawDottedLine()` - Line rendering
- `drawRuler()`, `drawRuler10cm()` - Ruler/measurement display
- `drawMeasurementTool()` - Measurement overlay
- `drawAngleMeasurementTool()`, `drawAngleText()` - Angle measurement
- `draw3DLabels()`, `drawAnchoredLabels()` - Label rendering
- `drawGraph()` - Graph/plot overlay
- `drawOrientationCube()` - Orientation indicator
- `drawThumbnail()` - Thumbnail preview

**Properties to migrate:**
- `fontShader`, `fontTexture`, `fontMets`, `fontPx`
- `colorbarHeight`
- `legendFontScaling`
- `bmpShader`, `bmpTexture`, `bmpTextureWH`, `thumbnailVisible`

**Dependencies:** WebGLContext, ShaderManager, CoordinateTransform
**Status:** ⬜ Not Started

---

### Phase 4: Interaction Modules

#### 4.1 EventController Module
**File:** `packages/niivue/src/niivue/interaction/EventController.ts`
**Responsibility:** Central event listener registration and management
**Line Range:** ~1368-1411, ~2694-2756
**Key Methods:**
- `registerInteractions()` - Register all event listeners
- `resizeListener()` - Canvas resize handling
- `getRelativeMousePosition()` - Mouse position calculation
- `getNoPaddingNoBorderCanvasRelativeMousePosition()` - Adjusted mouse position

**Properties to migrate:**
- `resizeObserver`, `resizeEventListener`, `canvasObserver`
- `#eventsController` (private)

**Dependencies:** None (pure event handling)
**Status:** ⬜ Not Started

---

#### 4.2 MouseController Module
**File:** `packages/niivue/src/niivue/interaction/MouseController.ts`
**Responsibility:** Mouse event handling
**Line Range:** ~1441-1851, ~4515-4539
**Key Methods:**
- `mouseDownListener()` - Mouse button press
- `mouseUpListener()` - Mouse button release
- `mouseMoveListener()` - Mouse movement
- `mouseLeaveListener()` - Mouse leaves canvas
- `mouseContextMenuListener()` - Right-click context menu
- `mouseClick()` - Click handling with position
- `mouseDown()`, `mouseMove()` - Programmatic mouse events
- `updateMousePos()` - Position tracking
- `getMouseButtonDragMode()` - Determine drag mode from button
- `handleMouseAction()` - Execute action based on drag mode

**Properties to migrate:**
- `uiData.mousedown`, `uiData.mouseButtonLeftDown`, etc.
- `uiData.prevX`, `uiData.prevY`, `uiData.currX`, `uiData.currY`
- Mouse-related state from UIData

**Dependencies:** EventController, DragModeManager
**Status:** ⬜ Not Started

---

#### 4.3 TouchController Module
**File:** `packages/niivue/src/niivue/interaction/TouchController.ts`
**Responsibility:** Touch event handling
**Line Range:** ~1999-2399
**Key Methods:**
- `touchStartListener()` - Touch start
- `touchEndListener()` - Touch end
- `touchMoveListener()` - Touch movement
- `checkMultitouch()` - Detect multi-touch gestures
- `handlePinchZoom()` - Pinch-to-zoom gesture
- `getTouchDragMode()` - Determine drag mode for touch

**Properties to migrate:**
- `uiData.touchdown`, `uiData.doubleTouch`
- `uiData.currentTouchTime`, `uiData.lastTouchTime`, `uiData.touchTimer`
- `uiData.lastTwoTouchDistance`, `uiData.multiTouchGesture`

**Dependencies:** EventController, DragModeManager
**Status:** ⬜ Not Started

---

#### 4.4 KeyboardController Module
**File:** `packages/niivue/src/niivue/interaction/KeyboardController.ts`
**Responsibility:** Keyboard event handling
**Line Range:** ~2450-2562
**Key Methods:**
- `keyDownListener()` - Key press
- `keyUpListener()` - Key release
- `cycleActiveClipPlane()` - Clip plane cycling with hotkey

**Dependencies:** EventController, ClipPlaneManager
**Status:** ⬜ Not Started

---

#### 4.5 WheelController Module
**File:** `packages/niivue/src/niivue/interaction/WheelController.ts`
**Responsibility:** Mouse wheel/trackpad scrolling
**Line Range:** ~2562-2694
**Key Methods:**
- `wheelListener()` - Scroll wheel handling

**Dependencies:** EventController, SliceNavigation
**Status:** ⬜ Not Started

---

#### 4.6 DragModeManager Module
**File:** `packages/niivue/src/niivue/interaction/DragModeManager.ts`
**Responsibility:** Manage different drag interaction modes
**Line Range:** ~1539-1743, ~2344-2355, ~10615-10667
**Key Methods:**
- `setActiveDragMode()`, `getCurrentDragMode()`, `clearActiveDragMode()`
- `setDragMode()` - Set global drag mode
- `setDragStart()`, `setDragEnd()` - Drag boundaries
- `dragForPanZoom()` - Pan/zoom drag handling
- `dragForCenterButton()` - Center button drag
- `dragForSlicer3D()` - 3D slicer plane drag
- `windowingHandler()` - Window/level adjustment
- `resetBriCon()` - Reset brightness/contrast
- `calculateNewRange()` - Calculate new intensity range
- `generateMouseUpCallback()` - Generate callback for mouse up

**Properties to migrate:**
- `uiData.isDragging`, `uiData.dragStart`, `uiData.dragEnd`
- `uiData.activeDragMode`, `uiData.activeDragButton`
- `uiData.windowX`, `uiData.windowY`
- `uiData.angleFirstLine`, `uiData.angleState`
- `uiData.dragClipPlaneStartDepthAziElev`
- `opts.dragMode`, `opts.mouseButtonConfig`, `opts.touchConfig`

**Dependencies:** None (pure state management)
**Status:** ⬜ Not Started

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
**Status:** ⬜ Not Started

---

#### 5.2 LayoutManager Module
**File:** `packages/niivue/src/niivue/navigation/LayoutManager.ts`
**Responsibility:** Manage multiplanar layouts and tile arrangements
**Line Range:** ~3313-3445, ~11269-11439
**Key Methods:**
- `setMultiplanarLayout()` - Set layout type
- `setMultiplanarPadPixels()` - Padding between tiles
- `clearCustomLayout()`, `getCustomLayout()` - Custom layouts
- `setHeroImage()` - Set hero image fraction
- `effectiveCanvasWidth()`, `effectiveCanvasHeight()` - Canvas dimensions
- `reserveColorbarPanel()` - Reserve space for colorbar
- `getLegendPanelWidth()`, `getLegendPanelHeight()` - Legend dimensions
- `getBulletMarginWidth()` - Bullet point margin
- `sliceScale()` - Calculate slice scaling
- `screenFieldOfViewVox()`, `screenFieldOfViewMM()` - Field of view calculations
- `screenFieldOfViewExtendedVox()`, `screenFieldOfViewExtendedMM()` - Extended FOV
- `xyMM2xyzMM()` - Convert 2D position to 3D

**Properties to migrate:**
- `opts.multiplanarLayout`, `opts.multiplanarPadPixels`
- `customLayout` array
- `graph` object
- `screenSlices`

**Dependencies:** CoordinateTransform
**Status:** ⬜ Not Started

---

#### 5.3 CameraController Module
**File:** `packages/niivue/src/niivue/navigation/CameraController.ts`
**Responsibility:** 3D camera control (azimuth, elevation, zoom)
**Line Range:** ~4286-4299, ~4568-4626
**Key Methods:**
- `setRenderAzimuthElevation()` - Set 3D view angle
- `sph2cartDeg()` - Spherical to Cartesian conversion
- `setPan2Dxyzmm()` - Set 2D pan position

**Properties to migrate:**
- `scene.renderAzimuth`, `scene.renderElevation`
- `scene.pan2Dxyzmm`
- `volScaleMultiplier`

**Dependencies:** None
**Status:** ⬜ Not Started

---

#### 5.4 ClipPlaneManager Module
**File:** `packages/niivue/src/niivue/navigation/ClipPlaneManager.ts`
**Responsibility:** Manage clipping planes for 3D rendering
**Line Range:** ~4600-4670, ~4900-4921
**Key Methods:**
- `setClipPlane()` - Set single clip plane
- `setClipPlanes()` - Set multiple clip planes
- `cycleActiveClipPlane()` - Cycle through clip planes
- `setClipPlaneColor()` - Clip plane color
- `setClipPlaneThick()` - Clip plane thickness
- `setClipVolume()` - Volumetric clipping

**Properties to migrate:**
- `scene.clipPlane`, `scene.clipPlanes`
- `scene.clipPlaneDepthAziElevs`
- `uiData.activeClipPlaneIndex`

**Dependencies:** CameraController
**Status:** ⬜ Not Started

---

### Phase 6: Drawing Tools Modules

#### 6.1 DrawingManager Module
**File:** `packages/niivue/src/niivue/drawing/DrawingManager.ts`
**Responsibility:** Drawing state management and undo/redo
**Line Range:** ~3647-3810, ~5723-5789, ~6846-6963
**Key Methods:**
- `createEmptyDrawing()` - Initialize drawing bitmap
- `loadDrawing()` - Load drawing from NVImage
- `closeDrawing()` - Clean up drawing resources
- `refreshDrawing()` - Update drawing display
- `drawAddUndoBitmap()` - Save undo state
- `drawClearAllUndoBitmaps()` - Clear undo history
- `drawUndo()` - Undo last operation
- `setDrawingEnabled()` - Enable/disable drawing
- `setPenValue()` - Set pen drawing value
- `setDrawOpacity()` - Set drawing opacity
- `setDrawColormap()` - Set drawing colormap
- `setRenderDrawAmbientOcclusion()` - Drawing AO rendering
- `closePAQD()` - Close probabilistic atlas

**Properties to migrate:**
- `drawTexture: WebGLTexture`
- `paqdTexture: WebGLTexture`
- `drawUndoBitmaps: Uint8Array[]`
- `drawLut` - Drawing color lookup table
- `drawOpacity`, `drawRimOpacity`
- `renderDrawAmbientOcclusion`
- `opts.drawingEnabled`

**Dependencies:** WebGLContext, VolumeManager
**Status:** ⬜ Not Started

---

#### 6.2 PenTool Module
**File:** `packages/niivue/src/niivue/drawing/PenTool.ts`
**Responsibility:** Pen drawing tool
**Line Range:** ~5919-6045, ~6679-6846
**Key Methods:**
- `drawPt()` - Draw single point
- `drawPenLine()` - Draw line between points
- `drawPenFilled()` - Fill pen strokes

**Properties to migrate:**
- `drawPenLocation`
- `drawPenAxCorSag`
- `drawPenFillPts`
- `drawFillOverwrites`
- `opts.penValue`

**Dependencies:** DrawingManager, CoordinateTransform
**Status:** ⬜ Not Started

---

#### 6.3 ShapeTool Module
**File:** `packages/niivue/src/niivue/drawing/ShapeTool.ts`
**Responsibility:** Rectangle and ellipse drawing
**Line Range:** ~6045-6256
**Key Methods:**
- `drawRectangleMask()` - Draw rectangle
- `drawEllipseMask()` - Draw ellipse

**Properties to migrate:**
- `drawShapeStartLocation`
- `drawShapePreviewBitmap`

**Dependencies:** DrawingManager, CoordinateTransform
**Status:** ⬜ Not Started

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
3. **Dependency Injection:** Use constructor injection for module dependencies
4. **Interface Contracts:** Define clear interfaces for each module
5. **Test Coverage:** Add playwright tests for each module as it's created
6. **Documentation:** Update docs as modules are created

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

### Phase 1: Core Infrastructure Modules ⬜

- ⬜ 1.1 WebGLContext Module
- ⬜ 1.2 CoordinateTransform Module
- ⬜ 1.3 ShaderManager Module

### Phase 2: Data Management Modules ⬜

- ⬜ 2.1 VolumeManager Module
- ⬜ 2.2 MeshManager Module
- ⬜ 2.3 ConnectomeManager Module
- ⬜ 2.4 FileLoader Module

### Phase 3: Rendering Modules ⬜

- ⬜ 3.1 SliceRenderer Module
- ⬜ 3.2 VolumeRenderer Module
- ⬜ 3.3 MeshRenderer Module
- ⬜ 3.4 SceneRenderer Module
- ⬜ 3.5 UIElementRenderer Module

### Phase 4: Interaction Modules ⬜

- ⬜ 4.1 EventController Module
- ⬜ 4.2 MouseController Module
- ⬜ 4.3 TouchController Module
- ⬜ 4.4 KeyboardController Module
- ⬜ 4.5 WheelController Module
- ⬜ 4.6 DragModeManager Module

### Phase 5: Navigation & Layout Modules ⬜

- ⬜ 5.1 SliceNavigation Module
- ⬜ 5.2 LayoutManager Module
- ⬜ 5.3 CameraController Module
- ⬜ 5.4 ClipPlaneManager Module

### Phase 6: Drawing Tools Modules ⬜

- ⬜ 6.1 DrawingManager Module
- ⬜ 6.2 PenTool Module
- ⬜ 6.3 ShapeTool Module
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
