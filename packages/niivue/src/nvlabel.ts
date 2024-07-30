export enum LabelTextAlignment {
  LEFT = 'left',
  RIGHT = 'right',
  CENTER = 'center'
}

export enum LabelLineTerminator {
  NONE = 'none',
  CIRCLE = 'circle',
  RING = 'ring'
}

/**
 * Class representing label style.
 * @ignore
 */
export class NVLabel3DStyle {
  textColor: number[]
  textScale: number
  textAlignment?: LabelTextAlignment
  lineWidth: number
  lineColor: number[]
  lineTerminator: LabelLineTerminator
  bulletScale?: number
  bulletColor?: number[]
  backgroundColor?: number[]

  /**
   * @param textColor - Color of text
   * @param textScale - Text Size (0.0..1.0)
   * @param lineWidth - Line width
   * @param lineColor - Line color
   * @param bulletScale - Bullet size respective of text
   * @param bulletColor - Bullet color
   * @param backgroundColor - Background color of label
   */
  constructor(
    textColor = [1.0, 1.0, 1.0, 1.0],
    textScale = 1.0,
    textAlignment = LabelTextAlignment.LEFT,
    lineWidth = 0.0,
    lineColor = [0.0, 0.0, 0.0],
    lineTerminator = LabelLineTerminator.NONE,
    bulletScale?: number,
    bulletColor?: number[],
    backgroundColor?: number[]
  ) {
    this.textColor = textColor
    this.textScale = textScale
    this.textAlignment = textAlignment
    this.lineWidth = lineWidth
    this.lineColor = lineColor
    this.lineTerminator = lineTerminator
    this.bulletScale = bulletScale
    this.bulletColor = bulletColor
    this.backgroundColor = backgroundColor
  }
}

/**
 * Label class
 * @ignore
 */
export class NVLabel3D {
  text: string
  style: NVLabel3DStyle
  points?: number[] | number[][]

  /**
   * @param text - The text of the label
   * @param style - The style of the label
   * @param points - An array of points label for label lines
   */
  constructor(text: string, style: NVLabel3DStyle, points?: number[] | number[][]) {
    this.text = text
    this.style = style
    this.points = points
  }
}
