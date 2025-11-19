# NVMesh Modularization Migration Plan

## Executive Summary

This document outlines the plan to further modularize the NVMesh class from a 2,178-line file into a collection of focused, single-responsibility modules. The current `packages/niivue/src/nvmesh.ts` file contains mesh management, fiber processing, connectome handling, and rendering logic.

**Current State:**
- **File:** `packages/niivue/src/nvmesh.ts`
- **Size:** 2,178 lines (~76KB)
- **Methods:** ~12 core instance methods + 5 static factory methods
- **Properties:** ~60 state variables
- **Existing Modules:** NVMeshLoaders (4116 lines), NVMeshUtilities (355 lines), nvmesh-types (170 lines)

**Goal:** Complete the modularization of NVMesh by extracting fiber processing, mesh operations, connectome handling, and factory methods into focused modules while maintaining backward compatibility.

---

## Analysis Summary

### Current Modularization Status

| Module | File | Status | Methods/Responsibilities |
|--------|------|--------|--------------------------|
| **NVMeshLoaders** | nvmesh-loaders.ts (4116 lines) | ✅ Complete | readTCK, readTRK, readTRX, readTT, readTRACT, readGII, readMZ3, readASC, readDFS, readGEO, readICO, readOFF, readNV, readOBJ, readPLY, readWRL, readX3D, readVTK, readSRF, readSTL, readFreeSurfer, readANNOT, readCURV, assembleDpgFromMap, decimateLayerVertices |
| **NVMeshUtilities** | nvmesh-utilities.ts (355 lines) | ✅ Complete | getClusterBoundaryU8, createMZ3, createMZ3Async, createOBJ, createSTL, downloadArrayBuffer, getClusterBoundary, getExtents, generateNormals |
| **nvmesh-types** | nvmesh-types.ts (170 lines) | ✅ Complete | Type definitions (GII, MZ3, TCK, TRACT, TRK, TT, TRX, VTK, ValuesArray, etc.) |

### Method Distribution

| Category | Method Count | Current Location | Examples |
|----------|--------------|------------------|----------|
| **Static Factory Methods** | 5 | nvmesh.ts | `loadFromUrl`, `loadFromFile`, `loadFromBase64`, `readMesh`, `loadLayer` |
| **Fiber Processing** | 3 | nvmesh.ts | `linesToCylinders`, `createFiberDensityMap`, `updateFibers` |
| **Mesh Operations** | 5 | nvmesh.ts | `updateMesh`, `reverseFaces`, `decimateFaces`, `decimateHierarchicalMesh`, `generatePosNormClr` |
| **Data Initialization** | 2 | nvmesh.ts | `constructor`, `initValuesArray` |
| **Spatial Queries** | 2 | nvmesh.ts | `indexNearestXYZmm`, `hierarchicalOrder` |
| **Resource Management** | 1 | nvmesh.ts | `unloadMesh` |
| **Format Loaders** | 25+ | Delegated to NVMeshLoaders | All format readers |
| **Utilities** | 9 | Delegated to NVMeshUtilities | Mesh utilities |

### Key Dependencies

1. **gl-matrix** - Vector and matrix operations (vec3, vec4, mat4)
2. **@lukeed/uuid** - UUID generation
3. **NVMeshLoaders** - Format-specific loaders
4. **NVMeshUtilities** - Mesh utilities
5. **colortables** - Colormap management
6. **NiivueObject3D** - Base 3D object class
7. **nvlabel** - Label rendering

---

## Proposed Module Structure

### Phase 1: Extract Fiber Processing Module

#### 1.1 FiberProcessing Module
**File:** `packages/niivue/src/nvmesh/FiberProcessing.ts`
**Responsibility:** All fiber/tractography processing and rendering
**Line Range:** ~375-689
**Key Methods:**
- `linesToCylinders()` - Convert streamlines to cylinder mesh for rendering
- `createFiberDensityMap()` - Generate fiber density map for ambient occlusion
- `updateFibers()` - Update fiber colors and visibility based on filters

**Properties to migrate:**
- `fiberLength` - Length of fibers
- `fiberLengths` - Array of individual fiber lengths
- `fiberDensity` - Density map for ambient occlusion
- `fiberDither` - Random offset for fiber rendering
- `fiberColor` - Fiber coloring mode ('Global', 'Local', etc.)
- `fiberDecimationStride` - Decimation factor for fiber display
- `fiberSides` - Number of sides for cylinder rendering (1=line, 2+=cylinder)
- `fiberRadius` - Radius of fiber cylinders in mm
- `fiberOcclusion` - Ambient occlusion intensity (0..1)
- `fiberMask` - Array to show/hide specific fibers
- `offsetPt0` - Offset array for streamline start positions
- `f32PerVertex` - Floats per vertex (5 or 7)
- `dpsThreshold` - Threshold for data-per-streamline filtering
- `dpg` - Data per group (tractography metadata)
- `dps` - Data per streamline (tractography metadata)
- `dpv` - Data per vertex (tractography metadata)
- `groups` - Tractography groups

**Helper Functions:**
- `blur3D()` - 3D blur for density map (internal to createFiberDensityMap)
- `v4ToV3()` - Vector conversion helper (internal to linesToCylinders)

**Dependencies:** gl-matrix (vec3, vec4)
**Status:** ⬜ Not Started

---

### Phase 2: Extract Mesh Operations Module

#### 2.1 MeshOperations Module
**File:** `packages/niivue/src/nvmesh/MeshOperations.ts`
**Responsibility:** Core mesh manipulation and processing operations
**Line Range:** ~1229-1733
**Key Methods:**
- `updateMesh()` - Update WebGL buffers with mesh data
- `reverseFaces()` - Reverse triangle winding order
- `decimateFaces()` - Reduce triangle count for a mesh
- `decimateHierarchicalMesh()` - Decimate mesh using hierarchical ordering
- `generatePosNormClr()` - Generate position, normal, and color vertex data

**Helper Methods:**
- `hierarchicalOrder()` - Compute hierarchical order for decimation

**Properties accessed:**
- `pts` - Vertex positions
- `tris` - Triangle indices
- `rgba255` - Base mesh color
- `layers` - Mesh overlay layers
- `indexBuffer`, `vertexBuffer`, `vao`, `vaoFiber` - WebGL resources
- `indexCount`, `vertexCount` - Mesh statistics
- `f32PerVertex` - Vertex data layout

**Dependencies:** gl-matrix (vec3, vec4), NVMeshUtilities (generateNormals)
**Status:** ⬜ Not Started

---

### Phase 3: Extract Factory and Loader Module

#### 3.1 MeshFactory Module
**File:** `packages/niivue/src/nvmesh/MeshFactory.ts`
**Responsibility:** Factory methods for creating NVMesh instances from various sources
**Line Range:** ~1736-2177, ~2017-2132
**Key Static Methods:**
- `readMesh()` - Main wrapper to read any mesh format
- `loadFromUrl()` - Load mesh from URL
- `loadFromFile()` - Load mesh from browser File object
- `loadFromBase64()` - Load mesh from base64 string
- `loadLayer()` - Load and attach overlay layer to mesh
- `readFileAsync()` - Read File object as ArrayBuffer

**Properties to handle:**
- Format detection based on file extension
- Layer loading and attachment
- Mesh shader index assignment

**Dependencies:**
- All of NVMeshLoaders for format readers
- MeshOperations for updateMesh
- FiberProcessing for fiber meshes

**Status:** ⬜ Not Started

---

### Phase 4: Extract Connectome Module

#### 4.1 ConnectomeManager Module
**File:** `packages/niivue/src/nvmesh/ConnectomeManager.ts`
**Responsibility:** Connectome-specific data and rendering management
**Line Range:** Various properties in constructor and class definition
**Key Responsibilities:**
- Manage connectome nodes and edges
- Handle node/edge colormaps
- Scale nodes and edges
- Legend rendering for connectomes

**Properties to migrate:**
- `hasConnectome` - Boolean flag
- `connectome` - Connectome data
- `nodes` - Connectome node array
- `edges` - Connectome edge array
- `points` - Connectome point array
- `nodeScale` - Node size scaling
- `edgeScale` - Edge thickness scaling
- `legendLineThickness` - Legend line width
- `showLegend` - Show/hide legend
- `nodeColormap` - Colormap for nodes
- `edgeColormap` - Colormap for edges
- `nodeColormapNegative` - Negative colormap for nodes
- `edgeColormapNegative` - Negative colormap for edges
- `nodeMinColor`, `nodeMaxColor` - Node color range
- `edgeMin`, `edgeMax` - Edge color range

**Dependencies:** colortables (cmapper)
**Status:** ⬜ Not Started

---

### Phase 5: Extract Colormap and Layer Module

#### 5.1 MeshColormap Module
**File:** `packages/niivue/src/nvmesh/MeshColormap.ts`
**Responsibility:** Colormap and layer management for mesh overlays
**Line Range:** Layer initialization in constructor, loadLayer method
**Key Methods:**
- `initValuesArray()` - Initialize value arrays with min/max
- Layer colormap assignment and management
- Colormap inversion handling

**Properties to migrate:**
- `colormapInvert` - Invert colormap flag
- `fiberGroupColormap` - Colormap for fiber groups
- `layers` - Array of NVMeshLayer objects
- Layer-specific properties (handled via NVMeshLayer type):
  - `colormap`, `colormapNegative`, `colormapInvert`
  - `cal_min`, `cal_max`, `cal_minNeg`, `cal_maxNeg`
  - `global_min`, `global_max`
  - `opacity`, `useNegativeCmap`
  - `colormapLabel` (discrete labels)

**Dependencies:** colortables (cmapper, ColorMap, LUT)
**Status:** ⬜ Not Started

---

### Phase 6: Extract Spatial Query Module

#### 6.1 SpatialQuery Module
**File:** `packages/niivue/src/nvmesh/SpatialQuery.ts`
**Responsibility:** Spatial queries and nearest-neighbor searches
**Line Range:** ~1011-1030
**Key Methods:**
- `indexNearestXYZmm()` - Find nearest vertex to a 3D point in mm space

**Properties accessed:**
- `pts` - Vertex positions

**Dependencies:** None (pure geometric computation)
**Status:** ⬜ Not Started

---

### Phase 7: Core NVMesh Class Refactor

#### 7.1 NVMesh Core Class
**File:** `packages/niivue/src/nvmesh.ts` (refactored)
**Responsibility:** Facade and orchestration of all modules
**Key Methods (retained):**
- `constructor()` - Initialize mesh with all modules
- `unloadMesh()` - Clean up WebGL resources
- Public API methods that delegate to modules

**Structure:**
```typescript
// Import module functions (not classes)
import * as FiberProcessing from './nvmesh/FiberProcessing'
import * as MeshOperations from './nvmesh/MeshOperations'
import * as MeshFactory from './nvmesh/MeshFactory'
import * as ConnectomeManager from './nvmesh/ConnectomeManager'
import * as MeshColormap from './nvmesh/MeshColormap'
import * as SpatialQuery from './nvmesh/SpatialQuery'

export class NVMesh {
  // Core properties (retained in main class)
  id: string
  name: string
  anatomicalStructurePrimary: string
  colorbarVisible: boolean
  type: MeshType

  // Geometry
  pts: Float32Array
  tris?: Uint32Array
  furthestVertexFromOrigin: number
  extentsMin: number | number[]
  extentsMax: number | number[]

  // Rendering
  opacity: number
  visible: boolean
  rgba255: Uint8Array
  meshShaderIndex: number

  // WebGL resources
  indexBuffer: WebGLBuffer
  vertexBuffer: WebGLBuffer
  vao: WebGLVertexArrayObject
  vaoFiber: WebGLVertexArrayObject
  indexCount?: number
  vertexCount: number

  // Fiber properties (managed by FiberProcessing)
  offsetPt0: Uint32Array | null
  fiberLength?: number
  fiberLengths?: Uint32Array
  fiberDensity?: Float32Array
  fiberDither: number
  fiberColor: string
  fiberDecimationStride: number
  fiberSides: number
  fiberRadius: number
  fiberOcclusion: number
  f32PerVertex: number
  dpsThreshold: number
  fiberMask?: unknown[]
  dpg?: ValuesArray | null
  dps?: ValuesArray | null
  dpv?: ValuesArray | null
  groups?: ValuesArray | null

  // Connectome properties (managed by ConnectomeManager)
  hasConnectome: boolean
  connectome?: LegacyConnectome | string
  nodes?: LegacyNodes | NVConnectomeNode[]
  edges?: number[] | NVConnectomeEdge[]
  points?: Point[]
  nodeScale: number
  edgeScale: number
  legendLineThickness: number
  showLegend: boolean
  nodeColormap: string
  edgeColormap: string
  nodeColormapNegative?: string
  edgeColormapNegative?: string
  nodeMinColor?: number
  nodeMaxColor?: number
  edgeMin?: number
  edgeMax?: number

  // Layer and colormap properties (managed by MeshColormap)
  layers: NVMeshLayer[]
  colormapInvert: boolean
  fiberGroupColormap: ColorMap | null
  colormap?: ColorMap | LegacyConnectome | string | null
  data_type?: string

  constructor(
    pts: Float32Array,
    tris: Uint32Array,
    name = '',
    rgba255 = new Uint8Array([255, 255, 255, 255]),
    opacity = 1.0,
    visible = true,
    gl: WebGL2RenderingContext,
    connectome: LegacyConnectome | string | null = null,
    dpg: ValuesArray | null = null,
    dps: ValuesArray | null = null,
    dpv: ValuesArray | null = null,
    groups: ValuesArray | null = null,
    colorbarVisible = true,
    anatomicalStructurePrimary = ''
  ) {
    // Initialize core properties
    this.id = uuidv4()
    this.name = name
    // ... initialize all properties

    // Delegate to modules as needed
    if (rgba255[3] < 1) {
      // Fiber mesh initialization
      FiberProcessing.updateFibers(this, gl)
    } else if (connectome) {
      // Connectome initialization
      ConnectomeManager.initConnectome(this, connectome)
    }

    MeshOperations.updateMesh(this, gl)
  }

  // Public API methods delegate to module functions
  linesToCylinders(gl: WebGL2RenderingContext, posClrF32: Float32Array, indices: number[]): void {
    FiberProcessing.linesToCylinders(this, gl, posClrF32, indices)
  }

  createFiberDensityMap(): void {
    FiberProcessing.createFiberDensityMap(this)
  }

  updateFibers(gl: WebGL2RenderingContext): void {
    FiberProcessing.updateFibers(this, gl)
  }

  updateMesh(gl: WebGL2RenderingContext): void {
    MeshOperations.updateMesh(this, gl)
  }

  reverseFaces(gl: WebGL2RenderingContext): void {
    MeshOperations.reverseFaces(this, gl)
  }

  decimateFaces(n: number, ntarget: number): void {
    MeshOperations.decimateFaces(this, n, ntarget)
  }

  decimateHierarchicalMesh(gl: WebGL2RenderingContext, order = 4): boolean {
    return MeshOperations.decimateHierarchicalMesh(this, gl, order)
  }

  indexNearestXYZmm(Xmm: number, Ymm: number, Zmm: number): number[] {
    return SpatialQuery.indexNearestXYZmm(this, Xmm, Ymm, Zmm)
  }

  initValuesArray(va: ValuesArray): ValuesArray {
    return MeshColormap.initValuesArray(va)
  }

  // Static factory methods delegate to MeshFactory module
  static async readMesh(
    buffer: ArrayBuffer,
    name: string,
    gl: WebGL2RenderingContext,
    opacity = 1.0,
    rgba255 = new Uint8Array([255, 255, 255, 255]),
    visible = true
  ): Promise<NVMesh> {
    return MeshFactory.readMesh(buffer, name, gl, opacity, rgba255, visible)
  }

  static async loadFromUrl(params: Partial<LoadFromUrlParams>): Promise<NVMesh> {
    return MeshFactory.loadFromUrl(params)
  }

  static async loadFromFile(params: Partial<LoadFromFileParams>): Promise<NVMesh> {
    return MeshFactory.loadFromFile(params)
  }

  async loadFromBase64(params: Partial<LoadFromBase64Params>): Promise<NVMesh> {
    return MeshFactory.loadFromBase64(params)
  }

  static async loadLayer(layer: NVMeshLayer, nvmesh: NVMesh): Promise<void> {
    return MeshFactory.loadLayer(layer, nvmesh)
  }

  unloadMesh(gl: WebGL2RenderingContext): void {
    // Resource cleanup stays in main class as it needs direct access to WebGL resources
    gl.deleteBuffer(this.indexBuffer)
    gl.deleteBuffer(this.vertexBuffer)
  }
}
```

**Status:** ⬜ Not Started

---

## Implementation Strategy

### Guiding Principles

1. **Backward Compatibility:** Maintain 100% backward compatibility with the existing public API
2. **Incremental Migration:** Move one module at a time, testing after each change
3. **Pure Functions:** Modules are namespaces of pure functions (following NVMeshLoaders/NVMeshUtilities pattern)
   - Functions that need NVMesh data receive it as first parameter
   - Utility functions are completely pure with explicit parameters
   - No circular dependencies or instance references
4. **Interface Contracts:** Define clear interfaces for each module
5. **Leverage Existing Work:** Build on already-extracted modules (NVMeshLoaders, NVMeshUtilities)
6. **Test Coverage:** Update Playwright tests as modules are created

### Module Pattern (Following NVMeshLoaders/NVMeshUtilities)

Each module should follow this pattern:

```typescript
// Example: FiberProcessing.ts
import { vec3, vec4 } from 'gl-matrix'
import type { NVMesh } from './index'

/**
 * Update fiber colors and visibility based on current filter settings.
 * @param nvMesh - The NVMesh instance
 * @param gl - WebGL rendering context
 */
export function updateFibers(nvMesh: NVMesh, gl: WebGL2RenderingContext): void {
  if (!nvMesh.offsetPt0 || !nvMesh.fiberLength) {
    return
  }
  // Implementation using nvMesh properties
  const pts = nvMesh.pts
  const offsetPt0 = nvMesh.offsetPt0
  // ... rest of implementation
}

/**
 * Convert streamlines to cylinder mesh for better rendering.
 * @param nvMesh - The NVMesh instance
 * @param gl - WebGL rendering context
 * @param posClrF32 - Position and color data
 * @param indices - Index array
 */
export function linesToCylinders(
  nvMesh: NVMesh,
  gl: WebGL2RenderingContext,
  posClrF32: Float32Array,
  indices: number[]
): void {
  // Implementation
}

// More functions...
```

**Key Principles:**
- Export individual functions (not a class)
- Functions that need NVMesh data take it as first parameter
- Pure utilities have explicit parameters only
- Use JSDoc for documentation
- Import types using `import type` for better tree-shaking

### Migration Process (Per Module)

For each module in the plan above:

1. **Create Module File**
   - Create new .ts file in `packages/niivue/src/nvmesh/` directory
   - Set up imports (dependencies and types)
   - Add module-level JSDoc comment

2. **Extract Functions**
   - Copy relevant methods from nvmesh.ts
   - Convert methods to exported functions
   - Add `nvMesh: NVMesh` as first parameter (if needed)
   - Replace `this.` with `nvMesh.`

3. **Update Main Class**
   - Import module functions at top of nvmesh.ts
   - Replace method bodies with delegation to module functions
   - Example: `updateFibers(gl) { return FiberProcessing.updateFibers(this, gl) }`

4. **Test**
   - Run existing unit tests
   - Run e2e tests
   - Verify no regressions

5. **Clean Up**
   - Remove old method bodies from nvmesh.ts (keep delegation)
   - Update any internal references

6. **Document**
   - Add JSDoc comments to all exported functions
   - Update README if needed
   - Add examples if helpful

### Phased Rollout

**Phase 1: Extract Fiber Processing (Medium Risk)**
- Well-defined fiber/tractography operations
- Clear separation from mesh operations
- Test with tractography files (TCK, TRK, TRX)

**Phase 2: Extract Mesh Operations (Medium Risk)**
- Core mesh manipulation
- Clear mathematical operations
- Test with various mesh formats

**Phase 3: Extract Factory Methods (Higher Risk)**
- Most complex due to dependencies on all other modules
- Requires careful orchestration
- Test with all supported formats

**Phase 4: Extract Connectome Module (Low Risk)**
- Self-contained connectome logic
- Clear data structures
- Test with connectome files

**Phase 5: Extract Colormap Module (Low Risk)**
- Layer and colormap management
- Clear responsibilities
- Test with multi-layer meshes

**Phase 6: Extract Spatial Query (Low Risk)**
- Simple geometric queries
- Minimal dependencies
- Easy to test in isolation

**Phase 7: Core Refactor (Final Integration)**
- Refactor main NVMesh class
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
- ✅ Fiber processing isolated and reusable
- ✅ Mesh operations isolated and reusable

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking changes to public API | High | Low | Maintain facade pattern, comprehensive testing |
| Fiber rendering regressions | High | Medium | Test with various tractography formats and rendering modes |
| Mesh operation errors | High | Low | Extensive unit tests with known mesh transformations |
| Performance degradation | Medium | Low | Benchmark before/after, optimize hot paths |
| WebGL resource leaks | High | Low | Careful testing of resource cleanup |
| Merge conflicts | Medium | Medium | Small PRs, frequent merges, clear communication |

---

## Task Tracking

### Phase 1: Extract Fiber Processing Module ⬜

- ⬜ 1.1 FiberProcessing Module

### Phase 2: Extract Mesh Operations Module ⬜

- ⬜ 2.1 MeshOperations Module

### Phase 3: Extract Factory and Loader Module ⬜

- ⬜ 3.1 MeshFactory Module

### Phase 4: Extract Connectome Module ⬜

- ⬜ 4.1 ConnectomeManager Module

### Phase 5: Extract Colormap and Layer Module ⬜

- ⬜ 5.1 MeshColormap Module

### Phase 6: Extract Spatial Query Module ⬜

- ⬜ 6.1 SpatialQuery Module

### Phase 7: Core Refactor ⬜

- ⬜ 7.1 NVMesh Core Class Refactor
- ⬜ Integration Testing
- ⬜ Performance Benchmarking
- ⬜ Documentation Update
- ⬜ Final Release

---

## Appendix

### A. Current File Statistics

```
File: packages/niivue/src/nvmesh.ts
Lines: 2,178
Size: ~76KB
Instance Methods: ~12
Static Methods: ~5
Properties: ~60 properties
Existing Modules: 3 (NVMeshLoaders, NVMeshUtilities, nvmesh-types)
```

### B. Module Size Targets

Each module should aim for:
- **Lines of Code:** < 500 lines per module
- **Methods:** < 15 methods per module
- **Properties:** Shared via NVMesh instance
- **Dependencies:** < 5 direct dependencies
- **Cyclomatic Complexity:** < 10 per method

### C. Testing Requirements

Each module must have:
- **Unit Tests:** 80%+ code coverage
- **Format-specific Tests:** Each mesh format tested with real files
- **Fiber Tests:** Tractography rendering with various fiber modes
- **E2E Tests:** No regressions in existing tests (or fix them if there are any)

### D. Documentation Requirements

Each module must have:
- **README:** Purpose, usage, examples
- **JSDoc:** All public functions documented
- **TypeScript Types:** Full type coverage
- **Format Specs:** Links to format specifications for loaders (already in NVMeshLoaders)

---

## Existing Modularization Examples

The following modules are already well-structured and serve as templates:

### NVMeshLoaders.ts (4116 lines)
- Handles all mesh format loading
- Static methods for each format
- Consistent pattern across formats
- Good separation of concerns

### NVMeshUtilities.ts (355 lines)
- Handles mesh utilities and conversions
- Pure static functions
- Clear, focused responsibility

### nvmesh-types.ts (170 lines)
- Type definitions for all mesh formats
- Clean TypeScript interfaces
- Well-documented types

These should be used as templates for the new modules.

---

## Module Dependencies

Since modules are function namespaces (not class instances), dependencies are simple import relationships:

```
MeshFactory functions
  ├─> Import all NVMeshLoaders functions
  ├─> Import MeshOperations functions (for updateMesh)
  ├─> Import FiberProcessing functions (for fiber meshes)
  └─> Import ConnectomeManager functions (for connectomes)

FiberProcessing functions
  └─> Access NVMesh fiber properties

MeshOperations functions
  ├─> Import NVMeshUtilities (for generateNormals)
  └─> Access NVMesh geometry properties

ConnectomeManager functions
  └─> Access NVMesh connectome properties

MeshColormap functions
  ├─> Import colortables (cmapper)
  └─> Access NVMesh layer properties

All module functions
  ├─> Receive NVMesh as first parameter (when needed)
  └─> Access NVMesh properties directly (no getters/setters needed)
```

**No Circular Dependencies:** Because modules are just function namespaces that receive NVMesh as a parameter, there are no circular dependency issues. The NVMesh class imports the modules, and the module functions receive NVMesh instances as parameters.

---

## Conclusion

This migration plan provides a structured approach to completing the modularization of the NVMesh class. By extracting fiber processing, mesh operations, and factory methods into focused modules, we can significantly improve code maintainability while preserving the existing API and functionality.

The modularization will result in:
- ✅ Better code organization
- ✅ Fiber processing isolated and testable
- ✅ Mesh operations isolated and reusable
- ✅ Improved testability (each module tested independently)
- ✅ Easier maintenance (bugs isolated to specific modules)
- ✅ Better documentation (each module self-contained)
- ✅ Reduced coupling between components
- ✅ Increased cohesion within modules
- ✅ Simpler debugging (smaller code units)
- ✅ Easier onboarding for new developers
- ✅ Reusable fiber and mesh utilities

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1 implementation (fiber processing)
3. Regular check-ins and progress updates
4. Update this document as modules are completed
