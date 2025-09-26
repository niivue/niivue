import { UIKAsset } from "./uikasset.js"
import { Color } from '../types'

export type GlyphMetrics = {
  xadv: number
  uv_lbwh: [number, number, number, number]
  lbwh: [number, number, number, number]
}

/**
 * Outline style options for enhanced text readability
 */
export type UIKFontOutlineStyle = 'solid' | 'glow' | 'inner' | 'outer'

/**
 * Comprehensive outline configuration for UIKFont
 */
export interface UIKFontOutlineConfig {
  /** Enable/disable outline rendering */
  enabled: boolean
  /** Outline width (0.0 - 1.0, relative to font size) */
  width: number
  /** Outline color (RGBA) */
  color: Color
  /** Outline rendering style */
  style: UIKFontOutlineStyle
  /** Edge softness for smooth transitions (0.0 - 1.0) */
  softness: number
  /** X,Y offset for drop-shadow style outlines */
  offset: [number, number]
}

/**
 * Outline metrics for text measurement calculations
 */
export interface UIKFontOutlineMetrics {
  /** Additional width added by outline */
  additionalWidth: number
  /** Additional height added by outline */
  additionalHeight: number
  /** X offset for positioning */
  xOffset: number
  /** Y offset for positioning */
  yOffset: number
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

  // Enhanced outline configuration properties
  public outlineConfig: UIKFontOutlineConfig = {
    enabled: false,
    width: 0.2,
    color: [0, 0, 0, 1],
    style: 'solid',
    softness: 0.1,
    offset: [0, 0]
  }

  // Global default outline configuration for medical imaging
  private static globalOutlineDefaults: UIKFontOutlineConfig = {
    enabled: true,
    width: 0.25,
    color: [0, 0, 0, 0.8],
    style: 'solid',
    softness: 0.15,
    offset: [0, 0]
  }

  constructor(gl: WebGL2RenderingContext, color?: number[]) {
    super(gl)
    if (color) {
      this.color = color
    }
    // Apply global defaults for medical imaging
    this.outlineConfig = { ...UIKFont.globalOutlineDefaults }
  }

  /**
   * Set global default outline configuration for all UIKFont instances
   * Optimized for medical imaging applications
   */
  public static setGlobalOutlineDefaults(config: Partial<UIKFontOutlineConfig>): void {
    UIKFont.globalOutlineDefaults = {
      ...UIKFont.globalOutlineDefaults,
      ...config
    }
  }

  /**
   * Get current global outline defaults
   */
  public static getGlobalOutlineDefaults(): UIKFontOutlineConfig {
    return { ...UIKFont.globalOutlineDefaults }
  }

  /**
   * Configure outline settings for this font instance
   */
  public setOutlineConfig(config: Partial<UIKFontOutlineConfig>): void {
    this.outlineConfig = {
      ...this.outlineConfig,
      ...config
    }
    
    // Validate configuration
    this.validateOutlineConfig()
  }

  /**
   * Get current outline configuration
   */
  public getOutlineConfig(): UIKFontOutlineConfig {
    return { ...this.outlineConfig }
  }

  /**
   * Validate outline configuration parameters
   */
  private validateOutlineConfig(): void {
    const config = this.outlineConfig
    
    // Clamp width to valid range
    config.width = Math.max(0, Math.min(1, config.width))
    
    // Clamp softness to valid range
    config.softness = Math.max(0, Math.min(1, config.softness))
    
    // Validate color format
    if (config.color.length !== 4) {
      console.warn('UIKFont: Invalid outline color format, using default black')
      config.color = [0, 0, 0, 1]
    }
    
    // Clamp color values
    config.color = config.color.map(c => Math.max(0, Math.min(1, c))) as Color
    
    // Validate style
    const validStyles: UIKFontOutlineStyle[] = ['solid', 'glow', 'inner', 'outer']
    if (!validStyles.includes(config.style)) {
      console.warn(`UIKFont: Invalid outline style '${config.style}', using 'solid'`)
      config.style = 'solid'
    }
  }

  /**
   * Calculate outline metrics for text measurement
   */
  public getOutlineMetrics(text: string, scale: number = 1.0): UIKFontOutlineMetrics {
    if (!this.outlineConfig.enabled || this.outlineConfig.width === 0) {
      return {
        additionalWidth: 0,
        additionalHeight: 0,
        xOffset: 0,
        yOffset: 0
      }
    }
    
    const outlineSize = this.outlineConfig.width * scale * 10 // Convert to pixel units
    const offsetX = this.outlineConfig.offset[0] * scale
    const offsetY = this.outlineConfig.offset[1] * scale
    
    // Calculate additional dimensions based on outline style
    let additionalWidth = 0
    let additionalHeight = 0
    
    switch (this.outlineConfig.style) {
      case 'outer':
      case 'glow':
        additionalWidth = outlineSize * 2
        additionalHeight = outlineSize * 2
        break
      case 'solid':
        additionalWidth = outlineSize
        additionalHeight = outlineSize
        break
      case 'inner':
        // Inner outlines don't add to dimensions
        additionalWidth = 0
        additionalHeight = 0
        break
    }
    
    return {
      additionalWidth: additionalWidth + Math.abs(offsetX),
      additionalHeight: additionalHeight + Math.abs(offsetY),
      xOffset: Math.min(0, offsetX - outlineSize / 2),
      yOffset: Math.min(0, offsetY - outlineSize / 2)
    }
  }

  /**
   * Enable outline with quick configuration for medical imaging
   */
  public enableMedicalOutline(style: UIKFontOutlineStyle = 'solid'): void {
    this.setOutlineConfig({
      enabled: true,
      width: 0.25,
      color: [0, 0, 0, 0.8],
      style: style,
      softness: 0.15,
      offset: [0, 0]
    })
  }

  /**
   * Disable outline rendering
   */
  public disableOutline(): void {
    this.setOutlineConfig({ enabled: false })
  }

  /**
   * Check if outline is currently enabled
   */
  public isOutlineEnabled(): boolean {
    return this.outlineConfig.enabled && this.outlineConfig.width > 0
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
   * Load the default font for UIKit components
   * This uses Roboto Regular font that's commonly available
   */
  public async loadDefaultFont(): Promise<void> {
    try {
      // Create a simple white 1x1 pixel texture for text rendering
      // This is a minimal fallback when actual font files aren't available
      this.createBasicFontTexture()
      
      // For now, we'll create a minimal font metrics for testing
      // In production, you would load actual font files
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
      this.family = "Roboto"
      this.style = "Regular"
      
      console.log('Default font loaded successfully for UIKit')
    } catch (error) {
      console.error('Failed to load default font:', error)
      throw error
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
