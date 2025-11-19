# WebGL Utilities Module

## Purpose

The `gl.ts` module provides pure functions for WebGL2 context initialization and texture management. These utility functions can be reused throughout the Niivue library 

## Responsibility

- WebGL2 context initialization and configuration
- GPU capability detection (max 2D/3D texture sizes)
- Texture creation for various formats (R8, R16I, RGBA8, RGBA16UI)
- 2D and 3D texture management
- CORS handling for external image resources
- PNG image loading as WebGL textures

## Design Philosophy

This module uses **pure functions** instead of classes:
- More reusable - any part of the codebase can import and use them
- Easier to test - just pass in a WebGL context
- Simpler - no class instantiation, no `this` binding
- Better tree-shaking - unused functions can be eliminated
- Functional & composable - aligns with modern patterns

## Usage

### Initialization

```typescript
import { initGL } from '@/niivue/core/gl'

const { gl, max2D, max3D } = initGL(canvasElement, true) // true = antialiasing enabled
console.log(`Max 2D texture size: ${max2D}`)
console.log(`Max 3D texture size: ${max3D}`)
```

### Creating Textures

```typescript
import { r8Tex, rgbaTex, rgbaTex2D } from '@/niivue/core/gl'

// Create a 3D R8 texture
const texture = r8Tex(gl, null, gl.TEXTURE0, [0, 256, 256, 256], true)

// Create a 3D RGBA texture
const rgbaTexture = rgbaTex(gl, null, gl.TEXTURE1, [0, 256, 256, 256], true)

// Create a 2D RGBA texture with data
const data = new Uint8Array(256 * 256 * 4)
const texture2D = rgbaTex2D(gl, null, gl.TEXTURE2, [0, 256, 256], data, true)
```

### Loading Images as Textures

```typescript
import { loadPngAsTexture } from '@/niivue/core/gl'

const texture = await loadPngAsTexture(
  gl,
  'path/to/image.png',
  3, // texture unit
  fontShader,
  bmpShader,
  currentFontTexture,
  currentBmpTexture,
  currentMatCapTexture,
  (widthHeightRatio) => console.log(`Aspect ratio: ${widthHeightRatio}`),
  () => console.log('Redrawing scene')
)
```

## API Reference

All functions are pure and accept a WebGL2RenderingContext as their first parameter:

### Initialization

- `initGL(canvas, isAntiAlias)` - Returns `{ gl, max2D, max3D }`

### Texture Creation

- `r8Tex(gl, texID, activeID, dims, isInit)` - Create 3D R8 texture
- `r16Tex(gl, texID, activeID, dims, img16)` - Create 3D R16I texture
- `rgbaTex2D(gl, texID, activeID, dims, data, isFlipVertical)` - Create 2D RGBA texture
- `rgbaTex(gl, texID, activeID, dims, isInit)` - Create 3D RGBA texture
- `rgba16Tex(gl, texID, activeID, dims, isInit)` - Create 3D RGBA16UI texture

### Utilities

- `requestCORSIfNotSameOrigin(img, url)` - Handle CORS for external images
- `loadPngAsTexture(gl, ...)` - Load PNG image as WebGL texture

TypeScript will infer all types from the function signatures.

## Dependencies

None - This is a foundational module with no dependencies on other Niivue modules.

## Integration with Niivue

The main Niivue class uses these utilities directly:

```typescript
import * as glUtils from '@/niivue/core/gl'

export class Niivue {
  _gl: WebGL2RenderingContext | null = null

  async attachToCanvas(canvas: HTMLCanvasElement, isAntiAlias: boolean) {
    const { gl, max2D, max3D } = glUtils.initGL(canvas, isAntiAlias)
    this.gl = gl
    this.uiData.max2D = max2D
    this.uiData.max3D = max3D
  }

  r8Tex(texID, activeID, dims, isInit) {
    return glUtils.r8Tex(this.gl, texID, activeID, dims, isInit)
  }
}
```

All existing public API methods are preserved for backward compatibility.
