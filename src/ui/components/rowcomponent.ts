// components/rowcomponent.ts

import { IUIComponent } from '../interfaces.js'
import { Vec2, Vec4, VerticalAlignment } from '../types.js'
import { NVRenderer } from '../nvrenderer.js'

export class RowComponent implements IUIComponent {
    private children: IUIComponent[]
    private margin: number
    private alignment: VerticalAlignment
    private bounds: Vec4
    private scale: number
    public isVisible: boolean
    public zIndex: number

    constructor(margin: number = 0, alignment: VerticalAlignment = VerticalAlignment.NONE) {
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

        let currentX = this.bounds[0]
        const tallestComponentHeight = Math.max(...this.children.map(child => child.getBounds()[3]))

        for (const child of this.children) {
            const childBounds = child.getBounds()
            let yOffset = 0

            if (this.alignment === VerticalAlignment.CENTER) {
                yOffset = (tallestComponentHeight - childBounds[3]) / 2
            } else if (this.alignment === VerticalAlignment.BOTTOM) {
                yOffset = tallestComponentHeight - childBounds[3]
            }

            child.setPosition([currentX, this.bounds[1] + yOffset])
            child.draw(renderer)
            currentX += childBounds[2] + this.margin
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
        const width = this.children.reduce((sum, child) => sum + child.getBounds()[2], 0) + this.margin * (this.children.length - 1)
        const height = Math.max(...this.children.map(child => child.getBounds()[3]))
        this.bounds[2] = width
        this.bounds[3] = height
    }

    private updateChildPositions(): void {
        let currentX = this.bounds[0]

        for (const child of this.children) {
            const childBounds = child.getBounds()
            child.setPosition([currentX, this.bounds[1]])
            currentX += childBounds[2] + this.margin
        }
    }
}
