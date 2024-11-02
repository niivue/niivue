// components/columncomponent.ts

import { IUIComponent } from '../interfaces.js'
import { Vec2, Vec4, HorizontalAlignment } from '../types.js'
import { NVRenderer } from '../nvrenderer.js'

export class ColumnComponent implements IUIComponent {
    private children: IUIComponent[]
    private margin: number
    private alignment: HorizontalAlignment
    private bounds: Vec4
    private scale: number
    public isVisible: boolean
    public zIndex: number

    constructor(margin: number = 0, alignment: HorizontalAlignment = HorizontalAlignment.NONE) {
        this.children = []
        this.margin = margin
        this.alignment = alignment
        this.bounds = [0, 0, 0, 0]
        this.scale = 1.0
        this.isVisible = true
        this.zIndex = 0
    }

    addChild(component: IUIComponent): void {
        this.children.push(component)
        this.updateBounds()
    }

    draw(renderer: NVRenderer): void {
        if (!this.isVisible) return

        let currentY = this.bounds[1]
        const widestComponentWidth = Math.max(...this.children.map(child => child.getBounds()[2]))

        for (const child of this.children) {
            const childBounds = child.getBounds()
            let xOffset = 0

            if (this.alignment === HorizontalAlignment.CENTER) {
                xOffset = (widestComponentWidth - childBounds[2]) / 2
            } else if (this.alignment === HorizontalAlignment.RIGHT) {
                xOffset = widestComponentWidth - childBounds[2]
            }

            child.setPosition([this.bounds[0] + xOffset, currentY])
            child.draw(renderer)
            currentY += childBounds[3] + this.margin
        }
    }

    getScale(): number {
        return this.scale
    }

    setScale(value: number): void {
        if (value <= 0) {
            throw new Error('Scale must be greater than 0')
        }

        const scaleFactor = value / this.scale
        this.scale = value

        // Scale child components
        this.children.forEach(child => {
            const childBounds = child.getBounds()
            const newBounds: Vec4 = [
                childBounds[0] * scaleFactor,
                childBounds[1] * scaleFactor,
                childBounds[2] * scaleFactor,
                childBounds[3] * scaleFactor
            ]
            child.setBounds(newBounds)
            child.setScale(child.getScale() * scaleFactor)
        })

        this.updateBounds()
    }

    getBounds(): Vec4 {
        return this.bounds
    }

    setBounds(bounds: Vec4): void {
        this.bounds = bounds
        this.updateChildPositions()
    }

    getPosition(): Vec2 {
        return [this.bounds[0], this.bounds[1]]
    }

    setPosition(position: Vec2): void {
        this.bounds[0] = position[0]
        this.bounds[1] = position[1]
        this.updateChildPositions()
    }

    private updateBounds(): void {
        const width = Math.max(...this.children.map(child => child.getBounds()[2]))
        const height = this.children.reduce((sum, child) => sum + child.getBounds()[3], 0) + this.margin * (this.children.length - 1)
        this.bounds[2] = width
        this.bounds[3] = height
    }

    private updateChildPositions(): void {
        let currentY = this.bounds[1]
        const widestComponentWidth = this.bounds[2]

        for (const child of this.children) {
            const childBounds = child.getBounds()
            let xOffset = 0

            if (this.alignment === HorizontalAlignment.CENTER) {
                xOffset = (widestComponentWidth - childBounds[2]) / 2
            } else if (this.alignment === HorizontalAlignment.RIGHT) {
                xOffset = widestComponentWidth - childBounds[2]
            }

            child.setPosition([this.bounds[0] + xOffset, currentY])
            currentY += childBounds[3] + this.margin
        }
    }
}
