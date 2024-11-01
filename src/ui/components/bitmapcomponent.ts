// components/bitmapcomponent.ts

import { IUIComponent } from '../interfaces.js'
import { NVRenderer } from '../nvrenderer.js'
import { NVBitmap } from '../nvbitmap.js'
import { Vec2, Vec4 } from '../types.js'

export class BitmapComponent implements IUIComponent {
    private position: Vec2 // Screen coordinates
    private bounds: Vec4   // Screen coordinates [left, top, width, height]
    private bitmap: NVBitmap
    private scale: number  // Scaling factor

    constructor(position: Vec2, bitmap: NVBitmap, scale = 1.0) {
        this.position = position
        this.bitmap = bitmap
        this.scale = scale

        // Calculate width and height based on bitmap dimensions and scale
        const width = bitmap.getWidth() * this.scale
        const height = bitmap.getHeight() * this.scale

        this.bounds = [position[0], position[1], width, height]
    }

    getBounds(): Vec4 {
        return this.bounds
    }
    setBounds(bounds: Vec4): void {
        this.bounds = bounds
    }
    getPosition(): Vec2 {
        return this.position
    }
    setPosition(position: Vec2): void {
        this.position = position
    }
    draw(renderer: NVRenderer): void {
        // Draw the bitmap using screen coordinates
        renderer.drawBitmap(this.bitmap, this.position, this.scale)
    }

    // Event handlers
    onClick(event: MouseEvent): void {
        // Handle click event
    }
    onFocus(): void {
        // Handle focus event
    }
    onBlur(): void {
        // Handle blur (lost focus) event
    }
    onMouseEnter(event: MouseEvent): void {
        // Handle mouse enter event
    }
    onMouseLeave(event: MouseEvent): void {
        // Handle mouse leave event
    }
}
