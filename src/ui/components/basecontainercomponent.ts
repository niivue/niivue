import { BaseUIComponent } from './baseuicomponent.js'
import { Vec2, Vec4 } from '../types.js'
import { IUIComponent, IUIContainer } from '../interfaces.js'
import { QuadTree, Rectangle } from '../quadtree.js'

export abstract class BaseContainerComponent extends BaseUIComponent implements IUIContainer {
    protected margin: number
    protected _quadTree: QuadTree<IUIComponent>
    protected children: BaseUIComponent[] = []

    constructor(canvas: HTMLCanvasElement, margin: number = 0) {
        super()
        const bounds = new Rectangle(0, 0, canvas.width, canvas.height)

        this._quadTree = new QuadTree<IUIComponent>(bounds)
        this.margin = margin
        this.bounds = [0, 0, 0, 0]
        this.scale = 1.0
        this.isVisible = true
        this.zIndex = 0
    }

    set quadTree(quadTree: QuadTree<IUIComponent>) {
        this.children.forEach(child => {
            quadTree.insert(child)
        })
        this._quadTree.getAllElements().forEach(child => {
            this._quadTree.remove(child)
        })
        this._quadTree = quadTree
    }

    get quadTree(): QuadTree<IUIComponent> {
        return this._quadTree
    }

    alignItems(): void {
        // this.children.forEach(child => {
        //     child.align(this.bounds);
        //     if (child instanceof BaseContainerComponent) {
        //         child.alignItems();
        //     }
        // });
    }

    removeChild(child: IUIComponent): void {
        const index = this.children.indexOf(child as BaseUIComponent)
        if (index !== -1) {
            this.children.splice(index, 1)
        }
        this._quadTree.remove(child)
    }

    getChildren(): IUIComponent[] {
        return this.children
    }

    addChild(component: BaseUIComponent): void {
        this.children.push(component)
        this._quadTree.insert(component)
        this.updateBounds()
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
        this.getChildren().forEach(child => {
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

    protected updateBounds(): void {
        // Abstract method to be implemented by derived classes
    }

    protected updateChildPositions(): void {
        // Abstract method to be implemented by derived classes
    }
}
