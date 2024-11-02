import { BaseUIComponent } from './baseuicomponent.js'
import { Vec2, Vec4 } from '../types.js'

export abstract class BaseContainerComponent extends BaseUIComponent {
    protected children: BaseUIComponent[]
    protected margin: number

    constructor(margin: number = 0) {
        super()
        this.children = []
        this.margin = margin
        this.bounds = [0, 0, 0, 0]
        this.scale = 1.0
        this.isVisible = true
        this.zIndex = 0
    }

    addChild(component: BaseUIComponent): void {
        this.children.push(component)
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

    protected updateBounds(): void {
        // Abstract method to be implemented by derived classes
    }

    protected updateChildPositions(): void {
        // Abstract method to be implemented by derived classes
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