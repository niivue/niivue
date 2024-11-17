import { Shader } from '../shader.js'
import { TEXTURE4_THUMBNAIL } from '../niivue/index.js'
import { vertBmpShader, fragBmpShader } from '../shader-srcs.js'
import { UIKAsset } from './uikasset.js'

export class UIKBitmap extends UIKAsset {
  public bitmapShader: Shader

  constructor(gl: WebGL2RenderingContext) {
    super(gl)
    this.bitmapShader = new Shader(gl, vertBmpShader, fragBmpShader)
  }

  public async loadBitmap(bitmapUrl: string): Promise<void> {
    await this.loadTexture(bitmapUrl, TEXTURE4_THUMBNAIL)
  }

  public toJSON(): object {
    return {
      id: this.id,
      className: 'NVBitmap',
      width: this.width,
      height: this.height
    }
  }

  public static async fromJSON(gl: WebGL2RenderingContext, json: any): Promise<UIKBitmap> {
    const bitmap = new UIKBitmap(gl)
    bitmap.id = json.id
    bitmap.width = json.width
    bitmap.height = json.height

    // Decode and load the base64 texture if it exists
    if (json.base64Texture) {
      const textureData = atob(json.base64Texture)
      const textureArray = Uint8Array.from(textureData, (c) => c.charCodeAt(0))
      const blob = new Blob([textureArray], { type: 'image/png' })
      const textureUrl = URL.createObjectURL(blob)

      await bitmap.loadBitmap(textureUrl)

      // Revoke the URL after loading
      URL.revokeObjectURL(textureUrl)
    }

    return bitmap
  }
}
