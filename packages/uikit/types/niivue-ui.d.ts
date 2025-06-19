import { UIKRenderer } from '../src/uikrenderer'
import { UIKFont } from '../src/assets/uikfont'

/**
 * Type extensions for Niivue to include UIKit properties
 * This file extends the core Niivue interface to include UIKit renderer and font capabilities
 */
declare module '@niivue/niivue' {
  interface Niivue {
    /**
     * UIKit renderer instance for drawing UI elements directly on the WebGL canvas
     * Provides GPU-accelerated rendering of buttons, sliders, text, and other UI components
     */
    ui: UIKRenderer

    /**
     * Default font instance for consistent text rendering across the application
     * Handles font loading, text measurement, and styled text rendering
     */
    defaultFont: UIKFont
  }
}

/**
 * Additional UIKit-specific method extensions for Niivue
 * These methods integrate UIKit components with medical imaging workflows
 */
declare module '@niivue/niivue' {
  interface Niivue {
    /**
     * Initialize UIKit renderer and font system
     * Should be called after WebGL context creation but before first render
     */
    initializeUIKit(fontColor?: number[]): Promise<void>

    /**
     * Enhanced measurement tool using UIKit renderer
     * Overrides the default measurement tool with improved styling and accuracy
     */
    drawMeasurementTool(startXYendXY: number[]): void

    /**
     * Enhanced graph rendering with UIKit components
     * Provides improved time-series visualization for medical imaging data
     */
    drawGraph(): void

    /**
     * Render UIKit overlay elements
     * Called during the main render loop to draw UI components over medical imaging
     */
    renderUIOverlay(): void
  }
}

export {} // Make this file a module 