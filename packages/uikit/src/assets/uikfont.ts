import { UIKAsset } from "./uikasset.js"

export type GlyphMetrics = {
  xadv: number
  uv_lbwh: [number, number, number, number]
  lbwh: [number, number, number, number]
}

export interface FontMetrics {
  distanceRange: number
  size: number
  emSize?: number // Add this
  lineHeight: number
  ascender: number
  descender: number
  underlineY: number
  underlineThickness: number
  mets: Record<string, GlyphMetrics>
}

export interface RawGlyph {
  unicode: number
  advance: number
  atlasBounds?: {
    left: number
    top: number
    right: number
    bottom: number
  }
  planeBounds?: {
    left: number
    top: number
    right: number
    bottom: number
  }
}


export interface RawFontFile {
  atlas: {
    width: number
    height: number
    distanceRange: number
    size: number
  }
  metrics: {
    ascender: number
    descender: number
    underlineY: number
    underlineThickness: number
    lineHeight: number
    emSize: number
  }
  glyphs: RawGlyph[]
  family?: string
  style?: string
}

export interface SerializedFont {
  id: string
  className: string
  fontMetrics: FontMetrics
  textureSize: [number, number]
  isMTSDF: boolean
  family: string
  style: string
}

export class UIKFont extends UIKAsset {
  public fontMetrics!: FontMetrics
  public textureSize: [number, number] = [0, 0]
  public isFontLoaded = false
  public isMTSDF = false
  public family = ""
  public style = ""

  constructor(gl: WebGL2RenderingContext) {
    super(gl)
  }

  public async loadFontTexture(fontUrl: string): Promise<WebGLTexture | null>  {
    return this.loadTexture(fontUrl)
  }

  public async loadFont(
    fontSheetUrl: string,
    metricsUrl: string,
    isMTSDF = false
  ): Promise<void> {
    await this.loadFontTexture(fontSheetUrl)
    const response = await fetch(metricsUrl)
    if (!response.ok) throw new Error(response.statusText)
    const raw: RawFontFile = await response.json()
    this.initFontMetrics(raw)
    this.isMTSDF = isMTSDF
  }

  public loadFromRawData(raw: RawFontFile): void {
  const atlas = raw.atlas
  const metricsMap: Record<string, GlyphMetrics> = {}

  for (const glyph of raw.glyphs) {
    if (!glyph.atlasBounds || !glyph.planeBounds) continue

    const char = String.fromCodePoint(glyph.unicode)

    const uvLeft = glyph.atlasBounds.left / atlas.width
    const uvTop = (atlas.height - glyph.atlasBounds.top) / atlas.height
    const uvWidth = (glyph.atlasBounds.right - glyph.atlasBounds.left) / atlas.width
    const uvHeight = (glyph.atlasBounds.top - glyph.atlasBounds.bottom) / atlas.height

    const planeLeft = glyph.planeBounds.left
    const planeBottom = glyph.planeBounds.bottom
    const planeWidth = glyph.planeBounds.right - glyph.planeBounds.left
    const planeHeight = glyph.planeBounds.top - glyph.planeBounds.bottom

    metricsMap[char] = {
      uv_lbwh: [uvLeft, uvTop, uvWidth, uvHeight],
      lbwh: [planeLeft, planeBottom, planeWidth, planeHeight],
      xadv: glyph.advance
    }
  }

  this.fontMetrics = {
    distanceRange: atlas.distanceRange,
    size: atlas.size,
    emSize: raw.metrics.emSize,
    lineHeight: raw.metrics.lineHeight,
    ascender: raw.metrics.ascender,
    descender: raw.metrics.descender,
    underlineY: raw.metrics.underlineY,
    underlineThickness: raw.metrics.underlineThickness,
    mets: metricsMap
  }

  this.isFontLoaded = true
}


  private initFontMetrics(raw: RawFontFile): void {
    const atlas = raw.atlas
    const metrics = raw.metrics

    this.fontMetrics = {
      distanceRange: atlas.distanceRange,
      size: atlas.size,
      ascender: metrics.ascender,
      descender: metrics.descender,
      underlineY: metrics.underlineY,
      underlineThickness: metrics.underlineThickness,
      lineHeight: metrics.lineHeight,
      mets: {},
    }

    this.textureSize = [atlas.width, atlas.height]

    for (const glyph of raw.glyphs) {
      if (!glyph.atlasBounds || !glyph.planeBounds) continue
      const char = String.fromCodePoint(glyph.unicode)
      const l = glyph.atlasBounds.left / atlas.width
      const b = (atlas.height - glyph.atlasBounds.top) / atlas.height
      const w = (glyph.atlasBounds.right - glyph.atlasBounds.left) / atlas.width
      const h =
        (glyph.atlasBounds.top - glyph.atlasBounds.bottom) / atlas.height

      const pxL = glyph.planeBounds?.left ?? 0
      const pxB = glyph.planeBounds?.bottom ?? 0
      const pxW = (glyph.planeBounds?.right ?? 0) - pxL
      const pxH = (glyph.planeBounds?.top ?? 0) - pxB

      this.fontMetrics.mets[char] = {
        xadv: glyph.advance,
        uv_lbwh: [l, b, w, h],
        lbwh: [pxL, pxB, pxW, pxH],
      }
    }

    this.family = raw.family ?? ""
    this.style = raw.style ?? ""
    this.isFontLoaded = true
  }

  public toJSON(): SerializedFont {
    return {
      id: this.id,
      className: "UIKFont",
      fontMetrics: this.fontMetrics,
      textureSize: this.textureSize,
      isMTSDF: this.isMTSDF,
      family: this.family,
      style: this.style,
    }
  }

  public static async fromJSON(
    gl: WebGL2RenderingContext,
    json: SerializedFont
  ): Promise<UIKFont> {
    const font = new UIKFont(gl)
    font.id = json.id
    font.fontMetrics = json.fontMetrics
    font.textureSize = json.textureSize
    font.isMTSDF = json.isMTSDF
    font.family = json.family
    font.style = json.style
    font.isFontLoaded = true
    return font
  }
}
