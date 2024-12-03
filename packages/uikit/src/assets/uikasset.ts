import { v4 as uuidv4 } from '@lukeed/uuid'

export abstract class UIKAsset {
  protected gl: WebGL2RenderingContext
  protected texture: WebGLTexture | null = null
  protected width: number = 0
  protected height: number = 0
  public id: string

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.id = uuidv4()
  }

  public getTexture(): WebGLTexture | null {
    return this.texture
  }

  public getWidth(): number {
    return this.width
  }

  public getHeight(): number {
    return this.height
  }

  // Method to load a texture from a URL and assign it to this.texture
  public async loadTexture(textureUrl: string): Promise<WebGLTexture | null> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = (): void => {
        const texture = this.gl.createTexture()
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img)

        this.texture = texture
        this.width = img.width
        this.height = img.height

        resolve(texture)
      }
      img.onerror = reject
      img.src = textureUrl
    })
  }

  // Method to get base64 representation of the texture
  public async getBase64Texture(): Promise<string | null> {
    if (!this.texture) {
      return null
    }

    // Create an offscreen canvas to extract the texture data
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    const context = canvas.getContext('2d')

    if (!context) {
      return null
    }

    // Draw the texture onto the canvas
    const framebuffer = this.gl.createFramebuffer()
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer)
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture, 0)

    // Read the pixels from the framebuffer into an Uint8Array
    const pixels = new Uint8Array(this.width * this.height * 4)
    this.gl.readPixels(0, 0, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels)

    // Put the pixel data onto the canvas
    const imageData = new ImageData(new Uint8ClampedArray(pixels), this.width, this.height)
    context.putImageData(imageData, 0, 0)

    // Convert the canvas to a base64 string
    return canvas.toDataURL('image/png')
  }

  // Abstract method to force subclasses to implement their own `toJSON`
  public abstract toJSON(): object
}
