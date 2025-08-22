import { mat4, vec2, vec3, vec4 } from 'gl-matrix'
import packageJson from '../../package.json' with { type: 'json' }
import { orientCube } from '@/orientCube'
import { NiivueObject3D } from '@/niivue-object3D'
import { LoadFromUrlParams, MeshType, NVMesh, NVMeshLayer } from '@/nvmesh'
import defaultMatCap from '@/matcaps/Shiny.jpg'
import defaultFontPNG from '@/fonts/Roboto-Regular.png'
import defaultFontMetrics from '@/fonts/Roboto-Regular.json' with { type: 'json' }
import { ColorMap, cmapper } from '@/colortables'
import {
  NVDocument,
  NVConfigOptions,
  Scene,
  SLICE_TYPE,
  PEN_TYPE,
  SHOW_RENDER,
  DRAG_MODE,
  COLORMAP_TYPE,
  MULTIPLANAR_TYPE,
  DEFAULT_OPTIONS,
  ExportDocumentData,
  INITIAL_SCENE_DATA,
  MouseEventConfig,
  TouchEventConfig
} from '@/nvdocument'

import {
  LabelTextAlignment,
  LabelLineTerminator,
  NVLabel3D,
  NVLabel3DStyle,
  LabelAnchorPoint,
  LabelAnchorFlag
} from '@/nvlabel'
import { FreeSurferConnectome, NVConnectome } from '@/nvconnectome'
import { NVImage, NVImageFromUrlOptions, NiiDataType, NiiIntentCode, ImageFromUrlOptions } from '@/nvimage'
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
  SyncOpts
} from '@/types'
import { toNiivueObject3D } from '@/nvimage/RenderingUtils'
import { findBoundarySlices, interpolateMaskSlices, drawUndo, encodeRLE, decodeRLE } from '@/drawing'
import {
  vertOrientCubeShader,
  fragOrientCubeShader,
  vertSliceMMShader,
  fragSlice2DShader,
  fragSliceMMShader,
  fragSliceV1Shader,
  vertRectShader,
  vertLineShader,
  vertLine3DShader,
  fragRectShader,
  fragRectOutlineShader,
  vertRenderShader,
  fragRenderShader,
  fragRenderGradientShader,
  fragRenderGradientValuesShader,
  fragRenderSliceShader,
  vertColorbarShader,
  fragColorbarShader,
  vertFontShader,
  fragFontShader,
  vertCircleShader,
  fragCircleShader,
  vertBmpShader,
  fragBmpShader,
  vertOrientShader,
  vertPassThroughShader,
  fragPassThroughShader,
  vertGrowCutShader,
  fragGrowCutShader,
  fragOrientShaderU,
  fragOrientShaderI,
  fragOrientShaderF,
  fragOrientShader,
  fragOrientShaderAtlas,
  fragRGBOrientShader,
  fragPAQDOrientShader,
  vertMeshShader,
  fragMeshShader,
  fragMeshToonShader,
  fragMeshMatcapShader,
  fragMeshOutlineShader,
  fragMeshEdgeShader,
  fragMeshRimShader,
  fragMeshContourShader,
  fragMeshShaderCrevice,
  fragMeshDiffuseEdgeShader,
  fragMeshHemiShader,
  fragMeshMatteShader,
  fragMeshDepthShader,
  fragMeshShaderSHBlue,
  fragMeshSpecularEdgeShader,
  vertFlatMeshShader,
  fragFlatMeshShader,
  vertFiberShader,
  fragFiberShader,
  vertSurfaceShader,
  fragSurfaceShader,
  fragVolumePickingShader,
  blurVertShader,
  blurFragShader,
  sobelBlurFragShader,
  sobelFirstOrderFragShader,
  sobelSecondOrderFragShader,
  gradientOpacityLutCount
} from '@/shader-srcs'
import { Shader } from '@/shader'
import { log } from '@/logger'
import {
  clamp,
  deg2rad,
  img2ras16,
  intensityRaw2Scaled,
  isRadiological,
  negMinMax,
  swizzleVec3,
  tickSpacing,
  unProject,
  unpackFloatFromVec4i,
  readFileAsDataURL
} from '@/utils'
const { version } = packageJson
export { NVMesh, NVMeshFromUrlOptions, NVMeshLayerDefaults } from '@/nvmesh'
export { ColorTables as colortables, cmapper } from '@/colortables'

export { NVImage, NVImageFromUrlOptions } from '@/nvimage'
// export { NVDocument, SLICE_TYPE, DocumentData } from '@/nvdocument'
// address rollup error - https://github.com/rollup/plugins/issues/71
export * from '@/nvdocument'
export { NVUtilities } from '@/nvutilities'
export { LabelTextAlignment, LabelLineTerminator, NVLabel3DStyle, NVLabel3D, LabelAnchorPoint } from '@/nvlabel'
export { NVMeshLoaders } from '@/nvmesh-loaders'
export { NVMeshUtilities } from '@/nvmesh-utilities'

// same rollup error as above during npm run dev, and during the umd build
// TODO: at least remove the umd build when AFNI do not need it anymore
export * from '@/types'

type FontMetrics = {
  distanceRange: number
  size: number
  mets: Record<
    number,
    {
      xadv: number
      uv_lbwh: number[]
      lbwh: number[]
    }
  >
}

/**
 * Entry representing a single colormap with display properties.
 */
type ColormapListEntry = {
  name: string
  min: number
  max: number
  isColorbarFromZero: boolean
  negative: boolean
  visible: boolean
  invert: boolean
}

type Graph = {
  LTWH: number[]
  plotLTWH?: number[]
  opacity: number
  vols: number[]
  autoSizeMultiplanar: boolean
  normalizeValues: boolean
  isRangeCalMinMax: boolean
  backColor?: number[]
  lineColor?: number[]
  textColor?: number[]
  lineThickness?: number
  gridLineThickness?: number
  lineAlpha?: number
  lines?: number[][]
  selectedColumn?: number
  lineRGB?: number[][]
}

type Descriptive = {
  mean: number
  stdev: number
  nvox: number
  volumeMM3: number
  volumeML: number
  min: number
  max: number
  meanNot0: number
  stdevNot0: number
  nvoxNot0: number
  minNot0: number
  maxNot0: number
  cal_min: number
  cal_max: number
  robust_min: number
  robust_max: number
  area: number | null
}

type SliceScale = {
  volScale: number[]
  vox: number[]
  longestAxis: number
  dimsMM: vec3
}

type MvpMatrix2D = {
  modelViewProjectionMatrix: mat4
  modelMatrix: mat4
  normalMatrix: mat4
  leftTopMM: number[]
  fovMM: number[]
}

type MM = {
  mnMM: vec3
  mxMM: vec3
  rotation: mat4
  fovMM: vec3
}

/**
 * mesh file formats that can be loaded
 */
const MESH_EXTENSIONS = [
  'ASC',
  'BYU',
  'DFS',
  'FSM',
  'PIAL',
  'ORIG',
  'INFLATED',
  'SMOOTHWM',
  'SPHERE',
  'WHITE',
  'G',
  'GEO',
  'GII',
  'ICO',
  'MZ3',
  'NV',
  'OBJ',
  'OFF',
  'PLY',
  'SRF',
  'STL',
  'TCK',
  'TRACT',
  'TRI',
  'TRK',
  'TT',
  'TRX',
  'VTK',
  'WRL',
  'X3D',
  'JCON',
  'JSON'
]

// mouse button codes
const LEFT_MOUSE_BUTTON = 0
const CENTER_MOUSE_BUTTON = 1
const RIGHT_MOUSE_BUTTON = 2

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants
// gl.TEXTURE0..31 are constants 0x84C0..0x84DF = 33984..34015
// https://github.com/niivue/niivue/blob/main/docs/development-notes/webgl.md
// persistent textures
const TEXTURE0_BACK_VOL = 33984
const TEXTURE1_COLORMAPS = 33985
const TEXTURE2_OVERLAY_VOL = 33986
const TEXTURE3_FONT = 33987
const TEXTURE4_THUMBNAIL = 33988
const TEXTURE5_MATCAP = 33989
const TEXTURE6_GRADIENT = 33990
const TEXTURE7_DRAW = 33991
const TEXTURE8_PAQD = 33992
// subsequent textures only used transiently
const TEXTURE8_GRADIENT_TEMP = 33992
const TEXTURE9_ORIENT = 33993
const TEXTURE10_BLEND = 33994
const TEXTURE11_GC_BACK = 33995
const TEXTURE12_GC_STRENGTH0 = 33996
const TEXTURE13_GC_STRENGTH1 = 33997
const TEXTURE14_GC_LABEL0 = 33998
const TEXTURE15_GC_LABEL1 = 33999

type UIData = {
  mousedown: boolean
  touchdown: boolean
  mouseButtonLeftDown: boolean
  mouseButtonCenterDown: boolean
  mouseButtonRightDown: boolean
  mouseDepthPicker: boolean
  clickedTile: number
  pan2DxyzmmAtMouseDown: vec4
  prevX: number
  prevY: number
  currX: number
  currY: number
  currentTouchTime: number
  lastTouchTime: number
  touchTimer: NodeJS.Timeout | null
  doubleTouch: boolean
  isDragging: boolean
  dragStart: number[]
  dragEnd: number[]
  dragClipPlaneStartDepthAziElev: number[]
  lastTwoTouchDistance: number
  multiTouchGesture: boolean
  dpr?: number
  max2D?: number
  max3D?: number
  windowX: number // used to track mouse position for DRAG_MODE.windowing
  windowY: number // used to track mouse position for DRAG_MODE.windowing
  activeDragMode: DRAG_MODE | null // currently active drag mode during interaction
  activeDragButton: number | null // mouse button that initiated the current drag
  // angle measurement state
  angleFirstLine: number[] // [x1, y1, x2, y2] for first line
  angleState: 'none' | 'drawing_first_line' | 'drawing_second_line' | 'complete'
}

type SaveImageOptions = {
  filename: string
  isSaveDrawing: boolean
  volumeByIndex: number
}

// default SaveImageOptions
const defaultSaveImageOptions: SaveImageOptions = {
  filename: '',
  isSaveDrawing: false,
  volumeByIndex: 0
}

export type DicomLoaderInput = ArrayBuffer | ArrayBuffer[] | File[]

export type DicomLoader = {
  loader: (data: DicomLoaderInput) => Promise<Array<{ name: string; data: ArrayBuffer }>>
  toExt: string
}

/**
 * Niivue can be attached to a canvas. An instance of Niivue contains methods for
 * loading and rendering NIFTI image data in a WebGL 2.0 context.
 *
 * @example
 * let niivue = new Niivue({crosshairColor: [0,1,0,0.5], textHeight: 0.5}) // a see-through green crosshair, and larger text labels
 */
export class Niivue {
  loaders = {}
  // create a dicom loader
  dicomLoader: DicomLoader | null = null
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
    angleState: 'none'
  }

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

  meshShaders: Array<{ Name: string; Frag: string; shader?: Shader }> = [
    {
      Name: 'Phong',
      Frag: fragMeshShader
    },
    {
      Name: 'Matte',
      Frag: fragMeshMatteShader
    },
    {
      Name: 'Harmonic',
      Frag: fragMeshShaderSHBlue
    },
    {
      Name: 'Hemispheric',
      Frag: fragMeshHemiShader
    },
    {
      Name: 'Crevice',
      Frag: fragMeshShaderCrevice
    },
    {
      Name: 'Edge',
      Frag: fragMeshEdgeShader
    },
    {
      Name: 'Diffuse',
      Frag: fragMeshDiffuseEdgeShader
    },
    {
      Name: 'Outline',
      Frag: fragMeshOutlineShader
    },
    {
      Name: 'Specular',
      Frag: fragMeshSpecularEdgeShader
    },
    {
      Name: 'Toon',
      Frag: fragMeshToonShader
    },
    {
      Name: 'Flat',
      Frag: fragFlatMeshShader
    },
    {
      Name: 'Matcap',
      Frag: fragMeshMatcapShader
    },
    {
      Name: 'Rim',
      Frag: fragMeshRimShader
    },
    {
      Name: 'Silhouette',
      Frag: fragMeshContourShader
    }
  ]

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
  onOptsChange: (
    propertyName: keyof NVConfigOptions,
    newValue: NVConfigOptions[keyof NVConfigOptions],
    oldValue: NVConfigOptions[keyof NVConfigOptions]
  ) => void = () => {}

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
    // Clean up resize listener
    if (this.resizeEventListener) {
      window.removeEventListener('resize', this.resizeEventListener)
      this.resizeEventListener = null
    }

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    // Clean up canvas observer
    if (this.canvasObserver) {
      this.canvasObserver.disconnect()
      this.canvasObserver = null
    }

    // Remove all interaction event listeners
    if (this.canvas && this.opts.interactive) {
      // Mouse events
      this.canvas.removeEventListener('mousedown', this.mouseDownListener.bind(this))
      this.canvas.removeEventListener('mouseup', this.mouseUpListener.bind(this))
      this.canvas.removeEventListener('mousemove', this.mouseMoveListener.bind(this))

      // Touch events
      this.canvas.removeEventListener('touchstart', this.touchStartListener.bind(this))
      this.canvas.removeEventListener('touchend', this.touchEndListener.bind(this))
      this.canvas.removeEventListener('touchmove', this.touchMoveListener.bind(this))

      // Other events
      this.canvas.removeEventListener('wheel', this.wheelListener.bind(this))
      this.canvas.removeEventListener('contextmenu', this.mouseContextMenuListener.bind(this))
      this.canvas.removeEventListener('dblclick', this.resetBriCon.bind(this))

      // Drag and drop
      this.canvas.removeEventListener('dragenter', this.dragEnterListener.bind(this))
      this.canvas.removeEventListener('dragover', this.dragOverListener.bind(this))
      this.canvas.removeEventListener('drop', this.dropListener.bind(this))

      // Keyboard events
      this.canvas.removeEventListener('keyup', this.keyUpListener.bind(this))
      this.canvas.removeEventListener('keydown', this.keyDownListener.bind(this))
    }

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
    this.gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: isAntiAlias
    })
    this.uiData.max2D = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE)
    this.uiData.max3D = this.gl.getParameter(this.gl.MAX_3D_TEXTURE_SIZE)

    log.info('NIIVUE VERSION ', version)
    log.debug(`Max texture size 2D: ${this.uiData.max2D} 3D: ${this.uiData.max3D}`)

    // set parent background container to black (default empty canvas color)
    // avoids white cube around image in 3D render mode
    this.canvas!.parentElement!.style.backgroundColor = 'black'
    // fill all space in parent
    if (this.opts.isResizeCanvas) {
      this.canvas.style.width = '100%'
      this.canvas.style.height = '100%'
      this.canvas.style.display = 'block'
      this.canvas.width = this.canvas.offsetWidth
      this.canvas.height = this.canvas.offsetHeight
      // Store a reference to the bound event handler function
      this.resizeEventListener = (): void => {
        requestAnimationFrame(() => {
          this.resizeListener()
        })
      }
      window.addEventListener('resize', this.resizeEventListener)
      this.resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          this.resizeListener()
        })
      })
      this.resizeObserver.observe(this.canvas.parentElement!)

      // Setup a MutationObserver to detect when canvas is removed from DOM
      this.canvasObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === 'childList' &&
            mutation.removedNodes.length > 0 &&
            Array.from(mutation.removedNodes).includes(this.canvas)
          ) {
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
    otherNV.setClipPlane(this.scene.clipPlaneDepthAziElev)
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
      this.otherNV[i].drawScene()
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
    if (!this.canvas || !this.gl) {
      return
    }
    if (!this.opts.isResizeCanvas) {
      if (this.opts.forceDevicePixelRatio >= 0) {
        log.warn('this.opts.forceDevicePixelRatio requires isResizeCanvas')
      }
      this.drawScene()
      return
    }
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.display = 'block'

    // https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
    // https://www.khronos.org/webgl/wiki/HandlingHighDPI
    if (this.opts.forceDevicePixelRatio === 0) {
      this.uiData.dpr = window.devicePixelRatio || 1
    } else if (this.opts.forceDevicePixelRatio < 0) {
      this.uiData.dpr = 1
    } else {
      this.uiData.dpr = this.opts.forceDevicePixelRatio
    }
    log.debug('devicePixelRatio: ' + this.uiData.dpr)
    if ('width' in this.canvas.parentElement!) {
      this.canvas.width = (this.canvas.parentElement.width as number) * this.uiData.dpr
      // @ts-expect-error not sure why height is not defined for HTMLElement
      this.canvas.height = this.canvas.parentElement.height * this.uiData.dpr
    } else {
      this.canvas.width = this.canvas.offsetWidth * this.uiData.dpr
      this.canvas.height = this.canvas.offsetHeight * this.uiData.dpr
    }
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
    target = target || event.target
    if (!target) {
      return
    }
    // @ts-expect-error -- not sure how this works, this would be an EventTarget?
    const rect = target.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }

  /**
   * Returns mouse position relative to the canvas, excluding padding and borders.
   * @internal
   */
  getNoPaddingNoBorderCanvasRelativeMousePosition(
    event: MouseEvent,
    target: EventTarget
  ): { x: number; y: number } | undefined {
    target = target || event.target
    const pos = this.getRelativeMousePosition(event, target)
    return pos
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
    e.preventDefault()
    // var rect = this.canvas.getBoundingClientRect();
    this.drawPenLocation = [NaN, NaN, NaN]
    this.drawPenAxCorSag = -1
    this.drawShapeStartLocation = [NaN, NaN, NaN] // Reset shape start location
    this.uiData.mousedown = true
    // reset drag positions used previously (but not during angle measurement second line)
    if (!(this.opts.dragMode === DRAG_MODE.angle && this.uiData.angleState === 'drawing_second_line')) {
      this.setDragStart(0, 0)
      this.setDragEnd(0, 0)
    }
    log.debug('mouse down')
    log.debug(e)
    // record tile where mouse clicked
    const pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(e, this.gl.canvas)
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
            this.drawScene()
          }
          continue
        }
        for (const node of mesh.nodes as NVConnectomeNode[]) {
          if (node.label === label) {
            this.scene.crosshairPos = this.mm2frac([node.x, node.y, node.z])
            this.updateGLVolume()
            this.drawScene()
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
  }

  /**
   * Gets the appropriate drag mode for a mouse button based on configuration.
   * @internal
   */
  getMouseButtonDragMode(button: number, shiftKey: boolean, ctrlKey: boolean): DRAG_MODE {
    const mouseConfig = this.opts.mouseEventConfig

    if (button === LEFT_MOUSE_BUTTON) {
      if (mouseConfig?.leftButton) {
        if (shiftKey && mouseConfig.leftButton.withShift !== undefined) {
          return mouseConfig.leftButton.withShift
        }
        if (ctrlKey && mouseConfig.leftButton.withCtrl !== undefined) {
          return mouseConfig.leftButton.withCtrl
        }
        return mouseConfig.leftButton.primary
      }
      return ctrlKey ? DRAG_MODE.crosshair : this.opts.dragModePrimary
    } else if (button === RIGHT_MOUSE_BUTTON) {
      if (mouseConfig?.rightButton !== undefined) {
        return mouseConfig.rightButton
      }
      return this.opts.dragMode
    } else if (button === CENTER_MOUSE_BUTTON) {
      if (mouseConfig?.centerButton !== undefined) {
        return mouseConfig.centerButton
      }
      return this.opts.dragMode
    }

    return this.opts.dragMode as DRAG_MODE
  }

  /**
   * Gets the appropriate drag mode for touch events based on configuration.
   * @internal
   */
  getTouchDragMode(isDoubleTouch: boolean): DRAG_MODE {
    const touchConfig = this.opts.touchEventConfig

    if (isDoubleTouch) {
      return touchConfig?.doubleTouch ?? this.opts.dragMode
    }

    return touchConfig?.singleTouch ?? this.opts.dragModePrimary
  }

  /**
   * Sets the active drag mode for the current interaction.
   * @internal
   */
  setActiveDragMode(button: number, shiftKey: boolean, ctrlKey: boolean): void {
    this.uiData.activeDragMode = this.getMouseButtonDragMode(button, shiftKey, ctrlKey)
    this.uiData.activeDragButton = button
  }

  /**
   * Gets the currently active drag mode, or falls back to configured defaults.
   * @internal
   */
  getCurrentDragMode(): DRAG_MODE {
    if (this.uiData.activeDragMode !== null) {
      return this.uiData.activeDragMode
    }
    // Fallback to right-click mode for backward compatibility
    return this.opts.dragMode
  }

  /**
   * Clears the active drag mode.
   * @internal
   */
  clearActiveDragMode(): void {
    this.uiData.activeDragMode = null
    this.uiData.activeDragButton = null
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

          if (
            firstLineStartFrac[0] >= 0 &&
            firstLineEndFrac[0] >= 0 &&
            secondLineStartFrac[0] >= 0 &&
            secondLineEndFrac[0] >= 0
          ) {
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
      }
      this.uiData.isDragging = true
      this.uiData.dragClipPlaneStartDepthAziElev = this.scene.clipPlaneDepthAziElev
    }
  }

  /**
   * calculate the the min and max voxel indices from an array of two values (used in selecting intensities with the selection box)
   * @internal
   * @param array - an array of two values
   * @returns an array of two values representing the min and max voxel indices
   */
  calculateMinMaxVoxIdx(array: number[]): number[] {
    if (array.length > 2) {
      throw new Error('array must not contain more than two values')
    }
    return [Math.floor(Math.min(array[0], array[1])), Math.floor(Math.max(array[0], array[1]))]
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
    if (this.uiData.dragStart[0] === this.uiData.dragEnd[0] && this.uiData.dragStart[1] === this.uiData.dragEnd[1]) {
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

    let hi = -Number.MAX_VALUE
    let lo = Number.MAX_VALUE
    const xrange = this.calculateMinMaxVoxIdx([startVox[0], endVox[0]])
    const yrange = this.calculateMinMaxVoxIdx([startVox[1], endVox[1]])
    const zrange = this.calculateMinMaxVoxIdx([startVox[2], endVox[2]])

    // for our constant dimension we add one so that the for loop runs at least once
    if (startVox[0] - endVox[0] === 0) {
      xrange[1] = startVox[0] + 1
    } else if (startVox[1] - endVox[1] === 0) {
      yrange[1] = startVox[1] + 1
    } else if (startVox[2] - endVox[2] === 0) {
      zrange[1] = startVox[2] + 1
    }

    const hdr = this.volumes[volIdx].hdr
    const img = this.volumes[volIdx].img
    if (!hdr || !img) {
      return
    }

    const xdim = hdr.dims[1]
    const ydim = hdr.dims[2]
    for (let z = zrange[0]; z < zrange[1]; z++) {
      const zi = z * xdim * ydim
      for (let y = yrange[0]; y < yrange[1]; y++) {
        const yi = y * xdim
        for (let x = xrange[0]; x < xrange[1]; x++) {
          const index = zi + yi + x
          if (lo > img[index]) {
            lo = img[index]
          }
          if (hi < img[index]) {
            hi = img[index]
          }
        }
      }
    }
    if (lo >= hi) {
      return
    } // no variability or outside volume
    const mnScale = intensityRaw2Scaled(hdr, lo)
    const mxScale = intensityRaw2Scaled(hdr, hi)
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
    function isFunction(test: unknown): boolean {
      return Object.prototype.toString.call(test).indexOf('Function') > -1
    }
    // let fracPos = this.canvasPos2frac(this.mousePos);
    const uiData = {
      mouseButtonRightDown: this.uiData.mouseButtonRightDown,
      mouseButtonCenterDown: this.uiData.mouseButtonCenterDown,
      isDragging: this.uiData.isDragging,
      mousePos: this.mousePos,
      fracPos: this.canvasPos2frac(this.mousePos)
      // xyzMM: this.frac2mm(fracPos),
    }
    this.uiData.mousedown = false
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
    } else if (
      this.opts.drawingEnabled &&
      !isNaN(this.drawShapeStartLocation[0]) &&
      (this.opts.penType === PEN_TYPE.RECTANGLE || this.opts.penType === PEN_TYPE.ELLIPSE)
    ) {
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
    if (isFunction(this.onMouseUp)) {
      this.onMouseUp(uiData)
    }
    if (this.uiData.isDragging) {
      this.uiData.isDragging = false

      // Handle angle measurement workflow
      if (currentDragMode === DRAG_MODE.angle) {
        if (this.uiData.angleState === 'drawing_first_line') {
          // First line completed, save it and start drawing second line
          this.uiData.angleFirstLine = [
            this.uiData.dragStart[0],
            this.uiData.dragStart[1],
            this.uiData.dragEnd[0],
            this.uiData.dragEnd[1]
          ]
          this.uiData.angleState = 'drawing_second_line'
          // Continue tracking mouse for second line
          this.uiData.isDragging = true
          this.drawScene()
          return
        } else if (this.uiData.angleState === 'drawing_second_line') {
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
        if (
          this.uiData.dragStart[0] === this.uiData.dragEnd[0] &&
          this.uiData.dragStart[1] === this.uiData.dragEnd[1]
        ) {
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
            distance: vec3.distance(
              vec3.fromValues(startMM[0], startMM[1], startMM[2]),
              vec3.fromValues(endMM[0], endMM[1], endMM[2])
            )
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
    if (this.uiData.touchdown && !this.uiData.multiTouchGesture) {
      const rect = this.canvas!.getBoundingClientRect()
      this.mouseDown(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top)

      this.mouseClick(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top)
    }
  }

  /**
   * Handles touch start events, detecting double taps and preparing for gesture or contrast reset.
   * @internal
   */
  touchStartListener(e: TouchEvent): void {
    e.preventDefault()
    if (!this.uiData.touchTimer) {
      this.uiData.touchTimer = setTimeout(() => {
        // this.drawScene()
        this.resetBriCon(e)
      }, this.opts.longTouchTimeout)
    }
    this.uiData.touchdown = true
    this.uiData.currentTouchTime = new Date().getTime()
    const timeSinceTouch = this.uiData.currentTouchTime - this.uiData.lastTouchTime
    if (timeSinceTouch < this.opts.doubleTouchTimeout && timeSinceTouch > 0) {
      this.uiData.doubleTouch = true
      this.setDragStart(
        e.targetTouches[0].clientX - (e.target as HTMLElement).getBoundingClientRect().left,
        e.targetTouches[0].clientY - (e.target as HTMLElement).getBoundingClientRect().top
      )
      this.resetBriCon(e)
      this.uiData.lastTouchTime = this.uiData.currentTouchTime
      return
    } else {
      // reset values to be ready for next touch
      this.uiData.doubleTouch = false
      this.setDragStart(0, 0)
      this.setDragEnd(0, 0)
      this.uiData.lastTouchTime = this.uiData.currentTouchTime
    }
    if (this.uiData.touchdown && e.touches.length < 2) {
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
    this.uiData.touchdown = false
    this.uiData.lastTwoTouchDistance = 0
    this.uiData.multiTouchGesture = false
    if (this.uiData.touchTimer) {
      clearTimeout(this.uiData.touchTimer)
      this.uiData.touchTimer = null
    }
    if (this.uiData.isDragging) {
      this.uiData.isDragging = false
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
    // x and y are the current mouse or touch position in window coordinates
    const wx = this.uiData.windowX
    const wy = this.uiData.windowY
    let mn = this.volumes[0].cal_min
    let mx = this.volumes[0].cal_max
    const gmn = this.volumes[0].global_min
    const gmx = this.volumes[0].global_max

    if (y < wy) {
      // increase level if mouse moves up
      mn += 1
      mx += 1
    } else if (y > wy) {
      // decrease level if mouse moves down
      mn -= 1
      mx -= 1
    }

    if (x > wx) {
      // increase window width if mouse moves right
      mn -= 1
      mx += 1
    } else if (x < wx) {
      // decrease window width if mouse moves left
      mn += 1
      mx -= 1
    }

    if (mx - mn < 1) {
      // ensure window width is at least 1
      mx = mn + 1
    }

    if (mn < gmn) {
      // ensure min is not below global min
      mn = gmn
    }

    if (mx > gmx) {
      // ensure max is not above global max
      mx = gmx
    }

    if (mn > mx) {
      // ensure min is not above max
      mn = mx - 1
    }

    this.volumes[volIdx].cal_min = mn
    this.volumes[volIdx].cal_max = mx
    this.refreshLayers(this.volumes[volIdx], 0)
    // set the current mouse position (window space) as the new reference point
    // for the next comparison
    this.uiData.windowX = x
    this.uiData.windowY = y
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
    if (this.uiData.isDragging) {
      log.debug('Mouse left canvas during drag, resetting drag state.')
      this.uiData.isDragging = false
      this.uiData.mouseButtonLeftDown = false
      this.uiData.mouseButtonCenterDown = false
      this.uiData.mouseButtonRightDown = false
      this.uiData.mousedown = false
      this.drawScene()
    }
  }

  /**
   * Handles mouse move events for dragging, crosshair movement, windowing, and click-to-segment preview.
   * @internal
   */
  mouseMoveListener(e: MouseEvent): void {
    // move crosshair and change slices if mouse click and move
    if (this.uiData.mousedown) {
      const pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(e, this.gl.canvas)
      // ignore if mouse moves outside of tile of initial click
      if (!pos) {
        return
      }

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
        this.mouseClick(pos.x, pos.y)
        this.drawScene()
        this.uiData.prevX = this.uiData.currX
        this.uiData.prevY = this.uiData.currY
        return
      } else if (activeDragMode === DRAG_MODE.windowing) {
        this.windowingHandler(pos.x, pos.y)
        this.drawScene()
        this.uiData.prevX = this.uiData.currX
        this.uiData.prevY = this.uiData.currY
        return
      } else {
        // Handle all other drag modes that need drag tracking
        this.setDragEnd(pos.x, pos.y)
      }
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
    x *= this.uiData.dpr!
    y *= this.uiData.dpr!
    this.uiData.dragStart[0] = x
    this.uiData.dragStart[1] = y
  }

  /**
   * Sets the drag end position in canvas coordinates.
   * @internal
   */
  setDragEnd(x: number, y: number): void {
    x *= this.uiData.dpr!
    y *= this.uiData.dpr!
    this.uiData.dragEnd[0] = x
    this.uiData.dragEnd[1] = y
  }

  /**
   * Handles touch movement for crosshair, windowing, and pinch-to-zoom interactions.
   * @internal
   */
  touchMoveListener(e: TouchEvent): void {
    if (this.uiData.touchdown && e.touches.length < 2) {
      const rect = this.canvas!.getBoundingClientRect()
      if (!this.uiData.isDragging) {
        this.uiData.pan2DxyzmmAtMouseDown = vec4.clone(this.scene.pan2Dxyzmm)
      }
      this.uiData.isDragging = true
      if (this.uiData.doubleTouch && this.uiData.isDragging) {
        this.setDragEnd(
          e.targetTouches[0].clientX - (e.target as HTMLElement).getBoundingClientRect().left,
          e.targetTouches[0].clientY - (e.target as HTMLElement).getBoundingClientRect().top
        )
        this.drawScene()
        return
      }
      const dragMode = this.getTouchDragMode(false)
      if (dragMode === DRAG_MODE.crosshair) {
        this.mouseClick(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top)
        this.mouseMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top)
      } else if (dragMode === DRAG_MODE.windowing) {
        this.windowingHandler(e.touches[0].pageX, e.touches[0].pageY)
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
    if (e.targetTouches.length === 2 && e.changedTouches.length === 2) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY)

      const rect = this.canvas!.getBoundingClientRect()
      this.mousePos = [e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top]

      // scroll 2D slices
      if (dist < this.uiData.lastTwoTouchDistance) {
        // this.scene.volScaleMultiplier = Math.max(0.5, this.scene.volScaleMultiplier * 0.95);
        this.sliceScroll2D(-0.01, e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top)
      } else {
        // this.scene.volScaleMultiplier = Math.min(2.0, this.scene.volScaleMultiplier * 1.05);
        this.sliceScroll2D(0.01, e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top)
      }
      // this.drawScene();
      this.uiData.lastTwoTouchDistance = dist
    }
  }

  /**
   * Handles keyboard shortcuts for toggling clip planes and slice view modes with debounce logic.
   * @internal
   */
  keyUpListener(e: KeyboardEvent): void {
    if (e.code === this.opts.clipPlaneHotKey) {
      const now = new Date().getTime()
      const elapsed = now - this.lastCalled
      if (elapsed > this.opts.keyDebounceTime) {
        this.currentClipPlaneIndex = (this.currentClipPlaneIndex + 1) % 7
        switch (this.currentClipPlaneIndex) {
          case 0: // NONE
            this.scene.clipPlaneDepthAziElev = [2, 0, 0]
            break
          case 1: // left a 270 e 0
            // this.scene.clipPlane = [1, 0, 0, 0];
            this.scene.clipPlaneDepthAziElev = [0, 270, 0]
            break
          case 2: // right a 90 e 0
            this.scene.clipPlaneDepthAziElev = [0, 90, 0]
            break
          case 3: // posterior a 0 e 0
            this.scene.clipPlaneDepthAziElev = [0, 0, 0]
            break
          case 4: // anterior a 0 e 0
            this.scene.clipPlaneDepthAziElev = [0, 180, 0]
            break
          case 5: // inferior a 0 e -90
            this.scene.clipPlaneDepthAziElev = [0, 0, -90]
            break
          case 6: // superior: a 0 e 90'
            this.scene.clipPlaneDepthAziElev = [0, 0, 90]
            break
        }
        this.setClipPlane(this.scene.clipPlaneDepthAziElev)
      }
      this.lastCalled = now
    } else if (e.code === this.opts.viewModeHotKey) {
      const now = new Date().getTime()
      const elapsed = now - this.lastCalled
      if (elapsed > this.opts.keyDebounceTime) {
        this.setSliceType((this.opts.sliceType + 1) % 5) // 5 total slice types
        this.lastCalled = now
      }
    }
  }

  /**
   * Handles key down events for navigation, rendering controls, slice movement, and mode switching.
   * @internal
   */
  keyDownListener(e: KeyboardEvent): void {
    if (e.code === 'KeyH' && this.opts.sliceType === SLICE_TYPE.RENDER) {
      this.setRenderAzimuthElevation(this.scene.renderAzimuth - 1, this.scene.renderElevation)
    } else if (e.code === 'KeyL' && this.opts.sliceType === SLICE_TYPE.RENDER) {
      this.setRenderAzimuthElevation(this.scene.renderAzimuth + 1, this.scene.renderElevation)
    } else if (e.code === 'KeyJ' && this.opts.sliceType === SLICE_TYPE.RENDER) {
      this.setRenderAzimuthElevation(this.scene.renderAzimuth, this.scene.renderElevation + 1)
    } else if (e.code === 'KeyK' && this.opts.sliceType === SLICE_TYPE.RENDER) {
      this.setRenderAzimuthElevation(this.scene.renderAzimuth, this.scene.renderElevation - 1)
    } else if (e.code === 'KeyH' && this.opts.sliceType !== SLICE_TYPE.RENDER) {
      this.moveCrosshairInVox(-1, 0, 0)
    } else if (e.code === 'KeyL' && this.opts.sliceType !== SLICE_TYPE.RENDER) {
      this.moveCrosshairInVox(1, 0, 0)
    } else if (e.code === 'KeyU' && this.opts.sliceType !== SLICE_TYPE.RENDER && e.ctrlKey) {
      this.moveCrosshairInVox(0, 0, 1)
    } else if (e.code === 'KeyD' && this.opts.sliceType !== SLICE_TYPE.RENDER && e.ctrlKey) {
      this.moveCrosshairInVox(0, 0, -1)
    } else if (e.code === 'KeyJ' && this.opts.sliceType !== SLICE_TYPE.RENDER) {
      this.moveCrosshairInVox(0, -1, 0)
    } else if (e.code === 'KeyK' && this.opts.sliceType !== SLICE_TYPE.RENDER) {
      this.moveCrosshairInVox(0, 1, 0)
    } else if (e.code === 'KeyM' && this.opts.sliceType !== SLICE_TYPE.RENDER) {
      this.opts.dragMode++
      if (this.opts.dragMode >= DRAG_MODE.slicer3D) {
        this.opts.dragMode = DRAG_MODE.none
      }
      log.info('drag mode changed to ', DRAG_MODE[this.opts.dragMode])
    } else if (e.code === 'ArrowLeft') {
      // only works for background (first loaded image is index 0)
      this.setFrame4D(this.volumes[0].id, this.volumes[0].frame4D - 1)
    } else if (e.code === 'ArrowRight') {
      // only works for background (first loaded image is index 0)
      this.setFrame4D(this.volumes[0].id, this.volumes[0].frame4D + 1)
    } else if (e.code === 'Slash' && e.shiftKey) {
      alert(`NIIVUE VERSION: ${version}`)
    }
  }

  /**
   * Handles scroll wheel events for slice scrolling, ROI box resizing, zooming, or segmentation thresholding.
   * @internal
   */
  wheelListener(e: WheelEvent): void {
    if (this.thumbnailVisible) {
      return
    }
    if (this.opts.sliceMosaicString.length > 0) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    // ROI Selection logic
    const dragStartSum = this.uiData.dragStart.reduce((a, b) => a + b, 0)
    const dragEndSum = this.uiData.dragEnd.reduce((a, b) => a + b, 0)
    const validDrag = dragStartSum > 0 && dragEndSum > 0
    if (this.getCurrentDragMode() === DRAG_MODE.roiSelection && validDrag) {
      const delta = e.deltaY > 0 ? 1 : -1
      // update the uiData.dragStart and uiData.dragEnd values to grow or shrink the selection box
      if (this.uiData.dragStart[0] < this.uiData.dragEnd[0]) {
        this.uiData.dragStart[0] -= delta
        this.uiData.dragEnd[0] += delta
      } else {
        this.uiData.dragStart[0] += delta
        this.uiData.dragEnd[0] -= delta
      }
      if (this.uiData.dragStart[1] < this.uiData.dragEnd[1]) {
        this.uiData.dragStart[1] -= delta
        this.uiData.dragEnd[1] += delta
      } else {
        this.uiData.dragStart[1] += delta
        this.uiData.dragEnd[1] -= delta
      }

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
    let scrollAmount = e.deltaY < 0 ? -0.01 : 0.01
    if (this.opts.invertScrollDirection) {
      scrollAmount = -scrollAmount
    }

    // If clickToSegment mode is active, change threshold instead of scrolling slices
    if (this.opts.clickToSegment) {
      // Adjust clickToSegmentPercent by 0.01 in the direction of scrollAmount
      if (scrollAmount < 0) {
        this.opts.clickToSegmentPercent -= 0.01
        this.opts.clickToSegmentPercent = Math.max(this.opts.clickToSegmentPercent, 0)
      } else {
        this.opts.clickToSegmentPercent += 0.01
        this.opts.clickToSegmentPercent = Math.min(this.opts.clickToSegmentPercent, 1)
      }

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
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (
      this.getCurrentDragMode() === DRAG_MODE.pan &&
      this.inRenderTile(this.uiData.dpr! * x, this.uiData.dpr! * y) === -1
    ) {
      // Zoom
      const zoomDirection = scrollAmount < 0 ? 1 : -1
      let zoom = this.scene.pan2Dxyzmm[3] * (1.0 + 10 * (0.01 * zoomDirection))
      zoom = Math.round(zoom * 10) / 10
      const zoomChange = this.scene.pan2Dxyzmm[3] - zoom

      if (this.opts.yoke3Dto2DZoom) {
        this.scene.volScaleMultiplier = zoom
      }
      this.scene.pan2Dxyzmm[3] = zoom

      // Shift the 2D scene center so the crosshair stays in place
      const mm = this.frac2mm(this.scene.crosshairPos)
      this.scene.pan2Dxyzmm[0] += zoomChange * mm[0]
      this.scene.pan2Dxyzmm[1] += zoomChange * mm[1]
      this.scene.pan2Dxyzmm[2] += zoomChange * mm[2]

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
    // add mousedown
    this.canvas.addEventListener('mousedown', this.mouseDownListener.bind(this))
    // add mouseup
    this.canvas.addEventListener('mouseup', this.mouseUpListener.bind(this))
    // add mouse move
    this.canvas.addEventListener('mousemove', this.mouseMoveListener.bind(this))
    // add mouse leave listener
    this.canvas.addEventListener('mouseleave', this.mouseLeaveListener.bind(this))

    // add touchstart
    this.canvas.addEventListener('touchstart', this.touchStartListener.bind(this))
    // add touchend
    this.canvas.addEventListener('touchend', this.touchEndListener.bind(this))
    // add touchmove
    this.canvas.addEventListener('touchmove', this.touchMoveListener.bind(this))

    // add scroll wheel
    this.canvas.addEventListener('wheel', this.wheelListener.bind(this))
    // add context event disabler
    this.canvas.addEventListener('contextmenu', this.mouseContextMenuListener.bind(this))

    // add double click
    this.canvas.addEventListener('dblclick', this.resetBriCon.bind(this))

    //  drag and drop support
    this.canvas.addEventListener('dragenter', this.dragEnterListener.bind(this), false)
    this.canvas.addEventListener('dragover', this.dragOverListener.bind(this), false)
    this.canvas.addEventListener(
      'drop',
      (event) => {
        this.dropListener(event).catch(console.error)
      },
      false
    )

    // add keyup
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.addEventListener('keyup', this.keyUpListener.bind(this), false)

    // keydown
    this.canvas.addEventListener('keydown', this.keyDownListener.bind(this), false)
  }

  /**
   * Prevents default behavior when a dragged item enters the canvas.
   * @internal
   */
  dragEnterListener(e: MouseEvent): void {
    e.stopPropagation()
    e.preventDefault()
  }

  /**
   * Prevents default behavior when a dragged item is over the canvas.
   * @internal
   */
  dragOverListener(e: MouseEvent): void {
    e.stopPropagation()
    e.preventDefault()
  }

  /**
   * Extracts and normalizes the file extension, handling special cases like .gz and .cbor.
   * @internal
   */
  getFileExt(fullname: string, upperCase = true): string {
    log.debug('fullname: ', fullname)
    const re = /(?:\.([^.]+))?$/
    let ext = re.exec(fullname)![1]
    ext = ext.toUpperCase()
    if (ext === 'GZ') {
      ext = re.exec(fullname.slice(0, -3))![1] // img.trk.gz -> img.trk
      ext = ext.toUpperCase()
    } else if (ext === 'CBOR') {
      // we want to keep cbor WITH the extension before it.
      // e.g. if fullname is img.iwi.cbor, we want the ext to be iwi.cbor
      const endExt = ext
      ext = re.exec(fullname.slice(0, -5))![1] // img.iwi.cbor -> iwi.cbor
      ext = ext.toUpperCase()
      ext = `${ext}.${endExt}`
    }
    return upperCase ? ext : ext.toLowerCase() // developer can choose to have extensions as upper or lower
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
        colorbarVisible: imageItem.colorbarVisible
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
    return [...this.mediaUrlMap.entries()]
      .filter((v) => v[1] === url)
      .map((v) => v[0])
      .pop()
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
  async traverseFileTree(item, path = '', fileArray): Promise<File[]> {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file) => {
          file.fullPath = path + file.name
          // IMPORTANT: _webkitRelativePath is required for dcm2niix to work.
          // We need to add this property so we can parse multiple directories correctly.
          // the "webkitRelativePath" property on File objects is read-only, so we can't set it directly, hence the underscore.
          file._webkitRelativePath = path + file.name
          fileArray.push(file)
          resolve(fileArray)
        })
      } else if (item.isDirectory) {
        const dirReader = item.createReader()
        const readAllEntries = (): void => {
          dirReader.readEntries((entries) => {
            if (entries.length > 0) {
              const promises = []
              for (const entry of entries) {
                promises.push(this.traverseFileTree(entry, path + item.name + '/', fileArray))
              }
              Promise.all(promises)
                .then(readAllEntries)
                .catch((e) => {
                  throw e
                })
            } else {
              resolve(fileArray)
            }
          })
        }
        readAllEntries()
      }
    })
  }

  /**
   * Recursively reads a directory and logs the File objects contained within.
   * Used for processing dropped folders via drag-and-drop.
   * @internal
   */
  readDirectory(directory: FileSystemDirectoryEntry): FileSystemEntry[] {
    const reader = directory.createReader()
    let allEntiresInDir: FileSystemEntry[] = []
    const getFileObjects = async (fileSystemEntries: FileSystemEntry[]): Promise<File | File[]> => {
      const allFileObects: File[] = []
      // https://stackoverflow.com/a/53113059
      const getFile = async (fileEntry: FileSystemFileEntry): Promise<File> => {
        return new Promise((resolve, reject) => fileEntry.file(resolve, reject))
      }
      for (let i = 0; i < fileSystemEntries.length; i++) {
        allFileObects.push(await getFile(fileSystemEntries[i] as FileSystemFileEntry))
      }
      return allFileObects
    }
    const readEntries = (): void => {
      reader.readEntries((entries) => {
        if (entries.length) {
          allEntiresInDir = allEntiresInDir.concat(entries)
          readEntries()
        } else {
          getFileObjects(allEntiresInDir)
            .then(async () => {})
            .catch((e) => {
              throw e
            })
        }
      })
    }
    readEntries()
    return allEntiresInDir
  }

  /**
   * Returns boolean: true if filename ends with mesh extension (TRK, pial, etc)
   * @param url - filename
   * @internal
   */
  isMeshExt(url: string): boolean {
    const ext = this.getFileExt(url)
    log.debug('dropped ext')
    log.debug(ext)
    return MESH_EXTENSIONS.includes(ext)
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
  useLoader(loader: unknown, fileExt: string, toExt: string): void {
    this.loaders = {
      ...this.loaders,
      [fileExt.toUpperCase()]: {
        loader,
        toExt
      }
    }
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
    e.stopPropagation()
    e.preventDefault()
    // don't do anything if drag and drop has been turned off
    if (!this.opts.dragAndDropEnabled) {
      return
    }
    const urlsToLoad: string[] = []
    const files = []
    const dt = e.dataTransfer
    if (!dt) {
      return
    }
    const url = dt.getData('text/uri-list')
    if (url) {
      urlsToLoad.push(url)
      const imageOptions = NVImageFromUrlOptions(url)
      const ext = this.getFileExt(url)
      log.debug('dropped ext')
      log.debug(ext)
      if (MESH_EXTENSIONS.includes(ext)) {
        this.addMeshFromUrl({ url }).catch((e) => {
          throw e
        })
      } else if (ext === 'NVD') {
        this.loadDocumentFromUrl(url).catch((e) => {
          throw e
        })
      } else {
        this.addVolumeFromUrl(imageOptions).catch((e) => {
          throw e
        })
      }
    } else {
      // const files = dt.files;
      const items = dt.items
      if (items.length > 0) {
        // adding or replacing
        if (!e.shiftKey && !e.altKey) {
          this.volumes = []
          this.overlays = []
          this.meshes = []
        }
        this.closeDrawing()
        this.closePAQD()
        for (const item of Array.from(items)) {
          const entry = item.webkitGetAsEntry() as FileSystemFileEntry
          log.debug(entry)
          if (!entry) {
            throw new Error('could not get entry from file')
          }
          if (entry.isFile) {
            const ext = this.getFileExt(entry.name)
            let pairedImageData: FileSystemEntry
            // check for afni HEAD BRIK pair
            if (entry.name.lastIndexOf('HEAD') !== -1) {
              for (const pairedItem of Array.from(items)) {
                const pairedEntry = pairedItem.webkitGetAsEntry()
                if (!pairedEntry) {
                  throw new Error('could not get paired entry')
                }
                const fileBaseName = entry.name.substring(0, entry.name.lastIndexOf('HEAD'))
                const pairedItemBaseName = pairedEntry.name.substring(0, pairedEntry.name.lastIndexOf('BRIK'))
                if (fileBaseName === pairedItemBaseName) {
                  pairedImageData = pairedEntry
                }
              }
            }
            if (entry.name.lastIndexOf('BRIK') !== -1) {
              continue
            }
            if (this.loaders[ext]) {
              const dataUrl = await readFileAsDataURL(entry)
              await this.loadImages([
                {
                  url: dataUrl,
                  name: `${entry.name}`
                }
              ])
              continue
            }
            if (MESH_EXTENSIONS.includes(ext)) {
              ;(entry as FileSystemFileEntry).file((file: File): void => {
                ;(async (): Promise<void> => {
                  try {
                    const mesh = await NVMesh.loadFromFile({
                      file,
                      gl: this.gl,
                      name: file.name
                    })
                    this.addMesh(mesh)
                  } catch (e) {
                    console.error('Error loading mesh:', e)
                  }
                })().catch((err) => console.error(err))
              })
              continue
            } else if (ext === 'NVD') {
              ;(entry as FileSystemFileEntry).file((file: File): void => {
                ;(async (): Promise<void> => {
                  try {
                    const nvdoc = await NVDocument.loadFromFile(file)
                    await this.loadDocument(nvdoc)
                    log.debug('loaded document')
                  } catch (e) {
                    console.error(e)
                  }
                })().catch((err) => console.error(err))
              })
              break
            }

            ;(entry as FileSystemFileEntry).file((file: File): void => {
              ;(async (): Promise<void> => {
                try {
                  if (pairedImageData) {
                    ;(pairedImageData as FileSystemFileEntry).file((imgfile: File): void => {
                      ;(async (): Promise<void> => {
                        try {
                          const volume = await NVImage.loadFromFile({
                            file,
                            urlImgData: imgfile,
                            limitFrames4D: this.opts.limitFrames4D
                          })
                          this.addVolume(volume)
                        } catch (e) {
                          console.error(e)
                        }
                      })().catch(console.error)
                    })
                  } else {
                    const volume = await NVImage.loadFromFile({
                      file,
                      urlImgData: pairedImageData,
                      limitFrames4D: this.opts.limitFrames4D
                    })
                    if (e.altKey) {
                      log.debug('alt key detected: assuming this is a drawing overlay')
                      this.drawClearAllUndoBitmaps()
                      this.loadDrawing(volume)
                    } else {
                      this.addVolume(volume)
                    }
                  }
                } catch (e) {
                  console.error(e)
                }
                // Explicitly return undefined (void)
              })().catch(console.error)
            })
          } else if (entry.isDirectory) {
            // assume that directories are only use for DICOM files
            this.traverseFileTree(entry, '', files)
              .then((files) => {
                const loader = this.getDicomLoader().loader
                if (!loader) {
                  throw new Error('No loader for DICOM files')
                }
                loader(files)
                  .then(async (fileArrayBuffers) => {
                    const promises = fileArrayBuffers.map((loaderImage) =>
                      NVImage.loadFromUrl({
                        url: loaderImage.data,
                        name: loaderImage.name,
                        limitFrames4D: this.opts.limitFrames4D
                      })
                    )
                    Promise.all(promises)
                      .then(async (loadedNvImages) => {
                        await this.onDicomLoaderFinishedWithImages(loadedNvImages)
                      })
                      .catch((e) => {
                        throw e
                      })
                  })
                  .catch((error) => {
                    console.error('Error loading DICOM files:', error)
                  })
              })
              .catch((e) => {
                throw e
              })
          }
        }
      }
    }
    // this.createEmptyDrawing();
    this.drawScene() // <- this seems to be required if you drag and drop a mesh, not a volume
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
    // check for overlapping tiles
    for (let i = 0; i < layout.length; i++) {
      const [left1, top1, width1, height1] = layout[i].position
      const right1 = left1 + width1
      const bottom1 = top1 + height1

      // compare with subsequent tiles
      for (let j = i + 1; j < layout.length; j++) {
        const [left2, top2, width2, height2] = layout[j].position
        const right2 = left2 + width2
        const bottom2 = top2 + height2

        // test if tile rectangles intersect both horizontally and vertically
        const horizontallyOverlaps = left1 < right2 && right1 > left2
        const verticallyOverlaps = top1 < bottom2 && bottom1 > top2
        if (horizontallyOverlaps && verticallyOverlaps) {
          throw new Error(`Custom layout is invalid. Tile ${i} overlaps with tile ${j}.`)
        }
      }
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
  watchOptsChanges(
    callback: (
      propertyName: keyof NVConfigOptions,
      newValue: NVConfigOptions[keyof NVConfigOptions],
      oldValue: NVConfigOptions[keyof NVConfigOptions]
    ) => void
  ): void {
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
    this.volumes.push(volume)
    const idx = this.volumes.length === 1 ? 0 : this.volumes.length - 1
    this.setVolume(volume, idx)
    this.onImageLoaded(volume)
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
    this.meshes.push(mesh)
    const idx = this.meshes.length === 1 ? 0 : this.meshes.length - 1
    this.setMesh(mesh, idx)
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
    const n = this.volumes.length
    for (let i = 0; i < n; i++) {
      const id_i = this.volumes[i].id
      if (id_i === id) {
        return i
      }
    }
    return -1 // -1 signals that no valid index was found for a volume with the given id
  }

  /**
   * Saves the current drawing state as an RLE-compressed bitmap for undo history.
   * Uses a circular buffer to limit undo memory usage.
   * @internal
   */
  drawAddUndoBitmap(drawFillOverwrites: boolean = true): void {
    if (!this.drawBitmap || this.drawBitmap.length < 1) {
      log.debug('drawAddUndoBitmap error: No drawing open')
      return
    }
    if (!drawFillOverwrites && this.drawUndoBitmaps.length > 0) {
      const len = this.drawBitmap.length
      const bmp = decodeRLE(this.drawUndoBitmaps[this.currentDrawUndoBitmap], len)
      for (let i = 0; i < len; i++) {
        if (bmp[i] > 0) {
          this.drawBitmap[i] = bmp[i]
        }
      }
      this.refreshDrawing(false)
    }
    // let rle = encodeRLE(this.drawBitmap);
    // the bitmaps are a cyclical loop, like a revolver hand gun: increment the cylinder
    this.currentDrawUndoBitmap++
    if (this.currentDrawUndoBitmap >= this.opts.maxDrawUndoBitmaps) {
      this.currentDrawUndoBitmap = 0
    }
    this.drawUndoBitmaps[this.currentDrawUndoBitmap] = encodeRLE(this.drawBitmap)
  }

  /**
   * Clears all stored drawing undo bitmaps and resets the undo index.
   * @internal
   */
  drawClearAllUndoBitmaps(): void {
    this.currentDrawUndoBitmap = this.opts.maxDrawUndoBitmaps // next add will be cylinder 0
    if (!this.drawUndoBitmaps || this.drawUndoBitmaps.length < 1) {
      return
    }
    for (let i = this.drawUndoBitmaps.length - 1; i >= 0; i--) {
      this.drawUndoBitmaps[i] = new Uint8Array()
    }
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
    if (
      dims[1] !== this.back.hdr!.dims[1] ||
      dims[2] !== this.back.hdr!.dims[2] ||
      dims[3] !== this.back.hdr!.dims[3]
    ) {
      log.debug('drawing dimensions do not match background image')
      return false
    }
    if (drawingBitmap.img!.constructor !== Uint8Array) {
      log.debug('Drawings should be UINT8')
    }
    const perm = drawingBitmap.permRAS!
    const vx = dims[1] * dims[2] * dims[3]
    this.drawBitmap = new Uint8Array(vx)
    if (this.opts.is2DSliceShader) {
      this.drawTexture = this.r8Tex2D(this.drawTexture, TEXTURE7_DRAW, this.back.dims, true)
    } else {
      this.drawTexture = this.r8Tex(this.drawTexture, TEXTURE7_DRAW, this.back.dims!, true)
    }
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
    // lookup table for flips and stride offsets:
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
    const inVs = drawingBitmap.img! // new Uint8Array(this.drawBitmap);
    const outVs = this.drawBitmap
    // for (let i = 0; i < vx; i++)
    //  outVs[i] = i % 3;
    let j = 0
    for (let z = 0; z < dims[3]; z++) {
      for (let y = 0; y < dims[2]; y++) {
        for (let x = 0; x < dims[1]; x++) {
          outVs[xlut[x] + ylut[y] + zlut[z]] = inVs[j]
          j++
        }
      }
    }
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
    const dims = volume.hdr!.dims
    const vx = dims[1] * dims[2] * dims[3]
    const img = new Uint8Array(vx)
    for (let i = 0; i < vx; i++) {
      if (volume.img![i] !== 0) {
        img[i] = 1
      }
    }
    volume.img = img
    volume.hdr!.datatypeCode = NiiDataType.DT_UINT8
    volume.hdr!.cal_min = 0
    volume.hdr!.cal_max = 1
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
    // C: https://github.com/rordenlab/niimath
    // Java: https://github.com/stevenjwest/Multi_OTSU_Segmentation
    if (this.volumes.length < 1) {
      return []
    }
    const img = this.volumes[0].img!
    const nvox = img.length
    if (nvox < 1) {
      return []
    }
    const nBin = 256
    const maxBin = nBin - 1 // bins indexed from 0: if 256 bins then 0..255
    const h = new Array(nBin).fill(0)
    // build 1D histogram
    const mn = this.volumes[0].cal_min!
    const mx = this.volumes[0].cal_max!
    if (mx <= mn) {
      return []
    }
    const scale2raw = (mx - mn) / nBin
    function bin2raw(bin: number): number {
      return bin * scale2raw + mn
    }
    const scale2bin = (nBin - 1) / Math.abs(mx - mn)
    const inter = this.volumes[0].hdr!.scl_inter
    const slope = this.volumes[0].hdr!.scl_slope
    for (let v = 0; v < nvox; v++) {
      let val = img![v] * slope + inter
      val = Math.min(Math.max(val, mn), mx)
      val = Math.round((val - mn) * scale2bin)
      h[val]++
    }
    // h[1] = h[1] + h[0]; h[0] = 0;
    // in theory one can convert h from count to probability:
    // for (let v = 0; v < nBin; v++)
    //  h[v] = h[v] / nvox;
    const P = Array(nBin)
      .fill(0)
      .map(() => Array(nBin).fill(0))
    const S = Array(nBin)
      .fill(0)
      .map(() => Array(nBin).fill(0))
    // diagonal
    for (let i = 1; i < nBin; ++i) {
      P[i][i] = h[i]
      S[i][i] = i * h[i]
    }
    // calculate first row (row 0 is all zero)
    for (let i = 1; i < nBin - 1; ++i) {
      P[1][i + 1] = P[1][i] + h[i + 1]
      S[1][i + 1] = S[1][i] + (i + 1) * h[i + 1]
    }
    // using row 1 to calculate others
    for (let i = 2; i < nBin; i++) {
      for (let j = i + 1; j < nBin; j++) {
        P[i][j] = P[1][j] - P[1][i - 1]
        S[i][j] = S[1][j] - S[1][i - 1]
      }
    }
    // now calculate H[i][j]
    for (let i = 1; i < nBin; ++i) {
      for (let j = i + 1; j < nBin; j++) {
        if (P[i][j] !== 0) {
          P[i][j] = (S[i][j] * S[i][j]) / P[i][j]
        }
      }
    }
    let max = 0
    const t = [Infinity, Infinity, Infinity]
    if (mlevel > 3) {
      for (let l = 0; l < nBin - 3; l++) {
        for (let m = l + 1; m < nBin - 2; m++) {
          for (let h = m + 1; h < nBin - 1; h++) {
            const v = P[0][l] + P[l + 1][m] + P[m + 1][h] + P[h + 1][maxBin]
            if (v > max) {
              t[0] = l
              t[1] = m
              t[2] = h
              max = v
            }
          }
        }
      }
    } else if (mlevel === 3) {
      for (let l = 0; l < nBin - 2; l++) {
        for (let h = l + 1; h < nBin - 1; h++) {
          const v = P[0][l] + P[l + 1][h] + P[h + 1][maxBin]
          if (v > max) {
            t[0] = l
            t[1] = h
            max = v
          }
        }
      }
    } else {
      for (let i = 0; i < nBin - 1; i++) {
        const v = P[0][i] + P[i + 1][maxBin]
        if (v > max) {
          t[0] = i
          max = v
        }
      }
    }
    return [bin2raw(t[0]), bin2raw(t[1]), bin2raw(t[2])]
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
    const nvox = this.volumes[0].img!.length
    const thresholds = this.findOtsu(levels)
    if (thresholds.length < 3) {
      return
    }
    if (!this.drawBitmap) {
      this.createEmptyDrawing()
    }
    const drawImg = this.drawBitmap as Uint8Array
    const img = this.volumes[0].img!
    for (let i = 0; i < nvox; i++) {
      if (drawImg[i] !== 0) {
        continue
      }
      const v = img[i]
      if (v > thresholds[0]) {
        drawImg[i] = 1
      }
      if (v > thresholds[1]) {
        drawImg[i] = 2
      }
      if (v > thresholds[2]) {
        drawImg[i] = 3
      }
    }
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

    const nvox = img.length
    let otsu = 2
    if (level === 5 || level === 1) {
      otsu = 4
    }
    if (level === 4 || level === 2) {
      otsu = 3
    }
    const thresholds = this.findOtsu(otsu)
    if (thresholds.length < 3) {
      return
    }
    let threshold = thresholds[0]
    if (level === 1) {
      threshold = thresholds[2]
    }
    if (level === 2) {
      threshold = thresholds[1]
    }

    const inter = hdr.scl_inter
    const slope = hdr.scl_slope
    const mn = this.volumes[volIndex].global_min!
    for (let v = 0; v < nvox; v++) {
      const val = img[v] * slope + inter
      if (val < threshold) {
        img[v] = mn
      }
    }
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
      }
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
    if (typeof id === 'number') {
      if (id >= this.meshes.length) {
        return -1
      } // range 0..len-1
      return id
    }
    const n = this.meshes.length
    for (let i = 0; i < n; i++) {
      const id_i = this.meshes[i].id
      if (id_i === id) {
        return i
      }
    }
    return -1 // -1 signals that no valid index was found for a volume with the given id
  }

  /**
   * change property of mesh, tractogram or connectome
   * @param id - identity of mesh to change
   * @param key - attribute to change
   * @param val - for attribute
   * @example niivue.setMeshProperty(niivue.meshes[0].id, 'fiberLength', 42)
   * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
   */
  setMeshProperty(
    id: number,
    key: keyof NVMesh,
    val: number | string | boolean | Uint8Array | number[] | ColorMap | LegacyConnectome | Float32Array
  ): void {
    const idx = this.getMeshIndexByID(id)
    if (idx < 0) {
      log.warn('setMeshProperty() id not loaded', id)
      return
    }
    this.meshes[idx].setProperty(key, val, this.gl)
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
    const idx = this.getMeshIndexByID(mesh)
    if (idx < 0) {
      log.warn('indexNearestXYZmm() id not loaded', mesh)
      return [NaN, NaN]
    }
    return this.meshes[idx].indexNearestXYZmm(Xmm, Ymm, Zmm)
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
    const idx = this.getMeshIndexByID(mesh)
    if (idx < 0) {
      log.warn('reverseFaces() id not loaded', mesh)
      return
    }
    const ret = this.meshes[idx].decimateHierarchicalMesh(this.gl, order)
    this.updateGLVolume()
    return ret
  }

  /**
   * reverse triangle winding of mesh (swap front and back faces)
   * @param mesh - identity of mesh to change
   * @example niivue.reverseFaces(niivue.meshes[0].id)
   * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
   */
  reverseFaces(mesh: number): void {
    const idx = this.getMeshIndexByID(mesh)
    if (idx < 0) {
      log.warn('reverseFaces() id not loaded', mesh)
      return
    }
    this.meshes[idx].reverseFaces(this.gl)
    this.updateGLVolume()
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
  async setMeshLayerProperty(mesh: number, layer: number, key: keyof NVMeshLayer, val: number): Promise<void> {
    const idx = this.getMeshIndexByID(mesh)
    if (idx < 0) {
      log.warn('setMeshLayerProperty() id not loaded', mesh)
      return
    }
    await this.meshes[idx].setLayerProperty(layer, key, val, this.gl)
    this.updateGLVolume()
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
    const n = this.overlays.length
    for (let i = 0; i < n; i++) {
      const id_i = this.overlays[i].id
      if (id_i === id) {
        return i
      }
    }
    return -1 // -1 signals that no valid index was found for an overlay with the given id
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
    const numberOfLoadedImages = this.volumes.length
    if (toIndex > numberOfLoadedImages) {
      return
    }

    const volIndex = this.getVolumeIndexByID(volume.id)
    if (toIndex === 0) {
      this.volumes.splice(volIndex, 1)
      this.volumes.unshift(volume)
      this.back = this.volumes[0]
      this.overlays = this.volumes.slice(1)
    } else if (toIndex < 0) {
      // -1 to remove a volume
      this.volumes.splice(this.getVolumeIndexByID(volume.id), 1)
      // this.volumes = this.overlays
      this.back = this.volumes[0]
      if (this.volumes.length > 1) {
        this.overlays = this.volumes.slice(1)
      } else {
        this.overlays = []
      }
    } else {
      this.volumes.splice(volIndex, 1)
      this.volumes.splice(toIndex, 0, volume)
      this.overlays = this.volumes.slice(1)
      this.back = this.volumes[0]
    }
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
    const numberOfLoadedMeshes = this.meshes.length
    if (toIndex > numberOfLoadedMeshes) {
      return
    }
    const meshIndex = this.getMeshIndexByID(mesh.id)
    if (toIndex === 0) {
      this.meshes.splice(meshIndex, 1)
      this.meshes.unshift(mesh)
    } else if (toIndex < 0) {
      this.meshes.splice(this.getMeshIndexByID(mesh.id), 1)
    } else {
      this.meshes.splice(meshIndex, 1)
      this.meshes.splice(toIndex, 0, mesh)
    }
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
    this.setVolume(volume, -1)
    // check if we have a url for this volume
    if (this.mediaUrlMap.has(volume)) {
      const url = this.mediaUrlMap.get(volume)!
      // notify subscribers that we are about to remove a volume
      this.onVolumeWithUrlRemoved(url)

      this.mediaUrlMap.delete(volume)
    }

    this.drawScene()
  }

  /**
   * Remove a volume from the scene by its index
   * @param index - index of the volume to remove
   * @throws if the index is out of bounds
   * @see {@link https://niivue.com/demos/features/clusterize.html | live demo usage}
   */
  removeVolumeByIndex(index: number): void {
    if (index >= this.volumes.length) {
      throw new Error('Index of volume out of bounds')
    }
    this.removeVolume(this.volumes[index])
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
    this.setVolume(volume, 0)
  }

  /**
   * Move a volume up one index position in the stack of loaded volumes. This moves it up one layer
   * @param volume - the volume to move
   * @example
   * niivue = new Niivue()
   * niivue.moveVolumeUp(this.volumes[0]) // move the background image to the second index position (it was 0 index, now will be 1)
   */
  moveVolumeUp(volume: NVImage): void {
    const volIdx = this.getVolumeIndexByID(volume.id)
    this.setVolume(volume, volIdx + 1)
  }

  /**
   * Move a volume down one index position in the stack of loaded volumes. This moves it down one layer
   * @param volume - the volume to move
   * @example
   * niivue = new Niivue()
   * niivue.moveVolumeDown(this.volumes[1]) // move the second image to the background position (it was 1 index, now will be 0)
   */
  moveVolumeDown(volume: NVImage): void {
    const volIdx = this.getVolumeIndexByID(volume.id)
    this.setVolume(volume, volIdx - 1)
  }

  /**
   * Move a volume to the top position in the stack of loaded volumes. This will be the top layer
   * @param volume - the volume to move
   * @example
   * niivue = new Niivue()
   * niivue.moveVolumeToTop(this.volumes[0]) // move the background image to the top layer position
   */
  moveVolumeToTop(volume: NVImage): void {
    this.setVolume(volume, this.volumes.length - 1)
  }

  /**
   * Records the current mouse position in screen space (adjusted for device pixel ratio).
   * @internal
   */
  mouseDown(x: number, y: number): void {
    x *= this.uiData.dpr!
    y *= this.uiData.dpr!
    this.mousePos = [x, y]
    // if (this.inRenderTile(x, y) < 0) return;
  }

  /**
   * Updates mouse position and modifies 3D render view if the pointer is in the render tile.
   *
   * @internal
   */
  mouseMove(x: number, y: number): void {
    x *= this.uiData.dpr!
    y *= this.uiData.dpr!
    const dx = (x - this.mousePos[0]) / this.uiData.dpr!
    const dy = (y - this.mousePos[1]) / this.uiData.dpr!
    this.mousePos = [x, y]

    if (this.inRenderTile(x, y) < 0) {
      return
    }

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      return
    }
    this.scene.renderAzimuth += dx
    this.scene.renderElevation += dy

    this.drawScene()
  }

  /**
   * convert spherical AZIMUTH, ELEVATION to Cartesian
   * @param azimuth - azimuth number
   * @param elevation - elevation number
   * @returns the converted [x, y, z] coordinates
   * @example
   * niivue = new Niivue()
   * xyz = niivue.sph2cartDeg(42, 42)
   */
  sph2cartDeg(azimuth: number, elevation: number): number[] {
    // convert spherical AZIMUTH,ELEVATION,RANGE to Cartesian
    // see Matlab's [x,y,z] = sph2cart(THETA,PHI,R)
    // reverse with cart2sph
    const Phi = -elevation * (Math.PI / 180)
    const Theta = ((azimuth - 90) % 360) * (Math.PI / 180)
    const ret = [Math.cos(Phi) * Math.cos(Theta), Math.cos(Phi) * Math.sin(Theta), Math.sin(Phi)]
    const len = Math.sqrt(ret[0] * ret[0] + ret[1] * ret[1] + ret[2] * ret[2])
    if (len <= 0.0) {
      return ret
    }
    ret[0] /= len
    ret[1] /= len
    ret[2] /= len
    return ret
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
    //  depth: distance of clip plane from center of volume, range 0..~1.73 (e.g. 2.0 for no clip plane)
    //  azimuthElevation is 2 component vector [a, e, d]
    //  azimuth: camera position in degrees around object, typically 0..360 (or -180..+180)
    //  elevation: camera height in degrees, range -90..90

    const v = this.sph2cartDeg(depthAzimuthElevation[1] + 180, depthAzimuthElevation[2])
    this.scene.clipPlane = [v[0], v[1], v[2], depthAzimuthElevation[0]]
    this.scene.clipPlaneDepthAziElev = depthAzimuthElevation
    this.onClipPlaneChange(this.scene.clipPlane)
    // if (this.opts.sliceType!= SLICE_TYPE.RENDER) return;
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
      // Clean up clickToSegment state when drawing is disabled
      if (this.clickToSegmentIsGrowing) {
        this.clickToSegmentIsGrowing = false
        // Refresh the GPU texture using the main drawBitmap
        this.refreshDrawing(true, false)
      }
      // Reset pen state
      this.drawPenLocation = [NaN, NaN, NaN]
      this.drawPenAxCorSag = -1
      this.drawPenFillPts = []
      // Reset shape state
      this.drawShapeStartLocation = [NaN, NaN, NaN]
      if (this.drawShapePreviewBitmap) {
        this.drawBitmap = this.drawShapePreviewBitmap
        this.drawShapePreviewBitmap = null
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
   * Handles mouse wheel or trackpad scroll to change slices, zoom, or frame depending on context.
   * @internal
   */
  sliceScroll2D(posChange: number, x: number, y: number, isDelta = true): void {
    // check if the canvas has focus
    if (this.opts.scrollRequiresFocus && this.canvas !== document.activeElement) {
      log.warn('Canvas element does not have focus. Scroll events will not be processed.')
      return
    }

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
    if (
      posChange !== 0 &&
      this.opts.dragMode === DRAG_MODE.pan &&
      this.inRenderTile(this.uiData.dpr! * x, this.uiData.dpr! * y) === -1
    ) {
      let zoom = this.scene.pan2Dxyzmm[3] * (1.0 + 10 * posChange)
      zoom = Math.round(zoom * 10) / 10
      const zoomChange = this.scene.pan2Dxyzmm[3] - zoom
      if (this.opts.yoke3Dto2DZoom) {
        this.scene.volScaleMultiplier = zoom
      }
      this.scene.pan2Dxyzmm[3] = zoom
      const mm = this.frac2mm(this.scene.crosshairPos)
      this.scene.pan2Dxyzmm[0] += zoomChange * mm[0]
      this.scene.pan2Dxyzmm[1] += zoomChange * mm[1]
      this.scene.pan2Dxyzmm[2] += zoomChange * mm[2]
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
    this.volumes[volIdx].opacity = newOpacity
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
   * set the color of the 3D clip plane
   * @param color - the new color. expects an array of RGBA values. values can range from 0 to 1
   * @example
   * niivue.setClipPlaneColor([1, 1, 1, 0.5]) // white, transparent
   * @see {@link https://niivue.com/demos/features/clipplanes.html | live demo usage}
   */
  setClipPlaneColor(color: number[]): void {
    this.opts.clipPlaneColor = color
    this.renderShader!.use(this.gl)
    this.gl.uniform4fv(this.renderShader!.uniforms.clipPlaneColor!, this.opts.clipPlaneColor)
    this.drawScene()
  }

  /**
   * adjust thickness of the 3D clip plane
   * @param thick - thickness of slab. Value 0..1.73 (cube opposite corner length is sqrt(3)).
   * @example
   * niivue.setClipPlaneThick(0.3) // thin slab
   * @see {@link https://niivue.com/demos/features/clipplanes.html | live demo usage}
   */
  setClipPlaneThick(thick: number): void {
    this.opts.clipThick = thick
    this.renderShader!.use(this.gl)
    this.gl.uniform1f(this.renderShader!.uniforms.clipThick!, this.opts.clipThick)
    // this.renderShader!.use(this.gl)
    // this.gl.uniform4fv(this.renderShader!.uniforms.clipPlaneColor!, this.opts.clipPlaneColor)
    this.drawScene()
  }

  /**
   * set the clipping region for volume rendering
   * @param low - 3-component array specifying the lower bound of the clipping region along the X, Y, and Z axes. Values range from 0 (start) to 1 (end of volume).
   * @param high - 3-component array specifying the upper bound of the clipping region along the X, Y, and Z axes. Values range from 0 to 1.
   * @example
   * niivue.setClipPlaneColor([0.0, 0.0, 0.2], [1.0, 1.0, 0.7]) // remove inferior 20% and superior 30%
   * @see {@link https://niivue.com/demos/features/clipplanes.html | live demo usage}
   */
  setClipVolume(low: number[], high: number[]): void {
    this.opts.clipVolumeLow = [Math.min(low[0], high[0]), Math.min(low[1], high[1]), Math.min(low[2], high[2])]
    this.opts.clipVolumeHigh = [Math.max(low[0], high[0]), Math.max(low[1], high[1]), Math.max(low[2], high[2])]
    this.renderShader!.use(this.gl)
    this.gl.uniform3fv(this.renderShader!.uniforms.clipLo!, this.opts.clipVolumeLow)
    this.gl.uniform3fv(this.renderShader!.uniforms.clipHi!, this.opts.clipVolumeHigh)
    this.pickingImageShader!.use(this.gl)
    this.gl.uniform3fv(this.pickingImageShader!.uniforms.clipLo!, this.opts.clipVolumeLow)
    this.gl.uniform3fv(this.pickingImageShader!.uniforms.clipHi!, this.opts.clipVolumeHigh)
    this.drawScene()
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
    await this.refreshLayers(this.volumes[0], 0)
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
    const hdr = volume.hdr!
    const vox = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
    const imgRGBA = new Uint8ClampedArray(vox * 4)
    const radius = 0.2 * Math.min(Math.min(hdr.dims[1], hdr.dims[2]), hdr.dims[3])
    const halfX = 0.5 * hdr.dims[1]
    const halfY = 0.5 * hdr.dims[2]
    const halfZ = 0.5 * hdr.dims[3]
    let j = 0
    for (let z = 0; z < hdr.dims[3]; z++) {
      for (let y = 0; y < hdr.dims[2]; y++) {
        for (let x = 0; x < hdr.dims[1]; x++) {
          const dx = Math.abs(x - halfX)
          const dy = Math.abs(y - halfY)
          const dz = Math.abs(z - halfZ)
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          let v = 0
          if (dist < radius) {
            v = 255
          }
          imgRGBA[j++] = 0 // Red
          imgRGBA[j++] = v // Green
          imgRGBA[j++] = 0 // Blue
          imgRGBA[j++] = v * 0.5 // Alpha
        }
      }
    }
    return imgRGBA
  }

  /**
   * Convert voxel coordinates to millimeters using a transformation matrix.
   * @internal
   */
  vox2mm(XYZ: number[], mtx: mat4): vec3 {
    return NVUtilities.vox2mm(XYZ, mtx)
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
    return this.volumes[index].clone()
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
    this.volumes = []
    this.meshes = []
    this.document = document
    this.document.labels = this.document.labels ? this.document.labels : [] // for older documents w/o labels
    const opts = { ...DEFAULT_OPTIONS, ...document.opts }
    this.scene.pan2Dxyzmm = document.scene.pan2Dxyzmm ? document.scene.pan2Dxyzmm : [0, 0, 0, 1] // for older documents that don't have this
    this.document.opts = opts
    this.setClipPlane(this.scene.clipPlaneDepthAziElev)
    log.debug('load document', document)
    this.mediaUrlMap.clear()
    this.createEmptyDrawing()

    // const imagesToAdd = new Map<ImageFromUrlOptions, NVImage>()

    // load our images and meshes
    const encodedImageBlobs = document.encodedImageBlobs
    for (let i = 0; i < document.imageOptionsArray.length; i++) {
      const imageOptions = document.imageOptionsArray[i]
      const base64 = encodedImageBlobs[i]
      if (base64) {
        if ('colorMap' in imageOptions) {
          imageOptions.colormap = imageOptions.colorMap
        }
        const image = await NVImage.loadFromBase64({ base64, ...imageOptions })
        if (image) {
          if (image.colormapLabel) {
            const length = Object.keys(image.colormapLabel.lut).length

            // Create a new Uint8ClampedArray with the length of the object.
            const uint8ClampedArray = new Uint8ClampedArray(length)

            // Iterate over the object and set the values of the Uint8ClampedArray.
            for (const key in image.colormapLabel.lut) {
              uint8ClampedArray[key] = image.colormapLabel.lut[key]
            }
            image.colormapLabel.lut = uint8ClampedArray
          }
          this.addVolume(image)
        }
      }
    }

    // reset our image options map
    // document.imageOptionsMap.clear()

    // for(const imageOptions of map.keys()) {

    // }

    if (this.volumes.length > 0) {
      this.back = this.volumes[0]
    }

    for (const meshDataObject of document.meshDataObjects ?? []) {
      const meshInit = { gl: this.gl, ...meshDataObject }
      if (meshDataObject.offsetPt0) {
        meshInit.rgba255[3] = 0 // this is a streamline
        meshInit.tris = new Uint32Array(meshDataObject.offsetPt0)
      }
      log.debug(meshInit)
      const meshToAdd = new NVMesh(
        meshInit.pts,
        meshInit.tris!,
        meshInit.name,
        meshInit.rgba255,
        meshInit.opacity,
        meshInit.visible,
        this.gl,
        meshInit.connectome,
        meshInit.dpg,
        meshInit.dps,
        meshInit.dpv
      )
      if (meshDataObject.offsetPt0) {
        meshToAdd.fiberGroupColormap = meshDataObject.fiberGroupColormap
        meshToAdd.fiberColor = meshDataObject.fiberColor
        meshToAdd.fiberDither = meshDataObject.fiberDither
        meshToAdd.fiberRadius = meshDataObject.fiberRadius
        meshToAdd.colormap = meshDataObject.colormap
      }
      meshToAdd.meshShaderIndex = meshInit.meshShaderIndex
      meshToAdd.layers = meshInit.layers
      meshToAdd.updateMesh(this.gl)
      log.debug(meshToAdd)
      this.addMesh(meshToAdd)
    }
    // add connectomes
    if (document.data.connectomes) {
      for (const connectomeString of document.data.connectomes) {
        const connectome = JSON.parse(connectomeString)
        const meshToAdd = this.loadConnectomeAsMesh(connectome)
        meshToAdd.updateMesh(this.gl)
        this.addMesh(meshToAdd)
      }
    }

    // Deserialize drawBitmap
    this.createEmptyDrawing()
    const drawingBase64 = document.encodedDrawingBlob
    if (drawingBase64) {
      const drawingBitmap = await NVUtilities.b64toUint8(drawingBase64) // Convert base64 back to Uint8Array
      if (drawingBitmap) {
        const dims = this.back.dims
        let expectedBytes = dims[1] * dims[2] * dims[3]
        if (drawingBitmap.length - 352 === expectedBytes) {
          expectedBytes += 352
        }
        if (drawingBitmap.length !== expectedBytes) {
          throw new Error(
            `drawBitmap size does not match the texture dimensions (${dims[1]}×${dims[2]}×${dims[3]}) ${expectedBytes} != ${dims[1] * dims[2] * dims[3]}.`
          )
        }
        this.drawBitmap = drawingBitmap // Set the deserialized drawBitmap
        this.refreshDrawing()
      }
    }

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
  async saveDocument(
    fileName = 'untitled.nvd',
    compress = true,
    options: { embedImages?: boolean; embedPreview?: boolean } = {}
  ): Promise<void> {
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
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
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
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
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
      const response = await fetch(meshOptions.url, {})
      const json = await response.json()
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
        const { positions, indices, colors = null } = await this.loaders[ext].loader(itemToLoad)
        meshItem.name = `${name}.${toExt}`
        const mz3 = await NVMeshUtilities.createMZ3Async(positions, indices, false, colors)
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
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)

    // if more than one mesh, then fetch them all simultaneously
    // using addMeshesFromUrl (note the "s" in "Meshes")
    // if (meshList.length > 1) {
    await this.addMeshesFromUrl(meshList)
    this.updateGLVolume()
    this.drawScene()
    return this
    // }

    // await this.addMeshFromUrl(meshList[0])
    // this.updateGLVolume()
    // this.drawScene()
    // return this
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
    const node = event.detail.node
    const rgba = [1, 1, 1, 1]
    this.addLabel(
      node.name,
      {
        textColor: rgba,
        bulletScale: 1,
        bulletColor: rgba,
        lineWidth: 0,
        lineColor: rgba,
        lineTerminator: LabelLineTerminator.NONE,
        textScale: 1.0
      },
      [node.x, node.y, node.z]
    )
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
    let connectome = json
    if ('data_type' in json && json.data_type === 'fs_pointset') {
      connectome = NVConnectome.convertFreeSurferConnectome(json as FreeSurferConnectome)
      log.warn('converted FreeSurfer connectome', connectome)
    } else if ('nodes' in json) {
      const nodes = json.nodes
      if ('names' in nodes && 'X' in nodes && 'Y' in nodes && 'Z' in nodes && 'Color' in nodes && 'Size' in nodes) {
        // convert dense "legacy" format to sparse format
        connectome = NVConnectome.convertLegacyConnectome(json as LegacyConnectome)
      }
    } else {
      throw new Error('not a known connectome format')
    }
    return new NVConnectome(this.gl, connectome as LegacyConnectome)
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
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)

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
    const vx = this.back.dims[1] * this.back.dims[2] * this.back.dims[3]
    this.drawBitmap = new Uint8Array(vx)
    this.clickToSegmentGrowingBitmap = new Uint8Array(vx)
    this.drawClearAllUndoBitmaps()
    this.drawAddUndoBitmap()
    if (this.opts.is2DSliceShader) {
      this.drawTexture = this.r8Tex2D(this.drawTexture, TEXTURE7_DRAW, this.back.dims)
    } else {
      this.drawTexture = this.r8Tex(this.drawTexture, TEXTURE7_DRAW, this.back.dims, true)
    }
    this.refreshDrawing(false)
  }

  /**
   * Creates or updates a 1-component 16-bit signed integer 3D texture on the GPU.
   * @internal
   */
  r16Tex(texID: WebGLTexture | null, activeID: number, dims: number[], img16: Int16Array): WebGLTexture {
    if (texID) {
      this.gl.deleteTexture(texID)
    }
    texID = this.gl.createTexture()!
    this.gl.activeTexture(activeID)
    this.gl.bindTexture(this.gl.TEXTURE_3D, texID)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1)
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R16I, dims[1], dims[2], dims[3]) // output background dimensions
    const nv = dims[1] * dims[2] * dims[3]
    if (img16.length !== nv) {
      img16 = new Int16Array(nv)
    }
    this.gl.texSubImage3D(
      this.gl.TEXTURE_3D,
      0,
      0,
      0,
      0,
      dims[1],
      dims[2],
      dims[3],
      this.gl.RED_INTEGER,
      this.gl.SHORT,
      img16
    ) // this.gl.SHORT,

    return texID
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
    const background = this.r16Tex(null, TEXTURE11_GC_BACK, this.back.dims, img16)
    for (let i = 1; i < nv; i++) {
      img16[i] = this.drawBitmap[i]
    }
    const label0 = this.r16Tex(null, TEXTURE14_GC_LABEL0, this.back.dims, img16)
    const label1 = this.r16Tex(null, TEXTURE15_GC_LABEL1, this.back.dims, img16)
    const kMAX_STRENGTH = 10000
    for (let i = 1; i < nv; i++) {
      if (img16[i] > 0) {
        img16[i] = kMAX_STRENGTH
      }
    }
    const strength0 = this.r16Tex(null, TEXTURE12_GC_STRENGTH0, this.back.dims, img16)
    const strength1 = this.r16Tex(null, TEXTURE13_GC_STRENGTH1, this.back.dims, img16)
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
    if (drawBitmap === null) {
      drawBitmap = this.drawBitmap
    }
    if (!this.back?.dims) {
      throw new Error('back.dims not set')
    }
    const dx = this.back.dims[1]
    const dy = this.back.dims[2]
    const dz = this.back.dims[3]
    x = Math.min(Math.max(x, 0), dx - 1)
    y = Math.min(Math.max(y, 0), dy - 1)
    z = Math.min(Math.max(z, 0), dz - 1)
    drawBitmap![x + y * dx + z * dx * dy] = penValue
    // get tile index for voxel
    const isAx = this.drawPenAxCorSag === 0
    const isCor = this.drawPenAxCorSag === 1
    const isSag = this.drawPenAxCorSag === 2
    // since the pen is only drawing in one 2D plane,
    // only draw the neighbors (based on penSize) in that plane.
    // if penSize is 1, only draw the voxel itself.
    // if penSize is even (2, 4, 6, etc.), then the extra voxel will be drawn in the positive direction.
    // if penSize is odd (3, 5, 7, etc.), then the the pen will be centered on the voxel.
    if (this.opts.penSize > 1) {
      const halfPenSize = Math.floor(this.opts.penSize / 2)
      for (let i = -halfPenSize; i <= halfPenSize; i++) {
        for (let j = -halfPenSize; j <= halfPenSize; j++) {
          if (isAx) {
            drawBitmap![x + i + (y + j) * dx + z * dx * dy] = penValue
          } else if (isCor) {
            drawBitmap![x + i + y * dx + (z + j) * dx * dy] = penValue
          } else if (isSag) {
            drawBitmap![x + (y + j) * dx + (z + i) * dx * dy] = penValue
          }
        }
      }
    }
  }

  /**
   * Draws a 3D line between two voxels in the drawing bitmap using Bresenham's algorithm.
   * @internal
   */
  drawPenLine(ptA: number[], ptB: number[], penValue: number): void {
    const dx = Math.abs(ptA[0] - ptB[0])
    const dy = Math.abs(ptA[1] - ptB[1])
    const dz = Math.abs(ptA[2] - ptB[2])
    let xs = -1
    let ys = -1
    let zs = -1
    if (ptB[0] > ptA[0]) {
      xs = 1
    }
    if (ptB[1] > ptA[1]) {
      ys = 1
    }
    if (ptB[2] > ptA[2]) {
      zs = 1
    }
    let x1 = ptA[0]
    let y1 = ptA[1]
    let z1 = ptA[2]
    const x2 = ptB[0]
    const y2 = ptB[1]
    const z2 = ptB[2]
    if (dx >= dy && dx >= dz) {
      // Driving axis is X-axis"
      let p1 = 2 * dy - dx
      let p2 = 2 * dz - dx
      while (x1 !== x2) {
        x1 += xs
        if (p1 >= 0) {
          y1 += ys
          p1 -= 2 * dx
        }
        if (p2 >= 0) {
          z1 += zs
          p2 -= 2 * dx
        }
        p1 += 2 * dy
        p2 += 2 * dz
        this.drawPt(x1, y1, z1, penValue)
      }
    } else if (dy >= dx && dy >= dz) {
      // Driving axis is Y-axis"
      let p1 = 2 * dx - dy
      let p2 = 2 * dz - dy
      while (y1 !== y2) {
        y1 += ys
        if (p1 >= 0) {
          x1 += xs
          p1 -= 2 * dy
        }
        if (p2 >= 0) {
          z1 += zs
          p2 -= 2 * dy
        }
        p1 += 2 * dx
        p2 += 2 * dz
        this.drawPt(x1, y1, z1, penValue)
      }
    } else {
      // # Driving axis is Z-axis
      let p1 = 2 * dy - dz
      let p2 = 2 * dx - dz
      while (z1 !== z2) {
        z1 += zs
        if (p1 >= 0) {
          y1 += ys
          p1 -= 2 * dz
        }
        if (p2 >= 0) {
          x1 += xs
          p2 -= 2 * dz
        }
        p1 += 2 * dy
        p2 += 2 * dx
        this.drawPt(x1, y1, z1, penValue)
      }
    }
  }

  /**
   * Draw a rectangle from point A to point B
   * @internal
   */
  drawRectangleMask(ptA: number[], ptB: number[], penValue: number): void {
    if (!this.back?.dims) {
      throw new Error('back.dims not set')
    }
    const dx = this.back.dims[1]
    const dy = this.back.dims[2]
    const dz = this.back.dims[3]

    // Get bounds of rectangle
    const x1 = Math.min(Math.max(Math.min(ptA[0], ptB[0]), 0), dx - 1)
    const y1 = Math.min(Math.max(Math.min(ptA[1], ptB[1]), 0), dy - 1)
    const z1 = Math.min(Math.max(Math.min(ptA[2], ptB[2]), 0), dz - 1)
    const x2 = Math.min(Math.max(Math.max(ptA[0], ptB[0]), 0), dx - 1)
    const y2 = Math.min(Math.max(Math.max(ptA[1], ptB[1]), 0), dy - 1)
    const z2 = Math.min(Math.max(Math.max(ptA[2], ptB[2]), 0), dz - 1)

    // Fill the rectangle
    for (let z = z1; z <= z2; z++) {
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          this.drawPt(x, y, z, penValue)
        }
      }
    }
  }

  /**
   * Draw an ellipse from point A to point B (treating them as opposite corners of bounding box)
   * @internal
   */
  drawEllipseMask(ptA: number[], ptB: number[], penValue: number): void {
    if (!this.back?.dims) {
      throw new Error('back.dims not set')
    }
    const dx = this.back.dims[1]
    const dy = this.back.dims[2]
    const dz = this.back.dims[3]

    // Get bounds of ellipse
    const x1 = Math.min(Math.max(Math.min(ptA[0], ptB[0]), 0), dx - 1)
    const y1 = Math.min(Math.max(Math.min(ptA[1], ptB[1]), 0), dy - 1)
    const z1 = Math.min(Math.max(Math.min(ptA[2], ptB[2]), 0), dz - 1)
    const x2 = Math.min(Math.max(Math.max(ptA[0], ptB[0]), 0), dx - 1)
    const y2 = Math.min(Math.max(Math.max(ptA[1], ptB[1]), 0), dy - 1)
    const z2 = Math.min(Math.max(Math.max(ptA[2], ptB[2]), 0), dz - 1)

    // Calculate center and radii
    const centerX = (x1 + x2) / 2
    const centerY = (y1 + y2) / 2
    const centerZ = (z1 + z2) / 2
    const radiusX = Math.abs(x2 - x1) / 2
    const radiusY = Math.abs(y2 - y1) / 2
    const radiusZ = Math.abs(z2 - z1) / 2

    // Draw ellipse using the standard ellipse equation
    for (let z = z1; z <= z2; z++) {
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          const distX = (x - centerX) / (radiusX + 0.5)
          const distY = (y - centerY) / (radiusY + 0.5)
          const distZ = (z - centerZ) / (radiusZ + 0.5)
          // Check if point is inside ellipse
          if (distX * distX + distY * distY + distZ * distZ <= 1.0) {
            this.drawPt(x, y, z, penValue)
          }
        }
      }
    }
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
        neighborOffsets.push(
          -xDim - 1,
          -xDim + 1,
          xDim - 1,
          xDim + 1,
          -nxy - xDim,
          -nxy + xDim,
          -nxy - 1,
          -nxy + 1,
          nxy - xDim,
          nxy + xDim,
          nxy - 1,
          nxy + 1
        )
      }

      if (neighbors > 18) {
        // offsets for 26-connectivity (corner neighbors)
        neighborOffsets.push(
          -nxy - xDim - 1,
          -nxy - xDim + 1,
          -nxy + xDim - 1,
          -nxy + xDim + 1,
          nxy - xDim - 1,
          nxy - xDim + 1,
          nxy + xDim - 1,
          nxy + xDim + 1
        )
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
    const dims = [this.back.dims[1], this.back.dims[2], this.back.dims[3]] // +1: dims indexed from 0!
    const nx = dims[0]
    const nxy = nx * dims[1]
    function xyz2vx(pt: number[]): number {
      // provided an XYZ 3D point, provide address in 1D array
      return pt[0] + pt[1] * nx + pt[2] * nxy
    }
    function vx2xyz(vx: number): number[] {
      // provided address in 1D array, return XYZ coordinate
      const Z = Math.floor(vx / nxy) // slice
      const Y = Math.floor((vx - Z * nxy) / nx) // column
      const X = Math.floor(vx % nx)
      return [X, Y, Z]
    }
    // 1. Set Q to the empty queue or stack.
    const Q = []
    // 2. Add node to the end of Q.
    Q.push(seedVx)
    img[seedVx] = 2 // part of cluster
    // 3. While Q is not empty:
    while (Q.length > 0) {
      // 4.   Set n equal to the first element of Q.
      const vx = Q[0]
      // 5.   Remove first element from Q.
      Q.shift()
      // 6. Test six neighbors of n (left,right,anterior,posterior,inferior, superior
      //   If any is is unfound part of cluster (value = 1) set it to found (value 2) and add to Q
      const xyz = vx2xyz(vx)

      function testNeighbor(offset: number[]): void {
        const xyzN = xyz.slice()
        xyzN[0] += offset[0]
        xyzN[1] += offset[1]
        xyzN[2] += offset[2]
        if (xyzN[0] < 0 || xyzN[1] < 0 || xyzN[2] < 0) {
          return
        }
        if (xyzN[0] >= dims[0] || xyzN[1] >= dims[1] || xyzN[2] >= dims[2]) {
          return
        }
        const vxT = xyz2vx(xyzN)
        if (img[vxT] !== 1) {
          return
        }
        img[vxT] = 2 // part of cluster
        Q.push(vxT)
      }
      // test neighbors that share face
      testNeighbor([0, 0, -1]) // inferior
      testNeighbor([0, 0, 1]) // superior
      testNeighbor([0, -1, 0]) // posterior
      testNeighbor([0, 1, 0]) // anterior
      testNeighbor([-1, 0, 0]) // left
      testNeighbor([1, 0, 0]) // right
      if (neighbors <= 6) {
        continue
      }
      // test voxels that share edge
      testNeighbor([-1, -1, 0]) // left posterior
      testNeighbor([1, 1, 0]) // right posterior
      testNeighbor([-1, 1, 0]) // left anterior
      testNeighbor([1, 1, 0]) // right anterior
      testNeighbor([0, -1, -1]) // posterior inferior
      testNeighbor([0, 1, -1]) // anterior inferior
      testNeighbor([-1, 0, -1]) // left inferior
      testNeighbor([1, 0, -1]) // right inferior
      testNeighbor([0, -1, 1]) // posterior superior
      testNeighbor([0, 1, 1]) // anterior superior
      testNeighbor([-1, 0, 1]) // left superior
      testNeighbor([1, 0, 1]) // right superior
      if (neighbors <= 18) {
        continue
      }
      // test neighbors that share a corner
      testNeighbor([-1, -1, -1]) // left posterior inferior
      testNeighbor([1, -1, -1]) // right posterior inferior
      testNeighbor([-1, 1, -1]) // left anterior inferior
      testNeighbor([1, 1, -1]) // right anterior inferior
      testNeighbor([-1, -1, 1]) // left posterior superior
      testNeighbor([1, -1, 1]) // right posterior superior
      testNeighbor([-1, 1, 1]) // left anterior superior
      testNeighbor([1, 1, 1]) // right anterior superior
      // 7. Continue looping until Q is exhausted.
    }
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
    const dims = [this.back.dims[1], this.back.dims[2], this.back.dims[3]]
    if (seedXYZ[0] < 0 || seedXYZ[1] < 0 || seedXYZ[2] < 0) {
      return
    }
    if (seedXYZ[0] >= dims[0] || seedXYZ[1] >= dims[1] || seedXYZ[2] >= dims[2]) {
      return
    }

    const nx = dims[0]
    const nxy = nx * dims[1]
    const nxyz = nxy * dims[2]

    const originalBitmap = this.clickToSegmentIsGrowing ? this.drawBitmap : targetBitmap
    if (!originalBitmap) {
      log.error('Could not determine original bitmap state.')
      return
    }

    const img = new Uint8Array(nxyz).fill(0)

    let constrainXYZ = -1
    if (is2D && this.drawPenAxCorSag === SLICE_TYPE.AXIAL) {
      constrainXYZ = 2
    } else if (is2D && this.drawPenAxCorSag === SLICE_TYPE.CORONAL) {
      constrainXYZ = 1
    } else if (is2D && this.drawPenAxCorSag === SLICE_TYPE.SAGITTAL) {
      constrainXYZ = 0
    }
    function vx2xyz(vx: number): number[] {
      const Z = Math.floor(vx / nxy)
      const Y = Math.floor((vx - Z * nxy) / nx)
      const X = Math.floor(vx % nx)
      return [X, Y, Z]
    }
    function xyz2vx(pt: number[]): number {
      return pt[0] + pt[1] * nx + pt[2] * nxy
    }
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

    if (isGrowClusterTool && originalSeedColor === 0) {
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

    if (
      isGrowClusterTool &&
      (growSelectedCluster === Number.POSITIVE_INFINITY || growSelectedCluster === Number.NEGATIVE_INFINITY)
    ) {
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
      let clusterSum = 0
      let clusterCount = 0
      for (let i = 0; i < nxyz; i++) {
        if (tempImgForIdentification[i] === 2) {
          clusterSum += backImg[i]
          clusterCount++
        }
      }
      baseIntensity = clusterCount > 0 ? clusterSum / clusterCount : backImg[seedVx] // Use mean
      log.debug(`Grow Cluster using mean intensity: ${baseIntensity.toFixed(2)} from ${clusterCount} voxels.`)

      let fillMin = -Infinity
      let fillMax = Infinity
      if (growSelectedCluster === Number.POSITIVE_INFINITY) {
        fillMin = baseIntensity
      }
      if (growSelectedCluster === Number.NEGATIVE_INFINITY) {
        fillMax = baseIntensity
      }

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
        let fillMin = -Infinity
        let fillMax = Infinity
        if (isFinite(forceMin) && isFinite(forceMax)) {
          fillMin = forceMin
          fillMax = forceMax
        } else if (growSelectedCluster === Number.POSITIVE_INFINITY) {
          fillMin = baseIntensity
        } else if (growSelectedCluster === Number.NEGATIVE_INFINITY) {
          fillMax = baseIntensity
        }

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
      let isSeedValidOriginal = false
      if (isGrowClusterTool && growSelectedCluster !== 0) {
        if (originalSeedColor !== 0) {
          isSeedValidOriginal = true
        }
      } else {
        if (originalSeedColor !== 0 || newColor === 0) {
          isSeedValidOriginal = true
        }
      }

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

    for (let i = 0; i < nxyz; i++) {
      if (img[i] === 2) {
        targetBitmap[i] = newColor // Apply final color
      } else if (this.clickToSegmentIsGrowing && targetBitmap === this.clickToSegmentGrowingBitmap) {
        targetBitmap[i] = originalBitmap[i]
      }
    }

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
   * uses first-in, first out queue for storage
   * @internal
   */
  floodFillSectionFIFO(
    img2D: Uint8Array,
    dims2D: readonly number[],
    minPt: readonly number[],
    maxPt: readonly number[]
  ): void {
    const w = dims2D[0]
    const [minX, minY] = minPt
    const [maxX, maxY] = maxPt
    // Worst-case buffer size = bounding box area
    // const capacity = (maxX - minX + 1) * (maxY - minY + 1);
    // Likely worst case: we retire perimeter and move concentrically inward
    // const capacity = 2 * (maxX - minX + maxY - minY + 2);
    // Lets over allocate as I am unsure about edge cases
    const capacity = 4 * (maxX - minX + maxY - minY + 2)
    const queue = new Int32Array(capacity * 2) // store x,y pairs
    let head = 0
    let tail = 0

    function enqueue(x: number, y: number): void {
      if (x < minX || x > maxX || y < minY || y > maxY) {
        return
      }
      const idx = x + y * w
      if (img2D[idx] !== 0) {
        return
      }
      img2D[idx] = 2 // mark visited/outside

      queue[tail] = x
      queue[tail + 1] = y
      tail = (tail + 2) % queue.length
    }

    function dequeue(): [number, number] | null {
      if (head === tail) {
        return null
      }
      const x = queue[head]
      const y = queue[head + 1]
      head = (head + 2) % queue.length
      return [x, y]
    }

    // seed all edges
    for (let x = minX; x <= maxX; x++) {
      enqueue(x, minY)
      enqueue(x, maxY)
    }
    for (let y = minY + 1; y <= maxY - 1; y++) {
      enqueue(minX, y)
      enqueue(maxX, y)
    }

    // flood fill
    let pt: [number, number] | null
    while ((pt = dequeue()) !== null) {
      const [x, y] = pt
      enqueue(x - 1, y)
      enqueue(x + 1, y)
      enqueue(x, y - 1)
      enqueue(x, y + 1)
    }
  }

  /**
   * Connects and fills the interior of drawn line segments in 2D slice space.
   * @internal
   */
  drawPenFilled(): void {
    const nPts = this.drawPenFillPts.length
    if (nPts < 2) {
      // can not fill single line
      this.drawPenFillPts = []
      return
    }
    // do fill in 2D, based on axial (0), coronal (1) or sagittal drawing (2
    const axCorSag = this.drawPenAxCorSag
    // axial is x(0)*y(1) horizontal*vertical
    let h = 0
    let v = 1
    if (axCorSag === 1) {
      v = 2
    } // coronal is x(0)*z(0)
    if (axCorSag === 2) {
      // sagittal is y(1)*z(2)
      h = 1
      v = 2
    }

    if (!this.back?.dims) {
      throw new Error('back.dims undefined')
    }

    const dims2D = [this.back.dims[h + 1], this.back.dims[v + 1]] // +1: dims indexed from 0!
    // create bitmap of horizontal*vertical voxels:
    const img2D = new Uint8Array(dims2D[0] * dims2D[1])
    let pen = 1 // do not use this.opts.penValue, as "erase" is zero
    function drawLine2D(ptA: number[], ptB: number[]): void {
      const dx = Math.abs(ptA[0] - ptB[0])
      const dy = Math.abs(ptA[1] - ptB[1])
      img2D[ptA[0] + ptA[1] * dims2D[0]] = pen
      img2D[ptB[0] + ptB[1] * dims2D[0]] = pen
      let xs = -1
      let ys = -1
      if (ptB[0] > ptA[0]) {
        xs = 1
      }
      if (ptB[1] > ptA[1]) {
        ys = 1
      }
      let x1 = ptA[0]
      let y1 = ptA[1]
      const x2 = ptB[0]
      const y2 = ptB[1]
      if (dx >= dy) {
        // Driving axis is X-axis"
        let p1 = 2 * dy - dx
        while (x1 !== x2) {
          x1 += xs
          if (p1 >= 0) {
            y1 += ys
            p1 -= 2 * dx
          }
          p1 += 2 * dy
          img2D[x1 + y1 * dims2D[0]] = pen
        }
      } else {
        // Driving axis is Y-axis"
        let p1 = 2 * dx - dy
        while (y1 !== y2) {
          y1 += ys
          if (p1 >= 0) {
            x1 += xs
            p1 -= 2 * dy
          }
          p1 += 2 * dx
          img2D[x1 + y1 * dims2D[0]] = pen
        }
      }
    }
    function constrainXY(xy: number[]): number[] {
      const x = Math.min(Math.max(xy[0], 0), dims2D[0] - 1)
      const y = Math.min(Math.max(xy[1], 0), dims2D[1] - 1)
      return [x, y]
    }
    const startPt = constrainXY([this.drawPenFillPts[0][h], this.drawPenFillPts[0][v]])
    let minPt = [...startPt]
    let maxPt = [...startPt]
    let prevPt = startPt
    for (let i = 1; i < nPts; i++) {
      let pt = [this.drawPenFillPts[i][h], this.drawPenFillPts[i][v]]
      pt = constrainXY(pt)
      minPt = [Math.min(pt[0], minPt[0]), Math.min(pt[1], minPt[1])]
      maxPt = [Math.max(pt[0], maxPt[0]), Math.max(pt[1], maxPt[1])]
      drawLine2D(prevPt, pt)
      prevPt = pt
    }
    drawLine2D(startPt, prevPt) // close drawing
    const pad = 1
    minPt[0] = Math.max(0, minPt[0] - pad)
    minPt[1] = Math.max(0, minPt[1] - pad)
    maxPt[0] = Math.min(dims2D[0] - 1, maxPt[0] + pad)
    maxPt[1] = Math.min(dims2D[1] - 1, maxPt[1] + pad)
    for (let y = 0; y < dims2D[1]; y++) {
      for (let x = 0; x < dims2D[0]; x++) {
        if (x >= minPt[0] && x < maxPt[0] && y >= minPt[1] && y <= maxPt[1]) {
          continue
        }
        const pxl = x + y * dims2D[0]
        if (img2D[pxl] !== 0) {
          continue
        }
        img2D[pxl] = 2
      }
    }
    const startTime = Date.now()
    this.floodFillSectionFIFO(img2D, dims2D, minPt, maxPt)
    log.debug(`FloodFill ${Date.now() - startTime}`)
    // all voxels with value of zero have no path to edges
    // insert surviving pixels from 2D bitmap into 3D bitmap
    pen = this.opts.penValue
    const slice = this.drawPenFillPts[0][3 - (h + v)]

    if (!this.drawBitmap) {
      throw new Error('drawBitmap undefined')
    }

    if (axCorSag === 0) {
      // axial
      const offset = slice * dims2D[0] * dims2D[1]
      for (let i = 0; i < dims2D[0] * dims2D[1]; i++) {
        if (img2D[i] !== 2) {
          this.drawBitmap[i + offset] = pen
        }
      }
    } else {
      let xStride = 1 // coronal: horizontal LR pixels contiguous
      const yStride = this.back.dims[1] * this.back.dims[2] // coronal: vertical is slice
      let zOffset = slice * this.back.dims[1] // coronal: slice is number of columns
      if (axCorSag === 2) {
        // sagittal
        xStride = this.back.dims[1]
        zOffset = slice
      }
      let i = 0
      for (let y = 0; y < dims2D[1]; y++) {
        for (let x = 0; x < dims2D[0]; x++) {
          if (img2D[i] !== 2) {
            this.drawBitmap[x * xStride + y * yStride + zOffset] = pen
          }
          i++
        }
      }
    }
    // this.drawUndoBitmaps[this.currentDrawUndoBitmap]
    if (!this.drawFillOverwrites && this.drawUndoBitmaps[this.currentDrawUndoBitmap].length > 0) {
      const nv = this.drawBitmap.length
      const bmp = decodeRLE(this.drawUndoBitmaps[this.currentDrawUndoBitmap], nv)
      for (let i = 0; i < nv; i++) {
        if (bmp[i] === 0) {
          continue
        }
        this.drawBitmap[i] = bmp[i]
      }
    }
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
    this.drawTexture = this.rgbaTex(this.drawTexture, TEXTURE7_DRAW, [2, 2, 2, 2], true)
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
    // Only use the growing bitmap if drawing AND clickToSegment are enabled.
    if (useClickToSegmentBitmap && (!this.opts.drawingEnabled || !this.opts.clickToSegment)) {
      log.debug('refreshDrawing: Conditions not met for clickToSegment bitmap, using drawBitmap.')
      useClickToSegmentBitmap = false // Fallback to the main drawing bitmap
    }
    // Ensure the selected bitmap actually exists, otherwise use a blank default or the other one if possible.
    const selectedBitmap = useClickToSegmentBitmap ? this.clickToSegmentGrowingBitmap : this.drawBitmap
    if (!selectedBitmap && !useClickToSegmentBitmap && this.clickToSegmentGrowingBitmap) {
      log.warn('refreshDrawing: drawBitmap is null, but clickToSegmentGrowingBitmap exists. Check state.')
    } else if (!selectedBitmap && useClickToSegmentBitmap && this.drawBitmap) {
      log.warn('refreshDrawing: clickToSegmentGrowingBitmap is null, falling back to drawBitmap.')
      useClickToSegmentBitmap = false // Use the main bitmap if growing one is missing
    } else if (!selectedBitmap) {
      log.warn('refreshDrawing: Both bitmaps are null. Uploading empty data.')
    }
    // Determine the bitmap data source
    const bitmapDataSource = useClickToSegmentBitmap ? this.clickToSegmentGrowingBitmap : this.drawBitmap

    if (!this.back?.dims) {
      // If back isn't ready, we can't determine dimensions. Exit early.
      log.warn('refreshDrawing: back.dims undefined, cannot refresh drawing texture yet.')
      return
    }

    // Dimensions check
    const dims = this.back.dims.slice()
    const vx = this.back.dims[1] * this.back.dims[2] * this.back.dims[3]

    // Check if the determined bitmapDataSource exists
    if (!bitmapDataSource) {
      log.warn(
        `refreshDrawing: Bitmap data source (${useClickToSegmentBitmap ? 'growing' : 'main'}) is null. Cannot update texture.`
      )
      if (isForceRedraw) {
        this.drawScene()
      } // might just be an empty drawing
      return
    }

    // Check length consistency if bitmapDataSource is not null
    if (bitmapDataSource.length === 8) {
      // Special case for initial 2x2x2 texture
      dims[1] = 2
      dims[2] = 2
      dims[3] = 2
    } else if (vx !== bitmapDataSource.length) {
      log.warn(`Drawing bitmap length (${bitmapDataSource.length}) must match the background image (${vx})`)
    }

    // Proceed with texture update using bitmapDataSource
    this.gl.activeTexture(TEXTURE7_DRAW)
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
      this.gl.texSubImage3D(
        this.gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        dims[1],
        dims[2],
        dims[3],
        this.gl.RED,
        this.gl.UNSIGNED_BYTE,
        bitmapDataSource
      )
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
    this.paqdTexture = this.rgbaTex(this.paqdTexture, TEXTURE8_PAQD, [2, 2, 2, 2], true)
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
   * Creates a 3D 1-component uint8 texture on the GPU with given dimensions.
   * @internal
   */
  r8Tex(texID: WebGLTexture | null, activeID: number, dims: number[], isInit = false): WebGLTexture | null {
    if (texID) {
      this.gl.deleteTexture(texID)
    }
    texID = this.gl.createTexture()
    this.gl.activeTexture(activeID)
    this.gl.bindTexture(this.gl.TEXTURE_3D, texID)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1)
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R8, dims[1], dims[2], dims[3]) // output background dimensions
    if (isInit) {
      const img8 = new Uint8Array(dims[1] * dims[2] * dims[3])
      this.gl.texSubImage3D(
        this.gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        dims[1],
        dims[2],
        dims[3],
        this.gl.RED,
        this.gl.UNSIGNED_BYTE,
        img8
      )
    }
    return texID
  }

  /**
   * Creates a 2D 4-component (RGBA) uint8 texture on the GPU with optional vertical flip.
   * @internal
   */
  rgbaTex2D(
    texID: WebGLTexture | null,
    activeID: number,
    dims: number[],
    data: Uint8Array | null = null,
    isFlipVertical: boolean = true
  ): WebGLTexture | null {
    if (texID) {
      this.gl.deleteTexture(texID)
    }
    texID = this.gl.createTexture()
    this.gl.activeTexture(activeID)
    this.gl.bindTexture(this.gl.TEXTURE_2D, texID)

    // Set texture parameters
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1)

    // Allocate storage for the 2D texture
    this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.RGBA8, dims[1], dims[2])
    if (data) {
      let drawData = data
      const width = dims[1]
      const height = dims[2]
      if (isFlipVertical) {
        drawData = new Uint8Array(data.length)
        const rowSize = width * 4 // RGBA has 4 bytes per pixel
        for (let y = 0; y < height; y++) {
          const srcStart = y * rowSize
          const destStart = (height - 1 - y) * rowSize
          drawData.set(data.subarray(srcStart, srcStart + rowSize), destStart)
        }
      }
      this.gl.texSubImage2D(
        this.gl.TEXTURE_2D,
        0, // Level
        0,
        0, // xOffset, yOffset
        width,
        height, // Width, Height
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        drawData
      )
    }
    return texID
  }

  /**
   * Creates a 3D 4-component (RGBA) uint8 texture on the GPU, optionally initializing with empty data.
   * @internal
   */
  rgbaTex(texID: WebGLTexture | null, activeID: number, dims: number[], isInit = false): WebGLTexture | null {
    if (texID) {
      this.gl.deleteTexture(texID)
    }
    texID = this.gl.createTexture()
    this.gl.activeTexture(activeID)
    this.gl.bindTexture(this.gl.TEXTURE_3D, texID)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1)
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.RGBA8, dims[1], dims[2], dims[3]) // output background dimensions
    if (isInit) {
      const img8 = new Uint8Array(dims[1] * dims[2] * dims[3] * 4)
      this.gl.texSubImage3D(
        this.gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        dims[1],
        dims[2],
        dims[3],
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        img8
      )
    }
    return texID
  }

  /**
   * Create or recreate a 3D RGBA16UI texture on the GPU with given dimensions.
   * Deletes existing texture if provided, then allocates storage and optionally initializes with zeros.
   * @internal
   */
  rgba16Tex(texID: WebGLTexture | null, activeID: number, dims: number[], isInit = false): WebGLTexture | null {
    if (texID) {
      this.gl.deleteTexture(texID)
    }
    texID = this.gl.createTexture()
    this.gl.activeTexture(activeID)
    this.gl.bindTexture(this.gl.TEXTURE_3D, texID)
    // Not: cannot be gl.LINEAR for integer textures
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 2)
    this.gl.pixelStorei(this.gl.PACK_ALIGNMENT, 2)
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.RGBA16UI, dims[1], dims[2], dims[3]) // output background dimensions
    if (isInit) {
      const img16 = new Uint16Array(dims[1] * dims[2] * dims[3] * 4)
      this.gl.texSubImage3D(
        this.gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        dims[1],
        dims[2],
        dims[3],
        this.gl.RGBA_INTEGER,
        this.gl.UNSIGNED_SHORT,
        img16
      )
    }
    return texID
  }

  /**
   * Remove cross-origin attribute from image if its URL is not from the same origin as the current page.
   * @internal
   */
  requestCORSIfNotSameOrigin(img: HTMLImageElement, url: string): void {
    if (new URL(url, window.location.href).origin !== window.location.origin) {
      img.crossOrigin = ''
    }
  }

  /**
   * Loads a PNG image from a URL and creates a 4-component (RGBA) uint8 WebGL texture.
   * Binds texture to a specific texture unit depending on textureNum and sets texture parameters.
   * Automatically handles CORS and draws scene if needed.
   * @internal
   */
  async loadPngAsTexture(pngUrl: string, textureNum: number): Promise<WebGLTexture | null> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = (): void => {
        if (!this.bmpShader) {
          return
        }
        let pngTexture
        if (textureNum === 4) {
          if (this.bmpTexture !== null) {
            this.gl.deleteTexture(this.bmpTexture)
          }
          this.bmpTexture = this.gl.createTexture()
          pngTexture = this.bmpTexture
          this.bmpTextureWH = img.width / img.height
          this.gl.activeTexture(TEXTURE4_THUMBNAIL)
          this.bmpShader.use(this.gl)
          this.gl.uniform1i(this.bmpShader.uniforms.bmpTexture, 4)
        } else if (textureNum === 5) {
          this.gl.activeTexture(TEXTURE5_MATCAP)
          if (this.matCapTexture !== null) {
            this.gl.deleteTexture(this.matCapTexture)
          }
          this.matCapTexture = this.gl.createTexture()
          pngTexture = this.matCapTexture
        } else {
          this.fontShader!.use(this.gl)
          this.gl.activeTexture(TEXTURE3_FONT)
          this.gl.uniform1i(this.fontShader!.uniforms.fontTexture, 3)
          if (this.fontTexture !== null) {
            this.gl.deleteTexture(this.fontTexture)
          }
          this.fontTexture = this.gl.createTexture()
          pngTexture = this.fontTexture
        }
        this.gl.bindTexture(this.gl.TEXTURE_2D, pngTexture)
        // Set the parameters so we can render any size image.
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)
        // Upload the image into the texture.
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img)
        resolve(pngTexture)
        if (textureNum !== 4) {
          this.drawScene()
        } // draw the font
      }
      img.onerror = reject
      this.requestCORSIfNotSameOrigin(img, pngUrl)
      img.src = pngUrl
    })
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
    const name = meshShaderName.toLowerCase()
    for (let i = 0; i < this.meshShaders.length; i++) {
      if (this.meshShaders[i].Name.toLowerCase() === name) {
        return i
      }
    }
  }

  /**
   * select new shader for triangulated meshes and connectomes. Note that this function requires the mesh is fully loaded: you may want use `await` with loadMeshes (as seen in live demo).
   * @param id - id of mesh to change
   * @param meshShaderNameOrNumber - identify shader for usage
   * @example niivue.setMeshShader('toon');
   * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
   */
  setMeshShader(id: number, meshShaderNameOrNumber = 2): void {
    let shaderIndex: number | undefined = 0
    if (typeof meshShaderNameOrNumber === 'number') {
      shaderIndex = meshShaderNameOrNumber
    } else {
      shaderIndex = this.meshShaderNameToNumber(meshShaderNameOrNumber)
    }

    if (shaderIndex === undefined) {
      throw new Error('shaderIndex undefined')
    }

    shaderIndex = Math.min(shaderIndex, this.meshShaders.length - 1)
    shaderIndex = Math.max(shaderIndex, 0)
    const index = this.getMeshIndexByID(id)
    if (index >= this.meshes.length) {
      log.debug('Unable to change shader until mesh is loaded (maybe you need async)')
      return
    }
    this.meshes[index].meshShaderIndex = shaderIndex
    this.updateGLVolume()
    this.onMeshShaderChanged(index, shaderIndex)
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
  ): { Name: string; Frag: string; shader: Shader } {
    if (!fragmentShaderText) {
      throw new Error('Need fragment shader')
    }

    const num = this.meshShaderNameToNumber(name)!
    if (num >= 0) {
      // prior shader uses this name: delete it!
      this.gl.deleteProgram(this.meshShaders[num].shader!.program)
      this.meshShaders.splice(num, 1)
    }

    const shader = new Shader(this.gl, vertMeshShader, fragmentShaderText)
    shader.use(this.gl)

    return {
      Name: name,
      Frag: fragmentShaderText,
      shader
    }
  }

  /**
   * Install a special shader for 2D slice views
   * @param fragmentShaderText - custom fragment shader.
   * @if not text is provided, the default shader will be used
   * @internal
   */
  setCustomSliceShader(fragmentShaderText: string = ''): void {
    const gl = this.gl

    // If there's an existing custom shader, delete it
    if (this.customSliceShader) {
      gl.deleteProgram(this.customSliceShader.program)
      this.customSliceShader = null
    }

    // If empty string, fall back to default shader
    if (!fragmentShaderText) {
      this.updateGLVolume()
      return
    }

    // Create new custom shader
    const shader = new Shader(gl, vertSliceMMShader, fragmentShaderText)
    shader.use(gl)
    gl.uniform1i(shader.uniforms.volume, 0)
    gl.uniform1i(shader.uniforms.colormap, 1)
    gl.uniform1i(shader.uniforms.overlay, 2)
    gl.uniform1i(shader.uniforms.drawing, 7)
    gl.uniform1i(shader.uniforms.paqd, 8) // TEXTURE8_PAQD
    gl.uniform1f(shader.uniforms.drawOpacity, this.drawOpacity)

    this.customSliceShader = shader
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
   * retrieve all currently loaded meshes
   * @param sort - sort output alphabetically
   * @returns list of available mesh shader names
   * @example niivue.meshShaderNames();
   * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
   */
  meshShaderNames(sort = true): string[] {
    const cm = []
    for (let i = 0; i < this.meshShaders.length; i++) {
      cm.push(this.meshShaders[i].Name)
    }
    return sort === true ? cm.sort() : cm
  }

  /**
   * Initializes a rendering shader with texture units and uniforms.
   * @internal
   */
  initRenderShader(shader: Shader, gradientAmount = 0.0): void {
    shader.use(this.gl)
    this.gl.uniform1i(shader.uniforms.volume, 0)
    this.gl.uniform1i(shader.uniforms.colormap, 1)
    this.gl.uniform1i(shader.uniforms.overlay, 2)
    this.gl.uniform1i(shader.uniforms.drawing, 7)
    this.gl.uniform1i(shader.uniforms.paqd, 8) // TEXTURE8_PAQD
    this.gl.uniform1fv(shader.uniforms.renderDrawAmbientOcclusion, [this.renderDrawAmbientOcclusion, 1.0])
    this.gl.uniform1f(shader.uniforms.gradientAmount, gradientAmount)
    this.gl.uniform1f(shader.uniforms.silhouettePower, this.opts.renderSilhouette)
    const gradientOpacityLut = new Float32Array(gradientOpacityLutCount)
    for (let i = 0; i < gradientOpacityLutCount; i++) {
      if (this.opts.gradientOpacity === 0.0) {
        gradientOpacityLut[i] = 1.0
      } else {
        gradientOpacityLut[i] = Math.pow(i / (gradientOpacityLutCount - 1.0), this.opts.gradientOpacity * 8.0)
      }
    }
    this.gl.uniform1fv(this.gl.getUniformLocation(shader.program, 'gradientOpacity'), gradientOpacityLut)
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
    this.gl.clearDepth(0.0)
    this.gl.enable(this.gl.CULL_FACE)
    this.gl.cullFace(this.gl.FRONT)
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

    // register volume and overlay textures
    this.volumeTexture = this.rgbaTex(this.volumeTexture, TEXTURE0_BACK_VOL, [2, 2, 2, 2], true)
    this.overlayTexture = this.rgbaTex(this.overlayTexture, TEXTURE2_OVERLAY_VOL, [2, 2, 2, 2], true)
    this.drawTexture = this.r8Tex(this.drawTexture, TEXTURE7_DRAW, [2, 2, 2, 2], true)
    this.paqdTexture = this.rgbaTex(this.paqdTexture, TEXTURE8_PAQD, [2, 2, 2, 2], true)
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
    this.pickingImageShader = new Shader(gl, vertRenderShader, fragVolumePickingShader)
    this.pickingImageShader.use(gl)
    gl.uniform1i(this.pickingImageShader.uniforms.volume, 0)
    gl.uniform1i(this.pickingImageShader.uniforms.colormap, 1)
    gl.uniform1i(this.pickingImageShader.uniforms.overlay, 2)
    gl.uniform1i(this.pickingImageShader.uniforms.drawing, 7)
    // slice 2D shader
    this.slice2DShader = new Shader(gl, vertSliceMMShader, fragSlice2DShader)
    this.slice2DShader.use(gl)
    gl.uniform1i(this.slice2DShader.uniforms.volume, 0)
    gl.uniform1i(this.slice2DShader.uniforms.colormap, 1)
    gl.uniform1i(this.slice2DShader.uniforms.overlay, 2)
    gl.uniform1i(this.slice2DShader.uniforms.drawing, 7)
    gl.uniform1f(this.slice2DShader.uniforms.drawOpacity, this.drawOpacity)
    // slice mm shader
    this.sliceMMShader = new Shader(gl, vertSliceMMShader, fragSliceMMShader)
    this.sliceMMShader.use(gl)
    gl.uniform1i(this.sliceMMShader.uniforms.volume, 0)
    gl.uniform1i(this.sliceMMShader.uniforms.colormap, 1)
    gl.uniform1i(this.sliceMMShader.uniforms.overlay, 2)
    gl.uniform1i(this.sliceMMShader.uniforms.drawing, 7)
    gl.uniform1f(this.sliceMMShader.uniforms.drawOpacity, this.drawOpacity)
    // fragSliceV1Shader
    this.sliceV1Shader = new Shader(gl, vertSliceMMShader, fragSliceV1Shader)
    this.sliceV1Shader.use(gl)
    gl.uniform1i(this.sliceV1Shader.uniforms.volume, 0)
    gl.uniform1i(this.sliceV1Shader.uniforms.colormap, 1)
    gl.uniform1i(this.sliceV1Shader.uniforms.overlay, 2)
    gl.uniform1i(this.sliceV1Shader.uniforms.drawing, 7)
    gl.uniform1f(this.sliceV1Shader.uniforms.drawOpacity, this.drawOpacity)
    // orient cube
    this.orientCubeShader = new Shader(gl, vertOrientCubeShader, fragOrientCubeShader)
    this.orientCubeShaderVAO = gl.createVertexArray()
    gl.bindVertexArray(this.orientCubeShaderVAO)
    // Create a buffer
    const positionBuffer = gl.createBuffer()
    gl.enableVertexAttribArray(0)
    gl.enableVertexAttribArray(1)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, orientCube, gl.STATIC_DRAW)
    // XYZ position: (three floats)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0)
    // RGB color: (also three floats)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12)
    gl.bindVertexArray(this.unusedVAO)
    // rect shader (crosshair): horizontal and vertical lines only
    this.rectShader = new Shader(gl, vertRectShader, fragRectShader)
    this.rectShader.use(gl)
    this.rectOutlineShader = new Shader(gl, vertRectShader, fragRectOutlineShader)
    this.rectOutlineShader.use(gl)
    // line shader: diagonal lines
    this.lineShader = new Shader(gl, vertLineShader, fragRectShader)
    this.lineShader.use(gl)
    // 3D line shader
    this.line3DShader = new Shader(gl, vertLine3DShader, fragRectShader)
    this.line3DShader.use(gl)
    // circle shader
    this.circleShader = new Shader(gl, vertCircleShader, fragCircleShader)
    this.circleShader.use(gl)
    // render shader (3D)
    this.renderVolumeShader = new Shader(gl, vertRenderShader, fragRenderShader)
    this.initRenderShader(this.renderVolumeShader)
    this.renderSliceShader = new Shader(gl, vertRenderShader, fragRenderSliceShader)
    this.initRenderShader(this.renderSliceShader)
    this.renderGradientShader = new Shader(gl, vertRenderShader, fragRenderGradientShader)
    this.initRenderShader(this.renderGradientShader, 0.3)
    gl.uniform1i(this.renderGradientShader.uniforms.matCap, 5)
    gl.uniform1i(this.renderGradientShader.uniforms.gradient, 6)
    this.renderGradientValuesShader = new Shader(gl, vertRenderShader, fragRenderGradientValuesShader)
    this.initRenderShader(this.renderGradientValuesShader)
    gl.uniform1i(this.renderGradientValuesShader.uniforms.matCap, 5)
    gl.uniform1i(this.renderGradientValuesShader.uniforms.gradient, 6)
    this.renderShader = this.renderVolumeShader
    // colorbar shader
    this.colorbarShader = new Shader(gl, vertColorbarShader, fragColorbarShader)
    this.colorbarShader.use(gl)
    gl.uniform1i(this.colorbarShader.uniforms.colormap, 1)
    this.blurShader = new Shader(gl, blurVertShader, blurFragShader)
    this.sobelBlurShader = new Shader(gl, blurVertShader, sobelBlurFragShader)
    this.sobelFirstOrderShader = new Shader(gl, blurVertShader, sobelFirstOrderFragShader)
    this.sobelSecondOrderShader = new Shader(gl, blurVertShader, sobelSecondOrderFragShader)

    this.growCutShader = new Shader(gl, vertGrowCutShader, fragGrowCutShader)

    // pass through shaders
    this.passThroughShader = new Shader(gl, vertPassThroughShader, fragPassThroughShader)

    // orientation shaders
    this.orientShaderAtlasU = new Shader(gl, vertOrientShader, fragOrientShaderU.concat(fragOrientShaderAtlas))
    this.orientShaderAtlasI = new Shader(gl, vertOrientShader, fragOrientShaderI.concat(fragOrientShaderAtlas))

    this.orientShaderU = new Shader(gl, vertOrientShader, fragOrientShaderU.concat(fragOrientShader))
    this.orientShaderI = new Shader(gl, vertOrientShader, fragOrientShaderI.concat(fragOrientShader))
    this.orientShaderF = new Shader(gl, vertOrientShader, fragOrientShaderF.concat(fragOrientShader))
    this.orientShaderRGBU = new Shader(gl, vertOrientShader, fragOrientShaderU.concat(fragRGBOrientShader))
    this.orientShaderPAQD = new Shader(gl, vertOrientShader, fragOrientShaderU.concat(fragPAQDOrientShader))
    // 3D crosshair cylinder
    this.surfaceShader = new Shader(gl, vertSurfaceShader, fragSurfaceShader)
    this.surfaceShader.use(gl)
    // tractography fibers
    this.fiberShader = new Shader(gl, vertFiberShader, fragFiberShader)
    this.pickingImageShader.use(gl)
    // compile all mesh shaders
    // compile all mesh shaders
    for (let i = 0; i < this.meshShaders.length; i++) {
      const m = this.meshShaders[i]
      if (m.Name === 'Flat') {
        m.shader = new Shader(gl, vertFlatMeshShader, fragFlatMeshShader)
      } else {
        m.shader = new Shader(gl, vertMeshShader, m.Frag)
      }
      m.shader.use(gl)
      m.shader.isMatcap = m.Name === 'Matcap'
      if (m.shader.isMatcap) {
        gl.uniform1i(m.shader.uniforms.matCap, 5)
      }
    }
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
    const gl = this.gl
    gl.bindVertexArray(this.genericVAO)
    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.viewport(0, 0, hdr.dims[1], hdr.dims[2])
    gl.disable(gl.BLEND)
    const tempTex3D = this.rgbaTex(null, TEXTURE8_GRADIENT_TEMP, hdr.dims, true)
    const blurShader = this.opts.gradientOrder === 2 ? this.sobelBlurShader! : this.blurShader!
    blurShader.use(gl)
    gl.activeTexture(TEXTURE0_BACK_VOL)
    gl.bindTexture(gl.TEXTURE_3D, this.volumeTexture)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    const blurRadius = 0.7
    gl.uniform1i(blurShader.uniforms.intensityVol, 0)
    gl.uniform1f(blurShader.uniforms.dX, blurRadius / hdr.dims[1])
    gl.uniform1f(blurShader.uniforms.dY, blurRadius / hdr.dims[2])
    gl.uniform1f(blurShader.uniforms.dZ, blurRadius / hdr.dims[3])
    for (let i = 0; i < hdr.dims[3] - 1; i++) {
      const coordZ = (1 / hdr.dims[3]) * (i + 0.5)
      gl.uniform1f(blurShader.uniforms.coordZ, coordZ)
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tempTex3D, 0, i)
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        log.error('blur shader: ', status)
      }
      gl.clear(gl.DEPTH_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    const sobelShader = this.opts.gradientOrder === 2 ? this.sobelSecondOrderShader! : this.sobelFirstOrderShader!
    sobelShader.use(gl)
    gl.activeTexture(TEXTURE8_GRADIENT_TEMP)
    gl.bindTexture(gl.TEXTURE_3D, tempTex3D) // input texture
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.uniform1i(sobelShader.uniforms.intensityVol, 8) // TEXTURE8_GRADIENT_TEMP
    const sobelRadius = 0.7
    gl.uniform1f(sobelShader.uniforms.dX, sobelRadius / hdr.dims[1])
    gl.uniform1f(sobelShader.uniforms.dY, sobelRadius / hdr.dims[2])
    gl.uniform1f(sobelShader.uniforms.dZ, sobelRadius / hdr.dims[3])
    if (this.opts.gradientOrder === 2) {
      gl.uniform1f(sobelShader.uniforms.dX2, (2.0 * sobelRadius) / hdr.dims[1])
      gl.uniform1f(sobelShader.uniforms.dY2, (2.0 * sobelRadius) / hdr.dims[2])
      gl.uniform1f(sobelShader.uniforms.dZ2, (2.0 * sobelRadius) / hdr.dims[3])
    }
    gl.uniform1f(sobelShader.uniforms.coordZ, 0.5)
    if (this.gradientTexture !== null) {
      gl.deleteTexture(this.gradientTexture)
    }
    this.gradientTexture = this.rgbaTex(this.gradientTexture, TEXTURE6_GRADIENT, hdr.dims)
    for (let i = 0; i < hdr.dims[3] - 1; i++) {
      const coordZ = (1 / hdr.dims[3]) * (i + 0.5)
      gl.uniform1f(sobelShader.uniforms.coordZ, coordZ)
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.gradientTexture, 0, i)
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        log.error('sobel shader: ', status)
      }
      gl.clear(gl.DEPTH_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    gl.deleteFramebuffer(fb)
    gl.deleteTexture(tempTex3D)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.activeTexture(TEXTURE8_PAQD)
    gl.bindTexture(gl.TEXTURE_3D, this.paqdTexture) // input texture
    this.gl.bindVertexArray(this.unusedVAO)
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
    if (!this.gradientTexture || !this.back) {
      return null
    }

    const gl = this.gl
    const dims = this.back.dims!
    const width = dims[1]
    const height = dims[2]
    const depth = dims[3]
    const numVoxels = width * height * depth

    // Create framebuffer to read from 3D texture
    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)

    // Create output array
    const data = new Float32Array(numVoxels * 4) // RGBA components

    try {
      // Read each slice of the 3D texture
      for (let slice = 0; slice < depth; slice++) {
        // Attach the current slice to the framebuffer
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.gradientTexture, 0, slice)

        // Check framebuffer completeness
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
          console.warn(
            'Framebuffer not complete for gradient texture reading, slice',
            slice,
            'status:',
            status.toString(16)
          )
          continue
        }

        // Read as UINT8 data (more compatible) and convert to float
        try {
          const byteData = new Uint8Array(width * height * 4)
          gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, byteData)

          // Convert from uint8 (0-255) to float (-1.0 to 1.0) range
          const sliceData = new Float32Array(width * height * 4)
          for (let i = 0; i < byteData.length; i++) {
            sliceData[i] = byteData[i] / 127.5 - 1.0
          }

          // Copy slice data to output array
          const sliceOffset = slice * width * height * 4
          data.set(sliceData, sliceOffset)
        } catch (readError) {
          console.warn('Failed to read pixels for slice', slice, ':', readError)
          // Fill with zeros for this slice
          const sliceOffset = slice * width * height * 4
          const zeroSlice = new Float32Array(width * height * 4)
          data.set(zeroSlice, sliceOffset)
        }
      }
    } catch (error) {
      console.error('Error reading gradient texture:', error)
      return null
    } finally {
      // Cleanup
      gl.deleteFramebuffer(fb)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    return data
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
    const gl = this.gl

    if (data === null) {
      // Revert to auto-generated gradient
      this.useCustomGradientTexture = false
      if (this.back && this.gradientTextureAmount > 0.0) {
        this.gradientGL(this.back.hdr!)
      }
      return
    }

    if (!dims && !this.back) {
      console.warn('No dimensions provided and no background volume loaded')
      return
    }

    const texDims = dims || this.back!.dims!
    const width = texDims[1]
    const height = texDims[2]
    const depth = texDims[3]
    const expectedSize = width * height * depth * 4

    if (data.length !== expectedSize) {
      console.warn(`Custom gradient data size mismatch. Expected ${expectedSize}, got ${data.length}`)
      return
    }

    // Set flag to indicate we're using a custom gradient texture
    this.useCustomGradientTexture = true

    // Delete existing gradient texture
    if (this.gradientTexture !== null) {
      gl.deleteTexture(this.gradientTexture)
    }

    // Create new texture
    this.gradientTexture = gl.createTexture()
    gl.activeTexture(TEXTURE6_GRADIENT)
    gl.bindTexture(gl.TEXTURE_3D, this.gradientTexture)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

    // Convert float data to uint8 if needed and use RGBA8 format for better compatibility
    let textureData: Uint8Array
    if (data instanceof Float32Array) {
      // Convert float data (-1.0 to 1.0) to uint8 (0 to 255)
      textureData = new Uint8Array(data.length)
      for (let i = 0; i < data.length; i++) {
        // Clamp to -1.0 to 1.0, then map to 0-255
        const clampedValue = Math.max(-1.0, Math.min(1.0, data[i]))
        textureData[i] = Math.round((clampedValue + 1.0) * 127.5)
      }
    } else {
      // Data is already Uint8Array
      textureData = data
    }

    // Use RGBA8 format for better WebGL compatibility
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA8, width, height, depth)
    gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, 0, width, height, depth, gl.RGBA, gl.UNSIGNED_BYTE, textureData)

    // Redraw scene to apply changes
    this.drawScene()
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
  getDescriptives(options: {
    layer?: number
    masks?: number[]
    drawingIsMask?: boolean
    roiIsMask?: boolean
    startVox?: number[]
    endVox?: number[]
  }): Descriptive {
    const {
      layer = 0,
      masks = [],
      drawingIsMask = false,
      roiIsMask = false,
      startVox = [0, 0, 0],
      endVox = [0, 0, 0]
    } = options

    // Rest of the code remains the same
    let area = null // used if roiIsMask since ROI is in 2D slice
    const hdr = this.volumes[layer].hdr!
    const pixDimsRAS = this.volumes[layer].pixDimsRAS!
    let slope = hdr.scl_slope
    if (isNaN(slope)) {
      slope = 1
    }
    let inter = hdr.scl_inter
    if (isNaN(inter)) {
      inter = 1
    }
    const imgRaw = this.volumes[layer].img!
    const nv = imgRaw.length // number of voxels
    // create mask
    const img = new Float32Array(nv)
    for (let i = 0; i < nv; i++) {
      img[i] = imgRaw[i] * slope + inter
    } // assume all voxels survive
    const mask = new Uint8Array(nv)
    for (let i = 0; i < nv; i++) {
      mask[i] = 1
    } // assume all voxels survive
    if (masks.length > 0) {
      for (let m = 0; m < masks.length; m++) {
        const imgMask = this.volumes[masks[m]].img!
        if (imgMask.length !== nv) {
          log.debug('Mask resolution does not match image. Skipping masking layer ' + masks[m])
          continue
        }
        for (let i = 0; i < nv; i++) {
          if (imgMask[i] === 0 || isNaN(imgMask[i])) {
            mask[i] = 0
          }
        }
      }
    } else if (masks.length < 1 && drawingIsMask) {
      for (let i = 0; i < nv; i++) {
        if (this.drawBitmap![i] === 0 || isNaN(this.drawBitmap![i])) {
          mask[i] = 0
        }
      }
    } else if (masks.length < 1 && roiIsMask) {
      // fill mask with zeros
      mask.fill(0)

      // identify the constant dimension (the plane where the ellipse is drawn)
      let constantDim = -1
      if (startVox[0] === endVox[0]) {
        constantDim = 0 // x is constant
      } else if (startVox[1] === endVox[1]) {
        constantDim = 1 // y is constant
      } else if (startVox[2] === endVox[2]) {
        constantDim = 2 // z is constant
      } else {
        console.error('Error: No constant dimension found.')
        return
      }

      // get the varying dimensions
      const dims = [0, 1, 2]
      const varDims = dims.filter((dim) => dim !== constantDim)

      // compute the center of the ellipse in voxel coordinates
      const centerVox = []
      centerVox[constantDim] = startVox[constantDim]
      centerVox[varDims[0]] = (startVox[varDims[0]] + endVox[varDims[0]]) / 2
      centerVox[varDims[1]] = (startVox[varDims[1]] + endVox[varDims[1]]) / 2

      // compute the radii along each varying dimension
      const radiusX = Math.abs(endVox[varDims[0]] - startVox[varDims[0]]) / 2
      const radiusY = Math.abs(endVox[varDims[1]] - startVox[varDims[1]]) / 2

      // dimensions of the image
      const xdim = hdr.dims[1]
      const ydim = hdr.dims[2]
      // const zdim = hdr.dims[3]

      // define the ranges for the varying dimensions
      const minVarDim0 = Math.max(0, Math.floor(centerVox[varDims[0]] - radiusX))
      const maxVarDim0 = Math.min(hdr.dims[varDims[0] + 1] - 1, Math.ceil(centerVox[varDims[0]] + radiusX))

      const minVarDim1 = Math.max(0, Math.floor(centerVox[varDims[1]] - radiusY))
      const maxVarDim1 = Math.min(hdr.dims[varDims[1] + 1] - 1, Math.ceil(centerVox[varDims[1]] + radiusY))

      // the constant dimension value
      const constDimVal = centerVox[constantDim]
      if (constDimVal < 0 || constDimVal >= hdr.dims[constantDim + 1]) {
        console.error('Error: Constant dimension value is out of bounds.')
        return
      }

      // iterate over the varying dimensions and apply the elliptical mask
      for (let i = minVarDim0; i <= maxVarDim0; i++) {
        for (let j = minVarDim1; j <= maxVarDim1; j++) {
          // set the voxel coordinates
          const voxel = []
          voxel[constantDim] = constDimVal // Fixed dimension
          voxel[varDims[0]] = i
          voxel[varDims[1]] = j
          // calculate the normalized distances from the center
          const di = (voxel[varDims[0]] - centerVox[varDims[0]]) / radiusX
          const dj = (voxel[varDims[1]] - centerVox[varDims[1]]) / radiusY
          // calculate the squared distance in ellipse space
          const distSq = di * di + dj * dj
          // check if the voxel is within the ellipse
          if (distSq <= 1) {
            // calculate the index in the mask array
            const x = voxel[0]
            const y = voxel[1]
            const z = voxel[2]
            const index = z * xdim * ydim + y * xdim + x
            mask[index] = 1
          }
        }
      }
      // calculate the area based on the number of voxels in the mask
      // const voxelArea = pixDimsRAS[varDims[0] + 1] * pixDimsRAS[varDims[1] + 1] // adjusted for 1-indexing
      // const numMaskedVoxels = mask.reduce((count, value) => count + (value === 1 ? 1 : 0), 0)
      // area = numMaskedVoxels * voxelArea

      // perhaps better to calculate the area using the ellipse area formula
      const radiusX_mm = radiusX * pixDimsRAS[varDims[0] + 1]
      const radiusY_mm = radiusY * pixDimsRAS[varDims[1] + 1]
      const areaEllipse = Math.PI * radiusX_mm * radiusY_mm
      area = areaEllipse
      // for debugging: show mask -- loop over drawing and set drawing to 1 if mask is 1
      // this.setDrawingEnabled(true)
      // this.drawOpacity = 0.3
      // for (let i = 0; i < nv; i++) {
      //   if (mask[i] === 1) {
      //     this.drawBitmap![i] = 1
      //   } else {
      //     this.drawBitmap![i] = 0
      //   }
      // }
      // this.refreshDrawing(false)
      // this.setDrawingEnabled(false)
    }
    // Welfords method
    // https://www.embeddedrelated.com/showarticle/785.php
    // https://www.johndcook.com/blog/2008/09/26/comparing-three-methods-of-computing-standard-deviation/
    let k = 0
    let M = 0
    let S = 0
    let mx = Number.NEGATIVE_INFINITY
    let mn = Number.POSITIVE_INFINITY
    let kNot0 = 0
    let MNot0 = 0
    let SNot0 = 0

    for (let i = 0; i < nv; i++) {
      if (mask[i] < 1) {
        continue
      }
      const x = img[i]
      k++
      let Mnext = M + (x - M) / k
      S = S + (x - M) * (x - Mnext)
      M = Mnext
      if (x === 0) {
        continue
      }
      kNot0++
      Mnext = MNot0 + (x - MNot0) / kNot0
      SNot0 = SNot0 + (x - MNot0) * (x - Mnext)
      MNot0 = Mnext

      mn = Math.min(x, mn)
      mx = Math.max(x, mx)
    }
    const stdev = Math.sqrt(S / (k - 1))
    const stdevNot0 = Math.sqrt(SNot0 / (kNot0 - 1))
    const mnNot0 = mn
    const mxNot0 = mx
    if (k !== kNot0) {
      // some voxels are equal to zero
      mn = Math.min(0, mn)
      mx = Math.max(0, mx)
    }

    return {
      mean: M,
      stdev,
      nvox: k,
      volumeMM3: k * hdr.pixDims[1] * hdr.pixDims[2] * hdr.pixDims[3],
      // volume also in milliliters
      volumeML: k * hdr.pixDims[1] * hdr.pixDims[2] * hdr.pixDims[3] * 0.001,
      min: mn,
      max: mx,
      meanNot0: MNot0,
      stdevNot0,
      nvoxNot0: kNot0,
      minNot0: mnNot0,
      maxNot0: mxNot0,
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
    let img = overlayItem.img
    if (overlayItem.frame4D > 0 && overlayItem.frame4D < overlayItem.nFrame4D!) {
      img = overlayItem.img!.slice(
        overlayItem.frame4D * overlayItem.nVox3D!,
        (overlayItem.frame4D + 1) * overlayItem.nVox3D!
      )
    }
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
      this.volumeObject3D = toNiivueObject3D(overlayItem, this.VOLUME_ID, this.gl)
      mat4.invert(mtx, mtx)

      this.back.matRAS = overlayItem.matRAS
      this.back.dims = overlayItem.dimsRAS
      this.back.pixDims = overlayItem.pixDimsRAS

      const { volScale, vox } = this.sliceScale(true) // slice scale determined by this.back --> the base image layer

      this.volScale = volScale
      this.vox = vox
      this.volumeObject3D.scale = volScale

      const isAboveMax2D = hdr.dims[1] > this.uiData.max2D || hdr.dims[2] > this.uiData.max2D
      if (isAboveMax2D) {
        log.error(`Image dimensions exceed maximum texture size of hardware.`)
      }
      const isAboveMax3D =
        hdr.dims[1] > this.uiData.max3D || hdr.dims[2] > this.uiData.max3D || hdr.dims[3] > this.uiData.max3D
      if (isAboveMax3D && hdr.datatypeCode === NiiDataType.DT_RGBA32 && hdr.dims[3] < 2) {
        log.info(`Large RGBA image (>${this.uiData.max3D}) requires Texture2D`)
        // high res 2D image
        this.opts.is2DSliceShader = true
        outTexture = this.rgbaTex2D(this.volumeTexture, TEXTURE0_BACK_VOL, overlayItem.dimsRAS!, img as Uint8Array)
        return
      }
      if (isAboveMax3D) {
        log.info(
          `Large scalar image (>${this.uiData.max3D}) requires Texture2D (${hdr.dims[1]}×${hdr.dims[2]}×${hdr.dims[3]})`
        )
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
        outTexture = this.rgbaTex2D(
          this.volumeTexture,
          TEXTURE0_BACK_VOL,
          overlayItem.dimsRAS!,
          img2D as Uint8Array,
          false
        )
        return
      }
      if (isAboveMax3D) {
        log.warn(`dimensions exceed 3D limits ${hdr.dims}`)
      }
      this.opts.is2DSliceShader = false
      outTexture = this.rgbaTex(this.volumeTexture, TEXTURE0_BACK_VOL, overlayItem.dimsRAS!) // this.back.dims)

      if (!this.renderShader) {
        throw new Error('renderShader undefined')
      }

      this.renderShader.use(this.gl)
      this.gl.uniform3fv(this.renderShader.uniforms.texVox, vox)
      this.gl.uniform3fv(this.renderShader.uniforms.volScale, volScale)
      // add shader to object
      const pickingShader = this.pickingImageShader!
      pickingShader.use(this.gl)
      this.gl.uniform1i(pickingShader.uniforms.volume, 0)
      this.gl.uniform1i(pickingShader.uniforms.colormap, 1)
      this.gl.uniform1i(pickingShader.uniforms.overlay, 2)
      this.gl.uniform3fv(pickingShader.uniforms.volScale, volScale)
      log.debug(this.volumeObject3D)
    } else {
      if (this.back?.dims === undefined) {
        log.error('Fatal error: Unable to render overlay: background dimensions not defined!')
      }
      const f000 = this.mm2frac(overlayItem.mm000!, 0, true) // origin in output space
      let f100 = this.mm2frac(overlayItem.mm100!, 0, true)
      let f010 = this.mm2frac(overlayItem.mm010!, 0, true)
      let f001 = this.mm2frac(overlayItem.mm001!, 0, true)
      f100 = vec3.subtract(f100, f100, f000) // direction of i dimension from origin
      f010 = vec3.subtract(f010, f010, f000) // direction of j dimension from origin
      f001 = vec3.subtract(f001, f001, f000) // direction of k dimension from origin
      mtx = mat4.fromValues(
        f100[0],
        f010[0],
        f001[0],
        f000[0],

        f100[1],
        f010[1],
        f001[1],
        f000[1],

        f100[2],
        f010[2],
        f001[2],
        f000[2],
        0,
        0,
        0,
        1
      )
      mat4.invert(mtx, mtx)
      if (layer === 1) {
        outTexture = this.rgbaTex(this.overlayTexture, TEXTURE2_OVERLAY_VOL, this.back!.dims!)
        this.overlayTexture = outTexture
        this.overlayTextureID = outTexture
      } else {
        outTexture = this.overlayTextureID
      }
    }
    const fb = this.gl.createFramebuffer()
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb)
    this.gl.disable(this.gl.CULL_FACE)
    this.gl.viewport(0, 0, this.back.dims![1], this.back.dims![2]) // output in background dimensions
    this.gl.disable(this.gl.BLEND)
    const tempTex3D = this.gl.createTexture()
    this.gl.activeTexture(TEXTURE9_ORIENT) // Temporary 3D Texture TEXTURE9_ORIENT
    this.gl.bindTexture(this.gl.TEXTURE_3D, tempTex3D)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1)
    // https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html
    // https://www.khronos.org/registry/OpenGL-Refpages/es3.0/html/glTexStorage3D.xhtml
    let orientShader = this.orientShaderU!
    if (!hdr) {
      throw new Error('hdr undefined')
    }
    if (!img) {
      throw new Error('img undefined')
    }
    if (hdr.datatypeCode === NiiDataType.DT_UINT8) {
      // raw input data
      if (hdr.intent_code === NiiIntentCode.NIFTI_INTENT_LABEL) {
        orientShader = this.orientShaderAtlasU!
      }
      this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
      this.gl.texSubImage3D(
        this.gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        hdr.dims[1],
        hdr.dims[2],
        hdr.dims[3],
        this.gl.RED_INTEGER,
        this.gl.UNSIGNED_BYTE,
        img
      )
    } else if (hdr.datatypeCode === NiiDataType.DT_INT16) {
      orientShader = this.orientShaderI!
      if (hdr.intent_code === NiiIntentCode.NIFTI_INTENT_LABEL) {
        orientShader = this.orientShaderAtlasI!
      }
      this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R16I, hdr.dims[1], hdr.dims[2], hdr.dims[3])
      this.gl.texSubImage3D(
        this.gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        hdr.dims[1],
        hdr.dims[2],
        hdr.dims[3],
        this.gl.RED_INTEGER,
        this.gl.SHORT,
        img
      )
    } else if (hdr.datatypeCode === NiiDataType.DT_FLOAT32) {
      this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R32F, hdr.dims[1], hdr.dims[2], hdr.dims[3])
      this.gl.texSubImage3D(
        this.gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        hdr.dims[1],
        hdr.dims[2],
        hdr.dims[3],
        this.gl.RED,
        this.gl.FLOAT,
        img
      )
      orientShader = this.orientShaderF!
    } else if (hdr.datatypeCode === NiiDataType.DT_FLOAT64) {
      let img32f = new Float32Array()
      img32f = Float32Array.from(img)
      this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R32F, hdr.dims[1], hdr.dims[2], hdr.dims[3])
      this.gl.texSubImage3D(
        this.gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        hdr.dims[1],
        hdr.dims[2],
        hdr.dims[3],
        this.gl.RED,
        this.gl.FLOAT,
        img32f
      )
      orientShader = this.orientShaderF!
    } else if (hdr.datatypeCode === NiiDataType.DT_RGB24) {
      orientShader = this.orientShaderRGBU!
      orientShader.use(this.gl)
      // TODO was false instead of 0
      this.gl.uniform1i(orientShader.uniforms.hasAlpha, 0)
      this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.RGB8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
      this.gl.texSubImage3D(
        this.gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        hdr.dims[1],
        hdr.dims[2],
        hdr.dims[3],
        this.gl.RGB_INTEGER,
        this.gl.UNSIGNED_BYTE,
        img
      )
    } else if (hdr.datatypeCode === NiiDataType.DT_UINT16) {
      if (hdr.intent_code === NiiIntentCode.NIFTI_INTENT_LABEL) {
        orientShader = this.orientShaderAtlasU!
      }
      this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.R16UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
      this.gl.texSubImage3D(
        this.gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        hdr.dims[1],
        hdr.dims[2],
        hdr.dims[3],
        this.gl.RED_INTEGER,
        this.gl.UNSIGNED_SHORT,
        img
      )
    } else if (hdr.datatypeCode === NiiDataType.DT_RGBA32) {
      orientShader = this.orientShaderRGBU!
      if (overlayItem.colormapLabel) {
        orientShader = this.orientShaderPAQD!
        let firstPAQD = true
        for (let l = 0; l < layer; l++) {
          const isRGBA = this.volumes[l].hdr.datatypeCode === NiiDataType.DT_RGBA32
          const isLabel = !!this.volumes[l].colormapLabel
          if (isRGBA && isLabel) {
            firstPAQD = false
          }
        }
        if (firstPAQD) {
          this.paqdTexture = this.rgbaTex(this.paqdTexture, TEXTURE8_PAQD, this.back!.dims!)
        } else {
          // n.b. do-able, but requires blend buffer copies
          log.warn(`Current version only one probabilistic atlas (PAQD) at a time`)
        }
        outTexture = this.paqdTexture
        this.gl.activeTexture(TEXTURE9_ORIENT) // Temporary 3D Texture TEXTURE9_ORIENT
      }
      orientShader.use(this.gl)
      this.gl.uniform1i(orientShader.uniforms.hasAlpha, 1)
      this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.RGBA8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3])
      this.gl.texSubImage3D(
        this.gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        hdr.dims[1],
        hdr.dims[2],
        hdr.dims[3],
        this.gl.RGBA_INTEGER,
        this.gl.UNSIGNED_BYTE,
        img
      )
    }
    if (overlayItem.global_min === undefined) {
      // only once, first time volume is loaded
      // this.calMinMax(overlayItem, imgRaw);
      overlayItem.calMinMax()
    }
    // blend texture
    let blendTexture = null
    this.gl.bindVertexArray(this.genericVAO)

    const isUseCopyTexSubImage3D = false
    if (isUseCopyTexSubImage3D) {
      if (layer > 1) {
        // we can not simultaneously read and write to the same texture.
        // therefore, we must clone the overlay texture when we wish to add another layer
        // copy previous overlay texture to blend texture
        blendTexture = this.rgbaTex(blendTexture, TEXTURE10_BLEND, this.back.dims!, true)
        this.gl.bindTexture(this.gl.TEXTURE_3D, blendTexture)
        for (let i = 0; i < this.back.dims![3]; i++) {
          // n.b. copyTexSubImage3D is a screenshot function: it copies FROM the framebuffer to the TEXTURE (usually we write to a framebuffer)
          this.gl.framebufferTextureLayer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.overlayTexture, 0, i) // read from existing overlay texture 2
          this.gl.activeTexture(TEXTURE10_BLEND) // write to blend texture 5
          this.gl.copyTexSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, i, 0, 0, this.back.dims![1], this.back.dims![2])
        }
      } else {
        blendTexture = this.rgbaTex(blendTexture, TEXTURE10_BLEND, [2, 2, 2, 2], true)
      }
    } else {
      if (layer > 1) {
        if (!this.back.dims) {
          throw new Error('back.dims undefined')
        }
        // use pass-through shader to copy previous color to temporary 2D texture
        blendTexture = this.rgbaTex(blendTexture, TEXTURE10_BLEND, this.back.dims)
        this.gl.bindTexture(this.gl.TEXTURE_3D, blendTexture)
        const passShader = this.passThroughShader!
        passShader.use(this.gl)
        this.gl.uniform1i(passShader.uniforms.in3D, 2) // overlay volume
        for (let i = 0; i < this.back.dims[3]; i++) {
          // output slices
          const coordZ = (1 / this.back.dims[3]) * (i + 0.5)
          this.gl.uniform1f(passShader.uniforms.coordZ, coordZ)
          this.gl.framebufferTextureLayer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, blendTexture, 0, i)
          // this.gl.clear(this.gl.DEPTH_BUFFER_BIT); //exhaustive, so not required
          this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        }
      } else {
        blendTexture = this.rgbaTex(blendTexture, TEXTURE10_BLEND, [2, 2, 2, 2])
      }
    }
    orientShader!.use(this.gl)
    this.gl.activeTexture(TEXTURE1_COLORMAPS)
    // for label maps, we create an indexed colormap that is not limited to a gradient of 256 colors
    let colormapLabelTexture = null
    if (overlayItem.colormapLabel !== null && overlayItem.colormapLabel.lut.length > 7) {
      const nLabel = overlayItem.colormapLabel.max! - overlayItem.colormapLabel.min! + 1
      colormapLabelTexture = this.createColormapTexture(colormapLabelTexture, 1, nLabel)
      this.gl.texSubImage2D(
        this.gl.TEXTURE_2D,
        0,
        0,
        0,
        nLabel,
        1,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        overlayItem.colormapLabel.lut
      )
      this.gl.uniform1f(orientShader.uniforms.cal_min, overlayItem.colormapLabel.min! - 0.5)
      this.gl.uniform1f(orientShader.uniforms.cal_max, overlayItem.colormapLabel.max! + 0.5)
      // this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
      this.gl.bindTexture(this.gl.TEXTURE_2D, colormapLabelTexture)
    } else {
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture)
      this.gl.uniform1f(orientShader.uniforms.cal_min, overlayItem.cal_min!)
      this.gl.uniform1f(orientShader.uniforms.cal_max, overlayItem.cal_max!)
    }
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
    const isColorbarFromZero = overlayItem.colormapType !== COLORMAP_TYPE.MIN_TO_MAX ? 1 : 0
    const isAlphaThreshold = overlayItem.colormapType === COLORMAP_TYPE.ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN ? 1 : 0
    this.gl.uniform1i(orientShader.uniforms.isAlphaThreshold, isAlphaThreshold)
    this.gl.uniform1i(orientShader.uniforms.isColorbarFromZero, isColorbarFromZero)
    this.gl.uniform1i(orientShader.uniforms.isAdditiveBlend, this.opts.isAdditiveBlend ? 1 : 0)
    // if unused colormapNegative https://github.com/niivue/niivue/issues/490
    let mnNeg = Number.POSITIVE_INFINITY
    let mxNeg = Number.NEGATIVE_INFINITY
    if (overlayItem.colormapNegative.length > 0) {
      // assume symmetrical
      mnNeg = Math.min(-overlayItem.cal_min!, -overlayItem.cal_max!)
      mxNeg = Math.max(-overlayItem.cal_min!, -overlayItem.cal_max!)
      if (isFinite(overlayItem.cal_minNeg) && isFinite(overlayItem.cal_maxNeg)) {
        // explicit range for negative colormap: allows asymmetric maps
        mnNeg = Math.min(overlayItem.cal_minNeg, overlayItem.cal_maxNeg)
        mxNeg = Math.max(overlayItem.cal_minNeg, overlayItem.cal_maxNeg)
      }
    }
    // issue 1139
    if (layer > 0 && this.overlayOutlineWidth > 0.0) {
      const A = overlayItem.cal_min
      const B = overlayItem.cal_max
      let isZeroCrossing = Math.min(A, B) <= 0 && Math.max(A, B) >= 0
      if (!isZeroCrossing && mnNeg < mxNeg) {
        isZeroCrossing = mnNeg <= 0 && mxNeg >= 0
      }
      if (isZeroCrossing) {
        log.error('issue1139: do not use overlayOutlineWidth when thresholds cross or touch zero')
      }
    }
    if (!orientShader) {
      throw new Error('orientShader undefined')
    }
    this.gl.uniform1f(orientShader.uniforms.layer ?? null, layer)
    this.gl.uniform1f(orientShader.uniforms.cal_minNeg ?? null, mnNeg)
    this.gl.uniform1f(orientShader.uniforms.cal_maxNeg ?? null, mxNeg)
    this.gl.bindTexture(this.gl.TEXTURE_3D, tempTex3D)
    this.gl.uniform1i(orientShader.uniforms.intensityVol ?? null, 9) // TEXTURE9_ORIENT
    this.gl.uniform1i(orientShader.uniforms.blend3D ?? null, 10) // TEXTURE10_BLEND
    this.gl.uniform1i(orientShader.uniforms.colormap ?? null, 1)
    // this.gl.uniform1f(orientShader.uniforms["numLayers"], numLayers);
    this.gl.uniform1f(orientShader.uniforms.scl_inter ?? null, hdr.scl_inter)
    this.gl.uniform1f(orientShader.uniforms.scl_slope ?? null, hdr.scl_slope)
    this.gl.uniform1f(orientShader.uniforms.opacity ?? null, opacity)
    this.gl.uniform1i(orientShader.uniforms.modulationVol ?? null, 7)
    let modulateTexture = null
    if (
      overlayItem.modulationImage !== null &&
      overlayItem.modulationImage >= 0 &&
      overlayItem.modulationImage < this.volumes.length
    ) {
      log.debug('modulating', this.volumes)
      const mhdr = this.volumes[overlayItem.modulationImage].hdr!
      if (mhdr.dims[1] === hdr.dims[1] && mhdr.dims[2] === hdr.dims[2] && mhdr.dims[3] === hdr.dims[3]) {
        if (overlayItem.modulateAlpha) {
          this.gl.uniform1i(orientShader.uniforms.modulation, 2)
          this.gl.uniform1f(orientShader.uniforms.opacity, 1.0)
        } else {
          this.gl.uniform1i(orientShader.uniforms.modulation, 1)
        }
        // r8Tex(texID, activeID, dims, isInit = false)
        modulateTexture = this.r8Tex(modulateTexture, this.gl.TEXTURE7, hdr.dims, true)
        this.gl.activeTexture(this.gl.TEXTURE7)
        this.gl.bindTexture(this.gl.TEXTURE_3D, modulateTexture)
        const vx = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
        const modulateVolume = new Uint8Array(vx)
        const mn = this.volumes[overlayItem.modulationImage].cal_min!
        const scale = 1.0 / (this.volumes[overlayItem.modulationImage].cal_max! - mn)
        const imgRaw = this.volumes[overlayItem.modulationImage].img!.buffer
        let img: Uint8Array | Int16Array | Float32Array | Float64Array | Uint8Array | Uint16Array = new Uint8Array(
          imgRaw
        )
        switch (mhdr.datatypeCode) {
          case NiiDataType.DT_INT16:
            img = new Int16Array(imgRaw)
            break
          case NiiDataType.DT_FLOAT32:
            img = new Float32Array(imgRaw)
            break
          case NiiDataType.DT_FLOAT64:
            img = new Float64Array(imgRaw)
            break
          case NiiDataType.DT_RGB24:
            img = new Uint8Array(imgRaw)
            break
          case NiiDataType.DT_UINT16:
            img = new Uint16Array(imgRaw)
            break
        }
        log.debug(this.volumes[overlayItem.modulationImage])
        const isColormapNegative = this.volumes[overlayItem.modulationImage].colormapNegative.length > 0
        // negative thresholds might be asymmetric from positive ones
        let mnNeg = this.volumes[overlayItem.modulationImage].cal_min
        let mxNeg = this.volumes[overlayItem.modulationImage].cal_max
        if (
          isFinite(this.volumes[overlayItem.modulationImage].cal_minNeg) &&
          isFinite(this.volumes[overlayItem.modulationImage].cal_maxNeg)
        ) {
          // explicit range for negative colormap: allows asymmetric maps
          mnNeg = this.volumes[overlayItem.modulationImage].cal_minNeg
          mxNeg = this.volumes[overlayItem.modulationImage].cal_minNeg
        }
        mnNeg = Math.abs(mnNeg!)
        mxNeg = Math.abs(mxNeg!)
        if (mnNeg > mxNeg) {
          ;[mnNeg, mxNeg] = [mxNeg, mnNeg]
        }
        const scaleNeg = 1.0 / (mxNeg - mnNeg)
        let mpow = Math.abs(overlayItem.modulateAlpha) // can convert bool, too
        mpow = Math.max(mpow, 1.0)
        // volOffset selects the correct frame
        const volOffset = this.volumes[overlayItem.modulationImage].frame4D * vx
        for (let i = 0; i < vx; i++) {
          const vRaw = img[i + volOffset] * mhdr.scl_slope + mhdr.scl_inter
          let v = (vRaw - mn) * scale
          if (isColormapNegative && vRaw < 0.0) {
            v = (Math.abs(vRaw) - mnNeg) * scaleNeg
          }
          v = Math.min(Math.max(v, 0.0), 1.0)
          v = Math.pow(v, mpow) * 255.0
          modulateVolume[i] = v
        }
        this.gl.texSubImage3D(
          this.gl.TEXTURE_3D,
          0,
          0,
          0,
          0,
          hdr.dims[1],
          hdr.dims[2],
          hdr.dims[3],
          this.gl.RED,
          this.gl.UNSIGNED_BYTE,
          modulateVolume
        )
      } else {
        log.debug('Modulation image dimensions do not match target')
      }
    } else {
      this.gl.uniform1i(orientShader.uniforms.modulation, 0)
    }
    this.gl.uniformMatrix4fv(orientShader.uniforms.mtx, false, mtx)
    if (!this.back.dims) {
      throw new Error('back.dims undefined')
    }
    let outline = 0
    if (hdr.intent_code === NiiIntentCode.NIFTI_INTENT_LABEL) {
      outline = this.opts.atlasOutline
      this.gl.uniform1ui(orientShader.uniforms.activeIndex, this.opts.atlasActiveIndex | 0)
    }
    this.gl.uniform4fv(orientShader.uniforms.xyzaFrac, [
      1.0 / this.back.dims[1],
      1.0 / this.back.dims[2],
      1.0 / this.back.dims[3],
      outline
    ])
    log.debug('back dims: ', this.back.dims)
    for (let i = 0; i < this.back.dims[3]; i++) {
      // output slices
      const coordZ = (1 / this.back.dims[3]) * (i + 0.5)
      this.gl.uniform1f(orientShader.uniforms.coordZ, coordZ)
      this.gl.framebufferTextureLayer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, outTexture, 0, i)
      // this.gl.clear(this.gl.DEPTH_BUFFER_BIT); //exhaustive, so not required
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    }
    this.gl.bindVertexArray(this.unusedVAO)
    this.gl.deleteTexture(tempTex3D)
    this.gl.deleteTexture(modulateTexture)
    this.gl.deleteTexture(blendTexture)
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)

    this.gl.deleteFramebuffer(fb)

    if (layer === 0) {
      this.volumeTexture = outTexture
      if (this.gradientTextureAmount > 0.0 && !this.useCustomGradientTexture) {
        this.gradientGL(hdr)
        this.gl.bindVertexArray(this.genericVAO)
      } else if (this.gradientTextureAmount <= 0.0) {
        if (this.gradientTexture !== null) {
          this.gl.deleteTexture(this.gradientTexture)
        }
        this.gradientTexture = null
      }
    }
    // set slice scale for render shader
    if (!this.renderShader) {
      throw new Error('renderShader undefined')
    }
    this.renderShader.use(this.gl)
    const slicescl = this.sliceScale(true) // slice scale determined by this.back --> the base image layer
    const vox = slicescl.vox
    const volScale = slicescl.volScale
    this.gl.uniform1f(this.renderShader.uniforms.overlays, this.overlays.length)
    this.gl.uniform4fv(this.renderShader.uniforms.clipPlaneColor, this.opts.clipPlaneColor)
    this.gl.uniform1f(this.renderShader.uniforms.clipThick, this.opts.clipThick)
    this.gl.uniform3fv(this.renderShader!.uniforms.clipLo!, this.opts.clipVolumeLow)
    this.gl.uniform3fv(this.renderShader!.uniforms.clipHi!, this.opts.clipVolumeHigh)
    this.gl.uniform1f(this.renderShader.uniforms.backOpacity, this.volumes[0].opacity)
    this.gl.uniform1f(this.renderShader.uniforms.renderOverlayBlend, this.opts.renderOverlayBlend)

    this.gl.uniform4fv(this.renderShader.uniforms.clipPlane, this.scene.clipPlane)
    this.gl.uniform3fv(this.renderShader.uniforms.texVox, vox)
    this.gl.uniform3fv(this.renderShader.uniforms.volScale, volScale)

    if (!this.pickingImageShader) {
      throw new Error('pickingImageShader undefined')
    }
    this.pickingImageShader.use(this.gl)
    this.gl.uniform1f(this.pickingImageShader.uniforms.overlays, this.overlays.length)
    this.gl.uniform3fv(this.pickingImageShader.uniforms.texVox, vox)
    this.gl.uniform3fv(this.pickingImageShader!.uniforms.clipLo!, this.opts.clipVolumeLow)
    this.gl.uniform3fv(this.pickingImageShader!.uniforms.clipHi!, this.opts.clipVolumeHigh)
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
      throw new Error('slice shader undefined')
    }

    shader.use(this.gl)

    this.gl.uniform1f(shader.uniforms.overlays, this.overlays.length)
    this.gl.uniform1f(shader.uniforms.drawOpacity, this.drawOpacity)
    if (colormapLabelTexture !== null) {
      this.gl.deleteTexture(colormapLabelTexture)
      this.gl.activeTexture(TEXTURE1_COLORMAPS)
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture)
    }
    this.gl.uniform1i(shader.uniforms.drawing, 7)
    this.gl.activeTexture(TEXTURE7_DRAW)
    if (this.opts.is2DSliceShader) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.drawTexture)
    } else {
      this.gl.bindTexture(this.gl.TEXTURE_3D, this.drawTexture)
    }
    this.gl.uniform4fv(shader.uniforms.paqdUniforms, this.opts.paqdUniforms)
    this.gl.uniform1i(shader.uniforms.paqd, 8)
    this.gl.activeTexture(TEXTURE8_PAQD)
    this.gl.bindTexture(this.gl.TEXTURE_3D, this.paqdTexture)
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
    return C * DIM[0] * DIM[1] + B * DIM[0] + A
  } // idx()

  /**
   * Checks if voxels below the given voxel have labels matching its value, returning the first matching label or 0.
   * @internal
   */
  check_previous_slice(
    bw: Uint32Array,
    il: Uint32Array,
    r: number,
    c: number,
    sl: number,
    dim: Uint32Array,
    conn: number,
    tt: Uint32Array
  ): number {
    // const nabo: number[] = [];
    const nabo = new Uint32Array(27)
    let nr_set = 0
    if (!sl) {
      return 0
    }
    const val = bw[this.idx(r, c, sl, dim)]
    if (conn >= 6) {
      const idx = this.idx(r, c, sl - 1, dim)
      if (val === bw[idx]) {
        nabo[nr_set++] = il[idx]
      }
    }
    if (conn >= 18) {
      if (r) {
        const idx = this.idx(r - 1, c, sl - 1, dim)
        if (val === bw[idx]) {
          nabo[nr_set++] = il[idx]
        }
      }
      if (c) {
        const idx = this.idx(r, c - 1, sl - 1, dim)
        if (val === bw[idx]) {
          nabo[nr_set++] = il[idx]
        }
      }
      if (r < dim[0] - 1) {
        const idx = this.idx(r + 1, c, sl - 1, dim)
        if (val === bw[idx]) {
          nabo[nr_set++] = il[idx]
        }
      }
      if (c < dim[1] - 1) {
        const idx = this.idx(r, c + 1, sl - 1, dim)
        if (val === bw[idx]) {
          nabo[nr_set++] = il[idx]
        }
      }
    }
    if (conn === 26) {
      if (r && c) {
        const idx = this.idx(r - 1, c - 1, sl - 1, dim)
        if (val === bw[idx]) {
          nabo[nr_set++] = il[idx]
        }
      }
      if (r < dim[0] - 1 && c) {
        const idx = this.idx(r + 1, c - 1, sl - 1, dim)
        if (val === bw[idx]) {
          nabo[nr_set++] = il[idx]
        }
      }
      if (r && c < dim[1] - 1) {
        const idx = this.idx(r - 1, c + 1, sl - 1, dim)
        if (val === bw[idx]) {
          nabo[nr_set++] = il[idx]
        }
      }
      if (r < dim[0] - 1 && c < dim[1] - 1) {
        const idx = this.idx(r + 1, c + 1, sl - 1, dim)
        if (val === bw[idx]) {
          nabo[nr_set++] = il[idx]
        }
      }
    }
    if (nr_set) {
      this.fill_tratab(tt, nabo, nr_set)
      return nabo[0]
    } else {
      return 0
    }
  } // check_previous_slice()

  /**
   * Performs provisional labeling of connected voxels in a volume using specified connectivity.
   * @internal
   */
  do_initial_labelling(bw: Uint32Array, dim: Uint32Array, conn: number): [number, Uint32Array, Uint32Array] {
    let label = 1
    const kGrowArrayBy = 8192
    let ttn = kGrowArrayBy
    let tt = new Uint32Array(ttn).fill(0)
    const il = new Uint32Array(dim[0] * dim[1] * dim[2]).fill(0)
    const nabo = new Uint32Array(27)
    for (let sl = 0; sl < dim[2]; sl++) {
      for (let c = 0; c < dim[1]; c++) {
        for (let r = 0; r < dim[0]; r++) {
          let nr_set = 0
          const val = bw[this.idx(r, c, sl, dim)]
          if (val === 0) {
            continue
          }
          nabo[0] = this.check_previous_slice(bw, il, r, c, sl, dim, conn, tt)
          if (nabo[0]) {
            nr_set += 1
          }
          if (conn >= 6) {
            if (r) {
              const idx = this.idx(r - 1, c, sl, dim)
              if (val === bw[idx]) {
                nabo[nr_set++] = il[idx]
              }
            }
            if (c) {
              const idx = this.idx(r, c - 1, sl, dim)
              if (val === bw[idx]) {
                nabo[nr_set++] = il[idx]
              }
            }
          }
          if (conn >= 18) {
            if (c && r) {
              const idx = this.idx(r - 1, c - 1, sl, dim)
              if (val === bw[idx]) {
                nabo[nr_set++] = il[idx]
              }
            }
            if (c && r < dim[0] - 1) {
              const idx = this.idx(r + 1, c - 1, sl, dim)
              if (val === bw[idx]) {
                nabo[nr_set++] = il[idx]
              }
            }
          }
          if (nr_set) {
            il[this.idx(r, c, sl, dim)] = nabo[0]
            this.fill_tratab(tt, nabo, nr_set)
          } else {
            il[this.idx(r, c, sl, dim)] = label
            if (label >= ttn) {
              ttn += kGrowArrayBy
              const ext = new Uint32Array(ttn)
              ext.set(tt)
              tt = ext
            }
            tt[label - 1] = label
            label++
          }
        }
      }
    }
    for (let i = 0; i < label - 1; i++) {
      let j = i
      while (tt[j] !== j + 1) {
        j = tt[j] - 1
      }
      tt[i] = j + 1
    }
    return [label - 1, tt, il]
  } // do_initial_labelling()

  /**
   * Merges multiple provisional labels into a unified class using a translation table.
   * @internal
   */
  fill_tratab(tt: Uint32Array, nabo: Uint32Array, nr_set: number): void {
    let cntr = 0
    const tn = new Uint32Array(nr_set + 5).fill(0)
    const INT_MAX = 2147483647
    let ltn = INT_MAX
    for (let i = 0; i < nr_set; i++) {
      let j = nabo[i]
      cntr = 0
      while (tt[j - 1] !== j) {
        j = tt[j - 1]
        cntr++
        if (cntr > 100) {
          log.info('\nOoh no!!')
          break
        }
      }
      tn[i] = j
      ltn = Math.min(ltn, j)
    }
    for (let i = 0; i < nr_set; i++) {
      tt[tn[i] - 1] = ltn
    }
  } // fill_tratab()

  /**
   * Removes gaps in label indices to produce a dense labeling.
   * @internal
   */
  translate_labels(il: Uint32Array, dim: Uint32Array, tt: Uint32Array, ttn: number): [number, Uint32Array] {
    const nvox = dim[0] * dim[1] * dim[2]
    let ml = 0
    const l = new Uint32Array(nvox).fill(0)
    for (let i = 0; i < ttn; i++) {
      ml = Math.max(ml, tt[i])
    }
    const fl = new Uint32Array(ml).fill(0)
    let cl = 0
    for (let i = 0; i < nvox; i++) {
      if (il[i]) {
        if (!fl[tt[il[i] - 1] - 1]) {
          cl += 1
          fl[tt[il[i] - 1] - 1] = cl
        }
        l[i] = fl[tt[il[i] - 1] - 1]
      }
    }
    return [cl, l]
  } // translate_labels()

  /**
   * Retains only the largest cluster for each region in a labeled volume.
   * @internal
   */
  largest_original_cluster_labels(bw: Uint32Array, cl: number, ls: Uint32Array): [number, Uint32Array] {
    const nvox = bw.length
    const ls2bw = new Uint32Array(cl + 1).fill(0)
    const sumls = new Uint32Array(cl + 1).fill(0)
    for (let i = 0; i < nvox; i++) {
      const bwVal = bw[i]
      const lsVal = ls[i]
      ls2bw[lsVal] = bwVal
      sumls[lsVal]++
    }
    let mxbw = 0
    for (let i = 0; i < cl + 1; i++) {
      const bwVal = ls2bw[i]
      mxbw = Math.max(mxbw, bwVal)
      // see if this is largest cluster of this bw-value
      for (let j = 0; j < cl + 1; j++) {
        if (j === i) {
          continue
        }
        if (bwVal !== ls2bw[j]) {
          continue
        }
        if (sumls[i] < sumls[j]) {
          ls2bw[i] = 0
        } else if (sumls[i] === sumls[j] && i < j) {
          ls2bw[i] = 0
        } // ties: arbitrary winner
      }
    }
    const vxs = new Uint32Array(nvox).fill(0)
    for (let i = 0; i < nvox; i++) {
      vxs[i] = ls2bw[ls[i]]
    }
    return [mxbw, vxs]
  }

  /**
   * Computes connected components labeling on a 3D image.
   * @internal
   */
  bwlabel(
    img: Uint32Array,
    dim: Uint32Array,
    conn: number = 26,
    binarize: boolean = false,
    onlyLargestClusterPerClass: boolean = false
  ): [number, Uint32Array] {
    const start = Date.now()
    const nvox = dim[0] * dim[1] * dim[2]
    const bw = new Uint32Array(nvox).fill(0)
    if (![6, 18, 26].includes(conn)) {
      log.info('bwlabel: conn must be 6, 18 or 26.')
      return [0, bw]
    }
    if (dim[0] < 2 || dim[1] < 2 || dim[2] < 1) {
      log.info('bwlabel: img must be 2 or 3-dimensional')
      return [0, bw]
    }
    if (binarize) {
      for (let i = 0; i < nvox; i++) {
        if (img[i] !== 0.0) {
          bw[i] = 1
        }
      }
    } else {
      bw.set(img)
    }
    let [ttn, tt, il] = this.do_initial_labelling(bw, dim, conn)
    if (tt === undefined) {
      tt = new Uint32Array()
    }
    const [cl, ls] = this.translate_labels(il, dim, tt, ttn)
    log.info(conn + ' neighbor clustering into ' + cl + ' regions in ' + (Date.now() - start) + 'ms')
    if (onlyLargestClusterPerClass) {
      const [nbw, bwMx] = this.largest_original_cluster_labels(bw, cl, ls)
      return [nbw, bwMx]
    }
    return [cl, ls]
  } // bwlabel()

  /**
   * Create a connected component label map from a volume
   * @param id - ID of the input volume
   * @param conn - connectivity for clustering (6 = faces, 18 = faces + edges, 26 = faces + edges + corners)
   * @param binarize - whether to binarize the volume before labeling
   * @param onlyLargestClusterPerClass - retain only the largest cluster for each label
   * @returns a new NVImage with labeled clusters, using random colormap
   * @see {@link https://niivue.com/demos/features/clusterize.html | live demo usage}
   */
  async createConnectedLabelImage(
    id: string,
    conn: number = 26,
    binarize: boolean = false,
    onlyLargestClusterPerClass: boolean = false
  ): Promise<NVImage> {
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

  // Crop the intensity ranges to specific min and max values.

  /**
   * Scales and crops a Float32 image to Uint8 range.
   * @internal
   */
  async scalecropUint8(
    img32: Float32Array,
    dst_min: number = 0,
    dst_max: number = 255,
    src_min: number,
    scale: number
  ): Promise<Uint8Array> {
    const voxnum = img32.length
    const img8 = new Uint8Array(voxnum)
    for (let i = 0; i < voxnum; i++) {
      let val = img32![i]
      val = dst_min + scale * (val - src_min)
      val = Math.max(val, dst_min)
      val = Math.min(val, dst_max)
      img8![i] = val
    }
    return img8
  }

  /**
   * Scales and crops a Float32 image to a specified range.
   * @internal
   */
  async scalecropFloat32(
    img32: Float32Array,
    dst_min: number = 0,
    dst_max: number = 1,
    src_min: number,
    scale: number
  ): Promise<Float32Array> {
    const voxnum = img32.length
    const img = new Float32Array(voxnum)
    for (let i = 0; i < voxnum; i++) {
      let val = img32![i]
      val = dst_min + scale * (val - src_min)
      val = Math.max(val, dst_min)
      val = Math.min(val, dst_max)
      img![i] = val
    }
    return img
  }

  /**
   * Computes offset and scale to robustly rescale image intensities to a target range.
   * @internal
   */
  getScale(
    volume: NVImage,
    dst_min: number = 0,
    dst_max: number = 255,
    f_low: number = 0.0,
    f_high: number = 0.999
  ): [number, number] {
    let src_min = volume.global_min!
    let src_max = volume.global_max!
    if (volume.hdr!.datatypeCode === NiiDataType.DT_UINT8) {
      // for compatibility with conform.py: uint8 is not transformed
      return [src_min, 1.0]
    }
    if (!isFinite(f_low) || !isFinite(f_high)) {
      if (isFinite(volume.cal_min!) && isFinite(volume.cal_max!) && volume.cal_max! > volume.cal_min!) {
        src_min = volume.cal_min!
        src_max = volume.cal_max!
        const scale = (dst_max - dst_min) / (src_max - src_min)
        log.info(' Robust Rescale:  min: ' + src_min + '  max: ' + src_max + ' scale: ' + scale)
        return [src_min, scale]
      }
    }
    let img = volume.img!
    const voxnum = volume.hdr!.dims![1] * volume.hdr!.dims![2] * volume.hdr!.dims![3]
    if (volume.hdr!.scl_slope !== 1.0 || volume.hdr!.scl_inter !== 0.0) {
      const srcimg = volume.img!
      img = new Float32Array(volume.img!.length)
      for (let i = 0; i < voxnum; i++) {
        img[i] = srcimg[i] * volume.hdr!.scl_slope + volume.hdr!.scl_inter
      }
    }
    if (src_min < 0.0) {
      log.warn('WARNING: Input image has value(s) below 0.0 !')
    }
    log.info(' Input:    min: ' + src_min + '  max: ' + src_max)
    if (f_low === 0.0 && f_high === 1.0) {
      return [src_min, 1.0]
    }
    // compute non-zeros and total vox num
    let nz = 0
    for (let i = 0; i < voxnum; i++) {
      if (Math.abs(img![i]) >= 1e-15) {
        nz++
      }
    }
    // compute histogram
    const histosize = 1000
    const bin_size = (src_max - src_min) / histosize
    const hist = new Array(histosize).fill(0)
    for (let i = 0; i < voxnum; i++) {
      const val = img[i]
      let bin = Math.floor((val - src_min) / bin_size)
      bin = Math.min(bin, histosize - 1)
      hist[bin]++
    }
    // compute cumulative sum
    const cs = new Array(histosize).fill(0)
    cs[0] = hist[0]
    for (let i = 1; i < histosize; i++) {
      cs[i] = cs[i - 1] + hist[i]
    }
    // get lower limit
    let nth = Math.floor(f_low * voxnum)
    let idx = 0
    while (idx < histosize) {
      if (cs[idx] >= nth) {
        break
      }
      idx++
    }
    const global_min = src_min
    src_min = idx * bin_size + global_min
    // get upper limit
    // nth = Math.floor((1.0 - f_high2) * nz)
    nth = voxnum - Math.floor((1.0 - f_high) * nz)
    idx = 0
    while (idx < histosize - 1) {
      if (cs[idx + 1] >= nth) {
        break
      }
      idx++
    }
    src_max = idx * bin_size + global_min
    // scale
    let scale = 1
    if (src_min !== src_max) {
      scale = (dst_max - dst_min) / (src_max - src_min)
    }
    log.info(' Rescale:  min: ' + src_min + '  max: ' + src_max + ' scale: ' + scale)
    return [src_min, scale]
  }

  // Translation of nibabel mghformat.py (MIT License 2009-2019) and FastSurfer conform.py (Apache License)
  // https://github.com/nipy/nibabel/blob/a2e5dee05cf374c22670ff9fd0d385ce366eb495/nibabel/freesurfer/mghformat.py#L30

  /**
   * Computes output affine, voxel-to-voxel transform, and its inverse for resampling.
   * @internal
   */
  conformVox2Vox(inDims: number[], inAffine: number[], outDim = 256, outMM = 1, toRAS = false): [mat4, mat4, mat4] {
    const a = inAffine.flat()
    const affine = mat4.fromValues(
      a[0],
      a[1],
      a[2],
      a[3],
      a[4],
      a[5],
      a[6],
      a[7],
      a[8],
      a[9],
      a[10],
      a[11],
      a[12],
      a[13],
      a[14],
      a[15]
    )
    const half = vec4.fromValues(inDims[1] / 2, inDims[2] / 2, inDims[3] / 2, 1)
    const Pxyz_c4 = vec4.create()
    const affineT = mat4.create()
    mat4.transpose(affineT, affine)
    vec4.transformMat4(Pxyz_c4, half, affineT)
    const Pxyz_c = vec3.fromValues(Pxyz_c4[0], Pxyz_c4[1], Pxyz_c4[2])
    // MGH format doesn't store the transform directly. Instead it's gleaned
    // from the zooms ( delta ), direction cosines ( Mdc ), RAS centers (
    const delta = vec3.fromValues(outMM, outMM, outMM)
    let Mdc = mat4.fromValues(-1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1)
    if (toRAS) {
      Mdc = mat4.fromValues(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
    }
    mat4.transpose(Mdc, Mdc)
    const dims = vec4.fromValues(outDim, outDim, outDim, 1)
    const MdcD = mat4.create()
    mat4.scale(MdcD, Mdc, delta)
    const vol_center = vec4.fromValues(dims[0], dims[1], dims[2], 1)
    vec4.transformMat4(vol_center, vol_center, MdcD)
    vec4.scale(vol_center, vol_center, 0.5)
    const translate = vec3.create()
    vec3.subtract(translate, Pxyz_c, vec3.fromValues(vol_center[0], vol_center[1], vol_center[2]))
    const out_affine = mat4.create()
    mat4.transpose(out_affine, MdcD)
    out_affine[3] = translate[0]
    out_affine[7] = translate[1]
    out_affine[11] = translate[2]
    const inv_out_affine = mat4.create()
    mat4.invert(inv_out_affine, out_affine)
    const vox2vox = mat4.create()
    // compute vox2vox from src to trg
    mat4.mul(vox2vox, affine, inv_out_affine)
    // compute inverse
    const inv_vox2vox = mat4.create()
    mat4.invert(inv_vox2vox, vox2vox)
    return [out_affine, vox2vox, inv_vox2vox]
  }

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
  async conform(
    volume: NVImage,
    toRAS = false,
    isLinear: boolean = true,
    asFloat32 = false,
    isRobustMinMax = false
  ): Promise<NVImage> {
    const outDim = 256
    const outMM = 1
    const obj = this.conformVox2Vox(volume.hdr!.dims!, volume.hdr!.affine.flat(), outDim, outMM, toRAS)
    const out_affine = obj[0]
    const inv_vox2vox = obj[2]
    const out_nvox = outDim * outDim * outDim
    const out_img = new Float32Array(out_nvox)
    const in_img = new Float32Array(volume.img!)
    const in_nvox = volume.hdr!.dims![1] * volume.hdr!.dims![2] * volume.hdr!.dims![3]
    if (volume.hdr!.scl_slope !== 1.0 || volume.hdr!.scl_inter !== 0.0) {
      for (let i = 0; i < in_nvox; i++) {
        in_img[i] = in_img[i] * volume.hdr!.scl_slope + volume.hdr!.scl_inter
      }
    }
    const dimX = volume.hdr!.dims![1]
    const dimY = volume.hdr!.dims![2]
    const dimZ = volume.hdr!.dims![3]
    const dimXY = dimX * dimY
    let i = -1
    function voxidx(vx: number, vy: number, vz: number): number {
      return vx + vy * dimX + vz * dimXY
    }
    const inv_vox2vox0 = inv_vox2vox[0]
    const inv_vox2vox4 = inv_vox2vox[4]
    const inv_vox2vox8 = inv_vox2vox[8]
    if (isLinear) {
      for (let z = 0; z < outDim; z++) {
        for (let y = 0; y < outDim; y++) {
          // loop hoisting
          const ixYZ = y * inv_vox2vox[1] + z * inv_vox2vox[2] + inv_vox2vox[3]
          const iyYZ = y * inv_vox2vox[5] + z * inv_vox2vox[6] + inv_vox2vox[7]
          const izYZ = y * inv_vox2vox[9] + z * inv_vox2vox[10] + inv_vox2vox[11]
          for (let x = 0; x < outDim; x++) {
            const ix = x * inv_vox2vox0 + ixYZ
            const iy = x * inv_vox2vox4 + iyYZ
            const iz = x * inv_vox2vox8 + izYZ
            const fx = Math.floor(ix)
            const fy = Math.floor(iy)
            const fz = Math.floor(iz)
            i++
            if (fx < 0 || fy < 0 || fz < 0) {
              continue
            }
            // n.b. cx = fx + 1 unless fx is an integer
            // no performance benefits noted changing ceil to + 1
            const cx = Math.ceil(ix)
            const cy = Math.ceil(iy)
            const cz = Math.ceil(iz)
            if (cx >= dimX || cy >= dimY || cz >= dimZ) {
              continue
            }
            // residuals
            const rcx = ix - fx
            const rcy = iy - fy
            const rcz = iz - fz
            const rfx = 1 - rcx
            const rfy = 1 - rcy
            const rfz = 1 - rcz
            const fff = voxidx(fx, fy, fz)
            let vx = 0
            vx += in_img[fff] * rfx * rfy * rfz
            vx += in_img[fff + dimXY] * rfx * rfy * rcz
            vx += in_img[fff + dimX] * rfx * rcy * rfz
            vx += in_img[fff + dimX + dimXY] * rfx * rcy * rcz
            vx += in_img[fff + 1] * rcx * rfy * rfz
            vx += in_img[fff + 1 + dimXY] * rcx * rfy * rcz
            vx += in_img[fff + 1 + dimX] * rcx * rcy * rfz
            vx += in_img[fff + 1 + dimX + dimXY] * rcx * rcy * rcz
            out_img[i] = vx
          } // z
        } // y
      } // x
    } else {
      // nearest neighbor interpolation
      for (let z = 0; z < outDim; z++) {
        for (let y = 0; y < outDim; y++) {
          // loop hoisting
          const ixYZ = y * inv_vox2vox[1] + z * inv_vox2vox[2] + inv_vox2vox[3]
          const iyYZ = y * inv_vox2vox[5] + z * inv_vox2vox[6] + inv_vox2vox[7]
          const izYZ = y * inv_vox2vox[9] + z * inv_vox2vox[10] + inv_vox2vox[11]
          for (let x = 0; x < outDim; x++) {
            const ix = Math.round(x * inv_vox2vox0 + ixYZ)
            const iy = Math.round(x * inv_vox2vox4 + iyYZ)
            const iz = Math.round(x * inv_vox2vox8 + izYZ)
            i++
            if (ix < 0 || iy < 0 || iz < 0) {
              continue
            }
            if (ix >= dimX || iy >= dimY || iz >= dimZ) {
              continue
            }
            out_img[i] = in_img[voxidx(ix, iy, iz)]
          } // z
        } // y
      } // x
    } // if linear else nearest
    // Unlike mri_convert -c, we first interpolate (float image), and then rescale
    // to uchar. mri_convert is doing it the other way around. However, we compute
    // the scale factor from the input to increase similarity.
    const src_min = 0
    const scale = 0
    let f_low = 0
    if (isRobustMinMax) {
      f_low = NaN
    }
    let bytes = new Uint8Array()
    if (asFloat32) {
      const gs = await this.getScale(volume, 0, 1, f_low)
      const out_img32 = await this.scalecropFloat32(out_img, 0, 1, gs[0], gs[1])
      bytes = await this.createNiftiArray(
        [outDim, outDim, outDim],
        [outMM, outMM, outMM],
        Array.from(out_affine),
        NiiDataType.DT_FLOAT32,
        new Uint8Array(out_img32.buffer)
      )
    } else {
      const gs = await this.getScale(volume, 0, 255, f_low)
      const out_img8 = await this.scalecropUint8(out_img, 0, 255, gs[0], gs[1])
      bytes = await this.createNiftiArray(
        [outDim, outDim, outDim],
        [outMM, outMM, outMM],
        Array.from(out_affine),
        2,
        out_img8
      )
    }
    const nii = await this.niftiArray2NVImage(bytes)
    return nii
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
    const volume = this.volumes[idx]
    // don't allow indexing timepoints beyond the max number of time points.
    if (frame4D > volume.nFrame4D! - 1) {
      frame4D = volume.nFrame4D! - 1
    }
    // don't allow negative timepoints
    if (frame4D < 0) {
      frame4D = 0
    }
    if (frame4D === volume.frame4D) {
      return
    } // no change
    volume.frame4D = frame4D
    this.updateGLVolume()
    this.onFrameChange(volume, frame4D)
    this.createOnLocationChange()
  }

  /**
   * determine active 3D volume from 4D time series
   * @param id - the ID of the 4D NVImage
   * @returns currently selected volume (indexed from 0)
   * @example nv1.getFrame4D(nv1.volumes[0].id);
   * @see {@link https://niivue.com/demos/features/timeseries.html | live demo usage}
   */
  getFrame4D(id: string): number {
    const idx = this.getVolumeIndexByID(id)
    return this.volumes[idx].frame4D!
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
    this.gl.activeTexture(TEXTURE1_COLORMAPS)
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
        this.addColormapList(
          volume.colormapNegative,
          neg[0],
          neg[1],
          isColorbarFromZero,
          true,
          volume.colorbarVisible,
          volume.colormapInvert
        )
        this.addColormapList(
          volume.colormap,
          volume.cal_min,
          volume.cal_max,
          isColorbarFromZero,
          false,
          volume.colorbarVisible,
          volume.colormapInvert
        )
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
    let dimsMM = this.screenFieldOfViewMM(SLICE_TYPE.AXIAL)
    if (forceVox) {
      dimsMM = this.screenFieldOfViewVox(SLICE_TYPE.AXIAL)
    }
    const longestAxis = Math.max(dimsMM[0], Math.max(dimsMM[1], dimsMM[2]))
    const volScale = [dimsMM[0] / longestAxis, dimsMM[1] / longestAxis, dimsMM[2] / longestAxis]
    if (!this.back?.dims) {
      throw new Error('back.dims undefined')
    }
    const vox = [this.back.dims[1], this.back.dims[2], this.back.dims[3]]
    return { volScale, vox, longestAxis, dimsMM }
  }

  /**
   * Returns the index of the tile containing the given (x, y) screen coordinates.
   * Returns -1 if the coordinates are outside all tiles.
   * @internal
   */
  tileIndex(x: number, y: number): number {
    for (let i = 0; i < this.screenSlices.length; i++) {
      const ltwh = this.screenSlices[i].leftTopWidthHeight
      if (x > ltwh[0] && y > ltwh[1] && x < ltwh[0] + ltwh[2] && y < ltwh[1] + ltwh[3]) {
        return i
      }
    }
    return -1 // mouse position not in rendering tile
  }

  /**
   * Returns the index of the render tile containing (x, y) screen coordinates, or -1 if none.
   * @internal
   */
  inRenderTile(x: number, y: number): number {
    const idx = this.tileIndex(x, y)
    if (idx >= 0 && this.screenSlices[idx].axCorSag === SLICE_TYPE.RENDER) {
      return idx
    }
    return -1 // mouse position not in rendering tile
  }

  /**
   * Adjusts clip plane depth if active, else zooms render size.
   * @internal
   */
  sliceScroll3D(posChange = 0): void {
    if (posChange === 0) {
      return
    }
    // n.b. clip plane only influences voxel-based volumes, so zoom is only action for meshes
    if (this.volumes.length > 0 && this.scene.clipPlaneDepthAziElev[0] < 1.8) {
      // clipping mode: change clip plane depth
      // if (this.scene.clipPlaneDepthAziElev[0] > 1.8) return;
      const depthAziElev = this.scene.clipPlaneDepthAziElev.slice()
      // bound clip sqrt(3) = 1.73
      if (posChange > 0) {
        depthAziElev[0] = Math.min(1.5, depthAziElev[0] + 0.025)
      }
      if (posChange < 0) {
        depthAziElev[0] = Math.max(-1.5, depthAziElev[0] - 0.025)
      } // Math.max(-1.7,
      if (depthAziElev[0] !== this.scene.clipPlaneDepthAziElev[0]) {
        this.scene.clipPlaneDepthAziElev = depthAziElev
        return this.setClipPlane(this.scene.clipPlaneDepthAziElev)
      }
      return
    }
    if (posChange > 0) {
      this.scene.volScaleMultiplier = Math.min(2.0, this.scene.volScaleMultiplier * 1.1)
    }
    if (posChange < 0) {
      this.scene.volScaleMultiplier = Math.max(0.5, this.scene.volScaleMultiplier * 0.9)
    }
    this.drawScene()
  }

  /**
   * Deletes loaded thumbnail texture and frees memory.
   * @internal
   */
  deleteThumbnail(): void {
    if (!this.bmpTexture) {
      return
    }
    this.gl.deleteTexture(this.bmpTexture)
    this.bmpTexture = null
    this.thumbnailVisible = false
  }

  /**
   * Checks if (x,y) is within the visible graph plotting area.
   * @internal
   */
  inGraphTile(x: number, y: number): boolean {
    if (this.graph.opacity <= 0 || this.volumes.length < 1 || this.volumes[0].nFrame4D! < 1 || !this.graph.plotLTWH) {
      return false
    }
    if (this.graph.plotLTWH[2] < 1 || this.graph.plotLTWH[3] < 1) {
      return false
    }
    // this.graph.LTWH is tile
    // this.graph.plotLTWH is body of plot
    const pos = [(x - this.graph.LTWH[0]) / this.graph.LTWH[2], (y - this.graph.LTWH[1]) / this.graph.LTWH[3]]

    return pos[0] > 0 && pos[1] > 0 && pos[0] <= 1 && pos[1] <= 1
  }

  /**
   * Updates drawBitmap to match clickToSegmentGrowingBitmap if they differ in content and size.
   * @internal
   */
  updateBitmapFromClickToSegment(): void {
    if (this.clickToSegmentGrowingBitmap === null) {
      return
    }
    if (this.drawBitmap === null) {
      return
    }
    if (this.clickToSegmentGrowingBitmap.length !== this.drawBitmap.length) {
      return
    }
    const nvx = this.drawBitmap.length
    for (let i = 0; i < nvx; i++) {
      this.drawBitmap[i] = this.clickToSegmentGrowingBitmap[i]
    }
  }

  /**
   * Calculates the sum of all voxel values in the given bitmap.
   * @internal
   */
  sumBitmap(img: Uint8Array): number {
    let sum = 0
    for (let i = 0; i < img.length; i++) {
      sum += img[i]
    }
    return sum
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
    const threshold = this.opts.clickToSegmentPercent
    let voxelIntensity = this.back.getValue(pt[0], pt[1], pt[2])

    // Auto intensity logic
    if (this.opts.clickToSegmentAutoIntensity) {
      if (threshold !== 0) {
        if (voxelIntensity === 0) {
          voxelIntensity = 0.01
        }
        this.opts.clickToSegmentIntensityMax = voxelIntensity * (1 + threshold)
        this.opts.clickToSegmentIntensityMin = voxelIntensity * (1 - threshold)
      }
      if (voxelIntensity > (this.back.cal_min + this.back.cal_max) * 0.5) {
        this.opts.clickToSegmentBright = true
      } else {
        this.opts.clickToSegmentBright = false
      }
    }
    const brightOrDark = this.opts.clickToSegmentBright ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY

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
  mouseClick(x: number, y: number, posChange = 0, isDelta = true): void {
    x *= this.uiData.dpr!
    y *= this.uiData.dpr!
    this.canvas!.focus()
    if (this.thumbnailVisible) {
      this.thumbnailVisible = false
      Promise.all([this.loadVolumes(this.deferredVolumes), this.loadMeshes(this.deferredMeshes)]).catch((e) => {
        throw e
      })
      return
    }
    if (this.inGraphTile(x, y)) {
      if (!this.graph.plotLTWH) {
        throw new Error('plotLTWH undefined')
      }
      const pos = [
        (x - this.graph.plotLTWH[0]) / this.graph.plotLTWH[2],
        (y - this.graph.plotLTWH[1]) / this.graph.plotLTWH[3]
      ]

      if (pos[0] > 0 && pos[1] > 0 && pos[0] <= 1 && pos[1] <= 1) {
        const vol = Math.round(pos[0] * (this.volumes[0].nFrame4D! - 1))
        this.setFrame4D(this.volumes[0].id, vol)
        return
      }
      if (pos[0] > 0.5 && pos[1] > 1.0) {
        this.loadDeferred4DVolumes(this.volumes[0].id).catch((e) => {
          throw e
        })
      }
      return
    }
    if (this.inRenderTile(x, y) >= 0) {
      this.sliceScroll3D(posChange)
      this.drawScene()
      return
    }
    if (this.screenSlices.length < 1 || this.gl.canvas.height < 1 || this.gl.canvas.width < 1) {
      return
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
          return
        }

        const posNeg = posChange < 0 ? -1 : 1
        const xyz = [0, 0, 0]

        if (axCorSag <= SLICE_TYPE.SAGITTAL) {
          xyz[2 - axCorSag] = posNeg
          this.moveCrosshairInVox(xyz[0], xyz[1], xyz[2])
        }
        return
      }

      if (this.opts.isForceMouseClickToVoxelCenters) {
        this.scene.crosshairPos = vec3.clone(this.vox2frac(this.frac2vox(texFrac)))
      } else {
        this.scene.crosshairPos = vec3.clone(texFrac)
      }

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

          this.drawFloodFill(
            pt,
            floodFillNewColor,
            growMode,
            NaN,
            NaN,
            this.opts.floodFillNeighbors,
            Number.POSITIVE_INFINITY,
            false,
            this.drawBitmap,
            isGrowTool
          )
          this.drawScene()
          this.createOnLocationChange(axCorSag)
          return
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
          return
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
              if (
                pt[0] === this.drawPenLocation[0] &&
                pt[1] === this.drawPenLocation[1] &&
                pt[2] === this.drawPenLocation[2]
              ) {
                // No drawing needed, but still redraw scene and update location
                this.drawScene()
                this.createOnLocationChange(axCorSag)
                return
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
      return // Click handled for this slice 'i'
    } // End loop through screenSlices
    // If loop finishes without finding a slice, the click was outside all valid slices
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
      // let ltwh = this.screenSlices[i].leftTopWidthHeight;
      if (this.screenSlices[i].fovMM.length > 1) {
        ltwh = this.screenSlices[i].leftTopWidthHeight
        fovMM = this.screenSlices[i].fovMM
        break
      }
    }
    if (ltwh.length < 4) {
      return
    }
    const frac10cm = 100.0 / fovMM[0]
    const pix10cm = frac10cm * ltwh[2]
    const pix1cm = Math.max(Math.round(pix10cm * 0.1), 2)
    const pixLeft = Math.floor(ltwh[0] + 0.5 * ltwh[2] - 0.5 * pix10cm)
    const thick = Number(this.opts.rulerWidth)
    const pixTop = Math.floor(ltwh[1] + ltwh[3] - pix1cm) + 0.5 * thick
    const startXYendXY = [pixLeft, pixTop, pixLeft + pix10cm, pixTop]
    let outlineColor = [0, 0, 0, 1]
    if (this.opts.rulerColor[0] + this.opts.rulerColor[1] + this.opts.rulerColor[2] < 0.8) {
      outlineColor = [1, 1, 1, 1]
    }
    this.drawRuler10cm(startXYendXY, outlineColor, thick + 1)
    this.drawRuler10cm(startXYendXY, this.opts.rulerColor, thick)
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
    // draw Line
    this.gl.uniform1f(this.lineShader.uniforms.thickness, rulerWidth)
    this.gl.uniform4fv(this.lineShader.uniforms.startXYendXY, startXYendXY)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    // draw tick marks
    // const w10cm = -0.1 * (startXYendXY[0] - startXYendXY[2])
    const w1cm = -0.1 * (startXYendXY[0] - startXYendXY[2])
    const b = startXYendXY[1] - Math.floor(0.5 * this.opts.rulerWidth)
    const t = Math.floor(b - 0.35 * w1cm)
    const t2 = Math.floor(b - 0.7 * w1cm)
    for (let i = 0; i < 11; i++) {
      let l = startXYendXY[0] + i * w1cm
      l = Math.max(l, startXYendXY[0] + 0.5 * rulerWidth)
      l = Math.min(l, startXYendXY[2] - 0.5 * rulerWidth)
      const xyxy = [l, b, l, t]
      if (i % 5 === 0) {
        xyxy[3] = t2
      }
      this.gl.uniform4fv(this.lineShader.uniforms.startXYendXY, xyxy)
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    }
    this.gl.bindVertexArray(this.unusedVAO) // set vertex attributes
  }

  /**
   * Returns vec4 with XYZ millimeter coordinates and tile index for given screen XY.
   * @internal
   */
  screenXY2mm(x: number, y: number, forceSlice = -1): vec4 {
    let texFrac: vec3
    for (let s = 0; s < this.screenSlices.length; s++) {
      let i = s
      if (forceSlice >= 0) {
        i = forceSlice
      }
      const axCorSag = this.screenSlices[i].axCorSag
      if (axCorSag > SLICE_TYPE.SAGITTAL) {
        continue
      }

      const ltwh = this.screenSlices[i].leftTopWidthHeight
      if (x < ltwh[0] || y < ltwh[1] || x > ltwh[0] + ltwh[2] || y > ltwh[1] + ltwh[3]) {
        continue
      }
      texFrac = this.screenXY2TextureFrac(x, y, i, false)
      if (texFrac[0] < 0.0) {
        continue
      }
      const mm = this.frac2mm(texFrac)

      return vec4.fromValues(mm[0], mm[1], mm[2], i)
    }
    return vec4.fromValues(NaN, NaN, NaN, NaN)
  }

  /**
   * Update scene pan position during drag based on start and end screen coordinates.
   * @internal
   */
  dragForPanZoom(startXYendXY: number[]): void {
    const endMM = this.screenXY2mm(startXYendXY[2], startXYendXY[3])
    if (isNaN(endMM[0])) {
      return
    }
    const startMM = this.screenXY2mm(startXYendXY[0], startXYendXY[1], endMM[3])
    if (isNaN(startMM[0]) || isNaN(endMM[0]) || isNaN(endMM[3])) {
      return
    }
    const v = vec4.create()
    const zoom = this.uiData.pan2DxyzmmAtMouseDown[3]
    vec4.sub(v, endMM, startMM)
    this.scene.pan2Dxyzmm[0] = this.uiData.pan2DxyzmmAtMouseDown[0] + zoom * v[0]
    this.scene.pan2Dxyzmm[1] = this.uiData.pan2DxyzmmAtMouseDown[1] + zoom * v[1]
    this.scene.pan2Dxyzmm[2] = this.uiData.pan2DxyzmmAtMouseDown[2] + zoom * v[2]
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
    let zoom = this.uiData.pan2DxyzmmAtMouseDown[3]
    const y = startXYendXY[3] - startXYendXY[1]
    const pixelScale = 0.01
    zoom += y * pixelScale
    zoom = Math.max(zoom, 0.1)
    zoom = Math.min(zoom, 10.0)
    const zoomChange = this.scene.pan2Dxyzmm[3] - zoom
    if (this.opts.yoke3Dto2DZoom) {
      this.scene.volScaleMultiplier = zoom
    }
    this.scene.pan2Dxyzmm[3] = zoom
    const mm = this.frac2mm(this.scene.crosshairPos)
    this.scene.pan2Dxyzmm[0] += zoomChange * mm[0]
    this.scene.pan2Dxyzmm[1] += zoomChange * mm[1]
    this.scene.pan2Dxyzmm[2] += zoomChange * mm[2]
  }

  /**
   * Draw a measurement line with end caps and length text on a 2D tile.
   * @internal
   */
  drawMeasurementTool(startXYendXY: number[], isDrawText: boolean = true): void {
    function extendTo(
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      distance: number
    ): { origin: number[]; terminus: number[] } {
      const x = x0 - x1
      const y = y0 - y1
      if (x === 0 && y === 0) {
        return {
          origin: [x1 + distance, y1],
          terminus: [x1 + distance, y1]
        }
      }
      const c = Math.sqrt(x * x + y * y)
      const dX = (distance * x) / c
      const dY = (distance * y) / c
      return {
        origin: [x0 + dX, y0 + dY], // next to start point
        terminus: [x1 - dX, y1 - dY]
      }
      // return [x1 - dX, y1 - dY];  // next to end point
    }

    const gl = this.gl
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
      this.drawMeasurementTool(
        [this.uiData.dragStart[0], this.uiData.dragStart[1], this.uiData.dragEnd[0], this.uiData.dragEnd[1]],
        false
      )
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
    this.drawTextBetween(
      [intersectionX, intersectionY, intersectionX + 1, intersectionY + 1],
      angleText,
      this.opts.measureTextHeight / 0.06,
      this.opts.measureTextColor
    )
  }

  /**
   * Calculate and draw angle text for a completed angle.
   * @internal
   */
  drawAngleTextForAngle(angle: {
    firstLine: number[]
    secondLine: number[]
    sliceIndex: number
    sliceType: SLICE_TYPE
    slicePosition: number
  }): void {
    const angle_degrees = this.calculateAngleBetweenLines(angle.firstLine, angle.secondLine)

    // Display angle at intersection point
    const intersectionX = angle.firstLine[2]
    const intersectionY = angle.firstLine[3]

    const angleText = `${angle_degrees.toFixed(1)}°`

    // Draw angle text at intersection
    this.drawTextBetween(
      [intersectionX, intersectionY, intersectionX + 1, intersectionY + 1],
      angleText,
      this.opts.measureTextHeight / 0.06,
      this.opts.measureTextColor
    )
  }

  /**
   * Calculate angle between two lines in degrees.
   * @internal
   */
  calculateAngleBetweenLines(line1: number[], line2: number[]): number {
    // For angle measurement, we need to calculate vectors from the intersection point
    // The intersection point is the end of line1 (which is the start of line2)
    const intersectionX = line1[2]
    const intersectionY = line1[3]
    const v1x = line1[0] - intersectionX
    const v1y = line1[1] - intersectionY
    const v2x = line2[2] - intersectionX
    const v2y = line2[3] - intersectionY
    const dot = v1x * v2x + v1y * v2y
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)
    // Avoid division by zero
    if (mag1 === 0 || mag2 === 0) {
      return 0
    }
    // Calculate angle in radians
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)))
    const angleRad = Math.acos(cosAngle)
    // Convert to degrees
    const angleDeg = angleRad * (180 / Math.PI)
    return angleDeg
  }

  /**
   * Reset the angle measurement state.
   * @internal
   */
  resetAngleMeasurement(): void {
    this.uiData.angleState = 'none'
    this.uiData.angleFirstLine = [0.0, 0.0, 0.0, 0.0]
  }

  /**
   * Get slice information for the current measurement/angle.
   * @internal
   */
  getCurrentSliceInfo(): { sliceIndex: number; sliceType: SLICE_TYPE; slicePosition: number } {
    const tileIdx = this.tileIndex(this.uiData.dragStart[0], this.uiData.dragStart[1])

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

      return {
        sliceIndex: tileIdx,
        sliceType,
        slicePosition
      }
    }

    // Fallback: use current slice type and crosshair position when tileIndex fails
    const currentSliceType = this.opts.sliceType
    let slicePosition = 0

    // Get the current slice position based on the crosshair position and current slice type
    if (currentSliceType === SLICE_TYPE.AXIAL) {
      slicePosition = this.scene.crosshairPos[2] // Z coordinate for axial slices
    } else if (currentSliceType === SLICE_TYPE.CORONAL) {
      slicePosition = this.scene.crosshairPos[1] // Y coordinate for coronal slices
    } else if (currentSliceType === SLICE_TYPE.SAGITTAL) {
      slicePosition = this.scene.crosshairPos[0] // X coordinate for sagittal slices
    } else if (currentSliceType === SLICE_TYPE.MULTIPLANAR) {
      // In multiplanar mode, try to determine the slice type from the mouse position
      // by checking if we can convert the canvas position to fractional coordinates
      const startFrac = this.canvasPos2frac([this.uiData.dragStart[0], this.uiData.dragStart[1]])
      if (startFrac[0] >= 0) {
        // If we can convert to fractional coordinates, use the current crosshair position
        // but we need to determine which slice type this measurement is most likely for
        // For now, default to axial in multiplanar mode
        slicePosition = this.scene.crosshairPos[2]
      }
    }

    return { sliceIndex: -1, sliceType: currentSliceType, slicePosition }
  }

  /**
   * Get the current slice position based on slice type.
   * @internal
   */
  getCurrentSlicePosition(sliceType: SLICE_TYPE): number {
    if (sliceType === SLICE_TYPE.AXIAL) {
      return this.scene.crosshairPos[2] // Z coordinate for axial slices
    } else if (sliceType === SLICE_TYPE.CORONAL) {
      return this.scene.crosshairPos[1] // Y coordinate for coronal slices
    } else if (sliceType === SLICE_TYPE.SAGITTAL) {
      return this.scene.crosshairPos[0] // X coordinate for sagittal slices
    }
    return 0
  }

  /**
   * Check if a measurement/angle should be drawn on the current slice.
   * @internal
   */
  shouldDrawOnCurrentSlice(sliceIndex: number, sliceType: SLICE_TYPE, slicePosition: number): boolean {
    // In multiplanar mode, we need to check if the measurement can be displayed on any of the visible tiles
    if (this.opts.sliceType === SLICE_TYPE.MULTIPLANAR) {
      // Check if this is a valid 2D slice type
      if (sliceType > SLICE_TYPE.SAGITTAL) {
        return false
      }

      for (let i = 0; i < this.screenSlices.length; i++) {
        if (this.screenSlices[i].axCorSag === sliceType) {
          // Check if the position matches (within tolerance)
          const currentSlicePosition = this.getCurrentSlicePosition(sliceType)
          const tolerance = 0.001 // Tolerance for position matching
          const difference = Math.abs(currentSlicePosition - slicePosition)

          if (difference < tolerance) {
            return true
          }
        }
      }
      return false
    } else if (this.opts.sliceType !== sliceType) {
      return false
    }

    // For single slice view, just check the position
    const currentSlicePosition = this.getCurrentSlicePosition(sliceType)

    const tolerance = 0.001 // Increased from 0.001 to 0.01 to handle normal scroll increments
    const difference = Math.abs(currentSlicePosition - slicePosition)
    const result = difference < tolerance

    return result
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
    if (typeof mode === 'string') {
      // Convert string to DRAG_MODE enum
      switch (mode) {
        case 'none':
          this.opts.dragMode = DRAG_MODE.none
          break
        case 'contrast':
          this.opts.dragMode = DRAG_MODE.contrast
          break
        case 'measurement':
          this.opts.dragMode = DRAG_MODE.measurement
          break
        case 'angle':
          this.opts.dragMode = DRAG_MODE.angle
          break
        case 'pan':
          this.opts.dragMode = DRAG_MODE.pan
          break
        case 'slicer3D':
          this.opts.dragMode = DRAG_MODE.slicer3D
          break
        case 'callbackOnly':
          this.opts.dragMode = DRAG_MODE.callbackOnly
          break
        case 'roiSelection':
          this.opts.dragMode = DRAG_MODE.roiSelection
          break
        default:
          console.warn(`Unknown drag mode: ${mode}`)
          return
      }
    } else {
      this.opts.dragMode = mode
    }

    // Reset angle measurement state when changing drag modes
    if (this.opts.dragMode !== DRAG_MODE.angle) {
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
    if (!this.opts.selectionBoxIsOutline) {
      this.rectShader.use(this.gl)
      this.gl.enable(this.gl.BLEND)
      this.gl.uniform4fv(this.rectShader.uniforms.lineColor, lineColor)
      this.gl.uniform2fv(this.rectShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
      this.gl.uniform4f(
        this.rectShader.uniforms.leftTopWidthHeight,
        leftTopWidthHeight[0],
        leftTopWidthHeight[1],
        leftTopWidthHeight[2],
        leftTopWidthHeight[3]
      )
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
      this.gl.uniform2fv(this.rectOutlineShader.uniforms.canvasWidthHeight, [
        this.gl.canvas.width,
        this.gl.canvas.height
      ])
      this.gl.uniform4f(
        this.rectOutlineShader.uniforms.leftTopWidthHeight,
        leftTopWidthHeight[0],
        leftTopWidthHeight[1],
        leftTopWidthHeight[2],
        leftTopWidthHeight[3]
      )
      this.gl.bindVertexArray(this.genericVAO)
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
      this.gl.bindVertexArray(this.unusedVAO) // switch off to avoid tampering with settings
    }
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
    this.gl.uniform4f(
      this.circleShader.uniforms.leftTopWidthHeight,
      leftTopWidthHeight[0],
      leftTopWidthHeight[1],
      leftTopWidthHeight[2],
      leftTopWidthHeight[3]
    )
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
    // available canvas height differs from actual height if bottom colorbar is shown
    return this.gl.canvas.height - this.colorbarHeight
  }

  /**
   * Get canvas width available for tiles (excludes legend panel).
   * @internal
   */
  effectiveCanvasWidth(): number {
    return this.gl.canvas.width - this.getLegendPanelWidth()
  }

  /**
   * Get all 3D labels from document and connectome meshes.
   * @internal
   */

  getAllLabels(): NVLabel3D[] {
    const connectomes = this.meshes.filter((m) => m.type === MeshType.CONNECTOME)
    const meshNodes = connectomes.flatMap((m) => m.nodes as NVConnectomeNode[])
    const meshLabels = meshNodes.map((n) => n.label)
    // filter our undefined labels
    const definedMeshLabels = meshLabels.filter((l): l is NVLabel3D => l !== undefined)
    const labels = [...this.document.labels, ...definedMeshLabels]
    return labels
  }

  /**
   * Get all visible connectome and non-anchored mesh labels.
   * @internal
   */
  getConnectomeLabels(): NVLabel3D[] {
    const connectomes = this.meshes.filter((m) => m.type === MeshType.CONNECTOME && m.showLegend !== false)

    const meshNodes = connectomes.flatMap((m) => m.nodes as NVConnectomeNode[])
    const meshLabels = meshNodes.map((n) => n.label)
    // filter our undefined labels

    // const definedMeshLabels = meshLabels.filter((l): l is NVLabel3D => l !== undefined)
    const definedMeshLabels = meshLabels.filter((l): l is NVLabel3D => l !== undefined && l.text !== '')
    // get all of our non-anchored labels
    const nonAnchoredLabels = this.document.labels.filter((l) => l.anchor == null || l.anchor === LabelAnchorPoint.NONE)
    // get the unique set of unanchored labels
    // console.log(definedMeshLabels)
    const nonAnchoredLabelSet = new Set(definedMeshLabels)
    for (const label of nonAnchoredLabels) {
      nonAnchoredLabelSet.add(label)
    }
    // now add mesh atlases
    const meshes = this.meshes.filter((m) => m.type === MeshType.MESH)
    for (let i = 0; i < meshes.length; i++) {
      for (let j = 0; j < meshes[i].layers.length; j++) {
        if (meshes[i].layers[j].labels) {
          for (let k = 0; k < meshes[i].layers[j].labels.length; k++) {
            nonAnchoredLabelSet.add(meshes[i].layers[j].labels[k])
          }
        }
      }
    }
    return Array.from(nonAnchoredLabelSet)
  }

  /**
   * Calculate bullet margin width based on widest bullet scale and tallest label height.
   * @internal
   */
  getBulletMarginWidth(): number {
    let bulletMargin = 0
    const labels = this.getConnectomeLabels()
    if (labels.length === 0) {
      return 0
    }

    const widestBulletScale =
      labels.length === 1
        ? labels[0].style.bulletScale
        : labels.reduce((a, b) => (a.style.bulletScale! > b.style.bulletScale! ? a : b)).style.bulletScale
    const tallestLabel =
      labels.length === 1
        ? labels[0]
        : labels.reduce((a, b) => {
            const aSize = this.fontPx * a.style.textScale
            const bSize = this.fontPx * b.style.textScale
            const taller = this.textHeight(aSize, a.text) > this.textHeight(bSize, b.text) ? a : b
            return taller
          })
    const size = this.fontPx * tallestLabel.style.textScale
    bulletMargin = this.textHeight(size, tallestLabel.text) * widestBulletScale!
    bulletMargin += size
    return bulletMargin
  }

  /**
   * Calculate width of legend panel based on labels and bullet margin.
   * Returns 0 if legend is hidden or too wide for canvas.
   * @internal
   */
  getLegendPanelWidth(): number {
    const labels = this.getConnectomeLabels()
    if (!this.opts.showLegend || labels.length === 0) {
      return 0
    }
    const scale = 1.0 // we may want to make this adjustable in the future
    const horizontalMargin = this.fontPx * scale
    let width = 0

    const longestLabel = labels.reduce((a, b) => {
      const aSize = this.fontPx * a.style.textScale
      const bSize = this.fontPx * b.style.textScale
      const longer = this.textWidth(aSize, a.text) > this.textWidth(bSize, b.text) ? a : b
      return longer
    })

    const longestTextSize = this.fontPx * longestLabel.style.textScale
    const longestTextLength = this.textWidth(longestTextSize, longestLabel.text)

    const bulletMargin = this.getBulletMarginWidth()

    if (longestTextLength) {
      width = bulletMargin + longestTextLength
      width += horizontalMargin * 2
    }
    if (width >= this.gl.canvas.width) {
      return 0
    }
    return width
  }

  /**
   * Calculate legend panel height based on labels and scale.
   * @internal
   */
  getLegendPanelHeight(panelScale = 1.0): number {
    const labels = this.getConnectomeLabels()
    let height = 0
    const verticalMargin = this.fontPx
    for (const label of labels) {
      const labelSize = this.fontPx * label.style.textScale * panelScale
      const textHeight = this.textHeight(labelSize, label.text)
      height += textHeight
    }
    if (height) {
      height += (verticalMargin / 2) * (labels.length + 1) * panelScale
    }
    return height
  }

  /**
   * Calculate and reserve canvas area for colorbar panel.
   * @internal
   */
  reserveColorbarPanel(): number[] {
    const fullHt = 3 * this.fontPx
    if (fullHt < 0) {
      return [0, 0, 0, 0]
    }

    // Calculate width as a percentage of canvas width
    // If colorbarWidth is not set (0) or invalid, use full width
    const widthPercentage = this.opts.colorbarWidth > 0 && this.opts.colorbarWidth <= 1 ? this.opts.colorbarWidth : 1.0

    const width = widthPercentage * this.gl.canvas.width

    const leftTopWidthHeight = [
      (this.gl.canvas.width - width) / 2, // Center the colorbar horizontally
      this.gl.canvas.height - fullHt,
      width,
      fullHt
    ]

    this.colorbarHeight = leftTopWidthHeight[3] + 1
    return leftTopWidthHeight
  }

  /**
   * Render a single colorbar with optional negative coloring and alpha threshold ticks.
   * @internal
   */
  drawColorbarCore(
    layer = 0,
    leftTopWidthHeight = [0, 0, 0, 0],
    isNegativeColor = false,
    min = 0,
    max = 1,
    isAlphaThreshold: boolean
  ): void {
    if (leftTopWidthHeight[2] <= 0 || leftTopWidthHeight[3] <= 0) {
      return
    }
    const txtHt = this.fontPx
    if (txtHt <= 0) {
      return
    }
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
    this.gl.activeTexture(TEXTURE1_COLORMAPS)
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
      const tticLTWH = [
        barLTWH[0] + ((thresholdTic - min) / range) * barLTWH[2],
        barLTWH[1] - barLTWH[3] * 0.25,
        2,
        barLTWH[3] * 1.5
      ]
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
      this.drawColorbarCore(
        i,
        leftTopWidthHeight,
        maps[i].negative,
        maps[i].min,
        maps[i].max,
        maps[i].isColorbarFromZero
      )
      leftTopWidthHeight[0] += wid
    }
  }

  /**
   * Calculate pixel width of text string based on glyph advances at given scale.
   * @internal
   */
  textWidth(scale: number, str: string): number {
    if (!str) {
      return 0
    }

    let w = 0
    const bytes = new TextEncoder().encode(str)
    for (let i = 0; i < str.length; i++) {
      w += scale * this.fontMets!.mets[bytes[i]].xadv!
    }
    return w
  }

  /**
   * Calculate pixel height of text based on tallest glyph at given scale.
   * @internal
   */
  textHeight(scale: number, str: string): number {
    if (!str) {
      return 0
    }
    const byteSet = new Set(Array.from(str))
    const bytes = new TextEncoder().encode(Array.from(byteSet).join(''))

    const tallest = Object.values(this.fontMets!.mets)
      .filter((_, index) => bytes.includes(index))
      .reduce((a, b) => (a.lbwh[3] > b.lbwh[3] ? a : b))
    const height = tallest.lbwh[3]
    return scale * height
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
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
    this.gl.enable(this.gl.CULL_FACE)
    this.gl.enable(this.gl.BLEND)
    this.drawTextBelow([this.canvas.width / 2, this.canvas.height / 2], text, 3)
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
    // horizontally centered on x, below y
    if (this.fontPx <= 0) {
      return
    }
    const xy = [(startXYendXY[0] + startXYendXY[2]) * 0.5, (startXYendXY[1] + startXYendXY[3]) * 0.5]
    const size = this.fontPx * scale
    const w = this.textWidth(size, str)
    xy[0] -= 0.5 * w
    xy[1] -= 0.5 * size
    const LTWH = [xy[0] - 1, xy[1] - 1, w + 2, size + 2]
    let clr = color
    if (clr === null) {
      clr = this.opts.crosshairColor
    }
    // if color is bright, make rect background dark and vice versa
    if (clr && clr[0] + clr[1] + clr[2] > 0.8) {
      clr = [0, 0, 0, 0.5]
    } else {
      clr = [1, 1, 1, 0.5]
    }
    this.drawRect(LTWH, clr) // background rect
    this.drawText(xy, str, scale, color) // the text
  }

  /**
   * Draw text horizontally centered below a specified (x,y) position with canvas boundary clamping.
   * @internal
   */
  drawTextBelow(xy: number[], str: string, scale = 1, color: number[] | null = null): void {
    // horizontally centered on x, below y
    if (this.fontPx <= 0) {
      return
    }
    if (!this.canvas) {
      throw new Error('canvas undefined')
    }
    let size = this.fontPx * scale
    let width = this.textWidth(size, str)
    if (width > this.canvas.width) {
      scale *= (this.canvas.width - 2) / width
      size = this.fontPx * scale
      width = this.textWidth(size, str)
    }
    xy[0] -= 0.5 * this.textWidth(size, str)
    xy[0] = Math.max(xy[0], 1) // clamp left edge of canvas
    xy[0] = Math.min(xy[0], this.canvas.width - width - 1) // clamp right edge of canvas
    this.drawText(xy, str, scale, color)
  }

  /**
   * Draw text horizontally centered above the given coordinates.
   * @internal
   */
  drawTextAbove(xy: number[], str: string, scale = 1, color: number[] | null = null): void {
    // horizontally centered on x, above y
    if (this.fontPx <= 0) {
      return
    }
    if (!this.canvas) {
      throw new Error('canvas undefined')
    }
    let size = this.fontPx * scale
    let width = this.textWidth(size, str)
    if (width > this.canvas.width) {
      scale *= (this.canvas.width - 2) / width
      size = this.fontPx * scale
      width = this.textWidth(size, str)
    }
    xy[0] -= 0.5 * this.textWidth(size, str)
    xy[0] = Math.max(xy[0], 1) // clamp left edge of canvas
    xy[0] = Math.min(xy[0], this.canvas.width - width - 1) // clamp right edge of canvas
    xy[1] -= size // position above the y coordinate
    this.drawText(xy, str, scale, color)
  }

  /**
   * Update texture interpolation mode (nearest or linear) for background or overlay layer.
   * @internal
   */
  updateInterpolation(layer: number, isForceLinear = false): void {
    let interp: number = this.gl.LINEAR
    if (!isForceLinear && this.opts.isNearestInterpolation) {
      interp = this.gl.NEAREST
    }
    if (layer === 0) {
      this.gl.activeTexture(TEXTURE0_BACK_VOL) // background
    } else {
      this.gl.activeTexture(TEXTURE2_OVERLAY_VOL) // overlay
    }
    // if (this.opts.is2DSliceShader) {
    // n.b. we set interpolation for BOTH 2D and 3D textures
    if (this.opts.is2DSliceShader) {
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, interp)
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, interp)
    } else {
      this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, interp)
      this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, interp)
    }
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
  calculateMvpMatrix2D(
    leftTopWidthHeight: number[],
    mn: vec3,
    mx: vec3,
    clipTolerance = Infinity,
    clipDepth = 0,
    azimuth = 0,
    elevation = 0,
    isRadiolgical: boolean
  ): MvpMatrix2D {
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
    let near = 0.01
    let far = scale * 8.0
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
    // change order of vector components
    if (axCorSag === SLICE_TYPE.CORONAL) {
      // 2D coronal screenXYZ = nifti [i,k,j]
      v3 = swizzleVec3(v3, [0, 2, 1])
    } else if (axCorSag === SLICE_TYPE.SAGITTAL) {
      // 2D sagittal screenXYZ = nifti [j,k,i]
      v3 = swizzleVec3(v3, [1, 2, 0])
    }
    return v3
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
  drawSliceOrientationText(
    leftTopWidthHeight: number[],
    axCorSag: SLICE_TYPE,
    padLeftTop: number[] = [NaN, NaN]
  ): void {
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
        this.drawTextBelow(
          [leftTopWidthHeight[0] + leftTopWidthHeight[2] * 0.5, leftTopWidthHeight[1] + padLeftTop[1] - ht],
          topText
        )
        drawBelow = false
      }
      const wid = this.textWidth(ht, leftText) + 2
      if (padLeftTop[0] > wid) {
        this.drawTextRight(
          [leftTopWidthHeight[0] + padLeftTop[0] - wid, leftTopWidthHeight[1] + leftTopWidthHeight[3] * 0.5],
          leftText
        )
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
      this.drawTextAbove(
        [leftTopWidthHeight[0] + leftTopWidthHeight[2] * 0.5, leftTopWidthHeight[1] + leftTopWidthHeight[3]],
        bottomText
      )
    }
    if (drawLeft) {
      this.drawTextLeft(
        [leftTopWidthHeight[0] + leftTopWidthHeight[2], leftTopWidthHeight[1] + leftTopWidthHeight[3] * 0.5],
        rightText
      )
    }
  }

  /**
   * Computes a plane in mm space for a given slice orientation and depth.
   * @internal
   */
  xyMM2xyzMM(axCorSag: SLICE_TYPE, sliceFrac: number): number[] {
    // given X and Y, find Z for a plane defined by 3 points (a,b,c)
    // https://math.stackexchange.com/questions/851742/calculate-coordinate-of-any-point-on-triangle-in-3d-plane
    let sliceDim = 2 // axial depth is NIfTI k dimension
    if (axCorSag === SLICE_TYPE.CORONAL) {
      sliceDim = 1
    } // sagittal depth is NIfTI j dimension
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
      sliceDim = 0
    } // sagittal depth is NIfTI i dimension
    let a: [number, number, number] | vec4 = [0, 0, 0]
    let b: [number, number, number] | vec4 = [1, 1, 0]
    let c: [number, number, number] | vec4 = [1, 0, 1]

    a[sliceDim] = sliceFrac
    b[sliceDim] = sliceFrac
    c[sliceDim] = sliceFrac
    a = this.frac2mm(a)
    b = this.frac2mm(b)
    c = this.frac2mm(c)
    a = this.swizzleVec3MM(vec3.fromValues(a[0], a[1], a[2]), axCorSag)
    b = this.swizzleVec3MM(vec3.fromValues(b[0], b[1], b[2]), axCorSag)
    c = this.swizzleVec3MM(vec3.fromValues(c[0], c[1], c[2]), axCorSag)
    const denom = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])
    let yMult = (b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2])
    yMult /= denom
    let xMult = (b[1] - a[1]) * (c[2] - a[2]) - (c[1] - a[1]) * (b[2] - a[2])
    xMult /= denom
    const AxyzMxy = [0, 0, 0, 0, 0]
    AxyzMxy[0] = a[0]
    AxyzMxy[1] = a[1]
    AxyzMxy[2] = a[2]
    AxyzMxy[3] = xMult
    AxyzMxy[4] = yMult
    return AxyzMxy
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
    gl.clear(gl.DEPTH_BUFFER_BIT)
    let obj = this.calculateMvpMatrix2D(
      leftTopWidthHeight,
      screen.mnMM,
      screen.mxMM,
      Infinity,
      0,
      azimuth,
      elevation,
      isRadiolgical
    )
    if (customMM === Infinity || customMM === -Infinity) {
      // draw rendering
      const ltwh = leftTopWidthHeight.slice()
      this.draw3D(
        leftTopWidthHeight,
        obj.modelViewProjectionMatrix,
        obj.modelMatrix,
        obj.normalMatrix,
        azimuth,
        elevation
      )
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
    gl.depthFunc(gl.GREATER)
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
    if (isNaN(customMM)) {
      // draw crosshairs
      this.drawCrosshairs3D(true, 1.0, obj.modelViewProjectionMatrix, true, this.opts.isSliceMM)
    }
    // TODO handle "infinity" for meshThicknessOn2D
    if ((this.opts.meshThicknessOn2D as number) > 0.0) {
      if (this.opts.meshThicknessOn2D !== Infinity) {
        obj = this.calculateMvpMatrix2D(
          leftTopWidthHeight,
          screen.mnMM,
          screen.mxMM,
          this.opts.meshThicknessOn2D as number,
          sliceMM,
          azimuth,
          elevation,
          isRadiolgical
        )
      }
      // we may need to transform mesh vertices to the orthogonal voxel space
      const mx = mat4.clone(obj.modelViewProjectionMatrix)
      mat4.multiply(mx, mx, mesh2ortho)
      this.drawMesh3D(
        true,
        1,
        mx, // obj.modelViewProjectionMatrix,
        obj.modelMatrix,
        obj.normalMatrix
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
  draw2D(
    leftTopWidthHeight: number[],
    axCorSag: SLICE_TYPE,
    customMM = NaN,
    imageWidthHeight: number[] = [NaN, NaN]
  ): void {
    const padLeftTop = [NaN, NaN]
    if (imageWidthHeight[0] === Infinity) {
      const volScale = this.sliceScale().volScale
      let scale = this.scaleSlice(volScale[0], volScale[1], [0, 0], [leftTopWidthHeight[2], leftTopWidthHeight[3]])
      if (axCorSag === SLICE_TYPE.CORONAL) {
        scale = this.scaleSlice(volScale[0], volScale[2], [0, 0], [leftTopWidthHeight[2], leftTopWidthHeight[3]])
      }
      if (axCorSag === SLICE_TYPE.SAGITTAL) {
        scale = this.scaleSlice(volScale[1], volScale[2], [0, 0], [leftTopWidthHeight[2], leftTopWidthHeight[3]])
      }
      imageWidthHeight[0] = scale[2]
      imageWidthHeight[1] = scale[3]
    }
    if (isNaN(imageWidthHeight[0])) {
      this.draw2DMain(leftTopWidthHeight, axCorSag, customMM)
    } else {
      // inset as padded in tile
      const ltwh = leftTopWidthHeight.slice()
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
    if (leftTopWidthHeight[2] !== 0 && leftTopWidthHeight[3] !== 0 && this.opts.isOrientationTextVisible) {
      // issue1065
      this.drawSliceOrientationText(leftTopWidthHeight, axCorSag, padLeftTop)
    }
  }

  /**
   * Computes 3D model-view-projection matrices based on view angles and canvas size.
   * @internal
   */
  calculateMvpMatrix(_unused: unknown, leftTopWidthHeight = [0, 0, 0, 0], azimuth: number, elevation: number): mat4[] {
    if (leftTopWidthHeight[2] === 0 || leftTopWidthHeight[3] === 0) {
      // use full canvas
      leftTopWidthHeight = [0, 0, this.gl.canvas.width, this.gl.canvas.height]
    }
    const whratio = leftTopWidthHeight[2] / leftTopWidthHeight[3]
    // let whratio = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
    // pivot from center of objects
    // let scale = this.furthestVertexFromOrigin;
    // let origin = [0,0,0];
    let scale = this.furthestFromPivot
    const origin = this.pivot3D
    const projectionMatrix = mat4.create()
    scale = (0.8 * scale) / this.scene.volScaleMultiplier // 2.0 WebGL viewport has range of 2.0 [-1,-1]...[1,1]
    if (whratio < 1) {
      // tall window: "portrait" mode, width constrains
      mat4.ortho(projectionMatrix, -scale, scale, -scale / whratio, scale / whratio, scale * 0.01, scale * 8.0)
    }
    // Wide window: "landscape" mode, height constrains
    else {
      mat4.ortho(projectionMatrix, -scale * whratio, scale * whratio, -scale, scale, scale * 0.01, scale * 8.0)
    }

    const modelMatrix = mat4.create()
    modelMatrix[0] = -1 // mirror X coordinate
    // push the model away from the camera so camera not inside model
    const translateVec3 = vec3.fromValues(0, 0, -scale * 1.8) // to avoid clipping, >= SQRT(3)
    mat4.translate(modelMatrix, modelMatrix, translateVec3)
    if (this.position) {
      mat4.translate(modelMatrix, modelMatrix, this.position)
    }
    // apply elevation
    mat4.rotateX(modelMatrix, modelMatrix, deg2rad(270 - elevation))
    // apply azimuth
    mat4.rotateZ(modelMatrix, modelMatrix, deg2rad(azimuth - 180))

    mat4.translate(modelMatrix, modelMatrix, [-origin[0], -origin[1], -origin[2]])

    //
    const iModelMatrix = mat4.create()
    mat4.invert(iModelMatrix, modelMatrix)
    const normalMatrix = mat4.create()
    mat4.transpose(normalMatrix, iModelMatrix)
    const modelViewProjectionMatrix = mat4.create()
    mat4.multiply(modelViewProjectionMatrix, projectionMatrix, modelMatrix)
    return [modelViewProjectionMatrix, modelMatrix, normalMatrix]
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
    const modelMatrix = mat4.create()
    modelMatrix[0] = -1 // mirror X coordinate
    // push the model away from the camera so camera not inside model
    // apply elevation
    mat4.rotateX(modelMatrix, modelMatrix, deg2rad(270 - elevation))
    // apply azimuth
    mat4.rotateZ(modelMatrix, modelMatrix, deg2rad(azimuth - 180))
    if (this.back.obliqueRAS) {
      const oblique = mat4.clone(this.back.obliqueRAS)
      mat4.multiply(modelMatrix, modelMatrix, oblique)
    }
    return modelMatrix
  }

  /**
   * Returns the normalized near-to-far ray direction for the given view angles.
   * Ensures components are nonzero to avoid divide-by-zero errors.
   * @internal
   */
  calculateRayDirection(azimuth: number, elevation: number): vec3 {
    const modelMatrix = this.calculateModelMatrix(azimuth, elevation)
    // from NIfTI spatial coordinates (X=right, Y=anterior, Z=superior) to WebGL (screen X=right,Y=up, Z=depth)
    const projectionMatrix = mat4.fromValues(1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)
    const mvpMatrix = mat4.create()
    mat4.multiply(mvpMatrix, projectionMatrix, modelMatrix)
    const inv = mat4.create()
    mat4.invert(inv, mvpMatrix)
    const rayDir4 = vec4.fromValues(0, 0, -1, 1)
    vec4.transformMat4(rayDir4, rayDir4, inv)
    const rayDir = vec3.fromValues(rayDir4[0], rayDir4[1], rayDir4[2])
    vec3.normalize(rayDir, rayDir)
    // defuzz, avoid divide by zero
    const tiny = 0.00005
    if (Math.abs(rayDir[0]) < tiny) {
      rayDir[0] = tiny
    }
    if (Math.abs(rayDir[1]) < tiny) {
      rayDir[1] = tiny
    }
    if (Math.abs(rayDir[2]) < tiny) {
      rayDir[2] = tiny
    }
    return rayDir
  }

  /**
   * Returns the scene's min, max, and range extents in mm or voxel space.
   * Includes both volume and mesh geometry.
   * @internal
   */
  sceneExtentsMinMax(isSliceMM = true): vec3[] {
    let mn = vec3.fromValues(0, 0, 0)
    let mx = vec3.fromValues(0, 0, 0)
    if (this.volumes.length > 0) {
      if (!this.volumeObject3D) {
        throw new Error('volumeObject3D undefined')
      }
      mn = vec3.fromValues(
        this.volumeObject3D.extentsMin[0],
        this.volumeObject3D.extentsMin[1],
        this.volumeObject3D.extentsMin[2]
      )
      mx = vec3.fromValues(
        this.volumeObject3D.extentsMax[0],
        this.volumeObject3D.extentsMax[1],
        this.volumeObject3D.extentsMax[2]
      )
      if (!isSliceMM) {
        mn = vec3.fromValues(
          this.volumes[0].extentsMinOrtho![0],
          this.volumes[0].extentsMinOrtho![1],
          this.volumes[0].extentsMinOrtho![2]
        )
        mx = vec3.fromValues(
          this.volumes[0].extentsMaxOrtho![0],
          this.volumes[0].extentsMaxOrtho![1],
          this.volumes[0].extentsMaxOrtho![2]
        )
      }
    }
    if (this.meshes.length > 0) {
      if (this.volumes.length < 1) {
        const minExtents = this.meshes[0].extentsMin as number[]
        const maxExtents = this.meshes[0].extentsMax as number[]
        mn = vec3.fromValues(minExtents[0], minExtents[1], minExtents[2])
        mx = vec3.fromValues(maxExtents[0], maxExtents[1], maxExtents[2])
      }
      for (let i = 0; i < this.meshes.length; i++) {
        const minExtents = this.meshes[i].extentsMin as number[]
        const maxExtents = this.meshes[i].extentsMax as number[]
        const vmn = vec3.fromValues(minExtents[0], minExtents[1], minExtents[2])
        vec3.min(mn, mn, vmn)
        const vmx = vec3.fromValues(maxExtents[0], maxExtents[1], maxExtents[2])
        vec3.max(mx, mx, vmx)
      }
    }
    const range = vec3.create()
    vec3.subtract(range, mx, mn)
    return [mn, mx, range]
  }

  /**
   * Sets the 3D pivot point and scene scale based on volume and mesh extents.
   * @internal
   */
  setPivot3D(): void {
    // compute extents of all volumes and meshes in scene
    // pivot around center of these.
    const [mn, mx] = this.sceneExtentsMinMax()
    const pivot = vec3.create()
    // pivot is half way between min and max:
    vec3.add(pivot, mn, mx)
    vec3.scale(pivot, pivot, 0.5)
    this.pivot3D = [pivot[0], pivot[1], pivot[2]]
    // find scale of scene
    vec3.subtract(pivot, mx, mn)
    this.extentsMin = mn
    this.extentsMax = mx
    this.furthestFromPivot = vec3.length(pivot) * 0.5 // pivot is half way between the extreme vertices
  }

  /**
   * Returns the maximum number of 4D volumes across all loaded images.
   * @internal
   */
  getMaxVols(): number {
    if (this.volumes.length < 1) {
      return 0
    }
    let maxVols = 0
    for (let i = 0; i < this.volumes.length; i++) {
      maxVols = Math.max(maxVols, this.volumes[i].nFrame4D!)
    }
    return maxVols
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
    let axialTop = 0
    if (this.graph.autoSizeMultiplanar && this.opts.sliceType === SLICE_TYPE.MULTIPLANAR) {
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
    if (graph.opacity <= 0.0 || graph.LTWH[2] <= 5 || graph.LTWH[3] <= 5) {
      return
    }
    if (Math.floor(graph.LTWH[0] + graph.LTWH[2]) > this.gl.canvas.width) {
      return // issue 930
    }
    // issue1073 add "floor" for rounding errors (211.792+392.207 > 604)
    if (Math.floor(graph.LTWH[1] + graph.LTWH[3]) > this.gl.canvas.height) {
      return // issue 930
    }
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
    const vols = []
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
    // find min, max, range for all lines
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
    this.drawRect(graph.LTWH, graph.backColor)
    const [spacing, ticMin, ticMax] = tickSpacing(mn, mx)
    const digits = Math.max(0, -1 * Math.floor(Math.log(spacing) / Math.log(10)))
    mn = Math.min(ticMin, mn)
    mx = Math.max(ticMax, mx)
    // determine font size
    function humanize(x: number): string {
      // drop trailing zeros from numerical string
      return x.toFixed(6).replace(/\.?0*$/, '')
    }
    let fntSize = this.fontPx * 0.7
    const screenWidthPts = this.gl.canvas.width / this.uiData.dpr
    const screenHeightPts = this.gl.canvas.height / this.uiData.dpr
    const screenAreaPts = screenWidthPts * screenHeightPts
    // Reference canvas area in points (800×600)
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
      this.drawLine(
        [plotLTWH[0] - halfThick, y, plotLTWH[0] + plotLTWH[2] + graph.gridLineThickness, y],
        graph.gridLineThickness,
        graph.lineColor
      )
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
        const LTWH = [
          plotLTWH[0] + x0,
          plotLTWH[1] + plotLTWH[3] - y0,
          plotLTWH[0] + x1,
          plotLTWH[1] + plotLTWH[3] - y1
        ]
        this.drawLine(LTWH, graph.lineThickness, lineRGBA)
      }
    }
    // draw vertical line indicating selected volume
    if (graph.selectedColumn! >= 0 && graph.selectedColumn! < graph.lines[0].length) {
      const x = graph.selectedColumn! * scaleW + plotLTWH[0]
      this.drawLine([x, plotLTWH[1], x, plotLTWH[1] + plotLTWH[3]], graph.lineThickness, [
        graph.lineRGB[0][0],
        graph.lineRGB[0][1],
        graph.lineRGB[0][2],
        selectedLineAlpha
      ])
    }
    // add label 'Volume' below graph if there is space in the plot
    if (fntSize > 0 && graph.LTWH[1] + graph.LTWH[3] > plotLTWH[1] + plotLTWH[3] + fntSize * 2.4) {
      this.drawTextBelow(
        [plotLTWH[0] + 0.5 * plotLTWH[2], plotLTWH[1] + plotLTWH[3] + fntSize * 1.2],
        'Volume',
        fntScale,
        graph.textColor
      )
    }
    if (this.detectPartialllyLoaded4D()) {
      this.drawTextBelow(
        [plotLTWH[0] + plotLTWH[2], plotLTWH[1] + plotLTWH[3] + fntSize * 0.5],
        '...',
        fntScale,
        graph.textColor
      )
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
    if (this.volumes.length === 0) {
      return
    }
    const gl = this.gl
    const rayDir = this.calculateRayDirection(azimuth, elevation)
    const object3D = this.volumeObject3D
    if (object3D) {
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.enable(gl.CULL_FACE)
      gl.cullFace(gl.FRONT) // TH switch since we L/R flipped in calculateMvpMatrix
      let shader = this.renderShader!
      if (this.uiData.mouseDepthPicker) {
        shader = this.pickingImageShader!
      }
      shader.use(this.gl)
      // next lines optional: these textures should be bound by default
      // these lines can cause warnings, e.g. if drawTexture not used or created
      // gl.activeTexture(TEXTURE0_BACK_VOL)
      // gl.bindTexture(gl.TEXTURE_3D, this.volumeTexture)
      // gl.activeTexture(TEXTURE1_COLORMAPS)
      // gl.bindTexture(gl.TEXTURE_2D, this.colormapTexture)
      // gl.activeTexture(TEXTURE2_OVERLAY_VOL)
      // gl.bindTexture(gl.TEXTURE_3D, this.overlayTexture)
      // gl.activeTexture(TEXTURE7_DRAW)
      // gl.bindTexture(gl.TEXTURE_3D, this.drawTexture)
      // gl.activeTexture(TEXTURE8_PAQD)
      // gl.bindTexture(gl.TEXTURE_3D, this.paqdTexture)
      gl.uniform1i(shader.uniforms.backgroundMasksOverlays, this.backgroundMasksOverlays)
      if (this.gradientTextureAmount > 0.0 && shader.uniforms.normMtx && this.gradientTexture) {
        gl.activeTexture(TEXTURE6_GRADIENT)
        gl.bindTexture(gl.TEXTURE_3D, this.gradientTexture)
        const modelMatrix = this.calculateModelMatrix(azimuth, elevation)
        const iModelMatrix = mat4.create()
        mat4.invert(iModelMatrix, modelMatrix)
        const normalMatrix = mat4.create()
        mat4.transpose(normalMatrix, iModelMatrix)
        gl.uniformMatrix4fv(shader.uniforms.normMtx, false, normalMatrix)
      }
      if (this.drawBitmap && this.drawBitmap.length > 8) {
        gl.uniform2f(shader.uniforms.renderDrawAmbientOcclusionXY, this.renderDrawAmbientOcclusion, this.drawOpacity)
      } else {
        gl.uniform2f(shader.uniforms.renderDrawAmbientOcclusionXY, this.renderDrawAmbientOcclusion, 0.0)
      }
      this.gl.uniform4fv(shader.uniforms.paqdUniforms, this.opts.paqdUniforms)
      gl.uniformMatrix4fv(shader.uniforms.mvpMtx, false, mvpMatrix)
      gl.uniformMatrix4fv(shader.uniforms.matRAS, false, this.back!.matRAS!)
      gl.uniform3fv(shader.uniforms.rayDir, rayDir)

      if (this.gradientTextureAmount < 0.0) {
        // use slice shader
        gl.uniform4fv(shader.uniforms.clipPlane, [
          this.scene.crosshairPos[0],
          this.scene.crosshairPos[1],
          this.scene.crosshairPos[2],
          30
        ])
      } else {
        gl.uniform4fv(shader.uniforms.clipPlane, this.scene.clipPlane)
      }
      gl.uniform1f(shader.uniforms.drawOpacity, 1.0)

      gl.bindVertexArray(object3D.vao)
      gl.drawElements(object3D.mode, object3D.indexCount, gl.UNSIGNED_SHORT, 0)
      gl.bindVertexArray(this.unusedVAO)
    }
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
    mat4.translate(modelMatrix, modelMatrix, [
      1.8 * sz + leftTopWidthHeight[0],
      translateUpForColorbar + 1.8 * sz + leftTopWidthHeight[1],
      0
    ])
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
      return parseFloat(flt.toFixed(decimals))
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
          if (
            this.volumes[i].hdr.intent_code === NiiIntentCode.NIFTI_INTENT_LABEL &&
            this.volumes[i].hdr.datatypeCode === NiiDataType.DT_RGBA32
          ) {
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
          } else if (
            v >= 0 &&
            this.volumes[i].colormapLabel!.labels &&
            v < this.volumes[i].colormapLabel!.labels!.length
          ) {
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
  addLabel(
    text: string,
    style: NVLabel3DStyle,
    points?: number[] | number[][],
    anchor?: LabelAnchorPoint,
    onClick?: (label: NVLabel3D) => void
  ): NVLabel3D {
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
    if (
      screenPoint[0] < left ||
      screenPoint[1] < top ||
      screenPoint[0] > left + panelWidth ||
      screenPoint[1] > top + panelHeight
    ) {
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
    const points =
      Array.isArray(label.points) && Array.isArray(label.points[0])
        ? (label.points as Array<[number, number, number]>)
        : ([label.points] as Array<[number, number, number]>)
    for (const point of points) {
      const screenPoint = this.calculateScreenPoint(point, mvpMatrix, leftTopWidthHeight)
      if (!secondPass) {
        // draw line
        this.draw3DLine(
          pos,
          [screenPoint[0], screenPoint[1], screenPoint[2]],
          label.style.lineWidth,
          label.style.lineColor
        )
      } else {
        this.drawDottedLine([...pos, screenPoint[0], screenPoint[1]], label.style.lineWidth, label.style.lineColor)
      }
    }
  }

  /**
   * Render a 3D label with optional leader lines, bullet markers, and text alignment within a legend.
   * @internal
   */
  draw3DLabel(
    label: NVLabel3D,
    pos: vec2,
    mvpMatrix?: mat4,
    leftTopWidthHeight?: number[],
    bulletMargin?: number,
    legendWidth?: number,
    secondPass?: boolean,
    scaling: number = 1.0
  ): void {
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
      gl.depthFunc(gl.GREATER)
    }

    for (const label of labels) {
      this.draw3DLabel(
        label,
        [left, top],
        mvpMatrix,
        leftTopWidthHeight,
        bulletMargin,
        panelWidth,
        secondPass,
        this.legendFontScaling
      )

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
      this.drawRect(
        [left + rectHorizontalOffset, top + rectVerticalOffset, textWidth + rectWidthDiff, textHeight + rectHeightDiff],
        label.style.backgroundColor
      )
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
    const isMosaic = azimuth !== null
    this.setPivot3D()
    if (!isMosaic) {
      azimuth = this.scene.renderAzimuth
      elevation = this.scene.renderElevation
    }
    const gl = this.gl
    if (mvpMatrix === null) {
      ;[mvpMatrix, modelMatrix, normalMatrix] = this.calculateMvpMatrix(null, leftTopWidthHeight, azimuth!, elevation)
    }

    let relativeLTWH = [...leftTopWidthHeight]
    if (leftTopWidthHeight[2] === 0 || leftTopWidthHeight[3] === 0) {
      // use full canvas
      leftTopWidthHeight = [0, 0, gl.canvas.width, gl.canvas.height]
      relativeLTWH = [...leftTopWidthHeight]
      this.screenSlices.push({
        leftTopWidthHeight,
        axCorSag: SLICE_TYPE.RENDER,
        sliceFrac: 0,
        AxyzMxy: [],
        leftTopMM: [],
        fovMM: [isRadiological(modelMatrix!), 0]
      })
    } else {
      this.screenSlices.push({
        leftTopWidthHeight: leftTopWidthHeight.slice(),
        axCorSag: SLICE_TYPE.RENDER,
        sliceFrac: 0,
        AxyzMxy: [],
        leftTopMM: [],
        fovMM: [isRadiological(modelMatrix!), 0]
      })
      leftTopWidthHeight[1] = gl.canvas.height - leftTopWidthHeight[3] - leftTopWidthHeight[1]
    }
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.ALWAYS)
    gl.depthMask(true)
    gl.clearDepth(0.0)
    this.draw3DLabels(mvpMatrix, relativeLTWH, false)

    gl.viewport(leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3])

    if (this.volumes.length > 0) {
      this.updateInterpolation(0, true) // force background interpolation
      this.updateInterpolation(1, true) // force overlay interpolation
      this.drawImage3D(mvpMatrix, azimuth!, elevation)
    }
    this.updateInterpolation(0) // use default background interpolation for 2D slices
    this.updateInterpolation(1) // use default overlay interpolation for 2D slices
    if (!isMosaic) {
      this.drawCrosshairs3D(true, 1.0, mvpMatrix)
    }
    this.drawMesh3D(true, 1.0, mvpMatrix, modelMatrix!, normalMatrix!)
    if (this.uiData.mouseDepthPicker) {
      this.depthPicker(leftTopWidthHeight, mvpMatrix)
      this.createOnLocationChange()
      // redraw with render shader
      this.draw3D(leftTopWidthHeight, mvpMatrix, modelMatrix, normalMatrix, azimuth, elevation)
      return
    }
    if (this.opts.meshXRay > 0.0) {
      this.drawMesh3D(false, this.opts.meshXRay, mvpMatrix, modelMatrix!, normalMatrix!)
    }

    //
    this.draw3DLabels(mvpMatrix, relativeLTWH, false)

    gl.viewport(leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3])
    //
    if (!isMosaic) {
      this.drawCrosshairs3D(false, 0.15, mvpMatrix)
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    this.drawOrientationCube(leftTopWidthHeight, azimuth!, elevation)
    const posString =
      'azimuth: ' + this.scene.renderAzimuth.toFixed(0) + ' elevation: ' + this.scene.renderElevation.toFixed(0)
    // this.drawGraph();
    // bus.$emit('crosshair-pos-change', posString);
    this.readyForSync = true
    this.sync()
    this.draw3DLabels(mvpMatrix, relativeLTWH, true)

    return posString
  }

  /**
   * Render all visible 3D meshes with proper blending, depth, and shader settings.
   * @internal
   */
  drawMesh3D(isDepthTest = true, alpha = 1.0, m?: mat4, modelMtx?: mat4, normMtx?: mat4): void {
    if (this.meshes.length < 1) {
      return
    }
    const gl = this.gl
    // let m, modelMtx, normMtx;
    if (!m) {
      // FIXME this was calculateMvpMatrix(object3d, azimuth, elevation) -- i.e. elevation got assigned to azimuth etc.
      ;[m, modelMtx, normMtx] = this.calculateMvpMatrix(
        this.volumeObject3D,
        undefined,
        this.scene.renderAzimuth,
        this.scene.renderElevation
      )
    }
    gl.enable(gl.DEPTH_TEST)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    gl.disable(gl.BLEND)
    gl.depthFunc(gl.GREATER)
    gl.disable(gl.CULL_FACE)
    if (isDepthTest) {
      gl.depthFunc(gl.GREATER)
    } else {
      gl.enable(gl.BLEND)
      gl.depthFunc(gl.ALWAYS)
      gl.enable(gl.CULL_FACE) // issue700
    }
    gl.cullFace(gl.BACK) // CR: issue700
    // show front and back face for mesh clipping https://niivue.com/demos/features/worldspace2.html
    // if (this.opts.meshThicknessOn2D !== Infinity) gl.disable(gl.CULL_FACE);
    // else gl.enable(gl.CULL_FACE); //issue700: only show front faces
    // gl.frontFace(gl.CCW); //issue700: we now require CCW
    // Draw the mesh
    let shader: Shader = this.meshShaders[0].shader!
    // this.meshShaderIndex
    let hasFibers = false
    for (let i = 0; i < this.meshes.length; i++) {
      if (this.meshes[i].visible === false || this.meshes[i].opacity <= 0.0) {
        continue
      }
      let meshAlpha = alpha
      // gl.depthMask(false)
      if (isDepthTest) {
        meshAlpha = this.meshes[i].opacity
        gl.depthFunc(gl.GREATER)
        gl.depthMask(true)
        if (meshAlpha < 1.0) {
          // crude Z-fighting artifacts
          gl.depthMask(false) // Prevent this object from writing to the depth buffer
          gl.enable(gl.DEPTH_TEST)
          // gl.disable(gl.DEPTH_TEST)
          gl.enable(gl.BLEND)
          gl.cullFace(gl.BACK)
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        } else {
          gl.enable(gl.DEPTH_TEST)
          gl.disable(gl.BLEND)
        }
      }
      shader = this.meshShaders[this.meshes[i].meshShaderIndex].shader!
      if (this.uiData.mouseDepthPicker) {
        shader = this.pickingMeshShader!
      }
      shader.use(this.gl) // set Shader
      // set shader uniforms
      gl.uniformMatrix4fv(shader.uniforms.mvpMtx, false, m)
      // gl.uniformMatrix4fv(shader.uniforms["modelMtx"], false, modelMtx);
      // gl.uniformMatrix4fv(shader.uniforms["normMtx"], false, normMtx);
      // gl.uniform1f(shader.uniforms["opacity"], alpha);
      gl.uniformMatrix4fv(shader.uniforms.normMtx, false, normMtx!)
      gl.uniform1f(shader.uniforms.opacity, meshAlpha)
      if (this.meshes[i].indexCount! < 3) {
        continue
      }

      if (this.meshes[i].offsetPt0 && (this.meshes[i].fiberSides < 3 || this.meshes[i].fiberRadius <= 0)) {
        // if fibers has less than 3 sides, render as line not cylinder mesh
        hasFibers = true
        continue
      }
      if (shader.isMatcap) {
        gl.activeTexture(TEXTURE5_MATCAP)
        gl.bindTexture(gl.TEXTURE_2D, this.matCapTexture)
      }
      gl.bindVertexArray(this.meshes[i].vao)
      gl.drawElements(gl.TRIANGLES, this.meshes[i].indexCount!, gl.UNSIGNED_INT, 0)
      gl.bindVertexArray(this.unusedVAO)
    }
    gl.depthMask(true)
    // draw fibers
    if (!hasFibers) {
      gl.enable(gl.BLEND)
      gl.depthFunc(gl.ALWAYS)
      return
    }
    shader = this.fiberShader!
    shader.use(this.gl)
    gl.uniformMatrix4fv(shader.uniforms.mvpMtx, false, m)
    gl.uniform1f(shader.uniforms.opacity, alpha)
    for (let i = 0; i < this.meshes.length; i++) {
      if (this.meshes[i].indexCount! < 3) {
        continue
      }
      if (!this.meshes[i].offsetPt0) {
        continue
      }
      if (this.meshes[i].fiberSides >= 3 && this.meshes[i].fiberRadius > 0) {
        continue // rendered as mesh cylinder, not line strip
      }
      gl.bindVertexArray(this.meshes[i].vaoFiber)
      gl.drawElements(gl.LINE_STRIP, this.meshes[i].indexCount!, gl.UNSIGNED_INT, 0)
      gl.bindVertexArray(this.unusedVAO)
    }
    gl.enable(gl.BLEND)
    gl.depthFunc(gl.ALWAYS)
    this.readyForSync = true
  }

  /**
   * Render 3D crosshairs at the current crosshair position with optional depth testing and transparency.
   * @internal
   */
  drawCrosshairs3D(
    isDepthTest = true,
    alpha = 1.0,
    mvpMtx: mat4 | null = null,
    is2DView = false,
    isSliceMM = true
  ): void {
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
    if (
      this.crosshairs3D === null ||
      this.crosshairs3D.mm![0] !== mm[0] ||
      this.crosshairs3D.mm![1] !== mm[1] ||
      this.crosshairs3D.mm![2] !== mm[2]
    ) {
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
      ;[mvpMtx] = this.calculateMvpMatrix(
        this.crosshairs3D,
        undefined,
        this.scene.renderAzimuth,
        this.scene.renderElevation
      )
    }
    gl.uniformMatrix4fv(crosshairsShader.uniforms.mvpMtx, false, mvpMtx)
    gl.disable(gl.CULL_FACE)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.crosshairs3D.indexBuffer)
    gl.enable(gl.DEPTH_TEST)
    const color = [...this.opts.crosshairColor]
    if (isDepthTest) {
      gl.disable(gl.BLEND)
      // gl.depthFunc(gl.LESS); //pass if LESS than incoming value
      gl.depthFunc(gl.GREATER)
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
    // given mm, return volume fraction
    if (this.volumes.length < 1) {
      const frac = vec3.fromValues(0.1, 0.5, 0.5)
      const [mn, _mx, range] = this.sceneExtentsMinMax()
      frac[0] = (mm[0] - mn[0]) / range[0]
      frac[1] = (mm[1] - mn[1]) / range[1]
      frac[2] = (mm[2] - mn[2]) / range[2]
      // FIXME this makes no sense, frac is an array
      // @ts-expect-error -- not sure what should happen here
      if (!isFinite(frac)) {
        if (!isFinite(frac[0])) {
          frac[0] = 0.5
        }
        if (!isFinite(frac[1])) {
          frac[1] = 0.5
        }
        if (!isFinite(frac[2])) {
          frac[2] = 0.5
        }
        if (this.meshes.length < 1) {
          log.error('mm2frac() not finite: objects not (yet) loaded.')
        }
      }
      return frac
    }
    return this.volumes[volIdx].convertMM2Frac(mm, isForceSliceMM || this.opts.isSliceMM)
  }

  /**
   * Convert voxel coordinates to fractional volume coordinates for the specified volume.
   * @internal
   */
  vox2frac(vox: vec3, volIdx = 0): vec3 {
    return this.volumes[volIdx].convertVox2Frac(vox)
  }

  /**
   * Convert fractional volume coordinates to voxel coordinates for the specified volume.
   * @internal
   */
  frac2vox(frac: vec3, volIdx = 0): vec3 {
    // convert from normalized texture space XYZ= [0..1, 0..1 ,0..1] to 0-index voxel space [0..dim[1]-1, 0..dim[2]-1, 0..dim[3]-1]
    // consider dimension with 3 voxels, the voxel centers are at 0.25, 0.5, 0.75 corresponding to 0,1,2
    if (this.volumes.length <= volIdx) {
      return [0, 0, 0]
    }

    return this.volumes[volIdx].convertFrac2Vox(frac)
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
    const vox = this.frac2vox(this.scene.crosshairPos)
    const vox2 = vox[2]
    vox[0] += x
    vox[1] += y
    vox[2] += z
    vox[0] = clamp(vox[0], 0, this.volumes[0].dimsRAS![1] - 1)
    vox[1] = clamp(vox[1], 0, this.volumes[0].dimsRAS![2] - 1)
    vox[2] = clamp(vox[2], 0, this.volumes[0].dimsRAS![3] - 1)
    this.scene.crosshairPos = this.vox2frac(vox)
    this.createOnLocationChange()
    if (this.opts.is2DSliceShader && vox2 !== vox[2]) {
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
    const pos = vec4.fromValues(frac[0], frac[1], frac[2], 1)
    if (this.volumes.length > 0) {
      return this.volumes[volIdx].convertFrac2MM(frac, isForceSliceMM || this.opts.isSliceMM)
    } else {
      const [mn, mx] = this.sceneExtentsMinMax()
      const lerp = (x: number, y: number, a: number): number => x * (1 - a) + y * a
      pos[0] = lerp(mn[0], mx[0], frac[0])
      pos[1] = lerp(mn[1], mx[1], frac[1])
      pos[2] = lerp(mn[2], mx[2], frac[2])
    }
    return pos
  }

  /**
   * Convert screen pixel coordinates to texture fractional coordinates for the given slice index.
   * @internal
   */
  screenXY2TextureFrac(x: number, y: number, i: number, restrict0to1 = true): vec3 {
    const texFrac = vec3.fromValues(-1, -1, -1) // texture 0..1 so -1 is out of bounds
    const axCorSag = this.screenSlices[i].axCorSag
    if (axCorSag > SLICE_TYPE.SAGITTAL) {
      return texFrac
    }
    const ltwh = this.screenSlices[i].leftTopWidthHeight.slice()
    let isMirror = false
    if (ltwh[2] < 0) {
      isMirror = true
      ltwh[0] += ltwh[2]
      ltwh[2] = -ltwh[2]
    }
    let fracX = (x - ltwh[0]) / ltwh[2]
    if (isMirror) {
      fracX = 1.0 - fracX
    }
    const fracY = 1.0 - (y - ltwh[1]) / ltwh[3]
    if (fracX < 0.0 || fracX > 1.0 || fracY < 0.0 || fracY > 1.0) {
      return texFrac
    }
    if (this.screenSlices[i].AxyzMxy.length < 4) {
      return texFrac
    }
    let xyzMM = vec3.fromValues(0, 0, 0)
    xyzMM[0] = this.screenSlices[i].leftTopMM[0] + fracX * this.screenSlices[i].fovMM[0]
    xyzMM[1] = this.screenSlices[i].leftTopMM[1] + fracY * this.screenSlices[i].fovMM[1]
    // let xyz = vec3.fromValues(30, 30, 0);
    const v = this.screenSlices[i].AxyzMxy
    xyzMM[2] = v[2] + v[4] * (xyzMM[1] - v[1]) - v[3] * (xyzMM[0] - v[0])
    if (axCorSag === SLICE_TYPE.CORONAL) {
      xyzMM = swizzleVec3(xyzMM, [0, 2, 1])
    } // screen RSA to NIfTI RAS
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
      xyzMM = swizzleVec3(xyzMM, [2, 0, 1])
    } // screen ASR to NIfTI RAS
    const xyz = this.mm2frac(xyzMM)
    if (restrict0to1) {
      if (xyz[0] < 0 || xyz[0] > 1 || xyz[1] < 0 || xyz[1] > 1 || xyz[2] < 0 || xyz[2] > 1) {
        return texFrac
      }
    }
    return xyz
  }

  /**
   * Converts a canvas position to fractional texture coordinates.
   * @internal
   */
  canvasPos2frac(canvasPos: number[]): vec3 {
    for (let i = 0; i < this.screenSlices.length; i++) {
      const texFrac = this.screenXY2TextureFrac(canvasPos[0], canvasPos[1], i)
      if (texFrac[0] >= 0) {
        return texFrac
      }
    }
    return [-1, -1, -1] // texture 0..1 so -1 is out of bounds
  }

  /**
   * Convert fractional volume coordinates to canvas pixel coordinates.
   * Returns the first valid screen slice that contains the fractional coordinates.
   * @internal
   */
  /**
   * Convert fractional volume coordinates to canvas pixel coordinates with tile information.
   * Returns both canvas position and the tile index for validation.
   * @internal
   */
  frac2canvasPosWithTile(frac: vec3, preferredSliceType?: SLICE_TYPE): { pos: number[]; tileIndex: number } | null {
    // Convert fractional coordinates to world coordinates
    const worldMM = this.frac2mm(frac)

    // Try to find a screen slice that can display this world coordinate
    // First pass: look for exact matches, prioritizing preferred slice type
    let bestMatch = { index: -1, distance: Infinity }

    for (let i = 0; i < this.screenSlices.length; i++) {
      const axCorSag = this.screenSlices[i].axCorSag

      // Only handle 2D slices (axial, coronal, sagittal)
      if (axCorSag > SLICE_TYPE.SAGITTAL) {
        continue
      }

      // Check if slice has valid transformation data
      if (this.screenSlices[i].AxyzMxy.length < 4) {
        continue
      }

      // Prioritize preferred slice type if specified
      if (preferredSliceType !== undefined && axCorSag !== preferredSliceType) {
        continue
      }

      // Start with world coordinates
      let xyzMM = vec3.fromValues(worldMM[0], worldMM[1], worldMM[2])

      // Apply inverse coordinate swizzling based on slice orientation
      if (axCorSag === SLICE_TYPE.CORONAL) {
        xyzMM = swizzleVec3(xyzMM, [0, 2, 1]) // NIfTI RAS to screen RSA
      }
      if (axCorSag === SLICE_TYPE.SAGITTAL) {
        xyzMM = swizzleVec3(xyzMM, [1, 2, 0]) // NIfTI RAS to screen ASR
      }

      // Check if this point lies on the slice plane
      const v = this.screenSlices[i].AxyzMxy
      const expectedZ = v[2] + v[4] * (xyzMM[1] - v[1]) - v[3] * (xyzMM[0] - v[0])

      // Calculate distance from the slice plane
      const distance = Math.abs(xyzMM[2] - expectedZ)

      // Allow larger tolerance for multiplanar mode where slices might not align perfectly
      const tolerance = this.opts.sliceType === SLICE_TYPE.MULTIPLANAR ? 1.0 : 0.1

      // Keep track of the best matching slice
      if (distance < bestMatch.distance) {
        bestMatch = { index: i, distance }
      }

      // If within tolerance, try to use this slice
      if (distance <= tolerance) {
        // Convert world coordinates to normalized slice coordinates
        const fracX = (xyzMM[0] - this.screenSlices[i].leftTopMM[0]) / this.screenSlices[i].fovMM[0]
        const fracY = (xyzMM[1] - this.screenSlices[i].leftTopMM[1]) / this.screenSlices[i].fovMM[1]

        // Check if coordinates are within valid slice bounds
        if (fracX >= 0.0 && fracX <= 1.0 && fracY >= 0.0 && fracY <= 1.0) {
          // Convert normalized slice coordinates to screen coordinates
          const ltwh = this.screenSlices[i].leftTopWidthHeight.slice()
          let isMirror = false

          // Handle mirrored/flipped display
          if (ltwh[2] < 0) {
            isMirror = true
            ltwh[0] += ltwh[2]
            ltwh[2] = -ltwh[2]
          }

          let screenFracX = fracX
          if (isMirror) {
            screenFracX = 1.0 - fracX
          }
          const screenFracY = 1.0 - fracY

          // Convert to screen pixel coordinates
          const screenX = ltwh[0] + screenFracX * ltwh[2]
          const screenY = ltwh[1] + screenFracY * ltwh[3]

          return { pos: [screenX, screenY], tileIndex: i }
        }
      }
    }

    return null // no valid screen slice found
  }

  frac2canvasPos(frac: vec3): number[] | null {
    // Convert fractional coordinates to world coordinates
    const worldMM = this.frac2mm(frac)

    // Try to find a screen slice that can display this world coordinate
    // First pass: look for exact matches
    let bestMatch = { index: -1, distance: Infinity }

    for (let i = 0; i < this.screenSlices.length; i++) {
      const axCorSag = this.screenSlices[i].axCorSag

      // Only handle 2D slices (axial, coronal, sagittal)
      if (axCorSag > SLICE_TYPE.SAGITTAL) {
        continue
      }

      // Check if slice has valid transformation data
      if (this.screenSlices[i].AxyzMxy.length < 4) {
        continue
      }

      // Start with world coordinates
      let xyzMM = vec3.fromValues(worldMM[0], worldMM[1], worldMM[2])

      // Apply inverse coordinate swizzling based on slice orientation
      if (axCorSag === SLICE_TYPE.CORONAL) {
        xyzMM = swizzleVec3(xyzMM, [0, 2, 1]) // NIfTI RAS to screen RSA
      }
      if (axCorSag === SLICE_TYPE.SAGITTAL) {
        xyzMM = swizzleVec3(xyzMM, [1, 2, 0]) // NIfTI RAS to screen ASR
      }

      // Check if this point lies on the slice plane
      const v = this.screenSlices[i].AxyzMxy
      const expectedZ = v[2] + v[4] * (xyzMM[1] - v[1]) - v[3] * (xyzMM[0] - v[0])

      // Calculate distance from the slice plane
      const distance = Math.abs(xyzMM[2] - expectedZ)

      // Allow larger tolerance for multiplanar mode where slices might not align perfectly
      const tolerance = this.opts.sliceType === SLICE_TYPE.MULTIPLANAR ? 1.0 : 0.1

      // Keep track of the best matching slice
      if (distance < bestMatch.distance) {
        bestMatch = { index: i, distance }
      }

      // If within tolerance, try to use this slice
      if (distance <= tolerance) {
        // Convert world coordinates to normalized slice coordinates
        const fracX = (xyzMM[0] - this.screenSlices[i].leftTopMM[0]) / this.screenSlices[i].fovMM[0]
        const fracY = (xyzMM[1] - this.screenSlices[i].leftTopMM[1]) / this.screenSlices[i].fovMM[1]

        // Check if coordinates are within valid slice bounds
        if (fracX >= 0.0 && fracX <= 1.0 && fracY >= 0.0 && fracY <= 1.0) {
          // Convert normalized slice coordinates to screen coordinates
          const ltwh = this.screenSlices[i].leftTopWidthHeight.slice()
          let isMirror = false

          // Handle mirrored/flipped display
          if (ltwh[2] < 0) {
            isMirror = true
            ltwh[0] += ltwh[2]
            ltwh[2] = -ltwh[2]
          }

          let screenFracX = fracX
          if (isMirror) {
            screenFracX = 1.0 - fracX
          }
          const screenFracY = 1.0 - fracY

          // Convert to screen pixel coordinates
          const screenX = ltwh[0] + screenFracX * ltwh[2]
          const screenY = ltwh[1] + screenFracY * ltwh[3]

          return [screenX, screenY]
        }
      }
    }

    // If no slice was within tolerance but we have a best match, try to project onto it
    if (bestMatch.index >= 0 && bestMatch.distance < 2.0) {
      const i = bestMatch.index
      const axCorSag = this.screenSlices[i].axCorSag

      // Start with world coordinates
      let xyzMM = vec3.fromValues(worldMM[0], worldMM[1], worldMM[2])

      // Apply inverse coordinate swizzling based on slice orientation
      if (axCorSag === SLICE_TYPE.CORONAL) {
        xyzMM = swizzleVec3(xyzMM, [0, 2, 1]) // NIfTI RAS to screen RSA
      }
      if (axCorSag === SLICE_TYPE.SAGITTAL) {
        xyzMM = swizzleVec3(xyzMM, [1, 2, 0]) // NIfTI RAS to screen ASR
      }

      // Project the point onto the slice plane
      const v = this.screenSlices[i].AxyzMxy
      xyzMM[2] = v[2] + v[4] * (xyzMM[1] - v[1]) - v[3] * (xyzMM[0] - v[0])

      // Convert world coordinates to normalized slice coordinates
      const fracX = (xyzMM[0] - this.screenSlices[i].leftTopMM[0]) / this.screenSlices[i].fovMM[0]
      const fracY = (xyzMM[1] - this.screenSlices[i].leftTopMM[1]) / this.screenSlices[i].fovMM[1]

      // Check if coordinates are within valid slice bounds (with small margin)
      if (fracX >= -0.1 && fracX <= 1.1 && fracY >= -0.1 && fracY <= 1.1) {
        // Clamp to valid range
        const clampedFracX = Math.max(0, Math.min(1, fracX))
        const clampedFracY = Math.max(0, Math.min(1, fracY))

        // Convert normalized slice coordinates to screen coordinates
        const ltwh = this.screenSlices[i].leftTopWidthHeight.slice()
        let isMirror = false

        // Handle mirrored/flipped display
        if (ltwh[2] < 0) {
          isMirror = true
          ltwh[0] += ltwh[2]
          ltwh[2] = -ltwh[2]
        }

        let screenFracX = clampedFracX
        if (isMirror) {
          screenFracX = 1.0 - clampedFracX
        }
        const screenFracY = 1.0 - clampedFracY

        // Convert to screen pixel coordinates
        const screenX = ltwh[0] + screenFracX * ltwh[2]
        const screenY = ltwh[1] + screenFracY * ltwh[3]

        return [screenX, screenY]
      }
    }

    return null // no valid screen slice found
  }

  /**
   * Calculates scaled slice dimensions and position within the canvas.
   * n.b. beware of similarly named `sliceScale` method.
   * @internal
   */
  scaleSlice(
    w: number,
    h: number,
    padPixelsWH: [number, number] = [0, 0],
    canvasWH: [number, number] = [0, 0]
  ): number[] {
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
    this.gl.uniform2f(this.bmpShader.uniforms.canvasWidthHeight, this.gl.canvas.width, this.gl.canvas.height)
    let h = this.gl.canvas.height
    let w = this.gl.canvas.height * this.bmpTextureWH
    if (w > this.gl.canvas.width) {
      // constrained by width
      h = this.gl.canvas.width / this.bmpTextureWH
      w = this.gl.canvas.width
    }
    // Calculate offsets to center the image
    const left = (this.gl.canvas.width - w) / 2
    const top = (this.gl.canvas.height - h) / 2
    this.gl.uniform4f(this.bmpShader.uniforms.leftTopWidthHeight, left, top, w, h)
    this.gl.bindVertexArray(this.genericVAO)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    this.gl.bindVertexArray(this.unusedVAO) // switch off to avoid tampering with settings
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

    // get vector
    const segment = vec2.fromValues(startXYendXY[2] - startXYendXY[0], startXYendXY[3] - startXYendXY[1])
    const totalLength = vec2.length(segment)
    vec2.normalize(segment, segment)
    const scale = 1.0
    const size = this.fontPx * scale
    vec2.scale(segment, segment, size / 2)
    const segmentLength = vec2.length(segment)
    let segmentCount = Math.floor(totalLength / segmentLength)

    if (totalLength % segmentLength) {
      segmentCount++
    }

    const currentSegmentXY = [startXYendXY[0], startXYendXY[1]]

    this.gl.uniform4fv(this.lineShader.uniforms.lineColor, dottedLineColor)
    this.gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
    this.gl.uniform1f(this.lineShader.uniforms.thickness, thickness)

    // draw all segments except for the last one
    for (let i = 0; i < segmentCount - 1; i++) {
      if (i % 2) {
        currentSegmentXY[0] += segment[0]
        currentSegmentXY[1] += segment[1]
        continue
      }

      const segmentStartXYendXY = [
        currentSegmentXY[0],
        currentSegmentXY[1],
        currentSegmentXY[0] + segment[0],
        currentSegmentXY[1] + segment[1]
      ]

      // draw Line

      this.gl.uniform4fv(this.lineShader.uniforms.startXYendXY, segmentStartXYendXY)
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
      // this.gl.bindVertexArray(this.unusedVAO); //set vertex attributes
      currentSegmentXY[0] += segment[0]
      currentSegmentXY[1] += segment[1]
    }

    // this.gl.uniform4fv(this.lineShader.uniforms.lineColor, lineColor);
    // this.gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [
    //   this.gl.canvas.width,
    //   this.gl.canvas.height,
    // ]);
    // //draw Line
    // this.gl.uniform1f(this.lineShader.uniforms.thickness, thickness);
    // this.gl.uniform4fv(this.lineShader.uniforms.startXYendXY, startXYendXY);
    // this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.bindVertexArray(this.unusedVAO) // set vertex attributes
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
    let linesH = corMM.slice()
    let linesV = sagMM.slice()
    const thick = Math.max(1, this.opts.crosshairWidth)
    if (axCorSag === SLICE_TYPE.CORONAL) {
      linesH = axiMM.slice()
    }
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
      linesH = axiMM.slice()
      linesV = corMM.slice()
    }
    function mm2screen(mm: vec2): vec2 {
      const screenXY = vec2.fromValues(0, 0)
      screenXY[0] =
        tile.leftTopWidthHeight[0] + ((mm[0] - tile.leftTopMM[0]) / tile.fovMM[0]) * tile.leftTopWidthHeight[2]
      screenXY[1] =
        tile.leftTopWidthHeight[1] +
        tile.leftTopWidthHeight[3] -
        ((mm[1] - tile.leftTopMM[1]) / tile.fovMM[1]) * tile.leftTopWidthHeight[3]
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
    let linesH = corMM.slice()
    let linesV = sagMM.slice()

    if (axCorSag === SLICE_TYPE.CORONAL) {
      linesH = axiMM.slice()
    }
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
      linesH = axiMM.slice()
      linesV = corMM.slice()
    }
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
      const isRadiolgical = tile.fovMM[0] < 0
      let sliceDim = 0 // vertical lines on axial/coronal are L/R axis
      if (axCorSag === SLICE_TYPE.SAGITTAL) {
        sliceDim = 1
      } // vertical lines on sagittal are A/P
      const mm = this.frac2mm([0.5, 0.5, 0.5])
      for (let i = 0; i < linesV.length; i++) {
        mm[sliceDim] = linesV[i]
        const frac = this.mm2frac(mm)
        if (isRadiolgical) {
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
    // render always in world space
    const fovRenderMM = this.screenFieldOfViewMM(SLICE_TYPE.AXIAL, true)
    // 2d slices might be in world space or voxel space
    const fovSliceMM = this.screenFieldOfViewMM(SLICE_TYPE.AXIAL)
    // fovRender and fovSlice will only be different if scans are oblique and shown in voxel space
    // let mosaicStr = 'A -52 -12 C 8 ; S 28 48 66'

    mosaicStr = mosaicStr.replaceAll(';', ' ;').trim()
    const axiMM = []
    const corMM = []
    const sagMM = []
    const items = mosaicStr.split(/\s+/)
    let scale = 1.0 // e.g. if 1.0 1mm per pixel
    const labelSize = this.fontPx
    // let isCrossLinesUsed = false;
    let marginLeft = 0
    let marginTop = 0
    let tileGap = 0
    if (!this.volumes[0]?.dims) {
      tileGap = Math.ceil(this.opts.tileMargin * 0.3)
    }
    for (let pass = 0; pass < 2; pass++) {
      // two pass: first calculate dimensions to determine scale, second draw items
      let isRender = false
      let isCrossLines = false
      isRender = false
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
          i++ // detect horizontal overlap
          horizontalOverlap = Math.max(0, Math.min(1, parseFloat(items[i])))
          horizontalOverlap = Math.abs(horizontalOverlap)
          continue
        }
        if (item.includes('V')) {
          i++ // skip numeric value for vertical overlap
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
          // EOLN
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
        log.debug(`item ${i} width with overlap ${w} pixels`)
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
        // draw the slice
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
          // 1st pass: record slice locations in world space
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
          // 2nd pass draw
          const ltwh = [marginLeft + scale * left, marginTop + scale * top, scale * w, scale * h]
          this.fontPx = isLabel ? labelSize : 0

          if (isRender) {
            let inf = sliceMM < 0 ? -Infinity : Infinity
            if (Object.is(sliceMM, -0)) {
              inf = -Infinity
            } // catch negative zero
            this.draw2D(ltwh, axCorSag, inf)
          } else {
            this.draw2D(ltwh, axCorSag, sliceMM)
          }
          if (isCrossLines) {
            this.drawCrossLines(this.screenSlices.length - 1, axCorSag, axiMM, corMM, sagMM)
            // isCrossLinesUsed = true;
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
      const scaleW = (this.gl.canvas.width - 2 * this.opts.tileMargin - tileGap) / mxRowWid
      const scaleH = (this.effectiveCanvasHeight() - 2 * this.opts.tileMargin) / top
      scale = Math.min(scaleW, scaleH)
      if (this.opts.centerMosaic) {
        marginLeft = Math.floor(0.5 * (this.gl.canvas.width - mxRowWid * scale))
        marginTop = Math.floor(0.5 * (this.effectiveCanvasHeight() - top * scale))
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
  calculateWidthHeight(
    sliceType: number,
    volScale: number[],
    containerWidth: number,
    containerHeight: number
  ): [number, number] {
    let xScale, yScale

    switch (sliceType) {
      case SLICE_TYPE.AXIAL:
        xScale = volScale[0]
        yScale = volScale[1]
        break
      case SLICE_TYPE.CORONAL:
        xScale = volScale[0]
        yScale = volScale[2]
        break
      case SLICE_TYPE.SAGITTAL:
        xScale = volScale[1]
        yScale = volScale[2]
        break
      default:
        return [containerWidth, containerHeight]
    }

    // Calculate scale factor to fit within container while preserving aspect ratio
    const aspectRatio = xScale / yScale
    const containerAspect = containerWidth / containerHeight

    let actualWidth, actualHeight

    if (aspectRatio > containerAspect) {
      // width-constrained
      actualWidth = containerWidth
      actualHeight = containerWidth / aspectRatio
    } else {
      // height-constrained
      actualHeight = containerHeight
      actualWidth = containerHeight * aspectRatio
    }

    return [actualWidth, actualHeight]
  }

  /**
   * Core function to draw the entire scene including volumes, meshes, slices, overlays, colorbars, graphs, and handle user interaction like dragging.
   * @internal
   */
  drawSceneCore(): string | void {
    if (!this.initialized) {
      return // do not do anything until we are initialized (init will call drawScene).
    }
    this.colorbarHeight = 0
    this.gl.clearColor(this.opts.backColor[0], this.opts.backColor[1], this.opts.backColor[2], this.opts.backColor[3])
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
    // this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    if (this.bmpTexture && this.thumbnailVisible) {
      // draw the thumbnail image and exit
      this.drawThumbnail()
      return
    }
    let posString = ''
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
        this.screenSlices = [] // empty array
        // this.opts.sliceType = SLICE_TYPE.RENDER // only meshes loaded: we must use 3D render mode
        this.draw3D() // meshes loaded but no volume
        if (this.opts.isColorbar) {
          this.drawColorbar()
        }
        return
      }
      this.drawLoadingText(this.opts.loadingText)
      return
    }
    if (
      this.uiData.isDragging &&
      this.scene.clipPlaneDepthAziElev[0] < 1.8 &&
      this.inRenderTile(this.uiData.dragStart[0], this.uiData.dragStart[1]) >= 0
    ) {
      // user dragging over a 3D rendering
      const x = this.uiData.dragStart[0] - this.uiData.dragEnd[0]
      const y = this.uiData.dragStart[1] - this.uiData.dragEnd[1]
      const depthAziElev = this.uiData.dragClipPlaneStartDepthAziElev.slice()
      depthAziElev[1] -= x
      depthAziElev[1] = depthAziElev[1] % 360
      depthAziElev[2] += y
      if (
        depthAziElev[1] !== this.scene.clipPlaneDepthAziElev[1] ||
        depthAziElev[2] !== this.scene.clipPlaneDepthAziElev[2]
      ) {
        this.scene.clipPlaneDepthAziElev = depthAziElev
        return this.setClipPlane(this.scene.clipPlaneDepthAziElev)
      }
    }
    if (this.sliceMosaicString.length < 1 && this.opts.sliceType === SLICE_TYPE.RENDER) {
      if (this.opts.isColorbar) {
        this.reserveColorbarPanel()
      }
      this.screenSlices = [] // empty array
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
    const isDrawGraph =
      this.opts.sliceType === SLICE_TYPE.MULTIPLANAR &&
      maxVols > 1 &&
      this.graph.autoSizeMultiplanar &&
      this.graph.opacity > 0

    if (this.sliceMosaicString.length > 0) {
      this.drawMosaic(this.sliceMosaicString)
    } else {
      // issue56 is use mm else use voxel
      const heroImageWH = [0, 0]
      let isHeroImage = false
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
      this.screenSlices = [] // empty array
      // Check if we have a custom layout to use
      if (this.customLayout && this.customLayout.length > 0) {
        this.screenSlices = [] // empty array
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)

        // Get volume scale information, as done in multiplanar section
        const { volScale } = this.sliceScale()
        const canvasWH = [this.effectiveCanvasWidth(), this.effectiveCanvasHeight()]
        // Process each view in the custom layout
        for (const view of this.customLayout) {
          const { sliceType, position, sliceMM } = view

          // Convert relative positions (0-1) to absolute pixels if needed
          const leftTopWidthHeight = position.slice() as [number, number, number, number]

          // If positions are relative (between 0-1), convert to absolute pixels
          if (position[0] >= 0 && position[0] <= 1 && position[2] <= 1) {
            leftTopWidthHeight[0] = position[0] * canvasWH[0]
            leftTopWidthHeight[2] = position[2] * canvasWH[0]
          }

          if (position[1] >= 0 && position[1] <= 1 && position[3] <= 1) {
            leftTopWidthHeight[1] = position[1] * canvasWH[1]
            leftTopWidthHeight[3] = position[3] * canvasWH[1]
          }

          // check if the slice will be clipped because it was requested to extend past the canvas bounds
          if (leftTopWidthHeight[0] + leftTopWidthHeight[2] > canvasWH[0]) {
            log.warn('adjusting slice width because it would have been clipped')
            leftTopWidthHeight[2] = canvasWH[0] - leftTopWidthHeight[0]
          }
          if (leftTopWidthHeight[1] + leftTopWidthHeight[3] > canvasWH[1]) {
            log.warn('adjusting slice height because it would have been clipped')
            leftTopWidthHeight[3] = canvasWH[1] - leftTopWidthHeight[1]
          }

          // Draw the appropriate view type
          if (sliceType === SLICE_TYPE.RENDER) {
            this.draw3D(leftTopWidthHeight)
          } else if (
            sliceType === SLICE_TYPE.AXIAL ||
            sliceType === SLICE_TYPE.CORONAL ||
            sliceType === SLICE_TYPE.SAGITTAL
          ) {
            // Calculate actual dimensions for preserving aspect ratio
            const actualDimensions = this.calculateWidthHeight(
              sliceType,
              volScale,
              leftTopWidthHeight[2],
              leftTopWidthHeight[3]
            )

            this.draw2D(leftTopWidthHeight, sliceType, sliceMM ?? NaN, actualDimensions)
          }
        }
      }
      // If no custom layout, check for other known layouts
      else if (this.opts.sliceType === SLICE_TYPE.AXIAL) {
        this.draw2D([0, 0, 0, 0], 0)
      } else if (this.opts.sliceType === SLICE_TYPE.CORONAL) {
        this.draw2D([0, 0, 0, 0], 1)
      } else if (this.opts.sliceType === SLICE_TYPE.SAGITTAL) {
        this.draw2D([0, 0, 0, 0], 2)
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
        const ltwh2x2 = this.scaleSlice(
          volScale[0] + volScale[1],
          volScale[1] + volScale[2],
          padPixelsWH(2, 2),
          canvasWH
        )
        const mx = Math.max(Math.max(volScale[1], volScale[2]), volScale[0])
        // size for 3 columns and 1 row
        const ltwh3x1 = this.scaleSlice(
          volScale[0] + volScale[0] + volScale[1],
          Math.max(volScale[1], volScale[2]),
          padPixelsWH(3, 1),
          canvasWH
        )
        // size for 4 columns and 1 row
        const ltwh4x1 = this.scaleSlice(
          volScale[0] + volScale[0] + volScale[1] + mx,
          Math.max(volScale[1], volScale[2]),
          padPixelsWH(4, 1),
          canvasWH
        )
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
          if (
            !isHeroImage &&
            (isShowRender || (this.opts.multiplanarShowRender === SHOW_RENDER.AUTO && ltwh1x4[4] >= ltwh1x3[4]))
          ) {
            ltwh = ltwh1x4
          } else {
            isDraw3D = false
          }
        } else if (isDrawRow) {
          ltwh = ltwh3x1
          if (
            !isHeroImage &&
            (isShowRender || (this.opts.multiplanarShowRender === SHOW_RENDER.AUTO && ltwh4x1[4] >= ltwh3x1[4]))
          ) {
            ltwh = ltwh4x1
          } else {
            isDraw3D = false
          }
        }
        if (isHeroImage) {
          // issue1082 draw hero image
          const heroW = heroImageWH[0] === 0 ? this.effectiveCanvasWidth() : heroImageWH[0]
          const heroH = heroImageWH[1] === 0 ? this.effectiveCanvasHeight() : heroImageWH[1]
          //
          if (
            this.opts?.heroSliceType === SLICE_TYPE.AXIAL ||
            this.opts?.heroSliceType === SLICE_TYPE.CORONAL ||
            this.opts?.heroSliceType === SLICE_TYPE.SAGITTAL
          ) {
            this.draw2D([0, 0, heroW, heroH], this.opts.heroSliceType, NaN, [Infinity, Infinity])
          } else {
            // let canvasWH: [number, number] = [this.effectiveCanvasWidth(), this.effectiveCanvasHeight()]
            const ltwh2 = ltwh.slice()
            const canvasW = this.effectiveCanvasWidth()
            // console.log(`L ${ltwh[0]} T ${ltwh[1]} W ${heroW} H ${heroH} canvas ${canvasW}`)
            if (heroW === canvasW) {
              ltwh2[0] = 0
            }
            // console.log(`isWide ${heroW > heroH} L ${ltwh[0]} -> ${ltwh2[0]}`)
            // this.draw3D([heroLTWH[0], heroLTWH[1], heroW, heroH])
            this.draw3D([ltwh2[0], 0, heroW, heroH])
          }
          // this.draw3D([0, 0, heroW, heroH])
          ltwh[0] += heroImageWH[0]
          ltwh[1] += heroImageWH[1]
          isDraw3D = false
        }
        const sX = volScale[0] * ltwh[4] + innerPad
        const sY = volScale[1] * ltwh[4] + innerPad
        const sZ = volScale[2] * ltwh[4] + innerPad
        const actualX = actualScale[0] * ltwh[4]
        const actualY = actualScale[1] * ltwh[4]
        const actualZ = actualScale[2] * ltwh[4]
        if (isDrawColumn) {
          // draw axial
          this.draw2D([ltwh[0], ltwh[1], sX, sY], 0, NaN, [actualX, actualY])
          // draw coronal
          this.draw2D([ltwh[0], ltwh[1] + sY + pad, sX, sZ], 1, NaN, [actualX, actualZ])
          // draw sagittal
          this.draw2D([ltwh[0], ltwh[1] + sY + pad + sZ + pad, sY, sZ], 2, NaN, [actualY, actualZ])
          if (isDraw3D) {
            const sMx = mx * ltwh[4]
            this.draw3D([ltwh[0], ltwh[1] + sY + sZ + sZ + pad * 3, sMx, sMx])
          }
        } else if (isDrawRow) {
          // draw axial
          this.draw2D([ltwh[0], ltwh[1], sX, sY], 0, NaN, [actualX, actualY])
          // draw coronal
          this.draw2D([ltwh[0] + sX + pad, ltwh[1], sX, sZ], 1, NaN, [actualX, actualZ])
          // draw sagittal
          this.draw2D([ltwh[0] + sX + sX + pad * 2, ltwh[1], sY, sZ], 2, NaN, [actualY, actualZ])
          if (isDraw3D) {
            const sMx = mx * ltwh[4]
            this.draw3D([ltwh[0] + sX + sX + sY + pad * 3, ltwh[1], sMx, sMx])
          }
        } else if (isDrawGrid) {
          // did the user turn off 3D render view in multiplanar?
          if (!isShowRender) {
            isDraw3D = false
          }
          // however, check if the user asked for auto
          if (this.opts.multiplanarShowRender === SHOW_RENDER.AUTO) {
            isDraw3D = true
          }
          // however, hero image is a rendering
          if (isHeroImage) {
            isDraw3D = false
          }
          // draw axial
          this.draw2D([ltwh[0], ltwh[1] + sZ + pad, sX, sY], 0, NaN, [actualX, actualY])
          // draw coronal
          this.draw2D([ltwh[0], ltwh[1], sX, sZ], 1, NaN, [actualX, actualZ])
          // draw sagittal
          this.draw2D([ltwh[0] + sX + pad, ltwh[1], sY, sZ], 2, NaN, [actualY, actualZ])
          if (isDraw3D) {
            this.draw3D([ltwh[0] + sX + pad, ltwh[1] + sZ + pad, sY, sY])
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
        this.dragForCenterButton([
          this.uiData.dragStart[0],
          this.uiData.dragStart[1],
          this.uiData.dragEnd[0],
          this.uiData.dragEnd[1]
        ])
        return
      }
      if (this.getCurrentDragMode() === DRAG_MODE.slicer3D) {
        this.dragForSlicer3D([
          this.uiData.dragStart[0],
          this.uiData.dragStart[1],
          this.uiData.dragEnd[0],
          this.uiData.dragEnd[1]
        ])
        return
      }
      if (this.getCurrentDragMode() === DRAG_MODE.pan) {
        this.dragForPanZoom([
          this.uiData.dragStart[0],
          this.uiData.dragStart[1],
          this.uiData.dragEnd[0],
          this.uiData.dragEnd[1]
        ])
        return
      }
      if (this.inRenderTile(this.uiData.dragStart[0], this.uiData.dragStart[1]) >= 0) {
        return
      }
      if (this.getCurrentDragMode() === DRAG_MODE.measurement) {
        this.drawMeasurementTool([
          this.uiData.dragStart[0],
          this.uiData.dragStart[1],
          this.uiData.dragEnd[0],
          this.uiData.dragEnd[1]
        ])
      }
      if (this.getCurrentDragMode() === DRAG_MODE.angle) {
        this.drawAngleMeasurementTool()
      }
      // Only draw selection box for specific drag modes that need it
      const currentDragMode = this.getCurrentDragMode()
      if (currentDragMode === DRAG_MODE.contrast || currentDragMode === DRAG_MODE.roiSelection) {
        const width = Math.abs(this.uiData.dragStart[0] - this.uiData.dragEnd[0])
        const height = Math.abs(this.uiData.dragStart[1] - this.uiData.dragEnd[1])
        this.drawSelectionBox([
          Math.min(this.uiData.dragStart[0], this.uiData.dragEnd[0]),
          Math.min(this.uiData.dragStart[1], this.uiData.dragEnd[1]),
          width,
          height
        ])
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
          this.drawMeasurementTool([
            startCanvasResult.pos[0],
            startCanvasResult.pos[1],
            endCanvasResult.pos[0],
            endCanvasResult.pos[1]
          ])
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
          this.drawMeasurementTool(
            [
              firstLineStartCanvasResult.pos[0],
              firstLineStartCanvasResult.pos[1],
              firstLineEndCanvasResult.pos[0],
              firstLineEndCanvasResult.pos[1]
            ],
            false
          )
          this.drawMeasurementTool(
            [
              secondLineStartCanvasResult.pos[0],
              secondLineStartCanvasResult.pos[1],
              secondLineEndCanvasResult.pos[0],
              secondLineEndCanvasResult.pos[1]
            ],
            false
          )

          // Draw angle text - need to convert back to old format for the existing function
          const angleForText = {
            firstLine: [
              firstLineStartCanvasResult.pos[0],
              firstLineStartCanvasResult.pos[1],
              firstLineEndCanvasResult.pos[0],
              firstLineEndCanvasResult.pos[1]
            ],
            secondLine: [
              secondLineStartCanvasResult.pos[0],
              secondLineStartCanvasResult.pos[1],
              secondLineEndCanvasResult.pos[0],
              secondLineEndCanvasResult.pos[1]
            ],
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

    interpolateMaskSlices(this.drawBitmap, dims, imageData, maxVal, sliceIndexLow, sliceIndexHigh, options, () =>
      this.refreshDrawing(true)
    )
  }
}
