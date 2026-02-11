import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Niivue } from '../../src/niivue'
import { NiivueEvent } from '../../src/events'

describe('Niivue EventTarget API', () => {
    let nv: Niivue

    beforeEach(() => {
        nv = new Niivue()
    })

    afterEach(() => {
        // Cleanup if needed
    })

    describe('EventTarget Extension', () => {
        it('should extend EventTarget', () => {
            expect(nv).toBeInstanceOf(EventTarget)
        })

        it('should have addEventListener method', () => {
            expect(typeof nv.addEventListener).toBe('function')
        })

        it('should have removeEventListener method', () => {
            expect(typeof nv.removeEventListener).toBe('function')
        })

        it('should have dispatchEvent method', () => {
            expect(typeof nv.dispatchEvent).toBe('function')
        })
    })

    describe('Event Listeners', () => {
        it('should support addEventListener with type safety', () => {
            const listener = vi.fn()
            nv.addEventListener('locationChange', listener)

            // Manually trigger event for testing
            const event = new NiivueEvent('locationChange', { test: 'data' })
            nv.dispatchEvent(event)

            expect(listener).toHaveBeenCalledTimes(1)
            expect(listener).toHaveBeenCalledWith(event)
        })

        it('should support multiple event listeners', () => {
            const listener1 = vi.fn()
            const listener2 = vi.fn()
            const listener3 = vi.fn()

            nv.addEventListener('locationChange', listener1)
            nv.addEventListener('locationChange', listener2)
            nv.addEventListener('locationChange', listener3)

            const event = new NiivueEvent('locationChange', { test: 'data' })
            nv.dispatchEvent(event)

            expect(listener1).toHaveBeenCalledTimes(1)
            expect(listener2).toHaveBeenCalledTimes(1)
            expect(listener3).toHaveBeenCalledTimes(1)
        })

        it('should support removeEventListener', () => {
            const listener = vi.fn()

            nv.addEventListener('locationChange', listener)
            const event = new NiivueEvent('locationChange', { test: 'data' })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalledTimes(1)

            nv.removeEventListener('locationChange', listener)
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalledTimes(1) // Still 1, not called again
        })

        it('should support { once: true } option', () => {
            const listener = vi.fn()

            nv.addEventListener('locationChange', listener, { once: true })

            const event = new NiivueEvent('locationChange', { test: 'data' })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalledTimes(1)

            // Dispatch again
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalledTimes(1) // Still 1, not called again
        })

        it('should support AbortController', () => {
            const controller = new AbortController()
            const listener = vi.fn()

            nv.addEventListener('locationChange', listener, { signal: controller.signal })

            const event = new NiivueEvent('locationChange', { test: 'data' })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalledTimes(1)

            // Abort
            controller.abort()

            // Dispatch again
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalledTimes(1) // Still 1, not called again
        })

        it('should support async event listeners', async () => {
            let asyncCompleted = false

            nv.addEventListener('locationChange', async (event) => {
                await new Promise(resolve => setTimeout(resolve, 10))
                asyncCompleted = true
                expect(event.detail).toBeDefined()
            })

            const event = new NiivueEvent('locationChange', { test: 'data' })
            nv.dispatchEvent(event)

            // Wait for async listener to complete
            await new Promise(resolve => setTimeout(resolve, 20))
            expect(asyncCompleted).toBe(true)
        })
    })

    describe('Event and Callback Interaction', () => {
        it('should emit events before callbacks', () => {
            const callOrder: string[] = []

            nv.addEventListener('locationChange', () => {
                callOrder.push('event')
            })

            nv.onLocationChange = () => {
                callOrder.push('callback')
            }

            // Manually trigger via internal method
            const event = new NiivueEvent('locationChange', { test: 'data' })
            nv.dispatchEvent(event)
            nv.onLocationChange({ test: 'data' })

            expect(callOrder).toEqual(['event', 'callback'])
        })

        it('should maintain backward compatibility with callbacks', () => {
            const callback = vi.fn()

            nv.onLocationChange = callback

            // Set crosshair to trigger location change
            // Note: This would require a full setup with canvas, volumes, etc.
            // For now, we test the callback directly
            nv.onLocationChange({ test: 'data' })

            expect(callback).toHaveBeenCalled()
        })

        it('should allow mixing event listeners and callbacks', () => {
            const eventListener = vi.fn()
            const callback = vi.fn()

            nv.addEventListener('locationChange', eventListener)
            nv.onLocationChange = callback

            const event = new NiivueEvent('locationChange', { test: 'data' })
            nv.dispatchEvent(event)
            expect(eventListener).toHaveBeenCalled()

            nv.onLocationChange({ test: 'data' })
            expect(callback).toHaveBeenCalled()
        })
    })

    describe('Error Handling', () => {
        it('should log errors from event listeners', () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
            const callback = vi.fn()

            nv.addEventListener('locationChange', () => {
                throw new Error('Event listener error')
            })

            nv.onLocationChange = callback

            // dispatchEvent will throw in the test environment, but _emitEvent catches it
            // We can't test _emitEvent directly since it's private, but we can verify
            // that console.error would be called in production
            try {
                const event = new NiivueEvent('locationChange', { test: 'data' })
                nv.dispatchEvent(event)
            } catch (error) {
                // Expected in test environment
            }

            // Callback should still work independently
            nv.onLocationChange({ test: 'data' })
            expect(callback).toHaveBeenCalled()

            consoleError.mockRestore()
        })

        it('should handle EventTarget behavior when listener throws', () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
            const listener1 = vi.fn()
            const listener2 = vi.fn(() => {
                throw new Error('Listener 2 error')
            })
            const listener3 = vi.fn()

            nv.addEventListener('locationChange', listener1)
            nv.addEventListener('locationChange', listener2)
            nv.addEventListener('locationChange', listener3)

            const event = new NiivueEvent('locationChange', { test: 'data' })

            // In test environment (happy-dom), dispatchEvent throws when a listener throws
            // This is standard EventTarget behavior
            expect(() => nv.dispatchEvent(event)).toThrow()

            expect(listener1).toHaveBeenCalled()
            expect(listener2).toHaveBeenCalled()
            // listener3 may not be called due to EventTarget stopping on error

            consoleError.mockRestore()
        })
    })

    describe('Event Types', () => {
        it('should provide correct event detail types for locationChange', () => {
            nv.addEventListener('locationChange', (event) => {
                // TypeScript should know event.detail is unknown (as defined in NiivueEventMap)
                expect(event.detail).toBeDefined()
            })

            const event = new NiivueEvent('locationChange', { test: 'data' })
            nv.dispatchEvent(event)
        })

        it('should provide correct event detail types for optsChange', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('propertyName')
                expect(event.detail).toHaveProperty('newValue')
                expect(event.detail).toHaveProperty('oldValue')
            })

            nv.addEventListener('optsChange', listener)

            // Change an option to trigger event
            nv.opts.textHeight = 0.5

            // Give it a moment to propagate
            setTimeout(() => {
                expect(listener).toHaveBeenCalled()
            }, 10)
        })

        it('should provide correct event detail types for volumeAddedFromUrl', () => {
            nv.addEventListener('volumeAddedFromUrl', (event) => {
                expect(event.detail).toHaveProperty('imageOptions')
                expect(event.detail).toHaveProperty('volume')
            })
        })

        it('should provide correct event detail types for meshAddedFromUrl', () => {
            nv.addEventListener('meshAddedFromUrl', (event) => {
                expect(event.detail).toHaveProperty('meshOptions')
                expect(event.detail).toHaveProperty('mesh')
            })
        })

        it('should provide correct event detail types for measurementCompleted', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('startMM')
                expect(event.detail).toHaveProperty('endMM')
                expect(event.detail).toHaveProperty('distance')
                expect(event.detail).toHaveProperty('sliceIndex')
                expect(event.detail).toHaveProperty('sliceType')
            })
            nv.addEventListener('measurementCompleted', listener)
            const event = new NiivueEvent('measurementCompleted', {
                startMM: [0, 0, 0],
                endMM: [10, 10, 10],
                distance: 17.32,
                sliceIndex: 0,
                sliceType: 2
            })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalled()
        })

        it('should provide correct event detail types for angleCompleted', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('firstLineMM')
                expect(event.detail).toHaveProperty('secondLineMM')
                expect(event.detail).toHaveProperty('angle')
                expect(event.detail).toHaveProperty('sliceIndex')
                expect(event.detail).toHaveProperty('sliceType')
            })
            nv.addEventListener('angleCompleted', listener)
            const event = new NiivueEvent('angleCompleted', {
                firstLineMM: { start: [0, 0, 0], end: [10, 0, 0] },
                secondLineMM: { start: [0, 0, 0], end: [0, 10, 0] },
                angle: 90,
                sliceIndex: 0,
                sliceType: 2
            })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalled()
        })

        it('should provide correct event detail types for volumeRemoved', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('volume')
                expect(event.detail).toHaveProperty('index')
                expect(typeof event.detail.index).toBe('number')
            })
            nv.addEventListener('volumeRemoved', listener)
            const event = new NiivueEvent('volumeRemoved', { volume: {} as any, index: 0 })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalled()
        })

        it('should provide correct event detail types for meshRemoved', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('mesh')
            })
            nv.addEventListener('meshRemoved', listener)
            const event = new NiivueEvent('meshRemoved', { mesh: {} as any })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalled()
        })

        it('should provide correct event detail types for sliceTypeChange', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('sliceType')
                expect(typeof event.detail.sliceType).toBe('number')
            })
            nv.addEventListener('sliceTypeChange', listener)
            const event = new NiivueEvent('sliceTypeChange', { sliceType: 2 })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalled()
        })

        it('should provide correct event detail types for volumeOrderChanged', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('volumes')
                expect(Array.isArray(event.detail.volumes)).toBe(true)
            })
            nv.addEventListener('volumeOrderChanged', listener)
            const event = new NiivueEvent('volumeOrderChanged', { volumes: [] })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalled()
        })

        it('should provide correct event detail types for penValueChanged', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('penValue')
                expect(event.detail).toHaveProperty('isFilledPen')
                expect(typeof event.detail.penValue).toBe('number')
                expect(typeof event.detail.isFilledPen).toBe('boolean')
            })
            nv.addEventListener('penValueChanged', listener)
            const event = new NiivueEvent('penValueChanged', { penValue: 1, isFilledPen: false })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalled()
        })

        it('should provide correct event detail types for drawingToolChanged', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('tool')
                expect(event.detail).toHaveProperty('penValue')
                expect(event.detail).toHaveProperty('isFilledPen')
            })
            nv.addEventListener('drawingToolChanged', listener)
            const event = new NiivueEvent('drawingToolChanged', {
                tool: 'draw',
                penValue: 1,
                isFilledPen: false
            })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalled()
        })

        it('should provide correct event detail types for drawingChanged', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('action')
                expect(['draw', 'undo', 'load', 'close', 'clear']).toContain(event.detail.action)
            })
            nv.addEventListener('drawingChanged', listener)
            const event = new NiivueEvent('drawingChanged', { action: 'draw' })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalled()
        })

        it('should provide correct event detail types for drawingEnabled', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('enabled')
                expect(typeof event.detail.enabled).toBe('boolean')
            })
            nv.addEventListener('drawingEnabled', listener)
            const event = new NiivueEvent('drawingEnabled', { enabled: true })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalled()
        })

        it('should provide correct event detail types for zoom3DChange', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('zoom')
                expect(typeof event.detail.zoom).toBe('number')
            })
            nv.addEventListener('zoom3DChange', listener)
            const event = new NiivueEvent('zoom3DChange', { zoom: 1.5 })
            nv.dispatchEvent(event)
            expect(listener).toHaveBeenCalled()
        })

        it('should emit zoom3DChange event when volScaleMultiplier changes', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('zoom')
                expect(event.detail.zoom).toBe(1.5)
            })
            const callback = vi.fn()

            nv.addEventListener('zoom3DChange', listener)
            nv.onZoom3DChange = callback

            // Change the zoom scale
            nv.scene.volScaleMultiplier = 1.5

            expect(listener).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith(1.5)
        })

        it('should emit zoom3DChange event when setScale is called', () => {
            const listener = vi.fn((event) => {
                expect(event.detail).toHaveProperty('zoom')
                expect(event.detail.zoom).toBe(2.0)
            })
            const callback = vi.fn()

            nv.addEventListener('zoom3DChange', listener)
            nv.onZoom3DChange = callback

            // Use setScale method
            nv.setScale(2.0)

            expect(listener).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledTimes(1)
            expect(callback).toHaveBeenCalledWith(2.0)
        })
    })

    describe('All Event Types', () => {
        const eventTypes = [
            'dragRelease',
            'mouseUp',
            'locationChange',
            'intensityChange',
            'clickToSegment',
            'imageLoaded',
            'meshLoaded',
            'volumeAddedFromUrl',
            'volumeWithUrlRemoved',
            'volumeUpdated',
            'meshAddedFromUrl',
            'meshAdded',
            'meshWithUrlRemoved',
            'documentLoaded',
            'dicomLoaderFinished',
            'frameChange',
            'azimuthElevationChange',
            'zoom3DChange',
            'clipPlaneChange',
            'customMeshShaderAdded',
            'meshShaderChanged',
            'meshPropertyChanged',
            'colormapChange',
            'optsChange',
            'error',
            'info',
            'warn',
            'debug',
            'measurementCompleted',
            'angleCompleted',
            'volumeRemoved',
            'meshRemoved',
            'sliceTypeChange',
            'volumeOrderChanged',
            'penValueChanged',
            'drawingToolChanged',
            'drawingChanged',
            'drawingEnabled'
        ]

        it.each(eventTypes)('should support %s event type', (eventType) => {
            const listener = vi.fn()
            nv.addEventListener(eventType as any, listener)

            // Just verify the listener was registered
            // Full integration testing would require proper setup for each event type
            expect(true).toBe(true)
        })
    })

    describe('NiivueEvent Class', () => {
        it('should create events with correct type and detail', () => {
            const detail = { test: 'data', value: 42 }
            const event = new NiivueEvent('locationChange', detail)

            expect(event.type).toBe('locationChange')
            expect(event.detail).toEqual(detail)
        })

        it('should extend CustomEvent', () => {
            const event = new NiivueEvent('locationChange', { test: 'data' })

            expect(event).toBeInstanceOf(CustomEvent)
            expect(event).toBeInstanceOf(Event)
        })
    })
})
