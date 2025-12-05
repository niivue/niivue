/**
 * Event controller helper functions for canvas interaction management.
 * This module provides pure functions for event handling and position calculations.
 *
 * Related to: Event registration, mouse position calculation, resize handling
 */

/**
 * Mouse position relative to an element
 */
export interface RelativePosition {
    x: number
    y: number
}

/**
 * Parameters for calculating device pixel ratio
 */
export interface CalculateDprParams {
    forceDevicePixelRatio: number
}

/**
 * Parameters for resize handling
 */
export interface ResizeParams {
    canvas: HTMLCanvasElement
    gl: WebGL2RenderingContext
    isResizeCanvas: boolean
    forceDevicePixelRatio: number
}

/**
 * Result of resize calculation
 */
export interface ResizeResult {
    dpr: number
    width: number
    height: number
    shouldDraw: boolean
}

/**
 * Event listener configuration for registration
 */
export interface EventListenerConfig {
    type: string
    handler: EventListener
    options?: AddEventListenerOptions
}

/**
 * Get the relative mouse position within a target element.
 * @param event - The mouse event
 * @param target - Optional target element (defaults to event.target)
 * @returns The position relative to the target, or undefined if no target
 */
export function getRelativeMousePosition(event: MouseEvent, target?: EventTarget | null): RelativePosition | undefined {
    const resolvedTarget = target || event.target
    if (!resolvedTarget) {
        return undefined
    }

    // Cast to Element to access getBoundingClientRect
    const element = resolvedTarget as Element
    if (typeof element.getBoundingClientRect !== 'function') {
        return undefined
    }

    const rect = element.getBoundingClientRect()
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    }
}

/**
 * Get mouse position relative to canvas, excluding padding and borders.
 * Currently this is a pass-through to getRelativeMousePosition, but provides
 * a hook for future padding/border adjustments if needed.
 * @param event - The mouse event
 * @param target - The target element
 * @returns The position relative to the canvas, or undefined if no target
 */
export function getNoPaddingNoBorderCanvasRelativeMousePosition(event: MouseEvent, target: EventTarget): RelativePosition | undefined {
    const resolvedTarget = target || event.target
    return getRelativeMousePosition(event, resolvedTarget)
}

/**
 * Calculate the device pixel ratio based on configuration.
 * @param params - Parameters containing forceDevicePixelRatio setting
 * @returns The calculated device pixel ratio
 */
export function calculateDpr(params: CalculateDprParams): number {
    const { forceDevicePixelRatio } = params

    if (forceDevicePixelRatio === 0) {
        return window.devicePixelRatio || 1
    } else if (forceDevicePixelRatio < 0) {
        return 1
    }
    return forceDevicePixelRatio
}

/**
 * Calculate resize dimensions for a canvas.
 * @param params - Parameters containing canvas, gl context, and resize settings
 * @returns The calculated resize result with dpr, dimensions, and whether to draw
 */
export function calculateResizeDimensions(params: ResizeParams): ResizeResult {
    const { canvas, isResizeCanvas, forceDevicePixelRatio } = params

    if (!isResizeCanvas) {
        return {
            dpr: 1,
            width: canvas.width,
            height: canvas.height,
            shouldDraw: true
        }
    }

    const dpr = calculateDpr({ forceDevicePixelRatio })

    let width: number
    let height: number

    const parent = canvas.parentElement
    if (parent && 'width' in parent) {
        width = (parent.width as number) * dpr
        // @ts-expect-error height may not be defined on all HTMLElement types
        height = parent.height * dpr
    } else {
        width = canvas.offsetWidth * dpr
        height = canvas.offsetHeight * dpr
    }

    return {
        dpr,
        width,
        height,
        shouldDraw: true
    }
}

/**
 * Create a debounced resize handler that uses requestAnimationFrame.
 * @param callback - The callback to execute on resize
 * @returns A function suitable for use as a resize event listener
 */
export function createResizeHandler(callback: () => void): () => void {
    return (): void => {
        requestAnimationFrame(() => {
            callback()
        })
    }
}

/**
 * Create a ResizeObserver that calls the provided callback on resize.
 * @param callback - The callback to execute when resize is observed
 * @returns A configured ResizeObserver instance
 */
export function createResizeObserver(callback: () => void): ResizeObserver {
    return new ResizeObserver(() => {
        requestAnimationFrame(() => {
            callback()
        })
    })
}

/**
 * Create a MutationObserver that watches for child list changes.
 * @param callback - The callback to execute when mutations are observed
 * @returns A configured MutationObserver instance
 */
export function createCanvasObserver(callback: (mutations: MutationRecord[]) => void): MutationObserver {
    return new MutationObserver(callback)
}

/**
 * Apply canvas resize styles for full-size display.
 * @param canvas - The canvas element to style
 */
export function applyCanvasResizeStyles(canvas: HTMLCanvasElement): void {
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
}

/**
 * Check if canvas and GL context are valid for resize operations.
 * @param canvas - The canvas element
 * @param gl - The WebGL context
 * @returns True if both are valid
 */
export function isValidForResize(canvas: HTMLCanvasElement | null, gl: WebGL2RenderingContext | null): canvas is HTMLCanvasElement {
    return canvas !== null && gl !== null
}

/**
 * Parameters for creating an AbortController-based event registration
 */
export interface EventRegistrationParams {
    canvas: HTMLCanvasElement
    handlers: {
        mousedown: (e: MouseEvent) => void
        mouseup: (e: MouseEvent) => void
        mousemove: (e: MouseEvent) => void
        mouseleave: (e: MouseEvent) => void
        touchstart: (e: TouchEvent) => void
        touchend: (e: TouchEvent) => void
        touchmove: (e: TouchEvent) => void
        wheel: (e: WheelEvent) => void
        contextmenu: (e: MouseEvent) => void
        dblclick: (e: MouseEvent) => void
        dragenter: (e: DragEvent) => void
        dragover: (e: DragEvent) => void
        drop: (e: DragEvent) => void
        keyup: (e: KeyboardEvent) => void
        keydown: (e: KeyboardEvent) => void
    }
}

/**
 * Register all interaction event listeners on a canvas element.
 * Uses an AbortController for easy cleanup of all listeners.
 * @param params - Parameters containing canvas and event handlers
 * @returns The AbortController that can be used to remove all listeners
 */
export function registerEventListeners(params: EventRegistrationParams): AbortController {
    const { canvas, handlers } = params

    const controller = new AbortController()
    const { signal } = controller

    // Mouse events
    canvas.addEventListener('mousedown', handlers.mousedown, { signal })
    canvas.addEventListener('mouseup', handlers.mouseup, { signal })
    canvas.addEventListener('mousemove', handlers.mousemove, { signal })
    canvas.addEventListener('mouseleave', handlers.mouseleave, { signal })

    // Touch events
    canvas.addEventListener('touchstart', handlers.touchstart, { signal })
    canvas.addEventListener('touchend', handlers.touchend, { signal })
    canvas.addEventListener('touchmove', handlers.touchmove, { signal })

    // Wheel event
    canvas.addEventListener('wheel', handlers.wheel, { signal })

    // Context menu
    canvas.addEventListener('contextmenu', handlers.contextmenu, { signal })

    // Double click
    canvas.addEventListener('dblclick', handlers.dblclick, { signal })

    // Drag and drop
    canvas.addEventListener('dragenter', handlers.dragenter, { signal })
    canvas.addEventListener('dragover', handlers.dragover, { signal })
    canvas.addEventListener('drop', handlers.drop, { signal })

    // Keyboard events (canvas needs tabindex for focus)
    canvas.setAttribute('tabindex', '0')
    canvas.addEventListener('keyup', handlers.keyup, { signal })
    canvas.addEventListener('keydown', handlers.keydown, { signal })

    return controller
}

/**
 * Clean up resize-related observers and listeners.
 * @param resizeObserver - The ResizeObserver to disconnect
 * @param canvasObserver - The MutationObserver to disconnect
 * @param resizeEventListener - The resize event listener to remove
 */
export function cleanupResizeObservers(resizeObserver: ResizeObserver | null, canvasObserver: MutationObserver | null, resizeEventListener: (() => void) | null): void {
    if (resizeEventListener) {
        window.removeEventListener('resize', resizeEventListener)
    }

    if (resizeObserver) {
        resizeObserver.disconnect()
    }

    if (canvasObserver) {
        canvasObserver.disconnect()
    }
}

/**
 * Clean up event controller by aborting all registered listeners.
 * @param controller - The AbortController to abort
 */
export function cleanupEventController(controller: AbortController | null): void {
    if (controller) {
        controller.abort()
    }
}
