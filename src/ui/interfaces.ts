// interfaces.ts

import { NVRenderer } from './nvrenderer.js'
import { AlignmentPoint, Color, HorizontalAlignment, Vec2, Vec4, VerticalAlignment } from './types.js'

// interfaces.ts
export interface IUIComponent {
    getBounds(): Vec4;
    setBounds(bounds: Vec4): void;
    getPosition(): Vec2;
    setPosition(position: Vec2): void;
    draw(renderer: NVRenderer): void;
    align(bounds: Vec4): void

    isVisible: boolean;
    zIndex: number;

    getScale(): number;
    setScale(value: number): void;
    applyEventEffects(eventName: string): void;

    requestRedraw?: () => void;

    alignmentPoint: AlignmentPoint;
    verticalAlignment: VerticalAlignment;
    horizontalAlignment: HorizontalAlignment;
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
    alignItems(): void
}
