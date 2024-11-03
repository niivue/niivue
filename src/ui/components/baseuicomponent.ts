import { IUIComponent } from '../interfaces.js'
import { NVRenderer } from '../nvrenderer.js'
import { Effect, Vec2, Vec4 } from '../types.js'

export abstract class BaseUIComponent implements IUIComponent {
    isVisible: boolean = true
    zIndex: number = 0
    protected position: Vec2 = [0, 0]
    protected bounds: Vec4 = [0, 0, 0, 0]
    protected scale: number = 1
    private eventEffects: Map<string, Effect[]> = new Map()
    public requestRedraw?: () => void

    abstract draw(renderer: NVRenderer): void

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
                const startTime = performance.now()

                const animate = () => {
                    const currentTime = performance.now()
                    const elapsed = currentTime - startTime
                    const progress = Math.min(elapsed / effect.duration, 1)

                    const interpolate = (start: number, end: number, t: number) =>
                        start + (end - start) * t

                    if (Array.isArray(effect.from) && Array.isArray(effect.to)) {
                        const interpolatedValues = effect.from.map((fromValue, index) =>
                            interpolate(fromValue, effect.to[index], progress)
                        )
                        targetObject[property] = interpolatedValues
                    } else if (typeof effect.from === 'number' && typeof effect.to === 'number') {
                        targetObject[property] = interpolate(effect.from, effect.to, progress)
                    }

                    if (this.requestRedraw) {
                        this.requestRedraw()
                    }

                    if (progress < 1) {
                        requestAnimationFrame(animate)
                    }
                }

                animate()
                break
        }
    }

    addEventEffect(event: string, targetObject: any, property: string, effectType: 'setValue' | 'animateValue', valueOrFrom: any, to?: any, duration?: number): void {
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
}
