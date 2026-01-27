import type { NVImage, ImageFromUrlOptions } from '@/nvimage'
import type { NVMesh, LoadFromUrlParams } from '@/nvmesh'
import type { NVDocument, NVConfigOptions } from '@/nvdocument'
import type { DragReleaseParams, UIData } from '@/types'

/**
 * Type-safe event map for all Niivue events.
 * Maps event names to their detail types.
 *
 * @example
 * ```typescript
 * // Type-safe event listening
 * niivue.addEventListener('locationChange', (event) => {
 *   // event.detail is typed based on the event name
 *   console.log('Location changed:', event.detail)
 * })
 * ```
 */
export interface NiivueEventMap {
  // User interaction events
  /** Fired when a drag operation is released */
  dragRelease: DragReleaseParams
  /** Fired when mouse button is released */
  mouseUp: Partial<UIData>
  /** Fired when the crosshair location changes */
  locationChange: unknown
  /** Fired when intensity values change at the crosshair location */
  intensityChange: NVImage
  /** Fired when a click-to-segment operation completes */
  clickToSegment: { mm3: number; mL: number }

  // Loading events
  /** Fired when an image/volume is loaded */
  imageLoaded: NVImage
  /** Fired when a mesh is loaded */
  meshLoaded: NVMesh
  /** Fired when a volume is added from a URL */
  volumeAddedFromUrl: { imageOptions: ImageFromUrlOptions; volume: NVImage }
  /** Fired when a volume loaded from a URL is removed */
  volumeWithUrlRemoved: { url: string }
  /** Fired when a volume is updated */
  volumeUpdated: void
  /** Fired when a mesh is added from a URL */
  meshAddedFromUrl: { meshOptions: LoadFromUrlParams; mesh: NVMesh }
  /** Fired when a mesh is added */
  meshAdded: void
  /** Fired when a mesh loaded from a URL is removed */
  meshWithUrlRemoved: { url: string }
  /** Fired when a document is loaded */
  documentLoaded: NVDocument
  /** Fired when DICOM loader finishes processing images */
  dicomLoaderFinished: { files: (NVImage | NVMesh)[] }

  // Playback events
  /** Fired when the frame changes in a 4D volume */
  frameChange: { volume: NVImage; index: number }

  // View control events
  /** Fired when azimuth or elevation angles change in 3D view */
  azimuthElevationChange: { azimuth: number; elevation: number }
  /** Fired when 3D view zoom level changes */
  zoom3DChange: { zoom: number }
  /** Fired when clip plane changes */
  clipPlaneChange: { clipPlane: number[] }

  // Shader events
  /** Fired when a custom mesh shader is added */
  customMeshShaderAdded: { fragmentShaderText: string; name: string }
  /** Fired when a mesh's shader is changed */
  meshShaderChanged: { meshIndex: number; shaderIndex: number }
  /** Fired when a mesh property is changed */
  meshPropertyChanged: { meshIndex: number; key: string; value: unknown }

  // Rendering events
  /** Fired when the colormap changes */
  colormapChange: void

  // Configuration events
  /** Fired when visualization options change */
  optsChange: {
    propertyName: keyof NVConfigOptions
    newValue: NVConfigOptions[keyof NVConfigOptions]
    oldValue: NVConfigOptions[keyof NVConfigOptions]
  }

  // Logging events
  /** Fired on error messages */
  error: { message?: string }
  /** Fired on info messages */
  info: { message?: string }
  /** Fired on warning messages */
  warn: { message?: string }
  /** Fired on debug messages */
  debug: { message?: string }
}

/**
 * Type-safe event class for Niivue events.
 * Extends CustomEvent with typed detail property.
 */
export class NiivueEvent<K extends keyof NiivueEventMap> extends CustomEvent<NiivueEventMap[K]> {
  constructor(type: K, detail: NiivueEventMap[K]) {
    super(type, { detail })
  }
}

/**
 * Type-safe event listener for Niivue events.
 * Listeners can be synchronous or asynchronous.
 */
export type NiivueEventListener<K extends keyof NiivueEventMap> = (
  event: NiivueEvent<K>
) => void | Promise<void>

/**
 * Options for addEventListener/removeEventListener.
 * Supports all standard EventTarget options including:
 * - capture: boolean - Use capture phase
 * - once: boolean - Remove listener after first invocation
 * - passive: boolean - Listener will never call preventDefault()
 * - signal: AbortSignal - Remove listener when signal is aborted
 */
export type NiivueEventListenerOptions = boolean | AddEventListenerOptions
