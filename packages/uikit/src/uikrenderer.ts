import { mat4 } from 'gl-matrix'
import { UIKShader } from './uikshader.js'
import fontVert from './shaders/font.vert.glsl'
import fontFrag from './shaders/font.frag.glsl'
import { Color, Vec2, HorizontalAlignment, OffsetDirection } from './types.js'
import { UIKFont } from './assets/uikfont.js'

export class UIKRenderer {
  private _gl: WebGL2RenderingContext
  protected static fontShader: UIKShader
  protected static genericVAO: WebGLVertexArrayObject
  protected static triangleVertexBuffer: WebGLBuffer

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl    

    if (!UIKRenderer.fontShader) {
      UIKRenderer.fontShader = new UIKShader(gl, fontVert, fontFrag)
    }    

    if (!UIKRenderer.genericVAO) {
      const rectStrip = [
        1, 1, 0, // Top-right
        1, 0, 0, // Bottom-right
        0, 1, 0, // Top-left
        0, 0, 0  // Bottom-left
      ]
      const vao = gl.createVertexArray()!
      const vbo = gl.createBuffer()!

      gl.bindVertexArray(vao)

      // Setup position VBO
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rectStrip), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

      gl.bindVertexArray(null)
      const texCoordData = [
        1.0,
        1.0, // Top-right
        1.0,
        0.0, // Bottom-right
        0.0,
        1.0, // Top-left
        0.0,
        0.0 // Bottom-left
      ]

      const texCoordBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoordData), gl.STATIC_DRAW)

      // Assign a_texcoord (location = 1)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)

      gl.bindVertexArray(null) // Unbind VAO when done
      

      UIKRenderer.genericVAO = vao
    }
    
  }

  
  calculateOuterColor(fontColor: Color): Color {
    // Extract RGB components
    const r = fontColor[0]
    const g = fontColor[1]
    const b = fontColor[2]
  
    // Calculate the magnitude of the RGB vector
    const rgbLength = Math.sqrt(r ** 2 + g ** 2 + b ** 2)
  
    // Apply the step function logic
    const outerColorValue = 1.0 - (rgbLength >= 0.1 ? 1.0 : 0.0)
  
    // Return the resulting color as a Color type
    return [outerColorValue, outerColorValue, outerColorValue, fontColor[3]]
  }

  /**
 * Draws text, supporting rotation, individual character rendering and high-DPI scaling.
 * @param params - Object containing parameters for rendering rotated text.
 * @param params.font - The font object for rendering text.
 * @param params.xy - The starting position of the text.
 * @param params.str - The string to render.
 * @param params.scale - The scale of the text. Defaults to 1.0.
 * @param params.color - The color of the text. Defaults to red.
 * @param params.rotation - The rotation angle in radians. Defaults to 0.
 * @param params.outlineColor - The outline color of the text. Defaults to black.
 * @param params.isOutline - Draw an outline around the letters.ß
 * @param params.maxWidth - Maximum width for text wrapping.
 * @param params.alignment - Alignment / Justification of text
 */
public drawText({
  font,
  xy,
  str,
  scale = 1.0,
  color = [1.0, 0.0, 0.0, 1.0],
  rotation = 0.0,
  outlineColor = [0, 0, 0, 1],
  isOutline = false,
  maxWidth = 0,
  alignment = HorizontalAlignment.LEFT
}: {
  font: UIKFont
  xy: Vec2
  str: string
  scale?: number
  color?: Color
  rotation?: number
  outlineColor?: Color | null
  isOutline?: boolean
  maxWidth?: number
  alignment?: HorizontalAlignment
}): void {
  if (!font.isFontLoaded) {
    throw new Error('font not loaded')
  }

  if (!UIKRenderer.fontShader) {
    throw new Error('rotatedTextShader undefined')
  }

  const rotatedFontShader = UIKRenderer.fontShader
  const gl = this._gl

  if (!outlineColor) {
    outlineColor = this.calculateOuterColor(color)
  }

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, font.getTexture())
  rotatedFontShader.use(gl)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.disable(gl.DEPTH_TEST)
  gl.disable(gl.CULL_FACE)

  const finalColor = color || font.fontColor
  gl.uniform4fv(rotatedFontShader.uniforms.fontColor, finalColor)
  
  gl.uniform4fv(rotatedFontShader.uniforms.outlineColor, isOutline ? outlineColor : [finalColor[0], finalColor[1], finalColor[2], 0])

  const size = scale * font.fontMetrics!.size
  let screenPxRange = (size / font.fontMetrics!.size) * font.fontMetrics!.distanceRange
  screenPxRange = Math.max(screenPxRange, 1.0)

  const absoluteWidth = 0.33333
  const relativeWidth = 0.05
  const outlineOffset = isOutline ? (absoluteWidth + relativeWidth * screenPxRange) * scale : 0

  gl.uniform1f(rotatedFontShader.uniforms.screenPxRange, screenPxRange)
  gl.uniform1i(rotatedFontShader.uniforms.isOutline, isOutline ? 1 : 0)
  gl.uniform2fv(rotatedFontShader.uniforms.canvasWidthHeight, [
    gl.canvas.width * (window.devicePixelRatio || 1.0),
    gl.canvas.height * (window.devicePixelRatio || 1.0)
  ])

  gl.bindVertexArray(UIKRenderer.genericVAO)
  const orthoMatrix = mat4.create()
  mat4.ortho(orthoMatrix, 0, gl.canvas.width, gl.canvas.height, 0, -1, 1)

  const words = str.split(' ')
  const lines: string[] = []

  if (maxWidth > 0) {
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = font.getTextWidth(testLine, scale)
      if (testWidth > maxWidth) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) {
      lines.push(currentLine)
    }
  } else {
    lines.push(str)
  }

  const lineHeight = font.getTextHeight(size)
  const perpendicularX = -Math.sin(rotation) * lineHeight
  const perpendicularY = Math.cos(rotation) * lineHeight

  let baselineX = xy[0]
  let baselineY = xy[1] - outlineOffset

  lines.forEach((line) => {
    const lineWidth = font.getTextWidth(line, size)
    let alignmentOffsetX = 0
    let alignmentOffsetY = 0
    switch (alignment) {
      case HorizontalAlignment.CENTER:
        alignmentOffsetX = -Math.cos(rotation) * lineWidth / 2
        alignmentOffsetY = -Math.sin(rotation) * lineWidth / 2
        break
      case HorizontalAlignment.RIGHT:
        alignmentOffsetX = -Math.cos(rotation) * lineWidth
        alignmentOffsetY = -Math.sin(rotation) * lineWidth
        break
      case HorizontalAlignment.LEFT:
      default:
        alignmentOffsetX = 0
        alignmentOffsetY = 0
        break
    }

    const modelMatrix = mat4.create()
    mat4.translate(modelMatrix, modelMatrix, [baselineX + alignmentOffsetX, baselineY + alignmentOffsetY, 0.0])
    mat4.rotateZ(modelMatrix, modelMatrix, rotation)

    let currentX = 0

    for (const char of Array.from(line)) {
      const metrics = font.fontMetrics!.mets[char]
      if (!metrics) {
        continue
      }

      const charWidth = metrics.lbwh[2] * size
      const charHeight = metrics.lbwh[3] * size
      const charOffsetX = metrics.lbwh[0] * size
      const charOffsetY = metrics.lbwh[1] * size

      const rotatedCharX = currentX + charOffsetX
      const rotatedCharY = charOffsetY

      const charModelMatrix = mat4.clone(modelMatrix)
      mat4.translate(charModelMatrix, charModelMatrix, [
        rotatedCharX,
        -rotatedCharY,
        0.0
      ])
      mat4.scale(charModelMatrix, charModelMatrix, [charWidth, -charHeight, 1.0])

      const mvpMatrix = mat4.create()
      mat4.multiply(mvpMatrix, orthoMatrix, charModelMatrix)

      gl.uniformMatrix4fv(rotatedFontShader.uniforms.modelViewProjectionMatrix, false, mvpMatrix)
      gl.uniform4fv(rotatedFontShader.uniforms.uvLeftTopWidthHeight, metrics.uv_lbwh)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      currentX += metrics.xadv * size
    }

    baselineX += perpendicularX
    baselineY += perpendicularY
  })

  gl.bindVertexArray(null)
}

public drawTextOffset({
  font,
  xy,
  str,
  scale = 1.0,
  color = [1.0, 0.0, 0.0, 1.0],
  rotation = 0.0,
  outlineColor = null,
  isOutline = false,
  maxWidth = 0,
  direction = OffsetDirection.Below
}: {
  font: UIKFont
  xy: Vec2
  str: string
  scale?: number
  color?: Color
  rotation?: number
  outlineColor?: Color | null
  isOutline?: boolean
  maxWidth?: number
  direction?: OffsetDirection
}): void {
  let adjustedX = xy[0]
  let adjustedY = xy[1]

  let alignment: HorizontalAlignment = HorizontalAlignment.CENTER
  
  const size = scale * font.fontMetrics!.size
  const strWidth = font.getTextWidth(str, size)
  
  switch (direction) {
    case OffsetDirection.Below: {
      // push ascenders below baseline
      const ascenderHeight = font.fontMetrics!.ascender * size
      adjustedY = xy[1] + ascenderHeight 
      break
    }
    case OffsetDirection.Above:
      // pull descenders up to baseline
      adjustedY = xy[1] + font.fontMetrics!.descender * size
      break
    case OffsetDirection.LeftOf:
      adjustedX = xy[0] - strWidth
      alignment = HorizontalAlignment.LEFT
      break
    case OffsetDirection.RightOf:
      adjustedX = xy[0] + strWidth
      alignment = HorizontalAlignment.RIGHT
      break
    case OffsetDirection.CenteredOn: {
      
      adjustedY = xy[1] + size * (font.fontMetrics!.ascender + font.fontMetrics!.descender) / 2
      break
    }

  }

  this.drawText({
    font,
    xy: [adjustedX, adjustedY],
    str,
    scale,
    color,
    rotation,
    outlineColor,
    isOutline,
    maxWidth,
    alignment,
  })
}

public drawTextBelow({
  font,
  xy,
  str,
  scale = 1.0,
  color = [1.0, 0.0, 0.0, 1.0],
  rotation = 0.0,
  outlineColor = null,
  isOutline = false,
  maxWidth = 0,
}: {
  font: UIKFont
  xy: Vec2
  str: string
  scale?: number
  color?: Color
  rotation?: number
  outlineColor?: Color | null
  isOutline?: boolean
  maxWidth?: number
}): void {  
  this.drawTextOffset({ font, xy, str, scale, color, rotation, outlineColor, isOutline, maxWidth, direction: OffsetDirection.Below })
}

public drawTextAbove({
  font,
  xy,
  str,
  scale = 1.0,
  color = [1.0, 0.0, 0.0, 1.0],
  rotation = 0.0,
  outlineColor = null,
  isOutline = false,
  maxWidth = 0,
}: {
  font: UIKFont
  xy: Vec2
  str: string
  scale?: number
  color?: Color
  rotation?: number
  outlineColor?: Color | null
  isOutline?: boolean
  maxWidth?: number
  alignment?: HorizontalAlignment
}): void {  
  this.drawTextOffset({ font, xy, str, scale, color, rotation, outlineColor, isOutline, maxWidth, direction: OffsetDirection.Above })
}

public drawTextLeftOf({
  font,
  xy,
  str,
  scale = 1.0,
  color = [1.0, 0.0, 0.0, 1.0],
  rotation = 0.0,
  outlineColor = null,
  isOutline = false,
  maxWidth = 0,
}: {
  font: UIKFont
  xy: Vec2
  str: string
  scale?: number
  color?: Color
  rotation?: number
  outlineColor?: Color | null
  isOutline?: boolean
  maxWidth?: number
}): void {  
  this.drawTextOffset({ font, xy, str, scale, color, rotation, outlineColor, isOutline, maxWidth, direction: OffsetDirection.LeftOf })
}

public drawTextRightOf({
  font,
  xy,
  str,
  scale = 1.0,
  color = [1.0, 0.0, 0.0, 1.0],
  rotation = 0.0,
  outlineColor = null,
  isOutline = false,
  maxWidth = 0,
}: {
  font: UIKFont
  xy: Vec2
  str: string
  scale?: number
  color?: Color
  rotation?: number
  outlineColor?: Color | null
  isOutline?: boolean
  maxWidth?: number
}): void {  
  this.drawTextOffset({ font, xy, str, scale, color, rotation, outlineColor, isOutline, maxWidth, direction: OffsetDirection.RightOf })
}

public drawTextCenteredOn({
  font,
  xy,
  str,
  scale = 1.0,
  color = [1.0, 0.0, 0.0, 1.0],
  rotation = 0.0,
  outlineColor = null,
  isOutline = false,
  maxWidth = 0,
}: {
  font: UIKFont
  xy: Vec2
  str: string
  scale?: number
  color?: Color
  rotation?: number
  outlineColor?: Color | null
  isOutline?: boolean
  maxWidth?: number
}): void {  
  this.drawTextOffset({ font, xy, str, scale, color, rotation, outlineColor, isOutline, maxWidth, direction: OffsetDirection.CenteredOn })
}


}
