import { BaseUIComponent } from './baseuicomponent.js'
import { NVRenderer } from '../nvrenderer.js'
import { NVBitmap } from '../nvbitmap.js'
import { Vec2, Vec4 } from '../types.js'

export class BitmapComponent extends BaseUIComponent {
    private bitmap: NVBitmap
    private width: number
    private height: number

    constructor(position: Vec2, bitmap: NVBitmap, scale = 1.0) {
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

    draw(renderer: NVRenderer): void {
        // Draw the bitmap using screen coordinates
        renderer.drawBitmap(this.bitmap, this.position, this.scale)
    }

    // Event handlers
    onClick(event: MouseEvent): void {
        this.applyEventEffects('click')
    }

    onFocus(): void {
        this.applyEventEffects('focus')
    }

    onBlur(): void {
        this.applyEventEffects('blur')
    }

    onMouseEnter(event: MouseEvent): void {
        this.applyEventEffects('mouseEnter')
    }

    onMouseLeave(event: MouseEvent): void {
        this.applyEventEffects('mouseLeave')
    }
}
