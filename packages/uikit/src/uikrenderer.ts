import { mat4, vec2, vec4 } from "gl-matrix"
import { UIKShader } from "./uikshader.js"
import circleVert from "./shaders/vert/circle.vert.glsl"
import circleFrag from "./shaders/frag/circle.frag.glsl"
import colorbarVert from "./shaders/vert/colorbar.vert.glsl"
import colorbarFrag from "./shaders/frag/colorbar.frag.glsl"
import ellipseVert from "./shaders/vert/elliptical-fill.vert.glsl"
import ellipseFrag from "./shaders/frag/elliptical-fill.frag.glsl"
import lineVert from "./shaders/vert/line.vert.glsl"
import projectedLineVert from "./shaders/vert/projected-line.vert.glsl"
import rectVert from "./shaders/vert/rect.vert.glsl"
import solidColorFrag from "./shaders/frag/solid-color.frag.glsl"
import roundedRectFrag from "./shaders/frag/rounded-rect.frag.glsl"
import triangleVert from "./shaders/vert/triangle.vert.glsl"
import triangleFrag from "./shaders/frag/triangle.frag.glsl"
import rotatedFontVert from "./shaders/vert/rotated-font.vert.glsl"
import rotatedFontFrag from "./shaders/frag/rotated-font.frag.glsl"
import { Vec4, Color, LineTerminator, LineStyle, Vec2, RoundedRectConfig } from "./types.js"
import { UIKFont } from "./assets/uikfont.js"

export class UIKRenderer {
  private gl: WebGL2RenderingContext
  private lineShader: UIKShader
  private circleShader: UIKShader
  private rectShader: UIKShader
  private roundedRectShader: UIKShader
  private triangleShader: UIKShader
  private rotatedFontShader: UIKShader
  private colorbarShader: UIKShader
  private projectedLineShader: UIKShader
  private ellipticalFillShader: UIKShader
  private genericVAO: WebGLVertexArrayObject
  private triangleVertexBuffer: WebGLBuffer

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    
    // Create shaders for this specific WebGL context
    this.lineShader = new UIKShader(gl, lineVert, solidColorFrag)
    this.rectShader = new UIKShader(gl, rectVert, solidColorFrag)
    this.roundedRectShader = new UIKShader(gl, rectVert, roundedRectFrag)
    this.circleShader = new UIKShader(gl, circleVert, circleFrag)
    this.triangleShader = new UIKShader(gl, triangleVert, triangleFrag)
    this.rotatedFontShader = new UIKShader(gl, rotatedFontVert, rotatedFontFrag)
    this.colorbarShader = new UIKShader(gl, colorbarVert, colorbarFrag)
    this.projectedLineShader = new UIKShader(gl, projectedLineVert, solidColorFrag)
    this.ellipticalFillShader = new UIKShader(gl, ellipseVert, ellipseFrag)

    // Create VAO for this specific WebGL context
      const rectStrip = [
        1,
        1,
        0, // Top-right
        1,
        0,
        0, // Bottom-right
        0,
        1,
        0, // Top-left
        0,
        0,
        0, // Bottom-left
      ]
      const vao = gl.createVertexArray()!
      const vbo = gl.createBuffer()!

      gl.bindVertexArray(vao)

      // Setup position VBO
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(rectStrip),
        gl.STATIC_DRAW
      )
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
        0.0, // Bottom-left
      ]

      const texCoordBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(texCoordData),
        gl.STATIC_DRAW
      )

      // Assign a_texcoord (location = 1)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)

      gl.bindVertexArray(null) // Unbind VAO when done
      
    this.genericVAO = vao

    // Create triangle vertex buffer for this specific WebGL context
    this.triangleVertexBuffer = this.gl.createBuffer() as WebGLBuffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.triangleVertexBuffer)

      // Allocate space for 3 vertices (triangle), each with 2 components (x, y)
      const initialVertices = new Float32Array(6)
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        initialVertices,
        this.gl.DYNAMIC_DRAW
      )
      gl.bindVertexArray(null) // Unbind VAO when done
      // Unbind the buffer to prevent accidental modification
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
  }

  private setup2D() {
    const gl = this.gl
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  }

  /**
   * Draws a triangle.
   * @param params - Object containing the triangle parameters.
   * @param params.headPoint - The coordinates of the triangle's head (top vertex).
   * @param params.baseMidPoint - The midpoint of the triangle's base.
   * @param params.baseLength - The length of the triangle's base.
   * @param params.color - The color of the triangle.
   * @param params.z - The z-coordinate of the triangle. Defaults to 0.
   */
  public drawTriangle({
    headPoint,
    baseMidPoint,
    baseLength,
    color,
    z = 0,
  }: {
    headPoint: Vec2
    baseMidPoint: Vec2
    baseLength: number
    color: Color
    z?: number
  }): void {
    const canvas = this.gl.canvas as HTMLCanvasElement
    this.setup2D()
    // Convert screen points to WebGL coordinates
    const hp = Array.isArray(headPoint)
      ? headPoint
      : [headPoint[0], headPoint[1]]
    const bmp = Array.isArray(baseMidPoint)
      ? baseMidPoint
      : [baseMidPoint[0], baseMidPoint[1]]
    const webglHeadX = (hp[0] / canvas.width) * 2 - 1
    const webglHeadY = 1 - (hp[1] / canvas.height) * 2
    const webglBaseMidX = (bmp[0] / canvas.width) * 2 - 1
    const webglBaseMidY = 1 - (bmp[1] / canvas.height) * 2

    // Ensure the vertex buffer is defined
    if (!this.triangleVertexBuffer) {
      console.error('Vertex buffer is not defined at draw time')
      return
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.triangleVertexBuffer)

    // Calculate left and right base vertices
    const directionX = webglHeadX - webglBaseMidX
    const directionY = webglHeadY - webglBaseMidY
    const length = Math.sqrt(directionX * directionX + directionY * directionY)
    const unitPerpX = -directionY / length
    const unitPerpY = directionX / length
    const baseLengthNormalizedX = (baseLength / canvas.width) * 2
    const baseLengthNormalizedY = (baseLength / canvas.height) * 2
    const leftBaseX = webglBaseMidX - unitPerpX * (baseLengthNormalizedX / 2)
    const leftBaseY = webglBaseMidY - unitPerpY * (baseLengthNormalizedY / 2)
    const rightBaseX = webglBaseMidX + unitPerpX * (baseLengthNormalizedX / 2)
    const rightBaseY = webglBaseMidY + unitPerpY * (baseLengthNormalizedY / 2)

    // Update the vertex buffer with three vertices (head, left base, right base)
    const vertices = new Float32Array([
      webglHeadX,
      webglHeadY, // Head of the triangle
      leftBaseX,
      leftBaseY, // Left base vertex
      rightBaseX,
      rightBaseY, // Right base vertex
    ])

    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, vertices)
    // Use the shader program
    this.triangleShader.use(this.gl)

    // Bind the position attribute
    const positionLocation = this.triangleShader.uniforms.a_position as GLuint
    this.gl.enableVertexAttribArray(positionLocation)
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

    // Set u_antialiasing in pixels and canvas size in pixels
    this.gl.uniform1f(this.triangleShader.uniforms.u_antialiasing, baseLength * 0.01) // Example proportion
    this.gl.uniform2f(this.triangleShader.uniforms.u_canvasSize, canvas.width, canvas.height)

    // Set the color uniform
    this.gl.uniform4fv(this.triangleShader.uniforms.u_color, color as Float32List)

    // Set z value
    this.gl.uniform1f(this.triangleShader.uniforms.u_z, z)

    // Draw the triangle
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3)
    this.gl.bindVertexArray(null)
  }

  /**
   * Draws a circle.
   * @param params - Object containing the circle parameters.
   * @param params.leftTopWidthHeight - The bounding box of the circle (left, top, width, height).
   * @param params.circleColor - The color of the circle.
   * @param params.fillPercent - The percentage of the circle to fill (0 to 1).
   * @param params.z - The z-index value of the circle.
   */
  public drawCircle({
    leftTopWidthHeight,
    circleColor = [1, 1, 1, 1],
    fillPercent = 1.0,
    z = 0,
  }: {
    leftTopWidthHeight: Vec4
    circleColor?: Color
    fillPercent?: number
    z?: number
  }): void {
    if (!this.circleShader) {
      throw new Error('circleShader undefined')
    }

    this.circleShader.use(this.gl)
    this.setup2D()
    this.gl.uniform4fv(this.circleShader.uniforms.circleColor, circleColor as Float32List)
    this.gl.uniform2fv(this.circleShader.uniforms.canvasWidthHeight, [
      this.gl.canvas.width,
      this.gl.canvas.height,
    ])

    const rectParams = Array.isArray(leftTopWidthHeight)
      ? vec4.fromValues(
          leftTopWidthHeight[0],
          leftTopWidthHeight[1],
          leftTopWidthHeight[2],
          leftTopWidthHeight[3]
        )
      : leftTopWidthHeight

    this.gl.uniform4fv(this.circleShader.uniforms.leftTopWidthHeight, rectParams as Float32List)
    this.gl.uniform1f(this.circleShader.uniforms.fillPercent, fillPercent)
    this.gl.uniform1f(this.circleShader.uniforms.z, z)
    this.gl.bindVertexArray(this.genericVAO)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    this.gl.bindVertexArray(null) // Unbind to avoid side effects
  }

  /**
   * Draws a line with specified start and end coordinates, thickness, color, and style.
   * Supports solid, dashed, or dotted lines, with optional terminators (such as arrows or rings).
   * For dashed and dotted lines, segments or dots will adjust to reach the endpoint or terminator.
   *
   * @param config - Configuration object containing the following properties:
   *   - startEnd: The start and end coordinates of the line, as a Vec4 array in the form [startX, startY, endX, endY].
   *   - thickness?: The thickness of the line. Defaults to 1.
   *   - color?: The color of the line, as a Color array in [R, G, B, A] format. Defaults to red ([1, 0, 0, -1]).
   *   - terminator?: The type of terminator at the end of the line (e.g., NONE, ARROW, CIRCLE, or RING). Defaults to NONE.
   *   - style?: The style of the line: solid, dashed, or dotted. Defaults to solid.
   *   - dashDotLength?: The length of dashes or diameter of dots for dashed/dotted lines. Defaults to 5.
   */
  public drawLine(config: {
    startEnd: Vec4
    thickness?: number
    color?: Color
    terminator?: LineTerminator
    style?: LineStyle
    dashDotLength?: number
  }): void {
    const {
      startEnd,
      thickness = 1,
      color = [1, 0, 0, -1],
      terminator = LineTerminator.NONE,
      style = LineStyle.SOLID,
      dashDotLength = 5,
    } = config
    const gl = this.gl
    this.setup2D()
    // Extract start and end points
    const lineCoords = Array.isArray(startEnd)
      ? vec4.fromValues(startEnd[0], startEnd[1], startEnd[2], startEnd[3])
      : startEnd

    const [startX, startY, endXRaw, endYRaw] = lineCoords
    let endX = endXRaw
    let endY = endYRaw

    // Calculate direction and adjust for terminator
    const direction = vec2.sub(vec2.create(), [endX, endY], [startX, startY])
    vec2.normalize(direction, direction)

    const terminatorSize = thickness * 3 // Example terminator size based on thickness

    // Adjust line length by half the terminator width if a terminator exists
    if (terminator !== LineTerminator.NONE) {
      endX -= direction[0] * (terminatorSize / 2)
      endY -= direction[1] * (terminatorSize / 2)
    }

    if (style === LineStyle.DASHED || style === LineStyle.DOTTED) {
      const lineLength = vec2.distance([startX, startY], [endX, endY])
      const segmentSpacing =
        style === LineStyle.DASHED ? dashDotLength * 1.5 : dashDotLength * 2
      const segmentCount = Math.floor(lineLength / segmentSpacing)

      for (let i = 0; i <= segmentCount; i++) {
        const segmentStart = vec2.scaleAndAdd(
          vec2.create(),
          [startX, startY],
          direction,
          i * segmentSpacing
        )

        if (i === segmentCount) {
          // Connect the last dash or dot to the adjusted endpoint
          if (style === LineStyle.DASHED) {
            const segmentCoords = vec4.fromValues(
              segmentStart[0],
              segmentStart[1],
              endX,
              endY
            )
            this.drawSegment({ segmentCoords, thickness, color })
          } else if (style === LineStyle.DOTTED) {
            this.drawCircle({
              leftTopWidthHeight: [
                endX - dashDotLength / 2,
                endY - dashDotLength / 2,
                dashDotLength,
                dashDotLength,
              ],
              circleColor: color,
            })
          }
        } else {
          if (style === LineStyle.DASHED) {
            // Draw dashed segment
            const segmentEnd = vec2.scaleAndAdd(
              vec2.create(),
              segmentStart,
              direction,
              dashDotLength
            )
            const segmentCoords = vec4.fromValues(
              segmentStart[0],
              segmentStart[1],
              segmentEnd[0],
              segmentEnd[1]
            )
            this.drawSegment({ segmentCoords, thickness, color })
          } else if (style === LineStyle.DOTTED) {
            // Draw dot as a small circle
            this.drawCircle({
              leftTopWidthHeight: [
                segmentStart[0] - dashDotLength / 2,
                segmentStart[1] - dashDotLength / 2,
                dashDotLength,
                dashDotLength,
              ],
              circleColor: color,
            })
          }
        }
      }
    } else {
      // Draw solid line if no dash/dot style specified
      const shortenedLine = vec4.fromValues(startX, startY, endX, endY)
      this.lineShader.use(gl)
      gl.enable(gl.BLEND)
      gl.uniform4fv(this.lineShader.uniforms.lineColor, color as Float32List)
      gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [gl.canvas.width, gl.canvas.height])
      gl.uniform1f(this.lineShader.uniforms.thickness, thickness)
      gl.uniform4fv(this.lineShader.uniforms.startXYendXY, shortenedLine)

      gl.bindVertexArray(this.genericVAO)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.bindVertexArray(null) // Unbind to avoid side effects
    }

    // Draw the terminator
    switch (terminator) {
      case LineTerminator.ARROW:
        this.drawTriangle({
          headPoint: [startEnd[2], startEnd[3]],
          baseMidPoint: [
            endX - (direction[0] * terminatorSize) / 2,
            endY - (direction[1] * terminatorSize) / 2,
          ],
          baseLength: terminatorSize,
          color,
        })
        break
      case LineTerminator.CIRCLE:
        this.drawCircle({
          leftTopWidthHeight: [
            startEnd[2] - terminatorSize / 2,
            startEnd[3] - terminatorSize / 2,
            terminatorSize,
            terminatorSize,
          ],
          circleColor: color,
        })
        break
      case LineTerminator.RING:
        this.drawCircle({
          leftTopWidthHeight: [
            startEnd[2] - terminatorSize / 2,
            startEnd[3] - terminatorSize / 2,
            terminatorSize,
            terminatorSize,
          ],
          circleColor: color,
          fillPercent: 0.5,
        })
        break
    }
  }

  /**
   * Helper method to draw individual dashed segments.
   * @param config - Configuration object containing the following properties:
   *   - segmentCoords: The start and end coordinates of the segment, as a Vec4 array in the form [startX, startY, endX, endY].
   *   - thickness: The thickness of the segment.
   *   - color: The color of the segment, as a Color array in [R, G, B, A] format.
   */
  private drawSegment(config: {
    segmentCoords: Vec4
    thickness: number
    color: Color
  }): void {
    const { segmentCoords, thickness, color } = config
    const gl = this.gl

    this.lineShader.use(gl)
    gl.uniform4fv(this.lineShader.uniforms.lineColor, color as Float32List)
    gl.uniform1f(this.lineShader.uniforms.thickness, thickness)
    gl.uniform4fv(this.lineShader.uniforms.startXYendXY, segmentCoords)

    gl.bindVertexArray(this.genericVAO)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null) // Unbind to avoid side effects
  }

  public drawRoundedRect({
    bounds,
    fillColor,
    outlineColor,
    bottomColor = fillColor,
    cornerRadius = -1,
    thickness = 10
  }: RoundedRectConfig): void {
    const gl = this.gl
    const shader = this.roundedRectShader
    if (!shader) throw new Error('roundedRectShader undefined')

    shader.use(gl)

    // enable blending for smooth corners
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // decide radius
    const radius = cornerRadius === -1 ? thickness * 2 : cornerRadius

    // convert bounds to vec4
    const rectParams = Array.isArray(bounds)
      ? vec4.fromValues(bounds[0], bounds[1], bounds[2], bounds[3])
      : bounds

    // set uniforms
    gl.uniform1f(shader.uniforms.thickness, thickness)
    gl.uniform1f(shader.uniforms.cornerRadius, radius)
    gl.uniform4fv(shader.uniforms.borderColor, outlineColor as Float32List)
    gl.uniform4fv(shader.uniforms.topColor, fillColor as Float32List)
    gl.uniform4fv(shader.uniforms.bottomColor, bottomColor as Float32List)
    gl.uniform2fv(shader.uniforms.canvasWidthHeight, [
      (gl.canvas as HTMLCanvasElement).width,
      (gl.canvas as HTMLCanvasElement).height
    ])
    gl.uniform4fv(shader.uniforms.leftTopWidthHeight, rectParams as Float32List)

    // draw
    gl.bindVertexArray(this.genericVAO)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)
  }

  /**
   * Draws rotated text, supporting individual character rendering and RTL.
   * @param params - Object containing parameters for rendering rotated text.
   * @param params.font - The font object for rendering text.
   * @param params.xy - The starting position of the text.
   * @param params.str - The string to render.
   * @param params.scale - The scale of the text. Defaults to 1.0.
   * @param params.color - The color of the text. Defaults to red.
   * @param params.rotation - The rotation angle in radians. Defaults to 0.
   * @param params.outlineColor - The outline color of the text. Defaults to black.
   * @param params.outlineThickness - The thickness of the text outline. Defaults to 2.
   */
  public drawRotatedText({
    font,
    xy,
    str,
    scale = 1.0,
    color = [1.0, 0.0, 0.0, 1.0],
    rotation = 0.0,
    outlineColor = [0, 0, 0, 1.0],
    outlineThickness = 2,
  }: {
    font: UIKFont
    xy: Vec2
    str: string
    scale?: number
    color?: Color
    rotation?: number
    outlineColor?: Color
    outlineThickness?: number
  }): void {
    if (!font.isFontLoaded) {
      console.error("font not loaded")
      return
    }

    // Skip text rendering if using fallback font texture (1x1 white pixel)
    // This prevents white artifacts from being rendered
    if (font.textureSize[0] === 1 && font.textureSize[1] === 1) {
      // console.log('Skipping text rendering - using fallback font texture')
      return
    }

    if (!this.rotatedFontShader) {
      throw new Error('rotatedTextShader undefined')
    }

    const gl = this.gl
    const shader = this.rotatedFontShader

    // Bind the font texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, font.getTexture())

    shader.use(gl)
    // ─── save GL state ─────────────────────────────────────────────────────────
    const blendOn = gl.isEnabled(gl.BLEND)
    const depthOn = gl.isEnabled(gl.DEPTH_TEST)
    const cullOn = gl.isEnabled(gl.CULL_FACE)
    const srcRGB = gl.getParameter(gl.BLEND_SRC_RGB) as number
    const dstRGB = gl.getParameter(gl.BLEND_DST_RGB) as number
    const srcAlpha = gl.getParameter(gl.BLEND_SRC_ALPHA) as number
    const dstAlpha = gl.getParameter(gl.BLEND_DST_ALPHA) as number

    // ─── set up for text ──────────────────────────────────────────────────────
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)

    // Get outline configuration from font (prioritize font config over parameters)
    const outlineConfig = font.getOutlineConfig()
    const finalOutlineColor = outlineConfig.enabled ? outlineConfig.color : outlineColor
    const finalOutlineThickness = outlineConfig.enabled ? outlineConfig.width * 10 : outlineThickness

    // Basic uniforms
    gl.uniform4fv(shader.uniforms.fontColor, color as Float32List)
    gl.uniform4fv(shader.uniforms.outlineColor, finalOutlineColor as Float32List)
    gl.uniform1f(shader.uniforms.outlineThickness, finalOutlineThickness)
    gl.uniform1i(shader.uniforms.fontTexture, 0)
    gl.uniform1i(shader.uniforms.isMTSDF, font.isMTSDF ? 1 : 0)

    // Enhanced outline uniforms (with fallback for older shaders)
    const canvasWidthHeight = [gl.canvas.width, gl.canvas.height]
    gl.uniform2fv(shader.uniforms.canvasWidthHeight, canvasWidthHeight)
    
    // Set enhanced outline configuration uniforms if available
    if (shader.uniforms.outlineEnabled !== undefined) {
      gl.uniform1i(shader.uniforms.outlineEnabled, outlineConfig.enabled ? 1 : 0)
    }
    if (shader.uniforms.outlineWidth !== undefined) {
      gl.uniform1f(shader.uniforms.outlineWidth, outlineConfig.width)
    }
    if (shader.uniforms.outlineSoftness !== undefined) {
      gl.uniform1f(shader.uniforms.outlineSoftness, outlineConfig.softness)
    }
    if (shader.uniforms.outlineStyle !== undefined) {
      // Convert style string to integer for shader
      const styleMap = { 'solid': 0, 'glow': 1, 'inner': 2, 'outer': 3 }
      gl.uniform1i(shader.uniforms.outlineStyle, styleMap[outlineConfig.style] || 0)
    }
    if (shader.uniforms.outlineOffset !== undefined) {
      gl.uniform2fv(shader.uniforms.outlineOffset, outlineConfig.offset)
    }

    // Calculate screenPxRange based on scale and font metrics
    const canvasSize = Math.min(gl.canvas.width, gl.canvas.height)
    const screenPxRange = Math.max(
      (scale / font.fontMetrics.size) * font.fontMetrics.distanceRange,
      1.0
    )
    gl.uniform1f(shader.uniforms.screenPxRange, screenPxRange)

    // Bind VAO for generic rectangle
    gl.bindVertexArray(this.genericVAO)

    // Set orthographic projection matrix
    const orthoMatrix = mat4.create()
    mat4.ortho(orthoMatrix, 0, gl.canvas.width, gl.canvas.height, 0, -1, 1)

    // Draw characters
    let x = xy[0]
    let y = xy[1]
    const size = canvasSize * scale
    const chars = Array.from(str)

    for (const char of chars) {
      const metrics = font.fontMetrics.mets[char]
      
      // Handle missing character metrics with proper fallback
      if (!metrics) {
        // Use default advance for missing characters (especially spaces)
        const defaultAdvance = char === ' ' ? 0.25 : 0.5
        const advanceX = Math.cos(rotation) * defaultAdvance * size
        const advanceY = Math.sin(rotation) * defaultAdvance * size
        x += advanceX
        y += advanceY
        continue
      }

      // Only render visible characters (width > 0)
      if (metrics.lbwh[2] > 0 && metrics.lbwh[3] > 0) {
        const modelMatrix = mat4.create()
        mat4.translate(modelMatrix, modelMatrix, [
          x + Math.sin(rotation) * metrics.lbwh[1] * size,
          y - Math.cos(rotation) * metrics.lbwh[1] * size,
          0.0,
        ])
        mat4.rotateZ(modelMatrix, modelMatrix, rotation)
        mat4.scale(modelMatrix, modelMatrix, [
          metrics.lbwh[2] * size,
          -metrics.lbwh[3] * size,
          1.0,
        ])

        const mvpMatrix = mat4.create()
        mat4.multiply(mvpMatrix, orthoMatrix, modelMatrix)

        gl.uniformMatrix4fv(
          shader.uniforms.modelViewProjectionMatrix,
          false,
          mvpMatrix
        )
        gl.uniform4fv(shader.uniforms.uvLeftTopWidthHeight, metrics.uv_lbwh)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }

      // Always advance cursor position, even for spaces
      const advanceX = Math.cos(rotation) * metrics.xadv * size
      const advanceY = Math.sin(rotation) * metrics.xadv * size
      x += advanceX
      y += advanceY
    }

    gl.bindVertexArray(null)
    // ─── restore GL state ─────────────────────────────────────────────────────
    // restore blend func
    gl.blendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha)
    // restore enables
    blendOn || gl.disable(gl.BLEND)
    depthOn && gl.enable(gl.DEPTH_TEST)
    cullOn && gl.enable(gl.CULL_FACE)
  }

  /**
   * Draws a ruler with length text, units, and hash marks.
   * @param params - Object containing parameters for rendering the ruler.
   * @param params.pointA - Start point of the ruler.
   * @param params.pointB - End point of the ruler.
   * @param params.length - Length value to display.
   * @param params.units - Units to display alongside the length.
   * @param params.font - Font object for rendering text.
   * @param params.textColor - Color of the text. Defaults to red.
   * @param params.lineColor - Color of the ruler lines. Defaults to black.
   * @param params.lineThickness - Thickness of the ruler lines. Defaults to 1.
   * @param params.offset - Offset distance for parallel line and text. Defaults to 40.
   * @param params.scale - Scale factor for text size. Defaults to 1.0.
   */
  public drawRuler({
    pointA,
    pointB,
    length,
    units,
    font,
    textColor = [1, 0, 0, 1],
    lineColor = [0, 0, 0, 1],
    lineThickness = 1,
    offset = 40,
    scale = 1.0,
    showTickmarkNumbers = true,
  }: {
    pointA: Vec2
    pointB: Vec2
    length: number
    units: string
    font: UIKFont
    textColor?: Color
    lineColor?: Color
    lineThickness?: number
    offset?: number
    scale?: number
    showTickmarkNumbers?: boolean
  }): void {
    const gl = this.gl
    const canvasHeight = gl.canvas.height
    const fontSize = canvasHeight * scale
    const getTextWidth = (text: string): number => {
      return Array.from(text).reduce((sum, char) => {
        const glyph = font.fontMetrics.mets[char]
        return glyph ? sum + glyph.xadv * fontSize : sum
      }, 0)
    }

    const getTextHeight = (): number => {
      const m = font.fontMetrics
      return (m.ascender - m.descender) * fontSize
    }

    const deltaX = pointB[0] - pointA[0]
    const deltaY = pointB[1] - pointA[1]
    const actualLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    let angle = Math.atan2(deltaY, deltaX)

    const midPoint: Vec2 = [
      (pointA[0] + pointB[0]) / 2,
      (pointA[1] + pointB[1]) / 2,
    ]
    const text = `${length.toFixed(2)}`
    const textWidth = getTextWidth(text)
    const textHeight = getTextHeight()
    const halfTextWidth = textWidth / 2
    const halfTextHeight = textHeight / 2

    let textPosition: Vec2 = [
      midPoint[0] -
        halfTextWidth * Math.cos(angle) +
        (halfTextHeight + offset) * Math.sin(angle),
      midPoint[1] -
        halfTextWidth * Math.sin(angle) -
        (halfTextHeight + offset) * Math.cos(angle),
    ]

    if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
      angle += Math.PI
      textPosition = [
        midPoint[0] -
          (textWidth / 2) * Math.cos(angle) -
          (textHeight / 2 + offset) * Math.sin(angle) -
          offset * Math.sin(angle),
        midPoint[1] -
          (textWidth / 2) * Math.sin(angle) +
          (textHeight / 2 + offset) * Math.cos(angle) +
          offset * Math.cos(angle),
      ]
    }

    this.drawRotatedText({
      font,
      xy: textPosition,
      str: text,
      scale,
      color: textColor,
      rotation: angle,
    })

    const unitsScale = scale / 2
    const unitsTextWidth = getTextWidth(units)
    const unitsTextPosition: Vec2 = [
      textPosition[0] + (textWidth + unitsTextWidth / 4) * Math.cos(angle),
      textPosition[1] + (textWidth + unitsTextWidth / 4) * Math.sin(angle),
    ]
    this.drawRotatedText({
      font,
      xy: unitsTextPosition,
      str: units,
      scale: unitsScale,
      color: textColor,
      rotation: angle,
    })

    const parallelPointA: Vec2 = [
      pointA[0] + (offset * deltaY) / actualLength,
      pointA[1] - (offset * deltaX) / actualLength,
    ]
    const parallelPointB: Vec2 = [
      pointB[0] + (offset * deltaY) / actualLength,
      pointB[1] - (offset * deltaX) / actualLength,
    ]
    this.drawLine({
      startEnd: [
        parallelPointA[0],
        parallelPointA[1],
        parallelPointB[0],
        parallelPointB[1],
      ],
      thickness: lineThickness,
      color: lineColor,
    })

    this.drawLine({
      startEnd: [parallelPointA[0], parallelPointA[1], pointA[0], pointA[1]],
      thickness: lineThickness,
      color: lineColor,
      terminator: LineTerminator.ARROW,
    })
    this.drawLine({
      startEnd: [parallelPointB[0], parallelPointB[1], pointB[0], pointB[1]],
      thickness: lineThickness,
      color: lineColor,
      terminator: LineTerminator.ARROW,
    })

    const numHashMarks = Math.floor(length)
    const hashLength = 8
    const parallelOffset = offset / 4

    for (let i = 1; i <= numHashMarks; i++) {
      const t = i / length
      const hashPoint: Vec2 = [pointA[0] + t * deltaX, pointA[1] + t * deltaY]
      const currentHashLength = i % 5 === 0 ? hashLength * 2 : hashLength
      const perpOffsetX = (deltaY / actualLength) * parallelOffset
      const perpOffsetY = (-deltaX / actualLength) * parallelOffset

      if (i % 5 === 0) {
        const hashText = `${i}`
        const hashTextScale = scale / 5
        const hashTextWidth = getTextWidth(hashText)
        const hashTextPosition: Vec2 = [
          hashPoint[0] +
            perpOffsetX -
            (hashTextWidth / 2) * Math.cos(angle) +
            (currentHashLength / 4) * Math.sin(angle),
          hashPoint[1] +
            perpOffsetY -
            (hashTextWidth / 2) * Math.sin(angle) -
            (currentHashLength / 4) * Math.cos(angle),
        ]
        if (showTickmarkNumbers) {
          this.drawRotatedText({
            font,
            xy: hashTextPosition,
            str: hashText,
            scale: hashTextScale,
            color: textColor,
            rotation: angle,
          })
        }
      }

      const hashStart: Vec2 = [
        hashPoint[0] +
          perpOffsetX -
          (currentHashLength / 2) * Math.cos(angle + Math.PI / 2),
        hashPoint[1] +
          perpOffsetY -
          (currentHashLength / 2) * Math.sin(angle + Math.PI / 2),
      ]
      const hashEnd: Vec2 = [
        hashPoint[0] +
          perpOffsetX +
          (currentHashLength / 2) * Math.cos(angle + Math.PI / 2),
        hashPoint[1] +
          perpOffsetY +
          (currentHashLength / 2) * Math.sin(angle + Math.PI / 2),
      ]
      this.drawLine({
        startEnd: [hashStart[0], hashStart[1], hashEnd[0], hashEnd[1]],
        thickness: 1,
        color: lineColor,
      })
    }
  }
}
