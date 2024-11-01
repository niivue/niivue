// interfaces.ts

import { NVRenderer } from './nvrenderer.js'
import { Color, Vec2, Vec4 } from './types.js'

export interface IUIComponent {
    getBounds(): Vec4 // Screen coordinates [left, top, width, height]
    setBounds(bounds: Vec4): void
    getPosition(): Vec2 // Screen coordinates [x, y]
    setPosition(position: Vec2): void
    draw(renderer: NVRenderer): void

    // Event handlers
    onClick?(event: MouseEvent): void
    onFocus?(): void
    onBlur?(): void
    onMouseEnter?(event: MouseEvent): void
    onMouseLeave?(event: MouseEvent): void
}

export interface IColorable extends IUIComponent {
    getTextColor(): Color
    setTextColor(color: Color): void
    getBackgroundColor(): Color
    setBackgroundColor(color: Color): void
    getForegroundColor(): Color
    setForegroundColor(color: Color): void
}

export interface IUIContainer extends IUIComponent {
    addChild(child: IUIComponent): void
    removeChild(child: IUIComponent): void
    getChildren(): IUIComponent[]
}
