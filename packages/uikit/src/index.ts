import { UIKRenderer } from "./uikrenderer.js"
import { UIKFont } from "./assets/uikfont.js"
import { LineTerminator, LineStyle, Vec2 } from "./types.js"
import defaultFontPNG from "./fonts/Roboto-Regular.png"
import defaultFontJSON from "./fonts/Roboto-Regular.json" assert { type: "json" }



// Core UIKit exports
export { UIKRenderer } from './uikrenderer'
export { UIKFont } from './assets/uikfont'
export { UIKShader } from './uikshader'

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

window.addEventListener("load", async () => {
  const canvas = document.getElementById("uikCanvas") as HTMLCanvasElement
  if (!canvas) {
    console.error('Cannot find <canvas id="uikCanvas"> in document.')
    return
  }

  const gl = canvas.getContext("webgl2")
  if (!gl) {
    alert("WebGL2 is not supported by your browser.")
    return
  }

  const renderer = new UIKRenderer(gl)
  gl.clearColor(0.9, 0.9, 0.9, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  // 👉 Load and use UIKFont to draw text and ruler
  const font = new UIKFont(gl)
  const fontTexture = await font.loadFontTexture(defaultFontPNG)
  if (!fontTexture) {
    throw new Error(`texture not loaded from ${defaultFontPNG}`)
  }
  font.loadFromRawData(defaultFontJSON)

  renderer.drawCircle({
    leftTopWidthHeight: [50, 50, 200, 200],
    circleColor: [0.1, 0.8, 0.1, 1],
    fillPercent: 1.0,
    z: 0,
  })

  renderer.drawLine({
    startEnd: [50, 300, 750, 300],
    thickness: 4,
    color: [1, 0, 0, 1],
    terminator: LineTerminator.NONE,
    style: LineStyle.SOLID,
  })

  renderer.drawTriangle({
    headPoint: [500, 350],
    baseMidPoint: [500, 500],
    baseLength: 150,
    color: [0, 0.2, 1, 1],
    z: 0,
  })

  renderer.drawLine({
    startEnd: [700, 100, 100, 500],
    thickness: 3,
    color: [0, 0, 0, 1],
    terminator: LineTerminator.ARROW,
    style: LineStyle.DASHED,
    dashDotLength: 20,
  })

  // Draw a ruler between two points
  const pointA: Vec2 = [150, 600]
  const pointB: Vec2 = [650, 250]
  renderer.drawRuler({
    pointA,
    pointB,
    length: 42.68,
    units: "mm",
    font,
    textColor: [0.1, 0.1, 0.1, 1],
    lineColor: [0.2, 0.2, 0.2, 1],
    lineThickness: 2,
    offset: 40,
    scale: 0.03,
  })

  // Draw rotated text
  renderer.drawRotatedText({
    font,
    xy: [300, 100],
    str: "Rotated Text",
    scale: 0.03,
    color: [0.2, 0.2, 0.2, 1],
    rotation: Math.PI / 8,
  })

  // demo: draw a rounded rect at pixel (100,100) sized 250×150
  renderer.drawRoundedRect({
    bounds: [200, 50, 450, 150],
    fillColor: [0.2, 0.6, 1, 0.5], // semi‐transparent blue
    bottomColor: [0.1, 0.1, 0.3, 0.7], // darker at bottom
    outlineColor: [0, 0, 0, 1], // solid black border
    cornerRadius: 20, // px
    thickness: 8, // outline thickness
  })  
})
