// AnimationManager singleton for handling animations
export class AnimationManager {
    private static instance: AnimationManager
    private animations: Set<Animation> = new Set()
    private isLowPowerMode: boolean = false
    private requestRedrawCallback?: () => void

    private constructor() { }

    public static getInstance(): AnimationManager {
        if (!AnimationManager.instance) {
            AnimationManager.instance = new AnimationManager()
        }
        return AnimationManager.instance
    }

    public setLowPowerMode(isLowPower: boolean): void {
        this.isLowPowerMode = isLowPower
    }

    public setRequestRedrawCallback(callback: () => void): void {
        this.requestRedrawCallback = callback
    }

    public addAnimation(animation: Animation): void {
        if (this.isLowPowerMode) {
            // Directly set the value without performing the animation
            animation.targetObject[animation.property] = animation.to
            if (animation.property in animation.targetObject) {
                animation.targetObject[animation.property] = animation.to
            } else {
                const setterName = `set${animation.property.charAt(0).toUpperCase()}${animation.property.slice(1)}`
                if (typeof animation.targetObject[setterName] === 'function') {
                    animation.targetObject[setterName](animation.to)
                }
            }
            if (this.requestRedrawCallback) {
                this.requestRedrawCallback()
            }
        } else {
            this.animations.add(animation)
            animation.start(this.requestRedrawCallback)
        }
    }

    public removeAnimation(animation: Animation): void {
        this.animations.delete(animation)
    }

    public update(currentTime: number): void {
        this.animations.forEach((animation) => {
            if (animation.isComplete()) {
                this.animations.delete(animation)
            } else {
                animation.update(currentTime)
                if (this.requestRedrawCallback) {
                    this.requestRedrawCallback()
                }
            }
        })
    }
}

// Animation class to handle each individual animation
export class Animation {
    public targetObject: any
    public property: string
    public from: number | number[]
    public to: number | number[]
    public duration: number
    private startTime: number = 0
    private cancelled: boolean = false
    private redrawCallback?: () => void

    constructor(targetObject: any, property: string, from: number | number[], to: number | number[], duration: number) {
        this.targetObject = targetObject
        this.property = property
        this.from = from
        this.to = to
        this.duration = duration
    }

    public start(redrawCallback?: () => void): void {
        this.startTime = performance.now()
        this.cancelled = false
        this.redrawCallback = redrawCallback
        requestAnimationFrame(this.animate.bind(this))
    }

    public cancel(): void {
        this.cancelled = true
    }

    public isComplete(): boolean {
        return this.cancelled || (performance.now() - this.startTime) >= this.duration
    }

    public update(currentTime: number): void {
        if (this.cancelled) return

        const elapsed = currentTime - this.startTime
        const progress = Math.min(elapsed / this.duration, 1)
        const interpolate = (start: number, end: number, t: number) => start + (end - start) * t

        if (Array.isArray(this.from) && Array.isArray(this.to)) {
            const interpolatedValues = this.from.map((fromValue, index) =>
                interpolate(fromValue, (this.to as number[])[index], progress)
            )
            this.targetObject[this.property] = interpolatedValues
        } else if (typeof this.from === 'number' && typeof this.to === 'number') {
            this.targetObject[this.property] = interpolate(this.from, this.to, progress)
        }

        if (this.redrawCallback) {
            this.redrawCallback()
        }

        if (progress < 1) {
            requestAnimationFrame(this.animate.bind(this))
        }
    }

    private animate(): void {
        this.update(performance.now())
    }
}