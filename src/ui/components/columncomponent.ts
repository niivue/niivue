import { NVRenderer } from "../nvrenderer.js"
import { HorizontalAlignment } from "../types.js"
import { BaseContainerComponent } from "./basecontainercomponent.js"

export class ColumnComponent extends BaseContainerComponent {
    private alignment: HorizontalAlignment

    constructor(margin: number = 0, alignment: HorizontalAlignment = HorizontalAlignment.NONE) {
        super(margin)
        this.alignment = alignment
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

    protected updateBounds(): void {
        const width = Math.max(...this.children.map(child => child.getBounds()[2]))
        const height = this.children.reduce((sum, child) => sum + child.getBounds()[3], 0) + this.margin * (this.children.length - 1)
        this.bounds[2] = width
        this.bounds[3] = height
    }

    protected updateChildPositions(): void {
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