import { NVRenderer } from "../nvrenderer.js"
import { BaseContainerComponent } from "./basecontainercomponent.js"

export class ColumnComponent extends BaseContainerComponent {

    constructor(canvas: HTMLCanvasElement, margin: number = 0) {
        super(canvas, margin)
    }

    draw(renderer: NVRenderer): void {
        if (!this.isVisible) return

        let currentY = this.bounds[1]
        const widestComponentWidth = Math.max(...this.children.map(child => child.getBounds()[2]))

        for (const child of this.children) {
            const childBounds = child.getBounds()
            let xOffset = 0


            child.setPosition([this.bounds[0] + xOffset, currentY])
            child.draw(renderer)
            currentY += childBounds[3] + this.margin
        }
    }

    protected updateBounds(): void {
        // const children = this._quadTree.getAllElements()
        // const width = Math.max(...children.map(child => child.getBounds()[2]))
        // const height = children.reduce((sum, child) => sum + child.getBounds()[3], 0) + this.margin * (children.length - 1)
        // this.bounds[2] = width
        // this.bounds[3] = height
    }

    protected updateChildPositions(): void {
        // const children = this._quadTree.getAllElements()
        // let currentY = this.bounds[1]
        // const widestComponentWidth = this.bounds[2]

        // for (const child of children) {
        //     const childBounds = child.getBounds()
        //     let xOffset = 0


        //     child.setPosition([this.bounds[0] + xOffset, currentY])
        //     currentY += childBounds[3] + this.margin
        // }
    }
}