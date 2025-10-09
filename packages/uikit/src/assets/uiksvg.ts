import { UIKShader } from '../uikshader.js'
import bitmapVertShader from '../shaders/vert/bitmap.vert.glsl'
import bitmapFragShader from '../shaders/frag/bitmap.frag.glsl'
import { UIKAsset } from './uikasset.js'

/**
 * UIKSVG class for loading and rendering SVG graphics as WebGL textures
 * Provides scalable vector graphics support for medical imaging UI components
 */
export class UIKSVG extends UIKAsset {
  public bitmapShader: UIKShader
  private svgContent: string | null = null

  constructor(gl: WebGL2RenderingContext) {
    super(gl)
    // Use the same bitmap shader system as UIKBitmap
    this.bitmapShader = new UIKShader(gl, bitmapVertShader, bitmapFragShader)
  }

  /**
   * Load an SVG from a URL and generate a WebGL texture
   * @param svgUrl The URL of the SVG file to load
   */
  public async loadSVG(svgUrl: string): Promise<void> {
    const response = await fetch(svgUrl)
    if (!response.ok) {
      throw new Error(`Failed to load SVG: ${response.statusText}`)
    }

    this.svgContent = await response.text()
    await this.convertSVGToTexture()
  }

  /**
   * Load SVG from inline content string
   * @param svgContent The SVG content as a string
   */
  public async loadSVGFromString(svgContent: string): Promise<void> {
    this.svgContent = svgContent
    await this.convertSVGToTexture()
  }

  /**
   * Convert stored SVG content to a WebGL texture using blob conversion
   * This is the core functionality that enables SVG rendering in WebGL
   */
  private async convertSVGToTexture(): Promise<void> {
    if (!this.svgContent) {
      throw new Error('No SVG content to convert')
    }

    // Create a blob from the SVG content with proper MIME type
    const blob = new Blob([this.svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    try {
      // Use the inherited loadTexture method to convert to WebGL texture
      await this.loadTexture(url)
    } finally {
      // Always clean up the object URL to prevent memory leaks
      URL.revokeObjectURL(url)
    }
  }

  /**
   * Get the SVG content as a string
   * Useful for debugging or serialization
   */
  public getSVGContent(): string | null {
    return this.svgContent
  }

  /**
   * Converts the SVG instance to a JSON representation for serialization
   */
  public toJSON(): object {
    return {
      id: this.id,
      className: 'UIKSVG',
      width: this.width,
      height: this.height,
      svgContent: this.svgContent
    }
  }

  /**
   * Creates a UIKSVG instance from a JSON object
   * Enables deserialization and state restoration
   */
  public static async fromJSON(gl: WebGL2RenderingContext, json: any): Promise<UIKSVG> {
    const svg = new UIKSVG(gl)
    svg.id = json.id
    svg.width = json.width
    svg.height = json.height
    svg.svgContent = json.svgContent || null

    if (svg.svgContent) {
      await svg.convertSVGToTexture()
    }

    return svg
  }
} 