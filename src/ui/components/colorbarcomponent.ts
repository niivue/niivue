import { UIKRenderer } from '../uikrenderer.js'
import { Vec2, Vec4 } from '../types.js'
import { UIKFont } from '../uikfont.js'
import { cmapper } from '../../colortables.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class ColorbarComponent extends BaseUIComponent {
  private gl: WebGL2RenderingContext
  private font: UIKFont
  private gradientTexture: WebGLTexture
  private labels: string[]
  private minMax: [number, number]
  private _colormapName: string // Private variable for colormap name

  constructor(
    gl: WebGL2RenderingContext,
    font: UIKFont,
    labels: string[] = ['Min', 'Max'],
    minMax: [number, number] = [0, 1],
    colormapName: string = 'viridis',
    bounds: Vec4
  ) {
    super()
    this.gl = gl
    this.font = font
    this.labels = labels
    this.minMax = minMax
    this._colormapName = colormapName
    this.gradientTexture = this.generateColorMapTexture(gl, colormapName)
    this.className = 'ColorbarComponent'
    this.bounds = bounds
  }

  private generateColorMapTexture(gl: WebGL2RenderingContext, colormapName: string): WebGLTexture {
    const lut = cmapper.colormap(colormapName, false)
    const texture = gl.createTexture() as WebGLTexture
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.bindTexture(gl.TEXTURE_2D, null)
    return texture
  }

  draw(renderer: UIKRenderer): void {
    const position: Vec2 = [this.bounds[0] * this.scale, this.bounds[1] * this.scale]
    const size: Vec2 = [this.bounds[2] * this.scale, this.bounds[3] * this.scale]
    renderer.drawColorbar(this.font, position, size, this.gradientTexture, this.labels) //, this.minMax)
  }

  get colormapName(): string {
    return this._colormapName
  }

  set colormapName(value: string) {
    if (this._colormapName !== value) {
      this._colormapName = value
      this.gradientTexture = this.generateColorMapTexture(this.gl, value)
      if (this.requestRedraw) {
        this.requestRedraw()
      }
    }
  }

  setLabels(newLabels: string[]): void {
    this.labels = newLabels
    if (this.requestRedraw) {
      this.requestRedraw()
    }
  }

  setMinMax(newMinMax: [number, number]): void {
    this.minMax = newMinMax
    if (this.requestRedraw) {
      this.requestRedraw()
    }
  }

  setBounds(bounds: [number, number, number, number]): void {
    super.setBounds(bounds)
    if (this.requestRedraw) {
      this.requestRedraw()
    }
  }
}
