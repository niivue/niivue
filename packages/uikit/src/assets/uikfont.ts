import { vec2 } from 'gl-matrix'
import { UIKShader } from '../uikshader.js'
import vertRotatedFontShader from '../shaders/vert/rotated-font.vert.glsl'
import fragRotatedFontShader from '../shaders/frag/rotated-font.frag.glsl'
import defaultFontPNG from '../fonts/Roboto-Regular.png'
import defaultFontMetrics from '../fonts/Roboto-Regular.json' assert { type: 'json' }
import { UIKAsset } from './uikasset.js'

export type FontMetrics = {
  distanceRange: number
  size: number
  mets: Record<
  string,
    {
      xadv: number
      uv_lbwh: number[]
      lbwh: number[]
    }
  >
}

export class UIKFont extends UIKAsset {
  public fontMetrics: any
  public fontMets: FontMetrics | null = null
  public fontShader: UIKShader | null = null
  public fontColor: number[] | Float32Array
  public outlineColor: number[] | Float32Array
  public outlineThickness: number
  public textHeight: number
  public isFontLoaded = false

  constructor(
    gl: WebGL2RenderingContext,
    fontColor: number[] | Float32Array = [1.0, 0.0, 0.0, 1.0],
    textHeight = 0.06,
    outlineColor: number[] | Float32Array = [0.0, 0.0, 0.0, 1.0],
    outlineThickness: number = 1
  ) {
    super(gl)
    this.fontColor = fontColor
    this.outlineColor = outlineColor
    this.outlineThickness = outlineThickness
    this.textHeight = textHeight
    this.fontShader = new UIKShader(this.gl, vertRotatedFontShader, fragRotatedFontShader)
  }

  public async loadFontTexture(fontUrl: string): Promise<void> {
    await this.loadTexture(fontUrl)
  }

  public async loadFont(fontSheetUrl: string, metricsUrl: string): Promise<void> {
    await this.loadFontTexture(fontSheetUrl)
    const response = await fetch(metricsUrl)
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const jsonText = await response.text()
    this.fontMetrics = JSON.parse(jsonText)
    this.initFontMets()
  }

  public async loadDefaultFont(): Promise<void> {
    await this.loadFontTexture(defaultFontPNG)
    this.fontMetrics = defaultFontMetrics
    this.initFontMets()
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

    const scaleW = this.fontMetrics.atlas.width
    const scaleH = this.fontMetrics.atlas.height

    for (let i = 0; i < this.fontMetrics.glyphs.length; i++) {
      const glyph = this.fontMetrics.glyphs[i]
      const char = String.fromCodePoint(glyph.unicode)

      this.fontMets.mets[char] = {
        xadv: glyph.advance,
        uv_lbwh: [0, 0, 0, 0],
        lbwh: [0, 0, 0, 0]
      }

      if (glyph.planeBounds !== undefined) {
        let l = glyph.atlasBounds.left / scaleW
        let b = (scaleH - glyph.atlasBounds.top) / scaleH
        let w = (glyph.atlasBounds.right - glyph.atlasBounds.left) / scaleW
        let h = (glyph.atlasBounds.top - glyph.atlasBounds.bottom) / scaleH
        this.fontMets.mets[char].uv_lbwh = [l, b, w, h]
        l = glyph.planeBounds.left
        b = glyph.planeBounds.bottom
        w = glyph.planeBounds.right - glyph.planeBounds.left
        h = glyph.planeBounds.top - glyph.planeBounds.bottom
        this.fontMets.mets[char].lbwh = [l, b, w, h]
      }
    }

    this.isFontLoaded = true
  }

  public getTextWidth(str: string, scale: number = 1.0): number {
    if (!str) {
      return 0
    }
    let w = 0
    try {
      for (let i = 0; i < str.length; i++) {
        const char = str[i]
        const glyph = this.fontMets!.mets[char]
        if (glyph) {
          w += scale * glyph.xadv
        }
      }
    } catch (e) {
      console.log(e)
      return 0
    }
    const textWidth = w * this.gl.canvas.height * this.textHeight
    return textWidth
  }

  public getDescenderDepth(str: string, scale: number = 1.0): number {
    if (!str) {
      return 0
    }

    let minBottom = 0
    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      const glyph = this.fontMets!.mets[char]
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
    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      const glyph = this.fontMets!.mets[char]
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

    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      const glyph = this.fontMets!.mets[char]
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

  public getWordWrappedSize(text: string, scale: number = 1.0, maxWidth: number = 0): vec2 {
    let currentWidth = 0
    const maxHeight = this.getTextHeight(text, scale)
    const spaceWidth = this.fontMets!.mets[' '].xadv * scale * this.gl.canvas.height * this.textHeight

    if (maxWidth <= 0) {
      return vec2.fromValues(this.getTextWidth(text, scale), maxHeight)
    }
    let lineCount = 1
    const words = text.split(' ')
    for (const word of words) {
      const wordWidth = this.getTextWidth(word, scale)
      if (currentWidth + wordWidth > maxWidth) {
        lineCount++
        currentWidth = wordWidth + spaceWidth
      } else {
        currentWidth += wordWidth + spaceWidth
      }
    }
    return vec2.fromValues(Math.max(currentWidth, maxWidth), lineCount * maxHeight)
  }

  public toJSON(): object {
    return {
      id: this.id,
      className: 'NVFont',
      fontColor: Array.from(this.fontColor),
      outlineColor: Array.from(this.outlineColor),
      outlineThickness: this.outlineThickness,
      textHeight: this.textHeight,
      fontMetrics: this.fontMetrics
    }
  }

  public static async fromJSON(gl: WebGL2RenderingContext, json: any): Promise<UIKFont> {
    const font = new UIKFont(gl)
    font.id = json.id
    font.fontColor = new Float32Array(json.fontColor)
    font.outlineColor = new Float32Array(json.outlineColor)
    font.outlineThickness = json.outlineThickness
    font.textHeight = json.textHeight
    font.fontMetrics = json.fontMetrics
    font.initFontMets()

    // Decode and load the base64 texture if it exists
    if (json.base64Texture) {
      const textureData = atob(json.base64Texture)
      const textureArray = Uint8Array.from(textureData, (c) => c.charCodeAt(0))
      const blob = new Blob([textureArray], { type: 'image/png' })
      const textureUrl = URL.createObjectURL(blob)

      await font.loadFontTexture(textureUrl)

      // Revoke the URL after loading
      URL.revokeObjectURL(textureUrl)
    }

    return font
  }
}
