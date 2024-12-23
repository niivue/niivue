import { UIKShader } from '../uikshader'
import vertFontShader from '../shaders/font.vert.glsl'
import fragFontShader from '../shaders/font.frag.glsl'
import defaultFontPNG from '../fonts/Roboto-Regular.png'
import defaultFontMetrics from '../fonts/Roboto-Regular.json' assert { type: 'json' }
import { UIKAsset } from './uikasset'
import { Color } from '../types'

export type FontMetrics = {
  distanceRange: number
  size: number
  ascender: number
  descender: number
  underlineY: number
  underlineThickness: number
  lineHeight: number
  mets: Record<
    string,
    {
      xadv: number
      uv_lbwh: number[]
      lbwh: number[]
    }
  >
}

export interface FontAtlas {
  type: string
  distanceRange: number
  distanceRangeMiddle?: number
  size: number
  width: number
  height: number
  yOrigin: string
}

export interface FontMetricsData {
  emSize: number
  lineHeight: number
  ascender: number
  descender: number
  underlineY: number
  underlineThickness: number
}

export interface Glyph {
  unicode: number
  advance: number
  planeBounds?: {
    left: number
    bottom: number
    right: number
    top: number
  }
  atlasBounds?: {
    left: number
    bottom: number
    right: number
    top: number
  }
}

export interface KerningPair {
  unicode1: number // Unicode code point of the first glyph
  unicode2: number // Unicode code point of the second glyph
  advance: number  // Adjustment to the spacing between the glyphs
}


export interface FontData {
  atlas: FontAtlas
  metrics: FontMetricsData
  glyphs: Glyph[]
  kerning: KerningPair[] // If more detail is needed, define the structure of kerning pairs
}


export class UIKFont extends UIKAsset {
  public fontMetrics: FontMetrics | null = null
  public fontShader: UIKShader
  public fontColor: Color
  public defaultFontSize: number // Default size in pixels
  public isFontLoaded = false

  constructor(
    gl: WebGL2RenderingContext,
    fontColor = [1.0, 0.0, 0.0, 1.0],
    defaultFontSize = 16 // Default to 16px
  ) {
    super(gl)
    this.fontColor = new Float32Array(fontColor)
    this.defaultFontSize = defaultFontSize
    this.fontShader = new UIKShader(this.gl, vertFontShader, fragFontShader)
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
    const jsonData = await response.json()
    this.fontMetrics = this.parseFontMetrics(jsonData)
    this.isFontLoaded = true
  }

  public async loadDefaultFont(): Promise<void> {
    await this.loadFontTexture(defaultFontPNG)
    this.fontMetrics = this.parseFontMetrics(defaultFontMetrics)
    this.isFontLoaded = true
  }

  private parseFontMetrics(data: FontData): FontMetrics {
    const fontMetrics: FontMetrics = {
      distanceRange: data.atlas.distanceRange,
      size: data.atlas.size,
      ascender: data.metrics.ascender,
      descender: data.metrics.descender,
      underlineY: data.metrics.underlineY,
      underlineThickness: data.metrics.underlineThickness,
      lineHeight: data.metrics.lineHeight,
      mets: {},
    }
  
    const scaleW = data.atlas.width
    const scaleH = data.atlas.height
  
    for (const glyph of data.glyphs) {
      const char = String.fromCodePoint(glyph.unicode)
  
      const uv_lbwh = glyph.atlasBounds
        ? [
            glyph.atlasBounds.left / scaleW,
            (scaleH - glyph.atlasBounds.top) / scaleH,
            (glyph.atlasBounds.right - glyph.atlasBounds.left) / scaleW,
            (glyph.atlasBounds.top - glyph.atlasBounds.bottom) / scaleH,
          ]
        : [0, 0, 0, 0]
  
      const lbwh = glyph.planeBounds
        ? [
            glyph.planeBounds.left,
            glyph.planeBounds.bottom,
            glyph.planeBounds.right - glyph.planeBounds.left,
            glyph.planeBounds.top - glyph.planeBounds.bottom,
          ]
        : [0, 0, 0, 0]
  
      fontMetrics.mets[char] = {
        xadv: glyph.advance || 0,
        uv_lbwh,
        lbwh,
      }
    }
  
    return fontMetrics
  }
  

  public getTextWidth(str: string, fontSize: number = this.defaultFontSize): number {
    if (!this.fontMetrics || !str) return 0

    let width = 0
    for (const char of str) {
      const glyph = this.fontMetrics.mets[char]
      if (glyph) {
        width += glyph.xadv * (fontSize / this.fontMetrics.size)
      }
    }
    return width
  }

  public getTextHeight(fontSize: number = this.defaultFontSize): number {
    if (!this.fontMetrics) return 0

    const { ascender, descender } = this.fontMetrics
    return (ascender - descender) * (fontSize / this.fontMetrics.size)
  }

  public getWordWrappedSize(
    text: string,
    fontSize: number = this.defaultFontSize,
    maxWidth: number = 0
  ): [number, number] {
    if (!text || !this.fontMetrics) return [0, 0]

    let currentWidth = 0
    const lineHeight = this.getTextHeight(fontSize)
    const spaceWidth = this.fontMetrics.mets[' ']?.xadv * (fontSize / this.fontMetrics.size) || 0

    if (maxWidth <= 0) {
      return [this.getTextWidth(text, fontSize), lineHeight]
    }

    let lineCount = 1
    const words = text.split(' ')
    for (const word of words) {
      const wordWidth = this.getTextWidth(word, fontSize)
      if (currentWidth + wordWidth > maxWidth) {
        lineCount++
        currentWidth = wordWidth + spaceWidth
      } else {
        currentWidth += wordWidth + spaceWidth
      }
    }
    return [Math.max(currentWidth, maxWidth), lineCount * lineHeight]
  }

  public isDiacritic(char: string): boolean {
    const codePoint = char.codePointAt(0)
    return (
      (codePoint! >= 0x0300 && codePoint! <= 0x036f) ||
      (codePoint! >= 0x1ab0 && codePoint! <= 0x1aff) ||
      (codePoint! >= 0x1dc0 && codePoint! <= 0x1dff) ||
      (codePoint! >= 0x20d0 && codePoint! <= 0x20ff) ||
      (codePoint! >= 0xfe20 && codePoint! <= 0xfe2f)
    )
  }

  public toJSON(): object {
    return {
      id: this.id,
      className: 'UIKFont',
      fontColor: Array.from(this.fontColor),
      defaultFontSize: this.defaultFontSize,
      fontMetrics: this.fontMetrics,
    }
  }  
}
