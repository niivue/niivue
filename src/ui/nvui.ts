import { vec2 } from 'gl-matrix'
import { Shader } from '../shader.js'
import {
  fragCircleShader,
  fragRectShader,
  fragRoundedRectShader,
  vertCircleShader,
  vertLineShader,
  vertRectShader
} from '../shader-srcs.js'
import { TEXTURE3_FONT } from '../niivue/index.js'
import { NVFont } from './nvfont.js'
import { NVBitmap } from './nvbitmap.js'

export class NVUI {
  private gl: WebGL2RenderingContext
  private lineShader: Shader
  protected static triangleShader: Shader
  protected static circleShader: Shader
  protected static rectShader: Shader
  protected static roundedRectShader: Shader
  protected static bitmapShader: Shader
  protected static genericVAO: WebGLVertexArrayObject

  /**
   * Creates an instance of NVUI.
   * @param gl - The WebGL2RenderingContext to be used for rendering.
   */
  constructor(gl: WebGL2RenderingContext) {
    // Initialize static shaders and buffers if not already initialized
    this.gl = gl
    this.lineShader = new Shader(gl, vertLineShader, fragRectShader)

    if (!NVUI.rectShader) {
      NVUI.rectShader = new Shader(gl, vertRectShader, fragRectShader)
    }

    if (!NVUI.roundedRectShader) {
      NVUI.roundedRectShader = new Shader(gl, vertRectShader, fragRoundedRectShader)
    }

    if (!NVUI.circleShader) {
      NVUI.circleShader = new Shader(gl, vertCircleShader, fragCircleShader)
    }

    if (!NVUI.genericVAO) {
      const rectStrip = [
        1,
        1,
        0, // RAI
        1,
        0,
        0, // RPI
        0,
        1,
        0, // LAI
        0,
        0,
        0 // LPI
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
        // TexCoord (u, v)
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

      NVUI.genericVAO = vao
    }
  }

  // Function to support drawing characters, including RTL
  public drawChar(font: NVFont, xy: number[], size: number, char: string): number {
    if (!font.fontShader) {
      throw new Error('fontShader undefined')
    }
    // draw single character, never call directly: ALWAYS call from drawText()
    const metrics = font.fontMets!.mets[char]!
    if (!metrics) {
      return 0
    }
    const l = xy[0] + size * metrics.lbwh[0]
    const b = -(size * metrics.lbwh[1])
    const w = size * metrics.lbwh[2]
    const h = size * metrics.lbwh[3]
    const t = xy[1] + size - h + b
    this.gl.uniform4f(font.fontShader.uniforms.leftTopWidthHeight, l, t, w, h)
    this.gl.uniform4fv(font.fontShader.uniforms.uvLeftTopWidthHeight!, metrics.uv_lbwh)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    return size * metrics.xadv
  }

  // Updated drawText to support RTL strings and word wrapping
  public drawText(
    font: NVFont,
    xy: number[],
    str: string,
    scale = 1.0,
    color: Float32List | null = null,
    maxWidth = 0
  ): void {
    if (!font.isFontLoaded) {
      console.log('font not loaded')
    }

    if (!font.fontShader) {
      throw new Error('fontShader undefined')
    }

    // bind our font texture
    const gl = this.gl
    gl.activeTexture(TEXTURE3_FONT)
    gl.bindTexture(gl.TEXTURE_2D, font.getFontTexture())

    font.fontShader.use(this.gl)
    const size = font.textHeight * Math.min(this.gl.canvas.height, this.gl.canvas.width) * scale
    this.gl.enable(this.gl.BLEND)
    this.gl.uniform2f(font.fontShader.uniforms.canvasWidthHeight, this.gl.canvas.width, this.gl.canvas.height)
    if (color === null) {
      color = font.fontColor
    }
    this.gl.uniform4fv(font.fontShader.uniforms.fontColor, color as Float32List)
    let screenPxRange = (size / font.fontMets!.size) * font.fontMets!.distanceRange
    screenPxRange = Math.max(screenPxRange, 1.0) // screenPxRange() must never be lower than 1
    this.gl.uniform1f(font.fontShader.uniforms.screenPxRange, screenPxRange)
    this.gl.bindVertexArray(NVUI.genericVAO)

    // Calculate word-wrapped size
    const words = str.split(' ')
    let currentX = xy[0]
    let currentY = xy[1]

    for (const word of words) {
      const wordWidth = font.getTextWidth(word, scale)
      if (maxWidth > 0 && currentX + wordWidth > xy[0] + maxWidth) {
        currentY += size
        currentX = xy[0]
      }
      const chars = Array.from(word + ' ')
      for (let i = 0; i < chars.length; i++) {
        currentX += this.drawChar(font, [currentX, currentY], size, chars[i])
      }
    }
    this.gl.bindVertexArray(null)
  }

  public drawBitmap(bitmap: NVBitmap, xy: vec2, scale: number): void {
    if (!bitmap.getBitmapTexture()) {
      console.error('Bitmap texture not loaded')
      return
    }

    const gl = this.gl
    const shader = bitmap.bitmapShader
    shader.use(gl)

    gl.activeTexture(gl.TEXTURE0)
    const texture = bitmap.getBitmapTexture()
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

    // Set the position and size of the bitmap based on xy and scale
    const width = bitmap.getWidth() * scale
    const height = bitmap.getHeight() * scale
    gl.uniform4f(shader.uniforms.leftTopWidthHeight, xy[0], xy[1], width, height)

    // Set the viewport and clear the canvas
    gl.viewport(0, 0, canvasWidth, canvasHeight)

    // Bind the VAO and draw the bitmap
    gl.bindVertexArray(NVUI.genericVAO)
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
   * Draws a line.
   * @param startXYendXY - The start and end coordinates of the line.
   * @param thickness - The thickness of the line.
   * @param lineColor - The color of the line.
   */
  drawLine(startXYendXY: number[], thickness = 1, lineColor = [1, 0, 0, -1]): void {
    const gl = this.gl

    this.lineShader.use(gl)
    gl.enable(gl.BLEND)
    gl.uniform4fv(this.lineShader.uniforms.lineColor, lineColor)
    gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [gl.canvas.width, gl.canvas.height])
    gl.uniform1f(this.lineShader.uniforms.thickness, thickness)
    gl.uniform4fv(this.lineShader.uniforms.startXYendXY, startXYendXY)

    gl.bindVertexArray(NVUI.genericVAO)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null) // set vertex attributes
  }

  /**
   * Draws a rectangle.
   * @param leftTopWidthHeight - The bounding box of the rectangle (left, top, width, height).
   * @param lineColor - The color of the rectangle.
   */
  drawRect(leftTopWidthHeight: number[], lineColor: Float32List = [1, 0, 0, -1]): void {
    this.drawRoundedRect(leftTopWidthHeight, lineColor, [0, 0, 0, 0], 0, 0)
  }

  /**
   * Draws a rounded rectangle.
   * @param leftTopWidthHeight - The bounding box of the rounded rectangle (left, top, width, height).
   * @param fillColor - The fill color of the rectangle.
   * @param outlineColor - The outline color of the rectangle.
   */
  drawRoundedRect(
    leftTopWidthHeight: number[],
    fillColor: Float32List,
    outlineColor: Float32List,
    cornerRadius: number = -1,
    thickness: number = 10
  ): void {
    if (!NVUI.roundedRectShader) {
      throw new Error('roundedRectShader undefined')
    }

    const gl = this.gl

    // Use the rounded rectangle shader program
    NVUI.roundedRectShader.use(gl)

    // Enable blending for transparency
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // Set the necessary uniforms
    const shader = NVUI.roundedRectShader
    if (cornerRadius === -1) {
      cornerRadius = thickness * 2
    }

    this.gl.enable(this.gl.BLEND)
    // set thickness of line
    this.gl.uniform1f(shader.uniforms.thickness, thickness)
    this.gl.uniform1f(shader.uniforms.cornerRadius, cornerRadius)
    this.gl.uniform4fv(shader.uniforms.borderColor, outlineColor)
    this.gl.uniform4fv(shader.uniforms.fillColor, fillColor)
    this.gl.uniform2fv(shader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
    this.gl.uniform4fv(shader.uniforms.leftTopWidthHeight, leftTopWidthHeight)
    this.gl.bindVertexArray(NVUI.genericVAO)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    this.gl.bindVertexArray(null)
    // Bind the VAO that contains the vertex data and attribute pointers
    gl.bindVertexArray(NVUI.genericVAO)

    // Draw the rounded rectangle using TRIANGLE_STRIP (assuming this VAO holds the appropriate vertex data)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    // Unbind the VAO to avoid accidental modification
    gl.bindVertexArray(null)
  }

  drawTextBoxCenteredOn(
    font: NVFont,
    xy: number[],
    str: string,
    textColor: Float32List | null = null,
    outlineColor: Float32List | null = [1.0, 1.0, 1.0, 1.0],
    fillColor: Float32List = [0.0, 0.0, 0.0, 0.3],
    margin: number = 15,
    roundness: number = 0.0,
    scale = 1.0,
    maxWidth = 0
  ): void {
    const textWidth = font.getTextWidth(str, scale)
    const textHeight = font.getTextHeight(str, scale)
    const padding = textHeight > textWidth ? textHeight - textWidth : 0
    const rectWidth = textWidth + 2 * margin * scale + textHeight + padding
    const rectHeight = font.getTextHeight(str, scale) + 4 * margin * scale // Height of the rectangle enclosing the text
    const centeredPos = [xy[0] - rectWidth / 2, xy[1] - rectHeight / 2]

    this.drawTextBox(font, centeredPos, str, textColor, outlineColor, fillColor, margin, roundness, scale, maxWidth)
  }

  // Updated drawTextBox method to support maxWidth and word wrapping
  drawTextBox(
    font: NVFont,
    xy: number[],
    str: string,
    textColor: Float32List | null = [0, 0, 0, 1.0],
    outlineColor: Float32List | null = [1.0, 1.0, 1.0, 1.0],
    fillColor: Float32List = [0.0, 0.0, 0.0, 0.3],
    margin: number = 15,
    roundness: number = 0.0,
    scale = 1.0,
    maxWidth = 0
  ): void {
    const textHeight = font.getTextHeight(str, scale)
    const wrappedSize = font.getWordWrappedSize(str, scale, maxWidth)
    const rectWidth = wrappedSize[0] + 2 * margin * scale + textHeight
    const rectHeight = wrappedSize[1] + 4 * margin * scale // Height of the rectangle enclosing the text

    const leftTopWidthHeight = [xy[0], xy[1], rectWidth, rectHeight]
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
    ]

    // Render the text
    this.drawText(font, textPosition, str, scale, textColor, maxWidth)
  }

  drawCalendar(
    font: NVFont,
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

  /**
   * Draws a circle.
   * @param leftTopWidthHeight - The bounding box of the circle (left, top, width, height).
   * @param circleColor - The color of the circle.
   * @param fillPercent - The percentage of the circle to fill (0 to 1).
   */
  drawCircle(leftTopWidthHeight: number[], circleColor: Float32List = [1, 1, 1, 1], fillPercent = 1.0): void {
    if (!NVUI.circleShader) {
      throw new Error('circleShader undefined')
    }
    NVUI.circleShader.use(this.gl)
    this.gl.enable(this.gl.BLEND)
    this.gl.uniform4fv(NVUI.circleShader.uniforms.circleColor, circleColor)
    this.gl.uniform2fv(NVUI.circleShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
    this.gl.uniform4f(
      NVUI.circleShader.uniforms.leftTopWidthHeight,
      leftTopWidthHeight[0],
      leftTopWidthHeight[1],
      leftTopWidthHeight[2],
      leftTopWidthHeight[3]
    )
    this.gl.uniform1f(NVUI.circleShader.uniforms.fillPercent, fillPercent)
    this.gl.bindVertexArray(NVUI.genericVAO)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    this.gl.bindVertexArray(null) // switch off to avoid tampering with settings
  }

  /**
   * Draws an Apple-style settings toggle.
   * @param x - The x-coordinate of the top-left corner of the toggle.
   * @param y - The y-coordinate of the top-left corner of the toggle.
   * @param width - The width of the toggle.
   * @param height - The height of the toggle.
   * @param isOn - Whether the toggle is on or off.
   * @param onColor - The color when the toggle is on.
   * @param offColor - The color when the toggle is off.
   */
  drawToggle(
    x: number,
    y: number,
    width: number,
    height: number,
    isOn: boolean,
    onColor: Float32List,
    offColor: Float32List
  ): void {
    const cornerRadius = height / 2

    // Draw the rounded rectangle background
    const fillColor = isOn ? onColor : offColor
    this.drawRoundedRect([x, y, width, height], fillColor, [0.2, 0.2, 0.2, 1.0], cornerRadius, 2.0)

    // Calculate the circle (toggle knob) position
    const knobSize = height * 0.8
    const knobX = isOn ? x + width - knobSize - (height - knobSize) / 2 : x + (height - knobSize) / 2
    const knobY = y + (height - knobSize) / 2

    // Draw the toggle knob as a circle
    this.drawCircle([knobX, knobY, knobSize, knobSize], [1.0, 1.0, 1.0, 1.0])
  }
}
