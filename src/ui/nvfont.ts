import { Shader } from "../shader.js"
import { fragFontShader, vertFontShader } from "../shader-srcs.js"
import defaultFontPNG from '../fonts/Roboto-Regular.png'
import defaultFontMetrics from '../fonts/Roboto-Regular.json'
import { FontMetrics } from "../niivue/index.js"

export const TEXTURE_FONT = 33987

export class NVFont {
    private gl: WebGL2RenderingContext
    private fontTexture: WebGLTexture | null = null
    public fontMetrics: any
    public fontMets: FontMetrics | null //{ distanceRange: number, size: number, mets: { [id: number]: GlyphMetrics } }
    public fontShader: Shader | null = null
    private DEFAULT_FONT_GLYPH_SHEET: string = defaultFontPNG
    private DEFAULT_FONT_METRICS: any = defaultFontMetrics
    private cuboidVertexBuffer?: WebGLBuffer
    private genericVAO: WebGLVertexArrayObject | null = null // used for 2D slices, 2D lines, 2D Fonts
    private unusedVAO = null
    public isFontLoaded = false
    public fontColor: number[] | Float32Array
    public textHeight: number

    constructor(
        gl: WebGL2RenderingContext,
        fontColor: number[] | Float32Array = [1.0, 0.0, 0.0, 1.0],
        textHeight = 0.06,

    ) {
        this.gl = gl
        this.fontColor = fontColor
        this.textHeight = textHeight

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

        this.cuboidVertexBuffer = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cuboidVertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rectStrip), gl.STATIC_DRAW)
        this.genericVAO = gl.createVertexArray()! // 2D slices, fonts, lines
        gl.bindVertexArray(this.genericVAO)
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cuboidVertexBuffer); //triangle strip does not need indices
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cuboidVertexBuffer)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
        gl.bindVertexArray(this.unusedVAO) // switch off to avoid tampering with settings

        this.fontShader = new Shader(this.gl, vertFontShader, fragFontShader)

    }

    private requestCORSIfNotSameOrigin(img: HTMLImageElement, url: string): void {
        if (new URL(url, window.location.href).origin !== window.location.origin) {
            img.crossOrigin = ''
        }
    }

    public getFontTexture(): WebGLTexture | null {
        return this.fontTexture
    }

    public async loadFontTexture(fontUrl: string): Promise<WebGLTexture | null> {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = (): void => {
                let pngTexture: WebGLTexture | null = null

                this.fontShader!.use(this.gl)
                this.gl.activeTexture(TEXTURE_FONT)
                this.gl.uniform1i(this.fontShader!.uniforms.fontTexture, 3)
                if (this.fontTexture !== null) {
                    this.gl.deleteTexture(this.fontTexture)
                }
                this.fontTexture = this.gl.createTexture()
                pngTexture = this.fontTexture
                this.gl.bindTexture(this.gl.TEXTURE_2D, pngTexture)
                // Set the parameters so we can render any size image.
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
                // Upload the image into the texture.
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img)
                resolve(pngTexture)
            }
            img.onerror = reject
            this.requestCORSIfNotSameOrigin(img, fontUrl)
            img.src = fontUrl
        })
    }

    private initFontMets(): void {
        if (!this.fontMetrics) {
            throw new Error('fontMetrics undefined')
        }

        this.fontMets = {
            distanceRange: this.fontMetrics.atlas.distanceRange,
            size: this.fontMetrics.atlas.size,
            mets: {}
        }
        for (let id = 0; id < 256; id++) {
            // clear ASCII codes 0..256
            this.fontMets.mets[id] = {
                xadv: 0,
                uv_lbwh: [0, 0, 0, 0],
                lbwh: [0, 0, 0, 0]
            }
        }
        const scaleW = this.fontMetrics.atlas.width
        const scaleH = this.fontMetrics.atlas.height
        for (let i = 0; i < this.fontMetrics.glyphs.length; i++) {
            const glyph = this.fontMetrics.glyphs[i]
            const id = glyph.unicode
            this.fontMets.mets[id].xadv = glyph.advance
            if (glyph.planeBounds === undefined) {
                continue
            }
            let l = glyph.atlasBounds.left / scaleW
            let b = (scaleH - glyph.atlasBounds.top) / scaleH
            let w = (glyph.atlasBounds.right - glyph.atlasBounds.left) / scaleW
            let h = (glyph.atlasBounds.top - glyph.atlasBounds.bottom) / scaleH
            this.fontMets.mets[id].uv_lbwh = [l, b, w, h]
            l = glyph.planeBounds.left
            b = glyph.planeBounds.bottom
            w = glyph.planeBounds.right - glyph.planeBounds.left
            h = glyph.planeBounds.top - glyph.planeBounds.bottom
            this.fontMets.mets[id].lbwh = [l, b, w, h]
        }

        console.log('font loaded')
        this.isFontLoaded = true
    }

    public async loadFont(fontSheetUrl: string, metricsUrl: string): Promise<void> {
        this.fontTexture = await this.loadFontTexture(fontSheetUrl)
        const response = await fetch(metricsUrl)
        if (!response.ok) {
            throw new Error(response.statusText)
        }
        const jsonText = await response.text()
        this.fontMetrics = JSON.parse(jsonText)
        this.initFontMets()
    }

    public async loadDefaultFont(): Promise<void> {
        await this.loadFontTexture(this.DEFAULT_FONT_GLYPH_SHEET)
        this.fontMetrics = this.DEFAULT_FONT_METRICS
        this.initFontMets()
    }

    // Newly added functions

    public getTextWidth(str: string, scale: number = 1.0): number {
        if (!str) {
            return 0
        }
        let w = 0
        const bytes = new TextEncoder().encode(str)
        for (let i = 0; i < str.length; i++) {
            w += scale * this.fontMets.mets[bytes[i]].xadv
        }
        const textWidth = w * this.gl.canvas.height * this.textHeight
        return textWidth
    }

    public getDescenderDepth(str: string, scale: number = 1.0): number {
        if (!str) {
            return 0
        }

        let minBottom = 0
        const bytes = new TextEncoder().encode(str)

        for (let i = 0; i < bytes.length; i++) {
            const glyph = this.fontMets!.mets[bytes[i]]
            if (glyph) {
                const bottom = glyph.lbwh[1]
                minBottom = Math.min(minBottom, bottom)
            }
        }

        return scale * minBottom * this.gl.canvas.height * this.textHeight
    }

    public getAscenderHeight(str: string, scale: number = 1.0): number {
        if (!str) {
            return 0
        }

        let maxTop = 0
        const bytes = new TextEncoder().encode(str)

        for (let i = 0; i < bytes.length; i++) {
            const glyph = this.fontMets!.mets[bytes[i]]
            if (glyph) {
                const top = glyph.lbwh[1] + glyph.lbwh[3]
                maxTop = Math.max(maxTop, top)
            }
        }

        return scale * maxTop * this.gl.canvas.height * this.textHeight
    }

    public getTextHeight(str: string, scale: number = 1.0): number {
        if (!str) {
            return 0
        }

        let minBottom = Infinity
        let maxTop = -Infinity

        const bytes = new TextEncoder().encode(str)
        for (let i = 0; i < bytes.length; i++) {
            const glyph = this.fontMets.mets[bytes[i]]
            if (glyph) {
                const bottom = glyph.lbwh[1]
                const top = glyph.lbwh[1] + glyph.lbwh[3]
                minBottom = Math.min(minBottom, bottom)
                maxTop = Math.max(maxTop, top)
            }
        }

        const height = maxTop - minBottom

        return scale * height * this.gl.canvas.height * this.textHeight
    }

    public getTextBounds(scale: number, str: string): number[] {
        const width = this.getTextWidth(str, scale)
        const height = this.getTextHeight(str, scale)
        return [0, 0, width, height]
    }



}
