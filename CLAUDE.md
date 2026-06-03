# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NiiVue is a web-based neuroimaging visualization library built on WebGL 2.0. It's organized as a monorepo with npm workspaces containing the core library, documentation, desktop app, and various plugins.

## Essential Commands

### Development
```bash
npm run build:niivue     # Build core library
npm run build:docs       # Build documentation site
```

### Testing
```bash
npm run test:unit        # Run unit tests with coverage
npm run test:e2e         # Run Playwright end-to-end tests
npm run test-playwright  # Run Playwright tests only from packages/niivue
```

### Code Quality
```bash
npm run lint             # Run ESLint on all packages
```

## Repository Structure

This is a monorepo with the following key packages:
- **`packages/niivue/`** - Core NiiVue library (main package)
- **`packages/docs/`** - Docusaurus documentation site
- **`packages/niivue-desktop/`** - Electron desktop application
- **`packages/niivue-uikit/`** - UI components
- **`packages/dicom-loader/`**, **`packages/tiff-loader/`**, **`packages/vox-loader/`** - Format-specific loaders

## Core Architecture

### Main Entry Points
- **`packages/niivue/src/niivue/index.ts`** - Main NiiVue class and public API
- **`packages/niivue/src/index.html`** - Development HTML page
- **`packages/niivue/demos/`** - Live examples and demos

### Key Source Modules
- **`src/niivue/`** - Core NiiVue class, utilities, and main logic
- **`src/nvimage/`** - Image processing, volume handling, and format parsers
- **`src/nvmesh/`** - 3D mesh processing and rendering
- **`src/shader-srcs.ts`** - WebGL shader source code
- **`src/cmaps/`** - Color map definitions for visualization

### WebGL Architecture
The library is built around WebGL 2.0 with hardware-accelerated rendering. Shaders are defined in `shader-srcs.ts` and the rendering pipeline handles both volume and mesh data.

## Build System

### Primary Build Tool: tsup
- Builds TypeScript to ESM format
- Generates UMD bundles for AFNI, but will be deprecated in the future
- Source maps included for debugging
- Assets embedded as data URLs

### Development Server: Vite
- Hot reload for development
- Serves demos and examples
- Handles static assets

### TypeScript Configuration
- Target: ES2020
- Module: NodeNext
- Strict mode disabled for compatibility
- Explicit return types required

## Testing Strategy

### Unit Tests (Vitest)
- Run in Happy-DOM environment
- Coverage reporting with V8 provider
- Located in `packages/niivue/tests/`

### E2E Tests (Playwright)
- Visual regression testing with screenshot comparisons
- 5% pixel difference tolerance
- Runs on Chromium in headless mode
- Located in `packages/niivue/playwright/`

### Running Single Tests
```bash
npm run test:unit -- --run src/specific-test.test.ts
npx playwright test --grep "specific test name"
```

## Supported Formats

### Volume Formats
NIfTI, NRRD, MRtrix MIF, AFNI, MGH/MGZ, ITK MHD, ECAT7, DSI Studio

### Mesh Formats
GIfTI, FreeSurfer, PLY, STL, OBJ, VTK, and many others

### Tractography Formats
TCK, TRK, TRX, TSF

## Code Standards

### ESLint Configuration
- Standard JavaScript style with TypeScript extensions
- No floating promises allowed
- Enforced import ordering

### Prettier Configuration
- 2-space indentation
- 120 character line width
- Single quotes preferred
- Trailing commas in ES5 contexts

## Development Workflow

1. All changes start as GitHub issues
2. Feature branches from `main`
3. PRs require passing automated tests
4. At least one reviewer approval required
5. Protected `main` branch

## Dependency Management Guidelines

**Never suggest downgrading dependencies** (Electron, Node.js, or any other package) as a solution to compatibility issues. Instead:
- Find alternative libraries or polyfills that work with current versions
- Add new dependencies if needed to bridge compatibility gaps
- Modify code to use newer APIs or patterns
- Look for configuration changes or build tool adjustments

The project prioritizes staying on latest dependency versions for security and feature improvements.

## Key Dependencies

### Core Libraries
- **gl-matrix** - 3D math operations for WebGL
- **nifti-reader-js** - NIfTI file format parsing
- **fflate** - Compression/decompression
- **zarrita** - Zarr format support

### Development Tools
- **@playwright/test** - E2E testing framework
- **vitest** - Unit testing with coverage
- **eslint** & **prettier** - Code quality tools
- **tsup** - TypeScript build tool
- **typedoc** - API documentation generation

## Common Tasks

### Adding features or fixing bugs
1. Implement the new feature
2. Add a test for the new feature. Use vitest if the test does not require rendering. Use Playwright if the test needs to render something (needs a webgl canvas).
3. Update or add to the relevant docusaurus docs in `packages/docs`

### Adding New Image Formats
1. Create loader in `src/nvimage/` following existing patterns
2. Add format detection logic
3. Update format list in documentation
4. Add corresponding tests

### Modifying Shaders
1. Edit `src/shader-srcs.ts`
3. Test rendering changes thoroughly

### Adding Demos
1. Create new demo in `packages/niivue/demos/`
2. Follow existing demo structure
3. Add to demo index if needed

## Performance Considerations
- NiiVue is WebGL-based and performance-critical
- Shader modifications can significantly impact rendering performance
- Always test with realistic medical imaging datasets

## UIKit package (`@niivue/uikit`) conventions & follow-ups

The `@niivue/uikit` package (`packages/uikit/`) renders MSDF text + SDF shapes via WebGL2, and `packages/niivue-uikit/` is its demo. Hard-won conventions:

- **Text scale is an atlas-em fraction.** `UIKRenderer.drawRotatedText({ scale })` renders glyphs at `size = scale * font.fontMetrics.size` (atlas em ≈ 60px). `getTextWidth/getTextHeight(text, scale)` use the same definition, so any text *measurement* must use them (not `canvasHeight * scale`) or placement will disagree with rendering. A label that should be ~18px uses `scale ≈ 0.3`, NOT `0.03`.
- **Crisp MSDF sizing.** Components size labels via `UIKFont.fitTextScale(boxHeightPx, fraction, maxScale)`, which floors the rendered em at `MIN_TEXT_DEVICE_PX` (=20) so text stays sharp on standard-resolution monitors, and shrinks to fit short boxes. Button/view-mode/colormap all cap at `0.45` for a consistent label size. Atlases bake `distanceRange: 2`, so very small text aliases — prefer larger em over a wider AA ramp.
- **DPR handling lives in the host.** Components render into whatever (device-pixel) bounds they're given. The demo snaps each canvas backing store to `cssSize * devicePixelRatio` (`setupCanvas`, idempotent + live DPR) and re-snaps + `setBounds` on a `resize` that changes DPR (RAF-debounced, only when DPR actually changes). Hit-testing scales mouse offsets by `canvas.width / rect.width` (robust across DPR).
- `loadDefaultFont` must NOT rethrow — it builds a usable 1×1 fallback so component creation never aborts.
- **High-contrast rim convention.** Circular indicators (slider thumb, colormap selection bullet, toggle puck) and capsule outlines (button, view-mode, toggle) all draw a rim in the theme's high-contrast `textColor` so they read on light *and* dark backgrounds. Circle rims use `drawCircle({ fillPercent })` where rim thickness = `fillPercent * ringRadius`; for a fixed-pixel rim on a variable-size puck, derive `fillPercent = RIM_PX / ringRadius` (capped). Disabled toggles keep the rim + puck at full opacity and only wash the capsule fill/label, so the on/off position stays readable.
- **UIKColormapSelector renders no labels** — only the selection bullet + color gradient. The host shows the colormap name on hover via an HTML tooltip (page font), driven by `getHoveredColormap()`. The `font` option is `@deprecated`/ignored. The gradient bar is drawn as per-column `drawLine`s whose heights follow a rounded-capsule profile (`r = height/2`, `colHeight = 2·sqrt(r²−capDist²)`), plus a `drawRoundedRect` rim (transparent fill + `textColor` outline) — a beveled capsule matching the other controls, no extra shader.
- **Clear hover on `mouseleave`.** Interactive components track hover via `mousemove`; they must also handle `mouseleave`/`mouseout` to reset to NORMAL, or hover sticks once the cursor leaves the canvas (the demo dispatches `mouseleave` to every component).
- **2D primitives restore GL state.** `UIKRenderer.setup2D()` returns a `saveGLState()` snapshot and disables depth-test/face-cull + enables blend; `drawCircle`/`drawLine`/`drawTriangle`/`drawRoundedRect` (and `drawRotatedText`) call `restoreGLState()` at the end so blend/depth/cull don't leak into a shared host GL context. New primitives must use `setup2D()` + `restoreGLState()`. (The renderer's only public draws are drawTriangle/drawCircle/drawLine/drawRoundedRect/drawRotatedText/drawRuler — there are no colorbar/ellipse/projected-line public methods.)
- **JS uniform keys must match the GLSL name EXACTLY.** `UIKShader` records `this.uniforms[name]` keyed by the name parsed from the GLSL (`uniform <type> <name>;`). Setting `shader.uniforms.someWrongName` is silently `undefined` → a no-op (the uniform keeps its default). Bugs of this class found: `drawSegment`/`drawRotatedText` not setting `canvasWidthHeight` (→ divide-by-zero), and `u_isMTSDF` vs the shader's `isMTSDF`. When adding a draw path, set every uniform the shader declares, by its exact name.
- **Selectors normalize the selected value in BOTH the constructor and the setters** — an unknown initial colormap/mode snaps to index 0 and the stored string is updated to match, so the getter never disagrees with the highlighted row.

### UIKit follow-ups (open; see audit_response.md for the latest round's decisions)

Fixed in rounds 2–7 (do not re-report): **`drawRotatedText` now sets `canvasWidthHeight` (was unset → NaN outline alpha, dead outline params) and `isMTSDF` (was the wrong key `u_isMTSDF` → MTSDF fonts decoded as MSDF)**, **view-mode + colormap `mousemove` hover index clamped to valid range**, **removed the dead commented-out block in `rounded-rect.frag.glsl` (its commented `uniform` lines triggered a spurious UIKShader "declared but not used" warning per renderer)**, **removed the renderer's dead `texCoordBuffer` / attribute-1 setup**, default-font rethrow, no-volume colormap guard, delayed-init try/catch, dead button helpers, theme-mutation cleanup, circle debug-color, drawRuler measurement unit, slider NaN/step/`max===min`, toggle disabled-mid-animation + negative radius, toggle animation speed (linear ~2-frame), selector unknown-value snap (setters **and** constructors) + empty-list render guard + empty-list hit-test guard, zero-length `drawTriangle`/`drawRuler`, `drawTriangle` ARRAY_BUFFER unbind, **triangle `a_position` pinned to `layout(location=0)` (was read from the uniforms map, undefined→0 by accident)**, `drawSegment` `canvasWidthHeight` uniform, `drawRoundedRect` depth/cull via `setup2D`, **dashed-line `dashDotLength<=0` + `drawRuler` huge-`length` infinite-loop guards**, **removed 4 dead eagerly-compiled shaders (rect/colorbar/projected-line/elliptical-fill)**, `fitTextScale` metric guard, `UIKBitmap` shader paths, preset `JSON.parse` guard, redundant barrel exports, dead `dragOffset`, unused `Vec2` imports, GL-state save/restore in the 2D primitives, removed dead colormap style fields, colormap preview uses the host's real LUT (`colormapLUT`).

Still open (the standing backlog for a dedicated structural pass — raised across multiple review rounds):
- **Move the demo bootstrap out of `src/index.ts`** (registers a `window 'load'` listener + static Roboto imports at import time → forces happy-dom in tests + Vite double-import warning). Make the entry export-only; bootstrap → `src/demo.ts`. **Highest-value structural item.**
- **Resource lifecycle:** add `dispose()` to `UIKRenderer`/`UIKShader`/`UIKAsset`; `loadTexture` should delete the prior texture; the readback framebuffer must be restored/deleted; cancel the demo RAF loop + remove listeners/tooltip on teardown.
- **Demo perf:** invalidation rendering instead of an always-hot RAF (and `getContext` is called per-frame); cache `UIKColormapSelector.drawColormapPreview` to a texture. It issues ~`width` `drawLine`s per row **every frame** (≈1200/frame for the 6-row demo) — each is a separate draw with its own `setup2D`/`restoreGLState`. (Note: the `saveGLState` `getParameter`/`isEnabled` calls are client-side-cached lookups, not GPU stalls, so the real cost is the draw-call **count** — fix by rendering the gradient once to a texture and drawing one quad, or by capping the column count, both invalidated on LUT/theme/size change.)
- **Demo contexts:** share one renderer/context/font across UI controls instead of one GL context per control.
- **Hit-testing contract:** define one public coordinate space (CSS vs device px) + a native-event→device-px helper; extract the duplicated point-in-bounds / offsetXY blocks; fix/remove the inert `gl1` `handleMouseEvents` path.
- **Bounds immutability:** unify all components on `UIKButton`'s clone-on-get / copy-on-set so callers can't mutate internal bounds.
- **Route slider/toggle label & view text + panel title through `fitTextScale`** (still hardcoded `0.8`/`0.9`).
- **Font deserialization:** `UIKFont.fromJSON()` sets `isFontLoaded=true` without a texture — mark texture state explicitly. Also add a `loadDefaultFont` failure-status hook. And consolidate the duplicated glyph-mapping in `loadFromRawData` (bootstrap-only; omits `textureSize`/`family`/`style`) to delegate to `initFontMetrics` — do this with the bootstrap extraction.
- **`drawRotatedText` per-glyph allocation:** allocates `Array.from(str)` + an ortho matrix + a model & MVP matrix per glyph every call — reuse scratch matrices (pairs with render-on-change).
- **UIKPanel** draws its border as 4 `drawLine`s (ignores `cornerRadius` AND `backgroundOpacity`) — migrate to `drawRoundedRect`; also clamp layout so padding/spacing > content can't produce negative child sizes. Extract the shared disk-with-rim drawing into a renderer helper.
- **Canvas sizing:** `setupCanvas` should use `getBoundingClientRect()` as the CSS-size source, not inline attrs, so stylesheet/`!important` sizes agree.
- **Preset schema validation:** validate/clamp each preset field at the boundary (syntax is guarded; types are not).
- **Tests still wanted:** render smoke (DPR 1/2), native-event→device-px hit testing, lifecycle/disposal, `loadDefaultFont` failure, `fromJSON` renderability.
- Consider source aliases / opt-in for `predev:uikit`.
- **Triangle AA shader is inert** (`triangle.frag.glsl`): mixes window-space `gl_FragCoord.x` with an NDC-scaled threshold, so the `u_antialiasing`/`u_canvasSize` uniforms do nothing (triangles render solid/aliased; arrowheads look fine). Cosmetic — drop the dead AA term or drive it from an edge-distance varying.
- **`UIKShader` robustness:** `setUniform` routes all scalars through `uniform1f` (can't express int/bool — unused internally but a type-incomplete public contract); the uniform-parse regex is single-declaration-only (no arrays / multiple-per-line). Note `fonts.png` was removed.

## Git commits
- Do not add claude as a co-author to git commits