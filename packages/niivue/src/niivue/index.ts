import { mat4, vec2, vec3, vec4 } from 'gl-matrix'
import packageJson from '../../package.json' with { type: 'json' }
import { TEXTURE_CONSTANTS } from './texture-constants'
import { orientCube } from '@/orientCube'
import { NiivueObject3D } from '@/niivue-object3D'
import { LoadFromUrlParams, MeshType, NVMesh, NVMeshLayer } from '@/nvmesh'
import defaultMatCap from '@/matcaps/Shiny.jpg'
import defaultFontPNG from '@/fonts/Roboto-Regular.png'
import defaultFontMetrics from '@/fonts/Roboto-Regular.json' with { type: 'json' }
import { ColorMap, cmapper, COLORMAP_TYPE } from '@/colortables'
import * as glUtils from '@/niivue/core/gl'
import * as CoordTransform from '@/niivue/core/CoordinateTransform'
import * as ShaderManager from '@/niivue/core/ShaderManager'
import * as VolumeManager from '@/niivue/data/VolumeManager'
import * as VolumeTexture from '@/niivue/data/VolumeTexture'
import * as VolumeColormap from '@/niivue/data/VolumeColormap'
import * as VolumeModulation from '@/niivue/data/VolumeModulation'
import * as VolumeLayerRenderer from '@/niivue/data/VolumeLayerRenderer'
import * as MeshManager from '@/niivue/data/MeshManager'
import * as ConnectomeManager from '@/niivue/data/ConnectomeManager'
import * as FileLoader from '@/niivue/data/FileLoader'
import * as SliceRenderer from '@/niivue/rendering/SliceRenderer'
import * as VolumeRenderer from '@/niivue/rendering/VolumeRenderer'
import * as MeshRenderer from '@/niivue/rendering/MeshRenderer'
import * as SceneRenderer from '@/niivue/rendering/SceneRenderer'
import * as UIElementRenderer from '@/niivue/rendering/UIElementRenderer'
import * as EventController from '@/niivue/interaction/EventController'
import * as MouseController from '@/niivue/interaction/MouseController'
import * as TouchController from '@/niivue/interaction/TouchController'
import * as KeyboardController from '@/niivue/interaction/KeyboardController'
import * as WheelController from '@/niivue/interaction/WheelController'
import * as DragModeManager from '@/niivue/interaction/DragModeManager'
import * as DropHandler from '@/niivue/interaction/DropHandler'
import * as SliceNavigation from '@/niivue/navigation/SliceNavigation'
import * as LayoutManager from '@/niivue/navigation/LayoutManager'
import * as CameraController from '@/niivue/navigation/CameraController'
import * as ClipPlaneManager from '@/niivue/navigation/ClipPlaneManager'
import * as DrawingManager from '@/niivue/drawing/DrawingManager'
import * as PenTool from '@/niivue/drawing/PenTool'
import * as ShapeTool from '@/niivue/drawing/ShapeTool'
import * as FloodFillTool from '@/niivue/drawing/FloodFillTool'
import * as ImageProcessing from '@/niivue/processing/ImageProcessing'
import { createMask, computeDescriptiveStats, scaleImageData } from '@/niivue/descriptives'
import {
    NVDocument,
    NVConfigOptions,
    Scene,
    SLICE_TYPE,
    PEN_TYPE,
    SHOW_RENDER,
    DRAG_MODE,
    MULTIPLANAR_TYPE,
    DEFAULT_OPTIONS,
    ExportDocumentData,
    INITIAL_SCENE_DATA,
    MouseEventConfig,
    TouchEventConfig
} from '@/nvdocument'
import { LabelTextAlignment, LabelLineTerminator, NVLabel3D, NVLabel3DStyle, LabelAnchorPoint, LabelAnchorFlag } from '@/nvlabel'
import { FreeSurferConnectome, NVConnectome } from '@/nvconnectome'
import { NVImage, NVImageFromUrlOptions, NiiDataType, NiiIntentCode, ImageFromUrlOptions } from '@/nvimage'
import { AffineTransform } from '@/nvimage/affineUtils'
import { NVUtilities } from '@/nvutilities'
import { NVMeshUtilities } from '@/nvmesh-utilities'
import {
    Connectome,
    LegacyConnectome,
    NVConnectomeNode,
    NiftiHeader,
    DragReleaseParams,
    NiiVueLocation,
    NiiVueLocationValue,
    SyncOpts,
    UIData,
    FontMetrics,
    ColormapListEntry,
    Graph,
    Descriptive,
    SliceScale,
    MvpMatrix2D,
    MM,
    SaveImageOptions
} from '@/types'
import { findBoundarySlices, interpolateMaskSlices, drawUndo } from '@/drawing'
import { vertFontShader, fragFontShader, vertBmpShader, fragBmpShader, vertMeshShader, fragMeshDepthShader } from '@/shader-srcs'
import { Shader } from '@/shader'
import { log } from '@/logger'
import { deg2rad, img2ras16, intensityRaw2Scaled, isRadiological, negMinMax, swizzleVec3, tickSpacing, unProject, unpackFloatFromVec4i, readFileAsDataURL } from '@/utils'
import NVSerializer from '@/nvserializer'
const { version } = packageJson
export { NVMesh, NVMeshFromUrlOptions, NVMeshLayerDefaults } from '@/nvmesh'
export { ColorTables as colortables, cmapper } from '@/colortables'

export { NVImage, NVImageFromUrlOptions } from '@/nvimage'
export { NVZarrHelper, ZarrChunkClient, ZarrChunkCache } from '@/nvimage/zarr'
export type { NVZarrHelperOptions, ZarrPyramidInfo, ZarrPyramidLevel, ChunkCoord } from '@/nvimage/zarr'
export * from '@/nvimage/affineUtils'
// address rollup error - https://github.com/rollup/plugins/issues/71
export * from '@/nvdocument'
export { NVUtilities } from '@/nvutilities'
export { LabelTextAlignment, LabelLineTerminator, NVLabel3DStyle, NVLabel3D, LabelAnchorPoint } from '@/nvlabel'
export { NVMeshLoaders } from '@/nvmesh-loaders'
export { NVMeshUtilities } from '@/nvmesh-utilities'
export {
    MESH_EXTENSIONS,
    getFileExt,
    isMeshExt,
    getMediaByUrl,
    registerLoader,
    getLoader,
    isDicomExtension,
    traverseFileTree,
    readDirectory,
    readFileAsDataURL,
    handleDragEnter,
    handleDragOver
} from '@/niivue/data/FileLoader'
export type { LoaderRegistry, CustomLoader, GetFileExtOptions, RegisterLoaderParams, MeshLoaderResult } from '@/niivue/data/FileLoader'

// same rollup error as above during npm run dev, and during the umd build
// TODO: at least remove the umd build when AFNI do not need it anymore
export * from '@/types'
const { MESH_EXTENSIONS } = FileLoader
const { LEFT_MOUSE_BUTTON, CENTER_MOUSE_BUTTON, RIGHT_MOUSE_BUTTON } = MouseController

// default SaveImageOptions
const defaultSaveImageOptions: SaveImageOptions = {
    filename: '',
    isSaveDrawing: false,
    volumeByIndex: 0
}

// Re-export types from FileLoader for backward compatibility
export type DicomLoaderInput = FileLoader.DicomLoaderInput
export type DicomLoader = FileLoader.DicomLoader

/**
 * Niivue can be attached to a canvas. An instance of Niivue contains methods for
 * loading and rendering NIFTI image data in a WebGL 2.0 context.
 *
 * @example
 * let niivue = new Niivue({crosshairColor: [0,1,0,0.5], textHeight: 0.5}) // a see-through green crosshair, and larger text labels
 */
export class Niivue {
    loaders: FileLoader.LoaderRegistry = {}
    // create a dicom loader
    dicomLoader: FileLoader.DicomLoader | null = null
    // {
    //   loader: (data: DicomLoaderInput) => {
    //     return new Promise<{name: string; data: ArrayBuffer}[]>((resolve, reject) => {
    //       reject('No DICOM loader provided')
    //     })
    //   },
    //   toExt: 'nii'
    // }
    canvas: HTMLCanvasElement | null = null // the reference to the canvas element on the page
    _gl: WebGL2RenderingContext | null = null // the gl context
    isBusy = false // flag to indicate if the scene is busy drawing
    needsRefresh = false // flag to indicate if the scene needs to be redrawn
    colormapTexture: WebGLTexture | null = null // the GPU memory storage of the colormap
    colormapLists: ColormapListEntry[] = [] // one entry per colorbar: min, max, tic
    volumeTexture: WebGLTexture | null = null // the GPU memory storage of the volume
    gradientTexture: WebGLTexture | null = null // 3D texture for volume rendering lighting
    gradientTextureAmount = 0.0
    useCustomGradientTexture = false // flag to indicate if a custom gradient texture is used
    renderGradientValues = false
    drawTexture: WebGLTexture | null = null // the GPU memory storage of the drawing
    paqdTexture: WebGLTexture | null = null // the GPU memory storage of the probabilistic atlas
    drawUndoBitmaps: Uint8Array[] = [] // array of drawBitmaps for undo
    drawLut = cmapper.makeDrawLut('$itksnap') // the color lookup table for drawing
    drawOpacity = 0.8 // opacity of drawing (default)
    drawRimOpacity = -1.0 // opacity of pixels at edge of drawing (negative value to use drawOpacity)
    clickToSegmentIsGrowing = false // flag to indicate if the clickToSegment flood fill growing is in progress with left mouse down + drag
    clickToSegmentGrowingBitmap: Uint8Array | null = null // the bitmap of the growing flood fill
    clickToSegmentXY = [0, 0] // the x,y location of the clickToSegment flood fill
    renderDrawAmbientOcclusion = 0.4
    colorbarHeight = 0 // height in pixels, set when colorbar is drawn
    drawPenLocation = [NaN, NaN, NaN]
    drawPenAxCorSag = -1 // do not allow pen to drag between Sagittal/Coronal/Axial
    drawFillOverwrites = true // if true, fill overwrites existing drawing
    drawPenFillPts: number[][] = [] // store mouse points for filled pen
    drawShapeStartLocation = [NaN, NaN, NaN] // start location for rectangle/ellipse drawing
    drawShapePreviewBitmap: Uint8Array | null = null // preview bitmap for shape drawing
    overlayTexture: WebGLTexture | null = null
    overlayTextureID: WebGLTexture | null = null
    sliceMMShader?: Shader
    slice2DShader?: Shader
    sliceV1Shader?: Shader
    orientCubeShader?: Shader
    orientCubeShaderVAO: WebGLVertexArrayObject | null = null
    rectShader?: Shader
    rectOutlineShader?: Shader
    renderShader?: Shader
    lineShader?: Shader
    line3DShader?: Shader
    passThroughShader?: Shader
    renderGradientShader?: Shader
    renderGradientValuesShader?: Shader
    renderSliceShader?: Shader
    renderVolumeShader?: Shader
    pickingMeshShader?: Shader
    pickingImageShader?: Shader
    colorbarShader?: Shader
    customSliceShader: Shader | null = null
    fontShader: Shader | null = null
    fiberShader?: Shader
    fontTexture: WebGLTexture | null = null
    circleShader?: Shader
    matCapTexture: WebGLTexture | null = null
    bmpShader: Shader | null = null
    bmpTexture: WebGLTexture | null = null // thumbnail WebGLTexture object
    thumbnailVisible = false
    bmpTextureWH = 1.0 // thumbnail width/height ratio
    growCutShader?: Shader
    orientShaderAtlasU: Shader | null = null
    orientShaderAtlasI: Shader | null = null
    orientShaderU: Shader | null = null
    orientShaderI: Shader | null = null
    orientShaderF: Shader | null = null
    orientShaderRGBU: Shader | null = null
    orientShaderPAQD: Shader | null = null
    surfaceShader: Shader | null = null
    blurShader: Shader | null = null
    sobelBlurShader: Shader | null = null
    sobelFirstOrderShader: Shader | null = null
    sobelSecondOrderShader: Shader | null = null
    genericVAO: WebGLVertexArrayObject | null = null // used for 2D slices, 2D lines, 2D Fonts
    unusedVAO = null
    crosshairs3D: NiivueObject3D | null = null
    private DEFAULT_FONT_GLYPH_SHEET = defaultFontPNG // "/fonts/Roboto-Regular.png";
    private DEFAULT_FONT_METRICS = defaultFontMetrics // "/fonts/Roboto-Regular.json";
    private fontMetrics?: typeof defaultFontMetrics
    private fontMets: FontMetrics | null = null
    private fontPx = 12
    private legendFontScaling = 1
    backgroundMasksOverlays = 0
    overlayOutlineWidth = 0 // float, 0 for none
    overlayAlphaShader = 1 // float, 1 for opaque
    position?: vec3
    extentsMin?: vec3
    extentsMax?: vec3
    // ResizeObserver
    private resizeObserver: ResizeObserver | null = null
    private resizeEventListener: (() => void) | null = null
    private canvasObserver: MutationObserver | null = null
    // syncOpts: Record<string, unknown> = {}
    syncOpts: SyncOpts = {
        '3d': false, // legacy option
        '2d': false, // legacy option
        zoomPan: false,
        cal_min: false,
        cal_max: false,
        clipPlane: false,
        gamma: false,
        sliceType: false,
        crosshair: false
    }

    readyForSync = false

    private _skipDragInDraw = false

    // UI Data
    uiData: UIData = {
        mousedown: false,
        touchdown: false,
        mouseButtonLeftDown: false,
        mouseButtonCenterDown: false,
        mouseButtonRightDown: false,
        mouseDepthPicker: false,
        clickedTile: -1,

        pan2DxyzmmAtMouseDown: [0, 0, 0, 1],
        prevX: 0,
        prevY: 0,
        currX: 0,
        currY: 0,
        currentTouchTime: 0,
        lastTouchTime: 0,
        touchTimer: null,
        doubleTouch: false,
        isDragging: false,
        dragStart: [0.0, 0.0],
        dragEnd: [0.0, 0.0],
        dragClipPlaneStartDepthAziElev: [0, 0, 0],
        lastTwoTouchDistance: 0,
        multiTouchGesture: false,
        windowX: 0,
        windowY: 0,
        activeDragMode: null,
        activeDragButton: null,
        angleFirstLine: [0.0, 0.0, 0.0, 0.0],
        angleState: 'none',
        activeClipPlaneIndex: 0
    }

    #eventsController: AbortController | null = null

    back: NVImage | null = null // base layer; defines image space to work in. Defined as this.volumes[0] in Niivue.loadVolumes
    overlays: NVImage[] = [] // layers added on top of base image (e.g. masks or stat maps). Essentially everything after this.volumes[0] is an overlay. So is necessary?
    deferredVolumes: ImageFromUrlOptions[] = []
    deferredMeshes: LoadFromUrlParams[] = []
    furthestVertexFromOrigin = 100
    volScale: number[] = []
    vox: number[] = []
    mousePos = [0, 0]
    screenSlices: Array<{
        leftTopWidthHeight: number[]
        axCorSag: SLICE_TYPE
        sliceFrac: number
        AxyzMxy: number[]
        leftTopMM: number[]
        fovMM: number[]
        screen2frac?: number[]
    }> = [] // empty array

    cuboidVertexBuffer?: WebGLBuffer

    otherNV: Niivue[] | null = null // another niivue instance that we wish to sync position with
    volumeObject3D: NiivueObject3D | null = null
    pivot3D = [0, 0, 0] // center for rendering rotation
    furthestFromPivot = 10.0 // most distant point from pivot

    currentClipPlaneIndex = 0
    lastCalled = new Date().getTime()

    selectedObjectId = -1
    CLIP_PLANE_ID = 1
    VOLUME_ID = 254
    DISTANCE_FROM_CAMERA = -0.54
    graph: Graph = {
        LTWH: [0, 0, 640, 480],
        opacity: 0.0,
        vols: [0], // e.g. timeline for background volume only, e.g. [0,2] for first and third volumes
        autoSizeMultiplanar: false,
        normalizeValues: false,
        isRangeCalMinMax: false
    }

    customLayout: Array<{
        sliceType: SLICE_TYPE
        position: [number, number, number, number] // left, top, width, height
        sliceMM?: number
    }> = []

    meshShaders: Array<{ Name: string; Frag: string; shader?: Shader }> = ShaderManager.createDefaultMeshShaders()

    // TODO just let users use DRAG_MODE instead
    dragModes = {
        contrast: DRAG_MODE.contrast,
        measurement: DRAG_MODE.measurement,
        angle: DRAG_MODE.angle,
        none: DRAG_MODE.none,
        pan: DRAG_MODE.pan,
        slicer3D: DRAG_MODE.slicer3D,
        callbackOnly: DRAG_MODE.callbackOnly
    }

    // TODO just let users use SLICE_TYPE instead
    sliceTypeAxial = SLICE_TYPE.AXIAL
    sliceTypeCoronal = SLICE_TYPE.CORONAL
    sliceTypeSagittal = SLICE_TYPE.SAGITTAL
    sliceTypeMultiplanar = SLICE_TYPE.MULTIPLANAR
    sliceTypeRender = SLICE_TYPE.RENDER

    // Event listeners
    /**
     * callback function to run when the right mouse button is released after dragging
     * @example
     * niivue.onDragRelease = () => {
     *   console.log('drag ended')
     * }
     */
    onDragRelease: (params: DragReleaseParams) => void = () => {} // function to call when contrast drag is released by default. Can be overridden by user

    /**
     * callback function to run when the left mouse button is released
     * @example
     * niivue.onMouseUp = () => {
     *   console.log('mouse up')
     * }
     */
    onMouseUp: (data: Partial<UIData>) => void = () => {}
    /**
     * callback function to run when the crosshair location changes
     * @example
     * niivue.onLocationChange = (data) => {
     * console.log('location changed')
     * console.log('mm: ', data.mm)
     * console.log('vox: ', data.vox)
     * console.log('frac: ', data.frac)
     * console.log('values: ', data.values)
     * }
     */
    onLocationChange: (location: unknown) => void = () => {}
    /**
     * callback function to run when the user changes the intensity range with the selection box action (right click)
     * @example
     * niivue.onIntensityChange = (volume) => {
     * console.log('intensity changed')
     * console.log('volume: ', volume)
     * }
     */
    onIntensityChange: (volume: NVImage) => void = () => {}

    /**
     * callback function when clickToSegment is enabled and the user clicks on the image. data contains the volume of the segmented region in mm3 and mL
     * @example
     * niivue.onClickToSegment = (data) => {
     * console.log('clicked to segment')
     * console.log('volume mm3: ', data.mm3)
     * console.log('volume mL: ', data.mL)
     * }
     */
    onClickToSegment: (data: { mm3: number; mL: number }) => void = () => {}

    /**
     * callback function to run when a new volume is loaded
     * @example
     * niivue.onImageLoaded = (volume) => {
     * console.log('volume loaded')
     * console.log('volume: ', volume)
     * }
     */
    onImageLoaded: (volume: NVImage) => void = () => {}

    /**
     * callback function to run when a new mesh is loaded
     * @example
     * niivue.onMeshLoaded = (mesh) => {
     * console.log('mesh loaded')
     * console.log('mesh: ', mesh)
     * }
     */
    onMeshLoaded: (mesh: NVMesh) => void = () => {}

    /**
     * callback function to run when the user changes the volume when a 4D image is loaded
     * @example
     * niivue.onFrameChange = (volume, frameNumber) => {
     * console.log('frame changed')
     * console.log('volume: ', volume)
     * console.log('frameNumber: ', frameNumber)
     * }
     */
    onFrameChange: (volume: NVImage, index: number) => void = () => {}

    /**
     * callback function to run when niivue reports an error
     * @example
     * niivue.onError = (error) => {
     * console.log('error: ', error)
     * }
     */
    onError: () => void = () => {}

    /// TODO was undocumented
    onColormapChange: () => void = () => {}

    /**
     * callback function to run when niivue reports detailed info
     * @example
     * niivue.onInfo = (info) => {
     * console.log('info: ', info)
     * }
     */
    onInfo: () => void = () => {}

    /**
     * callback function to run when niivue reports a warning
     * @example
     * niivue.onWarn = (warn) => {
     * console.log('warn: ', warn)
     * }
     */
    onWarn: () => void = () => {}

    /**
     * callback function to run when niivue reports a debug message
     * @example
     * niivue.onDebug = (debug) => {
     * console.log('debug: ', debug)
     * }
     */
    onDebug: () => void = () => {}

    /**
     * callback function to run when a volume is added from a url
     * @example
     * niivue.onVolumeAddedFromUrl = (imageOptions, volume) => {
     * console.log('volume added from url')
     * console.log('imageOptions: ', imageOptions)
     * console.log('volume: ', volume)
     * }
     */
    onVolumeAddedFromUrl: (imageOptions: ImageFromUrlOptions, volume: NVImage) => void = () => {}
    onVolumeWithUrlRemoved: (url: string) => void = () => {}

    /**
     * callback function to run when updateGLVolume is called (most users will not need to use
     * @example
     * niivue.onVolumeUpdated = () => {
     * console.log('volume updated')
     * }
     */
    onVolumeUpdated: () => void = () => {}

    /**
     * callback function to run when a mesh is added from a url
     * @example
     * niivue.onMeshAddedFromUrl = (meshOptions, mesh) => {
     * console.log('mesh added from url')
     * console.log('meshOptions: ', meshOptions)
     * console.log('mesh: ', mesh)
     * }
     */
    onMeshAddedFromUrl: (meshOptions: LoadFromUrlParams, mesh: NVMesh) => void = () => {}

    // TODO seems redundant with onMeshLoaded
    onMeshAdded: () => void = () => {}
    onMeshWithUrlRemoved: (url: string) => void = () => {}

    // not implemented anywhere...
    onZoom3DChange: (zoom: number) => void = () => {}

    /**
     * callback function to run when the user changes the rotation of the 3D rendering
     * @example
     * niivue.onAzimuthElevationChange = (azimuth, elevation) => {
     * console.log('azimuth: ', azimuth)
     * console.log('elevation: ', elevation)
     * }
     */
    onAzimuthElevationChange: (azimuth: number, elevation: number) => void = () => {}

    /**
     * callback function to run when the user changes the clip plane
     * @example
     * niivue.onClipPlaneChange = (clipPlane) => {
     * console.log('clipPlane: ', clipPlane)
     * }
     */
    onClipPlaneChange: (clipPlane: number[]) => void = () => {}
    onCustomMeshShaderAdded: (fragmentShaderText: string, name: string) => void = () => {}
    onMeshShaderChanged: (meshIndex: number, shaderIndex: number) => void = () => {}
    onMeshPropertyChanged: (meshIndex: number, key: string, val: unknown) => void = () => {}

    onDicomLoaderFinishedWithImages: (files: NVImage[] | NVMesh[]) => void = () => {}

    /**
     * callback function to run when the user loads a new NiiVue document
     * @example
     * niivue.onDocumentLoaded = (document) => {
     * console.log('document: ', document)
     * }
     */
    onDocumentLoaded: (document: NVDocument) => void = () => {}

    /**
     * Callback for when any configuration option changes.
     * @param propertyName - The name of the option that changed.
     * @param newValue - The new value of the option.
     * @param oldValue - The previous value of the option.
     */
    onOptsChange: (propertyName: keyof NVConfigOptions, newValue: NVConfigOptions[keyof NVConfigOptions], oldValue: NVConfigOptions[keyof NVConfigOptions]) => void = () => {}

    document = new NVDocument()

    /** Get the current scene configuration. */
    get scene(): Scene {
        return this.document.scene
    }

    /** Get the current visualization options. */
    get opts(): NVConfigOptions {
        return this.document.opts
    }

    /** Get the slice mosaic layout string. */
    get sliceMosaicString(): string {
        return this.document.opts.sliceMosaicString || ''
    }

    /** Set the slice mosaic layout string. */
    set sliceMosaicString(newSliceMosaicString: string) {
        this.document.opts.sliceMosaicString = newSliceMosaicString
    }

    /**
     * Get whether voxels below minimum intensity are drawn as dark or transparent.
     * @returns {boolean} True if dark voxels are opaque, false if transparent.
     */
    get isAlphaClipDark(): boolean {
        return this.document.opts.isAlphaClipDark
    }

    /**
     * Set whether voxels below minimum intensity are drawn as dark or transparent.
     * @param {boolean} newVal - True to make dark voxels opaque, false for transparent.
     * @see {@link https://niivue.com/demos/features/segment.html | live demo usage}
     */
    set isAlphaClipDark(newVal: boolean) {
        this.document.opts.isAlphaClipDark = newVal
    }

    mediaUrlMap: Map<NVImage | NVMesh, string> = new Map()
    initialized = false
    currentDrawUndoBitmap: number

    /**
     * @param options  - options object to set modifiable Niivue properties
     */
    constructor(options: Partial<NVConfigOptions> = DEFAULT_OPTIONS) {
        // populate Niivue with user supplied options
        for (const name in options) {
            // if the user supplied a function for a callback, use it, else use the default callback or nothing
            if (typeof options[name as keyof typeof options] === 'function') {
                this[name] = options[name]
            } else {
                this.opts[name] = DEFAULT_OPTIONS[name] === undefined ? DEFAULT_OPTIONS[name] : options[name]
            }
        }
        if (this.opts.forceDevicePixelRatio === 0) {
            this.uiData.dpr = window.devicePixelRatio || 1
        } else if (this.opts.forceDevicePixelRatio < 0) {
            this.uiData.dpr = 1
        } else {
            this.uiData.dpr = this.opts.forceDevicePixelRatio
        }

        // now that opts have been parsed, set the current undo to max undo
        this.currentDrawUndoBitmap = this.opts.maxDrawUndoBitmaps // analogy: cylinder position of a revolver

        if (this.opts.drawingEnabled) {
            this.createEmptyDrawing()
        }

        if (this.opts.thumbnail.length > 0) {
            this.thumbnailVisible = true
        }

        log.setLogLevel(this.opts.logLevel)

        // Set up opts change watching
        this.document.setOptsChangeCallback((propertyName, newValue, oldValue) => {
            this.onOptsChange(propertyName, newValue, oldValue)
        })
    }

    /**
     * Clean up event listeners and observers
     * Call this when the Niivue instance is no longer needed.
     * This will be called when the canvas is detached from the DOM
     * @example niivue.cleanup();
     */
    cleanup(): void {
        // Clean up resize observers and listeners
        EventController.cleanupResizeObservers(this.resizeObserver, this.canvasObserver, this.resizeEventListener)
        this.resizeEventListener = null
        this.resizeObserver = null
        this.canvasObserver = null

        // Remove all interaction event listeners
        EventController.cleanupEventController(this.#eventsController)
        this.#eventsController = null

        // Clean up opts change callback
        this.document.removeOptsChangeCallback()

        // Todo: other cleanup tasks could be added here
    }

    get volumes(): NVImage[] {
        return this.document.volumes
    }

    set volumes(volumes) {
        this.document.volumes = volumes
    }

    get meshes(): NVMesh[] {
        return this.document.meshes
    }

    set meshes(meshes) {
        this.document.meshes = meshes
    }

    get drawBitmap(): Uint8Array | null {
        return this.document.drawBitmap
    }

    set drawBitmap(drawBitmap) {
        this.document.drawBitmap = drawBitmap
    }

    get volScaleMultiplier(): number {
        return this.scene.volScaleMultiplier
    }

    set volScaleMultiplier(scale) {
        this.setScale(scale)
    }

    /**
     * save webgl2 canvas as png format bitmap
     * @param filename - filename for screen capture
     * @example niivue.saveScene('test.png');
     * @see {@link https://niivue.com/demos/features/ui.html | live demo usage}
     */
    async saveScene(filename = 'niivue.png'): Promise<void> {
        function saveBlob(blob: Blob, name: string): void {
            const a = document.createElement('a')
            document.body.appendChild(a)
            a.style.display = 'none'
            const url = window.URL.createObjectURL(blob)
            a.href = url
            a.download = name
            a.click()
            a.remove()
        }

        const canvas = this.canvas

        if (!canvas) {
            throw new Error('canvas not defined')
        }
        this.drawScene()
        canvas.toBlob((blob) => {
            if (!blob) {
                return
            }
            if (filename === '') {
                filename = `niivue-screenshot-${new Date().toString()}.png`
                filename = filename.replace(/\s/g, '_')
            }
            saveBlob(blob, filename)
        })
    }

    /**
     * attach the Niivue instance to the webgl2 canvas by element id
     * @param id - the id of an html canvas element
     * @param isAntiAlias - determines if anti-aliasing is requested (if not specified, AA usage depends on hardware)
     * @example niivue = new Niivue().attachTo('gl')
     * @example await niivue.attachTo('gl')
     * @see {@link https://niivue.com/demos/features/basic.multiplanar.html | live demo usage}
     */
    async attachTo(id: string, isAntiAlias = null): Promise<this> {
        await this.attachToCanvas(document.getElementById(id) as HTMLCanvasElement, isAntiAlias)
        log.debug('attached to element with id: ', id)
        return this
    }

    /**
     * attach the Niivue instance to a canvas element directly
     * @param canvas - the canvas element reference
     * @example
     * niivue = new Niivue()
     * await niivue.attachToCanvas(document.getElementById(id))
     * @see {@link https://niivue.com/demos/features/dsistudio.html | live demo usage}
     */
    async attachToCanvas(canvas: HTMLCanvasElement, isAntiAlias: boolean | null = null): Promise<this> {
        this.canvas = canvas
        if (isAntiAlias === null) {
            isAntiAlias = navigator.hardwareConcurrency > 6
            log.debug('AntiAlias ', isAntiAlias, ' Threads ', navigator.hardwareConcurrency)
        }
        const { gl, max2D, max3D } = glUtils.initGL(this.canvas, isAntiAlias)
        this.gl = gl
        this.uiData.max2D = max2D
        this.uiData.max3D = max3D

        log.info('NIIVUE VERSION ', version)
        log.debug(`Max texture size 2D: ${this.uiData.max2D} 3D: ${this.uiData.max3D}`)

        // set parent background container to black (default empty canvas color)
        // avoids white cube around image in 3D render mode
        this.canvas!.parentElement!.style.backgroundColor = 'black'
        // fill all space in parent
        if (this.opts.isResizeCanvas) {
            EventController.applyCanvasResizeStyles(this.canvas)
            this.canvas.width = this.canvas.offsetWidth
            this.canvas.height = this.canvas.offsetHeight
            // Store a reference to the bound event handler function
            this.resizeEventListener = EventController.createResizeHandler(() => this.resizeListener())
            window.addEventListener('resize', this.resizeEventListener)
            this.resizeObserver = EventController.createResizeObserver(() => this.resizeListener())
            this.resizeObserver.observe(this.canvas.parentElement!)

            // Setup a MutationObserver to detect when canvas is removed from DOM
            this.canvasObserver = EventController.createCanvasObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.removedNodes.length > 0 && Array.from(mutation.removedNodes).includes(this.canvas)) {
                        this.cleanup()
                        break
                    }
                }
            })
            this.canvasObserver.observe(this.canvas.parentElement!, { childList: true })
        }
        if (this.opts.interactive) {
            this.registerInteractions() // attach mouse click and touch screen event handlers for the canvas
        }
        await this.init()
        this.drawScene()
        return this
    }

    /**
     * Sync the scene controls (orientation, crosshair location, etc.) from one Niivue instance to another. useful for using one canvas to drive another.
     * @param otherNV - the other Niivue instance that is the main controller
     * @example
     * niivue1 = new Niivue()
     * niivue2 = new Niivue()
     * niivue2.syncWith(niivue1)
     * @deprecated use broadcastTo instead
     * @see {@link https://niivue.com/demos/features/sync.mesh.html | live demo usage}
     */
    syncWith(otherNV: Niivue | Niivue[], syncOpts = { '2d': true, '3d': true }): void {
        // if otherNV is not an array, make it an array of one
        if (!(otherNV instanceof Array)) {
            otherNV = [otherNV]
        }
        this.otherNV = otherNV
        this.syncOpts = { ...syncOpts }
    }

    /**
     * Sync the scene controls (orientation, crosshair location, etc.) from one Niivue instance to others. useful for using one canvas to drive another.
     * @param otherNV - the other Niivue instance(s)
     * @example
     * niivue1 = new Niivue()
     * niivue2 = new Niivue()
     * niivue3 = new Niivue()
     * niivue1.broadcastTo(niivue2)
     * niivue1.broadcastTo([niivue2, niivue3])
     * @see {@link https://niivue.com/demos/features/sync.mesh.html | live demo usage}
     */
    broadcastTo(otherNV: Niivue | Niivue[], syncOpts = { '2d': true, '3d': true }): void {
        // if otherNV is a single instance then make it an array of one
        if (!(otherNV instanceof Array)) {
            otherNV = [otherNV]
        }
        this.otherNV = otherNV
        this.syncOpts = syncOpts
    }

    /**
     * Synchronizes 3D view settings (azimuth, elevation, scale) with another Niivue instance.
     * @internal
     */
    doSync3d(otherNV: Niivue): void {
        otherNV.scene.renderAzimuth = this.scene.renderAzimuth
        otherNV.scene.renderElevation = this.scene.renderElevation
        otherNV.scene.volScaleMultiplier = this.scene.volScaleMultiplier
    }

    /**
     * Synchronizes 2D crosshair position and pan settings with another Niivue instance.
     * @internal
     */
    doSync2d(otherNV: Niivue): void {
        const thisMM = this.frac2mm(this.scene.crosshairPos)
        otherNV.scene.crosshairPos = otherNV.mm2frac(thisMM)
        otherNV.scene.pan2Dxyzmm = vec4.clone(this.scene.pan2Dxyzmm)
    }

    doSyncGamma(otherNV: Niivue): void {
        // gamma not dependent on 2d/3d
        const thisGamma = this.scene.gamma
        const otherGamma = otherNV.scene.gamma
        if (thisGamma !== otherGamma) {
            otherNV.setGamma(thisGamma)
        }
    }

    /**
     * Synchronizes gamma correction setting with another Niivue instance.
     * @internal
     */
    doSyncZoomPan(otherNV: Niivue): void {
        otherNV.scene.pan2Dxyzmm = vec4.clone(this.scene.pan2Dxyzmm)
    }

    /**
     * Synchronizes crosshair position with another Niivue instance.
     * @internal
     */
    doSyncCrosshair(otherNV: Niivue): void {
        const thisMM = this.frac2mm(this.scene.crosshairPos)
        otherNV.scene.crosshairPos = otherNV.mm2frac(thisMM)
    }

    /**
     * Synchronizes cal_min with another Niivue instance, updating GPU volume only if needed.
     * @internal
     */
    doSyncCalMin(otherNV: Niivue): void {
        // only call updateGLVolume if the cal_min is different
        // because updateGLVolume is expensive, but required to update the volume
        if (this.volumes[0].cal_min !== otherNV.volumes[0].cal_min) {
            otherNV.volumes[0].cal_min = this.volumes[0].cal_min
            otherNV.updateGLVolume()
        }
    }

    /**
     * Synchronizes cal_max with another Niivue instance, updating GPU volume only if needed.
     * @internal
     */
    doSyncCalMax(otherNV: Niivue): void {
        // only call updateGLVolume if the cal_max is different
        // because updateGLVolume is expensive, but required to update the volume
        if (this.volumes[0].cal_max !== otherNV.volumes[0].cal_max) {
            otherNV.volumes[0].cal_max = this.volumes[0].cal_max
            otherNV.updateGLVolume()
        }
    }

    /**
     * Synchronizes slice view type with another Niivue instance.
     * @internal
     */
    doSyncSliceType(otherNV: Niivue): void {
        otherNV.setSliceType(this.opts.sliceType)
    }

    /**
     * Synchronizes clip plane settings with another Niivue instance.
     * @internal
     */
    doSyncClipPlane(otherNV: Niivue): void {
        otherNV.setClipPlane(this.scene.clipPlaneDepthAziElevs[this.uiData.activeClipPlaneIndex])
    }

    /**
     * Sync the scene controls (orientation, crosshair location, etc.) from one Niivue instance to another. useful for using one canvas to drive another.
     * @internal
     * @example
     * niivue1 = new Niivue()
     * niivue2 = new Niivue()
     * niivue2.syncWith(niivue1)
     * niivue2.sync()
     */
    sync(): void {
        if (!this.gl || !this.otherNV || typeof this.otherNV === 'undefined') {
            return
        }
        // canvas must have focus to send messages issue706
        if (!(this.gl.canvas as HTMLCanvasElement).matches(':focus')) {
            return
        }
        for (let i = 0; i < this.otherNV.length; i++) {
            if (this.otherNV[i] === this) {
                continue
            }
            // gamma
            if (this.syncOpts.gamma) {
                this.doSyncGamma(this.otherNV[i])
            }
            // crosshair
            if (this.syncOpts.crosshair) {
                this.doSyncCrosshair(this.otherNV[i])
            }
            // zoomPan
            if (this.syncOpts.zoomPan) {
                this.doSyncZoomPan(this.otherNV[i])
            }
            // sliceType
            if (this.syncOpts.sliceType) {
                this.doSyncSliceType(this.otherNV[i])
            }
            // cal_min
            if (this.syncOpts.cal_min) {
                this.doSyncCalMin(this.otherNV[i])
            }
            // cal_max
            if (this.syncOpts.cal_max) {
                this.doSyncCalMax(this.otherNV[i])
            }
            // clipPlane
            if (this.syncOpts.clipPlane) {
                this.doSyncClipPlane(this.otherNV[i])
            }
            // legacy 2d option for multiple properties
            if (this.syncOpts['2d']) {
                this.doSync2d(this.otherNV[i])
            }
            // legacy 3d option for multiple properties
            if (this.syncOpts['3d']) {
                this.doSync3d(this.otherNV[i])
            }
            // do not redraw for other instances on the same canvas
            if (this.otherNV[i].canvas !== this.canvas) {
                this.otherNV[i].drawScene()
            }
            this.otherNV[i].createOnLocationChange()
        }
    }

    /** Not documented publicly for now
     * @internal
     * test if two arrays have equal values for each element
     * @param a - the first array
     * @param b - the second array
     * @example Niivue.arrayEquals(a, b)
     *
     * TODO this should maybe just use array-equal from NPM
     */
    arrayEquals(a: unknown[], b: unknown[]): boolean {
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index])
    }

    /**
     * @internal
     * Compute point size for screen text that scales with resolution and screen size.
     * - Keeps physical font size consistent across different DPIs.
     * - Uses fontSizeScaling to scale with canvas size above a reference threshold.
     */
    textSizePoints(): void {
        if (this.opts.textHeight >= 0) {
            log.warn(`textHeight is deprecated (use fontMinPx and fontSizeScaling)`)
            this.opts.fontMinPx = this.opts.textHeight * 217
            this.opts.fontSizeScaling = 0.4
            this.opts.textHeight = -1.0
        }
        const dpi = this.uiData.dpr || 1
        // basePointSize is defined in screen points (independent of dpi)
        const basePointSize = this.opts.fontMinPx
        // Convert canvas width/height to screen points (divide by dpr)
        const screenWidthPts = this.gl.canvas.width / dpi
        const screenHeightPts = this.gl.canvas.height / dpi
        const screenAreaPts = screenWidthPts * screenHeightPts
        // Reference screen area in points (800×600)
        const refAreaPts = 800 * 600
        const normalizedArea = Math.max(screenAreaPts / refAreaPts, 1)
        // Power-law scaling
        const scale = Math.pow(normalizedArea, this.opts.fontSizeScaling)
        // Convert to pixels: multiply by dpi
        const fontPx = basePointSize * scale * dpi
        this.fontPx = fontPx
        log.debug(
            `${screenWidthPts.toFixed(0)}x${screenHeightPts.toFixed(0)} pts (dpi=${dpi}) => areaScale=${normalizedArea.toFixed(2)}, ` +
                `scale=${scale.toFixed(2)}, minPx=${this.opts.fontMinPx} fontScale=${this.opts.fontSizeScaling} fontPx=${fontPx.toFixed(2)}`
        )
    }

    /**
     * callback function to handle resize window events, redraws the scene.
     * @internal
     */
    resizeListener(): void {
        // Use _gl directly to avoid getter that throws when null
        if (!EventController.isValidForResize(this.canvas, this._gl)) {
            return
        }
        if (!this.opts.isResizeCanvas) {
            if (this.opts.forceDevicePixelRatio >= 0) {
                log.warn('this.opts.forceDevicePixelRatio requires isResizeCanvas')
            }
            this.drawScene()
            return
        }

        EventController.applyCanvasResizeStyles(this.canvas)

        // https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
        // https://www.khronos.org/webgl/wiki/HandlingHighDPI
        const resizeResult = EventController.calculateResizeDimensions({
            canvas: this.canvas,
            gl: this.gl,
            isResizeCanvas: this.opts.isResizeCanvas,
            forceDevicePixelRatio: this.opts.forceDevicePixelRatio
        })

        this.uiData.dpr = resizeResult.dpr
        log.debug('devicePixelRatio: ' + this.uiData.dpr)

        this.canvas.width = resizeResult.width
        this.canvas.height = resizeResult.height

        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)

        this.textSizePoints()
        this.drawScene()
    }

    /**
     * callback to handle mouse move events relative to the canvas
     * @internal
     * @returns the mouse position relative to the canvas
     */
    getRelativeMousePosition(event: MouseEvent, target?: EventTarget | null): { x: number; y: number } | undefined {
        return EventController.getRelativeMousePosition(event, target)
    }

    /**
     * Returns mouse position relative to the canvas, excluding padding and borders.
     * @internal
     */
    getNoPaddingNoBorderCanvasRelativeMousePosition(event: MouseEvent, target: EventTarget): { x: number; y: number } | undefined {
        return EventController.getNoPaddingNoBorderCanvasRelativeMousePosition(event, target)
    }

    /**
     * Disables the default context menu to allow custom right-click behavior.
     * @internal
     */
    mouseContextMenuListener(e: MouseEvent): void {
        e.preventDefault()
    }

    /**
     * Handles mouse down events for interaction, segmentation, and connectome label selection.
     * Routes to appropriate button handler based on click type.
     * @internal
     */
    mouseDownListener(e: MouseEvent): void {
        this.uiData.mousedown = true

        if (!this.eventInBounds(e)) {
            this.opts.showBoundsBorder = false
            this.drawScene()
            return
        } else if (this.opts.bounds) {
            this.opts.showBoundsBorder = true
        }
        e.preventDefault()
        // var rect = this.canvas.getBoundingClientRect();
        this.drawPenLocation = [NaN, NaN, NaN]
        this.drawPenAxCorSag = -1
        this.drawShapeStartLocation = [NaN, NaN, NaN] // Reset shape start location

        // record tile where mouse clicked
        const pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(e, this.gl.canvas)

        // reset drag positions used previously (but not during angle measurement second line)
        if (!(this.opts.dragMode === DRAG_MODE.angle && this.uiData.angleState === 'drawing_second_line')) {
            this.setDragStart(pos.x, pos.y)
            this.setDragEnd(pos.x, pos.y)
        }
        log.debug('mouse down')
        log.debug(e)

        if (!pos) {
            return
        }

        const [x, y] = [pos.x * this.uiData.dpr!, pos.y * this.uiData.dpr!]

        if (this.opts.clickToSegment) {
            this.clickToSegmentXY = [x, y]
        }
        const label = this.getLabelAtPoint([x, y])
        if (label) {
            // check for user defined onclick handler
            if (label.onClick) {
                label.onClick(label, e)
                return
            }
            // find associated mesh
            for (const mesh of this.meshes) {
                if (mesh.type !== MeshType.CONNECTOME) {
                    if (Array.isArray(label.points) && label.points.length === 3 && label.points.every(Number.isFinite)) {
                        const [x, y, z] = label.points as [number, number, number]
                        this.scene.crosshairPos = this.mm2frac([x, y, z])
                        this.updateGLVolume()
                        // this.drawScene()
                    }
                    continue
                }
                for (const node of mesh.nodes as NVConnectomeNode[]) {
                    if (node.label === label) {
                        this.scene.crosshairPos = this.mm2frac([node.x, node.y, node.z])
                        this.updateGLVolume()
                        // this.drawScene()
                    }
                }
            }
        }
        this.uiData.clickedTile = this.tileIndex(x, y)
        // respond to different types of mouse clicks
        if (e.button === LEFT_MOUSE_BUTTON && e.shiftKey) {
            this.uiData.mouseButtonCenterDown = true
            this.setActiveDragMode(LEFT_MOUSE_BUTTON, true, e.ctrlKey)
            this.handleMouseAction(this.uiData.activeDragMode!, e, pos)
        } else if (e.button === LEFT_MOUSE_BUTTON) {
            this.uiData.mouseButtonLeftDown = true
            this.setActiveDragMode(LEFT_MOUSE_BUTTON, false, e.ctrlKey)
            this.handleMouseAction(this.uiData.activeDragMode!, e, pos)
        } else if (e.button === RIGHT_MOUSE_BUTTON) {
            this.uiData.mouseButtonRightDown = true
            this.setActiveDragMode(RIGHT_MOUSE_BUTTON, e.shiftKey, e.ctrlKey)
            this.handleMouseAction(this.uiData.activeDragMode!, e, pos)
        } else if (e.button === CENTER_MOUSE_BUTTON) {
            this.uiData.mouseButtonCenterDown = true
            this.setActiveDragMode(CENTER_MOUSE_BUTTON, e.shiftKey, e.ctrlKey)
            this.handleMouseAction(this.uiData.activeDragMode!, e, pos)
        }
        this.drawScene()
    }

    /**
     * Gets the appropriate drag mode for a mouse button based on configuration.
     * @internal
     */
    getMouseButtonDragMode(button: number, shiftKey: boolean, ctrlKey: boolean): DRAG_MODE {
        return MouseController.getMouseButtonDragMode({
            button,
            shiftKey,
            ctrlKey,
            mouseConfig: this.opts.mouseEventConfig,
            dragMode: this.opts.dragMode,
            dragModePrimary: this.opts.dragModePrimary
        })
    }

    /**
     * Gets the appropriate drag mode for touch events based on configuration.
     * @internal
     */
    getTouchDragMode(isDoubleTouch: boolean): DRAG_MODE {
        return TouchController.getTouchDragMode({
            isDoubleTouch,
            touchConfig: this.opts.touchEventConfig,
            dragMode: this.opts.dragMode,
            dragModePrimary: this.opts.dragModePrimary
        })
    }

    /**
     * Sets the active drag mode for the current interaction.
     * @internal
     */
    setActiveDragMode(button: number, shiftKey: boolean, ctrlKey: boolean): void {
        const dragMode = this.getMouseButtonDragMode(button, shiftKey, ctrlKey)
        const state = DragModeManager.createActiveDragModeState(dragMode, button)
        this.uiData.activeDragMode = state.activeDragMode
        this.uiData.activeDragButton = state.activeDragButton
    }

    /**
     * Gets the currently active drag mode, or falls back to configured defaults.
     * @internal
     */
    getCurrentDragMode(): DRAG_MODE {
        return DragModeManager.getCurrentDragModeValue({
            activeDragMode: this.uiData.activeDragMode,
            fallbackDragMode: this.opts.dragMode
        })
    }

    /**
     * Clears the active drag mode.
     * @internal
     */
    clearActiveDragMode(): void {
        const state = DragModeManager.createClearedDragModeState()
        this.uiData.activeDragMode = state.activeDragMode
        this.uiData.activeDragButton = state.activeDragButton
    }

    /**
     * Unified handler for mouse actions based on drag mode.
     * @internal
     */
    handleMouseAction(dragMode: DRAG_MODE, e: MouseEvent, pos: { x: number; y: number }): void {
        if (dragMode === DRAG_MODE.crosshair) {
            this.mouseDown(pos.x, pos.y)
            this.mouseClick(pos.x, pos.y)
        } else if (dragMode === DRAG_MODE.windowing) {
            this.uiData.windowX = e.x
            this.uiData.windowY = e.y
        } else {
            // Handle all other drag modes (contrast, measurement, pan, etc.)
            this.mousePos = [pos.x * this.uiData.dpr!, pos.y * this.uiData.dpr!]

            if (dragMode === DRAG_MODE.none) {
                return
            }

            // Initialize angle measurement
            if (dragMode === DRAG_MODE.angle) {
                if (this.uiData.angleState === 'none') {
                    this.uiData.angleState = 'drawing_first_line'
                } else if (this.uiData.angleState === 'drawing_second_line') {
                    // Final click - save completed angle with slice info
                    // Use current click position instead of dragEnd for final position
                    const finalClickPos = [pos.x * this.uiData.dpr!, pos.y * this.uiData.dpr!]

                    // Get slice info using the current click position
                    const tileIdx = this.tileIndex(finalClickPos[0], finalClickPos[1])

                    let sliceInfo = { sliceIndex: -1, sliceType: SLICE_TYPE.AXIAL, slicePosition: 0 }
                    if (tileIdx >= 0 && tileIdx < this.screenSlices.length) {
                        const sliceType = this.screenSlices[tileIdx].axCorSag
                        let slicePosition = 0

                        // Get the current slice position based on the crosshair position
                        if (sliceType === SLICE_TYPE.AXIAL) {
                            slicePosition = this.scene.crosshairPos[2] // Z coordinate for axial slices
                        } else if (sliceType === SLICE_TYPE.CORONAL) {
                            slicePosition = this.scene.crosshairPos[1] // Y coordinate for coronal slices
                        } else if (sliceType === SLICE_TYPE.SAGITTAL) {
                            slicePosition = this.scene.crosshairPos[0] // X coordinate for sagittal slices
                        }

                        sliceInfo = {
                            sliceIndex: tileIdx,
                            sliceType,
                            slicePosition
                        }
                    }

                    const secondLine = [
                        this.uiData.angleFirstLine[2], // start from end of first line
                        this.uiData.angleFirstLine[3],
                        finalClickPos[0], // to final click position
                        finalClickPos[1]
                    ]

                    // Convert canvas coordinates to world coordinates
                    const firstLineStartFrac = this.canvasPos2frac([this.uiData.angleFirstLine[0], this.uiData.angleFirstLine[1]])
                    const firstLineEndFrac = this.canvasPos2frac([this.uiData.angleFirstLine[2], this.uiData.angleFirstLine[3]])
                    const secondLineStartFrac = this.canvasPos2frac([secondLine[0], secondLine[1]])
                    const secondLineEndFrac = this.canvasPos2frac([secondLine[2], secondLine[3]])

                    if (firstLineStartFrac[0] >= 0 && firstLineEndFrac[0] >= 0 && secondLineStartFrac[0] >= 0 && secondLineEndFrac[0] >= 0) {
                        const firstLineStartMM = this.frac2mm(firstLineStartFrac)
                        const firstLineEndMM = this.frac2mm(firstLineEndFrac)
                        const secondLineStartMM = this.frac2mm(secondLineStartFrac)
                        const secondLineEndMM = this.frac2mm(secondLineEndFrac)

                        const angleToSave = {
                            firstLineMM: {
                                start: vec3.fromValues(firstLineStartMM[0], firstLineStartMM[1], firstLineStartMM[2]),
                                end: vec3.fromValues(firstLineEndMM[0], firstLineEndMM[1], firstLineEndMM[2])
                            },
                            secondLineMM: {
                                start: vec3.fromValues(secondLineStartMM[0], secondLineStartMM[1], secondLineStartMM[2]),
                                end: vec3.fromValues(secondLineEndMM[0], secondLineEndMM[1], secondLineEndMM[2])
                            },
                            sliceIndex: sliceInfo.sliceIndex,
                            sliceType: sliceInfo.sliceType,
                            slicePosition: sliceInfo.slicePosition,
                            angle: this.calculateAngleBetweenLines(this.uiData.angleFirstLine, secondLine)
                        }

                        this.document.completedAngles.push(angleToSave)
                    }

                    this.resetAngleMeasurement()
                    this.uiData.angleState = 'complete'
                    this.drawScene()
                    return
                } else if (this.uiData.angleState === 'complete') {
                    this.resetAngleMeasurement()
                    this.uiData.angleState = 'drawing_first_line'
                }
            }

            this.setDragStart(pos.x, pos.y)
            if (!this.uiData.isDragging) {
                this.uiData.pan2DxyzmmAtMouseDown = vec4.clone(this.scene.pan2Dxyzmm)
                // Store Zarr viewport center at drag start for all zarr volumes
                for (const vol of this.getZarrVolumes()) {
                    vol.zarrHelper?.beginDrag()
                }
            }
            this.uiData.isDragging = true
            this.uiData.dragClipPlaneStartDepthAziElev = this.scene.clipPlaneDepthAziElevs[this.uiData.activeClipPlaneIndex]
        }
    }

    /**
     * calculate the the min and max voxel indices from an array of two values (used in selecting intensities with the selection box)
     * @internal
     * @param array - an array of two values
     * @returns an array of two values representing the min and max voxel indices
     */
    calculateMinMaxVoxIdx(array: number[]): [number, number] {
        return DragModeManager.calculateMinMaxVoxIdx(array)
    }

    /**
     * Updates cal_min and cal_max based on intensity range within the drag-selected voxel region.
     * Skips if no drag occurred, volume is missing, or selection has no variation.
     * @internal
     */
    calculateNewRange({ volIdx = 0 } = {}): void {
        if (this.opts.sliceType === SLICE_TYPE.RENDER && this.sliceMosaicString.length < 1) {
            return
        }
        if (!MouseController.hasDragMoved(this.uiData.dragStart, this.uiData.dragEnd)) {
            return
        }
        // calculate our box
        let frac = this.canvasPos2frac([this.uiData.dragStart[0], this.uiData.dragStart[1]])
        if (frac[0] < 0) {
            return
        }
        const startVox = this.frac2vox(frac, volIdx)
        frac = this.canvasPos2frac([this.uiData.dragEnd[0], this.uiData.dragEnd[1]])
        if (frac[0] < 0) {
            return
        }
        const endVox = this.frac2vox(frac, volIdx)

        const xrange = this.calculateMinMaxVoxIdx([startVox[0], endVox[0]])
        const yrange = this.calculateMinMaxVoxIdx([startVox[1], endVox[1]])
        const zrange = this.calculateMinMaxVoxIdx([startVox[2], endVox[2]])

        // Adjust ranges for constant dimensions
        const adjustedRanges = DragModeManager.adjustRangesForConstantDimension(startVox, endVox, xrange, yrange, zrange)

        const hdr = this.volumes[volIdx].hdr
        const img = this.volumes[volIdx].img
        if (!hdr || !img) {
            return
        }

        // Calculate intensity range using helper
        const intensityResult = DragModeManager.calculateIntensityRangeFromVoxels({
            xrange: adjustedRanges.xrange,
            yrange: adjustedRanges.yrange,
            zrange: adjustedRanges.zrange,
            dims: hdr.dims,
            img
        })

        if (!intensityResult.hasVariation) {
            return
        } // no variability or outside volume

        const mnScale = intensityRaw2Scaled(hdr, intensityResult.lo)
        const mxScale = intensityRaw2Scaled(hdr, intensityResult.hi)
        this.volumes[volIdx].cal_min = mnScale
        this.volumes[volIdx].cal_max = mxScale
        this.onIntensityChange(this.volumes[volIdx])
    }

    /**
     * Triggers a drag-release callback with voxel, mm, and tile info from the drag gesture.
     * @internal
     */
    generateMouseUpCallback(fracStart: vec3, fracEnd: vec3): void {
        // calculate details for callback
        const tileStart = this.tileIndex(this.uiData.dragStart[0], this.uiData.dragStart[1])
        const tileEnd = this.tileIndex(this.uiData.dragEnd[0], this.uiData.dragEnd[1])
        // a tile index of -1 indicates invalid: drag not constrained to one tile
        let tileIdx = -1
        if (tileStart === tileEnd) {
            tileIdx = tileEnd
        }
        let axCorSag = -1
        if (tileIdx >= 0) {
            axCorSag = this.screenSlices[tileIdx].axCorSag
        }
        const mmStart = this.frac2mm(fracStart)
        const mmEnd = this.frac2mm(fracEnd)
        const v = vec3.create()
        vec3.sub(v, vec3.fromValues(mmStart[0], mmStart[1], mmStart[2]), vec3.fromValues(mmEnd[0], mmEnd[1], mmEnd[2]))
        const mmLength = vec3.len(v)
        const voxStart = this.frac2vox(fracStart)
        const voxEnd = this.frac2vox(fracEnd)
        this.onDragRelease({
            fracStart,
            fracEnd,
            voxStart,
            voxEnd,
            mmStart,
            mmEnd,
            mmLength,
            tileIdx,
            axCorSag
        })
    }

    /**
     * Handles mouse up events, finalizing drag actions, invoking callbacks, and updating contrast if needed.
     * @internal
     */
    mouseUpListener(): void {
        this.uiData.mousedown = false

        // let fracPos = this.canvasPos2frac(this.mousePos);
        const uiData = {
            mouseButtonRightDown: this.uiData.mouseButtonRightDown,
            mouseButtonCenterDown: this.uiData.mouseButtonCenterDown,
            isDragging: this.uiData.isDragging,
            mousePos: this.mousePos,
            fracPos: this.canvasPos2frac(this.mousePos)
            // xyzMM: this.frac2mm(fracPos),
        }
        this.uiData.mouseButtonRightDown = false
        const wasCenterDown = this.uiData.mouseButtonCenterDown
        this.uiData.mouseButtonCenterDown = false
        this.uiData.mouseButtonLeftDown = false

        // Save current drag mode for logic that depends on it
        const currentDragMode = this.getCurrentDragMode()

        if (this.drawPenFillPts.length > 0) {
            this.drawPenFilled()
        } else if (this.opts.drawingEnabled && !isNaN(this.drawPenLocation[0])) {
            this.drawAddUndoBitmap()
        } else if (this.opts.drawingEnabled && !isNaN(this.drawShapeStartLocation[0]) && (this.opts.penType === PEN_TYPE.RECTANGLE || this.opts.penType === PEN_TYPE.ELLIPSE)) {
            // Finalize rectangle or ellipse drawing - the shape is already drawn in drawBitmap
            if (this.opts.penValue === 0) {
                this.drawAddUndoBitmap()
            } else {
                // issue1409
                this.drawAddUndoBitmap(this.drawFillOverwrites)
            }
            // Clean up preview bitmap since we're keeping the final drawing
            this.drawShapePreviewBitmap = null
        }
        this.drawPenLocation = [NaN, NaN, NaN]
        this.drawPenAxCorSag = -1
        this.drawShapeStartLocation = [NaN, NaN, NaN]
        // Only restore preview bitmap if we didn't finalize a shape drawing
        if (this.drawShapePreviewBitmap) {
            this.drawBitmap = this.drawShapePreviewBitmap
            this.drawShapePreviewBitmap = null
            this.refreshDrawing(true, false)
        }
        if (MouseController.isFunction(this.onMouseUp)) {
            this.onMouseUp(uiData)
        }
        if (this.uiData.isDragging) {
            this.uiData.isDragging = false
            for (const vol of this.getZarrVolumes()) {
                vol.zarrHelper?.endDrag()
            }

            // Handle angle measurement workflow
            if (currentDragMode === DRAG_MODE.angle) {
                if (this.uiData.angleState === 'drawing_first_line') {
                    // First line completed, save it and start drawing second line
                    this.uiData.angleFirstLine = [this.uiData.dragStart[0], this.uiData.dragStart[1], this.uiData.dragEnd[0], this.uiData.dragEnd[1]]
                    this.uiData.angleState = 'drawing_second_line'
                    // Continue tracking mouse for second line
                    this.uiData.isDragging = true
                    this.drawScene()
                    return
                }
                if (this.uiData.angleState === 'drawing_second_line') {
                    // Second line completed, but angle will be saved in mouseDownListener
                    this.uiData.angleState = 'complete'
                    this.clearActiveDragMode()
                    this.drawScene()
                    return
                }
            }

            if (currentDragMode === DRAG_MODE.callbackOnly) {
                this.drawScene()
            } // hide selectionbox
            const fracStart = this.canvasPos2frac([this.uiData.dragStart[0], this.uiData.dragStart[1]])
            const fracEnd = this.canvasPos2frac([this.uiData.dragEnd[0], this.uiData.dragEnd[1]])
            this.generateMouseUpCallback(fracStart, fracEnd)
            // if roiSelection drag mode
            if (currentDragMode === DRAG_MODE.roiSelection) {
                // do not call drawScene so that the selection box remains visible
                this.clearActiveDragMode()
                return
            }
            if (currentDragMode === DRAG_MODE.contrast) {
                if (wasCenterDown) {
                    this.clearActiveDragMode()
                    return
                }
                if (!MouseController.hasDragMoved(this.uiData.dragStart, this.uiData.dragEnd)) {
                    this.clearActiveDragMode()
                    return
                }
                this.calculateNewRange({ volIdx: 0 })
                this.refreshLayers(this.volumes[0], 0)
            }
            if (currentDragMode === DRAG_MODE.measurement) {
                // Save completed measurement line with slice info
                const sliceInfo = this.getCurrentSliceInfo()

                // Convert canvas coordinates to world coordinates
                const startFrac = this.canvasPos2frac([this.uiData.dragStart[0], this.uiData.dragStart[1]])
                const endFrac = this.canvasPos2frac([this.uiData.dragEnd[0], this.uiData.dragEnd[1]])

                if (startFrac[0] >= 0 && endFrac[0] >= 0) {
                    const startMM = this.frac2mm(startFrac)
                    const endMM = this.frac2mm(endFrac)

                    this.document.completedMeasurements.push({
                        startMM: vec3.fromValues(startMM[0], startMM[1], startMM[2]),
                        endMM: vec3.fromValues(endMM[0], endMM[1], endMM[2]),
                        sliceIndex: sliceInfo.sliceIndex,
                        sliceType: sliceInfo.sliceType,
                        slicePosition: sliceInfo.slicePosition,
                        distance: vec3.distance(vec3.fromValues(startMM[0], startMM[1], startMM[2]), vec3.fromValues(endMM[0], endMM[1], endMM[2]))
                    })
                }

                this.clearActiveDragMode()
                this.drawScene()
                return
            }
        }

        this.clearActiveDragMode()
        this.drawScene()
    }

    /**
     * Handles initial touch event to simulate mouse click if not in a multi-touch gesture.
     * @internal
     */
    checkMultitouch(e: TouchEvent): void {
        if (
            TouchController.shouldSimulateMouseBehavior({
                touchdown: this.uiData.touchdown,
                multiTouchGesture: this.uiData.multiTouchGesture
            })
        ) {
            const rect = this.canvas!.getBoundingClientRect()
            const pos = TouchController.calculateTouchPosition({
                touch: e.touches[0],
                canvasRect: rect
            })
            this.mouseDown(pos.x, pos.y)
            this.mouseClick(pos.x, pos.y)
        }
    }

    /**
     * Handles touch start events, detecting double taps and preparing for gesture or contrast reset.
     * @internal
     */
    touchStartListener(e: TouchEvent): void {
        e.preventDefault()

        // Start long press timer if not already running
        if (TouchController.shouldStartLongPressTimer(this.uiData.touchTimer)) {
            this.uiData.touchTimer = setTimeout(() => {
                this.resetBriCon(e)
            }, this.opts.longTouchTimeout)
        }

        const currentTime = new Date().getTime()

        // Initialize touch state
        const touchState = TouchController.initializeTouchState({
            currentTime,
            touchCount: e.touches.length,
            isTouchdown: this.uiData.touchdown
        })
        this.uiData.touchdown = touchState.touchdown
        this.uiData.currentTouchTime = touchState.currentTouchTime

        // Check for double tap
        const doubleTapResult = TouchController.detectDoubleTap({
            currentTime,
            lastTouchTime: this.uiData.lastTouchTime,
            doubleTouchTimeout: this.opts.doubleTouchTimeout
        })

        if (doubleTapResult.isDoubleTap) {
            // Double tap detected
            const doubleTapState = TouchController.createDoubleTapState(currentTime)
            this.uiData.doubleTouch = doubleTapState.doubleTouch!
            this.uiData.lastTouchTime = doubleTapState.lastTouchTime!

            const rect = (e.target as HTMLElement).getBoundingClientRect()
            const pos = TouchController.calculateTouchPosition({
                touch: e.targetTouches[0],
                canvasRect: rect
            })
            this.setDragStart(pos.x, pos.y)
            this.resetBriCon(e)
            return
        } else {
            // Single touch - reset values for next touch
            const newSequenceState = TouchController.createNewTouchSequenceState(currentTime)
            this.uiData.doubleTouch = newSequenceState.doubleTouch ?? false
            this.uiData.lastTouchTime = newSequenceState.lastTouchTime!
            this.setDragStart(0, 0)
            this.setDragEnd(0, 0)
        }

        // Determine multi-touch gesture state
        if (TouchController.isSingleFingerTouch(this.uiData.touchdown, e.touches.length)) {
            this.uiData.multiTouchGesture = false
        } else {
            this.uiData.multiTouchGesture = true
        }

        setTimeout(this.checkMultitouch.bind(this), 1, e)
    }

    /**
     * Handles touch end events, finalizing gestures and contrast adjustments, then triggers mouse up logic.
     * @internal
     */
    touchEndListener(e: TouchEvent): void {
        e.preventDefault()

        // Reset touch state
        const endState = TouchController.createTouchEndState()
        this.uiData.touchdown = endState.touchdown!
        this.uiData.lastTwoTouchDistance = endState.lastTwoTouchDistance!
        this.uiData.multiTouchGesture = endState.multiTouchGesture!

        // Clear long press timer
        if (this.uiData.touchTimer) {
            clearTimeout(this.uiData.touchTimer)
            this.uiData.touchTimer = null
        }

        // Handle drag completion
        if (this.uiData.isDragging) {
            this.uiData.isDragging = false
            for (const vol of this.getZarrVolumes()) {
                vol.zarrHelper?.endDrag()
            }
            // if drag mode is contrast, and the user double taps and drags...
            if (this.getCurrentDragMode() === DRAG_MODE.contrast) {
                this.calculateNewRange()
                this.refreshLayers(this.volumes[0], 0)
            }
            const fracStart = this.canvasPos2frac([this.uiData.dragStart[0], this.uiData.dragStart[1]])
            const fracEnd = this.canvasPos2frac([this.uiData.dragEnd[0], this.uiData.dragEnd[1]])
            // just use the generateMouseUpCallback since it
            // does everything we need (same as the behaviour in mouseUpListener)
            this.generateMouseUpCallback(fracStart, fracEnd)
        }
        // mouseUp generates this.drawScene();
        this.mouseUpListener()
    }

    /**
     * Adjusts window/level (cal_min and cal_max) based on mouse or touch drag direction.
     * @internal
     */
    windowingHandler(x: number, y: number, volIdx: number = 0): void {
        // Calculate windowing adjustments using helper
        const result = DragModeManager.calculateWindowingAdjustment({
            x,
            y,
            windowX: this.uiData.windowX,
            windowY: this.uiData.windowY,
            currentCalMin: this.volumes[0].cal_min!,
            currentCalMax: this.volumes[0].cal_max!,
            globalMin: this.volumes[0].global_min!,
            globalMax: this.volumes[0].global_max!
        })

        this.volumes[volIdx].cal_min = result.calMin
        this.volumes[volIdx].cal_max = result.calMax
        this.refreshLayers(this.volumes[volIdx], 0)
        // set the current mouse position (window space) as the new reference point
        // for the next comparison
        this.uiData.windowX = result.windowX
        this.uiData.windowY = result.windowY
    }

    /**
     * Handles mouse leaving the canvas, resetting segmentation, drawing, and drag states.
     * @internal
     */
    mouseLeaveListener(): void {
        // If clickToSegment preview was active, deactivate and refresh drawing
        if (this.clickToSegmentIsGrowing) {
            log.debug('Mouse left canvas, stopping clickToSegment preview.')
            this.clickToSegmentIsGrowing = false
            // Refresh the GPU texture using the main drawBitmap to hide preview
            this.refreshDrawing(true, false)
        }

        // Reset pen state if drawing was in progress
        if (this.opts.drawingEnabled && !isNaN(this.drawPenLocation[0])) {
            log.debug('Mouse left canvas during drawing, resetting pen state.')
            this.drawPenLocation = [NaN, NaN, NaN]
            this.drawPenAxCorSag = -1
            this.drawPenFillPts = []
        }

        // Reset shape drawing state if drawing was in progress
        if (this.opts.drawingEnabled && !isNaN(this.drawShapeStartLocation[0])) {
            log.debug('Mouse left canvas during shape drawing, resetting shape state.')
            this.drawShapeStartLocation = [NaN, NaN, NaN]
            // Restore main drawing bitmap if we were previewing a shape
            if (this.drawShapePreviewBitmap) {
                this.drawBitmap = this.drawShapePreviewBitmap
                this.drawShapePreviewBitmap = null
                this.refreshDrawing(true, false)
            }
        }

        // Reset drag state if mouse leaves during drag
        if (this.uiData.isDragging || this.uiData.mousedown) {
            log.debug('Mouse left canvas during drag, resetting drag state.')
            this.uiData.isDragging = false
            for (const vol of this.getZarrVolumes()) {
                vol.zarrHelper?.endDrag()
            }
            const resetState = MouseController.createResetButtonState()
            this.uiData.mouseButtonLeftDown = resetState.mouseButtonLeftDown
            this.uiData.mouseButtonCenterDown = resetState.mouseButtonCenterDown
            this.uiData.mouseButtonRightDown = resetState.mouseButtonRightDown
            this.uiData.mousedown = resetState.mousedown
            this.drawScene()
        }
        // Mark cursor as off-canvas so cursorInBounds() always returns false
        this.mousePos = MouseController.createOffCanvasPosition()
    }

    /**
     * Handles mouse move events for dragging, crosshair movement, windowing, and click-to-segment preview.
     * @internal
     */
    mouseMoveListener(e: MouseEvent): void {
        // move crosshair and change slices if mouse click and move

        // we need to do this when we have multiple instances
        if (this.uiData.mousedown) {
            // lag : we should try to remove if redundant
            this.drawScene()
        }

        const pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(e, this.gl.canvas)
        // ignore if mouse moves outside of tile of initial click
        if (!pos) {
            return
        }
        if (!this.eventInBounds(e)) {
            this.updateMousePos(pos.x, pos.y)
            return
        }
        if (this.uiData.mousedown) {
            const x = pos.x * this.uiData.dpr!
            const y = pos.y * this.uiData.dpr!
            const tile = this.tileIndex(x, y)
            if (tile !== this.uiData.clickedTile) {
                return
            }
            // Use the active drag mode to determine how to handle mouse movement
            const activeDragMode = this.getCurrentDragMode()

            if (activeDragMode === DRAG_MODE.crosshair) {
                this.mouseMove(pos.x, pos.y)
                const isChanged = !this.mouseClick(pos.x, pos.y)
                if (!isChanged && this.uiData.prevX === this.uiData.currX && this.uiData.prevY === this.uiData.currY) {
                    // lag
                    return
                }
                this.mouseClick(pos.x, pos.y)
                // lag this.drawScene()
                this.uiData.prevX = this.uiData.currX
                this.uiData.prevY = this.uiData.currY
                return
            }
            if (activeDragMode === DRAG_MODE.windowing) {
                this.windowingHandler(pos.x, pos.y)
                this.drawScene()
                this.uiData.prevX = this.uiData.currX
                this.uiData.prevY = this.uiData.currY
                return
            }
            // Handle all other drag modes that need drag tracking
            this.setDragEnd(pos.x, pos.y)
            this.drawScene()
            this.uiData.prevX = this.uiData.currX
            this.uiData.prevY = this.uiData.currY
        } else if (this.getCurrentDragMode() === DRAG_MODE.angle && this.uiData.angleState === 'drawing_second_line') {
            // Handle angle measurement second line tracking
            const pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(e, this.gl.canvas)
            if (!pos) {
                return
            }
            this.setDragEnd(pos.x, pos.y)
            this.drawScene()
        } else if (!this.uiData.mousedown && this.opts.clickToSegment) {
            // Handle clickToSegment preview OUTSIDE the mousedown block
            const pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(e, this.gl.canvas)
            // ignore if mouse moves outside canvas
            if (!pos) {
                return
            }
            const x = pos.x * this.uiData.dpr!
            const y = pos.y * this.uiData.dpr!
            this.mousePos = [x, y]

            // Find the tile under the cursor
            const tileIdx = this.tileIndex(x, y)

            // If over a valid tile and drawing is enabled, perform preview
            if (tileIdx >= 0 && this.opts.drawingEnabled) {
                // Get the actual orientation type for the specific tile
                const axCorSag = this.screenSlices[tileIdx].axCorSag
                // Ensure it's a 2D slice view
                if (axCorSag <= SLICE_TYPE.SAGITTAL) {
                    this.clickToSegmentXY = [x, y]
                    this.clickToSegmentIsGrowing = true // Indicate preview mode
                    // Pass the TILE INDEX to doClickToSegment
                    this.doClickToSegment({
                        x, // Screen X
                        y, // Screen Y
                        tileIndex: tileIdx
                    })
                }
            }
        }
    }

    /**
     * Resets brightness and contrast to robust min/max unless in render mode or during interaction.
     * @internal
     */
    resetBriCon(msg: TouchEvent | MouseEvent | null = null): void {
        // this.volumes[0].cal_min = this.volumes[0].global_min;
        // this.volumes[0].cal_max = this.volumes[0].global_max;
        // don't reset bri/con if the user is in 3D mode and double clicks
        if (this.uiData.isDragging) {
            return
        }
        if (!this.eventInBounds(msg)) {
            this.opts.showBoundsBorder = false
            return
        }

        let isRender = false
        if (this.opts.sliceType === SLICE_TYPE.RENDER) {
            isRender = true
        }
        let x = 0
        let y = 0
        if (msg !== null) {
            // if a touch event
            if ('targetTouches' in msg) {
                x = msg.targetTouches[0].clientX - (msg.target as HTMLElement).getBoundingClientRect().left
                y = msg.targetTouches[0].clientY - (msg.target as HTMLElement).getBoundingClientRect().top
            } else {
                // if a mouse event
                x = msg.offsetX
                y = msg.offsetY
            }
            x *= this.uiData.dpr!
            y *= this.uiData.dpr!
            // test if render is one of the tiles
            if (this.inRenderTile(x, y) >= 0) {
                isRender = true
            }
        }
        if (isRender) {
            this.uiData.mouseDepthPicker = true
            this.drawScene()
            this.drawScene() // this duplicate drawScene is necessary for depth picking. DO NOT REMOVE
            return
        }
        if (this.getCurrentDragMode() === DRAG_MODE.slicer3D) {
            return
        }
        if (this.volumes.length < 1) {
            return
        } // issue468, AFTER render depth picking
        if (this.uiData.doubleTouch) {
            return
        }
        this.volumes[0].cal_min = this.volumes[0].robust_min
        this.volumes[0].cal_max = this.volumes[0].robust_max
        this.onIntensityChange(this.volumes[0])
        this.refreshLayers(this.volumes[0], 0)
        this.drawScene()
    }

    /**
     * Sets the drag start position in canvas coordinates.
     * @internal
     */
    setDragStart(x: number, y: number): void {
        const [scaledX, scaledY] = DragModeManager.calculateDragPosition(x, y, this.uiData.dpr!)
        this.uiData.dragStart[0] = scaledX
        this.uiData.dragStart[1] = scaledY
    }

    /**
     * Sets the drag end position in canvas coordinates.
     * @internal
     */
    setDragEnd(x: number, y: number): void {
        const [scaledX, scaledY] = DragModeManager.calculateDragPosition(x, y, this.uiData.dpr!)
        this.uiData.dragEnd[0] = scaledX
        this.uiData.dragEnd[1] = scaledY
    }

    /**
     * Handles touch movement for crosshair, windowing, and pinch-to-zoom interactions.
     * @internal
     */
    touchMoveListener(e: TouchEvent): void {
        // Check for single-finger touch
        if (TouchController.isSingleFingerTouch(this.uiData.touchdown, e.touches.length)) {
            const rect = this.canvas!.getBoundingClientRect()

            // Initialize drag state if not already dragging
            if (!this.uiData.isDragging) {
                this.uiData.pan2DxyzmmAtMouseDown = vec4.clone(this.scene.pan2Dxyzmm)
                // Store Zarr viewport center at drag start for all zarr volumes
                for (const vol of this.getZarrVolumes()) {
                    vol.zarrHelper?.beginDrag()
                }
            }
            this.uiData.isDragging = true

            // Handle double touch drag
            if (
                TouchController.shouldUpdateDoubleTouchDrag({
                    doubleTouch: this.uiData.doubleTouch,
                    isDragging: this.uiData.isDragging
                })
            ) {
                const pos = TouchController.calculateTouchPosition({
                    touch: e.targetTouches[0],
                    canvasRect: (e.target as HTMLElement).getBoundingClientRect()
                })
                this.setDragEnd(pos.x, pos.y)
                this.drawScene()
                return
            }

            // Handle single touch based on drag mode
            const dragMode = this.getTouchDragMode(false)
            const touchMovePos = TouchController.calculateTouchMovePosition({
                touch: e.touches[0],
                canvasRect: rect
            })

            if (dragMode === DRAG_MODE.crosshair) {
                this.mouseClick(touchMovePos.x, touchMovePos.y)
                this.mouseMove(touchMovePos.x, touchMovePos.y)
            } else if (dragMode === DRAG_MODE.windowing) {
                this.windowingHandler(touchMovePos.pageX, touchMovePos.pageY)
                this.drawScene()
            }
        } else {
            // Check this event for 2-touch Move/Pinch/Zoom gesture
            this.handlePinchZoom(e)
        }
    }

    /**
     * Handles pinch-to-zoom gestures for scrolling 2D slices.
     * @internal
     */
    handlePinchZoom(e: TouchEvent): void {
        if (TouchController.shouldProcessPinchZoom(e.targetTouches.length, e.changedTouches.length)) {
            const rect = this.canvas!.getBoundingClientRect()

            // Calculate pinch zoom using helper function
            const pinchResult = TouchController.calculatePinchZoom({
                touch1: e.touches[0],
                touch2: e.touches[1],
                lastTwoTouchDistance: this.uiData.lastTwoTouchDistance
            })

            // Update mouse position for scroll target
            const touchPos = TouchController.getMousePosFromTouch({
                touch: e.touches[0],
                canvasRect: rect
            })
            this.mousePos = touchPos

            // Scroll 2D slices based on pinch direction (only if we have a previous distance)
            if (this.uiData.lastTwoTouchDistance > 0) {
                this.sliceScroll2D(pinchResult.scrollDelta, touchPos[0], touchPos[1])
            }

            // Update last distance for next calculation
            this.uiData.lastTwoTouchDistance = pinchResult.distance
        }
    }

    /**
     * Cycles active clip plane
     * @internal
     * @returns active clip plane index
     */
    cycleActiveClipPlane(): number {
        const result = KeyboardController.cycleActiveClipPlane({
            currentIndex: this.uiData.activeClipPlaneIndex,
            clipPlanesLength: this.scene.clipPlanes.length
        })

        this.uiData.activeClipPlaneIndex = result.newIndex
        const idx = result.newIndex

        // ensure slot exists for both clipPlanes and clipPlaneDepthAziElevs
        if (!this.scene.clipPlanes[idx]) {
            this.scene.clipPlanes[idx] = result.defaultClipPlane
        }
        if (!this.scene.clipPlaneDepthAziElevs[idx]) {
            this.scene.clipPlaneDepthAziElevs[idx] = result.defaultDepthAziElev
        }

        return idx
    }

    /**
     * Handles keyboard shortcuts for toggling clip planes and slice view modes with debounce logic.
     * @internal
     */
    keyUpListener(e: KeyboardEvent): void {
        // only handle keyboard events in region
        if (!this.cursorInBounds()) {
            this.opts.showBoundsBorder = false
            this.drawScene()
            return
        }

        const now = new Date().getTime()
        const shouldProcess = KeyboardController.shouldProcessKey({
            currentTime: now,
            lastCalledTime: this.lastCalled,
            debounceTime: this.opts.keyDebounceTime
        })

        if (KeyboardController.isHotkeyMatch(e.code, this.opts.cycleClipPlaneHotKey)) {
            if (shouldProcess) {
                const idx = this.cycleActiveClipPlane()
                console.log('Active clip plane cycled to:', idx)
                console.log('clip planes', this.scene.clipPlanes)
                this.lastCalled = now
            }
        }

        if (KeyboardController.isHotkeyMatch(e.code, this.opts.clipPlaneHotKey)) {
            if (shouldProcess) {
                const result = KeyboardController.getNextClipPlanePreset({
                    currentClipPlaneIndex: this.currentClipPlaneIndex
                })
                this.currentClipPlaneIndex = result.newIndex
                this.scene.clipPlaneDepthAziElevs[this.uiData.activeClipPlaneIndex] = result.depthAziElev
                this.setClipPlane(this.scene.clipPlaneDepthAziElevs[this.uiData.activeClipPlaneIndex])
            }
            this.lastCalled = now
        } else if (KeyboardController.isHotkeyMatch(e.code, this.opts.viewModeHotKey)) {
            if (shouldProcess) {
                const nextSliceType = KeyboardController.getNextViewMode({
                    currentSliceType: this.opts.sliceType,
                    totalSliceTypes: 5
                })
                this.setSliceType(nextSliceType)
                this.lastCalled = now
            }
        }

        this.drawScene()
    }

    /**
     * Handles key down events for navigation, rendering controls, slice movement, and mode switching.
     * @internal
     */
    keyDownListener(e: KeyboardEvent): void {
        // only handle keyboard events in bounds
        if (!this.cursorInBounds()) {
            this.opts.showBoundsBorder = false
            this.drawScene()
            return
        }

        const { action } = KeyboardController.getKeyDownAction({
            code: e.code,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            sliceType: this.opts.sliceType
        })

        switch (action) {
            case 'render_azimuth_decrease':
                this.setRenderAzimuthElevation(this.scene.renderAzimuth - 1, this.scene.renderElevation)
                break
            case 'render_azimuth_increase':
                this.setRenderAzimuthElevation(this.scene.renderAzimuth + 1, this.scene.renderElevation)
                break
            case 'render_elevation_increase':
                this.setRenderAzimuthElevation(this.scene.renderAzimuth, this.scene.renderElevation + 1)
                break
            case 'render_elevation_decrease':
                this.setRenderAzimuthElevation(this.scene.renderAzimuth, this.scene.renderElevation - 1)
                break
            case 'crosshair_left':
                this.moveCrosshairInVox(-1, 0, 0)
                break
            case 'crosshair_right':
                this.moveCrosshairInVox(1, 0, 0)
                break
            case 'crosshair_up':
                this.moveCrosshairInVox(0, 1, 0)
                break
            case 'crosshair_down':
                this.moveCrosshairInVox(0, -1, 0)
                break
            case 'crosshair_forward':
                this.moveCrosshairInVox(0, 0, 1)
                break
            case 'crosshair_backward':
                this.moveCrosshairInVox(0, 0, -1)
                break
            case 'cycle_drag_mode':
                this.opts.dragMode = KeyboardController.getNextDragMode(this.opts.dragMode)
                log.info('drag mode changed to ', DRAG_MODE[this.opts.dragMode])
                break
            case 'frame_previous':
                // only works for background (first loaded image is index 0)
                this.setFrame4D(this.volumes[0].id, this.volumes[0].frame4D - 1)
                break
            case 'frame_next':
                // only works for background (first loaded image is index 0)
                this.setFrame4D(this.volumes[0].id, this.volumes[0].frame4D + 1)
                break
            case 'show_version':
                alert(`NIIVUE VERSION: ${version}`)
                break
            case 'none':
            default:
                break
        }

        this.drawScene()
    }

    /**
     * Handles scroll wheel events for slice scrolling, ROI box resizing, zooming, or segmentation thresholding.
     * @internal
     */
    wheelListener(e: WheelEvent): void {
        // Check if wheel event should be processed
        const wheelAction = WheelController.determineWheelAction({
            thumbnailVisible: this.thumbnailVisible,
            mosaicStringLength: this.opts.sliceMosaicString.length,
            eventInBounds: this.eventInBounds(e),
            hasBounds: this.opts.bounds !== null
        })

        if (!wheelAction.shouldProcess) {
            if (!this.eventInBounds(e)) {
                this.opts.showBoundsBorder = false
                this.drawScene()
            }
            return
        }

        this.opts.showBoundsBorder = wheelAction.showBoundsBorder

        e.preventDefault()
        e.stopPropagation()

        // ROI Selection logic
        if (
            WheelController.isValidRoiResize({
                dragMode: this.getCurrentDragMode(),
                dragStart: this.uiData.dragStart,
                dragEnd: this.uiData.dragEnd
            })
        ) {
            const delta = WheelController.getRoiScrollDelta(e.deltaY)
            const roiResult = WheelController.updateRoiSelection({
                dragStart: this.uiData.dragStart,
                dragEnd: this.uiData.dragEnd,
                delta
            })

            this.uiData.dragStart[0] = roiResult.newDragStart[0]
            this.uiData.dragStart[1] = roiResult.newDragStart[1]
            this.uiData.dragEnd[0] = roiResult.newDragEnd[0]
            this.uiData.dragEnd[1] = roiResult.newDragEnd[1]

            // Redraw to show the updated selection box
            this.uiData.isDragging = true
            this.drawScene()
            this.uiData.isDragging = false

            // Generate the callback for the final selection rectangle
            const tileIdx = this.tileIndex(this.uiData.dragStart[0], this.uiData.dragStart[1])
            if (tileIdx >= 0) {
                this.generateMouseUpCallback(
                    this.screenXY2TextureFrac(this.uiData.dragStart[0], this.uiData.dragStart[1], tileIdx),
                    this.screenXY2TextureFrac(this.uiData.dragEnd[0], this.uiData.dragEnd[1], tileIdx)
                )
            } else {
                log.warn('Could not generate drag release callback for ROI selection: Invalid tile index.')
            }
            return
        }

        // Compute scrollAmount, respecting invertScrollDirection
        const scrollAmount = WheelController.calculateScrollAmount({
            deltaY: e.deltaY,
            invertScrollDirection: this.opts.invertScrollDirection
        })

        // If clickToSegment mode is active, change threshold instead of scrolling slices
        if (this.opts.clickToSegment) {
            this.opts.clickToSegmentPercent = WheelController.adjustSegmentThreshold({
                currentPercent: this.opts.clickToSegmentPercent,
                scrollAmount
            })

            // Get the mouse position
            const x = this.clickToSegmentXY[0]
            const y = this.clickToSegmentXY[1]
            const tileIdx = this.tileIndex(x, y)

            // If in a valid tile, re-run the clickToSegment preview
            if (tileIdx >= 0 && this.screenSlices[tileIdx].axCorSag <= SLICE_TYPE.SAGITTAL) {
                log.debug(`Adjusting clickToSegment threshold: ${this.opts.clickToSegmentPercent.toFixed(3)}`)
                this.clickToSegmentIsGrowing = true // remain in preview mode
                this.doClickToSegment({ x, y, tileIndex: tileIdx })
            }
            return
        }

        // Otherwise, handle pan/zoom if the mouse is outside the active render tile
        const rect = this.canvas!.getBoundingClientRect()
        const [x, y] = WheelController.getWheelEventPosition(e.clientX, e.clientY, rect)

        const isInRenderTile = this.inRenderTile(this.uiData.dpr! * x, this.uiData.dpr! * y) !== -1
        if (
            WheelController.shouldApplyZoom({
                dragMode: this.getCurrentDragMode(),
                isInRenderTile
            })
        ) {
            // Zoom
            const zoomResult = WheelController.calculateZoom({
                currentZoom: this.scene.pan2Dxyzmm[3],
                scrollAmount
            })

            if (this.opts.yoke3Dto2DZoom) {
                this.scene.volScaleMultiplier = zoomResult.newZoom
            }
            this.scene.pan2Dxyzmm[3] = zoomResult.newZoom

            // Shift the 2D scene center so the crosshair stays in place
            const mm = this.frac2mm(this.scene.crosshairPos)
            const panOffset = WheelController.calculatePanOffsetAfterZoom({
                currentPan: [this.scene.pan2Dxyzmm[0], this.scene.pan2Dxyzmm[1], this.scene.pan2Dxyzmm[2]],
                zoomChange: zoomResult.zoomChange,
                crosshairMM: [mm[0], mm[1], mm[2]]
            })
            this.scene.pan2Dxyzmm[0] = panOffset[0]
            this.scene.pan2Dxyzmm[1] = panOffset[1]
            this.scene.pan2Dxyzmm[2] = panOffset[2]

            this.drawScene()
            this.canvas!.focus()
            this.sync()
            return
        }

        // Default action: scroll slices using our unified scrollAmount
        this.sliceScroll2D(scrollAmount, x, y)
    }

    /**
     * Registers all mouse, touch, keyboard, and drag event listeners for canvas interaction.
     * n.b. any event listeners registered here should also be removed in `cleanup()`
     * @internal
     */
    registerInteractions(): void {
        if (!this.canvas) {
            throw new Error('canvas undefined')
        }
        this.#eventsController = new AbortController()
        const { signal } = this.#eventsController
        // add mousedown
        this.canvas.addEventListener('mousedown', this.mouseDownListener.bind(this), { signal })
        // add mouseup
        this.canvas.addEventListener('mouseup', this.mouseUpListener.bind(this), { signal })
        // add mouse move
        this.canvas.addEventListener('mousemove', this.mouseMoveListener.bind(this), { signal })
        // add mouse leave listener
        this.canvas.addEventListener('mouseleave', this.mouseLeaveListener.bind(this), { signal })

        // add touchstart
        this.canvas.addEventListener('touchstart', this.touchStartListener.bind(this), { signal })
        // add touchend
        this.canvas.addEventListener('touchend', this.touchEndListener.bind(this), { signal })
        // add touchmove
        this.canvas.addEventListener('touchmove', this.touchMoveListener.bind(this), { signal })

        // add scroll wheel
        this.canvas.addEventListener('wheel', this.wheelListener.bind(this), { signal })
        // add context event disabler
        this.canvas.addEventListener('contextmenu', this.mouseContextMenuListener.bind(this), { signal })

        // add double click
        this.canvas.addEventListener('dblclick', this.resetBriCon.bind(this), { signal })

        //  drag and drop support
        this.canvas.addEventListener('dragenter', this.dragEnterListener.bind(this), { signal })
        this.canvas.addEventListener('dragover', this.dragOverListener.bind(this), { signal })
        this.canvas.addEventListener(
            'drop',
            (event) => {
                this.dropListener(event).catch(console.error)
            },
            { signal }
        )

        // add keyup
        this.canvas.setAttribute('tabindex', '0')
        this.canvas.addEventListener('keyup', this.keyUpListener.bind(this), { signal })

        // keydown
        this.canvas.addEventListener('keydown', this.keyDownListener.bind(this), { signal })
    }

    /**
     * Prevents default behavior when a dragged item enters the canvas.
     * @internal
     */
    dragEnterListener(e: MouseEvent): void {
        FileLoader.handleDragEnter(e)
    }

    /**
     * Prevents default behavior when a dragged item is over the canvas.
     * @internal
     */
    dragOverListener(e: MouseEvent): void {
        FileLoader.handleDragOver(e)
    }

    /**
     * Extracts and normalizes the file extension, handling special cases like .gz and .cbor.
     * @internal
     */
    getFileExt(fullname: string, upperCase = true): string {
        return FileLoader.getFileExt(fullname, upperCase)
    }

    /**
     * Add an image and notify subscribers
     * @see {@link https://niivue.com/demos/features/document.3d.html | live demo usage}
     */
    async addVolumeFromUrl(imageOptions: ImageFromUrlOptions): Promise<NVImage> {
        const volume = await NVImage.loadFromUrl(imageOptions)
        this.document.addImageOptions(volume, imageOptions)
        volume.onColormapChange = this.onColormapChange
        this.mediaUrlMap.set(volume, imageOptions.url)
        if (this.onVolumeAddedFromUrl) {
            this.onVolumeAddedFromUrl(imageOptions, volume)
        }
        this.addVolume(volume)
        return volume
    }

    async addVolumesFromUrl(imageOptionsArray: ImageFromUrlOptions[]): Promise<NVImage[]> {
        const promises = imageOptionsArray.map(async (imageItem) => {
            // first check this.loaders to see if the user has
            // registered a custom loader for this file type.
            // if so, use that loader to load the file.
            const ext = this.getFileExt(imageItem.name || imageItem.url)
            if (ext === 'DCM') {
                // throw an error if the user tries to load a DICOM file without using the DICOM loader
                throw new Error('DICOM files must be loaded using useDicomLoader')
            }
            if (this.loaders[ext]) {
                let itemToLoad: string | Uint8Array | ArrayBuffer = imageItem.url
                const toExt = this.loaders[ext].toExt
                let name = imageItem.name || imageItem.url
                // in case the name is a url, just get the basename without the slashes
                name = name.split('/').pop()
                // if url is a string fetch the file first
                if (typeof imageItem.url === 'string') {
                    const url = imageItem.url
                    try {
                        const response = await fetch(url)
                        if (!response.ok) {
                            throw new Error(`Failed to load file: ${response.statusText}`)
                        }
                        itemToLoad = await response.arrayBuffer()
                    } catch (error) {
                        throw new Error(`Failed to load url ${url}: ${error}`)
                    }
                }
                const buffer = await this.loaders[ext].loader(itemToLoad)
                imageItem.url = buffer
                imageItem.name = `${name}.${toExt}`
            }
            const imageOptions = {
                url: imageItem.url!,
                headers: imageItem.headers,
                name: imageItem.name,
                colormap: imageItem.colormap ? imageItem.colormap : imageItem.colorMap,
                colormapNegative: imageItem.colormapNegative ? imageItem.colormapNegative : imageItem.colorMapNegative,
                opacity: imageItem.opacity,
                urlImgData: imageItem.urlImgData,
                cal_min: imageItem.cal_min,
                cal_max: imageItem.cal_max,
                trustCalMinMax: this.opts.trustCalMinMax,
                isManifest: imageItem.isManifest,
                frame4D: imageItem.frame4D,
                limitFrames4D: imageItem.limitFrames4D || this.opts.limitFrames4D,
                colorbarVisible: imageItem.colorbarVisible,
                zarrLevel: imageItem.zarrLevel,
                zarrMaxVolumeSize: imageItem.zarrMaxVolumeSize,
                zarrChannel: imageItem.zarrChannel,
                zarrConvertUnits: imageItem.zarrConvertUnits
            }
            const volume = await NVImage.loadFromUrl(imageOptions)
            this.document.addImageOptions(volume, imageOptions)
            volume.onColormapChange = this.onColormapChange
            this.mediaUrlMap.set(volume, imageOptions.url)
            if (this.onVolumeAddedFromUrl) {
                this.onVolumeAddedFromUrl(imageOptions, volume)
            }
            return volume
        })

        const volumes = await Promise.all(promises)

        for (let i = 0; i < volumes.length; i++) {
            this.addVolume(volumes[i])
        }
        return volumes
    }

    /**
     * Returns the media object associated with the given URL, if any.
     * @internal
     */
    getMediaByUrl(url: string): NVImage | NVMesh | undefined {
        return FileLoader.getMediaByUrl(url, this.mediaUrlMap)
    }

    /**
     * Remove volume by url
     * @param url - Volume added by url to remove
     * @see {@link https://niivue.com/demos/features/document.3d.html | live demo usage}
     */
    removeVolumeByUrl(url: string): void {
        const volume = this.getMediaByUrl(url)
        if (volume) {
            this.removeVolume(volume as NVImage)
        } else {
            throw new Error('No volume with URL present')
        }
    }

    /**
     * Recursively traverses a file tree, populating file paths for directory uploads.
     * Adds `_webkitRelativePath` to each file for compatibility with tools like dcm2niix.
     * @internal
     */
    async traverseFileTree(item: FileSystemEntry, path = '', fileArray: File[]): Promise<File[]> {
        return FileLoader.traverseFileTree(item, path, fileArray)
    }

    /**
     * Recursively reads a directory and logs the File objects contained within.
     * Used for processing dropped folders via drag-and-drop.
     * @internal
     */
    readDirectory(directory: FileSystemDirectoryEntry): FileSystemEntry[] {
        return FileLoader.readDirectory(directory)
    }

    /**
     * Returns boolean: true if filename ends with mesh extension (TRK, pial, etc)
     * @param url - filename
     * @internal
     */
    isMeshExt(url: string): boolean {
        return FileLoader.isMeshExt(url)
    }

    /**
     * Load an image or mesh from an array buffer
     * @param buffer - ArrayBuffer with the entire contents of a mesh or volume
     * @param name - string of filename, extension used to infer type (NIfTI, MGH, MZ3, etc)
     * @see {@link http://192.168.0.150:8080/features/draganddrop.html | live demo usage}
     */
    async loadFromArrayBuffer(buffer: ArrayBuffer, name: string): Promise<void> {
        const ext = this.getFileExt(name)
        if (MESH_EXTENSIONS.includes(ext)) {
            await this.addMeshFromUrl({ url: name, buffer })
            return
        }
        const imageOptions = NVImageFromUrlOptions(name)
        imageOptions.buffer = buffer
        imageOptions.name = name
        await this.addVolumeFromUrl(imageOptions)
    }

    /**
     * Load a mesh or image volume from a File object
     * @param file - File object selected by the user (e.g. from an HTML input element)
     * @returns a Promise that resolves when the file has been loaded and added to the scene
     * @see {@link https://niivue.com/demos/features/selectfont.html | live demo usage}
     */
    async loadFromFile(file: File): Promise<void> {
        const ext = this.getFileExt(file.name)
        // first check if it's a mesh
        if (MESH_EXTENSIONS.includes(ext)) {
            await NVMesh.loadFromFile({ file, gl: this.gl, name: file.name }).then((mesh) => {
                this.addMesh(mesh)
            })
            return
        }
        // load as a volume if not a mesh
        await NVImage.loadFromFile({
            file,
            name: file.name
        }).then((volume) => {
            this.addVolume(volume)
        })
    }

    /**
     * Registers a custom external file loader for handling specific file types in Niivue.
     *
     * This method allows you to define how certain file extensions are handled when loaded into Niivue.
     * The provided `loader` function should return an object containing an `ArrayBuffer` of the file's contents
     * and the file extension (used for inferring how Niivue should process the data).
     *
     * Optionally, `positions` and `indices` can be returned to support loading mesh data (e.g. `.mz3` format).
     *
     * @example
     * const myCustomLoader = async (file) => {
     *   const arrayBuffer = await file.arrayBuffer()
     *   return {
     *     arrayBuffer,
     *     fileExt: 'iwi.cbor',
     *     positions: new Float32Array(...),
     *     indices: new Uint32Array(...)
     *   }
     * }
     *
     * nv.useLoader(myCustomLoader, 'iwi.cbor', 'nii')
     *
     * @param loader - A function that accepts a `File` or `ArrayBuffer` and returns an object with `arrayBuffer` and `fileExt` properties. May also return `positions` and `indices` for meshes.
     * @param fileExt - The original file extension (e.g. 'iwi.cbor') to associate with this loader.
     * @param toExt - The target file extension Niivue should treat the file as (e.g. 'nii' or 'mz3').
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useLoader(loader: (data: string | Uint8Array | ArrayBuffer) => Promise<any>, fileExt: string, toExt: string): void {
        this.loaders = FileLoader.registerLoader({
            loaders: this.loaders,
            loader,
            fileExt,
            toExt
        })
    }

    /**
     * Set a custom loader for handling DICOM files.
     */
    useDicomLoader(loader: DicomLoader): void {
        this.dicomLoader = loader
    }

    /**
     * Get the currently assigned DICOM loader.
     */
    getDicomLoader(): DicomLoader {
        return this.dicomLoader
    }

    // dicom loading is a special case because it can take a list
    // of files (e.g. from a user supplied DICOM directory) or a single file.
    // Our preferred DICOM loader is the WASM port of dcm2niix (implemented in a separate niivue loader module).
    // useDicomLoader(loader: unknown, toExt: string) {
    //   this.loaders = {
    //     ...this.loaders,
    //     ['DCM']: {
    //       loader,
    //       toExt,
    //     },
    //   }
    // }

    /**
     * Handles file and URL drag-and-drop events on the canvas.
     * Supports loading of volumes, meshes, NVD documents, and DICOM directories.
     * Honors modifier keys (e.g., Shift to replace, Alt for drawing overlays).
     * @internal
     */
    async dropListener(e: DragEvent): Promise<void> {
        // only respond to drop events in bounds
        if (!this.eventInBounds(e)) {
            this.opts.showBoundsBorder = false
            return
        } else if (this.opts.bounds) {
            this.opts.showBoundsBorder = true
        }
        e.stopPropagation()
        e.preventDefault()
        // don't do anything if drag and drop has been turned off
        if (!this.opts.dragAndDropEnabled) {
            return
        }
        const dt = e.dataTransfer
        if (!dt) {
            return
        }

        const url = DropHandler.getDroppedUrl(dt)
        if (url) {
            await this.handleUrlDrop(url)
        } else if (DropHandler.hasDroppedFiles(dt)) {
            await this.handleFilesDrop(dt.items, e.shiftKey, e.altKey)
        }

        this.drawScene() // required if you drag and drop a mesh, not a volume
    }

    /**
     * Handle a URL drop by loading the appropriate resource type.
     * @param url - The dropped URL
     * @internal
     */
    private async handleUrlDrop(url: string): Promise<void> {
        const ext = this.getFileExt(url)
        log.debug('dropped ext:', ext)

        const fileType = DropHandler.categorizeByExtension(ext)
        switch (fileType) {
            case 'mesh':
                await this.addMeshFromUrl({ url })
                break
            case 'document':
                await this.loadDocumentFromUrl(url)
                break
            default:
                await this.addVolumeFromUrl(NVImageFromUrlOptions(url))
        }
    }

    /**
     * Handle file system file drops.
     * @param items - The dropped DataTransferItemList
     * @param shiftKey - Whether shift was held (add to existing)
     * @param altKey - Whether alt was held (load as drawing overlay)
     * @internal
     */
    private async handleFilesDrop(items: DataTransferItemList, shiftKey: boolean, altKey: boolean): Promise<void> {
        // Clear existing data unless modifier keys are held
        if (!shiftKey && !altKey) {
            this.volumes = []
            this.overlays = []
            this.meshes = []
        }
        this.closeDrawing()
        this.closePAQD()

        // Process file entries
        const fileEntries = DropHandler.processDropItems(items)
        for (const { entry, pairedEntry } of fileEntries) {
            await this.handleFileEntry(entry, pairedEntry, altKey)
        }

        // Process directory entries (assumed to be DICOM)
        const directories = DropHandler.extractDirectoryEntries(items)
        for (const dir of directories) {
            await this.handleDirectoryDrop(dir)
        }
    }

    /**
     * Handle a single file entry drop.
     * @param entry - The file system entry
     * @param pairedEntry - Optional paired data file (for AFNI/Analyze formats)
     * @param altKey - Whether alt was held (load as drawing overlay)
     * @internal
     */
    private async handleFileEntry(entry: FileSystemFileEntry, pairedEntry: FileSystemEntry | null, altKey: boolean): Promise<void> {
        const ext = this.getFileExt(entry.name)

        // Handle custom loaders
        if (this.loaders[ext]) {
            const dataUrl = await readFileAsDataURL(entry)
            await this.loadImages([{ url: dataUrl, name: entry.name }])
            return
        }

        const file = await DropHandler.getFileFromEntry(entry)
        const fileType = DropHandler.categorizeByExtension(ext)

        switch (fileType) {
            case 'mesh':
                await this.handleMeshFileDrop(file)
                break
            case 'document':
                await this.handleDocumentFileDrop(file)
                break
            default:
                await this.handleVolumeFileDrop(file, pairedEntry, altKey)
        }
    }

    /**
     * Handle mesh file drop.
     * @internal
     */
    private async handleMeshFileDrop(file: File): Promise<void> {
        try {
            const mesh = await NVMesh.loadFromFile({ file, gl: this.gl, name: file.name })
            this.addMesh(mesh)
        } catch (err) {
            console.error('Error loading mesh:', err)
        }
    }

    /**
     * Handle NVDocument file drop.
     * @internal
     */
    private async handleDocumentFileDrop(file: File): Promise<void> {
        try {
            const nvdoc = await NVDocument.loadFromFile(file)
            await this.loadDocument(nvdoc)
            log.debug('loaded document')
        } catch (err) {
            console.error('Error loading document:', err)
        }
    }

    /**
     * Handle volume file drop with optional paired data.
     * @internal
     */
    private async handleVolumeFileDrop(file: File, pairedEntry: FileSystemEntry | null, altKey: boolean): Promise<void> {
        try {
            let pairedFile: File | undefined
            if (pairedEntry) {
                pairedFile = await DropHandler.getFileFromEntry(pairedEntry as FileSystemFileEntry)
            }

            const volume = await NVImage.loadFromFile({
                file,
                urlImgData: pairedFile,
                limitFrames4D: this.opts.limitFrames4D
            })

            if (altKey) {
                log.debug('alt key detected: assuming this is a drawing overlay')
                this.drawClearAllUndoBitmaps()
                this.loadDrawing(volume)
            } else {
                this.addVolume(volume)
            }
        } catch (err) {
            console.error('Error loading volume:', err)
        }
    }

    /**
     * Handle directory drop (assumed to contain DICOM files).
     * @internal
     */
    private async handleDirectoryDrop(entry: FileSystemDirectoryEntry): Promise<void> {
        try {
            const files = await this.traverseFileTree(entry, '', [])
            const loader = this.getDicomLoader().loader
            if (!loader) {
                throw new Error('No loader for DICOM files')
            }

            const fileArrayBuffers = await loader(files)
            const promises = fileArrayBuffers.map((loaderImage) =>
                NVImage.loadFromUrl({
                    url: loaderImage.data,
                    name: loaderImage.name,
                    limitFrames4D: this.opts.limitFrames4D
                })
            )
            const loadedNvImages = await Promise.all(promises)
            await this.onDicomLoaderFinishedWithImages(loadedNvImages)
        } catch (err) {
            console.error('Error loading DICOM files:', err)
        }
    }

    /**
     * insert a gap between slices of a mutliplanar view.
     * @param pixels - spacing between tiles of multiplanar view
     * @example niivue.setMultiplanarPadPixels(4)
     * @see {@link https://niivue.com/demos/features/atlas.html | live demo usage}
     */
    setMultiplanarPadPixels(pixels: number): void {
        this.opts.multiplanarPadPixels = pixels
        this.drawScene()
    }

    /**
     * control placement of 2D slices.
     * @param layout - AUTO: 0, COLUMN: 1, GRID: 2, ROW: 3,
     * @example niivue.setMultiplanarLayout(2)
     * @see {@link https://niivue.com/demos/features/layout.html | live demo usage}
     */
    setMultiplanarLayout(layout: number): void {
        if (typeof layout === 'string') {
            layout = parseInt(layout)
        }
        this.opts.multiplanarLayout = layout
        this.drawScene()
    }

    /**
     * determine if text appears at corner (true) or sides of 2D slice.
     * @param isCornerOrientationText - controls position of text
     * @example niivue.setCornerOrientationText(true)
     * @see {@link https://niivue.com/demos/features/worldspace2.html | live demo usage}
     */
    setCornerOrientationText(isCornerOrientationText: boolean): void {
        this.opts.isCornerOrientationText = isCornerOrientationText
        this.updateGLVolume()
    }

    /**
     * Show or hide orientation labels (e.g., L/R, A/P) in 2D slice views
     * @param isOrientationTextVisible - whether orientation text should be displayed
     * @example niivue.setIsOrientationTextVisible(false)
     * @see {@link https://niivue.com/demos/features/basic.multiplanar.html | live demo usage}
     */
    setIsOrientationTextVisible(isOrientationTextVisible: boolean): void {
        this.opts.isOrientationTextVisible = isOrientationTextVisible
        this.drawScene()
    }

    /**
     * Show or hide all four orientation labels (e.g., L/R, A/P, S/I) in 2D slice views
     * @param showAllOrientationMarkers - whether all four orientation markers should be displayed
     * @example niivue.setShowAllOrientationMarkers(true)
     */
    setShowAllOrientationMarkers(showAllOrientationMarkers: boolean): void {
        this.opts.showAllOrientationMarkers = showAllOrientationMarkers
        this.drawScene()
    }

    /**
     * determine proportion of screen real estate devoted to rendering in multiplanar view.
     * @param fraction - proportion of screen devoted to primary (hero) image (0 to disable)
     * @example niivue.setHeroImage(0.5)
     * @see {@link https://niivue.com/demos/features/layout.html | live demo usage}
     */
    setHeroImage(fraction: number): void {
        this.opts.heroImageFraction = fraction
        this.drawScene()
    }

    /**
     * Set a custom slice layout. This overrides the built-in layouts.
     * @param layout - Array of layout specifications for each slice view
     * @example
     * niivue.setCustomLayout([
     *     // Left 50% - Sag
     *     {sliceType: 2, position: [0, 0, 0.5, 1.0]},
     *     // Top right - Cor
     *     {sliceType: 1, position: [0.5, 0, 0.5, 0.5]},
     *     // Bottom right - Ax
     *     {sliceType: 0, position: [0.5, 0.5, 0.5, 0.5]}
     *   ])
     *
     * produces:
     * +----------------+----------------+
     * |                |                |
     * |                |     coronal    |
     * |                |                |
     * |                |                |
     * |   sagittal     +----------------+
     * |                |                |
     * |                |     axial      |
     * |                |                |
     * |                |                |
     * +----------------+----------------+
     */
    setCustomLayout(
        layout: Array<{
            sliceType: SLICE_TYPE
            position: [number, number, number, number] // left, top, width, height
            sliceMM?: number
        }>
    ): void {
        // Validate layout for overlapping tiles
        const validation = LayoutManager.validateCustomLayout({ layout })
        if (!validation.valid && validation.error) {
            throw new Error(validation.error)
        }

        this.customLayout = layout
        this.drawScene()
    }

    /**
     * Clear custom layout and rely on built-in layouts
     */
    clearCustomLayout(): void {
        this.customLayout = null
        this.drawScene()
    }

    /**
     * Get the current custom layout if set
     * @returns The current custom layout or null if using built-in layouts
     */
    getCustomLayout(): Array<{
        sliceType: SLICE_TYPE
        position: [number, number, number, number]
        sliceMM?: number
    }> | null {
        return this.customLayout
    }

    /**
     * control whether 2D slices use radiological or neurological convention.
     * @param isRadiologicalConvention - new display convention
     * @example niivue.setRadiologicalConvention(true)
     * @see {@link https://niivue.com/demos/features/worldspace.html | live demo usage}
     */
    setRadiologicalConvention(isRadiologicalConvention: boolean): void {
        this.opts.isRadiologicalConvention = isRadiologicalConvention
        this.updateGLVolume()
    }

    /**
     * Reset scene to default settings.
     * @param options - @see NiiVueOptions
     * @param resetBriCon - also reset contrast (default false).
     * @example niivue.nv1.setDefaults(opts, true);
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    setDefaults(options: Partial<NVConfigOptions> = {}, resetBriCon = false): void {
        this.document.opts = { ...DEFAULT_OPTIONS }
        this.scene.sceneData = { ...INITIAL_SCENE_DATA }
        // populate Niivue with user supplied options
        for (const name in options) {
            if (typeof options[name as keyof NVConfigOptions] === 'function') {
                this[name] = options[name]
            } else {
                this.opts[name] = DEFAULT_OPTIONS[name] === undefined ? DEFAULT_OPTIONS[name] : options[name]
            }
        }
        this.scene.pan2Dxyzmm = [0, 0, 0, 1]
        // optional: reset volume contrast and brightness
        if (resetBriCon && this.volumes && this.volumes.length > 0) {
            for (let i = 0; i < this.volumes.length; i++) {
                this.volumes[i].cal_min = this.volumes[i].robust_min
                this.volumes[i].cal_max = this.volumes[i].robust_max
            }
        }
        // display reset image
        this.updateGLVolume()
    }

    /**
     * Limit visibility of mesh in front of a 2D image. Requires world-space mode.
     * @param meshThicknessOn2D - distance from voxels for clipping mesh. Use Infinity to show entire mesh or 0.0 to hide mesh.
     * @example niivue.setMeshThicknessOn2D(42)
     * @see {@link https://niivue.com/demos/features/worldspace2.html | live demo usage}
     */
    setMeshThicknessOn2D(meshThicknessOn2D: number): void {
        this.opts.meshThicknessOn2D = meshThicknessOn2D
        this.updateGLVolume()
    }

    /**
     * Create a custom multi-slice mosaic (aka lightbox, montage) view.
     * @param str - description of mosaic.
     * @example niivue.setSliceMosaicString("A 0 20 C 30 S 42")
     * @see {@link https://niivue.com/demos/features/mosaics.html | live demo usage}
     */
    setSliceMosaicString(str: string): void {
        this.sliceMosaicString = str
        this.updateGLVolume()
    }

    /**
     * control 2D slice view mode.
     * @param isSliceMM - control whether 2D slices use world space (true) or voxel space (false). Beware that voxel space mode limits properties like panning, zooming and mesh visibility.
     * @example niivue.setSliceMM(true)
     * @see {@link https://niivue.com/demos/features/worldspace2.html | live demo usage}
     */
    setSliceMM(isSliceMM: boolean): void {
        this.opts.isSliceMM = isSliceMM
        this.updateGLVolume()
    }

    /**
     * control whether voxel overlays are combined using additive (emission) or traditional (transmission) blending.
     * @param isAdditiveBlend - emission (true) or transmission (false) mixing
     * @example niivue.isAdditiveBlend(true)
     * @see {@link https://niivue.com/demos/features/additive.voxels.html | live demo usage}
     */
    setAdditiveBlend(isAdditiveBlend: boolean): void {
        this.opts.isAdditiveBlend = isAdditiveBlend
        this.updateGLVolume()
    }

    /**
     * Detect if display is using radiological or neurological convention.
     * @returns radiological convention status
     * @example let rc = niivue.getRadiologicalConvention()
     */
    getRadiologicalConvention(): boolean {
        return this.opts.isRadiologicalConvention
    }

    /**
     * Force WebGL canvas to use high resolution display, regardless of browser defaults.
     * @param forceDevicePixelRatio - -1: block high DPI; 0= allow high DPI: >0 use specified pixel ratio
     * @example niivue.setHighResolutionCapable(true);
     * @see {@link https://niivue.com/demos/features/sync.mesh.html | live demo usage}
     */
    setHighResolutionCapable(forceDevicePixelRatio: number | boolean): void {
        if (typeof forceDevicePixelRatio === 'boolean') {
            forceDevicePixelRatio = forceDevicePixelRatio ? 0 : -1
        }
        this.opts.forceDevicePixelRatio = forceDevicePixelRatio
        this.resizeListener()
        this.drawScene()
    }

    /**
     * Start watching for changes to configuration options.
     * This is a convenience method that sets up the onOptsChange callback.
     * @param callback - Function to call when any option changes
     * @example
     * niivue.watchOptsChanges((propertyName, newValue, oldValue) => {
     *   console.log(`Option ${propertyName} changed from ${oldValue} to ${newValue}`)
     * })
     * @see {@link https://niivue.com/demos/ | live demo usage}
     */
    watchOptsChanges(callback: (propertyName: keyof NVConfigOptions, newValue: NVConfigOptions[keyof NVConfigOptions], oldValue: NVConfigOptions[keyof NVConfigOptions]) => void): void {
        this.onOptsChange = callback
    }

    /**
     * Stop watching for changes to configuration options.
     * This removes the current onOptsChange callback.
     * @example niivue.unwatchOptsChanges()
     * @see {@link https://niivue.com/demos/ | live demo usage}
     */
    unwatchOptsChanges(): void {
        this.onOptsChange = (): void => {}
    }

    /**
     * add a new volume to the canvas
     * @param volume - the new volume to add to the canvas
     * @example
     * niivue = new Niivue()
     * niivue.addVolume(NVImage.loadFromUrl({url:'../someURL.nii.gz'}))
     * @see {@link https://niivue.com/demos/features/conform.html | live demo usage}
     */
    addVolume(volume: NVImage): void {
        const result = VolumeManager.addVolume(this.volumes, volume)
        this.volumes = result.volumes
        this.setVolume(volume, result.index)
        this.onImageLoaded(volume)
        // Hook zarr chunk updates to trigger GL refresh.
        // Register the callback BEFORE loading initial chunks so the first
        // batch of data triggers a proper GPU upload and render.
        if (volume.zarrHelper) {
            volume.zarrHelper.onChunksUpdated = (): void => {
                this.updateGLVolume()
                this._skipDragInDraw = true
                this.drawScene()
                this._skipDragInDraw = false
            }
            // Load initial chunks now (with callback registered).
            // Not awaited — progressive rendering via onChunksUpdated handles GPU updates.
            volume.zarrHelper.loadInitialChunks().catch((err) => log.error('Failed to load initial zarr chunks', err))
        }
        log.debug('loaded volume', volume.name)
        log.debug(volume)
    }

    /**
     * add a new mesh to the canvas
     * @param mesh - the new mesh to add to the canvas
     * @example
     * niivue = new Niivue()
     * niivue.addMesh(NVMesh.loadFromUrl({url:'../someURL.gii'}))
     * @see {@link https://niivue.com/demos/features/document.3d.html | live demo usage}
     */
    addMesh(mesh: NVMesh): void {
        const result = MeshManager.addMesh(this.meshes, mesh)
        this.meshes = result.meshes
        this.setMesh(mesh, result.index)
        this.onMeshLoaded(mesh)
    }

    /**
     * get the index of a volume by its unique id. unique ids are assigned to the NVImage.id property when a new NVImage is created.
     * @param id - the id string to search for
     * @example
     * niivue = new Niivue()
     * niivue.getVolumeIndexByID(someVolume.id)
     */
    getVolumeIndexByID(id: string): number {
        return VolumeManager.getVolumeIndexByID(this.volumes, id)
    }

    /**
     * Saves the current drawing state as an RLE-compressed bitmap for undo history.
     * Uses a circular buffer to limit undo memory usage.
     * @internal
     */
    drawAddUndoBitmap(drawFillOverwrites: boolean = true): void {
        const result = DrawingManager.addUndoBitmap({
            drawBitmap: this.drawBitmap,
            drawUndoBitmaps: this.drawUndoBitmaps,
            currentDrawUndoBitmap: this.currentDrawUndoBitmap,
            maxDrawUndoBitmaps: this.opts.maxDrawUndoBitmaps,
            drawFillOverwrites
        })

        this.drawBitmap = result.drawBitmap
        this.drawUndoBitmaps = result.drawUndoBitmaps
        this.currentDrawUndoBitmap = result.currentDrawUndoBitmap

        if (result.needsRefresh) {
            this.refreshDrawing(false)
        }
    }

    /**
     * Clears all stored drawing undo bitmaps and resets the undo index.
     * @internal
     */
    drawClearAllUndoBitmaps(): void {
        const result = DrawingManager.clearAllUndoBitmaps(this.drawUndoBitmaps, this.opts.maxDrawUndoBitmaps)
        this.drawUndoBitmaps = result.drawUndoBitmaps
        this.currentDrawUndoBitmap = result.currentDrawUndoBitmap
    }

    /**
     * Restore drawing to previous state
     * @example niivue.drawUndo();
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    drawUndo(): void {
        const { drawBitmap, currentDrawUndoBitmap } = drawUndo({
            drawUndoBitmaps: this.drawUndoBitmaps,
            currentDrawUndoBitmap: this.currentDrawUndoBitmap,
            drawBitmap: this.drawBitmap
        })
        this.drawBitmap = drawBitmap
        this.currentDrawUndoBitmap = currentDrawUndoBitmap
        this.refreshDrawing(true)
    }

    /**
     * Loads a drawing overlay and aligns it with the current background image.
     * Converts the input image to match the background's orientation and stores it as a drawable bitmap.
     * Initializes the undo history and prepares the drawing texture.
     *
     * @param drawingBitmap - A `NVImage` object representing the drawing to load. Must match the dimensions of the background image.
     * @returns `true` if the drawing was successfully loaded and aligned; `false` if dimensions are incompatible.
     */
    loadDrawing(drawingBitmap: NVImage): boolean {
        if (this.drawBitmap) {
            log.debug('Overwriting open drawing!')
        }
        if (!this.back) {
            throw new Error('back undefined')
        }
        this.drawClearAllUndoBitmaps()
        const dims = drawingBitmap.hdr!.dims

        // Validate dimensions match background
        if (
            !DrawingManager.validateDrawingDimensions({
                drawingDims: dims,
                backgroundDims: this.back.hdr!.dims
            })
        ) {
            log.debug('drawing dimensions do not match background image')
            return false
        }

        if (drawingBitmap.img!.constructor !== Uint8Array) {
            log.debug('Drawings should be UINT8')
        }

        const perm = drawingBitmap.permRAS!
        const vx = DrawingManager.calculateVoxelCount(dims)
        this.drawBitmap = DrawingManager.createEmptyBitmap(vx)

        if (this.opts.is2DSliceShader) {
            this.drawTexture = this.r8Tex2D(this.drawTexture, TEXTURE_CONSTANTS.TEXTURE7_DRAW, this.back.dims, true)
        } else {
            this.drawTexture = this.r8Tex(this.drawTexture, TEXTURE_CONSTANTS.TEXTURE7_DRAW, this.back.dims!, true)
        }

        // Calculate transformation and transform the bitmap
        const transform = DrawingManager.calculateLoadDrawingTransform({ permRAS: perm, dims })
        this.drawBitmap = DrawingManager.transformBitmap({
            inputData: drawingBitmap.img!,
            dims,
            xlut: transform.xlut,
            ylut: transform.ylut,
            zlut: transform.zlut
        })

        this.drawAddUndoBitmap()
        this.refreshDrawing(false)
        this.drawScene()
        return true
    }

    /**
     * Binarize a volume by converting all non-zero voxels to 1
     * @param volume - the image volume to modify in place
     * @see {@link https://niivue.com/demos/features/clusterize.html | live demo usage}
     */
    binarize(volume: NVImage): void {
        const result = ImageProcessing.binarize({
            img: volume.img!,
            dims: volume.hdr!.dims
        })
        volume.img = result.img
        volume.hdr!.datatypeCode = result.datatypeCode
        volume.hdr!.cal_min = result.cal_min
        volume.hdr!.cal_max = result.cal_max
    }

    /**
     * Open drawing
     * @param fnm - filename of NIfTI format drawing
     * @param isBinarize - if true will force drawing voxels to be either 0 or 1.
     * @example niivue.loadDrawingFromUrl("../images/lesion.nii.gz");
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    async loadDrawingFromUrl(fnm: string, isBinarize = false): Promise<boolean> {
        if (this.drawBitmap) {
            log.debug('Overwriting open drawing!')
        }
        this.drawClearAllUndoBitmaps()
        let ok = false
        try {
            const volume = await NVImage.loadFromUrl(NVImageFromUrlOptions(fnm))
            if (isBinarize) {
                await this.binarize(volume)
            }
            ok = this.loadDrawing(volume)
        } catch (err) {
            log.error('loadDrawingFromUrl() failed to load ' + fnm)
            this.drawClearAllUndoBitmaps()
        }
        return ok
    }

    /**
     * Computes one or more Otsu threshold levels for the primary volume.
     * Returns raw intensity values corresponding to bin-based thresholds.
     * @internal
     */
    findOtsu(mlevel = 2): number[] {
        if (this.volumes.length < 1) {
            return []
        }
        return ImageProcessing.findOtsu({
            img: this.volumes[0].img!,
            cal_min: this.volumes[0].cal_min!,
            cal_max: this.volumes[0].cal_max!,
            scl_inter: this.volumes[0].hdr!.scl_inter,
            scl_slope: this.volumes[0].hdr!.scl_slope,
            mlevel
        })
    }

    /**
     * remove dark voxels in air
     * @param levels - (2-4) segment brain into this many types. For example drawOtsu(2) will create a binary drawing where bright voxels are colored and dark voxels are clear.
     * @example niivue.drawOtsu(3);
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    drawOtsu(levels = 2): void {
        if (this.volumes.length === 0) {
            return
        }
        const thresholds = this.findOtsu(levels)
        if (thresholds.length < 3) {
            return
        }
        if (!this.drawBitmap) {
            this.createEmptyDrawing()
        }
        const result = ImageProcessing.applyOtsuToDrawing({
            img: this.volumes[0].img!,
            drawBitmap: this.drawBitmap as Uint8Array,
            thresholds
        })
        // Copy result back to drawBitmap
        ;(this.drawBitmap as Uint8Array).set(result)
        this.drawAddUndoBitmap()
        this.refreshDrawing(true)
    }

    /**
     * remove dark voxels in air
     * @param level - (1-5) larger values for more preserved voxels
     * @param volIndex - volume to dehaze
     * @example niivue.removeHaze(3, 0);
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    removeHaze(level = 5, volIndex = 0): void {
        const img = this.volumes[volIndex].img!
        const hdr = this.volumes[volIndex].hdr!

        const otsu = ImageProcessing.getOtsuLevelForHaze({ level })
        const thresholds = this.findOtsu(otsu)
        if (thresholds.length < 3) {
            return
        }
        const threshold = ImageProcessing.getHazeThreshold({ level, thresholds })

        ImageProcessing.applyHazeRemoval({
            img,
            scl_inter: hdr.scl_inter,
            scl_slope: hdr.scl_slope,
            global_min: this.volumes[volIndex].global_min!,
            threshold
        })
        this.refreshLayers(this.volumes[volIndex], 0)
        this.drawScene()
    }

    /**
     * Save voxel-based image to disk.
     *
     * @param options - configuration object with the following fields:
     *   - `filename`: name of the NIfTI image to create
     *   - `isSaveDrawing`: whether to save the drawing layer or the background image
     *   - `volumeByIndex`: which image layer to save (0 for background)
     * @returns `true` if successful when writing to disk, or a `Uint8Array` if exported as binary data
     *
     * @example
     * niivue.saveImage({ filename: "myimage.nii.gz", isSaveDrawing: true });
     * niivue.saveImage({ filename: "myimage.nii.gz", isSaveDrawing: true });
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    async saveImage(options: SaveImageOptions = defaultSaveImageOptions): Promise<boolean | Uint8Array> {
        const saveOptions: SaveImageOptions = {
            ...defaultSaveImageOptions,
            ...options
        }
        const { filename, isSaveDrawing, volumeByIndex } = saveOptions
        log.debug('saveImage', filename, isSaveDrawing, volumeByIndex)
        if (this.back?.dims === undefined) {
            log.debug('No voxelwise image open')
            return false
        }
        if (isSaveDrawing) {
            if (!this.drawBitmap) {
                log.debug('No drawing open')
                return false
            }
            const img = await this.volumes[0].saveToDisk(filename, this.drawBitmap) // createEmptyDrawing
            return img
            /*
      // ImageWriter.ts toUint8Array() now handles perm()
      // https://github.com/niivue/niivue/issues/1374
      const perm = this.volumes[0].permRAS!
      if (perm[0] === 1 && perm[1] === 2 && perm[2] === 3) {
        log.debug('saving drawing')
        const img = await this.volumes[0].saveToDisk(filename, this.drawBitmap) // createEmptyDrawing
        return img
      } else {
        log.debug('saving drawing')
        const dims = this.volumes[0].hdr!.dims // reverse to original
        // reverse RAS to native space, layout is mrtrix MIF format
        // for details see NVImage.readMIF()
        const layout = [0, 0, 0]
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (Math.abs(perm[i]) - 1 !== j) {
              continue
            }
            layout[j] = i * Math.sign(perm[i])
          }
        }
        let stride = 1
        const instride = [1, 1, 1]
        const inflip = [false, false, false]
        for (let i = 0; i < layout.length; i++) {
          for (let j = 0; j < layout.length; j++) {
            const a = Math.abs(layout[j])
            if (a !== i) {
              continue
            }
            instride[j] = stride
            // detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
            if (layout[j] < 0 || Object.is(layout[j], -0)) {
              inflip[j] = true
            }
            stride *= dims[j + 1]
          }
        }

        let xlut = NVUtilities.range(0, dims[1] - 1, 1)
        if (inflip[0]) {
          xlut = NVUtilities.range(dims[1] - 1, 0, -1)
        }
        for (let i = 0; i < dims[1]; i++) {
          xlut[i] *= instride[0]
        }
        let ylut = NVUtilities.range(0, dims[2] - 1, 1)
        if (inflip[1]) {
          ylut = NVUtilities.range(dims[2] - 1, 0, -1)
        }
        for (let i = 0; i < dims[2]; i++) {
          ylut[i] *= instride[1]
        }
        let zlut = NVUtilities.range(0, dims[3] - 1, 1)
        if (inflip[2]) {
          zlut = NVUtilities.range(dims[3] - 1, 0, -1)
        }
        for (let i = 0; i < dims[3]; i++) {
          zlut[i] *= instride[2]
        }
        // convert data

        const inVs = new Uint8Array(this.drawBitmap)
        const outVs = new Uint8Array(dims[1] * dims[2] * dims[3])
        let j = 0
        for (let z = 0; z < dims[3]; z++) {
          for (let y = 0; y < dims[2]; y++) {
            for (let x = 0; x < dims[1]; x++) {
              outVs[j] = inVs[xlut[x] + ylut[y] + zlut[z]]
              j++
            }
          }
        }
        log.debug('saving drawing')
        const img = this.volumes[0].saveToDisk(filename, outVs)
        return img
      } */
        }
        log.debug('saving image')
        const img = this.volumes[volumeByIndex].saveToDisk(filename)
        return img
    }

    /**
     * Returns the index of a mesh given its ID or index.
     *
     * @param id - The mesh ID as a string, or an index number.
     * @returns The mesh index, or -1 if not found or out of range.
     */
    getMeshIndexByID(id: string | number): number {
        return MeshManager.getMeshIndexByID(this.meshes, id)
    }

    /**
     * change property of mesh, tractogram or connectome
     * @param id - identity of mesh to change
     * @param key - attribute to change
     * @param val - for attribute
     * @example niivue.setMeshProperty(niivue.meshes[0].id, 'fiberLength', 42)
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    setMeshProperty(id: number, key: keyof NVMesh, val: number | string | boolean | Uint8Array | number[] | ColorMap | LegacyConnectome | Float32Array): void {
        const idx = MeshManager.setMeshProperty({
            meshes: this.meshes,
            id,
            key,
            val,
            gl: this.gl
        })
        if (idx < 0) {
            return
        }
        this.updateGLVolume()
        this.onMeshPropertyChanged(idx, key, val)
    }

    /**
     * returns the index of the mesh vertex that is closest to the provided coordinates
     * @param mesh - identity of mesh to change
     * @param Xmm - location in left/right dimension
     * @param Ymm - location in posterior/anterior dimension
     * @param Zmm - location in foot/head dimension
     * @returns the an array where ret[0] is the mesh index and ret[1] is distance from vertex to coordinates
     * @example niivue.indexNearestXYZmm(niivue.meshes[0].id, -22, 42, 13)
     * @see {@link https://niivue.com/demos/features/clipplanes.html | live demo usage}
     */
    indexNearestXYZmm(mesh: number, Xmm: number, Ymm: number, Zmm: number): number[] {
        return MeshManager.indexNearestXYZmm({
            meshes: this.meshes,
            meshId: mesh,
            Xmm,
            Ymm,
            Zmm
        })
    }

    /**
     * reduce complexity of FreeSurfer mesh
     * @param mesh - identity of mesh to change
     * @param order - decimation order 0..6
     * @example niivue.decimateHierarchicalMesh(niivue.meshes[0].id, 4)
     * @returns boolean false if mesh is not hierarchical or of lower order
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    decimateHierarchicalMesh(mesh: number, order: number = 3): boolean {
        const ret = MeshManager.decimateHierarchicalMesh({
            meshes: this.meshes,
            meshId: mesh,
            gl: this.gl,
            order
        })
        if (ret) {
            this.updateGLVolume()
        }
        return ret
    }

    /**
     * reverse triangle winding of mesh (swap front and back faces)
     * @param mesh - identity of mesh to change
     * @example niivue.reverseFaces(niivue.meshes[0].id)
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    reverseFaces(mesh: number): void {
        const success = MeshManager.reverseFaces({
            meshes: this.meshes,
            meshId: mesh,
            gl: this.gl
        })
        if (success) {
            this.updateGLVolume()
        }
    }

    /**
     * reverse triangle winding of mesh (swap front and back faces)
     * @param mesh - identity of mesh to change
     * @param layer - selects the mesh overlay (e.g. GIfTI or STC file)
     * @param key - attribute to change
     * @param val - value for attribute
     * @example niivue.setMeshLayerProperty(niivue.meshes[0].id, 0, 'frame4D', 22)
     * @see {@link https://niivue.com/demos/features/mesh.4D.html | live demo usage}
     */
    async setMeshLayerProperty(mesh: number | string, layer: number, key: keyof NVMeshLayer, val: number): Promise<void> {
        const success = await MeshManager.setMeshLayerProperty({
            meshes: this.meshes,
            meshId: mesh,
            layer,
            key,
            val,
            gl: this.gl
        })
        if (success) {
            this.updateGLVolume()
        }
    }

    /**
     * adjust offset position and scale of 2D sliceScale
     * @param xyzmmZoom - first three components are spatial, fourth is scaling
     * @example niivue.setPan2Dxyzmm([5,-4, 2, 1.5])
     */
    setPan2Dxyzmm(xyzmmZoom: vec4): void {
        this.scene.pan2Dxyzmm = xyzmmZoom
        if (this.opts.yoke3Dto2DZoom) {
            this.scene.volScaleMultiplier = xyzmmZoom[3]
        }
        this.drawScene()
    }

    /**
     * set rotation of 3D render view
     * @example niivue.setRenderAzimuthElevation(45, 15)
     * @see {@link https://niivue.com/demos/features/mask.html | live demo usage}
     */
    setRenderAzimuthElevation(a: number, e: number): void {
        this.scene.renderAzimuth = a
        this.scene.renderElevation = e
        this.onAzimuthElevationChange(a, e)
        this.drawScene()
    }

    /**
     * get the index of an overlay by its unique id. unique ids are assigned to the NVImage.id property when a new NVImage is created.
     * @param id - the id string to search for
     * @see NiiVue#getVolumeIndexByID
     * @example
     * niivue = new Niivue()
     * niivue.getOverlayIndexByID(someVolume.id)
     */
    getOverlayIndexByID(id: string): number {
        return VolumeManager.getOverlayIndexByID(this.volumes, id)
    }

    /**
     * set the index of a volume. This will change it's ordering and appearance if there are multiple volumes loaded.
     * @param volume - the volume to update
     * @param toIndex - the index to move the volume to. The default is the background (0 index)
     * @example
     * niivue = new Niivue()
     * niivue.setVolume(someVolume, 1) // move it to the second position in the array of loaded volumes (0 is the first position)
     */
    setVolume(volume: NVImage, toIndex = 0): void {
        const result = VolumeManager.setVolume(this.volumes, volume, toIndex)
        this.volumes = result.volumes
        this.back = result.back
        this.overlays = result.overlays
        this.updateGLVolume()
    }

    /**
     * Reorders a mesh within the internal mesh list.
     *
     * @param mesh - The `NVMesh` instance to reposition.
     * @param toIndex - Target index to move the mesh to.
     *   - If `0`, moves mesh to the front.
     *   - If `< 0`, removes the mesh.
     *   - If within bounds, inserts mesh at the specified index.
     */
    setMesh(mesh: NVMesh, toIndex = 0): void {
        this.meshes.forEach((m) => {
            log.debug('MESH: ', m.name)
        })
        const result = MeshManager.setMesh(this.meshes, mesh, toIndex)
        this.meshes = result.meshes
        this.updateGLVolume()
        this.meshes.forEach((m) => {
            log.debug(m.name)
        })
    }

    /**
     * Remove a volume
     * @param volume - volume to delete
     * @example
     * niivue = new Niivue()
     * niivue.removeVolume(this.volumes[3])
     * @see {@link https://niivue.com/demos/features/document.3d.html | live demo usage}
     */
    removeVolume(volume: NVImage): void {
        const result = VolumeManager.removeVolume(this.volumes, volume)
        this.volumes = result.volumes
        this.back = this.volumes.length > 0 ? this.volumes[0] : null
        this.overlays = this.volumes.slice(1)

        // check if we have a url for this volume
        if (this.mediaUrlMap.has(volume)) {
            const url = this.mediaUrlMap.get(volume)!
            // notify subscribers that we are about to remove a volume
            this.onVolumeWithUrlRemoved(url)

            this.mediaUrlMap.delete(volume)
        }

        this.updateGLVolume()
        this.drawScene()
    }

    /**
     * Remove a volume from the scene by its index
     * @param index - index of the volume to remove
     * @throws if the index is out of bounds
     * @see {@link https://niivue.com/demos/features/clusterize.html | live demo usage}
     */
    removeVolumeByIndex(index: number): void {
        const result = VolumeManager.removeVolumeByIndex(this.volumes, index)
        if (result.removed) {
            this.removeVolume(result.removed)
        }
    }

    /**
     * Remove a triangulated mesh, connectome or tractogram
     * @param mesh - mesh to delete
     * @example
     * niivue = new Niivue()
     * niivue.removeMesh(this.meshes[3])
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    removeMesh(mesh: NVMesh): void {
        mesh.unloadMesh(this.gl)
        this.setMesh(mesh, -1)
        if (this.mediaUrlMap.has(mesh)) {
            const url = this.mediaUrlMap.get(mesh)!
            this.onMeshWithUrlRemoved(url)
            this.mediaUrlMap.delete(mesh)
        }
    }

    /**
     * Remove a triangulated mesh, connectome or tractogram
     * @param url - URL of mesh to delete
     * @example
     * niivue.removeMeshByUrl('../images/cit168.mz3')
     */
    removeMeshByUrl(url: string): void {
        const mesh = this.getMediaByUrl(url)
        if (mesh) {
            this.removeMesh(mesh as NVMesh)
            this.mediaUrlMap.delete(mesh)
            this.onMeshWithUrlRemoved(url)
        }
    }

    /**
     * Move a volume to the bottom of the stack of loaded volumes. The volume will become the background
     * @param volume - the volume to move
     * @example
     * niivue = new Niivue()
     * niivue.moveVolumeToBottom(this.volumes[3]) // move the 4th volume to the 0 position. It will be the new background
     */
    moveVolumeToBottom(volume: NVImage): void {
        const result = VolumeManager.moveVolumeToBottom(this.volumes, volume)
        this.volumes = result.volumes
        this.back = result.back
        this.overlays = result.overlays
        this.updateGLVolume()
    }

    /**
     * Move a volume up one index position in the stack of loaded volumes. This moves it up one layer
     * @param volume - the volume to move
     * @example
     * niivue = new Niivue()
     * niivue.moveVolumeUp(this.volumes[0]) // move the background image to the second index position (it was 0 index, now will be 1)
     */
    moveVolumeUp(volume: NVImage): void {
        const result = VolumeManager.moveVolumeUp(this.volumes, volume)
        this.volumes = result.volumes
        this.back = result.back
        this.overlays = result.overlays
        this.updateGLVolume()
    }

    /**
     * Move a volume down one index position in the stack of loaded volumes. This moves it down one layer
     * @param volume - the volume to move
     * @example
     * niivue = new Niivue()
     * niivue.moveVolumeDown(this.volumes[1]) // move the second image to the background position (it was 1 index, now will be 0)
     */
    moveVolumeDown(volume: NVImage): void {
        const result = VolumeManager.moveVolumeDown(this.volumes, volume)
        this.volumes = result.volumes
        this.back = result.back
        this.overlays = result.overlays
        this.updateGLVolume()
    }

    /**
     * Move a volume to the top position in the stack of loaded volumes. This will be the top layer
     * @param volume - the volume to move
     * @example
     * niivue = new Niivue()
     * niivue.moveVolumeToTop(this.volumes[0]) // move the background image to the top layer position
     */
    moveVolumeToTop(volume: NVImage): void {
        const result = VolumeManager.moveVolumeToTop(this.volumes, volume)
        this.volumes = result.volumes
        this.back = result.back
        this.overlays = result.overlays
        this.updateGLVolume()
    }

    /**
     * Records the current mouse position in screen space (adjusted for device pixel ratio).
     * @internal
     */
    mouseDown(x: number, y: number): void {
        const result = MouseController.calculateMouseDownPosition({
            x,
            y,
            dpr: this.uiData.dpr!
        })
        this.mousePos = result.mousePos
        // if (this.inRenderTile(x, y) < 0) return;
    }

    /**
     * Updates mouse position
     * @internal
     */
    updateMousePos(x: number, y: number): [number, number] {
        const result = MouseController.calculateMouseDownPosition({
            x,
            y,
            dpr: this.uiData.dpr!
        })
        this.mousePos = result.mousePos
        return result.mousePos
    }

    /**
     *  and modifies 3D render view if the pointer is in the render tile.
     *
     * @internal
     */
    mouseMove(x: number, y: number): void {
        const result = MouseController.calculateMouseMovePosition({
            x,
            y,
            dpr: this.uiData.dpr!,
            currentMousePos: this.mousePos as [number, number]
        })
        this.mousePos = result.mousePos
        if (this.inRenderTile(result.scaledX, result.scaledY) < 0) {
            return
        }
        // Check if drag is significant enough to update camera
        if (!CameraController.shouldUpdateCameraRotation({ dx: result.dx, dy: result.dy })) {
            return
        }

        // Calculate new camera rotation from drag
        const rotation = CameraController.calculateDragRotation({
            currentAzimuth: this.scene.renderAzimuth,
            currentElevation: this.scene.renderElevation,
            deltaX: result.dx,
            deltaY: result.dy
        })
        if ((this.scene.renderAzimuth = rotation.azimuth) && this.scene.renderElevation === rotation.elevation) {
            // lag
            return
        }
        this.scene.renderAzimuth = rotation.azimuth
        this.scene.renderElevation = rotation.elevation

        // lag this.drawScene()
    }

    /**
     * convert spherical AZIMUTH, ELEVATION to Cartesian
     * @param azimuth - azimuth number
     * @param elevation - elevation number
     * @returns the converted [x, y, z] coordinates
     * @example
     * niivue = new Niivue()
     * xyz = niivue.sph2cartDeg(42, 42)
     * @internal
     */
    sph2cartDeg(azimuth: number, elevation: number): number[] {
        return VolumeRenderer.sph2cartDeg(azimuth, elevation)
    }

    /**
     * Set multiple clip planes from their depth/azimuth/elevation definitions.
     *
     *  depth: distance of clip plane from center of volume, range 0..~1.73
     *         (e.g. 2.0 for no clip plane)
     *  azimuth: camera position in degrees around object, typically 0..360
     *           (or -180..+180)
     *  elevation: camera height in degrees, range -90..90
     *
     * This replaces the entire `clipPlanes` and `clipPlaneDepthAziElevs` arrays,
     * ensuring they always have the same length.
     *
     * @param depthAziElevs - array of `[depth, azimuthDeg, elevationDeg]` values
     * @see {@link https://niivue.com/demos/features/clipplanesmulti.html | live demo usage}
     */
    setClipPlanes(depthAziElevs: number[][]): void {
        const result = ClipPlaneManager.convertMultipleClipPlanes({ depthAziElevs })
        this.scene.clipPlanes = result.clipPlanes
        this.scene.clipPlaneDepthAziElevs = result.clipPlaneDepthAziElevs
        this.drawScene()
    }

    /**
     * Update the clip plane orientation in 3D view mode.
     * @param depthAzimuthElevation - a 3-component array:
     *   - `depth`: distance of clip plane from center of volume (0 to ~1.73, or >2.0 to disable clipping)
     *   - `azimuth`: camera angle around the object in degrees (0–360 or -180–180)
     *   - `elevation`: camera height in degrees (-90 to 90)
     * @example
     * niivue = new Niivue()
     * niivue.setClipPlane([42, 42])
     * @see {@link https://niivue.com/demos/features/mask.html | live demo usage}
     */
    setClipPlane(depthAzimuthElevation: number[]): void {
        if (!ClipPlaneManager.isValidDepthAziElev(depthAzimuthElevation)) {
            return
        }

        const idx = this.uiData.activeClipPlaneIndex ?? 0

        const result = ClipPlaneManager.updateClipPlaneAtIndex({
            clipPlanes: this.scene.clipPlanes,
            clipPlaneDepthAziElevs: this.scene.clipPlaneDepthAziElevs,
            index: idx,
            depthAzimuthElevation
        })

        this.scene.clipPlanes = result.clipPlanes
        this.scene.clipPlaneDepthAziElevs = result.clipPlaneDepthAziElevs

        this.onClipPlaneChange(result.clipPlane)
        this.drawScene()
    }

    /**
     * set the crosshair and colorbar outline color
     * @param color - an RGBA array. values range from 0 to 1
     * @example
     * niivue = new Niivue()
     * niivue.setCrosshairColor([0, 1, 0, 0.5]) // set crosshair to transparent green
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    setCrosshairColor(color: number[]): void {
        this.opts.crosshairColor = color
        this.drawScene()
    }

    /**
     * set thickness of crosshair
     * @example niivue.crosshairWidth(2)
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    setCrosshairWidth(crosshairWidth: number): void {
        this.opts.crosshairWidth = crosshairWidth
        if (this.crosshairs3D) {
            this.crosshairs3D.mm![0] = NaN // force redraw
        }
        this.drawScene()
    }

    /*
     * set colors and labels for different drawing values
     * @param {array} cmap a structure mapping indices to colors and labels
     * @example
     * let cmap = {
     *    R: [0, 255, 0],
     *    G: [0, 20, 0],
     *    B: [0, 20, 80],
     *    A: [0, 255, 255],
     *    labels: ["", "white-matter", "delete T1"],
     *  };
     *  nv.setDrawColormap(cmap);
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    setDrawColormap(name: string): void {
        this.drawLut = cmapper.makeDrawLut(name)
        this.updateGLVolume()
    }

    /**
     * does dragging over a 2D slice create a drawing?
     * @param trueOrFalse - enabled (true) or not (false)
     * @example niivue.setDrawingEnabled(true)
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    setDrawingEnabled(trueOrFalse: boolean): void {
        this.opts.drawingEnabled = trueOrFalse
        if (this.opts.drawingEnabled) {
            if (!this.drawBitmap) {
                this.createEmptyDrawing()
            }
        } else {
            // Clean up drawing state when drawing is disabled
            const resetState = DrawingManager.createDisabledDrawingState({
                clickToSegmentIsGrowing: this.clickToSegmentIsGrowing,
                drawPenLocation: this.drawPenLocation,
                drawPenAxCorSag: this.drawPenAxCorSag,
                drawPenFillPts: this.drawPenFillPts,
                drawShapeStartLocation: this.drawShapeStartLocation,
                drawShapePreviewBitmap: this.drawShapePreviewBitmap,
                drawBitmap: this.drawBitmap
            })

            this.clickToSegmentIsGrowing = resetState.clickToSegmentIsGrowing
            this.drawPenLocation = resetState.drawPenLocation
            this.drawPenAxCorSag = resetState.drawPenAxCorSag
            this.drawPenFillPts = resetState.drawPenFillPts
            this.drawShapeStartLocation = resetState.drawShapeStartLocation
            this.drawShapePreviewBitmap = resetState.drawShapePreviewBitmap
            this.drawBitmap = resetState.drawBitmap

            if (resetState.needsRefresh) {
                this.refreshDrawing(true, false)
            }
        }
        this.drawScene() // Redraw needed in both cases
    }

    /**
     * determine color and style of drawing
     * @param penValue - sets the color of the pen
     * @param isFilledPen - determines if dragging creates flood-filled shape
     * @example niivue.setPenValue(1, true)
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    setPenValue(penValue: number, isFilledPen = false): void {
        this.opts.penValue = penValue
        this.opts.isFilledPen = isFilledPen
        this.drawScene()
    }

    /**
     * control whether drawing is transparent (0), opaque (1) or translucent (between 0 and 1).
     * @param opacity - translucency of drawing
     * @example niivue.setDrawOpacity(0.7)
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    setDrawOpacity(opacity: number): void {
        this.drawOpacity = opacity
        this.drawScene()
    }

    /**
     * set the selection box color. A selection box is drawn when you right click and drag to change image contrast
     * @param color - an RGBA array. values range from 0 to 1
     * @example
     * niivue = new Niivue()
     * niivue.setSelectionBoxColor([0, 1, 0, 0.5]) // set to transparent green
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    setSelectionBoxColor(color: number[]): void {
        this.opts.selectionBoxColor = color
    }

    /**
     * Update the drawing bounds for this Niivue instance.
     *
     * @param bounds - [x1, y1, x2, y2] in normalized (0–1) coordinates.
     *
     * Example:
     *   nv.setBounds([0,0,0.5,0.5])   // top-left quarter
     *   nv.setBounds([0.5,0.5,1,1])   // bottom-right quarter
     */
    public setBounds(bounds: [number, number, number, number]): void {
        if (!Array.isArray(bounds) || bounds.length !== 4) {
            throw new Error('setBounds: expected [x1,y1,x2,y2] array')
        }

        this.opts.bounds = [
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]]
        ]

        // Trigger redraw if GL is active
        if (this.gl) {
            this.drawScene()
        }
    }

    /**
     * Handles mouse wheel or trackpad scroll to change slices, zoom, or frame depending on context.
     * @internal
     */
    sliceScroll2D(posChange: number, x: number, y: number, isDelta = true): void {
        // Check if the canvas has focus
        if (
            !SliceNavigation.shouldProcessScroll({
                scrollRequiresFocus: this.opts.scrollRequiresFocus,
                canvasHasFocus: this.canvas === document.activeElement
            })
        ) {
            log.warn('Canvas element does not have focus. Scroll events will not be processed.')
            return
        }

        // Handle graph tile interaction (frame scrolling)
        if (this.inGraphTile(x, y)) {
            let vol = this.volumes[0].frame4D
            if (posChange > 0) {
                vol++
            }
            if (posChange < 0) {
                vol--
            }
            this.setFrame4D(this.volumes[0].id, vol)
            return
        }

        // Handle zoom scroll in pan mode
        const isInRenderTile = this.inRenderTile(this.uiData.dpr! * x, this.uiData.dpr! * y) !== -1
        if (
            SliceNavigation.shouldApplyZoomScroll({
                posChange,
                dragMode: this.opts.dragMode,
                isInRenderTile
            })
        ) {
            const mm = this.frac2mm(this.scene.crosshairPos)
            const zoomResult = SliceNavigation.calculateZoomScroll({
                posChange,
                currentZoom: this.scene.pan2Dxyzmm[3],
                yoke3Dto2DZoom: this.opts.yoke3Dto2DZoom,
                crosshairMM: mm
            })

            if (zoomResult.newVolScaleMultiplier !== undefined) {
                this.scene.volScaleMultiplier = zoomResult.newVolScaleMultiplier
            }
            this.scene.pan2Dxyzmm[3] = zoomResult.newZoom
            this.scene.pan2Dxyzmm[0] += zoomResult.panOffsetX
            this.scene.pan2Dxyzmm[1] += zoomResult.panOffsetY
            this.scene.pan2Dxyzmm[2] += zoomResult.panOffsetZ
            this.drawScene()
            this.canvas!.focus() // required after change for issue706
            this.sync()
            return
        }

        this.mouseClick(x, y, posChange, isDelta)
    }

    /**
     * set the slice type. This changes the view mode
     * @param st - sliceType is an enum of slice types to use
     * @example
     * niivue = new Niivue()
     * niivue.setSliceType(Niivue.sliceTypeMultiplanar)
     * @see {@link https://niivue.com/demos/features/basic.multiplanar.html | live demo usage}
     */
    setSliceType(st: SLICE_TYPE): this {
        this.opts.sliceType = st
        this.drawScene()
        return this
    }

    /**
     * set the opacity of a volume given by volume index
     * @param volIdx - the volume index of the volume to change
     * @param newOpacity - the opacity value. valid values range from 0 to 1. 0 will effectively remove a volume from the scene
     * @example
     * niivue = new Niivue()
     * niivue.setOpacity(0, 0.5) // make the first volume transparent
     * @see {@link https://niivue.com/demos/features/atlas.html | live demo usage}
     */
    setOpacity(volIdx: number, newOpacity: number): void {
        VolumeManager.setOpacity(this.volumes, volIdx, newOpacity)
        this.updateGLVolume()
    }

    /**
     * Get the current affine matrix of a volume.
     * @param volIdx - index of volume (0 = base image, 1+ = overlays)
     * @returns A deep copy of the 4x4 affine matrix as a 2D array (row-major)
     * @example
     * const affine = niivue.getVolumeAffine(1) // get affine of first overlay
     */
    getVolumeAffine(volIdx: number): number[][] {
        if (volIdx < 0 || volIdx >= this.volumes.length) {
            throw new Error(`Volume index ${volIdx} out of range`)
        }
        return this.volumes[volIdx].getAffine()
    }

    /**
     * Set the affine matrix of a volume and update the scene.
     * @param volIdx - index of volume to modify (0 = base image, 1+ = overlays)
     * @param affine - new 4x4 affine matrix as a 2D array (row-major)
     * @example
     * // Shift volume 10mm in X direction
     * const affine = niivue.getVolumeAffine(1)
     * affine[0][3] += 10
     * niivue.setVolumeAffine(1, affine)
     */
    setVolumeAffine(volIdx: number, affine: number[][]): void {
        if (volIdx < 0 || volIdx >= this.volumes.length) {
            throw new Error(`Volume index ${volIdx} out of range`)
        }
        this.volumes[volIdx].setAffine(affine)
        this.updateGLVolume()
    }

    /**
     * Apply a transform (translation, rotation, scale) to a volume's affine and update the scene.
     * Useful for manual image registration between volumes.
     * @param volIdx - index of volume to modify (0 = base image, 1+ = overlays)
     * @param transform - transform to apply with translation (mm), rotation (degrees), and scale
     * @example
     * // Rotate overlay 15 degrees around Y axis and translate 5mm in X
     * niivue.applyVolumeTransform(1, {
     *   translation: [5, 0, 0],
     *   rotation: [0, 15, 0],
     *   scale: [1, 1, 1]
     * })
     * @see {@link https://niivue.com/demos/features/manual.registration.html | live demo usage}
     */
    applyVolumeTransform(volIdx: number, transform: AffineTransform): void {
        if (volIdx < 0 || volIdx >= this.volumes.length) {
            throw new Error(`Volume index ${volIdx} out of range`)
        }
        this.volumes[volIdx].applyTransform(transform)
        this.updateGLVolume()
    }

    /**
     * Reset a volume's affine matrix to its original state when first loaded.
     * @param volIdx - index of volume to reset (0 = base image, 1+ = overlays)
     * @example
     * niivue.resetVolumeAffine(1) // reset overlay to original position
     */
    resetVolumeAffine(volIdx: number): void {
        if (volIdx < 0 || volIdx >= this.volumes.length) {
            throw new Error(`Volume index ${volIdx} out of range`)
        }
        this.volumes[volIdx].resetAffine()
        this.updateGLVolume()
    }

    /**
     * set the scale of the 3D rendering. Larger numbers effectively zoom.
     * @param scale - the new scale value
     * @example
     * niivue.setScale(2) // zoom some
     * @see {@link https://niivue.com/demos/features/shiny.volumes.html | live demo usage}
     */
    setScale(scale: number): void {
        this.scene.volScaleMultiplier = scale
        this.drawScene()
    }

    /**
     * Set the color of the 3D clip plane.
     * @param {number[]} color - An array of RGBA values.
     *   - **R**, **G**, **B** components range from `0.0` to `1.0`.
     *   - **A** (alpha) component ranges from `-1.0` to `1.0`, where:
     *       - `0.0–1.0` → controls background translucency.
     *       - `-1.0–0.0` → applies translucent shading to the volume instead of the background.
     *
     * @example
     * niivue.setClipPlaneColor([1, 1, 1, 0.5]);   // white, translucent background
     * niivue.setClipPlaneColor([1, 1, 1, -0.5]);  // white, translucent shading
     * @see {@link https://niivue.com/demos/features/clipplanes.html | Live demo usage}
     */
    setClipPlaneColor(color: number[]): void {
        this.opts.clipPlaneColor = color
        this.renderShader!.use(this.gl)
        this.gl.uniform4fv(this.renderShader!.uniforms.clipPlaneColor!, this.opts.clipPlaneColor)
        this.drawScene()
    }

    /**
     * @deprecated This method has been removed.
     * Use {@link setClipPlanes} instead, which generalizes clip plane configuration
     * @see {@link https://niivue.com/demos/features/clipplanesmulti.html | Multiple clip plane demo}
     */
    setClipPlaneThick(_thick: number): void {
        log.warn('setClipPlaneThick() has been removed. use setClipPlanes() instead.')
    }

    /**
     * @deprecated This method has been removed.
     * Use {@link setClipPlanes} instead, which generalizes clip plane configuration
     * @see {@link https://niivue.com/demos/features/clipplanesmulti.html | Multiple clip plane demo}
     */
    setClipVolume(_low: number[], _high: number[]): void {
        log.warn('setClipVolume() has been removed. use setClipPlanes() instead.')
    }

    /**
     * set proportion of volume rendering influenced by selected matcap.
     * @param gradientAmount - amount of matcap (NaN or 0..1), default 0 (matte, surface normal does not influence color). NaN renders the gradients.
     * @example
     * niivue.setVolumeRenderIllumination(0.6);
     * @see {@link https://niivue.com/demos/features/shiny.volumes.html | live demo usage}
     * @see {@link https://niivue.com/demos/features/gradient.order.html | live demo usage}
     */
    async setVolumeRenderIllumination(gradientAmount = 0.0): Promise<void> {
        this.renderGradientValues = Number.isNaN(gradientAmount)
        this.renderShader = this.renderVolumeShader
        if (this.renderGradientValues) {
            this.renderShader = this.renderGradientValuesShader
        } else {
            this.opts.gradientAmount = gradientAmount
            if (gradientAmount > 0.0 || this.opts.gradientOpacity > 0.0) {
                this.renderShader = this.renderGradientShader
            } else if (gradientAmount < 0.0) {
                this.renderShader = this.renderSliceShader
            }
        }
        this.initRenderShader(this.renderShader!, gradientAmount)
        this.renderShader!.use(this.gl)
        this.setClipPlaneColor(this.opts.clipPlaneColor)
        if (Number.isNaN(gradientAmount)) {
            this.gradientTextureAmount = 1.0
        } else {
            this.gradientTextureAmount = gradientAmount
        }
        if (this.volumes.length < 1) {
            return
        } // issue1158
        await this.refreshLayers(this.volumes[0], 0)
        this.drawScene()
    }

    /**
     * set volume rendering opacity influence of the gradient magnitude
     * @param gradientOpacity - amount of gradient magnitude influence on opacity (0..1), default 0 (no-influence)
     * @param renderSilhouette - make core transparent to enhance rims (0..1), default 0 (no-influence)
     * @example
     * niivue.setGradientOpacity(0.6);
     * @see {@link https://niivue.com/demos/features/gradient.opacity.html | live demo usage}
     */
    async setGradientOpacity(gradientOpacity = 0.0, renderSilhouette = 0.0): Promise<void> {
        this.opts.gradientOpacity = gradientOpacity
        this.opts.renderSilhouette = renderSilhouette
        if (this.renderGradientValues) {
            this.renderShader = this.renderGradientValuesShader
        } else if (this.gradientTextureAmount > 0.0 || gradientOpacity > 0.0) {
            this.renderShader = this.renderGradientShader
        } else if (this.gradientTextureAmount < 0.0) {
            this.renderShader = this.renderSliceShader
        }
        this.initRenderShader(this.renderShader!, this.gradientTextureAmount)
        this.renderShader!.use(this.gl)
        if (this.gradientTextureAmount > 0.0) {
            this.refreshLayers(this.volumes[0], 0)
        }
        this.drawScene()
    }

    /**
     * Generates a placeholder RGBA overlay of a green sphere for testing purposes only.
     * @internal
     * @remarks Marked for future removal — creates a test sphere, not intended for production use.
     */
    overlayRGBA(volume: NVImage): Uint8ClampedArray {
        return VolumeManager.overlayRGBA(volume)
    }

    /**
     * Convert voxel coordinates to millimeters using a transformation matrix.
     * @internal
     */
    vox2mm(XYZ: number[], mtx: mat4): vec3 {
        return CoordTransform.vox2mm(XYZ, mtx)
    }

    /**
     * clone a volume and return a new volume
     * @param index - the index of the volume to clone
     * @returns new volume to work with, but that volume is not added to the canvas
     * @example
     * niivue = new Niivue()
     * niivue.cloneVolume(0)
     */
    cloneVolume(index: number): NVImage {
        return VolumeManager.cloneVolume(this.volumes, index)
    }

    /**
     * Loads an NVDocument from a URL and integrates it into the scene.
     */
    async loadDocumentFromUrl(url: string): Promise<void> {
        const document = await NVDocument.loadFromUrl(url)
        await this.loadDocument(document)
    }

    /**
     * Loads an NVDocument
     * @returns  Niivue instance
     * @see {@link https://niivue.com/demos/features/document.load.html | live demo usage}
     */
    async loadDocument(document: NVDocument): Promise<this> {
        // Defensive: make sure document object has the runtime-shaped fields we expect.
        // If serializer returned a plain object or an older document shape, fill defaults.
        try {
            if (!document) {
                throw new Error('loadDocument called with falsy document')
            }

            // If scene is missing or malformed, use a fresh NVDocument's scene as canonical
            if (!document.scene || typeof document.scene !== 'object') {
                const tmpDoc = new NVDocument()
                document.scene = tmpDoc.scene
            }

            // Ensure sceneData exists and merge with INITIAL_SCENE_DATA (preserve any incoming values)
            document.scene.sceneData = {
                ...INITIAL_SCENE_DATA,
                ...(document.scene.sceneData || {})
            }

            // Ensure pan2Dxyzmm and crosshairPos have sane defaults
            if (!document.scene.sceneData.pan2Dxyzmm) {
                document.scene.sceneData.pan2Dxyzmm = vec4.fromValues(0, 0, 0, 1)
            }
            if (!document.scene.sceneData.crosshairPos) {
                document.scene.sceneData.crosshairPos = vec3.fromValues(0.5, 0.5, 0.5)
            }

            // Ensure top-level data fields exist (back-compat)
            document.data = {
                ...(document.data || {}),
                imageOptionsArray: document.data?.imageOptionsArray ?? [],
                encodedImageBlobs: document.data?.encodedImageBlobs ?? [],
                labels: document.data?.labels ?? [],
                meshOptionsArray: document.data?.meshOptionsArray ?? [],
                connectomes: document.data?.connectomes ?? [],
                encodedDrawingBlob: document.data?.encodedDrawingBlob ?? '',
                previewImageDataURL: document.data?.previewImageDataURL ?? '',
                customData: document.data?.customData ?? '',
                title: document.data?.title ?? document.title ?? 'untitled'
            }
        } catch (prepErr) {
            console.warn('loadDocument: defensive initialization failed', prepErr)
        }

        // Now proceed with the existing logic (merge opts, etc.)
        this.volumes = []
        this.meshes = []
        this.document = document

        // Ensure labels present for older documents
        this.document.labels = this.document.labels ? this.document.labels : []

        // Merge loaded opts with defaults so later code can safely read fields like drawingEnabled, bounds, etc.
        const mergedOpts = { ...DEFAULT_OPTIONS, ...(document.opts || {}) }
        // If serializer already normalized special numeric strings it will be in document.opts;
        // otherwise mergedOpts will contain whatever document.opts had — that's fine.
        this.scene.pan2Dxyzmm = document.scene.sceneData?.pan2Dxyzmm ?? [0, 0, 0, 1]
        this.document.opts = mergedOpts

        // If the serializer left scene.clipPlaneDepthAziElevs in place, set clip plane accordingly
        if (this.scene.clipPlaneDepthAziElevs) {
            this.setClipPlane(this.scene.clipPlaneDepthAziElevs[this.uiData.activeClipPlaneIndex ?? 0])
        }

        log.debug('load document', document)

        // Clear media map and prepare drawing texture/state
        this.mediaUrlMap.clear()
        this.createEmptyDrawing()

        // --- Rehydrate images using serializer (assume serializer returns NVImage instances) ---
        try {
            const images: NVImage[] = await NVSerializer.rehydrateImages(document.data)
            for (const img of images || []) {
                try {
                    this.addVolume(img)
                } catch (addErr) {
                    console.warn('Failed to add rehydrated image:', addErr, img)
                }
            }
        } catch (imgErr) {
            console.warn('NVSerializer.rehydrateImages failed:', imgErr)
        }

        if (this.volumes && this.volumes.length > 0) {
            this.back = this.volumes[0]
        } else {
            this.volumes = []
        }

        // --- Rehydrate meshes using serializer (assume serializer returns NVMesh instances) ---
        try {
            const meshes: NVMesh[] = await NVSerializer.rehydrateMeshes(document.data, this.gl, /* callUpdateMesh= */ true)
            for (const mesh of meshes || []) {
                try {
                    // serializer may already have called updateMesh; calling again is safe
                    if (typeof (mesh as any).updateMesh === 'function') {
                        ;(mesh as any).updateMesh(this.gl)
                    }
                    this.addMesh(mesh)
                } catch (meshErr) {
                    console.error('Failed to add rehydrated mesh:', meshErr, mesh)
                }
            }
        } catch (meshErr) {
            console.warn('NVSerializer.rehydrateMeshes failed:', meshErr)
        }

        // --- Connectomes (unchanged) ---
        if (document.data.connectomes) {
            for (const connectomeString of document.data.connectomes) {
                try {
                    const connectome = JSON.parse(connectomeString)
                    const meshToAdd = this.loadConnectomeAsMesh(connectome)
                    meshToAdd.updateMesh(this.gl)
                    this.addMesh(meshToAdd)
                } catch (e) {
                    console.warn('Failed to rehydrate connectome:', e)
                }
            }
        }

        // --- Deserialize drawBitmap if present ---
        this.createEmptyDrawing()
        const drawingBase64 = document.encodedDrawingBlob
        if (drawingBase64) {
            try {
                const drawingBitmap = await NVUtilities.b64toUint8(drawingBase64)
                if (drawingBitmap) {
                    const dims = this.back?.dims
                    if (!dims) {
                        console.warn('No back image available; cannot validate drawBitmap size.')
                        this.drawBitmap = drawingBitmap
                    } else {
                        let expectedBytes = dims[1] * dims[2] * dims[3]
                        if (drawingBitmap.length - 352 === expectedBytes) {
                            expectedBytes += 352
                        }
                        if (drawingBitmap.length !== expectedBytes) {
                            throw new Error(`drawBitmap size does not match the texture dimensions (${dims[1]}×${dims[2]}×${dims[3]}) ${expectedBytes} != ${dims[1] * dims[2] * dims[3]}.`)
                        }
                        this.drawBitmap = drawingBitmap
                        this.refreshDrawing()
                    }
                }
            } catch (err) {
                console.warn('Failed to decode drawBitmap:', err)
            }
        }

        // Final UI/GL updates
        await this.setGradientOpacity(this.opts.gradientOpacity)
        await this.setVolumeRenderIllumination(this.opts.gradientAmount)
        this.updateGLVolume()
        this.drawScene()
        this.onDocumentLoaded(document)
        return this
    }

    /**
 * generates JavaScript to load the current scene as a document
 * @param canvasId - id of canvas NiiVue will be attached to
 * @param esm - bundled version of NiiVue
 * @example
 * const javascript = this.generateLoadDocumentJavaScript("gl1");
 * const html = `<html><body><canvas id="gl1"></canvas><script type="module" async>
        ${javascript}</script></body></html>`;
 * @see {@link https://niivue.com/demos/features/save.custom.html.html | live demo usage}
 */
    async generateLoadDocumentJavaScript(canvasId: string, esm: string): Promise<string> {
        const json = this.json()

        const base64 = await NVUtilities.compressToBase64String(JSON.stringify(json))
        const javascript = `
        ${esm}

        async function saveNiivueAsHtml(pageName) {
          //get new docstring
          const docString = nv1.json();
          const html =
          document.getElementsByTagName("html")[0]
              .innerHTML.replace(base64, await NVUtilities.compressToBase64String(JSON.stringify(docString)));
          NVUtilities.download(html, pageName, "application/html");
        }

        var nv1 = new Niivue();
        await nv1.attachTo("${canvasId}");
        var base64 = "${base64}";
        NVUtilities.decompressBase64String(base64).then((jsonText) => {
          var json = JSON.parse(jsonText); // string -> JSON
          var doc = NVDocument.loadFromJSON(json);
          nv1.loadDocument(doc);
          nv1.updateGLVolume();
        });

      `

        return javascript
    }

    /**
     * generates HTML of current scene
     * @param canvasId - id of canvas NiiVue will be attached to
     * @param esm - bundled version of NiiVue
     * @returns HTML with javascript of the current scene
     * @example
     * const template = `<html><body><canvas id="gl1"></canvas><script type="module" async>
     *       %%javascript%%</script></body></html>`;
     * nv1.generateHTML("page.html", esm);
     */
    async generateHTML(canvasId = 'gl1', esm: string): Promise<string> {
        const javascript = await this.generateLoadDocumentJavaScript(canvasId, esm)
        const html = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
            <meta name="viewport" content="width=device-width,initial-scale=1.0" />
            <title>Save as HTML</title>
            <style>
            html {
              height: auto;
              min-height: 100%;
              margin: 0;
            }
            body {
              display: flex;
              flex-direction: column;
              margin: 0;
              min-height: 100%;
              width: 100%;
              position: absolute;
              font-family: system-ui, Arial, Helvetica, sans-serif;
              background: #ffffff;
              color: black;
              user-select: none; /* Standard syntax */
            }
            header {
              margin: 10px;
            }
            main {
              flex: 1;
              background: #000000;
              position: relative;
            }
            footer {
              margin: 10px;
            }
            canvas {
              position: absolute;
              cursor: crosshair;
            }
            canvas:focus {
              outline: 0px;
            }
            div {
              display: table-row;
              background-color: blue;
            }
            </style>
          </head>
          <body>
            <noscript>niivue requires JavaScript.</noscript>
            <header>
            Save the current scene as HTML
            <button id="save">Save as HTML</button>
            </header>
            <main>
              <canvas id="gl1"></canvas>
            </main>
            <script type="module" async>
              ${javascript}
              function saveAsHtml() {
                saveNiivueAsHtml("page.html");
              }
              // assign our event handler
              var button = document.getElementById("save");
              button.onclick = saveAsHtml;
            </script>
          </body>
        </html>`
        return html
    }

    /**
     * Save the current scene as a standalone HTML file
     * @param fileName - name of the HTML file to save (default: "untitled.html")
     * @param canvasId - ID of the canvas element NiiVue will attach to
     * @param esm - bundled ES module source for NiiVue
     * @returns a Promise that resolves when the file is downloaded
     * @see {@link https://niivue.com/demos/features/save.html.html | live demo usage}
     */
    async saveHTML(fileName = 'untitled.html', canvasId = 'gl1', esm: string): Promise<void> {
        const html = await this.generateHTML(canvasId, esm)
        return NVUtilities.download(html, fileName, 'application/html')
    }

    /**
     * Converts NiiVue scene to JSON
     */
    json(): ExportDocumentData {
        this.document.opts = this.opts
        this.document.scene = this.scene
        this.document.volumes = this.volumes
        this.document.meshes = this.meshes
        // we need to re-render before we generate the data URL https://stackoverflow.com/questions/30628064/how-to-toggle-preservedrawingbuffer-in-three-js
        this.drawScene()
        this.document.previewImageDataURL = this.canvas!.toDataURL()
        const json = this.document.json()

        return json
    }

    /**
     * Save the current scene as an .nvd document.
     *
     * @param fileName  Name of the file to create (default "untitled.nvd")
     * @param compress  If true, gzip-compress the JSON (default true)
     * @param options   Fine-grained switches:
     *                  • embedImages  – store encodedImageBlobs  (default true)
     *                  • embedPreview – store previewImageDataURL (default true)
     *
     * @example
     * // smallest possible file – no preview, just metadata
     * await nv.saveDocument('scene.nvd', true, { embedImages:false, embedPreview:false });
     * @see {@link https://niivue.com/demos/features/document.3d.html | live demo usage}
     */
    async saveDocument(fileName = 'untitled.nvd', compress = true, options: { embedImages?: boolean; embedPreview?: boolean } = {}): Promise<void> {
        const { embedImages = true, embedPreview = true } = options

        this.document.title = fileName
        this.document.volumes = this.volumes
        this.document.meshes = this.meshes

        // preview image only when requested
        if (embedPreview) {
            this.drawScene() // make sure the framebuffer is up to date
            this.document.previewImageDataURL = this.canvas!.toDataURL()
        } else {
            this.document.previewImageDataURL = '' // nothing embedded
        }

        // delegate the rest
        await this.document.download(fileName, compress, { embedImages })
    }

    /**
     * Load an array of image or mesh URLs using appropriate handlers
     * @param images - array of image or mesh descriptors (with URL and optional name)
     * @returns a Promise resolving to the current NiiVue instance after loading completes
     * @remarks Automatically dispatches each item to either volume or mesh loader based on file extension or registered custom loader
     * @see {@link https://niivue.com/demos/features/timeseries2.html | live demo usage}
     */
    async loadImages(images: Array<ImageFromUrlOptions | LoadFromUrlParams>): Promise<this> {
        const volumes = []
        const meshes = []
        for (const image of images) {
            if ('url' in image) {
                // prefer name over url
                const ext = this.getFileExt(image.name ? image.name : image.url)
                // check this.loaders to see if a user has register
                // a custom loader for this file extension
                if (this.loaders[ext]) {
                    // check if the loader type property is a volume or mesh
                    // by using the toExt property
                    const toExt = this.loaders[ext].toExt.toUpperCase()
                    if (MESH_EXTENSIONS.includes(toExt)) {
                        meshes.push(image)
                    } else {
                        volumes.push(image)
                    }
                    // continue to the next image
                    continue
                }

                if (MESH_EXTENSIONS.includes(ext.toUpperCase())) {
                    meshes.push(image)
                } else {
                    volumes.push(image)
                }
            }
        }
        if (volumes.length > 0) {
            await this.loadVolumes(volumes as ImageFromUrlOptions[])
        }
        if (meshes.length > 0) {
            await this.loadMeshes(meshes as LoadFromUrlParams[])
        }

        return this
    }

    async loadDicoms(dicomList: ImageFromUrlOptions[]): Promise<this> {
        // check if this.dicomLoader is set
        if (!this.getDicomLoader()) {
            throw new Error('No dicom loader set. Please set a dicom loader before loading dicoms')
        }
        this.drawScene()
        this.volumes = []
        // this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
        // this.gl.clear(this.gl.COLOR_BUFFER_BIT)
        // this.clearBounds(this.gl.COLOR_BUFFER_BIT)
        const promises = dicomList.map(async (dicom) => {
            let dicomData = null
            if (dicom.isManifest) {
                dicomData = await NVImage.fetchDicomData(dicom.url)
            } else {
                const response = await fetch(dicom.url)
                if (!response.ok) {
                    throw new Error(`Failed to load file: ${response.statusText}`)
                }
                const dicomArrayBuffer = await response.arrayBuffer()
                const basename = dicom.url.split('/').pop()
                const data = dicomArrayBuffer
                dicomData = [{ name: basename, data }]
            }
            const dicomLoader = this.getDicomLoader().loader
            const convertedArrayBuffer = await dicomLoader(dicomData)
            const name = convertedArrayBuffer[0].name
            const data = convertedArrayBuffer[0].data
            const image = await NVImage.loadFromUrl({ url: data, name })
            return image
        })

        const nvImages = await Promise.all(promises)
        // if only one nvImage, then add it to the scene ,else call onLoaderFinishedWithImages
        if (nvImages.length === 1) {
            this.addVolume(nvImages[0])
        } else {
            this.onDicomLoaderFinishedWithImages(nvImages)
        }
        return this
    }

    /**
     * load an array of volume objects
     * @param volumeList - the array of objects to load. each object must have a resolvable "url" property at a minimum
     * @returns returns the Niivue instance
     * @example
     * niivue = new Niivue()
     * niivue.loadVolumes([{url: 'someImage.nii.gz}, {url: 'anotherImage.nii.gz'}])
     * @see {@link https://niivue.com/demos/features/mask.html | live demo usage}
     */
    async loadVolumes(volumeList: ImageFromUrlOptions[]): Promise<this> {
        this.drawScene()

        if (this.thumbnailVisible) {
            // defer volume loading until user clicks on canvas with thumbnail image
            this.deferredVolumes = volumeList
            return this
        }
        this.volumes = []
        // this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
        // this.gl.clear(this.gl.COLOR_BUFFER_BIT)
        // this.clearBounds(this.gl.COLOR_BUFFER_BIT)
        this.closePAQD()
        // if more than one volume, then fetch them all simultaneously
        // using addVolumesFromUrl (note the "s" in "Volumes")
        // if (volumeList.length > 1) {
        //   await this.addVolumesFromUrl(volumeList)
        //   return this
        // }

        await this.addVolumesFromUrl(volumeList)
        return this
        // const imageOptions = {
        //   url: volumeList[0].url!,
        //   headers: volumeList[0].headers,
        //   name: volumeList[0].name,
        //   colormap: volumeList[0].colormap ? volumeList[0].colormap : volumeList[0].colorMap,
        //   colormapNegative: volumeList[0].colormapNegative
        //     ? volumeList[0].colormapNegative
        //     : volumeList[0].colorMapNegative,
        //   opacity: volumeList[0].opacity,
        //   urlImgData: volumeList[0].urlImgData,
        //   cal_min: volumeList[0].cal_min,
        //   cal_max: volumeList[0].cal_max,
        //   trustCalMinMax: this.opts.trustCalMinMax,
        //   isManifest: volumeList[0].isManifest,
        //   frame4D: volumeList[0].frame4D,
        //   limitFrames4D: volumeList[0].limitFrames4D || this.opts.limitFrames4D,
        //   colorbarVisible: volumeList[0].colorbarVisible
        // }
        // await this.addVolumeFromUrl(imageOptions)
        // return this
    }

    /**
     * Add mesh and notify subscribers
     */
    async addMeshFromUrl(meshOptions: LoadFromUrlParams): Promise<NVMesh> {
        const ext = this.getFileExt(meshOptions.url)
        if (ext === 'JCON' || ext === 'JSON') {
            let json: any
            if (meshOptions.buffer) {
                const view = ArrayBuffer.isView(meshOptions.buffer) ? meshOptions.buffer : new Uint8Array(meshOptions.buffer)

                const text = new TextDecoder('utf-8').decode(view)
                json = JSON.parse(text)
            } else {
                const response = await fetch(meshOptions.url)
                json = await response.json()
            }
            const mesh = this.loadConnectomeAsMesh(json)
            this.mediaUrlMap.set(mesh, meshOptions.url)
            this.onMeshAddedFromUrl(meshOptions, mesh)
            this.addMesh(mesh)
            return mesh
        }
        const mesh = await NVMesh.loadFromUrl({ ...meshOptions, gl: this.gl })
        this.mediaUrlMap.set(mesh, meshOptions.url)
        this.onMeshAddedFromUrl(meshOptions, mesh)
        this.addMesh(mesh)
        return mesh
    }

    /**
     * Add mesh and notify subscribers
     */
    async addMeshesFromUrl(meshOptions: LoadFromUrlParams[]): Promise<NVMesh[]> {
        const promises = meshOptions.map(async (meshItem) => {
            // first check this.loaders to see if the user has
            // registered a custom loader for this file type.
            // if so, use that loader to load the file.
            const ext = this.getFileExt(meshItem.name || meshItem.url)
            if (this.loaders[ext]) {
                let itemToLoad: string | Uint8Array | ArrayBuffer = meshItem.url
                const toExt = this.loaders[ext].toExt
                let name = meshItem.name || meshItem.url
                // in case the name is a url, just get the basename without the slashes
                name = name.split('/').pop()
                if (typeof meshItem.url === 'string') {
                    const url = meshItem.url
                    try {
                        const response = await fetch(url)
                        if (!response.ok) {
                            throw new Error(`Failed to load file: ${response.statusText}`)
                        }
                        itemToLoad = await response.arrayBuffer()
                    } catch (error) {
                        throw new Error(`Failed to load url ${url}: ${error}`)
                    }
                }
                const { positions, indices, colors = null, scalars = null, colormapLabel = null } = await this.loaders[ext].loader(itemToLoad)
                meshItem.name = `${name}.${toExt}`
                const mz3 = await NVMeshUtilities.createMZ3Async(positions, indices, false, colors, scalars, colormapLabel)
                meshItem.buffer = mz3
                // return await this.loadFromArrayBuffer(mz3, meshItem.name)
            }
            if (ext === 'JCON' || ext === 'JSON') {
                const response = await fetch(meshItem.url, {})
                const json = await response.json()
                const mesh = this.loadConnectomeAsMesh(json)
                this.mediaUrlMap.set(mesh, meshItem.url)
                this.onMeshAddedFromUrl(meshItem, mesh)
                return mesh
            }
            const mesh = await NVMesh.loadFromUrl({ ...meshItem, gl: this.gl })
            this.mediaUrlMap.set(mesh, meshItem.url)
            this.onMeshAddedFromUrl(meshItem, mesh)
            return mesh
        })
        const meshes = await Promise.all(promises)

        for (let i = 0; i < meshes.length; i++) {
            this.addMesh(meshes[i])
        }
        return meshes
    }

    /**
     * load an array of meshes
     * @param meshList - the array of objects to load. each object must have a resolvable "url" property at a minimum
     * @returns Niivue instance
     * @example
     * niivue = new Niivue()
     * niivue.loadMeshes([{url: 'someMesh.gii'}])
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    async loadMeshes(meshList: LoadFromUrlParams[]): Promise<this> {
        this.drawScene()

        if (this.thumbnailVisible) {
            // defer loading until user clicks on canvas with thumbnail image
            this.deferredMeshes = meshList
            return this
        }
        if (!this.initialized) {
            // await this.init();
        }
        this.meshes = []
        await this.addMeshesFromUrl(meshList)
        this.updateGLVolume()
        this.drawScene()
        return this
    }

    /**
     * Load a connectome from a given URL and initialize it.
     *
     * @param url - the URL to a JSON-formatted connectome definition
     * @param headers - optional HTTP headers to include with the request (e.g. for authorization)
     * @returns the `Niivue` instance (for method chaining)
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    async loadConnectomeFromUrl(url: string, headers = {}): Promise<this> {
        const response = await fetch(url, { headers })
        const json = await response.json()
        return this.loadConnectome(json)
    }

    /**
     * Load a FreeSurfer-style connectome from a given URL and initialize it.
     * @param url - the URL of the JSON-formatted connectome file
     * @param headers - optional HTTP headers to include in the fetch request (e.g. for authorization)
     * @returns the `Niivue` instance (for method chaining)
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    async loadFreeSurferConnectomeFromUrl(url: string, headers = {}): Promise<this> {
        const response = await fetch(url, { headers })
        const json = await response.json()
        return this.loadFreeSurferConnectome(json)
    }

    /**
     * load a connectome specified by json
     * @param json - freesurfer model
     * @returns Niivue instance
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    async loadFreeSurferConnectome(json: FreeSurferConnectome): Promise<this> {
        const connectome = NVConnectome.convertFreeSurferConnectome(json)
        return this.loadConnectome(connectome)
    }

    /**
     * Handles addition of a connectome node by adding a corresponding label and redrawing.
     * @internal
     */
    handleNodeAdded(event: { detail: { node: NVConnectomeNode } }): void {
        const labelData = ConnectomeManager.createNodeAddedLabelData(event.detail.node)
        this.addLabel(labelData.text, labelData.style, labelData.position)
        this.drawScene()
    }

    /**
     * Converts various connectome JSON formats to a standardized mesh representation.
     *
     * @param json - Connectome data in current or legacy format.
     * @returns The connectome as an `NVMesh`.
     * @internal
     */
    loadConnectomeAsMesh(json: Connectome | LegacyConnectome | FreeSurferConnectome): NVMesh {
        return ConnectomeManager.loadConnectomeAsMesh({ gl: this.gl, json })
    }

    /**
     * load a connectome specified by json
     * @param json - connectome model
     * @returns Niivue instance
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    loadConnectome(json: Connectome | LegacyConnectome): this {
        this.drawScene()
        this.meshes = []
        const mesh = this.loadConnectomeAsMesh(json)
        this.addMesh(mesh)
        this.drawScene()
        return this
    }

    /**
     * generate a blank canvas for the pen tool
     * @example niivue.createEmptyDrawing()
     * @see {@link https://niivue.com/demos/features/cactus.html | live demo usage}
     */
    createEmptyDrawing(): void {
        if (this.back === null || !this.back.dims) {
            return
        }
        const mn = Math.min(Math.min(this.back.dims[1], this.back.dims[2]), this.back.dims[3])
        if (mn < 1) {
            return
        } // something is horribly wrong!
        const vx = DrawingManager.calculateVoxelCount(this.back.dims)
        this.drawBitmap = DrawingManager.createEmptyBitmap(vx)
        this.clickToSegmentGrowingBitmap = DrawingManager.createEmptyBitmap(vx)
        this.drawClearAllUndoBitmaps()
        this.drawAddUndoBitmap()
        if (this.opts.is2DSliceShader) {
            this.drawTexture = this.r8Tex2D(this.drawTexture, TEXTURE_CONSTANTS.TEXTURE7_DRAW, this.back.dims)
        } else {
            this.drawTexture = this.r8Tex(this.drawTexture, TEXTURE_CONSTANTS.TEXTURE7_DRAW, this.back.dims, true)
        }
        this.refreshDrawing(false)
    }

    /**
     * dilate drawing so all voxels are colored.
     * works on drawing with multiple colors
     * @example niivue.drawGrowCut();
     * @see {@link https://niivue.com/demos/features/draw2.html | live demo usage}
     */
    drawGrowCut(): void {
        // this compute shader transiently requires 5 3D Textures:
        // TEXTURE11_GC_BACK      = 33995 background voxel intensity
        // TEXTURE12_GC_STRENGTH0 = 33996 weighting read/write
        // TEXTURE13_GC_STRENGTH1 = 33997 weighting write/read
        // TEXTURE14_GC_LABEL0    = 33998 drawing color read/write
        // TEXTURE15_GC_LABEL1    = 33999 drawing color write/read
        if (!this.back || !this.back.dims) {
            // TODO gl and back etc should be centrally guaranteed to be set
            throw new Error('back not defined')
        }
        const hdr = this.back.hdr!
        const gl = this.gl
        const nv = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
        if (!this.drawBitmap || this.drawBitmap.length !== nv) {
            log.debug('bitmap dims are wrong')
            return
        }
        // this.drawUndoBitmap = this.drawBitmap.slice();
        const fb = gl.createFramebuffer()
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
        gl.disable(gl.CULL_FACE)
        gl.viewport(0, 0, this.back.dims[1], this.back.dims[2]) // output in background dimensions
        gl.disable(gl.BLEND)
        let img16 = img2ras16(this.back)
        const background = this.r16Tex(null, TEXTURE_CONSTANTS.TEXTURE11_GC_BACK, this.back.dims, img16)
        for (let i = 1; i < nv; i++) {
            img16[i] = this.drawBitmap[i]
        }
        const label0 = this.r16Tex(null, TEXTURE_CONSTANTS.TEXTURE14_GC_LABEL0, this.back.dims, img16)
        const label1 = this.r16Tex(null, TEXTURE_CONSTANTS.TEXTURE15_GC_LABEL1, this.back.dims, img16)
        const kMAX_STRENGTH = 10000
        for (let i = 1; i < nv; i++) {
            if (img16[i] > 0) {
                img16[i] = kMAX_STRENGTH
            }
        }
        const strength0 = this.r16Tex(null, TEXTURE_CONSTANTS.TEXTURE12_GC_STRENGTH0, this.back.dims, img16)
        const strength1 = this.r16Tex(null, TEXTURE_CONSTANTS.TEXTURE13_GC_STRENGTH1, this.back.dims, img16)
        gl.bindVertexArray(this.genericVAO)
        const shader = this.growCutShader!
        shader.use(gl)
        const iterations = 128 // will run 2x this value
        gl.uniform1i(shader.uniforms.finalPass, 0)
        gl.uniform1i(shader.uniforms.backTex, 11) // background is TEXTURE11_GC_BACK
        for (let j = 0; j < iterations; j++) {
            gl.uniform1i(shader.uniforms.labelTex, 14) // label0 is TEXTURE14_GC_LABEL0
            gl.uniform1i(shader.uniforms.strengthTex, 12) // strength0 is TEXTURE12_GC_STRENGTH0
            for (let i = 0; i < this.back.dims[3]; i++) {
                const coordZ = (1 / this.back.dims[3]) * (i + 0.5)
                gl.uniform1f(shader.uniforms.coordZ, coordZ)
                gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, label1, 0, i)
                gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, strength1, 0, i)
                gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1])
                const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
                if (status !== gl.FRAMEBUFFER_COMPLETE) {
                    log.error('Incomplete framebuffer')
                }
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            }
            // reverse order strength1/label1 and strength0/label0 for reading and writing:
            if (j === iterations - 1) {
                gl.uniform1i(shader.uniforms.finalPass, 1)
            }
            gl.uniform1i(shader.uniforms.labelTex, 15) // label1 is TEXTURE15_GC_LABEL1
            gl.uniform1i(shader.uniforms.strengthTex, 13) // strength1 is TEXTURE13_GC_STRENGTH1
            for (let i = 0; i < this.back.dims[3]; i++) {
                const coordZ = (1 / this.back.dims[3]) * (i + 0.5)
                gl.uniform1f(shader.uniforms.coordZ, coordZ)
                gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, label0, 0, i)
                gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, strength0, 0, i)
                gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1])
                const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
                if (status !== gl.FRAMEBUFFER_COMPLETE) {
                    log.error('Incomplete framebuffer')
                }
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            }
        }
        // read data
        gl.drawBuffers([gl.COLOR_ATTACHMENT0])
        const readAttach = gl.COLOR_ATTACHMENT1
        const readTex = label0
        gl.readBuffer(readAttach) // label
        // assuming a framebuffer is bound with the texture to read attached
        const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT)
        const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE)
        if (format !== gl.RED_INTEGER || type !== gl.SHORT) {
            log.debug('readPixels will fail.')
        }
        img16 = new Int16Array()
        const nv2D = this.back.dims[1] * this.back.dims[2]
        const slice16 = new Int16Array(nv2D)
        for (let i = 0; i < this.back.dims[3]; i++) {
            gl.framebufferTextureLayer(
                gl.FRAMEBUFFER,
                readAttach, // gl.COLOR_ATTACHMENT1,//COLOR_ATTACHMENT1
                readTex, // strength1,//strength0
                0,
                i
            )
            gl.readPixels(0, 0, this.back.dims[1], this.back.dims[2], format, type, slice16)
            // img16.push(...slice16); // <- will elicit call stack limit error
            img16 = Int16Array.from([...img16, ...slice16])
        }
        let mx = img16[0]
        for (let i = 0; i < img16.length; i++) {
            mx = Math.max(mx, img16[i])
        }
        for (let i = 1; i < nv; i++) {
            this.drawBitmap[i] = img16[i]
        }
        gl.deleteTexture(background)
        gl.deleteTexture(strength0)
        gl.deleteTexture(strength1)
        gl.deleteTexture(label0)
        gl.deleteTexture(label1)
        gl.bindVertexArray(this.unusedVAO)
        // gl.deleteTexture(blendTexture);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.deleteFramebuffer(fb)
        this.drawAddUndoBitmap()
        this.refreshDrawing(true)
    }

    /**
     * Sets the color value of a voxel and its neighbors in the drawing bitmap.
     * @internal
     */
    drawPt(x: number, y: number, z: number, penValue: number, drawBitmap: Uint8Array | null = null): void {
        const targetBitmap = drawBitmap ?? this.drawBitmap
        if (!targetBitmap) {
            throw new Error('drawBitmap not set')
        }
        if (!this.back?.dims) {
            throw new Error('back.dims not set')
        }

        PenTool.drawPoint({
            x,
            y,
            z,
            penValue,
            drawBitmap: targetBitmap,
            dims: this.back.dims,
            penSize: this.opts.penSize,
            penAxCorSag: this.drawPenAxCorSag
        })
    }

    /**
     * Draws a 3D line between two voxels in the drawing bitmap using Bresenham's algorithm.
     * @internal
     */
    drawPenLine(ptA: number[], ptB: number[], penValue: number): void {
        if (!this.drawBitmap) {
            throw new Error('drawBitmap not set')
        }
        if (!this.back?.dims) {
            throw new Error('back.dims not set')
        }

        PenTool.drawLine({
            ptA,
            ptB,
            penValue,
            drawBitmap: this.drawBitmap,
            dims: this.back.dims,
            penSize: this.opts.penSize,
            penAxCorSag: this.drawPenAxCorSag
        })
    }

    /**
     * Draw a rectangle from point A to point B
     * @internal
     */
    drawRectangleMask(ptA: number[], ptB: number[], penValue: number): void {
        if (!this.drawBitmap) {
            throw new Error('drawBitmap not set')
        }
        if (!this.back?.dims) {
            throw new Error('back.dims not set')
        }

        ShapeTool.drawRectangle({
            ptA,
            ptB,
            penValue,
            drawBitmap: this.drawBitmap,
            dims: this.back.dims,
            penSize: this.opts.penSize,
            penAxCorSag: this.drawPenAxCorSag
        })
    }

    /**
     * Draw an ellipse from point A to point B (treating them as opposite corners of bounding box)
     * @internal
     */
    drawEllipseMask(ptA: number[], ptB: number[], penValue: number): void {
        if (!this.drawBitmap) {
            throw new Error('drawBitmap not set')
        }
        if (!this.back?.dims) {
            throw new Error('back.dims not set')
        }

        ShapeTool.drawEllipse({
            ptA,
            ptB,
            penValue,
            drawBitmap: this.drawBitmap,
            dims: this.back.dims,
            penSize: this.opts.penSize,
            penAxCorSag: this.drawPenAxCorSag
        })
    }

    /**
     * Performs a 1-voxel binary dilation on a connected cluster within the drawing mask using the drawFloodFillCore function.
     *
     * @param seedXYZ -  voxel index of the seed voxel in the mask array.
     * @param neighbors - Number of neighbors to consider for connectivity and dilation (6, 18, or 26).
     */
    drawingBinaryDilationWithSeed(
        seedXYZ: number[], // seed voxel x,y,z
        neighbors: 6 | 18 | 26 = 6
    ): void {
        try {
            const mask = this.drawBitmap
            const xDim = this.back.dims[1]
            const yDim = this.back.dims[2]
            const zDim = this.back.dims[3]
            const nx = xDim
            const nxy = xDim * yDim
            const totalVoxels = nxy * zDim
            function xyz2vx(pt: number[]): number {
                return pt[0] + pt[1] * nx + pt[2] * nxy
            }

            const seedIndex = xyz2vx(seedXYZ)

            // check that the seed index is within bounds
            if (seedIndex < 0 || seedIndex >= totalVoxels) {
                throw new Error('Seed index is out of bounds.')
            }

            // get value of the seed voxel
            const seedValue = mask[seedIndex]

            // check that the seed voxel is filled
            if (seedValue === 0) {
                throw new Error('Seed voxel is not part of a filled cluster.')
            }

            // create a copy of the mask to work on
            const img = mask.slice()
            // binarise the img since there could be multiple colors in the mask
            for (let i = 0; i < totalVoxels; i++) {
                img[i] = img[i] === seedValue ? 1 : 0
            }

            // use drawFloodFillCore to identify the connected cluster starting from seedIndex
            this.drawFloodFillCore(img, seedIndex, neighbors)

            // now, img has the cluster marked with value 2
            // create an output mask for dilation
            const outputMask = mask.slice() // Clone the original mask

            // precompute neighbor offsets based on connectivity
            const neighborOffsets: number[] = []

            // offsets for 6-connectivity (face neighbors)
            const offsets6 = [-nxy, nxy, -xDim, xDim, -1, 1]

            neighborOffsets.push(...offsets6)

            if (neighbors > 6) {
                // offsets for 18-connectivity (edge neighbors)
                neighborOffsets.push(-xDim - 1, -xDim + 1, xDim - 1, xDim + 1, -nxy - xDim, -nxy + xDim, -nxy - 1, -nxy + 1, nxy - xDim, nxy + xDim, nxy - 1, nxy + 1)
            }

            if (neighbors > 18) {
                // offsets for 26-connectivity (corner neighbors)
                neighborOffsets.push(-nxy - xDim - 1, -nxy - xDim + 1, -nxy + xDim - 1, -nxy + xDim + 1, nxy - xDim - 1, nxy - xDim + 1, nxy + xDim - 1, nxy + xDim + 1)
            }

            // iterate over the cluster voxels (value 2 in img) to perform dilation
            for (let idx = 0; idx < totalVoxels; idx++) {
                if (img[idx] === 2) {
                    const x = idx % xDim
                    const y = Math.floor((idx % nxy) / xDim)
                    const z = Math.floor(idx / nxy)

                    for (const offset of neighborOffsets) {
                        const neighborIdx = idx + offset

                        // skip if neighbor index is out of bounds
                        if (neighborIdx < 0 || neighborIdx >= totalVoxels) {
                            continue
                        }

                        // calculate neighbor coordinates
                        const nx = neighborIdx % xDim
                        const ny = Math.floor((neighborIdx % nxy) / xDim)
                        const nz = Math.floor(neighborIdx / nxy)

                        // ensure neighbor is adjacent (prevent wrapping around edges)
                        if (Math.abs(nx - x) > 1 || Math.abs(ny - y) > 1 || Math.abs(nz - z) > 1) {
                            continue
                        }

                        // if the neighbor voxel is empty in the original mask, fill it in the output mask
                        if (mask[neighborIdx] === 0) {
                            outputMask[neighborIdx] = seedValue
                        }
                    }
                }
            }
            // set the output as the new drawing bitmap
            this.drawBitmap = outputMask
            // update the undo stack
            this.drawAddUndoBitmap()
            // refresh the drawing (copy from cpu to gpu) and show immediately
            this.refreshDrawing(true)
        } catch (error) {
            log.error('Error in drawingBinaryDilationWithSeed:', error)
        }
    }

    /**
     * Flood fill to cluster connected voxels based on neighbor connectivity (6, 18, or 26 neighbors).
     * Voxels with value 1 are included in the cluster and set to 2.
     * Uses a queue-based breadth-first search.
     *
     * @internal
     */
    drawFloodFillCore(img: Uint8Array, seedVx: number, neighbors = 6): void {
        if (!this.back?.dims) {
            throw new Error('back.dims undefined')
        }
        const dims: [number, number, number] = [this.back.dims[1], this.back.dims[2], this.back.dims[3]]

        FloodFillTool.floodFillCore({
            img,
            seedVx,
            dims,
            neighbors: neighbors as FloodFillTool.NeighborConnectivity
        })
    }

    /**
     * Performs a flood fill on the drawing bitmap starting from a seed voxel, recoloring all connected voxels
     * based on spatial connectivity, intensity constraints, and other parameters.
     * Supports 2D or 3D fills, cluster growing, distance constraints, and preview mode for clickToSegment.
     *
     * @internal
     */
    drawFloodFill(
        seedXYZ: number[],
        newColor = 0,
        growSelectedCluster = 0,
        forceMin = NaN,
        forceMax = NaN,
        neighbors = 6,
        maxDistanceMM = Number.POSITIVE_INFINITY,
        is2D = false,
        targetBitmap: Uint8Array | null = null,
        isGrowClusterTool = false // Flag to distinguish from ClickToSegment and cluster growing
    ): void {
        if (!this.drawBitmap) {
            log.warn('drawFloodFill called without an initialized drawBitmap.')
            this.createEmptyDrawing()
            if (!this.drawBitmap) {
                log.error('Failed to create drawing bitmap.')
                return
            }
        }
        if (this.clickToSegmentIsGrowing && !this.clickToSegmentGrowingBitmap) {
            log.warn('drawFloodFill called in preview mode without initialized clickToSegmentGrowingBitmap.')
            if (this.drawBitmap) {
                this.clickToSegmentGrowingBitmap = this.drawBitmap.slice()
            } else {
                log.error('Cannot initialize growing bitmap as drawBitmap is null.')
                return
            }
            if (!this.clickToSegmentGrowingBitmap) {
                log.error('Failed to create growing bitmap.')
                return
            }
        }
        if (targetBitmap === null) {
            targetBitmap = this.drawBitmap
        }
        if (!targetBitmap) {
            log.error('drawFloodFill targetBitmap is null.')
            return
        }
        if (!this.back?.dims) {
            throw new Error('back.dims undefined')
        }

        newColor = Math.abs(newColor)
        const dims: [number, number, number] = [this.back.dims[1], this.back.dims[2], this.back.dims[3]]

        // Validate seed coordinates using FloodFillTool helper
        if (!FloodFillTool.isValidSeedCoordinate(seedXYZ, dims)) {
            return
        }

        // Create coordinate converters using FloodFillTool helper
        const converters = FloodFillTool.createCoordinateConverters(dims)
        const { nxyz } = converters

        const originalBitmap = this.clickToSegmentIsGrowing ? this.drawBitmap : targetBitmap
        if (!originalBitmap) {
            log.error('Could not determine original bitmap state.')
            return
        }

        const img = new Uint8Array(nxyz).fill(0)

        // Get constrained axis index for 2D fill using FloodFillTool helper
        const constrainXYZ = FloodFillTool.getConstrainedAxisIndex(is2D, this.drawPenAxCorSag)

        // Use coordinate converters from FloodFillTool
        const vx2xyz = converters.vx2xyz
        const xyz2vx = converters.xyz2vx
        const vx2mm = (xyz: number[]): vec3 => {
            return this.vox2mm(xyz, this.back.matRAS)
        }
        const seedMM = vx2mm(seedXYZ)
        const maxDistanceMM2 = maxDistanceMM ** 2
        function isWithinDistance(vx: number): boolean {
            const xzyVox = vx2xyz(vx)
            if (constrainXYZ >= 0 && xzyVox[constrainXYZ] !== seedXYZ[constrainXYZ]) {
                return false
            }
            const xyzMM = vx2mm(xzyVox)
            const dist2 = (xyzMM[0] - seedMM[0]) ** 2 + (xyzMM[1] - seedMM[1]) ** 2 + (xyzMM[2] - seedMM[2]) ** 2
            return dist2 <= maxDistanceMM2
        }

        const seedVx = xyz2vx(seedXYZ)
        const originalSeedColor = originalBitmap[seedVx] // Color from original state

        // Validate grow cluster seed using FloodFillTool helper
        if (isGrowClusterTool && !FloodFillTool.isValidGrowClusterSeed(originalSeedColor)) {
            log.debug('Grow/Erase Cluster tool requires starting on a masked voxel.')
            if (this.clickToSegmentIsGrowing && this.clickToSegmentGrowingBitmap && this.drawBitmap) {
                this.clickToSegmentGrowingBitmap.set(this.drawBitmap)
                this.refreshDrawing(true, true)
            }
            return
        }
        if (growSelectedCluster === 0 && originalSeedColor === newColor && !isGrowClusterTool && newColor !== 0) {
            log.debug('drawFloodFill selected voxel is already desired color')
            if (!this.clickToSegmentIsGrowing) {
                return
            }
        }

        let baseIntensity = NaN

        if (isGrowClusterTool && (growSelectedCluster === Number.POSITIVE_INFINITY || growSelectedCluster === Number.NEGATIVE_INFINITY)) {
            const tempImgForIdentification = originalBitmap.slice()
            for (let i = 0; i < nxyz; i++) {
                tempImgForIdentification[i] = tempImgForIdentification[i] === originalSeedColor && isWithinDistance(i) ? 1 : 0
            }
            if (tempImgForIdentification[seedVx] !== 1) {
                log.error('Seed voxel could not be marked for cluster ID.')
                return
            }
            this.drawFloodFillCore(tempImgForIdentification, seedVx, neighbors) // Marks cluster as 2

            const backImg = this.volumes[0].img2RAS()

            // Calculate cluster mean intensity using FloodFillTool helper
            baseIntensity = FloodFillTool.calculateClusterMeanIntensity({
                clusterImg: tempImgForIdentification,
                backImg,
                nxyz,
                fallbackIntensity: backImg[seedVx]
            })
            log.debug(`Grow Cluster using mean intensity: ${baseIntensity.toFixed(2)} voxels.`)

            // Calculate intensity bounds using FloodFillTool helper
            const [fillMin, fillMax] = FloodFillTool.getIntensityBounds(growSelectedCluster, baseIntensity, NaN, NaN)

            for (let i = 0; i < nxyz; i++) {
                if (tempImgForIdentification[i] === 2) {
                    img[i] = 1
                } else if (originalBitmap[i] === 0) {
                    const intensity = backImg[i]
                    if (intensity >= fillMin && intensity <= fillMax && isWithinDistance(i)) {
                        img[i] = 1
                    }
                }
            }
            newColor = originalSeedColor
        } else {
            if (growSelectedCluster === 0) {
                if (isGrowClusterTool && newColor === 0) {
                    log.debug(`Erase Cluster: Identifying cluster with color ${originalSeedColor}`)
                    for (let i = 0; i < nxyz; i++) {
                        img[i] = originalBitmap[i] === originalSeedColor && isWithinDistance(i) ? 1 : 0
                    }
                } else {
                    for (let i = 0; i < nxyz; i++) {
                        if (originalBitmap[i] === originalSeedColor && isWithinDistance(i)) {
                            if (originalSeedColor !== 0) {
                                img[i] = 1
                            }
                        }
                    }
                }
            } else {
                const backImg = this.volumes[0].img2RAS()
                baseIntensity = backImg[seedVx] // ClickToSegment uses single seed intensity

                // Calculate intensity bounds using FloodFillTool helper
                const [fillMin, fillMax] = FloodFillTool.getIntensityBounds(growSelectedCluster, baseIntensity, forceMin, forceMax)

                for (let i = 0; i < nxyz; i++) {
                    const intensity = backImg[i]
                    if (intensity >= fillMin && intensity <= fillMax && isWithinDistance(i)) {
                        img[i] = 1
                    }
                }
                newColor = originalBitmap[seedVx]
                if (newColor === 0) {
                    newColor = this.opts.penValue
                    if (newColor < 1 || !isFinite(newColor)) {
                        newColor = 1
                    }
                }
            }
        }

        if (img[seedVx] !== 1) {
            // Check if seed should be forced to candidate using FloodFillTool helper
            const isSeedValidOriginal = FloodFillTool.shouldForceSeedToCandidate(originalSeedColor, newColor, isGrowClusterTool, growSelectedCluster)

            if (isSeedValidOriginal && isWithinDistance(seedVx)) {
                img[seedVx] = 1
                log.debug('Forcing seed voxel to 1 in working buffer.')
            } else {
                log.debug("Seed voxel not marked as candidate '1' and not valid originally.")
                if (this.clickToSegmentIsGrowing && this.clickToSegmentGrowingBitmap && this.drawBitmap) {
                    this.clickToSegmentGrowingBitmap.set(this.drawBitmap) // Reset preview
                }
                return
            }
        }

        this.drawFloodFillCore(img, seedVx, neighbors) // Marks reachable '1's as '2'

        // Apply fill result using FloodFillTool helper
        FloodFillTool.applyFillResult({
            img,
            targetBitmap,
            originalBitmap,
            newColor,
            nxyz,
            isPreviewMode: this.clickToSegmentIsGrowing && targetBitmap === this.clickToSegmentGrowingBitmap
        })

        if (!this.clickToSegmentIsGrowing) {
            this.drawAddUndoBitmap()
            this.refreshDrawing(true, false) // Refresh GPU from main bitmap
        } else {
            this.refreshDrawing(true, true) // Refresh GPU from preview bitmap
        }
    }

    /**
     * Fills exterior regions of a 2D bitmap, marking outside voxels with 2
     * while leaving interior voxels at 0 and borders at 1. Operates within specified bounds.
     * Uses first-in, first-out queue for storage.
     * @internal
     */
    floodFillSectionFIFO(img2D: Uint8Array, dims2D: readonly number[], minPt: readonly number[], maxPt: readonly number[]): void {
        PenTool.floodFillSection({ img2D, dims2D, minPt, maxPt })
    }

    /**
     * Connects and fills the interior of drawn line segments in 2D slice space.
     * @internal
     */
    drawPenFilled(): void {
        if (this.drawPenFillPts.length < 2) {
            // Cannot fill single line
            this.drawPenFillPts = []
            return
        }

        if (!this.drawBitmap) {
            throw new Error('drawBitmap undefined')
        }

        if (!this.back?.dims) {
            throw new Error('back.dims undefined')
        }

        // Get current undo bitmap for non-overwriting fill mode
        const currentUndoBitmap = this.drawUndoBitmaps[this.currentDrawUndoBitmap]?.length > 0 ? this.drawUndoBitmaps[this.currentDrawUndoBitmap] : null

        // Delegate to pure function
        const result = PenTool.drawPenFilled({
            penFillPts: this.drawPenFillPts,
            penAxCorSag: this.drawPenAxCorSag,
            drawBitmap: this.drawBitmap,
            dims: this.back.dims,
            penValue: this.opts.penValue,
            fillOverwrites: this.drawFillOverwrites,
            currentUndoBitmap
        })

        // Update state with result
        if (result.success) {
            this.drawBitmap = result.drawBitmap
        }

        // Clear pen fill points and update undo/refresh
        this.drawPenFillPts = []
        this.drawAddUndoBitmap()
        this.refreshDrawing(false)
    }

    /**
     * close drawing: make sure you have saved any changes before calling this!
     * @example niivue.closeDrawing();
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    closeDrawing(): void {
        this.drawClearAllUndoBitmaps()
        this.drawTexture = this.rgbaTex(this.drawTexture, TEXTURE_CONSTANTS.TEXTURE7_DRAW, [2, 2, 2, 2], true)
        this.drawBitmap = null
        this.clickToSegmentGrowingBitmap = null
        this.drawScene()
    }

    /**
     * copy drawing bitmap from CPU to GPU storage and redraw the screen
     * @param isForceRedraw - refreshes scene immediately (default true)
     * @example niivue.refreshDrawing();
     * @see {@link https://niivue.com/demos/features/cactus.html | live demo usage}
     */
    refreshDrawing(isForceRedraw = true, useClickToSegmentBitmap = false): void {
        // Determine which bitmap to use
        const bitmapSourceResult = DrawingManager.determineBitmapDataSource({
            useClickToSegmentBitmap,
            drawingEnabled: this.opts.drawingEnabled,
            clickToSegment: this.opts.clickToSegment,
            drawBitmap: this.drawBitmap,
            clickToSegmentGrowingBitmap: this.clickToSegmentGrowingBitmap
        })

        if (bitmapSourceResult.warning) {
            log.warn(`refreshDrawing: ${bitmapSourceResult.warning}`)
        }

        const bitmapDataSource = bitmapSourceResult.bitmapDataSource

        if (!this.back?.dims) {
            // If back isn't ready, we can't determine dimensions. Exit early.
            log.warn('refreshDrawing: back.dims undefined, cannot refresh drawing texture yet.')
            return
        }

        // Dimensions check
        const vx = DrawingManager.calculateVoxelCount(this.back.dims)

        // Check if the determined bitmapDataSource exists
        if (!bitmapDataSource) {
            log.warn(`refreshDrawing: Bitmap data source (${bitmapSourceResult.useClickToSegmentBitmap ? 'growing' : 'main'}) is null. Cannot update texture.`)
            if (isForceRedraw) {
                this.drawScene()
            } // might just be an empty drawing
            return
        }

        // Adjust dimensions for special cases and validate
        const dims = DrawingManager.adjustDimensionsForSpecialCase(bitmapDataSource.length, this.back.dims.slice())
        if (!DrawingManager.validateBitmapLength(bitmapDataSource.length, vx)) {
            log.warn(`Drawing bitmap length (${bitmapDataSource.length}) must match the background image (${vx})`)
        }

        // Proceed with texture update using bitmapDataSource
        this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE7_DRAW)
        if (this.opts.is2DSliceShader) {
            const vox = this.frac2vox(this.scene.crosshairPos)
            const z = Math.min(Math.max(vox[2], 0), dims[3] - 1)
            const sliceBytes = dims[1] * dims[2]
            const zOffset = z * sliceBytes
            log.debug(`refresh huge 2D drawing x×y×z ${dims[1]}×${dims[2]}×${dims[3]} slice ${zOffset}`)
            const sliceData = bitmapDataSource.subarray(zOffset, zOffset + sliceBytes)
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.drawTexture)
            this.gl.texSubImage2D(
                this.gl.TEXTURE_2D,
                0, // Level
                0,
                0, // xOffset, yOffset
                dims[1],
                dims[2], // Width, Height
                this.gl.RED,
                this.gl.UNSIGNED_BYTE,
                sliceData
            )
            // TODO: this.clickToSegmentGrowingBitmap may need to be changed for huge bitmaps
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_3D, this.drawTexture)
            this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, dims[1], dims[2], dims[3], this.gl.RED, this.gl.UNSIGNED_BYTE, bitmapDataSource)
        }
        if (!this.drawTexture) {
            log.error('refreshDrawing: drawTexture (GPU texture) is null.')
            return
        }

        if (isForceRedraw) {
            this.drawScene()
        }
    }

    /**
     * close probabilistic atlas texture
     * @example niivue.closePAQD();
     * @internal
     */
    closePAQD(): void {
        if (!this._gl || !this.paqdTexture) {
            return
        }
        this.paqdTexture = this.rgbaTex(this.paqdTexture, TEXTURE_CONSTANTS.TEXTURE8_PAQD, [2, 2, 2, 2], true)
    }

    /**
     * Creates a 2D 1-component uint8 texture on the GPU with given dimensions.
     * @internal
     */
    r8Tex2D(texID: WebGLTexture | null, activeID: number, dims: number[], isInit = false): WebGLTexture | null {
        if (texID) {
            this.gl.deleteTexture(texID)
        }
        texID = this.gl.createTexture()
        this.gl.activeTexture(activeID)
        this.gl.bindTexture(this.gl.TEXTURE_2D, texID)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1)
        this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.R8, dims[1], dims[2])
        if (isInit) {
            const img8 = new Uint8Array(dims[1] * dims[2])
            this.gl.texSubImage2D(
                this.gl.TEXTURE_2D,
                0, // Level
                0,
                0, // xOffset, yOffset
                dims[1],
                dims[2], // Width, Height
                this.gl.RED,
                this.gl.UNSIGNED_BYTE,
                img8
            )
        }
        return texID
    }

    /**
     * Initializes font metrics from loaded font data.
     * @internal
     */
    initFontMets(): void {
        if (!this.fontMetrics) {
            throw new Error('fontMetrics undefined')
        }

        this.fontMets = {
            distanceRange: this.fontMetrics.atlas.distanceRange,
            size: this.fontMetrics.atlas.size,
            mets: {}
        }
        for (let id = 0; id < 256; id++) {
            // clear ASCII codes 0..256
            this.fontMets.mets[id] = {
                xadv: 0,
                uv_lbwh: [0, 0, 0, 0],
                lbwh: [0, 0, 0, 0]
            }
        }
        const scaleW = this.fontMetrics.atlas.width
        const scaleH = this.fontMetrics.atlas.height
        for (let i = 0; i < this.fontMetrics.glyphs.length; i++) {
            const glyph = this.fontMetrics.glyphs[i]
            const id = glyph.unicode
            this.fontMets.mets[id].xadv = glyph.advance
            if (glyph.planeBounds === undefined) {
                continue
            }
            let l = glyph.atlasBounds.left / scaleW
            let b = (scaleH - glyph.atlasBounds.top) / scaleH
            let w = (glyph.atlasBounds.right - glyph.atlasBounds.left) / scaleW
            let h = (glyph.atlasBounds.top - glyph.atlasBounds.bottom) / scaleH
            this.fontMets.mets[id].uv_lbwh = [l, b, w, h]
            l = glyph.planeBounds.left
            b = glyph.planeBounds.bottom
            w = glyph.planeBounds.right - glyph.planeBounds.left
            h = glyph.planeBounds.top - glyph.planeBounds.bottom
            this.fontMets.mets[id].lbwh = [l, b, w, h]
        }
    }

    /**
     * Load typeface for colorbars, measurements and orientation text.
     * @param fontSheetUrl - URL to a bitmap font sheet image (e.g., a PNG atlas of glyphs)
     * @param metricsUrl - URL to the corresponding font metrics JSON (defines character bounds and spacing)
     * @returns a Promise that resolves when the font is loaded
     * @example
     * niivue.loadFont("./Roboto.png","./Roboto.json")
     * @see {@link https://niivue.com/demos/features/selectfont.html | live demo usage}
     */
    async loadFont(fontSheetUrl = defaultFontPNG, metricsUrl = defaultFontMetrics): Promise<void> {
        await this.loadFontTexture(fontSheetUrl)
        // @ts-expect-error FIXME this doesn't look right - metricsUrl is a huge object
        const response = await fetch(metricsUrl)
        if (!response.ok) {
            throw Error(response.statusText)
        }

        const jsonText = await response.text()
        this.fontMetrics = JSON.parse(jsonText)

        this.initFontMets()

        this.fontShader!.use(this.gl)
        this.drawScene()
    }

    /**
     * Loads the default MatCap texture.
     * @internal
     */
    async loadDefaultMatCap(): Promise<WebGLTexture | null> {
        return this.loadMatCapTexture(defaultMatCap)
    }

    /**
     * Loads the default font texture and initializes font metrics.
     * @internal
     */
    async loadDefaultFont(): Promise<void> {
        await this.loadFontTexture(this.DEFAULT_FONT_GLYPH_SHEET)
        this.fontMetrics = this.DEFAULT_FONT_METRICS
        this.initFontMets()
    }

    /**
     * Initializes text rendering by setting up font shader, loading default font and matcap texture,
     * and drawing the loading text.
     * @internal
     */
    async initText(): Promise<void> {
        // font shader
        // multi-channel signed distance font https://github.com/Chlumsky/msdfgen
        this.fontShader = new Shader(this.gl, vertFontShader, fragFontShader)
        this.fontShader.use(this.gl)

        await this.loadDefaultFont()
        await this.loadDefaultMatCap()
        this.drawLoadingText(this.opts.loadingText)
    }

    /**
     * Maps a mesh shader name to its corresponding index number.
     * @internal
     */
    meshShaderNameToNumber(meshShaderName = 'Phong'): number | undefined {
        return ShaderManager.meshShaderNameToNumber(meshShaderName, this.meshShaders)
    }

    /**
     * select new shader for triangulated meshes and connectomes. Note that this function requires the mesh is fully loaded: you may want use `await` with loadMeshes (as seen in live demo).
     * @param id - id of mesh to change
     * @param meshShaderNameOrNumber - identify shader for usage
     * @example niivue.setMeshShader(niivue.meshes[0].id, 'toon');
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    setMeshShader(id: number | string, meshShaderNameOrNumber: number | string = 2): void {
        const result = MeshManager.setMeshShader({
            meshes: this.meshes,
            meshShaders: this.meshShaders,
            id,
            meshShaderNameOrNumber,
            meshShaderNameToNumber: this.meshShaderNameToNumber.bind(this)
        })
        if (result === null) {
            return
        }
        this.updateGLVolume()
        this.onMeshShaderChanged(result.meshIndex, result.shaderIndex)
    }

    /**
     *
     * @param fragmentShaderText - custom fragment shader.
     * @param name - title for new shader.
     * @returns created custom mesh shader
     */
    createCustomMeshShader(
        fragmentShaderText: string,
        name = 'Custom'
        // vertexShaderText = ""
    ): { Name: string; Frag: string; shader?: Shader } {
        return ShaderManager.createCustomMeshShader({
            gl: this.gl,
            fragmentShaderText,
            name,
            meshShaders: this.meshShaders
        })
    }

    /**
     * Install a special shader for 2D slice views
     * @param fragmentShaderText - custom fragment shader.
     * @if not text is provided, the default shader will be used
     * @internal
     */
    setCustomSliceShader(fragmentShaderText: string = ''): void {
        this.customSliceShader = ShaderManager.setCustomSliceShader({
            gl: this.gl,
            fragmentShaderText,
            drawOpacity: this.drawOpacity,
            customSliceShader: this.customSliceShader
        })
        this.updateGLVolume()
    }

    /**
     * Define a new GLSL shader program to influence mesh coloration
     * @param fragmentShaderText - the GLSL source code for the custom fragment shader
     * @param name - a descriptive label for the shader (used in menus or debugging)
     * @returns the index of the new shader (use with {@link setMeshShader})
     * @see {@link https://niivue.com/demos/features/mesh.atlas.html | live demo usage}
     */
    setCustomMeshShader(fragmentShaderText = '', name = 'Custom'): number {
        const m = this.createCustomMeshShader(fragmentShaderText, name)
        this.meshShaders.push(m)
        this.onCustomMeshShaderAdded(fragmentShaderText, name)
        return this.meshShaders.length - 1
    }

    /**
     * Fetch GLSL fragment shader source from a URL and register it as a custom mesh shader.
     * @async
     * @param url - URL pointing to a plain-text GLSL fragment shader file
     * @param name - a descriptive label for the shader (used in menus or debugging)
     * @returns {Promise<number>} the index of the new shader (use with {@link setMeshShader})
     * @throws {Error} when the fetch fails or the response is not OK
     * @see {@link https://niivue.com/demos/features/web.extras.html | live demo usage}
     */
    async setCustomMeshShaderFromUrl(url: string, name = ''): Promise<number> {
        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`Failed to fetch shader from ${url}: ${response.status} ${response.statusText}`)
            }
            const txt = await response.text()
            // If name not provided, derive from filename (strip extension)
            if (!name || name.trim() === '') {
                const base = url.split('/').pop() ?? url // drop parent paths
                const noQuery = base.split('?')[0].split('#')[0] // strip ?query and #hash
                name = noQuery.replace(/\.[^/.]+$/, '') // remove last extension
            }
            // Delegate to the synchronous helper which creates and registers the shader
            const index = this.setCustomMeshShader(txt, name)
            return index
        } catch (err) {
            // Re-throw with a clearer message while preserving original error information
            throw new Error(`setCustomMeshShaderFromUrl(${url}) failed: ${(err as Error).message}`)
        }
    }

    /**
     * retrieve all currently loaded meshes
     * @param sort - sort output alphabetically
     * @returns list of available mesh shader names
     * @example niivue.meshShaderNames();
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    meshShaderNames(sort = true): string[] {
        return ShaderManager.meshShaderNames(this.meshShaders, sort)
    }

    /**
     * Initializes a rendering shader with texture units and uniforms.
     * @internal
     */
    initRenderShader(shader: Shader, gradientAmount = 0.0): void {
        ShaderManager.initRenderShader({
            gl: this.gl,
            shader,
            gradientAmount,
            renderDrawAmbientOcclusion: this.renderDrawAmbientOcclusion,
            renderSilhouette: this.opts.renderSilhouette,
            gradientOpacity: this.opts.gradientOpacity
        })
    }

    /**
     * Initializes WebGL state, shaders, textures, buffers, and sets up the rendering pipeline.
     * Also loads default fonts, matcap textures, and thumbnail if specified.
     * @internal
     * @returns {Promise<this>} Resolves to this instance after initialization completes.
     */
    async init(): Promise<this> {
        // initial setup: only at the startup of the component
        // print debug info (gpu vendor and renderer)
        const rendererInfo = this.gl.getExtension('WEBGL_debug_renderer_info')
        if (rendererInfo) {
            const vendor = this.gl.getParameter(rendererInfo.UNMASKED_VENDOR_WEBGL)
            const renderer = this.gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)
            log.info('renderer vendor: ', vendor)
            log.info('renderer: ', renderer)
        } else {
            log.info('debug_renderer_info unavailable')
        }
        // firefox masks vendor and renderer for privacy
        const glInfo = this.gl.getParameter(this.gl.RENDERER)
        log.info('firefox renderer: ', glInfo) // Useful with firefox "Intel(R) HD Graphics" useless in Chrome and Safari "WebKit WebGL"
        // this.gl.clearDepth(0.0)
        this.gl.enable(this.gl.CULL_FACE)
        this.gl.cullFace(this.gl.FRONT)
        this.gl.enable(this.gl.BLEND)
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

        // register volume and overlay textures
        this.volumeTexture = this.rgbaTex(this.volumeTexture, TEXTURE_CONSTANTS.TEXTURE0_BACK_VOL, [2, 2, 2, 2], true)
        this.overlayTexture = this.rgbaTex(this.overlayTexture, TEXTURE_CONSTANTS.TEXTURE2_OVERLAY_VOL, [2, 2, 2, 2], true)
        this.drawTexture = this.r8Tex(this.drawTexture, TEXTURE_CONSTANTS.TEXTURE7_DRAW, [2, 2, 2, 2], true)
        this.paqdTexture = this.rgbaTex(this.paqdTexture, TEXTURE_CONSTANTS.TEXTURE8_PAQD, [2, 2, 2, 2], true)
        const rectStrip = [
            1,
            1,
            0, // RAI
            1,
            0,
            0, // RPI
            0,
            1,
            0, // LAI
            0,
            0,
            0 // LPI
        ]

        const gl = this.gl

        this.cuboidVertexBuffer = gl.createBuffer()!
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cuboidVertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rectStrip), gl.STATIC_DRAW)

        // setup generic VAO style sheet:
        this.genericVAO = gl.createVertexArray()! // 2D slices, fonts, lines
        gl.bindVertexArray(this.genericVAO)
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cuboidVertexBuffer); //triangle strip does not need indices
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cuboidVertexBuffer)
        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
        gl.bindVertexArray(this.unusedVAO) // switch off to avoid tampering with settings
        this.pickingMeshShader = new Shader(gl, vertMeshShader, fragMeshDepthShader)
        this.pickingMeshShader.use(gl)
        this.pickingImageShader = ShaderManager.initPickingImageShader(gl)
        // Initialize slice shaders
        const sliceShaders = ShaderManager.initSliceShaders(gl, this.drawOpacity)
        this.slice2DShader = sliceShaders.slice2DShader
        this.sliceMMShader = sliceShaders.sliceMMShader
        this.sliceV1Shader = sliceShaders.sliceV1Shader
        // Initialize orient cube shader
        const orientCubeShaderResult = ShaderManager.initOrientCubeShader(gl, orientCube, this.unusedVAO)
        this.orientCubeShader = orientCubeShaderResult.shader
        this.orientCubeShaderVAO = orientCubeShaderResult.vao
        // Initialize 2D rendering shaders
        const shaders2D = ShaderManager.init2DShaders(gl)
        this.rectShader = shaders2D.rectShader
        this.rectOutlineShader = shaders2D.rectOutlineShader
        this.lineShader = shaders2D.lineShader
        this.line3DShader = shaders2D.line3DShader
        this.circleShader = shaders2D.circleShader
        // Initialize 3D volume rendering shaders
        const volumeRenderShaders = ShaderManager.initVolumeRenderShaders({
            gl,
            renderDrawAmbientOcclusion: this.renderDrawAmbientOcclusion,
            renderSilhouette: this.opts.renderSilhouette,
            gradientOpacity: this.opts.gradientOpacity
        })
        this.renderVolumeShader = volumeRenderShaders.renderVolumeShader
        this.renderSliceShader = volumeRenderShaders.renderSliceShader
        this.renderGradientShader = volumeRenderShaders.renderGradientShader
        this.renderGradientValuesShader = volumeRenderShaders.renderGradientValuesShader
        this.renderShader = volumeRenderShaders.renderShader
        // Initialize colorbar shader
        this.colorbarShader = ShaderManager.initColorbarShader(gl)
        // Initialize image processing shaders
        const imageProcessingShaders = ShaderManager.initImageProcessingShaders(gl)
        this.blurShader = imageProcessingShaders.blurShader
        this.sobelBlurShader = imageProcessingShaders.sobelBlurShader
        this.sobelFirstOrderShader = imageProcessingShaders.sobelFirstOrderShader
        this.sobelSecondOrderShader = imageProcessingShaders.sobelSecondOrderShader
        this.growCutShader = imageProcessingShaders.growCutShader
        this.passThroughShader = imageProcessingShaders.passThroughShader

        // Initialize orientation shaders
        const orientationShaders = ShaderManager.initOrientationShaders(gl)
        this.orientShaderAtlasU = orientationShaders.orientShaderAtlasU
        this.orientShaderAtlasI = orientationShaders.orientShaderAtlasI
        this.orientShaderU = orientationShaders.orientShaderU
        this.orientShaderI = orientationShaders.orientShaderI
        this.orientShaderF = orientationShaders.orientShaderF
        this.orientShaderRGBU = orientationShaders.orientShaderRGBU
        this.orientShaderPAQD = orientationShaders.orientShaderPAQD
        // Initialize 3D geometry shaders
        const geometryShaders = ShaderManager.init3DGeometryShaders(gl)
        this.surfaceShader = geometryShaders.surfaceShader
        this.fiberShader = geometryShaders.fiberShader
        this.pickingImageShader.use(gl)
        // Compile all mesh shaders
        ShaderManager.compileMeshShaders(gl, this.meshShaders)
        this.bmpShader = new Shader(gl, vertBmpShader, fragBmpShader)
        await this.initText()
        if (this.opts.thumbnail.length > 0) {
            await this.loadBmpTexture(this.opts.thumbnail)
            this.thumbnailVisible = true
        }
        this.updateGLVolume()
        this.initialized = true
        this.resizeListener()
        this.drawScene()
        return this
    }

    /**
     * Generates gradient texture from volume data using GPU shaders and framebuffers.
     * @internal
     */
    gradientGL(hdr: NiftiHeader): void {
        this.gradientTexture = VolumeRenderer.gradientGL({
            gl: this.gl,
            hdr,
            genericVAO: this.genericVAO,
            unusedVAO: this.unusedVAO,
            volumeTexture: this.volumeTexture,
            paqdTexture: this.paqdTexture,
            gradientTexture: this.gradientTexture,
            gradientOrder: this.opts.gradientOrder,
            blurShader: this.blurShader!,
            sobelBlurShader: this.sobelBlurShader!,
            sobelFirstOrderShader: this.sobelFirstOrderShader!,
            sobelSecondOrderShader: this.sobelSecondOrderShader!,
            rgbaTex: this.rgbaTex.bind(this)
        })
    }

    /**
     * Get the gradient texture produced by gradientGL as a TypedArray
     * @returns Float32Array containing the gradient texture data, or null if no gradient texture exists
     * @example
     * niivue = new Niivue()
     * niivue.loadVolumes([{url: './someImage.nii'}])
     * // ... after volume is loaded and gradient is computed
     * const gradientData = niivue.getGradientTextureData()
     * if (gradientData) {
     *   console.log('Gradient texture dimensions:', gradientData.length)
     * }
     * @see {@link https://niivue.com/demos/features/gradient.custom.html | live demo usage}
     */
    getGradientTextureData(): Float32Array | null {
        return VolumeRenderer.getGradientTextureData({
            gl: this.gl,
            gradientTexture: this.gradientTexture,
            dims: this.back?.dims ?? null
        })
    }

    /**
     * Set a custom gradient texture to use instead of the one produced by gradientGL
     * When a custom gradient texture is set, the useCustomGradientTexture flag is set to true
     * to prevent gradientGL from overwriting the custom texture during volume updates.
     * @param data - Float32Array or Uint8Array containing RGBA gradient data, or null to revert to auto-generated gradient
     * @param dims - Optional dimensions array [width, height, depth]. If not provided, uses current volume dimensions
     * @example
     * niivue = new Niivue()
     * niivue.loadVolumes([{url: './someImage.nii'}])
     * // Create custom gradient data
     * const customGradient = new Float32Array(256 * 256 * 256 * 4) // example dimensions
     * // ... fill customGradient with desired values
     * niivue.setCustomGradientTexture(customGradient, [256, 256, 256])
     *
     * // To revert to auto-generated gradient:
     * niivue.setCustomGradientTexture(null)
     * @see {@link https://niivue.com/demos/features/gradient.custom.html | live demo usage}
     */
    setCustomGradientTexture(data: Float32Array | Uint8Array | null, dims?: number[]): void {
        const result = VolumeRenderer.setCustomGradientTexture({
            gl: this.gl,
            data,
            dims,
            backDims: this.back?.dims ?? null,
            gradientTexture: this.gradientTexture,
            gradientTextureAmount: this.gradientTextureAmount,
            hdr: this.back?.hdr ?? null,
            gradientGLFn: this.gradientGL.bind(this)
        })

        this.gradientTexture = result.gradientTexture
        this.useCustomGradientTexture = result.useCustomGradientTexture

        // Redraw scene to apply changes if custom texture was set
        if (data !== null && result.useCustomGradientTexture) {
            this.drawScene()
        }
    }

    /**
     * update the webGL 2.0 scene after making changes to the array of volumes. It's always good to call this method after altering one or more volumes manually (outside of Niivue setter methods)
     * @example
     * niivue = new Niivue()
     * niivue.updateGLVolume()
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    updateGLVolume(): void {
        // load volume or change contrast
        let visibleLayers = 0
        const numLayers = this.volumes.length
        // loop through loading volumes in this.volume
        this.refreshColormaps()
        this.closePAQD()
        for (let i = 0; i < numLayers; i++) {
            // avoid trying to refresh a volume that isn't ready
            if (!this.volumes[i].toRAS) {
                continue
            }
            this.refreshLayers(this.volumes[i], visibleLayers)
            visibleLayers++
        }
        this.furthestVertexFromOrigin = 0.0
        if (numLayers > 0) {
            this.furthestVertexFromOrigin = this.volumeObject3D?.furthestVertexFromOrigin ?? 0
            // this.furthestVertexFromOrigin = this.volumeObject3D!.furthestVertexFromOrigin!
        }
        if (this.meshes) {
            for (let i = 0; i < this.meshes.length; i++) {
                this.furthestVertexFromOrigin = Math.max(this.furthestVertexFromOrigin, this.meshes[i].furthestVertexFromOrigin)
            }
        }

        if (this.onVolumeUpdated) {
            this.onVolumeUpdated()
        }
        this.drawScene()
    }

    /**
     * basic statistics for selected voxel-based image
     * @param options - an object containing the following properties:
     *   - layer: selects image to describe
     *   - masks: optional binary images to filter voxels
     *   - drawingIsMask: a boolean indicating if the drawing is used as a mask
     *   - roiIsMask: a boolean indicating if the ROI is used as a mask
     *   - startVox: the starting voxel coordinates
     *   - endVox: the ending voxel coordinates
     * @returns numeric values to describe image or regions of images
     * @example
     * niivue.getDescriptives({
     *   layer: 0,
     *   masks: [],
     *   drawingIsMask: true, // drawingIsMask and roiIsMask are mutually exclusive
     *   roiIsMask: false,
     *   startVox: [10, 20, 30], // ignored if roiIsMask is false
     *   endVox: [40, 50, 60] // ignored if roiIsMask is false
     * });
     * @see {@link https://niivue.com/demos/features/draw2.html | live demo usage}
     */
    getDescriptives(options: { layer?: number; masks?: number[]; drawingIsMask?: boolean; roiIsMask?: boolean; startVox?: number[]; endVox?: number[] }): Descriptive {
        const { layer = 0, masks = [], drawingIsMask = false, roiIsMask = false, startVox = [0, 0, 0], endVox = [0, 0, 0] } = options

        const hdr = this.volumes[layer].hdr!
        const pixDimsRAS = this.volumes[layer].pixDimsRAS!
        const slope = isNaN(hdr.scl_slope) ? 1 : hdr.scl_slope
        const inter = isNaN(hdr.scl_inter) ? 1 : hdr.scl_inter
        const imgRaw = this.volumes[layer].img!
        const nv = imgRaw.length

        // Scale image data
        const img = scaleImageData(imgRaw, slope, inter)

        // Collect mask images from volume indices
        const maskImages = masks
            .filter((m) => {
                const valid = this.volumes[m].img!.length === nv
                if (!valid) {
                    log.debug('Mask resolution does not match image. Skipping masking layer ' + m)
                }
                return valid
            })
            .map((m) => this.volumes[m].img!)

        // Create mask based on options
        const { mask, area } = createMask({
            nv,
            maskImages: maskImages.length > 0 ? maskImages : undefined,
            drawBitmap: this.drawBitmap,
            drawingIsMask: masks.length < 1 && drawingIsMask,
            roiIsMask: masks.length < 1 && roiIsMask,
            startVox,
            endVox,
            hdr,
            pixDimsRAS
        })

        // Compute descriptive statistics
        const stats = computeDescriptiveStats(img, mask)

        return {
            ...stats,
            volumeMM3: stats.nvox * hdr.pixDims[1] * hdr.pixDims[2] * hdr.pixDims[3],
            volumeML: stats.nvox * hdr.pixDims[1] * hdr.pixDims[2] * hdr.pixDims[3] * 0.001,
            cal_min: this.volumes[layer].cal_min!,
            cal_max: this.volumes[layer].cal_max!,
            robust_min: this.volumes[layer].robust_min!,
            robust_max: this.volumes[layer].robust_max!,
            area
        }
    }

    /**
     * Updates textures, shaders, and GPU state for a given overlay layer based on image properties and rendering options.
     * @internal
     */
    refreshLayers(overlayItem: NVImage, layer: number): void {
        if (this.volumes.length < 1) {
            return
        } // e.g. only meshes
        this.refreshColormaps()
        const hdr = overlayItem.hdr
        const img = VolumeTexture.prepareLayerData(overlayItem)
        const opacity = overlayItem.opacity
        if (layer > 1 && opacity === 0) {
            return
        } // skip completely transparent layers
        let outTexture = null

        if (!this.back) {
            throw new Error('back undefined')
        }

        this.gl.bindVertexArray(this.unusedVAO)
        if (this.crosshairs3D) {
            this.crosshairs3D.mm![0] = NaN
        } // force crosshairs3D redraw
        let mtx = mat4.clone(overlayItem.toRAS!)
        if (layer === 0) {
            // Create and assign volumeObject3D FIRST
            this.volumeObject3D = VolumeLayerRenderer.setupVolumeObject3D({
                overlayItem,
                VOLUME_ID: this.VOLUME_ID,
                gl: this.gl
            })

            mat4.invert(mtx, mtx)

            // Set back properties (required by sliceScale())
            this.back.matRAS = overlayItem.matRAS
            this.back.dims = overlayItem.dimsRAS
            this.back.pixDims = overlayItem.pixDimsRAS

            // Now call sliceScale() (depends on this.volumeObject3D and this.back being set)
            const { volScale, vox } = this.sliceScale(true)

            this.volScale = volScale
            this.vox = vox
            this.volumeObject3D.scale = Array.from(volScale)

            const { isAboveMax2D, isAboveMax3D } = VolumeTexture.checkImageSizeLimits({
                hdr,
                max2D: this.uiData.max2D,
                max3D: this.uiData.max3D
            })
            if (isAboveMax2D) {
                log.error(`Image dimensions exceed maximum texture size of hardware.`)
            }
            // Use 2D texture for any single-slice RGBA image (histology, etc.)
            if (hdr.datatypeCode === NiiDataType.DT_RGBA32 && hdr.dims[3] < 2) {
                log.info(`RGBA 2D image (${hdr.dims[1]}×${hdr.dims[2]}) using Texture2D`)
                this.opts.is2DSliceShader = true
                this.volumeTexture = this.rgbaTex2D(this.volumeTexture, TEXTURE_CONSTANTS.TEXTURE0_BACK_VOL, overlayItem.dimsRAS!, img as Uint8Array, false)
                return
            }
            if (isAboveMax3D) {
                log.info(`Large scalar image (>${this.uiData.max3D}) requires Texture2D (${hdr.dims[1]}×${hdr.dims[2]}×${hdr.dims[3]})`)
                const nPix = hdr.dims[1] * hdr.dims[2]
                const vox = this.frac2vox(this.scene.crosshairPos)
                const z = Math.min(Math.max(vox[2], 0), hdr.dims[3] - 1)
                const zOffset = z * nPix
                const img2D = new Uint8Array(nPix * 4)
                const img2D_U32 = new Uint32Array(img2D.buffer)
                const opacity = Math.floor(overlayItem.opacity * 255)
                const scale = (255 * hdr.scl_slope) / (overlayItem.cal_max - overlayItem.cal_min)
                const intercept = (255 * (hdr.scl_inter - overlayItem.cal_min)) / (overlayItem.cal_max - overlayItem.cal_min)
                const cmap = new Uint8Array(this.colormap(overlayItem.colormap))
                const cmap_U32 = new Uint32Array(cmap.buffer)
                let j = -1
                for (let i = 0; i < nPix; i++) {
                    const v = img[i + zOffset] * scale + intercept
                    const v255 = Math.round(Math.min(255, Math.max(0, v))) // Clamp to 0..255
                    img2D_U32[i] = cmap_U32[v255]
                    img2D[(j += 4)] = opacity
                }
                this.opts.is2DSliceShader = true
                outTexture = this.rgbaTex2D(this.volumeTexture, TEXTURE_CONSTANTS.TEXTURE0_BACK_VOL, overlayItem.dimsRAS!, img2D as Uint8Array, false)
                return
            }
            if (isAboveMax3D) {
                log.warn(`dimensions exceed 3D limits ${hdr.dims}`)
            }
            this.opts.is2DSliceShader = false
            outTexture = this.rgbaTex(this.volumeTexture, TEXTURE_CONSTANTS.TEXTURE0_BACK_VOL, overlayItem.dimsRAS!) // this.back.dims)

            if (!this.renderShader) {
                throw new Error('renderShader undefined')
            }

            this.renderShader.use(this.gl)
            this.gl.uniform3fv(this.renderShader.uniforms.texVox, this.vox)
            this.gl.uniform3fv(this.renderShader.uniforms.volScale, this.volScale)
            // add shader to object
            const pickingShader = this.pickingImageShader!
            pickingShader.use(this.gl)
            this.gl.uniform1i(pickingShader.uniforms.volume, 0)
            this.gl.uniform1i(pickingShader.uniforms.colormap, 1)
            this.gl.uniform1i(pickingShader.uniforms.overlay, 2)
            this.gl.uniform3fv(pickingShader.uniforms.volScale, this.volScale)
            log.debug(this.volumeObject3D)
        } else {
            if (this.back?.dims === undefined) {
                log.error('Fatal error: Unable to render overlay: background dimensions not defined!')
            }

            // Calculate overlay transformation matrix
            mtx = VolumeLayerRenderer.calculateOverlayTransformMatrix({
                overlayItem,
                mm2frac: this.mm2frac.bind(this)
            })

            // Allocate textures for overlay layers
            if (layer === 1) {
                const textures = VolumeLayerRenderer.allocateVolumeTextures({
                    gl: this.gl,
                    layer,
                    backDims: this.back!.dims!,
                    rgbaTex: this.rgbaTex.bind(this)
                })
                outTexture = textures.overlayTexture!
                this.overlayTexture = outTexture
                this.overlayTextureID = outTexture
            } else {
                outTexture = this.overlayTextureID
            }
        }
        // Setup framebuffer for rendering
        const fb = VolumeLayerRenderer.setupFramebuffer(this.gl)
        this.gl.viewport(0, 0, this.back.dims![1], this.back.dims![2]) // output in background dimensions

        // Create temporary 3D texture for volume data
        const tempTex3D = VolumeLayerRenderer.createTemporaryTexture({
            gl: this.gl,
            TEXTURE9_ORIENT: TEXTURE_CONSTANTS.TEXTURE9_ORIENT
        })

        if (!hdr) {
            throw new Error('hdr undefined')
        }
        if (!img) {
            throw new Error('img undefined')
        }

        // Setup volume texture data and select appropriate shader
        let orientShader = this.orientShaderU!
        if (hdr.datatypeCode === NiiDataType.DT_RGBA32) {
            // RGBA32 has special PAQD handling
            const rgba32Result = VolumeLayerRenderer.setupRGBA32TextureData({
                gl: this.gl,
                hdr,
                img,
                overlayItem,
                layer,
                orientShaderRGBU: this.orientShaderRGBU!,
                orientShaderPAQD: this.orientShaderPAQD!,
                volumes: this.volumes,
                backDims: this.back!.dims!,
                rgbaTex: this.rgbaTex.bind(this),
                paqdTexture: this.paqdTexture,
                TEXTURE8_PAQD: TEXTURE_CONSTANTS.TEXTURE8_PAQD,
                TEXTURE9_ORIENT: TEXTURE_CONSTANTS.TEXTURE9_ORIENT
            })
            orientShader = rgba32Result.orientShader
            if (rgba32Result.outTexture !== null) {
                outTexture = rgba32Result.outTexture
            }
            if (rgba32Result.paqdTexture !== null) {
                this.paqdTexture = rgba32Result.paqdTexture
            }
        } else {
            // All other datatypes
            const uploadResult = VolumeLayerRenderer.setupVolumeTextureData({
                gl: this.gl,
                hdr,
                img,
                orientShaderU: this.orientShaderU!,
                orientShaderI: this.orientShaderI!,
                orientShaderF: this.orientShaderF!,
                orientShaderRGBU: this.orientShaderRGBU!,
                orientShaderAtlasU: this.orientShaderAtlasU!,
                orientShaderAtlasI: this.orientShaderAtlasI!
            })
            orientShader = uploadResult.orientShader
        }
        if (overlayItem.global_min === undefined) {
            // only once, first time volume is loaded
            // this.calMinMax(overlayItem, imgRaw);
            overlayItem.calMinMax()
        }
        // Setup blend texture for multi-layer rendering
        this.gl.bindVertexArray(this.genericVAO)

        const blendTexture = VolumeLayerRenderer.setupBlendTexture({
            gl: this.gl,
            layer,
            backDims: this.back.dims!,
            rgbaTex: this.rgbaTex.bind(this),
            passThroughShader: this.passThroughShader!
        })
        orientShader!.use(this.gl)
        this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE1_COLORMAPS)
        // for label maps, we create an indexed colormap that is not limited to a gradient of 256 colors
        const { colormapLabelTexture } = VolumeColormap.setupColormapLabel({
            gl: this.gl,
            overlayItem,
            orientShader,
            createColormapTexture: this.createColormapTexture.bind(this)
        })
        if (colormapLabelTexture === null) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture)
            this.gl.uniform1f(orientShader.uniforms.cal_min, overlayItem.cal_min!)
            this.gl.uniform1f(orientShader.uniforms.cal_max, overlayItem.cal_max!)
        }
        // Handle deprecated alphaThreshold property
        if ('alphaThreshold' in overlayItem) {
            log.warn('alphaThreshold is deprecated: use colormapType')
            if (overlayItem.alphaThreshold === true) {
                overlayItem.colormapType = COLORMAP_TYPE.ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN
            }
            if (overlayItem.alphaThreshold === false) {
                overlayItem.colormapType = COLORMAP_TYPE.ZERO_TO_MAX_TRANSPARENT_BELOW_MIN
            }
            delete overlayItem.alphaThreshold
        }

        // Configure colormap uniforms
        if (!orientShader) {
            throw new Error('orientShader undefined')
        }
        VolumeLayerRenderer.configureColormapUniforms({
            gl: this.gl,
            overlayItem,
            orientShader,
            layer,
            isAdditiveBlend: this.opts.isAdditiveBlend
        })
        // Setup modulation
        const { modulateTexture } = VolumeModulation.setupModulation({
            gl: this.gl,
            overlayItem,
            hdr,
            volumes: this.volumes,
            orientShader,
            r8Tex: this.r8Tex.bind(this),
            TEXTURE7: this.gl.TEXTURE7
        })

        // Bind temporary 3D texture
        this.gl.bindTexture(this.gl.TEXTURE_3D, tempTex3D)

        // Render to output texture
        if (!this.back.dims) {
            throw new Error('back.dims undefined')
        }
        VolumeLayerRenderer.renderToOutputTexture({
            gl: this.gl,
            orientShader,
            backDims: this.back.dims,
            outTexture,
            mtx,
            hdr,
            intensityVolTextureUnit: 9,
            blendTextureUnit: 10,
            colormapTextureUnit: 1,
            modulationTextureUnit: 7,
            opacity,
            atlasOutline: this.opts.atlasOutline,
            atlasActiveIndex: this.opts.atlasActiveIndex
        })
        log.debug('back dims: ', this.back.dims)
        this.gl.bindVertexArray(this.unusedVAO)
        this.gl.deleteTexture(tempTex3D)
        this.gl.deleteTexture(modulateTexture)
        this.gl.deleteTexture(blendTexture)
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)

        this.gl.deleteFramebuffer(fb)

        // Update gradient texture for layer 0
        if (layer === 0) {
            this.volumeTexture = outTexture
            this.gradientTexture = VolumeRenderer.gradientGL({
                gl: this.gl,
                hdr,
                genericVAO: this.genericVAO,
                unusedVAO: this.unusedVAO,
                volumeTexture: this.volumeTexture,
                paqdTexture: this.paqdTexture,
                gradientTexture: this.gradientTexture,
                gradientOrder: this.opts.gradientOrder,
                blurShader: this.blurShader!,
                sobelBlurShader: this.sobelBlurShader!,
                sobelFirstOrderShader: this.sobelFirstOrderShader!,
                sobelSecondOrderShader: this.sobelSecondOrderShader!,
                rgbaTex: this.rgbaTex.bind(this)
            })
        }
        // Update shader uniforms after texture operations
        if (!this.renderShader) {
            throw new Error('renderShader undefined')
        }
        if (!this.pickingImageShader) {
            throw new Error('pickingImageShader undefined')
        }

        const slicescl = this.sliceScale(true) // slice scale determined by this.back --> the base image layer
        const vox = slicescl.vox
        const volScale = slicescl.volScale

        // Select appropriate slice shader
        const shader = VolumeLayerRenderer.selectSliceShader({
            is2DSliceShader: this.opts.is2DSliceShader,
            isV1SliceShader: this.opts.isV1SliceShader,
            sliceMMShader: this.sliceMMShader,
            slice2DShader: this.slice2DShader,
            sliceV1Shader: this.sliceV1Shader,
            customSliceShader: this.customSliceShader
        })

        VolumeLayerRenderer.updateShaderUniforms({
            gl: this.gl,
            renderShader: this.renderShader,
            pickingImageShader: this.pickingImageShader,
            sliceShader: shader,
            overlaysLength: this.overlays.length,
            clipPlaneColor: this.opts.clipPlaneColor,
            backOpacity: this.volumes[0].opacity,
            renderOverlayBlend: this.opts.renderOverlayBlend,
            clipPlane: this.scene.clipPlane,
            texVox: vox,
            volScale,
            drawOpacity: this.drawOpacity,
            paqdUniforms: this.opts.paqdUniforms
        })

        // Cleanup label colormap texture if used
        if (colormapLabelTexture !== null) {
            this.gl.deleteTexture(colormapLabelTexture)
            this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE1_COLORMAPS)
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture)
        }

        // Bind drawing and PAQD textures for slice shader
        VolumeLayerRenderer.bindSliceShaderTextures({
            gl: this.gl,
            shader,
            is2DSliceShader: this.opts.is2DSliceShader,
            drawTexture: this.drawTexture,
            paqdTexture: this.paqdTexture,
            TEXTURE7_DRAW: TEXTURE_CONSTANTS.TEXTURE7_DRAW,
            TEXTURE8_PAQD: TEXTURE_CONSTANTS.TEXTURE8_PAQD
        })

        this.updateInterpolation(layer)

        //
        // this.createEmptyDrawing(); //DO NOT DO THIS ON EVERY CALL TO REFRESH LAYERS!!!!
        // this.createRandomDrawing(); //DO NOT DO THIS ON EVERY CALL TO REFRESH LAYERS!!!!
    }

    /**
     * query all available color maps that can be applied to volumes
     * @returns an array of colormap strings
     * @example
     * niivue = new Niivue()
     * colormaps = niivue.colormaps()
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    colormaps(): string[] {
        return cmapper.colormaps()
    }

    /**
     * create a new colormap
     * @param key - name of new colormap
     * @param cmap - colormap properties (Red, Green, Blue, Alpha and Indices)
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    addColormap(key: string, cmap: ColorMap): void {
        cmapper.addColormap(key, cmap)
    }

    /**
     * update the colormap of an image given its ID
     * @param id - the ID of the NVImage
     * @param colormap - the name of the colormap to use
     * @example
     * niivue.setColormap(niivue.volumes[0].id,, 'red')
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    setColormap(id: string, colormap: string): void {
        const idx = this.getVolumeIndexByID(id)
        this.volumes[idx].colormap = colormap
        this.updateGLVolume()
    }

    // port of https://github.com/rordenlab/niimath/blob/master/src/bwlabel.c

    /**
     * Computes the linear voxel index from 3D coordinates using image dimensions.
     * @internal
     */
    idx(A: number, B: number, C: number, DIM: Uint32Array): number {
        return ImageProcessing.idx(A, B, C, DIM)
    }

    /**
     * Checks if voxels below the given voxel have labels matching its value, returning the first matching label or 0.
     * @internal
     */
    check_previous_slice(bw: Uint32Array, il: Uint32Array, r: number, c: number, sl: number, dim: Uint32Array, conn: number, tt: Uint32Array): number {
        return ImageProcessing.checkPreviousSlice(bw, il, r, c, sl, dim, conn, tt)
    }

    /**
     * Performs provisional labeling of connected voxels in a volume using specified connectivity.
     * @internal
     */
    do_initial_labelling(bw: Uint32Array, dim: Uint32Array, conn: number): [number, Uint32Array, Uint32Array] {
        const result = ImageProcessing.doInitialLabeling(bw, dim, conn)
        return [result.labelCount, result.translationTable, result.initialLabels]
    }

    /**
     * Merges multiple provisional labels into a unified class using a translation table.
     * @internal
     */
    fill_tratab(tt: Uint32Array, nabo: Uint32Array, nr_set: number): void {
        ImageProcessing.fillTranslationTable(tt, nabo, nr_set)
    }

    /**
     * Removes gaps in label indices to produce a dense labeling.
     * @internal
     */
    translate_labels(il: Uint32Array, dim: Uint32Array, tt: Uint32Array, ttn: number): [number, Uint32Array] {
        const result = ImageProcessing.translateLabels(il, dim, tt, ttn)
        return [result.clusterCount, result.labels]
    }

    /**
     * Retains only the largest cluster for each region in a labeled volume.
     * @internal
     */
    largest_original_cluster_labels(bw: Uint32Array, cl: number, ls: Uint32Array): [number, Uint32Array] {
        const result = ImageProcessing.largestOriginalClusterLabels(bw, cl, ls)
        return [result.maxValue, result.voxels]
    }

    /**
     * Computes connected components labeling on a 3D image.
     * @internal
     */
    bwlabel(img: Uint32Array, dim: Uint32Array, conn: number = 26, binarize: boolean = false, onlyLargestClusterPerClass: boolean = false): [number, Uint32Array] {
        const result = ImageProcessing.bwlabel({
            img,
            dim,
            conn,
            binarize,
            onlyLargestClusterPerClass
        })
        return [result.clusterCount, result.labels]
    }

    /**
     * Create a connected component label map from a volume
     * @param id - ID of the input volume
     * @param conn - connectivity for clustering (6 = faces, 18 = faces + edges, 26 = faces + edges + corners)
     * @param binarize - whether to binarize the volume before labeling
     * @param onlyLargestClusterPerClass - retain only the largest cluster for each label
     * @returns a new NVImage with labeled clusters, using random colormap
     * @see {@link https://niivue.com/demos/features/clusterize.html | live demo usage}
     */
    async createConnectedLabelImage(id: string, conn: number = 26, binarize: boolean = false, onlyLargestClusterPerClass: boolean = false): Promise<NVImage> {
        const idx = this.getVolumeIndexByID(id)
        const dim = Uint32Array.from(this.volumes[idx].dims?.slice(1, 4) ?? [])
        const img = Uint32Array.from(this.volumes[idx].img?.slice() ?? [])
        const [mx, clusterImg] = this.bwlabel(img, dim!, conn, binarize, onlyLargestClusterPerClass)
        const nii = this.volumes[idx].clone()
        nii.opacity = 0.5
        nii.colormap = 'random'
        for (let i = 0; i < nii.img!.length; i++) {
            nii.img![i] = clusterImg[i]!
        }
        nii.cal_min = 0
        nii.cal_max = mx
        return nii
    }

    // conform.py functions follow
    // https://github.com/Deep-MI/FastSurfer/blob/4e76bed7b11fd7e6403ddac729059ad3842b56de/FastSurferCNN/data_loader/conform.py
    // Licensed under the Apache License, Version 2.0 (the "License")

    /**
     * Create a binary NIfTI file as a Uint8Array, including header and image data
     * @param dims - image dimensions [x, y, z]
     * @param pixDims - voxel dimensions in mm [x, y, z]
     * @param affine - 4×4 affine transformation matrix in row-major order
     * @param datatypeCode - NIfTI datatype code (e.g., DT_UINT8, DT_FLOAT32)
     * @param img - image data buffer (optional)
     * @returns a Uint8Array representing a complete NIfTI file
     * @see {@link https://niivue.com/demos/features/conform.html | live demo usage}
     */
    async createNiftiArray(
        dims = [256, 256, 256],
        pixDims = [1, 1, 1],
        affine = [1, 0, 0, -128, 0, 1, 0, -128, 0, 0, 1, -128, 0, 0, 0, 1],
        datatypeCode = NiiDataType.DT_UINT8,
        img = new Uint8Array()
    ): Promise<Uint8Array> {
        return await NVImage.createNiftiArray(dims, pixDims, affine, datatypeCode, img)
    }

    /**
     * Convert a binary NIfTI file (as a Uint8Array) to an NVImage object
     * @param bytes - binary contents of a NIfTI file
     * @returns a Promise resolving to an NVImage object
     * @see {@link https://niivue.com/demos/features/conform.html | live demo usage}
     */ async niftiArray2NVImage(bytes = new Uint8Array()): Promise<NVImage> {
        return await NVImage.loadFromUrl({ url: bytes })
    }

    /**
     * Load a NIfTI image from a URL and convert it to an NVImage object
     * @param fnm - URL of the NIfTI file to load
     * @returns a Promise resolving to an NVImage (not yet added to GPU or scene)
     * @see {@link https://niivue.com/demos/features/conform.html | live demo usage}
     */
    async loadFromUrl(fnm: string): Promise<NVImage> {
        return await NVImage.loadFromUrl({ url: fnm })
    }

    // Translation of FastSurfer conform.py (Apache License)
    // Reslice an image to an isotropic 1mm with dimensions of 1x1x1mm
    // The original volume is translated to be in the center of the new volume
    // Interpolation is linear (default) or nearest neighbor
    // asFloat32 determines if output is Float32 with range 0..255 or Uint8 with range 0..255

    /**
     * FreeSurfer-style conform reslices any image to a 256x256x256 volume with 1mm voxels
     * @param volume - input volume to be re-oriented, intensity-scaled and resliced
     * @param toRAS - reslice to row, column slices to right-anterior-superior not left-inferior-anterior (default false).
     * @param isLinear - reslice with linear rather than nearest-neighbor interpolation (default true).
     * @param asFloat32 - use Float32 datatype rather than Uint8 (default false).
     * @param isRobustMinMax - clamp intensity with robust min max (~2%..98%) instead of FreeSurfer (0%..99.99%) (default false).
     * @see {@link https://niivue.com/demos/features/torso.html | live demo usage}
     */
    async conform(volume: NVImage, toRAS = false, isLinear = true, asFloat32 = false, isRobustMinMax = false): Promise<NVImage> {
        const outDim = 256
        const outMM = 1

        // Compute voxel-to-voxel transform
        const { outAffine, invVox2vox } = ImageProcessing.conformVox2Vox({
            inDims: volume.hdr!.dims!,
            inAffine: volume.hdr!.affine.flat(),
            outDim,
            outMM,
            toRAS
        })

        // Prepare input image with slope/intercept scaling
        const inImg = new Float32Array(volume.img!)
        const inNvox = volume.hdr!.dims![1] * volume.hdr!.dims![2] * volume.hdr!.dims![3]
        if (volume.hdr!.scl_slope !== 1.0 || volume.hdr!.scl_inter !== 0.0) {
            for (let i = 0; i < inNvox; i++) {
                inImg[i] = inImg[i] * volume.hdr!.scl_slope + volume.hdr!.scl_inter
            }
        }

        // Resample volume
        const outImg = ImageProcessing.resampleVolume({
            inImg,
            inDims: volume.hdr!.dims!,
            outDim,
            invVox2vox,
            isLinear
        })

        // Compute intensity scale factors
        const f_low = isRobustMinMax ? NaN : 0
        const scaleParams: ImageProcessing.GetScaleParams = {
            img: volume.img!,
            dims: volume.hdr!.dims!,
            global_min: volume.global_min!,
            global_max: volume.global_max!,
            datatypeCode: volume.hdr!.datatypeCode,
            scl_slope: volume.hdr!.scl_slope,
            scl_inter: volume.hdr!.scl_inter,
            cal_min: volume.cal_min,
            cal_max: volume.cal_max,
            f_low
        }

        // Scale and create output NIfTI
        let bytes: Uint8Array
        if (asFloat32) {
            scaleParams.dst_min = 0
            scaleParams.dst_max = 1
            const [srcMin, scale] = ImageProcessing.getScale(scaleParams)
            const outImg32 = ImageProcessing.scalecropFloat32(outImg, 0, 1, srcMin, scale)
            bytes = await this.createNiftiArray([outDim, outDim, outDim], [outMM, outMM, outMM], Array.from(outAffine), NiiDataType.DT_FLOAT32, new Uint8Array(outImg32.buffer))
        } else {
            scaleParams.dst_min = 0
            scaleParams.dst_max = 255
            const [srcMin, scale] = ImageProcessing.getScale(scaleParams)
            const outImg8 = ImageProcessing.scalecropUint8(outImg, 0, 255, srcMin, scale)
            bytes = await this.createNiftiArray([outDim, outDim, outDim], [outMM, outMM, outMM], Array.from(outAffine), NiiDataType.DT_UINT8, outImg8)
        }

        return this.niftiArray2NVImage(bytes)
    }

    /**
     * darken crevices and brighten corners when 3D rendering drawings.
     * @param ao - amount of ambient occlusion (default 0.4)
     * @see {@link https://niivue.com/demos/features/torso.html | live demo usage}
     */
    setRenderDrawAmbientOcclusion(ao: number): void {
        if (!this.renderShader) {
            throw new Error('renderShader undefined')
        }

        this.renderDrawAmbientOcclusion = ao
        this.renderShader.use(this.gl)
        this.gl.uniform1fv(this.renderShader.uniforms.renderDrawAmbientOcclusion, [this.renderDrawAmbientOcclusion, 1.0])
        this.drawScene()
    }

    /**
     * @deprecated Use {@link setColormap} instead. This alias is retained for compatibility with NiiVue < 0.35.
     * @param id - ID of the volume
     * @param colormap - name of the colormap to apply
     */
    setColorMap(id: string, colormap: string): void {
        this.setColormap(id, colormap)
    }

    /**
     * use given color map for negative voxels in image
     * @param id - the ID of the NVImage
     * @param colormapNegative - the name of the colormap to use
     * @example
     * niivue = new Niivue()
     * niivue.setColormapNegative(niivue.volumes[1].id,"winter");
     * @see {@link https://niivue.com/demos/features/mosaics2.html | live demo usage}
     */
    setColormapNegative(id: string, colormapNegative: string): void {
        const idx = this.getVolumeIndexByID(id)
        this.volumes[idx].colormapNegative = colormapNegative
        this.updateGLVolume()
    }

    /**
     * modulate intensity of one image based on intensity of another
     * @param idTarget - the ID of the NVImage to be biased
     * @param idModulation - the ID of the NVImage that controls bias (empty string to disable modulation)
     * @param modulateAlpha - does the modulation influence alpha transparency (values greater than 1).
     * @example niivue.setModulationImage(niivue.volumes[0].id, niivue.volumes[1].id);
     * @see {@link https://niivue.com/demos/features/modulate.html | live demo scalar usage}
     * @see {@link https://niivue.com/demos/features/modulateAfni.html | live demo usage}
     */
    setModulationImage(idTarget: string, idModulation: string, modulateAlpha = 0): void {
        // to set:
        // nv1.setModulationImage(nv1.volumes[0].id, nv1.volumes[1].id);
        // to clear:
        // nv1.setModulationImage(nv1.volumes[0].id, '');
        const idxTarget = this.getVolumeIndexByID(idTarget)
        // idxModulation can be null or the index of the modulation image
        let idxModulation: number | null = null
        if (idModulation.length > 0) {
            idxModulation = this.getVolumeIndexByID(idModulation)
        }
        this.volumes[idxTarget].modulationImage = idxModulation
        this.volumes[idxTarget].modulateAlpha = modulateAlpha
        this.updateGLVolume()
    }

    /**
     * adjust screen gamma. Low values emphasize shadows but can appear flat, high gamma hides shadow details.
     * @param gamma - selects luminance, default is 1
     * @example niivue.setGamma(1.0);
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    setGamma(gamma = 1.0): void {
        this.scene.gamma = gamma
        cmapper.gamma = gamma
        this.updateGLVolume()
    }

    /** Load all volumes for image opened with `limitFrames4D`, the user can also click the `...` on a 4D timeline to load deferred volumes
     * @param id - the ID of the 4D NVImage
     **/
    async loadDeferred4DVolumes(id: string): Promise<void> {
        const idx = this.getVolumeIndexByID(id)
        const volume = this.volumes[idx]
        if (volume.nTotalFrame4D! <= volume.nFrame4D!) {
            return
        }
        volume.nTotalFrame4D = volume.nFrame4D
        // only load image data: do not change other settings like contrast
        // check if volume has the property fileObject
        let v
        if (volume.fileObject) {
            // if it does, load the image data from the fileObject
            v = await NVImage.loadFromFile({ file: volume.fileObject })
        } else {
            v = await NVImage.loadFromUrl({ url: volume.url })
        }
        // if v is not undefined, then we have successfully loaded the image data
        if (v) {
            volume.img = v.img!.slice()
            volume.nTotalFrame4D = v.nTotalFrame4D
            volume.nFrame4D = v.nFrame4D
            this.updateGLVolume()
        }
    }

    /**
     * show desired 3D volume from 4D time series
     * @param id - the ID of the 4D NVImage
     * @param frame4D - frame to display (indexed from zero)
     * @example nv1.setFrame4D(nv1.volumes[0].id, 42);
     * @see {@link https://niivue.com/demos/features/timeseries.html | live demo usage}
     */
    setFrame4D(id: string, frame4D: number): void {
        const idx = this.getVolumeIndexByID(id)
        if (idx < 0) {
            return
        }

        const oldFrame = this.volumes[idx].frame4D
        VolumeManager.setFrame4D(this.volumes, id, frame4D)

        // Check if frame actually changed
        if (this.volumes[idx].frame4D !== oldFrame) {
            this.updateGLVolume()
            this.onFrameChange(this.volumes[idx], this.volumes[idx].frame4D!)
            this.createOnLocationChange()
        }
    }

    /**
     * determine active 3D volume from 4D time series
     * @param id - the ID of the 4D NVImage
     * @returns currently selected volume (indexed from 0)
     * @example nv1.getFrame4D(nv1.volumes[0].id);
     * @see {@link https://niivue.com/demos/features/timeseries.html | live demo usage}
     */
    getFrame4D(id: string): number {
        return VolumeManager.getFrame4D(this.volumes, id)
    }

    /**
     * Returns a colormap by its name key.
     * @internal
     */
    colormapFromKey(name: string): ColorMap {
        return cmapper.colormapFromKey(name)
    }

    /**
     * Retrieve a colormap with optional inversion
     * @param lutName - name of the lookup table (LUT) colormap
     * @param isInvert - whether to invert the colormap
     * @returns the RGBA colormap as a Uint8ClampedArray
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    colormap(lutName = '', isInvert = false): Uint8ClampedArray {
        return cmapper.colormap(lutName, isInvert)
    }

    /**
     * Creates or recreates a 2D RGBA colormap texture with specified rows and columns.
     * @internal
     */
    createColormapTexture(texture: WebGLTexture | null = null, nRow = 0, nCol = 256): WebGLTexture | null {
        if (texture !== null) {
            this.gl.deleteTexture(texture)
        }
        if (nRow < 1 || nCol < 1) {
            return null
        }
        texture = this.gl.createTexture()
        this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE1_COLORMAPS)
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
        this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.RGBA8, nCol, nRow)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
        // this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        // this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1)
        return texture
    }

    /**
     * Adds a colormap configuration to the internal list with given parameters.
     * @internal
     */
    addColormapList(nm = '', mn = NaN, mx = NaN, alpha = false, neg = false, vis = true, inv = false): void {
        // if (nm.length < 1) return;
        // issue583 unused colormap: e.g. a volume without a negative colormap
        if (nm.length < 1) {
            vis = false
        }
        this.colormapLists.push({
            name: nm,
            min: mn,
            max: mx,
            isColorbarFromZero: alpha,
            negative: neg,
            visible: vis,
            invert: inv
        })
    }

    /**
     * Rebuild and upload all colormap textures for volumes and meshes
     * @returns the current NiiVue instance, or undefined if no colormaps are used
     * @see {@link https://niivue.com/demos/features/mesh.stats.html | live demo usage}
     */
    refreshColormaps(): this | undefined {
        this.colormapLists = [] // one entry per colorbar: min, max, tic
        if (this.volumes.length < 1 && this.meshes.length < 1) {
            return
        }
        const nVol = this.volumes.length
        if (nVol > 0) {
            // add colorbars for volumes
            for (let i = 0; i < nVol; i++) {
                const volume = this.volumes[i]
                const neg = negMinMax(volume.cal_min!, volume.cal_max!, volume.cal_minNeg, volume.cal_maxNeg)
                const isColorbarFromZero = volume.colormapType !== COLORMAP_TYPE.MIN_TO_MAX
                // add negative colormaps BEFORE positive ones: we draw them in order from left to right
                this.addColormapList(volume.colormapNegative, neg[0], neg[1], isColorbarFromZero, true, volume.colorbarVisible, volume.colormapInvert)
                this.addColormapList(volume.colormap, volume.cal_min, volume.cal_max, isColorbarFromZero, false, volume.colorbarVisible, volume.colormapInvert)
            }
        }
        const nmesh = this.meshes.length
        if (nmesh > 0) {
            // add colorbars for volumes
            for (let i = 0; i < nmesh; i++) {
                const mesh = this.meshes[i]
                if (!mesh.colorbarVisible) {
                    continue
                }
                const nlayers = mesh.layers.length
                const fiberColor = mesh.fiberColor.toLowerCase()
                if (mesh.offsetPt0 && fiberColor.startsWith('dp')) {
                    let dp = null
                    const n = parseInt(fiberColor.substring(3))
                    if (fiberColor.startsWith('dpg') && !mesh.fiberGroupColormap) {
                        dp = n < mesh.dpg.length ? mesh.dpg[n] : mesh.dpg[0]
                    }
                    if (fiberColor.startsWith('dps')) {
                        dp = n < mesh.dps.length ? mesh.dps[n] : mesh.dps[0]
                    }
                    if (fiberColor.startsWith('dpv')) {
                        dp = n < mesh.dpv.length ? mesh.dpv[n] : mesh.dpv[0]
                    }
                    if (dp && typeof mesh.colormap === 'string') {
                        this.addColormapList(mesh.colormap, dp.cal_min, dp.cal_max, false, false, true, mesh.colormapInvert)
                    }
                }
                if ('edgeColormap' in mesh && 'edges' in mesh && mesh.edges !== undefined) {
                    const neg = negMinMax(mesh.edgeMin!, mesh.edgeMax!, NaN, NaN)
                    this.addColormapList(mesh.edgeColormapNegative, neg[0], neg[1], false, true, true, mesh.colormapInvert)
                    //  alpha = false,
                    this.addColormapList(mesh.edgeColormap, mesh.edgeMin, mesh.edgeMax, false, false, true, mesh.colormapInvert)
                }
                if (nlayers < 1) {
                    continue
                }
                for (let j = 0; j < nlayers; j++) {
                    const layer = this.meshes[i].layers[j]
                    if (!layer.colorbarVisible) {
                        continue
                    }
                    if (layer.colormap.length < 1) {
                        continue
                    }
                    const isColorbarFromZero = layer.colormapType !== COLORMAP_TYPE.MIN_TO_MAX
                    if (layer.useNegativeCmap) {
                        const neg = negMinMax(layer.cal_min, layer.cal_max, layer.cal_minNeg, layer.cal_maxNeg)
                        this.addColormapList(
                            layer.colormapNegative,
                            neg[0],
                            neg[1],
                            isColorbarFromZero,
                            true, // neg
                            true, // vis
                            layer.colormapInvert
                        )
                    }
                    this.addColormapList(
                        layer.colormap,
                        layer.cal_min,
                        layer.cal_max,
                        isColorbarFromZero,
                        false, // neg
                        true, // vis
                        layer.colormapInvert
                    )
                }
            }
        }
        const nMaps = this.colormapLists.length
        if (nMaps < 1) {
            return
        }
        this.colormapTexture = this.createColormapTexture(this.colormapTexture, nMaps + 1)
        let luts: Uint8ClampedArray = new Uint8ClampedArray()
        function addColormap(lut: number[]): void {
            const c = new Uint8ClampedArray(luts.length + lut.length)
            c.set(luts)
            c.set(lut, luts.length)
            luts = c
        }
        for (let i = 0; i < nMaps; i++) {
            addColormap(Array.from(this.colormap(this.colormapLists[i].name, this.colormapLists[i].invert)))
        }
        addColormap(Array.from(this.drawLut.lut))
        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, 256, nMaps + 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, luts)
        return this
    }

    /**
     * Calculates volume scaling factors and voxel dimensions for rendering.
     * @internal
     */
    sliceScale(forceVox = false): SliceScale {
        if (!this.back?.dims) {
            throw new Error('back.dims undefined')
        }
        return LayoutManager.calculateSliceScale({
            forceVox,
            getScreenFieldOfViewMM: (axCorSag: SLICE_TYPE) => this.screenFieldOfViewMM(axCorSag),
            getScreenFieldOfViewVox: (axCorSag: SLICE_TYPE) => this.screenFieldOfViewVox(axCorSag),
            backDims: this.back.dims
        })
    }

    /**
     * Returns the index of the tile containing the given (x, y) screen coordinates.
     * Returns -1 if the coordinates are outside all tiles.
     * @internal
     */
    tileIndex(x: number, y: number): number {
        return SliceNavigation.findTileIndex({
            x,
            y,
            screenSlices: this.screenSlices
        })
    }

    /**
     * Returns the index of the render tile containing (x, y) screen coordinates, or -1 if none.
     * @internal
     */
    inRenderTile(x: number, y: number): number {
        return SliceNavigation.findRenderTileIndex({
            x,
            y,
            screenSlices: this.screenSlices
        })
    }

    /**
     * Adjusts clip plane depth if active, else zooms render size.
     * @internal
     */
    sliceScroll3D(posChange = 0): void {
        const result = SliceNavigation.calculateSliceScroll3D({
            posChange,
            volumesLength: this.volumes.length,
            clipPlaneDepthAziElevs: this.scene.clipPlaneDepthAziElevs,
            activeClipPlaneIndex: this.uiData.activeClipPlaneIndex,
            volScaleMultiplier: this.scene.volScaleMultiplier
        })

        if (result.action === 'none') {
            return
        }

        if (result.action === 'clipPlane' && result.newClipPlaneDepth !== undefined) {
            const depthAziElev = this.scene.clipPlaneDepthAziElevs[this.uiData.activeClipPlaneIndex].slice()
            depthAziElev[0] = result.newClipPlaneDepth
            this.scene.clipPlaneDepthAziElevs[this.uiData.activeClipPlaneIndex] = depthAziElev
            return this.setClipPlane(this.scene.clipPlaneDepthAziElevs[this.uiData.activeClipPlaneIndex])
        }

        if (result.action === 'zoom' && result.newVolScaleMultiplier !== undefined) {
            this.scene.volScaleMultiplier = result.newVolScaleMultiplier
            this.drawScene()
        }
    }

    /**
     * Checks if (x,y) is within the visible graph plotting area.
     * @internal
     */
    inGraphTile(x: number, y: number): boolean {
        return SliceNavigation.isInGraphTile({
            x,
            y,
            graph: this.graph,
            volumesLength: this.volumes.length,
            firstVolumeFrameCount: this.volumes.length > 0 ? (this.volumes[0].nFrame4D ?? 0) : 0
        })
    }

    /**
     * Updates drawBitmap to match clickToSegmentGrowingBitmap if they differ in content and size.
     * @internal
     */
    updateBitmapFromClickToSegment(): void {
        if (this.clickToSegmentGrowingBitmap === null || this.drawBitmap === null) {
            return
        }
        FloodFillTool.updateBitmapFromPreview({
            sourceBitmap: this.clickToSegmentGrowingBitmap,
            targetBitmap: this.drawBitmap
        })
    }

    /**
     * Calculates the sum of all voxel values in the given bitmap.
     * @internal
     */
    sumBitmap(img: Uint8Array): number {
        return FloodFillTool.sumBitmap(img)
    }

    /**
     * Performs click-to-segment operation based on user click within a specified tile.
     * Validates input, computes voxel coordinates from screen position, and applies flood fill
     * with intensity-based thresholding and optional growing mask.
     * Updates drawing bitmaps and triggers redraw and descriptive stats calculation.
     * @internal
     */
    doClickToSegment(options: { x: number; y: number; tileIndex: number }): void {
        const { tileIndex } = options

        // Ensure tileIndex is valid before accessing screenSlices
        if (tileIndex < 0 || tileIndex >= this.screenSlices.length) {
            log.warn(`Invalid tileIndex ${tileIndex} received in doClickToSegment.`)
            return
        }

        const axCorSag = this.screenSlices[tileIndex].axCorSag
        if (axCorSag > SLICE_TYPE.SAGITTAL) {
            log.warn('ClickToSegment attempted on non-2D slice tile.')
            return
        }

        const texFrac = this.screenXY2TextureFrac(
            this.clickToSegmentXY[0], // Use the stored click location
            this.clickToSegmentXY[1],
            tileIndex,
            false
        )
        // Handle case where click is outside the valid area of the tile texture
        if (texFrac[0] < 0) {
            log.debug('Click location outside valid texture fraction for the tile.')
            return
        }

        const pt = this.frac2vox(texFrac) as [number, number, number]
        const voxelIntensity = this.back.getValue(pt[0], pt[1], pt[2])

        // Calculate intensity thresholds using FloodFillTool helper
        const intensityResult = FloodFillTool.calculateSegmentIntensity({
            voxelIntensity,
            thresholdPercent: this.opts.clickToSegmentPercent,
            calMin: this.back.cal_min,
            calMax: this.back.cal_max,
            autoIntensity: this.opts.clickToSegmentAutoIntensity,
            currentIntensityMin: this.opts.clickToSegmentIntensityMin,
            currentIntensityMax: this.opts.clickToSegmentIntensityMax,
            currentBright: this.opts.clickToSegmentBright
        })

        // Update opts with calculated values
        this.opts.clickToSegmentIntensityMin = intensityResult.intensityMin
        this.opts.clickToSegmentIntensityMax = intensityResult.intensityMax
        this.opts.clickToSegmentBright = intensityResult.isBright

        const brightOrDark = FloodFillTool.getGrowDirection(intensityResult.isBright)

        this.drawPenAxCorSag = axCorSag

        // Determine which bitmap to pass to drawFloodFill
        const targetBitmap = this.clickToSegmentIsGrowing ? this.clickToSegmentGrowingBitmap : this.drawBitmap

        // Ensure targetBitmap is valid before proceeding
        if (!targetBitmap) {
            log.error('Target bitmap for flood fill is null.')
            if (!this.clickToSegmentIsGrowing) {
                this.createEmptyDrawing()
                if (!this.drawBitmap) {
                    return
                }
            } else {
                if (!this.drawBitmap) {
                    this.createEmptyDrawing()
                }
                if (!this.drawBitmap) {
                    return
                }
                this.clickToSegmentGrowingBitmap = this.drawBitmap.slice()
            }
            log.warn('Initialized missing bitmap in doClickToSegment.')
        }

        this.drawFloodFill(
            [pt[0], pt[1], pt[2]],
            this.opts.penValue,
            brightOrDark,
            this.opts.clickToSegmentIntensityMin,
            this.opts.clickToSegmentIntensityMax,
            this.opts.floodFillNeighbors,
            this.opts.clickToSegmentMaxDistanceMM,
            this.opts.clickToSegmentIs2D,
            targetBitmap
        )

        if (!this.clickToSegmentIsGrowing) {
            log.debug('Applying clickToSegment mask to drawBitmap.')
            if (this.drawBitmap) {
                this.refreshDrawing(false, false) // Update GPU from this.drawBitmap, don't force redraw yet
                this.drawScene() // Now trigger the full scene redraw including the updated drawing layer
            } else {
                log.error('Cannot refresh drawing after click-to-segment apply, drawBitmap is null.')
            }

            // Calculate descriptives only after applying the final mask
            if (this.drawBitmap) {
                const info = this.getDescriptives({
                    layer: 0,
                    masks: [],
                    drawingIsMask: true // Use the final this.drawBitmap
                })
                this.onClickToSegment({ mL: info.volumeML, mm3: info.volumeMM3 })
            }
        }
        // should probably happen regardless of growing state
        this.createOnLocationChange(axCorSag)
    }

    /**
     * Handles mouse click on canvas by updating crosshair position, drawing, or segmenting based on current mode and location.
     * Supports thumbnail loading, graph interaction, 3D slice scrolling, and click-to-segment with flood fill.
     * @internal
     */
    mouseClick(x: number, y: number, posChange = 0, isDelta = true): boolean {
        x *= this.uiData.dpr!
        y *= this.uiData.dpr!
        this.canvas!.focus()
        if (this.thumbnailVisible) {
            this.thumbnailVisible = false
            Promise.all([this.loadVolumes(this.deferredVolumes), this.loadMeshes(this.deferredMeshes)]).catch((e) => {
                throw e
            })
            return true
        }
        if (this.inGraphTile(x, y)) {
            if (!this.graph.plotLTWH) {
                throw new Error('plotLTWH undefined')
            }
            const pos = [(x - this.graph.plotLTWH[0]) / this.graph.plotLTWH[2], (y - this.graph.plotLTWH[1]) / this.graph.plotLTWH[3]]

            if (pos[0] > 0 && pos[1] > 0 && pos[0] <= 1 && pos[1] <= 1) {
                const vol = Math.round(pos[0] * (this.volumes[0].nFrame4D! - 1))
                this.setFrame4D(this.volumes[0].id, vol)
                return true
            }
            if (pos[0] > 0.5 && pos[1] > 1.0) {
                this.loadDeferred4DVolumes(this.volumes[0].id).catch((e) => {
                    throw e
                })
            }
            return false
        }
        if (this.inRenderTile(x, y) >= 0) {
            if (posChange === 0) {
                return false
            }
            this.sliceScroll3D(posChange)
            this.drawScene()
            return true
        }
        if (this.screenSlices.length < 1 || this.gl.canvas.height < 1 || this.gl.canvas.width < 1) {
            return false
        }

        for (let i = 0; i < this.screenSlices.length; i++) {
            const axCorSag = this.screenSlices[i].axCorSag
            if (this.drawPenAxCorSag >= 0 && this.drawPenAxCorSag !== axCorSag) {
                continue
            }
            if (axCorSag > SLICE_TYPE.SAGITTAL && !this.opts.clickToSegment && posChange === 0) {
                continue
            }

            const texFrac = this.screenXY2TextureFrac(x, y, i, true)

            if (texFrac[0] < 0.0) {
                continue
            }

            if (posChange !== 0 || !isDelta) {
                if (!isDelta) {
                    if (axCorSag <= SLICE_TYPE.SAGITTAL) {
                        this.scene.crosshairPos[2 - axCorSag] = posChange
                        this.drawScene()
                        this.createOnLocationChange(axCorSag)
                    }
                    return true
                }

                const posNeg = posChange < 0 ? -1 : 1
                const xyz = [0, 0, 0]

                if (axCorSag <= SLICE_TYPE.SAGITTAL) {
                    xyz[2 - axCorSag] = posNeg
                    this.moveCrosshairInVox(xyz[0], xyz[1], xyz[2])
                }
                return true
            }

            // lag
            const nextPos = this.opts.isForceMouseClickToVoxelCenters ? this.vox2frac(this.frac2vox(texFrac)) : texFrac
            // vec3.equals does deep component comparison
            const isPosChanged = !vec3.equals(this.scene.crosshairPos, nextPos)
            if (!isPosChanged && !this.opts.drawingEnabled) {
                // lag
                return false
            }
            this.scene.crosshairPos = vec3.clone(nextPos)

            if (this.opts.drawingEnabled) {
                const pt = this.frac2vox(this.scene.crosshairPos) as [number, number, number]

                // These penValues take precedence over the general clickToSegment mode
                if (!isFinite(this.opts.penValue) || this.opts.penValue < 0 || Object.is(this.opts.penValue, -0)) {
                    // Includes +/-Infinity, NaN, and -0
                    let growMode = 0
                    let floodFillNewColor = Math.abs(this.opts.penValue)
                    const isGrowTool = true
                    if (Object.is(this.opts.penValue, -0)) {
                        // Erase Cluster specifically
                        growMode = 0
                        floodFillNewColor = 0
                        log.debug('Erase Cluster selected')
                    } else {
                        growMode = this.opts.penValue
                        log.debug('Intensity Grow selected', growMode)
                    }

                    this.drawFloodFill(pt, floodFillNewColor, growMode, NaN, NaN, this.opts.floodFillNeighbors, Number.POSITIVE_INFINITY, false, this.drawBitmap, isGrowTool)
                    this.drawScene()
                    this.createOnLocationChange(axCorSag)
                    return true
                } else if (this.opts.clickToSegment) {
                    if (axCorSag <= SLICE_TYPE.SAGITTAL) {
                        // Only on 2D slices
                        this.clickToSegmentIsGrowing = false
                        this.doClickToSegment({
                            x: this.clickToSegmentXY[0],
                            y: this.clickToSegmentXY[1],
                            tileIndex: i
                        })
                    }
                    // Note: doClickToSegment handles refresh and redraw for the apply case.
                    // We still need createOnLocationChange below, but return here.
                    this.createOnLocationChange(axCorSag)
                    return true
                }

                // Standard Pen Drawing (if not flood fill and not clickToSegment)
                else {
                    if (this.opts.penType === PEN_TYPE.PEN) {
                        // Traditional pen drawing
                        if (isNaN(this.drawPenLocation[0])) {
                            this.drawPenAxCorSag = axCorSag
                            this.drawPenFillPts = []
                            this.drawPt(...pt, this.opts.penValue)
                        } else {
                            if (pt[0] === this.drawPenLocation[0] && pt[1] === this.drawPenLocation[1] && pt[2] === this.drawPenLocation[2]) {
                                // No drawing needed, but still redraw scene and update location
                                this.drawScene()
                                this.createOnLocationChange(axCorSag)
                                return true
                            }
                            this.drawPenLine(pt, this.drawPenLocation, this.opts.penValue)
                        }
                        this.drawPenLocation = pt
                        if (this.opts.isFilledPen) {
                            this.drawPenFillPts.push(pt)
                        }
                        this.refreshDrawing(false, false) // Update GPU texture
                    } else if (this.opts.penType === PEN_TYPE.RECTANGLE || this.opts.penType === PEN_TYPE.ELLIPSE) {
                        // Rectangle or ellipse drawing
                        if (isNaN(this.drawShapeStartLocation[0])) {
                            // First click - set start position
                            this.drawPenAxCorSag = axCorSag
                            this.drawShapeStartLocation = [...pt]
                            // Store current drawing bitmap for preview
                            if (this.drawBitmap) {
                                this.drawShapePreviewBitmap = this.drawBitmap.slice()
                            }
                        } else {
                            // Drawing preview of shape
                            if (this.drawShapePreviewBitmap && this.drawBitmap) {
                                // Restore original bitmap
                                this.drawBitmap.set(this.drawShapePreviewBitmap)
                                // Draw shape preview
                                if (this.opts.penType === PEN_TYPE.RECTANGLE) {
                                    this.drawRectangleMask(this.drawShapeStartLocation, pt, this.opts.penValue)
                                } else if (this.opts.penType === PEN_TYPE.ELLIPSE) {
                                    this.drawEllipseMask(this.drawShapeStartLocation, pt, this.opts.penValue)
                                }
                                this.refreshDrawing(false, false) // Update GPU texture
                            }
                        }
                    }
                }
            } // end if(drawingEnabled)

            // Redraw scene & update location (happens after drawing or if drawing is disabled but click was valid)
            this.drawScene()
            this.createOnLocationChange(axCorSag)
            return true // Click handled for this slice 'i'
        } // End loop through screenSlices
        // If loop finishes without finding a slice, the click was outside all valid slices
        return false
    }

    /**
     * Draws a 10cm ruler on a 2D slice tile based on screen FOV and slice dimensions.
     * @internal
     */
    drawRuler(): void {
        let fovMM: number[] = []
        let ltwh: number[] = []

        for (let i = 0; i < this.screenSlices.length; i++) {
            if (this.screenSlices[i].axCorSag === SLICE_TYPE.RENDER) {
                continue
            }
            if (this.screenSlices[i].fovMM.length > 1) {
                ltwh = this.screenSlices[i].leftTopWidthHeight
                fovMM = this.screenSlices[i].fovMM
                break
            }
        }
        if (ltwh.length < 4) {
            return
        }

        const [regionX, regionY, regionW, regionH] = this.getBoundsRegion()
        const thick = Number(this.opts.rulerWidth)

        const rulerGeometry = UIElementRenderer.calculateRulerGeometry({
            fovMM,
            ltwh,
            rulerWidth: thick,
            regionBounds: { x: regionX, y: regionY, w: regionW, h: regionH }
        })

        if (!rulerGeometry) {
            return
        }

        const outlineColor = UIElementRenderer.getRulerOutlineColor(this.opts.rulerColor)

        // Draw ruler with outline
        this.drawRuler10cm(rulerGeometry.startXYendXY, outlineColor, thick + 1)
        this.drawRuler10cm(rulerGeometry.startXYendXY, this.opts.rulerColor, thick)
    }

    /**
     * Draws a 10cm ruler at specified coordinates with given color and width.
     * @internal
     */
    drawRuler10cm(startXYendXY: number[], rulerColor: number[], rulerWidth: number = 1): void {
        if (!this.lineShader) {
            throw new Error('lineShader undefined')
        }
        this.gl.bindVertexArray(this.genericVAO)
        this.lineShader.use(this.gl)
        this.gl.uniform4fv(this.lineShader.uniforms.lineColor, rulerColor)
        this.gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
        // draw main ruler line
        this.gl.uniform1f(this.lineShader.uniforms.thickness, rulerWidth)
        this.gl.uniform4fv(this.lineShader.uniforms.startXYendXY, startXYendXY)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        // draw tick marks using helper
        const ticks = UIElementRenderer.calculateRulerTicks(startXYendXY, this.opts.rulerWidth)
        for (const xyxy of ticks) {
            this.gl.uniform4fv(this.lineShader.uniforms.startXYendXY, xyxy)
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        }
        this.gl.bindVertexArray(this.unusedVAO)
    }

    /**
     * Returns vec4 with XYZ millimeter coordinates and tile index for given screen XY.
     * @internal
     */
    screenXY2mm(x: number, y: number, forceSlice = -1): vec4 {
        return CoordTransform.screenXY2mm(x, y, this.screenSlices, {
            volumes: this.volumes,
            meshes: this.meshes,
            volumeObject3D: this.volumeObject3D,
            isSliceMM: this.opts.isSliceMM,
            forceSlice
        })
    }

    /**
     * Update scene pan position during drag based on start and end screen coordinates.
     * @internal
     */
    dragForPanZoom(startXYendXY: number[]): void {
        // Handle Zarr images with chunked pan
        const zarrVolumes = this.getZarrVolumes()
        const activeZarrVolumes = zarrVolumes.filter((vol) => vol.zarrHelper?.centerAtDragStart)

        if (activeZarrVolumes.length > 0) {
            const screenDeltaX = startXYendXY[2] - startXYendXY[0]
            const screenDeltaY = startXYendXY[3] - startXYendXY[1]

            if (screenDeltaX === 0 && screenDeltaY === 0) {
                return
            }

            // Determine which slice the drag is happening on to map screen axes to volume axes
            let axCorSag = SLICE_TYPE.AXIAL
            for (const slice of this.screenSlices) {
                if (slice.axCorSag > SLICE_TYPE.SAGITTAL) {
                    continue
                }
                const ltwh = slice.leftTopWidthHeight
                const mx = startXYendXY[0]
                const my = startXYendXY[1]
                if (mx >= ltwh[0] && my >= ltwh[1] && mx <= ltwh[0] + ltwh[2] && my <= ltwh[1] + ltwh[3]) {
                    axCorSag = slice.axCorSag
                    break
                }
            }

            // Each slice type shows two physical axes on screen:
            //   AXIAL:    horizontal=x(0), vertical=y(1)
            //   CORONAL:  horizontal=x(0), vertical=z(2)
            //   SAGITTAL: horizontal=y(1), vertical=z(2)
            let hPhys: number
            let vPhys: number
            if (axCorSag === SLICE_TYPE.AXIAL) {
                hPhys = 0
                vPhys = 1
            } else if (axCorSag === SLICE_TYPE.CORONAL) {
                hPhys = 0
                vPhys = 2
            } else {
                hPhys = 1
                vPhys = 2
            }

            // Pan all zarr volumes simultaneously
            const panPromises: Array<Promise<void>> = []
            for (const zarrVol of activeZarrVolumes) {
                const zarrHelper = zarrVol.zarrHelper!

                // Map screen deltas to zarr volume axes using the actual affine matrix.
                // The affine maps NIfTI columns (0=width/centerX, 1=height/centerY, 2=depth/centerZ)
                // to physical axes (row 0=x, row 1=y, row 2=z). When OME axis names permute axes,
                // the affine won't be diagonal, so we must derive the mapping dynamically.
                const affine = zarrVol.hdr!.affine
                // For each physical axis (row), find which NIfTI column dominates
                // physToCol[physAxis] = { col, sign } where col is the center index (0=X,1=Y,2=Z)
                const physToCol: Array<{ col: number; sign: number }> = [
                    { col: 0, sign: -1 },
                    { col: 1, sign: -1 },
                    { col: 2, sign: -1 }
                ]
                for (let row = 0; row < 3; row++) {
                    let maxVal = 0
                    for (let col = 0; col < 3; col++) {
                        const val = Math.abs(affine[row][col])
                        if (val > maxVal) {
                            maxVal = val
                            physToCol[row] = { col, sign: affine[row][col] < 0 ? -1 : 1 }
                        }
                    }
                }

                const dragStart = zarrHelper.centerAtDragStart!
                const centers = [dragStart.x, dragStart.y, dragStart.z]
                centers[physToCol[hPhys].col] += screenDeltaX * physToCol[hPhys].sign
                centers[physToCol[vPhys].col] += -screenDeltaY * physToCol[vPhys].sign
                const newCenterX = centers[0]
                const newCenterY = centers[1]
                const newCenterZ = centers[2]

                const state = zarrHelper.getViewportState()
                const dx = Math.abs(newCenterX - state.centerX)
                const dy = Math.abs(newCenterY - state.centerY)
                const dz = Math.abs(newCenterZ - state.centerZ)
                if (dx < 0.001 && dy < 0.001 && dz < 0.001) {
                    continue
                }

                panPromises.push(zarrHelper.panTo(newCenterX, newCenterY, newCenterZ))
            }

            if (panPromises.length > 0) {
                Promise.all(panPromises)
                    .then(() => {
                        this._skipDragInDraw = true
                        this.drawScene()
                        this._skipDragInDraw = false
                    })
                    .catch((err) => {
                        log.error('Failed to pan Zarr:', err)
                    })
            }
            this.canvas!.focus()
            return
        }

        const endMM = this.screenXY2mm(startXYendXY[2], startXYendXY[3])
        if (isNaN(endMM[0])) {
            return
        }
        const startMM = this.screenXY2mm(startXYendXY[0], startXYendXY[1], endMM[3])
        if (isNaN(startMM[0]) || isNaN(endMM[0]) || isNaN(endMM[3])) {
            return
        }

        // Calculate pan using helper function
        const result = DragModeManager.calculatePanZoomFromDrag({
            startMM,
            endMM,
            pan2DxyzmmAtMouseDown: this.uiData.pan2DxyzmmAtMouseDown
        })

        this.scene.pan2Dxyzmm[0] = result.pan2Dxyzmm[0]
        this.scene.pan2Dxyzmm[1] = result.pan2Dxyzmm[1]
        this.scene.pan2Dxyzmm[2] = result.pan2Dxyzmm[2]
        this.canvas!.focus() // required after change for issue706
    }

    /**
     * Handle center-button drag as pan and zoom.
     * @internal
     */
    dragForCenterButton(startXYendXY: number[]): void {
        this.dragForPanZoom(startXYendXY)
    }

    /**
     * Update 3D slicer zoom and pan based on drag movement.
     * @internal
     */
    dragForSlicer3D(startXYendXY: number[]): void {
        const mm = this.frac2mm(this.scene.crosshairPos)

        // Calculate 3D slicer zoom using helper function
        const result = DragModeManager.calculateSlicer3DZoomFromDrag({
            startY: startXYendXY[1],
            endY: startXYendXY[3],
            pan2DxyzmmAtMouseDown: this.uiData.pan2DxyzmmAtMouseDown,
            currentPan2Dxyzmm: this.scene.pan2Dxyzmm,
            crosshairMM: mm,
            yoke3Dto2DZoom: this.opts.yoke3Dto2DZoom
        })

        if (result.volScaleMultiplier !== undefined) {
            this.scene.volScaleMultiplier = result.volScaleMultiplier
        }
        this.scene.pan2Dxyzmm[0] = result.pan2Dxyzmm[0]
        this.scene.pan2Dxyzmm[1] = result.pan2Dxyzmm[1]
        this.scene.pan2Dxyzmm[2] = result.pan2Dxyzmm[2]
        this.scene.pan2Dxyzmm[3] = result.pan2Dxyzmm[3]
    }

    /**
     * Draw a measurement line with end caps and length text on a 2D tile.
     * @internal
     */
    drawMeasurementTool(startXYendXY: number[], isDrawText: boolean = true): void {
        // Use UIElementRenderer helper for line extension calculations
        const extendTo = (x0: number, y0: number, x1: number, y1: number, distance: number): { origin: number[]; terminus: number[] } => {
            return UIElementRenderer.extendMeasurementLine({
                startXYendXY: [x0, y0, x1, y1],
                distance
            })
        }

        const gl = this.gl
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        gl.bindVertexArray(this.genericVAO)

        gl.depthFunc(gl.ALWAYS)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        if (!this.lineShader) {
            throw new Error('lineShader undefined')
        }

        this.lineShader.use(this.gl)
        gl.uniform4fv(this.lineShader.uniforms.lineColor, this.opts.rulerColor)
        gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [gl.canvas.width, gl.canvas.height])
        // draw Line
        gl.uniform1f(this.lineShader.uniforms.thickness, this.opts.rulerWidth)
        gl.uniform4fv(this.lineShader.uniforms.startXYendXY, startXYendXY)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        // draw startCap
        const measureLineColor = this.opts.measureLineColor
        measureLineColor[3] = 1.0 // opaque
        gl.uniform4fv(this.lineShader.uniforms.lineColor, measureLineColor)
        const w = this.opts.rulerWidth
        gl.uniform1f(this.lineShader.uniforms.thickness, w * 2)
        let sXYeXY = [startXYendXY[0], startXYendXY[1] - w, startXYendXY[0], startXYendXY[1] + w]
        gl.uniform4fv(this.lineShader.uniforms.startXYendXY, sXYeXY)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        // end cap
        sXYeXY = [startXYendXY[2], startXYendXY[3] - w, startXYendXY[2], startXYendXY[3] + w]
        gl.uniform4fv(this.lineShader.uniforms.startXYendXY, sXYeXY)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        // distance between start and stop
        let startXY = this.canvasPos2frac([startXYendXY[0], startXYendXY[1]])
        let endXY = this.canvasPos2frac([startXYendXY[2], startXYendXY[3]])
        if (startXY[0] >= 0 && endXY[0] >= 0) {
            const startMm = this.frac2mm(startXY)
            startXY = vec3.fromValues(startMm[0], startMm[1], startMm[2])
            const endMm = this.frac2mm(endXY)
            endXY = vec3.fromValues(endMm[0], endMm[1], endMm[2])
            const v = vec3.create()
            vec3.sub(v, startXY, endXY)
            const lenMM = vec3.len(v)
            let decimals = 2
            if (lenMM > 9) {
                decimals = 1
            }
            if (lenMM > 99) {
                decimals = 0
            }
            let stringMM = lenMM.toFixed(decimals)
            if (this.opts.showMeasureUnits) {
                stringMM = `${stringMM} mm` // append mm for millimeters to show units
            }
            let textCoords = startXYendXY
            const [x0, y0, x1, y1] = startXYendXY
            const { origin, terminus } = extendTo(x0, y0, x1, y1, 30)
            switch (this.opts.measureTextJustify) {
                case 'start':
                    textCoords = [...origin, ...origin.map((point) => point + 1)]
                    break
                case 'end':
                    textCoords = textCoords = [...terminus, ...terminus.map((point) => point + 1)]
                    break
                default:
                    textCoords = startXYendXY
                    break
            }
            if (isDrawText) {
                this.drawTextBetween(
                    textCoords,
                    stringMM,
                    this.opts.measureTextHeight / 0.06, // <- TODO measureFontPx
                    this.opts.measureTextColor
                )
            }
        }
        gl.bindVertexArray(this.unusedVAO) // set vertex attributes
    }

    /**
     * Draw angle measurement tool with two lines and angle display.
     * @internal
     */
    drawAngleMeasurementTool(): void {
        if (this.uiData.angleState === 'drawing_first_line') {
            // Draw the first line being dragged
            this.drawMeasurementTool([this.uiData.dragStart[0], this.uiData.dragStart[1], this.uiData.dragEnd[0], this.uiData.dragEnd[1]], false)
        } else if (this.uiData.angleState === 'drawing_second_line') {
            // Draw the first line (completed)
            this.drawMeasurementTool(this.uiData.angleFirstLine, false)

            // Draw the second line being positioned
            this.drawMeasurementTool(
                [
                    this.uiData.angleFirstLine[2], // start from end of first line
                    this.uiData.angleFirstLine[3],
                    this.uiData.dragEnd[0], // to current mouse position
                    this.uiData.dragEnd[1]
                ],
                false
            )

            // Calculate and display angle
            this.drawAngleText()
        }
    }

    /**
     * Calculate and draw angle text at the intersection of two lines.
     * @internal
     */
    drawAngleText(): void {
        const line1 = this.uiData.angleFirstLine
        const line2 = [
            this.uiData.angleFirstLine[2], // start from end of first line
            this.uiData.angleFirstLine[3],
            this.uiData.dragEnd[0], // to current mouse position
            this.uiData.dragEnd[1]
        ]

        // Calculate angle between the two lines
        const angle = this.calculateAngleBetweenLines(line1, line2)

        // Display angle at intersection point
        const intersectionX = this.uiData.angleFirstLine[2]
        const intersectionY = this.uiData.angleFirstLine[3]

        const angleText = `${angle.toFixed(1)}°`

        // Draw angle text at intersection
        this.drawTextBetween([intersectionX, intersectionY, intersectionX + 1, intersectionY + 1], angleText, this.opts.measureTextHeight / 0.06, this.opts.measureTextColor)
    }

    /**
     * Calculate and draw angle text for a completed angle.
     * @internal
     */
    drawAngleTextForAngle(angle: { firstLine: number[]; secondLine: number[]; sliceIndex: number; sliceType: SLICE_TYPE; slicePosition: number }): void {
        const angle_degrees = this.calculateAngleBetweenLines(angle.firstLine, angle.secondLine)

        // Display angle at intersection point
        const intersectionX = angle.firstLine[2]
        const intersectionY = angle.firstLine[3]

        const angleText = `${angle_degrees.toFixed(1)}°`

        // Draw angle text at intersection
        this.drawTextBetween([intersectionX, intersectionY, intersectionX + 1, intersectionY + 1], angleText, this.opts.measureTextHeight / 0.06, this.opts.measureTextColor)
    }

    /**
     * Calculate angle between two lines in degrees.
     * @internal
     */
    calculateAngleBetweenLines(line1: number[], line2: number[]): number {
        return DragModeManager.calculateAngleBetweenLines(line1, line2)
    }

    /**
     * Reset the angle measurement state.
     * @internal
     */
    resetAngleMeasurement(): void {
        const state = DragModeManager.createResetAngleMeasurementState()
        this.uiData.angleState = state.angleState
        this.uiData.angleFirstLine = state.angleFirstLine
    }

    /**
     * Get slice information for the current measurement/angle.
     * @internal
     */
    getCurrentSliceInfo(): { sliceIndex: number; sliceType: SLICE_TYPE; slicePosition: number } {
        return SliceNavigation.getCurrentSliceInfo({
            dragStart: this.uiData.dragStart,
            screenSlices: this.screenSlices,
            crosshairPos: this.scene.crosshairPos,
            currentSliceType: this.opts.sliceType,
            canvasPos2frac: (pos: number[]) => this.canvasPos2frac(pos)
        })
    }

    /**
     * Get the current slice position based on slice type.
     * @internal
     */
    getCurrentSlicePosition(sliceType: SLICE_TYPE): number {
        return SliceNavigation.getSlicePosition({
            sliceType,
            crosshairPos: this.scene.crosshairPos
        })
    }

    /**
     * Check if a measurement/angle should be drawn on the current slice.
     * @internal
     */
    shouldDrawOnCurrentSlice(sliceIndex: number, sliceType: SLICE_TYPE, slicePosition: number): boolean {
        return SliceNavigation.shouldDrawOnCurrentSlice({
            sliceIndex,
            sliceType,
            slicePosition,
            currentSliceTypeOpt: this.opts.sliceType,
            screenSlices: this.screenSlices,
            crosshairPos: this.scene.crosshairPos
        })
    }

    /**
     * Clear all persistent measurement lines from the canvas.
     * @example
     * ```js
     * nv.clearMeasurements()
     * ```
     */
    clearMeasurements(): void {
        this.document.completedMeasurements = []
        this.drawScene()
    }

    /**
     * Clear all persistent angle measurements from the canvas.
     * @example
     * ```js
     * nv.clearAngles()
     * ```
     */
    clearAngles(): void {
        this.document.completedAngles = []
        this.drawScene()
    }

    /**
     * Clear all persistent measurements and angles from the canvas.
     * @example
     * ```js
     * nv.clearAllMeasurements()
     * ```
     */
    clearAllMeasurements(): void {
        this.document.completedMeasurements = []
        this.document.completedAngles = []
        this.drawScene()
    }

    /**
     * Set the drag mode for mouse interactions.
     * @param mode - The drag mode to set ('none', 'contrast', 'measurement', 'angle', 'pan', 'slicer3D', 'callbackOnly', 'roiSelection')
     */
    setDragMode(mode: string | DRAG_MODE): void {
        const parsedMode = DragModeManager.parseDragModeString(mode)
        if (parsedMode === null) {
            console.warn(`Unknown drag mode: ${mode}`)
            return
        }
        this.opts.dragMode = parsedMode

        // Reset angle measurement state when changing drag modes
        if (!DragModeManager.isAngleDragMode(this.opts.dragMode)) {
            this.resetAngleMeasurement()
        }
        // Clear active drag mode since we're changing the configuration
        this.clearActiveDragMode()
    }

    /**
     * Set custom mouse event configuration for button mappings.
     * @param config - Mouse event configuration object
     * @example
     * ```js
     * nv.setMouseEventConfig({
     *   leftButton: {
     *     primary: DRAG_MODE.windowing,
     *     withShift: DRAG_MODE.measurement,
     *     withCtrl: DRAG_MODE.crosshair
     *   },
     *   rightButton: DRAG_MODE.crosshair,
     *   centerButton: DRAG_MODE.pan
     * })
     * ```
     */
    setMouseEventConfig(config: MouseEventConfig): void {
        this.opts.mouseEventConfig = config
        // Clear active drag mode since we're changing the configuration
        this.clearActiveDragMode()
    }

    /**
     * Set custom touch event configuration for touch gesture mappings.
     * @param config - Touch event configuration object
     * @example
     * ```js
     * nv.setTouchEventConfig({
     *   singleTouch: DRAG_MODE.windowing,
     *   doubleTouch: DRAG_MODE.pan
     * })
     * ```
     */
    setTouchEventConfig(config: TouchEventConfig): void {
        this.opts.touchEventConfig = config
        // Clear active drag mode since we're changing the configuration
        this.clearActiveDragMode()
    }

    /**
     * Get current mouse event configuration.
     * @returns Current mouse event configuration or undefined if using defaults
     */
    getMouseEventConfig(): MouseEventConfig | undefined {
        return this.opts.mouseEventConfig
    }

    /**
     * Get current touch event configuration.
     * @returns Current touch event configuration or undefined if using defaults
     */
    getTouchEventConfig(): TouchEventConfig | undefined {
        return this.opts.touchEventConfig
    }

    /**
     * Draw a rectangle or outline at given position with specified color or default crosshair color.
     * @internal
     */
    drawRect(leftTopWidthHeight: number[], lineColor = [1, 0, 0, -1]): void {
        if (lineColor[3] < 0) {
            lineColor = this.opts.crosshairColor
        }
        if (!this.rectShader) {
            throw new Error('rectShader undefined')
        }
        this.gl.disable(this.gl.CULL_FACE)
        if (!this.opts.selectionBoxIsOutline) {
            this.rectShader.use(this.gl)
            this.gl.enable(this.gl.BLEND)
            this.gl.uniform4fv(this.rectShader.uniforms.lineColor, lineColor)
            this.gl.uniform2fv(this.rectShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
            this.gl.uniform4f(this.rectShader.uniforms.leftTopWidthHeight, leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3])
            this.gl.bindVertexArray(this.genericVAO)
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
            this.gl.bindVertexArray(this.unusedVAO) // switch off to avoid tampering with settings
        } else {
            this.drawCircle(leftTopWidthHeight, lineColor, 0.1)
            // this.opts.selectionBoxIsOutline == true
            this.rectOutlineShader.use(this.gl)
            this.gl.enable(this.gl.BLEND)
            // set thickness of line
            this.gl.uniform1f(this.rectOutlineShader.uniforms.thickness, this.opts.selectionBoxLineThickness)
            this.gl.uniform4fv(this.rectOutlineShader.uniforms.lineColor, lineColor)
            this.gl.uniform2fv(this.rectOutlineShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
            this.gl.uniform4f(this.rectOutlineShader.uniforms.leftTopWidthHeight, leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3])
            this.gl.bindVertexArray(this.genericVAO)
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
            this.gl.bindVertexArray(this.unusedVAO) // switch off to avoid tampering with settings
        }
    }

    getZarrVolume(): NVImage | null {
        for (const vol of this.volumes) {
            if (vol.zarrHelper) {
                return vol
            }
        }
        return null
    }

    getZarrVolumes(): NVImage[] {
        return this.volumes.filter((vol) => vol.zarrHelper)
    }

    private drawBoundsBox(leftTopWidthHeight: number[], color: number[], thickness = 2): void {
        if (!this.rectOutlineShader) {
            throw new Error('rectOutlineShader undefined')
        }

        const gl = this.gl
        const [x, y, w, h] = leftTopWidthHeight

        // Always use the full canvas viewport for the border
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

        this.rectOutlineShader.use(gl)
        gl.enable(gl.BLEND)

        gl.uniform1f(this.rectOutlineShader.uniforms.thickness, thickness)
        gl.uniform4fv(this.rectOutlineShader.uniforms.lineColor, color)
        gl.uniform2fv(this.rectOutlineShader.uniforms.canvasWidthHeight, [gl.canvas.width, gl.canvas.height])

        // Pass canvas-space rect directly
        gl.uniform4f(this.rectOutlineShader.uniforms.leftTopWidthHeight, x, y, w, h)

        gl.bindVertexArray(this.genericVAO)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        gl.bindVertexArray(this.unusedVAO)
    }

    /**
     * Draw a circle or outline at given position with specified color or default crosshair color.
     * @internal
     */
    drawCircle(leftTopWidthHeight: number[], circleColor = this.opts.fontColor, fillPercent = 1.0): void {
        if (!this.circleShader) {
            throw new Error('circleShader undefined')
        }
        this.circleShader.use(this.gl)
        this.gl.enable(this.gl.BLEND)
        this.gl.uniform4fv(this.circleShader.uniforms.circleColor, circleColor)
        this.gl.uniform2fv(this.circleShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
        this.gl.uniform4f(this.circleShader.uniforms.leftTopWidthHeight, leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3])
        this.gl.uniform1f(this.circleShader.uniforms.fillPercent, fillPercent)
        this.gl.uniform4fv(this.circleShader.uniforms.circleColor, circleColor)
        this.gl.bindVertexArray(this.genericVAO)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        this.gl.bindVertexArray(this.unusedVAO) // switch off to avoid tampering with settings
    }

    /**
     * Draw selection box: circle if ROI selection mode, else rectangle.
     * @internal
     */
    drawSelectionBox(leftTopWidthHeight: number[]): void {
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
        if (this.getCurrentDragMode() === DRAG_MODE.roiSelection) {
            this.drawCircle(leftTopWidthHeight, this.opts.selectionBoxColor, 0.1)
            return
        }
        // else draw a rectangle
        this.drawRect(leftTopWidthHeight, this.opts.selectionBoxColor)
    }

    /**
     * Get canvas height available for tiles (excludes colorbar).
     * @internal
     */
    effectiveCanvasHeight(): number {
        return LayoutManager.calculateEffectiveCanvasHeight({
            canvasHeight: this.gl.canvas.height,
            bounds: this.opts.bounds as LayoutManager.NormalizedBounds | null | undefined,
            colorbarHeight: this.colorbarHeight
        })
    }

    /**
     * Get canvas width available for tiles (excludes legend panel).
     * @internal
     */
    effectiveCanvasWidth(): number {
        return LayoutManager.calculateEffectiveCanvasWidth({
            canvasWidth: this.gl.canvas.width,
            bounds: this.opts.bounds as LayoutManager.NormalizedBounds | null | undefined,
            legendPanelWidth: this.getLegendPanelWidth()
        })
    }

    /**
     * Get all 3D labels from document and connectome meshes.
     * @internal
     */
    getAllLabels(): NVLabel3D[] {
        return ConnectomeManager.getAllLabels({
            meshes: this.meshes,
            documentLabels: this.document.labels
        })
    }

    /**
     * Get all visible connectome and non-anchored mesh labels.
     * @internal
     */
    getConnectomeLabels(): NVLabel3D[] {
        return ConnectomeManager.getConnectomeLabels({
            meshes: this.meshes,
            documentLabels: this.document.labels
        })
    }

    /**
     * Calculate bullet margin width based on widest bullet scale and tallest label height.
     * @internal
     */
    getBulletMarginWidth(): number {
        const labels = this.getConnectomeLabels()
        return LayoutManager.calculateBulletMarginWidth({
            labels,
            fontPx: this.fontPx,
            textHeight: (fontSize: number, text: string) => this.textHeight(fontSize, text)
        })
    }

    /**
     * Calculate width of legend panel based on labels and bullet margin.
     * Returns 0 if legend is hidden or too wide for canvas.
     * @internal
     */
    getLegendPanelWidth(): number {
        const labels = this.getConnectomeLabels()
        return LayoutManager.calculateLegendPanelWidth({
            labels,
            showLegend: this.opts.showLegend,
            fontPx: this.fontPx,
            canvasWidth: this.gl.canvas.width,
            textWidth: (fontSize: number, text: string) => this.textWidth(fontSize, text),
            getBulletMarginWidth: () => this.getBulletMarginWidth()
        })
    }

    /**
     * Calculate legend panel height based on labels and scale.
     * @internal
     */
    getLegendPanelHeight(panelScale = 1.0): number {
        const labels = this.getConnectomeLabels()
        return LayoutManager.calculateLegendPanelHeight({
            labels,
            fontPx: this.fontPx,
            panelScale,
            textHeight: (fontSize: number, text: string) => this.textHeight(fontSize, text)
        })
    }

    /**
     * Calculate and reserve canvas area for colorbar panel,
     * respecting opts.bounds if defined.
     * @internal
     */
    reserveColorbarPanel(): number[] {
        const result = LayoutManager.calculateColorbarPanel({
            fontPx: this.fontPx,
            boundsRegion: this.getBoundsRegion(),
            colorbarWidth: this.opts.colorbarWidth
        })

        this.colorbarHeight = result.colorbarHeight
        return result.leftTopWidthHeight
    }

    /**
     * Render a single colorbar with optional negative coloring and alpha threshold ticks.
     * @internal
     */
    drawColorbarCore(layer = 0, leftTopWidthHeight = [0, 0, 0, 0], isNegativeColor = false, min = 0, max = 1, isAlphaThreshold: boolean): void {
        if (leftTopWidthHeight[2] <= 0 || leftTopWidthHeight[3] <= 0) {
            return
        }
        const txtHt = this.fontPx
        if (txtHt <= 0) {
            return
        }
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
        let margin = txtHt
        const fullHt = 3 * txtHt
        let barHt = txtHt
        if (leftTopWidthHeight[3] < fullHt) {
            // no space for text
            if (leftTopWidthHeight[3] < 3) {
                return
            }
            margin = 1
            barHt = leftTopWidthHeight[3] - 2
        }
        this.gl.disable(this.gl.DEPTH_TEST)
        this.colorbarHeight = leftTopWidthHeight[3] + 1
        const barLTWH = [leftTopWidthHeight[0] + margin, leftTopWidthHeight[1], leftTopWidthHeight[2] - 2 * margin, barHt]
        const rimLTWH = [barLTWH[0] - 1, barLTWH[1] - 1, barLTWH[2] + 2, barLTWH[3] + 2]

        // Only draw the border if showColorbarBorder is true
        if (this.opts.showColorbarBorder) {
            this.drawRect(rimLTWH, this.opts.crosshairColor)
        }

        if (!this.colorbarShader) {
            throw new Error('colorbarShader undefined')
        }

        this.colorbarShader.use(this.gl)
        this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE1_COLORMAPS)
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
        const lx = layer
        this.gl.uniform1f(this.colorbarShader.uniforms.layer, lx)
        this.gl.uniform2fv(this.colorbarShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
        this.gl.disable(this.gl.CULL_FACE)
        if (isNegativeColor) {
            const flip = [barLTWH[0] + barLTWH[2], barLTWH[1], -barLTWH[2], barLTWH[3]]
            this.gl.uniform4fv(this.colorbarShader.uniforms.leftTopWidthHeight, flip)
        } else {
            this.gl.uniform4fv(this.colorbarShader.uniforms.leftTopWidthHeight, barLTWH)
        }
        this.gl.bindVertexArray(this.genericVAO)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        this.gl.bindVertexArray(this.unusedVAO) // switch off to avoid tampering with settings
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
        let thresholdTic = 0.0 // only show threshold tickmark in alphaThreshold mode
        if (isAlphaThreshold && max < 0.0 && isNegativeColor) {
            thresholdTic = max
            max = 0.0
        } else if (isAlphaThreshold && min > 0.0) {
            thresholdTic = min
            min = 0.0
        }
        if (min === max || txtHt < 1) {
            return
        }
        const range = Math.abs(max - min)
        let [spacing, ticMin] = tickSpacing(min, max)
        if (ticMin < min) {
            ticMin += spacing
        }
        // determine font size
        function humanize(x: number): string {
            // drop trailing zeros from numerical string
            return x.toFixed(6).replace(/\.?0*$/, '')
        }
        let tic = ticMin
        const ticLTWH = [0, barLTWH[1] + barLTWH[3] - txtHt * 0.5, 2, txtHt * 0.75]
        const txtTop = ticLTWH[1] + ticLTWH[3]
        const isNeg = 1
        while (tic <= max) {
            ticLTWH[0] = barLTWH[0] + ((tic - min) / range) * barLTWH[2]
            this.drawRect(ticLTWH)
            const str = humanize(isNeg * tic)
            // if (fntSize > 0)
            this.drawTextBelow([ticLTWH[0], txtTop], str)
            // this.drawTextRight([plotLTWH[0], y], str, fntScale)
            tic += spacing
        }
        if (thresholdTic !== 0) {
            const tticLTWH = [barLTWH[0] + ((thresholdTic - min) / range) * barLTWH[2], barLTWH[1] - barLTWH[3] * 0.25, 2, barLTWH[3] * 1.5]
            this.drawRect(tticLTWH)
        }
    }

    /**
     * Draw all visible colorbars side by side in the reserved colorbar panel area.
     * @internal
     */
    drawColorbar(): void {
        const maps = this.colormapLists
        const nmaps = maps.length
        if (nmaps < 1) {
            return
        }
        let nVisible = 0 // not all colorbars may be visible
        for (let i = 0; i < nmaps; i++) {
            if (maps[i].visible) {
                nVisible++
            }
        }
        if (nVisible < 1) {
            return
        }
        let leftTopWidthHeight = this.reserveColorbarPanel()
        const fullHt = 3 * this.fontPx
        if (fullHt < 0) {
            return
        }
        let wid = leftTopWidthHeight[2] / nVisible
        if (leftTopWidthHeight[2] <= 0 || leftTopWidthHeight[3] <= 0) {
            wid = this.gl.canvas.width / nVisible
            leftTopWidthHeight = [0, this.gl.canvas.height - fullHt, wid, fullHt]
        }
        leftTopWidthHeight[2] = wid
        for (let i = 0; i < nmaps; i++) {
            if (!maps[i].visible) {
                continue
            }
            this.drawColorbarCore(i, leftTopWidthHeight, maps[i].negative, maps[i].min, maps[i].max, maps[i].isColorbarFromZero)
            leftTopWidthHeight[0] += wid
        }
    }

    /**
     * Calculate pixel width of text string based on glyph advances at given scale.
     * @internal
     */
    textWidth(scale: number, str: string): number {
        return UIElementRenderer.calculateTextWidth({
            fontMets: this.fontMets as UIElementRenderer.FontMetrics,
            scale,
            str
        })
    }

    /**
     * Calculate pixel height of text based on tallest glyph at given scale.
     * @internal
     */
    textHeight(scale: number, str: string): number {
        return UIElementRenderer.calculateTextHeight({
            fontMets: this.fontMets as UIElementRenderer.FontMetrics,
            scale,
            str
        })
    }

    /**
     * Render a single character glyph at specified position and scale; returns advance width.
     * @internal
     */
    drawChar(xy: number[], scale: number, char: number): number {
        if (!this.fontShader) {
            throw new Error('fontShader undefined')
        }
        // draw single character, never call directly: ALWAYS call from drawText()
        const metrics = this.fontMets!.mets[char]!
        const l = xy[0] + scale * metrics.lbwh[0]
        const b = -(scale * metrics.lbwh[1])
        const w = scale * metrics.lbwh[2]
        const h = scale * metrics.lbwh[3]
        const t = xy[1] + (b - h) + scale
        this.gl.uniform4f(this.fontShader.uniforms.leftTopWidthHeight, l, t, w, h)
        this.gl.uniform4fv(this.fontShader.uniforms.uvLeftTopWidthHeight!, metrics.uv_lbwh)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        return scale * metrics.xadv
    }

    /**
     * Render loading text centered on the canvas.
     * @internal
     */
    drawLoadingText(text: string): void {
        if (!text) {
            return
        }
        if (!this.canvas) {
            throw new Error('canvas undefined')
        }

        // Compute drawing region from bounds (normalized → pixels)
        const [regionX, regionY, regionW, regionH] = this.getBoundsRegion()

        // Restrict drawing to region
        this.gl.viewport(regionX, regionY, regionW, regionH)
        this.gl.enable(this.gl.CULL_FACE)
        this.gl.enable(this.gl.BLEND)

        // Center text in region
        const cx = regionX + regionW / 2
        const cy = regionY + regionH / 2
        this.drawTextBelow([cx, cy], text, 3)
    }

    /**
     * Render a string of text at specified canvas coordinates with scaling and optional color.
     * @internal
     */
    drawText(xy: number[], str: string, scale = 1, color: Float32List | null = null): void {
        if (this.fontPx <= 0) {
            return
        }
        if (!this.fontShader) {
            throw new Error('fontShader undefined')
        }
        this.fontShader.use(this.gl)
        const size = this.fontPx * scale
        this.gl.enable(this.gl.BLEND)
        this.gl.uniform2f(this.fontShader.uniforms.canvasWidthHeight, this.gl.canvas.width, this.gl.canvas.height)
        if (color === null) {
            color = this.opts.fontColor
        }
        this.gl.uniform4fv(this.fontShader.uniforms.fontColor, color as Float32List)
        let screenPxRange = (size / this.fontMets!.size) * this.fontMets!.distanceRange
        screenPxRange = Math.max(screenPxRange, 1.0) // screenPxRange() must never be lower than 1
        this.gl.uniform1f(this.fontShader.uniforms.screenPxRange, screenPxRange)
        const bytes = new TextEncoder().encode(str)
        this.gl.bindVertexArray(this.genericVAO)
        for (let i = 0; i < str.length; i++) {
            xy[0] += this.drawChar(xy, size, bytes[i])
        }
        this.gl.bindVertexArray(this.unusedVAO)
    }

    /**
     * Draw text right-aligned to the given coordinates, vertically centered on y.
     * @internal
     */
    drawTextRight(xy: number[], str: string, scale = 1, color: number[] | null = null): void {
        // to right of x, vertically centered on y
        if (this.fontPx <= 0) {
            return
        }
        xy[1] -= 0.5 * this.fontPx
        this.drawText(xy, str, scale, color)
    }

    /**
     * Draw text left-aligned to the given coordinates, vertically centered on y.
     * @internal
     */
    drawTextLeft(xy: number[], str: string, scale = 1, color: number[] | null = null): void {
        // to left of x, vertically centered on y
        if (this.fontPx <= 0) {
            return
        }
        const size = this.fontPx * scale
        xy[0] -= this.textWidth(size, str)
        xy[1] -= 0.5 * size
        this.drawText(xy, str, scale, color)
    }

    /**
     * Draw text right-aligned and below the given coordinates.
     * @internal
     */
    drawTextRightBelow(xy: number[], str: string, scale = 1, color: number[] | null = null): void {
        // to right of x, vertically centered on y
        if (this.fontPx <= 0) {
            return
        }

        this.drawText(xy, str, scale, color)
    }

    /**
     * Draw text horizontally centered between start and end points with a semi-transparent background.
     * @internal
     */
    drawTextBetween(startXYendXY: number[], str: string, scale = 1, color: number[] | null = null): void {
        if (this.fontPx <= 0) {
            return
        }
        const pos = UIElementRenderer.calculateTextBetweenPosition(startXYendXY, str, this.fontPx, scale, (size, s) => this.textWidth(size, s))
        const bgColor = UIElementRenderer.getTextBetweenBackgroundColor(color, this.opts.crosshairColor)
        this.drawRect(pos.rectLTWH, bgColor) // background rect
        this.drawText([pos.textX, pos.textY], str, scale, color) // the text
    }

    /**
     * Draw text horizontally centered below a specified (x,y) position with canvas boundary clamping.
     * @internal
     */
    drawTextBelow(xy: number[], str: string, scale = 1, color: number[] | null = null): void {
        if (this.fontPx <= 0) {
            return
        }
        if (!this.canvas) {
            throw new Error('canvas undefined')
        }
        const pos = UIElementRenderer.calculateTextBelowPosition({ xy, str, fontPx: this.fontPx, scale, canvasWidth: this.canvas.width }, (size, s) => this.textWidth(size, s))
        this.drawText([pos.x, pos.y], str, pos.scale, color)
    }

    /**
     * Draw text horizontally centered above the given coordinates.
     * @internal
     */
    drawTextAbove(xy: number[], str: string, scale = 1, color: number[] | null = null): void {
        if (this.fontPx <= 0) {
            return
        }
        if (!this.canvas) {
            throw new Error('canvas undefined')
        }
        const pos = UIElementRenderer.calculateTextAbovePosition({ xy, str, fontPx: this.fontPx, scale, canvasWidth: this.canvas.width }, (size, s) => this.textWidth(size, s))
        this.drawText([pos.x, pos.y], str, pos.scale, color)
    }

    /**
     * Update texture interpolation mode (nearest or linear) for background or overlay layer.
     * @internal
     */
    updateInterpolation(layer: number, isForceLinear = false): void {
        SliceRenderer.updateInterpolation({
            gl: this.gl,
            layer,
            isForceLinear,
            isNearestInterpolation: this.opts.isNearestInterpolation,
            is2DSliceShader: this.opts.is2DSliceShader
        })
    }

    /**
     * Enable or disable atlas outline overlay
     * @param isOutline - number 0 to 1 for outline opacity
     * @see {@link https://niivue.com/demos/features/atlas.sparse.html | live demo usage}
     */
    setAtlasOutline(isOutline: number): void {
        this.opts.atlasOutline = isOutline
        this.updateGLVolume()
        this.drawScene()
    }

    /**
     * select between nearest and linear interpolation for voxel based images
     * @param isNearest - whether nearest neighbor interpolation is used, else linear interpolation
     * @example niivue.setInterpolation(true);
     * @see {@link https://niivue.com/demos/features/draw2.html | live demo usage}
     */
    setInterpolation(isNearest: boolean): void {
        this.opts.isNearestInterpolation = isNearest
        const numLayers = this.volumes.length
        if (numLayers < 1) {
            return
        }
        for (let i = 0; i < numLayers; i++) {
            this.updateInterpolation(i)
        }
        this.drawScene()
    }

    /**
     * Computes 2D model-view-projection and related matrices for rendering a slice of a 3D volume.
     * Configures viewport and accounts for radiological orientation, depth clipping, and camera rotation.
     * @internal
     */
    calculateMvpMatrix2D(leftTopWidthHeight: number[], mn: vec3, mx: vec3, clipTolerance = Infinity, clipDepth = 0, azimuth = 0, elevation = 0, isRadiolgical: boolean = false): MvpMatrix2D {
        const gl = this.gl
        gl.viewport(
            leftTopWidthHeight[0],
            this.gl.canvas.height - (leftTopWidthHeight[1] + leftTopWidthHeight[3]), // lower numbers near bottom
            leftTopWidthHeight[2],
            leftTopWidthHeight[3]
        )
        let left = mn[0]
        let right = mx[0]
        let leftTopMM = [left, mn[1]]
        let fovMM = [right - left, mx[1] - mn[1]]
        if (isRadiolgical) {
            leftTopMM = [mx[0], mn[1]]
            fovMM = [mn[0] - mx[0], mx[1] - mn[1]]
            left = -mx[0]
            right = -mn[0]
        }
        const scale = 2 * Math.max(Math.abs(mn[2]), Math.abs(mx[2])) // 3rd dimension is near/far from camera
        const projectionMatrix = mat4.create()
        let far = 0.01
        let near = scale * 8.0
        if (clipTolerance !== Infinity) {
            let r = isRadiolgical
            if (elevation === 0 && (azimuth === 0 || azimuth === 180)) {
                r = !r
            }
            let dx = scale * 1.8 - clipDepth
            if (!r) {
                dx = scale * 1.8 + clipDepth
            }
            near = dx - clipTolerance
            far = dx + clipTolerance
        }
        mat4.ortho(projectionMatrix, left, right, mn[1], mx[1], near, far)
        const modelMatrix = mat4.create()
        modelMatrix[0] = -1 // mirror X coordinate
        // push the model away from the camera so camera not inside model
        const translateVec3 = vec3.fromValues(0, 0, -scale * 1.8) // to avoid clipping, >= SQRT(3)
        mat4.translate(modelMatrix, modelMatrix, translateVec3)
        // apply elevation
        mat4.rotateX(modelMatrix, modelMatrix, deg2rad(270 - elevation))
        // apply azimuth
        mat4.rotateZ(modelMatrix, modelMatrix, deg2rad(azimuth - 180))
        const iModelMatrix = mat4.create()
        mat4.invert(iModelMatrix, modelMatrix)
        const normalMatrix = mat4.create()
        mat4.transpose(normalMatrix, iModelMatrix)
        const modelViewProjectionMatrix = mat4.create()
        mat4.multiply(modelViewProjectionMatrix, projectionMatrix, modelMatrix)

        return {
            modelViewProjectionMatrix,
            modelMatrix,
            normalMatrix,
            leftTopMM,
            fovMM
        }
    }

    /**
     * Reorders the components of a 3D vector based on the slice orientation (axial, coronal, or sagittal).
     * @internal
     */
    swizzleVec3MM(v3: vec3, axCorSag: SLICE_TYPE): vec3 {
        return CoordTransform.swizzleVec3MM(v3, axCorSag)
    }

    /**
     * Returns the swizzled field of view for the given slice orientation.
     * @internal
     */
    screenFieldOfViewVox(axCorSag = 0): vec3 {
        const fov = vec3.clone(this.volumeObject3D!.fieldOfViewDeObliqueMM!)
        return this.swizzleVec3MM(fov, axCorSag)
    }

    /**
     * Returns the field of view in millimeters for the given slice orientation.
     * @internal
     */
    screenFieldOfViewMM(axCorSag = 0, forceSliceMM = false): vec3 {
        // extent of volume/mesh (in millimeters) in screen space
        if (this.volumes.length < 1) {
            let mnMM = vec3.fromValues(this.extentsMin[0], this.extentsMin[1], this.extentsMin[2])
            let mxMM = vec3.fromValues(this.extentsMax[0], this.extentsMax[1], this.extentsMax[2])
            mnMM = this.swizzleVec3MM(mnMM, axCorSag)
            mxMM = this.swizzleVec3MM(mxMM, axCorSag)
            const fovMM = vec3.create()
            vec3.subtract(fovMM, mxMM, mnMM)
            return fovMM
        }
        if (!forceSliceMM && !this.opts.isSliceMM) {
            // return voxel space
            return this.screenFieldOfViewVox(axCorSag)
        }
        const extentsMin = this.volumeObject3D!.extentsMin
        const extentsMax = this.volumeObject3D!.extentsMax
        let mnMM = vec3.fromValues(extentsMin[0], extentsMin[1], extentsMin[2])
        let mxMM = vec3.fromValues(extentsMax[0], extentsMax[1], extentsMax[2])

        mnMM = this.swizzleVec3MM(mnMM, axCorSag)
        mxMM = this.swizzleVec3MM(mxMM, axCorSag)
        const fovMM = vec3.create()
        vec3.subtract(fovMM, mxMM, mnMM)
        return fovMM
    }

    /**
     * Returns extended voxel-aligned field of view and bounds for the given slice orientation.
     * @internal
     */
    screenFieldOfViewExtendedVox(axCorSag = 0): MM {
        // extent of volume/mesh (in orthographic alignment for rectangular voxels) in screen space
        // let fov = [frac2mmTexture[0], frac2mmTexture[5], frac2mmTexture[10]];
        const extentsMinOrtho = this.volumes[0].extentsMinOrtho!
        const extentsMaxOrtho = this.volumes[0].extentsMaxOrtho!
        let mnMM = vec3.fromValues(extentsMinOrtho[0], extentsMinOrtho[1], extentsMinOrtho[2])
        let mxMM = vec3.fromValues(extentsMaxOrtho[0], extentsMaxOrtho[1], extentsMaxOrtho[2])
        const rotation = mat4.create() // identity matrix: 2D axial screenXYZ = nifti [i,j,k]
        mnMM = this.swizzleVec3MM(mnMM, axCorSag)
        mxMM = this.swizzleVec3MM(mxMM, axCorSag)
        const fovMM = vec3.create()
        vec3.subtract(fovMM, mxMM, mnMM)
        return { mnMM, mxMM, rotation, fovMM }
    }

    /**
     * Returns extended millimeter-aligned field of view and bounds for the given slice orientation.
     * @internal
     */
    screenFieldOfViewExtendedMM(axCorSag = 0): MM {
        if (this.volumes.length < 1) {
            let mnMM = vec3.fromValues(this.extentsMin[0], this.extentsMin[1], this.extentsMin[2])
            let mxMM = vec3.fromValues(this.extentsMax[0], this.extentsMax[1], this.extentsMax[2])
            const rotation = mat4.create() // identity matrix: 2D axial screenXYZ = nifti [i,j,k]
            mnMM = this.swizzleVec3MM(mnMM, axCorSag)
            mxMM = this.swizzleVec3MM(mxMM, axCorSag)
            const fovMM = vec3.create()
            vec3.subtract(fovMM, mxMM, mnMM)
            return { mnMM, mxMM, rotation, fovMM }
        }
        if (!this.volumeObject3D) {
            throw new Error('volumeObject3D undefined')
        }
        // extent of volume/mesh (in millimeters) in screen space
        // TODO align types
        const eMin = this.volumeObject3D.extentsMin
        const eMax = this.volumeObject3D.extentsMax
        let mnMM = vec3.fromValues(eMin[0], eMin[1], eMin[2])
        let mxMM = vec3.fromValues(eMax[0], eMax[1], eMax[2])
        const rotation = mat4.create() // identity matrix: 2D axial screenXYZ = nifti [i,j,k]
        mnMM = this.swizzleVec3MM(mnMM, axCorSag)
        mxMM = this.swizzleVec3MM(mxMM, axCorSag)
        const fovMM = vec3.create()
        vec3.subtract(fovMM, mxMM, mnMM)
        return { mnMM, mxMM, rotation, fovMM }
    }

    /**
     * Draws anatomical orientation labels (e.g., A/P/L/R) for the given slice view.
     * @internal
     */
    drawSliceOrientationText(leftTopWidthHeight: number[], axCorSag: SLICE_TYPE, padLeftTop: number[] = [NaN, NaN]): void {
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
        let topText = 'S'
        if (axCorSag === SLICE_TYPE.AXIAL) {
            topText = 'A'
        }
        let leftText = this.opts.isRadiologicalConvention ? 'R' : 'L'
        if (axCorSag === SLICE_TYPE.SAGITTAL) {
            leftText = this.opts.sagittalNoseLeft ? 'A' : 'P'
        }

        // Calculate opposite orientations for all-marker mode
        let bottomText = 'I' // opposite of 'S' (Superior -> Inferior)
        if (axCorSag === SLICE_TYPE.AXIAL) {
            bottomText = 'P' // opposite of 'A' (Anterior -> Posterior)
        }

        let rightText = this.opts.isRadiologicalConvention ? 'L' : 'R' // opposite of left
        if (axCorSag === SLICE_TYPE.SAGITTAL) {
            rightText = this.opts.sagittalNoseLeft ? 'P' : 'A' // opposite of left
        }

        if (this.opts.isCornerOrientationText) {
            this.drawTextRightBelow([leftTopWidthHeight[0], leftTopWidthHeight[1]], leftText + topText)
            return
        }
        let drawBelow = true
        let drawRight = true
        const drawAbove = this.opts.showAllOrientationMarkers
        const drawLeft = this.opts.showAllOrientationMarkers

        if (!isNaN(padLeftTop[0])) {
            const ht = this.fontPx + 2
            if (padLeftTop[1] > ht) {
                this.drawTextBelow([leftTopWidthHeight[0] + leftTopWidthHeight[2] * 0.5, leftTopWidthHeight[1] + padLeftTop[1] - ht], topText)
                drawBelow = false
            }
            const wid = this.textWidth(ht, leftText) + 2
            if (padLeftTop[0] > wid) {
                this.drawTextRight([leftTopWidthHeight[0] + padLeftTop[0] - wid, leftTopWidthHeight[1] + leftTopWidthHeight[3] * 0.5], leftText)
                drawRight = false
            }
        }
        if (drawBelow) {
            this.drawTextBelow([leftTopWidthHeight[0] + leftTopWidthHeight[2] * 0.5, leftTopWidthHeight[1]], topText)
        }
        if (drawRight) {
            this.drawTextRight([leftTopWidthHeight[0], leftTopWidthHeight[1] + leftTopWidthHeight[3] * 0.5], leftText)
        }

        // Draw additional markers when all markers are enabled
        if (drawAbove) {
            this.drawTextAbove([leftTopWidthHeight[0] + leftTopWidthHeight[2] * 0.5, leftTopWidthHeight[1] + leftTopWidthHeight[3]], bottomText)
        }
        if (drawLeft) {
            this.drawTextLeft([leftTopWidthHeight[0] + leftTopWidthHeight[2], leftTopWidthHeight[1] + leftTopWidthHeight[3] * 0.5], rightText)
        }
    }

    /**
     * Computes a plane in mm space for a given slice orientation and depth.
     * @internal
     */
    xyMM2xyzMM(axCorSag: SLICE_TYPE, sliceFrac: number): number[] {
        return LayoutManager.calculateXyMM2xyzMM({
            axCorSag,
            sliceFrac,
            frac2mm: (frac: [number, number, number]) => this.frac2mm(frac),
            swizzleVec3MM: (v3: vec3, acs: SLICE_TYPE) => this.swizzleVec3MM(v3, acs)
        })
    }

    /**
     * Draw a 2D slice tile with appropriate orientation, zoom, pan, and optional mesh overlay.
     * @internal
     */
    draw2DMain(leftTopWidthHeight: number[], axCorSag: SLICE_TYPE, customMM = NaN): void {
        let frac2mmTexture = new Float32Array([0, 0, 0])
        if (this.volumes.length > 0) {
            frac2mmTexture = new Float32Array(this.volumes[0].frac2mm!.slice())
        }
        let screen = this.screenFieldOfViewExtendedMM(axCorSag)
        let mesh2ortho = mat4.create()
        if (!this.opts.isSliceMM && this.volumes.length > 0) {
            frac2mmTexture = new Float32Array(this.volumes[0].frac2mmOrtho!.slice())
            mesh2ortho = mat4.clone(this.volumes[0].mm2ortho!)
            screen = this.screenFieldOfViewExtendedVox(axCorSag)
        }
        let isRadiolgical = this.opts.isRadiologicalConvention && axCorSag < SLICE_TYPE.SAGITTAL
        if (customMM === Infinity || customMM === -Infinity) {
            isRadiolgical = customMM !== Infinity
            if (axCorSag === SLICE_TYPE.CORONAL) {
                isRadiolgical = !isRadiolgical
            }
        } else if (this.opts.sagittalNoseLeft && axCorSag === SLICE_TYPE.SAGITTAL) {
            isRadiolgical = !isRadiolgical
        }
        let elevation = 0
        let azimuth = 0
        if (axCorSag === SLICE_TYPE.SAGITTAL) {
            azimuth = isRadiolgical ? 90 : -90
        } else if (axCorSag === SLICE_TYPE.CORONAL) {
            azimuth = isRadiolgical ? 180 : 0
        } else {
            azimuth = isRadiolgical ? 180 : 0
            elevation = isRadiolgical ? -90 : 90
        }
        const gl = this.gl
        let isStretchToScreen = false
        if (leftTopWidthHeight[2] === 0 || leftTopWidthHeight[3] === 0) {
            // only one tile: stretch tile to fill whole screen.
            isStretchToScreen = true
            const pixPerMMw = gl.canvas.width / screen.fovMM[0]
            const pixPerMMh = gl.canvas.height / screen.fovMM[1]
            const pixPerMMmin = Math.min(pixPerMMw, pixPerMMh)
            const zoomW = pixPerMMw / pixPerMMmin
            const zoomH = pixPerMMh / pixPerMMmin
            screen.fovMM[0] *= zoomW
            screen.fovMM[1] *= zoomH
            let center = (screen.mnMM[0] + screen.mxMM[0]) * 0.5
            screen.mnMM[0] = center - screen.fovMM[0] * 0.5
            screen.mxMM[0] = center + screen.fovMM[0] * 0.5
            center = (screen.mnMM[1] + screen.mxMM[1]) * 0.5
            screen.mnMM[1] = center - screen.fovMM[1] * 0.5
            screen.mxMM[1] = center + screen.fovMM[1] * 0.5
            // screen.mnMM[0] *= zoomW;
            // screen.mxMM[0] *= zoomW;
            // screen.mnMM[1] *= zoomH;
            // screen.mxMM[1] *= zoomH;
            leftTopWidthHeight = [0, 0, gl.canvas.width, gl.canvas.height]
        }
        if (isNaN(customMM)) {
            const pan = this.scene.pan2Dxyzmm
            const panXY = this.swizzleVec3MM(vec3.fromValues(pan[0], pan[1], pan[2]), axCorSag)
            const zoom = this.scene.pan2Dxyzmm[3]
            screen.mnMM[0] -= panXY[0]
            screen.mxMM[0] -= panXY[0]
            screen.mnMM[1] -= panXY[1]
            screen.mxMM[1] -= panXY[1]
            screen.mnMM[0] /= zoom
            screen.mxMM[0] /= zoom
            screen.mnMM[1] /= zoom
            screen.mxMM[1] /= zoom
        }

        let sliceDim = 2 // axial depth is NIfTI k dimension
        if (axCorSag === SLICE_TYPE.CORONAL) {
            sliceDim = 1
        } // sagittal depth is NIfTI j dimension
        if (axCorSag === SLICE_TYPE.SAGITTAL) {
            sliceDim = 0
        } // sagittal depth is NIfTI i dimension
        let sliceFrac = this.scene.crosshairPos[sliceDim]
        let mm = this.frac2mm(this.scene.crosshairPos)
        if (!isNaN(customMM) && customMM !== Infinity && customMM !== -Infinity) {
            mm = this.frac2mm([0.5, 0.5, 0.5])
            mm[sliceDim] = customMM
            const frac = this.mm2frac(mm)
            sliceFrac = frac[sliceDim]
        }
        const sliceMM = mm[sliceDim]
        const flippedY = gl.canvas.height - leftTopWidthHeight[1] - leftTopWidthHeight[3]
        const glLTWH: [number, number, number, number] = [leftTopWidthHeight[0], flippedY, leftTopWidthHeight[2], leftTopWidthHeight[3]]

        // Clear only depth inside this rect
        this.clearBounds(gl.DEPTH_BUFFER_BIT, glLTWH)

        // Set viewport to this rect
        gl.viewport(glLTWH[0], glLTWH[1], glLTWH[2], glLTWH[3])

        let obj = this.calculateMvpMatrix2D(leftTopWidthHeight, screen.mnMM, screen.mxMM, Infinity, 0, azimuth, elevation, isRadiolgical)
        if (customMM === Infinity || customMM === -Infinity) {
            // draw rendering
            const ltwh = leftTopWidthHeight.slice()
            this.draw3D(leftTopWidthHeight, obj.modelViewProjectionMatrix, obj.modelMatrix, obj.normalMatrix, azimuth, elevation)
            const tile = this.screenSlices[this.screenSlices.length - 1]
            // tile.AxyzMxy = this.xyMM2xyzMM(axCorSag, 0.5);
            tile.leftTopWidthHeight = ltwh
            tile.axCorSag = axCorSag
            tile.sliceFrac = Infinity // use infinity to denote this is a rendering, not slice: not one depth
            tile.AxyzMxy = this.xyMM2xyzMM(axCorSag, sliceFrac)
            tile.leftTopMM = obj.leftTopMM
            tile.fovMM = obj.fovMM
            return
        }
        gl.enable(gl.DEPTH_TEST)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        // draw the slice
        gl.disable(gl.BLEND)
        gl.depthFunc(gl.ALWAYS)
        gl.disable(gl.CULL_FACE) // show front and back faces
        if (this.volumes.length > 0) {
            let shader = this.sliceMMShader
            if (this.opts.is2DSliceShader) {
                shader = this.slice2DShader
            }
            if (this.opts.isV1SliceShader) {
                shader = this.sliceV1Shader
            }
            if (this.customSliceShader) {
                shader = this.customSliceShader
            }
            if (!shader) {
                throw new Error('slice Shader undefined')
            }
            shader.use(this.gl)
            gl.uniform1f(shader.uniforms.overlayOutlineWidth, this.overlayOutlineWidth)
            gl.uniform1f(shader.uniforms.overlayAlphaShader, this.overlayAlphaShader)
            gl.uniform1i(shader.uniforms.isAlphaClipDark, this.isAlphaClipDark ? 1 : 0)
            gl.uniform1i(shader.uniforms.backgroundMasksOverlays, this.backgroundMasksOverlays)
            gl.uniform1f(shader.uniforms.drawOpacity, this.drawOpacity)
            gl.uniform1f(shader.uniforms.drawRimOpacity, this.drawRimOpacity)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
            gl.uniform1f(shader.uniforms.opacity, this.volumes[0].opacity)
            gl.uniform1i(shader.uniforms.axCorSag, axCorSag)
            gl.uniform1f(shader.uniforms.slice, sliceFrac)
            gl.uniformMatrix4fv(
                shader.uniforms.frac2mm,
                false,
                frac2mmTexture // this.volumes[0].frac2mm
            )
            gl.uniformMatrix4fv(shader.uniforms.mvpMtx, false, obj.modelViewProjectionMatrix.slice())
            gl.bindVertexArray(this.genericVAO) // set vertex attributes
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            gl.bindVertexArray(this.unusedVAO) // set vertex attributes
            // record screenSlices to detect mouse click positions
            this.screenSlices.push({
                leftTopWidthHeight,
                axCorSag,
                sliceFrac,
                AxyzMxy: this.xyMM2xyzMM(axCorSag, sliceFrac),
                leftTopMM: obj.leftTopMM,
                screen2frac: [],
                fovMM: obj.fovMM
            })
        }
        gl.depthMask(true)
        gl.depthFunc(gl.LEQUAL)
        if (isNaN(customMM)) {
            // draw crosshairs
            this.drawCrosshairs3D(true, 1.0, obj.modelViewProjectionMatrix, true, this.opts.isSliceMM)
        }
        // TODO handle "infinity" for meshThicknessOn2D
        if ((this.opts.meshThicknessOn2D as number) > 0.0) {
            if (this.opts.meshThicknessOn2D !== Infinity) {
                obj = this.calculateMvpMatrix2D(leftTopWidthHeight, screen.mnMM, screen.mxMM, this.opts.meshThicknessOn2D as number, sliceMM, azimuth, elevation, isRadiolgical)
            }
            // we may need to transform mesh vertices to the orthogonal voxel space
            const mx = mat4.clone(obj.modelViewProjectionMatrix)
            mat4.multiply(mx, mx, mesh2ortho)
            this.drawMesh3D(
                true,
                1,
                mx, // obj.modelViewProjectionMatrix,
                obj.modelMatrix,
                obj.normalMatrix,
                true
            )
        }
        if (isNaN(customMM)) {
            // no crossbars for mosaic view
            this.drawCrosshairs3D(false, 0.15, obj.modelViewProjectionMatrix, true, this.opts.isSliceMM)
        }
        if (isStretchToScreen && this.opts.isOrientationTextVisible) {
            // issue1065
            this.drawSliceOrientationText(leftTopWidthHeight, axCorSag)
        }
        this.readyForSync = true
    }

    /**
     * Draw a 2D slice tile with optional custom size and orientation text.
     * @internal
     */
    draw2D(leftTopWidthHeight: number[], axCorSag: SLICE_TYPE, customMM = NaN, imageWidthHeight: number[] = [NaN, NaN]): void {
        const [regionX, regionY, regionW, regionH] = this.getBoundsRegion()

        // Decide which rect to use
        let ltwh: number[]
        if (leftTopWidthHeight[2] === 0 && leftTopWidthHeight[3] === 0) {
            if (!this.opts.bounds) {
                // Case 1: no bounds, no rect → full canvas
                ltwh = [0, 0, this.gl.canvas.width, this.gl.canvas.height]
            } else {
                // Case 2: bounds present, no rect → full bounds region
                ltwh = [regionX, regionY, regionW, regionH]
            }
        } else {
            // Case 3: rect provided (multiplanar) → already offset into bounds
            ltwh = leftTopWidthHeight.slice()
        }

        const padLeftTop = [NaN, NaN]

        if (imageWidthHeight[0] === Infinity) {
            const volScale = this.sliceScale().volScale
            let scale = this.scaleSlice(volScale[0], volScale[1], [0, 0], [ltwh[2], ltwh[3]])
            if (axCorSag === SLICE_TYPE.CORONAL) {
                scale = this.scaleSlice(volScale[0], volScale[2], [0, 0], [ltwh[2], ltwh[3]])
            }
            if (axCorSag === SLICE_TYPE.SAGITTAL) {
                scale = this.scaleSlice(volScale[1], volScale[2], [0, 0], [ltwh[2], ltwh[3]])
            }
            imageWidthHeight[0] = scale[2]
            imageWidthHeight[1] = scale[3]
        }

        if (isNaN(imageWidthHeight[0])) {
            this.draw2DMain(ltwh, axCorSag, customMM)
        } else {
            // inset as padded in tile
            padLeftTop[0] = Math.floor(0.5 * (ltwh[2] - imageWidthHeight[0]))
            padLeftTop[1] = Math.floor(0.5 * (ltwh[3] - imageWidthHeight[1]))
            ltwh[0] += padLeftTop[0]
            ltwh[1] += padLeftTop[1]
            ltwh[2] = imageWidthHeight[0]
            ltwh[3] = imageWidthHeight[1]
            this.draw2DMain(ltwh, axCorSag, customMM)
        }

        if (customMM === Infinity || customMM === -Infinity || axCorSag === SLICE_TYPE.RENDER) {
            return
        }

        if (ltwh[2] !== 0 && ltwh[3] !== 0 && this.opts.isOrientationTextVisible) {
            this.drawSliceOrientationText(ltwh, axCorSag, padLeftTop)
        }
    }

    /**
     * Build MVP, Model, and Normal matrices for rendering.
     * Note: 3D MVP is identical for radiological and neurological conventions.
     * @param _unused - Reserved for future use.
     * @param leftTopWidthHeight - Viewport rectangle [x, y, w, h] in device pixels.
     * @param azimuth - Azimuth rotation in degrees.
     * @param elevation - Elevation rotation in degrees.
     * @internal
     */
    calculateMvpMatrix(_unused: unknown, leftTopWidthHeight = [0, 0, 0, 0], azimuth: number, elevation: number): mat4[] {
        const result = SceneRenderer.calculateMvpMatrix({
            canvasWidth: this.gl.canvas.width,
            canvasHeight: this.gl.canvas.height,
            leftTopWidthHeight,
            azimuth,
            elevation,
            furthestFromPivot: this.furthestFromPivot,
            pivot3D: this.pivot3D,
            volScaleMultiplier: this.scene.volScaleMultiplier,
            position: this.position
        })
        return [result.mvpMatrix, result.modelMatrix, result.normalMatrix]
    }

    /**
     * Computes the model transformation matrix for the given azimuth and elevation.
     * Applies optional oblique RAS rotation if available.
     * @internal
     */
    calculateModelMatrix(azimuth: number, elevation: number): mat4 {
        if (!this.back) {
            throw new Error('back undefined')
        }
        return VolumeRenderer.calculateModelMatrix({
            azimuth,
            elevation,
            obliqueRAS: this.back.obliqueRAS
        })
    }

    /**
     * Returns the normalized near-to-far ray direction for the given view angles.
     * Ensures components are nonzero to avoid divide-by-zero errors.
     * n.b. volumes can have shear (see shear.html), so invert instead of transpose
     * @internal
     */
    calculateRayDirection(azimuth: number, elevation: number): vec3 {
        return VolumeRenderer.calculateRayDirection({
            azimuth,
            elevation,
            obliqueRAS: this.back?.obliqueRAS
        })
    }

    /**
     * Returns the scene's min, max, and range extents in mm or voxel space.
     * Includes both volume and mesh geometry.
     * @internal
     */
    sceneExtentsMinMax(isSliceMM = true): vec3[] {
        return CoordTransform.sceneExtentsMinMax(
            {
                volumes: this.volumes,
                meshes: this.meshes,
                volumeObject3D: this.volumeObject3D
            },
            isSliceMM
        )
    }

    /**
     * Sets the 3D pivot point and scene scale based on volume and mesh extents.
     * @internal
     */
    setPivot3D(): void {
        // compute extents of all volumes and meshes in scene
        // pivot around center of these.
        const [mn, mx] = this.sceneExtentsMinMax()
        const result = SceneRenderer.calculatePivot3D({ sceneMin: mn, sceneMax: mx })
        this.pivot3D = result.pivot3D
        this.furthestFromPivot = result.furthestFromPivot
        this.extentsMin = result.extentsMin
        this.extentsMax = result.extentsMax
    }

    /**
     * Returns the maximum number of 4D volumes across all loaded images.
     * @internal
     */
    getMaxVols(): number {
        return SceneRenderer.getMaxVols({ volumes: this.volumes })
    }

    /**
     * Returns true if any loaded 4D volume is missing frames.
     * @internal
     */
    detectPartialllyLoaded4D(): boolean {
        if (this.volumes.length < 1) {
            return false
        }
        for (let i = 0; i < this.volumes.length; i++) {
            if (this.volumes[i].nFrame4D! < this.volumes[i].hdr!.dims[4]) {
                return true
            }
        }
        return false
    }

    /**
     * Draws a graph of 4D volume intensity over time at the current crosshair position.
     * Skips if volume is 3D, region is too small, or graph opacity is zero.
     * @internal
     */
    drawGraph(): void {
        if (this.getMaxVols() < 2) {
            return
        }
        const graph = this.graph

        // --- Bounds region (normalized → pixels)
        const [regionX, regionY, regionW, regionH] = this.getBoundsRegion()

        // --- Auto-place graph in multiplanar layout
        let axialTop = 0
        if (graph.autoSizeMultiplanar && this.opts.sliceType === SLICE_TYPE.MULTIPLANAR) {
            for (let i = 0; i < this.screenSlices.length; i++) {
                const axCorSag = this.screenSlices[i].axCorSag
                if (axCorSag === SLICE_TYPE.AXIAL) {
                    axialTop = this.screenSlices[i].leftTopWidthHeight[1]
                }
                if (axCorSag !== SLICE_TYPE.SAGITTAL) {
                    continue
                }
                const ltwh = this.screenSlices[i].leftTopWidthHeight.slice()
                if (ltwh[1] === axialTop) {
                    graph.LTWH[0] = ltwh[0] + ltwh[2]
                    graph.LTWH[1] = ltwh[1]
                } else {
                    graph.LTWH[0] = ltwh[0]
                    graph.LTWH[1] = ltwh[1] + ltwh[3]
                }
                graph.LTWH[2] = ltwh[2]
                graph.LTWH[3] = ltwh[2]
            }
        }

        // --- Clip LTWH into region
        graph.LTWH[0] = Math.max(regionX, graph.LTWH[0])
        graph.LTWH[1] = Math.max(regionY, graph.LTWH[1])
        graph.LTWH[2] = Math.min(regionW, graph.LTWH[2])
        graph.LTWH[3] = Math.min(regionH, graph.LTWH[3])

        if (
            graph.opacity <= 0.0 ||
            graph.LTWH[2] <= 5 ||
            graph.LTWH[3] <= 5 ||
            Math.floor(graph.LTWH[0] + graph.LTWH[2]) > regionX + regionW ||
            Math.floor(graph.LTWH[1] + graph.LTWH[3]) > regionY + regionH
        ) {
            return
        }

        // --- Background colors based on backColor brightness
        graph.backColor = [0.15, 0.15, 0.15, graph.opacity]
        graph.lineColor = [1, 1, 1, 1]
        if (this.opts.backColor[0] + this.opts.backColor[1] + this.opts.backColor[2] > 1.5) {
            graph.backColor = [0.95, 0.95, 0.95, graph.opacity]
            graph.lineColor = [0, 0, 0, 1]
        }
        const gridLineAlpha = 0.2
        const selectedLineAlpha = 0.3
        graph.lineColor[3] = gridLineAlpha
        graph.textColor = graph.lineColor.slice()
        graph.textColor[3] = 1
        graph.lineThickness = 3
        graph.gridLineThickness = 1
        graph.lineAlpha = 1
        graph.lines = []

        // --- Collect volumes to plot
        const vols: number[] = []
        if (graph.vols.length < 1) {
            if (this.volumes[0] != null) {
                vols.push(0)
            }
        } else {
            for (let i = 0; i < graph.vols.length; i++) {
                const j = graph.vols[i]
                if (this.volumes[j] == null) {
                    continue
                }
                const n = this.volumes[j].nFrame4D!
                if (n < 2) {
                    continue
                }
                vols.push(j)
            }
        }
        if (vols.length < 1) {
            return
        }

        const maxVols = this.volumes[vols[0]].nFrame4D!
        this.graph.selectedColumn = this.volumes[vols[0]].frame4D
        if (maxVols < 2) {
            log.debug('Unable to generate a graph: Selected volume is 3D not 4D')
            return
        }

        for (let i = 0; i < vols.length; i++) {
            graph.lines[i] = []
            const vox = this.frac2vox(this.scene.crosshairPos)
            const v = this.volumes[vols[i]]
            let n = v.nFrame4D
            n = Math.min(n!, maxVols)
            for (let j = 0; j < n; j++) {
                const val = v.getValue(vox[0], vox[1], vox[2], j)
                graph.lines[i].push(val)
            }
        }
        graph.lineRGB = [
            [0.8, 0, 0],
            [0, 0.7, 0],
            [0, 0, 0.9],
            [0.7, 0.7, 0],
            [0.8, 0, 0.8],
            [0, 0.7, 0.7],
            [0.6, 0.6, 0.6],
            [0, 0, 0]
        ]

        // --- find min/max
        let mn = graph.lines[0][0]
        let mx = graph.lines[0][0]
        for (let j = 0; j < graph.lines.length; j++) {
            for (let i = 0; i < graph.lines[j].length; i++) {
                const v = graph.lines[j][i]
                mn = Math.min(v, mn)
                mx = Math.max(v, mx)
            }
        }
        const volMn = this.volumes[vols[0]].cal_min
        const volMx = this.volumes[vols[0]].cal_max
        if (graph.isRangeCalMinMax && volMn < volMx && isFinite(volMn) && isFinite(volMx)) {
            mn = volMn
            mx = volMx
        }
        if (graph.normalizeValues && mx > mn) {
            const range = mx - mn
            for (let j = 0; j < graph.lines.length; j++) {
                for (let i = 0; i < graph.lines[j].length; i++) {
                    const v = graph.lines[j][i]
                    graph.lines[j][i] = (v - mn) / range
                }
            }
            mn = 0
            mx = 1
        }
        if (mn >= mx) {
            mx = mn + 1.0
        }

        // --- Draw graph frame
        this.drawRect(graph.LTWH, graph.backColor)
        const [spacing, ticMin, ticMax] = tickSpacing(mn, mx)
        const digits = Math.max(0, -1 * Math.floor(Math.log(spacing) / Math.log(10)))
        mn = Math.min(ticMin, mn)
        mx = Math.max(ticMax, mx)

        // --- Font scaling based on region size
        function humanize(x: number): string {
            return x.toFixed(6).replace(/\.?0*$/, '')
        }
        let fntSize = this.fontPx * 0.7
        const screenWidthPts = regionW / this.uiData.dpr
        const screenHeightPts = regionH / this.uiData.dpr
        const screenAreaPts = screenWidthPts * screenHeightPts
        const refAreaPts = 800 * 600
        if (screenAreaPts < refAreaPts) {
            fntSize = 0
        } else {
            fntSize = Math.max(fntSize, this.opts.fontMinPx)
        }
        const fntScale = fntSize / this.fontPx
        let maxTextWid = 0
        let lineH = ticMin
        // determine widest label in vertical axis
        if (fntSize > 0) {
            while (lineH <= mx) {
                const str = lineH.toFixed(digits)
                const w = this.textWidth(fntSize, str)
                maxTextWid = Math.max(w, maxTextWid)
                lineH += spacing
            }
        }
        const margin = 0.05
        // frame is the entire region including labels, plot is the inner lines
        const frameWid = Math.abs(graph.LTWH[2])
        const frameHt = Math.abs(graph.LTWH[3])
        // plot is region where lines are drawn
        const plotLTWH = [
            graph.LTWH[0] + margin * frameWid + maxTextWid,
            graph.LTWH[1] + margin * frameHt,
            graph.LTWH[2] - maxTextWid - 2 * margin * frameWid,
            graph.LTWH[3] - fntSize - 2.5 * margin * frameHt
        ]
        this.graph.LTWH = graph.LTWH
        this.graph.plotLTWH = plotLTWH
        this.drawRect(plotLTWH, this.opts.backColor) // this.opts.backColor
        // draw horizontal lines
        const rangeH = mx - mn
        const scaleH = plotLTWH[3] / rangeH
        const scaleW = plotLTWH[2] / (graph.lines[0].length - 1)
        const plotBottom = plotLTWH[1] + plotLTWH[3]
        // draw thin horizontal lines
        lineH = ticMin + 0.5 * spacing
        const thinColor = graph.lineColor.slice()
        thinColor[3] = 0.5 * graph.lineColor[3]
        while (lineH <= mx) {
            const y = plotBottom - (lineH - mn) * scaleH
            this.drawLine([plotLTWH[0], y, plotLTWH[0] + plotLTWH[2], y], graph.gridLineThickness, thinColor)
            lineH += spacing
        }
        lineH = ticMin
        // draw thick horizontal lines
        const halfThick = 0.5 * graph.gridLineThickness
        while (lineH <= mx) {
            const y = plotBottom - (lineH - mn) * scaleH
            this.drawLine([plotLTWH[0] - halfThick, y, plotLTWH[0] + plotLTWH[2] + graph.gridLineThickness, y], graph.gridLineThickness, graph.lineColor)
            const str = lineH.toFixed(digits)
            if (fntSize > 0) {
                this.drawTextLeft([plotLTWH[0] - 6, y], str, fntScale, graph.textColor)
            }
            // this.drawTextRight([plotLTWH[0], y], str, fntScale)
            lineH += spacing
        }
        // draw vertical lines
        let stride = 1 // e.g. how frequent are vertical lines
        while (graph.lines[0].length / stride > 20) {
            stride *= 5
        }
        for (let i = 0; i < graph.lines[0].length; i += stride) {
            const x = i * scaleW + plotLTWH[0]
            let thick = graph.gridLineThickness
            if (i % 2 === 1) {
                thick *= 0.5
                this.drawLine([x, plotLTWH[1], x, plotLTWH[1] + plotLTWH[3]], thick, thinColor)
            } else {
                const str = humanize(i)
                if (fntSize > 0) {
                    this.drawTextBelow([x, 2 + plotLTWH[1] + plotLTWH[3]], str, fntScale, graph.textColor)
                }
                this.drawLine([x, plotLTWH[1], x, plotLTWH[1] + plotLTWH[3]], thick, graph.lineColor)
            }
        }
        // graph the lines for intensity across time
        for (let j = 0; j < graph.lines.length; j++) {
            let lineRGBA = [1, 0, 0, graph.lineAlpha]
            if (j < graph.lineRGB.length) {
                lineRGBA = [graph.lineRGB[j][0], graph.lineRGB[j][1], graph.lineRGB[j][2], graph.lineAlpha]
            }
            for (let i = 1; i < graph.lines[j].length; i++) {
                const x0 = (i - 1) * scaleW //
                const x1 = i * scaleW
                const y0 = (graph.lines[j][i - 1] - mn) * scaleH
                const y1 = (graph.lines[j][i] - mn) * scaleH
                // let LTWH = [plotLTWH[0]+x0, plotLTWH[1]+plotLTWH[3]-y0, plotLTWH[0]+x1, -(y1-y0)];
                const LTWH = [plotLTWH[0] + x0, plotLTWH[1] + plotLTWH[3] - y0, plotLTWH[0] + x1, plotLTWH[1] + plotLTWH[3] - y1]
                this.drawLine(LTWH, graph.lineThickness, lineRGBA)
            }
        }
        // draw vertical line indicating selected volume
        if (graph.selectedColumn! >= 0 && graph.selectedColumn! < graph.lines[0].length) {
            const x = graph.selectedColumn! * scaleW + plotLTWH[0]
            this.drawLine([x, plotLTWH[1], x, plotLTWH[1] + plotLTWH[3]], graph.lineThickness, [graph.lineRGB[0][0], graph.lineRGB[0][1], graph.lineRGB[0][2], selectedLineAlpha])
        }
        // add label 'Volume' below graph if there is space in the plot
        if (fntSize > 0 && graph.LTWH[1] + graph.LTWH[3] > plotLTWH[1] + plotLTWH[3] + fntSize * 2.4) {
            this.drawTextBelow([plotLTWH[0] + 0.5 * plotLTWH[2], plotLTWH[1] + plotLTWH[3] + fntSize * 1.2], 'Volume', fntScale, graph.textColor)
        }
        if (this.detectPartialllyLoaded4D()) {
            this.drawTextBelow([plotLTWH[0] + plotLTWH[2], plotLTWH[1] + plotLTWH[3] + fntSize * 0.5], '...', fntScale, graph.textColor)
        }
    }

    /**
     * Updates crosshair position using depth-based mouse picking from screen pixel color.
     * Only active when depth picking is enabled.
     * @internal
     */
    depthPicker(leftTopWidthHeight: number[], mvpMatrix: mat4): void {
        // use color of screen pixel to infer X,Y,Z coordinates
        if (!this.uiData.mouseDepthPicker) {
            return
        }
        // start PICKING: picking shader and reading values is slow
        this.uiData.mouseDepthPicker = false
        const gl = this.gl
        const pixelX = (this.mousePos[0] * leftTopWidthHeight[2]) / leftTopWidthHeight[2]
        const pixelY = gl.canvas.height - (this.mousePos[1] * leftTopWidthHeight[3]) / leftTopWidthHeight[3] - 1
        const rgbaPixel = new Uint8Array(4)
        gl.readPixels(
            pixelX, // x
            pixelY, // y
            1, // width
            1, // height
            gl.RGBA, // format
            gl.UNSIGNED_BYTE, // type
            rgbaPixel
        ) // typed array to hold result
        this.selectedObjectId = rgbaPixel[3]
        if (this.selectedObjectId === this.VOLUME_ID) {
            this.scene.crosshairPos = new Float32Array(rgbaPixel.slice(0, 3)).map((x) => x / 255.0)
            return
        }
        const depthZ = unpackFloatFromVec4i(rgbaPixel)
        if (depthZ > 1.0) {
            return
        }
        const fracX = (this.mousePos[0] - leftTopWidthHeight[0]) / leftTopWidthHeight[2]
        const fracY = (gl.canvas.height - this.mousePos[1] - leftTopWidthHeight[1]) / leftTopWidthHeight[3]
        // todo: check when top is not zero: leftTopWidthHeight[1]
        const mm = unProject(fracX, fracY, depthZ, mvpMatrix)
        // n.b. true as renderings are ALWAYS in MM world space. not fractional
        const frac = this.mm2frac(mm, 0, true)
        if (frac[0] < 0 || frac[0] > 1 || frac[1] < 0 || frac[1] > 1 || frac[2] < 0 || frac[2] > 1) {
            return
        }
        this.scene.crosshairPos = this.mm2frac(mm, 0, true)
    }

    /**
     * Render a 3D volume visualization of the current NVImage using provided transformation matrices and angles.
     * @internal
     */
    drawImage3D(mvpMatrix: mat4, azimuth: number, elevation: number): void {
        VolumeRenderer.drawImage3D({
            gl: this.gl,
            mvpMatrix,
            azimuth,
            elevation,
            volumesLength: this.volumes.length,
            volumeObject3D: this.volumeObject3D,
            unusedVAO: this.unusedVAO,
            renderShader: this.renderShader!,
            pickingImageShader: this.pickingImageShader!,
            mouseDepthPicker: this.uiData.mouseDepthPicker,
            backgroundMasksOverlays: this.backgroundMasksOverlays,
            gradientTextureAmount: this.gradientTextureAmount,
            gradientTexture: this.gradientTexture,
            drawBitmap: this.drawBitmap,
            renderDrawAmbientOcclusion: this.renderDrawAmbientOcclusion,
            drawOpacity: this.drawOpacity,
            paqdUniforms: this.opts.paqdUniforms,
            matRAS: this.back!.matRAS!,
            crosshairPos: this.scene.crosshairPos,
            clipPlaneDepthAziElevs: this.scene.clipPlaneDepthAziElevs,
            isClipPlanesCutaway: this.opts.isClipPlanesCutaway,
            obliqueRAS: this.back?.obliqueRAS
        })
    }

    /**
     * Draw a small orientation cube indicating L/R, A/P, I/S directions in the given tile area with specified azimuth and elevation.
     * @internal
     */
    drawOrientationCube(leftTopWidthHeight: number[], azimuth = 0, elevation = 0): void {
        if (!this.opts.isOrientCube) {
            return
        }
        const sz = 0.05 * Math.min(leftTopWidthHeight[2], leftTopWidthHeight[3])
        if (sz < 5) {
            return
        }
        const gl = this.gl
        gl.enable(gl.CULL_FACE)
        gl.cullFace(gl.BACK)
        // turn off depth test so letters overwrite cube
        gl.disable(gl.DEPTH_TEST)
        this.orientCubeShader!.use(this.gl)
        gl.bindVertexArray(this.orientCubeShaderVAO)
        const modelMatrix = mat4.create()
        const projectionMatrix = mat4.create()
        // ortho(out, left, right, bottom, top, near, far)
        mat4.ortho(projectionMatrix, 0, gl.canvas.width, 0, gl.canvas.height, -10 * sz, 10 * sz)
        let translateUpForColorbar = 0
        if (leftTopWidthHeight[1] === 0) {
            translateUpForColorbar = gl.canvas.height - this.effectiveCanvasHeight()
        }
        mat4.translate(modelMatrix, modelMatrix, [1.8 * sz + leftTopWidthHeight[0], translateUpForColorbar + 1.8 * sz + leftTopWidthHeight[1], 0])
        mat4.scale(modelMatrix, modelMatrix, [sz, sz, sz])
        // apply elevation
        mat4.rotateX(modelMatrix, modelMatrix, deg2rad(270 - elevation))
        // apply azimuth
        mat4.rotateZ(modelMatrix, modelMatrix, deg2rad(-azimuth))
        const modelViewProjectionMatrix = mat4.create()
        mat4.multiply(modelViewProjectionMatrix, projectionMatrix, modelMatrix)
        gl.uniformMatrix4fv(this.orientCubeShader!.uniforms.u_matrix, false, modelViewProjectionMatrix)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 168)
        gl.bindVertexArray(this.unusedVAO)
        this.gl.disable(this.gl.CULL_FACE)
    }

    /**
     * Internal utility to generate human-readable location strings for the onLocationChange callback
     * @param axCorSag - optional axis index for coordinate interpretation (NaN by default)
     * @remarks Computes string representation of current crosshair position in mm (and frame if 4D).
     * @see {@link https://niivue.com/demos/features/modulateAfni.html | live demo usage}
     */
    createOnLocationChange(axCorSag = NaN): void {
        // first: provide a string representation
        const [_mn, _mx, range] = this.sceneExtentsMinMax(true)
        const fov = Math.max(Math.max(range[0], range[1]), range[2])
        function dynamicDecimals(flt: number): number {
            return Math.max(0.0, -Math.ceil(Math.log10(Math.abs(flt))))
        }
        // dynamic decimal places: fov>100->0, fov>10->1, fov>1->2
        let deci = dynamicDecimals(fov * 0.001)
        const mm = this.frac2mm(this.scene.crosshairPos, 0, true)
        function flt2str(flt: number, decimals = 0): number {
            return parseFloat(Number(flt).toFixed(decimals))
        }
        let str = flt2str(mm[0], deci) + '×' + flt2str(mm[1], deci) + '×' + flt2str(mm[2], deci)
        if (this.volumes.length > 0 && this.volumes[0].nFrame4D! > 0) {
            str += '×' + flt2str(this.volumes[0].frame4D)
        }
        // voxel based layer intensity
        if (this.volumes.length > 0) {
            let valStr = ' = '
            for (let i = 0; i < this.volumes.length; i++) {
                const vox = this.volumes[i].mm2vox(mm as number[])
                let flt = this.volumes[i].getValue(vox[0], vox[1], vox[2], this.volumes[i].frame4D)
                deci = 3
                if (this.volumes[i].colormapLabel !== null) {
                    const v = Math.round(flt)
                    if (this.volumes[i].hdr.intent_code === NiiIntentCode.NIFTI_INTENT_LABEL && this.volumes[i].hdr.datatypeCode === NiiDataType.DT_RGBA32) {
                        const vals = this.volumes[i].getValues(vox[0], vox[1], vox[2], this.volumes[i].frame4D)
                        // PAQD vals: [0] max idx, [1] 2nd idx [2] max prob [3] 2nd prob
                        if (vals[2] > 2) {
                            const pct1 = Math.round((100 * vals[2]) / 255)
                            valStr += this.volumes[i].colormapLabel!.labels![vals[0]] + ` (${pct1}%)`
                            if (vals[3] > 2) {
                                const pct2 = Math.round((100 * vals[3]) / 255)
                                valStr += ` ` + this.volumes[i].colormapLabel!.labels![vals[1]] + ` (${pct2}%)`
                            }
                        }
                    } else if (v >= 0 && this.volumes[i].colormapLabel!.labels && v < this.volumes[i].colormapLabel!.labels!.length) {
                        valStr += this.volumes[i].colormapLabel!.labels![v]
                    } else {
                        valStr += 'undefined(' + flt2str(flt, deci) + ')'
                    }
                } else {
                    valStr += flt2str(flt, deci)
                }
                if (this.volumes[i].imaginary) {
                    flt = this.volumes[i].getValue(vox[0], vox[1], vox[2], this.volumes[i].frame4D, true)
                    if (flt >= 0) {
                        valStr += '+'
                    }
                    valStr += flt2str(flt, deci)
                }
                valStr += '   '
            }
            str += valStr
            // drawingBitmap
            const dims = this.back!.dimsRAS!
            const nv = dims[1] * dims[2] * dims[3]
            if (this.drawBitmap && this.drawBitmap.length === nv) {
                const vox = this.frac2vox(this.scene.crosshairPos)
                const vx = vox[0] + vox[1] * dims[1] + vox[2] * dims[1] * dims[2]
                // str += this.drawBitmap[vx].toString();
                str += ' ' + this.drawLut.labels![this.drawBitmap[vx]]
            }
        }

        // const msg = {
        //   mm: this.frac2mm(this.scene.crosshairPos, 0, true),
        //   axCorSag,
        //   vox: this.frac2vox(this.scene.crosshairPos),
        //   frac: this.scene.crosshairPos,
        //   xy: [this.mousePos[0], this.mousePos[1]],
        //   values: this.volumes.map((v) => {
        //     const mm = this.frac2mm(this.scene.crosshairPos, 0, true)
        //     const vox = v.mm2vox(mm as number[]) // e.mm2vox
        //     const val = v.getValue(vox[0], vox[1], vox[2], v.frame4D)
        //     return { name: v.name, value: val, id: v.id, mm, vox }
        //   }),
        //   string: str
        // }

        // make msg object of type NVLocation
        const msg: NiiVueLocation = {
            mm: this.frac2mm(this.scene.crosshairPos, 0, true),
            axCorSag,
            vox: this.frac2vox(this.scene.crosshairPos),
            frac: this.scene.crosshairPos,
            xy: [this.mousePos[0], this.mousePos[1]],
            values: this.volumes.map((v) => {
                const mm = this.frac2mm(this.scene.crosshairPos, 0, true)
                const vox = v.mm2vox(mm as number[]) // e.mm2vox
                const val = v.getValue(vox[0], vox[1], vox[2], v.frame4D)
                return {
                    name: v.name,
                    value: val,
                    id: v.id,
                    mm,
                    vox
                } as NiiVueLocationValue
            }),
            string: str
        }

        this.onLocationChange(msg)
    }

    /**
     * Add a 3D Label
     * @param text - the text content of the label
     * @param style - visual styling options for the label (e.g., color, scale, line width)
     * @param points - a 3D point `[x, y, z]` or array of points to anchor the label in space
     * @param anchor - optional label anchor position (e.g., top-left, center, etc.)
     * @param onClick - optional callback function to invoke when the label is clicked
     * @returns the created `NVLabel3D` instance
     * @see {@link https://niivue.com/demos/features/labels.html | live demo usage}
     */
    addLabel(text: string, style: NVLabel3DStyle, points?: number[] | number[][], anchor?: LabelAnchorPoint, onClick?: (label: NVLabel3D) => void): NVLabel3D {
        const defaultStyle = {
            textColor: this.opts.legendTextColor,
            textScale: 1.0,
            textAlignment: LabelTextAlignment.LEFT,
            lineWidth: 0.0,
            lineColor: this.opts.legendTextColor,
            lineTerminator: LabelLineTerminator.NONE,
            bulletScale: 0.0,
            bulletColor: this.opts.legendTextColor
        }
        const labelStyle = style ? { ...defaultStyle, ...style } : { ...defaultStyle }
        const label = new NVLabel3D(text, { ...labelStyle }, points, anchor, onClick)
        this.document.labels.push(label)
        return label
    }

    /**
     * Calculate the 2D screen coordinates of a 3D point using the provided MVP matrix and tile position/size.
     * @internal
     */
    calculateScreenPoint(point: [number, number, number], mvpMatrix: mat4, leftTopWidthHeight: number[]): vec4 {
        const screenPoint = vec4.create()
        // Multiply the 3D point by the model-view-projection matrix
        vec4.transformMat4(screenPoint, [...point, 1.0], mvpMatrix)
        // Convert the 4D point to 2D screen coordinates
        if (screenPoint[3] !== 0.0) {
            screenPoint[0] = (screenPoint[0] / screenPoint[3] + 1.0) * 0.5 * leftTopWidthHeight[2]
            screenPoint[1] = (1.0 - screenPoint[1] / screenPoint[3]) * 0.5 * leftTopWidthHeight[3]
            screenPoint[2] /= screenPoint[3]

            screenPoint[0] += leftTopWidthHeight[0]
            screenPoint[1] += leftTopWidthHeight[1]
        }
        return screenPoint
    }

    /**
     * Return the label located at the given screen coordinates, or null if none found.
     * @internal
     */
    getLabelAtPoint(screenPoint: [number, number]): NVLabel3D | null {
        const scale = this.legendFontScaling
        const size = this.fontPx * scale
        const verticalMargin = this.fontPx * scale

        // get all non-connectome labels
        for (const label of this.document.labels) {
            if (label.anchor == null || label.anchor === LabelAnchorPoint.NONE) {
                continue
            }

            const labelSize = this.fontPx * label.style.textScale * scale
            const textHeight = this.textHeight(labelSize, label.text)
            const textWidth = this.textWidth(labelSize, label.text)

            if (label.anchor & LabelAnchorFlag.LEFT) {
                if (screenPoint[0] > textWidth) {
                    continue
                }
            }

            if (label.anchor & LabelAnchorFlag.CENTER) {
                if (screenPoint[0] < (this.gl.canvas.width - textWidth) / 2) {
                    continue
                }

                if (screenPoint[0] > (this.gl.canvas.width + textWidth) / 2) {
                    continue
                }
            }

            if (label.anchor & LabelAnchorFlag.RIGHT) {
                if (screenPoint[0] < this.gl.canvas.width - textWidth) {
                    continue
                }
            }

            if (label.anchor & LabelAnchorFlag.TOP) {
                if (screenPoint[1] < verticalMargin / 2) {
                    continue
                }

                if (screenPoint[1] > textHeight + verticalMargin / 2) {
                    continue
                }
            }

            if (label.anchor & LabelAnchorFlag.MIDDLE) {
                if (screenPoint[1] < (this.gl.canvas.height - textHeight - verticalMargin) / 2) {
                    continue
                }

                if (screenPoint[1] > (this.gl.canvas.height + textHeight - verticalMargin / 2) / 2) {
                    continue
                }
            }

            if (label.anchor & LabelAnchorFlag.BOTTOM) {
                if (screenPoint[1] < this.gl.canvas.height - textHeight - verticalMargin) {
                    continue
                }

                if (screenPoint[1] > this.gl.canvas.height - verticalMargin / 2) {
                    continue
                }
            }

            // label passed all tests
            return label
        }
        log.debug('screenPoint', screenPoint)
        const panelHeight = this.getLegendPanelHeight(scale)
        const panelWidth = this.getLegendPanelWidth()
        const left = this.gl.canvas.width - panelWidth
        let top = (this.canvas!.height - panelHeight) / 2
        log.debug('panelrect', left, top, left + panelWidth, top + panelHeight)
        if (screenPoint[0] < left || screenPoint[1] < top || screenPoint[0] > left + panelWidth || screenPoint[1] > top + panelHeight) {
            return null
        }

        const labels = this.getConnectomeLabels()
        for (const label of labels) {
            const labelSize = this.fontPx * label.style.textScale * scale
            const textHeight = this.textHeight(labelSize, label.text)
            if (screenPoint[1] >= top && screenPoint[1] <= top + textHeight + size / 2) {
                log.debug(`label clicked ${label.text}`)
                return label
            }
            top += textHeight
            top += size / 2
        }
        return null
    }

    /**
     * Draw lines from a 2D label position to its associated 3D points; supports solid and dotted lines.
     * @internal
     */
    drawLabelLine(label: NVLabel3D, pos: vec2, mvpMatrix: mat4, leftTopWidthHeight: number[], secondPass = false): void {
        const points = Array.isArray(label.points) && Array.isArray(label.points[0]) ? (label.points as Array<[number, number, number]>) : ([label.points] as Array<[number, number, number]>)
        for (const point of points) {
            const screenPoint = this.calculateScreenPoint(point, mvpMatrix, leftTopWidthHeight)
            if (!secondPass) {
                // draw line
                this.draw3DLine(pos, [screenPoint[0], screenPoint[1], screenPoint[2]], label.style.lineWidth, label.style.lineColor)
            } else {
                this.drawDottedLine([...pos, screenPoint[0], screenPoint[1]], label.style.lineWidth, label.style.lineColor)
            }
        }
    }

    /**
     * Render a 3D label with optional leader lines, bullet markers, and text alignment within a legend.
     * @internal
     */
    draw3DLabel(label: NVLabel3D, pos: vec2, mvpMatrix?: mat4, leftTopWidthHeight?: number[], bulletMargin?: number, legendWidth?: number, secondPass?: boolean, scaling: number = 1.0): void {
        const text = label.text
        const left = pos[0]
        const top = pos[1]

        // const scale = label.style.textScale;
        const size = this.fontPx * scaling

        const textHeight = this.textHeight(label.style.textScale, text) * size

        if (label.style.lineWidth > 0.0 && Array.isArray(label.points)) {
            this.drawLabelLine(label, [left, top + textHeight], mvpMatrix, leftTopWidthHeight, secondPass)
        }

        if (label.style.bulletScale) {
            const bulletSize = label.style.bulletScale * textHeight
            const diff = textHeight - bulletSize
            const rectTop = top + diff / 2 + bulletSize / 2
            const rectLeft = left + (bulletMargin - bulletSize) / 2

            this.drawCircle([rectLeft, rectTop, bulletSize, bulletSize], label.style.bulletColor)
        }

        let textLeft = left

        if (legendWidth) {
            if (label.style.textAlignment !== LabelTextAlignment.LEFT) {
                const textWidth = this.textWidth(label.style.textScale, label.text) * size
                if (label.style.textAlignment === LabelTextAlignment.RIGHT) {
                    textLeft = left + legendWidth - size * 1.5 - textWidth
                } else {
                    const remaining = legendWidth - (bulletMargin || size)
                    textLeft += (remaining - textWidth) / 2
                }
            } else {
                // textLeft += size / 2;
                textLeft += bulletMargin
            }
        }
        const scale = label.style.textScale
        this.drawText([textLeft, top], text, scale, label.style.textColor)
    }

    /**
     * Render all visible 3D labels in the legend panel, handling font scaling and layering.
     * @internal
     */
    draw3DLabels(mvpMatrix: mat4, leftTopWidthHeight: number[], secondPass = false): void {
        const labels = this.getConnectomeLabels()

        if (!this.opts.showLegend || labels.length === 0) {
            return
        }
        let panelHeight = this.getLegendPanelHeight(1)
        if (!this.canvas || panelHeight < 1) {
            return
        }
        const gl = this.gl
        gl.disable(gl.CULL_FACE)
        gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        this.legendFontScaling = 1
        if (panelHeight > this.canvas.height) {
            const margin = 10 * this.uiData.dpr
            this.legendFontScaling = Math.max(this.canvas.height - margin, 1) / panelHeight
            // legend too big for screen issue 1279
            log.debug(`Legend too large for screen, font reduction factor x${this.legendFontScaling}`)
            panelHeight = this.getLegendPanelHeight(this.legendFontScaling)
        }
        const size = this.fontPx * this.legendFontScaling
        const bulletMargin = this.getBulletMarginWidth()
        const panelWidth = this.getLegendPanelWidth()
        const left = gl.canvas.width - panelWidth
        let top = (this.canvas.height - panelHeight) / 2
        this.drawRect([gl.canvas.width - panelWidth, top, panelWidth - size, panelHeight], this.opts.legendBackgroundColor)
        const blend = gl.getParameter(gl.BLEND)
        const depthFunc = gl.getParameter(gl.DEPTH_FUNC)

        if (!secondPass) {
            gl.disable(gl.BLEND)
            gl.depthFunc(gl.LEQUAL)
        }

        for (const label of labels) {
            this.draw3DLabel(label, [left, top], mvpMatrix, leftTopWidthHeight, bulletMargin, panelWidth, secondPass, this.legendFontScaling)

            const labelSize = this.fontPx * label.style.textScale
            const textHeight = this.textHeight(labelSize, label.text) * this.legendFontScaling

            top += textHeight // Math.max(textHeight, bulletHeight);
            top += size / 2
        }

        // connectome labels

        if (!secondPass) {
            gl.depthFunc(depthFunc)
            if (blend) {
                gl.enable(gl.BLEND)
            }
        }
    }

    /**
     * Draw all labels anchored to screen edges or corners with background rectangles.
     * @internal
     */
    drawAnchoredLabels(): void {
        const size = this.fontPx
        const anchoredLabels = this.document.labels.filter((l) => l.anchor != null && l.anchor !== LabelAnchorPoint.NONE)
        for (const label of anchoredLabels) {
            const text = label.text
            const textHeight = this.textHeight(label.style.textScale, text) * size
            const textWidth = this.textWidth(label.style.textScale, text) * size
            let left: number
            let top: number

            const scale = 1.0 // we may want to make this adjustable in the future
            const verticalMargin = this.fontPx * scale
            const rectHeightDiff = verticalMargin
            let rectWidthDiff = verticalMargin / 4
            let rectHorizontalOffset = 0
            let rectVerticalOffset = 0

            if (label.anchor & LabelAnchorFlag.LEFT) {
                left = 0
            }

            if (label.anchor & LabelAnchorFlag.RIGHT) {
                left = this.canvas.width - textWidth
                rectHorizontalOffset -= verticalMargin / 4
            }

            if (label.anchor & LabelAnchorFlag.CENTER) {
                left = (this.canvas.width - textWidth) / 2
                rectHorizontalOffset -= verticalMargin / 4
                rectWidthDiff += verticalMargin / 4
            }

            if (label.anchor & LabelAnchorFlag.TOP) {
                top = 0
            }

            if (label.anchor & LabelAnchorFlag.MIDDLE) {
                top = (this.canvas.height - textHeight - verticalMargin) / 2
                rectVerticalOffset -= verticalMargin / 4
            }

            if (label.anchor & LabelAnchorFlag.BOTTOM) {
                top = this.canvas.height - textHeight - verticalMargin
                rectVerticalOffset -= verticalMargin / 4
            }
            this.drawRect([left + rectHorizontalOffset, top + rectVerticalOffset, textWidth + rectWidthDiff, textHeight + rectHeightDiff], label.style.backgroundColor)
            this.draw3DLabel(label, [left, top])
        }
    }

    /**
     * Render the 3D scene including volume, meshes, labels, crosshairs, and orientation cube.
     * @internal
     */
    draw3D(
        leftTopWidthHeight = [0, 0, 0, 0],
        mvpMatrix: mat4 | null = null,
        modelMatrix: mat4 | null = null,
        normalMatrix: mat4 | null = null,
        azimuth: number | null = null,
        elevation = 0
    ): string | undefined {
        const gl = this.gl
        const [regionX, regionY, regionW, regionH] = this.getBoundsRegion()

        // Always work with a copy so we don’t mutate caller input
        let ltwh = [...leftTopWidthHeight]

        // Case 1: no rect specified → full canvas (or full bounds if bounds set)
        if (ltwh[2] === 0 || ltwh[3] === 0) {
            ltwh = this.opts.bounds ? [regionX, regionY, regionW, regionH] : [0, 0, gl.canvas.width, gl.canvas.height]
        }

        const isMosaic = azimuth !== null
        this.setPivot3D()
        if (!isMosaic) {
            azimuth = this.scene.renderAzimuth
            elevation = this.scene.renderElevation
        }

        if (mvpMatrix === null) {
            ;[mvpMatrix, modelMatrix, normalMatrix] = this.calculateMvpMatrix(null, ltwh, azimuth!, elevation)
        }

        const relativeLTWH = [...ltwh]

        // Store the unmodified rect for borders / picking
        this.screenSlices.push({
            leftTopWidthHeight: ltwh.slice(), // canvas-space
            axCorSag: SLICE_TYPE.RENDER,
            sliceFrac: 0,
            AxyzMxy: [],
            leftTopMM: [],
            fovMM: [isRadiological(modelMatrix!), 0]
        })

        // Flip Y only for GL viewport
        const glLTWH: [number, number, number, number] = [ltwh[0], gl.canvas.height - ltwh[3] - ltwh[1], ltwh[2], ltwh[3]]

        // Flip Y for GL viewport
        ltwh[1] = gl.canvas.height - ltwh[3] - ltwh[1]
        // gl.clearDepth(0.0) // reset depth to nearest=0
        gl.clear(gl.DEPTH_BUFFER_BIT)
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.ALWAYS)
        gl.depthMask(true)

        this.draw3DLabels(mvpMatrix, relativeLTWH, false)

        // restrict viewport to tile/bounds
        this.gl.viewport(glLTWH[0], glLTWH[1], glLTWH[2], glLTWH[3])

        if (this.volumes.length > 0) {
            this.updateInterpolation(0, true)
            this.updateInterpolation(1, true)
            this.drawImage3D(mvpMatrix, azimuth!, elevation)
        }
        this.updateInterpolation(0)
        this.updateInterpolation(1)
        if (!isMosaic) {
            this.drawCrosshairs3D(true, 1.0, mvpMatrix)
        }
        this.drawMesh3D(true, 1.0, mvpMatrix, modelMatrix!, normalMatrix!)
        if (this.uiData.mouseDepthPicker) {
            this.depthPicker(ltwh, mvpMatrix)
            this.createOnLocationChange()
            // Avoid double flipping by reusing relativeLTWH
            this.draw3D(relativeLTWH, mvpMatrix, modelMatrix, normalMatrix, azimuth, elevation)
            return
        }
        if (this.opts.meshXRay > 0.0) {
            this.drawMesh3D(false, this.opts.meshXRay, mvpMatrix, modelMatrix!, normalMatrix!)
        }
        this.gl.disable(this.gl.CULL_FACE)

        this.draw3DLabels(mvpMatrix, relativeLTWH, false)

        gl.viewport(ltwh[0], ltwh[1], ltwh[2], ltwh[3])
        if (!isMosaic) {
            this.drawCrosshairs3D(false, 0.15, mvpMatrix)
        }

        // Reset viewport to whole bounds region
        gl.viewport(regionX, regionY, regionW, regionH)
        this.drawOrientationCube(ltwh, azimuth!, elevation)

        const posString = 'azimuth: ' + this.scene.renderAzimuth.toFixed(0) + ' elevation: ' + this.scene.renderElevation.toFixed(0)

        this.readyForSync = true
        this.sync()
        this.draw3DLabels(mvpMatrix, relativeLTWH, true)

        return posString
    }

    /**
     * Render all visible 3D meshes with proper blending, depth, and shader settings.
     * @internal
     */
    drawMesh3D(isDepthTest = true, alpha = 1.0, m?: mat4, modelMtx?: mat4, normMtx?: mat4, is2D: boolean = false): void {
        if (this.meshes.length < 1) {
            return
        }

        if (!m) {
            ;[m, modelMtx, normMtx] = this.calculateMvpMatrix(this.volumeObject3D, undefined, this.scene.renderAzimuth, this.scene.renderElevation)
        }

        MeshRenderer.drawMesh3D({
            gl: this.gl,
            meshes: this.meshes,
            isDepthTest,
            alpha,
            mvpMatrix: m!,
            modelMatrix: modelMtx!,
            normalMatrix: normMtx!,
            is2D,
            meshShaders: this.meshShaders,
            pickingMeshShader: this.pickingMeshShader,
            fiberShader: this.fiberShader,
            mouseDepthPicker: this.uiData.mouseDepthPicker,
            matCapTexture: this.matCapTexture,
            unusedVAO: this.unusedVAO,
            meshXRay: this.opts.meshXRay,
            meshThicknessOn2D: this.opts.meshThicknessOn2D,
            frac2mm: (pos: number[]) => this.frac2mm(pos as vec3, 0, this.opts.isSliceMM),
            crosshairPos: this.scene.crosshairPos
        })

        this.readyForSync = true
    }

    /**
     * Render 3D crosshairs at the current crosshair position with optional depth testing and transparency.
     * @internal
     */
    drawCrosshairs3D(isDepthTest = true, alpha = 1.0, mvpMtx: mat4 | null = null, is2DView = false, isSliceMM = true): void {
        if (!this.opts.show3Dcrosshair && !is2DView) {
            return
        }
        if (this.opts.crosshairWidth <= 0.0 && is2DView) {
            return
        }
        const gl = this.gl
        const mm = this.frac2mm(this.scene.crosshairPos, 0, isSliceMM)
        let radius = 1
        const [mn, mx, range] = this.sceneExtentsMinMax(isSliceMM)
        if (this.volumes.length > 0) {
            if (!this.back) {
                throw new Error('back undefined')
            }
            radius = 0.5 * Math.min(Math.min(this.back.pixDims![1], this.back.pixDims![2]), this.back.pixDims![3])
        } else if (range[0] < 50 || range[0] > 1000) {
            radius = range[0] * 0.02
        } // 2% of first dimension
        radius *= this.opts.crosshairWidth
        if (this.opts?.crosshairWidthUnit === 'percent') {
            radius = range[0] * this.opts.crosshairWidth * 0.5 * 0.01
        }
        if (this.opts?.crosshairWidthUnit === 'mm') {
            radius = this.opts.crosshairWidth * 0.5
        }
        // generate our crosshairs for the base volume
        if (this.crosshairs3D === null || this.crosshairs3D.mm![0] !== mm[0] || this.crosshairs3D.mm![1] !== mm[1] || this.crosshairs3D.mm![2] !== mm[2]) {
            if (this.crosshairs3D !== null) {
                gl.deleteBuffer(this.crosshairs3D.indexBuffer) // TODO: handle in nvimage.js: create once, update with bufferSubData
                gl.deleteBuffer(this.crosshairs3D.vertexBuffer) // TODO: handle in nvimage.js: create once, update with bufferSubData
            }
            this.crosshairs3D = NiivueObject3D.generateCrosshairs(this.gl, 1, mm, mn, mx, radius, 20, this.opts.crosshairGap)
            this.crosshairs3D.mm = mm
            // this.crosshairs3D.radius = radius
        }

        if (!this.surfaceShader) {
            throw new Error('surfaceShader undefined')
        }
        const crosshairsShader = this.surfaceShader
        crosshairsShader.use(this.gl)
        if (mvpMtx == null) {
            // FIXME see above - I added the undefined, parameters were misaligned
            ;[mvpMtx] = this.calculateMvpMatrix(this.crosshairs3D, undefined, this.scene.renderAzimuth, this.scene.renderElevation)
        }
        gl.uniformMatrix4fv(crosshairsShader.uniforms.mvpMtx, false, mvpMtx)
        gl.disable(gl.CULL_FACE)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.crosshairs3D.indexBuffer)
        gl.enable(gl.DEPTH_TEST)
        const color = [...this.opts.crosshairColor]
        if (isDepthTest) {
            gl.disable(gl.BLEND)
            gl.depthFunc(gl.LEQUAL) // pass if LESS than incoming value
            // gl.depthFunc(gl.GREATER)
        } else {
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
            gl.depthFunc(gl.ALWAYS)
        }
        color[3] = alpha
        gl.uniform4fv(crosshairsShader.uniforms.surfaceColor, color)
        gl.bindVertexArray(this.crosshairs3D.vao)
        gl.drawElements(
            gl.TRIANGLES,
            this.crosshairs3D.indexCount,
            gl.UNSIGNED_INT, // gl.UNSIGNED_SHORT,
            0
        )
        gl.bindVertexArray(this.unusedVAO) // https://stackoverflow.com/questions/43904396/are-we-not-allowed-to-bind-gl-array-buffer-and-vertex-attrib-array-to-0-in-webgl
    }

    /**
     * Convert millimeter coordinates to fractional volume coordinates for the specified volume.
     * @internal
     */
    mm2frac(mm: vec3 | vec4, volIdx = 0, isForceSliceMM = false): vec3 {
        return CoordTransform.mm2frac(mm, {
            volumes: this.volumes,
            meshes: this.meshes,
            volumeObject3D: this.volumeObject3D,
            volIdx,
            isSliceMM: isForceSliceMM || this.opts.isSliceMM
        })
    }

    /**
     * Convert voxel coordinates to fractional volume coordinates for the specified volume.
     * @internal
     */
    vox2frac(vox: vec3, volIdx = 0): vec3 {
        return CoordTransform.vox2frac(vox, this.volumes, volIdx)
    }

    /**
     * Convert fractional volume coordinates to voxel coordinates for the specified volume.
     * @internal
     */
    frac2vox(frac: vec3, volIdx = 0): vec3 {
        return CoordTransform.frac2vox(frac, this.volumes, volIdx)
    }

    /**
     * move crosshair a fixed number of voxels (not mm)
     * @param x - translate left (-) or right (+)
     * @param y - translate posterior (-) or +anterior (+)
     * @param z - translate inferior (-) or superior (+)
     * @example niivue.moveCrosshairInVox(1, 0, 0)
     * @see {@link https://niivue.com/demos/features/draw2.html | live demo usage}
     */
    moveCrosshairInVox(x: number, y: number, z: number): void {
        const currentVox = this.frac2vox(this.scene.crosshairPos)
        const result = SliceNavigation.calculateMoveCrosshairInVox({
            x,
            y,
            z,
            currentVox,
            dimsRAS: this.volumes[0].dimsRAS!
        })

        this.scene.crosshairPos = this.vox2frac(result.newVox)
        this.createOnLocationChange()
        if (this.opts.is2DSliceShader && result.zChanged) {
            this.updateGLVolume()
            this.refreshDrawing(false)
        }
        this.drawScene()
    }

    /**
     * Convert fractional volume coordinates to millimeter space for the specified volume.
     * @internal
     */
    frac2mm(frac: vec3, volIdx = 0, isForceSliceMM = false): vec4 {
        return CoordTransform.frac2mm(frac, {
            volumes: this.volumes,
            meshes: this.meshes,
            volumeObject3D: this.volumeObject3D,
            volIdx,
            isSliceMM: isForceSliceMM || this.opts.isSliceMM
        })
    }

    /**
     * Convert screen pixel coordinates to texture fractional coordinates for the given slice index.
     * @internal
     */
    screenXY2TextureFrac(x: number, y: number, i: number, restrict0to1 = true): vec3 {
        return CoordTransform.screenXY2TextureFrac(x, y, this.screenSlices, i, {
            volumes: this.volumes,
            meshes: this.meshes,
            volumeObject3D: this.volumeObject3D,
            isSliceMM: this.opts.isSliceMM,
            restrict0to1
        })
    }

    /**
     * Converts a canvas position to fractional texture coordinates.
     * @internal
     */
    canvasPos2frac(canvasPos: number[]): vec3 {
        return CoordTransform.canvasPos2frac(canvasPos, this.screenSlices, {
            volumes: this.volumes,
            meshes: this.meshes,
            volumeObject3D: this.volumeObject3D,
            isSliceMM: this.opts.isSliceMM
        })
    }

    /**
     * Convert fractional volume coordinates to canvas pixel coordinates with tile information.
     * Returns both canvas position and the tile index for validation.
     * @internal
     */
    frac2canvasPosWithTile(frac: vec3, preferredSliceType?: SLICE_TYPE): { pos: number[]; tileIndex: number } | null {
        return CoordTransform.frac2canvasPosWithTile(frac, this.screenSlices, {
            volumes: this.volumes,
            meshes: this.meshes,
            volumeObject3D: this.volumeObject3D,
            isSliceMM: this.opts.isSliceMM,
            preferredSliceType
        })
    }

    /**
     * Convert fractional volume coordinates to canvas pixel coordinates.
     * Returns the first valid screen slice that contains the fractional coordinates.
     * @internal
     */
    frac2canvasPos(frac: vec3): number[] | null {
        return CoordTransform.frac2canvasPos(frac, this.screenSlices, {
            volumes: this.volumes,
            meshes: this.meshes,
            volumeObject3D: this.volumeObject3D,
            isSliceMM: this.opts.isSliceMM,
            sliceType: this.opts.sliceType
        })
    }

    /**
     * Calculates scaled slice dimensions and position within the canvas.
     * n.b. beware of similarly named `sliceScale` method.
     * @internal
     */
    scaleSlice(w: number, h: number, padPixelsWH: [number, number] = [0, 0], canvasWH: [number, number] = [0, 0]): number[] {
        // const canvasW = this.effectiveCanvasWidth() - padPixelsWH[0]
        // const canvasH = this.effectiveCanvasHeight() - padPixelsWH[1]
        const canvasW = canvasWH[0] === 0 ? this.effectiveCanvasWidth() - padPixelsWH[0] : canvasWH[0] - padPixelsWH[0]
        const canvasH = canvasWH[1] === 0 ? this.effectiveCanvasHeight() - padPixelsWH[1] : canvasWH[1] - padPixelsWH[1]
        let scalePix = canvasW / w
        if (h * scalePix > canvasH) {
            scalePix = canvasH / h
        }
        // canvas space is 0,0...w,h with origin at upper left
        const wPix = w * scalePix
        const hPix = h * scalePix
        const leftTopWidthHeight = [(canvasW - wPix) * 0.5, (canvasH - hPix) * 0.5, wPix, hPix, scalePix]
        return leftTopWidthHeight
    }

    /**
     * Renders a centered thumbnail image using the bitmap shader.
     * @internal
     */
    drawThumbnail(): void {
        if (!this.bmpShader) {
            throw new Error('bmpShader undefined')
        }
        this.bmpShader.use(this.gl)

        // Determine drawing region from bounds (normalized → pixels)
        const [regionX, regionY, regionW, regionH] = this.getBoundsRegion()

        // Set shader canvas size to the region instead of full canvas
        this.gl.uniform2f(this.bmpShader.uniforms.canvasWidthHeight, regionW, regionH)

        // Calculate thumbnail dimensions using helper
        const thumb = UIElementRenderer.calculateThumbnailDimensions(regionW, regionH, this.bmpTextureWH)
        const left = regionX + thumb.left
        const top = regionY + thumb.top

        this.gl.uniform4f(this.bmpShader.uniforms.leftTopWidthHeight, left, top, thumb.width, thumb.height)

        this.gl.bindVertexArray(this.genericVAO)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        this.gl.bindVertexArray(this.unusedVAO)
    }

    /**
     * Draws a 2D line with specified thickness and color on the canvas.
     * If alpha < 0, uses the default crosshair color.
     * @internal
     */
    drawLine(startXYendXY: number[], thickness = 1, lineColor = [1, 0, 0, -1]): void {
        this.gl.bindVertexArray(this.genericVAO)
        if (!this.lineShader) {
            throw new Error('lineShader undefined')
        }
        this.lineShader.use(this.gl)
        if (lineColor[3] < 0) {
            lineColor = this.opts.crosshairColor
        }
        this.gl.uniform4fv(this.lineShader.uniforms.lineColor, lineColor)
        this.gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
        // draw Line
        this.gl.uniform1f(this.lineShader.uniforms.thickness, thickness)
        this.gl.uniform4fv(this.lineShader.uniforms.startXYendXY, startXYendXY)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        this.gl.bindVertexArray(this.unusedVAO) // set vertex attributes
    }

    /**
     * Draws a 3D line from screen to world space with specified thickness and color.
     * If alpha < 0, uses the default crosshair color.
     * @internal
     */
    draw3DLine(startXY: vec2, endXYZ: vec3, thickness = 1, lineColor = [1, 0, 0, -1]): void {
        this.gl.bindVertexArray(this.genericVAO)
        if (!this.line3DShader) {
            throw new Error('line3DShader undefined')
        }
        this.line3DShader.use(this.gl)
        if (lineColor[3] < 0) {
            lineColor = this.opts.crosshairColor
        }
        this.gl.uniform4fv(this.line3DShader.uniforms.lineColor, lineColor)
        this.gl.uniform2fv(this.line3DShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
        // draw Line
        this.gl.uniform1f(this.line3DShader.uniforms.thickness, thickness)
        this.gl.uniform2fv(this.line3DShader.uniforms.startXY, startXY)
        this.gl.uniform3fv(this.line3DShader.uniforms.endXYZ, endXYZ)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        this.gl.bindVertexArray(this.unusedVAO) // set vertex attributes
    }

    /**
     * Draws a dotted 2D line with specified thickness and color.
     * If alpha < 0, uses the default crosshair color with reduced opacity.
     * @internal
     */
    drawDottedLine(startXYendXY: number[], thickness = 1, lineColor = [1, 0, 0, -1]): void {
        this.gl.bindVertexArray(this.genericVAO)
        if (!this.lineShader) {
            throw new Error('lineShader undefined')
        }
        this.lineShader.use(this.gl)
        const dottedLineColor = lineColor[3] < 0 ? [...this.opts.crosshairColor] : [...lineColor]
        dottedLineColor[3] = 0.3

        this.gl.uniform4fv(this.lineShader.uniforms.lineColor, dottedLineColor)
        this.gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
        this.gl.uniform1f(this.lineShader.uniforms.thickness, thickness)

        // Calculate and draw dotted line segments using helper
        const segments = UIElementRenderer.calculateDottedLineSegments(startXYendXY, this.fontPx, 1.0)
        for (const seg of segments) {
            this.gl.uniform4fv(this.lineShader.uniforms.startXYendXY, [seg.startX, seg.startY, seg.endX, seg.endY])
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        }

        this.gl.bindVertexArray(this.unusedVAO)
    }

    /**
     * Draw a colored line on the graph using given coordinates, color, and thickness.
     * @internal
     */
    drawGraphLine(LTRB: number[], color = [1, 0, 0, 0.5], thickness = 2): void {
        this.drawLine(LTRB, thickness, color)
    }

    /**
     * Draw crosshair lines in millimeters on a given 2D slice tile.
     * @internal
     */
    drawCrossLinesMM(sliceIndex: number, axCorSag: SLICE_TYPE, axiMM: number[], corMM: number[], sagMM: number[]): void {
        if (sliceIndex < 0 || this.screenSlices.length <= sliceIndex) {
            return
        }
        const tile = this.screenSlices[sliceIndex]
        let sliceFrac = tile.sliceFrac
        const isRender = sliceFrac === Infinity
        if (isRender) {
            log.debug('Rendering approximate cross lines in world view mode')
        }
        if (sliceFrac === Infinity) {
            sliceFrac = 0.5
        }
        const { linesH, linesV } = SliceRenderer.getCrossLinesForSliceType(axCorSag, axiMM, corMM, sagMM)
        const thick = Math.max(1, this.opts.crosshairWidth)

        // Inline mm2screen to avoid creating closures each frame
        const mm2screen = (mm: vec2): vec2 => {
            const screenXY = vec2.fromValues(0, 0)
            screenXY[0] = tile.leftTopWidthHeight[0] + ((mm[0] - tile.leftTopMM[0]) / tile.fovMM[0]) * tile.leftTopWidthHeight[2]
            screenXY[1] = tile.leftTopWidthHeight[1] + tile.leftTopWidthHeight[3] - ((mm[1] - tile.leftTopMM[1]) / tile.fovMM[1]) * tile.leftTopWidthHeight[3]
            return screenXY
        }

        if (linesH.length > 0 && axCorSag === 0) {
            const fracZ = sliceFrac
            const dimV = 1
            for (let i = 0; i < linesH.length; i++) {
                const mmV = this.frac2mm([0.5, 0.5, 0.5])
                mmV[dimV] = linesH[i]
                let fracY: vec3 | number = this.mm2frac(mmV)
                fracY = fracY[dimV]
                let left: vec4 | vec3 | vec2 = this.frac2mm([0.0, fracY, fracZ])
                left = swizzleVec3(left as vec3, [0, 1, 2])
                let right: vec4 | vec3 | vec2 = this.frac2mm([1.0, fracY, fracZ])
                right = swizzleVec3(right as vec3, [0, 1, 2])
                left = mm2screen(left as vec2)
                right = mm2screen(right as vec2)
                this.drawLine([left[0], left[1], right[0], right[1]], thick)
            }
        }
        if (linesH.length > 0 && axCorSag === 1) {
            const fracH = sliceFrac
            const dimV = 2
            for (let i = 0; i < linesH.length; i++) {
                const mmV = this.frac2mm([0.5, 0.5, 0.5])
                mmV[dimV] = linesH[i]
                let fracV: vec3 | number = this.mm2frac(mmV)
                fracV = fracV[dimV]
                let left: vec4 | vec3 | vec2 = this.frac2mm([0.0, fracH, fracV])
                left = swizzleVec3(left as vec3, [0, 2, 1])
                let right: vec4 | vec3 | vec2 = this.frac2mm([1.0, fracH, fracV])
                right = swizzleVec3(right as vec3, [0, 2, 1])
                left = mm2screen(left as vec2)
                right = mm2screen(right as vec2)
                this.drawLine([left[0], left[1], right[0], right[1]], thick)
            }
        }
        if (linesH.length > 0 && axCorSag === 2) {
            const fracX = sliceFrac
            const dimV = 2
            for (let i = 0; i < linesH.length; i++) {
                const mmV = this.frac2mm([0.5, 0.5, 0.5])
                mmV[dimV] = linesH[i]
                let fracZ: vec3 | number = this.mm2frac(mmV)
                fracZ = fracZ[dimV]
                let left: vec4 | vec3 | vec2 = this.frac2mm([fracX, 0, fracZ])
                left = swizzleVec3(left as vec3, [1, 2, 0])
                let right: vec4 | vec3 | vec2 = this.frac2mm([fracX, 1, fracZ])
                right = swizzleVec3(right as vec3, [1, 2, 0])
                left = mm2screen(left as vec2)
                right = mm2screen(right as vec2)
                this.drawLine([left[0], left[1], right[0], right[1]], thick)
            }
        }
        if (linesV.length > 0 && axCorSag === 0) {
            const fracZ = sliceFrac
            const dimH = 0
            for (let i = 0; i < linesV.length; i++) {
                const mm = this.frac2mm([0.5, 0.5, 0.5])
                mm[dimH] = linesV[i]
                let frac: vec3 | number = this.mm2frac(mm)
                frac = frac[dimH]
                let left: vec4 | vec3 | vec2 = this.frac2mm([frac, 0, fracZ])
                left = swizzleVec3(left as vec3, [0, 1, 2])
                let right: vec4 | vec3 | vec2 = this.frac2mm([frac, 1, fracZ])
                right = swizzleVec3(right as vec3, [0, 1, 2])
                left = mm2screen(left as vec2)
                right = mm2screen(right as vec2)
                this.drawLine([left[0], left[1], right[0], right[1]], thick)
            }
        }
        if (linesV.length > 0 && axCorSag === 1) {
            const fracY = sliceFrac
            const dimH = 0
            for (let i = 0; i < linesV.length; i++) {
                const mm = this.frac2mm([0.5, 0.5, 0.5])
                mm[dimH] = linesV[i]
                let frac: vec3 | number = this.mm2frac(mm)
                frac = frac[dimH]
                let left: vec4 | vec3 | vec2 = this.frac2mm([frac, fracY, 0])
                left = swizzleVec3(left as vec3, [0, 2, 1])
                let right: vec4 | vec3 | vec2 = this.frac2mm([frac, fracY, 1])
                right = swizzleVec3(right as vec3, [0, 2, 1])
                left = mm2screen(left as vec2)
                right = mm2screen(right as vec2)
                this.drawLine([left[0], left[1], right[0], right[1]], thick)
            }
        }
        if (linesV.length > 0 && axCorSag === 2) {
            const fracX = sliceFrac
            const dimH = 1
            for (let i = 0; i < linesV.length; i++) {
                const mm = this.frac2mm([0.5, 0.5, 0.5])
                mm[dimH] = linesV[i]
                let frac: vec3 | number = this.mm2frac(mm)
                frac = frac[dimH]
                let left: vec4 | vec3 | vec2 = this.frac2mm([fracX, frac as number, 0])
                left = swizzleVec3(left as vec3, [1, 2, 0])
                let right: vec4 | vec3 | vec2 = this.frac2mm([fracX, frac as number, 1])
                right = swizzleVec3(right as vec3, [1, 2, 0])
                left = mm2screen(left as vec2)
                right = mm2screen(right as vec2)
                this.drawLine([left[0], left[1], right[0], right[1]], thick)
            }
        }
    }

    /**
     * Draw crosshair lines on 2D slice tile, delegating to mm-based drawing if appropriate.
     * @internal
     */
    drawCrossLines(sliceIndex: number, axCorSag: SLICE_TYPE, axiMM: number[], corMM: number[], sagMM: number[]): void {
        if (sliceIndex < 0 || this.screenSlices.length <= sliceIndex) {
            return
        }
        if (this.opts.isSliceMM) {
            return this.drawCrossLinesMM(sliceIndex, axCorSag, axiMM, corMM, sagMM)
        }
        if (this.screenSlices[sliceIndex].sliceFrac === Infinity) {
            // render views always world space
            return this.drawCrossLinesMM(sliceIndex, axCorSag, axiMM, corMM, sagMM)
        }
        const tile = this.screenSlices[sliceIndex]
        const { linesH, linesV } = SliceRenderer.getCrossLinesForSliceType(axCorSag, axiMM, corMM, sagMM)

        if (linesH.length > 0) {
            // draw horizontal lines
            const LTWH = tile.leftTopWidthHeight.slice()
            let sliceDim = 2 // vertical axis is Zmm
            if (axCorSag === SLICE_TYPE.AXIAL) {
                sliceDim = 1
            } // vertical axis is Ymm
            const mm = this.frac2mm([0.5, 0.5, 0.5])
            for (let i = 0; i < linesH.length; i++) {
                mm[sliceDim] = linesH[i]
                const frac = this.mm2frac(mm)
                this.drawRect([LTWH[0], LTWH[1] + LTWH[3] - frac[sliceDim] * LTWH[3], LTWH[2], 1])
            }
        }
        if (linesV.length > 0) {
            // draw vertical lines
            const LTWH = tile.leftTopWidthHeight.slice()
            const isRadiological = tile.fovMM[0] < 0
            let sliceDim = 0 // vertical lines on axial/coronal are L/R axis
            if (axCorSag === SLICE_TYPE.SAGITTAL) {
                sliceDim = 1
            } // vertical lines on sagittal are A/P
            const mm = this.frac2mm([0.5, 0.5, 0.5])
            for (let i = 0; i < linesV.length; i++) {
                mm[sliceDim] = linesV[i]
                const frac = this.mm2frac(mm)
                if (isRadiological) {
                    this.drawRect([LTWH[0] + (LTWH[2] - frac[sliceDim] * LTWH[2]), LTWH[1], 1, LTWH[3]])
                } else {
                    this.drawRect([LTWH[0] + frac[sliceDim] * LTWH[2], LTWH[1], 1, LTWH[3]])
                }
            }
        }
    }

    /**
     * display a lightbox or montage view
     * @param mosaicStr - specifies orientation (A,C,S) and location of slices.
     * @example niivue.setSliceMosaicString("A -10 0 20");
     * @see {@link https://niivue.com/demos/features/mosaics.html | live demo usage}
     */
    drawMosaic(mosaicStr: string): void {
        this.screenSlices = []

        // Determine drawing region from bounds (normalized → pixels)
        const [regionX, regionY, regionW, regionH] = this.getBoundsRegion()

        // render always in world space
        const fovRenderMM = this.screenFieldOfViewMM(SLICE_TYPE.AXIAL, true)
        const fovSliceMM = this.screenFieldOfViewMM(SLICE_TYPE.AXIAL)

        mosaicStr = mosaicStr.replaceAll(';', ' ;').trim()
        const axiMM: number[] = []
        const corMM: number[] = []
        const sagMM: number[] = []
        const items = mosaicStr.split(/\s+/)
        let scale = 1.0
        const labelSize = this.fontPx
        let marginLeft = 0
        let marginTop = 0
        let tileGap = 0
        if (!this.volumes[0]?.dims) {
            tileGap = Math.ceil(this.opts.tileMargin * 0.3)
        }

        for (let pass = 0; pass < 2; pass++) {
            let isRender = false
            let isCrossLines = false
            let rowHt = 0
            let left = 0
            let top = 0
            let mxRowWid = 0
            let isLabel = false
            let axCorSag = SLICE_TYPE.AXIAL
            let horizontalOverlap = 0
            let prevW = 0
            let w = 0

            for (let i = 0; i < items.length; i++) {
                const item = items[i]
                if (item.includes('X')) {
                    isCrossLines = true
                    continue
                }
                if (item.includes('L')) {
                    isLabel = !item.includes('-')
                    continue
                }
                if (item.includes('H')) {
                    i++
                    horizontalOverlap = Math.abs(Math.max(0, Math.min(1, parseFloat(items[i]))))
                    continue
                }
                if (item.includes('V')) {
                    i++
                    continue
                }
                if (item.includes('A')) {
                    axCorSag = SLICE_TYPE.AXIAL
                    continue
                }
                if (item.includes('C')) {
                    axCorSag = SLICE_TYPE.CORONAL
                    continue
                }
                if (item.includes('S')) {
                    axCorSag = SLICE_TYPE.SAGITTAL
                    continue
                }
                if (item.includes('R')) {
                    isRender = true
                    continue
                }
                if (item.includes(';')) {
                    top += rowHt
                    mxRowWid = Math.max(mxRowWid, left + prevW)
                    rowHt = 0
                    left = 0
                    prevW = 0
                    continue
                }

                w = prevW
                if (horizontalOverlap > 0 && !isRender) {
                    w = Math.round(w * (1.0 - horizontalOverlap))
                }
                left += w
                w = 0
                const sliceMM = parseFloat(item)
                if (isNaN(sliceMM)) {
                    continue
                }

                let h = 0
                let fov = fovSliceMM
                if (isRender) {
                    fov = fovRenderMM
                }

                if (axCorSag === SLICE_TYPE.SAGITTAL) {
                    w = fov[1]
                } else {
                    w = fov[0]
                }
                if (axCorSag === SLICE_TYPE.AXIAL) {
                    h = fov[1]
                } else {
                    h = fov[2]
                }

                if (pass === 0) {
                    if (!isRender) {
                        if (axCorSag === SLICE_TYPE.AXIAL) {
                            axiMM.push(sliceMM)
                        }
                        if (axCorSag === SLICE_TYPE.CORONAL) {
                            corMM.push(sliceMM)
                        }
                        if (axCorSag === SLICE_TYPE.SAGITTAL) {
                            sagMM.push(sliceMM)
                        }
                    }
                } else {
                    // Apply margins relative to regionX/regionY
                    const ltwh = [regionX + marginLeft + scale * left, regionY + marginTop + scale * top, scale * w, scale * h] as [number, number, number, number]
                    this.fontPx = isLabel ? labelSize : 0

                    if (isRender) {
                        let inf = sliceMM < 0 ? -Infinity : Infinity
                        if (Object.is(sliceMM, -0)) {
                            inf = -Infinity
                        }
                        this.draw2D(ltwh, axCorSag, inf)
                    } else {
                        this.draw2D(ltwh, axCorSag, sliceMM)
                    }

                    if (isCrossLines) {
                        this.drawCrossLines(this.screenSlices.length - 1, axCorSag, axiMM, corMM, sagMM)
                    }
                    isRender = false
                    isCrossLines = false
                }
                prevW = w
                left += tileGap
                rowHt = Math.max(rowHt, h)
            }

            top += rowHt
            mxRowWid = Math.max(mxRowWid, left + prevW)
            if (mxRowWid <= 0 || top <= 0) {
                break
            }

            const scaleW = (regionW - 2 * this.opts.tileMargin - tileGap) / mxRowWid
            const scaleH = (regionH - 2 * this.opts.tileMargin) / top
            scale = Math.min(scaleW, scaleH)

            if (this.opts.centerMosaic) {
                marginLeft = Math.floor(0.5 * (regionW - mxRowWid * scale))
                marginTop = Math.floor(0.5 * (regionH - top * scale))
            } else {
                marginLeft = this.opts.tileMargin
                marginTop = this.opts.tileMargin
            }
        }
        this.fontPx = labelSize
    }

    /**
     * Calculate width and height to fit a slice within a container, preserving aspect ratio based on slice type and volume scaling.
     * @internal
     */
    calculateWidthHeight(sliceType: number, volScale: number[], containerWidth: number, containerHeight: number): [number, number] {
        return SliceRenderer.calculateSliceDimensions(sliceType as SLICE_TYPE, volScale, containerWidth, containerHeight)
    }

    /**
     * Convert opts.bounds into CSS pixel coordinates (for hit testing).
     * @returns [x, y, width, height] in CSS pixels
     */
    private getBoundsRegionCSS(): [number, number, number, number] {
        const rect = (this.gl.canvas as HTMLCanvasElement).getBoundingClientRect()
        return LayoutManager.calculateBoundsRegionCSS({
            bounds: this.opts.bounds as LayoutManager.NormalizedBounds | null | undefined,
            rectWidth: rect.width,
            rectHeight: rect.height
        })
    }

    /**
     * Returns true if a mouse/touch event happened inside this instance's bounds.
     */
    public eventInBounds(evt: MouseEvent | Touch | TouchEvent): boolean {
        const rect = (this.gl.canvas as HTMLCanvasElement).getBoundingClientRect()

        let clientX: number
        let clientY: number

        if (evt instanceof MouseEvent) {
            clientX = evt.clientX
            clientY = evt.clientY
        } else if (evt instanceof TouchEvent) {
            // Prefer the first touch if active, else changedTouches
            const touch = evt.touches[0] ?? evt.changedTouches[0]
            if (!touch) {
                return false
            }
            clientX = touch.clientX
            clientY = touch.clientY
        } else {
            // direct Touch
            clientX = evt.clientX
            clientY = evt.clientY
        }

        const cssX = clientX - rect.left
        const cssY = clientY - rect.top

        return LayoutManager.isPointInBoundsCSS({
            x: cssX,
            y: cssY,
            boundsRegion: this.getBoundsRegionCSS()
        })
    }

    /**
     * Check whether the last known mouse cursor position is inside this instance's bounds.
     *
     * Used to filter keyboard events so they are only handled by the Niivue instance
     * whose bounds currently contain the cursor.
     *
     * @returns true if the cursor is inside this.opts.bounds, false otherwise.
     * @internal
     */
    private cursorInBounds(): boolean {
        return LayoutManager.isCursorInBounds({
            mouseX: this.mousePos[0],
            mouseY: this.mousePos[1],
            boundsRegion: this.getBoundsRegion()
        })
    }

    /**
     * Compute the current drawing region from opts.bounds.
     * Returns [x, y, width, height] in device pixels, bottom-left origin.
     */
    private getBoundsRegion(): [number, number, number, number] {
        const gl = this.gl
        const dpr = this.uiData?.dpr || window.devicePixelRatio || 1
        const canvas = gl.canvas as HTMLCanvasElement

        return LayoutManager.calculateBoundsRegion({
            bounds: this.opts.bounds as LayoutManager.NormalizedBounds | null | undefined,
            canvasWidth: gl.canvas.width,
            canvasHeight: gl.canvas.height,
            cssWidth: canvas.clientWidth,
            cssHeight: canvas.clientHeight,
            dpr
        })
    }

    /**
     * Return true if the given canvas pixel coordinates are inside this Niivue instance's bounds.
     */
    inBounds(x: number, y: number): boolean {
        return SliceNavigation.isInBounds({
            x,
            y,
            dpr: this.uiData.dpr!,
            canvasHeight: this.gl.canvas.height,
            boundsRegion: this.getBoundsRegion()
        })
    }

    /**
     * Rebind all textures for this instance.
     * Call this at the start of every draw pass if multiple instances share a GL context.
     */
    private bindTextures(): void {
        // Volume texture (2D or 3D depending on is2DSliceShader)
        this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE0_BACK_VOL) // == gl.TEXTURE0
        if (this.opts.is2DSliceShader) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.volumeTexture)
        } else {
            this.gl.bindTexture(this.gl.TEXTURE_3D, this.volumeTexture)
        }

        // Overlay (3D texture)
        this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE2_OVERLAY_VOL) // == gl.TEXTURE2
        this.gl.bindTexture(this.gl.TEXTURE_3D, this.overlayTexture)

        // PAQD (2D or 3D depending on how you created it — in Niivue it’s 2D)
        this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE8_PAQD) // == gl.TEXTURE8
        this.gl.bindTexture(this.gl.TEXTURE_3D, this.paqdTexture)

        // Font atlas (2D texture)
        this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE3_FONT) // == gl.TEXTURE3
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.fontTexture)

        this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE1_COLORMAPS)
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture)

        this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE5_MATCAP)
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.matCapTexture)

        this.gl.activeTexture(TEXTURE_CONSTANTS.TEXTURE6_GRADIENT)
        this.gl.bindTexture(this.gl.TEXTURE_3D, this.gradientTexture)
    }

    /**
     * Clear a rectangular region of this instance's canvas.
     *
     * @param mask - bitmask of buffers to clear (default: color+depth).
     * @param ltwh - optional [x, y, w, h] region in *device px* (GL coords, bottom-left).
     *   If not provided, clears the full instance bounds (getBoundsRegion).
     *   For multiplanar panels, pass the panel’s own [x,y,w,h].
     */
    clearBounds(mask: number = this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT, ltwh?: [number, number, number, number]): void {
        const gl = this.gl
        const [vpX, vpY, vpW, vpH] = ltwh ?? this.getBoundsRegion()

        // Flip Y for scissor (WebGL expects bottom-left origin)
        const flippedY = gl.canvas.height - vpY - vpH

        if (mask & gl.DEPTH_BUFFER_BIT) {
            gl.clearDepth(1.0) // standard for use with gl.depthFunc(gl.LEQUAL)
        }

        gl.enable(gl.SCISSOR_TEST)
        gl.scissor(vpX, flippedY, vpW, vpH)

        if (mask & gl.COLOR_BUFFER_BIT) {
            gl.clearColor(this.opts.backColor[0], this.opts.backColor[1], this.opts.backColor[2], this.opts.backColor[3])
        }

        gl.clear(mask)
        gl.disable(gl.SCISSOR_TEST)
    }

    private drawBoundsBorder(): void {
        if (!this.opts.showBoundsBorder) {
            return
        }
        const [x, y, w, h] = this.getBoundsRegion()
        this.drawBoundsBox([x, y, w, h], this.opts.boundsBorderColor, this.opts.selectionBoxLineThickness)
    }

    /**
     * Core function to draw the entire scene including volumes, meshes, slices, overlays, colorbars, graphs, and handle user interaction like dragging.
     * @internal
     */
    drawSceneCore(): string | void {
        if (!this.initialized) {
            return // do not do anything until we are initialized (init will call drawScene).
        }

        // --- Clear only inside region
        this.colorbarHeight = 0

        // --- Set viewport for all subsequent drawing
        const [vpX, vpY, vpW, vpH] = this.getBoundsRegion()

        this.gl.viewport(vpX, vpY, vpW, vpH)
        this.clearBounds(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
        // rebind all of our textures (we may be sharing our gl context with another component)
        this.bindTextures()

        // --- Thumbnail pass
        if (this.bmpTexture && this.thumbnailVisible) {
            this.drawThumbnail()
            return
        }

        let posString = ''

        // --- No volumes loaded
        if (this.volumes.length === 0 || typeof this.volumes[0].dims === 'undefined') {
            if (this.meshes.length > 0) {
                if (this.sliceMosaicString.length > 0) {
                    if (this.opts.isColorbar) {
                        this.reserveColorbarPanel()
                    }
                    this.drawMosaic(this.sliceMosaicString)
                    if (this.opts.isColorbar) {
                        this.drawColorbar()
                    }
                    return
                }
                this.screenSlices = []
                this.draw3D([vpX, vpY, vpW, vpH]) // use bounds region
                if (this.opts.isColorbar) {
                    this.drawColorbar()
                }
                return
            }
            this.drawLoadingText(this.opts.loadingText)
            return
        }
        // --- Dragging clip plane over 3D rendering
        const activeDepth = this.scene.clipPlaneDepthAziElevs?.[this.uiData.activeClipPlaneIndex]?.[0] ?? 2
        const shouldUpdateClipDrag = ClipPlaneManager.shouldUpdateClipPlaneDrag({
            isDragging: this.uiData.isDragging,
            activeClipPlaneDepth: activeDepth,
            dragStartTileIndex: this.inRenderTile(this.uiData.dragStart[0], this.uiData.dragStart[1])
        })

        if (shouldUpdateClipDrag) {
            const dragDeltaX = this.uiData.dragStart[0] - this.uiData.dragEnd[0]
            const dragDeltaY = this.uiData.dragStart[1] - this.uiData.dragEnd[1]
            const dragResult = ClipPlaneManager.calculateClipPlaneDrag({
                startDepthAziElev: this.uiData.dragClipPlaneStartDepthAziElev,
                dragDeltaX,
                dragDeltaY
            })

            if (dragResult.changed) {
                const idx = this.uiData.activeClipPlaneIndex
                this.scene.clipPlaneDepthAziElevs[idx] = dragResult.depthAziElev
                // Update clip plane directly without calling setClipPlane (which triggers drawScene recursively)
                const clipPlane = ClipPlaneManager.depthAziElevToClipPlane({
                    depth: dragResult.depthAziElev[0],
                    azimuth: dragResult.depthAziElev[1],
                    elevation: dragResult.depthAziElev[2]
                })
                this.scene.clipPlanes[idx] = clipPlane
                this.onClipPlaneChange(clipPlane)
                // Don't return - let drawScene continue naturally
            }
        }

        // --- Single render mode
        if (this.sliceMosaicString.length < 1 && this.opts.sliceType === SLICE_TYPE.RENDER) {
            if (this.opts.isColorbar) {
                this.reserveColorbarPanel()
            }
            this.screenSlices = []
            // this.draw3D([vpX, vpY, vpW, vpH]) // use bounds region
            this.draw3D()
            if (this.opts.isColorbar) {
                this.drawColorbar()
            }
            return
        }

        if (this.opts.isColorbar) {
            this.reserveColorbarPanel()
        }

        const maxVols = this.getMaxVols()
        const isDrawGraph = this.opts.sliceType === SLICE_TYPE.MULTIPLANAR && maxVols > 1 && this.graph.autoSizeMultiplanar && this.graph.opacity > 0

        // --- Mosaic string layout
        if (this.sliceMosaicString.length > 0) {
            this.drawMosaic(this.sliceMosaicString)
        } else {
            // Standard 2D/3D layouts
            const heroImageWH = [0, 0]
            let isHeroImage = false
            this.screenSlices = []

            if (this.customLayout && this.customLayout.length > 0) {
                this.screenSlices = []
                const { volScale } = this.sliceScale()

                // Use vpX, vpY, vpW, vpH from getBoundsRegion earlier
                for (const view of this.customLayout) {
                    const { sliceType, position, sliceMM } = view

                    // position = [x, y, w, h] fractions relative to this instance’s bounds
                    const leftTopWidthHeight: [number, number, number, number] = [vpX + position[0] * vpW, vpY + position[1] * vpH, position[2] * vpW, position[3] * vpH]

                    // Clamp so the slice doesn’t overflow its bounds
                    if (leftTopWidthHeight[0] + leftTopWidthHeight[2] > vpX + vpW) {
                        log.warn('adjusting slice width because it would have been clipped')
                        leftTopWidthHeight[2] = vpX + vpW - leftTopWidthHeight[0]
                    }
                    if (leftTopWidthHeight[1] + leftTopWidthHeight[3] > vpY + vpH) {
                        log.warn('adjusting slice height because it would have been clipped')
                        leftTopWidthHeight[3] = vpY + vpH - leftTopWidthHeight[1]
                    }

                    // Render
                    if (sliceType === SLICE_TYPE.RENDER) {
                        this.draw3D(leftTopWidthHeight)
                    } else {
                        const actualDimensions = this.calculateWidthHeight(sliceType, volScale, leftTopWidthHeight[2], leftTopWidthHeight[3])
                        this.draw2D(leftTopWidthHeight, sliceType, sliceMM ?? NaN, actualDimensions)
                    }
                }
            } else if (this.opts.sliceType === SLICE_TYPE.AXIAL || this.opts.sliceType === SLICE_TYPE.CORONAL || this.opts.sliceType === SLICE_TYPE.SAGITTAL) {
                const { volScale } = this.sliceScale()

                // full available region
                const leftTopWidthHeight = [vpX, vpY, vpW, vpH]

                // preserve mm aspect ratio
                const actualDimensions = this.calculateWidthHeight(this.opts.sliceType, volScale, leftTopWidthHeight[2], leftTopWidthHeight[3])

                this.draw2D([0, 0, 0, 0], this.opts.sliceType, NaN, actualDimensions)
            } else {
                // sliceTypeMultiplanar
                let isShowRender = false
                // this.opts.multiplanarForceRender is deprecated but was boolean.
                // We now need to check if it is true. If so, then the user may not know
                // about the new multiplanarShowRender option, so we need to show the render.
                if (this.opts.multiplanarForceRender) {
                    isShowRender = true
                    // warn the user that the option is deprecated
                    // log.warn(
                    //   'multiplanarForceRender is deprecated. Use multiplanarShowRender instead. Possible values are: "always", "auto", "never".'
                    // )
                    if (this.opts.multiplanarForceRender) {
                        this.opts.multiplanarShowRender = SHOW_RENDER.ALWAYS
                    } else {
                        this.opts.multiplanarShowRender = SHOW_RENDER.AUTO
                    }
                    // purge the deprecated option so it doesn't get used in saved scenes and documents
                    delete this.opts.multiplanarForceRender
                } else {
                    //  check the now preferred multiplanarShowRender option.
                    // if the value is always, then show the render.
                    if (this.opts.multiplanarShowRender === SHOW_RENDER.ALWAYS) {
                        isShowRender = true
                        // warn the user that we are using the new option
                        // log.warn(
                        //   'multiplanarShowRender is set to always and multiplanarForceRender (deprecated) is false. We are assuming you prefer the non-deprecated option: multiplanarShowRender.'
                        // )
                    }
                }
                const isDrawPenDown = isFinite(this.drawPenLocation[0]) && this.opts.drawingEnabled

                const { volScale } = this.sliceScale()
                const actualScale = volScale.slice()
                if (this.opts.multiplanarEqualSize) {
                    volScale[0] = 1
                    volScale[1] = 1
                    volScale[2] = 1
                }
                if (typeof this.opts.multiplanarPadPixels !== 'number') {
                    log.debug('multiplanarPadPixels must be numeric')
                }
                // pad is "outer padding" minimum distance between tiles
                const pad = parseFloat(`${this.opts.multiplanarPadPixels}`) * this.uiData.dpr
                // inner pad is padding inside a tile. Note that a display with 1 row of tiles has no outer pad, but does have inner pad
                let innerPad = this.opts.tileMargin * this.uiData.dpr
                if (innerPad < 0) {
                    innerPad = 2 * (2 + Math.ceil(this.fontPx))
                }
                function padPixelsWH(cols: number, rows: number): [number, number] {
                    return [(cols - 1) * pad + cols * innerPad, (rows - 1) * pad + rows * innerPad]
                }
                // Get this instance's bounds
                // Get this instance's bounds
                const [regionX, regionY, regionW, regionH] = this.getBoundsRegion()

                // Layout constrained to this instance's bounds, minus legend/colorbar space
                let canvasWH: [number, number] = [this.effectiveCanvasWidth(), this.effectiveCanvasHeight()]

                if (this.opts.heroImageFraction > 0 && this.opts.heroImageFraction < 1) {
                    isShowRender = false
                    isHeroImage = true
                    if (canvasWH[0] > canvasWH[1] && this.opts.multiplanarLayout !== MULTIPLANAR_TYPE.ROW) {
                        // landscape canvas: hero image on LEFT
                        heroImageWH[0] = canvasWH[0] * this.opts.heroImageFraction
                    } else {
                        // portrait canvas: hero image on top
                        heroImageWH[1] = canvasWH[1] * this.opts.heroImageFraction
                    }
                    canvasWH = [canvasWH[0] - heroImageWH[0], canvasWH[1] - heroImageWH[1]]
                }

                // size for 2 rows, 2 columns
                const ltwh2x2 = this.scaleSlice(volScale[0] + volScale[1], volScale[1] + volScale[2], padPixelsWH(2, 2), canvasWH)
                const mx = Math.max(Math.max(volScale[1], volScale[2]), volScale[0])
                // size for 3 columns and 1 row
                const ltwh3x1 = this.scaleSlice(volScale[0] + volScale[0] + volScale[1], Math.max(volScale[1], volScale[2]), padPixelsWH(3, 1), canvasWH)
                // size for 4 columns and 1 row
                const ltwh4x1 = this.scaleSlice(volScale[0] + volScale[0] + volScale[1] + mx, Math.max(volScale[1], volScale[2]), padPixelsWH(4, 1), canvasWH)
                // size for 1 column * 3 rows
                const ltwh1x3 = this.scaleSlice(mx, volScale[1] + volScale[2] + volScale[2], padPixelsWH(1, 3), canvasWH)
                // size for 1 column * 4 rows
                const ltwh1x4 = this.scaleSlice(mx, volScale[1] + volScale[2] + volScale[2] + mx, padPixelsWH(1, 4), canvasWH)

                let isDraw3D = !isDrawPenDown && (maxVols < 2 || !isDrawGraph)
                let isDrawColumn = false
                let isDrawGrid = false
                let isDrawRow = false
                if (this.opts.multiplanarLayout === MULTIPLANAR_TYPE.COLUMN) {
                    isDrawColumn = true
                } else if (this.opts.multiplanarLayout === MULTIPLANAR_TYPE.GRID) {
                    isDrawGrid = true
                } else if (this.opts.multiplanarLayout === MULTIPLANAR_TYPE.ROW) {
                    isDrawRow = true
                } else {
                    // auto select layout based on canvas size
                    if (ltwh1x3[4] > ltwh3x1[4] && ltwh1x3[4] > ltwh2x2[4]) {
                        isDrawColumn = true
                    } else if (ltwh3x1[4] > ltwh2x2[4]) {
                        isDrawRow = true
                    } else {
                        isDrawGrid = true
                    }
                }

                let ltwh = ltwh2x2
                if (isDrawColumn) {
                    ltwh = ltwh1x3
                    if (!isHeroImage && (isShowRender || (this.opts.multiplanarShowRender === SHOW_RENDER.AUTO && ltwh1x4[4] >= ltwh1x3[4]))) {
                        ltwh = ltwh1x4
                    } else {
                        isDraw3D = false
                    }
                } else if (isDrawRow) {
                    ltwh = ltwh3x1
                    if (!isHeroImage && (isShowRender || (this.opts.multiplanarShowRender === SHOW_RENDER.AUTO && ltwh4x1[4] >= ltwh3x1[4]))) {
                        ltwh = ltwh4x1
                    } else {
                        isDraw3D = false
                    }
                }

                if (isHeroImage) {
                    // issue1082 draw hero image
                    const heroW = heroImageWH[0] === 0 ? regionW : heroImageWH[0]
                    const heroH = heroImageWH[1] === 0 ? regionH : heroImageWH[1]
                    if (this.opts?.heroSliceType === SLICE_TYPE.AXIAL || this.opts?.heroSliceType === SLICE_TYPE.CORONAL || this.opts?.heroSliceType === SLICE_TYPE.SAGITTAL) {
                        this.draw2D([regionX, regionY, heroW, heroH], this.opts.heroSliceType, NaN, [Infinity, Infinity])
                    } else {
                        const ltwh2 = ltwh.slice()
                        if (heroW === regionW) {
                            ltwh2[0] = 0
                        }
                        this.draw3D([regionX + ltwh2[0], regionY, heroW, heroH])
                    }
                    ltwh[0] += heroImageWH[0]
                    ltwh[1] += heroImageWH[1]
                    isDraw3D = false
                }

                // panel sizes
                const sX = volScale[0] * ltwh[4] + innerPad
                const sY = volScale[1] * ltwh[4] + innerPad
                const sZ = volScale[2] * ltwh[4] + innerPad
                const actualX = actualScale[0] * ltwh[4]
                const actualY = actualScale[1] * ltwh[4]
                const actualZ = actualScale[2] * ltwh[4]

                // All draw calls offset by regionX/regionY
                if (isDrawColumn) {
                    this.draw2D([regionX + ltwh[0], regionY + ltwh[1], sX, sY], SLICE_TYPE.AXIAL, NaN, [actualX, actualY])
                    this.draw2D([regionX + ltwh[0], regionY + ltwh[1] + sY + pad, sX, sZ], SLICE_TYPE.CORONAL, NaN, [actualX, actualZ])
                    this.draw2D([regionX + ltwh[0], regionY + ltwh[1] + sY + pad + sZ + pad, sY, sZ], SLICE_TYPE.SAGITTAL, NaN, [actualY, actualZ])
                    if (isDraw3D) {
                        const sMx = mx * ltwh[4]
                        this.draw3D([regionX + ltwh[0], regionY + ltwh[1] + sY + sZ + sZ + pad * 3, sMx, sMx])
                    }
                } else if (isDrawRow) {
                    this.draw2D([regionX + ltwh[0], regionY + ltwh[1], sX, sY], SLICE_TYPE.AXIAL, NaN, [actualX, actualY])
                    this.draw2D([regionX + ltwh[0] + sX + pad, regionY + ltwh[1], sX, sZ], SLICE_TYPE.CORONAL, NaN, [actualX, actualZ])
                    this.draw2D([regionX + ltwh[0] + sX + sX + pad * 2, regionY + ltwh[1], sY, sZ], SLICE_TYPE.SAGITTAL, NaN, [actualY, actualZ])
                    if (isDraw3D) {
                        const sMx = mx * ltwh[4]
                        this.draw3D([regionX + ltwh[0] + sX + sX + sY + pad * 3, regionY + ltwh[1], sMx, sMx])
                    }
                } else if (isDrawGrid) {
                    if (!isShowRender) {
                        isDraw3D = false
                    }
                    if (this.opts.multiplanarShowRender === SHOW_RENDER.AUTO) {
                        isDraw3D = true
                    }
                    if (isHeroImage) {
                        isDraw3D = false
                    }
                    this.draw2D([regionX + ltwh[0], regionY + ltwh[1] + sZ + pad, sX, sY], SLICE_TYPE.AXIAL, NaN, [actualX, actualY])
                    this.draw2D([regionX + ltwh[0], regionY + ltwh[1], sX, sZ], SLICE_TYPE.CORONAL, NaN, [actualX, actualZ])
                    this.draw2D([regionX + ltwh[0] + sX + pad, regionY + ltwh[1], sY, sZ], SLICE_TYPE.SAGITTAL, NaN, [actualY, actualZ])
                    if (isDraw3D) {
                        this.draw3D([regionX + ltwh[0] + sX + pad, regionY + ltwh[1] + sZ + pad, sY, sY])
                    }
                }
            }
        }
        if (this.opts.isRuler) {
            this.drawRuler()
        }
        if (this.opts.isColorbar) {
            this.drawColorbar()
        }
        if (isDrawGraph) {
            this.drawGraph()
        }
        if (this.uiData.isDragging) {
            if (this.uiData.mouseButtonCenterDown) {
                this.dragForCenterButton([this.uiData.dragStart[0], this.uiData.dragStart[1], this.uiData.dragEnd[0], this.uiData.dragEnd[1]])
                return
            }
            if (this.getCurrentDragMode() === DRAG_MODE.slicer3D) {
                this.dragForSlicer3D([this.uiData.dragStart[0], this.uiData.dragStart[1], this.uiData.dragEnd[0], this.uiData.dragEnd[1]])
                return
            }
            if (this.getCurrentDragMode() === DRAG_MODE.pan && !this._skipDragInDraw) {
                this.dragForPanZoom([this.uiData.dragStart[0], this.uiData.dragStart[1], this.uiData.dragEnd[0], this.uiData.dragEnd[1]])
                return
            }
            if (this.inRenderTile(this.uiData.dragStart[0], this.uiData.dragStart[1]) >= 0) {
                return
            }
            if (this.getCurrentDragMode() === DRAG_MODE.measurement) {
                this.drawMeasurementTool([this.uiData.dragStart[0], this.uiData.dragStart[1], this.uiData.dragEnd[0], this.uiData.dragEnd[1]])
            }
            if (this.getCurrentDragMode() === DRAG_MODE.angle) {
                this.drawAngleMeasurementTool()
            }
            // Only draw selection box for specific drag modes that need it
            const currentDragMode = this.getCurrentDragMode()
            if (currentDragMode === DRAG_MODE.contrast || currentDragMode === DRAG_MODE.roiSelection) {
                const width = Math.abs(this.uiData.dragStart[0] - this.uiData.dragEnd[0])
                const height = Math.abs(this.uiData.dragStart[1] - this.uiData.dragEnd[1])
                this.drawSelectionBox([Math.min(this.uiData.dragStart[0], this.uiData.dragEnd[0]), Math.min(this.uiData.dragStart[1], this.uiData.dragEnd[1]), width, height])
            }
        }

        // Draw persistent completed measurements for current slice
        for (const measurement of this.document.completedMeasurements) {
            if (this.shouldDrawOnCurrentSlice(measurement.sliceIndex, measurement.sliceType, measurement.slicePosition)) {
                // Convert world coordinates back to canvas coordinates for rendering
                const startFrac = this.mm2frac(measurement.startMM)
                const endFrac = this.mm2frac(measurement.endMM)
                const startCanvasResult = this.frac2canvasPosWithTile(startFrac, measurement.sliceType)
                const endCanvasResult = this.frac2canvasPosWithTile(endFrac, measurement.sliceType)

                // Only draw if both points are on the same tile to prevent diagonal lines across slices
                if (startCanvasResult && endCanvasResult && startCanvasResult.tileIndex === endCanvasResult.tileIndex) {
                    this.drawMeasurementTool([startCanvasResult.pos[0], startCanvasResult.pos[1], endCanvasResult.pos[0], endCanvasResult.pos[1]])
                }
            }
        }

        // Draw persistent completed angles for current slice
        for (let i = 0; i < this.document.completedAngles.length; i++) {
            const angle = this.document.completedAngles[i]

            const shouldDraw = this.shouldDrawOnCurrentSlice(angle.sliceIndex, angle.sliceType, angle.slicePosition)

            if (shouldDraw) {
                // Convert world coordinates back to canvas coordinates for rendering
                const firstLineStartFrac = this.mm2frac(angle.firstLineMM.start)
                const firstLineEndFrac = this.mm2frac(angle.firstLineMM.end)
                const secondLineStartFrac = this.mm2frac(angle.secondLineMM.start)
                const secondLineEndFrac = this.mm2frac(angle.secondLineMM.end)

                const firstLineStartCanvasResult = this.frac2canvasPosWithTile(firstLineStartFrac, angle.sliceType)
                const firstLineEndCanvasResult = this.frac2canvasPosWithTile(firstLineEndFrac, angle.sliceType)
                const secondLineStartCanvasResult = this.frac2canvasPosWithTile(secondLineStartFrac, angle.sliceType)
                const secondLineEndCanvasResult = this.frac2canvasPosWithTile(secondLineEndFrac, angle.sliceType)

                // Only draw if all points are on the same tile to prevent diagonal lines across slices
                if (
                    firstLineStartCanvasResult &&
                    firstLineEndCanvasResult &&
                    secondLineStartCanvasResult &&
                    secondLineEndCanvasResult &&
                    firstLineStartCanvasResult.tileIndex === firstLineEndCanvasResult.tileIndex &&
                    firstLineStartCanvasResult.tileIndex === secondLineStartCanvasResult.tileIndex &&
                    firstLineStartCanvasResult.tileIndex === secondLineEndCanvasResult.tileIndex
                ) {
                    this.drawMeasurementTool([firstLineStartCanvasResult.pos[0], firstLineStartCanvasResult.pos[1], firstLineEndCanvasResult.pos[0], firstLineEndCanvasResult.pos[1]], false)
                    this.drawMeasurementTool([secondLineStartCanvasResult.pos[0], secondLineStartCanvasResult.pos[1], secondLineEndCanvasResult.pos[0], secondLineEndCanvasResult.pos[1]], false)

                    // Draw angle text - need to convert back to old format for the existing function
                    const angleForText = {
                        firstLine: [firstLineStartCanvasResult.pos[0], firstLineStartCanvasResult.pos[1], firstLineEndCanvasResult.pos[0], firstLineEndCanvasResult.pos[1]],
                        secondLine: [secondLineStartCanvasResult.pos[0], secondLineStartCanvasResult.pos[1], secondLineEndCanvasResult.pos[0], secondLineEndCanvasResult.pos[1]],
                        sliceIndex: angle.sliceIndex,
                        sliceType: angle.sliceType,
                        slicePosition: angle.slicePosition
                    }
                    this.drawAngleTextForAngle(angleForText)
                }
            }
        }

        // draw circle at mouse position if clickToSegment is enabled
        // xxxxxxxxx
        // if (this.opts.clickToSegment) {
        //   const x = this.mousePos[0]
        //   const y = this.mousePos[1]
        //   // check if hovering over the 3D render tile
        //   if (this.inRenderTile(x, y) >= 0) {
        //     // exit early since we do not want to draw the cursor here!
        //     return
        //   }
        //   // determine the tile the mouse is hovering in
        //   const tileIdx = this.tileIndex(x, y)
        //   // if a valid tile index, draw the circle
        //   if (tileIdx > -1) {
        //     // get fov in mm for this plane presented in the tile
        //     const fovMM = this.screenSlices[tileIdx].fovMM
        //     // get the left, top, width, height of the tile in pixels
        //     const ltwh = this.screenSlices[tileIdx].leftTopWidthHeight
        //     // calculate the pixel to mm scale so we can draw the circle
        //     // in pixels (so it is highres) but with the radius specified in mm
        //     const pixPerMM = ltwh[2] / fovMM[0]
        //     // get the crosshair color, but replace the alpha because we want it to be transparent
        //     // no matter what. We want to see the image data underneath the circle.
        //     const color = this.opts.crosshairColor
        //     const segmentCursorColor = [color[0], color[1], color[2], 0.4]
        //     const radius = this.opts.clickToSegmentRadius * pixPerMM
        //     this.drawCircle([x - radius, y - radius, radius * 2, radius * 2], segmentCursorColor, 1)
        //   }
        // }

        const pos = this.frac2mm([this.scene.crosshairPos[0], this.scene.crosshairPos[1], this.scene.crosshairPos[2]])

        posString = pos[0].toFixed(2) + '×' + pos[1].toFixed(2) + '×' + pos[2].toFixed(2)
        this.readyForSync = true // by the time we get here, all volumes should be loaded and ready to be drawn. We let other niivue instances know that we can now reliably sync draw calls (images are loaded)
        this.sync()
        this.drawAnchoredLabels()
        this.drawBoundsBorder()
        return posString
    }

    /**
     * Manage draw calls to prevent concurrency issues, calling drawSceneCore and handling refresh flags.
     * @internal
     */
    drawScene(): string | void {
        if (this.isBusy) {
            // limit concurrent draw calls (chrome v FireFox)
            this.needsRefresh = true
            return
        }
        this.isBusy = false
        this.needsRefresh = false
        let posString = this.drawSceneCore()
        // Chrome and Safari get much more bogged down by concurrent draw calls than Safari
        // https://stackoverflow.com/questions/51710067/webgl-async-operations
        // glFinish operation and the documentation for it says: "does not return until the effects of all previously called GL commands are complete."
        // await this.gl.finish();
        if (this._gl !== null) {
            this.gl.finish()
        }
        if (this.needsRefresh) {
            posString = this.drawScene()
        }
        return posString
    }

    /**
     * Creates a 3D 1-component uint8 texture on the GPU with given dimensions.
     * @internal
     */
    r8Tex(texID: WebGLTexture | null, activeID: number, dims: number[], isInit = false): WebGLTexture | null {
        return glUtils.r8Tex(this.gl, texID, activeID, dims, isInit)
    }

    /**
     * Creates or updates a 1-component 16-bit signed integer 3D texture on the GPU.
     * @internal
     */
    r16Tex(texID: WebGLTexture | null, activeID: number, dims: number[], img16: Int16Array): WebGLTexture {
        return glUtils.r16Tex(this.gl, texID, activeID, dims, img16)
    }

    /**
     * Creates a 2D 4-component (RGBA) uint8 texture on the GPU with optional vertical flip.
     * @internal
     */
    rgbaTex2D(texID: WebGLTexture | null, activeID: number, dims: number[], data: Uint8Array | null = null, isFlipVertical: boolean = true): WebGLTexture | null {
        return glUtils.rgbaTex2D(this.gl, texID, activeID, dims, data, isFlipVertical)
    }

    /**
     * Creates a 3D 4-component (RGBA) uint8 texture on the GPU, optionally initializing with empty data.
     * @internal
     */
    rgbaTex(texID: WebGLTexture | null, activeID: number, dims: number[], isInit = false): WebGLTexture | null {
        return glUtils.rgbaTex(this.gl, texID, activeID, dims, isInit)
    }

    /**
     * Create or recreate a 3D RGBA16UI texture on the GPU with given dimensions.
     * Deletes existing texture if provided, then allocates storage and optionally initializes with zeros.
     * @internal
     */
    rgba16Tex(texID: WebGLTexture | null, activeID: number, dims: number[], isInit = false): WebGLTexture | null {
        return glUtils.rgba16Tex(this.gl, texID, activeID, dims, isInit)
    }

    /**
     * Remove cross-origin attribute from image if its URL is not from the same origin as the current page.
     * @internal
     */
    requestCORSIfNotSameOrigin(img: HTMLImageElement, url: string): void {
        glUtils.requestCORSIfNotSameOrigin(img, url)
    }

    /**
     * Loads a PNG image from a URL and creates a 4-component (RGBA) uint8 WebGL texture.
     * Binds texture to a specific texture unit depending on textureNum and sets texture parameters.
     * Automatically handles CORS and draws scene if needed.
     * @internal
     */
    async loadPngAsTexture(pngUrl: string, textureNum: number): Promise<WebGLTexture | null> {
        const texture = await glUtils.loadPngAsTexture(
            this.gl,
            pngUrl,
            textureNum,
            this.fontShader,
            this.bmpShader,
            this.fontTexture,
            this.bmpTexture,
            this.matCapTexture,
            (widthHeightRatio) => {
                this.bmpTextureWH = widthHeightRatio
            },
            () => {
                this.drawScene()
            }
        )

        // Update the appropriate texture property based on textureNum
        if (textureNum === 3) {
            this.fontTexture = texture
        } else if (textureNum === 4) {
            this.bmpTexture = texture
        } else if (textureNum === 5) {
            this.matCapTexture = texture
        }

        return texture
    }

    /**
     * Loads a font stored as a PNG bitmap into texture unit 3.
     * @internal
     */
    async loadFontTexture(fontUrl: string): Promise<WebGLTexture | null> {
        return this.loadPngAsTexture(fontUrl, 3)
    }

    /**
     * Loads a PNG bitmap into texture unit 4.
     * @internal
     */
    async loadBmpTexture(bmpUrl: string): Promise<WebGLTexture | null> {
        return this.loadPngAsTexture(bmpUrl, 4)
    }

    /**
     * Load matcap for illumination model.
     * @param bmpUrl - name of matcap to load ("Shiny", "Cortex", "Cream")
     * @example
     * niivue.loadMatCapTexture("Cortex");
     * @see {@link https://niivue.com/demos/features/shiny.volumes.html | live demo usage}
     */
    async loadMatCapTexture(bmpUrl: string): Promise<WebGLTexture | null> {
        return this.loadPngAsTexture(bmpUrl, 5)
    }

    /**
     * Getter for WebGL2 rendering context; throws error if context is unavailable.
     * @internal
     */
    get gl(): WebGL2RenderingContext {
        if (!this._gl) {
            throw new Error("unable to get WebGL context. Maybe the browser doesn't support WebGL2.")
        }
        return this._gl
    }

    /**
     * Setter for WebGL2 rendering context.
     * @internal
     */
    set gl(gl: WebGL2RenderingContext | null) {
        this._gl = gl
    }

    /**
     * Find the first and last slices containing drawing data along a given axis
     * @param sliceType - The slice orientation (AXIAL, CORONAL, or SAGITTAL)
     * @returns Object containing first and last slice indices, or null if no data found
     */
    findDrawingBoundarySlices(sliceType: SLICE_TYPE): { first: number; last: number } | null {
        if (!this.back || !this.back.dims || !this.drawBitmap) {
            return null
        }

        const dims = { dimX: this.back.dims[1], dimY: this.back.dims[2], dimZ: this.back.dims[3] }
        return findBoundarySlices(sliceType, this.drawBitmap, dims)
    }

    /**
     * Interpolate between mask slices using geometric or intensity-guided methods
     * @param sliceIndexLow - Lower slice index (optional, will auto-detect if not provided)
     * @param sliceIndexHigh - Higher slice index (optional, will auto-detect if not provided)
     * @param options - Interpolation options
     */
    interpolateMaskSlices(
        sliceIndexLow?: number,
        sliceIndexHigh?: number,
        options: {
            intensityWeight?: number
            binaryThreshold?: number
            intensitySigma?: number
            applySmoothingToSlices?: boolean
            useIntensityGuided?: boolean
            sliceType?: SLICE_TYPE
        } = {}
    ): void {
        if (!this.back || !this.back.dims || !this.drawBitmap) {
            throw new Error('Background image and drawing bitmap must be loaded')
        }

        const dims = { dimX: this.back.dims[1], dimY: this.back.dims[2], dimZ: this.back.dims[3] }
        const imageData = this.back.img
        const maxVal = this.back.global_max

        interpolateMaskSlices(this.drawBitmap, dims, imageData, maxVal, sliceIndexLow, sliceIndexHigh, options, () => this.refreshDrawing(true))
    }
}
