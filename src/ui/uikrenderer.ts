// nvrenderer.ts
import { mat4, vec2, vec4 } from 'gl-matrix'
import { Shader } from '../shader.js'
import {
  fragCircleShader,
  fragColorbarShader,
  fragEllipticalFillShader,
  fragProjectedTriangleShader,
  fragRectShader,
  fragRotatedFontShader,
  fragRotatedRectangularFillShader,
  fragRoundedRectShader,
  fragTriangleShader,
  vertCircleShader,
  vertColorbarShader,
  vertEllipticalFillShader,
  vertLineShader,
  vertProjectedLineShader,
  vertProjectedTriangleShader,
  vertRectShader,
  vertRotatedFontShader,
  vertRotatedRectangularFillShader,
  vertTriangleShader
} from '../shader-srcs.js'
import { TEXTURE3_FONT } from '../niivue/index.js'
import { UIKFont } from './uikfont.js'
import { UIKBitmap } from './uikbitmap.js'
import { LineTerminator, Color, Vec2, Vec4, LineStyle, Vec3 } from './types.js'

export class UIKRenderer {
  private gl: WebGL2RenderingContext
  private lineShader: Shader
  protected static triangleShader: Shader
  protected static circleShader: Shader
  protected static rectShader: Shader
  protected static roundedRectShader: Shader
  protected static bitmapShader: Shader
  protected static genericVAO: WebGLVertexArrayObject
  protected static triangleVertexBuffer: WebGLBuffer
  protected static projectedTriangleVertexBuffer: WebGLBuffer
  protected static lineTerminator = LineTerminator
  protected static rotatedTextShader: Shader
  protected static rotatedRectangularFillShader: Shader
  protected static ellipticalFillShader: Shader
  protected static colorbarShader: Shader
  protected static projectedLineShader: Shader
  protected static projectedTriangleShader: Shader

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.lineShader = new Shader(gl, vertLineShader, fragRectShader)

    if (!UIKRenderer.rectShader) {
      UIKRenderer.rectShader = new Shader(gl, vertRectShader, fragRectShader)
    }

    if (!UIKRenderer.roundedRectShader) {
      UIKRenderer.roundedRectShader = new Shader(gl, vertRectShader, fragRoundedRectShader)
    }

    if (!UIKRenderer.circleShader) {
      UIKRenderer.circleShader = new Shader(gl, vertCircleShader, fragCircleShader)
    }

    if (!UIKRenderer.triangleShader) {
      UIKRenderer.triangleShader = new Shader(gl, vertTriangleShader, fragTriangleShader)
    }

    if (!UIKRenderer.rotatedTextShader) {
      UIKRenderer.rotatedTextShader = new Shader(gl, vertRotatedFontShader, fragRotatedFontShader)
    }

    if (!UIKRenderer.rotatedRectangularFillShader) {
      UIKRenderer.rotatedRectangularFillShader = new Shader(
        gl,
        vertRotatedRectangularFillShader,
        fragRotatedRectangularFillShader
      )
    }

    if (!UIKRenderer.ellipticalFillShader) {
      UIKRenderer.ellipticalFillShader = new Shader(gl, vertEllipticalFillShader, fragEllipticalFillShader)
    }

    if (!UIKRenderer.colorbarShader) {
      UIKRenderer.colorbarShader = new Shader(gl, vertColorbarShader, fragColorbarShader)
    }

    if (!UIKRenderer.projectedLineShader) {
      UIKRenderer.projectedLineShader = new Shader(gl, vertProjectedLineShader, fragRectShader)
    }

    if (!UIKRenderer.projectedTriangleShader) {
      UIKRenderer.projectedTriangleShader = new Shader(gl, vertProjectedTriangleShader, fragProjectedTriangleShader)
    }

    if (!UIKRenderer.genericVAO) {
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
        0 // Bottom-left
      ]

      const vao = gl.createVertexArray()!
      const vbo = gl.createBuffer()!

      gl.bindVertexArray(vao)

      // Setup position VBO
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rectStrip), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

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

    if (!UIKRenderer.triangleVertexBuffer) {
      // Create a static vertex buffer
      UIKRenderer.triangleVertexBuffer = this.gl.createBuffer() as WebGLBuffer
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, UIKRenderer.triangleVertexBuffer)

      // Allocate space for 3 vertices (triangle), each with 2 components (x, y)
      const initialVertices = new Float32Array(6)
      this.gl.bufferData(this.gl.ARRAY_BUFFER, initialVertices, this.gl.DYNAMIC_DRAW)
    }

    if (!UIKRenderer.projectedTriangleVertexBuffer) {
      UIKRenderer.projectedTriangleVertexBuffer = this.gl.createBuffer()
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, UIKRenderer.projectedTriangleVertexBuffer)

      // Allocate memory for 3 vertices (3D coordinates for x, y, z)
      const vertexCount = 3 // 1 triangle
      const componentsPerVertex = 3 // x, y, z for each vertex
      const projectedTriangleVertexData = new Float32Array(vertexCount * componentsPerVertex)

      // Initialize the buffer with empty data
      this.gl.bufferData(this.gl.ARRAY_BUFFER, projectedTriangleVertexData, this.gl.DYNAMIC_DRAW)

      // Unbind the buffer to prevent accidental modification
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
    }
  }

  public drawChar({
    font,
    position,
    size,
    char
  }: {
    font: UIKFont
    position: Vec2
    size: number
    char: string
  }): number {
    if (!font.fontShader) {
      throw new Error('fontShader undefined')
    }
    const metrics = font.fontMets!.mets[char]!
    if (!metrics) {
      return 0
    }
    const pos = Array.isArray(position) ? vec2.fromValues(position[0], position[1]) : position
    const l = pos[0] + size * metrics.lbwh[0]
    const b = -(size * metrics.lbwh[1])
    const w = size * metrics.lbwh[2]
    const h = size * metrics.lbwh[3]
    const t = pos[1] + size - h + b
    this.gl.uniform4f(font.fontShader.uniforms.leftTopWidthHeight, l, t, w, h)
    this.gl.uniform4fv(font.fontShader.uniforms.uvLeftTopWidthHeight!, metrics.uv_lbwh)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    return size * metrics.xadv
  }

  public drawText({
    font,
    position,
    text,
    scale = 1.0,
    color = null,
    maxWidth = 0,
    outlineColor = [0, 0, 0, 1],
    outlineThickness = 1
  }: {
    font: UIKFont
    position: Vec2
    text: string
    scale?: number
    color?: Color
    maxWidth?: number
    outlineColor?: Color
    outlineThickness?: number
  }): void {
    if (!font.isFontLoaded) {
      console.error('font not loaded')
      return
    }

    if (!font.fontShader) {
      throw new Error('fontShader undefined')
    }

    if (!color) {
      color = font.fontColor
    }

    const gl = this.gl
    font.fontShader.use(gl)
    gl.activeTexture(TEXTURE3_FONT)
    gl.bindTexture(gl.TEXTURE_2D, font.getTexture())
    this.gl.uniform1i(font.fontShader!.uniforms.fontTexture, 3)

    // const size = font.textHeight * Math.min(this.gl.canvas.height, this.gl.canvas.width) * scale
    const size = font.textHeight * this.gl.canvas.height * scale
    this.gl.enable(this.gl.BLEND)
    this.gl.uniform2f(font.fontShader.uniforms.canvasWidthHeight, this.gl.canvas.width, this.gl.canvas.height)
    this.gl.uniform4fv(font.fontShader.uniforms.fontColor, color as Float32List)
    let screenPxRange = (size / font.fontMets!.size) * font.fontMets!.distanceRange
    screenPxRange = Math.max(screenPxRange, 1.0) // screenPxRange must never be lower than 1
    this.gl.uniform1f(font.fontShader.uniforms.screenPxRange, screenPxRange)

    this.gl.uniform4fv(font.fontShader.uniforms.outlineColor, outlineColor as Float32List)
    this.gl.uniform1f(font.fontShader.uniforms.outlineThickness, outlineThickness)

    this.gl.bindVertexArray(UIKRenderer.genericVAO)

    const pos = Array.isArray(position) ? vec2.fromValues(position[0], position[1]) : position

    const words = text.split(' ')
    let currentX = pos[0]
    let currentY = pos[1]

    for (const word of words) {
      const wordWidth = font.getTextWidth(word, scale)
      if (maxWidth > 0 && currentX + wordWidth > pos[0] + maxWidth) {
        currentY += size
        currentX = pos[0]
      }
      const chars = Array.from(word + ' ')
      for (let i = 0; i < chars.length; i++) {
        currentX += this.drawChar({ font, position: [currentX, currentY], size, char: chars[i] })
      }
    }
    this.gl.bindVertexArray(null)
  }

  /**
   * Draws a bitmap on the canvas.
   *
   * @param config - Configuration object containing the bitmap, position, and scale.
   * @param config.bitmap - The bitmap to draw.
   * @param config.position - The position to place the bitmap ([x, y]).
   * @param config.scale - The scale factor for the bitmap.
   */
  public drawBitmap({ bitmap, position, scale }: { bitmap: UIKBitmap; position: Vec2; scale: number }): void {
    if (!bitmap.getTexture()) {
      console.error('Bitmap texture not loaded')
      return
    }

    const gl = this.gl
    const shader = bitmap.bitmapShader
    shader.use(gl)

    gl.activeTexture(gl.TEXTURE0)
    const texture = bitmap.getTexture()
    if (!texture) {
      console.error('Texture not found')
      return
    }
    gl.bindTexture(gl.TEXTURE_2D, texture)

    gl.uniform1i(shader.uniforms.u_textureLocation, 0)

    // Set the canvas size
    const canvasWidth = gl.canvas.width
    const canvasHeight = gl.canvas.height
    gl.uniform2f(shader.uniforms.canvasWidthHeight, canvasWidth, canvasHeight)

    // Set the position and size of the bitmap based on position and scale
    const pos = Array.isArray(position) ? vec2.fromValues(position[0], position[1]) : position
    const width = bitmap.getWidth() * scale
    const height = bitmap.getHeight() * scale
    gl.uniform4f(shader.uniforms.leftTopWidthHeight, pos[0], pos[1], width, height)

    // Set the viewport
    gl.viewport(0, 0, canvasWidth, canvasHeight)

    // Bind the VAO and draw the bitmap
    gl.bindVertexArray(UIKRenderer.genericVAO)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    // Check for WebGL errors
    const error = gl.getError()
    if (error !== gl.NO_ERROR) {
      console.error('WebGL Error:', error)
    }

    // Unbind the VAO
    gl.bindVertexArray(null)
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
      dashDotLength = 5
    } = config
    const gl = this.gl

    // Extract start and end points
    const lineCoords = Array.isArray(startEnd)
      ? vec4.fromValues(startEnd[0], startEnd[1], startEnd[2], startEnd[3])
      : startEnd

    let [startX, startY, endX, endY] = lineCoords

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
      const segmentSpacing = style === LineStyle.DASHED ? dashDotLength * 1.5 : dashDotLength * 2
      const segmentCount = Math.floor(lineLength / segmentSpacing)

      for (let i = 0; i <= segmentCount; i++) {
        const segmentStart = vec2.scaleAndAdd(vec2.create(), [startX, startY], direction, i * segmentSpacing)

        if (i === segmentCount) {
          // Connect the last dash or dot to the adjusted endpoint
          if (style === LineStyle.DASHED) {
            const segmentCoords = vec4.fromValues(segmentStart[0], segmentStart[1], endX, endY)
            this.drawSegment({ segmentCoords, thickness, color })
          } else if (style === LineStyle.DOTTED) {
            this.drawCircle({
              leftTopWidthHeight: [endX - dashDotLength / 2, endY - dashDotLength / 2, dashDotLength, dashDotLength],
              circleColor: color
            })
          }
        } else {
          if (style === LineStyle.DASHED) {
            // Draw dashed segment
            const segmentEnd = vec2.scaleAndAdd(vec2.create(), segmentStart, direction, dashDotLength)
            const segmentCoords = vec4.fromValues(segmentStart[0], segmentStart[1], segmentEnd[0], segmentEnd[1])
            this.drawSegment({ segmentCoords, thickness, color })
          } else if (style === LineStyle.DOTTED) {
            // Draw dot as a small circle
            this.drawCircle({
              leftTopWidthHeight: [
                segmentStart[0] - dashDotLength / 2,
                segmentStart[1] - dashDotLength / 2,
                dashDotLength,
                dashDotLength
              ],
              circleColor: color
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

      gl.bindVertexArray(UIKRenderer.genericVAO)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.bindVertexArray(null) // Unbind to avoid side effects
    }

    // Draw the terminator
    switch (terminator) {
      case LineTerminator.ARROW:
        this.drawTriangle({
          headPoint: [startEnd[2], startEnd[3]],
          baseMidPoint: [endX - (direction[0] * terminatorSize) / 2, endY - (direction[1] * terminatorSize) / 2],
          baseLength: terminatorSize,
          color
        })
        break
      case LineTerminator.CIRCLE:
        this.drawCircle({
          leftTopWidthHeight: [
            startEnd[2] - terminatorSize / 2,
            startEnd[3] - terminatorSize / 2,
            terminatorSize,
            terminatorSize
          ],
          circleColor: color
        })
        break
      case LineTerminator.RING:
        this.drawCircle({
          leftTopWidthHeight: [
            startEnd[2] - terminatorSize / 2,
            startEnd[3] - terminatorSize / 2,
            terminatorSize,
            terminatorSize
          ],
          circleColor: color,
          fillPercent: 0.5
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
  private drawSegment(config: { segmentCoords: Vec4; thickness: number; color: Color }): void {
    const { segmentCoords, thickness, color } = config
    const gl = this.gl

    this.lineShader.use(gl)
    gl.uniform4fv(this.lineShader.uniforms.lineColor, color as Float32List)
    gl.uniform1f(this.lineShader.uniforms.thickness, thickness)
    gl.uniform4fv(this.lineShader.uniforms.startXYendXY, segmentCoords)

    gl.bindVertexArray(UIKRenderer.genericVAO)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null) // Unbind to avoid side effects
  }

  /**
   * Draws a rectangle.
   * @param config - Configuration object containing:
   *   - leftTopWidthHeight: The bounding box of the rectangle (left, top, width, height).
   *   - lineColor: The color of the rectangle. Defaults to red ([1, 0, 0, -1]).
   */
  public drawRect({
    leftTopWidthHeight,
    fillColor = [0, 0, 0, 0]
  }: {
    leftTopWidthHeight: Vec4
    fillColor?: Color
  }): void {
    this.drawRoundedRect({
      bounds: [leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3]],
      outlineColor: [0, 0, 0, 0],
      fillColor,
      cornerRadius: 0,
      thickness: 0
    })
  }

  /**
   * Draws a rounded rectangle.
   * @param leftTopWidthHeight - The bounding box of the rounded rectangle (left, top, width, height).
   * @param fillColor - The fill color of the rectangle.
   * @param outlineColor - The outline color of the rectangle.
   * @param cornerRadius - The corner radius.
   * @param thickness - The thickness of the outline.
   */
  public drawRoundedRect(config: {
    bounds: Vec4
    fillColor: Color
    outlineColor: Color
    cornerRadius?: number
    thickness?: number
  }): void {
    const { bounds, fillColor, outlineColor, cornerRadius = -1, thickness = 10 } = config

    if (!UIKRenderer.roundedRectShader) {
      throw new Error('roundedRectShader undefined')
    }

    const gl = this.gl

    // Use the rounded rectangle shader program
    UIKRenderer.roundedRectShader.use(gl)

    // Enable blending for transparency
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // Set the necessary uniforms
    const shader = UIKRenderer.roundedRectShader
    const adjustedCornerRadius = cornerRadius === -1 ? thickness * 2 : cornerRadius

    const rectParams = Array.isArray(bounds) ? vec4.fromValues(bounds[0], bounds[1], bounds[2], bounds[3]) : bounds

    this.gl.uniform1f(shader.uniforms.thickness, thickness)
    this.gl.uniform1f(shader.uniforms.cornerRadius, adjustedCornerRadius)
    this.gl.uniform4fv(shader.uniforms.borderColor, outlineColor as Float32List)
    this.gl.uniform4fv(shader.uniforms.fillColor, fillColor as Float32List)
    this.gl.uniform2fv(shader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
    this.gl.uniform4fv(shader.uniforms.leftTopWidthHeight, rectParams as Float32List)
    this.gl.bindVertexArray(UIKRenderer.genericVAO)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    this.gl.bindVertexArray(null)
  }

  public drawRotatedRectangularFill(
    leftTopWidthHeight: Vec4,
    rotation: number,
    fillColor: Color,
    gradientCenter: Vec2,
    gradientRadius: number,
    gradientColor: Color
  ): void {
    if (!UIKRenderer.rotatedRectangularFillShader) {
      throw new Error('rotatedRectangularFillShader undefined')
    }

    const gl = this.gl

    // Use the rotated rectangle shader program
    UIKRenderer.rotatedRectangularFillShader.use(gl)

    // Enable blending for transparency
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // Set the necessary uniforms
    const shader = UIKRenderer.rotatedRectangularFillShader

    const rectParams = Array.isArray(leftTopWidthHeight)
      ? vec4.fromValues(leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3])
      : leftTopWidthHeight

    this.gl.uniform4fv(shader.uniforms.u_fillColor, fillColor as Float32List)
    this.gl.uniform2fv(shader.uniforms.u_gradientCenter, gradientCenter as Float32List)
    this.gl.uniform1f(shader.uniforms.u_gradientRadius, gradientRadius)
    this.gl.uniform4fv(shader.uniforms.u_gradientColor, gradientColor as Float32List)
    this.gl.uniform4fv(shader.uniforms.u_leftTopWidthHeight, rectParams as Float32List)

    const modelMatrix = mat4.create()
    mat4.translate(modelMatrix, modelMatrix, [leftTopWidthHeight[0], leftTopWidthHeight[1], 0.0])
    mat4.rotateZ(modelMatrix, modelMatrix, rotation)

    mat4.scale(modelMatrix, modelMatrix, [leftTopWidthHeight[2], leftTopWidthHeight[3], 1.0])

    // Set up orthographic projection matrix
    const orthoMatrix = mat4.create()
    mat4.ortho(orthoMatrix, 0, gl.canvas.width, gl.canvas.height, 0, -1, 1)

    // Combine the orthographic matrix with the model matrix to create the final MVP matrix
    const mvpMatrix = mat4.create()
    mat4.multiply(mvpMatrix, orthoMatrix, modelMatrix)

    this.gl.uniformMatrix4fv(shader.uniforms.modelViewProjectionMatrix, false, mvpMatrix as Float32List)

    // Bind the generic VAO
    this.gl.bindVertexArray(UIKRenderer.genericVAO)

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
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
    z = 0
  }: {
    leftTopWidthHeight: Vec4
    circleColor?: Color
    fillPercent?: number
    z?: number
  }): void {
    if (!UIKRenderer.circleShader) {
      throw new Error('circleShader undefined')
    }

    UIKRenderer.circleShader.use(this.gl)
    this.gl.enable(this.gl.BLEND)
    this.gl.uniform4fv(UIKRenderer.circleShader.uniforms.circleColor, circleColor as Float32List)
    this.gl.uniform2fv(UIKRenderer.circleShader.uniforms.canvasWidthHeight, [
      this.gl.canvas.width,
      this.gl.canvas.height
    ])

    const rectParams = Array.isArray(leftTopWidthHeight)
      ? vec4.fromValues(leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3])
      : leftTopWidthHeight

    this.gl.uniform4fv(UIKRenderer.circleShader.uniforms.leftTopWidthHeight, rectParams as Float32List)
    this.gl.uniform1f(UIKRenderer.circleShader.uniforms.fillPercent, fillPercent)
    this.gl.uniform1f(UIKRenderer.circleShader.uniforms.z, z)
    this.gl.bindVertexArray(UIKRenderer.genericVAO)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    this.gl.bindVertexArray(null) // Unbind to avoid side effects
  }

  /**
   * Draws a toggle switch with support for an animated knob position.
   * @param params - Object containing the toggle parameters.
   * @param params.position - The position of the top-left corner of the toggle.
   * @param params.size - The size of the toggle ([width, height]).
   * @param params.isOn - Whether the toggle is on or off.
   * @param params.onColor - The color when the toggle is on.
   * @param params.offColor - The color when the toggle is off.
   * @param params.knobPosition - The position of the knob (0 for off, 1 for on, values in between for animation).
   */
  public drawToggle({
    position,
    size,
    isOn,
    onColor,
    offColor,
    knobPosition = isOn ? 1.0 : 0.0 // Default to fully on or off
  }: {
    position: Vec2
    size: Vec2
    isOn: boolean
    onColor: Color
    offColor: Color
    knobPosition?: number
  }): void {
    // Handle Vec2 types to ensure compatibility with both gl-matrix vec2 and [number, number]
    const posX = Array.isArray(position) ? position[0] : position[0]
    const posY = Array.isArray(position) ? position[1] : position[1]
    const sizeX = Array.isArray(size) ? size[0] : size[0]
    const sizeY = Array.isArray(size) ? size[1] : size[1]

    const cornerRadius = sizeY / 2 // Height is used for radius

    // Ensure the colors are Float32Array
    const fillColor = new Float32Array(isOn ? onColor : offColor)

    // Draw the background rounded rectangle
    this.drawRoundedRect({
      bounds: [posX, posY, sizeX, sizeY],
      fillColor,
      outlineColor: new Float32Array([0.2, 0.2, 0.2, 1.0]), // Outline color
      cornerRadius,
      thickness: 2.0 // Outline thickness
    })

    // Clamp knobPosition between 0 and 1
    knobPosition = Math.max(0, Math.min(1, knobPosition))

    // Calculate the circle (toggle knob) position based on the knobPosition
    const knobSize = sizeY * 0.8
    const offX = posX + (sizeY - knobSize) / 2
    const onX = posX + sizeX - knobSize - (sizeY - knobSize) / 2
    const knobX = offX + (onX - offX) * knobPosition
    const knobY = posY + (sizeY - knobSize) / 2

    // Draw the toggle knob as a circle
    this.drawCircle({
      leftTopWidthHeight: [knobX, knobY, knobSize, knobSize],
      circleColor: new Float32Array([1.0, 1.0, 1.0, 1.0])
    })
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
    z = 0
  }: {
    headPoint: Vec2
    baseMidPoint: Vec2
    baseLength: number
    color: Color
    z?: number
  }): void {
    const canvas = this.gl.canvas as HTMLCanvasElement

    // Convert screen points to WebGL coordinates
    const hp = Array.isArray(headPoint) ? headPoint : [headPoint[0], headPoint[1]]
    const bmp = Array.isArray(baseMidPoint) ? baseMidPoint : [baseMidPoint[0], baseMidPoint[1]]
    const webglHeadX = (hp[0] / canvas.width) * 2 - 1
    const webglHeadY = 1 - (hp[1] / canvas.height) * 2
    const webglBaseMidX = (bmp[0] / canvas.width) * 2 - 1
    const webglBaseMidY = 1 - (bmp[1] / canvas.height) * 2

    // Ensure the vertex buffer is defined
    if (!UIKRenderer.triangleVertexBuffer) {
      console.error('Vertex buffer is not defined at draw time')
      return
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, UIKRenderer.triangleVertexBuffer)

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
      rightBaseY // Right base vertex
    ])

    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, vertices)

    // Use the shader program
    UIKRenderer.triangleShader.use(this.gl)

    // Bind the position attribute
    const positionLocation = UIKRenderer.triangleShader.uniforms.a_position as GLuint
    this.gl.enableVertexAttribArray(positionLocation)
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

    // Set u_antialiasing in pixels and canvas size in pixels
    this.gl.uniform1f(UIKRenderer.triangleShader.uniforms.u_antialiasing, baseLength * 0.01) // Example proportion
    this.gl.uniform2f(UIKRenderer.triangleShader.uniforms.u_canvasSize, canvas.width, canvas.height)

    // Set the color uniform
    this.gl.uniform4fv(UIKRenderer.triangleShader.uniforms.u_color, color as Float32List)

    // Set z value
    this.gl.uniform1f(UIKRenderer.triangleShader.uniforms.u_z, z)

    // Draw the triangle
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3)
    this.gl.bindVertexArray(null)
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
    outlineThickness = 2
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
      console.error('font not loaded')
      return
    }

    if (!UIKRenderer.rotatedTextShader) {
      throw new Error('rotatedTextShader undefined')
    }

    const rotatedFontShader = UIKRenderer.rotatedTextShader
    const gl = this.gl

    // Bind the font texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, font.getTexture())

    rotatedFontShader.use(gl)

    // Enable blending for text rendering
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.disable(gl.DEPTH_TEST) // TODO: remove
    gl.disable(gl.CULL_FACE)

    // Set uniform values
    const finalColor = color || font.fontColor
    gl.uniform4fv(rotatedFontShader.uniforms.fontColor, finalColor as Float32List)
    let screenPxRange = (scale / font.fontMets!.size) * font.fontMets!.distanceRange
    screenPxRange = Math.max(screenPxRange, 1.0) // screenPxRange must never be lower than 1
    gl.uniform1f(rotatedFontShader.uniforms.screenPxRange, screenPxRange)
    gl.uniform1i(rotatedFontShader.uniforms.fontTexture, 0)

    // Outline uniforms
    gl.uniform4fv(rotatedFontShader.uniforms.outlineColor, outlineColor as Float32List)
    gl.uniform1f(rotatedFontShader.uniforms.outlineThickness, outlineThickness)

    // Bind VAO for generic rectangle
    gl.bindVertexArray(UIKRenderer.genericVAO)

    // Set up orthographic projection matrix
    const orthoMatrix = mat4.create()
    mat4.ortho(orthoMatrix, 0, gl.canvas.width, gl.canvas.height, 0, -1, 1)

    const dpr = window.devicePixelRatio || 1
    gl.canvas.width = (gl.canvas as HTMLCanvasElement).clientWidth * dpr
    gl.canvas.height = (gl.canvas as HTMLCanvasElement).clientHeight * dpr
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    // Iterate over each character in the string
    let x = xy[0]
    let y = xy[1]
    const size = font.textHeight * Math.min(gl.canvas.height, gl.canvas.width) * scale

    const chars = Array.from(str)
    for (const char of chars) {
      const metrics = font.fontMets!.mets[char]
      if (!metrics) {
        continue
      }

      const modelMatrix = mat4.create()
      mat4.translate(modelMatrix, modelMatrix, [
        x + Math.sin(rotation) * metrics.lbwh[1] * size,
        y - Math.cos(rotation) * metrics.lbwh[1] * size,
        0.0
      ])
      mat4.rotateZ(modelMatrix, modelMatrix, rotation)
      mat4.scale(modelMatrix, modelMatrix, [metrics.lbwh[2] * size, -metrics.lbwh[3] * size, 1.0])

      // Combine the orthographic matrix with the model matrix to create the final MVP matrix
      const mvpMatrix = mat4.create()
      mat4.multiply(mvpMatrix, orthoMatrix, modelMatrix)

      // Set uniform values for MVP matrix and UV coordinates
      gl.uniformMatrix4fv(rotatedFontShader.uniforms.modelViewProjectionMatrix, false, mvpMatrix)
      gl.uniform4fv(rotatedFontShader.uniforms.uvLeftTopWidthHeight, metrics.uv_lbwh)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      // Update x position for the next character, advancing with rotation in mind
      const advanceX = Math.cos(rotation) * metrics.xadv * size
      const advanceY = Math.sin(rotation) * metrics.xadv * size
      x += advanceX
      y += advanceY
    }

    // Unbind the VAO
    gl.bindVertexArray(null)
  }

  /**
   * Draws a calendar grid with headers and dates.
   * @param params - Object containing parameters for rendering the calendar.
   * @param params.font - The font object for rendering text.
   * @param params.startX - The X-coordinate of the top-left corner of the calendar.
   * @param params.startY - The Y-coordinate of the top-left corner of the calendar.
   * @param params.cellWidth - The width of each calendar cell.
   * @param params.cellHeight - The height of each calendar cell.
   * @param params.selectedDate - The selected date to highlight.
   * @param params.selectedColor - The color to highlight the selected date.
   * @param params.firstDayOfWeek - The starting day of the week (0 for Sunday, 1 for Monday, etc.). Defaults to 0.
   */
  public drawCalendar({
    font,
    startX,
    startY,
    cellWidth,
    cellHeight,
    selectedDate,
    selectedColor,
    firstDayOfWeek = 0
  }: {
    font: UIKFont
    startX: number
    startY: number
    cellWidth: number
    cellHeight: number
    selectedDate: Date
    selectedColor: Float32List
    firstDayOfWeek?: number
  }): void {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const margin = 10

    // Calculate monthDays and starting day of the week
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const monthDays = new Date(year, month + 1, 0).getDate()
    const firstDay = (new Date(year, month, 1).getDay() - firstDayOfWeek + 7) % 7

    // Determine scale based on longest string ("Wed") to ensure uniform cell size
    let scale = Math.min(cellWidth, cellHeight) / 100
    const referenceText = 'Wed'
    const referenceWidth = font.getTextWidth(referenceText, scale)
    const referenceHeight = font.getTextHeight(referenceText, scale)

    // Adjust scale to fit the reference text within the cell
    const maxTextHeight = cellHeight - 2 * margin
    const maxTextWidth = cellWidth - 2 * margin

    if (referenceHeight > maxTextHeight) {
      scale *= maxTextHeight / referenceHeight
    }

    if (referenceWidth > maxTextWidth) {
      scale *= maxTextWidth / referenceWidth
    }

    // Draw days of the week headers
    daysOfWeek.forEach((day, index) => {
      const x = startX + index * cellWidth
      const y = startY

      // Draw the cell background
      this.drawRoundedRect({
        bounds: [x, y, cellWidth, cellHeight],
        fillColor: [0.8, 0.8, 0.8, 0.3],
        outlineColor: [0.2, 0.2, 0.2, 1.0],
        cornerRadius: 0, // No roundness for the headers
        thickness: 2.0
      })

      // Calculate text position to center it in the cell
      const textWidth = font.getTextWidth(day, scale)
      const textHeight = font.getTextHeight(day, scale)
      const textX = x + (cellWidth - textWidth) / 2
      const textY = y + (cellHeight - textHeight) / 2

      // Draw the day name
      this.drawText({ font, position: [textX, textY], text: day, scale, color: [1, 1, 1, 1] })
    })

    // Draw the days of the calendar
    let dayCount = 1
    for (let row = 1; row <= 6; row++) {
      for (let col = 0; col < 7; col++) {
        if (row === 1 && col < firstDay) {
          continue // Skip empty cells before the first day of the month
        }
        if (dayCount > monthDays) {
          return // All days are drawn, exit
        }

        const x = startX + col * cellWidth
        const y = startY + row * cellHeight

        // Draw the cell background
        this.drawRoundedRect({
          bounds: [x, y, cellWidth, cellHeight],
          fillColor: [0.8, 0.8, 0.8, 0.3],
          outlineColor: [0.2, 0.2, 0.2, 1.0],
          cornerRadius: 0, // No roundness for the day cells
          thickness: 2.0
        })

        // Calculate text position to center it in the cell
        const dayTextWidth = font.getTextWidth(dayCount.toString(), scale)
        const dayTextHeight = font.getTextHeight(dayCount.toString(), scale)
        const dayTextX = x + (cellWidth - dayTextWidth) / 2
        const dayTextY = y + (cellHeight - dayTextHeight) / 2

        // Draw the day number
        const textColor: Float32List = dayCount === selectedDate.getDate() ? selectedColor : [0, 0, 0, 1]
        this.drawText({ font, position: [dayTextX, dayTextY], text: dayCount.toString(), scale, color: textColor })

        dayCount++
      }
    }
  }

  /**
   * Draws a text box with customizable text, colors, and margins.
   * @param params - Object containing parameters for rendering the text box.
   * @param params.font - The font object for rendering the text.
   * @param params.xy - The position of the top-left corner of the text box.
   * @param params.str - The text to render inside the text box.
   * @param params.textColor - The color of the text. Defaults to black with full opacity.
   * @param params.outlineColor - The color of the box's outline. Defaults to white with full opacity.
   * @param params.fillColor - The fill color of the box. Defaults to a transparent black.
   * @param params.margin - The margin between the text and the edges of the box. Defaults to 15.
   * @param params.roundness - The roundness of the box corners (0 to 1). Defaults to 0 (square corners).
   * @param params.scale - The scaling factor for the text. Defaults to 1.0.
   * @param params.maxWidth - The maximum width for text wrapping. Defaults to 0 (no wrapping).
   * @param params.fontOutlineColor - The outline color for the text. Defaults to black.
   * @param params.fontOutlineThickness - The thickness of the text outline. Defaults to 1.
   */
  public drawTextBox({
    font,
    xy,
    text,
    textColor = [0, 0, 0, 1.0],
    outlineColor = [1.0, 1.0, 1.0, 1.0],
    fillColor = [0.0, 0.0, 0.0, 0.3],
    margin = 15,
    roundness = 0.0,
    scale = 1.0,
    maxWidth = 0,
    fontOutlineColor = [0, 0, 0, 1],
    fontOutlineThickness = 1
  }: {
    font: UIKFont
    xy: Vec2
    text: string
    textColor?: Color
    outlineColor?: Color
    fillColor?: Color
    margin?: number
    roundness?: number
    scale?: number
    maxWidth?: number
    fontOutlineColor?: Color
    fontOutlineThickness?: number
  }): void {
    const dpr = window.devicePixelRatio || 1
    scale *= dpr
    const textHeight = font.getTextHeight(text, scale)
    const wrappedSize = font.getWordWrappedSize(text, scale, maxWidth)
    const rectWidth = wrappedSize[0] + 2 * margin * scale + textHeight
    const rectHeight = wrappedSize[1] + 4 * margin * scale // Height of the rectangle enclosing the text

    const leftTopWidthHeight = [xy[0], xy[1], rectWidth, rectHeight] as [number, number, number, number]
    this.drawRoundedRect({
      bounds: leftTopWidthHeight,
      fillColor,
      outlineColor,
      cornerRadius: (Math.min(1.0, roundness) / 2) * Math.min(leftTopWidthHeight[2], leftTopWidthHeight[3]),
      thickness: 5 // Add thickness parameter to match drawRoundedRect signature
    })
    const descenderDepth = font.getDescenderDepth(text, scale)

    const size = font.textHeight * this.gl.canvas.height * scale
    // Adjust the position of the text with a margin, ensuring it's vertically centered
    const textPosition = [
      leftTopWidthHeight[0] + margin * scale + textHeight / 2,
      leftTopWidthHeight[1] + 2 * margin * scale + textHeight - size + descenderDepth
    ] as [number, number]

    // Render the text
    this.drawText({
      font,
      position: textPosition,
      text,
      scale,
      color: textColor,
      maxWidth,
      outlineColor: fontOutlineColor,
      outlineThickness: fontOutlineThickness
    })
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
    showTickmarkNumbers = true
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
    // Calculate the angle between the points
    const deltaX = pointB[0] - pointA[0]
    const deltaY = pointB[1] - pointA[1]
    const actualLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    let angle = Math.atan2(deltaY, deltaX)

    // Calculate the midpoint
    const midPoint: Vec2 = [(pointA[0] + pointB[0]) / 2, (pointA[1] + pointB[1]) / 2]

    // Format the length text
    const text = `${length.toFixed(2)}`

    // Adjust the text position to ensure it's centered above the parallel line
    const textWidth = font.getTextWidth(text, scale)
    const textHeight = font.getTextHeight(text, scale)
    const halfTextWidth = textWidth / 2
    const halfTextHeight = textHeight / 2
    let textPosition: Vec2 = [
      midPoint[0] - halfTextWidth * Math.cos(angle) + (halfTextHeight + offset) * Math.sin(angle),
      midPoint[1] - halfTextWidth * Math.sin(angle) - (halfTextHeight + offset) * Math.cos(angle)
    ]

    // Ensure text is not upside down
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
          offset * Math.cos(angle)
      ]
    }

    // Draw the rotated length text at the adjusted position
    this.drawRotatedText({ font, xy: textPosition, str: text, scale, color: textColor, rotation: angle })

    // Draw the units at half the requested scale
    const unitsScale = scale / 2
    const unitsTextWidth = font.getTextWidth(units, unitsScale)
    const unitsTextPosition: Vec2 = [
      textPosition[0] + (textWidth + unitsTextWidth / 4) * Math.cos(angle),
      textPosition[1] + (textWidth + unitsTextWidth / 4) * Math.sin(angle)
    ]
    this.drawRotatedText({
      font,
      xy: unitsTextPosition,
      str: units,
      scale: unitsScale,
      color: textColor,
      rotation: angle
    })

    // Draw a parallel line of equal length to the original line
    const parallelPointA: Vec2 = [
      pointA[0] + (offset * deltaY) / actualLength,
      pointA[1] - (offset * deltaX) / actualLength
    ]
    const parallelPointB: Vec2 = [
      pointB[0] + (offset * deltaY) / actualLength,
      pointB[1] - (offset * deltaX) / actualLength
    ]
    this.drawLine({
      startEnd: [parallelPointA[0], parallelPointA[1], parallelPointB[0], parallelPointB[1]],
      thickness: lineThickness,
      color: lineColor
    })

    // Draw lines terminating in arrows from the ends of the parallel line to points A and B
    this.drawLine({
      startEnd: [parallelPointA[0], parallelPointA[1], pointA[0], pointA[1]],
      thickness: lineThickness,
      color: lineColor,
      terminator: LineTerminator.ARROW
    })
    this.drawLine({
      startEnd: [parallelPointB[0], parallelPointB[1], pointB[0], pointB[1]],
      thickness: lineThickness,
      color: lineColor,
      terminator: LineTerminator.ARROW
    })

    // Draw perpendicular hash marks like a ruler
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
        const hashTextWidth = font.getTextWidth(hashText, hashTextScale)
        const hashTextPosition: Vec2 = [
          hashPoint[0] +
            perpOffsetX -
            (hashTextWidth / 2) * Math.cos(angle) +
            (currentHashLength / 4) * Math.sin(angle),
          hashPoint[1] + perpOffsetY - (hashTextWidth / 2) * Math.sin(angle) - (currentHashLength / 4) * Math.cos(angle)
        ]
        if (showTickmarkNumbers) {
          this.drawRotatedText({
            font,
            xy: hashTextPosition,
            str: hashText,
            scale: hashTextScale,
            color: textColor,
            rotation: angle
          })
        }
      }

      const hashStart: Vec2 = [
        hashPoint[0] + perpOffsetX - (currentHashLength / 2) * Math.cos(angle + Math.PI / 2),
        hashPoint[1] + perpOffsetY - (currentHashLength / 2) * Math.sin(angle + Math.PI / 2)
      ]
      const hashEnd: Vec2 = [
        hashPoint[0] + perpOffsetX + (currentHashLength / 2) * Math.cos(angle + Math.PI / 2),
        hashPoint[1] + perpOffsetY + (currentHashLength / 2) * Math.sin(angle + Math.PI / 2)
      ]
      this.drawLine({ startEnd: [hashStart[0], hashStart[1], hashEnd[0], hashEnd[1]], thickness: 1, color: lineColor })
    }
  }

  /**
   * Draws an ellipsoid fill with rotation and mix value.
   * @param params - Object containing parameters for rendering the ellipsoid.
   * @param params.tx - X-coordinate of the top-left corner.
   * @param params.ty - Y-coordinate of the top-left corner.
   * @param params.sx - Width of the ellipsoid.
   * @param params.sy - Height of the ellipsoid.
   * @param params.color - Color of the ellipsoid in [R, G, B, A] format.
   * @param params.rotation - Rotation of the ellipsoid in radians. Defaults to 0.
   * @param params.mixValue - Mix value for blending. Defaults to 0.1.
   */
  public drawEllipsoidFill({
    tx,
    ty,
    sx,
    sy,
    color,
    rotation = 0,
    mixValue = 0.1
  }: {
    tx: number
    ty: number
    sx: number
    sy: number
    color: [number, number, number, number]
    rotation?: number
    mixValue?: number
  }): void {
    const rectangleShader = UIKRenderer.ellipticalFillShader

    rectangleShader.use(this.gl)

    const orthoMatrix = mat4.create()
    mat4.ortho(orthoMatrix, 0, this.gl.canvas.width, 0, this.gl.canvas.height, -1, 1)

    const modelMatrix = mat4.create()
    // Translate to the center of the rectangle
    mat4.translate(modelMatrix, modelMatrix, [tx + sx / 2, ty + sy / 2, 0])
    // Apply the rotation around the center
    mat4.rotateZ(modelMatrix, modelMatrix, rotation)
    // Translate back to the top-left corner
    mat4.translate(modelMatrix, modelMatrix, [-sx / 2, -sy / 2, 0])
    // Scale the rectangle
    mat4.scale(modelMatrix, modelMatrix, [sx, sy, 1])

    const transformMatrix = mat4.create()
    mat4.multiply(transformMatrix, orthoMatrix, modelMatrix)

    // Set the transform uniform
    this.gl.uniformMatrix4fv(rectangleShader.uniforms.u_transform, false, transformMatrix)

    // Set the color uniform
    this.gl.uniform4fv(rectangleShader.uniforms.u_color, color)

    // Set the mix value uniform
    this.gl.uniform1f(rectangleShader.uniforms.u_mixValue, mixValue)

    this.gl.bindVertexArray(UIKRenderer.genericVAO)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
  }

  /**
   * Draws a color bar with gradient and tick labels.
   * @param params - Object containing parameters for rendering the color bar.
   * @param params.font - Font used for rendering labels.
   * @param params.position - Position of the color bar [x, y].
   * @param params.size - Size of the color bar [width, height].
   * @param params.gradientTexture - Texture for gradient if applicable.
   * @param params.labels - Array of labels for tick marks.
   */
  public drawColorbar({
    position,
    size,
    gradientTexture
  }: {
    position: Vec2
    size: Vec2
    gradientTexture: WebGLTexture
  }): void {
    const gl = this.gl
    const [x, y] = position
    const [width, height] = size

    // Use the colorbarShader for rendering
    UIKRenderer.colorbarShader.use(gl)

    // Set up uniforms for the colorbar shader
    gl.uniform2fv(UIKRenderer.colorbarShader.uniforms.canvasWidthHeight, [gl.canvas.width, gl.canvas.height])
    gl.uniform4fv(UIKRenderer.colorbarShader.uniforms.leftTopWidthHeight, [x, y, width, height])

    // Bind the gradient texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, gradientTexture)
    gl.uniform1i(UIKRenderer.colorbarShader.uniforms.gradientTexture, 0) // Assumes gradient texture is bound to TEXTURE0

    // Bind VAO and draw color bar rectangle
    gl.bindVertexArray(UIKRenderer.genericVAO)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    // Unbind texture and VAO after drawing
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindVertexArray(null)
  }

  /**
   * Draws a line graph based on provided Graph settings.
   * @param params - Object containing settings for rendering the graph.
   */
  public drawLineGraph({
    position,
    size,
    backgroundColor,
    lineColor,
    axisColor,
    data,
    xLabel,
    yLabel,
    yRange,
    lineThickness = 2,
    textColor,
    font,
    textScale = 1
  }: {
    position: Vec2
    size: Vec2
    backgroundColor: Color
    lineColor: Color
    axisColor: Color
    data: number[]
    xLabel?: string
    yLabel?: string
    yRange?: [number, number]
    lineThickness?: number
    textColor: Color
    font: UIKFont
    textScale?: number
  }): void {
    // Define margins to prevent clipping of labels
    const leftMargin = 50 // leave space for y-axis label
    const bottomMargin = 60 // increased bottom margin for x-label
    const rightMargin = 20 // slight margin on right side
    const topMargin = 20 // small margin at the top

    // Calculate plot area within the graph space
    const plotPosition: Vec2 = [position[0] + leftMargin, position[1] + topMargin]
    const plotSize: Vec2 = [size[0] - leftMargin - rightMargin, size[1] - topMargin - bottomMargin]
    // Draw background for the graph
    this.drawRect({
      leftTopWidthHeight: [position[0], position[1], size[0], size[1]],
      fillColor: backgroundColor
    })

    // Draw Y-axis
    this.drawLine({
      startEnd: [plotPosition[0], plotPosition[1], plotPosition[0], plotPosition[1] + plotSize[1]],
      thickness: 1,
      color: axisColor
    })

    // Draw X-axis
    this.drawLine({
      startEnd: [
        plotPosition[0],
        plotPosition[1] + plotSize[1],
        plotPosition[0] + plotSize[0],
        plotPosition[1] + plotSize[1]
      ],
      thickness: 1,
      color: axisColor
    })

    // Calculate Y-axis range and scale
    const [minY, maxY] = yRange ?? [Math.min(...data), Math.max(...data)]
    const yScale = plotSize[1] / (maxY - minY)

    // Calculate X-axis spacing based on data length
    const xSpacing = plotSize[0] / (data.length - 1)

    // Draw data line connecting points
    for (let i = 0; i < data.length - 1; i++) {
      const x0 = plotPosition[0] + i * xSpacing
      const y0 = plotPosition[1] + plotSize[1] - (data[i] - minY) * yScale
      const x1 = plotPosition[0] + (i + 1) * xSpacing
      const y1 = plotPosition[1] + plotSize[1] - (data[i + 1] - minY) * yScale

      this.drawLine({
        startEnd: [x0, y0, x1, y1],
        thickness: lineThickness,
        color: lineColor
      })
    }

    // Draw Y-axis label, shifted slightly to the right of the Y-axis
    if (yLabel) {
      const yLabelPosition: Vec2 = [plotPosition[0] - 25, position[1] + size[1] / 2]
      this.drawRotatedText({
        font,
        xy: yLabelPosition,
        str: yLabel,
        scale: 0.8 * textScale,
        color: textColor,
        rotation: -Math.PI / 2
      })
    }

    // Draw X-axis label, positioned below the X-axis ticks
    if (xLabel) {
      const xLabelPosition: Vec2 = [position[0] + size[0] / 2, position[1] + size[1] - 20]
      this.drawText({
        font,
        position: xLabelPosition,
        text: xLabel,
        scale: 0.8 * textScale,
        color: textColor
      })
    }

    // Draw Y-axis ticks and labels with equal spacing
    const yTickCount = 5
    const yTickSpacing = plotSize[1] / yTickCount
    const yValueSpacing = (maxY - minY) / yTickCount

    for (let i = 0; i <= yTickCount; i++) {
      const yPos = plotPosition[1] + plotSize[1] - i * yTickSpacing
      const yValue = (minY + i * yValueSpacing).toFixed(2)

      // Draw Y tick
      this.drawLine({
        startEnd: [plotPosition[0] - 5, yPos, plotPosition[0], yPos],
        thickness: 1,
        color: axisColor
      })

      // Draw Y tick label with left padding for alignment
      this.drawText({
        font,
        position: [plotPosition[0] - 10, yPos],
        text: yValue,
        scale: 0.6 * textScale,
        color: textColor
      })
    }

    // Draw X-axis ticks and labels with limited count for readability
    const xTickCount = Math.min(data.length, 10)
    const xTickSpacing = plotSize[0] / xTickCount

    for (let i = 0; i <= xTickCount; i++) {
      const xPos = plotPosition[0] + i * xTickSpacing
      const xValue = (i * Math.floor(data.length / xTickCount)).toString()

      // Draw X tick
      this.drawLine({
        startEnd: [xPos, plotPosition[1] + plotSize[1], xPos, plotPosition[1] + plotSize[1] + 5],
        thickness: 1,
        color: axisColor
      })

      // Draw X tick label with downward padding
      this.drawText({
        font,
        position: [xPos, plotPosition[1] + plotSize[1] + 15],
        text: xValue,
        scale: 0.6 * textScale,
        color: textColor
      })
    }
  }

  private drawProjectedLineSegment({
    startXYZ,
    endXYZ,
    thickness = 1,
    lineColor = [1, 0, 0, 1]
  }: {
    startXYZ: Vec3
    endXYZ: Vec3
    thickness?: number
    lineColor?: Color
  }): void {
    this.gl.bindVertexArray(UIKRenderer.genericVAO)
    if (!UIKRenderer.projectedLineShader) {
      throw new Error('projectedLineShader undefined')
    }
    UIKRenderer.projectedLineShader.use(this.gl)

    this.gl.uniform4fv(UIKRenderer.projectedLineShader.uniforms.lineColor, lineColor)
    this.gl.uniform2fv(UIKRenderer.projectedLineShader.uniforms.canvasWidthHeight, [
      this.gl.canvas.width,
      this.gl.canvas.height
    ])
    // Draw Line
    this.gl.uniform1f(UIKRenderer.projectedLineShader.uniforms.thickness, thickness)
    this.gl.uniform3fv(UIKRenderer.projectedLineShader.uniforms.startXYZ, startXYZ)
    this.gl.uniform3fv(UIKRenderer.projectedLineShader.uniforms.endXYZ, endXYZ)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    this.gl.bindVertexArray(null) // Unbind to avoid side effects
  }

  /**
   * Draws a 3D projected line in WebGL with support for solid, dashed, or dotted styles,
   * as well as optional terminators (e.g., arrows, circles, or rings).
   *
   * @param config - Configuration object containing the following properties:
   *   - `startXYZ`: The starting point of the line in 3D space as a Vec3 ([x, y, z]).
   *   - `endXYZ`: The ending point of the line in 3D space as a Vec3 ([x, y, z]).
   *   - `thickness` (optional): The thickness of the line. Defaults to 1.
   *   - `lineColor` (optional): The color of the line in [R, G, B, A] format. Defaults to `[1, 0, 0, 1]` (red).
   *   - `terminator` (optional): The type of terminator to draw at the endpoint of the line. Defaults to `LineTerminator.NONE`.
   *                              Supported terminators include:
   *                              - `LineTerminator.ARROW` for an arrowhead.
   *                              - `LineTerminator.CIRCLE` for a filled circle.
   *                              - `LineTerminator.RING` for a hollow circle (ring).
   *   - `lineStyle` (optional): The style of the line. Defaults to `LineStyle.SOLID`.
   *                              Supported styles include:
   *                              - `LineStyle.SOLID` for a continuous line.
   *                              - `LineStyle.DASHED` for a dashed line.
   *                              - `LineStyle.DOTTED` for a dotted line.
   *   - `dashDotLength` (optional): The length of dashes or dots in dashed or dotted lines. Defaults to 5.
   *
   * If the `lineStyle` is dashed or dotted, the method calculates evenly spaced segments or dots
   * along the length of the line. If a terminator is used, the line is adjusted to prevent overlap
   * with the terminator.
   *
   * ### Examples
   * Draw a solid blue line with an arrow terminator:
   * ```typescript
   * renderer.drawProjectedLine({
   *   startXYZ: [0, 0, 0],
   *   endXYZ: [100, 100, 0],
   *   thickness: 2,
   *   lineColor: [0, 0, 1, 1],
   *   terminator: LineTerminator.ARROW
   * })
   * ```
   *
   * Draw a dashed red line with no terminator:
   * ```typescript
   * renderer.drawProjectedLine({
   *   startXYZ: [0, 0, 0],
   *   endXYZ: [200, 50, 0],
   *   thickness: 3,
   *   lineColor: [1, 0, 0, 1],
   *   lineStyle: LineStyle.DASHED,
   *   dashDotLength: 10
   * })
   * ```
   *
   * @throws Will throw an error if the shader for drawing the line is not defined.
   */
  public drawProjectedLine({
    startXYZ,
    endXYZ,
    thickness = 1,
    lineColor = [1, 0, 0, 1],
    terminator = LineTerminator.NONE,
    lineStyle = LineStyle.SOLID,
    dashDotLength = 5
  }: {
    startXYZ: Vec3
    endXYZ: Vec3
    thickness?: number
    lineColor?: Color
    terminator?: LineTerminator
    lineStyle?: LineStyle
    dashDotLength?: number
  }): void {
    const [startX, startY, startZ] = startXYZ
    const [endX, endY, endZ] = endXYZ

    // Calculate direction vector and line length
    const direction = vec2.sub(vec2.create(), [endX, endY], [startX, startY])
    vec2.normalize(direction, direction)
    const lineLength = vec2.distance([startX, startY], [endX, endY])

    // Adjust for terminator if needed
    const terminatorSize = thickness * 3
    let adjustedEndX = endX
    let adjustedEndY = endY
    if (terminator !== LineTerminator.NONE) {
      adjustedEndX -= direction[0] * (terminatorSize / 2)
      adjustedEndY -= direction[1] * (terminatorSize / 2)
    }

    if (lineStyle === LineStyle.DASHED || lineStyle === LineStyle.DOTTED) {
      const segmentSpacing = lineStyle === LineStyle.DASHED ? dashDotLength * 1.5 : dashDotLength * 2
      const segmentCount = Math.floor(lineLength / segmentSpacing)

      for (let i = 0; i <= segmentCount; i++) {
        const segmentStartXY = vec2.scaleAndAdd(vec2.create(), [startX, startY], direction, i * segmentSpacing)
        const segmentStart: Vec3 = [segmentStartXY[0], segmentStartXY[1], startZ]

        if (i === segmentCount) {
          if (lineStyle === LineStyle.DASHED) {
            // Final dashed segment to adjusted endpoint
            this.drawProjectedLineSegment({
              startXYZ: segmentStart,
              endXYZ: [adjustedEndX, adjustedEndY, endZ],
              thickness,
              lineColor
            })
          } else if (lineStyle === LineStyle.DOTTED) {
            // Final dot at the adjusted endpoint
            this.drawCircle({
              leftTopWidthHeight: [
                adjustedEndX - dashDotLength / 2,
                adjustedEndY - dashDotLength / 2,
                dashDotLength,
                dashDotLength
              ],
              circleColor: lineColor,
              z: endZ
            })
          }
        } else {
          if (lineStyle === LineStyle.DASHED) {
            const segmentEndXY = vec2.scaleAndAdd(vec2.create(), segmentStartXY, direction, dashDotLength)
            const segmentEnd: Vec3 = [segmentEndXY[0], segmentEndXY[1], startZ]
            this.drawProjectedLineSegment({
              startXYZ: segmentStart,
              endXYZ: segmentEnd,
              thickness,
              lineColor
            })
          } else if (lineStyle === LineStyle.DOTTED) {
            // Draw dot as a small circle
            this.drawCircle({
              leftTopWidthHeight: [
                segmentStart[0] - dashDotLength / 2,
                segmentStart[1] - dashDotLength / 2,
                dashDotLength,
                dashDotLength
              ],
              circleColor: lineColor,
              z: startZ
            })
          }
        }
      }
    } else {
      // Draw solid line if no dash/dot style specified
      this.drawProjectedLineSegment({
        startXYZ,
        endXYZ: [adjustedEndX, adjustedEndY, endZ],
        thickness,
        lineColor
      })
    }

    // Draw terminator if specified
    switch (terminator) {
      case LineTerminator.ARROW: {
        const triangleDirection = vec2.sub(vec2.create(), [endX, endY], [adjustedEndX, adjustedEndY])
        vec2.normalize(triangleDirection, triangleDirection)
        this.drawTriangle({
          headPoint: [endXYZ[0], endXYZ[1]],
          baseMidPoint: [endX - (direction[0] * terminatorSize) / 2, endY - (direction[1] * terminatorSize) / 2],
          baseLength: terminatorSize,
          color: lineColor,
          z: endZ
        })
        break
      }
      case LineTerminator.CIRCLE:
        this.drawCircle({
          leftTopWidthHeight: [
            adjustedEndX - terminatorSize / 2,
            adjustedEndY - terminatorSize / 2,
            terminatorSize,
            terminatorSize
          ],
          circleColor: lineColor,
          z: endZ
        })
        break
      case LineTerminator.RING:
        this.drawCircle({
          leftTopWidthHeight: [
            adjustedEndX - terminatorSize / 2,
            adjustedEndY - terminatorSize / 2,
            terminatorSize,
            terminatorSize
          ],
          circleColor: lineColor,
          fillPercent: 0.5,
          z: endZ
        })
        break
    }
  }
}
