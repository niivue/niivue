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

export enum LabelAnchorFlag {
  NONE = 0,
  LEFT = 1 << 0,
  CENTER = 1 << 1,
  RIGHT = 1 << 2,
  TOP = 1 << 3,
  MIDDLE = 1 << 4,
  BOTTOM = 1 << 5
}

export enum LabelAnchorPoint {
  NONE = LabelAnchorFlag.NONE,
  TOPLEFT = LabelAnchorFlag.TOP | LabelAnchorFlag.LEFT,
  TOPCENTER = LabelAnchorFlag.TOP | LabelAnchorFlag.CENTER,
  TOPRIGHT = LabelAnchorFlag.TOP | LabelAnchorFlag.RIGHT,
  MIDDLELEFT = LabelAnchorFlag.MIDDLE | LabelAnchorFlag.LEFT,
  MIDDLECENTER = LabelAnchorFlag.MIDDLE | LabelAnchorFlag.CENTER,
  MIDDLERIGHT = LabelAnchorFlag.MIDDLE | LabelAnchorFlag.RIGHT,
  BOTTOMLEFT = LabelAnchorFlag.BOTTOM | LabelAnchorFlag.LEFT,
  BOTTOMCENTER = LabelAnchorFlag.BOTTOM | LabelAnchorFlag.CENTER,
  BOTTOMRIGHT = LabelAnchorFlag.BOTTOM | LabelAnchorFlag.RIGHT
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
  anchor: LabelAnchorPoint
  onClick?: (label: NVLabel3D, e?: MouseEvent) => void

  /**
   * @param text - The text of the label
   * @param style - The style of the label
   * @param points - An array of points label for label lines
   */
  constructor(
    text: string,
    style: NVLabel3DStyle,
    points?: number[] | number[][],
    anchor?: LabelAnchorPoint,
    onClick?: (label: NVLabel3D, e?: MouseEvent) => void
  ) {
    this.text = text
    this.style = style
    this.points = points
    this.anchor = anchor || LabelAnchorPoint.NONE
    this.onClick = onClick
  }
}
