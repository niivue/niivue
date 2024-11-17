import { UIKRenderer } from '../uikRenderer.js'
import { Vec2, Color } from '../types.js'
import { UIKFont } from '../uikFont.js'
import { BaseUIComponent } from './baseUiComponent.js'

export interface LineGraphOptions {
  position: Vec2
  size: Vec2
  backgroundColor: Color
  lineColor: Color
  axisColor: Color
  textColor: Color
  data: number[]
  xLabel: string
  yLabel: string
  yRange: [number, number]
  lineThickness: number
  font: UIKFont
  textScale: number // New property to control text size
}

export class LineGraphComponent extends BaseUIComponent {
  private options: LineGraphOptions

  constructor(options: LineGraphOptions) {
    super()
    this.options = options
    this.className = 'LineGraphComponent'
    this.setPosition(options.position)
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
}
