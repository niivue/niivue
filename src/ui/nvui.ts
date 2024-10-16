import { Shader } from '../shader.js';
import { fragRectShader, fragStadiumShader, vertLineShader, vertRectShader, vertStadiumShader } from '../shader-srcs.js';
import { NVFont, TEXTURE_FONT } from './nvfont.js';

export class NVUI {
    private gl: WebGL2RenderingContext;
    private lineShader: Shader;
    protected static triangleShader: Shader;
    protected static circleShader: Shader;
    protected static rectShader: Shader;
    protected static genericVAO: WebGLVertexArrayObject;
    protected static stadiumShader: Shader;

    /**
     * Creates an instance of NVDrawer.
     * @param gl - The WebGL2RenderingContext to be used for rendering.
     */
    constructor(gl: WebGL2RenderingContext) {
        // Initialize static shaders and buffers if not already initialized
        this.gl = gl;
        this.lineShader = new Shader(gl, vertLineShader, fragRectShader);

        if (!NVUI.rectShader) {
            NVUI.rectShader = new Shader(gl, vertRectShader, fragRectShader);
        }

        if (!NVUI.stadiumShader) {
            NVUI.stadiumShader = new Shader(gl, vertStadiumShader, fragStadiumShader);
        }

        if (!NVUI.genericVAO) {
            const rectStrip = [
                1, 1, 0, // RAI
                1, 0, 0, // RPI
                0, 1, 0, // LAI
                0, 0, 0  // LPI
            ];

            const vao = gl.createVertexArray()!;
            const vbo = gl.createBuffer()!;

            gl.bindVertexArray(vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rectStrip), gl.STATIC_DRAW);

            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

            NVUI.genericVAO = vao;
        }
    }

    drawChar(font: NVFont, xy: number[], scale: number, char: number): number {
        if (!font.fontShader) {
            throw new Error('fontShader undefined')
        }
        // draw single character, never call directly: ALWAYS call from drawText()
        const metrics = font.fontMets!.mets[char]!
        const l = xy[0] + scale * metrics.lbwh[0]
        const b = -(scale * metrics.lbwh[1])
        const w = scale * metrics.lbwh[2]
        const h = scale * metrics.lbwh[3]
        const t = xy[1] + (b - h) + scale
        this.gl.uniform4f(font.fontShader.uniforms.leftTopWidthHeight, l, t, w, h)
        this.gl.uniform4fv(font.fontShader.uniforms.uvLeftTopWidthHeight!, metrics.uv_lbwh)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        return scale * metrics.xadv
    }


    // not included in public docs
    drawText(font: NVFont, xy: number[], str: string, scale = 1.0, color: Float32List | null = null): void {
        if (!font.isFontLoaded) {
            console.log('font not loaded')
        }

        if (!font.fontShader) {
            throw new Error('fontShader undefined')
        }

        // bind our font texture
        const gl = this.gl
        gl.activeTexture(TEXTURE_FONT);
        gl.bindTexture(gl.TEXTURE_2D, font.getFontTexture());

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
        const bytes = new TextEncoder().encode(str)
        this.gl.bindVertexArray(NVUI.genericVAO)
        for (let i = 0; i < str.length; i++) {
            xy[0] += this.drawChar(font, xy, size, bytes[i])
        }
        this.gl.bindVertexArray(null)
    }


    /**
     * Draws a line.
     * @param startXYendXY - The start and end coordinates of the line.
     * @param thickness - The thickness of the line.
     * @param lineColor - The color of the line.
     */
    drawLine(startXYendXY: number[], thickness = 1, lineColor = [1, 0, 0, -1]): void {
        const gl = this.gl;

        this.lineShader.use(gl);
        gl.enable(gl.BLEND);
        gl.uniform4fv(this.lineShader.uniforms.lineColor, lineColor);
        gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [gl.canvas.width, gl.canvas.height]);
        gl.uniform1f(this.lineShader.uniforms.thickness, thickness);
        gl.uniform4fv(this.lineShader.uniforms.startXYendXY, startXYendXY);

        gl.bindVertexArray(NVUI.genericVAO);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindVertexArray(null); // set vertex attributes
    }

    /**
     * Draws a rectangle.
     * @param leftTopWidthHeight - The bounding box of the rectangle (left, top, width, height).
     * @param lineColor - The color of the rectangle.
     */
    drawRect(leftTopWidthHeight: number[], lineColor = [1, 0, 0, -1]): void {
        if (!NVUI.rectShader) {
            throw new Error('rectShader undefined');
        }
        NVUI.rectShader.use(this.gl);
        this.gl.enable(this.gl.BLEND);
        this.gl.uniform4fv(NVUI.rectShader.uniforms.lineColor, lineColor);
        this.gl.uniform2fv(NVUI.rectShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height]);
        this.gl.uniform4f(
            NVUI.rectShader.uniforms.leftTopWidthHeight,
            leftTopWidthHeight[0],
            leftTopWidthHeight[1],
            leftTopWidthHeight[2],
            leftTopWidthHeight[3]
        );
        this.gl.bindVertexArray(NVUI.genericVAO);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.bindVertexArray(null); // switch off to avoid tampering with settings
    }

    /** 
     * Draws a rounded rectangle.
     * @param leftTopWidthHeight - The bounding box of the rounded rectangle (left, top, width, height).
     * @param roundness - The roundness of the corners.
     * @param fillColor - The fill color of the rectangle.
     * @param outlineColor - The outline color of the rectangle.
     * @param outlineWidth - The width of the outline.
    */
    drawStadium(
        leftTopWidthHeight: number[],
        fillColor: [number, number, number, number],
        outlineColor: [number, number, number, number],
    ): void {
        if (!NVUI.stadiumShader) {
            throw new Error('roundedRectShader undefined');
        }

        const gl = this.gl;

        // Use the rounded rectangle shader program
        NVUI.stadiumShader.use(gl);

        // Enable blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Set the necessary uniforms
        const shader = NVUI.stadiumShader;

        // Set the roundness of the corners
        const radius = 0.02; // Adjust this value as needed for rounded corners
        gl.uniform4fv(NVUI.stadiumShader.uniforms.u_cornerRadii, [radius, radius, radius, radius]);

        // Set the fill color
        const fillColorLocation = gl.getUniformLocation(shader.program, 'u_fillColor');
        gl.uniform4fv(fillColorLocation, fillColor);

        // Set the outline color
        const outlineColorLocation = gl.getUniformLocation(shader.program, 'u_outlineColor');
        gl.uniform4fv(outlineColorLocation, outlineColor);



        // Set the rectangle position and size (using existing uniform from vertex shader)
        const canvasWidthHeightLocation = gl.getUniformLocation(shader.program, 'canvasWidthHeight');
        gl.uniform2fv(canvasWidthHeightLocation, [gl.canvas.width, gl.canvas.height]);

        const leftTopWidthHeightLocation = gl.getUniformLocation(shader.program, 'leftTopWidthHeight');
        gl.uniform4f(
            leftTopWidthHeightLocation,
            leftTopWidthHeight[0],
            leftTopWidthHeight[1],
            leftTopWidthHeight[2],
            leftTopWidthHeight[3]
        );

        // Calculate the NDC width and height based on actual canvas size
        const dpr = window.devicePixelRatio || 1;
        const canvas = gl.canvas as HTMLCanvasElement;
        const canvasWidth = canvas.clientWidth * dpr;
        const canvasHeight = canvas.clientHeight * dpr;

        gl.viewport(0, 0, canvasWidth, canvasHeight);
        // Calculate NDC position of the top-left corner
        const ndcX = (2 * leftTopWidthHeight[0] / canvasWidth) - 1;
        const ndcY = 1 - (2 * leftTopWidthHeight[1] / canvasHeight);

        // Convert width and height to NDC
        const ndcWidth = (2 * leftTopWidthHeight[2]) / canvasWidth;
        const ndcHeight = (2 * leftTopWidthHeight[3]) / canvasHeight;

        // Set uniforms for the shader
        const u_rectPos = [ndcX + ndcWidth / 2, ndcY - ndcHeight / 2]; // Center position in NDC
        const u_rectSize = [ndcWidth / 2, ndcHeight / 2];
        console.log('pos and size', u_rectPos, u_rectSize);
        gl.uniform2f(NVUI.stadiumShader.uniforms.u_rectPos, u_rectPos[0], u_rectPos[1]);

        gl.uniform2f(NVUI.stadiumShader.uniforms.u_rectSize, ndcWidth / 2.04, ndcHeight / 4.9);

        // Set the outline width in NDC units
        const outlineWidthNDC = Math.min(ndcWidth, ndcHeight) * 0.04; // Adjust for visible outline
        gl.uniform1f(NVUI.stadiumShader.uniforms.u_outlineWidth, outlineWidthNDC);



        // Set default outline width (2% of the smallest dimension in NDC)
        const defaultOutlineWidth = 0.03 * Math.min(ndcWidth, ndcHeight);
        gl.uniform1f(NVUI.stadiumShader.uniforms.u_outlineWidth, defaultOutlineWidth);


        // Set canvas resolution
        gl.uniform2f(NVUI.stadiumShader.uniforms.iResolution, canvasWidth, canvasHeight);

        // Set roundness (at least half of height for stadium ends)
        const defaultRoundness = Math.min(ndcWidth / 2, ndcHeight / 2) * 0.5;
        gl.uniform1f(NVUI.stadiumShader.uniforms.u_roundness, defaultRoundness);



        // Bind the VAO that contains the vertex data and attribute pointers
        gl.bindVertexArray(NVUI.genericVAO);

        // Draw the rounded rectangle using TRIANGLE_STRIP (assuming this VAO holds the appropriate vertex data)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Unbind the VAO to avoid accidental modification
        gl.bindVertexArray(null);
    }


}