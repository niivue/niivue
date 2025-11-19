/**
 * WebGL utility functions for context initialization and texture management.
 * This module provides pure functions for WebGL operations that can be reused
 * throughout the library without class instantiation overhead.
 */

// Texture unit constants
const TEXTURE3_FONT = 33987
const TEXTURE4_THUMBNAIL = 33988
const TEXTURE5_MATCAP = 33989

/**
 * Initialize WebGL2 context and detect GPU capabilities
 * @param canvas - The canvas element to attach to
 * @param isAntiAlias - Whether to enable anti-aliasing
 * @returns Object containing gl context and GPU limits
 */
export function initGL(
  canvas: HTMLCanvasElement,
  isAntiAlias: boolean
): { gl: WebGL2RenderingContext; max2D: number; max3D: number } {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: isAntiAlias
  })

  if (!gl) {
    throw new Error('Unable to initialize WebGL2. Your browser may not support it.')
  }

  return {
    gl,
    max2D: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    max3D: gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) as number
  }
}

/**
 * Creates a 3D 1-component uint8 texture on the GPU with given dimensions.
 * @param gl - WebGL2 rendering context
 * @param texID - Existing texture to delete (null for new texture)
 * @param activeID - Texture unit to activate
 * @param dims - Dimensions array [0, width, height, depth]
 * @param isInit - Whether to initialize with zeros
 * @returns The created WebGL texture
 */
export function r8Tex(
  gl: WebGL2RenderingContext,
  texID: WebGLTexture | null,
  activeID: number,
  dims: number[],
  isInit = false
): WebGLTexture | null {
  if (texID) {
    gl.deleteTexture(texID)
  }
  texID = gl.createTexture()
  gl.activeTexture(activeID)
  gl.bindTexture(gl.TEXTURE_3D, texID)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R8, dims[1], dims[2], dims[3])
  if (isInit) {
    const img8 = new Uint8Array(dims[1] * dims[2] * dims[3])
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, dims[1], dims[2], dims[3], gl.RED, gl.UNSIGNED_BYTE, img8)
  }
  return texID
}

/**
 * Creates or updates a 1-component 16-bit signed integer 3D texture on the GPU.
 * @param gl - WebGL2 rendering context
 * @param texID - Existing texture to delete (null for new texture)
 * @param activeID - Texture unit to activate
 * @param dims - Dimensions array [0, width, height, depth]
 * @param img16 - 16-bit signed integer data
 * @returns The created WebGL texture
 */
export function r16Tex(
  gl: WebGL2RenderingContext,
  texID: WebGLTexture | null,
  activeID: number,
  dims: number[],
  img16: Int16Array
): WebGLTexture {
  if (texID) {
    gl.deleteTexture(texID)
  }
  texID = gl.createTexture()!
  gl.activeTexture(activeID)
  gl.bindTexture(gl.TEXTURE_3D, texID)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R16I, dims[1], dims[2], dims[3])
  const nv = dims[1] * dims[2] * dims[3]
  if (img16.length !== nv) {
    img16 = new Int16Array(nv)
  }
  gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, dims[1], dims[2], dims[3], gl.RED_INTEGER, gl.SHORT, img16)

  return texID
}

/**
 * Creates a 2D 4-component (RGBA) uint8 texture on the GPU with optional vertical flip.
 * @param gl - WebGL2 rendering context
 * @param texID - Existing texture to delete (null for new texture)
 * @param activeID - Texture unit to activate
 * @param dims - Dimensions array [0, width, height]
 * @param data - Optional RGBA data
 * @param isFlipVertical - Whether to flip texture vertically
 * @returns The created WebGL texture
 */
export function rgbaTex2D(
  gl: WebGL2RenderingContext,
  texID: WebGLTexture | null,
  activeID: number,
  dims: number[],
  data: Uint8Array | null = null,
  isFlipVertical = true
): WebGLTexture | null {
  if (texID) {
    gl.deleteTexture(texID)
  }
  texID = gl.createTexture()
  gl.activeTexture(activeID)
  gl.bindTexture(gl.TEXTURE_2D, texID)

  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

  // Allocate storage for the 2D texture
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, dims[1], dims[2])
  if (data) {
    let drawData = data
    const width = dims[1]
    const height = dims[2]
    if (isFlipVertical) {
      drawData = new Uint8Array(data.length)
      const rowSize = width * 4 // RGBA has 4 bytes per pixel
      for (let y = 0; y < height; y++) {
        const srcStart = y * rowSize
        const destStart = (height - 1 - y) * rowSize
        drawData.set(data.subarray(srcStart, srcStart + rowSize), destStart)
      }
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, drawData)
  }
  return texID
}

/**
 * Creates a 3D 4-component (RGBA) uint8 texture on the GPU.
 * @param gl - WebGL2 rendering context
 * @param texID - Existing texture to delete (null for new texture)
 * @param activeID - Texture unit to activate
 * @param dims - Dimensions array [0, width, height, depth]
 * @param isInit - Whether to initialize with zeros
 * @returns The created WebGL texture
 */
export function rgbaTex(
  gl: WebGL2RenderingContext,
  texID: WebGLTexture | null,
  activeID: number,
  dims: number[],
  isInit = false
): WebGLTexture | null {
  if (texID) {
    gl.deleteTexture(texID)
  }
  texID = gl.createTexture()
  gl.activeTexture(activeID)
  gl.bindTexture(gl.TEXTURE_3D, texID)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA8, dims[1], dims[2], dims[3])
  if (isInit) {
    const img8 = new Uint8Array(dims[1] * dims[2] * dims[3] * 4)
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, dims[1], dims[2], dims[3], gl.RGBA, gl.UNSIGNED_BYTE, img8)
  }
  return texID
}

/**
 * Create or recreate a 3D RGBA16UI texture on the GPU with given dimensions.
 * @param gl - WebGL2 rendering context
 * @param texID - Existing texture to delete (null for new texture)
 * @param activeID - Texture unit to activate
 * @param dims - Dimensions array [0, width, height, depth]
 * @param isInit - Whether to initialize with zeros
 * @returns The created WebGL texture
 */
export function rgba16Tex(
  gl: WebGL2RenderingContext,
  texID: WebGLTexture | null,
  activeID: number,
  dims: number[],
  isInit = false
): WebGLTexture | null {
  if (texID) {
    gl.deleteTexture(texID)
  }
  texID = gl.createTexture()
  gl.activeTexture(activeID)
  gl.bindTexture(gl.TEXTURE_3D, texID)
  // Note: cannot be gl.LINEAR for integer textures
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2)
  gl.pixelStorei(gl.PACK_ALIGNMENT, 2)
  gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA16UI, dims[1], dims[2], dims[3])
  if (isInit) {
    const img16 = new Uint16Array(dims[1] * dims[2] * dims[3] * 4)
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, dims[1], dims[2], dims[3], gl.RGBA_INTEGER, gl.UNSIGNED_SHORT, img16)
  }
  return texID
}

/**
 * Remove cross-origin attribute from image if its URL is not from the same origin as the current page.
 * @param img - The image element
 * @param url - The image URL
 */
export function requestCORSIfNotSameOrigin(img: HTMLImageElement, url: string): void {
  if (new URL(url, window.location.href).origin !== window.location.origin) {
    img.crossOrigin = ''
  }
}

/**
 * Loads a PNG image from a URL and creates a 4-component (RGBA) uint8 WebGL texture.
 * @param gl - WebGL2 rendering context
 * @param pngUrl - URL of the PNG image
 * @param textureNum - Texture unit number (3=font, 4=thumbnail, 5=matcap)
 * @param fontShader - Font shader (required for textureNum 3)
 * @param bmpShader - Bitmap shader (required for textureNum 4)
 * @param fontTexture - Current font texture reference (will be deleted if not null)
 * @param bmpTexture - Current bitmap texture reference (will be deleted if not null)
 * @param matCapTexture - Current matcap texture reference (will be deleted if not null)
 * @param onBmpTextureLoaded - Callback when bitmap texture loaded with width/height ratio
 * @param onDrawScene - Callback to redraw scene
 * @returns Promise resolving to the created texture
 */
export async function loadPngAsTexture(
  gl: WebGL2RenderingContext,
  pngUrl: string,
  textureNum: number,
  fontShader: { use: (gl: WebGL2RenderingContext) => void; uniforms: Record<string, WebGLUniformLocation> } | null,
  bmpShader: { use: (gl: WebGL2RenderingContext) => void; uniforms: Record<string, WebGLUniformLocation> } | null,
  fontTexture: WebGLTexture | null,
  bmpTexture: WebGLTexture | null,
  matCapTexture: WebGLTexture | null,
  onBmpTextureLoaded?: (widthHeightRatio: number) => void,
  onDrawScene?: () => void
): Promise<WebGLTexture | null> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = (): void => {
      if (!bmpShader) {
        return
      }
      let pngTexture: WebGLTexture | null

      if (textureNum === 4) {
        // Delete old texture if it exists
        if (bmpTexture !== null) {
          gl.deleteTexture(bmpTexture)
        }
        // Create new texture
        pngTexture = gl.createTexture()
        const bmpTextureWH = img.width / img.height
        gl.activeTexture(TEXTURE4_THUMBNAIL)
        bmpShader.use(gl)
        gl.uniform1i(bmpShader.uniforms.bmpTexture, 4)
        if (onBmpTextureLoaded) {
          onBmpTextureLoaded(bmpTextureWH)
        }
      } else if (textureNum === 5) {
        // Delete old texture if it exists
        if (matCapTexture !== null) {
          gl.deleteTexture(matCapTexture)
        }
        // Create new texture
        pngTexture = gl.createTexture()
        gl.activeTexture(TEXTURE5_MATCAP)
      } else {
        // textureNum === 3 (font)
        if (!fontShader) {
          reject(new Error('Font shader required for texture unit 3'))
          return
        }
        // Delete old texture if it exists
        if (fontTexture !== null) {
          gl.deleteTexture(fontTexture)
        }
        // Create new texture
        pngTexture = gl.createTexture()
        fontShader.use(gl)
        gl.activeTexture(TEXTURE3_FONT)
        gl.uniform1i(fontShader.uniforms.fontTexture, 3)
      }

      gl.bindTexture(gl.TEXTURE_2D, pngTexture)
      // Set the parameters so we can render any size image.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      // Upload the image into the texture.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      resolve(pngTexture)
      if (textureNum !== 4 && onDrawScene) {
        onDrawScene()
      }
    }
    img.onerror = reject
    requestCORSIfNotSameOrigin(img, pngUrl)
    img.src = pngUrl
  })
}
