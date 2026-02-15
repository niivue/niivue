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

## Git commits
- Do not add claude as a co-author to git commits