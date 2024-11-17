import { UIKRenderer } from '../uikrenderer.js'
import { UIKBitmap } from '../uikbitmap.js'
import { Vec2 } from '../types.js'
import { BaseUIComponent } from './baseuicomponent.js'

export class BitmapComponent extends BaseUIComponent {
  private bitmap: UIKBitmap
  private width: number
  private height: number

  constructor(position: Vec2, bitmap: UIKBitmap, scale = 1.0) {
    super()
    this.position = position
    this.bitmap = bitmap
    this.scale = scale

    // Calculate width and height based on bitmap dimensions and scale
    this.width = bitmap.getWidth() * this.scale
    this.height = bitmap.getHeight() * this.scale

    this.bounds = [position[0], position[1], this.width, this.height]
  }

  getScale(): number {
    return this.scale
  }

  setScale(value: number): void {
    this.scale = value
    this.width = this.bitmap.getWidth() * this.scale
    this.height = this.bitmap.getHeight() * this.scale

    this.bounds = [this.position[0], this.position[1], this.width, this.height]
  }

  draw(renderer: UIKRenderer): void {
    // Draw the bitmap using screen coordinates
    renderer.drawBitmap(this.bitmap, this.position, this.scale)
  }

  // Method to get the NVBitmap instance
  public getBitmap(): UIKBitmap {
    return this.bitmap
  }

  // toJSON method to serialize the BitmapComponent instance
  toJSON(): object {
    return {
      ...super.toJSON(), // Serialize base properties
      className: 'BitmapComponent', // Class name for identification
      bitmapId: this.bitmap.id, // Assuming bitmap has an id property
      width: this.width,
      height: this.height,
      scale: this.scale
    }
  }

  // Method to deserialize from JSON
  public static fromJSON(data: any, bitmaps: { [key: string]: UIKBitmap }): BitmapComponent {
    const bitmap = bitmaps[data.bitmapId]
    if (!bitmap) {
      throw new Error(`Bitmap with ID ${data.bitmapId} not found`)
    }

    const position: Vec2 = data.position || [0, 0]
    const scale: number = data.scale || 1.0
    const component = new BitmapComponent(position, bitmap, scale)

    // Set additional properties from JSON data if available
    component.width = data.width ?? bitmap.getWidth() * scale
    component.height = data.height ?? bitmap.getHeight() * scale
    component.bounds = [position[0], position[1], component.width, component.height]

    return component
  }
}
