import { Effect } from './types.js'
import { getObjectProperty, isEqual, setObjectProperty } from './uiUtils.js'

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
  public isBounce: boolean
  public isToggle: boolean
  private onComplete?: (event?: Event) => void // Updated to accept event
  private event?: Event // Store the optional event

  constructor(
    targetObject: any,
    property: string,
    from: number | number[],
    to: number | number[],
    duration: number,
    isBounce: boolean = false,
    isToggle: boolean = false,
    onComplete?: (event?: Event) => void,
    event?: Event
  ) {
    this.targetObject = targetObject
    this.property = property
    this.from = from
    this.to = to
    this.duration = duration
    this.isBounce = isBounce
    this.isToggle = isToggle
    this.onComplete = onComplete
    this.event = event // Store the event
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
    return this.cancelled || performance.now() - this.startTime >= this.duration
  }

  public update(currentTime: number): void {
    if (this.cancelled) {
      return
    }

    const elapsed = currentTime - this.startTime
    let progress = Math.min(elapsed / this.duration, 1)
    if (elapsed > this.duration) {
      setObjectProperty(this.targetObject, this.property, this.to)
      if (this.redrawCallback) {
        this.redrawCallback()
      }
      if (this.onComplete) {
        this.onComplete(this.event) // Pass the event to onComplete
      }
      return
    }

    const interpolate = (start: number, end: number, t: number): number => {
      return start + (end - start) * Math.max(0, Math.min(1, t))
    }

    if (this.isBounce) {
      progress = progress <= 0.5 ? progress * 2 : (1 - progress) * 2
    }

    if (Array.isArray(this.from) && Array.isArray(this.to)) {
      const interpolatedValues = this.from.map((fromValue, index) =>
        interpolate(fromValue, (this.to as number[])[index], progress)
      )

      setObjectProperty(this.targetObject, this.property, interpolatedValues)
    } else if (typeof this.from === 'number' && typeof this.to === 'number') {
      const value = interpolate(this.from, this.to, progress)
      setObjectProperty(this.targetObject, this.property, value)
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

// AnimationManager singleton for handling animations
export class AnimationManager {
  private static instance: AnimationManager
  private animations: Set<Animation> = new Set()
  private isLowPowerMode: boolean = false
  private requestRedrawCallback?: () => void

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
      setObjectProperty(animation.targetObject, animation.property, animation.to)
      if (this.requestRedrawCallback) {
        this.requestRedrawCallback()
      }
    } else {
      // Handle toggle effect for animation
      if (animation.isToggle) {
        const currentValue = getObjectProperty(animation.targetObject, animation.property)
        if (currentValue !== null) {
          const from = animation.from
          const to = animation.to
          const isEqualToFrom = isEqual(currentValue, animation.from)
          animation.from = isEqualToFrom ? from : to
          animation.to = isEqualToFrom ? to : from
        }
      }
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

  public applyEffect(effect: Effect): void {
    switch (effect.type) {
      case 'setValue':
        if (effect.isToggle) {
          const currentValue = getObjectProperty(effect.targetObject, effect.property)
          setObjectProperty(
            effect.targetObject,
            effect.property,
            isEqual(currentValue, effect.value) ? !effect.value : effect.value
          )
        } else {
          setObjectProperty(effect.targetObject, effect.property, effect.value)
        }
        break

      case 'toggleValue':
        {
          const currentValue = getObjectProperty(effect.targetObject, effect.property)
          if (isEqual(currentValue, effect.value1)) {
            setObjectProperty(effect.targetObject, effect.property, effect.value2)
          } else {
            setObjectProperty(effect.targetObject, effect.property, effect.value1)
          }
        }
        break

      case 'animateValue':
        this.addAnimation(
          new Animation(
            effect.targetObject,
            effect.property,
            effect.from,
            effect.to,
            effect.duration,
            effect.isBounce,
            effect.isToggle,
            effect.onComplete,
            effect.event // Pass the event to the animation
          )
        )
        break
    }

    if (this.requestRedrawCallback) {
      this.requestRedrawCallback()
    }
  }
}
