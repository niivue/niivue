import { Shader } from "./shader.js";
import * as mat from "gl-matrix";
import {
  vertOrientCubeShader,
  fragOrientCubeShader,
  vertSliceMMShader,
  fragSliceMMShader,
} from "./shader-srcs.js";
import {
  vertRectShader,
  vertLineShader,
  fragRectShader,
} from "./shader-srcs.js";
import {
  vertRenderShader,
  fragRenderShader,
  fragRenderGradientShader,
} from "./shader-srcs.js";
import { vertColorbarShader, fragColorbarShader } from "./shader-srcs.js";
import {
  vertFontShader,
  fragFontShader,
  vertBmpShader,
  fragBmpShader,
} from "./shader-srcs.js";
import {
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
  vertMeshShader,
  fragMeshShader,
  fragMeshToonShader,
  fragMeshMatcapShader,
  fragMeshOutlineShader,
  fragMeshEdgeShader,
  fragMeshHemiShader,
  fragMeshMatteShader,
  fragMeshDepthShader,
  fragMeshShaderSHBlue,
  vertFlatMeshShader,
  fragFlatMeshShader,
  vertFiberShader,
  fragFiberShader,
  vertSurfaceShader,
  fragSurfaceShader,
  fragVolumePickingShader,
  blurVertShader,
  blurFragShader,
  sobelFragShader,
} from "./shader-srcs.js";
import { Subject } from "rxjs";
import { orientCube } from "./orientCube.js";
import { NiivueObject3D } from "./niivue-object3D.js";
import { NVImage, NVImageFromUrlOptions, NVIMAGE_TYPE } from "./nvimage.js";
import { NVMesh, NVMeshFromUrlOptions } from "./nvmesh.js";
export { NVMesh, NVMeshFromUrlOptions } from "./nvmesh.js";
export { NVImage, NVImageFromUrlOptions } from "./nvimage";
export { NVController } from "./nvcontroller";
import { Log } from "./logger";
import defaultMatCap from "./matcaps/Shiny.jpg";
import defaultFontPNG from "./fonts/Roboto-Regular.png";
import defaultFontMetrics from "./fonts/Roboto-Regular.json";
import { cmapper } from "./colortables";
export { colortables, cmapper } from "./colortables";
import {
  NVDocument,
  SLICE_TYPE,
  DRAG_MODE,
  DEFAULT_OPTIONS,
} from "./nvdocument.js";
export { NVDocument, SLICE_TYPE } from "./nvdocument.js";

const log = new Log();

const MESH_EXTENSIONS = [
  "ASC",
  "BYU",
  "DFS",
  "FSM",
  "PIAL",
  "ORIG",
  "INFLATED",
  "SMOOTHWM",
  "SPHERE",
  "WHITE",
  "G",
  "GEO",
  "GII",
  "ICO",
  "MZ3",
  "NV",
  "OBJ",
  "OFF",
  "PLY",
  "SRF",
  "STL",
  "TCK",
  "TRACT",
  "TRI",
  "TRK",
  "TRX",
  "VTK",
  "X3D",
  "JCON",
  "JSON",
];

const LEFT_MOUSE_BUTTON = 0;
const CENTER_MOUSE_BUTTON = 1;
const RIGHT_MOUSE_BUTTON = 2;

/**
 * Niivue exposes many properties. It's always good to call `updateGLVolume` after altering one of these settings.
 * @typedef {Object} NiivueOptions
 * @property {number} [options.textHeight=0.06] the text height for orientation labels (0 to 1). Zero for no text labels
 * @property {number} [options.colorbarHeight=0.05] size of colorbar. 0 for no colorbars, fraction of Nifti j dimension
 * @property {number} [options.colorbarMargin=0.05] padding around colorbar when displayed
 * @property {number} [options.crosshairWidth=1] crosshair size. Zero for no crosshair
 * @property {number} [options.rulerWidth=4] ruler size. Zero (or isRuler is false) for no ruler
 * @property {array}  [options.backColor=[0,0,0,1]] the background color. RGBA values from 0 to 1. Default is black
 * @property {array}  [options.crosshairColor=[1,0,0,1]] the crosshair color. RGBA values from 0 to 1. Default is red
 * @property {array}  [options.fontColor=[0.5,0.5,0.5,1]] the font color. RGBA values from 0 to 1. Default is gray
 * @property {array}  [options.selectionBoxColor=[1,1,1,0.5]] the selection box color when the intensty selection box is shown (right click and drag). RGBA values from 0 to 1. Default is transparent white
 * @property {array}  [options.clipPlaneColor=[1,1,1,0.5]] the color of the visible clip plane. RGBA values from 0 to 1. Default is white
 * @property {array}  [options.rulerColor=[1, 0, 0, 0.8]] the color of the ruler. RGBA values from 0 to 1. Default is translucent red
 * @property {boolean} [options.show3Dcrosshair=false] true/false whether crosshairs are shown on 3D rendering
 * @property {boolean} [options.trustCalMinMax=true] true/false whether to trust the nifti header values for cal_min and cal_max. Trusting them results in faster loading because we skip computing these values from the data
 * @property {string} [options.clipPlaneHotKey="KeyC"] the keyboard key used to cycle through clip plane orientations. The default is "c"
 * @property {string} [options.viewModeHotKey="KeyV"] the keyboard key used to cycle through view modes. The default is "v"
 * @property {number} [options.keyDebounceTime=50] the keyUp debounce time in milliseconds. The default is 50 ms. You must wait this long before a new hot-key keystroke will be registered by the event listener
 * @property {number} [options.doubleTouchTimeout=500] the maximum time in milliseconds for a double touch to be detected. The default is 500 ms
 * @property {number} [options.longTouchTimeout=1000] the minimum time in milliseconds for a touch to count as long touch. The default is 1000 ms
 * @property {boolean} [options.isRadiologicalConvention=false] whether or not to use radiological convention in the display
 * @property {boolean} [options.logging=false] turn on logging or not (true/false)
 * @property {string} [options.loadingText="waiting on images..."] the loading text to display when there is a blank canvas and no images
 * @property {boolean} [options.dragAndDropEnabled=true] whether or not to allow file and url drag and drop on the canvas
 * @property {boolean} [options.isNearestInterpolation=false] whether nearest neighbor interpolation is used, else linear interpolation
 * @property {boolean} [options.isAtlasOutline=false] whether atlas maps are only visible at the boundary of regions
 * @property {boolean} [options.isRuler=false] whether a 10cm ruler is displayed
 * @property {boolean} [options.isColorbar=false] whether colorbar(s) are shown illustrating values for color maps
 * @property {boolean} [options.isOrientCube=false] whether orientation cube is shown for 3D renderings
 * @property {number} [options.multiplanarPadPixels=0] spacing between tiles of a multiplanar view
 * @property {boolean} [options.multiplanarForceRender=false] always show rendering in multiplanar view
 * @property {number} [options.meshThicknessOn2D=Infinity] 2D slice views can show meshes within this range. Meshes only visible in sliceMM (world space) mode
 * @property {DRAG_MODE} [options.dragMode=contrast] behavior for dragging (none, contrast, measurement, pan)
 * @property {boolean} [options.isDepthPickMesh=false] when both voxel-based image and mesh is loaded, will depth picking be able to detect mesh or only voxels
 * @property {boolean} [options.isCornerOrientationText=false] should slice text be shown in the upper right corner instead of the center of left and top axes?
 * @property {boolean} [options.sagittalNoseLeft=false] should 2D sagittal slices show the anterior direction toward the left or right?
 * @property {boolean} [options.isSliceMM=false] are images aligned to voxel space (false) or world space (true)
 * @property {boolean} [options.isHighResolutionCapable=true] demand that high-dot-per-inch displays use native voxel size
 * @property {boolean} [options.drawingEnabled=false] allow user to create and edit voxel-based drawings
 * @property {number} [options.penValue=Infinity] color of drawing when user drags mouse (if drawingEnabled)
 * @property {number} [options.penValue=Infinity] color of drawing when user drags mouse (if drawingEnabled)
 * @property {boolean} [options.floodFillNeighbors=6] does a voxel have 6 (face), 18 (edge) or 26 (corner) neighbors?
 * @property {number} [options.maxDrawUndoBitmaps=8] number of possible undo steps (if drawingEnabled)
 * @property {string} [options.thumbnail=""] optional 2D png bitmap that can be rapidly loaded to defer slow loading of 3D image
 * @example
 * niivue.opts.isColorbar = true;
 * niivue.updateGLVolume()
 * @see {@link https://niivue.github.io/niivue/features/mosaics2.html|live demo usage}
 */

/**
 * @class Niivue
 * @type Niivue
 * @description
 * Niivue can be attached to a canvas. An instance of Niivue contains methods for
 * loading and rendering NIFTI image data in a WebGL 2.0 context.
 * @constructor
 * @param {NiivueOptions} [options={}] options object to set modifiable Niivue properties
 * @example
 * let niivue = new Niivue({crosshairColor: [0,1,0,0.5], textHeight: 0.5}) // a see-through green crosshair, and larger text labels
 */
export function Niivue(options = {}) {
  this.canvas = null; // the canvas element on the page
  this.gl = null; // the gl context
  this.isBusy = false;
  this.needsRefresh = false;
  this.colormapTexture = null;
  this.colormapLists = []; //one entry per colorbar: min, max, tic
  this.volumeTexture = null;
  this.gradientTexture = null; //3D texture for volume rnedering lighting
  this.gradientTextureAmount = 0.0;
  this.drawTexture = null; //the GPU memory storage of the drawing
  this.drawUndoBitmaps = [];
  this.drawLut = cmapper.makeDrawLut("$itksnap");
  this.drawOpacity = 0.8;
  this.renderDrawAmbientOcclusion = 0.4;
  this.colorbarHeight = 0; //height in pixels, set when colorbar is drawn
  this.drawPenLocation = [NaN, NaN, NaN];
  this.drawPenAxCorSag = -1; //do not allow pen to drag between Sagittal/Coronal/Axial
  this.drawFillOverwrites = true;
  this.drawPenFillPts = []; //store mouse points for filled pen
  this.overlayTexture = null;
  this.overlayTextureID = [];
  this.sliceMMShader = null;
  this.orientCubeShader = null;
  this.orientCubeShaderVAO = null;
  this.rectShader = null;
  this.renderShader = null;
  this.renderGradientShader = null;
  this.renderVolumeShader = null;
  this.pickingMeshShader = null;
  this.pickingImageShader = null;
  this.colorbarShader = null;
  this.fontShader = null;
  this.fontTexture = null;
  this.matCapTexture = null;
  this.bmpShader = null;
  this.bmpTexture = null; //thumbnail WebGLTexture object
  this.thumbnailVisible = false;
  this.bmpTextureWH = 1.0; //thumbnail width/height ratio
  this.growCutShader = null;
  this.orientShaderAtlasU = null;
  this.orientShaderAtlasI = null;
  this.orientShaderU = null;
  this.orientShaderI = null;
  this.orientShaderF = null;
  this.orientShaderRGBU = null;
  this.surfaceShader = null;
  this.blurShader = null;
  this.sobelShader = null;
  this.genericVAO = null; //used for 2D slices, 2D lines, 2D Fonts
  this.unusedVAO = null;
  this.crosshairs3D = null;
  this.DEFAULT_FONT_GLYPH_SHEET = defaultFontPNG; //"/fonts/Roboto-Regular.png";
  this.DEFAULT_FONT_METRICS = defaultFontMetrics; //"/fonts/Roboto-Regular.json";
  this.fontMets = null;
  this.backgroundMasksOverlays = 0;
  this.overlayOutlineWidth = 0; //float, 0 for none
  this.overlayAlphaShader = 1; //float, 1 for opaque
  this.isAlphaClipDark = false;

  this.syncOpts = {};
  this.readyForSync = false;

  // UI Data
  this.uiData = {};
  this.uiData.mousedown = false;
  this.uiData.touchdown = false;
  this.uiData.mouseButtonLeftDown = false;
  this.uiData.mouseButtonCenterDown = false;
  this.uiData.mouseButtonRightDown = false;
  this.uiData.mouseDepthPicker = false;
  this.uiData.pan2Dxyzmm = [0, 0, 0, 1];
  this.uiData.pan2DxyzmmAtMouseDown = [0, 0, 0, 1];
  this.uiData.prevX = 0;
  this.uiData.prevY = 0;
  this.uiData.currX = 0;
  this.uiData.currY = 0;
  this.uiData.currentTouchTime = 0;
  this.uiData.lastTouchTime = 0;
  this.uiData.touchTimer = null;
  this.uiData.doubleTouch = false;
  this.uiData.isDragging = false;
  this.uiData.dragStart = [0.0, 0.0];
  this.uiData.dragEnd = [0.0, 0.0];
  this.uiData.dragClipPlaneStartDepthAziElev = [0, 0, 0];
  this.uiData.lastTwoTouchDistance = 0;
  this.uiData.multiTouchGesture = false;
  this.uiData.loading$ = new Subject(); // whether or not the scene is loading
  // mapping of keys (event strings) to rxjs subjects
  this.eventsToSubjects = {
    loading: this.uiData.loading$,
  };

  this.back = {}; // base layer; defines image space to work in. Defined as this.volumes[0] in Niivue.loadVolumes
  this.overlays = []; // layers added on top of base image (e.g. masks or stat maps). Essentially everything after this.volumes[0] is an overlay. So is this necessary?
  this.deferredVolumes = [];
  this.deferredMeshes = [];
  this.furthestVertexFromOrigin = 100;
  this.volScale = [];
  this.vox = [];
  this.mousePos = [0, 0];
  this.screenSlices = []; // empty array

  this.otherNV = null; // another niivue instance that we wish to sync position with
  this.volumeObject3D = null;
  this.pivot3D = [0, 0, 0]; //center for rendering rotation
  this.furthestFromPivot = 10.0; //most distant point from pivot

  this.currentClipPlaneIndex = 0;
  this.lastCalled = new Date().getTime();

  this.selectedObjectId = -1;
  this.CLIP_PLANE_ID = 1;
  this.VOLUME_ID = 254;
  this.DISTANCE_FROM_CAMERA = -0.54;
  this.graph = [];
  this.graph.LTWH = [0, 0, 640, 480];
  this.graph.opacity = 0.0;
  this.graph.vols = [0]; //e.g. timeline for background volume only, e.g. [0,2] for first and third volumes
  this.graph.autoSizeMultiplanar = false;
  this.graph.normalizeValues = false;
  this.meshShaders = [
    {
      Name: "Phong",
      Frag: fragMeshShader,
    },
    {
      Name: "Matte",
      Frag: fragMeshMatteShader,
    },
    {
      Name: "Harmonic",
      Frag: fragMeshShaderSHBlue,
    },
    {
      Name: "Hemispheric",
      Frag: fragMeshHemiShader,
    },
    {
      Name: "Edge",
      Frag: fragMeshEdgeShader,
    },
    {
      Name: "Outline",
      Frag: fragMeshOutlineShader,
    },
    {
      Name: "Toon",
      Frag: fragMeshToonShader,
    },
    {
      Name: "Flat",
      Frag: fragFlatMeshShader,
    },
    {
      Name: "Matcap",
      Frag: fragMeshMatcapShader,
    },
  ];

  // Event listeners

  // Defaults
  this.onContrastDragRelease = this.calculateNewRange; // function to call when contrast drag is released by default. Can be overridden by user
  this.onMouseUp = () => {};
  this.onLocationChange = () => {};
  this.onIntensityChange = () => {};
  this.onImageLoaded = () => {};
  this.onMeshLoaded = () => {};
  this.onFrameChange = () => {};
  this.onError = () => {};
  this.onInfo = () => {};
  this.onWarn = () => {};
  this.onDebug = () => {};
  this.onVolumeAddedFromUrl = () => {};
  this.onVolumeWithUrlRemoved = () => {};
  this.onVolumeUpdated = () => {};
  this.onMeshAddedFromUrl = () => {};
  this.onMeshAdded = () => {};
  this.onMeshWithUrlRemoved = () => {};
  this.onZoom3DChange = () => {};
  this.onAzimuthElevationChange = () => {};
  this.onClipPlaneChange = () => {};
  this.onCustomMeshShaderAdded = () => {};
  this.onMeshShaderChanged = () => {};
  this.onMeshPropertyChanged = () => {};
  this.onDocumentLoaded = () => {};
  this.document = new NVDocument();

  this.opts = { ...DEFAULT_OPTIONS };
  this.scene = { ...this.document.scene };

  // populate Niivue with user supplied options
  for (const name in options) {
    if (typeof options[name] === "function") {
      this[name] = options[name];
    } else {
      // this.opts[name] = options[name];
      this.opts[name] =
        DEFAULT_OPTIONS[name] === undefined
          ? DEFAULT_OPTIONS[name]
          : options[name];
    }
  }

  if (this.opts.isHighResolutionCapable) {
    this.uiData.dpr = window.devicePixelRatio || 1;
  } else {
    this.uiData.dpr = 1;
  }
  this.dragModes = [];
  this.dragModes.contrast = DRAG_MODE.contrast;
  this.dragModes.measurement = DRAG_MODE.measurement;
  this.dragModes.none = DRAG_MODE.none;
  this.dragModes.pan = DRAG_MODE.pan;
  this.dragModes.slicer3D = DRAG_MODE.slicer3D;
  this.sliceTypeAxial = SLICE_TYPE.AXIAL;
  this.sliceTypeCoronal = SLICE_TYPE.CORONAL;
  this.sliceTypeSagittal = SLICE_TYPE.SAGITTAL;
  this.sliceTypeMultiplanar = SLICE_TYPE.MULTIPLANAR;
  this.sliceTypeRender = SLICE_TYPE.RENDER;
  this.sliceMosaicString = "";

  this.mediaUrlMap = new Map();

  this.initialized = false;

  // now that opts have been parsed, set the current undo to max undo
  this.currentDrawUndoBitmap = this.opts.maxDrawUndoBitmaps; //analogy: cylinder position of a revolver

  if (this.opts.drawingEnabled) {
    this.createEmptyDrawing();
  }

  if (this.opts.thumbnail.length > 0) {
    this.thumbnailVisible = true;
  }

  this.loadingText = this.opts.loadingText;
  log.setLogLevel(this.opts.logging);

  // rxjs subscriptions. Keeping a reference array like this allows us to unsubscribe later
  this.subscriptions = [];
}

// Object.defineProperty(Niivue.prototype, "scene", {
//   get: function () {
//     return this.document.scene;
//   },
// });

// Object.defineProperty(Niivue.prototype, "opts", {
//   get: function () {
//     return this.document.opts;
//   },
// });

Object.defineProperty(Niivue.prototype, "volumes", {
  get: function () {
    return this.document.volumes;
  },
  set: function (volumes) {
    this.document.volumes = volumes;
  },
});

Object.defineProperty(Niivue.prototype, "meshes", {
  get: function () {
    return this.document.meshes;
  },
  set: function (meshes) {
    this.document.meshes = meshes;
  },
});

Object.defineProperty(Niivue.prototype, "drawBitmap", {
  get: function () {
    return this.document.drawBitmap;
  },
  set: function (drawBitmap) {
    this.document.drawBitmap = drawBitmap;
  },
});

// Object.defineProperty(Niivue.prototype, "sliceType", {
//   get: function () {
//     return this.document.opts.sliceType;
//   },
//   set: function (sliceType) {
//     this.document.opts.sliceType = sliceType;
//   },
// });

/**
 * save webgl2 canvas as png format bitmap
 * @param {string} [filename='niivue.png'] filename for screen capture
 * @example niivue.saveScene('test.png');
 * @see {@link https://niivue.github.io/niivue/features/ui.html|live demo usage}
 */
Niivue.prototype.saveScene = function (filename = "niivue.png") {
  function saveBlob(blob, name) {
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    a.remove();
  }

  let canvas = this.canvas;
  this.drawScene();
  canvas.toBlob((blob) => {
    if (filename === "") {
      filename = `niivue-screenshot-${new Date().toString()}.png`;
      filename = filename.replace(/\s/g, "_");
    }
    saveBlob(blob, filename);
  });
};

/**
 * attach the Niivue instance to the webgl2 canvas by element id
 * @param {string} id the id of an html canvas element
 * @example niivue = new Niivue().attachTo('gl')
 * @example niivue.attachTo('gl')
 * @see {@link https://niivue.github.io/niivue/features/multiplanar.html|live demo usage}
 */
Niivue.prototype.attachTo = async function (id, isAntiAlias = null) {
  await this.attachToCanvas(document.getElementById(id), isAntiAlias);
  log.debug("attached to element with id: ", id);
  return this;
}; // attachTo

// on handles matching event strings (event) with know rxjs subjects within NiiVue.
// if the event string exists (e.g. 'location') then the corresponding rxjs subject reference
// is extracted from this.eventsToSubjects and the callback passed as the second argument to NiiVue.on
// is added to the subsciptions to the next method. These callbacks are called whenever subject.next is called within
// various NiiVue methods.

/**
 * register a callback function to run when known Niivue events happen
 * @param {("location")} event the name of the event to watch for. Event names are shown in the type column
 * @param {function} callback the function to call when the event happens
 * @example
 * niivue = new Niivue()
 *
 * // 'location' update event is fired when the crosshair changes position via user input
 * function doSomethingWithLocationData(data){
 *    // data has the shape {mm: [N, N, N], vox: [N, N, N], frac: [N, N, N], values: this.volumes.map(v => {return val})}
 *    //...
 * }
 */
Niivue.prototype.on = function (event, callback) {
  let knownEvents = Object.keys(this.eventsToSubjects);
  if (knownEvents.indexOf(event) == -1) {
    return;
  }
  let subject = this.eventsToSubjects[event];
  let subscription = subject.subscribe({
    next: (data) => callback(data),
  });
  this.subscriptions.push({ [event]: subscription });
};

/**
 * off unsubscribes events and subjects (the opposite of on)
 * @param {("location")} event the name of the event to watch for. Event names are shown in the type column
 * @example
 * niivue = new Niivue()
 * niivue.off('location')
 */
Niivue.prototype.off = function (event) {
  let knownEvents = Object.keys(this.eventsToSubjects);
  if (knownEvents.indexOf(event) == -1) {
    return;
  }
  let nsubs = this.subscriptions.length;
  for (let i = 0; i < nsubs; i++) {
    let key = Object.keys(this.subscriptions[i])[0];
    if (key === event) {
      this.subscriptions[i][event].unsubscribe();
      this.subscriptions.splice(i, 1);
      return;
    }
  }
};

/**
 * attach the Niivue instance to a canvas element directly
 * @param {object} canvas the canvas element reference
 * @example
 * niivue = new Niivue()
 * niivue.attachToCanvas(document.getElementById(id))
 */
Niivue.prototype.attachToCanvas = async function (canvas, isAntiAlias = null) {
  this.canvas = canvas;
  if (isAntiAlias === null) {
    isAntiAlias = navigator.hardwareConcurrency > 6;
    log.debug(
      "AntiAlias ",
      isAntiAlias,
      " Threads ",
      navigator.hardwareConcurrency
    );
  }
  this.gl = this.canvas.getContext("webgl2", {
    alpha: true,
    antialias: isAntiAlias,
  });
  if (!this.gl) {
    alert(
      "unable to get webgl2 context. Perhaps this browser does not support webgl2"
    );
    log.warn(
      "unable to get webgl2 context. Perhaps this browser does not support webgl2"
    );
  }

  console.log(
    "NIIVUE VERSION ",
    typeof __NIIVUE_VERSION__ === "undefined"
      ? "null (niivue was likely built in a parent project rather than using the pre-bundled version)"
      : __NIIVUE_VERSION__
  ); // TH added this rare console.log via suggestion from CR. Don't remove

  // set parent background container to black (default empty canvas color)
  // avoids white cube around image in 3D render mode
  this.canvas.parentElement.style.backgroundColor = "black";
  // fill all space in parent
  if (this.opts.isResizeCanvas) {
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    window.addEventListener("resize", this.resizeListener.bind(this)); // must bind 'this' niivue object or else 'this' becomes 'window'
  }
  this.registerInteractions(); // attach mouse click and touch screen event handlers for the canvas
  await this.init();
  this.drawScene();
  return this;
};

/**
 * Sync the scene controls (orientation, crosshair location, etc.) from one Niivue instance to another. useful for using one canvas to drive another.
 * @param {object} otherNV the other Niivue instance that is the main controller
 * @example
 * niivue1 = new Niivue()
 * niivue2 = new Niivue()
 * niivue2.syncWith(niivue1)
 */
Niivue.prototype.syncWith = function (
  otherNV,
  syncOpts = { "2d": true, "3d": true }
) {
  this.otherNV = otherNV;
  this.syncOpts = syncOpts;
};

// not included in public docs
Niivue.prototype.sync = function () {
  if (!this.otherNV || typeof this.otherNV === "undefined") {
    return;
  }
  if (!this.otherNV.readyForSync || !this.readyForSync) {
    return;
  }
  let thisMM = this.frac2mm(this.scene.crosshairPos);
  if (this.syncOpts["2d"]) {
    this.otherNV.scene.crosshairPos = this.otherNV.mm2frac(thisMM);
  }
  if (this.syncOpts["3d"]) {
    this.otherNV.scene.renderAzimuth = this.scene.renderAzimuth;
    this.otherNV.scene.renderElevation = this.scene.renderElevation;
  }
  this.otherNV.drawScene();
  this.otherNV.createOnLocationChange();
};

/* Not documented publicly for now
 * test if two arrays have equal values for each element
 * @param {Array} a the first array
 * @param {Array} b the second array
 * @example Niivue.arrayEquals(a, b)
 */
Niivue.prototype.arrayEquals = function (a, b) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
};

// not included in public docs
//handle window resizing
// note: no test yet
Niivue.prototype.resizeListener = function () {
  if (!this.opts.isResizeCanvas) {
    if (this.opts.isHighResolutionCapable) {
      log.warn("isHighResolutionCapable requires isResizeCanvas");
      this.opts.isHighResolutionCapable = false;
    }
    this.uiData.dpr = 1;
    this.drawScene();
    return;
  }
  this.canvas.style.width = "100%";
  this.canvas.style.height = "100%";
  //https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
  //https://www.khronos.org/webgl/wiki/HandlingHighDPI
  if (this.opts.isHighResolutionCapable) {
    this.uiData.dpr = window.devicePixelRatio || 1;
    log.debug("devicePixelRatio: " + this.uiData.dpr);
  } else {
    this.uiData.dpr = 1;
  }
  if (this.canvas.parentElement.hasOwnProperty("width")) {
    this.canvas.width = this.canvas.parentElement.width * this.uiData.dpr;
    this.canvas.height = this.canvas.parentElement.height * this.uiData.dpr;
  } else {
    this.canvas.width = this.canvas.offsetWidth * this.uiData.dpr;
    this.canvas.height = this.canvas.offsetHeight * this.uiData.dpr;
  }
  this.drawScene();
};

/* Not included in public docs
 * The following two functions are to address offset issues
 * https://stackoverflow.com/questions/42309715/how-to-correctly-pass-mouse-coordinates-to-webgl
 * note:  no test yet
 */
Niivue.prototype.getRelativeMousePosition = function (event, target) {
  target = target || event.target;
  var rect = target.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};

// not included in public docs
// assumes target or event.target is canvas
// note: no test yet
Niivue.prototype.getNoPaddingNoBorderCanvasRelativeMousePosition = function (
  event,
  target
) {
  target = target || event.target;
  var pos = this.getRelativeMousePosition(event, target);

  //pos.x = (pos.x * target.width) / target.clientWidth;
  //pos.y = (pos.y * target.height) / target.clientHeight;

  return pos;
};

// not included in public docs
// handler for context menu (right click)
// here, we disable the normal context menu so that
// we can use some custom right click events
// note: no test yet
Niivue.prototype.mouseContextMenuListener = function (e) {
  e.preventDefault();
};

// not included in public docs
// handler for all mouse button presses
// note: no test yet
Niivue.prototype.mouseDownListener = function (e) {
  e.preventDefault();
  // var rect = this.canvas.getBoundingClientRect();
  this.drawPenLocation = [NaN, NaN, NaN];
  this.drawPenAxCorSag = -1;
  this.uiData.mousedown = true;
  log.debug("mouse down");
  log.debug(e);
  if (e.button === LEFT_MOUSE_BUTTON && e.shiftKey) {
    this.uiData.mouseButtonCenterDown = true;
    this.mouseCenterButtonHandler(e);
  } else if (e.button === LEFT_MOUSE_BUTTON) {
    this.uiData.mouseButtonLeftDown = true;
    this.mouseLeftButtonHandler(e);
  } else if (e.button === RIGHT_MOUSE_BUTTON) {
    this.uiData.mouseButtonRightDown = true;
    this.mouseRightButtonHandler(e);
  } else if (e.button === CENTER_MOUSE_BUTTON) {
    this.uiData.mouseButtonCenterDown = true;
    this.mouseCenterButtonHandler(e);
  }
};

// not included in public docs
// handler for mouse left button down
// note: no test yet
Niivue.prototype.mouseLeftButtonHandler = function (e) {
  let pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(
    e,
    this.gl.canvas
  );
  this.mouseDown(pos.x, pos.y);
  this.mouseClick(pos.x, pos.y);
};

// not included in public docs
// handler for mouse center button down
// note: no test yet
Niivue.prototype.mouseCenterButtonHandler = function (e) {
  //this.uiData.isDragging = true;
  let pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(
    e,
    this.gl.canvas
  );
  this.mousePos = [pos.x * this.uiData.dpr, pos.y * this.uiData.dpr];
  if (this.opts.dragMode === DRAG_MODE.none) return;
  this.setDragStart(pos.x, pos.y);
  if (!this.uiData.isDragging)
    this.uiData.pan2DxyzmmAtMouseDown = this.uiData.pan2Dxyzmm.slice();
  this.uiData.isDragging = true;
  this.uiData.dragClipPlaneStartDepthAziElev = this.scene.clipPlaneDepthAziElev;
  return;
};
// not included in public docs
// handler for mouse right button down
// note: no test yet
Niivue.prototype.mouseRightButtonHandler = function (e) {
  //this.uiData.isDragging = true;
  let pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(
    e,
    this.gl.canvas
  );
  this.mousePos = [pos.x * this.uiData.dpr, pos.y * this.uiData.dpr];
  if (this.opts.dragMode === DRAG_MODE.none) return;
  this.setDragStart(pos.x, pos.y);
  if (!this.uiData.isDragging)
    this.uiData.pan2DxyzmmAtMouseDown = this.uiData.pan2Dxyzmm.slice();
  this.uiData.isDragging = true;
  this.uiData.dragClipPlaneStartDepthAziElev = this.scene.clipPlaneDepthAziElev;
  return;
};

// not included in public docs
Niivue.prototype.calculateMinMaxVoxIdx = function (array) {
  if (array.length > 2) {
    throw new Error("array must not contain more than two values");
  }
  return [
    Math.floor(Math.min(array[0], array[1])),
    Math.floor(Math.max(array[0], array[1])),
  ];
};

// not included in public docs
function intensityRaw2Scaled(hdr, raw) {
  if (hdr.scl_slope === 0) hdr.scl_slope = 1.0;
  return raw * hdr.scl_slope + hdr.scl_inter;
}

// not included in public docs
// note: no test yet
Niivue.prototype.calculateNewRange = function ({
  fracStart = null,
  fracEnd = null,
  volIdx = 0,
} = {}) {
  if (
    this.opts.sliceType === SLICE_TYPE.RENDER &&
    this.sliceMosaicString.length < 1
  ) {
    return;
  }
  if (
    this.uiData.dragStart[0] === this.uiData.dragEnd[0] &&
    this.uiData.dragStart[1] === this.uiData.dragEnd[1]
  )
    return;
  // calculate our box
  let frac = this.canvasPos2frac([
    this.uiData.dragStart[0],
    this.uiData.dragStart[1],
  ]);
  if (frac[0] < 0) return;
  let startVox = this.frac2vox(frac, volIdx);
  frac = this.canvasPos2frac([this.uiData.dragEnd[0], this.uiData.dragEnd[1]]);
  if (frac[0] < 0) return;
  let endVox = this.frac2vox(frac, volIdx);

  let hi = -Number.MAX_VALUE;
  let lo = Number.MAX_VALUE;
  let xrange = this.calculateMinMaxVoxIdx([startVox[0], endVox[0]]);
  let yrange = this.calculateMinMaxVoxIdx([startVox[1], endVox[1]]);
  let zrange = this.calculateMinMaxVoxIdx([startVox[2], endVox[2]]);

  // for our constant dimension we add one so that the for loop runs at least once
  if (startVox[0] - endVox[0] === 0) {
    xrange[1] = startVox[0] + 1;
  } else if (startVox[1] - endVox[1] === 0) {
    yrange[1] = startVox[1] + 1;
  } else if (startVox[2] - endVox[2] === 0) {
    zrange[1] = startVox[2] + 1;
  }

  const hdr = this.volumes[volIdx].hdr;
  const img = this.volumes[volIdx].img;

  const xdim = hdr.dims[1];
  const ydim = hdr.dims[2];
  for (let z = zrange[0]; z < zrange[1]; z++) {
    let zi = z * xdim * ydim;
    for (let y = yrange[0]; y < yrange[1]; y++) {
      let yi = y * xdim;
      for (let x = xrange[0]; x < xrange[1]; x++) {
        let index = zi + yi + x;
        if (lo > img[index]) {
          lo = img[index];
        }
        if (hi < img[index]) {
          hi = img[index];
        }
      }
    }
  }
  if (lo >= hi) return; //no variability or outside volume
  var mnScale = intensityRaw2Scaled(hdr, lo);
  var mxScale = intensityRaw2Scaled(hdr, hi);
  this.volumes[volIdx].cal_min = mnScale;
  this.volumes[volIdx].cal_max = mxScale;
  this.onIntensityChange(this.volumes[volIdx]);
};

// not included in public docs
// handler for mouse button up (all buttons)
// note: no test yet
Niivue.prototype.mouseUpListener = function () {
  function isFunction(test) {
    return Object.prototype.toString.call(test).indexOf("Function") > -1;
  }
  //let fracPos = this.canvasPos2frac(this.mousePos);
  let uiData = {
    mouseButtonRightDown: this.uiData.mouseButtonRightDown,
    mouseButtonCenterDown: this.uiData.mouseButtonCenterDown,
    isDragging: this.uiData.isDragging,
    mousePos: this.mousePos,
    fracPos: this.canvasPos2frac(this.mousePos),
    //xyzMM: this.frac2mm(fracPos),
  };
  this.uiData.mousedown = false;
  this.uiData.mouseButtonRightDown = false;
  let wasCenterDown = this.uiData.mouseButtonCenterDown;
  this.uiData.mouseButtonCenterDown = false;
  this.uiData.mouseButtonLeftDown = false;
  if (this.drawPenFillPts.length > 0) this.drawPenFilled();
  else if (this.drawPenAxCorSag >= 0) this.drawAddUndoBitmap();
  this.drawPenLocation = [NaN, NaN, NaN];
  this.drawPenAxCorSag = -1;
  if (isFunction(this.onMouseUp)) this.onMouseUp(uiData);
  if (this.uiData.isDragging) {
    this.uiData.isDragging = false;
    if (this.opts.dragMode !== DRAG_MODE.contrast) return;
    if (wasCenterDown) return;
    if (
      this.uiData.dragStart[0] === this.uiData.dragEnd[0] &&
      this.uiData.dragStart[1] === this.uiData.dragEnd[1]
    )
      return;

    let fracStart = this.canvasPos2frac([
      this.uiData.dragStart[0],
      this.uiData.dragStart[1],
    ]);
    let fracEnd = this.canvasPos2frac([
      this.uiData.dragEnd[0],
      this.uiData.dragEnd[1],
    ]);
    this.onContrastDragRelease({ fracStart, fracEnd, volIdx: 0 });
    this.refreshLayers(this.volumes[0], 0, this.volumes.length);
  }
  this.drawScene();
};

// not included in public docs
Niivue.prototype.checkMultitouch = function (e) {
  if (this.uiData.touchdown && !this.uiData.multiTouchGesture) {
    var rect = this.canvas.getBoundingClientRect();
    this.mouseDown(
      e.touches[0].clientX - rect.left,
      e.touches[0].clientY - rect.top
    );

    this.mouseClick(
      e.touches[0].clientX - rect.left,
      e.touches[0].clientY - rect.top
    );
  }
};

// not included in public docs
// handler for single finger touch event (like mouse down)
// note: no test yet
Niivue.prototype.touchStartListener = function (e) {
  e.preventDefault();
  if (!this.uiData.touchTimer) {
    this.uiData.touchTimer = setTimeout(() => {
      //this.drawScene()
      this.resetBriCon(e);
    }, this.opts.longTouchTimeout);
  }
  this.uiData.touchdown = true;
  this.uiData.currentTouchTime = new Date().getTime();
  let timeSinceTouch = this.uiData.currentTouchTime - this.uiData.lastTouchTime;
  if (timeSinceTouch < this.opts.doubleTouchTimeout && timeSinceTouch > 0) {
    this.uiData.doubleTouch = true;
    this.setDragStart(
      e.targetTouches[0].clientX - e.target.getBoundingClientRect().left,
      e.targetTouches[0].clientY - e.target.getBoundingClientRect().top
    );
    this.resetBriCon(e);
    this.uiData.lastTouchTime = this.uiData.currentTouchTime;
    return;
  } else {
    // reset values to be ready for next touch
    this.uiData.doubleTouch = false;
    this.setDragStart(0, 0);
    this.setDragEnd(0, 0);
    this.uiData.lastTouchTime = this.uiData.currentTouchTime;
  }
  if (this.uiData.touchdown && e.touches.length < 2) {
    this.uiData.multiTouchGesture = false;
  } else {
    this.uiData.multiTouchGesture = true;
  }
  setTimeout(this.checkMultitouch.bind(this), 1, e);
};

// not included in public docs
// handler for touchend (finger lift off screen)
// note: no test yet
Niivue.prototype.touchEndListener = function (e) {
  e.preventDefault();
  this.uiData.touchdown = false;
  this.uiData.lastTwoTouchDistance = 0;
  this.uiData.multiTouchGesture = false;
  if (this.uiData.touchTimer) {
    clearTimeout(this.uiData.touchTimer);
    this.uiData.touchTimer = null;
  }
  if (this.uiData.isDragging) {
    this.uiData.isDragging = false;
    //if (this.opts.isDragShowsMeasurementTool) return;
    if (this.opts.dragMode !== DRAG_MODE.contrast) return;
    this.calculateNewRange();
    this.refreshLayers(this.volumes[0], 0, this.volumes.length);
  }
  //mouseUp generates this.drawScene();
  this.mouseUpListener();
};

// not included in public docs
// handler for mouse move over canvas
// note: no test yet
Niivue.prototype.mouseMoveListener = async function (e) {
  // move crosshair and change slices if mouse click and move
  if (this.uiData.mousedown) {
    let pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(
      e,
      this.gl.canvas
    );
    if (this.uiData.mouseButtonLeftDown) {
      this.mouseMove(pos.x, pos.y);
      this.mouseClick(pos.x, pos.y);
    } else if (
      this.uiData.mouseButtonRightDown ||
      this.uiData.mouseButtonCenterDown
    ) {
      this.setDragEnd(pos.x, pos.y);
    }
    await this.drawScene();
    this.uiData.prevX = this.uiData.currX;
    this.uiData.prevY = this.uiData.currY;
  }
};

// not included in public docs
// note: should update this to accept a volume index to reset a selected volume rather than only the background (TODO)
// reset brightness and contrast to global min and max
// note: no test yet
Niivue.prototype.resetBriCon = function (msg = null) {
  //this.volumes[0].cal_min = this.volumes[0].global_min;
  //this.volumes[0].cal_max = this.volumes[0].global_max;
  // don't reset bri/con if the user is in 3D mode and double clicks
  if (this.uiData.isDragging) return;
  let isRender = false;
  if (this.opts.sliceType === SLICE_TYPE.RENDER) isRender = true;
  let x = 0;
  let y = 0;
  if (msg !== null) {
    // if a touch event
    if (msg.targetTouches !== undefined) {
      x =
        msg.targetTouches[0].clientX - msg.target.getBoundingClientRect().left;
      y = msg.targetTouches[0].clientY - msg.target.getBoundingClientRect().top;
    } else {
      // if a mouse event
      x = msg.offsetX;
      y = msg.offsetY;
    }
    x *= this.uiData.dpr;
    y *= this.uiData.dpr;
    // test if render is one of the tiles
    if (this.inRenderTile(x, y) >= 0) isRender = true;
  }
  if (isRender) {
    this.uiData.mouseDepthPicker = true;
    this.drawScene();
    this.drawScene(); // this duplicate drawScene is necessary for depth picking. DO NOT REMOVE
    return;
  }
  if (this.opts.dragMode === DRAG_MODE.slicer3D) return;
  if (this.volumes.length < 1) return; //issue468, AFTER render depth picking
  if (this.uiData.doubleTouch) return;
  this.volumes[0].cal_min = this.volumes[0].robust_min;
  this.volumes[0].cal_max = this.volumes[0].robust_max;
  this.onIntensityChange(this.volumes[0]);
  this.refreshLayers(this.volumes[0], 0, this.volumes.length);
  this.drawScene();
};

Niivue.prototype.setDragStart = function (x, y) {
  x *= this.uiData.dpr;
  y *= this.uiData.dpr;
  this.uiData.dragStart[0] = x;
  this.uiData.dragStart[1] = y;
};

Niivue.prototype.setDragEnd = function (x, y) {
  x *= this.uiData.dpr;
  y *= this.uiData.dpr;
  this.uiData.dragEnd[0] = x;
  this.uiData.dragEnd[1] = y;
};

// not included in public docs
// handler for touch move (moving finger on screen)
// note: no test yet
Niivue.prototype.touchMoveListener = function (e) {
  if (this.uiData.touchdown && e.touches.length < 2) {
    var rect = this.canvas.getBoundingClientRect();
    if (!this.uiData.isDragging)
      this.uiData.pan2DxyzmmAtMouseDown = this.uiData.pan2Dxyzmm.slice();
    this.uiData.isDragging = true;
    if (this.uiData.doubleTouch && this.uiData.isDragging) {
      this.setDragEnd(
        e.targetTouches[0].clientX - e.target.getBoundingClientRect().left,
        e.targetTouches[0].clientY - e.target.getBoundingClientRect().top
      );
      this.drawScene();
      return;
    }
    this.mouseClick(
      e.touches[0].clientX - rect.left,
      e.touches[0].clientY - rect.top
    );
    this.mouseMove(
      e.touches[0].clientX - rect.left,
      e.touches[0].clientY - rect.top
    );
  } else {
    // Check this event for 2-touch Move/Pinch/Zoom gesture
    this.handlePinchZoom(e);
  }
};

// not included in public docs
Niivue.prototype.handlePinchZoom = function (e) {
  if (e.targetTouches.length == 2 && e.changedTouches.length == 2) {
    var dist = Math.hypot(
      e.touches[0].pageX - e.touches[1].pageX,
      e.touches[0].pageY - e.touches[1].pageY
    );

    var rect = this.canvas.getBoundingClientRect();
    this.mousePos = [
      e.touches[0].clientX - rect.left,
      e.touches[0].clientY - rect.top,
    ];

    // scroll 2D slices
    if (dist < this.uiData.lastTwoTouchDistance) {
      // this.scene.volScaleMultiplier = Math.max(0.5, this.scene.volScaleMultiplier * 0.95);
      this.sliceScroll2D(
        -0.01,
        e.touches[0].clientX - rect.left,
        e.touches[0].clientY - rect.top
      );
    } else {
      // this.scene.volScaleMultiplier = Math.min(2.0, this.scene.volScaleMultiplier * 1.05);
      this.sliceScroll2D(
        0.01,
        e.touches[0].clientX - rect.left,
        e.touches[0].clientY - rect.top
      );
    }
    // this.drawScene();
    this.uiData.lastTwoTouchDistance = dist;
  }
};

// not included in public docs
// handler for keyboard shortcuts
Niivue.prototype.keyUpListener = function (e) {
  if (e.code === this.opts.clipPlaneHotKey) {
    /*if (this.opts.sliceType!= SLICE_TYPE.RENDER) {
      return;
    }*/ //bravo
    let now = new Date().getTime();
    let elapsed = now - this.lastCalled;
    if (elapsed > this.opts.keyDebounceTime) {
      this.currentClipPlaneIndex = (this.currentClipPlaneIndex + 1) % 7;
      switch (this.currentClipPlaneIndex) {
        case 0: //NONE
          this.scene.clipPlaneDepthAziElev = [2, 0, 0];
          break;
        case 1: //left a 270 e 0
          //this.scene.clipPlane = [1, 0, 0, 0];
          this.scene.clipPlaneDepthAziElev = [0, 270, 0];
          break;
        case 2: //right a 90 e 0
          this.scene.clipPlaneDepthAziElev = [0, 90, 0];
          break;
        case 3: //posterior a 0 e 0
          this.scene.clipPlaneDepthAziElev = [0, 0, 0];
          break;
        case 4: //anterior a 0 e 0
          this.scene.clipPlaneDepthAziElev = [0, 180, 0];
          break;
        case 5: //inferior a 0 e -90
          this.scene.clipPlaneDepthAziElev = [0, 0, -90];
          break;
        case 6: //superior: a 0 e 90'
          this.scene.clipPlaneDepthAziElev = [0, 0, 90];
          break;
      }
      this.setClipPlane(this.scene.clipPlaneDepthAziElev);
      // e.preventDefault();
    }
    this.lastCalled = now;
  } else if (e.code === this.opts.viewModeHotKey) {
    let now = new Date().getTime();
    let elapsed = now - this.lastCalled;
    if (elapsed > this.opts.keyDebounceTime) {
      this.setSliceType((this.opts.sliceType + 1) % 5); // 5 total slice types
      this.lastCalled = now;
    }
  }
};

Niivue.prototype.keyDownListener = function (e) {
  if (e.code === "KeyH" && this.opts.sliceType === SLICE_TYPE.RENDER) {
    this.setRenderAzimuthElevation(
      this.scene.renderAzimuth - 1,
      this.scene.renderElevation
    );
  } else if (e.code === "KeyL" && this.opts.sliceType === SLICE_TYPE.RENDER) {
    this.setRenderAzimuthElevation(
      this.scene.renderAzimuth + 1,
      this.scene.renderElevation
    );
  } else if (e.code === "KeyJ" && this.opts.sliceType === SLICE_TYPE.RENDER) {
    this.setRenderAzimuthElevation(
      this.scene.renderAzimuth,
      this.scene.renderElevation + 1
    );
  } else if (e.code === "KeyK" && this.opts.sliceType === SLICE_TYPE.RENDER) {
    this.setRenderAzimuthElevation(
      this.scene.renderAzimuth,
      this.scene.renderElevation - 1
    );
  } else if (e.code === "KeyH" && this.opts.sliceType !== SLICE_TYPE.RENDER) {
    this.scene.crosshairPos[0] = this.scene.crosshairPos[0] - 0.001;
    this.drawScene();
  } else if (e.code === "KeyL" && this.opts.sliceType !== SLICE_TYPE.RENDER) {
    this.scene.crosshairPos[0] = this.scene.crosshairPos[0] + 0.001;
    this.drawScene();
  } else if (
    e.code === "KeyU" &&
    this.opts.sliceType !== SLICE_TYPE.RENDER &&
    e.ctrlKey
  ) {
    this.scene.crosshairPos[2] = this.scene.crosshairPos[2] + 0.001;
    this.drawScene();
  } else if (
    e.code === "KeyD" &&
    this.opts.sliceType !== SLICE_TYPE.RENDER &&
    e.ctrlKey
  ) {
    this.scene.crosshairPos[2] = this.scene.crosshairPos[2] - 0.001;
    this.drawScene();
  } else if (e.code === "KeyJ" && this.opts.sliceType !== SLICE_TYPE.RENDER) {
    this.scene.crosshairPos[1] = this.scene.crosshairPos[1] - 0.001;
    this.drawScene();
  } else if (e.code === "KeyK" && this.opts.sliceType !== SLICE_TYPE.RENDER) {
    this.scene.crosshairPos[1] = this.scene.crosshairPos[1] + 0.001;
    this.drawScene();
  } else if (e.code === "ArrowLeft") {
    // only works for background (first loaded image is index 0)
    this.setFrame4D(this.volumes[0].id, this.volumes[0].frame4D - 1);
  } else if (e.code === "ArrowRight") {
    // only works for background (first loaded image is index 0)
    this.setFrame4D(this.volumes[0].id, this.volumes[0].frame4D + 1);
  } else if (e.code === "Slash" && e.shiftKey) {
    alert(`NIIVUE VERSION: ${__NIIVUE_VERSION__}`);
  }
};

// not included in public docs
// handler for scroll wheel events (slice scrolling)
// note: no test yet
Niivue.prototype.wheelListener = function (e) {
  // scroll 2D slices
  e.preventDefault();
  e.stopPropagation();
  // if thumbnailVisible this do not activate a canvas interaction when scrolling
  if (this.thumbnailVisible) {
    return;
  }
  var rect = this.canvas.getBoundingClientRect();
  if (e.deltaY < 0) {
    this.sliceScroll2D(-0.01, e.clientX - rect.left, e.clientY - rect.top);
  } else {
    this.sliceScroll2D(0.01, e.clientX - rect.left, e.clientY - rect.top);
  }
};

// not included in public docs
// setup interactions with the canvas. Mouse clicks and touches
// note: no test yet
Niivue.prototype.registerInteractions = function () {
  // add mousedown
  this.canvas.addEventListener("mousedown", this.mouseDownListener.bind(this));
  // add mouseup
  this.canvas.addEventListener("mouseup", this.mouseUpListener.bind(this));
  // add mouse move
  this.canvas.addEventListener("mousemove", this.mouseMoveListener.bind(this));

  // add touchstart
  this.canvas.addEventListener(
    "touchstart",
    this.touchStartListener.bind(this)
  );
  // add touchend
  this.canvas.addEventListener("touchend", this.touchEndListener.bind(this));
  // add touchmove
  this.canvas.addEventListener("touchmove", this.touchMoveListener.bind(this));

  // add scroll wheel
  this.canvas.addEventListener("wheel", this.wheelListener.bind(this));
  // add context event disabler
  this.canvas.addEventListener(
    "contextmenu",
    this.mouseContextMenuListener.bind(this)
  );

  // add double click
  this.canvas.addEventListener("dblclick", this.resetBriCon.bind(this));

  //  drag and drop support
  this.canvas.addEventListener(
    "dragenter",
    this.dragEnterListener.bind(this),
    false
  );
  this.canvas.addEventListener(
    "dragover",
    this.dragOverListener.bind(this),
    false
  );
  this.canvas.addEventListener("drop", this.dropListener.bind(this), false);

  // add keyup
  this.canvas.setAttribute("tabindex", 0);
  this.canvas.addEventListener("keyup", this.keyUpListener.bind(this), false);

  // keydown
  this.canvas.addEventListener(
    "keydown",
    this.keyDownListener.bind(this),
    false
  );
};

// not included in public docs
Niivue.prototype.dragEnterListener = function (e) {
  e.stopPropagation();
  e.preventDefault();
};

// not included in public docs
Niivue.prototype.dragOverListener = function (e) {
  e.stopPropagation();
  e.preventDefault();
};

// not included in public docs
Niivue.prototype.getFileExt = function (fullname, upperCase = true) {
  var re = /(?:\.([^.]+))?$/;
  let ext = re.exec(fullname)[1];
  ext = ext.toUpperCase();
  if (ext === "GZ") {
    ext = re.exec(fullname.slice(0, -3))[1]; //img.trk.gz -> img.trk
    ext = ext.toUpperCase();
  }
  return upperCase ? ext : ext.toLowerCase(); // developer can choose to have extensions as upper or lower
}; // getFleExt

/**
 * Add an image and notify subscribers
 * @param {NVImageFromUrlOptions} imageOptions
 * @returns {NVImage}
 */
Niivue.prototype.addVolumeFromUrl = async function (imageOptions) {
  let volume = await NVImage.loadFromUrl(imageOptions);
  this.document.addImageOptions(volume, imageOptions);
  volume.onColormapChange = this.onColormapChange;
  this.mediaUrlMap.set(volume, imageOptions.url);
  if (this.onVolumeAddedFromUrl) {
    this.onVolumeAddedFromUrl(imageOptions, volume);
  }
  this.addVolume(volume);
  return volume;
};

/**
 * Find media by url
 * @param {string} url -
 * @returns {(NVImage|NVMesh)}
 */
Niivue.prototype.getMediaByUrl = function (url) {
  return [...this.mediaUrlMap.entries()]
    .filter((v) => v[1] == url)
    .map((v) => v[0])
    .pop();
};

/**
 * Remove volume by url
 * @param {string} url - Volume added by url to remove
 */
Niivue.prototype.removeVolumeByUrl = function (url) {
  let volume = this.getMediaByUrl(url);
  if (volume) {
    this.removeVolume(volume);
  } else {
    throw "No volume with URL present";
  }
};

Niivue.prototype.readDirectory = function (directory) {
  let reader = directory.createReader();
  let allEntiresInDir = [];
  let getFileObjects = async (fileSystemEntries) => {
    let allFileObects = [];
    //https://stackoverflow.com/a/53113059
    async function getFile(fileEntry) {
      try {
        return await new Promise((resolve, reject) =>
          fileEntry.file(resolve, reject)
        );
      } catch (err) {
        log.debug(err);
      }
    }
    for (let i = 0; i < fileSystemEntries.length; i++) {
      allFileObects.push(await getFile(fileSystemEntries[i]));
    }
    return allFileObects;
  };
  let readEntries = () => {
    reader.readEntries(async (entries) => {
      if (entries.length) {
        allEntiresInDir = allEntiresInDir.concat(entries);
        readEntries();
      } else {
        let allFileObects = await getFileObjects(allEntiresInDir);
        let volume = await NVImage.loadFromFile({
          file: allFileObects, // an array of file objects
          name: directory.name,
          urlImgData: null, // nothing
          imageType: NVIMAGE_TYPE.DCM_FOLDER, // signify that this is a dicom directory
        });
        this.addVolume(volume);
      }
    });
  };
  readEntries();
  return allEntiresInDir;
};

/**
 * Returns boolean: true if filename ends with mesh extension (TRK, pial, etc)
 * @param {string} url - filename
 */
Niivue.prototype.isMeshExt = function (url) {
  let ext = this.getFileExt(url);
  log.debug("dropped ext");
  log.debug(ext);
  return MESH_EXTENSIONS.includes(ext);
}; // isMeshExt()

// not included in public docs
Niivue.prototype.dropListener = async function (e) {
  e.stopPropagation();
  e.preventDefault();
  // don't do anything if drag and drop has been turned off
  if (!this.opts.dragAndDropEnabled) {
    return;
  }
  const urlsToLoad = [];
  const dt = e.dataTransfer;
  const url = dt.getData("text/uri-list");
  if (url) {
    urlsToLoad.push(url);
    let imageOptions = new NVImageFromUrlOptions(url);
    let ext = this.getFileExt(url);
    log.debug("dropped ext");
    log.debug(ext);
    if (MESH_EXTENSIONS.includes(ext)) {
      this.addMeshFromUrl({ url });
    } else if (ext === "NVD") {
      this.loadDocumentFromUrl(url);
    } else {
      this.addVolumeFromUrl(imageOptions);
    }
  } else {
    //const files = dt.files;
    const items = dt.items;
    if (items.length > 0) {
      // adding or replacing
      if (!e.shiftKey && !e.altKey) {
        this.volumes = [];
        this.overlays = [];
        this.meshes = [];
      }
      this.closeDrawing();
      for (const item of items) {
        const entry = item.getAsEntry || item.webkitGetAsEntry();
        log.debug(entry);
        if (entry.isFile) {
          let ext = this.getFileExt(entry.name);
          if (ext === "PNG") {
            entry.file((file) => {
              this.loadBmpTexture(file);
            });
            continue;
          }
          let pairedImageData = "";
          // check for afni HEAD BRIK pair
          if (entry.name.lastIndexOf("HEAD") !== -1) {
            for (const pairedItem of items) {
              const pairedEntry =
                pairedItem.getAsEntry || pairedItem.webkitGetAsEntry();
              let fileBaseName = entry.name.substring(
                0,
                entry.name.lastIndexOf("HEAD")
              );
              let pairedItemBaseName = pairedEntry.name.substring(
                0,
                pairedEntry.name.lastIndexOf("BRIK")
              );
              if (fileBaseName === pairedItemBaseName) {
                pairedImageData = pairedEntry;
              }
            }
          }
          if (entry.name.lastIndexOf("BRIK") !== -1) {
            continue;
          }
          if (MESH_EXTENSIONS.includes(ext)) {
            entry.file(async (file) => {
              let mesh = await NVMesh.loadFromFile({
                file: file,
                gl: this.gl,
                name: file.name,
              });
              this.uiData.loading$.next(false);
              this.addMesh(mesh);
            });
            continue;
          } else if (ext === "NVD") {
            entry.file(async (file) => {
              let nvdoc = await NVDocument.loadFromFile(file);
              this.loadDocument(nvdoc);
              log.debug("loaded document");
            });
            break;
          }
          entry.file(async (file) => {
            if (pairedImageData !== "") {
              // if we have paired header/img data
              pairedImageData.file(async (imgfile) => {
                let volume = await NVImage.loadFromFile({
                  file: file,
                  urlImgData: imgfile,
                  limitFrames4D: this.opts.limitFrames4D,
                });
                this.addVolume(volume);
              });
            } else {
              // else, just a single file to load (not a pair)
              let volume = await NVImage.loadFromFile({
                file: file,
                urlImgData: pairedImageData,
                limitFrames4D: this.opts.limitFrames4D,
              });
              if (e.altKey) {
                log.debug(
                  "alt key detected: assuming this is a drawing overlay"
                );
                this.drawClearAllUndoBitmaps();
                this.loadDrawing(volume);
              } else this.addVolume(volume);
            }
          });
        } else if (entry.isDirectory) {
          this.readDirectory(entry);
        }
      }
    }
  }
  //this.createEmptyDrawing();
  this.drawScene(); //<- this seems to be required if you drag and drop a mesh, not a volume
};

/**
 * determine if text appears at corner (true) or sides of 2D slice.
 * @param {boolean} isCornerOrientationText controls position of text
 * @example niivue.setCornerOrientationText(true)
 * @see {@link https://niivue.github.io/niivue/features/worldspace2.html|live demo usage}
 */
Niivue.prototype.setCornerOrientationText = function (isCornerOrientationText) {
  this.opts.isCornerOrientationText = isCornerOrientationText;
  this.updateGLVolume();
};

/**
 * control whether 2D slices use radiological or neurological convention.
 * @param {boolean} isRadiologicalConvention new display convention
 * @example niivue.setCornerOrientationText(true)
 * @see {@link https://niivue.github.io/niivue/features/worldspace2.html|live demo usage}
 */
Niivue.prototype.setRadiologicalConvention = function (
  isRadiologicalConvention
) {
  this.opts.isRadiologicalConvention = isRadiologicalConvention;
  this.updateGLVolume();
};

Niivue.prototype.setDefaults = function (options = {}, resetBriCon = false) {
  this.opts = { ...DEFAULT_OPTIONS };
  this.scene = { ...this.document.scene };
  // populate Niivue with user supplied options
  for (const name in options) {
    if (typeof options[name] === "function") {
      this[name] = options[name];
    } else {
      // this.opts[name] = options[name];
      this.opts[name] =
        DEFAULT_OPTIONS[name] === undefined
          ? DEFAULT_OPTIONS[name]
          : options[name];
    }
  }
  this.uiData.pan2Dxyzmm = [0, 0, 0, 1];
  //optional: reset volume contrast and brightness
  if (resetBriCon && this.volumes && this.volumes.length > 0) {
    for (let i = 0; i < this.volumes.length; i++) {
      this.volumes[i].cal_min = this.volumes[i].robust_min;
      this.volumes[i].cal_max = this.volumes[i].robust_max;
    }
  }
  //display reset image
  this.updateGLVolume();
};

/**
 * Limit visibility of mesh in front of a 2D image. Requires world-space mode.
 * @param {number} meshThicknessOn2D distance from voxels for clipping mesh. Use Infinity to show entire mesh or 0.0 to hide mesh.
 * @example niivue.setMeshThicknessOn2D(42)
 * @see {@link https://niivue.github.io/niivue/features/worldspace2.html|live demo usage}
 */
Niivue.prototype.setMeshThicknessOn2D = function (meshThicknessOn2D) {
  this.opts.meshThicknessOn2D = meshThicknessOn2D;
  this.updateGLVolume();
};

/**
 * Create a custom multi-slice mosaic (aka lightbox, montage) view.
 * @param {string} str description of mosaic.
 * @example niivue.setSliceMosaicString("A 0 20 C 30 S 42")
 * @see {@link https://niivue.github.io/niivue/features/mosaics.html|live demo usage}
 */
Niivue.prototype.setSliceMosaicString = function (str) {
  this.sliceMosaicString = str;
  this.updateGLVolume();
};

/**
 * control 2D slice view mode.
 * @param {boolean} isSliceMM control whether 2D slices use world space (true) or voxel space (false). Beware that voxel space mode limits properties like panning, zooming and mesh visibility.
 * @example niivue.setSliceMM(true)
 * @see {@link https://niivue.github.io/niivue/features/worldspace2.html|live demo usage}
 */
Niivue.prototype.setSliceMM = function (isSliceMM) {
  this.opts.isSliceMM = isSliceMM;
  this.updateGLVolume();
};

/**
 * Detect if display is using radiological or neurological convention.
 * @returns {boolean} radiological convention status
 * @example let rc = niivue.getRadiologicalConvention()
 */
Niivue.prototype.getRadiologicalConvention = function () {
  return this.opts.isRadiologicalConvention;
};

/**
 * Force WebGL canvas to use high resolution display, regardless of browser defaults.
 * @param {boolean} isHighResolutionCapable allow high-DPI display
 * @example niivue.setHighResolutionCapable(true);
 * @see {@link https://niivue.github.io/niivue/features/sync.mesh.html|live demo usage}
 */
Niivue.prototype.setHighResolutionCapable = function (isHighResolutionCapable) {
  this.opts.isHighResolutionCapable = isHighResolutionCapable;
  if (isHighResolutionCapable && !this.opts.isResizeCanvas) {
    log.warn("isHighResolutionCapable requires isResizeCanvas");
    this.opts.isHighResolutionCapable = false;
  }
  if (!this.opts.isHighResolutionCapable) {
    this.uiData.dpr = 1;
  }
  this.resizeListener(); // test isHighResolutionCapable
  this.drawScene();
};

/**
 * add a new volume to the canvas
 * @param {NVImage} volume the new volume to add to the canvas
 * @example
 * niivue = new Niivue()
 * niivue.addVolume(NVImage.loadFromUrl({url:'./someURL.nii.gz'}))
 */
Niivue.prototype.addVolume = function (volume) {
  this.volumes.push(volume);
  let idx = this.volumes.length === 1 ? 0 : this.volumes.length - 1;
  this.setVolume(volume, idx);
  this.onImageLoaded(volume);
  log.debug("loaded volume", volume.name);
  log.debug(volume);
};

/**
 * add a new mesh to the canvas
 * @param {NVMesh} mesh the new mesh to add to the canvas
 * @example
 * niivue = new Niivue()
 * niivue.addMesh(NVMesh.loadFromUrl({url:'./someURL.gii'}))
 */
Niivue.prototype.addMesh = function (mesh) {
  this.meshes.push(mesh);
  let idx = this.meshes.length === 1 ? 0 : this.meshes.length - 1;
  this.setMesh(mesh, idx);
  this.onMeshLoaded(mesh);
};

/**
 * get the index of a volume by its unique id. unique ids are assigned to the NVImage.id property when a new NVImage is created.
 * @param {string} id the id string to search for
 * @example
 * niivue = new Niivue()
 * niivue.getVolumeIndexByID(someVolume.id)
 */
Niivue.prototype.getVolumeIndexByID = function (id) {
  let n = this.volumes.length;
  for (let i = 0; i < n; i++) {
    let id_i = this.volumes[i].id;
    if (id_i === id) {
      return i;
    }
  }
  return -1; // -1 signals that no valid index was found for a volume with the given id
};

// not included in public docs
// Internal function to compress drawing using run length encoding
//inputs
// data: Uint8Array to compress
//output
// returns rle compressed Uint8Array
function encodeRLE(data) {
  //https://en.wikipedia.org/wiki/PackBits
  //run length encoding
  // input and output are Uint8Array
  // Will compress data with long runs up to x64
  // Worst case encoded size is ~1% larger than input
  let dl = data.length; //input length
  let dp = 0; //input position
  //worst case: run length encoding (1+1/127) times larger than input
  let r = new Uint8Array(dl + Math.ceil(0.01 * dl));
  let rI = new Int8Array(r.buffer); //typecast as header can be negative
  let rp = 0; //run length position
  while (dp < dl) {
    //for each byte in input
    let v = data[dp];
    dp++;
    let rl = 1; //run length
    while (rl < 129 && dp < dl && data[dp] === v) {
      dp++;
      rl++;
    } //count run length
    if (rl > 1) {
      //header
      rI[rp] = -rl + 1;
      rp++;
      r[rp] = v;
      rp++;
      continue;
    }
    //count literal length
    while (dp < dl) {
      if (rl > 127) break;
      if (dp + 2 < dl) {
        //console.log(':', v, data[dp], data[dp+1]);
        if (
          v !== data[dp] &&
          data[dp + 2] === data[dp] &&
          data[dp + 1] === data[dp]
        )
          break;
      }
      v = data[dp];
      dp++;
      rl++;
    }
    //write header
    r[rp] = rl - 1;
    rp++;
    for (let i = 0; i < rl; i++) {
      r[rp] = data[dp - rl + i];
      rp++;
    }
  }
  log.info("PackBits " + dl + " -> " + rp + " bytes (x" + dl / rp + ")");
  return r.slice(0, rp);
} // encodeRLE()

// not included in public docs
// Internal function to decompress drawing using run length encoding
//inputs
// rle: packbits compressed stream
// decodedlen: size of uncompressed data
//output
// returns Uint8Array of decodedlen bytes
function decodeRLE(rle, decodedlen) {
  let r = new Uint8Array(rle.buffer);
  let rI = new Int8Array(r.buffer); //typecast as header can be negative
  let rp = 0; //input position in rle array
  //d: output uncompressed data array
  let d = new Uint8Array(decodedlen);
  let dp = 0; //output position in decoded array
  while (rp < r.length) {
    //read header
    let hdr = rI[rp];
    rp++;
    if (hdr < 0) {
      //write run
      let v = rI[rp];
      rp++;
      for (let i = 0; i < 1 - hdr; i++) {
        d[dp] = v;
        dp++;
      }
    } else {
      //write literal
      for (let i = 0; i < hdr + 1; i++) {
        d[dp] = rI[rp];
        rp++;
        dp++;
      }
    } //if run else literal
  } //while rp < r.length
  return d;
} // decodeRLE()

/*Niivue.prototype.testRLE = function() {
  //Demo to test encodeRLE/decodeRLE
  let len = 256*256*256;
  let data = new Uint8Array(len);
  for (let i = 0; i < len; i++)
    data[i] = ((Math.random() > 0.30) ? 1 : 0);
  console.log(data);
  let rle = encodeRLE(data);
  let ddata = decodeRLE(rle, len);
  let ok = true;
  for (let i = 0; i < len; i++)
    if (data[i] !== ddata[i])
      ok = false;
  console.log('decoded correctly:', ok);
} // testRLE()*/

// not included in public docs
// Internal function to store drawings that can be used for undo operations
Niivue.prototype.drawAddUndoBitmap = async function (fnm) {
  if (!this.drawBitmap || this.drawBitmap.length < 1) {
    log.debug("drawAddUndoBitmap error: No drawing open");
    return false;
  }
  //let rle = encodeRLE(this.drawBitmap);
  //the bitmaps are a cyclical loop, like a revolver hand gun: increment the cylinder
  this.currentDrawUndoBitmap++;
  if (this.currentDrawUndoBitmap >= this.opts.maxDrawUndoBitmaps)
    this.currentDrawUndoBitmap = 0;
  this.drawUndoBitmaps[this.currentDrawUndoBitmap] = encodeRLE(this.drawBitmap);
}; // drawAddUndoBitmap()

// not included in public docs
// Internal function to delete all drawing undo images
Niivue.prototype.drawClearAllUndoBitmaps = async function () {
  this.currentDrawUndoBitmap = this.opts.maxDrawUndoBitmaps; //next add will be cylinder 0
  if (this.drawUndoBitmaps.length < 1) return;
  for (let i = this.drawUndoBitmaps.length - 1; i >= 0; i--)
    this.drawUndoBitmaps[i] = [];
}; // drawClearAllUndoBitmaps()

/**
 * Restore drawing to previous state
 * @example niivue.drawUndo();
 * @see {@link https://niivue.github.io/niivue/features/draw.ui.html|live demo usage}
 */
Niivue.prototype.drawUndo = function () {
  if (this.drawUndoBitmaps.length < 1) {
    log.debug("undo bitmaps not loaded");
    return;
  }
  this.currentDrawUndoBitmap--;
  if (this.currentDrawUndoBitmap < 0)
    this.currentDrawUndoBitmap = this.drawUndoBitmaps.length - 1;
  if (this.currentDrawUndoBitmap >= this.drawUndoBitmaps.length)
    this.currentDrawUndoBitmap = 0;
  if (this.drawUndoBitmaps[this.currentDrawUndoBitmap].length < 2) {
    log.debug("drawUndo is misbehaving");
    return;
  }
  this.drawBitmap = decodeRLE(
    this.drawUndoBitmaps[this.currentDrawUndoBitmap],
    this.drawBitmap.length
  );
  this.refreshDrawing(true);
};

Niivue.prototype.loadDrawing = function (drawingBitmap) {
  if (this.drawBitmap) log.debug("Overwriting open drawing!");
  this.drawClearAllUndoBitmaps();
  let dims = drawingBitmap.hdr.dims;
  if (
    dims[1] !== this.back.hdr.dims[1] ||
    dims[2] !== this.back.hdr.dims[2] ||
    dims[3] !== this.back.hdr.dims[3]
  ) {
    log.debug("drawing dimensions do not match background image");
    return false;
  }
  if (drawingBitmap.img.constructor !== Uint8Array)
    log.debug("Drawings should be UINT8");
  let perm = drawingBitmap.permRAS;
  let vx = dims[1] * dims[2] * dims[3];
  this.drawBitmap = new Uint8Array(vx);
  this.drawTexture = this.r8Tex(
    this.drawTexture,
    this.gl.TEXTURE7,
    this.back.dims,
    true
  );
  let layout = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (Math.abs(perm[i]) - 1 !== j) continue;
      layout[j] = i * Math.sign(perm[i]);
    }
  }
  let stride = 1;
  let instride = [1, 1, 1];
  let inflip = [false, false, false];
  for (let i = 0; i < layout.length; i++) {
    for (let j = 0; j < layout.length; j++) {
      let a = Math.abs(layout[j]);
      if (a != i) continue;
      instride[j] = stride;
      //detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
      if (layout[j] < 0 || Object.is(layout[j], -0)) inflip[j] = true;
      stride *= dims[j + 1];
    }
  }
  //lookup table for flips and stride offsets:
  const range = (start, stop, step) =>
    Array.from(
      { length: (stop - start) / step + 1 },
      (_, i) => start + i * step
    );
  let xlut = range(0, dims[1] - 1, 1);
  if (inflip[0]) xlut = range(dims[1] - 1, 0, -1);
  for (let i = 0; i < dims[1]; i++) xlut[i] *= instride[0];
  let ylut = range(0, dims[2] - 1, 1);
  if (inflip[1]) ylut = range(dims[2] - 1, 0, -1);
  for (let i = 0; i < dims[2]; i++) ylut[i] *= instride[1];
  let zlut = range(0, dims[3] - 1, 1);
  if (inflip[2]) zlut = range(dims[3] - 1, 0, -1);
  for (let i = 0; i < dims[3]; i++) zlut[i] *= instride[2];
  //convert data
  let inVs = drawingBitmap.img; //new Uint8Array(this.drawBitmap);
  let outVs = this.drawBitmap;
  //for (let i = 0; i < vx; i++)
  //  outVs[i] = i % 3;
  let j = 0;
  for (let z = 0; z < dims[3]; z++) {
    for (let y = 0; y < dims[2]; y++) {
      for (let x = 0; x < dims[1]; x++) {
        outVs[xlut[x] + ylut[y] + zlut[z]] = inVs[j];
        j++;
      } //for x
    } //for y
  } //for z
  this.drawAddUndoBitmap();
  this.refreshDrawing(false);
  this.drawScene();
  return true;
};

// not included in public docs
Niivue.prototype.binarize = async function (volume) {
  let dims = volume.hdr.dims;
  let vx = dims[1] * dims[2] * dims[3];
  let img = new Uint8Array(vx);
  for (let i = 0; i < vx; i++) {
    if (volume.img[i] !== 0) img[i] = 1;
  }
  volume.img = null;
  volume.img = img;
  volume.hdr.datatypeCode = 2; //DT_UNSIGNED_CHAR
  volume.hdr.cal_min = 0;
  volume.hdr.cal_max = 1;
}; // binarize()

/**
 * Open drawing
 * @param {string} filename of NIfTI format drawing
 * @param {boolean} [false] isBinarize if true will force drawing voxels to be either 0 or 1.
 * @example niivue.loadDrawingFromUrl("../images/lesion.nii.gz");
 * @see {@link https://niivue.github.io/niivue/features/draw.ui.html|live demo usage}
 */
Niivue.prototype.loadDrawingFromUrl = async function (fnm, isBinarize = false) {
  if (this.drawBitmap) log.debug("Overwriting open drawing!");
  this.drawClearAllUndoBitmaps();
  let ok = false;
  try {
    let volume = await NVImage.loadFromUrl(new NVImageFromUrlOptions(fnm));
    if (isBinarize) await this.binarize(volume);
    ok = this.loadDrawing(volume);
  } catch (err) {
    console.error("loadDrawingFromUrl() failed to load " + fnm);
    this.drawClearAllUndoBitmaps();
  }
  return ok;
};

// not included in public docs
Niivue.prototype.findOtsu = async function (mlevel = 2) {
  // C: https://github.com/rordenlab/niimath
  // Java: https://github.com/stevenjwest/Multi_OTSU_Segmentation
  if (this.volumes.length < 1) return [];
  let img = this.volumes[0].img;
  let nvox = img.length;
  if (nvox < 1) return [];
  const nBin = 256;
  const maxBin = nBin - 1; //bins indexed from 0: if 256 bins then 0..255
  const h = new Array(nBin).fill(0);
  //build 1D histogram
  let mn = this.volumes[0].cal_min;
  let mx = this.volumes[0].cal_max;
  if (mx <= mn) return false;
  let scale2raw = (mx - mn) / nBin;
  function bin2raw(bin) {
    return bin * scale2raw + mn;
  }
  let scale2bin = (nBin - 1) / Math.abs(mx - mn);
  let inter = this.volumes[0].hdr.scl_inter;
  let slope = this.volumes[0].hdr.scl_slope;
  for (let v = 0; v < nvox; v++) {
    let val = img[v] * slope + inter;
    val = Math.min(Math.max(val, mn), mx);
    val = Math.round((val - mn) * scale2bin);
    h[val]++;
  }
  //h[1] = h[1] + h[0]; h[0] = 0;
  //in theory one can convert h from count to probability:
  //for (let v = 0; v < nBin; v++)
  //  h[v] = h[v] / nvox;
  let P = Array(nBin)
    .fill()
    .map(() => Array(nBin).fill(0));
  let S = Array(nBin)
    .fill()
    .map(() => Array(nBin).fill(0));
  // diagonal
  for (let i = 1; i < nBin; ++i) {
    P[i][i] = h[i];
    S[i][i] = i * h[i];
  }
  // calculate first row (row 0 is all zero)
  for (let i = 1; i < nBin - 1; ++i) {
    P[1][i + 1] = P[1][i] + h[i + 1];
    S[1][i + 1] = S[1][i] + (i + 1) * h[i + 1];
  }
  // using row 1 to calculate others
  for (let i = 2; i < nBin; i++)
    for (let j = i + 1; j < nBin; j++) {
      P[i][j] = P[1][j] - P[1][i - 1];
      S[i][j] = S[1][j] - S[1][i - 1];
    }
  // now calculate H[i][j]
  for (let i = 1; i < nBin; ++i)
    for (let j = i + 1; j < nBin; j++) {
      if (P[i][j] !== 0) P[i][j] = (S[i][j] * S[i][j]) / P[i][j];
    }
  let max = 0;
  let t = [Infinity, Infinity, Infinity];
  if (mlevel > 3) {
    for (let l = 0; l < nBin - 3; l++) {
      for (let m = l + 1; m < nBin - 2; m++) {
        for (let h = m + 1; h < nBin - 1; h++) {
          let v = P[0][l] + P[l + 1][m] + P[m + 1][h] + P[h + 1][maxBin];
          if (v > max) {
            t[0] = l;
            t[1] = m;
            t[2] = h;
            max = v;
          } //new max
        } //for h -> hi
      } //for m -> mi
    } //for l -> low
  } else if (mlevel === 3) {
    for (let l = 0; l < nBin - 2; l++) {
      for (let h = l + 1; h < nBin - 1; h++) {
        let v = P[0][l] + P[l + 1][h] + P[h + 1][maxBin];
        if (v > max) {
          t[0] = l;
          t[1] = h;
          max = v;
        } //new max
      } //for h -> hi
    } //for l -> low
  } else {
    for (let i = 0; i < nBin - 1; i++) {
      let v = P[0][i] + P[i + 1][maxBin];
      if (v > max) {
        t[0] = i;
        max = v;
      } //new max
    }
  }
  return [bin2raw(t[0]), bin2raw(t[1]), bin2raw(t[2])];
};

/**
 * remove dark voxels in air
 * @param {number} [2] levels (2-4) segment brain into this many types. For example drawOtsu(2) will create a binary drawing where bright voxels are colored and dark voxels are clear.
 * @example niivue.drawOtsu(3);
 * @see {@link https://niivue.github.io/niivue/features/draw.ui.html|live demo usage}
 */
Niivue.prototype.drawOtsu = async function (levels = 2) {
  let nvox = this.volumes[0].img.length;
  let thresholds = await this.findOtsu(levels);
  if (thresholds.length < 3) return;
  if (!this.drawBitmap) this.createEmptyDrawing();
  let drawImg = this.drawBitmap;
  let img = this.volumes[0].img;
  for (let i = 0; i < nvox; i++) {
    if (drawImg[i] !== 0) continue;
    let v = img[i];
    if (v > thresholds[0]) drawImg[i] = 1;
    if (v > thresholds[1]) drawImg[i] = 2;
    if (v > thresholds[2]) drawImg[i] = 3;
  }
  this.drawAddUndoBitmap();
  this.refreshDrawing(true);
};

/**
 * remove dark voxels in air
 * @param {number} [5] level (1-5) larger values for more preserved voxels
 * @param {number} [0] volIndex volume to dehaze
 * @example niivue.removeHaze(3, 0);
 * @see {@link https://niivue.github.io/niivue/features/draw.ui.html|live demo usage}
 */
Niivue.prototype.removeHaze = async function (level = 5, volIndex = 0) {
  let nvox = this.volumes[volIndex].img.length;
  let otsu = 2;
  if (level === 5 || level === 1) otsu = 4;
  if (level === 4 || level === 2) otsu = 3;
  let thresholds = await this.findOtsu(otsu);
  if (thresholds.length < 3) return;
  let threshold = thresholds[0];
  if (level === 1) threshold = thresholds[2];
  if (level === 2) threshold = thresholds[1];
  //console.log(this.volumes[volIndex]);
  let inter = this.volumes[volIndex].hdr.scl_inter;
  let slope = this.volumes[volIndex].hdr.scl_slope;
  let mn = this.volumes[volIndex].global_min;
  let img = this.volumes[volIndex].img;
  for (let v = 0; v < nvox; v++) {
    let val = img[v] * slope + inter;
    if (val < threshold) img[v] = mn;
  }
  this.refreshLayers(this.volumes[volIndex], 0, this.volumes.length);
  this.drawScene();
};

/**
 * save voxel-based image to disk
 * @param {string} fnm filename of NIfTI image to create
 * @param {boolean} [false] isSaveDrawing determines whether drawing or background image is saved
 * @example niivue.saveImage('test.nii', true);
 * @see {@link https://niivue.github.io/niivue/features/draw.ui.html|live demo usage}
 */
Niivue.prototype.saveImage = async function (fnm, isSaveDrawing = false) {
  if (!this.back.hasOwnProperty("dims")) {
    log.debug("No voxelwise image open");
    return false;
  }
  if (isSaveDrawing) {
    if (!this.drawBitmap) {
      log.debug("No drawing open");
      return false;
    }
    let perm = this.volumes[0].permRAS;
    if (perm[0] === 1 && perm[1] === 2 && perm[2] === 3) {
      await this.volumes[0].saveToDisk(fnm, this.drawBitmap); // createEmptyDrawing
      return true;
    } else {
      let dims = this.volumes[0].hdr.dims; //reverse to original
      //reverse RAS to native space, layout is mrtrix MIF format
      // for details see NVImage.readMIF()
      let layout = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (Math.abs(perm[i]) - 1 !== j) continue;
          layout[j] = i * Math.sign(perm[i]);
        }
      }
      let stride = 1;
      let instride = [1, 1, 1];
      let inflip = [false, false, false];
      for (let i = 0; i < layout.length; i++) {
        for (let j = 0; j < layout.length; j++) {
          let a = Math.abs(layout[j]);
          if (a != i) continue;
          instride[j] = stride;
          //detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
          if (layout[j] < 0 || Object.is(layout[j], -0)) inflip[j] = true;
          stride *= dims[j + 1];
        }
      }
      //lookup table for flips and stride offsets:
      const range = (start, stop, step) =>
        Array.from(
          { length: (stop - start) / step + 1 },
          (_, i) => start + i * step
        );
      let xlut = range(0, dims[1] - 1, 1);
      if (inflip[0]) xlut = range(dims[1] - 1, 0, -1);
      for (let i = 0; i < dims[1]; i++) xlut[i] *= instride[0];
      let ylut = range(0, dims[2] - 1, 1);
      if (inflip[1]) ylut = range(dims[2] - 1, 0, -1);
      for (let i = 0; i < dims[2]; i++) ylut[i] *= instride[1];
      let zlut = range(0, dims[3] - 1, 1);
      if (inflip[2]) zlut = range(dims[3] - 1, 0, -1);
      for (let i = 0; i < dims[3]; i++) zlut[i] *= instride[2];
      //convert data

      let inVs = new Uint8Array(this.drawBitmap);
      let outVs = new Uint8Array(dims[1] * dims[2] * dims[3]);
      let j = 0;
      for (let z = 0; z < dims[3]; z++) {
        for (let y = 0; y < dims[2]; y++) {
          for (let x = 0; x < dims[1]; x++) {
            outVs[j] = inVs[xlut[x] + ylut[y] + zlut[z]];
            j++;
          } //for x
        } //for y
      } //for z
      await this.volumes[0].saveToDisk(fnm, outVs);
      return true;
    } //if native image not RAS
  } //save bitmap drawing
  await this.volumes[0].saveToDisk(fnm);
  return true;
};

// not included in public docs
Niivue.prototype.getMeshIndexByID = function (id) {
  if (typeof id === "number") return id;
  let n = this.meshes.length;
  for (let i = 0; i < n; i++) {
    let id_i = this.meshes[i].id;
    if (id_i === id) {
      return i;
    }
  }
  return -1; // -1 signals that no valid index was found for a volume with the given id
};

/**
 * change property of mesh, tractogram or connectome
 * @param {number} id identity of mesh to change
 * @param {str} key attribute to change
 * @param {number} value for attribute
 * @example niivue.setMeshProperty(niivue.meshes[0].id, 'fiberLength', 42)
 */
Niivue.prototype.setMeshProperty = function (id, key, val) {
  let idx = this.getMeshIndexByID(id);
  if (idx < 0) {
    log.warn("setMeshProperty() id not loaded", id);
    return;
  }
  this.meshes[idx].setProperty(key, val, this.gl);
  this.updateGLVolume();
  this.onMeshPropertyChanged(idx, key, val);
};

/**
 * reverse triangle winding of mesh (swap front and back faces)
 * @param {number} id identity of mesh to change
 * @example niivue.reverseFaces(niivue.meshes[0].id)
 */
Niivue.prototype.reverseFaces = function (mesh) {
  let idx = this.getMeshIndexByID(mesh);
  if (idx < 0) {
    log.warn("reverseFaces() id not loaded", mesh);
    return;
  }
  this.meshes[idx].reverseFaces(this.gl);
  this.updateGLVolume();
};

/**
 * reverse triangle winding of mesh (swap front and back faces)
 * @param {number} id identity of mesh to change
 * @param {number} layer selects the mesh overlay (e.g. GIfTI or STC file)
 * @param {str} key attribute to change
 * @param {number} value for attribute
 * @example niivue.setMeshLayerProperty(niivue.meshes[0].id, 0, 'frame4D', 22)
 */
Niivue.prototype.setMeshLayerProperty = function (mesh, layer, key, val) {
  let idx = this.getMeshIndexByID(mesh);
  if (idx < 0) {
    log.warn("setMeshLayerProperty() id not loaded", mesh);
    return;
  }
  this.meshes[idx].setLayerProperty(layer, key, val, this.gl);
  this.updateGLVolume();
};

/**
 * adjust offset position and scale of 2D sliceScale
 * @param {vec4} xyzmmZoom first three components are spatial, fourth is scaling
 * @example niivue.setPan2Dxyzmm([5,-4, 2, 1.5])
 */
Niivue.prototype.setPan2Dxyzmm = function (xyzmmZoom) {
  this.uiData.pan2Dxyzmm = xyzmmZoom;
  this.drawScene();
};

/**
 * set rotation of 3D render view
 * @param {number} azimuth
 * @param {number} elevation
 * @example niivue.setRenderAzimuthElevation(45, 15)
 */
Niivue.prototype.setRenderAzimuthElevation = function (a, e) {
  this.scene.renderAzimuth = a;
  this.scene.renderElevation = e;
  this.onAzimuthElevationChange(a, e);
  this.drawScene();
}; // setRenderAzimuthElevation()

/**
 * get the index of an overlay by its unique id. unique ids are assigned to the NVImage.id property when a new NVImage is created.
 * @param {string} id the id string to search for
 * @see NiiVue#getVolumeIndexByID
 * @example
 * niivue = new Niivue()
 * niivue.getOverlayIndexByID(someVolume.id)
 */
Niivue.prototype.getOverlayIndexByID = function (id) {
  let n = this.overlays.length;
  for (let i = 0; i < n; i++) {
    let id_i = this.overlays[i].id;
    if (id_i === id) {
      return i;
    }
  }
  return -1; // -1 signals that no valid index was found for an overlay with the given id
};

/**
 * set the index of a volume. This will change it's ordering and appearance if there are multiple volumes loaded.
 * @param {NVImage} volume the volume to update
 * @param {number} [toIndex=0] the index to move the volume to. The default is the background (0 index)
 * @example
 * niivue = new Niivue()
 * niivue.setVolume(someVolume, 1) // move it to the second position in the array of loaded volumes (0 is the first position)
 */
Niivue.prototype.setVolume = function (volume, toIndex = 0) {
  // this.volumes.map((v) => {
  //   log.debug(v.name);
  // });
  let numberOfLoadedImages = this.volumes.length;
  if (toIndex > numberOfLoadedImages) {
    return;
  }

  let volIndex = this.getVolumeIndexByID(volume.id);
  if (toIndex === 0) {
    this.volumes.splice(volIndex, 1);
    this.volumes.unshift(volume);
    this.back = this.volumes[0];
    this.overlays = this.volumes.slice(1);
  } else if (toIndex < 0) {
    // -1 to remove a volume
    this.volumes.splice(this.getVolumeIndexByID(volume.id), 1);
    //this.volumes = this.overlays
    this.back = this.volumes[0];
    if (this.volumes.length > 1) {
      this.overlays = this.volumes.slice(1);
    } else {
      this.overlays = [];
    }
  } else {
    this.volumes.splice(volIndex, 1);
    this.volumes.splice(toIndex, 0, volume);
    this.overlays = this.volumes.slice(1);
    this.back = this.volumes[0];
  }
  this.updateGLVolume();
  // this.volumes.map((v) => {
  //   log.debug(v.name);
  // });
};

// not included in public docs
Niivue.prototype.setMesh = function (mesh, toIndex = 0) {
  this.meshes.map((m) => {
    log.debug("MESH: ", m.name);
  });
  let numberOfLoadedMeshes = this.meshes.length;
  if (toIndex > numberOfLoadedMeshes) {
    return;
  }
  let meshIndex = this.getMeshIndexByID(mesh.id);
  if (toIndex === 0) {
    this.meshes.splice(meshIndex, 1);
    this.meshes.unshift(mesh);
  } else if (toIndex < 0) {
    this.meshes.splice(this.getMeshIndexByID(mesh.id), 1);
  } else {
    this.meshes.splice(meshIndex, 1);
    this.meshes.splice(toIndex, 0, mesh);
  }
  this.updateGLVolume();
  this.meshes.map((m) => {
    log.debug(m.name);
  });
};

/**
 * Remove a volume
 * @param {NVImage} volume volume to delete
 * @example
 * niivue = new Niivue()
 * niivue.removeVolume(this.volumes[3])
 */
Niivue.prototype.removeVolume = function (volume) {
  this.setVolume(volume, -1);
  // check if we have a url for this volume
  if (this.mediaUrlMap.has(volume)) {
    let url = this.mediaUrlMap.get(volume);
    // notify subscribers that we are about to remove a volume
    this.onVolumeWithUrlRemoved(url);

    this.mediaUrlMap.delete(volume);
  }

  this.drawScene();
};

/**
 * Remove a volume by index
 * @param {number} index of volume to remove
 */
Niivue.prototype.removeVolumeByIndex = function (index) {
  if (index >= this.volumes.length) {
    throw "Index of volume out of bounds";
  }
  this.removeVolume(this.volumes[index]);
};

/**
 * Remove a triangulated mesh, connectome or tractogram
 * @param {NVMesh} mesh mesh to delete
 * @example
 * niivue = new Niivue()
 * niivue.removeMesh(this.meshes[3])
 */
Niivue.prototype.removeMesh = function (mesh) {
  this.setMesh(mesh, -1);
  if (this.mediaUrlMap.has(mesh)) {
    let url = this.mediaUrlMap.get(mesh);
    this.onMeshWithUrlRemoved(url);
    this.mediaUrlMap.delete(mesh);
  }
};

/**
 * Remove a triangulated mesh, connectome or tractogram
 * @param {string} url URL of mesh to delete
 * @example
 * niivue.removeMeshByUrl('./images/cit168.mz3')
 */
Niivue.prototype.removeMeshByUrl = function (url) {
  let mesh = this.getMediaByUrl(url);
  if (mesh) {
    this.removeMesh(mesh);
    this.mediaUrlMap.delete(mesh);
    this.onMeshWithUrlRemoved(url);
  }
};

/**
 * Move a volume to the bottom of the stack of loaded volumes. The volume will become the background
 * @param {NVImage} volume the volume to move
 * @example
 * niivue = new Niivue()
 * niivue.moveVolumeToBottom(this.volumes[3]) // move the 4th volume to the 0 position. It will be the new background
 */
Niivue.prototype.moveVolumeToBottom = function (volume) {
  this.setVolume(volume, 0);
};

/**
 * Move a volume up one index position in the stack of loaded volumes. This moves it up one layer
 * @param {NVImage} volume the volume to move
 * @example
 * niivue = new Niivue()
 * niivue.moveVolumeUp(this.volumes[0]) // move the background image to the second index position (it was 0 index, now will be 1)
 */
Niivue.prototype.moveVolumeUp = function (volume) {
  let volIdx = this.getVolumeIndexByID(volume.id);
  this.setVolume(volume, volIdx + 1);
};

/**
 * Move a volume down one index position in the stack of loaded volumes. This moves it down one layer
 * @param {NVImage} volume the volume to move
 * @example
 * niivue = new Niivue()
 * niivue.moveVolumeDown(this.volumes[1]) // move the second image to the background position (it was 1 index, now will be 0)
 */
Niivue.prototype.moveVolumeDown = function (volume) {
  let volIdx = this.getVolumeIndexByID(volume.id);
  this.setVolume(volume, volIdx - 1);
};

/**
 * Move a volume to the top position in the stack of loaded volumes. This will be the top layer
 * @param {NVImage} volume the volume to move
 * @example
 * niivue = new Niivue()
 * niivue.moveVolumeToTop(this.volumes[0]) // move the background image to the top layer position
 */
Niivue.prototype.moveVolumeToTop = function (volume) {
  this.setVolume(volume, this.volumes.length - 1);
};

// not included in public docs
// update mouse position from new mouse down coordinates
// note: no test yet
Niivue.prototype.mouseDown = function mouseDown(x, y) {
  x *= this.uiData.dpr;
  y *= this.uiData.dpr;
  this.mousePos = [x, y];
  // if (this.inRenderTile(x, y) < 0) return;
}; // mouseDown()

// not included in public docs
// note: no test yet
Niivue.prototype.mouseMove = function mouseMove(x, y) {
  x *= this.uiData.dpr;
  y *= this.uiData.dpr;
  let dx = (x - this.mousePos[0]) / this.uiData.dpr;
  let dy = (y - this.mousePos[1]) / this.uiData.dpr;
  this.mousePos = [x, y];

  if (this.inRenderTile(x, y) < 0) return;

  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
  this.scene.renderAzimuth += dx;
  this.scene.renderElevation += dy;

  this.drawScene();
}; // mouseMove()

/**
 * convert spherical AZIMUTH, ELEVATION to Cartesian
 * @param {number} azimuth azimuth number
 * @param {number} elevation elevation number
 * @returns {array} the converted [x, y, z] coordinates
 * @example
 * niivue = new Niivue()
 * xyz = niivue.sph2cartDeg(42, 42)
 */
Niivue.prototype.sph2cartDeg = function sph2cartDeg(azimuth, elevation) {
  //convert spherical AZIMUTH,ELEVATION,RANGE to Cartesion
  //see Matlab's [x,y,z] = sph2cart(THETA,PHI,R)
  // reverse with cart2sph
  let Phi = -elevation * (Math.PI / 180);
  let Theta = ((azimuth - 90) % 360) * (Math.PI / 180);
  let ret = [
    Math.cos(Phi) * Math.cos(Theta),
    Math.cos(Phi) * Math.sin(Theta),
    Math.sin(Phi),
  ];
  let len = Math.sqrt(ret[0] * ret[0] + ret[1] * ret[1] + ret[2] * ret[2]);
  if (len <= 0.0) return ret;
  ret[0] /= len;
  ret[1] /= len;
  ret[2] /= len;
  return ret;
}; // sph2cartDeg()

/**
 * update the clip plane orientation in 3D view mode
 * @param {array} azimuthElevationDepth a two component vector. azimuth: camera position in degrees around object, typically 0..360 (or -180..+180). elevation: camera height in degrees, range -90..90
 * @example
 * niivue = new Niivue()
 * niivue.setClipPlane([42, 42])
 */
Niivue.prototype.setClipPlane = function (depthAzimuthElevation) {
  // azimuthElevation is 2 component vector [a, e, d]
  //  azimuth: camera position in degrees around object, typically 0..360 (or -180..+180)
  //  elevation: camera height in degrees, range -90..90
  //  depth: distance of clip plane from center of volume, range 0..~1.73 (e.g. 2.0 for no clip plane)
  let v = this.sph2cartDeg(
    depthAzimuthElevation[1] + 180,
    depthAzimuthElevation[2]
  );
  this.scene.clipPlane = [v[0], v[1], v[2], depthAzimuthElevation[0]];
  this.scene.clipPlaneDepthAziElev = depthAzimuthElevation;
  this.onClipPlaneChange(this.scene.clipPlane);
  //if (this.opts.sliceType!= SLICE_TYPE.RENDER) return;
  this.drawScene();
}; // setClipPlane()

/**
 * set the crosshair color
 * @param {array} color an RGBA array. values range from 0 to 1
 * @example
 * niivue = new Niivue()
 * niivue.setCrosshairColor([0, 1, 0, 0.5]) // set crosshair to transparent green
 */
Niivue.prototype.setCrosshairColor = function (color) {
  this.opts.crosshairColor = color;
  this.drawScene();
}; // setCrosshairColor()

/**
 * set thickness of crosshair
 * @param {number} crosshairWidth
 * @example niivue.crosshairWidth(2)
 */
Niivue.prototype.setCrosshairWidth = function (crosshairWidth) {
  this.opts.crosshairWidth = crosshairWidth;
  this.crosshairs3D.mm[0] = NaN; //force redraw
  this.drawScene();
}; // setCrosshairColor()

Niivue.prototype.setDrawColormap = function (name) {
  this.drawLut = cmapper.makeDrawLut(name);
  this.updateGLVolume();
}; // setDrawColormap()

/**
 * does dragging over a 2D slice create a drawing?
 * @param {boolean} drawing enabled (true) or not (false)
 * @example niivue.setDrawingEnabled(true)
 */
Niivue.prototype.setDrawingEnabled = function (trueOrFalse) {
  this.opts.drawingEnabled = trueOrFalse;
  if (this.opts.drawingEnabled) {
    if (!this.drawBitmap) this.createEmptyDrawing();
  }
  this.drawScene();
};

/**
 * determine color and style of drawing
 * @param {number} penValue sets the color of the pen
 * @param {boolean} [false] isFilledPen determines if dragging creates flood-filled shape
 * @example niivue.setPenValue(1, true)
 */
Niivue.prototype.setPenValue = function (penValue, isFilledPen = false) {
  this.opts.penValue = penValue;
  this.opts.isFilledPen = isFilledPen;
  this.drawScene();
};

/**
 * control whether drawing is transparent (0), opaque (1) or translucent (between 0 and 1).
 * @param {number} opacity translucency of drawing
 * @example niivue.setDrawOpacity(0.7)
 * @see {@link https://niivue.github.io/niivue/features/draw.ui.html|live demo usage}
 */
Niivue.prototype.setDrawOpacity = function (opacity) {
  this.drawOpacity = opacity;
  this.drawScene();
};

/**
 * set the selection box color. A selection box is drawn when you right click and drag to change image intensity
 * @param {array} color an RGBA array. values range from 0 to 1
 * @example
 * niivue = new Niivue()
 * niivue.setSelectionBoxColor([0, 1, 0, 0.5]) // set to transparent green
 */
Niivue.prototype.setSelectionBoxColor = function (color) {
  this.opts.selectionBoxColor = color;
}; // setSelectionBoxColor()

// not included in public docs
Niivue.prototype.sliceScroll2D = function (posChange, x, y, isDelta = true) {
  if (this.inGraphTile(x, y)) {
    let vol = this.volumes[0].frame4D;
    if (posChange > 0) vol++;
    if (posChange < 0) vol--;
    this.setFrame4D(this.volumes[0].id, vol);
    return;
  }
  if (
    posChange !== 0 &&
    this.opts.dragMode === DRAG_MODE.pan &&
    this.inRenderTile(this.uiData.dpr * x, this.uiData.dpr * y) === -1
  ) {
    let zoom = this.uiData.pan2Dxyzmm[3] * (1.0 + 10 * posChange);
    zoom = Math.round(zoom * 10) / 10;
    let zoomChange = this.uiData.pan2Dxyzmm[3] - zoom;
    this.uiData.pan2Dxyzmm[3] = zoom;
    let mm = this.frac2mm(this.scene.crosshairPos);
    this.uiData.pan2Dxyzmm[0] += zoomChange * mm[0];
    this.uiData.pan2Dxyzmm[1] += zoomChange * mm[1];
    this.uiData.pan2Dxyzmm[2] += zoomChange * mm[2];
    this.drawScene();
    return;
  }
  this.mouseClick(x, y, posChange, isDelta);
}; // sliceScroll2D()

/**
 * set the slice type. This changes the view mode
 * @param {(Niivue.sliceTypeAxial | Niivue.sliceTypeCoronal | Niivue.sliceTypeSagittal | Niivue.sliceTypeMultiplanar | Niivue.sliceTypeRender)} sliceType an enum of slice types to use
 * @example
 * niivue = new Niivue()
 * niivue.setSliceType(Niivue.sliceTypeMultiplanar)
 */
Niivue.prototype.setSliceType = function (st) {
  this.opts.sliceType = st;
  this.drawScene();
  return this;
}; // setSliceType()

/**
 * set the opacity of a volume given by volume index
 * @param {number} volIdx the volume index of the volume to change
 * @param {number} newOpacity the opacity value. valid values range from 0 to 1. 0 will effectively remove a volume from the scene
 * @example
 * niivue = new Niivue()
 * niivue.setOpacity(0, 0.5) // make the first volume transparent
 */
Niivue.prototype.setOpacity = function (volIdx, newOpacity) {
  this.volumes[volIdx].opacity = newOpacity;
  if (volIdx === 0) {
    //background layer opacity set dynamically with shader
    this.drawScene();
    return;
  }
  //all overlays are combined as a single texture, so changing opacity to one requires us to refresh textures
  this.updateGLVolume();
  //
}; // setOpacity()

/**
 * set the scale of the 3D rendering. Larger numbers effectively zoom.
 * @param {number} scale the new scale value
 * @example
 * niivue = new Niivue()
 * niivue.setScale(2) // zoom some
 */
Niivue.prototype.setScale = function (scale) {
  this.scene.volScaleMultiplier = scale;
  this.drawScene();
}; // setScale()

Object.defineProperty(Niivue.prototype, "volScaleMultiplier", {
  get: function () {
    return this.scene.volScaleMultiplier;
  },
  set: function (scale) {
    this.setScale(scale);
  },
});

/**
 * set the color of the 3D clip plane
 * @param {array} color the new color. expects an array of RGBA values. values can range from 0 to 1
 * @example
 * niivue = new Niivue()
 * niivue.setClipPlaneColor([1, 1, 1, 0.5]) // white, transparent
 */
Niivue.prototype.setClipPlaneColor = function (color) {
  this.opts.clipPlaneColor = color;
  this.renderShader.use(this.gl);
  this.gl.uniform4fv(
    this.renderShader.clipPlaneClrLoc,
    this.opts.clipPlaneColor
  );
  this.drawScene();
}; // setClipPlaneColor()

Niivue.prototype.setVolumeRenderIllumination = function (gradientAmount = 0.0) {
  this.renderShader = this.renderVolumeShader;
  if (gradientAmount > 0.0) this.renderShader = this.renderGradientShader;
  this.initRenderShader(this.renderShader, gradientAmount);
  this.renderShader.use(this.gl);
  this.setClipPlaneColor(this.opts.clipPlaneColor);
  this.gradientTextureAmount = gradientAmount;
  this.refreshLayers(this.volumes[0], 0, this.volumes.length);
  this.drawScene();
};

// not included in public docs.
// note: marked for removal at some point in the future (this just makes a test sphere)
Niivue.prototype.overlayRGBA = function (volume) {
  let hdr = volume.hdr;
  let vox = hdr.dims[1] * hdr.dims[2] * hdr.dims[3];
  let imgRGBA = new Uint8ClampedArray(vox * 4);
  let radius = 0.2 * Math.min(Math.min(hdr.dims[1], hdr.dims[2]), hdr.dims[3]);
  let halfX = 0.5 * hdr.dims[1];
  let halfY = 0.5 * hdr.dims[2];
  let halfZ = 0.5 * hdr.dims[3];
  let j = 0;
  for (let z = 0; z < hdr.dims[3]; z++) {
    for (let y = 0; y < hdr.dims[2]; y++) {
      for (let x = 0; x < hdr.dims[1]; x++) {
        let dx = Math.abs(x - halfX);
        let dy = Math.abs(y - halfY);
        let dz = Math.abs(z - halfZ);
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        let v = 0;
        if (dist < radius) v = 255;
        imgRGBA[j++] = 0; //Red
        imgRGBA[j++] = v; //Green
        imgRGBA[j++] = 0; //Blue
        imgRGBA[j++] = v * 0.5; //Alpha
      }
    }
  }
  return imgRGBA;
}; // overlayRGBA()

// not included in public docs
Niivue.prototype.vox2mm = function (XYZ, mtx) {
  let sform = mat.mat4.clone(mtx);
  mat.mat4.transpose(sform, sform);
  let pos = mat.vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1);
  mat.vec4.transformMat4(pos, pos, sform);
  let pos3 = mat.vec3.fromValues(pos[0], pos[1], pos[2]);
  return pos3;
}; // vox2mm()

/**
 * clone a volume and return a new volume
 * @param {number} index the index of the volume to clone
 * @returns {NVImage} returns a new volume to work with, but that volume is not added to the canvas
 * @example
 * niivue = new Niivue()
 * niivue.cloneVolume(0)
 */
Niivue.prototype.cloneVolume = function (index) {
  return this.volumes[index].clone();
};

/**
 *
 * @param {string} url URL of NVDocument
 */
Niivue.prototype.loadDocumentFromUrl = async function (url) {
  let document = await NVDocument.loadFromUrl(url);
  this.loadDocument(document);
};

/**
 * Loads an NVDocument
 * @param {NVDocument} document
 * @returns {Niivue} returns the Niivue instance
 */
Niivue.prototype.loadDocument = function (document) {
  this.document = document;
  this.mediaUrlMap.clear();
  this.createEmptyDrawing();
  // load our images and meshes
  let encodedImageBlobs = document.encodedImageBlobs;
  for (let i = 0; i < document.imageOptionsArray.length; i++) {
    const imageOptions = document.imageOptionsArray[i];
    const base64 = encodedImageBlobs[i];
    if (base64) {
      let image = NVImage.loadFromBase64({ base64, ...imageOptions });
      if (image) {
        this.addVolume(image);
        document.addImageOptions(image, imageOptions);
      }
    }
  }
  if (this.volumes.length > 0) {
    this.back = this.volumes[0];
  }

  const base64 = document.encodedDrawingBlob;
  if (base64) {
    const imageOptions = document.imageOptionsArray[0];
    let drawingBitmap = NVImage.loadFromBase64({ base64, ...imageOptions });
    if (drawingBitmap) {
      this.loadDrawing(drawingBitmap);
    }
  }

  for (const meshDataObject of document.meshDataObjects) {
    const meshInit = { gl: this.gl, ...meshDataObject };
    log.debug(meshInit);
    const meshToAdd = new NVMesh(
      meshInit.pts,
      meshInit.tris,
      meshInit.name,
      meshInit.rgba255,
      meshInit.opacity,
      meshInit.visible,
      this.gl,
      meshInit.connectome,
      meshInit.dpg,
      meshInit.dps,
      meshInit.dpv
    );
    meshToAdd.meshShaderIndex = meshInit.meshShaderIndex;
    meshToAdd.layers = meshInit.layers;
    meshToAdd.updateMesh(this.gl);
    log.debug(meshToAdd);
    this.addMesh(meshToAdd);
  }
  this.updateGLVolume();
  this.onDocumentLoaded();
  return this;
};

Niivue.prototype.saveDocument = async function (fileName = "untitled.nvd") {
  this.document.title = fileName;
  // we need to re-render before we generate the data URL https://stackoverflow.com/questions/30628064/how-to-toggle-preservedrawingbuffer-in-three-js
  this.drawScene();
  this.document.previewImageDataURL = this.canvas.toDataURL();
  this.document.download(fileName);
};

/**
 * load an array of volume objects
 * @param {array} volumeList the array of objects to load. each object must have a resolvable "url" property at a minimum
 * @returns {Niivue} returns the Niivue instance
 * @example
 * niivue = new Niivue()
 * niivue.loadVolumes([{url: 'someImage.nii.gz}, {url: 'anotherImage.nii.gz'}])
 *
 * Each volume object can have the following properties:
 * @property {string} url - the url of the image to load
 * @property {string} name - the name of the image
 * @property {string} colormap - the name of the color map to use
 * @property {string} colormapNegative - the name of the color map to use for negative values
 * @property {number} opacity - the opacity of the image
 * @property {string} urlImgData - the image data to use if header and image are separate files
 * @property {number} cal_min - the minimum value to display
 * @property {number} cal_max - the maximum value to display
 * @property {boolean} trustCalMinMax - whether to trust the cal_min and cal_max values in the header
 * @property {boolean} isManifest - whether the image is a manifest file
 * @property {number} frame4D - the index of the 4D data to load
 */
Niivue.prototype.loadVolumes = async function (volumeList) {
  this.on("loading", (isLoading) => {
    if (isLoading) {
      this.loadingText = "loading...";
      this.drawScene();
    } else {
      this.loadingText = this.opts.loadingText;
    }
  });

  if (this.thumbnailVisible) {
    // defer volume loading until user clicks on canvas with thumbnail image
    this.deferredVolumes = volumeList;
    return this;
  }
  this.volumes = [];
  this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.uiData.loading$.next(false);
  // for loop to load all volumes in volumeList
  for (let i = 0; i < volumeList.length; i++) {
    this.uiData.loading$.next(true);
    if (volumeList[i].colorMap !== undefined)
      volumeList[i].colormap = volumeList[i].colorMap;
    if (volumeList[i].colorMapNegative !== undefined)
      volumeList[i].colormapNegative = volumeList[i].colorMapNegative;
    let imageOptions = {
      url: volumeList[i].url,
      name: volumeList[i].name,
      colormap: volumeList[i].colormap,
      colormapNegative: volumeList[i].colormapNegative,
      opacity: volumeList[i].opacity,
      urlImgData: volumeList[i].urlImgData,
      cal_min: volumeList[i].cal_min,
      cal_max: volumeList[i].cal_max,
      trustCalMinMax: this.opts.trustCalMinMax,
      isManifest: volumeList[i].isManifest,
      frame4D: volumeList[i].frame4D,
      limitFrames4D: volumeList[i].limitFrames4D || this.opts.limitFrames4D,
    };
    await this.addVolumeFromUrl(imageOptions);
    this.uiData.loading$.next(false);
  } // for
  return this;
}; // loadVolumes()

/**
 * Add mesh and notify subscribers
 * @param {NVMeshFromUrlOptions} meshOptions
 * @returns {NVMesh}
 */
Niivue.prototype.addMeshFromUrl = async function (meshOptions) {
  let options = new NVMeshFromUrlOptions();
  options.gl = this.gl;
  Object.assign(options, meshOptions);
  let mesh = await NVMesh.loadFromUrl(options);
  this.mediaUrlMap.set(mesh, options.url);
  this.onMeshAddedFromUrl(options);
  this.addMesh(mesh);

  return mesh;
};

/**
 * load an array of meshes
 * @param {array} meshList the array of objects to load. each object must have a resolvable "url" property at a minimum
 * @returns {Niivue} returns the Niivue instance
 * @example
 * niivue = new Niivue()
 * niivue.loadMeshes([{url: 'someMesh.gii}])
 */
Niivue.prototype.loadMeshes = async function (meshList) {
  this.on("loading", (isLoading) => {
    if (isLoading) {
      this.loadingText = "loading...";
      this.drawScene();
    } else {
      this.loadingText = this.opts.loadingText;
    }
  });
  if (this.thumbnailVisible) {
    // defer loading until user clicks on canvas with thumbnail image
    this.deferredMeshes = meshList;
    return this;
  }
  if (!this.initialized) {
    //await this.init();
  }
  this.meshes = [];
  this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);

  this.uiData.loading$.next(false);
  // for loop to load all volumes in volumeList
  for (let i = 0; i < meshList.length; i++) {
    this.uiData.loading$.next(true);
    await this.addMeshFromUrl(meshList[i]);
    this.uiData.loading$.next(false);
  } // for
  this.drawScene();
  return this;
}; // loadMeshes

/**
 * load a connectome specified by json
 * @param {object} connectome model
 * @returns {Niivue} returns the Niivue instance
 */
Niivue.prototype.loadConnectome = async function (json) {
  this.on("loading", (isLoading) => {
    if (isLoading) {
      this.loadingText = "loading...";
      this.drawScene();
    } else {
      this.loadingText = this.opts.loadingText;
    }
  });

  this.meshes = [];
  this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.uiData.loading$.next(false);
  // for loop to load all volumes in volumeList
  for (let i = 0; i < 1; i++) {
    this.uiData.loading$.next(true);
    let mesh = await NVMesh.loadConnectomeFromJSON(json, this.gl);
    this.uiData.loading$.next(false);
    this.addMesh(mesh);
    //this.meshes.push(mesh);
    //this.updateGLVolume();
  } // for
  this.drawScene();
  return this;
}; // loadMeshes

/**
 * generate a blank canvas for the pen tool
 * @example niivue.createEmptyDrawing()
 */
Niivue.prototype.createEmptyDrawing = async function () {
  if (!this.back.hasOwnProperty("dims")) return;
  let mn = Math.min(
    Math.min(this.back.dims[1], this.back.dims[2]),
    this.back.dims[3]
  );
  if (mn < 1) return; //something is horribly wrong!
  let vx = this.back.dims[1] * this.back.dims[2] * this.back.dims[3];
  this.drawBitmap = new Uint8Array(vx);
  this.drawClearAllUndoBitmaps();
  this.drawAddUndoBitmap();
  this.drawTexture = this.r8Tex(
    this.drawTexture,
    this.gl.TEXTURE7,
    this.back.dims,
    true
  );
  this.refreshDrawing(false);
};

// not included in public docs
// create a 1-component (red) 16-bit signed integer texture on the GPU
Niivue.prototype.r16Tex = function (texID, activeID, dims, img16 = []) {
  if (texID) this.gl.deleteTexture(texID);
  texID = this.gl.createTexture();
  this.gl.activeTexture(activeID);
  this.gl.bindTexture(this.gl.TEXTURE_3D, texID);
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_MIN_FILTER,
    this.gl.NEAREST
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_MAG_FILTER,
    this.gl.NEAREST
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_R,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_S,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_T,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
  this.gl.texStorage3D(
    this.gl.TEXTURE_3D,
    1,
    this.gl.R16I,
    dims[1],
    dims[2],
    dims[3]
  ); //output background dimensions
  let nv = dims[1] * dims[2] * dims[3];
  if (img16.length !== nv) img16 = new Int16Array(nv);
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
  ); //this.gl.SHORT,

  return texID;
}; // r16Tex()

// not included in public docs
// rotate image to match right-anterior-superior voxel order
function img2ras16(volume) {
  // return image oriented to RAS space as int16
  let dims = volume.hdr.dims; //reverse to original
  let perm = volume.permRAS;
  let vx = dims[1] * dims[2] * dims[3];
  //this.drawBitmap = new Uint8Array(vx);
  let img16 = new Int16Array(vx);
  let layout = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (Math.abs(perm[i]) - 1 !== j) continue;
      layout[j] = i * Math.sign(perm[i]);
    }
  }
  let stride = 1;
  let instride = [1, 1, 1];
  let inflip = [false, false, false];
  for (let i = 0; i < layout.length; i++) {
    for (let j = 0; j < layout.length; j++) {
      let a = Math.abs(layout[j]);
      if (a != i) continue;
      instride[j] = stride;
      //detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
      if (layout[j] < 0 || Object.is(layout[j], -0)) inflip[j] = true;
      stride *= dims[j + 1];
    }
  }
  //lookup table for flips and stride offsets:
  const range = (start, stop, step) =>
    Array.from(
      { length: (stop - start) / step + 1 },
      (_, i) => start + i * step
    );
  let xlut = range(0, dims[1] - 1, 1);
  if (inflip[0]) xlut = range(dims[1] - 1, 0, -1);
  for (let i = 0; i < dims[1]; i++) xlut[i] *= instride[0];
  let ylut = range(0, dims[2] - 1, 1);
  if (inflip[1]) ylut = range(dims[2] - 1, 0, -1);
  for (let i = 0; i < dims[2]; i++) ylut[i] *= instride[1];
  let zlut = range(0, dims[3] - 1, 1);
  if (inflip[2]) zlut = range(dims[3] - 1, 0, -1);
  for (let i = 0; i < dims[3]; i++) zlut[i] *= instride[2];
  //convert data
  let j = 0;
  for (let z = 0; z < dims[3]; z++) {
    for (let y = 0; y < dims[2]; y++) {
      for (let x = 0; x < dims[1]; x++) {
        img16[xlut[x] + ylut[y] + zlut[z]] = volume.img[j];
        j++;
      } //for x
    } //for y
  } //for z
  return img16;
}

/**
 * dilate drawing so all voxels are colored.
 * works on drawing with multiple colors
 * @example niivue.drawGrowCut();
 */
Niivue.prototype.drawGrowCut = function () {
  let hdr = this.back.hdr;
  let nv = hdr.dims[1] * hdr.dims[2] * hdr.dims[3];
  if (this.drawBitmap.length !== nv) {
    log.debug("bitmap dims are wrong");
    return;
  }
  //this.drawUndoBitmap = this.drawBitmap.slice();
  let gl = this.gl;
  let fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.disable(gl.CULL_FACE);
  gl.viewport(0, 0, this.back.dims[1], this.back.dims[2]); //output in background dimensions
  gl.disable(gl.BLEND);
  //we need to devote 5 textures to this shader 3,4,5,6,7
  let img16 = img2ras16(this.back);
  let background = this.r16Tex(null, gl.TEXTURE3, this.back.dims, img16);
  for (let i = 1; i < nv; i++) img16[i] = this.drawBitmap[i];
  let label0 = this.r16Tex(null, gl.TEXTURE6, this.back.dims, img16);
  let label1 = this.r16Tex(null, gl.TEXTURE7, this.back.dims, img16); //TEXTURE7 = draw Texture
  let kMAX_STRENGTH = 10000;
  for (let i = 1; i < nv; i++) if (img16[i] > 0) img16[i] = kMAX_STRENGTH;
  let strength0 = this.r16Tex(null, gl.TEXTURE4, this.back.dims, img16);
  let strength1 = this.r16Tex(null, gl.TEXTURE5, this.back.dims, img16);
  this.gl.bindVertexArray(this.genericVAO);
  let shader = this.growCutShader;
  shader.use(gl);
  let iterations = 128; //will run 2x this value
  gl.uniform1i(shader.uniforms["finalPass"], 0);
  gl.uniform1i(shader.uniforms["inputTexture0"], 3); // background is TEXTURE3
  for (let j = 0; j < iterations; j++) {
    gl.uniform1i(shader.uniforms["inputTexture1"], 6); // label0 is TEXTURE6
    gl.uniform1i(shader.uniforms["inputTexture2"], 4); // strength0 is TEXTURE4
    for (let i = 0; i < this.back.dims[3]; i++) {
      let coordZ = (1 / this.back.dims[3]) * (i + 0.5);
      this.gl.uniform1f(shader.uniforms["coordZ"], coordZ);
      this.gl.framebufferTextureLayer(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        label1,
        0,
        i
      );
      this.gl.framebufferTextureLayer(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT1,
        strength1,
        0,
        i
      );
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status != gl.FRAMEBUFFER_COMPLETE)
        console.error("Incomplete framebuffer");

      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    } //for i: each slice
    //reverse order strength1/label1 and strength0/label0 for reading and writing:
    if (j === iterations - 1) gl.uniform1i(shader.uniforms["finalPass"], 1);
    gl.uniform1i(shader.uniforms["inputTexture1"], 7); // label1 is TEXTURE7
    gl.uniform1i(shader.uniforms["inputTexture2"], 5); // strength1 is TEXTURE5
    for (let i = 0; i < this.back.dims[3]; i++) {
      let coordZ = (1 / this.back.dims[3]) * (i + 0.5);
      this.gl.uniform1f(shader.uniforms["coordZ"], coordZ);
      this.gl.framebufferTextureLayer(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        label0,
        0,
        i
      );
      this.gl.framebufferTextureLayer(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT1,
        strength0,
        0,
        i
      );
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status != gl.FRAMEBUFFER_COMPLETE)
        console.error("Incomplete framebuffer");
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    } //for i: each slice
  } //for j: each iteration
  //read data
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  let readAttach = gl.COLOR_ATTACHMENT1;
  let readTex = label0;
  gl.readBuffer(readAttach); //label
  // assuming a framebuffer is bound with the texture to read attached
  const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
  const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
  if (format !== gl.RED_INTEGER || type !== gl.SHORT)
    log.debug("readPixels will fail.");
  img16 = [];
  let nv2D = this.back.dims[1] * this.back.dims[2];
  let slice16 = new Int16Array(nv2D);
  for (let i = 0; i < this.back.dims[3]; i++) {
    gl.framebufferTextureLayer(
      gl.FRAMEBUFFER,
      readAttach, //gl.COLOR_ATTACHMENT1,//COLOR_ATTACHMENT1
      readTex, //strength1,//strength0
      0,
      i
    );
    gl.readPixels(
      0,
      0,
      this.back.dims[1],
      this.back.dims[2],
      format,
      type,
      slice16
    );
    //img16.push(...slice16); // <- will elicit call stack limit error
    img16 = [...img16, ...slice16];
  }
  let mx = img16[0];
  for (let i = 0; i < img16.length; i++) mx = Math.max(mx, img16[i]);
  for (let i = 1; i < nv; i++) this.drawBitmap[i] = img16[i];
  //clean up
  //restore textures
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_3D, this.overlayTexture);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, this.fontTexture);
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, this.bmpTexture);
  gl.activeTexture(gl.TEXTURE7);
  gl.bindTexture(gl.TEXTURE_3D, this.drawTexture);
  gl.deleteTexture(background);
  gl.deleteTexture(strength0);
  gl.deleteTexture(strength1);
  gl.deleteTexture(label0);
  gl.deleteTexture(label1);
  gl.bindVertexArray(this.unusedVAO);
  //gl.deleteTexture(blendTexture);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb);
  this.drawAddUndoBitmap();
  this.refreshDrawing(true);
};

// not included in public docs
// set color of single voxel in drawing
Niivue.prototype.drawPt = function (x, y, z, penValue) {
  let dx = this.back.dims[1];
  let dy = this.back.dims[2];
  let dz = this.back.dims[3];
  x = Math.min(Math.max(x, 0), dx - 1);
  y = Math.min(Math.max(y, 0), dy - 1);
  z = Math.min(Math.max(z, 0), dz - 1);
  this.drawBitmap[x + y * dx + z * dx * dy] = penValue;
};

// not included in public docs
// create line between to voxels in drawing
// https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
// https://www.geeksforgeeks.org/bresenhams-algorithm-for-3-d-line-drawing/
// ptA, ptB are start and end points of line (each XYZ)
Niivue.prototype.drawPenLine = function (ptA, ptB, penValue) {
  let dx = Math.abs(ptA[0] - ptB[0]);
  let dy = Math.abs(ptA[1] - ptB[1]);
  let dz = Math.abs(ptA[2] - ptB[2]);
  let xs = -1;
  let ys = -1;
  let zs = -1;
  if (ptB[0] > ptA[0]) xs = 1;
  if (ptB[1] > ptA[1]) ys = 1;
  if (ptB[2] > ptA[2]) zs = 1;
  let x1 = ptA[0];
  let y1 = ptA[1];
  let z1 = ptA[2];
  let x2 = ptB[0];
  let y2 = ptB[1];
  let z2 = ptB[2];
  if (dx >= dy && dx >= dz) {
    //Driving axis is X-axis"
    let p1 = 2 * dy - dx;
    let p2 = 2 * dz - dx;
    while (x1 != x2) {
      x1 += xs;
      if (p1 >= 0) {
        y1 += ys;
        p1 -= 2 * dx;
      }
      if (p2 >= 0) {
        z1 += zs;
        p2 -= 2 * dx;
      }
      p1 += 2 * dy;
      p2 += 2 * dz;
      this.drawPt(x1, y1, z1, penValue);
    } //while
  } else if (dy >= dx && dy >= dz) {
    //Driving axis is Y-axis"
    let p1 = 2 * dx - dy;
    let p2 = 2 * dz - dy;
    while (y1 != y2) {
      y1 += ys;
      if (p1 >= 0) {
        x1 += xs;
        p1 -= 2 * dy;
      }
      if (p2 >= 0) {
        z1 += zs;
        p2 -= 2 * dy;
      }
      p1 += 2 * dx;
      p2 += 2 * dz;
      this.drawPt(x1, y1, z1, penValue);
    } //while
  } else {
    //# Driving axis is Z-axis
    let p1 = 2 * dy - dz;
    let p2 = 2 * dx - dz;
    while (z1 != z2) {
      z1 += zs;
      if (p1 >= 0) {
        y1 += ys;
        p1 -= 2 * dz;
      }
      if (p2 >= 0) {
        x1 += xs;
        p2 -= 2 * dz;
      }
      p1 += 2 * dy;
      p2 += 2 * dx;
      this.drawPt(x1, y1, z1, penValue);
    } //while
  }
};

// a voxel can be defined as having 6, 18 or 26 neighbors:
//   6: neighbors share faces (distance=1)
//  18: neighbors share faces (distance=1) or edges (1.4)
//  26: neighbors share faces (distance=1), edges (1.4) or corners (1.7)
Niivue.prototype.drawFloodFillCore = async function (
  img,
  seedVx,
  neighbors = 6
) {
  let dims = [this.back.dims[1], this.back.dims[2], this.back.dims[3]]; //+1: dims indexed from 0!
  let nx = dims[0];
  let nxy = nx * dims[1];
  function xyz2vx(pt) {
    //provided an XYZ 3D point, provide address in 1D array
    return pt[0] + pt[1] * nx + pt[2] * nxy;
  }
  function vx2xyz(vx) {
    //provided address in 1D array, return XYZ coordinate
    let Z = Math.floor(vx / nxy); //slice
    let Y = Math.floor((vx - Z * nxy) / nx); //column
    let X = Math.floor(vx % nx);
    return [X, Y, Z];
  }
  //1. Set Q to the empty queue or stack.
  let Q = [];
  //2. Add node to the end of Q.
  Q.push(seedVx);
  img[seedVx] = 2; //part of cluster
  //3. While Q is not empty:
  while (Q.length > 0) {
    //4.   Set n equal to the first element of Q.
    let vx = Q[0];
    //5.   Remove first element from Q.
    Q.shift();
    //6. Test six neighbors of n (left,right,anterior,posterior,inferior, superior
    //   If any is is unfound part of cluster (value = 1) set it to found (value 2) and add to Q
    let xyz = vx2xyz(vx);
    function testNeighbor(offset) {
      let xyzN = xyz.slice();
      xyzN[0] += offset[0];
      xyzN[1] += offset[1];
      xyzN[2] += offset[2];
      if (xyzN[0] < 0 || xyzN[1] < 0 || xyzN[2] < 0) return;
      if (xyzN[0] >= dims[0] || xyzN[1] >= dims[1] || xyzN[2] >= dims[2])
        return;
      let vxT = xyz2vx(xyzN);
      if (img[vxT] !== 1) return;
      img[vxT] = 2; //part of cluster
      Q.push(vxT);
    }
    //test neighbors that share face
    testNeighbor([0, 0, -1]); //inferior
    testNeighbor([0, 0, 1]); //superior
    testNeighbor([0, -1, 0]); //posterior
    testNeighbor([0, 1, 0]); //anterior
    testNeighbor([-1, 0, 0]); //left
    testNeighbor([1, 0, 0]); //right
    if (neighbors <= 6) continue;
    //test voxels that share edge
    testNeighbor([-1, -1, 0]); //left posterior
    testNeighbor([1, 1, 0]); //right posterior
    testNeighbor([-1, 1, 0]); //left anterior
    testNeighbor([1, 1, 0]); //right anterior
    testNeighbor([0, -1, -1]); //posterior inferior
    testNeighbor([0, 1, -1]); //anterior inferior
    testNeighbor([-1, 0, -1]); //left inferior
    testNeighbor([1, 0, -1]); //right inferior
    testNeighbor([0, -1, 1]); //posterior superior
    testNeighbor([0, 1, 1]); //anterior superior
    testNeighbor([-1, 0, 1]); //left superior
    testNeighbor([1, 0, 1]); //right superior
    if (neighbors <= 18) continue;
    //test neighbors that share a corner
    testNeighbor([-1, -1, -1]); //left posterior inferior
    testNeighbor([1, -1, -1]); //right posterior inferior
    testNeighbor([-1, 1, -1]); //left anterior inferior
    testNeighbor([1, 1, -1]); //right anterior inferior
    testNeighbor([-1, -1, 1]); //left posterior superior
    testNeighbor([1, -1, 1]); //right posterior superior
    testNeighbor([-1, 1, 1]); //left anterior superior
    testNeighbor([1, 1, 1]); //right anterior superior
    //7. Continue looping until Q is exhausted.
  }
}; // drawFloodFillCore()

// not included in public docs
// set all connected voxels in drawing to new color
Niivue.prototype.drawFloodFill = function (
  seedXYZ,
  newColor = 0,
  growSelectedCluster = 0, //if non-zero, growth based on background intensity POSITIVE_INFINITY for selected or bright, NEGATIVE_INFINITY for selected or darker
  forceMin = NaN,
  forceMax = NaN,
  neighbors = 6
) {
  //3D "paint bucket" fill:
  // set all voxels connected to seed point to newColor
  // https://en.wikipedia.org/wiki/Flood_fill
  newColor = Math.abs(newColor);
  let dims = [this.back.dims[1], this.back.dims[2], this.back.dims[3]]; //+1: dims indexed from 0!
  if (seedXYZ[0] < 0 || seedXYZ[1] < 0 || seedXYZ[2] < 0) return;
  if (seedXYZ[0] >= dims[0] || seedXYZ[1] >= dims[1] || seedXYZ[2] >= dims[2])
    return;
  let nx = dims[0];
  let nxy = nx * dims[1];
  let nxyz = nxy * dims[2];
  let img = this.drawBitmap.slice();
  if (img.length !== nxy * dims[2]) return;
  function xyz2vx(pt) {
    //provided an XYZ 3D point, provide address in 1D array
    return pt[0] + pt[1] * nx + pt[2] * nxy;
  }
  let seedVx = xyz2vx(seedXYZ);
  let seedColor = img[seedVx];
  if (seedColor === newColor) {
    if (growSelectedCluster !== 0)
      log.debug("drawFloodFill selected voxel is not part of a drawing");
    else log.debug("drawFloodFill selected voxel is already desired color");
    return;
  }
  for (let i = 1; i < nxyz; i++) {
    img[i] = 0;
    if (this.drawBitmap[i] === seedColor) img[i] = 1;
  }
  this.drawFloodFillCore(img, seedVx, neighbors);
  //8. (Optional) work out intensity of selected cluster
  if (growSelectedCluster !== 0) {
    let backImg = this.volumes[0].img2RAS();
    let mx = backImg[seedVx];
    let mn = mx;
    if (isFinite(forceMax) && isFinite(forceMin)) {
      mx = forceMax;
      mn = forceMin;
    } else {
      for (let i = 1; i < nxyz; i++) {
        if (img[i] === 2) {
          mx = Math.max(mx, backImg[i]);
          mn = Math.min(mn, backImg[i]);
        }
      }
      if (growSelectedCluster == Number.POSITIVE_INFINITY)
        mx = growSelectedCluster;
      if (growSelectedCluster == Number.NEGATIVE_INFINITY)
        mn = growSelectedCluster;
    }
    log.debug("Intensity range of selected cluster :", mn, mx);
    //second pass:
    for (let i = 1; i < nxyz; i++) {
      img[i] = 0;
      if (backImg[i] >= mn && backImg[i] <= mx) img[i] = 1;
    }
    this.drawFloodFillCore(img, seedVx, neighbors);
    newColor = seedColor;
  }
  //8. Return
  for (let i = 1; i < nxyz; i++)
    if (img[i] === 2)
      //if part of cluster
      this.drawBitmap[i] = newColor;
  this.drawAddUndoBitmap();
  this.refreshDrawing(false);
}; // drawFloodFill()

// not included in public docs
// given series of line segments, connect first and last
// voxel and fill the interior of the line segments
Niivue.prototype.drawPenFilled = function () {
  let nPts = this.drawPenFillPts.length;
  if (nPts < 2) {
    //can not fill single line
    this.drawPenFillPts = [];
    return;
  }
  //do fill in 2D, based on axial (0), coronal (1) or sagittal drawing (2
  let axCorSag = this.drawPenAxCorSag;
  //axial is x(0)*y(1) horizontal*vertical
  let h = 0;
  let v = 1;
  if (axCorSag === 1) v = 2; //coronal is x(0)*z(0)
  if (axCorSag === 2) {
    //sagittal is y(1)*z(2)
    h = 1;
    v = 2;
  }
  let dims2D = [this.back.dims[h + 1], this.back.dims[v + 1]]; //+1: dims indexed from 0!
  //create bitmap of horizontal*vertical voxels:
  var img2D = new Uint8Array(dims2D[0] * dims2D[1]);
  var pen = 1; //do not use this.opts.penValue, as "erase" is zero
  function drawLine2D(ptA, ptB, penValue) {
    let dx = Math.abs(ptA[0] - ptB[0]);
    let dy = Math.abs(ptA[1] - ptB[1]);
    img2D[ptA[0] + ptA[1] * dims2D[0]] = pen;
    img2D[ptB[0] + ptB[1] * dims2D[0]] = pen;
    let xs = -1;
    let ys = -1;
    if (ptB[0] > ptA[0]) xs = 1;
    if (ptB[1] > ptA[1]) ys = 1;
    let x1 = ptA[0];
    let y1 = ptA[1];
    let x2 = ptB[0];
    let y2 = ptB[1];
    if (dx >= dy) {
      //Driving axis is X-axis"
      let p1 = 2 * dy - dx;
      while (x1 != x2) {
        x1 += xs;
        if (p1 >= 0) {
          y1 += ys;
          p1 -= 2 * dx;
        }
        p1 += 2 * dy;
        img2D[x1 + y1 * dims2D[0]] = pen;
      } //while
    } else {
      //Driving axis is Y-axis"
      let p1 = 2 * dx - dy;
      while (y1 != y2) {
        y1 += ys;
        if (p1 >= 0) {
          x1 += xs;
          p1 -= 2 * dy;
        }
        p1 += 2 * dx;
        img2D[x1 + y1 * dims2D[0]] = pen;
      } //while
    }
  }
  let startPt = [this.drawPenFillPts[0][h], this.drawPenFillPts[0][v]];
  let prevPt = startPt;
  for (let i = 1; i < nPts; i++) {
    let pt = [this.drawPenFillPts[i][h], this.drawPenFillPts[i][v]];
    drawLine2D(prevPt, pt);
    prevPt = pt;
  }
  drawLine2D(startPt, prevPt); //close drawing
  //flood fill
  let seeds = [];
  function setSeed(pt) {
    if (pt[0] < 0 || pt[1] < 0 || pt[0] >= dims2D[0] || pt[1] >= dims2D[1])
      return;
    let pxl = pt[0] + pt[1] * dims2D[0];
    if (img2D[pxl] !== 0) return; //not blank
    seeds.push(pt);
    img2D[pxl] = 2;
  }
  // https://en.wikipedia.org/wiki/Flood_fill
  // first seed all edges
  //bottom row
  for (let i = 0; i < dims2D[0]; i++) setSeed([i, 0]);
  //top row
  for (let i = 0; i < dims2D[0]; i++) setSeed([i, dims2D[1] - 1]);
  //left column
  for (let i = 0; i < dims2D[1]; i++) setSeed([0, i]);
  //right columns
  for (let i = 0; i < dims2D[1]; i++) setSeed([dims2D[0] - 1, i]);
  //now retire first in first out
  while (seeds.length > 0) {
    //always remove one seed, plant 0..4 new ones
    let seed = seeds.shift();
    setSeed([seed[0] - 1, seed[1]]);
    setSeed([seed[0] + 1, seed[1]]);
    setSeed([seed[0], seed[1] - 1]);
    setSeed([seed[0], seed[1] + 1]);
  }
  //all voxels with value of zero have no path to edges
  //insert surviving pixels from 2D bitmap into 3D bitmap
  pen = this.opts.penValue;
  let slice = this.drawPenFillPts[0][3 - (h + v)];
  if (axCorSag === 0) {
    //axial
    let offset = slice * dims2D[0] * dims2D[1];
    for (let i = 0; i < dims2D[0] * dims2D[1]; i++) {
      if (img2D[i] !== 2) this.drawBitmap[i + offset] = pen;
    }
  } else {
    let xStride = 1; //coronal: horizontal LR pixels contiguous
    let yStride = this.back.dims[1] * this.back.dims[2]; //coronal: vertical is slice
    let zOffset = slice * this.back.dims[1]; //coronal: slice is number of columns
    if (axCorSag === 2) {
      //sagittal
      xStride = this.back.dims[1];
      zOffset = slice;
    }
    let i = 0;
    for (let y = 0; y < dims2D[1]; y++) {
      for (let x = 0; x < dims2D[0]; x++) {
        if (img2D[i] !== 2)
          this.drawBitmap[x * xStride + y * yStride + zOffset] = pen;
        i++;
      } // x column
    } //y row
  } //not axial
  //this.drawUndoBitmaps[this.currentDrawUndoBitmap]
  if (
    !this.drawFillOverwrites &&
    this.drawUndoBitmaps[this.currentDrawUndoBitmap].length > 0
  ) {
    let nv = this.drawBitmap.length;
    let bmp = decodeRLE(this.drawUndoBitmaps[this.currentDrawUndoBitmap], nv);
    for (let i = 0; i < nv; i++) {
      if (bmp[i] === 0) continue;
      this.drawBitmap[i] = bmp[i];
    }
  }
  this.drawPenFillPts = [];
  this.drawAddUndoBitmap();
  this.refreshDrawing(false);
}; // drawPenFilled()

/*
//Demonstrate how to create drawing
Niivue.prototype.createRandomDrawing = function () {
  if (!this.drawBitmap) this.createEmptyDrawing();
  if (!this.back.hasOwnProperty("dims")) return;
  let vx = this.back.dims[1] * this.back.dims[2] * this.back.dims[3];
  if (vx !== this.drawBitmap.length) {
    log.error("Epic drawing failure");
  }
  let dx = this.back.dims[1] - 1;
  let dy = this.back.dims[2] - 1;
  let dz = this.back.dims[3];
  let ptA = [0, 0, 0];
  let ptB = [dx, dy, 0];

  for (let i = 0; i < dz; i++) {
    ptA[2] = i;
    ptB[2] = i;
    this.drawRect(ptA, ptB, (i % 3) + 1);
  }
  this.refreshDrawing(true);
};*/

/**
 * close drawing: make sure you have saved any changes before calling this!
 * @example niivue.closeDrawing();
 * @see {@link https://niivue.github.io/niivue/features/draw.ui.html|live demo usage}
 */
Niivue.prototype.closeDrawing = function () {
  this.drawClearAllUndoBitmaps();
  this.rgbaTex(this.drawTexture, this.gl.TEXTURE7, [2, 2, 2, 2], true, true);
  this.drawBitmap = null;
  this.drawScene();
};

// not included in public docs
// Copy drawing bitmap from CPU to GPU storage and redraw the screen
Niivue.prototype.refreshDrawing = function (isForceRedraw = true) {
  let dims = this.back.dims.slice();
  //let dims = this.volumes[0].hdr.dims.slice();
  let vx = this.back.dims[1] * this.back.dims[2] * this.back.dims[3];
  if (this.drawBitmap.length === 8) {
    dims[1] = 2;
    dims[2] = 2;
    dims[3] = 2;
  } else if (vx !== this.drawBitmap.length) {
    log.warn("Drawing bitmap must match the background image");
  }
  this.gl.activeTexture(this.gl.TEXTURE7);
  this.gl.bindTexture(this.gl.TEXTURE_3D, this.drawTexture);
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
    this.drawBitmap
  );
  if (isForceRedraw) this.drawScene();
};

// not included in public docs
// create 3D 1-component (red) uint8 texture on GPU
Niivue.prototype.r8Tex = function (texID, activeID, dims, isInit = false) {
  if (texID) this.gl.deleteTexture(texID);
  texID = this.gl.createTexture();
  this.gl.activeTexture(activeID);
  this.gl.bindTexture(this.gl.TEXTURE_3D, texID);
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_MIN_FILTER,
    this.gl.NEAREST
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_MAG_FILTER,
    this.gl.NEAREST
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_R,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_S,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_T,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
  this.gl.texStorage3D(
    this.gl.TEXTURE_3D,
    1,
    this.gl.R8,
    dims[1],
    dims[2],
    dims[3]
  ); //output background dimensions
  if (isInit) {
    let img8 = new Uint8Array(dims[1] * dims[2] * dims[3]);
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
    );
  }
  return texID;
}; // r8Tex()

// not included in public docs
// create 3D 4-component (red,green,blue,alpha) uint8 texture on GPU
Niivue.prototype.rgbaTex = function (texID, activeID, dims, isInit = false) {
  if (texID) this.gl.deleteTexture(texID);
  texID = this.gl.createTexture();
  this.gl.activeTexture(activeID);
  this.gl.bindTexture(this.gl.TEXTURE_3D, texID);
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_MIN_FILTER,
    this.gl.LINEAR
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_MAG_FILTER,
    this.gl.LINEAR
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_R,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_S,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_T,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
  this.gl.texStorage3D(
    this.gl.TEXTURE_3D,
    1,
    this.gl.RGBA8,
    dims[1],
    dims[2],
    dims[3]
  ); //output background dimensions
  if (isInit) {
    let img8 = new Uint8Array(dims[1] * dims[2] * dims[3] * 4);
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
    );
  }
  return texID;
}; // rgbaTex()

// not included in public docs
// remove cross origin if not from same domain. From https://webglfundamentals.org/webgl/lessons/webgl-cors-permission.html
Niivue.prototype.requestCORSIfNotSameOrigin = function (img, url) {
  if (new URL(url, window.location.href).origin !== window.location.origin) {
    img.crossOrigin = "";
  }
};

// not included in public docs
// creates 4-component (red,green,blue,alpha) uint8 texture on GPU
Niivue.prototype.loadPngAsTexture = function (pngUrl, textureNum) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => {
      let pngTexture = [];
      if (textureNum === 4) {
        if (this.bmpTexture !== null) this.gl.deleteTexture(this.bmpTexture);
        this.bmpTexture = this.gl.createTexture();
        pngTexture = this.bmpTexture;
        this.bmpTextureWH = img.width / img.height;
        this.gl.activeTexture(this.gl.TEXTURE4);
        this.bmpShader.use(this.gl);
        this.gl.uniform1i(this.bmpShader.uniforms["bmpTexture"], 4);
      } else if (textureNum === 5) {
        this.gl.activeTexture(this.gl.TEXTURE5);
        if (this.matCapTexture !== null)
          this.gl.deleteTexture(this.matCapTexture);
        this.matCapTexture = this.gl.createTexture();
        pngTexture = this.matCapTexture;
      } else {
        this.fontShader.use(this.gl);
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.uniform1i(this.fontShader.uniforms["fontTexture"], 3);
        if (this.fontTexture !== null) this.gl.deleteTexture(this.fontTexture);
        this.fontTexture = this.gl.createTexture();
        pngTexture = this.fontTexture;
      }
      this.gl.bindTexture(this.gl.TEXTURE_2D, pngTexture);
      // Set the parameters so we can render any size image.
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_WRAP_S,
        this.gl.CLAMP_TO_EDGE
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_WRAP_T,
        this.gl.CLAMP_TO_EDGE
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MIN_FILTER,
        this.gl.LINEAR
      );
      this.gl.texParameteri(
        this.gl.TEXTURE_2D,
        this.gl.TEXTURE_MAG_FILTER,
        this.gl.LINEAR
      );
      // Upload the image into the texture.
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        img
      );
      resolve(pngTexture);
      if (textureNum !== 4) this.drawScene(); //draw the font
    };
    img.onerror = reject;
    this.requestCORSIfNotSameOrigin(img, pngUrl);
    img.src = pngUrl;
  });
};

// not included in public docs
// load font stored as PNG bitmap with texture unit 3
Niivue.prototype.loadFontTexture = function (fontUrl) {
  this.loadPngAsTexture(fontUrl, 3);
};

// not included in public docs
// load PNG bitmap with texture unit 4
Niivue.prototype.loadBmpTexture = async function (bmpUrl) {
  await this.loadPngAsTexture(bmpUrl, 4);
};
// not included in public docs
// load font stored as JPG/PNG bitmap with texture unit 5
Niivue.prototype.loadMatCapTexture = function (bmpUrl) {
  this.loadPngAsTexture(bmpUrl, 5);
};

// not included in public docs
// load font bitmap and metrics
Niivue.prototype.initFontMets = function () {
  this.fontMets = [];
  for (let id = 0; id < 256; id++) {
    //clear ASCII codes 0..256
    this.fontMets[id] = {};
    this.fontMets[id].xadv = 0;
    this.fontMets[id].uv_lbwh = [0, 0, 0, 0];
    this.fontMets[id].lbwh = [0, 0, 0, 0];
  }
  this.fontMets.distanceRange = this.fontMetrics.atlas.distanceRange;
  this.fontMets.size = this.fontMetrics.atlas.size;
  let scaleW = this.fontMetrics.atlas.width;
  let scaleH = this.fontMetrics.atlas.height;
  for (let i = 0; i < this.fontMetrics.glyphs.length; i++) {
    let glyph = this.fontMetrics.glyphs[i];
    let id = glyph.unicode;
    this.fontMets[id].xadv = glyph.advance;
    if (glyph.planeBounds === undefined) continue;
    let l = glyph.atlasBounds.left / scaleW;
    let b = (scaleH - glyph.atlasBounds.top) / scaleH;
    let w = (glyph.atlasBounds.right - glyph.atlasBounds.left) / scaleW;
    let h = (glyph.atlasBounds.top - glyph.atlasBounds.bottom) / scaleH;
    this.fontMets[id].uv_lbwh = [l, b, w, h];
    l = glyph.planeBounds.left;
    b = glyph.planeBounds.bottom;
    w = glyph.planeBounds.right - glyph.planeBounds.left;
    h = glyph.planeBounds.top - glyph.planeBounds.bottom;
    this.fontMets[id].lbwh = [l, b, w, h];
  }
};

// not included in public docs
Niivue.prototype.loadFont = async function (
  fontSheetUrl = defaultFontPNG,
  metricsUrl = defaultFontMetrics
) {
  await this.loadFontTexture(fontSheetUrl);
  let response = await fetch(metricsUrl);
  if (!response.ok) {
    throw Error(response.statusText);
  }

  let jsonText = await response.text();
  this.fontMetrics = JSON.parse(jsonText);

  this.initFontMets();

  this.fontShader.use(this.gl);
  this.drawScene();
};

// not included in public docs
Niivue.prototype.loadDefaultMatCap = async function () {
  await this.loadMatCapTexture(defaultMatCap);
};
// not included in public docs
Niivue.prototype.loadDefaultFont = async function () {
  await this.loadFontTexture(this.DEFAULT_FONT_GLYPH_SHEET);
  this.fontMetrics = this.DEFAULT_FONT_METRICS;
  this.initFontMets();
};

// not included in public docs
Niivue.prototype.initText = async function () {
  // font shader
  //multi-channel signed distance font https://github.com/Chlumsky/msdfgen
  this.fontShader = new Shader(this.gl, vertFontShader, fragFontShader);
  this.fontShader.use(this.gl);
  this.fontShader.screenPxRangeLoc = this.fontShader.uniforms["screenPxRange"];
  this.fontShader.fontColorLoc = this.fontShader.uniforms["fontColor"];
  this.fontShader.canvasWidthHeightLoc =
    this.fontShader.uniforms["canvasWidthHeight"];
  this.fontShader.leftTopWidthHeightLoc =
    this.fontShader.uniforms["leftTopWidthHeight"];
  this.fontShader.uvLeftTopWidthHeightLoc =
    this.fontShader.uniforms["uvLeftTopWidthHeight"];

  await this.loadDefaultFont();
  await this.loadDefaultMatCap();
  this.drawLoadingText(this.loadingText);
}; // initText()

// not included in public docs
Niivue.prototype.meshShaderNameToNumber = function (meshShaderName = "Phong") {
  let name = meshShaderName.toLowerCase();
  for (var i = 0; i < this.meshShaders.length; i++) {
    if (this.meshShaders[i].Name.toLowerCase() === name) return i;
  }
  i = -1;
};

/**
 * select new shader for triangulated meshes and connectomes. Note that this function requires the mesh is fully loaded: you may want use `await` with loadMeshes (as seen in live demo).
 * @param {number} id id of mesh to change
 * @param {string | number} [2] meshShaderNameOrNumber identify shader for usage
 * @example niivue.setMeshShader('toon');
 * @see {@link https://niivue.github.io/niivue/features/meshes.html|live demo usage}
 */
Niivue.prototype.setMeshShader = function (id, meshShaderNameOrNumber = 2) {
  let shaderIndex = 0;
  if (typeof meshShaderNameOrNumber === "number")
    shaderIndex = meshShaderNameOrNumber;
  else {
    shaderIndex = this.meshShaderNameToNumber(meshShaderNameOrNumber);
  }
  shaderIndex = Math.min(shaderIndex, this.meshShaders.length - 1);
  shaderIndex = Math.max(shaderIndex, 0);
  let index = this.getMeshIndexByID(id);
  if (index >= this.meshes.length) {
    log.debug(
      "Unable to change shader until mesh is loaded (maybe you need async)"
    );
    return;
  }
  this.meshes[index].meshShaderIndex = shaderIndex;
  this.updateGLVolume();
  this.onMeshShaderChanged(index, shaderIndex);
};

/**
 *
 * @param {string} fragmentShaderText custom fragment shader.
 * @param {string} name title for new shader.
 * @returns {Shader} created custom mesh shader
 */
Niivue.prototype.createCustomMeshShader = function (
  fragmentShaderText,
  name = "Custom",
  vertexShaderText = ""
) {
  if (!fragmentShaderText) {
    throw "Need fragment shader";
  }

  let num = this.meshShaderNameToNumber(name);
  if (num >= 0) {
    //prior shader uses this name: delete it!
    this.gl.deleteProgram(this.meshShaders[num].shader.program);
    this.meshShaders.splice(num, 1);
  }
  let m = [];
  m.Name = name;
  m.Frag = fragmentShaderText;
  m.shader = new Shader(this.gl, vertMeshShader, m.Frag);
  m.shader.use(this.gl);
  m.shader.mvpLoc = m.shader.uniforms["mvpMtx"];
  m.shader.normLoc = m.shader.uniforms["normMtx"];
  m.shader.opacityLoc = m.shader.uniforms["opacity"];
  return m;
};

/**
 * @param {string} [""] fragmentShaderText custom fragment shader.
 * @param {string} ["Custom"] name title for new shader.
 * @returns {number} index of the new shader (for setMeshShader)
 * @see {@link https://niivue.github.io/niivue/features/mesh.atlas.html|live demo usage}
 */
Niivue.prototype.setCustomMeshShader = function (
  fragmentShaderText = "",
  name = "Custom"
) {
  let m = this.createCustomMeshShader(fragmentShaderText, name);
  this.meshShaders.push(m);

  this.onCustomMeshShaderAdded(fragmentShaderText, name);
  return this.meshShaders.length - 1;
};

/**
 * retrieve all currently loaded meshes
 * @param {boolean} sort output alphabetically
 * @returns {Array} list of available mesh shader names
 * @example niivue.meshShaderNames();
 * @see {@link https://niivue.github.io/niivue/features/meshes.html|live demo usage}
 */
Niivue.prototype.meshShaderNames = function (sort = true) {
  let cm = [];
  for (var i = 0; i < this.meshShaders.length; i++)
    cm.push(this.meshShaders[i].Name);
  return sort === true ? cm.sort() : cm;
};

// not included in public docs
Niivue.prototype.initRenderShader = async function (
  shader,
  gradientAmount = 0.0
) {
  shader.use(this.gl);
  shader.drawOpacityLoc = shader.uniforms["drawOpacity"];
  shader.backgroundMasksOverlaysLoc =
    shader.uniforms["backgroundMasksOverlays"];
  this.gl.uniform1i(shader.uniforms["volume"], 0);
  this.gl.uniform1i(shader.uniforms["colormap"], 1);
  this.gl.uniform1i(shader.uniforms["overlay"], 2);
  this.gl.uniform1i(shader.uniforms["drawing"], 7);
  this.gl.uniform1f(
    shader.uniforms["renderDrawAmbientOcclusion"],
    this.renderDrawAmbientOcclusion
  );
  shader.mvpLoc = shader.uniforms["mvpMtx"];
  shader.clipPlaneClrLoc = shader.uniforms["clipPlaneColor"];
  shader.mvpMatRASLoc = shader.uniforms["matRAS"];
  shader.rayDirLoc = shader.uniforms["rayDir"];
  shader.clipPlaneLoc = shader.uniforms["clipPlane"];
  this.gl.uniform1f(shader.uniforms["gradientAmount"], gradientAmount);
};

// not included in public docs
Niivue.prototype.init = async function () {
  //initial setup: only at the startup of the component
  // print debug info (gpu vendor and renderer)
  let rendererInfo = this.gl.getExtension("WEBGL_debug_renderer_info");
  if (rendererInfo) {
    let vendor = this.gl.getParameter(rendererInfo.UNMASKED_VENDOR_WEBGL);
    let renderer = this.gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL);
    log.info("renderer vendor: ", vendor);
    log.info("renderer: ", renderer);
  } else {
    log.info("debug_renderer_info unavailable");
  }
  //firefox masks vendor and renderer for privacy
  let glInfo = this.gl.getParameter(this.gl.RENDERER);
  log.info("firefox renderer: ", glInfo); //Useful with firefox "Intel(R) HD Graphics" useless in Chrome and Safari "WebKit WebGL"
  this.gl.clearDepth(0.0);
  this.gl.enable(this.gl.CULL_FACE);
  this.gl.cullFace(this.gl.FRONT);
  this.gl.enable(this.gl.BLEND);
  this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

  // register volume and overlay textures
  this.volumeTexture = this.rgbaTex(
    this.volumeTexture,
    this.gl.TEXTURE0,
    [2, 2, 2, 2],
    true
  );
  this.overlayTexture = this.rgbaTex(
    this.overlayTexture,
    this.gl.TEXTURE2,
    [2, 2, 2, 2],
    true
  );
  this.drawTexture = this.r8Tex(
    this.drawTexture,
    this.gl.TEXTURE7,
    [2, 2, 2, 2],
    true
  );

  let rectStrip = [
    1,
    1,
    0, //RAI
    1,
    0,
    0, //RPI
    0,
    1,
    0, //LAI
    0,
    0,
    0, //LPI
  ];

  this.cuboidVertexBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cuboidVertexBuffer);
  this.gl.bufferData(
    this.gl.ARRAY_BUFFER,
    new Float32Array(rectStrip),
    this.gl.STATIC_DRAW
  );

  //setup generic VAO style sheet:
  this.genericVAO = this.gl.createVertexArray(); //2D slices, fonts, lines
  this.gl.bindVertexArray(this.genericVAO);
  //this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cuboidVertexBuffer); //triangle strip does not need indices
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cuboidVertexBuffer);
  this.gl.enableVertexAttribArray(0);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
  this.gl.bindVertexArray(this.unusedVAO); //switch off to avoid tampering with settings
  this.pickingMeshShader = new Shader(
    this.gl,
    vertMeshShader,
    fragMeshDepthShader
  );
  this.pickingMeshShader.use(this.gl);
  this.pickingMeshShader.mvpLoc = this.pickingMeshShader.uniforms["mvpMtx"];
  this.pickingImageShader = new Shader(
    this.gl,
    vertRenderShader,
    fragVolumePickingShader
  );
  this.pickingImageShader.use(this.gl);
  this.pickingImageShader.drawOpacityLoc =
    this.pickingImageShader.uniforms["drawOpacity"];
  this.pickingImageShader.backgroundMasksOverlaysLoc =
    this.pickingImageShader.uniforms["backgroundMasksOverlays"];
  this.pickingImageShader.mvpLoc = this.pickingImageShader.uniforms["mvpMtx"];
  this.gl.uniform1i(this.pickingImageShader.uniforms["volume"], 0);
  this.gl.uniform1i(this.pickingImageShader.uniforms["colormap"], 1);
  this.gl.uniform1i(this.pickingImageShader.uniforms["overlay"], 2);
  this.gl.uniform1i(this.pickingImageShader.uniforms["drawing"], 7);
  this.pickingImageShader.mvpLoc = this.pickingImageShader.uniforms["mvpMtx"];
  this.pickingImageShader.rayDirLoc =
    this.pickingImageShader.uniforms["rayDir"];
  this.pickingImageShader.clipPlaneLoc =
    this.pickingImageShader.uniforms["clipPlane"];
  // slice shader
  // slice mm shader
  this.sliceMMShader = new Shader(
    this.gl,
    vertSliceMMShader,
    fragSliceMMShader
  );
  this.sliceMMShader.use(this.gl);
  this.sliceMMShader.drawOpacityLoc =
    this.sliceMMShader.uniforms["drawOpacity"];
  this.sliceMMShader.isAlphaClipDarkLoc =
    this.sliceMMShader.uniforms["isAlphaClipDark"];
  this.sliceMMShader.overlayOutlineWidthLoc =
    this.sliceMMShader.uniforms["overlayOutlineWidth"];
  this.sliceMMShader.overlayAlphaShaderLoc =
    this.sliceMMShader.uniforms["overlayAlphaShader"];
  this.sliceMMShader.backgroundMasksOverlaysLoc =
    this.sliceMMShader.uniforms["backgroundMasksOverlays"];
  this.sliceMMShader.opacityLoc = this.sliceMMShader.uniforms["opacity"];
  this.sliceMMShader.axCorSagLoc = this.sliceMMShader.uniforms["axCorSag"];
  this.sliceMMShader.sliceLoc = this.sliceMMShader.uniforms["slice"];
  this.sliceMMShader.frac2mmLoc = this.sliceMMShader.uniforms["frac2mm"];
  this.sliceMMShader.mvpLoc = this.sliceMMShader.uniforms["mvpMtx"];
  this.gl.uniform1i(this.sliceMMShader.uniforms["volume"], 0);
  this.gl.uniform1i(this.sliceMMShader.uniforms["colormap"], 1);
  this.gl.uniform1i(this.sliceMMShader.uniforms["overlay"], 2);
  this.gl.uniform1i(this.sliceMMShader.uniforms["drawing"], 7);
  this.gl.uniform1f(
    this.sliceMMShader.uniforms["drawOpacity"],
    this.drawOpacity
  );
  //orient cube
  this.orientCubeShader = new Shader(
    this.gl,
    vertOrientCubeShader,
    fragOrientCubeShader
  );
  let gl = this.gl;
  this.orientCubeShaderVAO = gl.createVertexArray();
  gl.bindVertexArray(this.orientCubeShaderVAO);
  let program = this.orientCubeShader.program;
  this.orientCubeMtxLoc = gl.getUniformLocation(program, "u_matrix");
  // Create a buffer
  var positionBuffer = gl.createBuffer();
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, orientCube, gl.STATIC_DRAW);
  //XYZ position: (three floats)
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  //RGB color: (also three floats)
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  gl.bindVertexArray(this.unusedVAO);
  // rect shader (crosshair): horizontal and vertical lines only
  this.rectShader = new Shader(this.gl, vertRectShader, fragRectShader);
  this.rectShader.use(this.gl);
  this.rectShader.lineColorLoc = this.rectShader.uniforms["lineColor"];
  this.rectShader.canvasWidthHeightLoc =
    this.rectShader.uniforms["canvasWidthHeight"];
  this.rectShader.leftTopWidthHeightLoc =
    this.rectShader.uniforms["leftTopWidthHeight"];
  // line shader: diagonal lines
  this.lineShader = new Shader(this.gl, vertLineShader, fragRectShader);
  this.lineShader.use(this.gl);
  this.lineShader.lineColorLoc = this.lineShader.uniforms["lineColor"];
  this.lineShader.canvasWidthHeightLoc =
    this.lineShader.uniforms["canvasWidthHeight"];
  this.lineShader.thicknessLoc = this.lineShader.uniforms["thickness"];
  this.lineShader.startXYendXYLoc = this.lineShader.uniforms["startXYendXY"];
  // render shader (3D)
  this.renderVolumeShader = new Shader(
    this.gl,
    vertRenderShader,
    fragRenderShader
  );
  this.initRenderShader(this.renderVolumeShader);
  this.renderGradientShader = new Shader(
    this.gl,
    vertRenderShader,
    fragRenderGradientShader
  );
  this.initRenderShader(this.renderGradientShader, 0.3);
  this.gl.uniform1i(this.renderGradientShader.uniforms["matCap"], 5);
  this.gl.uniform1i(this.renderGradientShader.uniforms["gradient"], 6);
  this.renderGradientShader.normLoc =
    this.renderGradientShader.uniforms["normMtx"];
  this.renderShader = this.renderVolumeShader;
  // colorbar shader
  this.colorbarShader = new Shader(
    this.gl,
    vertColorbarShader,
    fragColorbarShader
  );
  this.colorbarShader.use(this.gl);
  this.colorbarShader.layerLoc = this.colorbarShader.uniforms["layer"];
  this.colorbarShader.canvasWidthHeightLoc =
    this.colorbarShader.uniforms["canvasWidthHeight"];
  this.colorbarShader.leftTopWidthHeightLoc =
    this.colorbarShader.uniforms["leftTopWidthHeight"];
  this.gl.uniform1i(this.colorbarShader.uniforms["colormap"], 1);
  this.blurShader = new Shader(this.gl, blurVertShader, blurFragShader);
  this.sobelShader = new Shader(this.gl, blurVertShader, sobelFragShader);

  this.growCutShader = new Shader(
    this.gl,
    vertGrowCutShader,
    fragGrowCutShader
  );

  // pass through shaders
  this.passThroughShader = new Shader(
    this.gl,
    vertPassThroughShader,
    fragPassThroughShader
  );

  // orientation shaders
  this.orientShaderAtlasU = new Shader(
    this.gl,
    vertOrientShader,
    fragOrientShaderU.concat(fragOrientShaderAtlas)
  );
  this.orientShaderAtlasI = new Shader(
    this.gl,
    vertOrientShader,
    fragOrientShaderI.concat(fragOrientShaderAtlas)
  );

  this.orientShaderU = new Shader(
    this.gl,
    vertOrientShader,
    fragOrientShaderU.concat(fragOrientShader)
  );
  this.orientShaderI = new Shader(
    this.gl,
    vertOrientShader,
    fragOrientShaderI.concat(fragOrientShader)
  );
  this.orientShaderF = new Shader(
    this.gl,
    vertOrientShader,
    fragOrientShaderF.concat(fragOrientShader)
  );
  this.orientShaderRGBU = new Shader(
    this.gl,
    vertOrientShader,
    fragOrientShaderU.concat(fragRGBOrientShader)
  );
  // 3D crosshair cylinder
  this.surfaceShader = new Shader(
    this.gl,
    vertSurfaceShader,
    fragSurfaceShader
  );
  this.surfaceShader.use(this.gl);
  this.surfaceShader.mvpLoc = this.surfaceShader.uniforms["mvpMtx"];
  this.surfaceShader.colorLoc = this.surfaceShader.uniforms["surfaceColor"];
  // tractography fibers
  this.fiberShader = new Shader(this.gl, vertFiberShader, fragFiberShader);
  this.pickingImageShader.use(this.gl);
  this.fiberShader.mvpLoc = this.fiberShader.uniforms["mvpMtx"];
  //compile all mesh shaders
  //compile all mesh shaders
  for (var i = 0; i < this.meshShaders.length; i++) {
    let m = this.meshShaders[i];
    if (m.Name === "Flat")
      m.shader = new Shader(this.gl, vertFlatMeshShader, fragFlatMeshShader);
    else m.shader = new Shader(this.gl, vertMeshShader, m.Frag);
    m.shader.use(this.gl);
    m.shader.mvpLoc = m.shader.uniforms["mvpMtx"];
    m.shader.normLoc = m.shader.uniforms["normMtx"];
    m.shader.opacityLoc = m.shader.uniforms["opacity"];
    m.shader.isMatcap = m.Name === "Matcap";
    if (m.shader.isMatcap) this.gl.uniform1i(m.shader.uniforms["matCap"], 5);
  }
  this.bmpShader = new Shader(this.gl, vertBmpShader, fragBmpShader);
  await this.initText();
  if (this.opts.thumbnail.length > 0) {
    await this.loadBmpTexture(this.opts.thumbnail);
    this.thumbnailVisible = true;
  }
  this.updateGLVolume();
  this.initialized = true;
  this.resizeListener();
  this.drawScene();
  return this;
}; // init()

Niivue.prototype.gradientGL = function (hdr) {
  let gl = this.gl;
  var faceStrip = [0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0];
  var vao2 = gl.createVertexArray();
  gl.bindVertexArray(vao2);
  var vbo2 = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo2);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(faceStrip), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  var fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.disable(gl.CULL_FACE);
  gl.viewport(0, 0, hdr.dims[1], hdr.dims[2]);
  gl.disable(gl.BLEND);
  let tempTex3D = this.rgbaTex(null, this.gl.TEXTURE5, hdr.dims);
  //tempTex3D = this.bindBlankGL(hdr);
  let blurShader = this.blurShader;
  blurShader.use(gl);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, this.volumeTexture);

  gl.uniform1i(blurShader.uniforms["intensityVol"], 0);
  gl.uniform1f(blurShader.uniforms["dX"], 0.7 / hdr.dims[1]);
  gl.uniform1f(blurShader.uniforms["dY"], 0.7 / hdr.dims[2]);
  gl.uniform1f(blurShader.uniforms["dZ"], 0.7 / hdr.dims[3]);
  gl.bindVertexArray(vao2);
  for (let i = 0; i < hdr.dims[3] - 1; i++) {
    var coordZ = (1 / hdr.dims[3]) * (i + 0.5);
    gl.uniform1f(blurShader.uniforms["coordZ"], coordZ);
    gl.framebufferTextureLayer(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      tempTex3D,
      0,
      i
    );
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, faceStrip.length / 3);
  }
  let sobelShader = this.sobelShader;
  sobelShader.use(gl);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_3D, tempTex3D); //input texture
  gl.uniform1i(sobelShader.uniforms["intensityVol"], 1);
  gl.uniform1f(sobelShader.uniforms["dX"], 0.7 / hdr.dims[1]);
  gl.uniform1f(sobelShader.uniforms["dY"], 0.7 / hdr.dims[2]);
  gl.uniform1f(sobelShader.uniforms["dZ"], 0.7 / hdr.dims[3]);
  gl.uniform1f(sobelShader.uniforms["coordZ"], 0.5);
  gl.bindVertexArray(vao2);
  gl.activeTexture(gl.TEXTURE0);
  if (this.gradientTexture !== null) gl.deleteTexture(this.gradientTexture);
  this.gradientTexture = this.rgbaTex(
    this.gradientTexture,
    this.gl.TEXTURE6,
    hdr.dims
  );
  for (let i = 0; i < hdr.dims[3] - 1; i++) {
    var coordZ = (1 / hdr.dims[3]) * (i + 0.5);
    gl.uniform1f(sobelShader.uniforms["coordZ"], coordZ);
    //console.log(coordZ);
    gl.framebufferTextureLayer(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      this.gradientTexture,
      0,
      i
    );
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, faceStrip.length / 3);
  }
  gl.deleteFramebuffer(fb);
  gl.deleteTexture(tempTex3D);
  gl.deleteBuffer(vbo2);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return;
}; // gradientGL()
/**
 * update the webGL 2.0 scene after making changes to the array of volumes. It's always good to call this method after altering one or more volumes manually (outside of Niivue setter methods)
 * @example
 * niivue = new Niivue()
 * niivue.updateGLVolume()
 */

Niivue.prototype.updateGLVolume = function () {
  //load volume or change contrast
  let visibleLayers = 0;
  let numLayers = this.volumes.length;
  // loop through loading volumes in this.volume
  this.refreshColormaps();
  for (let i = 0; i < numLayers; i++) {
    // avoid trying to refresh a volume that isn't ready
    if (!this.volumes[i].toRAS) {
      continue;
    }
    this.refreshLayers(this.volumes[i], visibleLayers, numLayers);
    visibleLayers++;
  }
  this.furthestVertexFromOrigin = 0.0;
  if (numLayers > 0)
    this.furthestVertexFromOrigin =
      this.volumeObject3D.furthestVertexFromOrigin;
  if (this.meshes)
    for (let i = 0; i < this.meshes.length; i++)
      this.furthestVertexFromOrigin = Math.max(
        this.furthestVertexFromOrigin,
        this.meshes[i].furthestVertexFromOrigin
      );

  if (this.onVolumeUpdated) {
    this.onVolumeUpdated();
  }
  this.drawScene();
}; // updateVolume()

/**
 * basic statistics for selected voxel-based image
 * @param {number} layer selects image to describe
 * @param {Array} masks are optional binary images to filter voxles
 * @returns {Array} numeric values to describe image
 * @example niivue.getDescriptives(0);
 * @see {@link https://niivue.github.io/niivue/features/draw2.html|live demo usage}
 */
Niivue.prototype.getDescriptives = function (
  layer = 0,
  masks = [],
  drawingIsMask = false
) {
  let hdr = this.volumes[layer].hdr;
  let slope = hdr.scl_slope;
  if (isNaN(slope)) slope = 1;
  let inter = hdr.scl_inter;
  if (isNaN(inter)) inter = 1;
  let imgRaw = this.volumes[layer].img;
  let nv = imgRaw.length; //number of voxels
  //create mask
  let img = new Float32Array(nv);
  for (var i = 0; i < nv; i++) img[i] = imgRaw[i] * slope + inter; //assume all voxels survive
  let mask = new Uint8Array(nv);
  for (var i = 0; i < nv; i++) mask[i] = 1; //assume all voxels survive
  if (masks.length > 0) {
    for (var m = 0; m < masks.length; m++) {
      let imgMask = this.volumes[masks[m]].img;
      if (imgMask.length !== nv) {
        log.debug(
          "Mask resolution does not match image. Skipping masking layer " +
            masks[m]
        );
        continue;
      }
      for (var i = 0; i < nv; i++) {
        if (imgMask[i] === 0 || isNaN(imgMask[i])) mask[i] = 0;
      } //for each voxel in mask
    } //for each mask
  } else if (masks.length < 1 && drawingIsMask) {
    for (let i = 0; i < nv; i++) {
      if (this.drawBitmap[i] === 0 || isNaN(this.drawBitmap[i])) mask[i] = 0;
    } //for each voxel in mask
  } //if masks
  //Welfords method
  //https://www.embeddedrelated.com/showarticle/785.php
  //https://www.johndcook.com/blog/2008/09/26/comparing-three-methods-of-computing-standard-deviation/
  let k = 0;
  let M = 0;
  let S = 0;
  let mx = Number.NEGATIVE_INFINITY;
  let mn = Number.POSITIVE_INFINITY;
  let kNot0 = 0;
  let MNot0 = 0;
  let SNot0 = 0;

  for (var i = 0; i < nv; i++) {
    if (mask[i] < 1) continue;
    let x = img[i];
    k++;
    let Mnext = M + (x - M) / k;
    S = S + (x - M) * (x - Mnext);
    M = Mnext;
    if (x === 0) continue;
    kNot0++;
    Mnext = MNot0 + (x - MNot0) / kNot0;
    SNot0 = SNot0 + (x - MNot0) * (x - Mnext);
    MNot0 = Mnext;

    mn = Math.min(x, mx);
    mx = Math.max(x, mx);
  }
  let stdev = Math.sqrt(S / (k - 1));
  let stdevNot0 = Math.sqrt(SNot0 / (kNot0 - 1));
  let mnNot0 = mn;
  let mxNot0 = mx;
  if (k !== kNot0) {
    //some voxels are equal to zero
    mn = Math.min(0, mx);
    mx = Math.max(0, mx);
  }

  return {
    mean: M,
    stdev: stdev,
    nvox: k,
    volumeMM3: k * hdr.pixDims[1] * hdr.pixDims[2] * hdr.pixDims[3],
    // volume also in milliliters
    volumeML: k * hdr.pixDims[1] * hdr.pixDims[2] * hdr.pixDims[3] * 0.001,
    min: mn,
    max: mx,
    meanNot0: MNot0,
    stdevNot0: stdevNot0,
    nvoxNot0: kNot0,
    minNot0: mnNot0,
    maxNot0: mxNot0,
    cal_min: this.volumes[layer].cal_min,
    cal_max: this.volumes[layer].cal_max,
    robust_min: this.volumes[layer].robust_min,
    robust_max: this.volumes[layer].robust_max,
  };
};

// not included in public docs
// apply slow computations when image properties have changed
Niivue.prototype.refreshLayers = function (overlayItem, layer) {
  this.refreshColormaps();
  if (this.volumes.length < 1) return; //e.g. only meshes
  let hdr = overlayItem.hdr;
  let img = overlayItem.img;
  if (overlayItem.frame4D > 0 && overlayItem.frame4D < overlayItem.nFrame4D)
    img = overlayItem.img.slice(
      overlayItem.frame4D * overlayItem.nVox3D,
      (overlayItem.frame4D + 1) * overlayItem.nVox3D
    );
  let opacity = overlayItem.opacity;
  if (layer > 1 && opacity === 0) return; //skip completely transparent layers
  let outTexture = null;
  this.gl.bindVertexArray(this.unusedVAO);
  if (this.crosshairs3D !== null) this.crosshairs3D.mm[0] = NaN; //force crosshairs3D redraw
  let mtx = mat.mat4.clone(overlayItem.toRAS);
  if (layer === 0) {
    this.volumeObject3D = overlayItem.toNiivueObject3D(this.VOLUME_ID, this.gl);
    mat.mat4.invert(mtx, mtx);
    //log.debug(`mtx layer ${layer}`, mtx);
    this.back.matRAS = overlayItem.matRAS;
    this.back.dims = overlayItem.dimsRAS;
    this.back.pixDims = overlayItem.pixDimsRAS;
    outTexture = this.rgbaTex(
      this.volumeTexture,
      this.gl.TEXTURE0,
      overlayItem.dimsRAS
    ); //this.back.dims)

    let { volScale, vox } = this.sliceScale(true); // slice scale determined by this.back --> the base image layer

    this.volScale = volScale;
    this.vox = vox;
    this.volumeObject3D.scale = volScale;
    this.renderShader.use(this.gl);
    this.gl.uniform3fv(this.renderShader.uniforms["texVox"], vox);
    this.gl.uniform3fv(this.renderShader.uniforms["volScale"], volScale);
    // add shader to object
    let pickingShader = this.pickingImageShader;
    pickingShader.use(this.gl);
    this.gl.uniform1i(pickingShader.uniforms["volume"], 0);
    this.gl.uniform1i(pickingShader.uniforms["colormap"], 1);
    this.gl.uniform1i(pickingShader.uniforms["overlay"], 2);
    this.gl.uniform3fv(pickingShader.uniforms["volScale"], volScale);
    log.debug(this.volumeObject3D);
  } else {
    if (this.back.dims === undefined)
      log.error(
        "Fatal error: Unable to render overlay: background dimensions not defined!"
      );
    let f000 = this.mm2frac(overlayItem.mm000, 0, true); //origin in output space
    let f100 = this.mm2frac(overlayItem.mm100, 0, true);
    let f010 = this.mm2frac(overlayItem.mm010, 0, true);
    let f001 = this.mm2frac(overlayItem.mm001, 0, true);
    f100 = mat.vec3.subtract(f100, f100, f000); // direction of i dimension from origin
    f010 = mat.vec3.subtract(f010, f010, f000); // direction of j dimension from origin
    f001 = mat.vec3.subtract(f001, f001, f000); // direction of k dimension from origin
    mtx = mat.mat4.fromValues(
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
    );
    mat.mat4.invert(mtx, mtx);
    if (layer === 1) {
      outTexture = this.rgbaTex(
        this.overlayTexture,
        this.gl.TEXTURE2,
        this.back.dims
      );
      this.overlayTexture = outTexture;
      this.overlayTextureID = outTexture;
    } else outTexture = this.overlayTextureID;
  }
  let fb = this.gl.createFramebuffer();
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
  this.gl.disable(this.gl.CULL_FACE);
  this.gl.viewport(0, 0, this.back.dims[1], this.back.dims[2]); //output in background dimensions
  this.gl.disable(this.gl.BLEND);
  let tempTex3D = this.gl.createTexture();
  this.gl.activeTexture(this.gl.TEXTURE6); //Temporary 3D Texture
  this.gl.bindTexture(this.gl.TEXTURE_3D, tempTex3D);
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_MIN_FILTER,
    this.gl.NEAREST
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_MAG_FILTER,
    this.gl.NEAREST
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_R,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_S,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_3D,
    this.gl.TEXTURE_WRAP_T,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
  //https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html
  //https://www.khronos.org/registry/OpenGL-Refpages/es3.0/html/glTexStorage3D.xhtml
  let orientShader = this.orientShaderU;
  if (hdr.datatypeCode === 2) {
    // raw input data
    if (hdr.intent_code === 1002) orientShader = this.orientShaderAtlasU;
    this.gl.texStorage3D(
      this.gl.TEXTURE_3D,
      1,
      this.gl.R8UI,
      hdr.dims[1],
      hdr.dims[2],
      hdr.dims[3]
    );
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
    );
  } else if (hdr.datatypeCode === 4) {
    orientShader = this.orientShaderI;
    if (hdr.intent_code === 1002) orientShader = this.orientShaderAtlasI;
    this.gl.texStorage3D(
      this.gl.TEXTURE_3D,
      1,
      this.gl.R16I,
      hdr.dims[1],
      hdr.dims[2],
      hdr.dims[3]
    );
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
    );
  } else if (hdr.datatypeCode === 16) {
    this.gl.texStorage3D(
      this.gl.TEXTURE_3D,
      1,
      this.gl.R32F,
      hdr.dims[1],
      hdr.dims[2],
      hdr.dims[3]
    );
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
    );
    orientShader = this.orientShaderF;
  } else if (hdr.datatypeCode === 64) {
    let img32f = new Float32Array();
    img32f = Float32Array.from(img);
    this.gl.texStorage3D(
      this.gl.TEXTURE_3D,
      1,
      this.gl.R32F,
      hdr.dims[1],
      hdr.dims[2],
      hdr.dims[3]
    );
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
    );
    orientShader = this.orientShaderF;
  } else if (hdr.datatypeCode === 128) {
    orientShader = this.orientShaderRGBU;
    orientShader.use(this.gl);
    this.gl.uniform1i(orientShader.uniforms["hasAlpha"], false);
    this.gl.texStorage3D(
      this.gl.TEXTURE_3D,
      1,
      this.gl.RGB8UI,
      hdr.dims[1],
      hdr.dims[2],
      hdr.dims[3]
    );
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
    );
  } else if (hdr.datatypeCode === 512) {
    if (hdr.intent_code === 1002) orientShader = this.orientShaderAtlasU;
    this.gl.texStorage3D(
      this.gl.TEXTURE_3D,
      1,
      this.gl.R16UI,
      hdr.dims[1],
      hdr.dims[2],
      hdr.dims[3]
    );
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
    );
  } else if (hdr.datatypeCode === 2304) {
    orientShader = this.orientShaderRGBU;
    orientShader.use(this.gl);
    this.gl.uniform1i(orientShader.uniforms["hasAlpha"], true);
    this.gl.texStorage3D(
      this.gl.TEXTURE_3D,
      1,
      this.gl.RGBA8UI,
      hdr.dims[1],
      hdr.dims[2],
      hdr.dims[3]
    );
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
    );
  }
  if (overlayItem.global_min === undefined) {
    //only once, first time volume is loaded
    // this.calMinMax(overlayItem, imgRaw);
    overlayItem.calMinMax();
  }
  //blend texture
  let blendTexture = null;
  this.gl.bindVertexArray(this.genericVAO);

  let isUseCopyTexSubImage3D = false;
  if (isUseCopyTexSubImage3D) {
    //console.log("Using copyTexSubImage3D (issue 501)");
    if (layer > 1) {
      //we can not simultaneously read and write to the same texture.
      //therefore, we must clone the overlay texture when we wish to add another layer
      //copy previous overlay texture to blend texture
      blendTexture = this.rgbaTex(
        blendTexture,
        this.gl.TEXTURE5,
        this.back.dims,
        true
      );
      this.gl.bindTexture(this.gl.TEXTURE_3D, blendTexture);
      for (let i = 0; i < this.back.dims[3]; i++) {
        //n.b. copyTexSubImage3D is a screenshot function: it copies FROM the framebuffer to the TEXTURE (usually we write to a framebuffer)
        this.gl.framebufferTextureLayer(
          this.gl.FRAMEBUFFER,
          this.gl.COLOR_ATTACHMENT0,
          this.overlayTexture,
          0,
          i
        ); //read from existing overlay texture 2
        this.gl.activeTexture(this.gl.TEXTURE5); //write to blend texture 5
        this.gl.copyTexSubImage3D(
          this.gl.TEXTURE_3D,
          0,
          0,
          0,
          i,
          0,
          0,
          this.back.dims[1],
          this.back.dims[2]
        );
      }
    } else
      blendTexture = this.rgbaTex(
        blendTexture,
        this.gl.TEXTURE5,
        [2, 2, 2, 2],
        true
      );
  } else {
    //console.log("Using pass through shader (issue 501)");
    if (layer > 1) {
      //use pass-through shader to copy previous color to temporary 2D texture
      blendTexture = this.rgbaTex(
        blendTexture,
        this.gl.TEXTURE5,
        this.back.dims
      );
      this.gl.bindTexture(this.gl.TEXTURE_3D, blendTexture);
      let passShader = this.passThroughShader;
      passShader.use(this.gl);
      this.gl.uniform1i(passShader.uniforms["in3D"], 2); //overlay volume
      for (let i = 0; i < this.back.dims[3]; i++) {
        //output slices
        let coordZ = (1 / this.back.dims[3]) * (i + 0.5);
        this.gl.uniform1f(passShader.uniforms["coordZ"], coordZ);
        this.gl.framebufferTextureLayer(
          this.gl.FRAMEBUFFER,
          this.gl.COLOR_ATTACHMENT0,
          blendTexture,
          0,
          i
        );
        //this.gl.clear(this.gl.DEPTH_BUFFER_BIT); //exhaustive, so not required
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
      }
    } else
      blendTexture = this.rgbaTex(blendTexture, this.gl.TEXTURE5, [2, 2, 2, 2]);
  }
  orientShader.use(this.gl);
  this.gl.activeTexture(this.gl.TEXTURE1);
  //for label maps, we create an indexed colormap that is not limited to a gradient of 256 colors
  let colormapLabelTexture = null;
  if (
    overlayItem.colormapLabel.hasOwnProperty("lut") &&
    overlayItem.colormapLabel.lut.length > 7
  ) {
    let nLabel =
      overlayItem.colormapLabel.max - overlayItem.colormapLabel.min + 1;
    colormapLabelTexture = this.createColormapTexture(
      colormapLabelTexture,
      1,
      nLabel
    );
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
    );
    this.gl.uniform1f(
      orientShader.uniforms["cal_min"],
      overlayItem.colormapLabel.min - 0.5
    );
    this.gl.uniform1f(
      orientShader.uniforms["cal_max"],
      overlayItem.colormapLabel.max + 0.5
    );
    //this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
    this.gl.bindTexture(this.gl.TEXTURE_2D, colormapLabelTexture);
  } else {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
    this.gl.uniform1f(orientShader.uniforms["cal_min"], overlayItem.cal_min);
    this.gl.uniform1f(orientShader.uniforms["cal_max"], overlayItem.cal_max);
  }
  this.gl.uniform1i(
    orientShader.uniforms["isAlphaThreshold"],
    overlayItem.alphaThreshold
  );
  //if unused colormapNegative https://github.com/niivue/niivue/issues/490
  let mnNeg = Number.POSITIVE_INFINITY;
  let mxNeg = Number.NEGATIVE_INFINITY;
  if (overlayItem.colormapNegative.length > 0) {
    //assume symmetrical
    mnNeg = Math.min(-overlayItem.cal_min, -overlayItem.cal_max);
    mxNeg = Math.max(-overlayItem.cal_min, -overlayItem.cal_max);
    if (isFinite(overlayItem.cal_minNeg) && isFinite(overlayItem.cal_maxNeg)) {
      //explicit range for negative colormap: allows asymmetric maps
      mnNeg = Math.min(overlayItem.cal_minNeg, overlayItem.cal_maxNeg);
      mxNeg = Math.max(overlayItem.cal_minNeg, overlayItem.cal_maxNeg);
    }
  }
  this.gl.uniform1f(orientShader.uniforms["layer"], layer);
  this.gl.uniform1f(orientShader.uniforms["cal_minNeg"], mnNeg);
  this.gl.uniform1f(orientShader.uniforms["cal_maxNeg"], mxNeg);
  this.gl.bindTexture(this.gl.TEXTURE_3D, tempTex3D);
  this.gl.uniform1i(orientShader.uniforms["intensityVol"], 6);
  this.gl.uniform1i(orientShader.uniforms["blend3D"], 5);
  this.gl.uniform1i(orientShader.uniforms["colormap"], 1);
  //this.gl.uniform1f(orientShader.uniforms["numLayers"], numLayers);
  this.gl.uniform1f(orientShader.uniforms["scl_inter"], hdr.scl_inter);
  this.gl.uniform1f(orientShader.uniforms["scl_slope"], hdr.scl_slope);
  this.gl.uniform1f(orientShader.uniforms["opacity"], opacity);
  this.gl.uniform1i(orientShader.uniforms["modulationVol"], 7);
  //  this.gl.uniform1f(orientShader.uniforms["cal_min"], 2);
  //  this.gl.uniform1f(orientShader.uniforms["cal_max"], 3);

  let modulateTexture = null;
  if (
    overlayItem.modulationImage &&
    overlayItem.modulationImage >= 0 &&
    overlayItem.modulationImage < this.volumes.length
  ) {
    log.debug(this.volumes);
    let mhdr = this.volumes[overlayItem.modulationImage].hdr;
    if (
      mhdr.dims[1] === hdr.dims[1] &&
      mhdr.dims[2] === hdr.dims[2] &&
      mhdr.dims[3] === hdr.dims[3]
    ) {
      if (overlayItem.modulateAlpha) {
        this.gl.uniform1i(orientShader.uniforms["modulation"], 2);
        this.gl.uniform1f(orientShader.uniforms["opacity"], 1.0);
      } else this.gl.uniform1i(orientShader.uniforms["modulation"], 1);
      //r8Tex(texID, activeID, dims, isInit = false)
      modulateTexture = this.r8Tex(
        modulateTexture,
        this.gl.TEXTURE7,
        hdr.dims,
        true
      );
      this.gl.activeTexture(this.gl.TEXTURE7);
      this.gl.bindTexture(this.gl.TEXTURE_3D, modulateTexture);
      let vx = hdr.dims[1] * hdr.dims[2] * hdr.dims[3];
      let modulateVolume = new Uint8Array(vx);
      let mn = this.volumes[overlayItem.modulationImage].cal_min;
      let scale =
        1.0 / (this.volumes[overlayItem.modulationImage].cal_max - mn);
      let imgRaw = this.volumes[overlayItem.modulationImage].img.buffer;
      let img = new Uint8Array(imgRaw);
      switch (mhdr.datatypeCode) {
        case overlayItem.DT_SIGNED_SHORT:
          img = new Int16Array(imgRaw);
          break;
        case overlayItem.DT_FLOAT:
          img = new Float32Array(imgRaw);
          break;
        case overlayItem.DT_DOUBLE:
          img = new Float64Array(imgRaw);
          break;
        case overlayItem.DT_RGB:
          img = new Uint8Array(imgRaw);
          break;
        case overlayItem.DT_UINT16:
          img = new Uint16Array(imgRaw);
          break;
      }
      log.debug(this.volumes[overlayItem.modulationImage]);
      let isColormapNegative =
        this.volumes[overlayItem.modulationImage].colormapNegative.length > 0;
      //negative thresholds might be asymmetric from positive ones
      let mnNeg = this.volumes[overlayItem.modulationImage].cal_min;
      let mxNeg = this.volumes[overlayItem.modulationImage].cal_max;
      if (
        isFinite(this.volumes[overlayItem.modulationImage].cal_minNeg) &&
        isFinite(this.volumes[overlayItem.modulationImage].cal_maxNeg)
      ) {
        //explicit range for negative colormap: allows asymmetric maps
        mnNeg = this.volumes[overlayItem.modulationImage].cal_minNeg;
        mxNeg = this.volumes[overlayItem.modulationImage].cal_minNeg;
      }
      mnNeg = Math.abs(mnNeg);
      mxNeg = Math.abs(mxNeg);
      if (mnNeg > mxNeg) [mnNeg, mxNeg] = [mxNeg, mnNeg];
      let scaleNeg = 1.0 / (mxNeg - mnNeg);
      let mpow = Math.abs(overlayItem.modulateAlpha); // can convert bool, too
      //volOffset selects the correct frame
      let volOffset = this.volumes[overlayItem.modulationImage].frame4D * vx;
      for (let i = 0; i < vx; i++) {
        let vRaw = img[i + volOffset] * mhdr.scl_slope + mhdr.scl_inter;
        let v = (vRaw - mn) * scale;
        if (isColormapNegative && vRaw < 0.0)
          v = (Math.abs(vRaw) - mnNeg) * scaleNeg;
        v = Math.min(Math.max(v, 0.0), 1.0);
        v = Math.pow(v, mpow) * 255.0;
        modulateVolume[i] = v;
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
      );
    } else log.debug("Modulation image dimensions do not match target");
  } else this.gl.uniform1i(orientShader.uniforms["modulation"], 0);
  this.gl.uniformMatrix4fv(orientShader.uniforms["mtx"], false, mtx);
  if (hdr.intent_code === 1002) {
    let x = 1.0 / this.back.dims[1];
    if (!this.opts.isAtlasOutline) x = -x;
    console.log("ATLAS>>>", x);
    this.gl.uniform3fv(orientShader.uniforms["xyzFrac"], [
      x,
      1.0 / this.back.dims[2],
      1.0 / this.back.dims[3],
    ]);
  }
  log.debug("back dims: ", this.back.dims);
  for (let i = 0; i < this.back.dims[3]; i++) {
    //output slices
    let coordZ = (1 / this.back.dims[3]) * (i + 0.5);
    this.gl.uniform1f(orientShader.uniforms["coordZ"], coordZ);
    this.gl.framebufferTextureLayer(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      outTexture,
      0,
      i
    );
    //this.gl.clear(this.gl.DEPTH_BUFFER_BIT); //exhaustive, so not required
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
  this.gl.bindVertexArray(this.unusedVAO);
  this.gl.deleteTexture(tempTex3D);
  this.gl.deleteTexture(modulateTexture);
  this.gl.deleteTexture(blendTexture);
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

  this.gl.deleteFramebuffer(fb);

  if (layer === 0) {
    this.volumeTexture = outTexture;
    if (this.gradientTextureAmount > 0.0) this.gradientGL(hdr, tempTex3D);
    else {
      if (this.gradientTexture !== null)
        this.gl.deleteTexture(this.gradientTexture);
      this.gradientTexture = null;
    }
  }
  // set slice scale for render shader
  this.renderShader.use(this.gl);
  let slicescl = this.sliceScale(true); // slice scale determined by this.back --> the base image layer
  let vox = slicescl.vox;
  let volScale = slicescl.volScale;
  this.gl.uniform1f(this.renderShader.uniforms["overlays"], this.overlays);
  this.gl.uniform4fv(
    this.renderShader.clipPlaneClrLoc,
    this.opts.clipPlaneColor
  );
  this.gl.uniform1f(
    this.renderShader.uniforms["backOpacity"],
    this.volumes[0].opacity
  );

  this.gl.uniform4fv(
    this.renderShader.uniforms["clipPlane"],
    this.scene.clipPlane
  );
  this.gl.uniform3fv(this.renderShader.uniforms["texVox"], vox);
  this.gl.uniform3fv(this.renderShader.uniforms["volScale"], volScale);
  this.pickingImageShader.use(this.gl);
  this.gl.uniform1f(
    this.pickingImageShader.uniforms["overlays"],
    this.overlays.length
  );
  this.gl.uniform3fv(this.pickingImageShader.uniforms["texVox"], vox);
  this.sliceMMShader.use(this.gl);
  this.gl.uniform1f(
    this.sliceMMShader.uniforms["overlays"],
    this.overlays.length
  );
  this.gl.uniform1f(
    this.sliceMMShader.uniforms["drawOpacity"],
    this.drawOpacity
  );
  if (colormapLabelTexture !== null) {
    this.gl.deleteTexture(colormapLabelTexture);
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
  }
  this.gl.uniform1i(this.sliceMMShader.uniforms["drawing"], 7);
  this.gl.activeTexture(this.gl.TEXTURE7);
  this.gl.bindTexture(this.gl.TEXTURE_3D, this.drawTexture);
  this.updateInterpolation(layer);
  //
  //this.createEmptyDrawing(); //DO NOT DO THIS ON EVERY CALL TO REFRESH LAYERS!!!!
  //this.createRandomDrawing(); //DO NOT DO THIS ON EVERY CALL TO REFRESH LAYERS!!!!
}; // refreshLayers()
/**
 * query all available color maps that can be applied to volumes
 * @param {boolean} [sort=true] whether or not to sort the returned array
 * @returns {array} an array of colormap strings
 * @example
 * niivue = new Niivue()
 * colormaps = niivue.colormaps()
 */
Niivue.prototype.colormaps = function () {
  return cmapper.colormaps();
};

/**
 * create a new colormap
 * @param {string} key name of new colormap
 * @param {object} colormap properties (Red, Green, Blue, Alpha and Indices)
 * @see {@link https://niivue.github.io/niivue/features/colormaps.html|live demo usage}
 */
Niivue.prototype.addColormap = function (key, cmap) {
  cmapper.addColormap(key, cmap);
};

/**
 * update the colormap of an image given its ID
 * @param {string} id the ID of the NVImage
 * @param {string} colormap the name of the colormap to use
 * @example
 * niivue = new Niivue()
 * niivue.setColormap(someImage.id, 'red')
 */
Niivue.prototype.setColormap = function (id, colormap) {
  let idx = this.getVolumeIndexByID(id);
  this.volumes[idx].colormap = colormap;
  this.updateGLVolume();
};

//see issue616
Niivue.prototype.setRenderDrawAmbientOcclusion = function (ao) {
  this.renderDrawAmbientOcclusion = ao;
  this.renderShader.use(this.gl);
  this.gl.uniform1f(
    this.renderShader.uniforms["renderDrawAmbientOcclusion"],
    this.renderDrawAmbientOcclusion
  );
  this.drawScene();
};

//compatibility alias for NiiVue < 0.35
Niivue.prototype.setColorMap = function (id, colormap) {
  this.setColormap(id, colormap);
};

/**
 * use given color map for negative voxels in image
 * @param {string} id the ID of the NVImage
 * @param {string} colormapNegative the name of the colormap to use
 * @example
 * niivue = new Niivue()
 * niivue.setColormapNegative(niivue.volumes[1].id,"winter");
 * @see {@link https://niivue.github.io/niivue/features/mosaics2.html|live demo usage}
 */
Niivue.prototype.setColormapNegative = function (id, colormapNegative) {
  let idx = this.getVolumeIndexByID(id);
  this.volumes[idx].colormapNegative = colormapNegative;
  this.updateGLVolume();
};

/**
 * modulate intensity of one image based on intensity of another
 * @param {string} idTarget the ID of the NVImage to be biased
 * @param {string} idModulation the ID of the NVImage that controls bias (null to disable modulation)
 * @param {boolean} [false] modulateAlpha does the modulation influence alpha transparency (true) or RGB color (false) components.
 * @example niivue.setModulationImage(niivue.volumes[0].id, niivue.volumes[1].id);
 * @see {@link https://niivue.github.io/niivue/features/modulate.html|live demo usage}
 */
Niivue.prototype.setModulationImage = function (
  idTarget,
  idModulation,
  modulateAlpha = false
) {
  //to set:
  // nv1.setModulationImage(nv1.volumes[0].id, nv1.volumes[1].id);
  //to clear:
  // nv1.setModulationImage(nv1.volumes[0].id, null);
  let idxTarget = this.getVolumeIndexByID(idTarget);
  let idxModulation = null;
  //if (idModulation)
  idxModulation = this.getVolumeIndexByID(idModulation);
  this.volumes[idxTarget].modulationImage = idxModulation;
  this.volumes[idxTarget].modulateAlpha = modulateAlpha;
  this.updateGLVolume();
};

/**
 * adjust screen gamma. Low values emphasize shadows but can appear flat, high gamma hides shadow details.
 * @param {number} gamma selects luminance, default is 1
 * @example niivue.setGamma(1.0);
 * @see {@link https://niivue.github.io/niivue/features/colormaps.html|live demo usage}
 */
Niivue.prototype.setGamma = function (gamma = 1.0) {
  cmapper.gamma = gamma;
  this.updateGLVolume();
};

/**Load all volumes for image opened with `limitFrames4D`
 * @param {string} id the ID of the 4D NVImage
 **/
Niivue.prototype.loadDeferred4DVolumes = async function (id) {
  let idx = this.getVolumeIndexByID(id);
  let volume = this.volumes[idx];
  if (volume.nTotalFrame4D <= volume.nFrame4D) return;
  //only load image data: do not change other settings like contrast
  // check if volume has the property fileObject
  let v;
  if (volume.fileObject) {
    // if it does, load the image data from the fileObject
    v = await NVImage.loadFromFile({ file: volume.fileObject });
  } else {
    v = await NVImage.loadFromUrl({ url: volume.url });
  }
  // if v is not undefined, then we have successfully loaded the image data
  if (v) {
    volume.img = v.img.slice();
    volume.nTotalFrame4D = v.nTotalFrame4D;
    volume.nFrame4D = v.nFrame4D;
    this.updateGLVolume();
  }
};

/**
 * show desired 3D volume from 4D time series
 * @param {string} id the ID of the 4D NVImage
 * @param {number} frame4D to display (indexed from zero)
 * @example nv1.setFrame4D(nv1.volumes[0].id, 42);
 * @see {@link https://niivue.github.io/niivue/features/timeseries.html|live demo usage}
 */
Niivue.prototype.setFrame4D = function (id, frame4D) {
  let idx = this.getVolumeIndexByID(id);
  let volume = this.volumes[idx];
  // don't allow indexing timepoints beyond the max number of time points.
  if (frame4D > volume.nFrame4D - 1) {
    frame4D = volume.nFrame4D - 1;
  }
  // don't allow negative timepoints
  if (frame4D < 0) {
    frame4D = 0;
  }
  if (frame4D == volume.frame4D) return; //no change
  volume.frame4D = frame4D;
  this.updateGLVolume();
  this.onFrameChange(volume, frame4D);
  this.createOnLocationChange();
};

/**
 * determine active 3D volume from 4D time series
 * @param {string} id the ID of the 4D NVImage
 * @returns {number} currently selected volume (indexed from 0)
 * @example nv1.getFrame4D(nv1.volumes[0].id);
 * @see {@link https://niivue.github.io/niivue/features/timeseries.html|live demo usage}
 */
Niivue.prototype.getFrame4D = function (id) {
  let idx = this.getVolumeIndexByID(id);
  return this.volumes[idx].nFrame4D;
};

// not included in public docs
Niivue.prototype.colormapFromKey = function (name) {
  return cmapper.colormapFromKey(name);
};

/**
 * determine active 3D volume from 4D time series
 * @param {string} id the ID of the 4D NVImage
 * @returns {number} currently selected volume (indexed from 0)
 * @example nv1.getFrame4D(nv1.volumes[0].id);
 * @see {@link https://niivue.github.io/niivue/features/colormaps.html|live demo usage}
 */
Niivue.prototype.colormap = function (lutName = "") {
  return cmapper.colormap(lutName);
}; // colormap()

//create TEXTURE1 a 2D bitmap with a nCol columns RGBA and nRow rows
//note a single volume can have two colormaps (positive and negative)
// https://github.com/niivue/niivue/blob/main/docs/development-notes/webgl.md
Niivue.prototype.createColormapTexture = function (
  texture = null,
  nRow = 0,
  nCol = 256
) {
  if (texture !== null) this.gl.deleteTexture(texture);
  if (nRow < 1 || nCol < 1) return null;
  texture = this.gl.createTexture();
  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.RGBA8, nCol, nRow);
  this.gl.texParameteri(
    this.gl.TEXTURE_2D,
    this.gl.TEXTURE_MIN_FILTER,
    this.gl.LINEAR
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_2D,
    this.gl.TEXTURE_MAG_FILTER,
    this.gl.LINEAR
  );
  //this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  //this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(
    this.gl.TEXTURE_2D,
    this.gl.TEXTURE_WRAP_R,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_2D,
    this.gl.TEXTURE_WRAP_S,
    this.gl.CLAMP_TO_EDGE
  );
  this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
  return texture;
}; // createColormapTexture()

Niivue.prototype.addColormapList = function (
  nm = "",
  mn = NaN,
  mx = NaN,
  alpha = false,
  neg = false,
  vis = true
) {
  //if (nm.length < 1) return;
  //issue583 unused colormap: e.g. a volume without a negative colormap
  if (nm.length < 1) vis = false;
  this.colormapLists.push({
    name: nm,
    min: mn,
    max: mx,
    alphaThreshold: alpha,
    negative: neg,
    visible: vis,
  });
};

function negMinMax(min, max, minNeg, maxNeg) {
  let mn = -min;
  let mx = -max;
  if (isFinite(minNeg) && isFinite(maxNeg)) {
    mn = minNeg;
    mx = maxNeg;
  }
  if (mn > mx) [mn, mx] = [mx, mn];
  return [mn, mx];
}

// not included in public docs
Niivue.prototype.refreshColormaps = function () {
  this.colormapLists = []; //one entry per colorbar: min, max, tic
  if (this.volumes.length < 1 && this.meshes.length < 1) return;
  let nVol = this.volumes.length;
  if (nVol > 0) {
    //add colorbars for volumes
    for (let i = 0; i < nVol; i++) {
      let volume = this.volumes[i];
      let neg = negMinMax(
        volume.cal_min,
        volume.cal_max,
        volume.cal_minNeg,
        volume.cal_maxNeg
      );
      //add negative colormaps BEFORE positive ones: we draw them in order from left to right
      this.addColormapList(
        volume.colormapNegative,
        neg[0],
        neg[1],
        volume.alphaThreshold,
        true,
        volume.colorbarVisible
      );
      this.addColormapList(
        volume.colormap,
        volume.cal_min,
        volume.cal_max,
        volume.alphaThreshold,
        false,
        volume.colorbarVisible
      );
    }
  }
  let nmesh = this.meshes.length;
  if (nmesh > 0) {
    //add colorbars for volumes
    for (let i = 0; i < nmesh; i++) {
      let mesh = this.meshes[i];
      if (!mesh.colorbarVisible) continue;
      let nlayers = mesh.layers.length;
      if (mesh.hasOwnProperty("edgeColormap")) {
        let neg = negMinMax(mesh.edgeMin, mesh.edgeMax, NaN, NaN);
        this.addColormapList(
          mesh.edgeColormapNegative,
          neg[0],
          neg[1],
          false,
          true
        );
        this.addColormapList(mesh.edgeColormap, mesh.edgeMin, mesh.edgeMax);
      }
      if (nlayers < 1) continue;
      for (let j = 0; j < nlayers; j++) {
        let layer = this.meshes[i].layers[j];
        if (!layer.colorbarVisible) continue;
        if (layer.colormap.length < 1) continue;
        let neg = negMinMax(
          layer.cal_min,
          layer.cal_max,
          layer.cal_minNeg,
          layer.cal_maxNeg
        );
        this.addColormapList(
          layer.colormapNegative,
          neg[0],
          neg[1],
          layer.alphaThreshold,
          true
        );
        this.addColormapList(
          layer.colormap,
          layer.cal_min,
          layer.cal_max,
          layer.alphaThreshold
        );
      } //for each layer j
    } //for each mesh i
  } //for meshes
  let nMaps = this.colormapLists.length;
  if (nMaps < 1) return;
  this.colormapTexture = this.createColormapTexture(
    this.colormapTexture,
    nMaps + 1
  );
  let luts = [];
  function addColormap(lut) {
    let c = new Uint8ClampedArray(luts.length + lut.length);
    c.set(luts);
    c.set(lut, luts.length);
    luts = c;
  }
  for (let i = 0; i < nMaps; i++)
    addColormap(this.colormap(this.colormapLists[i].name));
  addColormap(this.drawLut.lut);
  this.gl.texSubImage2D(
    this.gl.TEXTURE_2D,
    0,
    0,
    0,
    256,
    nMaps + 1,
    this.gl.RGBA,
    this.gl.UNSIGNED_BYTE,
    luts
  );
  return this;
}; // refreshColormaps()

// not included in public docs
Niivue.prototype.sliceScale = function (forceVox = false) {
  let dimsMM = this.screenFieldOfViewMM(SLICE_TYPE.AXIAL);
  if (forceVox) dimsMM = this.screenFieldOfViewVox(SLICE_TYPE.AXIAL);
  var longestAxis = Math.max(dimsMM[0], Math.max(dimsMM[1], dimsMM[2]));
  var volScale = [
    dimsMM[0] / longestAxis,
    dimsMM[1] / longestAxis,
    dimsMM[2] / longestAxis,
  ];
  var vox = [this.back.dims[1], this.back.dims[2], this.back.dims[3]];
  return { volScale, vox, longestAxis, dimsMM };
}; // sliceScale()

// not included in public docs
function swizzleVec3(vec, order = [0, 1, 2]) {
  let vout = mat.vec3.create();
  vout[0] = vec[order[0]];
  vout[1] = vec[order[1]];
  vout[2] = vec[order[2]];
  return vout;
}

// not included in public docs
// report if screen space coordinates correspond with a 3D rendering
Niivue.prototype.inRenderTile = function (x, y) {
  for (let i = 0; i < this.screenSlices.length; i++) {
    if (this.screenSlices[i].axCorSag !== SLICE_TYPE.RENDER) continue;
    let ltwh = this.screenSlices[i].leftTopWidthHeight;
    if (
      x > ltwh[0] &&
      y > ltwh[1] &&
      x < ltwh[0] + ltwh[2] &&
      y < ltwh[1] + ltwh[3]
    )
      return i;
  }
  return -1; //mouse position not in rendering tile
};

// not included in public docs
// if clip plane is active, change depth of clip plane
// otherwise, set zoom factor for rendering size
Niivue.prototype.sliceScroll3D = function (posChange = 0) {
  if (posChange === 0) return;
  //n.b. clip plane only influences voxel-based volumes, so zoom is only action for meshes
  if (this.volumes.length > 0 && this.scene.clipPlaneDepthAziElev[0] < 1.8) {
    //clipping mode: change clip plane depth
    //if (this.scene.clipPlaneDepthAziElev[0] > 1.8) return;
    let depthAziElev = this.scene.clipPlaneDepthAziElev.slice();
    //bound clip sqrt(3) = 1.73
    if (posChange > 0) depthAziElev[0] = Math.min(1.5, depthAziElev[0] + 0.025);
    if (posChange < 0)
      depthAziElev[0] = Math.max(-1.5, depthAziElev[0] - 0.025); //Math.max(-1.7,
    if (depthAziElev[0] !== this.scene.clipPlaneDepthAziElev[0]) {
      this.scene.clipPlaneDepthAziElev = depthAziElev;
      return this.setClipPlane(this.scene.clipPlaneDepthAziElev);
    }
    return;
  }
  if (posChange > 0)
    this.scene.volScaleMultiplier = Math.min(
      2.0,
      this.scene.volScaleMultiplier * 1.1
    );
  if (posChange < 0)
    this.scene.volScaleMultiplier = Math.max(
      0.5,
      this.scene.volScaleMultiplier * 0.9
    );
  this.drawScene();
};

// not included in public docs
// if a thumbnail is loaded: close thumbnail and release memory
Niivue.prototype.deleteThumbnail = function () {
  if (!this.bmpTexture) return;
  this.gl.deleteTexture(this.bmpTexture);
  this.bmpTexture = null;
  this.thumbnailVisible = false;
};

Niivue.prototype.inGraphTile = function (x, y) {
  if (
    this.graph.opacity <= 0 ||
    this.volumes[0].nFrame4D < 1 ||
    !this.graph.plotLTWH
  )
    return false;
  if (this.graph.plotLTWH[2] < 1 || this.graph.plotLTWH[3] < 1) return false;
  //this.graph.LTWH is tile
  //this.graph.plotLTWH is body of plot
  let pos = [
    (x - this.graph.LTWH[0]) / this.graph.LTWH[2],
    (y - this.graph.LTWH[1]) / this.graph.LTWH[3],
  ];

  return pos[0] > 0 && pos[1] > 0 && pos[0] <= 1 && pos[1] <= 1;
};

// not included in public docs
// handle mouse click event on canvas
Niivue.prototype.mouseClick = function (x, y, posChange = 0, isDelta = true) {
  x *= this.uiData.dpr;
  y *= this.uiData.dpr;
  var posNow;
  var posFuture;
  this.canvas.focus();
  if (this.thumbnailVisible) {
    //we will simply hide the thmubnail
    // use deleteThumbnail() to close the thumbnail and free resources
    //this.gl.deleteTexture(this.bmpTexture);
    //this.bmpTexture = null;
    this.thumbnailVisible = false;
    //the thumbnail is now released, do something profound: actually load the images
    this.loadVolumes(this.deferredVolumes);
    this.loadMeshes(this.deferredMeshes);
    return;
  }
  if (this.inGraphTile(x, y)) {
    let pos = [
      (x - this.graph.plotLTWH[0]) / this.graph.plotLTWH[2],
      (y - this.graph.plotLTWH[1]) / this.graph.plotLTWH[3],
    ];

    if (pos[0] > 0 && pos[1] > 0 && pos[0] <= 1 && pos[1] <= 1) {
      let vol = Math.round(pos[0] * (this.volumes[0].nFrame4D - 1));
      //this.graph.selectedColumn = vol;
      this.setFrame4D(this.volumes[0].id, vol);
      return;
    }
    if (pos[0] > 0.5 && pos[1] > 1.0)
      //load full 4D series if user clicks on lower right of plot tile
      this.loadDeferred4DVolumes(this.volumes[0].id);
    return;
  }
  if (this.inRenderTile(x, y) >= 0) {
    this.sliceScroll3D(posChange);
    this.drawScene(); //TODO: twice?
    return;
  }
  if (
    this.screenSlices.length < 1 ||
    this.gl.canvas.height < 1 ||
    this.gl.canvas.width < 1
  )
    return;
  //mouse click X,Y in screen coordinates, origin at top left
  // webGL clip space L,R,T,B = [-1, 1, 1, 1]
  // n.b. webGL Y polarity reversed
  // https://webglfundamentals.org/webgl/lessons/webgl-fundamentals.html
  for (let i = 0; i < this.screenSlices.length; i++) {
    var axCorSag = this.screenSlices[i].axCorSag;
    if (this.drawPenAxCorSag >= 0 && this.drawPenAxCorSag !== axCorSag)
      continue; //if mouse is drawing on axial slice, ignore any entry to coronal slice
    if (axCorSag > SLICE_TYPE.SAGITTAL) continue;
    let texFrac = this.screenXY2TextureFrac(x, y, i);
    if (texFrac[0] < 0) continue; //click not on slice i
    if (true) {
      //user clicked on slice i
      if (!isDelta) {
        this.scene.crosshairPos[2 - axCorSag] = posChange;
        this.drawScene();
        return;
      }
      // scrolling... not mouse
      if (posChange !== 0) {
        let posNeg = 1;
        if (posChange < 0) posNeg = -1;
        let xyz = [0, 0, 0];
        xyz[2 - axCorSag] = posNeg;
        this.moveCrosshairInVox(xyz[0], xyz[1], xyz[2]);
        this.drawScene();
        this.createOnLocationChange(axCorSag);
        return;
      }
      this.scene.crosshairPos = texFrac.slice();
      if (this.opts.drawingEnabled) {
        let pt = this.frac2vox(this.scene.crosshairPos);

        if (
          !isFinite(this.opts.penValue) ||
          this.opts.penValue < 0 ||
          Object.is(this.opts.penValue, -0)
        ) {
          if (!isFinite(this.opts.penValue))
            //NaN = grow based on cluster intensity , Number.POSITIVE_INFINITY  = grow based on cluster intensity or brighter , Number.NEGATIVE_INFINITY = grow based on cluster intensity or darker
            this.drawFloodFill(
              pt,
              0,
              this.opts.penValue,
              this.opts.floodFillNeighbors
            );
          else
            this.drawFloodFill(
              pt,
              Math.abs(this.opts.penValue, this.opts.floodFillNeighbors)
            );
          return;
        }
        if (isNaN(this.drawPenLocation[0])) {
          this.drawPenAxCorSag = axCorSag;
          this.drawPenFillPts = [];
          this.drawPt(...pt, this.opts.penValue);
        } else {
          if (
            pt[0] === this.drawPenLocation[0] &&
            pt[1] === this.drawPenLocation[1] &&
            pt[2] === this.drawPenLocation[2]
          )
            return;
          this.drawPenLine(pt, this.drawPenLocation, this.opts.penValue);
        }
        this.drawPenLocation = pt;
        if (this.opts.isFilledPen) this.drawPenFillPts.push(pt);
        this.refreshDrawing(false);
      }
      this.drawScene();
      this.createOnLocationChange(axCorSag);
      return;
    } else {
      //if click in slice i
      // if x and y are null, likely due to a slider widget sending the posChange (no mouse info in that case)
      if (x === null && y === null) {
        this.scene.crosshairPos[2 - axCorSag] = posChange;
        this.drawScene();
        return;
      }
    }
  } //for i: each slice on screen
}; // mouseClick()

// not included in public docs
// draw 10cm ruler on a 2D tile
Niivue.prototype.drawRuler = function () {
  let fovMM = [];
  let ltwh = [];
  for (let i = 0; i < this.screenSlices.length; i++) {
    if (this.screenSlices[i].axCorSag === SLICE_TYPE.RENDER) continue;
    //let ltwh = this.screenSlices[i].leftTopWidthHeight;
    if (this.screenSlices[i].fovMM.length > 1) {
      ltwh = this.screenSlices[i].leftTopWidthHeight;
      fovMM = this.screenSlices[i].fovMM;
      break;
    }
  }
  if (ltwh.length < 4) return;
  let frac10cm = 100.0 / fovMM[0];
  let pix10cm = frac10cm * ltwh[2];
  let pixLeft = ltwh[0] + 0.5 * ltwh[2] - 0.5 * pix10cm;
  let pixTop = ltwh[1] + ltwh[3] - 2 * this.opts.rulerWidth;
  let startXYendXY = [pixLeft, pixTop, pixLeft + pix10cm, pixTop];
  this.drawRuler10cm(startXYendXY);
};

// not included in public docs
// draw 10cm ruler at desired coordinates
Niivue.prototype.drawRuler10cm = function (startXYendXY) {
  this.gl.bindVertexArray(this.genericVAO);
  this.lineShader.use(this.gl);
  this.gl.uniform4fv(this.lineShader.lineColorLoc, this.opts.rulerColor);
  this.gl.uniform2fv(this.lineShader.canvasWidthHeightLoc, [
    this.gl.canvas.width,
    this.gl.canvas.height,
  ]);
  //draw Line
  this.gl.uniform1f(this.lineShader.thicknessLoc, this.opts.rulerWidth);
  this.gl.uniform4fv(this.lineShader.startXYendXYLoc, startXYendXY);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  //draw tick marks
  let w1cm = -0.1 * (startXYendXY[0] - startXYendXY[2]);
  let b = startXYendXY[1];
  let t = b - 2 * this.opts.rulerWidth;
  let t2 = b - 4 * this.opts.rulerWidth;
  for (let i = 0; i < 11; i++) {
    let l = startXYendXY[0] + i * w1cm;
    let xyxy = [l, b, l, t];
    if (i % 5 === 0) xyxy[3] = t2;
    this.gl.uniform4fv(this.lineShader.startXYendXYLoc, xyxy);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
  this.gl.bindVertexArray(this.unusedVAO); //set vertex attributes
};

Niivue.prototype.screenXY2mm = function (x, y, forceSlice = -1) {
  let texFrac = [];
  for (let s = 0; s < this.screenSlices.length; s++) {
    let i = s;
    if (forceSlice >= 0) i = forceSlice;
    var axCorSag = this.screenSlices[i].axCorSag;
    if (axCorSag > SLICE_TYPE.SAGITTAL) continue;

    let ltwh = this.screenSlices[i].leftTopWidthHeight;
    if (
      x < ltwh[0] ||
      y < ltwh[1] ||
      x > ltwh[0] + ltwh[2] ||
      y > ltwh[1] + ltwh[3]
    )
      continue;
    texFrac = this.screenXY2TextureFrac(x, y, i, false);
    if (texFrac[0] < 0.0) continue;
    let mm = this.frac2mm(texFrac);

    return [mm[0], mm[1], mm[2], i];
  }
  return [NaN, NaN, NaN, NaN];
};

//dragForPanZoom
Niivue.prototype.dragForPanZoom = function (startXYendXY) {
  let endMM = this.screenXY2mm(startXYendXY[2], startXYendXY[3]);
  if (isNaN(endMM[0])) {
    return;
  }
  let startMM = this.screenXY2mm(startXYendXY[0], startXYendXY[1], endMM[3]);
  if (isNaN(startMM[0]) || isNaN(endMM[0]) || endMM[3] !== endMM[3]) {
    return;
  }
  let v = mat.vec3.create();
  let zoom = this.uiData.pan2DxyzmmAtMouseDown[3];
  mat.vec3.sub(v, endMM, startMM);
  this.uiData.pan2Dxyzmm[0] =
    this.uiData.pan2DxyzmmAtMouseDown[0] + zoom * v[0];
  this.uiData.pan2Dxyzmm[1] =
    this.uiData.pan2DxyzmmAtMouseDown[1] + zoom * v[1];
  this.uiData.pan2Dxyzmm[2] =
    this.uiData.pan2DxyzmmAtMouseDown[2] + zoom * v[2];
};

Niivue.prototype.dragForCenterButton = function (startXYendXY) {
  this.dragForPanZoom(startXYendXY);
};

//for slicer3D vertical dragging adjusts zoom
Niivue.prototype.dragForSlicer3D = function (startXYendXY) {
  let zoom = this.uiData.pan2DxyzmmAtMouseDown[3];
  let y = startXYendXY[3] - startXYendXY[1];
  const pixelScale = 0.01;
  zoom += y * pixelScale;
  zoom = Math.max(zoom, 0.1);
  zoom = Math.min(zoom, 10.0);
  let zoomChange = this.uiData.pan2Dxyzmm[3] - zoom;
  this.uiData.pan2Dxyzmm[3] = zoom;
  let mm = this.frac2mm(this.scene.crosshairPos);
  this.uiData.pan2Dxyzmm[0] += zoomChange * mm[0];
  this.uiData.pan2Dxyzmm[1] += zoomChange * mm[1];
  this.uiData.pan2Dxyzmm[2] += zoomChange * mm[2];
};

// not included in public docs
// draw line between start/end points and text to report length
Niivue.prototype.drawMeasurementTool = function (startXYendXY) {
  let gl = this.gl;
  gl.bindVertexArray(this.genericVAO);

  gl.depthFunc(gl.ALWAYS);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  this.lineShader.use(this.gl);
  gl.uniform4fv(this.lineShader.lineColorLoc, this.opts.rulerColor);
  gl.uniform2fv(this.lineShader.canvasWidthHeightLoc, [
    gl.canvas.width,
    gl.canvas.height,
  ]);
  //draw Line
  gl.uniform1f(this.lineShader.thicknessLoc, this.opts.rulerWidth);
  gl.uniform4fv(this.lineShader.startXYendXYLoc, startXYendXY);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  //draw startCap
  let color = this.opts.rulerColor;
  color[3] = 1.0; //opaque
  gl.uniform4fv(this.lineShader.lineColorLoc, color);
  let w = this.opts.rulerWidth;
  gl.uniform1f(this.lineShader.thicknessLoc, w * 2);
  let sXYeXY = [
    startXYendXY[0],
    startXYendXY[1] - w,
    startXYendXY[0],
    startXYendXY[1] + w,
  ];
  gl.uniform4fv(this.lineShader.startXYendXYLoc, sXYeXY);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  //end cap
  sXYeXY = [
    startXYendXY[2],
    startXYendXY[3] - w,
    startXYendXY[2],
    startXYendXY[3] + w,
  ];
  gl.uniform4fv(this.lineShader.startXYendXYLoc, sXYeXY);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  //distance between start and stop
  let startXY = this.canvasPos2frac([startXYendXY[0], startXYendXY[1]]);
  let endXY = this.canvasPos2frac([startXYendXY[2], startXYendXY[3]]);
  if (startXY[0] >= 0 && endXY[0] >= 0) {
    startXY = this.frac2mm(startXY);
    endXY = this.frac2mm(endXY);
    let v = mat.vec3.create();
    mat.vec3.sub(v, startXY, endXY);
    let lenMM = mat.vec3.len(v);
    let decimals = 2;
    if (lenMM > 9) decimals = 1;
    if (lenMM > 99) decimals = 0;
    let stringMM = lenMM.toFixed(decimals);
    this.drawTextBetween(startXYendXY, stringMM, 1, color);
  }
  gl.bindVertexArray(this.unusedVAO); //set vertex attributes
};

// not included in public docs
// draw a rectangle at specified location
// unless Alpha is > 0, default color is opts.crosshairColor
Niivue.prototype.drawRect = function (
  leftTopWidthHeight,
  lineColor = [1, 0, 0, -1]
) {
  if (lineColor[3] < 0) lineColor = this.opts.crosshairColor;
  this.rectShader.use(this.gl);
  this.gl.enable(this.gl.BLEND);
  this.gl.uniform4fv(this.rectShader.lineColorLoc, lineColor);
  this.gl.uniform2fv(this.rectShader.canvasWidthHeightLoc, [
    this.gl.canvas.width,
    this.gl.canvas.height,
  ]);
  this.gl.uniform4f(
    this.rectShader.leftTopWidthHeightLoc,
    leftTopWidthHeight[0],
    leftTopWidthHeight[1],
    leftTopWidthHeight[2],
    leftTopWidthHeight[3]
  );
  this.gl.bindVertexArray(this.genericVAO);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  this.gl.bindVertexArray(this.unusedVAO); //switch off to avoid tampering with settings
};

// not included in public docs
// draw a rectangle at desired location
Niivue.prototype.drawSelectionBox = function (leftTopWidthHeight) {
  this.drawRect(leftTopWidthHeight, this.opts.selectionBoxColor);
};

function nice(x, round) {
  var exp = Math.floor(Math.log(x) / Math.log(10));
  var f = x / Math.pow(10, exp);
  var nf;
  if (round) {
    if (f < 1.5) {
      nf = 1;
    } else if (f < 3) {
      nf = 2;
    } else if (f < 7) {
      nf = 5;
    } else {
      nf = 10;
    }
  } else {
    if (f <= 1) {
      nf = 1;
    } else if (f <= 2) {
      nf = 2;
    } else if (f <= 5) {
      nf = 5;
    } else {
      nf = 10;
    }
  }
  return nf * Math.pow(10, exp);
}

function loose_label(min, max, ntick = 4) {
  let range = nice(max - min, false);
  let d = nice(range / (ntick - 1), true);
  let graphmin = Math.floor(min / d) * d;
  let graphmax = Math.ceil(max / d) * d;
  let perfect = graphmin === min && graphmax === max;
  return [d, graphmin, graphmax, perfect];
}

// "Nice Numbers for Graph Labels", Graphics Gems, pp 61-63
// https://github.com/cenfun/nice-ticks/blob/master/docs/Nice-Numbers-for-Graph-Labels.pdf
function tickSpacing(mn, mx) {
  let v = loose_label(mn, mx, 3);
  if (!v[3]) v = loose_label(mn, mx, 5);
  if (!v[3]) v = loose_label(mn, mx, 4);
  if (!v[3]) v = loose_label(mn, mx, 3);
  if (!v[3]) v = loose_label(mn, mx, 5);
  return [v[0], v[1], v[2]];
}
// not included in public docs
// return canvas pixels available for tiles (e.g without colorbar)
Niivue.prototype.effectiveCanvasHeight = function () {
  //available canvas height differs from actual height if bottom colorbar is shown
  return this.gl.canvas.height - this.colorbarHeight;
};

// not included in public docs
// determine canvas pixels required for colorbar
Niivue.prototype.reserveColorbarPanel = function () {
  let txtHt = Math.max(this.opts.textHeight, 0.01);
  txtHt = txtHt * Math.min(this.gl.canvas.height, this.gl.canvas.width);

  let fullHt = 3 * txtHt;
  let leftTopWidthHeight = [
    0,
    this.gl.canvas.height - fullHt,
    this.gl.canvas.width,
    fullHt,
  ];
  this.colorbarHeight = leftTopWidthHeight[3] + 1;
  return leftTopWidthHeight;
};

// not included in public docs
// low level code to draw a single colorbar
Niivue.prototype.drawColorbarCore = function (
  layer = 0,
  leftTopWidthHeight = [0, 0, 0, 0],
  isNegativeColor = false,
  min = 0,
  max = 1,
  isAlphaThreshold
) {
  if (leftTopWidthHeight[2] <= 0 || leftTopWidthHeight[3] <= 0) return;
  let txtHt = Math.max(this.opts.textHeight, 0.01);
  txtHt = txtHt * Math.min(this.gl.canvas.height, this.gl.canvas.width);
  let margin = txtHt;
  let fullHt = 3 * txtHt;
  let barHt = txtHt;
  if (leftTopWidthHeight[3] < fullHt) {
    //no space for text
    if (leftTopWidthHeight[3] < 3) return;
    margin = 1;
    barHt = leftTopWidthHeight[3] - 2;
  }
  this.gl.disable(this.gl.DEPTH_TEST);
  this.colorbarHeight = leftTopWidthHeight[3] + 1;
  let barLTWH = [
    leftTopWidthHeight[0] + margin,
    leftTopWidthHeight[1],
    leftTopWidthHeight[2] - 2 * margin,
    barHt,
  ];
  let rimLTWH = [
    barLTWH[0] - 1,
    barLTWH[1] - 1,
    barLTWH[2] + 2,
    barLTWH[3] + 2,
  ];
  this.drawRect(rimLTWH, this.opts.crosshairColor);
  this.colorbarShader.use(this.gl);
  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
  this.gl.texParameteri(
    this.gl.TEXTURE_2D,
    this.gl.TEXTURE_MIN_FILTER,
    this.gl.NEAREST
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_2D,
    this.gl.TEXTURE_MAG_FILTER,
    this.gl.NEAREST
  );
  let lx = layer;
  this.gl.uniform1f(this.colorbarShader.layerLoc, lx);
  this.gl.uniform2fv(this.colorbarShader.canvasWidthHeightLoc, [
    this.gl.canvas.width,
    this.gl.canvas.height,
  ]);
  this.gl.disable(this.gl.CULL_FACE);
  if (isNegativeColor) {
    let flip = [barLTWH[0] + barLTWH[2], barLTWH[1], -barLTWH[2], barLTWH[3]];
    this.gl.uniform4fv(this.colorbarShader.leftTopWidthHeightLoc, flip);
  } else this.gl.uniform4fv(this.colorbarShader.leftTopWidthHeightLoc, barLTWH);
  this.gl.bindVertexArray(this.genericVAO);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  this.gl.bindVertexArray(this.unusedVAO); //switch off to avoid tampering with settings
  this.gl.texParameteri(
    this.gl.TEXTURE_2D,
    this.gl.TEXTURE_MIN_FILTER,
    this.gl.LINEAR
  );
  this.gl.texParameteri(
    this.gl.TEXTURE_2D,
    this.gl.TEXTURE_MAG_FILTER,
    this.gl.LINEAR
  );
  let thresholdTic = 0.0; //only show threshold tickmark in alphaThreshold mode
  if (isAlphaThreshold && max < 0.0 && isNegativeColor) {
    thresholdTic = max;
    max = 0.0;
  } else if (isAlphaThreshold && min > 0.0) {
    thresholdTic = min;
    min = 0.0;
  }
  if (min === max || txtHt < 1) return;
  let range = Math.abs(max - min);
  let [spacing, ticMin] = tickSpacing(min, max);
  if (ticMin < min) ticMin += spacing;
  //determine font size
  function humanize(x) {
    //drop trailing zeros from numerical string
    return x.toFixed(6).replace(/\.?0*$/, "");
  }
  let tic = ticMin;
  let ticLTWH = [0, barLTWH[1] + barLTWH[3] - txtHt * 0.5, 2, txtHt * 0.75];
  let txtTop = ticLTWH[1] + ticLTWH[3];
  let isNeg = 1;
  while (tic <= max) {
    ticLTWH[0] = barLTWH[0] + ((tic - min) / range) * barLTWH[2];
    this.drawRect(ticLTWH);
    let str = humanize(isNeg * tic);
    //if (fntSize > 0)
    this.drawTextBelow([ticLTWH[0], txtTop], str);
    //this.drawTextRight([plotLTWH[0], y], str, fntScale)
    tic += spacing;
  }
  if (thresholdTic !== 0) {
    let tticLTWH = [
      barLTWH[0] + ((thresholdTic - min) / range) * barLTWH[2],
      barLTWH[1] - barLTWH[3] * 0.25,
      2,
      barLTWH[3] * 1.5,
    ];
    this.drawRect(tticLTWH);
  }
}; // drawColorbarCore()

// not included in public docs
// high level code to draw colorbar(s)
Niivue.prototype.drawColorbar = function () {
  let maps = this.colormapLists;
  let nmaps = maps.length;
  if (nmaps < 1) return;
  let nVisible = 0; //not all colorbars may be visible
  for (let i = 0; i < nmaps; i++) if (maps[i].visible) nVisible++;
  if (nVisible < 1) return;
  let leftTopWidthHeight = this.reserveColorbarPanel();
  let txtHt = Math.max(this.opts.textHeight, 0.01);
  txtHt = txtHt * Math.min(this.gl.canvas.height, this.gl.canvas.width);
  let fullHt = 3 * txtHt;
  let wid = leftTopWidthHeight[2] / nVisible;
  if (leftTopWidthHeight[2] <= 0 || leftTopWidthHeight[3] <= 0) {
    wid = this.gl.canvas.width / nVisible;
    leftTopWidthHeight = [0, this.gl.canvas.height - fullHt, wid, fullHt];
  }
  leftTopWidthHeight[2] = wid;
  for (let i = 0; i < nmaps; i++) {
    if (!maps[i].visible) continue;
    this.drawColorbarCore(
      i,
      leftTopWidthHeight,
      maps[i].negative,
      maps[i].min,
      maps[i].max,
      maps[i].alphaThreshold
    );
    leftTopWidthHeight[0] += wid;
  }
}; // drawColorbar()

// not included in public docs
Niivue.prototype.textWidth = function (scale, str) {
  let w = 0;
  var bytes = new TextEncoder().encode(str);
  for (let i = 0; i < str.length; i++)
    w += scale * this.fontMets[bytes[i]].xadv;
  return w;
}; // textWidth()

// not included in public docs
Niivue.prototype.drawChar = function (xy, scale, char) {
  //draw single character, never call directly: ALWAYS call from drawText()
  let metrics = this.fontMets[char];
  let l = xy[0] + scale * metrics.lbwh[0];
  let b = -(scale * metrics.lbwh[1]);
  let w = scale * metrics.lbwh[2];
  let h = scale * metrics.lbwh[3];
  let t = xy[1] + (b - h) + scale;
  this.gl.uniform4f(this.fontShader.leftTopWidthHeightLoc, l, t, w, h);
  this.gl.uniform4fv(this.fontShader.uvLeftTopWidthHeightLoc, metrics.uv_lbwh);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  return scale * metrics.xadv;
}; // drawChar()

// not included in public docs
Niivue.prototype.drawLoadingText = function (text) {
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.enable(this.gl.CULL_FACE);
  this.gl.enable(this.gl.BLEND);
  this.drawTextBelow([this.canvas.width / 2, this.canvas.height / 2], text, 3);
};

// not included in public docs
Niivue.prototype.drawText = function (xy, str, scale = 1, color = null) {
  //to right of x, vertically centered on y
  if (this.opts.textHeight <= 0) return;
  this.fontShader.use(this.gl);
  //let size = this.opts.textHeight * this.gl.canvas.height * scale;
  let size =
    this.opts.textHeight *
    Math.min(this.gl.canvas.height, this.gl.canvas.width) *
    scale;
  this.gl.enable(this.gl.BLEND);
  this.gl.uniform2f(
    this.fontShader.canvasWidthHeightLoc,
    this.gl.canvas.width,
    this.gl.canvas.height
  );
  if (color === null) color = this.opts.fontColor;
  this.gl.uniform4fv(this.fontShader.fontColorLoc, color);
  let screenPxRange = (size / this.fontMets.size) * this.fontMets.distanceRange;
  screenPxRange = Math.max(screenPxRange, 1.0); //screenPxRange() must never be lower than 1
  this.gl.uniform1f(this.fontShader.screenPxRangeLoc, screenPxRange);
  var bytes = new TextEncoder().encode(str);
  this.gl.bindVertexArray(this.genericVAO);
  for (let i = 0; i < str.length; i++)
    xy[0] += this.drawChar(xy, size, bytes[i]);
  this.gl.bindVertexArray(this.unusedVAO);
}; // drawText()

// not included in public docs
Niivue.prototype.drawTextRight = function (xy, str, scale = 1) {
  //to right of x, vertically centered on y
  if (this.opts.textHeight <= 0) return;
  xy[1] -= 0.5 * this.opts.textHeight * this.gl.canvas.height;
  this.drawText(xy, str, scale);
}; // drawTextRight()

// not included in public docs
Niivue.prototype.drawTextLeft = function (xy, str, scale = 1, color = null) {
  //to right of x, vertically centered on y
  if (this.opts.textHeight <= 0) return;
  let size = this.opts.textHeight * this.gl.canvas.height * scale;
  xy[0] -= this.textWidth(size, str);
  xy[1] -= 0.5 * size;
  this.drawText(xy, str, scale, color);
}; // drawTextLeft()

// not included in public docs
Niivue.prototype.drawTextRightBelow = function (
  xy,
  str,
  scale = 1,
  color = null
) {
  //to right of x, vertically centered on y
  if (this.opts.textHeight <= 0) return;

  this.drawText(xy, str, scale, color);
}; // drawTextLeftBelow()

// not included in public docs
Niivue.prototype.drawTextBetween = function (
  startXYendXY,
  str,
  scale = 1,
  color = null
) {
  //horizontally centered on x, below y
  if (this.opts.textHeight <= 0) return;
  let xy = [
    (startXYendXY[0] + startXYendXY[2]) * 0.5,
    (startXYendXY[1] + startXYendXY[3]) * 0.5,
  ];
  let size = this.opts.textHeight * this.gl.canvas.height * scale;
  let w = this.textWidth(size, str);
  xy[0] -= 0.5 * w;
  xy[1] -= 0.5 * size;
  let LTWH = [xy[0] - 1, xy[1] - 1, w + 2, size + 2];
  let clr = color;
  if (clr === null) clr = this.opts.crosshairColor;
  if (clr[0] + clr[1] + clr[2] > 0.8) clr = [0, 0, 0, 0.5];
  else clr = [1, 1, 1, 0.5];
  this.drawRect(LTWH, clr);
  this.drawText(xy, str, scale, color);
}; // drawTextBetween()

// not included in public docs
Niivue.prototype.drawTextBelow = function (xy, str, scale = 1, color = null) {
  //horizontally centered on x, below y
  if (this.opts.textHeight <= 0) return;
  let size = this.opts.textHeight * this.gl.canvas.height * scale;
  let width = this.textWidth(size, str);
  if (width > this.canvas.width) {
    scale *= (this.canvas.width - 2) / width;
    size = this.opts.textHeight * this.gl.canvas.height * scale;
    width = this.textWidth(size, str);
  }
  xy[0] -= 0.5 * this.textWidth(size, str);
  xy[0] = Math.max(xy[0], 1); //clamp left edge of canvas
  xy[0] = Math.min(xy[0], this.canvas.width - width - 1); //clamp right edge of canvas
  this.drawText(xy, str, scale, color);
}; // drawTextBelow()

Niivue.prototype.updateInterpolation = function (layer, isForceLinear = false) {
  let interp = this.gl.LINEAR;
  if (!isForceLinear && this.opts.isNearestInterpolation)
    interp = this.gl.NEAREST;
  if (layer === 0) {
    this.gl.activeTexture(this.gl.TEXTURE0); //background
  } else {
    this.gl.activeTexture(this.gl.TEXTURE2); //overlay
  }
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, interp);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, interp);
}; // updateInterpolation()

// not included in public docs
Niivue.prototype.setAtlasOutline = function (isOutline) {
  this.opts.isAtlasOutline = isOutline;
  this.updateGLVolume();
  this.drawScene();
}; // setAtlasOutline()

/**
 * select between nearest and linear interpolation for voxel based images
 * @property {boolean} isNearest whether nearest neighbor interpolation is used, else linear interpolation
 * @example niivue.setInterpolation(true);
 * @see {@link https://niivue.github.io/niivue/features/draw2.html|live demo usage}
 */
Niivue.prototype.setInterpolation = function (isNearest) {
  this.opts.isNearestInterpolation = isNearest;
  let numLayers = this.volumes.length;
  if (numLayers < 1) return;
  for (let i = 0; i < numLayers; i++) this.updateInterpolation(i);
  this.drawScene();
}; // setInterpolation()

// not included in public docs
// convert degrees to radians
function deg2rad(deg) {
  return deg * (Math.PI / 180.0);
} // deg2rad()

// not included in public docs
Niivue.prototype.calculateMvpMatrix2D = function (
  leftTopWidthHeight,
  mn,
  mx,
  clipTolerance = Infinity,
  clipDepth = 0,
  azimuth = null,
  elevation = null,
  isRadiolgical
) {
  let gl = this.gl;
  gl.viewport(
    leftTopWidthHeight[0],
    this.gl.canvas.height - (leftTopWidthHeight[1] + leftTopWidthHeight[3]), //lower numbers near bottom
    leftTopWidthHeight[2],
    leftTopWidthHeight[3]
  );
  let left = mn[0];
  let right = mx[0];
  let leftTopMM = [left, mn[1]];
  let fovMM = [right - left, mx[1] - mn[1]];
  if (isRadiolgical) {
    leftTopMM = [mx[0], mn[1]];
    fovMM = [mn[0] - mx[0], mx[1] - mn[1]];
    left = -mx[0];
    right = -mn[0];
  }
  let scale = 2 * Math.max(Math.abs(mn[2]), Math.abs(mx[2])); //3rd dimension is near/far from camera
  let projectionMatrix = mat.mat4.create();
  let near = 0.01;
  let far = scale * 8.0;
  if (clipTolerance !== Infinity) {
    let r = isRadiolgical;
    if (elevation === 0 && (azimuth === 0 || azimuth === 180)) r = !r;
    let dx = scale * 1.8 - clipDepth;
    if (!r) dx = scale * 1.8 + clipDepth;
    near = dx - clipTolerance;
    far = dx + clipTolerance;
  }
  mat.mat4.ortho(projectionMatrix, left, right, mn[1], mx[1], near, far);
  const modelMatrix = mat.mat4.create();
  modelMatrix[0] = -1; //mirror X coordinate
  //push the model away from the camera so camera not inside model
  let translateVec3 = mat.vec3.fromValues(0, 0, -scale * 1.8); // to avoid clipping, >= SQRT(3)
  mat.mat4.translate(modelMatrix, modelMatrix, translateVec3);
  //apply elevation
  mat.mat4.rotateX(modelMatrix, modelMatrix, deg2rad(270 - elevation));
  //apply azimuth
  mat.mat4.rotateZ(modelMatrix, modelMatrix, deg2rad(azimuth - 180));
  let iModelMatrix = mat.mat4.create();
  mat.mat4.invert(iModelMatrix, modelMatrix);
  let normalMatrix = mat.mat4.create();
  mat.mat4.transpose(normalMatrix, iModelMatrix);
  let modelViewProjectionMatrix = mat.mat4.create();
  mat.mat4.multiply(modelViewProjectionMatrix, projectionMatrix, modelMatrix);

  return {
    modelViewProjectionMatrix,
    modelMatrix,
    normalMatrix,
    leftTopMM,
    fovMM,
  };
}; // calculateMvpMatrix2D

// not included in public docs
Niivue.prototype.swizzleVec3MM = function (v3, axCorSag) {
  // change order of vector components
  if (axCorSag === SLICE_TYPE.CORONAL) {
    //2D coronal screenXYZ = nifti [i,k,j]
    v3 = swizzleVec3(v3, [0, 2, 1]);
  } else if (axCorSag === SLICE_TYPE.SAGITTAL) {
    //2D sagittal screenXYZ = nifti [j,k,i]
    v3 = swizzleVec3(v3, [1, 2, 0]);
  }
  return v3;
}; // swizzleVec3MM()

Niivue.prototype.screenFieldOfViewVox = function (axCorSag = 0) {
  let fov = this.volumeObject3D.fieldOfViewDeObliqueMM.slice();
  return this.swizzleVec3MM(fov, axCorSag);
};

// not included in public docs
// determine height/width of image in millimeters
Niivue.prototype.screenFieldOfViewMM = function (
  axCorSag = 0,
  forceSliceMM = false
) {
  //extent of volume/mesh (in millimeters) in screen space
  if (!forceSliceMM && !this.opts.isSliceMM) {
    //return voxel space
    return this.screenFieldOfViewVox(axCorSag);
  }
  let mnMM = this.volumeObject3D.extentsMin.slice();
  let mxMM = this.volumeObject3D.extentsMax.slice();

  mnMM = this.swizzleVec3MM(mnMM, axCorSag);
  mxMM = this.swizzleVec3MM(mxMM, axCorSag);
  let fovMM = mat.vec3.create();
  mat.vec3.subtract(fovMM, mxMM, mnMM);
  return fovMM;
}; // screenFieldOfViewMM()

Niivue.prototype.screenFieldOfViewExtendedVox = function (axCorSag = 0) {
  //extent of volume/mesh (in orthographic alignment for rectangular voxels) in screen space
  //let fov = [frac2mmTexture[0], frac2mmTexture[5], frac2mmTexture[10]];
  let mnMM = [
    this.volumes[0].extentsMinOrtho[0],
    this.volumes[0].extentsMinOrtho[1],
    this.volumes[0].extentsMinOrtho[2],
  ];
  let mxMM = [
    this.volumes[0].extentsMaxOrtho[0],
    this.volumes[0].extentsMaxOrtho[1],
    this.volumes[0].extentsMaxOrtho[2],
  ];
  let rotation = mat.mat4.create(); //identity matrix: 2D axial screenXYZ = nifti [i,j,k]
  mnMM = this.swizzleVec3MM(mnMM, axCorSag);
  mxMM = this.swizzleVec3MM(mxMM, axCorSag);
  let fovMM = mat.vec3.create();
  mat.vec3.subtract(fovMM, mxMM, mnMM);
  return { mnMM, mxMM, rotation, fovMM };
}; // screenFieldOfViewExtendedVox()

// not included in public docs
Niivue.prototype.screenFieldOfViewExtendedMM = function (axCorSag = 0) {
  //extent of volume/mesh (in millimeters) in screen space
  let mnMM = this.volumeObject3D.extentsMin.slice();
  let mxMM = this.volumeObject3D.extentsMax.slice();
  let rotation = mat.mat4.create(); //identity matrix: 2D axial screenXYZ = nifti [i,j,k]
  mnMM = this.swizzleVec3MM(mnMM, axCorSag);
  mxMM = this.swizzleVec3MM(mxMM, axCorSag);
  let fovMM = mat.vec3.create();
  mat.vec3.subtract(fovMM, mxMM, mnMM);
  return { mnMM, mxMM, rotation, fovMM };
}; // screenFieldOfViewExtendedMM()

// not included in public docs
// show text labels for L/R, A/P, I/S dimensions
Niivue.prototype.drawSliceOrientationText = function (
  leftTopWidthHeight,
  axCorSag
) {
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  let topText = "S";
  if (axCorSag === SLICE_TYPE.AXIAL) topText = "A";
  let leftText = this.opts.isRadiologicalConvention ? "R" : "L";
  if (axCorSag === SLICE_TYPE.SAGITTAL)
    leftText = this.opts.sagittalNoseLeft ? "A" : "P";
  if (this.opts.isCornerOrientationText) {
    this.drawTextRightBelow(
      [leftTopWidthHeight[0], leftTopWidthHeight[1]],
      leftText + topText
    );
    return;
  }
  this.drawTextBelow(
    [
      leftTopWidthHeight[0] + leftTopWidthHeight[2] * 0.5,
      leftTopWidthHeight[1],
    ],
    topText
  );

  this.drawTextRight(
    [
      leftTopWidthHeight[0],
      leftTopWidthHeight[1] + leftTopWidthHeight[3] * 0.5,
    ],
    leftText
  );
}; // drawSliceOrientationText()

// not included in public docs
Niivue.prototype.xyMM2xyzMM = function (axCorSag, sliceFrac) {
  //given X and Y, find Z for a plane defined by 3 points (a,b,c)
  //https://math.stackexchange.com/questions/851742/calculate-coordinate-of-any-point-on-triangle-in-3d-plane
  let sliceDim = 2; //axial depth is NIfTI k dimension
  if (axCorSag === SLICE_TYPE.CORONAL) sliceDim = 1; //sagittal depth is NIfTI j dimension
  if (axCorSag === SLICE_TYPE.SAGITTAL) sliceDim = 0; //sagittal depth is NIfTI i dimension
  let a = [0, 0, 0];
  let b = [1, 1, 0];
  let c = [1, 0, 1];

  a[sliceDim] = sliceFrac;
  b[sliceDim] = sliceFrac;
  c[sliceDim] = sliceFrac;
  a = this.frac2mm(a);
  b = this.frac2mm(b);
  c = this.frac2mm(c);
  a = this.swizzleVec3MM(a, axCorSag);
  b = this.swizzleVec3MM(b, axCorSag);
  c = this.swizzleVec3MM(c, axCorSag);
  let denom = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  let yMult = (b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2]);
  yMult /= denom;
  let xMult = (b[1] - a[1]) * (c[2] - a[2]) - (c[1] - a[1]) * (b[2] - a[2]);
  xMult /= denom;
  let AxyzMxy = [0, 0, 0, 0, 0];
  AxyzMxy[0] = a[0];
  AxyzMxy[1] = a[1];
  AxyzMxy[2] = a[2];
  AxyzMxy[3] = xMult;
  AxyzMxy[4] = yMult;
  return AxyzMxy;
}; // xyMM2xyzMM()

// not included in public docs
// draw 2D tile
Niivue.prototype.draw2D = function (
  leftTopWidthHeight,
  axCorSag,
  customMM = NaN
) {
  let frac2mmTexture = this.volumes[0].frac2mm.slice();
  let screen = this.screenFieldOfViewExtendedMM(axCorSag);
  let mesh2ortho = mat.mat4.create();
  if (!this.opts.isSliceMM) {
    frac2mmTexture = this.volumes[0].frac2mmOrtho.slice();
    mesh2ortho = mat.mat4.clone(this.volumes[0].mm2ortho);
    screen = this.screenFieldOfViewExtendedVox(axCorSag);
  }
  let isRadiolgical =
    this.opts.isRadiologicalConvention && axCorSag < SLICE_TYPE.SAGITTAL;
  if (customMM === Infinity || customMM === -Infinity) {
    isRadiolgical = customMM !== Infinity;
    if (axCorSag === SLICE_TYPE.CORONAL) isRadiolgical = !isRadiolgical;
  } else if (this.opts.sagittalNoseLeft && axCorSag === SLICE_TYPE.SAGITTAL)
    isRadiolgical = !isRadiolgical;
  let elevation = 0;
  let azimuth = 0;
  if (axCorSag === SLICE_TYPE.SAGITTAL) {
    azimuth = isRadiolgical ? 90 : -90;
  } else if (axCorSag === SLICE_TYPE.CORONAL) {
    azimuth = isRadiolgical ? 180 : 0;
  } else {
    azimuth = isRadiolgical ? 180 : 0;
    elevation = isRadiolgical ? -90 : 90;
  }
  let gl = this.gl;
  if (leftTopWidthHeight[2] === 0 || leftTopWidthHeight[3] === 0) {
    //only one tile: stretch tile to fill whole screen.
    let pixPerMMw = gl.canvas.width / screen.fovMM[0];
    let pixPerMMh = gl.canvas.height / screen.fovMM[1];
    let pixPerMMmin = Math.min(pixPerMMw, pixPerMMh);
    let zoomW = pixPerMMw / pixPerMMmin;
    let zoomH = pixPerMMh / pixPerMMmin;
    screen.fovMM[0] *= zoomW;
    screen.fovMM[1] *= zoomH;
    let center = (screen.mnMM[0] + screen.mxMM[0]) * 0.5;
    screen.mnMM[0] = center - screen.fovMM[0] * 0.5;
    screen.mxMM[0] = center + screen.fovMM[0] * 0.5;
    center = (screen.mnMM[1] + screen.mxMM[1]) * 0.5;
    screen.mnMM[1] = center - screen.fovMM[1] * 0.5;
    screen.mxMM[1] = center + screen.fovMM[1] * 0.5;
    //screen.mnMM[0] *= zoomW;
    //screen.mxMM[0] *= zoomW;
    //screen.mnMM[1] *= zoomH;
    //screen.mxMM[1] *= zoomH;
    leftTopWidthHeight = [0, 0, gl.canvas.width, gl.canvas.height];
  }
  if (isNaN(customMM)) {
    let panXY = this.swizzleVec3MM(this.uiData.pan2Dxyzmm, axCorSag);
    let zoom = this.uiData.pan2Dxyzmm[3];
    screen.mnMM[0] -= panXY[0];
    screen.mxMM[0] -= panXY[0];
    screen.mnMM[1] -= panXY[1];
    screen.mxMM[1] -= panXY[1];
    screen.mnMM[0] /= zoom;
    screen.mxMM[0] /= zoom;
    screen.mnMM[1] /= zoom;
    screen.mxMM[1] /= zoom;
  }

  let sliceDim = 2; //axial depth is NIfTI k dimension
  if (axCorSag === SLICE_TYPE.CORONAL) sliceDim = 1; //sagittal depth is NIfTI j dimension
  if (axCorSag === SLICE_TYPE.SAGITTAL) sliceDim = 0; //sagittal depth is NIfTI i dimension
  let sliceFrac = this.scene.crosshairPos[sliceDim];
  let mm = this.frac2mm(this.scene.crosshairPos);
  if (!isNaN(customMM) && customMM !== Infinity && customMM !== -Infinity) {
    mm = this.frac2mm([0.5, 0.5, 0.5]);
    mm[sliceDim] = customMM;
    let frac = this.mm2frac(mm);
    sliceFrac = frac[sliceDim];
  }
  let sliceMM = mm[sliceDim];
  gl.clear(gl.DEPTH_BUFFER_BIT);
  let obj = this.calculateMvpMatrix2D(
    leftTopWidthHeight,
    screen.mnMM,
    screen.mxMM,
    Infinity,
    0,
    azimuth,
    elevation,
    isRadiolgical
  );
  if (customMM === Infinity || customMM === -Infinity) {
    //draw rendering
    let ltwh = leftTopWidthHeight.slice();
    this.draw3D(
      leftTopWidthHeight,
      obj.modelViewProjectionMatrix,
      obj.modelMatrix,
      obj.normalMatrix,
      azimuth,
      elevation
    );
    let tile = this.screenSlices[this.screenSlices.length - 1];
    //tile.AxyzMxy = this.xyMM2xyzMM(axCorSag, 0.5);
    tile.leftTopWidthHeight = ltwh;
    tile.axCorSag = axCorSag;
    tile.sliceFrac = Infinity; //use infinity to denote this is a rendering, not slice: not one depth
    tile.AxyzMxy = this.xyMM2xyzMM(axCorSag, sliceFrac);
    tile.leftTopMM = obj.leftTopMM;
    tile.fovMM = obj.fovMM;
    return;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  //draw the slice
  gl.disable(gl.BLEND);
  gl.depthFunc(gl.GREATER);
  gl.disable(gl.CULL_FACE); //show front and back faces
  this.sliceMMShader.use(this.gl);
  gl.uniform1f(
    this.sliceMMShader.overlayOutlineWidthLoc,
    this.overlayOutlineWidth
  );
  gl.uniform1f(
    this.sliceMMShader.overlayAlphaShaderLoc,
    this.overlayAlphaShader
  );
  gl.uniform1i(this.sliceMMShader.isAlphaClipDarkLoc, this.isAlphaClipDark);
  gl.uniform1i(
    this.sliceMMShader.backgroundMasksOverlaysLoc,
    this.backgroundMasksOverlays
  );
  gl.uniform1f(this.sliceMMShader.drawOpacityLoc, this.drawOpacity);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform1f(this.sliceMMShader.opacityLoc, this.volumes[0].opacity);
  gl.uniform1i(this.sliceMMShader.axCorSagLoc, axCorSag);
  gl.uniform1f(this.sliceMMShader.sliceLoc, sliceFrac);
  gl.uniformMatrix4fv(
    this.sliceMMShader.frac2mmLoc,
    false,
    frac2mmTexture //this.volumes[0].frac2mm
  );
  gl.uniformMatrix4fv(
    this.sliceMMShader.mvpLoc,
    false,
    obj.modelViewProjectionMatrix.slice()
  );
  gl.bindVertexArray(this.genericVAO); //set vertex attributes
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(this.unusedVAO); //set vertex attributes
  //record screenSlices to detect mouse click positions
  this.screenSlices.push({
    leftTopWidthHeight: leftTopWidthHeight,
    axCorSag: axCorSag,
    sliceFrac: sliceFrac,
    AxyzMxy: this.xyMM2xyzMM(axCorSag, sliceFrac),
    leftTopMM: obj.leftTopMM,
    screen2frac: [],
    fovMM: obj.fovMM,
  });
  if (isNaN(customMM)) {
    //draw crosshairs
    this.drawCrosshairs3D(
      true,
      1.0,
      obj.modelViewProjectionMatrix,
      true,
      this.opts.isSliceMM
    );
  }
  if (this.opts.meshThicknessOn2D > 0.0) {
    if (this.opts.meshThicknessOn2D !== Infinity)
      obj = this.calculateMvpMatrix2D(
        leftTopWidthHeight,
        screen.mnMM,
        screen.mxMM,
        this.opts.meshThicknessOn2D,
        sliceMM,
        azimuth,
        elevation,
        isRadiolgical
      );
    //we may need to transform mesh vertices to the orthogonal voxel space
    let mx = mat.mat4.clone(obj.modelViewProjectionMatrix);
    mat.mat4.multiply(mx, mx, mesh2ortho);
    this.drawMesh3D(
      true,
      1,
      mx, //obj.modelViewProjectionMatrix,
      obj.modelMatrix,
      obj.normalMatrix
    );
  }
  if (isNaN(customMM))
    //no crossbars for mosaic view
    this.drawCrosshairs3D(
      false,
      0.15,
      obj.modelViewProjectionMatrix,
      true,
      this.opts.isSliceMM
    );
  this.drawSliceOrientationText(leftTopWidthHeight, axCorSag);
  this.readyForSync = true;
}; // draw2D()
//scissor

// not included in public docs
// determine 3D model view projection matrix
Niivue.prototype.calculateMvpMatrix = function (
  unused,
  leftTopWidthHeight = [0, 0, 0, 0],
  azimuth,
  elevation
) {
  if (leftTopWidthHeight[2] === 0 || leftTopWidthHeight[3] === 0)
    //use full canvas
    leftTopWidthHeight = [0, 0, this.gl.canvas.width, this.gl.canvas.height];
  let whratio = leftTopWidthHeight[2] / leftTopWidthHeight[3];
  //let whratio = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
  //pivot from center of objects
  //let scale = this.furthestVertexFromOrigin;
  //let origin = [0,0,0];
  let scale = this.furthestFromPivot;
  let origin = this.pivot3D;
  let projectionMatrix = mat.mat4.create();
  scale = (0.8 * scale) / this.scene.volScaleMultiplier; //2.0 WebGL viewport has range of 2.0 [-1,-1]...[1,1]
  if (whratio < 1)
    //tall window: "portrait" mode, width constrains
    mat.mat4.ortho(
      projectionMatrix,
      -scale,
      scale,
      -scale / whratio,
      scale / whratio,
      scale * 0.01,
      scale * 8.0
    );
  //Wide window: "landscape" mode, height constrains
  else
    mat.mat4.ortho(
      projectionMatrix,
      -scale * whratio,
      scale * whratio,
      -scale,
      scale,
      scale * 0.01,
      scale * 8.0
    );

  const modelMatrix = mat.mat4.create();
  modelMatrix[0] = -1; //mirror X coordinate
  //push the model away from the camera so camera not inside model
  let translateVec3 = mat.vec3.fromValues(0, 0, -scale * 1.8); // to avoid clipping, >= SQRT(3)
  mat.mat4.translate(modelMatrix, modelMatrix, translateVec3);
  if (this.position)
    mat.mat4.translate(modelMatrix, modelMatrix, this.position);
  //apply elevation
  mat.mat4.rotateX(modelMatrix, modelMatrix, deg2rad(270 - elevation));
  //apply azimuth
  mat.mat4.rotateZ(modelMatrix, modelMatrix, deg2rad(azimuth - 180));

  mat.mat4.translate(modelMatrix, modelMatrix, [
    -origin[0],
    -origin[1],
    -origin[2],
  ]);

  //
  let iModelMatrix = mat.mat4.create();
  mat.mat4.invert(iModelMatrix, modelMatrix);
  let normalMatrix = mat.mat4.create();
  mat.mat4.transpose(normalMatrix, iModelMatrix);
  let modelViewProjectionMatrix = mat.mat4.create();
  mat.mat4.multiply(modelViewProjectionMatrix, projectionMatrix, modelMatrix);
  return [modelViewProjectionMatrix, modelMatrix, normalMatrix];
}; // calculateMvpMatrix()

Niivue.prototype.calculateModelMatrix = function (azimuth, elevation) {
  const modelMatrix = mat.mat4.create();
  modelMatrix[0] = -1; //mirror X coordinate
  //push the model away from the camera so camera not inside model
  //apply elevation
  mat.mat4.rotateX(modelMatrix, modelMatrix, deg2rad(270 - elevation));
  //apply azimuth
  mat.mat4.rotateZ(modelMatrix, modelMatrix, deg2rad(azimuth - 180));
  if (this.back.obliqueRAS) {
    let oblique = mat.mat4.clone(this.back.obliqueRAS);
    mat.mat4.multiply(modelMatrix, modelMatrix, oblique);
  }
  return modelMatrix;
};

// not included in public docs
// calculate the near-far direction from the camera's perspective
Niivue.prototype.calculateRayDirection = function (azimuth, elevation) {
  const modelMatrix = this.calculateModelMatrix(azimuth, elevation);
  //from NIfTI spatial coordinates (X=right, Y=anterior, Z=superior) to WebGL (screen X=right,Y=up, Z=depth)
  let projectionMatrix = mat.mat4.fromValues(
    1,
    0,
    0,
    0,
    0,
    -1,
    0,
    0,
    0,
    0,
    -1,
    0,
    0,
    0,
    0,
    1
  );
  let mvpMatrix = mat.mat4.create();
  mat.mat4.multiply(mvpMatrix, projectionMatrix, modelMatrix);
  var inv = mat.mat4.create();
  mat.mat4.invert(inv, mvpMatrix);
  var rayDir4 = mat.vec4.fromValues(0, 0, -1, 1);
  mat.vec4.transformMat4(rayDir4, rayDir4, inv);
  let rayDir = mat.vec3.fromValues(rayDir4[0], rayDir4[1], rayDir4[2]);
  mat.vec3.normalize(rayDir, rayDir);
  //defuzz, avoid divide by zero
  const tiny = 0.00005;
  if (Math.abs(rayDir[0]) < tiny) rayDir[0] = tiny;
  if (Math.abs(rayDir[1]) < tiny) rayDir[1] = tiny;
  if (Math.abs(rayDir[2]) < tiny) rayDir[2] = tiny;
  return rayDir;
}; // calculateRayDirection

// not included in public docs
Niivue.prototype.sceneExtentsMinMax = function (isSliceMM = true) {
  let mn = mat.vec3.fromValues(0, 0, 0);
  let mx = mat.vec3.fromValues(0, 0, 0);
  if (this.volumes.length > 0) {
    mn = mat.vec3.fromValues(
      this.volumeObject3D.extentsMin[0],
      this.volumeObject3D.extentsMin[1],
      this.volumeObject3D.extentsMin[2]
    );
    mx = mat.vec3.fromValues(
      this.volumeObject3D.extentsMax[0],
      this.volumeObject3D.extentsMax[1],
      this.volumeObject3D.extentsMax[2]
    );
    if (!isSliceMM) {
      mn = mat.vec3.fromValues(
        this.volumes[0].extentsMinOrtho[0],
        this.volumes[0].extentsMinOrtho[1],
        this.volumes[0].extentsMinOrtho[2]
      );
      mx = mat.vec3.fromValues(
        this.volumes[0].extentsMaxOrtho[0],
        this.volumes[0].extentsMaxOrtho[1],
        this.volumes[0].extentsMaxOrtho[2]
      );
    }
  }
  if (this.meshes.length > 0) {
    if (this.volumes.length < 1) {
      /*console.log("this.meshes");
      console.log(this.meshes);
      console.log("this.meshes.length");
      console.log(this.meshes.length);
      console.log("this.meshes[0].extentsMin");
      console.log(this.meshes[0].extentsMin);*/
      mn = mat.vec3.fromValues(
        this.meshes[0].extentsMin[0],
        this.meshes[0].extentsMin[1],
        this.meshes[0].extentsMin[2]
      );
      mx = mat.vec3.fromValues(
        this.meshes[0].extentsMax[0],
        this.meshes[0].extentsMax[1],
        this.meshes[0].extentsMax[2]
      );
    }
    for (let i = 0; i < this.meshes.length; i++) {
      let v = mat.vec3.fromValues(
        this.meshes[i].extentsMin[0],
        this.meshes[i].extentsMin[1],
        this.meshes[i].extentsMin[2]
      );
      mat.vec3.min(mn, mn, v);
      mat.vec3.max(mx, mx, v);
    }
  }
  let range = mat.vec3.create();
  mat.vec3.subtract(range, mx, mn);
  return [mn, mx, range];
};

// not included in public docs
Niivue.prototype.setPivot3D = function () {
  //compute extents of all volumes and meshes in scene
  // pivot around center of these.
  let [mn, mx] = this.sceneExtentsMinMax();
  let pivot = mat.vec3.create();
  //pivot is half way between min and max:
  mat.vec3.add(pivot, mn, mx);
  mat.vec3.scale(pivot, pivot, 0.5);
  this.pivot3D = [pivot[0], pivot[1], pivot[2]];
  //find scale of scene
  mat.vec3.subtract(pivot, mx, mn);
  this.extentsMin = mn;
  this.extentsMax = mx;
  this.furthestFromPivot = mat.vec3.length(pivot) * 0.5; //pivot is half way between the extreme vertices
}; // setPivot3D()

Niivue.prototype.getMaxVols = function () {
  if (this.volumes.length < 1) return 0;
  let maxVols = 0;
  for (let i = 0; i < this.volumes.length; i++)
    maxVols = Math.max(maxVols, this.volumes[i].nFrame4D);
  return maxVols;
};

Niivue.prototype.detectPartialllyLoaded4D = function () {
  if (this.volumes.length < 1) return false;
  for (let i = 0; i < this.volumes.length; i++)
    if (this.volumes[i].nFrame4D < this.volumes[i].hdr.dims[4]) return true;
  return false;
};

// not included in public docs
// draw graph for 4D NVImage: time across horizontal, intensity is vertical
Niivue.prototype.drawGraph = function () {
  if (this.getMaxVols() < 2) return;
  let graph = this.graph;
  let axialTop = 0;
  if (
    this.graph.autoSizeMultiplanar &&
    this.opts.sliceType === SLICE_TYPE.MULTIPLANAR
  ) {
    for (let i = 0; i < this.screenSlices.length; i++) {
      var axCorSag = this.screenSlices[i].axCorSag;
      if (axCorSag === SLICE_TYPE.AXIAL)
        axialTop = this.screenSlices[i].leftTopWidthHeight[1];
      if (axCorSag !== SLICE_TYPE.SAGITTAL) continue;
      var ltwh = this.screenSlices[i].leftTopWidthHeight.slice();
      if (ltwh[1] === axialTop) {
        graph.LTWH[0] = ltwh[0] + ltwh[2];
        graph.LTWH[1] = ltwh[1];
      } else {
        graph.LTWH[0] = ltwh[0];
        graph.LTWH[1] = ltwh[1] + ltwh[3];
      }
      graph.LTWH[2] = ltwh[2];
      graph.LTWH[3] = ltwh[2];
    }
  }
  if (graph.opacity <= 0.0 || graph.LTWH[2] <= 5 || graph.LTWH[3] <= 5) {
    return;
  }
  graph.backColor = [0.15, 0.15, 0.15, graph.opacity];
  graph.lineColor = [1, 1, 1, 1];
  if (
    this.opts.backColor[0] + this.opts.backColor[1] + this.opts.backColor[2] >
    1.5
  ) {
    graph.backColor = [0.95, 0.95, 0.95, graph.opacity];
    graph.lineColor = [0, 0, 0, 1];
  }
  graph.textColor = graph.lineColor.slice();
  graph.lineThickness = 4;
  graph.lineAlpha = 1;
  graph.lines = [];
  let vols = [];
  if (graph.vols.length < 1) {
    if (this.volumes[0] != null) vols.push(0);
  } else {
    for (let i = 0; i < graph.vols.length; i++) {
      let j = graph.vols[i];
      if (this.volumes[j] == null) continue;
      let n = this.volumes[j].nFrame4D;
      if (n < 2) continue;
      vols.push(j);
    }
  }
  if (vols.length < 1) return;
  let maxVols = this.volumes[vols[0]].nFrame4D;
  this.graph.selectedColumn = this.volumes[vols[0]].frame4D;
  if (maxVols < 2) {
    log.debug("Unable to generate a graph: Selected volume is 3D not 4D");
    return;
  }
  for (let i = 0; i < vols.length; i++) {
    graph.lines[i] = [];
    let vox = this.frac2vox(this.scene.crosshairPos);
    let v = this.volumes[vols[i]];
    let n = v.nFrame4D;
    n = Math.min(n, maxVols);
    for (let j = 0; j < n; j++) {
      let val = v.getValue(...vox, j);
      graph.lines[i].push(val);
    }
  }
  graph.lineRGB = [
    [1, 0, 0],
    [0, 0.7, 0],
    [0, 0, 1],
    [1, 1, 0],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
    [0, 0, 0],
  ];
  //find min, max, range for all lines
  let mn = graph.lines[0][0];
  let mx = graph.lines[0][0];
  for (let j = 0; j < graph.lines.length; j++)
    for (let i = 0; i < graph.lines[j].length; i++) {
      let v = graph.lines[j][i];
      mn = Math.min(v, mn);
      mx = Math.max(v, mx);
    }
  if (graph.normalizeValues && mx > mn) {
    let range = mx - mn;
    for (let j = 0; j < graph.lines.length; j++)
      for (let i = 0; i < graph.lines[j].length; i++) {
        let v = graph.lines[j][i];
        graph.lines[j][i] = (v - mn) / range;
      }
    mn = 0;
    mx = 1;
  }
  if (mn >= mx) {
    mx = mn + 1.0;
  }
  this.drawRect(graph.LTWH, graph.backColor);
  let [spacing, ticMin, ticMax] = tickSpacing(mn, mx);
  let digits = Math.max(0, -1 * Math.floor(Math.log(spacing) / Math.log(10)));
  mn = Math.min(ticMin, mn);
  mx = Math.max(ticMax, mx);
  //determine font size
  function humanize(x) {
    //drop trailing zeros from numerical string
    return x.toFixed(6).replace(/\.?0*$/, "");
  }
  let minWH = Math.min(graph.LTWH[2], graph.LTWH[3]);
  //n.b. dpr encodes retina displays
  let fntScale = 0.07 * (minWH / (this.fontMets.size * this.uiData.dpr));
  let fntSize = this.opts.textHeight * this.gl.canvas.height * fntScale;
  if (fntSize < 16) fntSize = 0;
  let maxTextWid = 0;
  let lineH = ticMin;
  //determine widest label in vertical axis
  while (fntSize > 0 && lineH <= mx) {
    let str = lineH.toFixed(digits);
    let w = this.textWidth(fntSize, str);
    maxTextWid = Math.max(w, maxTextWid);
    lineH += spacing;
  }
  let margin = 0.05;
  //frame is the entire region including labels, plot is the inner lines
  let frameWid = Math.abs(graph.LTWH[2]);
  let frameHt = Math.abs(graph.LTWH[3]);
  //plot is region where lines are drawn
  let plotLTWH = [
    graph.LTWH[0] + margin * frameWid + maxTextWid,
    graph.LTWH[1] + margin * frameHt,
    graph.LTWH[2] - maxTextWid - 2 * margin * frameWid,
    graph.LTWH[3] - fntSize - 2 * margin * frameHt,
  ];
  this.graph.LTWH = graph.LTWH;
  this.graph.plotLTWH = plotLTWH;
  this.drawRect(plotLTWH, this.opts.backColor); //this.opts.backColor
  //draw horizontal lines
  let rangeH = mx - mn;
  let scaleH = plotLTWH[3] / rangeH;
  let scaleW = plotLTWH[2] / (graph.lines[0].length - 1);
  let plotBottom = plotLTWH[1] + plotLTWH[3];
  //draw thin horizontal lines
  lineH = ticMin + 0.5 * spacing;
  let thinColor = graph.lineColor.slice();
  thinColor[3] = 0.25 * graph.lineColor[3];
  while (lineH <= mx) {
    let y = plotBottom - (lineH - mn) * scaleH;
    this.drawLine(
      [plotLTWH[0], y, plotLTWH[0] + plotLTWH[2], y],
      0.5 * graph.lineThickness,
      thinColor
    );
    lineH += spacing;
  }
  lineH = ticMin;
  //draw thick horizontal lines
  let halfThick = 0.5 * graph.lineThickness;
  while (lineH <= mx) {
    let y = plotBottom - (lineH - mn) * scaleH;
    this.drawLine(
      [
        plotLTWH[0] - halfThick,
        y,
        plotLTWH[0] + plotLTWH[2] + graph.lineThickness,
        y,
      ],
      graph.lineThickness,
      graph.lineColor
    );
    let str = lineH.toFixed(digits);
    if (fntSize > 0)
      this.drawTextLeft([plotLTWH[0] - 6, y], str, fntScale, graph.textColor);
    //this.drawTextRight([plotLTWH[0], y], str, fntScale)
    lineH += spacing;
  }
  //draw vertical lines
  let stride = 1; //e.g. how frequent are vertical lines
  while (graph.lines[0].length / stride > 20) {
    stride *= 5;
  }
  for (let i = 0; i < graph.lines[0].length; i += stride) {
    let x = i * scaleW + plotLTWH[0];
    let thick = graph.lineThickness;
    if (i % 2 === 1) {
      thick *= 0.5;
      this.drawLine(
        [x, plotLTWH[1], x, plotLTWH[1] + plotLTWH[3]],
        thick,
        thinColor
      );
    } else {
      let str = humanize(i);
      if (fntSize > 0)
        this.drawTextBelow(
          [x, 2 + plotLTWH[1] + plotLTWH[3]],
          str,
          fntScale,
          graph.textColor
        );
      this.drawLine(
        [x, plotLTWH[1], x, plotLTWH[1] + plotLTWH[3]],
        thick,
        graph.lineColor
      );
    } //this.drawTextBelow(xy, str, scale = 1);
  }
  //graph the lines for intensity across time
  for (let j = 0; j < graph.lines.length; j++) {
    let lineRGBA = [1, 0, 0, graph.lineAlpha];
    if (j < graph.lineRGB.length) {
      lineRGBA = [
        graph.lineRGB[j][0],
        graph.lineRGB[j][1],
        graph.lineRGB[j][2],
        graph.lineAlpha,
      ];
    }
    for (let i = 1; i < graph.lines[j].length; i++) {
      let x0 = (i - 1) * scaleW; //
      let x1 = i * scaleW;
      let y0 = (graph.lines[j][i - 1] - mn) * scaleH;
      let y1 = (graph.lines[j][i] - mn) * scaleH;
      //let LTWH = [plotLTWH[0]+x0, plotLTWH[1]+plotLTWH[3]-y0, plotLTWH[0]+x1, -(y1-y0)];
      let LTWH = [
        plotLTWH[0] + x0,
        plotLTWH[1] + plotLTWH[3] - y0,
        plotLTWH[0] + x1,
        plotLTWH[1] + plotLTWH[3] - y1,
      ];
      this.drawLine(LTWH, graph.lineThickness, lineRGBA);
    } //for i: each point
  } //for j: each line
  //draw vertical line indicating selected volume
  if (
    graph.selectedColumn >= 0 &&
    graph.selectedColumn < graph.lines[0].length
  ) {
    let x = graph.selectedColumn * scaleW + plotLTWH[0];
    this.drawLine(
      [x, plotLTWH[1], x, plotLTWH[1] + plotLTWH[3]],
      graph.lineThickness,
      [graph.lineRGB[3][0], graph.lineRGB[3][1], graph.lineRGB[3][2], 1]
    );
  }
  if (this.detectPartialllyLoaded4D()) {
    this.drawTextBelow(
      [plotLTWH[0] + plotLTWH[2], plotLTWH[1] + plotLTWH[3] + fntSize * 0.5],
      "...",
      fntScale,
      graph.textColor
    );
  }
}; // drawGraph()

// not included in public docs
// return boolean is 2D slice view is radiological
//n.b. ambiguous for pure sagittal views
function isRadiological(mtx) {
  let vRight = mat.vec4.fromValues(1, 0, 0, 0); //pure right vector
  let vRotated = mat.vec4.create();
  mat.vec4.transformMat4(vRotated, vRight, mtx);
  return vRotated[0];
}

// not included in public docs
function unProject(winX, winY, winZ, mvpMatrix) {
  //https://github.com/bringhurst/webgl-unproject
  let inp = mat.vec4.fromValues(winX, winY, winZ, 1.0);
  let finalMatrix = mat.mat4.clone(mvpMatrix);
  //mat.mat4.multiply(finalMatrix, model, proj);
  mat.mat4.invert(finalMatrix, finalMatrix);
  //view is leftTopWidthHeight
  /* Map to range -1 to 1 */
  inp[0] = inp[0] * 2 - 1;
  inp[1] = inp[1] * 2 - 1;
  inp[2] = inp[2] * 2 - 1;
  let out = mat.vec4.create();
  mat.vec4.transformMat4(out, inp, finalMatrix);
  if (out[3] === 0.0) return out; //error
  out[0] /= out[3];
  out[1] /= out[3];
  out[2] /= out[3];
  return out;
} // unProject()

// not included in public docs
function unpackFloatFromVec4i(val) {
  //Convert 32-bit rgba to float32
  //https://github.com/rii-mango/Papaya/blob/782a19341af77a510d674c777b6da46afb8c65f1/src/js/viewer/screensurface.js#L552
  var bitSh = [
    1.0 / (256.0 * 256.0 * 256.0),
    1.0 / (256.0 * 256.0),
    1.0 / 256.0,
    1.0,
  ];
  return (
    (val[0] * bitSh[0] +
      val[1] * bitSh[1] +
      val[2] * bitSh[2] +
      val[3] * bitSh[3]) /
    255.0
  );
} // unpackFloatFromVec4i()

// not included in public docs
Niivue.prototype.depthPicker = function (leftTopWidthHeight, mvpMatrix) {
  //use color of screen pixel to infer X,Y,Z coordinates
  if (!this.uiData.mouseDepthPicker) return;
  //start PICKING: picking shader and reading values is slow
  this.uiData.mouseDepthPicker = false;
  let gl = this.gl;
  const pixelX =
    (this.mousePos[0] * leftTopWidthHeight[2]) / leftTopWidthHeight[2];
  const pixelY =
    gl.canvas.height -
    (this.mousePos[1] * leftTopWidthHeight[3]) / leftTopWidthHeight[3] -
    1;
  const rgbaPixel = new Uint8Array(4);
  gl.readPixels(
    pixelX, // x
    pixelY, // y
    1, // width
    1, // height
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    rgbaPixel
  ); // typed array to hold result
  this.selectedObjectId = rgbaPixel[3];
  if (this.selectedObjectId === this.VOLUME_ID) {
    this.scene.crosshairPos = new Float32Array(rgbaPixel.slice(0, 3)).map(
      (x) => x / 255.0
    );
    //let mm = this.frac2mm(this.scene.crosshairPos, 0);
    //this.scene.crosshairPos = this.mm2frac(mm);
    //let mm = this.frac2mm(this.scene.crosshairPos, 0, true); //true: rendering ALWAYS in world space
    return;
  }
  let depthZ = unpackFloatFromVec4i(rgbaPixel);
  if (depthZ > 1.0) return;
  let fracX =
    (this.mousePos[0] - leftTopWidthHeight[0]) / leftTopWidthHeight[2];
  let fracY =
    (gl.canvas.height - this.mousePos[1] - leftTopWidthHeight[1]) /
    leftTopWidthHeight[3];
  //todo: check when top is not zero: leftTopWidthHeight[1]
  let mm = unProject(fracX, fracY, depthZ, mvpMatrix);
  //n.b. true as renderings are ALWAYS in MM world space. not fractional
  let frac = this.mm2frac(mm, 0, true);
  if (
    frac[0] < 0 ||
    frac[0] > 1 ||
    frac[1] < 0 ||
    frac[1] > 1 ||
    frac[2] < 0 ||
    frac[2] > 1
  )
    return;
  this.scene.crosshairPos = this.mm2frac(mm, 0, true);
}; // depthPicker()

// not included in public docs
// display 3D volume rendering of NVImage
Niivue.prototype.drawImage3D = function (mvpMatrix, azimuth, elevation) {
  if (this.volumes.length === 0) return;
  let gl = this.gl;
  const rayDir = this.calculateRayDirection(azimuth, elevation);
  let object3D = this.volumeObject3D;
  if (object3D) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT); //TH switch since we L/R flipped in calculateMvpMatrix
    //next lines optional: these textures should be bound by default
    // these lines can cause warnings, e.g. if drawTexture not used or created
    //this.gl.activeTexture(this.gl.TEXTURE0);
    //this.gl.bindTexture(this.gl.TEXTURE_3D, this.volumeTexture);
    //this.gl.activeTexture(this.gl.TEXTURE2);
    //this.gl.bindTexture(this.gl.TEXTURE_3D, this.overlayTexture);
    //this.gl.activeTexture(this.gl.TEXTURE7);
    //this.gl.bindTexture(this.gl.TEXTURE_3D, this.drawTexture);
    let shader = this.renderShader;
    if (this.uiData.mouseDepthPicker) shader = this.pickingImageShader;
    shader.use(this.gl);
    gl.uniform1i(
      shader.backgroundMasksOverlaysLoc,
      this.backgroundMasksOverlays
    );
    if (this.gradientTextureAmount > 0.0) {
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_3D, this.gradientTexture);
      let modelMatrix = this.calculateModelMatrix(azimuth, elevation);
      let iModelMatrix = mat.mat4.create();
      mat.mat4.invert(iModelMatrix, modelMatrix);
      let normalMatrix = mat.mat4.create();
      mat.mat4.transpose(normalMatrix, iModelMatrix);
      gl.uniformMatrix4fv(shader.normLoc, false, normalMatrix);
    }
    if (this.drawBitmap && this.drawBitmap.length > 8)
      gl.uniform1f(shader.drawOpacityLoc, this.drawOpacity);
    else gl.uniform1f(shader.drawOpacityLoc, 0.0);
    gl.uniformMatrix4fv(shader.mvpLoc, false, mvpMatrix);
    gl.uniformMatrix4fv(shader.mvpMatRASLoc, false, this.back.matRAS);
    gl.uniform3fv(shader.rayDirLoc, rayDir);
    gl.uniform4fv(shader.clipPlaneLoc, this.scene.clipPlane);
    gl.bindVertexArray(object3D.vao);
    gl.drawElements(object3D.mode, object3D.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(this.unusedVAO);
  }
}; // drawImage3D()

// not included in public docs
// draw cube that shows L/R, A/P, I/S directions
Niivue.prototype.drawOrientationCube = function (
  leftTopWidthHeight,
  azimuth = 0,
  elevation = 0
) {
  if (!this.opts.isOrientCube) return;
  let sz = 0.05 * Math.min(leftTopWidthHeight[2], leftTopWidthHeight[3]);
  if (sz < 5) return;
  let gl = this.gl;
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  this.orientCubeShader.use(this.gl);
  gl.bindVertexArray(this.orientCubeShaderVAO);
  let modelMatrix = mat.mat4.create();
  let projectionMatrix = mat.mat4.create();
  //ortho(out, left, right, bottom, top, near, far)
  mat.mat4.ortho(
    projectionMatrix,
    0,
    gl.canvas.width,
    0,
    gl.canvas.height,
    -10 * sz,
    10 * sz
  );
  let translateUpForColorbar = 0;
  if (leftTopWidthHeight[1] === 0)
    translateUpForColorbar = gl.canvas.height - this.effectiveCanvasHeight();
  mat.mat4.translate(modelMatrix, modelMatrix, [
    1.8 * sz + leftTopWidthHeight[0],
    translateUpForColorbar + 1.8 * sz + leftTopWidthHeight[1],
    0,
  ]);
  mat.mat4.scale(modelMatrix, modelMatrix, [sz, sz, sz]);
  //apply elevation
  mat.mat4.rotateX(modelMatrix, modelMatrix, deg2rad(270 - elevation));
  //apply azimuth
  mat.mat4.rotateZ(modelMatrix, modelMatrix, deg2rad(-azimuth));
  let modelViewProjectionMatrix = mat.mat4.create();
  mat.mat4.multiply(modelViewProjectionMatrix, projectionMatrix, modelMatrix);
  gl.uniformMatrix4fv(this.orientCubeMtxLoc, false, modelViewProjectionMatrix);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 168);
  gl.bindVertexArray(this.unusedVAO);
  this.gl.disable(this.gl.CULL_FACE);
}; // drawOrientationCube()

Niivue.prototype.createOnLocationChange = function (axCorSag = NaN) {
  //first: provide a string representation
  let [mn, mx, range] = this.sceneExtentsMinMax(true);
  let fov = Math.max(Math.max(range[0], range[1]), range[2]);
  function dynamicDecimals(flt) {
    return Math.max(0.0, -Math.ceil(Math.log10(Math.abs(flt))));
  }
  //dynamic decimal places: fov>100->0, fov>10->1, fov>1->2
  let deci = dynamicDecimals(fov * 0.001);
  let mm = this.frac2mm(this.scene.crosshairPos, 0, true);
  function flt2str(flt, decimals = 0) {
    return parseFloat(flt.toFixed(decimals));
  }
  let str =
    flt2str(mm[0], deci) +
    "×" +
    flt2str(mm[1], deci) +
    "×" +
    flt2str(mm[2], deci);
  if (this.volumes.length > 0 && this.volumes[0].nFrame4D > 0)
    str += "×" + flt2str(this.volumes[0].frame4D);
  //voxel based layer intensity
  if (this.volumes.length > 0) {
    let valStr = " = ";
    for (let i = 0; i < this.volumes.length; i++) {
      let vox = this.volumes[i].mm2vox(mm);
      let flt = this.volumes[i].getValue(...vox, this.volumes[i].frame4D);
      deci = 3;
      if (this.volumes[i].colormapLabel.hasOwnProperty("labels")) {
        let v = Math.round(flt);
        if (v >= 0 && v < this.volumes[i].colormapLabel.labels.length)
          valStr += this.volumes[i].colormapLabel.labels[v];
        else valStr += "undefined(" + flt2str(flt, deci) + ")";
      } else valStr += flt2str(flt, deci);
      valStr += "   ";
    }
    str += valStr;
    //drawingBitmap
    let dims = this.back.dimsRAS;
    let nv = dims[1] * dims[2] * dims[3];
    if (this.drawBitmap && this.drawBitmap.length === nv) {
      let vox = this.frac2vox(this.scene.crosshairPos);
      let vx = vox[0] + vox[1] * dims[1] + vox[2] * dims[1] * dims[2];
      //str += this.drawBitmap[vx].toString();
      str += " " + this.drawLut.labels[this.drawBitmap[vx]];
    }
  }

  let msg = {
    mm: this.frac2mm(this.scene.crosshairPos, 0, true),
    axCorSag: axCorSag,
    vox: this.frac2vox(this.scene.crosshairPos),
    frac: this.scene.crosshairPos,
    xy: [this.mousePos[0], this.mousePos[1]],
    values: this.volumes.map((v) => {
      let mm = this.frac2mm(this.scene.crosshairPos, 0, true);
      let vox = v.mm2vox(mm); //e.mm2vox
      let val = v.getValue(...vox, v.frame4D);
      return { name: v.name, value: val, id: v.id, mm: mm, vox: vox };
    }),
    string: str,
  };
  this.onLocationChange(msg);
};

// not included in public docs
Niivue.prototype.draw3D = function (
  leftTopWidthHeight = [0, 0, 0, 0],
  mvpMatrix = null,
  modelMatrix,
  normalMatrix,
  azimuth = null,
  elevation
) {
  let isMosaic = azimuth !== null;
  this.setPivot3D();
  if (!isMosaic) {
    azimuth = this.scene.renderAzimuth;
    elevation = this.scene.renderElevation;
  }
  let gl = this.gl;
  if (mvpMatrix === null)
    [mvpMatrix, modelMatrix, normalMatrix] = this.calculateMvpMatrix(
      null,
      leftTopWidthHeight,
      azimuth,
      elevation
    );
  if (leftTopWidthHeight[2] === 0 || leftTopWidthHeight[3] === 0) {
    //use full canvas
    leftTopWidthHeight = [0, 0, gl.canvas.width, gl.canvas.height];
    this.screenSlices.push({
      leftTopWidthHeight: leftTopWidthHeight,
      axCorSag: SLICE_TYPE.RENDER,
      sliceFrac: 0,
      AxyzMxy: [],
      leftTopMM: [],
      fovMM: [isRadiological(modelMatrix), 0],
    });
  } else {
    this.screenSlices.push({
      leftTopWidthHeight: leftTopWidthHeight.slice(),
      axCorSag: SLICE_TYPE.RENDER,
      sliceFrac: 0,
      AxyzMxy: [],
      leftTopMM: [],
      fovMM: [isRadiological(modelMatrix), 0],
    });
    leftTopWidthHeight[1] =
      gl.canvas.height - leftTopWidthHeight[3] - leftTopWidthHeight[1];
  }
  gl.viewport(
    leftTopWidthHeight[0],
    leftTopWidthHeight[1],
    leftTopWidthHeight[2],
    leftTopWidthHeight[3]
  );
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.ALWAYS);
  gl.clearDepth(0.0);
  this.updateInterpolation(0, true); // force background interpolation
  if (this.volumes.length > 0) this.drawImage3D(mvpMatrix, azimuth, elevation);
  this.updateInterpolation(0); //use default interpolation for 2D slices
  if (!isMosaic) this.drawCrosshairs3D(true, 1.0, mvpMatrix);
  this.drawMesh3D(true, 1.0, mvpMatrix, modelMatrix, normalMatrix);
  if (this.uiData.mouseDepthPicker) {
    this.depthPicker(leftTopWidthHeight, mvpMatrix, true);
    this.createOnLocationChange();
    //redraw with render shader
    this.draw3D(
      leftTopWidthHeight,
      mvpMatrix,
      modelMatrix,
      normalMatrix,
      azimuth,
      elevation
    );
    return;
  }
  if (this.opts.meshXRay > 0.0)
    this.drawMesh3D(
      false,
      this.opts.meshXRay,
      mvpMatrix,
      modelMatrix,
      normalMatrix
    );
  if (!isMosaic) this.drawCrosshairs3D(false, 0.15, mvpMatrix);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  this.drawOrientationCube(leftTopWidthHeight, azimuth, elevation);
  let posString =
    "azimuth: " +
    this.scene.renderAzimuth.toFixed(0) +
    " elevation: " +
    this.scene.renderElevation.toFixed(0);
  //this.drawGraph();
  //bus.$emit('crosshair-pos-change', posString);
  this.readyForSync = true;
  this.sync();
  return posString;
}; // draw3D()

// not included in public docs
// create 3D rendering of NVMesh on canvas
Niivue.prototype.drawMesh3D = function (
  isDepthTest = true,
  alpha = 1.0,
  m,
  modelMtx,
  normMtx
) {
  if (this.meshes.length < 1) return;
  let gl = this.gl;
  //let m, modelMtx, normMtx;
  if (!m)
    [m, modelMtx, normMtx] = this.calculateMvpMatrix(
      this.volumeObject3D,
      this.scene.renderAzimuth,
      this.scene.renderElevation
    );
  gl.enable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.disable(gl.BLEND);
  gl.depthFunc(gl.GREATER);

  if (isDepthTest) {
    gl.disable(gl.BLEND);
    gl.depthFunc(gl.GREATER);
  } else {
    gl.enable(gl.BLEND);
    gl.depthFunc(gl.ALWAYS);
  }
  gl.disable(gl.CULL_FACE); //show front and back faces
  //Draw the mesh
  let shader = this.meshShaders[0];
  //this.meshShaderIndex
  let hasFibers = false;
  for (let i = 0; i < this.meshes.length; i++) {
    shader = this.meshShaders[this.meshes[i].meshShaderIndex].shader;
    if (this.uiData.mouseDepthPicker) shader = this.pickingMeshShader;
    shader.use(this.gl); // set Shader
    //set shader uniforms
    gl.uniformMatrix4fv(shader.mvpLoc, false, m);
    //gl.uniformMatrix4fv(shader.uniforms["modelMtx"], false, modelMtx);
    //gl.uniformMatrix4fv(shader.uniforms["normMtx"], false, normMtx);
    //gl.uniform1f(shader.uniforms["opacity"], alpha);
    gl.uniformMatrix4fv(shader.normLoc, false, normMtx);
    gl.uniform1f(shader.opacityLoc, alpha);
    if (this.meshes[i].indexCount < 3) continue;
    if (this.meshes[i].offsetPt0) {
      hasFibers = true;
      continue;
    }
    if (shader.isMatcap) {
      //texture slot 6 used by other functions, so explicitly switch on
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, this.matCapTexture);
    }
    gl.bindVertexArray(this.meshes[i].vao);
    gl.drawElements(
      gl.TRIANGLES,
      this.meshes[i].indexCount,
      gl.UNSIGNED_INT,
      0
    );
    gl.bindVertexArray(this.unusedVAO);
  }
  //draw fibers
  if (!hasFibers) {
    gl.enable(gl.BLEND);
    gl.depthFunc(gl.ALWAYS);
    return;
  }
  shader = this.fiberShader;
  shader.use(this.gl);
  gl.uniformMatrix4fv(shader.mvpLoc, false, m);
  gl.uniform1f(shader.uniforms["opacity"], alpha);
  for (let i = 0; i < this.meshes.length; i++) {
    if (this.meshes[i].indexCount < 3) continue;
    if (!this.meshes[i].offsetPt0) continue;
    gl.bindVertexArray(this.meshes[i].vao);
    gl.drawElements(
      gl.LINE_STRIP,
      this.meshes[i].indexCount,
      gl.UNSIGNED_INT,
      0
    );
    gl.bindVertexArray(this.unusedVAO);
  }
  gl.enable(gl.BLEND);
  gl.depthFunc(gl.ALWAYS);
  this.readyForSync = true;
}; //drawMesh3D()

// not included in public docs
Niivue.prototype.drawCrosshairs3D = function (
  isDepthTest = true,
  alpha = 1.0,
  mvpMtx = null,
  is2DView = false,
  isSliceMM = true
) {
  if (!this.opts.show3Dcrosshair && !is2DView) return;
  if (this.opts.crosshairWidth <= 0.0 && is2DView) return;
  let gl = this.gl;
  let mm = this.frac2mm(this.scene.crosshairPos, 0, isSliceMM);
  // generate our crosshairs for the base volume
  if (
    this.crosshairs3D === null ||
    this.crosshairs3D.mm[0] !== mm[0] ||
    this.crosshairs3D.mm[1] !== mm[1] ||
    this.crosshairs3D.mm[2] !== mm[2]
  ) {
    if (this.crosshairs3D !== null) {
      gl.deleteBuffer(this.crosshairs3D.indexBuffer); //TODO: handle in nvimage.js: create once, update with bufferSubData
      gl.deleteBuffer(this.crosshairs3D.vertexBuffer); //TODO: handle in nvimage.js: create once, update with bufferSubData
    }
    let [mn, mx, range] = this.sceneExtentsMinMax(isSliceMM);
    let radius = 1;
    if (this.volumes.length > 0)
      radius =
        0.5 *
        Math.min(
          Math.min(this.back.pixDims[1], this.back.pixDims[2]),
          this.back.pixDims[3]
        );
    else if (range[0] < 50 || range[0] > 1000) radius = range[0] * 0.02; //2% of first dimension
    radius *= this.opts.crosshairWidth;
    this.crosshairs3D = NiivueObject3D.generateCrosshairs(
      this.gl,
      1,
      mm,
      mn,
      mx,
      radius
    );
    this.crosshairs3D.mm = mm;
  }
  let crosshairsShader = this.surfaceShader;
  crosshairsShader.use(this.gl);
  let modelMtx, normMtx;
  // eslint-disable-next-line no-unused-vars
  if (mvpMtx == null)
    [mvpMtx, modelMtx, normMtx] = this.calculateMvpMatrix(
      this.crosshairs3D,
      this.scene.renderAzimuth,
      this.scene.renderElevation
    );
  gl.uniformMatrix4fv(crosshairsShader.mvpLoc, false, mvpMtx);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.crosshairs3D.indexBuffer);
  gl.enable(gl.DEPTH_TEST);
  let color = [...this.opts.crosshairColor];
  if (isDepthTest) {
    gl.disable(gl.BLEND);
    //gl.depthFunc(gl.LESS); //pass if LESS than incoming value
    gl.depthFunc(gl.GREATER);
  } else {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthFunc(gl.ALWAYS);
  }
  color[3] = alpha;
  gl.uniform4fv(crosshairsShader.colorLoc, color);
  gl.bindVertexArray(this.crosshairs3D.vao);
  gl.drawElements(
    gl.TRIANGLES,
    this.crosshairs3D.indexCount,
    gl.UNSIGNED_INT, //gl.UNSIGNED_SHORT,
    0
  );
  gl.bindVertexArray(this.unusedVAO); // https://stackoverflow.com/questions/43904396/are-we-not-allowed-to-bind-gl-array-buffer-and-vertex-attrib-array-to-0-in-webgl
}; //drawCrosshairs3D()

// not included in public docs
Niivue.prototype.mm2frac = function (mm, volIdx = 0, isForceSliceMM = false) {
  //given mm, return volume fraction
  if (this.volumes.length < 1) {
    let frac = [0.1, 0.5, 0.5];
    let [mn, mx, range] = this.sceneExtentsMinMax();
    frac[0] = (mm[0] - mn[0]) / range[0];
    frac[1] = (mm[1] - mn[1]) / range[1];
    frac[2] = (mm[2] - mn[2]) / range[2];
    if (!isFinite(frac)) {
      if (!isFinite(frac[0])) frac[0] = 0.5;
      if (!isFinite(frac[1])) frac[1] = 0.5;
      if (!isFinite(frac[2])) frac[2] = 0.5;
      if (this.meshes.length < 1)
        console.error("mm2frac() not finite: objects not (yet) loaded.");
    }
    return frac;
  }
  //convert from object space in millimeters to normalized texture space XYZ= [0..1, 0..1 ,0..1]
  let mm4 = mat.vec4.fromValues(mm[0], mm[1], mm[2], 1);
  let d = this.volumes[volIdx].dimsRAS;
  let frac = [0, 0, 0];
  if (typeof d === "undefined") {
    return frac;
  }
  if (!isForceSliceMM && !this.opts.isSliceMM) {
    let xform = mat.mat4.clone(this.volumes[volIdx].frac2mmOrtho);
    mat.mat4.invert(xform, xform);
    mat.vec4.transformMat4(mm4, mm4, xform);
    frac[0] = mm4[0];
    frac[1] = mm4[1];
    frac[2] = mm4[2];
    return frac;
  }
  if (d[1] < 1 || d[2] < 1 || d[3] < 1) return frac;
  let sform = mat.mat4.clone(this.volumes[volIdx].matRAS);
  mat.mat4.invert(sform, sform);
  mat.mat4.transpose(sform, sform);
  mat.vec4.transformMat4(mm4, mm4, sform);
  frac[0] = (mm4[0] + 0.5) / d[1];
  frac[1] = (mm4[1] + 0.5) / d[2];
  frac[2] = (mm4[2] + 0.5) / d[3];
  return frac;
}; // mm2frac()

// not included in public docs
Niivue.prototype.vox2frac = function (vox, volIdx = 0) {
  //convert from  0-index voxel space [0..dim[1]-1, 0..dim[2]-1, 0..dim[3]-1] to normalized texture space XYZ= [0..1, 0..1 ,0..1]
  //consider dimension with 3 voxels, the voxel centers are at 0.25, 0.5, 0.75 corresponding to 0,1,2
  let frac = [
    (vox[0] + 0.5) / this.volumes[volIdx].dimsRAS[1],
    (vox[1] + 0.5) / this.volumes[volIdx].dimsRAS[2],
    (vox[2] + 0.5) / this.volumes[volIdx].dimsRAS[3],
  ];
  return frac;
}; // vox2frac()

// not included in public docs
Niivue.prototype.frac2vox = function (frac, volIdx = 0) {
  //convert from normalized texture space XYZ= [0..1, 0..1 ,0..1] to 0-index voxel space [0..dim[1]-1, 0..dim[2]-1, 0..dim[3]-1]
  //consider dimension with 3 voxels, the voxel centers are at 0.25, 0.5, 0.75 corresponding to 0,1,2
  if (this.volumes.length <= volIdx) return [0, 0, 0];
  let vox = [
    Math.round(frac[0] * this.volumes[volIdx].dims[1] - 0.5), // dims == RAS
    Math.round(frac[1] * this.volumes[volIdx].dims[2] - 0.5), // dims == RAS
    Math.round(frac[2] * this.volumes[volIdx].dims[3] - 0.5), // dims == RAS
  ];
  return vox;
}; // frac2vox()

/**
 * move crosshair a fixed number of voxels (not mm)
 * @param {number} x translate left (-) or right (+)
 * @param {number} y translate posterior (-) or +anterior (+)
 * @param {number} z translate inferior (-) or superior (+)
 * @see {@link https://niivue.github.io/niivue/features/draw2.html|live demo usage}
 * @example niivue.moveCrosshairInVox(1, 0, 0)
 */
Niivue.prototype.moveCrosshairInVox = function (x, y, z) {
  let vox = this.frac2vox(this.scene.crosshairPos);
  vox[0] += x;
  vox[1] += y;
  vox[2] += z;
  this.scene.crosshairPos = this.vox2frac(vox);
  this.createOnLocationChange();
  this.drawScene();
}; // moveCrosshairInVox()

// not included in public docs
Niivue.prototype.frac2mm = function (frac, volIdx = 0, isForceSliceMM = false) {
  let pos = mat.vec4.fromValues(frac[0], frac[1], frac[2], 1);
  if (this.volumes.length > 0) {
    if (isForceSliceMM || this.opts.isSliceMM)
      mat.vec4.transformMat4(pos, pos, this.volumes[volIdx].frac2mm);
    else mat.vec4.transformMat4(pos, pos, this.volumes[volIdx].frac2mmOrtho);
  } else {
    let [mn, mx] = this.sceneExtentsMinMax();
    const lerp = (x, y, a) => x * (1 - a) + y * a;
    pos[0] = lerp(mn[0], mx[0], frac[0]);
    pos[1] = lerp(mn[1], mx[1], frac[1]);
    pos[2] = lerp(mn[2], mx[2], frac[2]);
  }
  return pos;
}; // frac2mm()

// not included in public docs
Niivue.prototype.screenXY2TextureFrac = function (
  x,
  y,
  i,
  restrict0to1 = true
) {
  let texFrac = [-1, -1, -1]; //texture 0..1 so -1 is out of bounds
  var axCorSag = this.screenSlices[i].axCorSag;
  if (axCorSag > SLICE_TYPE.SAGITTAL) return texFrac;
  var ltwh = this.screenSlices[i].leftTopWidthHeight.slice();
  let isMirror = false;
  if (ltwh[2] < 0) {
    isMirror = true;
    ltwh[0] += ltwh[2];
    ltwh[2] = -ltwh[2];
  }
  var fracX = (x - ltwh[0]) / ltwh[2];
  if (isMirror) fracX = 1.0 - fracX;
  var fracY = 1.0 - (y - ltwh[1]) / ltwh[3];
  if (fracX < 0.0 || fracX > 1.0 || fracY < 0.0 || fracY > 1.0) return texFrac;
  if (this.screenSlices[i].AxyzMxy.length < 4) return texFrac;
  let xyzMM = [0, 0, 0];
  xyzMM[0] =
    this.screenSlices[i].leftTopMM[0] + fracX * this.screenSlices[i].fovMM[0];
  xyzMM[1] =
    this.screenSlices[i].leftTopMM[1] + fracY * this.screenSlices[i].fovMM[1];
  // let xyz = mat.vec3.fromValues(30, 30, 0);
  let v = this.screenSlices[i].AxyzMxy;
  xyzMM[2] = v[2] + v[4] * (xyzMM[1] - v[1]) - v[3] * (xyzMM[0] - v[0]);
  if (axCorSag === SLICE_TYPE.CORONAL) xyzMM = swizzleVec3(xyzMM, [0, 2, 1]); //screen RSA to NIfTI RAS
  if (axCorSag === SLICE_TYPE.SAGITTAL) xyzMM = swizzleVec3(xyzMM, [2, 0, 1]); //screen ASR to NIfTI RAS
  let xyz = this.mm2frac(xyzMM);

  if (restrict0to1) {
    if (
      xyz[0] < 0 ||
      xyz[0] > 1 ||
      xyz[1] < 0 ||
      xyz[1] > 1 ||
      xyz[2] < 0 ||
      xyz[2] > 1
    )
      return texFrac;
  }
  texFrac[0] = xyz[0];
  texFrac[1] = xyz[1];
  texFrac[2] = xyz[2];
  return texFrac;
}; // screenXY2TextureFrac()

// not included in public docs
Niivue.prototype.canvasPos2frac = function (canvasPos) {
  for (let i = 0; i < this.screenSlices.length; i++) {
    let texFrac = this.screenXY2TextureFrac(canvasPos[0], canvasPos[1], i);
    if (texFrac[0] >= 0) return texFrac;
  }
  return [-1, -1, -1]; //texture 0..1 so -1 is out of bounds
}; // canvasPos2frac()

// not included in public docs
// note: we also have a "sliceScale" method, which could be confusing
Niivue.prototype.scaleSlice = function (
  w,
  h,
  widthPadPixels = 0,
  heightPadPixels = 0
) {
  let canvasW = this.canvas.width - widthPadPixels;
  let canvasH = this.effectiveCanvasHeight() - heightPadPixels;
  let scalePix = canvasW / w;
  if (h * scalePix > canvasH) scalePix = canvasH / h;
  //canvas space is 0,0...w,h with origin at upper left
  let wPix = w * scalePix;
  let hPix = h * scalePix;
  let leftTopWidthHeight = [
    (canvasW - wPix) * 0.5,
    (canvasH - hPix) * 0.5,
    wPix,
    hPix,
  ];
  return leftTopWidthHeight;
}; // scaleSlice()

// not included in public docs
// display 2D image to defer loading of (slow) 3D data
Niivue.prototype.drawThumbnail = function () {
  this.bmpShader.use(this.gl);
  this.gl.uniform2f(
    this.bmpShader.uniforms["canvasWidthHeight"],
    this.gl.canvas.width,
    this.gl.canvas.height
  );
  let h = this.gl.canvas.height;
  let w = this.gl.canvas.height * this.bmpTextureWH;
  if (w > this.gl.canvas.width) {
    //constrained by width
    h = this.gl.canvas.width / this.bmpTextureWH;
    w = this.gl.canvas.width;
  }
  this.gl.uniform4f(this.bmpShader.uniforms["leftTopWidthHeight"], 0, 0, w, h);
  this.gl.bindVertexArray(this.genericVAO);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  this.gl.bindVertexArray(this.unusedVAO); //switch off to avoid tampering with settings
}; // drawThumbnail()

// not included in public docs
// draw line (can be diagonal)
// unless Alpha is > 0, default color is opts.crosshairColor
Niivue.prototype.drawLine = function (
  startXYendXY,
  thickness = 1,
  lineColor = [1, 0, 0, -1]
) {
  this.gl.bindVertexArray(this.genericVAO);
  this.lineShader.use(this.gl);
  if (lineColor[3] < 0) lineColor = this.opts.crosshairColor;
  this.gl.uniform4fv(this.lineShader.lineColorLoc, lineColor);
  this.gl.uniform2fv(this.lineShader.canvasWidthHeightLoc, [
    this.gl.canvas.width,
    this.gl.canvas.height,
  ]);
  //draw Line
  this.gl.uniform1f(this.lineShader.thicknessLoc, thickness);
  this.gl.uniform4fv(this.lineShader.startXYendXYLoc, startXYendXY);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  this.gl.bindVertexArray(this.unusedVAO); //set vertex attributes
}; // drawLine()

Niivue.prototype.drawGraphLine = function (
  LTRB,
  color = [1, 0, 0, 0.5],
  thickness = 2
) {
  this.drawLine(LTRB, thickness, color);
}; // drawGraphLine()

// not included in public docs
Niivue.prototype.drawCrossLinesMM = function (
  sliceIndex,
  axCorSag,
  axiMM,
  corMM,
  sagMM
) {
  if (sliceIndex < 0 || this.screenSlices.length <= sliceIndex) return;
  let tile = this.screenSlices[sliceIndex];
  let sliceFrac = tile.sliceFrac;
  let isRender = sliceFrac === Infinity;
  if (isRender)
    log.warn("Rendering approximate cross lines in world view mode");
  if (sliceFrac === Infinity) sliceFrac = 0.5;
  let linesH = corMM.slice();
  let linesV = sagMM.slice();
  let thick = Math.max(1, this.opts.crosshairWidth);
  if (axCorSag === SLICE_TYPE.CORONAL) linesH = axiMM.slice();
  if (axCorSag === SLICE_TYPE.SAGITTAL) {
    linesH = axiMM.slice();
    linesV = corMM.slice();
  }
  function mm2screen(mm) {
    let screenXY = [0, 0];
    screenXY[0] =
      tile.leftTopWidthHeight[0] +
      ((mm[0] - tile.leftTopMM[0]) / tile.fovMM[0]) *
        tile.leftTopWidthHeight[2];
    screenXY[1] =
      tile.leftTopWidthHeight[1] +
      tile.leftTopWidthHeight[3] -
      ((mm[1] - tile.leftTopMM[1]) / tile.fovMM[1]) *
        tile.leftTopWidthHeight[3];
    return screenXY;
  }
  if (linesH.length > 0 && axCorSag === 0) {
    let fracZ = sliceFrac;
    let dimV = 1;
    for (let i = 0; i < linesH.length; i++) {
      let mmV = this.frac2mm([0.5, 0.5, 0.5]);
      mmV[dimV] = linesH[i];
      let fracY = this.mm2frac(mmV);
      fracY = fracY[dimV];
      let left = this.frac2mm([0.0, fracY, fracZ]);
      left = swizzleVec3(left, [0, 1, 2]);
      let right = this.frac2mm([1.0, fracY, fracZ]);
      right = swizzleVec3(right, [0, 1, 2]);
      left = mm2screen(left);
      right = mm2screen(right);
      this.drawLine([left[0], left[1], right[0], right[1]], thick);
    }
  }
  if (linesH.length > 0 && axCorSag === 1) {
    let fracH = sliceFrac;
    let dimV = 2;
    for (let i = 0; i < linesH.length; i++) {
      let mmV = this.frac2mm([0.5, 0.5, 0.5]);
      mmV[dimV] = linesH[i];
      let fracV = this.mm2frac(mmV);
      fracV = fracV[dimV];
      let left = this.frac2mm([0.0, fracH, fracV]);
      left = swizzleVec3(left, [0, 2, 1]);
      let right = this.frac2mm([1.0, fracH, fracV]);
      right = swizzleVec3(right, [0, 2, 1]);
      left = mm2screen(left);
      right = mm2screen(right);
      this.drawLine([left[0], left[1], right[0], right[1]], thick);
    }
  }
  if (linesH.length > 0 && axCorSag === 2) {
    let fracX = sliceFrac;
    let dimV = 2;
    for (let i = 0; i < linesH.length; i++) {
      let mmV = this.frac2mm([0.5, 0.5, 0.5]);
      mmV[dimV] = linesH[i];
      let fracZ = this.mm2frac(mmV);
      fracZ = fracZ[dimV];
      let left = this.frac2mm([fracX, 0, fracZ]);
      left = swizzleVec3(left, [1, 2, 0]);
      let right = this.frac2mm([fracX, 1, fracZ]);
      right = swizzleVec3(right, [1, 2, 0]);
      left = mm2screen(left);
      right = mm2screen(right);
      this.drawLine([left[0], left[1], right[0], right[1]], thick);
    }
  }
  if (linesV.length > 0 && axCorSag === 0) {
    let fracZ = sliceFrac;
    let dimH = 0;
    for (let i = 0; i < linesV.length; i++) {
      let mm = this.frac2mm([0.5, 0.5, 0.5]);
      mm[dimH] = linesV[i];
      let frac = this.mm2frac(mm);
      frac = frac[dimH];
      let left = this.frac2mm([frac, 0, fracZ]);
      left = swizzleVec3(left, [0, 1, 2]);
      let right = this.frac2mm([frac, 1, fracZ]);
      right = swizzleVec3(right, [0, 1, 2]);
      left = mm2screen(left);
      right = mm2screen(right);
      this.drawLine([left[0], left[1], right[0], right[1]], thick);
    }
  } //if vertical lines
  if (linesV.length > 0 && axCorSag === 1) {
    let fracY = sliceFrac;
    let dimH = 0;
    for (let i = 0; i < linesV.length; i++) {
      let mm = this.frac2mm([0.5, 0.5, 0.5]);
      mm[dimH] = linesV[i];
      let frac = this.mm2frac(mm);
      frac = frac[dimH];
      let left = this.frac2mm([frac, fracY, 0]);
      left = swizzleVec3(left, [0, 2, 1]);
      let right = this.frac2mm([frac, fracY, 1]);
      right = swizzleVec3(right, [0, 2, 1]);
      left = mm2screen(left);
      right = mm2screen(right);
      this.drawLine([left[0], left[1], right[0], right[1]], thick);
    }
  } //if vertical lines
  if (linesV.length > 0 && axCorSag === 2) {
    let fracX = sliceFrac;
    let dimH = 1;
    for (let i = 0; i < linesV.length; i++) {
      let mm = this.frac2mm([0.5, 0.5, 0.5]);
      mm[dimH] = linesV[i];
      let frac = this.mm2frac(mm);
      frac = frac[dimH];
      let left = this.frac2mm([fracX, frac, 0]);
      left = swizzleVec3(left, [1, 2, 0]);
      let right = this.frac2mm([fracX, frac, 1]);
      right = swizzleVec3(right, [1, 2, 0]);
      left = mm2screen(left);
      right = mm2screen(right);
      this.drawLine([left[0], left[1], right[0], right[1]], thick);
    }
  } //if vertical lines
}; // drawCrossLinesMM()

// not included in public docs
Niivue.prototype.drawCrossLines = function (
  sliceIndex,
  axCorSag,
  axiMM,
  corMM,
  sagMM
) {
  if (sliceIndex < 0 || this.screenSlices.length <= sliceIndex) return;
  if (this.opts.isSliceMM)
    return this.drawCrossLinesMM(sliceIndex, axCorSag, axiMM, corMM, sagMM);
  if (this.screenSlices[sliceIndex].sliceFrac === Infinity)
    //render views always world space
    return this.drawCrossLinesMM(sliceIndex, axCorSag, axiMM, corMM, sagMM);
  let tile = this.screenSlices[sliceIndex];
  let linesH = corMM.slice();
  let linesV = sagMM.slice();

  if (axCorSag === SLICE_TYPE.CORONAL) linesH = axiMM.slice();
  if (axCorSag === SLICE_TYPE.SAGITTAL) {
    linesH = axiMM.slice();
    linesV = corMM.slice();
  }
  if (linesH.length > 0) {
    //draw horizontal lines
    let LTWH = tile.leftTopWidthHeight.slice();
    let sliceDim = 2; //vertical axis is Zmm
    if (axCorSag === SLICE_TYPE.AXIAL) sliceDim = 1; //vertical axis is Ymm
    let mm = this.frac2mm([0.5, 0.5, 0.5]);
    for (let i = 0; i < linesH.length; i++) {
      mm[sliceDim] = linesH[i];
      let frac = this.mm2frac(mm);
      this.drawRect([
        LTWH[0],
        LTWH[1] + LTWH[3] - frac[sliceDim] * LTWH[3],
        LTWH[2],
        1,
      ]);
    }
  } //if horizontal lines
  if (linesV.length > 0) {
    //draw vertical lines
    let LTWH = tile.leftTopWidthHeight.slice();
    let isRadiolgical = tile.fovMM[0] < 0;
    let sliceDim = 0; //vertical lines on axial/coronal are L/R axis
    if (axCorSag === SLICE_TYPE.SAGITTAL) sliceDim = 1; //vertical lines on sagittal are A/P
    let mm = this.frac2mm([0.5, 0.5, 0.5]);
    for (let i = 0; i < linesV.length; i++) {
      mm[sliceDim] = linesV[i];
      let frac = this.mm2frac(mm);
      if (isRadiolgical)
        this.drawRect([
          LTWH[0] + (LTWH[2] - frac[sliceDim] * LTWH[2]),
          LTWH[1],
          1,
          LTWH[3],
        ]);
      else
        this.drawRect([
          LTWH[0] + frac[sliceDim] * LTWH[2],
          LTWH[1],
          1,
          LTWH[3],
        ]);
    }
  } //if vertical lines
}; // drawCrossLines()

/**
 * display a lightbox or montage view
 * @param {string} mosaicStr specifies orientation (A,C,S) and location of slices.
 * @example niivue.setSliceMosaicString("A -10 0 20");
 * @see {@link https://niivue.github.io/niivue/features/mosaics.html|live demo usage}
 */
Niivue.prototype.drawMosaic = function (mosaicStr) {
  if (this.volumes.length === 0) {
    log.debug("Unable to draw mosaic until voxel-based image is loaded");
    return;
  }
  this.screenSlices = [];
  //render always in world space
  let fovRenderMM = this.screenFieldOfViewMM(SLICE_TYPE.AXIAL, true);
  //2d slices might be in world space or voxel space
  let fovSliceMM = this.screenFieldOfViewMM(SLICE_TYPE.AXIAL);
  //fovRender and fovSlice will only be different if scans are oblique and shown in voxel space
  //let mosaicStr = 'A -52 -12 C 8 ; S 28 48 66'

  mosaicStr = mosaicStr.replaceAll(";", " ;").trim();
  let axiMM = [];
  let corMM = [];
  let sagMM = [];
  let items = mosaicStr.split(/\s+/);
  let scale = 1.0; //e.g. if 1.0 1mm per pixel
  let labelSize = this.opts.textHeight;
  let isCrossLinesUsed = false;
  for (let pass = 0; pass < 2; pass++) {
    //two pass: first calculate dimensions to determine scale, second draw items
    let isRender = false;
    let isCrossLines = false;
    isRender = false;

    let rowHt = 0;
    let left = 0;
    let top = 0;
    let mxRowWid = 0;
    let isLabel = false;
    let axCorSag = SLICE_TYPE.AXIAL;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      if (item.includes("X")) {
        isCrossLines = true;
        continue;
      }
      if (item.includes("L")) {
        isLabel = !item.includes("-");
        continue;
      }
      if (item.includes("V") || item.includes("H")) {
        i++; //skip numeric value for vertical/horizontal overlap
        continue;
      }
      if (item.includes("A")) axCorSag = SLICE_TYPE.AXIAL;
      if (item.includes("C")) axCorSag = SLICE_TYPE.CORONAL;
      if (item.includes("S")) axCorSag = SLICE_TYPE.SAGITTAL;
      if (item.includes("R")) isRender = true;
      if (item.includes(";")) {
        //EOLN
        top += rowHt;
        mxRowWid = Math.max(mxRowWid, left);
        rowHt = 0;
        left = 0;
      }
      let sliceMM = parseFloat(item, NaN);
      if (isNaN(sliceMM)) continue;
      let w = 0;
      let h = 0;
      let fov = fovSliceMM;
      if (isRender) fov = fovRenderMM;
      //draw the slice
      if (axCorSag === SLICE_TYPE.SAGITTAL) w = fov[1];
      else w = fov[0];
      if (axCorSag === SLICE_TYPE.AXIAL) h = fov[1];
      else h = fov[2];
      //console.log("w" + w + " h" + h + "::", fov);
      if (pass === 0) {
        //1st pass: record slice locations in world space
        if (!isRender) {
          if (axCorSag === SLICE_TYPE.AXIAL) axiMM.push(sliceMM);
          if (axCorSag === SLICE_TYPE.CORONAL) corMM.push(sliceMM);
          if (axCorSag === SLICE_TYPE.SAGITTAL) sagMM.push(sliceMM);
        }
      } else {
        //2nd pass draw
        let ltwh = [scale * left, scale * top, scale * w, scale * h];
        this.opts.textHeight = isLabel ? labelSize : 0;
        if (isRender) {
          let inf = sliceMM < 0 ? -Infinity : Infinity;
          if (Object.is(sliceMM, -0)) inf = -Infinity; //catch negative zero
          this.draw2D(ltwh, axCorSag, inf, isLabel);
        } else this.draw2D(ltwh, axCorSag, sliceMM, isLabel);
        if (isCrossLines) {
          this.drawCrossLines(
            this.screenSlices.length - 1,
            axCorSag,
            axiMM,
            corMM,
            sagMM
          );
          isCrossLinesUsed = true;
        }
        isRender = false;
        isCrossLines = false;
      }
      left += w;
      rowHt = Math.max(rowHt, h);
    } //for each item in string
    top += rowHt;
    mxRowWid = Math.max(mxRowWid, left);
    if (mxRowWid <= 0 || top <= 0) break;
    let scaleW = this.gl.canvas.width / mxRowWid;
    let scaleH = this.effectiveCanvasHeight() / top;
    scale = Math.min(scaleW, scaleH);
  } //for pass 0 and 1
  this.opts.textHeight = labelSize;
}; // drawMosaic()

// not included in public docs
Niivue.prototype.drawSceneCore = function () {
  if (!this.initialized) {
    return; // do not do anything until we are initialized (init will call drawScene).
  }
  this.colorbarHeight = 0;
  this.gl.clearColor(
    this.opts.backColor[0],
    this.opts.backColor[1],
    this.opts.backColor[2],
    this.opts.backColor[3]
  );
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  if (this.bmpTexture && this.thumbnailVisible) {
    //draw the thumbnail image and exit
    this.drawThumbnail();
    return;
  }
  let posString = "";
  if (
    this.volumes.length === 0 ||
    typeof this.volumes[0].dims === "undefined"
  ) {
    if (this.meshes.length > 0) {
      this.screenSlices = []; // empty array
      this.opts.sliceType = SLICE_TYPE.RENDER; //only meshes loaded: we must use 3D render mode
      this.draw3D(); //meshes loaded but no volume
      if (this.opts.isColorbar) this.drawColorbar();
      return;
    }
    this.drawLoadingText(this.loadingText);
    return;
  }
  if (!this.back.hasOwnProperty("dims")) return;
  if (
    this.uiData.isDragging &&
    this.scene.clipPlaneDepthAziElev[0] < 1.8 &&
    this.inRenderTile(this.uiData.dragStart[0], this.uiData.dragStart[1]) >= 0
  ) {
    //user dragging over a 3D rendering
    let x = this.uiData.dragStart[0] - this.uiData.dragEnd[0];
    let y = this.uiData.dragStart[1] - this.uiData.dragEnd[1];
    let depthAziElev = this.uiData.dragClipPlaneStartDepthAziElev.slice();
    depthAziElev[1] -= x;
    depthAziElev[1] = depthAziElev[1] % 360;
    depthAziElev[2] += y;
    if (
      depthAziElev[1] !== this.scene.clipPlaneDepthAziElev[1] ||
      depthAziElev[2] !== this.scene.clipPlaneDepthAziElev[2]
    ) {
      this.scene.clipPlaneDepthAziElev = depthAziElev;
      return this.setClipPlane(this.scene.clipPlaneDepthAziElev);
    }
  } //dragging over rendering
  if (
    this.sliceMosaicString.length < 1 &&
    this.opts.sliceType === SLICE_TYPE.RENDER
  ) {
    if (this.opts.isColorbar) this.reserveColorbarPanel();
    this.screenSlices = []; // empty array
    this.draw3D();
    if (this.opts.isColorbar) this.drawColorbar();
    return;
  }
  if (this.opts.isColorbar) this.reserveColorbarPanel();
  let maxVols = this.getMaxVols();
  let isDrawGraph =
    this.opts.sliceType === SLICE_TYPE.MULTIPLANAR &&
    maxVols > 1 &&
    this.graph.autoSizeMultiplanar &&
    this.graph.opacity > 0;

  if (this.sliceMosaicString.length > 0) {
    this.drawMosaic(this.sliceMosaicString);
  } else {
    // issue56 is use mm else use voxel
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.screenSlices = []; // empty array
    if (this.opts.sliceType === SLICE_TYPE.AXIAL) {
      this.draw2D([0, 0, 0, 0], 0);
    } else if (this.opts.sliceType === SLICE_TYPE.CORONAL) {
      this.draw2D([0, 0, 0, 0], 1);
    } else if (this.opts.sliceType === SLICE_TYPE.SAGITTAL) {
      this.draw2D([0, 0, 0, 0], 2);
    } else {
      //sliceTypeMultiplanar
      let isDrawPenDown =
        isFinite(this.drawPenLocation[0]) && this.opts.drawingEnabled;
      let { volScale } = this.sliceScale();
      if (typeof this.opts.multiplanarPadPixels !== "number")
        log.debug("multiplanarPadPixels must be numeric");
      let pad = parseFloat(this.opts.multiplanarPadPixels);
      // size for 2 rows, 2 columns
      let ltwh = this.scaleSlice(
        volScale[0] + volScale[1],
        volScale[1] + volScale[2],
        pad * 1,
        pad * 1
      );
      let wX = (ltwh[2] * volScale[0]) / (volScale[0] + volScale[1]);
      // size for 1 row, 3 columns
      let ltwh3x1 = this.scaleSlice(
        volScale[0] + volScale[0] + volScale[1],
        Math.max(volScale[1], volScale[2]),
        pad * 2
      );
      let mx = Math.max(Math.max(volScale[1], volScale[2]), volScale[0]);
      // size for 1 row, 4 columns
      let ltwh4x1 = this.scaleSlice(
        volScale[0] + volScale[0] + volScale[1] + mx,
        mx,
        pad * 3
      );
      let wX1 =
        (ltwh3x1[2] * volScale[0]) / (volScale[0] + volScale[0] + volScale[1]);
      if (this.opts.multiplanarForceRender) {
        //issue404
        ltwh3x1 = ltwh4x1;
        wX1 =
          (ltwh3x1[2] * volScale[0]) /
          (volScale[0] + volScale[0] + volScale[1] + mx);
      }
      if (wX1 > wX) {
        //landscape screen ratio: 3 slices in single row
        let pixScale = wX1 / volScale[0];
        let hY1 = volScale[1] * pixScale;
        let hZ1 = volScale[2] * pixScale;
        if (ltwh3x1[3] === ltwh4x1[3]) {
          ltwh3x1 = ltwh4x1;
          if (!isDrawPenDown && (maxVols < 2 || !isDrawGraph)) {
            this.draw3D([
              ltwh3x1[0] + wX1 + wX1 + hY1 + pad * 3,
              ltwh3x1[1],
              ltwh4x1[3],
              ltwh4x1[3],
            ]);
          }
        }
        //draw axial
        this.draw2D([ltwh3x1[0], ltwh3x1[1], wX1, hY1], 0);
        //draw coronal
        this.draw2D([ltwh3x1[0] + wX1 + pad, ltwh3x1[1], wX1, hZ1], 1);
        //draw sagittal
        this.draw2D(
          [ltwh3x1[0] + wX1 + wX1 + pad * 2, ltwh3x1[1], hY1, hZ1],
          2
        );
      } else {
        let wY = ltwh[2] - wX;
        let hY = (ltwh[3] * volScale[1]) / (volScale[1] + volScale[2]);
        let hZ = ltwh[3] - hY;
        //draw axial
        this.draw2D([ltwh[0], ltwh[1] + hZ + pad, wX, hY], 0);
        //draw coronal
        this.draw2D([ltwh[0], ltwh[1], wX, hZ], 1);
        //draw sagittal
        this.draw2D([ltwh[0] + wX + pad, ltwh[1], wY, hZ], 2);
        if (!isDrawPenDown && (maxVols < 2 || !this.graph.autoSizeMultiplanar))
          this.draw3D([ltwh[0] + wX + pad, ltwh[1] + hZ + pad, wY, hY]);
      } //if landscape else portrait
    } //if multiplanar
  } //if mosaic not 2D
  if (this.opts.isRuler) this.drawRuler();
  if (this.opts.isColorbar) this.drawColorbar();
  if (isDrawGraph) this.drawGraph();
  if (this.uiData.isDragging) {
    if (this.uiData.mouseButtonCenterDown) {
      this.dragForCenterButton([
        this.uiData.dragStart[0],
        this.uiData.dragStart[1],
        this.uiData.dragEnd[0],
        this.uiData.dragEnd[1],
      ]);
      return;
    }
    if (this.opts.dragMode === DRAG_MODE.slicer3D) {
      this.dragForSlicer3D([
        this.uiData.dragStart[0],
        this.uiData.dragStart[1],
        this.uiData.dragEnd[0],
        this.uiData.dragEnd[1],
      ]);
      return;
    }
    if (this.opts.dragMode === DRAG_MODE.pan) {
      this.dragForPanZoom([
        this.uiData.dragStart[0],
        this.uiData.dragStart[1],
        this.uiData.dragEnd[0],
        this.uiData.dragEnd[1],
      ]);
      return;
    }
    if (
      this.inRenderTile(this.uiData.dragStart[0], this.uiData.dragStart[1]) >= 0
    )
      return;
    if (this.opts.dragMode === DRAG_MODE.measurement) {
      //if (this.opts.isDragShowsMeasurementTool) {
      this.drawMeasurementTool([
        this.uiData.dragStart[0],
        this.uiData.dragStart[1],
        this.uiData.dragEnd[0],
        this.uiData.dragEnd[1],
      ]);
      return;
    }
    let width = Math.abs(this.uiData.dragStart[0] - this.uiData.dragEnd[0]);
    let height = Math.abs(this.uiData.dragStart[1] - this.uiData.dragEnd[1]);
    this.drawSelectionBox([
      Math.min(this.uiData.dragStart[0], this.uiData.dragEnd[0]),
      Math.min(this.uiData.dragStart[1], this.uiData.dragEnd[1]),
      width,
      height,
    ]);
  }
  const pos = this.frac2mm([
    this.scene.crosshairPos[0],
    this.scene.crosshairPos[1],
    this.scene.crosshairPos[2],
  ]);

  posString =
    pos[0].toFixed(2) + "×" + pos[1].toFixed(2) + "×" + pos[2].toFixed(2);
  this.readyForSync = true; // by the time we get here, all volumes should be loaded and ready to be drawn. We let other niivue instances know that we can now reliably sync draw calls (images are loaded)
  this.sync();
  return posString;
}; // drawSceneCore()

Niivue.prototype.drawScene = async function () {
  if (this.isBusy) {
    //limit concurrent draw calls (chrome v FireFox)
    this.needsRefresh = true;
    return;
  }
  this.isBusy = false;
  this.needsRefresh = false;
  let posString = await this.drawSceneCore();
  //Chrome and Safari get much more bogged down by concurrent draw calls than Safari
  // https://stackoverflow.com/questions/51710067/webgl-async-operations
  //glFinish operation and the documentation for it says: "does not return until the effects of all previously called GL commands are complete."
  // await this.gl.finish();
  await this.gl.finish();
  if (this.needsRefresh) posString = this.drawScene();
  return posString;
}; // drawScene()
