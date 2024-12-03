import { mat4, vec2, vec4 } from 'gl-matrix'
import { UIKShader } from './uikshader.js'
import circleVert from './shaders/vert/circle.vert.glsl'
import circleFrag from './shaders/frag/circle.frag.glsl'
import colorbarVert from './shaders/vert/colorbar.vert.glsl'
import colorbarFrag from './shaders/frag/colorbar.frag.glsl'
import ellipseVert from './shaders/vert/elliptical-fill.vert.glsl'
import ellipseFrag from './shaders/frag/elliptical-fill.frag.glsl'
import lineVert from './shaders/vert/line.vert.glsl'
import projectedLineVert from './shaders/vert/projected-line.vert.glsl'
import rectVert from './shaders/vert/rect.vert.glsl'
import solidColorFrag from './shaders/frag/solid-color.frag.glsl'
import roundedRectFrag from './shaders/frag/rounded-rect.frag.glsl'
import triangleVert from './shaders/vert/triangle.vert.glsl'
import triangleFrag from './shaders/frag/triangle.frag.glsl'
import rotatedFontVert from './shaders/vert/rotated-font.vert.glsl'
import rotatedFontFrag from './shaders/frag/rotated-font.frag.glsl'
import { Vec4, Color, LineTerminator, LineStyle, Vec2 } from './types.js'
import { UIKFont } from './assets/uikfont.js'

export class UIKRenderer {
  private gl: WebGL2RenderingContext
  protected static lineShader: UIKShader
  protected static circleShader: UIKShader
  protected static rectShader: UIKShader
  protected static roundedRectShader: UIKShader
  protected static triangleShader: UIKShader
  protected static rotatedFontShader: UIKShader
  protected static colorbarShader: UIKShader
  protected static projectedLineShader: UIKShader
  protected static ellipticalFillShader: UIKShader
  protected static genericVAO: WebGLVertexArrayObject
  protected static triangleVertexBuffer: WebGLBuffer

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    
    if(!UIKRenderer.lineShader) {
      UIKRenderer.lineShader = new UIKShader(gl, lineVert, solidColorFrag)
    }

    if (!UIKRenderer.rectShader) {
      UIKRenderer.rectShader = new UIKShader(gl, rectVert, solidColorFrag)
    }

    if (!UIKRenderer.roundedRectShader) {
      UIKRenderer.roundedRectShader = new UIKShader(gl, rectVert, roundedRectFrag)
    }

    if (!UIKRenderer.circleShader) {
      UIKRenderer.circleShader = new UIKShader(gl, circleVert, circleFrag)
    }

    if (!UIKRenderer.triangleShader) {
      UIKRenderer.triangleShader = new UIKShader(gl, triangleVert, triangleFrag)
    }

    if (!UIKRenderer.rotatedFontShader) {
      UIKRenderer.rotatedFontShader = new UIKShader(gl, rotatedFontVert, rotatedFontFrag)
    }

    if (!UIKRenderer.colorbarShader) {
      UIKRenderer.colorbarShader = new UIKShader(gl, colorbarVert, colorbarFrag)
    }

    if (!UIKRenderer.projectedLineShader) {
      UIKRenderer.projectedLineShader = new UIKShader(gl, projectedLineVert, solidColorFrag)
    }

    if (!UIKRenderer.ellipticalFillShader) {
      UIKRenderer.ellipticalFillShader = new UIKShader(gl, ellipseVert, ellipseFrag)
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

    if (!UIKRenderer.triangleVertexBuffer) {
      // Create a static vertex buffer
      UIKRenderer.triangleVertexBuffer = this.gl.createBuffer() as WebGLBuffer
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, UIKRenderer.triangleVertexBuffer)

      // Allocate space for 3 vertices (triangle), each with 2 components (x, y)
      const initialVertices = new Float32Array(6)
      this.gl.bufferData(this.gl.ARRAY_BUFFER, initialVertices, this.gl.DYNAMIC_DRAW)
      gl.bindVertexArray(null) // Unbind VAO when done
      // Unbind the buffer to prevent accidental modification
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
    }
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
      UIKRenderer.lineShader.use(gl)
      gl.enable(gl.BLEND)
      gl.uniform4fv(UIKRenderer.lineShader.uniforms.lineColor, color as Float32List)
      gl.uniform2fv(UIKRenderer.lineShader.uniforms.canvasWidthHeight, [gl.canvas.width, gl.canvas.height])
      gl.uniform1f(UIKRenderer.lineShader.uniforms.thickness, thickness)
      gl.uniform4fv(UIKRenderer.lineShader.uniforms.startXYendXY, shortenedLine)

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

    UIKRenderer.lineShader.use(gl)
    gl.uniform4fv(UIKRenderer.lineShader.uniforms.lineColor, color as Float32List)
    gl.uniform1f(UIKRenderer.lineShader.uniforms.thickness, thickness)
    gl.uniform4fv(UIKRenderer.lineShader.uniforms.startXYendXY, segmentCoords)

    gl.bindVertexArray(UIKRenderer.genericVAO)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null) // Unbind to avoid side effects
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

    if (!UIKRenderer.rotatedFontShader) {
      throw new Error('rotatedTextShader undefined')
    }

    const rotatedFontShader = UIKRenderer.rotatedFontShader
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


}
