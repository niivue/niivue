import { v4 as uuidv4 } from '@lukeed/uuid'
import { IUIComponent } from '../interfaces.js'
import { NVRenderer } from '../nvrenderer.js'
import { AlignmentPoint, Effect, HorizontalAlignment, Vec2, Vec4, VerticalAlignment } from '../types.js'
// Applying centralized animation management in BaseUIComponent
import { AnimationManager, Animation } from '../animationmanager.js'
import { getObjectProperty, isEqual, setObjectProperty } from '../uiutils.js'

export abstract class BaseUIComponent implements IUIComponent {
  alignmentPoint: AlignmentPoint = AlignmentPoint.NONE
  verticalAlignment: VerticalAlignment = VerticalAlignment.NONE
  horizontalAlignment: HorizontalAlignment = HorizontalAlignment.NONE
  isVisible: boolean = true
  zIndex: number = 0
  id: string = uuidv4()
  tags: string[] = []
  className: string
  protected position: Vec2 = [0, 0]
  protected bounds: Vec4 = [0, 0, 0, 0]
  protected scale: number = 1
  private eventEffects: Map<string, Effect[]> = new Map()
  public requestRedraw?: () => void

  // Event handlers
  public onPointerUp?: (event: MouseEvent) => void
  public onPointerEnter?: (event: MouseEvent) => void
  public onPointerLeave?: (event: MouseEvent) => void

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
        setObjectProperty(targetObject, property, effect.value)
        if (this.requestRedraw) {
          this.requestRedraw()
        }

        if (effect.onComplete) {
          effect.onComplete(effect.event)
        }
        break

      case 'animateValue':
        {
          const animationManager = AnimationManager.getInstance()
          const animation = new Animation(
            targetObject,
            property,
            effect.from,
            effect.to,
            effect.duration,
            effect.isBounce,
            effect.isToggle,
            effect.onComplete,
            effect.event
          )
          animationManager.addAnimation(animation)
        }
        break

      case 'toggleValue': {
        const currentValue = getObjectProperty(targetObject, property)
        if (isEqual(currentValue, effect.value1)) {
          setObjectProperty(effect.targetObject, property, effect.value2)
        } else {
          setObjectProperty(effect.targetObject, property, effect.value1)
        }
        if (effect.onComplete) {
          effect.onComplete(effect.event)
        }
      }
    }
  }

  addEventEffect(
    event: string,
    targetObject: any,
    property: string,
    effectType: 'setValue' | 'animateValue' | 'toggleValue',
    valueOrFrom: any,
    to?: any,
    duration?: number,
    isBounce: boolean = false,
    isToggle: boolean = false,
    onComplete?: (event?: Event) => void // New onComplete handler
  ): void {
    let effect: Effect
    switch (effectType) {
      case 'setValue':
        effect = {
          type: 'setValue',
          targetObject,
          property,
          value: valueOrFrom,
          isToggle,
          onComplete // Assign onComplete
        }
        break
      case 'toggleValue':
        effect = {
          type: 'toggleValue',
          targetObject,
          property,
          value1: valueOrFrom,
          value2: to,
          onComplete // Assign onComplete
        }
        break
      case 'animateValue':
        effect = {
          type: 'animateValue',
          targetObject,
          property,
          from: valueOrFrom,
          to: to!,
          duration: duration!,
          isBounce,
          isToggle,
          onComplete // Assign onComplete
        }
        break
    }

    if (!this.eventEffects.has(event)) {
      this.eventEffects.set(event, [])
    }
    this.eventEffects.get(event)!.push(effect)
  }

  applyEventEffects(eventName: string): void {
    if (!eventName) {
      return
    }
    const eventNameLC = eventName.toLowerCase()
    const effects = this.eventEffects.get(eventNameLC)
    if (effects) {
      effects.forEach((effect) => this.applyEffect(effect))
    }

    // Trigger user-defined event handlers
    switch (eventName.toLowerCase()) {
      case 'pointerup':
        if (this.onPointerUp) {
          this.onPointerUp(new PointerEvent('pointerup'))
        }
        break
      case 'pointerenter':
        if (this.onPointerEnter) {
          this.onPointerEnter(new PointerEvent('pointerenter'))
        }
        break
      case 'pointerleave':
        if (this.onPointerLeave) {
          this.onPointerLeave(new PointerEvent('pointerleave'))
        }
        break
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

  toJSON(): object {
    return {
      id: this.id,
      className: this.className, // Include class name here
      alignmentPoint: this.alignmentPoint,
      verticalAlignment: this.verticalAlignment,
      horizontalAlignment: this.horizontalAlignment,
      isVisible: this.isVisible,
      zIndex: this.zIndex,
      tags: this.tags,
      position: this.position,
      bounds: this.bounds,
      scale: this.scale,
      eventEffects: Array.from(this.eventEffects.entries()).map(([event, effects]) => ({
        event,
        effects: effects.map((effect) => ({
          type: effect.type,
          targetObjectId: effect.targetObject?.id,
          property: effect.property,
          value: effect.type === 'setValue' ? effect.value : undefined,
          from: effect.type === 'animateValue' ? effect.from : undefined,
          to: effect.type === 'animateValue' ? effect.to : undefined,
          duration: effect.type === 'animateValue' ? effect.duration : undefined,
          isBounce: effect.type === 'animateValue' ? effect.isBounce : undefined,
          value1: effect.type === 'toggleValue' ? effect.value1 : undefined,
          value2: effect.type === 'toggleValue' ? effect.value2 : undefined
        }))
      }))
    }
  }
}
