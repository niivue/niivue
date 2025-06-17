// Core UIKit exports
export { UIKRenderer } from './uikrenderer'
export { UIKFont } from './assets/uikfont'
export { UIKShader } from './uikshader'

// Import for internal use in helper functions
import { UIKRenderer } from './uikrenderer'
import { UIKFont } from './assets/uikfont'

// Type definitions
export * from './types'

// Interactive components
export * from './components'

/**
 * UIKit version and build information
 */
export const UIK_VERSION = '0.1.0-experimental'
export const UIK_BUILD_DATE = new Date().toISOString()

/**
 * Helper function to check WebGL2 compatibility for UIKit
 */
export function checkUIKitCompatibility(canvas: HTMLCanvasElement): {
  compatible: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  // Check WebGL2 support
  const gl = canvas.getContext('webgl2')
  if (!gl) {
    issues.push('WebGL2 not supported')
    return { compatible: false, issues }
  }

  // Check required extensions and features
  const requiredExtensions = ['EXT_color_buffer_float']
  for (const ext of requiredExtensions) {
    if (!gl.getExtension(ext)) {
      issues.push(`Missing extension: ${ext}`)
    }
  }

  // Check WebGL limits
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  if (maxTextureSize < 2048) {
    issues.push(`Insufficient texture size: ${maxTextureSize} (minimum: 2048)`)
  }

  const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
  if (maxVertexAttribs < 8) {
    issues.push(`Insufficient vertex attributes: ${maxVertexAttribs} (minimum: 8)`)
  }

  return {
    compatible: issues.length === 0,
    issues
  }
}

/**
 * Initialize UIKit with a Niivue instance
 * This is a helper function to set up UIKit integration
 */
export async function initializeUIKitWithNiivue(
  niivue: any, // Using any to avoid circular dependency
  options: {
    fontColor?: number[]
    enableDebugMode?: boolean
  } = {}
): Promise<void> {
  try {
    // Initialize UIKit renderer
    niivue.ui = new UIKRenderer(niivue.gl)
    
    // Initialize default font
    niivue.defaultFont = new UIKFont(niivue.gl)
    // TODO: Load default font when loadDefaultFont method is implemented

    // Add UIKit initialization marker
    ;(niivue as any)._uikitInitialized = true

    if (options.enableDebugMode) {
      console.log('UIKit initialized successfully', {
        renderer: !!niivue.ui,
        font: !!niivue.defaultFont,
        fontLoaded: niivue.defaultFont.isFontLoaded
      })
    }
  } catch (error) {
    console.error('Failed to initialize UIKit:', error)
    throw error
  }
}
