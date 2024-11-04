import { IUIComponent } from '../interfaces.js'
import { NVRenderer } from '../nvrenderer.js'
import { AlignmentPoint, Effect, HorizontalAlignment, Vec2, Vec4, VerticalAlignment } from '../types.js'
// Applying centralized animation management in BaseUIComponent
import { AnimationManager, Animation } from '../animationmanager.js'

export abstract class BaseUIComponent implements IUIComponent {

    alignmentPoint: AlignmentPoint = AlignmentPoint.NONE
    verticalAlignment: VerticalAlignment = VerticalAlignment.NONE
    horizontalAlignment: HorizontalAlignment = HorizontalAlignment.NONE
    isVisible: boolean = true
    zIndex: number = 0
    protected position: Vec2 = [0, 0]
    protected bounds: Vec4 = [0, 0, 0, 0]
    protected scale: number = 1
    private eventEffects: Map<string, Effect[]> = new Map()
    public requestRedraw?: () => void

    abstract draw(renderer: NVRenderer): void

    align(bounds: Vec4): void {
        let offsetX = 0
        let offsetY = 0

        // Calculate alignment offsets based on alignmentPoint
        switch (this.alignmentPoint) {
            case AlignmentPoint.TOPLEFT:
                offsetX = bounds[0]
                offsetY = bounds[1]
                break
            case AlignmentPoint.TOPCENTER:
                offsetX = bounds[0] + (bounds[2] - this.bounds[2]) / 2
                offsetY = bounds[1]
                break
            case AlignmentPoint.TOPRIGHT:
                offsetX = bounds[0] + (bounds[2] - this.bounds[2])
                offsetY = bounds[1]
                break
            case AlignmentPoint.MIDDLELEFT:
                offsetX = bounds[0]
                offsetY = bounds[1] + (bounds[3] - this.bounds[3]) / 2
                break
            case AlignmentPoint.MIDDLECENTER:
                offsetX = bounds[0] + (bounds[2] - this.bounds[2]) / 2
                offsetY = bounds[1] + (bounds[3] - this.bounds[3]) / 2
                break
            case AlignmentPoint.MIDDLERIGHT:
                offsetX = bounds[0] + (bounds[2] - this.bounds[2])
                offsetY = bounds[1] + (bounds[3] - this.bounds[3]) / 2
                break
            case AlignmentPoint.BOTTOMLEFT:
                offsetX = bounds[0]
                offsetY = bounds[1] + (bounds[3] - this.bounds[3])
                break
            case AlignmentPoint.BOTTOMCENTER:
                offsetX = bounds[0] + (bounds[2] - this.bounds[2]) / 2
                offsetY = bounds[1] + (bounds[3] - this.bounds[3])
                break
            case AlignmentPoint.BOTTOMRIGHT:
                offsetX = bounds[0] + (bounds[2] - this.bounds[2])
                offsetY = bounds[1] + (bounds[3] - this.bounds[3])
                break
            default:
                offsetX = bounds[0]
                offsetY = bounds[1]
        }

        // Set new position
        this.setPosition([offsetX, offsetY])

        // Optionally update scale to fit within bounds
        const scaleX = bounds[2] / this.bounds[2]
        const scaleY = bounds[3] / this.bounds[3]
        this.setScale(Math.min(scaleX, scaleY))
    }


    applyEffect(effect: Effect): void {
        const { targetObject, property } = effect
        switch (effect.type) {
            case 'setValue':
                if (property in targetObject) {
                    targetObject[property] = effect.value
                } else {
                    const setterName = `set${property.charAt(0).toUpperCase()}${property.slice(1)}`
                    if (typeof targetObject[setterName] === 'function') {
                        targetObject[setterName](effect.value)
                    }
                }
                if (this.requestRedraw) {
                    this.requestRedraw()
                }
                break

            case 'animateValue':
                const animationManager = AnimationManager.getInstance()
                const animation = new Animation(targetObject, property, effect.from, effect.to, effect.duration)
                animationManager.addAnimation(animation)
                break
        }
    }

    addEventEffect(event: string, targetObject: any, property: string, effectType: 'setValue' | 'animateValue', valueOrFrom: any, to?: any, duration?: number, isBounce: boolean = false): void {
        const effect: Effect =
            effectType === 'setValue'
                ? {
                    type: 'setValue',
                    targetObject,
                    property,
                    value: valueOrFrom,
                }
                : {
                    type: 'animateValue',
                    targetObject,
                    property,
                    from: valueOrFrom,
                    to: to!,
                    duration: duration!,
                    isBounce
                }

        if (!this.eventEffects.has(event)) {
            this.eventEffects.set(event, [])
        }
        this.eventEffects.get(event)!.push(effect)
    }

    applyEventEffects(eventName: string): void {
        const effects = this.eventEffects.get(eventName)
        if (effects) {
            effects.forEach((effect) => this.applyEffect(effect))
        }
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
        this.bounds = [this.position[0], this.position[1], this.bounds[2], this.bounds[3]]
    }

    getScale(): number {
        return this.scale
    }

    setScale(value: number): void {
        this.scale = value
    }

    getAlignmentPoint(): AlignmentPoint {
        return this.alignmentPoint
    }

    setAlignmentPoint(value: AlignmentPoint): void {
        this.alignmentPoint = value
    }

    getVerticalAlignment(): VerticalAlignment {
        return this.verticalAlignment
    }

    setVerticalAlignment(value: VerticalAlignment): void {
        this.verticalAlignment = value
    }

    getHorizontalAlignment(): HorizontalAlignment {
        return this.horizontalAlignment
    }

    setHorizontalAlignment(value: HorizontalAlignment): void {
        this.horizontalAlignment = value
    }
}
