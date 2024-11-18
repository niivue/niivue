import { UIKRenderer } from '../uikrenderer.js'
import { Vec2 } from '../types.js'
import { UIKFont } from '../uikfont.js'
import { LineGraphComponentConfig } from '../interfaces.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class LineGraphComponent extends BaseUIComponent {
  private options: LineGraphComponentConfig

  constructor(options: LineGraphComponentConfig) {
    super(options)
    this.options = options
    this.setBounds([options.position[0], options.position[1], options.size[0], options.size[1]])
  }

  // Update graph data dynamically
  setData(newData: number[]): void {
    this.options.data = newData
    if (this.requestRedraw) {
      this.requestRedraw()
    }
  }

  // Update label text dynamically
  setLabels(xLabel: string, yLabel: string): void {
    this.options.xLabel = xLabel
    this.options.yLabel = yLabel
    if (this.requestRedraw) {
      this.requestRedraw()
    }
  }

  setPosition(position: Vec2): void {
    this.options.position = position
  }

  // Implement draw method from BaseUIComponent
  draw(renderer: UIKRenderer): void {
    renderer.drawLineGraph(this.options)
  }

  toJSON(): object {
    return {
      ...super.toJSON(),
      className: 'LineGraphComponent',
      options: {
        size: Array.from(this.options.size),
        backgroundColor: Array.from(this.options.backgroundColor),
        lineColor: Array.from(this.options.lineColor),
        axisColor: Array.from(this.options.axisColor),
        textColor: Array.from(this.options.textColor),
        data: this.options.data,
        xLabel: this.options.xLabel,
        yLabel: this.options.yLabel,
        yRange: this.options.yRange,
        lineThickness: this.options.lineThickness,
        fontId: this.options.font.id,
        textScale: this.options.textScale
      }
    }
  }

  public static fromJSON(data: any, fonts: { [key: string]: UIKFont }): LineGraphComponent {
    const font = fonts[data.options.fontId]
    if (!font) {
      throw new Error(`Font with ID ${data.options.fontId} not found`)
    }

    const config: LineGraphComponentConfig = {
      className: 'LineGraphComponent',
      position: data.position,
      size: data.options.size,
      backgroundColor: data.options.backgroundColor,
      lineColor: data.options.lineColor,
      axisColor: data.options.axisColor,
      textColor: data.options.textColor,
      data: data.options.data,
      xLabel: data.options.xLabel,
      yLabel: data.options.yLabel,
      yRange: data.options.yRange,
      lineThickness: data.options.lineThickness,
      font,
      textScale: data.options.textScale
    }

    return new LineGraphComponent(config)
  }
}
