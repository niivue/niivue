import { TEXTURE4_THUMBNAIL } from '../niivue/index.js'
import { vertBmpShader, fragBmpShader } from '../shader-srcs.js'
import { Shader } from '../shader.js'

export class NVBitmap {
  private gl: WebGL2RenderingContext
  private bitmapTexture: WebGLTexture | null = null
  private width: number = 0
  private height: number = 0
  public bitmapShader: Shader
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.bitmapShader = new Shader(gl, vertBmpShader, fragBmpShader)
  }

  public async loadBitmap(bitmapUrl: string): Promise<WebGLTexture | null> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = (): void => {
        const texture = this.gl.createTexture()
        this.gl.activeTexture(TEXTURE4_THUMBNAIL)
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img)

        this.bitmapTexture = texture
        this.width = img.width
        this.height = img.height

        resolve(texture)
      }
      img.onerror = reject
      img.src = bitmapUrl
    })
  }

  public getBitmapTexture(): WebGLTexture | null {
    return this.bitmapTexture
  }

  public getWidth(): number {
    return this.width
  }

  public getHeight(): number {
    return this.height
  }
}
