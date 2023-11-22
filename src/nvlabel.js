/** enum for text alignment */
export const LabelTextAlignment = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
  CENTER: 'center'
})

/** enum for line terminators */
export const LabelLineTerminator = Object.freeze({
  NONE: 'none',
  CIRCLE: 'circle',
  RING: 'ring'
})

/**  Class representing label style */
export class NVLabel3DStyle {
  /**
   *
   * @param {number[]} textColor - Color of text
   * @param {number} textScale - Text Size (0.0..1.0)
   * @param {number} lineWidth - Line width
   * @param {number[]} lineColor - Line color
   * @param {number} bulletScale - Bullet size respective of text
   * @param {number[]} bulletColor - Bullet color
   * @param {number[]} backgroundColor - Background color of label
   */
  constructor(
    textColor = [1.0, 1.0, 1.0, 1.0],
    textScale = 1.0,
    textAlignment = LabelTextAlignment.LEFT,
    lineWidth = 0.0,
    lineColor = [0.0, 0.0, 0.0],
    lineTerminator = LabelLineTerminator.NONE,
    bulletScale = undefined,
    bulletColor = undefined,
    backgroundColor = undefined
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

export class NVLabel3D {
  /**
   * Label class
   * @constructor
   * @param {string} text - The text of the label
   * @param {NVLabel3DStyle} style - The style of the label
   * @param {number[][]} points - An array of points label for label lines
   */
  constructor(text, style, points) {
    this.text = text
    this.style = style
    this.points = points
  }
}
