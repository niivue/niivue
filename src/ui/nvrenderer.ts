// nvrenderer.ts
import { mat4, vec2, vec4 } from 'gl-matrix'
import { Shader } from '../shader.js'
import {
    fragCircleShader,
    fragRectShader,
    fragRotatedFontShader,
    fragRoundedRectShader,
    fragTriangleShader,
    vertCircleShader,
    vertLineShader,
    vertRectShader,
    vertRotatedFontShader,
    vertTriangleShader
} from '../shader-srcs.js'
import { TEXTURE3_FONT } from '../niivue/index.js'
import { NVFont } from './nvfont.js'
import { NVBitmap } from './nvbitmap.js'
import { LineTerminator, Color, Vec2, Vec4 } from './types.js'

// NVRenderer class with rendering methods
export class NVRenderer {
    private gl: WebGL2RenderingContext
    private lineShader: Shader
    protected static triangleShader: Shader
    protected static circleShader: Shader
    protected static rectShader: Shader
    protected static roundedRectShader: Shader
    protected static bitmapShader: Shader
    protected static genericVAO: WebGLVertexArrayObject
    protected static triangleVertexBuffer: WebGLBuffer
    protected static lineTerminator = LineTerminator
    protected static rotatedTextShader: Shader

    /**
     * Creates an instance of NVRenderer.
     * @param gl - The WebGL2RenderingContext to be used for rendering.
     */
    constructor(gl: WebGL2RenderingContext) {
        // Initialize shaders and buffers if not already initialized
        this.gl = gl
        this.lineShader = new Shader(gl, vertLineShader, fragRectShader)

        if (!NVRenderer.rectShader) {
            NVRenderer.rectShader = new Shader(gl, vertRectShader, fragRectShader)
        }

        if (!NVRenderer.roundedRectShader) {
            NVRenderer.roundedRectShader = new Shader(gl, vertRectShader, fragRoundedRectShader)
        }

        if (!NVRenderer.circleShader) {
            NVRenderer.circleShader = new Shader(gl, vertCircleShader, fragCircleShader)
        }

        if (!NVRenderer.triangleShader) {
            NVRenderer.triangleShader = new Shader(gl, vertTriangleShader, fragTriangleShader)
        }

        if (!NVRenderer.rotatedTextShader) {
            NVRenderer.rotatedTextShader = new Shader(gl, vertRotatedFontShader, fragRotatedFontShader)
        }

        if (!NVRenderer.genericVAO) {
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

            const texCoordData = [
                1.0, 1.0, // Top-right
                1.0, 0.0, // Bottom-right
                0.0, 1.0, // Top-left
                0.0, 0.0  // Bottom-left
            ]

            const texCoordBuffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoordData), gl.STATIC_DRAW)

            // Assign a_texcoord (location = 1)
            gl.enableVertexAttribArray(1)
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)

            gl.bindVertexArray(null) // Unbind VAO when done

            NVRenderer.genericVAO = vao
        }

        if (!NVRenderer.triangleVertexBuffer) {
            // Create a static vertex buffer
            NVRenderer.triangleVertexBuffer = this.gl.createBuffer() as WebGLBuffer
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, NVRenderer.triangleVertexBuffer)

            // Allocate space for 3 vertices (triangle), each with 2 components (x, y)
            const initialVertices = new Float32Array(6)
            this.gl.bufferData(this.gl.ARRAY_BUFFER, initialVertices, this.gl.DYNAMIC_DRAW)
        }
    }

    // Function to support drawing characters, including RTL
    public drawChar(font: NVFont, position: Vec2, size: number, char: string): number {
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
        font: NVFont,
        position: Vec2,
        str: string,
        scale = 1.0,
        color: Color = [1.0, 0.0, 0.0, 1.0],
        maxWidth = 0
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
        screenPxRange = Math.max(screenPxRange, 1.0) // screenPxRange must never be lower than 1
        this.gl.uniform1f(font.fontShader.uniforms.screenPxRange, screenPxRange)
        this.gl.bindVertexArray(NVRenderer.genericVAO)

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

    public drawBitmap(bitmap: NVBitmap, position: Vec2, scale: number): void {
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

        // Set the position and size of the bitmap based on position and scale
        const pos = Array.isArray(position) ? vec2.fromValues(position[0], position[1]) : position
        const width = bitmap.getWidth() * scale
        const height = bitmap.getHeight() * scale
        gl.uniform4f(shader.uniforms.leftTopWidthHeight, pos[0], pos[1], width, height)

        // Set the viewport
        gl.viewport(0, 0, canvasWidth, canvasHeight)

        // Bind the VAO and draw the bitmap
        gl.bindVertexArray(NVRenderer.genericVAO)
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
     * @param startEnd - The start and end coordinates of the line ([startX, startY, endX, endY]).
     * @param thickness - The thickness of the line.
     * @param lineColor - The color of the line.
     */
    public drawLine(
        startEnd: Vec4,
        thickness = 1,
        lineColor: Color = [1, 0, 0, -1],
        terminator: LineTerminator = LineTerminator.NONE
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

        const terminatorSize = thickness * 3  // Example terminator size based on thickness

        // Adjust line length to fit terminator bounds
        switch (terminator) {
            case LineTerminator.ARROW:
            case LineTerminator.CIRCLE:
            case LineTerminator.RING:
                endX -= direction[0] * terminatorSize / 2
                endY -= direction[1] * terminatorSize / 2
                break
        }

        // Set the adjusted endpoint
        const shortenedLine = vec4.fromValues(startX, startY, endX, endY)
        this.lineShader.use(gl)
        gl.enable(gl.BLEND)
        gl.uniform4fv(this.lineShader.uniforms.lineColor, lineColor as Float32List)
        gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [gl.canvas.width, gl.canvas.height])
        gl.uniform1f(this.lineShader.uniforms.thickness, thickness)
        gl.uniform4fv(this.lineShader.uniforms.startXYendXY, shortenedLine)

        gl.bindVertexArray(NVRenderer.genericVAO)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        gl.bindVertexArray(null) // Unbind to avoid side effects

        // Draw the terminator
        switch (terminator) {
            case LineTerminator.ARROW:
                this.drawTriangle(
                    [startEnd[2], startEnd[3]],
                    [endX - direction[0] * terminatorSize / 2, endY - direction[1] * terminatorSize / 2],
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
        const [startX, startY, endX, endY] = startEnd;

        // Calculate the midpoint for the elbow
        const midX = horizontalFirst ? startX + (endX - startX) / 2 : startX;
        const midY = horizontalFirst ? startY : startY + (endY - startY) / 2;

        // Draw the first segment (either horizontal or vertical)
        const firstSegment: Vec4 = horizontalFirst
            ? [startX, startY, midX, startY]
            : [startX, startY, startX, midY];
        this.drawLine(firstSegment, thickness, lineColor);

        // Draw the second segment (the other direction)
        const secondSegment: Vec4 = horizontalFirst
            ? [midX, startY, endX, endY]
            : [startX, midY, endX, endY];
        this.drawLine(secondSegment, thickness, lineColor, terminator);
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
        if (!NVRenderer.roundedRectShader) {
            throw new Error('roundedRectShader undefined')
        }

        const gl = this.gl

        // Use the rounded rectangle shader program
        NVRenderer.roundedRectShader.use(gl)

        // Enable blending for transparency
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        // Set the necessary uniforms
        const shader = NVRenderer.roundedRectShader
        if (cornerRadius === -1) {
            cornerRadius = thickness * 2
        }

        const rectParams = Array.isArray(leftTopWidthHeight)
            ? vec4.fromValues(
                leftTopWidthHeight[0],
                leftTopWidthHeight[1],
                leftTopWidthHeight[2],
                leftTopWidthHeight[3]
            )
            : leftTopWidthHeight

        this.gl.uniform1f(shader.uniforms.thickness, thickness)
        this.gl.uniform1f(shader.uniforms.cornerRadius, cornerRadius)
        this.gl.uniform4fv(shader.uniforms.borderColor, outlineColor as Float32List)
        this.gl.uniform4fv(shader.uniforms.fillColor, fillColor as Float32List)
        this.gl.uniform2fv(shader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
        this.gl.uniform4fv(shader.uniforms.leftTopWidthHeight, rectParams as Float32List)
        this.gl.bindVertexArray(NVRenderer.genericVAO)
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
        fillPercent = 1.0
    ): void {
        if (!NVRenderer.circleShader) {
            throw new Error('circleShader undefined')
        }
        NVRenderer.circleShader.use(this.gl)
        this.gl.enable(this.gl.BLEND)
        this.gl.uniform4fv(NVRenderer.circleShader.uniforms.circleColor, circleColor as Float32List)
        this.gl.uniform2fv(NVRenderer.circleShader.uniforms.canvasWidthHeight, [
            this.gl.canvas.width,
            this.gl.canvas.height
        ])

        const rectParams = Array.isArray(leftTopWidthHeight)
            ? vec4.fromValues(
                leftTopWidthHeight[0],
                leftTopWidthHeight[1],
                leftTopWidthHeight[2],
                leftTopWidthHeight[3]
            )
            : leftTopWidthHeight

        this.gl.uniform4fv(
            NVRenderer.circleShader.uniforms.leftTopWidthHeight,
            rectParams as Float32List
        )
        this.gl.uniform1f(NVRenderer.circleShader.uniforms.fillPercent, fillPercent)
        this.gl.bindVertexArray(NVRenderer.genericVAO)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        this.gl.bindVertexArray(null) // Unbind to avoid side effects
    }

    /**
     * Draws a toggle switch.
     * @param position - The position of the top-left corner of the toggle.
     * @param size - The size of the toggle ([width, height]).
     * @param isOn - Whether the toggle is on or off.
     * @param onColor - The color when the toggle is on.
     * @param offColor - The color when the toggle is off.
     */
    // In nvrenderer.ts

    public drawToggle(
        position: Vec2,
        size: Vec2,
        isOn: boolean,
        onColor: Color,
        offColor: Color
    ): void {
        const cornerRadius = size[1] / 2 // Height is used for radius

        // Ensure the colors are Float32Array
        const fillColor = isOn ? new Float32Array(onColor) : new Float32Array(offColor)

        // Draw the background rounded rectangle
        this.drawRoundedRect(
            [position[0], position[1], size[0], size[1]],
            fillColor,
            [0.2, 0.2, 0.2, 1.0], // Outline color
            cornerRadius,
            2.0 // Outline thickness
        )

        // Calculate the circle (toggle knob) position
        const knobSize = size[1] * 0.8
        const knobX = isOn
            ? position[0] + size[0] - knobSize - (size[1] - knobSize) / 2
            : position[0] + (size[1] - knobSize) / 2
        const knobY = position[1] + (size[1] - knobSize) / 2

        // Draw the toggle knob as a circle
        this.drawCircle([knobX, knobY, knobSize, knobSize], new Float32Array([1.0, 1.0, 1.0, 1.0]))
    }


    public drawTriangle(
        headPoint: Vec2,
        baseMidPoint: Vec2,
        baseLength: number,
        color: Color
    ): void {
        const canvas = this.gl.canvas as HTMLCanvasElement

        // Convert screen points to WebGL coordinates
        const hp = Array.isArray(headPoint) ? headPoint : [headPoint[0], headPoint[1]]
        const bmp = Array.isArray(baseMidPoint) ? baseMidPoint : [baseMidPoint[0], baseMidPoint[1]]
        const webglHeadX = (hp[0] / canvas.width) * 2 - 1
        const webglHeadY = 1 - (hp[1] / canvas.height) * 2
        const webglBaseMidX = (bmp[0] / canvas.width) * 2 - 1
        const webglBaseMidY = 1 - (bmp[1] / canvas.height) * 2

        // Ensure the vertex buffer is defined
        if (!NVRenderer.triangleVertexBuffer) {
            console.error('Vertex buffer is not defined at draw time')
            return
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, NVRenderer.triangleVertexBuffer)

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
            webglHeadX, webglHeadY,    // Head of the triangle
            leftBaseX, leftBaseY,      // Left base vertex
            rightBaseX, rightBaseY     // Right base vertex
        ])

        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, vertices)

        // Use the shader program
        NVRenderer.triangleShader.use(this.gl)

        // Bind the position attribute
        const positionLocation = NVRenderer.triangleShader.uniforms.a_position as GLuint
        this.gl.enableVertexAttribArray(positionLocation)
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

        // Set u_antialiasing in pixels and canvas size in pixels
        this.gl.uniform1f(NVRenderer.triangleShader.uniforms.u_antialiasing, baseLength * 0.01) // Example proportion
        this.gl.uniform2f(NVRenderer.triangleShader.uniforms.u_canvasSize, canvas.width, canvas.height)

        // Set the color uniform
        this.gl.uniform4fv(NVRenderer.triangleShader.uniforms.u_color, color as Float32List)

        // Draw the triangle
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3)
        this.gl.bindVertexArray(null)
    }


    // Function to draw rotated text, supporting individual character drawing including RTL
    public drawRotatedText(
        font: NVFont,
        xy: Vec2,
        str: string,
        scale = 1.0,
        color: Color = [1.0, 0.0, 0.0, 1.0],
        rotation = 0.0 // Rotation in radians
    ): void {
        if (!font.isFontLoaded) {
            console.error('font not loaded')
            return
        }

        if (!NVRenderer.rotatedTextShader) {
            throw new Error('rotatedTextShader undefined')
        }

        const rotatedFontShader = NVRenderer.rotatedTextShader
        const gl = this.gl

        // Bind the font texture
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, font.getFontTexture())

        rotatedFontShader.use(gl)

        // Enable blending for text rendering
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.disable(gl.DEPTH_TEST); // TODO: remove
        gl.disable(gl.CULL_FACE);

        // Set uniform values
        if (color === null) {
            color = font.fontColor
        }
        gl.uniform4fv(rotatedFontShader.uniforms.fontColor, color as Float32List)
        let screenPxRange = (scale / font.fontMets!.size) * font.fontMets!.distanceRange
        screenPxRange = Math.max(screenPxRange, 1.0) // screenPxRange must never be lower than 1
        gl.uniform1f(rotatedFontShader.uniforms.screenPxRange, screenPxRange)
        gl.uniform1i(rotatedFontShader.uniforms.fontTexture, 0)

        // Bind VAO for generic rectangle
        gl.bindVertexArray(NVRenderer.genericVAO)

        // Set up orthographic projection matrix
        const orthoMatrix = mat4.create();
        // mat4.ortho(orthoMatrix, 0, gl.canvas.width, 0, gl.canvas.height, -1, 1); // Swap top and bottom
        mat4.ortho(orthoMatrix, 0, gl.canvas.width, gl.canvas.height, 0, -1, 1)
        const dpr = window.devicePixelRatio || 1;
        gl.canvas.width = (gl.canvas as HTMLCanvasElement).clientWidth * dpr;
        gl.canvas.height = (gl.canvas as HTMLCanvasElement).clientHeight * dpr;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
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

            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, [x + Math.sin(rotation) * metrics.lbwh[1] * size, y - Math.cos(rotation) * metrics.lbwh[1] * size, 0.0])
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
            const advanceX = Math.cos(rotation) * metrics.xadv * size;
            const advanceY = Math.sin(rotation) * metrics.xadv * size;
            x += advanceX;
            y += advanceY;
        }

        // Unbind the VAO
        gl.bindVertexArray(null)
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

    drawTextBox(
        font: NVFont,
        xy: Vec2,
        str: string,
        textColor: Color = [0, 0, 0, 1.0],
        outlineColor: Color = [1.0, 1.0, 1.0, 1.0],
        fillColor: Color = [0.0, 0.0, 0.0, 0.3],
        margin: number = 15,
        roundness: number = 0.0,
        scale = 1.0,
        maxWidth = 0
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
        this.drawText(font, textPosition, str, scale, textColor, maxWidth)
    }

    public drawCaliper(pointA: Vec2, pointB: Vec2, text: string, font: NVFont, textColor: Color = [1, 0, 0, 1], lineColor: Color = [0, 0, 0, 1], lineThickness: number = 1, offset: number = 40): void {
        // Calculate the angle between the points
        const deltaX = pointB[0] - pointA[0]
        const deltaY = pointB[1] - pointA[1]
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        let angle = Math.atan2(deltaY, deltaX)
        console.log('rotation ' + angle * 180 / Math.PI + ' degrees')

        const isAngleAdjusted = (angle < -Math.PI / 2 && angle > -Math.PI)

        // Ensure text is not upside down


        // Calculate the midpoint
        const midPoint: Vec2 = [(pointA[0] + pointB[0]) / 2, (pointA[1] + pointB[1]) / 2]

        // Adjust the text position to ensure it's centered above the parallel line
        const textWidth = font.getTextWidth(text, 1.0)
        const textHeight = font.getTextHeight(text, 1.0)
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
                midPoint[0] - (textWidth / 2) * Math.cos(angle) - (textHeight / 2 + offset) * Math.sin(angle) - offset * Math.sin(angle),
                midPoint[1] - (textWidth / 2) * Math.sin(angle) + (textHeight / 2 + offset) * Math.cos(angle) + offset * Math.cos(angle)
            ]
        }

        // Draw the rotated text at the adjusted position
        this.drawRotatedText(font, textPosition, text, 1.0, textColor, angle)

        // Draw a parallel line of equal length to the original line
        const parallelPointA: Vec2 = [
            pointA[0] + offset * deltaY / length,
            pointA[1] - offset * deltaX / length
        ]
        const parallelPointB: Vec2 = [
            pointB[0] + offset * deltaY / length,
            pointB[1] - offset * deltaX / length
        ]
        this.drawLine([parallelPointA[0], parallelPointA[1], parallelPointB[0], parallelPointB[1]], lineThickness, lineColor)

        // Draw lines terminating in arrows from the ends of the parallel line to points A and B
        this.drawLine([parallelPointA[0], parallelPointA[1], pointA[0], pointA[1]], lineThickness, lineColor, LineTerminator.ARROW)
        this.drawLine([parallelPointB[0], parallelPointB[1], pointB[0], pointB[1]], lineThickness, lineColor, LineTerminator.ARROW)
    }


}
