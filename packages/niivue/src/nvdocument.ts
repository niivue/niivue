import { serialize, deserialize } from '@ungap/structured-clone'
import { vec3, vec4 } from 'gl-matrix'
import { NVUtilities } from '@/nvutilities'
import { ImageFromUrlOptions, NVIMAGE_TYPE, NVImage } from '@/nvimage'
import { MeshType, NVMesh } from '@/nvmesh'
import { NVLabel3D } from '@/nvlabel'
import { NVConnectome } from '@/nvconnectome'
import { log } from '@/logger'

/**
 * Represents a completed measurement between two points
 */
export interface CompletedMeasurement {
  startMM: vec3 // World coordinates in mm for start point
  endMM: vec3 // World coordinates in mm for end point
  distance: number // Distance between points in mm
  sliceIndex: number
  sliceType: SLICE_TYPE
  slicePosition: number
}

/**
 * Represents a completed angle measurement between two lines
 */
export interface CompletedAngle {
  firstLineMM: { start: vec3; end: vec3 } // World coordinates in mm for first line
  secondLineMM: { start: vec3; end: vec3 } // World coordinates in mm for second line
  angle: number // Angle in degrees
  sliceIndex: number
  sliceType: SLICE_TYPE
  slicePosition: number
}

/**
 * Slice Type
 * @ignore
 */
export enum SLICE_TYPE {
  AXIAL = 0,
  CORONAL = 1,
  SAGITTAL = 2,
  MULTIPLANAR = 3,
  RENDER = 4
}

export enum PEN_TYPE {
  PEN = 0,
  RECTANGLE = 1,
  ELLIPSE = 2
}

export enum SHOW_RENDER {
  NEVER = 0,
  ALWAYS = 1,
  AUTO = 2
}

/**
 * Multi-planar layout
 * @ignore
 */
export enum MULTIPLANAR_TYPE {
  AUTO = 0,
  COLUMN = 1,
  GRID = 2,
  ROW = 3
}

/**
 * Drag mode
 * @ignore
 */
export enum DRAG_MODE {
  none = 0,
  contrast = 1,
  measurement = 2,
  pan = 3,
  slicer3D = 4,
  callbackOnly = 5,
  roiSelection = 6,
  angle = 7,
  crosshair = 8,
  windowing = 9
}

export interface MouseEventConfig {
  leftButton: {
    primary: DRAG_MODE
    withShift?: DRAG_MODE
    withCtrl?: DRAG_MODE
  }
  rightButton: DRAG_MODE
  centerButton: DRAG_MODE
}

export interface TouchEventConfig {
  singleTouch: DRAG_MODE
  doubleTouch: DRAG_MODE
}

export enum COLORMAP_TYPE {
  MIN_TO_MAX = 0,
  ZERO_TO_MAX_TRANSPARENT_BELOW_MIN = 1,
  ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN = 2
}

// make mutable type
type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

/**
 * NVConfigOptions
 */
export type NVConfigOptions = {
  // 0 for no text, fraction of canvas min(height,width)
  textHeight: number
  fontSizeScaling: number
  fontMinPx: number
  // 0 for no colorbars, fraction of Nifti j dimension
  colorbarHeight: number
  // -1 for automatic (full width), positive number for custom width in pixels
  colorbarWidth: number
  showColorbarBorder: boolean // show border around the colorbar
  // 0 for no crosshairs
  crosshairWidth: number
  crosshairWidthUnit: 'voxels' | 'mm' | 'percent'
  crosshairGap: number
  rulerWidth: number
  show3Dcrosshair: boolean
  backColor: number[]
  crosshairColor: number[]
  fontColor: Float32List
  selectionBoxColor: number[]
  clipPlaneColor: number[]
  paqdUniforms: number[]
  clipThick: number
  clipVolumeLow: number[]
  clipVolumeHigh: number[]
  rulerColor: number[]
  // x axis margin around color bar, clip space coordinates
  colorbarMargin: number
  // if true do not calculate cal_min or cal_max if set in image header. If false, always calculate display intensity range.
  trustCalMinMax: boolean
  // keyboard short cut to activate the clip plane
  clipPlaneHotKey: string
  // keyboard shortcut to switch view modes
  viewModeHotKey: string
  doubleTouchTimeout: number
  longTouchTimeout: number
  // default debounce time used in keyup listeners
  keyDebounceTime: number
  isNearestInterpolation: boolean
  atlasOutline: number
  atlasActiveIndex: number
  isRuler: boolean
  isColorbar: boolean
  isOrientCube: boolean
  tileMargin: number
  multiplanarPadPixels: number
  // @deprecated
  multiplanarForceRender: boolean
  multiplanarEqualSize: boolean
  multiplanarShowRender: SHOW_RENDER
  isRadiologicalConvention: boolean
  // string to allow infinity
  meshThicknessOn2D: number | string
  dragMode: DRAG_MODE
  dragModePrimary: DRAG_MODE
  mouseEventConfig?: MouseEventConfig
  touchEventConfig?: TouchEventConfig
  yoke3Dto2DZoom: boolean
  isDepthPickMesh: boolean
  isCornerOrientationText: boolean
  isOrientationTextVisible: boolean
  showAllOrientationMarkers: boolean
  heroImageFraction: number
  heroSliceType: SLICE_TYPE
  // sagittal slices can have Y+ going left or right
  sagittalNoseLeft: boolean
  isSliceMM: boolean
  // V1 image overlays can show vectors as per-pixel lines
  isV1SliceShader: boolean
  forceDevicePixelRatio: number
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'
  loadingText: string
  isForceMouseClickToVoxelCenters: boolean
  dragAndDropEnabled: boolean
  // drawing disabled by default
  drawingEnabled: boolean
  // sets drawing color. see "drawPt"
  penValue: number
  // pen drawing type: 'pen' for freehand, 'rectangle' for rectangular masks, 'ellipse' for elliptical masks
  penType: PEN_TYPE
  // does a voxel have 6 (face), 18 (edge) or 26 (corner) neighbors
  floodFillNeighbors: number
  isFilledPen: boolean
  thumbnail: string
  maxDrawUndoBitmaps: number
  sliceType: SLICE_TYPE
  isAntiAlias: boolean | null
  isAdditiveBlend: boolean
  // TODO all following fields were previously not included in the typedef
  // Allow canvas width and height to resize (false for fixed size)
  isResizeCanvas: boolean
  meshXRay: number
  limitFrames4D: number
  // if a document has labels the default is to show them
  showLegend: boolean
  legendBackgroundColor: number[]
  legendTextColor: number[]
  multiplanarLayout: MULTIPLANAR_TYPE
  renderOverlayBlend: number
  sliceMosaicString: string
  centerMosaic: boolean
  // attach mouse click and touch screen event handlers for the canvas
  interactive: boolean
  penSize: number
  clickToSegment: boolean
  clickToSegmentRadius: number
  clickToSegmentBright: boolean
  clickToSegmentAutoIntensity: boolean // new option, but keep clickToSegmentBright for backwards compatibility
  clickToSegmentIntensityMax: number // also covers NaN
  clickToSegmentIntensityMin: number // also covers NaN
  clickToSegmentPercent: number
  clickToSegmentMaxDistanceMM: number // max distance in mm to consider for click to segment flood fill
  clickToSegmentIs2D: boolean
  // selection box outline thickness
  selectionBoxLineThickness: number
  selectionBoxIsOutline: boolean
  scrollRequiresFocus: boolean
  showMeasureUnits: boolean
  // measureTextJustify: "origin" | "terminus" | "center"
  measureTextJustify: 'start' | 'center' | 'end' // similar to flexbox justify start, end, center
  measureTextColor: number[]
  measureLineColor: number[]
  measureTextHeight: number
  isAlphaClipDark: boolean
  gradientOrder: number
  gradientOpacity: number
  renderSilhouette: number
  gradientAmount: number
  invertScrollDirection: boolean
  is2DSliceShader: boolean
}

export const DEFAULT_OPTIONS: NVConfigOptions = {
  textHeight: -1.0,
  fontSizeScaling: 0.4,
  fontMinPx: 13,
  colorbarHeight: 0.05,
  colorbarWidth: -1, // automatic (full width)
  showColorbarBorder: true, // show border around the colorbar
  crosshairWidth: 1,
  crosshairWidthUnit: 'voxels',
  crosshairGap: 0,
  rulerWidth: 4,
  show3Dcrosshair: false,
  backColor: [0, 0, 0, 1],
  crosshairColor: [1, 0, 0, 1],
  fontColor: [0.5, 0.5, 0.5, 1],
  selectionBoxColor: [1, 1, 1, 0.5],
  clipPlaneColor: [0.7, 0, 0.7, 0.5],
  paqdUniforms: [0.3, 0.5, 0.5, 1.0],
  // paqdUniforms: [0.3, 0.9, 1.0, 0.5],
  clipThick: 2,
  clipVolumeLow: [0, 0, 0],
  clipVolumeHigh: [1.0, 1.0, 1.0],
  rulerColor: [1, 0, 0, 0.8],
  colorbarMargin: 0.05,
  trustCalMinMax: true,
  clipPlaneHotKey: 'KeyC',
  viewModeHotKey: 'KeyV',
  doubleTouchTimeout: 500,
  longTouchTimeout: 1000,
  keyDebounceTime: 50,
  isNearestInterpolation: false,
  isResizeCanvas: true,
  atlasOutline: 0,
  atlasActiveIndex: 0,
  isRuler: false,
  isColorbar: false,
  isOrientCube: false,
  tileMargin: 0,
  multiplanarPadPixels: 0,
  // @deprecated
  multiplanarForceRender: false,
  multiplanarEqualSize: false,
  multiplanarShowRender: SHOW_RENDER.AUTO, // auto is the same behaviour as multiplanarForceRender: false
  isRadiologicalConvention: false,
  meshThicknessOn2D: Infinity,
  dragMode: DRAG_MODE.contrast,
  dragModePrimary: DRAG_MODE.crosshair,
  mouseEventConfig: undefined,
  touchEventConfig: undefined,
  yoke3Dto2DZoom: false,
  isDepthPickMesh: false,
  isCornerOrientationText: false,
  isOrientationTextVisible: true,
  showAllOrientationMarkers: false,
  heroImageFraction: 0,
  heroSliceType: SLICE_TYPE.RENDER,
  sagittalNoseLeft: false,
  isSliceMM: false,
  isV1SliceShader: false,
  forceDevicePixelRatio: 0,
  logLevel: 'info',
  loadingText: 'loading ...',
  isForceMouseClickToVoxelCenters: false,
  dragAndDropEnabled: true,
  drawingEnabled: false,
  penValue: 1,
  penType: PEN_TYPE.PEN,
  floodFillNeighbors: 6,
  isFilledPen: false,
  thumbnail: '',
  maxDrawUndoBitmaps: 8,
  sliceType: SLICE_TYPE.MULTIPLANAR,
  meshXRay: 0.0,
  isAntiAlias: null,
  limitFrames4D: NaN,
  isAdditiveBlend: false,
  showLegend: true,
  legendBackgroundColor: [0.3, 0.3, 0.3, 0.5],
  legendTextColor: [1.0, 1.0, 1.0, 1.0],
  multiplanarLayout: MULTIPLANAR_TYPE.AUTO,
  renderOverlayBlend: 1.0,
  sliceMosaicString: '',
  centerMosaic: false,
  penSize: 1, // in voxels, since all drawing is done using bitmap indices
  interactive: true,
  clickToSegment: false,
  clickToSegmentRadius: 3, // in mm
  clickToSegmentBright: true,
  clickToSegmentAutoIntensity: false, // new option, but keep clickToSegmentBright for backwards compatibility
  clickToSegmentIntensityMax: NaN, // NaN will use auto threshold (default flood fill behavior from before)
  clickToSegmentIntensityMin: NaN, // NaN will use auto threshold (default flood fill behavior from before)
  // 0 will use auto threshold (default flood fill behavior from before)
  // Take the voxel intensity at the click point and use this percentage +/- to threshold the flood fill operation.
  // If greater than 0, clickedVoxelIntensity +/- clickedVoxelIntensity * clickToSegmentPercent will be used
  // for the clickToSegmentIntensityMin and clickToSegmentIntensityMax values.
  clickToSegmentPercent: 0,
  clickToSegmentMaxDistanceMM: Number.POSITIVE_INFINITY, // default value is infinity for backwards compatibility with flood fill routine.
  clickToSegmentIs2D: false,
  selectionBoxLineThickness: 4,
  selectionBoxIsOutline: false,
  scrollRequiresFocus: false, // determines if the cavas need to be focused to scroll
  showMeasureUnits: true, // e.g. 20.2 vs 20.2 mm
  measureTextJustify: 'center', // start, center, end
  measureTextColor: [1, 0, 0, 1], // red
  measureLineColor: [1, 0, 0, 1], // red
  measureTextHeight: 0.06,
  isAlphaClipDark: false,
  gradientOrder: 1,
  gradientOpacity: 0.0,
  renderSilhouette: 0.0,
  gradientAmount: 0.0,
  invertScrollDirection: false,
  is2DSliceShader: false
}

type SceneData = {
  gamma: number
  azimuth: number
  elevation: number
  crosshairPos: vec3
  clipPlane: number[]
  clipPlaneDepthAziElev: number[]
  volScaleMultiplier: number
  pan2Dxyzmm: vec4
  clipThick: number
  clipVolumeLow: number[]
  clipVolumeHigh: number[]
}

export const INITIAL_SCENE_DATA = {
  gamma: 1.0,
  azimuth: 110,
  elevation: 10,
  crosshairPos: vec3.fromValues(0.5, 0.5, 0.5),
  clipPlane: [0, 0, 0, 0],
  clipPlaneDepthAziElev: [2, 0, 0],
  volScaleMultiplier: 1.0,
  pan2Dxyzmm: vec4.fromValues(0, 0, 0, 1),
  clipThick: 2.0,
  clipVolumeLow: [0, 0, 0],
  clipVolumeHigh: [1.0, 1.0, 1.0]
}

export type Scene = {
  onAzimuthElevationChange: (azimuth: number, elevation: number) => void
  onZoom3DChange: (scale: number) => void
  sceneData: SceneData
  renderAzimuth: number
  renderElevation: number
  volScaleMultiplier: number
  crosshairPos: vec3
  clipPlane: number[]
  clipPlaneDepthAziElev: number[]
  pan2Dxyzmm: vec4
  _elevation?: number
  _azimuth?: number
  gamma?: number
}

export type DocumentData = {
  title?: string
  imageOptionsArray?: ImageFromUrlOptions[]
  meshOptionsArray?: unknown[]
  opts?: Partial<NVConfigOptions>
  previewImageDataURL?: string
  labels?: NVLabel3D[]
  encodedImageBlobs?: string[]
  encodedDrawingBlob?: string
  meshesString?: string
  sceneData?: Partial<SceneData>
  connectomes?: string[]
  customData?: string
  completedMeasurements?: CompletedMeasurement[]
  completedAngles?: CompletedAngle[]
}

export type ExportDocumentData = {
  // base64 encoded images
  encodedImageBlobs: string[]
  // base64 encoded drawing
  encodedDrawingBlob: string
  // dataURL of the preview image
  previewImageDataURL: string
  // map of image ids to image options
  imageOptionsMap: Map<string, number>
  // array of image options to recreate images
  imageOptionsArray: ImageFromUrlOptions[]
  // data to recreate a scene
  sceneData: Partial<SceneData>
  // configuration options of {@link Niivue} instance
  opts: NVConfigOptions
  // encoded meshes
  meshesString: string
  // TODO the following fields were missing in the typedef
  labels: NVLabel3D[]
  connectomes: string[]
  customData: string
  completedMeasurements: CompletedMeasurement[]
  completedAngles: CompletedAngle[]
}

/**
 * Returns a partial configuration object containing only the fields in the provided
 * options that differ from the DEFAULT_OPTIONS.
 *
 * This is used to reduce the size of the saved document by omitting any fields
 * that match the default values.
 *
 * Array fields are compared element-wise, and any mismatch will result in the
 * entire array being included in the diff.
 *
 * @param opts - The configuration options to compare against DEFAULT_OPTIONS
 * @returns A Partial<NVConfigOptions> object with only the differing fields
 */
function diffOptions(opts: NVConfigOptions, defaults: NVConfigOptions): Partial<NVConfigOptions> {
  const diff: Partial<NVConfigOptions> = {}
  for (const key in opts) {
    const value = opts[key]
    const def = defaults[key]
    const isArray = Array.isArray(value) && Array.isArray(def)

    if ((isArray && value.some((v, i) => v !== def[i])) || (!isArray && value !== def)) {
      diff[key] = value
    }
  }
  return diff
}

/**
 * Creates and instance of NVDocument
 * @ignore
 */
export class NVDocument {
  data: DocumentData = {
    title: 'Untitled document',
    imageOptionsArray: [],
    meshOptionsArray: [],
    opts: { ...DEFAULT_OPTIONS },
    previewImageDataURL: '',
    labels: [],
    encodedImageBlobs: [],
    encodedDrawingBlob: ''
  }

  scene: Scene

  volumes: NVImage[] = []
  meshDataObjects?: Array<NVMesh | NVConnectome>
  meshes: Array<NVMesh | NVConnectome> = []
  drawBitmap: Uint8Array | null = null
  imageOptionsMap = new Map()
  meshOptionsMap = new Map()
  completedMeasurements: CompletedMeasurement[] = []
  completedAngles: CompletedAngle[] = []

  private _optsProxy: NVConfigOptions | null = null
  private _optsChangeCallback:
    | ((
        propertyName: keyof NVConfigOptions,
        newValue: NVConfigOptions[keyof NVConfigOptions],
        oldValue: NVConfigOptions[keyof NVConfigOptions]
      ) => void)
    | null = null

  constructor() {
    this.scene = {
      onAzimuthElevationChange: (): void => {},
      onZoom3DChange: (): void => {},
      sceneData: {
        ...INITIAL_SCENE_DATA,
        pan2Dxyzmm: vec4.fromValues(0, 0, 0, 1),
        crosshairPos: vec3.fromValues(0.5, 0.5, 0.5)
      },

      get renderAzimuth(): number {
        return this.sceneData.azimuth
      },
      set renderAzimuth(azimuth: number) {
        this.sceneData.azimuth = azimuth
        if (this.onAzimuthElevationChange) {
          this.onAzimuthElevationChange(this.sceneData.azimuth, this.sceneData.elevation)
        }
      },

      get renderElevation(): number {
        return this.sceneData.elevation
      },
      set renderElevation(elevation: number) {
        this.sceneData.elevation = elevation
        if (this.onAzimuthElevationChange) {
          this.onAzimuthElevationChange(this.sceneData.azimuth, this.sceneData.elevation)
        }
      },

      get volScaleMultiplier(): number {
        return this.sceneData.volScaleMultiplier
      },
      set volScaleMultiplier(scale: number) {
        this.sceneData.volScaleMultiplier = scale
        this.onZoom3DChange(scale)
      },

      get crosshairPos(): vec3 {
        return this.sceneData.crosshairPos
      },
      set crosshairPos(crosshairPos: vec3) {
        this.sceneData.crosshairPos = crosshairPos
      },

      get clipPlane(): number[] {
        return this.sceneData.clipPlane
      },
      set clipPlane(clipPlane) {
        this.sceneData.clipPlane = clipPlane
      },

      get clipPlaneDepthAziElev(): number[] {
        return this.sceneData.clipPlaneDepthAziElev
      },
      set clipPlaneDepthAziElev(clipPlaneDepthAziElev: number[]) {
        this.sceneData.clipPlaneDepthAziElev = clipPlaneDepthAziElev
      },

      get pan2Dxyzmm(): vec4 {
        return this.sceneData.pan2Dxyzmm
      },

      /**
       * Sets current 2D pan in 3D mm
       */
      set pan2Dxyzmm(pan2Dxyzmm) {
        this.sceneData.pan2Dxyzmm = pan2Dxyzmm
      },

      get gamma(): number {
        return this.sceneData.gamma
      },

      /**
       * Sets current gamma
       */
      set gamma(newGamma) {
        this.sceneData.gamma = newGamma
      }
    }
  }

  /**
   * Title of the document
   */
  get title(): string {
    return this.data.title
  }

  /**
   * Gets preview image blob
   * @returns dataURL of preview image
   */
  get previewImageDataURL(): string {
    return this.data.previewImageDataURL
  }

  /**
   * Sets preview image blob
   * @param dataURL - encoded preview image
   */
  set previewImageDataURL(dataURL: string) {
    this.data.previewImageDataURL = dataURL
  }

  /**
   * @param title - title of document
   */
  set title(title: string) {
    this.data.title = title
  }

  get imageOptionsArray(): ImageFromUrlOptions[] {
    return this.data.imageOptionsArray
  }

  /**
   * Gets the base 64 encoded blobs of associated images
   */
  get encodedImageBlobs(): string[] {
    return this.data.encodedImageBlobs
  }

  /**
   * Gets the base 64 encoded blob of the associated drawing
   * TODO the return type was marked as string[] here, was that an error?
   */
  get encodedDrawingBlob(): string {
    return this.data.encodedDrawingBlob
  }

  /**
   * Gets the options of the {@link Niivue} instance
   */
  get opts(): NVConfigOptions {
    if (!this._optsProxy) {
      this._createOptsProxy()
    }
    return this._optsProxy as NVConfigOptions
  }

  /**
   * Sets the options of the {@link Niivue} instance
   */
  set opts(opts) {
    this.data.opts = { ...opts }
    this._optsProxy = null // Force recreation of proxy
  }

  /**
   * Gets the 3D labels of the {@link Niivue} instance
   */
  get labels(): NVLabel3D[] {
    return this.data.labels
  }

  /**
   * Sets the 3D labels of the {@link Niivue} instance
   */
  set labels(labels: NVLabel3D[]) {
    this.data.labels = labels
  }

  get customData(): string | undefined {
    return this.data.customData
  }

  set customData(data: string) {
    this.data.customData = data
  }

  /**
   * Checks if document has an image by id
   */
  hasImage(image: NVImage): boolean {
    return this.volumes.find((i) => i.id === image.id) !== undefined
  }

  /**
   * Checks if document has an image by url
   */
  hasImageFromUrl(url: string): boolean {
    return this.data.imageOptionsArray.find((i) => i.url === url) !== undefined
  }

  /**
   * Adds an image and the options an image was created with
   */
  addImageOptions(image: NVImage, imageOptions: ImageFromUrlOptions): void {
    if (!this.hasImage(image)) {
      if (!imageOptions.name) {
        if (imageOptions.url) {
          const absoluteUrlRE = /^(?:[a-z+]+:)?\/\//i
          const url = absoluteUrlRE.test(imageOptions.url)
            ? new URL(imageOptions.url)
            : new URL(imageOptions.url, window.location.href)

          imageOptions.name = url.pathname.split('/').pop()! // TODO guaranteed?
          if (imageOptions.name.toLowerCase().endsWith('.gz')) {
            imageOptions.name = imageOptions.name.slice(0, -3)
          }

          if (!imageOptions.name.toLowerCase().endsWith('.nii')) {
            imageOptions.name += '.nii'
          }
        } else {
          imageOptions.name = 'untitled.nii'
        }
      }
    }

    imageOptions.imageType = NVIMAGE_TYPE.NII

    this.data.imageOptionsArray.push(imageOptions)
    this.imageOptionsMap.set(image.id, this.data.imageOptionsArray.length - 1)
  }

  /**
   * Removes image from the document as well as its options
   */
  removeImage(image: NVImage): void {
    if (this.imageOptionsMap.has(image.id)) {
      const index = this.imageOptionsMap.get(image.id)
      if (this.data.imageOptionsArray.length > index) {
        this.data.imageOptionsArray.splice(index, 1)
      }
      this.imageOptionsMap.delete(image.id)
    }
    this.volumes = this.volumes.filter((i) => i.id !== image.id)
  }

  /**
   * Fetch any image data that is missing from this document.
   * This includes loading image blobs for `ImageFromUrlOptions` with valid `url` fields.
   * After calling this, `volumes` and `imageOptionsMap` will be populated.
   */
  async fetchLinkedData(): Promise<void> {
    this.data.encodedImageBlobs = []
    if (!this.imageOptionsArray?.length) {
      return
    }

    for (const imgOpt of this.imageOptionsArray) {
      if (!imgOpt.url) {
        continue
      }

      try {
        const response = await fetch(imgOpt.url)
        if (!response.ok) {
          console.warn('Failed to fetch image:', imgOpt.url)
          continue
        }

        const buffer = await response.arrayBuffer()
        const uint8Array = new Uint8Array(buffer)
        const b64 = NVUtilities.uint8tob64(uint8Array)
        this.data.encodedImageBlobs.push(b64)

        console.info('fetch linked data fetched from ', imgOpt.url)
      } catch (err) {
        console.warn(`Failed to fetch/encode image from ${imgOpt.url}:`, err)
      }
    }
  }

  /**
   * Returns the options for the image if it was added by url
   */
  getImageOptions(image: NVImage): ImageFromUrlOptions | null {
    return this.imageOptionsMap.has(image.id) ? this.data.imageOptionsArray[this.imageOptionsMap.get(image.id)] : null
  }

  /**
   * Serialise the document.
   *
   * @param embedImages  If false, encodedImageBlobs is left empty
   *                     (imageOptionsArray still records the URL / name).
   * @param embedDrawing  If false, encodedDrawingBlob is left empty
   */
  json(embedImages = true, embedDrawing = true): ExportDocumentData {
    const data: Partial<ExportDocumentData> = {
      encodedImageBlobs: [],
      previewImageDataURL: this.data.previewImageDataURL,
      imageOptionsMap: new Map()
    }
    const imageOptionsArray = []
    // save our scene object
    data.sceneData = { ...this.scene.sceneData }
    // save our options
    data.opts = diffOptions(this.opts, DEFAULT_OPTIONS) as NVConfigOptions
    if (this.opts.meshThicknessOn2D === Infinity) {
      data.opts.meshThicknessOn2D = 'infinity'
    }
    // infinity is a symbol
    if (this.opts.meshThicknessOn2D === Infinity) {
      data.opts.meshThicknessOn2D = 'infinity'
    }

    data.labels = [...this.data.labels]

    // remove any handlers
    for (const label of data.labels) {
      delete label.onClick
    }

    data.customData = this.customData

    // Serialize completedMeasurements and completedAngles
    data.completedMeasurements = [...this.completedMeasurements]
    data.completedAngles = [...this.completedAngles]

    // volumes
    // TODO move this to a per-volume export function in NVImage?
    if (this.volumes.length) {
      for (let i = 0; i < this.volumes.length; i++) {
        const volume = this.volumes[i]
        let imageOptions = this.getImageOptions(volume)
        if (imageOptions === null) {
          log.warn('no options found for image, using options from the volume directly')
          imageOptions = {
            name: volume?.name ?? '',
            colormap: volume?._colormap ?? 'gray',
            opacity: volume?._opacity ?? 1.0,
            pairedImgData: null,
            cal_min: volume?.cal_min ?? NaN,
            cal_max: volume?.cal_max ?? NaN,
            trustCalMinMax: volume?.trustCalMinMax ?? true,
            percentileFrac: volume?.percentileFrac ?? 0.02,
            ignoreZeroVoxels: volume?.ignoreZeroVoxels ?? false,
            useQFormNotSForm: volume?.useQFormNotSForm ?? false,
            colormapNegative: volume?.colormapNegative ?? '',
            colormapLabel: volume?.colormapLabel ?? null,
            imageType: volume?.imageType ?? NVIMAGE_TYPE.NII,
            frame4D: volume?.frame4D ?? 0,
            limitFrames4D: volume?.limitFrames4D ?? NaN,
            url: volume?.url ?? '',
            urlImageData: volume?.urlImgData ?? '',
            alphaThreshold: false,
            cal_minNeg: volume?.cal_minNeg ?? NaN,
            cal_maxNeg: volume?.cal_maxNeg ?? NaN,
            colorbarVisible: volume?.colorbarVisible ?? true
          }
        } else {
          if (!('imageType' in imageOptions)) {
            imageOptions.imageType = NVIMAGE_TYPE.NII
          }
        }
        // update image options on current image settings
        imageOptions.colormap = volume.colormap
        imageOptions.colormapLabel = volume.colormapLabel
        imageOptions.opacity = volume.opacity
        imageOptions.cal_max = volume.cal_max ?? NaN
        imageOptions.cal_min = volume.cal_min ?? NaN

        imageOptionsArray.push(imageOptions)

        if (embedImages) {
          const blob = NVUtilities.uint8tob64(volume.toUint8Array())
          data.encodedImageBlobs!.push(blob)
        }
        data.imageOptionsMap!.set(volume.id, i)
      }
    }
    // Add it even if it's empty
    data.imageOptionsArray = [...imageOptionsArray]

    // meshes
    const meshes = []
    data.connectomes = []
    for (const mesh of this.meshes) {
      if (mesh.type === MeshType.CONNECTOME) {
        data.connectomes.push(JSON.stringify((mesh as NVConnectome).json()))
        continue
      }
      const copyMesh: Mutable<any> = {
        pts: mesh.pts,
        tris: mesh.tris,
        name: mesh.name,
        rgba255: Uint8Array.from(mesh.rgba255),
        opacity: mesh.opacity,
        connectome: mesh.connectome,
        dpg: mesh.dpg,
        dps: mesh.dps,
        dpv: mesh.dpv,
        meshShaderIndex: mesh.meshShaderIndex,
        layers: mesh.layers.map((layer) => ({
          values: layer.values,
          nFrame4D: layer.nFrame4D,
          frame4D: 0,
          outlineBorder: layer.outlineBorder,
          global_min: layer.global_min,
          global_max: layer.global_max,
          cal_min: layer.cal_min,
          cal_max: layer.cal_max,
          opacity: layer.opacity,
          colormap: layer.colormap,
          colormapNegative: layer.colormapNegative,
          colormapLabel: layer.colormapLabel,
          useNegativeCmap: layer.useNegativeCmap
        })),
        hasConnectome: mesh.hasConnectome,
        edgeColormap: mesh.edgeColormap,
        edgeColormapNegative: mesh.edgeColormapNegative,
        edgeMax: mesh.edgeMax,
        edgeMin: mesh.edgeMin,
        edges: mesh.edges && Array.isArray(mesh.edges) ? [...mesh.edges] : [],
        extentsMax: mesh.extentsMax,
        extentsMin: mesh.extentsMin,
        furthestVertexFromOrigin: mesh.furthestVertexFromOrigin,
        nodeColormap: mesh.nodeColormap,
        nodeColormapNegative: mesh.nodeColormapNegative,
        nodeMaxColor: mesh.nodeMaxColor,
        nodeMinColor: mesh.nodeMinColor,
        nodeScale: mesh.nodeScale,
        legendLineThickness: mesh.legendLineThickness,
        offsetPt0: mesh.offsetPt0,
        nodes: mesh.nodes
      }
      if (mesh.offsetPt0 && mesh.offsetPt0.length > 0) {
        copyMesh.offsetPt0 = mesh.offsetPt0
        copyMesh.fiberGroupColormap = mesh.fiberGroupColormap
        copyMesh.fiberColor = mesh.fiberColor
        copyMesh.fiberDither = mesh.fiberDither
        copyMesh.fiberRadius = mesh.fiberRadius
        copyMesh.colormap = mesh.colormap
      }
      meshes.push(copyMesh)
    }
    data.meshesString = JSON.stringify(serialize(meshes))
    // Serialize drawBitmap
    if (embedDrawing && this.drawBitmap) {
      data.encodedDrawingBlob = NVUtilities.uint8tob64(this.drawBitmap)
    }

    return data as ExportDocumentData
  }

  async download(
    fileName: string,
    compress: boolean,
    opts: { embedImages: boolean } = { embedImages: true }
  ): Promise<void> {
    const data = this.json(opts.embedImages)
    const jsonTxt = JSON.stringify(data)
    const mime = compress ? 'application/gzip' : 'application/json'
    const payload = compress ? await NVUtilities.compressStringToArrayBuffer(jsonTxt) : jsonTxt

    NVUtilities.download(payload, fileName, mime)
  }

  /**
   * Deserialize mesh data objects
   */
  static deserializeMeshDataObjects(document: NVDocument): void {
    if (!document.data.meshesString || document.data.meshesString === '[]') {
      document.meshDataObjects = []
      return // ← early-exit
    }

    if (document.data.meshesString) {
      document.meshDataObjects = deserialize(JSON.parse(document.data.meshesString))
      for (const mesh of document.meshDataObjects!) {
        for (const layer of mesh.layers) {
          if ('colorMap' in layer) {
            layer.colormap = layer.colorMap as string
            delete layer.colorMap
          }
          if ('colorMapNegative' in layer) {
            layer.colormapNegative = layer.colorMapNegative as string
            delete layer.colorMapNegative
          }
        }
      }
    }
  }

  /**
   * Factory method to return an instance of NVDocument from a URL
   */
  static async loadFromUrl(url: string): Promise<NVDocument> {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    let documentData: DocumentData

    if (NVUtilities.isArrayBufferCompressed(buffer)) {
      // The file is gzip compressed
      const documentText = await NVUtilities.decompressArrayBuffer(buffer)
      documentData = JSON.parse(documentText)
    } else {
      const utf8decoder = new TextDecoder()
      documentData = JSON.parse(utf8decoder.decode(buffer))
    }

    return NVDocument.loadFromJSON(documentData)
  }

  /**
   * Factory method to return an instance of NVDocument from a File object
   */
  static async loadFromFile(file: Blob): Promise<NVDocument> {
    const arrayBuffer = await NVUtilities.readFileAsync(file)
    let dataString: string
    const document = new NVDocument()

    if (NVUtilities.isArrayBufferCompressed(arrayBuffer)) {
      dataString = await NVUtilities.decompressArrayBuffer(arrayBuffer)
    } else {
      const utf8decoder = new TextDecoder()
      dataString = utf8decoder.decode(arrayBuffer)
    }
    document.data = JSON.parse(dataString)

    if (document.data.opts.meshThicknessOn2D === 'infinity') {
      document.data.opts.meshThicknessOn2D = Infinity
    }
    document.scene.sceneData = { ...INITIAL_SCENE_DATA, ...document.data.sceneData }

    NVDocument.deserializeMeshDataObjects(document)
    return document
  }

  /**
   * Factory method to return an instance of NVDocument from JSON.
   *
   * This will merge any saved configuration options (`opts`) with the DEFAULT_OPTIONS,
   * ensuring any missing values are filled with defaults. It also restores special-case
   * fields like `meshThicknessOn2D` when serialized as the string "infinity".
   *
   * @param data - A serialized DocumentData object
   * @returns A reconstructed NVDocument instance
   */
  static loadFromJSON(data: DocumentData): NVDocument {
    // 1. start with a fresh document (its constructor already seeds
    //    document.data with whatever defaults you want)
    const document = new NVDocument()

    // 2. copy *all* top-level saved fields over (this brings in
    //    imageOptionsArray, encodedImageBlobs, masks, overlays, etc.)
    Object.assign(document.data, {
      ...data,
      // 2a. ensure minimum required array fields are non-null
      imageOptionsArray: data.imageOptionsArray ?? [],
      encodedImageBlobs: data.encodedImageBlobs ?? [],
      labels: data.labels ?? [],
      meshOptionsArray: data.meshOptionsArray ?? [],
      connectomes: data.connectomes ?? [],
      encodedDrawingBlob: data.encodedDrawingBlob ?? '',
      previewImageDataURL: data.previewImageDataURL ?? '',
      customData: data.customData ?? '',
      title: data.title ?? 'untitled'
    })

    // 3. now merge opts with your DEFAULT_OPTIONS
    document.data.opts = {
      ...DEFAULT_OPTIONS,
      ...(data.opts || {})
    } as NVConfigOptions

    //    and restore the "infinity" sentinel
    if (document.data.opts.meshThicknessOn2D === 'infinity') {
      document.data.opts.meshThicknessOn2D = Infinity
    }

    // 4. merge sceneData
    document.scene.sceneData = {
      ...INITIAL_SCENE_DATA,
      ...(data.sceneData || {})
    }

    // 5. Load completedMeasurements and completedAngles if they exist
    if (data.completedMeasurements) {
      document.completedMeasurements = data.completedMeasurements.map((m) => ({
        ...m,
        startMM: vec3.clone(m.startMM),
        endMM: vec3.clone(m.endMM)
      }))
    }
    if (data.completedAngles) {
      document.completedAngles = data.completedAngles.map((a) => ({
        ...a,
        firstLineMM: {
          start: vec3.clone(a.firstLineMM.start),
          end: vec3.clone(a.firstLineMM.end)
        },
        secondLineMM: {
          start: vec3.clone(a.secondLineMM.start),
          end: vec3.clone(a.secondLineMM.end)
        }
      }))
    }

    // 6. finally, if there was a meshesString, deserialize it
    if (document.data.meshesString) {
      NVDocument.deserializeMeshDataObjects(document)
    }

    return document
  }

  /**
   * Factory method to return an instance of NVDocument from JSON
   */
  static oldloadFromJSON(data: DocumentData): NVDocument {
    const document = new NVDocument()
    document.data = data
    if (document.data.opts.meshThicknessOn2D === 'infinity') {
      document.data.opts.meshThicknessOn2D = Infinity
    }
    document.scene.sceneData = { ...INITIAL_SCENE_DATA, ...data.sceneData }
    NVDocument.deserializeMeshDataObjects(document)
    return document
  }

  /**
   * Sets the callback function to be called when opts properties change
   */
  setOptsChangeCallback(
    callback: (
      propertyName: keyof NVConfigOptions,
      newValue: NVConfigOptions[keyof NVConfigOptions],
      oldValue: NVConfigOptions[keyof NVConfigOptions]
    ) => void
  ): void {
    this._optsChangeCallback = callback
    this._optsProxy = null // Force recreation with new callback
  }

  /**
   * Removes the opts change callback
   */
  removeOptsChangeCallback(): void {
    this._optsChangeCallback = null
    this._optsProxy = null // Force recreation without callback
  }

  /**
   * Creates a Proxy wrapper around the opts object to detect changes
   */
  private _createOptsProxy(): void {
    const target = this.data.opts as NVConfigOptions

    this._optsProxy = new Proxy(target, {
      set: (obj: any, prop: string | symbol, value: any): boolean => {
        const oldValue = obj[prop]

        // Only proceed if the value actually changed
        if (oldValue !== value) {
          obj[prop] = value

          // Call the change callback if one is registered
          if (this._optsChangeCallback && typeof prop === 'string' && prop in DEFAULT_OPTIONS) {
            this._optsChangeCallback(prop as keyof NVConfigOptions, value, oldValue)
          }
        }

        return true
      },

      get: (obj: any, prop: string | symbol): any => {
        return obj[prop]
      }
    })
  }
}
