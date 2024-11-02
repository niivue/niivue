import { NVRenderer } from "../nvrenderer.js"
import { VerticalAlignment } from "../types.js"
import { BaseContainerComponent } from "./basecontainercomponent.js"

export class RowComponent extends BaseContainerComponent {
    private alignment: VerticalAlignment

    constructor(margin: number = 0, alignment: VerticalAlignment = VerticalAlignment.NONE) {
        super(margin)
        this.alignment = alignment
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

    protected updateBounds(): void {
        const width = this.children.reduce((sum, child) => sum + child.getBounds()[2], 0) + this.margin * (this.children.length - 1)
        const height = Math.max(...this.children.map(child => child.getBounds()[3]))
        this.bounds[2] = width
        this.bounds[3] = height
    }

    protected updateChildPositions(): void {
        let currentX = this.bounds[0]

        for (const child of this.children) {
            const childBounds = child.getBounds()
            child.setPosition([currentX, this.bounds[1]])
            currentX += childBounds[2] + this.margin
        }
    }
}