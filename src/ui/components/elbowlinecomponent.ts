import { UIKRenderer } from '../uikRenderer.js'
import { Vec4, Color, LineTerminator } from '../types.js'
import { LineComponent } from './lineComponent.js'

export class ElbowLineComponent extends LineComponent {
  private horizontalFirst: boolean

  constructor(
    startEnd: Vec4,
    thickness = 1,
    lineColor: Color = [1, 0, 0, -1],
    terminator: LineTerminator = LineTerminator.NONE,
    horizontalFirst = true
  ) {
    super(startEnd, thickness, lineColor, terminator)
    this.horizontalFirst = horizontalFirst
  }

  draw(renderer: UIKRenderer): void {
    renderer.drawElbowLine(this.startEnd, this.thickness, this.lineColor, this.horizontalFirst, this.terminator)
  }
}
