import { UIKAsset } from "./uikasset.js"

/**
 * Minimum rendered em height, in *device* pixels, for crisp MSDF text.
 *
 * The bundled atlases bake `distanceRange: 2`, so once the em drops much
 * below ~20 device px the font shader's `screenPxRange` hits its 1.0 floor
 * and glyph curves staircase — there simply aren't enough interior pixels to
 * resolve them. Core NiiVue avoids this for its colorbar by sizing text from
 * `fontMinPx` (a device-pixel floor), which keeps those labels sharp.
 *
 * Components size label text as a fraction of their box height. When the
 * canvas backing store is snapped to device pixels (as the demo does), a
 * high-DPR display makes that box — and therefore the text — large enough
 * that this floor is never reached, so it only raises text on standard
 * resolution monitors, exactly where MSDF aliasing appears. Retina rendering
 * is left unchanged. Tunable: raise for crisper (larger) labels, lower to
 * pack more text into short elements.
 */
export const MIN_TEXT_DEVICE_PX = 20

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
  public color: number[] = [1, 1, 1, 1] // Default white color

  constructor(gl: WebGL2RenderingContext, color?: number[]) {
    super(gl)
    if (color) {
      this.color = color
    }
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

  /**
   * Calculate the width of text in pixels
   * @param text - The text string to measure
   * @param scale - The scale factor for the text
   * @returns Width in pixels
   */
  public getTextWidth(text: string, scale: number = 1.0): number {
    if (!this.isFontLoaded) {
      console.warn('Font not loaded, returning 0 for text width')
      return 0
    }
    
    const fontSize = scale * this.fontMetrics.size
    return Array.from(text).reduce((sum, char) => {
      const glyph = this.fontMetrics.mets[char]
      return glyph ? sum + glyph.xadv * fontSize : sum
    }, 0)
  }

  /**
   * Calculate the height of text in pixels
   * @param text - The text string to measure (unused in current implementation)
   * @param scale - The scale factor for the text
   * @returns Height in pixels
   */
  public getTextHeight(text: string, scale: number = 1.0): number {
    if (!this.isFontLoaded) {
      console.warn('Font not loaded, returning 0 for text height')
      return 0
    }
    
    const fontSize = scale * this.fontMetrics.size
    return (this.fontMetrics.ascender - this.fontMetrics.descender) * fontSize
  }

  /**
   * Pick a text scale (as a fraction of the atlas em) for a UI element of the
   * given pixel height. Targets `fraction` of the element height but never
   * renders below {@link MIN_TEXT_DEVICE_PX} so MSDF text stays crisp on
   * standard-resolution displays — unless the element is too short to fit that
   * floor, in which case the line is shrunk to fit. Mirrors the device-pixel
   * minimum that keeps the core NiiVue colorbar labels sharp.
   *
   * @param heightPx - element height in the same (device) pixel space the
   *   renderer draws into, i.e. `gl.canvas`-relative bounds
   * @param fraction - target em height as a fraction of `heightPx`
   * @param maxScale - hard upper bound on the returned scale
   * @returns scale to pass to drawRotatedText / getTextWidth / getTextHeight
   */
  public fitTextScale(heightPx: number, fraction: number, maxScale: number): number {
    if (!this.isFontLoaded) {
      return 0
    }
    const em = this.fontMetrics.size
    const lineSpan = this.fontMetrics.ascender - this.fontMetrics.descender
    // Guard degenerate/malformed metrics (zero, negative, or non-finite size /
    // line span, e.g. from bad deserialized font data) that would otherwise
    // yield Infinity/NaN/negative scales.
    if (!(em > 0) || !(lineSpan > 0)) {
      return 0
    }
    // Largest scale whose full line box still fits within 95% of the element.
    const fitMax = Math.min(maxScale, (heightPx * 0.95) / (lineSpan * em))
    const byFraction = (heightPx * fraction) / em
    const byFloor = MIN_TEXT_DEVICE_PX / em
    return Math.min(fitMax, Math.max(byFraction, byFloor))
  }

  /**
   * Load the default font for UIKit components
   * This uses Roboto Regular font that's commonly available
   */
  public async loadDefaultFont(): Promise<void> {
    try {
      // Import the bundled Roboto MSDF atlas + metrics. Vite emits the PNG
      // as a base64 data URL at build time (?inline) so the asset ships
      // inside the library bundle — consumers don't need to copy font
      // files into their app's public/. The JSON import gives us a
      // pre-parsed object.
      const [textureUrl, metrics] = await Promise.all([
        import('../fonts/Roboto-Regular.png?inline').then((m) => m.default as string),
        import('../fonts/Roboto-Regular.json').then((m) => m.default as RawFontFile)
      ])
      await this.loadTexture(textureUrl)
      this.initFontMetrics(metrics)
      this.family = 'Roboto'
      this.style = 'Regular'
      this.isFontLoaded = true
    } catch (error) {
      console.error('Failed to load default font:', error)
      // Fallback so consumers don't crash — drawRotatedText silently
      // skips when the texture is 1x1, which is what we want here.
      this.createBasicFontTexture()
      this.fontMetrics = {
        distanceRange: 4,
        size: 48,
        emSize: 48,
        lineHeight: 1.2,
        ascender: 0.75,
        descender: -0.25,
        underlineY: -0.15,
        underlineThickness: 0.05,
        mets: this.createBasicGlyphMetrics()
      }
      this.isFontLoaded = true
      this.family = 'Roboto'
      this.style = 'Regular'
      // Do not rethrow: the fallback state above is fully populated, so the
      // component stays usable (drawRotatedText silently skips the 1x1
      // texture). Rethrowing here would abort the caller's component
      // creation, contradicting the fallback's purpose.
    }
  }

  /**
   * Create a basic transparent texture for text rendering fallback
   */
  private createBasicFontTexture(): void {
    const gl = this.gl
    
    // Create a 1x1 transparent pixel texture as fallback
    const texture = gl.createTexture()
    if (!texture) {
      throw new Error('Failed to create font texture')
    }
    
    gl.bindTexture(gl.TEXTURE_2D, texture)
    
    // Single transparent pixel data instead of white to avoid artifacts
    const pixel = new Uint8Array([255, 255, 255, 0]) // Transparent pixel
    
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixel
    )
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    
    // Store texture
    this.texture = texture
    this.textureSize = [1, 1]
    
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  /**
   * Create basic glyph metrics for common characters
   * This is a fallback when actual font files aren't available
   */
  private createBasicGlyphMetrics(): Record<string, GlyphMetrics> {
    const metrics: Record<string, GlyphMetrics> = {}
    
    // Add basic ASCII characters (32-126)
    for (let i = 32; i <= 126; i++) {
      const char = String.fromCharCode(i)
      let advance = 0.5 // default advance width
      let width = 0.4
      let height = 0.7
      
      // Adjust for specific character types
      if (char === ' ') {
        advance = 0.25
        width = 0
      } else if ('iIl'.includes(char)) {
        advance = 0.25
        width = 0.2
      } else if ('mMwW'.includes(char)) {
        advance = 0.8
        width = 0.7
      } else if ('.,;:!|'.includes(char)) {
        advance = 0.3
        width = 0.2
      }
      
      metrics[char] = {
        xadv: advance,
        uv_lbwh: [0, 0, width, height], // UV coordinates (dummy values)
        lbwh: [0, 0, width, height]     // Layout bounds (dummy values)
      }
    }
    
    return metrics
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
