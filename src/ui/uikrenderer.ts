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
import { LineTerminator, Color, Vec2, Vec4, LineStyle, Graph, Vec3 } from './types.js'

// NVRenderer class with rendering methods
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

  /**
   * Creates an instance of NVRenderer.
   * @param gl - The WebGL2RenderingContext to be used for rendering.
   */
  constructor(gl: WebGL2RenderingContext) {
    // Initialize shaders and buffers if not already initialized
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

  // Function to support drawing characters, including RTL
  public drawChar(font: UIKFont, position: Vec2, size: number, char: string): number {
    if (!font.fontShader) {
      throw new Error('fontShader undefined')
    }
    // Draw single character, never call directly: ALWAYS call from drawText()
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

  // Updated drawText to support Vec2 position
  public drawText(
    font: UIKFont,
    position: Vec2,
    str: string,
    scale = 1.0,
    color: Color = [1.0, 0.0, 0.0, 1.0],
    maxWidth = 0,
    outlineColor: Color = [0, 0, 0, 1],
    outlineThickness: number = 1
  ): void {
    if (!font.isFontLoaded) {
      console.error('font not loaded')
      return
    }

    if (!font.fontShader) {
      throw new Error('fontShader undefined')
    }

    // Bind the font texture
    const gl = this.gl
    font.fontShader.use(gl)
    gl.activeTexture(TEXTURE3_FONT)
    gl.bindTexture(gl.TEXTURE_2D, font.getTexture())
    this.gl.uniform1i(font.fontShader!.uniforms.fontTexture, 3)

    const size = font.textHeight * Math.min(this.gl.canvas.height, this.gl.canvas.width) * scale
    this.gl.enable(this.gl.BLEND)
    this.gl.uniform2f(font.fontShader.uniforms.canvasWidthHeight, this.gl.canvas.width, this.gl.canvas.height)
    if (color === null) {
      color = font.fontColor
    }
    this.gl.uniform4fv(font.fontShader.uniforms.fontColor, color as Float32List)
    let screenPxRange = (size / font.fontMets!.size) * font.fontMets!.distanceRange
    screenPxRange = Math.max(screenPxRange, 1.0) // screenPxRange must never be lower than 1
    this.gl.uniform1f(font.fontShader.uniforms.screenPxRange, screenPxRange)

    // outline
    this.gl.uniform4fv(font.fontShader.uniforms.outlineColor, outlineColor as Float32List)
    this.gl.uniform1f(font.fontShader.uniforms.outlineThickness, outlineThickness)

    this.gl.bindVertexArray(UIKRenderer.genericVAO)

    const pos = Array.isArray(position) ? vec2.fromValues(position[0], position[1]) : position

    // Calculate word-wrapped size
    const words = str.split(' ')
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
        currentX += this.drawChar(font, [currentX, currentY], size, chars[i])
      }
    }
    this.gl.bindVertexArray(null)
  }

  public drawBitmap(bitmap: UIKBitmap, position: Vec2, scale: number): void {
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
   * @param startEnd - The start and end coordinates of the line, as a Vec4 array in the form [startX, startY, endX, endY].
   * @param thickness - The thickness of the line. Defaults to 1.
   * @param lineColor - The color of the line, as a Color array in [R, G, B, A] format. Defaults to red ([1, 0, 0, -1]).
   * @param terminator - The type of terminator at the end of the line (e.g., NONE, ARROW, CIRCLE, or RING). Defaults to NONE.
   * @param lineStyle - The style of the line: solid, dashed, or dotted. Defaults to solid.
   * @param dashDotLength - The length of dashes or diameter of dots for dashed/dotted lines. Defaults to 5.
   *
   * If a terminator is specified, the line will be shortened by half the width of the terminator to avoid overlap.
   * For dashed lines, segments are spaced out by a factor of 1.5 * dashDotLength.
   * For dotted lines, dots are spaced out by a factor of 2 * dashDotLength.
   */
  public drawLine(
    startEnd: Vec4,
    thickness = 1,
    lineColor: Color = [1, 0, 0, -1],
    terminator: LineTerminator = LineTerminator.NONE,
    lineStyle: LineStyle = LineStyle.SOLID,
    dashDotLength: number = 5 // Default length for dash or dot size
  ): void {
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

    if (lineStyle === LineStyle.DASHED || lineStyle === LineStyle.DOTTED) {
      const lineLength = vec2.distance([startX, startY], [endX, endY])
      const segmentSpacing = lineStyle === LineStyle.DASHED ? dashDotLength * 1.5 : dashDotLength * 2
      const segmentCount = Math.floor(lineLength / segmentSpacing)

      for (let i = 0; i <= segmentCount; i++) {
        const segmentStart = vec2.scaleAndAdd(vec2.create(), [startX, startY], direction, i * segmentSpacing)

        if (i === segmentCount) {
          // Connect the last dash or dot to the adjusted endpoint
          if (lineStyle === LineStyle.DASHED) {
            const segmentCoords = vec4.fromValues(segmentStart[0], segmentStart[1], endX, endY)
            this.drawSegment(segmentCoords, thickness, lineColor)
          } else if (lineStyle === LineStyle.DOTTED) {
            const dotParams = vec4.fromValues(
              endX - dashDotLength / 2,
              endY - dashDotLength / 2,
              dashDotLength,
              dashDotLength
            )
            this.drawCircle(dotParams, lineColor)
          }
        } else {
          if (lineStyle === LineStyle.DASHED) {
            // Draw dashed segment
            const segmentEnd = vec2.scaleAndAdd(vec2.create(), segmentStart, direction, dashDotLength)
            const segmentCoords = vec4.fromValues(segmentStart[0], segmentStart[1], segmentEnd[0], segmentEnd[1])
            this.drawSegment(segmentCoords, thickness, lineColor)
          } else if (lineStyle === LineStyle.DOTTED) {
            // Draw dot as a small circle
            const dotParams = vec4.fromValues(
              segmentStart[0] - dashDotLength / 2,
              segmentStart[1] - dashDotLength / 2,
              dashDotLength,
              dashDotLength
            )
            this.drawCircle(dotParams, lineColor)
          }
        }
      }
    } else {
      // Draw solid line if no dash/dot style specified
      const shortenedLine = vec4.fromValues(startX, startY, endX, endY)
      this.lineShader.use(gl)
      gl.enable(gl.BLEND)
      gl.uniform4fv(this.lineShader.uniforms.lineColor, lineColor as Float32List)
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
        this.drawTriangle(
          [startEnd[2], startEnd[3]],
          [endX - (direction[0] * terminatorSize) / 2, endY - (direction[1] * terminatorSize) / 2],
          terminatorSize,
          lineColor
        )
        break
      case LineTerminator.CIRCLE:
        this.drawCircle(
          [startEnd[2] - terminatorSize / 2, startEnd[3] - terminatorSize / 2, terminatorSize, terminatorSize],
          lineColor
        )
        break
      case LineTerminator.RING:
        this.drawCircle(
          [startEnd[2] - terminatorSize / 2, startEnd[3] - terminatorSize / 2, terminatorSize, terminatorSize],
          lineColor,
          0.5
        )
        break
    }
  }

  // Helper method to draw individual dashed segments
  private drawSegment(segmentCoords: Vec4, thickness: number, color: Color): void {
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
   * Draws an elbow line.
   * @param startEnd - The start and end coordinates of the line ([startX, startY, endX, endY]).
   * @param thickness - The thickness of the line.
   * @param lineColor - The color of the line.
   * @param horizontalFirst - If true, draw the horizontal segment first, otherwise draw the vertical segment first.
   */
  public drawElbowLine(
    startEnd: Vec4,
    thickness = 1,
    lineColor: Color = [1, 0, 0, -1],
    horizontalFirst = true,
    terminator: LineTerminator = LineTerminator.NONE
  ): void {
    // Extract start and end points
    const [startX, startY, endX, endY] = startEnd

    // Calculate the midpoint for the elbow
    const midX = horizontalFirst ? startX + (endX - startX) / 2 : startX
    const midY = horizontalFirst ? startY : startY + (endY - startY) / 2

    // Draw the first segment (either horizontal or vertical)
    const firstSegment: Vec4 = horizontalFirst ? [startX, startY, midX, startY] : [startX, startY, startX, midY]
    this.drawLine(firstSegment, thickness, lineColor)

    // Draw the second segment (the other direction)
    const secondSegment: Vec4 = horizontalFirst ? [midX, startY, endX, endY] : [startX, midY, endX, endY]
    this.drawLine(secondSegment, thickness, lineColor, terminator)
  }

  /**
   * Draws a rectangle.
   * @param leftTopWidthHeight - The bounding box of the rectangle (left, top, width, height).
   * @param lineColor - The color of the rectangle.
   */
  public drawRect(leftTopWidthHeight: Vec4, lineColor: Color = [1, 0, 0, -1]): void {
    this.drawRoundedRect(leftTopWidthHeight, lineColor, [0, 0, 0, 0], 0, 0)
  }

  /**
   * Draws a rounded rectangle.
   * @param leftTopWidthHeight - The bounding box of the rounded rectangle (left, top, width, height).
   * @param fillColor - The fill color of the rectangle.
   * @param outlineColor - The outline color of the rectangle.
   * @param cornerRadius - The corner radius.
   * @param thickness - The thickness of the outline.
   */
  public drawRoundedRect(
    leftTopWidthHeight: Vec4,
    fillColor: Color,
    outlineColor: Color,
    cornerRadius: number = -1,
    thickness: number = 10
  ): void {
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
    if (cornerRadius === -1) {
      cornerRadius = thickness * 2
    }

    const rectParams = Array.isArray(leftTopWidthHeight)
      ? vec4.fromValues(leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3])
      : leftTopWidthHeight

    this.gl.uniform1f(shader.uniforms.thickness, thickness)
    this.gl.uniform1f(shader.uniforms.cornerRadius, cornerRadius)
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
   * @param leftTopWidthHeight - The bounding box of the circle (left, top, width, height).
   * @param circleColor - The color of the circle.
   * @param fillPercent - The percentage of the circle to fill (0 to 1).
   */
  public drawCircle(
    leftTopWidthHeight: Vec4,
    circleColor: Color = [1, 1, 1, 1],
    fillPercent = 1.0,
    z: number = 0
  ): void {
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
   * @param position - The position of the top-left corner of the toggle.
   * @param size - The size of the toggle ([width, height]).
   * @param isOn - Whether the toggle is on or off.
   * @param onColor - The color when the toggle is on.
   * @param offColor - The color when the toggle is off.
   * @param knobPosition - The position of the knob (0 for off, 1 for on, values in between for animation).
   */

  public drawToggle(
    position: Vec2,
    size: Vec2,
    isOn: boolean,
    onColor: Color,
    offColor: Color,
    knobPosition: number = isOn ? 1.0 : 0.0 // Default to fully on or off
  ): void {
    // Handle Vec2 types to ensure compatibility with both gl-matrix vec2 and [number, number]
    const posX = Array.isArray(position) ? position[0] : position[0]
    const posY = Array.isArray(position) ? position[1] : position[1]
    const sizeX = Array.isArray(size) ? size[0] : size[0]
    const sizeY = Array.isArray(size) ? size[1] : size[1]

    const cornerRadius = sizeY / 2 // Height is used for radius

    // Ensure the colors are Float32Array
    const fillColor = new Float32Array(isOn ? onColor : offColor)

    // Draw the background rounded rectangle
    this.drawRoundedRect(
      [posX, posY, sizeX, sizeY],
      fillColor,
      new Float32Array([0.2, 0.2, 0.2, 1.0]), // Outline color
      cornerRadius,
      2.0 // Outline thickness
    )
    // Clamp knobPosition between 0 and 1
    knobPosition = Math.max(0, Math.min(1, knobPosition))

    // Calculate the circle (toggle knob) position based on the knobPosition
    const knobSize = sizeY * 0.8
    const offX = posX + (sizeY - knobSize) / 2
    const onX = posX + sizeX - knobSize - (sizeY - knobSize) / 2
    const knobX = offX + (onX - offX) * knobPosition
    const knobY = posY + (sizeY - knobSize) / 2

    // Draw the toggle knob as a circle
    this.drawCircle([knobX, knobY, knobSize, knobSize], new Float32Array([1.0, 1.0, 1.0, 1.0]))
  }

  public drawTriangle(headPoint: Vec2, baseMidPoint: Vec2, baseLength: number, color: Color, z: number = 0): void {
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

  // Function to draw rotated text, supporting individual character drawing including RTL
  public drawRotatedText(
    font: UIKFont,
    xy: Vec2,
    str: string,
    scale = 1.0,
    color: Color = [1.0, 0.0, 0.0, 1.0],
    rotation = 0.0, // Rotation in radians
    outlineColor: Color = [0, 0, 0, 1.0],
    outlineThickness: number = 2
  ): void {
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
    if (color === null) {
      color = font.fontColor
    }
    gl.uniform4fv(rotatedFontShader.uniforms.fontColor, color as Float32List)
    let screenPxRange = (scale / font.fontMets!.size) * font.fontMets!.distanceRange
    screenPxRange = Math.max(screenPxRange, 1.0) // screenPxRange must never be lower than 1
    gl.uniform1f(rotatedFontShader.uniforms.screenPxRange, screenPxRange)
    gl.uniform1i(rotatedFontShader.uniforms.fontTexture, 0)

    // outline
    this.gl.uniform4fv(rotatedFontShader.uniforms.outlineColor, outlineColor as Float32List)
    this.gl.uniform1f(rotatedFontShader.uniforms.outlineThickness, outlineThickness)

    // Bind VAO for generic rectangle
    gl.bindVertexArray(UIKRenderer.genericVAO)

    // Set up orthographic projection matrix
    const orthoMatrix = mat4.create()
    // mat4.ortho(orthoMatrix, 0, gl.canvas.width, 0, gl.canvas.height, -1, 1); // Swap top and bottom
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
    for (let i = 0; i < chars.length; i++) {
      const metrics = font.fontMets!.mets[chars[i]]
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
      // Log MVP matrix for debugging
      // console.log('MVP Matrix modified:', mvpMatrix)

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

  drawCalendar(
    font: UIKFont,
    startX: number,
    startY: number,
    cellWidth: number,
    cellHeight: number,
    selectedDate: Date,
    selectedColor: Float32List,
    firstDayOfWeek: number = 0 // 0 represents Sunday
  ): void {
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
      this.drawRoundedRect(
        [x, y, cellWidth, cellHeight],
        [0.8, 0.8, 0.8, 0.3],
        [0.2, 0.2, 0.2, 1.0],
        0, // No roundness for the headers
        2.0
      )

      // Calculate text position to center it in the cell
      const textWidth = font.getTextWidth(day, scale)
      const textHeight = font.getTextHeight(day, scale)
      const textX = x + (cellWidth - textWidth) / 2
      const textY = y + (cellHeight - textHeight) / 2

      // Draw the day name
      this.drawText(font, [textX, textY], day, scale, [1, 1, 1, 1])
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
        this.drawRoundedRect(
          [x, y, cellWidth, cellHeight],
          [0.8, 0.8, 0.8, 0.3],
          [0.2, 0.2, 0.2, 1.0],
          0, // No roundness for the day cells
          2.0
        )

        // Calculate text position to center it in the cell
        const dayTextWidth = font.getTextWidth(dayCount.toString(), scale)
        const dayTextHeight = font.getTextHeight(dayCount.toString(), scale)
        const dayTextX = x + (cellWidth - dayTextWidth) / 2
        const dayTextY = y + (cellHeight - dayTextHeight) / 2

        // Draw the day number
        const textColor: Float32List = dayCount === selectedDate.getDate() ? selectedColor : [0, 0, 0, 1]
        this.drawText(font, [dayTextX, dayTextY], dayCount.toString(), scale, textColor)

        dayCount++
      }
    }
  }

  drawTextBox(
    font: UIKFont,
    xy: Vec2,
    str: string,
    textColor: Color = [0, 0, 0, 1.0],
    outlineColor: Color = [1.0, 1.0, 1.0, 1.0],
    fillColor: Color = [0.0, 0.0, 0.0, 0.3],
    margin: number = 15,
    roundness: number = 0.0,
    scale = 1.0,
    maxWidth = 0,
    fontOutlineColor: Color = [0, 0, 0, 1],
    fontOutlineThickness: number = 1
  ): void {
    const textHeight = font.getTextHeight(str, scale)
    const wrappedSize = font.getWordWrappedSize(str, scale, maxWidth)
    const rectWidth = wrappedSize[0] + 2 * margin * scale + textHeight
    const rectHeight = wrappedSize[1] + 4 * margin * scale // Height of the rectangle enclosing the text

    const leftTopWidthHeight = [xy[0], xy[1], rectWidth, rectHeight] as [number, number, number, number]
    this.drawRoundedRect(
      leftTopWidthHeight,
      fillColor,
      outlineColor,
      (Math.min(1.0, roundness) / 2) * Math.min(leftTopWidthHeight[2], leftTopWidthHeight[3])
    )
    const descenderDepth = font.getDescenderDepth(str, scale)

    const size = font.textHeight * Math.min(this.gl.canvas.height, this.gl.canvas.width) * scale
    // Adjust the position of the text with a margin, ensuring it's vertically centered
    const textPosition = [
      leftTopWidthHeight[0] + margin * scale + textHeight / 2,
      leftTopWidthHeight[1] + 2 * margin * scale + textHeight - size + descenderDepth
    ] as [number, number]

    // Render the text
    this.drawText(font, textPosition, str, scale, textColor, maxWidth, fontOutlineColor, fontOutlineThickness)
  }

  public drawCaliper(
    pointA: Vec2,
    pointB: Vec2,
    length: number,
    units: string,
    font: UIKFont,
    textColor: Color = [1, 0, 0, 1],
    lineColor: Color = [0, 0, 0, 1],
    lineThickness: number = 1,
    offset: number = 40,
    scale: number = 1.0
  ): void {
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
    this.drawRotatedText(font, textPosition, text, scale, [0, 0, 0, 1], angle, [1, 1, 1, 1], 4)
    this.drawRotatedText(font, textPosition, text, scale, [0, 0, 0, 1], angle, [1, 1, 1, 1], 4)
    this.drawRotatedText(font, textPosition, text, scale, textColor, angle, [1, 1, 1, 1], 4)
    // this.drawRotatedText(font, textPosition, text, scale, textColor, angle)

    // Draw the units at half the requested scale, positioned closer to the end of the length text, with the same rotation and vertically aligned to the middle of the length text
    const unitsText = units
    const unitsScale = scale / 2
    const unitsTextWidth = font.getTextWidth(unitsText, unitsScale)
    // const unitsTextHeight = font.getTextHeight(unitsText, unitsScale)
    const unitsTextPosition: Vec2 = [
      textPosition[0] + (textWidth + unitsTextWidth / 4) * Math.cos(angle),
      textPosition[1] + (textWidth + unitsTextWidth / 4) * Math.sin(angle)
    ]
    this.drawRotatedText(font, unitsTextPosition, unitsText, unitsScale, textColor, angle)

    // Draw a parallel line of equal length to the original line
    const parallelPointA: Vec2 = [
      pointA[0] + (offset * deltaY) / actualLength,
      pointA[1] - (offset * deltaX) / actualLength
    ]
    const parallelPointB: Vec2 = [
      pointB[0] + (offset * deltaY) / actualLength,
      pointB[1] - (offset * deltaX) / actualLength
    ]
    this.drawLine(
      [parallelPointA[0], parallelPointA[1], parallelPointB[0], parallelPointB[1]],
      lineThickness,
      lineColor
    )

    // Draw lines terminating in arrows from the ends of the parallel line to points A and B
    this.drawLine(
      [parallelPointA[0], parallelPointA[1], pointA[0], pointA[1]],
      lineThickness,
      lineColor,
      LineTerminator.ARROW
    )
    this.drawLine(
      [parallelPointB[0], parallelPointB[1], pointB[0], pointB[1]],
      lineThickness,
      lineColor,
      LineTerminator.ARROW
    )

    // Draw perpendicular hash marks like a ruler, moved closer to the arrows
    const numHashMarks = Math.floor(length) // Draw a hash mark for every unit
    const hashLength = 8 // Length of each hash mark
    const parallelOffset = offset / 4 // Move hash marks closer to the arrows

    for (let i = 1; i <= numHashMarks; i++) {
      const t = i / length
      const hashPoint: Vec2 = [pointA[0] + t * deltaX, pointA[1] + t * deltaY]

      // Make every 5th hash mark twice as long
      const currentHashLength = i % 5 === 0 ? hashLength * 2 : hashLength

      const perpOffsetX = (deltaY / actualLength) * parallelOffset
      const perpOffsetY = (-deltaX / actualLength) * parallelOffset

      if (i % 5 === 0) {
        const hashText = `${i}`
        const hashTextScale = scale / 5 // Scale down the text size to 1/5 of the scale
        const hashTextWidth = font.getTextWidth(hashText, hashTextScale)
        // const hashTextHeight = font.getTextHeight(hashText, hashTextScale)
        const hashTextPosition: Vec2 = [
          hashPoint[0] +
            perpOffsetX -
            (hashTextWidth / 2) * Math.cos(angle) +
            (currentHashLength / 4) * Math.sin(angle),
          hashPoint[1] + perpOffsetY - (hashTextWidth / 2) * Math.sin(angle) - (currentHashLength / 4) * Math.cos(angle)
        ]
        this.drawRotatedText(font, hashTextPosition, hashText, hashTextScale, [0, 0, 0, 1], angle, [1, 1, 1, 1], 4)
        this.drawRotatedText(font, hashTextPosition, hashText, hashTextScale, [0, 0, 0, 1], angle, [1, 1, 1, 1], 4)
        this.drawRotatedText(font, hashTextPosition, hashText, hashTextScale, textColor, angle)
      }

      const hashStart: Vec2 = [
        hashPoint[0] + perpOffsetX - (currentHashLength / 2) * Math.cos(angle + Math.PI / 2),
        hashPoint[1] + perpOffsetY - (currentHashLength / 2) * Math.sin(angle + Math.PI / 2)
      ]
      const hashEnd: Vec2 = [
        hashPoint[0] + perpOffsetX + (currentHashLength / 2) * Math.cos(angle + Math.PI / 2),
        hashPoint[1] + perpOffsetY + (currentHashLength / 2) * Math.sin(angle + Math.PI / 2)
      ]

      // Set hash line thickness to 1
      this.drawLine([hashStart[0], hashStart[1], hashEnd[0], hashEnd[1]], 1, lineColor)
    }
  }

  public drawRectangle(
    tx: number,
    ty: number,
    sx: number,
    sy: number,
    color: [number, number, number, number],
    rotation: number = 0,
    mixValue: number = 0.1
  ): void {
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

  public drawColorbar(
    font: UIKFont, // Font used for rendering labels
    position: Vec2, // Position of the color bar [x, y]
    size: Vec2, // Size of the color bar [width, height]
    gradientTexture: WebGLTexture, // Texture for gradient if applicable
    labels: string[] // Array of labels for tick marks
    // minMax: [number, number] = [0, 1] // Minimum and maximum values for labels
  ): void {
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

    // Draw tick marks and labels if any, using the provided font
    // const range = minMax[1] - minMax[0]
    const spacing = width / (labels.length - 1)
    labels.forEach((label, i) => {
      const labelX = x + i * spacing
      const labelPos: Vec2 = [labelX, y + height + 5]
      this.drawText(font, labelPos, label, 0.5, [0, 0, 0, 1]) // Adjust scale and color as needed
    })

    // Unbind texture and VAO after drawing
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindVertexArray(null)
  }

  /**
   * Draws a line graph based on provided Graph settings.
   * @param options - Graph object with settings for rendering the graph.
   */
  public drawLineGraph(options: Graph): void {
    const {
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
    } = options

    // Define margins to prevent clipping of labels
    const leftMargin = 50 // leave space for y-axis label
    const bottomMargin = 60 // increased bottom margin for x-label
    const rightMargin = 20 // slight margin on right side
    const topMargin = 20 // small margin at the top

    // Calculate plot area within the graph space
    const plotPosition: Vec2 = [position[0] + leftMargin, position[1] + topMargin]
    const plotSize: Vec2 = [size[0] - leftMargin - rightMargin, size[1] - topMargin - bottomMargin]

    // Draw background for the graph
    this.drawRect([position[0], position[1], size[0], size[1]], backgroundColor)

    // Draw Y-axis
    this.drawLine([plotPosition[0], plotPosition[1], plotPosition[0], plotPosition[1] + plotSize[1]], 1, axisColor)

    // Draw X-axis
    this.drawLine(
      [plotPosition[0], plotPosition[1] + plotSize[1], plotPosition[0] + plotSize[0], plotPosition[1] + plotSize[1]],
      1,
      axisColor
    )

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

      this.drawLine([x0, y0, x1, y1], lineThickness, lineColor)
    }

    // Draw Y-axis label, shifted slightly to the right of the Y-axis
    if (yLabel) {
      const yLabelPosition: Vec2 = [plotPosition[0] - 25, position[1] + size[1] / 2]
      this.drawRotatedText(font, yLabelPosition, yLabel, 0.8 * textScale, textColor, -Math.PI / 2)
    }

    // Draw X-axis label, positioned below the X-axis ticks
    if (xLabel) {
      const xLabelPosition: Vec2 = [position[0] + size[0] / 2, position[1] + size[1] - 20]
      this.drawText(font, xLabelPosition, xLabel, 0.8 * textScale, textColor)
    }

    // Draw Y-axis ticks and labels with equal spacing
    const yTickCount = 5
    const yTickSpacing = plotSize[1] / yTickCount
    const yValueSpacing = (maxY - minY) / yTickCount

    for (let i = 0; i <= yTickCount; i++) {
      const yPos = plotPosition[1] + plotSize[1] - i * yTickSpacing
      const yValue = (minY + i * yValueSpacing).toFixed(2)

      // Draw Y tick
      this.drawLine([plotPosition[0] - 5, yPos, plotPosition[0], yPos], 1, axisColor)

      // Draw Y tick label with left padding for alignment
      this.drawText(font, [plotPosition[0] - 10, yPos], yValue, 0.6 * textScale, textColor)
    }

    // Draw X-axis ticks and labels with limited count for readability
    const xTickCount = Math.min(data.length, 10)
    const xTickSpacing = plotSize[0] / xTickCount

    for (let i = 0; i <= xTickCount; i++) {
      const xPos = plotPosition[0] + i * xTickSpacing
      const xValue = (i * Math.floor(data.length / xTickCount)).toString()

      // Draw X tick
      this.drawLine([xPos, plotPosition[1] + plotSize[1], xPos, plotPosition[1] + plotSize[1] + 5], 1, axisColor)

      // Draw X tick label with downward padding
      this.drawText(font, [xPos, plotPosition[1] + plotSize[1] + 15], xValue, 0.6 * textScale, textColor)
    }
  }

  drawProjectedLineSegment(startXYZ: Vec3, endXYZ: Vec3, thickness = 1, lineColor: Color = [1, 0, 0, 1]): void {
    this.gl.bindVertexArray(UIKRenderer.genericVAO)
    if (!UIKRenderer.projectedLineShader) {
      throw new Error('projectedLineShader undefined')
    }
    console.log('start and end renderer', startXYZ, endXYZ)
    UIKRenderer.projectedLineShader.use(this.gl)

    this.gl.uniform4fv(UIKRenderer.projectedLineShader.uniforms.lineColor, lineColor)
    this.gl.uniform2fv(UIKRenderer.projectedLineShader.uniforms.canvasWidthHeight, [
      this.gl.canvas.width,
      this.gl.canvas.height
    ])
    // draw Line
    this.gl.uniform1f(UIKRenderer.projectedLineShader.uniforms.thickness, thickness)
    this.gl.uniform3fv(UIKRenderer.projectedLineShader.uniforms.startXYZ, startXYZ)
    this.gl.uniform3fv(UIKRenderer.projectedLineShader.uniforms.endXYZ, endXYZ)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    this.gl.bindVertexArray(null) // set vertex attributes
  }

  public drawProjectedLine(
    startXYZ: Vec3,
    endXYZ: Vec3,
    thickness = 1,
    lineColor: Color = [1, 0, 0, 1],
    terminator: LineTerminator = LineTerminator.NONE,
    lineStyle: LineStyle = LineStyle.SOLID,
    dashDotLength = 5
  ): void {
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
        const segmentStart: Vec3 = [segmentStartXY[0], segmentStartXY[1], startZ] // Use startXYZ.z as initial z value

        if (i === segmentCount) {
          if (lineStyle === LineStyle.DASHED) {
            // Final dashed segment to adjusted endpoint
            this.drawProjectedLineSegment(segmentStart, [adjustedEndX, adjustedEndY, endZ], thickness, lineColor)
          } else if (lineStyle === LineStyle.DOTTED) {
            // Final dot at the adjusted endpoint
            this.drawCircle(
              [adjustedEndX - dashDotLength / 2, adjustedEndY - dashDotLength / 2, dashDotLength, dashDotLength],
              lineColor
            )
          }
        } else {
          if (lineStyle === LineStyle.DASHED) {
            const segmentEndXY = vec2.scaleAndAdd(vec2.create(), segmentStartXY, direction, dashDotLength)
            const segmentEnd: Vec3 = [segmentEndXY[0], segmentEndXY[1], startZ] // Use startXYZ.z as z value for segment end as well
            this.drawProjectedLineSegment(segmentStart, segmentEnd, thickness, lineColor)
          } else if (lineStyle === LineStyle.DOTTED) {
            // Draw dot as a small circle
            this.drawCircle(
              [segmentStart[0] - dashDotLength / 2, segmentStart[1] - dashDotLength / 2, dashDotLength, dashDotLength],
              lineColor
            )
          }
        }
      }
    } else {
      // Draw solid line if no dash/dot style specified
      this.drawProjectedLineSegment(startXYZ, [adjustedEndX, adjustedEndY, endZ], thickness, lineColor)
    }

    // Draw terminator if specified
    switch (terminator) {
      case LineTerminator.ARROW: {
        // Calculate triangle points for arrow terminator
        const triangleDirection = vec2.sub(vec2.create(), [endX, endY], [adjustedEndX, adjustedEndY])
        vec2.normalize(triangleDirection, triangleDirection)
        this.drawTriangle(
          [endXYZ[0], endXYZ[1]],
          [endX - (direction[0] * terminatorSize) / 2, endY - (direction[1] * terminatorSize) / 2],
          terminatorSize, // pass size as a number
          lineColor,
          endXYZ[2]
        )
        // Calculate the midpoint for the base of the arrow
        // const baseMidPoint: Vec3 = [
        //   adjustedEndX - (direction[0] * terminatorSize) / 2,
        //   adjustedEndY - (direction[1] * terminatorSize) / 2,
        //   -1 // endZ
        // ]
        // // Use drawProjectedTriangle for the arrow
        // this.drawProjectedTriangle() // [endXYZ[0], endXYZ[1], -1], baseMidPoint, terminatorSize, lineColor)
        break
      }
      case LineTerminator.CIRCLE:
        this.drawCircle(
          [adjustedEndX - terminatorSize / 2, adjustedEndY - terminatorSize / 2, terminatorSize, terminatorSize],
          lineColor
        )
        break
      case LineTerminator.RING:
        this.drawCircle(
          [adjustedEndX - terminatorSize / 2, adjustedEndY - terminatorSize / 2, terminatorSize, terminatorSize],
          lineColor,
          0.5
        )
        break
    }
  }

  //   public drawProjectedTriangle(headPoint: Vec3, baseMidPoint: Vec3, baseLength: number, color: Color): void {
  //     // Calculate direction vector from base midpoint to the head point
  //     const direction = vec3.sub(vec3.create(), headPoint, baseMidPoint)
  //     vec3.normalize(direction, direction)

  //     // Calculate a perpendicular vector for the triangle's base
  //     const perpVector = vec3.cross(vec3.create(), direction, [0, 0, 1])
  //     vec3.normalize(perpVector, perpVector)

  //     // Calculate the left and right base vertices in 3D
  //     const halfBaseLength = baseLength / 2
  //     const leftBasePoint = vec3.scaleAndAdd(vec3.create(), baseMidPoint, perpVector, -halfBaseLength)
  //     const rightBasePoint = vec3.scaleAndAdd(vec3.create(), baseMidPoint, perpVector, halfBaseLength)

  //     // Bind the projected triangle vertex buffer
  //     if (!NVRenderer.projectedTriangleVertexBuffer) {
  //       console.error('Projected triangle vertex buffer is not defined at draw time')
  //       return
  //     }
  //     this.gl.bindBuffer(this.gl.ARRAY_BUFFER, NVRenderer.projectedTriangleVertexBuffer)
  //     console.log('Buffer data:', this.gl.getBufferParameter(this.gl.ARRAY_BUFFER, this.gl.BUFFER_SIZE))

  //     // Update the buffer with triangle vertices (3 vertices with x, y, z)
  //     const vertices = new Float32Array([
  //       headPoint[0],
  //       headPoint[1],
  //       headPoint[2],
  //       leftBasePoint[0],
  //       leftBasePoint[1],
  //       leftBasePoint[2],
  //       rightBasePoint[0],
  //       rightBasePoint[1],
  //       rightBasePoint[2]
  //     ])
  //     this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW)

  //     // Use the triangle shader program
  //     NVRenderer.projectedTriangleShader.use(this.gl)

  //     // Bind the position attribute
  //     const positionLocation = NVRenderer.projectedTriangleShader.uniforms.a_position as GLuint
  //     this.gl.enableVertexAttribArray(positionLocation)
  //     this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0)

  //     // Set the color uniform
  //     this.gl.uniform4fv(NVRenderer.projectedTriangleShader.uniforms.u_color, color as Float32List)

  //     // Enable depth testing for proper layering, but reset after
  //     // this.gl.enable(this.gl.DEPTH_TEST)
  //     // this.gl.depthFunc(this.gl.LEQUAL)

  //     // Draw the triangle
  //     this.gl.drawArrays(this.gl.TRIANGLES, 0, 3)

  //     // Reset bindings and disable vertex attributes to avoid side effects
  //     this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
  //     this.gl.disableVertexAttribArray(positionLocation)
  //   }
}
