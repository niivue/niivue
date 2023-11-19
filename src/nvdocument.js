import { serialize, deserialize } from '@ungap/structured-clone'
import { NVUtilities } from './nvutilities'
// Disabled warnings because of issue with JSDoc https://github.com/microsoft/TypeScript/issues/14377
// eslint-disable-next-line no-unused-vars
import { NVImageFromUrlOptions, NVIMAGE_TYPE } from './nvimage'
import { MeshType } from './nvmesh'

// import { NVLabel3D } from "./nvlabel";
/**
 * Slice Type
 * @enum
 * @readonly
 */
export const SLICE_TYPE = Object.freeze({
  AXIAL: 0,
  CORONAL: 1,
  SAGITTAL: 2,
  MULTIPLANAR: 3,
  RENDER: 4
})

/**
 * Multi-planar layout
 * @enum
 * @readonly
 */
export const MULTIPLANAR_TYPE = Object.freeze({
  AUTO: 0,
  COLUMN: 1,
  GRID: 2,
  ROW: 3
})

/**
 * @enum
 * @readonly
 */
export const DRAG_MODE = Object.freeze({
  none: 0,
  contrast: 1,
  measurement: 2,
  pan: 3,
  slicer3D: 4,
  callbackOnly: 5
})

/**
 * @typedef {Object} NVConfigOptions
 * @property {number} textHeight
 * @property {number} colorbarHeight
 * @property {number} crosshairWidth
 * @property {number} rulerWidth
 * @property {boolean} show3Dcrosshair
 * @property {number[]} backColor
 * @property {number[]} crosshairColor
 * @property {number[]} fontColor
 * @property {number[]} selectionBoxColor
 * @property {number[]} clipPlaneColor
 * @property {number[]} rulerColor
 * @property {number} colorbarMargin
 * @property {boolean} trustCalMinMax
 * @property {string} clipPlaneHotKey
 * @property {string} viewModeHotKey
 * @property {number} doubleTouchTimeout
 * @property {number} longTouchTimeout
 * @property {number} keyDebounceTime
 * @property {boolean} isNearestInterpolation
 * @property {boolean} isAtlasOutline
 * @property {boolean} isRuler
 * @property {boolean} isColorbar
 * @property {boolean} isOrientCube
 * @property {number} multiplanarPadPixels
 * @property {boolean} multiplanarForceRender
 * @property {boolean} isRadiologicalConvention
 * @property {number} meshThicknessOn2D
 * @property {DRAG_MODE} dragMode
 * @property {boolean} isDepthPickMesh
 * @property {boolean} isCornerOrientationText
 * @property {boolean} sagittalNoseLeft
 * @property {boolean} isSliceMM
 * @property {boolean} isHighResolutionCapable
 * @property {boolean} logging
 * @property {string} loadingText
 * @property {boolean} dragAndDropEnabled
 * @property {boolean} drawingEnabled
 * @property {number} penValue
 * @property {number} floodFillNeighbors
 * @property {boolean} isFilledPen
 * @property {string} thumbnail
 * @property {number} maxDrawUndoBitmaps
 * @property {SLICE_TYPE} sliceType
 * @property {boolean} isAntiAlias
 * @property {boolean} isAdditiveBlend
 */
export const DEFAULT_OPTIONS = {
  textHeight: 0.06, // 0 for no text, fraction of canvas min(height,width)
  colorbarHeight: 0.05, // 0 for no colorbars, fraction of Nifti j dimension
  crosshairWidth: 1, // 0 for no crosshairs
  rulerWidth: 4,
  show3Dcrosshair: false,
  backColor: [0, 0, 0, 1],
  crosshairColor: [1, 0, 0, 1],
  fontColor: [0.5, 0.5, 0.5, 1],
  selectionBoxColor: [1, 1, 1, 0.5],
  clipPlaneColor: [0.7, 0, 0.7, 0.5],
  rulerColor: [1, 0, 0, 0.8],
  colorbarMargin: 0.05, // x axis margin around color bar, clip space coordinates
  trustCalMinMax: true, // trustCalMinMax: if true do not calculate cal_min or cal_max if set in image header. If false, always calculate display intensity range.
  clipPlaneHotKey: 'KeyC', // keyboard short cut to activate the clip plane
  viewModeHotKey: 'KeyV', // keyboard shortcut to switch view modes
  doubleTouchTimeout: 500,
  longTouchTimeout: 1000,
  keyDebounceTime: 50, // default debounce time used in keyup listeners
  isNearestInterpolation: false,
  isResizeCanvas: true, // Allow canvas width ahd height to resize (false for fixed size)
  isAtlasOutline: false,
  isRuler: false,
  isColorbar: false,
  isOrientCube: false,
  multiplanarPadPixels: 0,
  multiplanarForceRender: false,
  isRadiologicalConvention: false,
  meshThicknessOn2D: Infinity,
  dragMode: DRAG_MODE.contrast,
  isDepthPickMesh: false,
  isCornerOrientationText: false,
  sagittalNoseLeft: false, // sagittal slices can have Y+ going left or right
  isSliceMM: false,
  isHighResolutionCapable: true,
  logging: false,
  loadingText: 'waiting for images...',
  dragAndDropEnabled: true,
  drawingEnabled: false, // drawing disabled by default
  penValue: 1, // sets drawing color. see "drawPt"
  floodFillNeighbors: 6, // does a voxel have 6 (face), 18 (edge) or 26 (corner) neighbors
  isFilledPen: false,
  thumbnail: '',
  maxDrawUndoBitmaps: 8,
  sliceType: SLICE_TYPE.MULTIPLANAR,
  meshXRay: 0.0,
  isAntiAlias: null,
  limitFrames4D: NaN,
  isAdditiveBlend: false,
  showLegend: true, // if a document has labels the default is to show them
  legendBackgroundColor: [0.3, 0.3, 0.3, 0.5],
  legendTextColor: [1.0, 1.0, 1.0, 1.0],
  multiplanarLayout: MULTIPLANAR_TYPE.AUTO,
  renderOverlayBlend: 1.0
}

/**
 * @typedef NVLabel3D
 * @property {string} text
 * @property {number[]} textColor
 * @property {number[]} bulletSize width and height of bullets in pixels
 * @property {number[]} bulletColor
 * @property {number} lineWidth
 * @property {number[]} lineColor
 * @property {number[]} point
 */

/** Creates and instance of NVDocument
 * @class NVDocument
 * @type NVDocument
 * @constructor
 */
export class NVDocument {
  constructor() {
    this.data = {}
    this.data.title = 'Untitled document'
    this.data.imageOptionsArray = []
    this.data.meshOptionsArray = []
    this.data.opts = { ...DEFAULT_OPTIONS }
    this.data.previewImageDataURL = ''

    /**
     * @type {NVLabel3D[]}
     */
    this.data.labels = []

    /**
     * @typedef {Object} NVSceneData
     * @property {number} azimuth
     * @property {number} elevation
     * @property {number[]} crosshairPos
     * @property {number[]} clipPlane
     * @property {number[]} clipPlaneDepthAziElev
     * @property {number} volScaleMultiplier
     */
    this.scene = {
      onAzimuthElevationChange: () => {},
      onZoom3DChange: () => {},
      sceneData: {
        azimuth: 110,
        elevation: 10,
        crosshairPos: [0.5, 0.5, 0.5],
        clipPlane: [0, 0, 0, 0],
        clipPlaneDepthAziElev: [2, 0, 0],
        volScaleMultiplier: 1.0,
        pan2Dxyzmm: [0, 0, 0, 1]
      },

      /**
       * Gets azimuth of scene
       * @returns {number}
       */
      get renderAzimuth() {
        return this.sceneData.azimuth
      },
      /**
       * @param {number} azimuth
       */
      set renderAzimuth(azimuth) {
        this.sceneData.azimuth = azimuth
        if (this.onAzimuthElevationChange) {
          this.onAzimuthElevationChange(this.sceneData.azimuth, this.sceneData.elevation)
        }
      },
      /**
       * Gets elevation of scene
       * @returns {number}
       */
      get renderElevation() {
        return this.sceneData.elevation
      },

      /**
       * @param {number} elevation
       */
      set renderElevation(elevation) {
        this.sceneData.elevation = elevation
        if (this.onAzimuthElevationChange) {
          this.onAzimuthElevationChange(this.sceneData.azimuth, this.sceneData.elevation)
        }
      },

      /**
       * Gets the scale/zoom of the scene
       * @returns {number}
       */
      get volScaleMultiplier() {
        return this.sceneData.volScaleMultiplier
      },

      /**
       * Sets scale/zoom of the scene
       * @param {number} scale
       */
      set volScaleMultiplier(scale) {
        this.sceneData.volScaleMultiplier = scale
        this.onZoom3DChange(scale)
      },

      /**
       * Gets current crosshairs position
       * @returns {number[]}
       */
      get crosshairPos() {
        return this.sceneData.crosshairPos
      },

      /**
       * sets current crosshairs position
       * @param {number[]} crosshairPos
       */
      set crosshairPos(crosshairPos) {
        this.sceneData.crosshairPos = crosshairPos
      },

      /**
       * Gets the current clip plane
       * @returns {number[]}
       */
      get clipPlane() {
        return this.sceneData.clipPlane
      },

      /**
       * Gets the current clip plane
       * @param {number[]} clipPlane
       */
      set clipPlane(clipPlane) {
        this.sceneData.clipPlane = clipPlane
      },

      /**
       * Gets current Plane Depth
       * @returns {number[]}
       */
      get clipPlaneDepthAziElev() {
        return this.sceneData.clipPlaneDepthAziElev
      },

      /**
       * Sets current depth, azimuth and elevation of clip plane
       * @param {number[]} clipPlaneDepthAziElev
       */
      set clipPlaneDepthAziElev(clipPlaneDepthAziElev) {
        this.sceneData.clipPlaneDepthAziElev = clipPlaneDepthAziElev
      },

      /**
       * Gets current 2D pan in 3D mm
       */
      get pan2Dxyzmm() {
        return this.sceneData.pan2Dxyzmm
      },

      /**
       * Sets current 2D pan in 3D mm
       */
      set pan2Dxyzmm(pan2Dxyzmm) {
        this.sceneData.pan2Dxyzmm = pan2Dxyzmm
      }
    }
    this.volumes = []
    this.meshes = []
    this.drawBitmap = null
    this.imageOptionsMap = new Map()
    this.meshOptionsMap = new Map()
  }

  /**
   * Title of the document
   * @returns {string}
   */
  get title() {
    return this.data.title
  }

  /**
   * Gets preview image blob
   * @returns {string} dataURL of preview image
   */
  get previewImageDataURL() {
    return this.data.previewImageDataURL
  }

  /**
   * Sets preview image blob
   * @param {string} dataURL encoded preview image
   */
  set previewImageDataURL(dataURL) {
    this.data.previewImageDataURL = dataURL
  }

  /**
   * @param {string} title title of document
   */
  set title(title) {
    this.data.title = title
  }

  /**
   * @returns {NVImageFromUrlOptions[]}
   */
  get imageOptionsArray() {
    return this.data.imageOptionsArray
  }

  /**
   * Gets the base 64 encoded blobs of associated images
   * @returns {string[]}
   */
  get encodedImageBlobs() {
    return this.data.encodedImageBlobs
  }

  /**
   * Gets the base 64 encoded blob of the associated drawing
   * @returns {string[]}
   */
  get encodedDrawingBlob() {
    return this.data.encodedDrawingBlob
  }

  /**
   * Gets the options of the {@link Niivue} instance
   * @returns {Object}
   */
  get opts() {
    return this.data.opts
  }

  /**
   * Sets the options of the {@link Niivue} instance
   */
  set opts(opts) {
    this.data.opts = { ...opts }
  }

  /**
   * Gets the 3D labels of the {@link Niivue} instance
   * @returns {NVLabel3D}
   */
  get labels() {
    return this.data.labels
  }

  /**
   * Sets the 3D labels of the {@link Niivue} instance
   * @param {NVLabel3D[]} labels
   */
  set labels(labels) {
    this.data.labels = labels
  }

  /**
   * Checks if document has an image by id
   * @param {NVImage} image
   * @returns {boolean}
   */
  hasImage(image) {
    return this.volumes.find((i) => i.id === image.id)
  }

  /**
   * Checks if document has an image by url
   * @param {string} url
   * @returns {boolean}
   */
  hasImageFromUrl(url) {
    return this.data.imageOptionsArray.find((i) => i.url === url)
  }

  /**
   * Adds an image and the options an image was created with
   * @param {NVImage} image
   * @param {NVImageFromUrlOptions} imageOptions
   */
  addImageOptions(image, imageOptions) {
    if (!this.hasImage(image)) {
      if (!imageOptions.name) {
        if (imageOptions.url) {
          const absoluteUrlRE = /^(?:[a-z+]+:)?\/\//i
          const url = absoluteUrlRE.test(imageOptions.url)
            ? new URL(imageOptions.url)
            : new URL(imageOptions.url, window.location.href)

          imageOptions.name = url.pathname.split('/').pop()
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
   * @param {NVImage} image
   */
  removeImage(image) {
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
   * Returns the options for the image if it was added by url
   * @param {NVImage} image
   * @returns {NVImageFromUrlOptions}
   */
  getImageOptions(image) {
    return this.imageOptionsMap.has(image.id) ? this.data.imageOptionsArray[this.imageOptionsMap.get(image.id)] : null
  }

  /**
   * @typedef {Object} NVDocumentData
   * @property {string[]} encodedImageBlobs base64 encoded images
   * @property {string} encodedDrawingBlob base64 encoded drawing
   * @property {string} previewImageDataURL dataURL of the preview image
   * @property {Map<string, number>} imageOptionsMap map of image ids to image options
   * @property {NVImageFromUrlOptions} imageOptionsArray array of image options to recreate images
   * @property {NVSceneData} sceneData data to recreate a scene
   * @property {NVConfigOptions} opts configuration options of {@link Niivue} instance
   * @property {string} meshesString encoded meshes
   */

  /**
   * Converts NVDocument to JSON
   * @returns {NVDocumentData}
   */
  json() {
    const data = {}
    data.encodedImageBlobs = []
    data.encodedDrawingBlob = null
    data.previewImageDataURL = this.data.previewImageDataURL
    data.imageOptionsMap = []
    const imageOptionsArray = []
    // save our scene object
    data.sceneData = { ...this.scene.sceneData }
    // save our options
    data.opts = { ...this.opts }
    // infinity is a symbol
    if (this.opts.meshThicknessOn2D === Infinity) {
      data.opts.meshThicknessOn2D = 'infinity'
    }

    // save our labels
    data.labels = [...this.data.labels]

    // volumes
    if (this.volumes.length) {
      let imageOptions = this.imageOptionsArray[0]
      if (!imageOptions) {
        console.log('no image options for base image')
        imageOptions = {
          name: '',
          colormap: 'gray',
          opacity: 1.0,
          pairedImgData: null,
          cal_min: NaN,
          cal_max: NaN,
          trustCalMinMax: true,
          percentileFrac: 0.02,
          ignoreZeroVoxels: false,
          visible: true,
          useQFormNotSForm: false,
          colormapNegative: '',
          colormapLabel: [],
          imageType: NVIMAGE_TYPE.NII,
          frame4D: 0,
          limitFrames4D: NaN
        }
      }

      // update image options on current image settings
      imageOptions.colormap = this.volumes[0].colormap
      imageOptions.opacity = this.volumes[0].opacity
      imageOptions.cal_max = this.volumes[0].cal_max
      imageOptions.cal_min = this.volumes[0].cal_min

      if (imageOptions) {
        imageOptionsArray.push(imageOptions)
        const encodedImageBlob = NVUtilities.uint8tob64(this.volumes[0].toUint8Array())
        data.encodedImageBlobs.push(encodedImageBlob)
        if (this.drawBitmap) {
          data.encodedDrawingBlob = NVUtilities.uint8tob64(this.volumes[0].toUint8Array(this.drawBitmap))
        }

        data.imageOptionsMap.push([this.volumes[0].id, 0])
      } else {
        throw new Error('image options for base layer not found')
      }

      for (let i = 1; i < this.volumes.length; i++) {
        const volume = this.volumes[i]
        let imageOptions = this.getImageOptions(volume)

        if (!imageOptions) {
          console.log('no options found for image, using default')
          imageOptions = {
            name: '',
            colormap: 'gray',
            opacity: 1.0,
            pairedImgData: null,
            cal_min: NaN,
            cal_max: NaN,
            trustCalMinMax: true,
            percentileFrac: 0.02,
            ignoreZeroVoxels: false,
            visible: true,
            useQFormNotSForm: false,
            colormapNegative: '',
            colormapLabel: [],
            imageType: NVIMAGE_TYPE.NII,
            frame4D: 0,
            limitFrames4D: NaN
          }
        } else {
          if (!('imageType' in imageOptions)) {
            imageOptions.imageType = NVIMAGE_TYPE.NII
          }
        }
        // update image options on current image settings
        imageOptions.colormap = volume.colormap
        imageOptions.opacity = volume.opacity
        imageOptions.cal_max = volume.cal_max
        imageOptions.cal_min = volume.cal_min

        imageOptionsArray.push(imageOptions)

        const encodedImageBlob = NVUtilities.uint8tob64(volume.toUint8Array())
        data.encodedImageBlobs.push(encodedImageBlob)
        data.imageOptionsMap.push([volume.id, i])
      }
    }
    // Add it even if it's empty
    data.imageOptionsArray = [...imageOptionsArray]

    // meshes
    const meshes = []
    data.connectomes = []
    for (const mesh of this.meshes) {
      if (mesh.type === MeshType.CONNECTOME) {
        data.connectomes.push(JSON.stringify(mesh.json()))
        continue
      }
      const copyMesh = {}
      copyMesh.pts = mesh.pts
      copyMesh.tris = mesh.tris
      copyMesh.name = mesh.name
      copyMesh.rgba255 = mesh.rgba255
      copyMesh.opacity = mesh.opacity
      copyMesh.connectome = { ...mesh.connectome }
      copyMesh.dpg = mesh.dpg
      copyMesh.dps = mesh.dps
      copyMesh.dpv = mesh.dpv
      copyMesh.meshShaderIndex = mesh.meshShaderIndex
      copyMesh.layers = []
      copyMesh.hasConnectome = mesh.hasConnectome
      copyMesh.edgeColormap = mesh.edgeColormap
      copyMesh.edgeColormapNegative = mesh.edgeColormapNegative
      copyMesh.edgeMax = mesh.edgeMax
      copyMesh.edgeMin = mesh.edgeMin
      copyMesh.edges = mesh.edges && Array.isArray(mesh.edges) ? [...mesh.edges] : []
      copyMesh.extentsMax = [...mesh.extentsMax]
      copyMesh.extentsMin = [...mesh.extentsMin]
      copyMesh.fiberGroupColormap = mesh.fiberGroupColormap
      copyMesh.furthestVertexFromOrigin = mesh.furthestVertexFromOrigin
      copyMesh.nodeColormap = mesh.nodeColormap
      copyMesh.nodeColormapNegative = mesh.nodeColormapNegative
      copyMesh.nodeMaxColor = mesh.nodeMaxColor
      copyMesh.nodeMinColor = mesh.nodeMinColor
      copyMesh.nodeScale = mesh.nodeScale
      copyMesh.offsetPt0 = mesh.offsetPt0
      copyMesh.nodes = { ...mesh.nodes }
      for (const layer of mesh.layers) {
        const copyLayer = {}
        copyLayer.values = layer.values
        copyLayer.nFrame4D = layer.nFrame4D
        copyLayer.frame4D = 0
        copyLayer.isOutlineBorder = layer.isOutlineBorder
        copyLayer.global_min = layer.global_min
        copyLayer.global_max = layer.global_max
        copyLayer.cal_min = layer.cal_min
        copyLayer.cal_max = layer.cal_max
        copyLayer.opacity = layer.opacity
        copyLayer.colormap = layer.colormap
        copyLayer.colormapNegative = layer.colormapNegative
        copyLayer.colormapLabel = layer.colormapLabel
        copyLayer.useNegativeCmap = layer.useNegativeCmap
        copyMesh.layers.push(copyLayer)
      }

      meshes.push(copyMesh)
    }
    data.meshesString = JSON.stringify(serialize(meshes))
    return data
  }

  /**
   * Downloads a JSON file with options, scene, images, meshes and drawing of {@link Niivue} instance
   * @param {string} fileName
   */
  download(fileName) {
    const data = this.json()
    NVUtilities.download(JSON.stringify(data), fileName, 'application/json')
  }

  /**
   * Deserialize mesh data objects
   * @param {NVDocument} document
   */
  static deserializeMeshDataObjects(document) {
    if (document.data.meshesString) {
      document.meshDataObjects = deserialize(JSON.parse(document.data.meshesString))
      delete document.data.meshesString
    }
  }

  /**
   * Factory method to return an instance of NVDocument from a URL
   * @param {string} url
   * @constructs NVDocument
   */
  static async loadFromUrl(url) {
    const response = await fetch(url)
    const data = await response.json()
    return NVDocument.loadFromJSON(data)
  }

  /**
   * Factory method to return an instance of NVDocument from a File object
   * @param {File} file
   * @constructs NVDocument
   */
  static async loadFromFile(file) {
    const arrayBuffer = await NVUtilities.readFileAsync(file)
    const document = new NVDocument()
    const utf8decoder = new TextDecoder()
    const dataString = utf8decoder.decode(arrayBuffer)
    document.data = JSON.parse(dataString)
    document.scene.sceneData = document.data.sceneData
    delete document.data.sceneData
    NVDocument.deserializeMeshDataObjects(document)
    return document
  }

  /**
   * Factory method to return an instance of NVDocument from JSON
   */
  static loadFromJSON(data) {
    const document = new NVDocument()
    document.data = data
    if (document.data.opts.meshThicknessOn2D === 'infinity') {
      document.data.opts.meshThicknessOn2D = Infinity
    }
    document.scene.sceneData = data.sceneData
    delete document.data.sceneData
    NVDocument.deserializeMeshDataObjects(document)
    return document
  }
}
