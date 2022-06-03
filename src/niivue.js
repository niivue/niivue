import { Shader } from "./shader.js";
import * as mat from "gl-matrix";
import { vertSliceShader, fragSliceShader } from "./shader-srcs.js";
import {
  vertGraphShader,
  vertLineShader,
  fragLineShader,
} from "./shader-srcs.js";
import { vertRenderShader, fragRenderShader } from "./shader-srcs.js";
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
  fragMeshOutlineShader,
  fragMeshHemiShader,
  fragMeshMatteShader,
  fragMeshShaderSHBlue,
  vertFiberShader,
  fragFiberShader,
  vertSurfaceShader,
  fragSurfaceShader,
  fragDepthPickingShader,
  fragVolumePickingShader,
} from "./shader-srcs.js";
import { Subject } from "rxjs";
import { NiivueObject3D } from "./niivue-object3D.js";
import { NiivueShader3D } from "./niivue-shader3D";
import { NVImage } from "./nvimage.js";
import { NVMesh } from "./nvmesh.js";
export { NVMesh } from "./nvmesh.js";
export { NVImage } from "./nvimage";
import { Log } from "./logger";
import defaultFontPNG from "./fonts/Roboto-Regular.png";
import defaultFontMetrics from "./fonts/Roboto-Regular.json";
import { colortables } from "./colortables";
import { webSocket } from "rxjs/webSocket";
import { interval } from "rxjs";

const log = new Log();
const cmapper = new colortables();

/**
 * @typedef {Object} NiivueOptions
 * @property {number} [options.textHeight=0.3] the text height for orientation labels (0 to 1). Zero for no text labels
 * @property {number} [options.colorbarHeight=0.05] size of colorbar. 0 for no colorbars, fraction of Nifti j dimension
 * @property {number} [options.colorBarMargin=0.05] padding around colorbar when displayed
 * @property {number} [options.crosshairWidth=1] crosshair size. Zero for no crosshair
 * @property {array}  [options.backColor=[0,0,0,1]] the background color. RGBA values from 0 to 1. Default is black
 * @property {array}  [options.crosshairColor=[1,0,0,1]] the crosshair color. RGBA values from 0 to 1. Default is red
 * @property {array}  [options.selectionBoxColor=[1,1,1,0.5]] the selection box color when the intensty selection box is shown (right click and drag). RGBA values from 0 to 1. Default is transparent white
 * @property {array}  [options.clipPlaneColor=[1,1,1,0.5]] the color of the visible clip plane. RGBA values from 0 to 1. Default is white
 * @property {boolean} [options.trustCalMinMax=true] true/false whether to trust the nifti header values for cal_min and cal_max. Trusting them results in faster loading because we skip computing these values from the data
 * @property {string} [options.clipPlaneHotKey="KeyC"] the keyboard key used to cycle through clip plane orientations. The default is "c"
 * @property {string} [options.viewModeHotKey="KeyV"] the keyboard key used to cycle through view modes. The default is "v"
 * @property {number} [options.keyDebounceTime=50] the keyUp debounce time in milliseconds. The default is 50 ms. You must wait this long before a new hot-key keystroke will be registered by the event listener
 * @property {boolean} [options.isRadiologicalConvention=false] whether or not to use radiological convention in the display
 * @property {string} [options.logging=false] turn on logging or not (true/false)
 * @property {string} [options.loadingText="waiting on images..."] the loading text to display when there is a blank canvas and no images
 * @property {boolean} [options.dragAndDropEnabled=true] whether or not to allow file and url drag and drop on the canvas
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
  this.opts = {}; // will be populate with opts or defaults when a new Niivue object instance is created
  this.defaults = {
    textHeight: 0.06, // 0 for no text, fraction of canvas min(height,width)
    colorbarHeight: 0.05, // 0 for no colorbars, fraction of Nifti j dimension
    crosshairWidth: 1, // 0 for no crosshairs
    show3Dcrosshair: false,
    backColor: [0, 0, 0, 1],
    crosshairColor: [1, 0, 0, 1],
    selectionBoxColor: [1, 1, 1, 0.5],
    clipPlaneColor: [0.7, 0, 0.7, 0.5],
    colorBarMargin: 0.05, // x axis margin arount color bar, clip space coordinates
    trustCalMinMax: true, // trustCalMinMax: if true do not calculate cal_min or cal_max if set in image header. If false, always calculate display intensity range.
    clipPlaneHotKey: "KeyC", // keyboard short cut to activate the clip plane
    viewModeHotKey: "KeyV", // keyboard shortcut to switch view modes
    keyDebounceTime: 50, // default debounce time used in keyup listeners
    isNearestInterpolation: false,
    isAtlasOutline: false,
    isRadiologicalConvention: false,
    logging: false,
    loadingText: "waiting for images...",
    dragAndDropEnabled: true,
    drawingEnabled: false, // drawing disabled by default
    penValue: 1, // sets drawing color. see "drawPt"
    isFilledPen: false,
    thumbnail: "",
  };

  this.canvas = null; // the canvas element on the page
  this.gl = null; // the gl context
  this.colormapTexture = null;
  this.volumeTexture = null;
  this.drawTexture = null; //the GPU memory storage of the drawing
  this.drawBitmap = null; //the CPU memory storage of the drawing
  this.drawUndoBitmap = null; //copy of prior drawBitmap
  this.drawOpacity = 0.8;
  this.drawPenLocation = [NaN, NaN, NaN];
  this.drawPenAxCorSag = -1; //do not allow pen to drag between Sagittal/Coronal/Axial
  this.drawFillOverwrites = true;
  this.drawPenFillPts = []; //store mouse points for filled pen
  this.overlayTexture = null;
  this.overlayTextureID = [];
  this.sliceShader = null;
  this.lineShader = null;
  this.graphShader = null;
  this.renderShader = null;
  this.pickingShader = null;
  this.colorbarShader = null;
  this.fontShader = null;
  this.fontTexture = null;
  this.bmpShader = null;
  this.bmpTexture = null; //thumbnail WebGLTexture object
  this.thumbnailVisible = false;
  this.bmpTextureWH = 1.0; //thumbnail width/height ratio
  this.passThroughShader = null;
  this.growCutShader = null;
  this.orientShaderAtlasU = null;
  this.orientShaderU = null;
  this.orientShaderI = null;
  this.orientShaderF = null;
  this.orientShaderRGBU = null;
  this.surfaceShader = null;
  this.meshShader = null;
  this.genericVAO = null; //used for 2D slices, 2D lines, 2D Fonts
  this.unusedVAO = null;
  this.crosshairs3D = null;
  this.pickingSurfaceShader = null;

  this.DEFAULT_FONT_GLYPH_SHEET = defaultFontPNG; //"/fonts/Roboto-Regular.png";
  this.DEFAULT_FONT_METRICS = defaultFontMetrics; //"/fonts/Roboto-Regular.json";
  this.fontMets = null;
  this.backgroundMasksOverlays = 0;
  this.sliceTypeAxial = 0;
  this.sliceTypeCoronal = 1;
  this.sliceTypeSagittal = 2;
  this.sliceTypeMultiplanar = 3;
  this.sliceTypeRender = 4;
  this.sliceType = this.sliceTypeMultiplanar; // sets current view in webgl canvas
  this.scene = {};
  this.syncOpts = {};
  this.readyForSync = false;
  this.scene.renderAzimuth = 110; //-45;
  this.scene.renderElevation = 10; //-165; //15;
  this.scene.crosshairPos = [0.5, 0.5, 0.5];
  this.scene.clipPlane = [0, 0, 0, 0];
  this.scene.clipPlaneDepthAziElev = [2, 0, 0];
  this.scene.mousedown = false;
  this.scene.touchdown = false;
  this.scene.mouseButtonLeft = 0;
  this.scene.mouseButtonRight = 2;
  this.scene.mouseButtonLeftDown = false;
  this.scene.mouseButtonRightDown = false;
  this.scene.mouseDepthPicker = false;
  this.scene.scale2D = 1.0;
  this.scene.prevX = 0;
  this.scene.prevY = 0;
  this.scene.currX = 0;
  this.scene.currY = 0;
  this.back = {}; // base layer; defines image space to work in. Defined as this.volumes[0] in Niivue.loadVolumes
  this.overlays = []; // layers added on top of base image (e.g. masks or stat maps). Essentially everything after this.volumes[0] is an overlay. So is this necessary?
  this.volumes = []; // all loaded images. Can add in the ability to push or slice as needed
  this.deferredVolumes = [];
  this.deferredMeshes = [];
  this.meshes = [];
  this.furthestVertexFromOrigin = 100;
  this.volScaleMultiplier = 1.0;
  this.volScale = [];
  this.vox = [];
  this.mousePos = [0, 0];
  this.numScreenSlices = 0; // e.g. for multiplanar view, 3 simultaneous slices: axial, coronal, sagittal
  this.screenSlices = [
    //location and type of each 2D slice on screen, allows clicking to detect position
    { leftTopWidthHeight: [1, 0, 0, 1], axCorSag: this.sliceTypeAxial },
    { leftTopWidthHeight: [1, 0, 0, 1], axCorSag: this.sliceTypeAxial },
    { leftTopWidthHeight: [1, 0, 0, 1], axCorSag: this.sliceTypeAxial },
    { leftTopWidthHeight: [1, 0, 0, 1], axCorSag: this.sliceTypeAxial },
  ];
  this.isDragging = false;
  this.dragStart = [0.0, 0.0];
  this.dragEnd = [0.0, 0.0];
  this.dragClipPlaneStartDepthAziElev = [0, 0, 0];
  this.lastTwoTouchDistance = 0;
  this.otherNV = null; // another niivue instance that we wish to sync postion with
  this.volumeObject3D = null;
  this.pivot3D = [0, 0, 0]; //center for rendering rotation
  this.furthestFromPivot = 10.0; //most distant point from pivot
  this.intensityRange$ = new Subject(); // an array
  this.scene.location$ = new Subject(); // object with properties: {mm: [N N N], vox: [N N N], frac: [N N N]}
  this.scene.loading$ = new Subject(); // whether or not the scene is loading
  this.imageLoaded$ = new Subject();
  this.currentClipPlaneIndex = 0;
  this.lastCalled = new Date().getTime();
  this.multiTouchGesture = false;
  this.gestureInterval = null;
  this.selectedObjectId = -1;
  this.CLIP_PLANE_ID = 1;
  this.VOLUME_ID = 254;
  this.DISTANCE_FROM_CAMERA = -0.54;
  this.graph = [];
  this.graph.LTWH = [0, 0, 640, 480];
  this.graph.opacity = 0.0;
  //this.graph.selectedColumn = -1;
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
      Name: "Outline",
      Frag: fragMeshOutlineShader,
    },
    {
      Name: "Toon",
      Frag: fragMeshToonShader,
    },
  ];

  // multiuser
  this.isController = false;
  this.isInSession = false;
  this.sessionKey = "";
  this.sessionUrl = "";
  this.serverConnection$ = null;
  this.interval$ = null;

  this.initialized = false;
  // loop through known Niivue properties
  // if the user supplied opts object has a
  // property listed in the known properties, then set
  // Niivue.opts.<prop> to that value, else apply defaults.
  for (let prop in this.defaults) {
    this.opts[prop] =
      options[prop] === undefined ? this.defaults[prop] : options[prop];
  }

  if (this.opts.drawingEnabled) {
    this.createEmptyDrawing();
  }

  if (this.opts.thumbnail.length > 0) {
    this.thumbnailVisible = true;
  }

  this.loadingText = this.opts.loadingText;
  log.setLogLevel(this.opts.logging);

  // maping of keys (event strings) to rxjs subjects
  this.eventsToSubjects = {
    location: this.scene.location$,
    loading: this.scene.loading$,
    imageLoaded: this.imageLoaded$,
    intensityRange: this.intensityRange$,
  };

  // rxjs subscriptions. Keeping a reference array like this allows us to unsubscribe later
  this.subscriptions = [];
}

/**
 * attach the Niivue instance to the webgl2 canvas by element id
 * @param {string} id the id of an html canvas element
 * @example niivue = new Niivue().attachTo('gl')
 * @example niivue.attachTo('gl')
 */
Niivue.prototype.attachTo = async function (id) {
  await this.attachToCanvas(document.getElementById(id));
  log.debug("attached to element with id: ", id);
  return this;
}; // attachTo

// on handles matching event strings (event) with know rxjs subjects within NiiVue.
// if the event string exists (e.g. 'location') then the corrsponding rxjs subject reference
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
 * niivue.on('location', doSomethingWithLocationData)
 * niivue.on('intensityRange', callback)
 * niivue.on('imageLoaded', callback)
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
Niivue.prototype.attachToCanvas = async function (canvas) {
  this.canvas = canvas;
  this.gl = this.canvas.getContext("webgl2");
  if (!this.gl) {
    alert(
      "unable to get webgl2 context. Perhaps this browser does not support webgl2"
    );
    log.warn(
      "unable to get webgl2 context. Perhaps this browser does not support webgl2"
    );
  }

  // set parent background container to black (default empty canvas color)
  // avoids white cube around image in 3D render mode
  this.canvas.parentElement.style.backgroundColor = "black";
  // fill all space in parent
  this.canvas.style.width = "100%";
  this.canvas.style.height = "100%";
  this.canvas.width = this.canvas.offsetWidth;
  this.canvas.height = this.canvas.offsetHeight;

  window.addEventListener("resize", this.resizeListener.bind(this)); // must bind 'this' niivue object or else 'this' becomes 'window'
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
  // this.scene.renderAzimuth = 120;
  // this.scene.renderElevation = 15;
  // this.scene.crosshairPos = [0.5, 0.5, 0.5];
  // this.scene.clipPlane = [0, 0, 0, 0];
  this.otherNV = otherNV;
  this.syncOpts = syncOpts;
};

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
};

// Internal function to connect to web socket server
Niivue.prototype.connectToServer = function (wsServerUrl, sessionName) {
  const url = new URL(wsServerUrl);
  url.pathname = "websockets";
  url.search = "?session=" + sessionName;
  this.serverConnection$ = webSocket(url.href);
  console.log(url.href);
};

// Internal function to schedule updates to the server
Niivue.prototype.setUpdateInterval = function () {
  this.interval$ = interval(300);
  this.interval$.subscribe(() => {
    this.serverConnection$.next({
      op: "update",
      azimuth: this.scene.renderAzimuth,
      elevation: this.scene.renderElevation,
      clipPlane: this.scene.clipPlane,
      zoom: this.volScaleMultiplier,
      key: this.sessionKey,
    });
  });
};

// Internal function called after a connection with the server has been made
Niivue.prototype.subscribeToServer = function (
  sessionCreatedCallback,
  sessionJoinedCallback
) {
  this.serverConnection$.subscribe({
    next: (msg) => {
      switch (msg["op"]) {
        case "update":
          this.scene.renderAzimuth = msg["azimuth"];
          this.scene.renderElevation = msg["elevation"];
          this.volScaleMultiplier = msg["zoom"];
          this.scene.clipPlane = msg["clipPlane"];
          this.drawScene();
          break;

        case "create":
          console.log(msg);
          if (!msg["isError"]) {
            this.isInSession = true;
            this.sessionKey = msg["key"];
            this.setUpdateInterval();
          }
          if (sessionCreatedCallback) {
            sessionCreatedCallback(
              msg["message"],
              msg["url"],
              msg["key"],
              msg["isError"]
            );
          }
          break;

        case "join":
          this.isInSession = true;
          this.isController = msg["isController"];
          if (this.isController) {
            this.setUpdateInterval();
          }

          if (sessionJoinedCallback) {
            sessionJoinedCallback(
              msg["message"],
              msg["url"],
              msg["isController"]
            );
          }
          break;
      }
    }, // Called whenever there is a message from the server.
    error: (err) => console.log(err), // Called if at any point WebSocket API signals some kind of error.
    complete: () => console.log("complete"), // Called when connection is closed (for whatever reason).
  });
};

/**
 * Create a multiuser session
 * @param {string} wsServerUrl e.g. ws://localhost:3000
 * @param {string} sessionName
 * @param {function(string, string, string, boolean):void} sessionCreatedCallback callback after session has been created with message, session url, session key
 * if there was no error.
 */
Niivue.prototype.createSession = function (
  wsServerUrl,
  sessionName,
  sessionCreatedCallback
) {
  this.connectToServer(wsServerUrl, sessionName);

  // subscribe to any messages from the server
  this.subscribeToServer(sessionCreatedCallback);

  // tell the server we want to create a sesion
  this.serverConnection$.next({
    op: "create",
  });
};

/**
 * Join a multiuser session
 * @param {string} wsServerUrl e.g. ws://localhost:3000
 * @param {string} sessionName
 * @param {function(string, string, boolean):void} sessionJoinedCallback callback after session has been joined with message, session url and session key
 */
Niivue.prototype.joinSession = function (
  wsServerUrl,
  sessionName,
  key,
  sessionJoinedCallback
) {
  this.connectToServer(wsServerUrl, sessionName);

  // subscribe to any messages from the server
  this.subscribeToServer(null, sessionJoinedCallback);

  // tell the server we want to create a sesion
  this.serverConnection$.next({
    op: "join",
    key: key,
  });
};

/**
 * Close a multiuser session
 */
Niivue.prototype.closeSession = function () {
  this.interval$.complete();
  this.serverConnection$.complete();
  this.isInSession = false;
  this.isController = false;
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

//handle window resizing
// note: no test yet
Niivue.prototype.resizeListener = function () {
  this.canvas.style.width = "100%";
  this.canvas.style.height = "100%";
  this.canvas.width = this.canvas.offsetWidth;
  this.canvas.height = this.canvas.offsetHeight;

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

  pos.x = (pos.x * target.width) / target.clientWidth;
  pos.y = (pos.y * target.height) / target.clientHeight;

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
  this.scene.mousedown = true;
  if (e.button === this.scene.mouseButtonLeft) {
    this.scene.mouseButtonLeftDown = true;
    this.mouseLeftButtonHandler(e);
  } else if (e.button === this.scene.mouseButtonRight) {
    this.scene.mouseButtonRightDown = true;
    this.mouseRightButtonHandler(e);
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
  this.mouseClick(pos.x, pos.y);
  this.mouseDown(pos.x, pos.y);
};

// not included in public docs
// handler for mouse right button down
// note: no test yet
Niivue.prototype.mouseRightButtonHandler = function (e) {
  this.isDragging = true;
  let pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(
    e,
    this.gl.canvas
  );
  this.dragStart[0] = pos.x;
  this.dragStart[1] = pos.y;
  this.dragClipPlaneStartDepthAziElev = this.scene.clipPlaneDepthAziElev;
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
Niivue.prototype.calculateNewRange = function (volIdx = 0) {
  if (this.sliceType === this.sliceTypeRender) {
    return;
  }
  if (
    this.dragStart[0] === this.dragEnd[0] &&
    this.dragStart[1] === this.dragEnd[1]
  )
    return;
  // calculate our box
  let frac = this.canvasPos2frac([this.dragStart[0], this.dragStart[1]]);
  let startVox = this.frac2vox(frac, volIdx);

  frac = this.canvasPos2frac([this.dragEnd[0], this.dragEnd[1]]);
  let endVox = this.frac2vox(frac, volIdx);

  let hi = -Number.MAX_VALUE,
    lo = Number.MAX_VALUE;
  let xrange;
  let yrange;
  let zrange;

  xrange = this.calculateMinMaxVoxIdx([startVox[0], endVox[0]]);
  yrange = this.calculateMinMaxVoxIdx([startVox[1], endVox[1]]);
  zrange = this.calculateMinMaxVoxIdx([startVox[2], endVox[2]]);

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
  this.intensityRange$.next(this.volumes[volIdx]); //reference to volume to access cal_min and cal_max
};

// not included in public docs
// handler for mouse button up (all buttons)
// note: no test yet
Niivue.prototype.mouseUpListener = function () {
  this.scene.mousedown = false;
  this.scene.mouseButtonRightDown = false;
  this.scene.mouseButtonLeftDown = false;
  if (this.drawPenFillPts.length > 0) this.drawPenFilled();
  this.drawPenLocation = [NaN, NaN, NaN];
  this.drawPenAxCorSag = -1;
  if (this.isDragging) {
    this.isDragging = false;
    this.calculateNewRange();
    this.refreshLayers(this.volumes[0], 0, this.volumes.length);
  }
  this.drawScene();
};

// not included in public docs
Niivue.prototype.checkMultitouch = function (e) {
  if (this.scene.touchdown && !this.multiTouchGesture) {
    var rect = this.canvas.getBoundingClientRect();
    this.mouseClick(
      e.touches[0].clientX - rect.left,
      e.touches[0].clientY - rect.top
    );
    this.mouseDown(
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
  this.scene.touchdown = true;
  if (this.scene.touchdown && e.touches.length < 2) {
    this.multiTouchGesture = false;
  } else {
    this.multiTouchGesture = true;
  }

  setTimeout(this.checkMultitouch.bind(this), 1, e);
};

// not included in public docs
// handler for touchend (finger lift off screen)
// note: no test yet
Niivue.prototype.touchEndListener = function () {
  this.scene.touchdown = false;
  this.lastTwoTouchDistance = 0;
  this.multiTouchGesture = false;
};

// not included in public docs
// handler for mouse move over canvas
// note: no test yet
Niivue.prototype.mouseMoveListener = function (e) {
  // move crosshair and change slices if mouse click and move
  if (this.scene.mousedown) {
    let pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(
      e,
      this.gl.canvas
    );
    if (this.scene.mouseButtonLeftDown) {
      this.mouseClick(pos.x, pos.y);
      this.mouseMove(pos.x, pos.y);
    } else if (this.scene.mouseButtonRightDown) {
      this.dragEnd[0] = pos.x;
      this.dragEnd[1] = pos.y;
    }
    this.drawScene();
    this.scene.prevX = this.scene.currX;
    this.scene.prevY = this.scene.currY;
  }
};

// not included in public docs
// note: should update this to accept a volume index to reset a selected volume rather than only the background (TODO)
// reset brightness and contrast to global min and max
// note: no test yet
Niivue.prototype.resetBriCon = function () {
  //this.volumes[0].cal_min = this.volumes[0].global_min;
  //this.volumes[0].cal_max = this.volumes[0].global_max;

  // don't reset bri/con if the user is in 3D mode and double clicks
  if (this.sliceType === this.sliceTypeRender) {
    this.scene.mouseDepthPicker = true;
    this.drawScene();
    return;
  }
  this.volumes[0].cal_min = this.volumes[0].robust_min;
  this.volumes[0].cal_max = this.volumes[0].robust_max;
  this.intensityRange$.next(this.volumes[0]);
  this.refreshLayers(this.volumes[0], 0, this.volumes.length);
  this.drawScene();
};

// not included in public docs
// handler for touch move (moving finger on screen)
// note: no test yet
Niivue.prototype.touchMoveListener = function (e) {
  if (this.scene.touchdown && e.touches.length < 2) {
    var rect = this.canvas.getBoundingClientRect();
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
    if (dist < this.lastTwoTouchDistance) {
      // this.volScaleMultiplier = Math.max(0.5, this.volScaleMultiplier * 0.95);
      this.sliceScroll2D(
        -0.01,
        e.touches[0].clientX - rect.left,
        e.touches[0].clientY - rect.top
      );
    } else {
      // this.volScaleMultiplier = Math.min(2.0, this.volScaleMultiplier * 1.05);
      this.sliceScroll2D(
        0.01,
        e.touches[0].clientX - rect.left,
        e.touches[0].clientY - rect.top
      );
    }
    // this.drawScene();
    this.lastTwoTouchDistance = dist;
  }
};

// not included in public docs
// handler for keyboard shortcuts
Niivue.prototype.keyUpListener = function (e) {
  if (e.code === this.opts.clipPlaneHotKey) {
    if (this.sliceType != this.sliceTypeRender) {
      return;
    }
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
      this.setSliceType((this.sliceType + 1) % 5); // 5 total slice types
      this.lastCalled = now;
    }
  }
};

Niivue.prototype.keyDownListener = function (e) {
  if (e.code === "KeyH" && this.sliceType === this.sliceTypeRender) {
    this.setRenderAzimuthElevation(
      this.scene.renderAzimuth - 1,
      this.scene.renderElevation
    );
  } else if (e.code === "KeyL" && this.sliceType === this.sliceTypeRender) {
    this.setRenderAzimuthElevation(
      this.scene.renderAzimuth + 1,
      this.scene.renderElevation
    );
  } else if (e.code === "KeyJ" && this.sliceType === this.sliceTypeRender) {
    this.setRenderAzimuthElevation(
      this.scene.renderAzimuth,
      this.scene.renderElevation + 1
    );
  } else if (e.code === "KeyK" && this.sliceType === this.sliceTypeRender) {
    this.setRenderAzimuthElevation(
      this.scene.renderAzimuth,
      this.scene.renderElevation - 1
    );
  } else if (e.code === "KeyH" && this.sliceType !== this.sliceTypeRender) {
    this.scene.crosshairPos[0] = this.scene.crosshairPos[0] - 0.001;
    this.drawScene();
  } else if (e.code === "KeyL" && this.sliceType !== this.sliceTypeRender) {
    this.scene.crosshairPos[0] = this.scene.crosshairPos[0] + 0.001;
    this.drawScene();
  } else if (
    e.code === "KeyU" &&
    this.sliceType !== this.sliceTypeRender &&
    e.ctrlKey
  ) {
    this.scene.crosshairPos[2] = this.scene.crosshairPos[2] + 0.001;
    this.drawScene();
  } else if (
    e.code === "KeyD" &&
    this.sliceType !== this.sliceTypeRender &&
    e.ctrlKey
  ) {
    this.scene.crosshairPos[2] = this.scene.crosshairPos[2] - 0.001;
    this.drawScene();
  } else if (e.code === "KeyJ" && this.sliceType !== this.sliceTypeRender) {
    this.scene.crosshairPos[1] = this.scene.crosshairPos[1] - 0.001;
    this.drawScene();
  } else if (e.code === "KeyK" && this.sliceType !== this.sliceTypeRender) {
    this.scene.crosshairPos[1] = this.scene.crosshairPos[1] + 0.001;
    this.drawScene();
  } else if (e.code === "ArrowLeft") {
    // only works for background (first loaded image is index 0)
    this.setFrame4D(this.volumes[0].id, this.volumes[0].frame4D - 1);
  } else if (e.code === "ArrowRight") {
    // only works for background (first loaded image is index 0)
    this.setFrame4D(this.volumes[0].id, this.volumes[0].frame4D + 1);
  }
};

// not included in public docs
// handler for scroll wheel events (slice scrolling)
// note: no test yet
Niivue.prototype.wheelListener = function (e) {
  // scroll 2D slices
  e.preventDefault();
  e.stopPropagation();
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
  this.canvas.focus();

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

Niivue.prototype.getFileExt = function (fullname, upperCase = true) {
  var re = /(?:\.([^.]+))?$/;
  let ext = re.exec(fullname)[1];
  ext = ext.toUpperCase();
  if (ext === "GZ") {
    ext = re.exec(fullname.slice(0, -3))[1]; //img.trk.gz -> img.trk
    ext = ext.toUpperCase();
  }
  return upperCase ? ext : ext.toLowerCase(); // developer can choose to have extentions as upper or lower
}; // getFleExt

// not included in public docs
Niivue.prototype.dropListener = async function (e) {
  e.stopPropagation();
  e.preventDefault();
  // don't do anything if drag and drop has been turned off
  if (!this.opts.dragAndDropEnabled) {
    return;
  }

  const filesToLoad = [];
  const urlsToLoad = [];

  const dt = e.dataTransfer;
  const url = dt.getData("text/uri-list");
  if (url) {
    urlsToLoad.push(url);
    let volume = await NVImage.loadFromUrl({ url: url });
    this.setVolume(volume);
  } else {
    //const files = dt.files;
    const items = dt.items;
    if (items.length > 0) {
      // adding or replacing
      if (!e.shiftKey) {
        this.volumes = [];
        this.overlays = [];
        this.meshes = [];
      }
      for (const item of items) {
        const entry = item.getAsEntry || item.webkitGetAsEntry();
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
          if (
            ext === "ASC" ||
            ext === "DFS" ||
            ext === "FSM" ||
            ext === "PIAL" ||
            ext === "ORIG" ||
            ext === "INFLATED" ||
            ext === "SMOOTHWM" ||
            ext === "SPHERE" ||
            ext === "WHITE" ||
            ext === "GII" ||
            ext === "MZ3" ||
            ext === "NV" ||
            ext === "OBJ" ||
            ext === "OFF" ||
            ext === "PLY" ||
            ext === "SRF" ||
            ext === "STL" ||
            ext === "TCK" ||
            ext === "TRACT" ||
            ext === "TRK" ||
            ext === "TRX" ||
            ext === "VTK" ||
            ext === "X3D"
          ) {
            entry.file(async (file) => {
              let mesh = await NVMesh.loadFromFile({
                file: file,
                gl: this.gl,
                name: file.name,
              });
              this.scene.loading$.next(false);
              this.addMesh(mesh);
            });
            continue;
          }
          entry.file(async (file) => {
            // if we have paired header/img data
            if (pairedImageData !== "") {
              pairedImageData.file(async (imgfile) => {
                let volume = await NVImage.loadFromFile({
                  file: file,
                  urlImgData: imgfile,
                });
                this.addVolume(volume);
              });
            } else {
              // else, just a single file to load (not a pair)
              let volume = await NVImage.loadFromFile({
                file: file,
                urlImgData: pairedImageData,
              });
              this.addVolume(volume);
            }
          });
        } else if (entry.isDirectory) {
          /*
          let reader = entry.createReader();
          var allFilesInDir = [];
          let n = 0;
          let readEntries = () => {
            n = n + 1;
            //console.log('called ', n, ' times')
            reader.readEntries(async (entries) => {
              //console.log(entries)
              if (!entries.length) {
                let volume = await NVImage.loadFromFile({
                  file: allFilesInDir, // an array of file objects
                  urlImgData: null, // nothing
                  isDICOMDIR: true, // signify that this is a dicom directory
                });
                this.addVolume(volume);
              } else {
                for (let i = 0; i < entries.length; i++) {
                  if (!entries[i].isFile) continue;
                  if (entries[i].size < 256) continue;
                  if (entries[i].name.startsWith(".")) continue; //hidden, e.g. .DS_Store
                  console.log("adding " + entries[i].name);
                  entries[i].file((file) => {
                    allFilesInDir.push(file);
                  });
                }
                readEntries();
              }
            });
          };
          readEntries();
					*/
        }
      }
    }
  }
  //this.createEmptyDrawing();
  this.drawScene(); //<- this seems to be required if you drag and drop a mesh, not a volume
};

Niivue.prototype.setRadiologicalConvention = function (
  isRadiologicalConvention
) {
  this.opts.isRadiologicalConvention = isRadiologicalConvention;
};

Niivue.prototype.getRadiologicalConvention = function () {
  return this.opts.isRadiologicalConvention;
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
  this.imageLoaded$.next(volume); // pass reference to the loaded NVImage (the volume)
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
  this.imageLoaded$.next(mesh); // pass reference to the loaded NVImage (the volume)
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

Niivue.prototype.loadDrawing = async function (fnm) {
  if (this.drawBitmap) console.log("Overwriting open drawing!");
  let volume = await NVImage.loadFromUrl({ url: fnm });
  //let volume = await NVImage.loadFromFile({file: fnm});
  let dims = volume.hdr.dims; //reverse to original
  if (
    dims[1] !== this.back.hdr.dims[1] ||
    dims[2] !== this.back.hdr.dims[2] ||
    dims[3] !== this.back.hdr.dims[3]
  ) {
    console.log("drawing dimensions do not match background image");
    return false;
  }
  if (volume.img.constructor !== Uint8Array)
    console.log("Drawings should be UINT8");
  let perm = volume.permRAS;
  //if (perm[0] === 1 && perm[1] === 2 && perm[2] === 3) {
  let vx = dims[1] * dims[2] * dims[3];
  //this.drawBitmap = new Uint8Array(vx);
  this.drawUndoBitmap = null;
  this.drawBitmap = new Uint8Array(vx);
  this.drawTexture = this.r8Tex(
    this.drawTexture,
    this.gl.TEXTURE7,
    this.back.dims,
    //this.volumes[0].hdr.dims,
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
  let inVs = volume.img; //new Uint8Array(this.drawBitmap);
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
  this.refreshDrawing(false);
  this.drawScene();
};

Niivue.prototype.saveImage = async function (fnm, isSaveDrawing = false) {
  if (!this.back.hasOwnProperty("dims")) {
    console.log("No voxelwise image open");
    return false;
  }
  if (isSaveDrawing) {
    if (!this.drawBitmap) {
      console.log("No drawing open");
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

Niivue.prototype.getMeshIndexByID = function (id) {
  let n = this.meshes.length;
  for (let i = 0; i < n; i++) {
    let id_i = this.meshes[i].id;
    if (id_i === id) {
      return i;
    }
  }
  return -1; // -1 signals that no valid index was found for a volume with the given id
};

Niivue.prototype.setMeshProperty = function (id, key, val) {
  let idx = this.getMeshIndexByID(id);
  if (idx < 0) {
    log.warn("setMeshProperty() id not loaded", id);
    return;
  }
  this.meshes[idx].setProperty(key, val, this.gl);
  this.updateGLVolume();
};

Niivue.prototype.reverseFaces = function (mesh) {
  let idx = this.getMeshIndexByID(mesh);
  if (idx < 0) {
    log.warn("reverseFaces() id not loaded", mesh);
    return;
  }
  this.meshes[idx].reverseFaces(this.gl);
  this.updateGLVolume();
};
Niivue.prototype.setMeshLayerProperty = function (mesh, layer, key, val) {
  let idx = this.getMeshIndexByID(mesh);
  if (idx < 0) {
    log.warn("setMeshLayerProperty() id not loaded", mesh);
    return;
  }
  this.meshes[idx].setLayerProperty(layer, key, val, this.gl);
  this.updateGLVolume();
};

Niivue.prototype.setScale2D = function (zoomFactor) {
  this.scene.scale2D = zoomFactor;
  console.log("bingo");
  this.drawScene();
}; // mouseMove()

Niivue.prototype.setRenderAzimuthElevation = function (a, e) {
  this.scene.renderAzimuth = a;
  this.scene.renderElevation = e;
  this.drawScene();
}; // mouseMove()

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
  this.volumes.map((v) => {
    log.debug(v.name);
  });
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
  this.volumes.map((v) => {
    log.debug(v.name);
  });
};

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

Niivue.prototype.removeVolume = function (volume) {
  this.setVolume(volume, -1);
};

Niivue.prototype.removeMesh = function (mesh) {
  this.setMesh(mesh, -1);
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
  if (this.sliceType != this.sliceTypeRender) return;
  this.mousePos = [x, y];
}; // mouseDown()

// not included in public docs
// note: no test yet
Niivue.prototype.mouseMove = function mouseMove(x, y) {
  if (this.sliceType != this.sliceTypeRender) return;
  this.scene.renderAzimuth += x - this.mousePos[0];
  this.scene.renderElevation += y - this.mousePos[1];
  this.mousePos = [x, y];
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
  if (this.sliceType != this.sliceTypeRender) return;
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

Niivue.prototype.setDrawingEnabled = function (trueOrFalse) {
  this.opts.drawingEnabled = trueOrFalse;
  if (this.opts.drawingEnabled) {
    if (!this.drawBitmap) this.createEmptyDrawing();
  }
  this.drawScene();
};

Niivue.prototype.setPenValue = function (penValue, isFilledPen = false) {
  this.opts.penValue = penValue;
  this.opts.isFilledPen = isFilledPen;
  this.drawScene();
};

Niivue.prototype.setDrawOpacity = function (opacity) {
  this.drawOpacity = opacity;
  this.sliceShader.use(this.gl);
  this.gl.uniform1f(this.sliceShader.uniforms["drawOpacity"], this.drawOpacity);
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
  this.sliceType = st;
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
  this.volScaleMultiplier = scale;
  this.drawScene();
}; // setScale()

/**
 * set the color of the 3D clip plane
 * @param {array} color the new color. expects an array of RGBA values. values can range from 0 to 1
 * @example
 * niivue = new Niivue()
 * niivue.setClipPlaneColor([1, 1, 1, 0.5]) // white, transparent
 */
Niivue.prototype.setClipPlaneColor = function (color) {
  this.opts.clipPlaneColor = color;
  this.drawScene();
}; // setClipPlaneColor()

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
 * load an array of volume objects
 * @param {array} volumeList the array of objects to load. each object must have a resolvable "url" property at a minimum
 * @returns {Niivue} returns the Niivue instance
 * @example
 * niivue = new Niivue()
 * niivue.loadVolumes([{url: 'someImage.nii.gz}, {url: 'anotherImage.nii.gz'}])
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

  this.scene.loading$.next(false);
  // for loop to load all volumes in volumeList
  for (let i = 0; i < volumeList.length; i++) {
    this.scene.loading$.next(true);
    let volume = await NVImage.loadFromUrl({
      url: volumeList[i].url,
      name: volumeList[i].name,
      colorMap: volumeList[i].colorMap,
      opacity: volumeList[i].opacity,
      urlImgData: volumeList[i].urlImgData,
      cal_min: volumeList[i].cal_min,
      cal_max: volumeList[i].cal_max,
      trustCalMinMax: this.opts.trustCalMinMax,
    });
    this.scene.loading$.next(false);
    this.addVolume(volume);
    /*
    this.volumes.push(volume);
    if (i === 0) {
      this.back = volume;
    }
    this.overlays = this.volumes.slice(1);
    this.updateGLVolume();
		*/
  } // for
  return this;
}; // loadVolumes()

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

  this.scene.loading$.next(false);
  // for loop to load all volumes in volumeList
  for (let i = 0; i < meshList.length; i++) {
    this.scene.loading$.next(true);
    let mesh = await NVMesh.loadFromUrl({
      url: meshList[i].url,
      gl: this.gl,
      name: meshList[i].name,
      opacity: meshList[i].opacity,
      rgba255: meshList[i].rgba255,
      visible: meshList[i].visible,
      layers: meshList[i].layers,
    });
    this.scene.loading$.next(false);
    this.addMesh(mesh);
    //this.meshes.push(mesh);
    //this.updateGLVolume();
  } // for
  this.drawScene();
  return this;
}; // loadMeshes

Niivue.prototype.loadConnectome = async function (json) {
  this.on("loading", (isLoading) => {
    if (isLoading) {
      this.loadingText = "loading...";
      this.drawScene();
    } else {
      this.loadingText = this.opts.loadingText;
    }
  });
  if (!this.initialized) {
    //await this.init();
  }
  this.meshes = [];
  this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.scene.loading$.next(false);
  // for loop to load all volumes in volumeList
  for (let i = 0; i < 1; i++) {
    this.scene.loading$.next(true);
    let mesh = await NVMesh.loadConnectomeFromJSON(json, this.gl);
    this.scene.loading$.next(false);
    this.addMesh(mesh);
    //this.meshes.push(mesh);
    //this.updateGLVolume();
  } // for
  this.drawScene();
  return this;
}; // loadMeshes

//Generate a blank GPU texture and CPU bitmap for drawing
Niivue.prototype.createEmptyDrawing = function () {
  if (!this.back.hasOwnProperty("dims")) return;
  let mn = Math.min(
    Math.min(this.back.dims[1], this.back.dims[2]),
    this.back.dims[3]
  );
  if (mn < 1) return; //something is horribly wrong!
  let vx = this.back.dims[1] * this.back.dims[2] * this.back.dims[3];
  this.drawBitmap = new Uint8Array(vx);
  this.drawUndoBitmap = null;
  this.drawTexture = this.r8Tex(
    this.drawTexture,
    this.gl.TEXTURE7,
    this.back.dims,
    true
  );
  this.refreshDrawing(false);
};

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

Niivue.prototype.drawUndo = function () {
  let hdr = this.back.hdr;
  let nv = hdr.dims[1] * hdr.dims[2] * hdr.dims[3];
  if (this.drawUndoBitmap.length !== nv || this.drawBitmap.length !== nv) {
    console.log("bitmap dims are wrong");
    return;
  }
  this.drawBitmap = this.drawUndoBitmap.slice();
  this.refreshDrawing(true);
};
Niivue.prototype.drawGrowCut = function () {
  let hdr = this.back.hdr;
  let nv = hdr.dims[1] * hdr.dims[2] * hdr.dims[3];
  if (this.drawBitmap.length !== nv) {
    console.log("bitmap dims are wrong");
    return;
  }
  this.drawUndoBitmap = this.drawBitmap.slice();
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
  for (let i = 1; i < nv; i++) if (img16[i] > 0) img16[i] = 10000;
  let strength0 = this.r16Tex(null, gl.TEXTURE4, this.back.dims, img16);
  let strength1 = this.r16Tex(null, gl.TEXTURE5, this.back.dims, img16);
  this.gl.bindVertexArray(this.genericVAO);
  let shader = this.growCutShader;
  shader.use(gl);
  gl.uniform1i(shader.uniforms["inputTexture0"], 3); // background is TEXTURE3
  //for (let j = 0; j < 250; j++) {
  for (let j = 0; j < 45; j++) {
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
  let readAttach = gl.COLOR_ATTACHMENT0;
  let readTex = label1;
  let readStrength = false;
  if (readStrength) {
    //read strength or label
    //readAttach = gl.COLOR_ATTACHMENT1;
    readTex = strength1;
  }
  //gl.readBuffer(gl.COLOR_ATTACHMENT1); //strength
  gl.readBuffer(readAttach); //label

  // assuming a framebuffer is bound with the texture to read attached
  const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
  const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
  if (format !== gl.RED_INTEGER || type !== gl.SHORT)
    console.log("readPixels will fail.");
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
  //let img16 = new Int16Array(nv);
  //gl.readPixels(0, 0, w, h, format, type);
  //            this.fallbackReadPixelsFormat, this.fallbackReadPixelsType, fallbackSliceView);

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
  this.refreshDrawing(true);
};

Niivue.prototype.drawPt = function (x, y, z, penValue) {
  let dx = this.back.dims[1];
  let dy = this.back.dims[2];
  let dz = this.back.dims[3];
  x = Math.min(Math.max(x, 0), dx - 1);
  y = Math.min(Math.max(y, 0), dy - 1);
  z = Math.min(Math.max(z, 0), dz - 1);
  this.drawBitmap[x + y * dx + z * dx * dy] = penValue;
};

//https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
// https://www.geeksforgeeks.org/bresenhams-algorithm-for-3-d-line-drawing/
// ptA, ptB are start and end points of line (each XYZ)
Niivue.prototype.drawLine = function (ptA, ptB, penValue) {
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
  if (
    !this.drawFillOverwrites &&
    this.drawUndoBitmap.length === this.drawBitmap.length
  ) {
    let nv = this.drawUndoBitmap.length;
    for (let i = 0; i < nv; i++) {
      if (this.drawUndoBitmap[i] === 0) continue;
      this.drawBitmap[i] = this.drawUndoBitmap[i];
    }
  }
  this.drawPenFillPts = [];
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
    this.drawLine(ptA, ptB, (i % 3) + 1);
  }
  this.refreshDrawing(true);
};*/

//release GPU and CPU memory: make sure you have saved any changes before calling this!
Niivue.prototype.closeDrawing = function () {
  this.rgbaTex(this.drawTexture, this.gl.TEXTURE7, [2, 2, 2, 2], true, true);
  this.drawBitmap = null;
};

//Copy drawing bitmap from CPU to GPU storage and redraw the screen
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

Niivue.prototype.loadFontTexture = function (fontUrl) {
  this.loadPngAsTexture(fontUrl, 3);
};

Niivue.prototype.loadBmpTexture = async function (bmpUrl) {
  await this.loadPngAsTexture(bmpUrl, 4);
};

// not included in public docs
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
  //this.gl.uniform1i(this.fontShader.uniforms["fontTexture"], 3);
  this.drawScene();
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
  await this.loadDefaultFont();
  this.drawLoadingText(this.loadingText);
}; // initText()

Niivue.prototype.setMeshShader = function (meshShaderNameOrNumber = 2) {
  //Niivue.prototype.setMeshShader = function (name) {
  this.gl.deleteProgram(this.meshShader.program);
  let num = 0;
  if (typeof meshShaderNameOrNumber === "number") num = meshShaderNameOrNumber;
  else {
    let name = meshShaderNameOrNumber.toLowerCase();
    for (var i = 0; i < this.meshShaders.length; i++) {
      if (this.meshShaders[i].Name.toLowerCase() === name) {
        num = i;
        break;
      }
    }
  }
  num = Math.min(num, this.meshShaders.length - 1);
  num = Math.max(num, 0);
  this.meshShader = new Shader(
    this.gl,
    vertMeshShader,
    this.meshShaders[num].Frag
  );
  this.updateGLVolume();
};

Niivue.prototype.setCustomMeshShader = function (fragmentShaderText = "") {
  if (fragmentShaderText.length < 1)
    fragmentShaderText = this.meshShaders[0].Frag;
  this.meshShader = new Shader(this.gl, vertMeshShader, fragmentShaderText);
  this.updateGLVolume();
};

Niivue.prototype.meshShaderNames = function (sort = true) {
  let cm = [];
  for (var i = 0; i < this.meshShaders.length; i++)
    cm.push(this.meshShaders[i].Name);
  return sort === true ? cm.sort() : cm;
};

// not included in public docs
Niivue.prototype.init = async function () {
  //initial setup: only at the startup of the component
  // print debug info (gpu vendor and renderer)
  let rendererInfo = this.gl.getExtension("WEBGL_debug_renderer_info");
  let vendor = this.gl.getParameter(rendererInfo.UNMASKED_VENDOR_WEBGL);
  let renderer = this.gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL);
  // await this.loadFont()
  log.info("renderer vendor: ", vendor);
  log.info("renderer: ", renderer);
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
  this.pickingShader = new Shader(
    this.gl,
    vertRenderShader,
    fragVolumePickingShader
  );
  this.pickingShader.use(this.gl);
  this.gl.uniform1i(this.pickingShader.uniforms["volume"], 0);
  //this.gl.uniform1i(pickingShader.uniforms["colormap"], 1); //orient shader applies colormap
  this.gl.uniform1i(this.pickingShader.uniforms["overlay"], 2);
  this.pickingShader.mvpUniformLoc = this.pickingShader.uniforms["mvpMtx"];
  this.pickingShader.rayDirUniformLoc = this.pickingShader.uniforms["rayDir"];
  this.pickingShader.clipPlaneUniformLoc =
    this.pickingShader.uniforms["clipPlane"];
  // slice shader
  this.sliceShader = new Shader(this.gl, vertSliceShader, fragSliceShader);
  this.sliceShader.use(this.gl);
  this.gl.uniform1i(this.sliceShader.uniforms["volume"], 0);
  //this.gl.uniform1i(this.sliceShader.uniforms["colormap"], 1); //orient shader applies colormap
  this.gl.uniform1i(this.sliceShader.uniforms["overlay"], 2);
  this.gl.uniform1i(this.sliceShader.uniforms["drawing"], 7);
  this.gl.uniform1f(this.sliceShader.uniforms["drawOpacity"], this.drawOpacity);
  // line shader (crosshair)
  this.lineShader = new Shader(this.gl, vertLineShader, fragLineShader);
  this.graphShader = new Shader(this.gl, vertGraphShader, fragLineShader);
  // render shader (3D)
  this.renderShader = new Shader(this.gl, vertRenderShader, fragRenderShader);
  this.renderShader.use(this.gl);
  this.gl.uniform1i(this.renderShader.uniforms["volume"], 0);
  //this.gl.uniform1i(this.renderShader.uniforms["colormap"], 1); //orient shader applies colormap
  this.gl.uniform1i(this.renderShader.uniforms["overlay"], 2);
  (this.renderShader.mvpUniformLoc = this.renderShader.uniforms["mvpMtx"]),
    (this.renderShader.mvpMatRASLoc = this.renderShader.uniforms["matRAS"]);
  (this.renderShader.rayDirUniformLoc = this.renderShader.uniforms["rayDir"]),
    (this.renderShader.clipPlaneUniformLoc =
      this.renderShader.uniforms["clipPlane"]),
    // colorbar shader
    (this.colorbarShader = new Shader(
      this.gl,
      vertColorbarShader,
      fragColorbarShader
    ));
  this.colorbarShader.use(this.gl);
  this.gl.uniform1i(this.colorbarShader.uniforms["colormap"], 1);

  this.growCutShader = new Shader(
    this.gl,
    vertGrowCutShader,
    fragGrowCutShader
  );

  // orientation shaders
  this.passThroughShader = new Shader(
    this.gl,
    vertPassThroughShader,
    fragPassThroughShader
  );

  this.orientShaderAtlasU = new Shader(
    this.gl,
    vertOrientShader,
    fragOrientShaderU.concat(fragOrientShaderAtlas)
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

  this.pickingSurfaceShader = new Shader(
    this.gl,
    vertRenderShader,
    fragDepthPickingShader
  );

  // 3D crosshair cylinder
  this.surfaceShader = new Shader(
    this.gl,
    vertSurfaceShader,
    fragSurfaceShader
  );

  // tractography fibers
  this.fiberShader = new Shader(this.gl, vertFiberShader, fragFiberShader);

  //mesh
  this.meshShader = new Shader(
    this.gl,
    vertMeshShader,
    this.meshShaders[0].Frag
  );

  this.bmpShader = new Shader(this.gl, vertBmpShader, fragBmpShader);

  await this.initText();
  if (this.opts.thumbnail.length > 0) {
    await this.loadBmpTexture(this.opts.thumbnail);
    this.thumbnailVisible = true;
  }
  this.updateGLVolume();
  this.initialized = true;
  this.drawScene();
  return this;
}; // init()

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
  this.drawScene();
}; // updateVolume()

// not included in public docs
Niivue.prototype.getDescriptives = function (
  layer = 0,
  ignoreZeros = false,
  masks = []
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
  if (ignoreZeros) {
    for (var i = 0; i < nv; i++) if (img[i] === 0) mask[i] = 0;
  }
  if (masks.length > 0) {
    for (var m = 0; m < masks.length; m++) {
      let imgMask = this.volumes[masks[m]].img;
      if (imgMask.length !== nv) {
        console.log(
          "Mask resolution does not match image. Skipping masking layer " +
            masks[m]
        );
        continue;
      }
      for (var i = 0; i < nv; i++) {
        if (imgMask[i] === 0 || isNaN(imgMask[i])) mask[i] = 0;
      } //for each voxel in mask
    } //for each mask
  } //if masks
  //Welfords method
  //https://www.embeddedrelated.com/showarticle/785.php
  //https://www.johndcook.com/blog/2008/09/26/comparing-three-methods-of-computing-standard-deviation/
  let k = 0;
  let M = 0;
  let S = 0;
  let mx = Number.NEGATIVE_INFINITY;
  let mn = Number.POSITIVE_INFINITY;
  for (var i = 0; i < nv; i++) {
    if (mask[i] < 1) continue;
    k += 1;
    let x = img[i];
    mn = Math.min(x, mx);
    mx = Math.max(x, mx);
    let Mnext = M + (x - M) / k;
    S = S + (x - M) * (x - Mnext);
    M = Mnext;
  }
  let stdev = Math.sqrt(S / (k - 1));
  let str =
    "Number of voxels: " +
    k +
    "\nMean:" +
    M +
    "\nMin:" +
    mn +
    "\nMax:" +
    mx +
    "\nStandard deviation: " +
    stdev +
    "\nRobust Min: " +
    this.volumes[layer].robust_min +
    "\nRobust Max: " +
    this.volumes[layer].robust_max;
  return {
    mean: M,
    stdev: stdev,
    nvox: k,
    min: mn,
    max: mx,
    robust_min: this.volumes[layer].robust_min,
    robust_max: this.volumes[layer].robust_max,
  };
};

// not included in public docs
Niivue.prototype.refreshLayers = function (overlayItem, layer, numLayers) {
  if (this.volumes.length < 1) return; //e.g. only meshes
  let hdr = overlayItem.hdr;
  let img = overlayItem.img;
  if (overlayItem.frame4D > 0 && overlayItem.frame4D < overlayItem.nFrame4D)
    img = overlayItem.img.slice(
      overlayItem.frame4D * overlayItem.nVox3D,
      (overlayItem.frame4D + 1) * overlayItem.nVox3D
    );
  let opacity = overlayItem.opacity;
  let outTexture = null;
  this.gl.bindVertexArray(this.unusedVAO);
  if (this.crosshairs3D !== null) this.crosshairs3D.mm[0] = NaN; //force crosshairs3D redraw
  let mtx = mat.mat4.clone(overlayItem.toRAS);
  if (layer === 0) {
    this.volumeObject3D = overlayItem.toNiivueObject3D(this.VOLUME_ID, this.gl);
    mat.mat4.invert(mtx, mtx);
    log.debug(`mtx layer ${layer}`, mtx);
    this.back.matRAS = overlayItem.matRAS;
    this.back.dims = overlayItem.dimsRAS;
    this.back.pixDims = overlayItem.pixDimsRAS;
    outTexture = this.rgbaTex(
      this.volumeTexture,
      this.gl.TEXTURE0,
      overlayItem.dimsRAS
    ); //this.back.dims)
    let { volScale, vox } = this.sliceScale(); // slice scale determined by this.back --> the base image layer
    this.volScale = volScale;
    this.vox = vox;
    this.volumeObject3D.scale = volScale;
    this.renderShader.use(this.gl);
    this.gl.uniform3fv(this.renderShader.uniforms["texVox"], vox);
    this.gl.uniform3fv(this.renderShader.uniforms["volScale"], volScale);
    // add shader to object
    let volumeRenderShader = this.renderShader;
    let pickingShader = this.pickingShader;
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
    let f000 = this.mm2frac(overlayItem.mm000); //origin in output space
    let f100 = this.mm2frac(overlayItem.mm100);
    let f010 = this.mm2frac(overlayItem.mm010);
    let f001 = this.mm2frac(overlayItem.mm001);
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
    orientShader = this.orientShaderI;
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
  if (layer > 1) {
    //use pass-through shader to copy previous color to temporary 2D texture
    blendTexture = this.rgbaTex(blendTexture, this.gl.TEXTURE5, this.back.dims);
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
  orientShader.use(this.gl);
  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
  this.gl.uniform1f(orientShader.uniforms["cal_min"], overlayItem.cal_min);
  this.gl.uniform1f(orientShader.uniforms["cal_max"], overlayItem.cal_max);
  this.gl.bindTexture(this.gl.TEXTURE_3D, tempTex3D);
  this.gl.uniform1i(orientShader.uniforms["intensityVol"], 6);
  this.gl.uniform1i(orientShader.uniforms["blend3D"], 5);
  this.gl.uniform1i(orientShader.uniforms["colormap"], 1);
  this.gl.uniform1f(orientShader.uniforms["layer"], layer);
  this.gl.uniform1f(orientShader.uniforms["numLayers"], numLayers);
  this.gl.uniform1f(orientShader.uniforms["scl_inter"], hdr.scl_inter);
  this.gl.uniform1f(orientShader.uniforms["scl_slope"], hdr.scl_slope);
  this.gl.uniform1f(orientShader.uniforms["opacity"], opacity);
  this.gl.uniformMatrix4fv(orientShader.uniforms["mtx"], false, mtx);
  if (hdr.intent_code === 1002) {
    let x = 1.0 / this.back.dims[1];
    if (!this.opts.isAtlasOutline) x = -x;
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
  this.gl.deleteTexture(blendTexture);
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

  this.gl.deleteFramebuffer(fb);

  // set slice scale for render shader
  this.renderShader.use(this.gl);
  let slicescl = this.sliceScale(); // slice scale determined by this.back --> the base image layer
  let vox = slicescl.vox;
  let volScale = slicescl.volScale;
  this.gl.uniform1f(this.renderShader.uniforms["overlays"], this.overlays);
  this.gl.uniform4fv(
    this.renderShader.uniforms["clipPlaneColor"],
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
  this.pickingShader.use(this.gl);
  this.gl.uniform1f(
    this.pickingShader.uniforms["overlays"],
    this.overlays.length
  );
  this.gl.uniform3fv(this.pickingShader.uniforms["texVox"], vox);
  // set overlays for slice shader
  this.sliceShader.use(this.gl);
  this.gl.uniform1f(
    this.sliceShader.uniforms["overlays"],
    this.overlays.length
  );
  this.gl.uniform1f(this.sliceShader.uniforms["drawOpacity"], this.drawOpacity);
  this.gl.uniform1i(this.sliceShader.uniforms["drawing"], 7);
  this.updateInterpolation(layer);
  //this.createEmptyDrawing(); //DO NOT DO THIS ON EVERY CALL TO REFRESH LAYERS!!!!
  //this.createRandomDrawing(); //DO NOT DO THIS ON EVERY CALL TO REFRESH LAYERS!!!!
}; // refreshLayers()

/**
 * query all available color maps that can be applied to volumes
 * @param {boolean} [sort=true] whether or not to sort the returned array
 * @returns {array} an array of colormap strings
 * @example
 * niivue = new Niivue()
 * colormaps = niivue.colorMaps()
 */
Niivue.prototype.colorMaps = function (sort = true) {
  return cmapper.colorMaps();
};

/**
 * update the colormap of an image given its ID
 * @param {string} id the ID of the NVImage
 * @param {string} colorMap the name of the colorMap to use
 * @example
 * niivue = new Niivue()
 * niivue.setColorMap(someImage.id, 'red')
 */
Niivue.prototype.setColorMap = function (id, colorMap) {
  let idx = this.getVolumeIndexByID(id);
  this.volumes[idx].colorMap = colorMap;
  this.updateGLVolume();
};

Niivue.prototype.setGamma = function (gamma = 1.0) {
  cmapper.gamma = gamma;
  this.updateGLVolume();
};

Niivue.prototype.setFrame4D = function (id, frame4D) {
  let idx = this.getVolumeIndexByID(id);
  // don't allow indexing timepoints beyond the max number of time points.
  if (frame4D > this.volumes[idx].nFrame4D - 1) {
    frame4D = this.volumes[idx].nFrame4D;
  }
  // don't allow negative timepoints
  if (frame4D < 0) {
    frame4D = 0;
  }
  this.volumes[idx].frame4D = frame4D;
  this.updateGLVolume();
};

Niivue.prototype.getFrame4D = function (id) {
  let idx = this.getVolumeIndexByID(id);
  return this.volumes[idx].nFrame4D;
};

// not included in public docs
Niivue.prototype.colormapFromKey = function (name) {
  return cmapper.colormapFromKey(name);
};

// not included in public docs
Niivue.prototype.colormap = function (lutName = "") {
  return cmapper.colormap(lutName);
}; // colormap()

// not included in public docs
Niivue.prototype.refreshColormaps = function () {
  let nLayer = this.volumes.length;
  if (nLayer < 1) return;
  if (this.colormapTexture !== null)
    this.gl.deleteTexture(this.colormapTexture);
  this.colormapTexture = this.gl.createTexture();
  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
  this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.RGBA8, 256, nLayer);
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
  let luts = this.colormap(this.volumes[0].colorMap);
  if (nLayer > 1) {
    for (let i = 1; i < nLayer; i++) {
      let lut = this.colormap(this.volumes[i].colorMap);
      let c = new Uint8ClampedArray(luts.length + lut.length);
      c.set(luts);
      c.set(lut, luts.length);
      luts = c;
    } //colorMap
  }
  this.gl.texSubImage2D(
    this.gl.TEXTURE_2D,
    0,
    0,
    0,
    256,
    nLayer,
    this.gl.RGBA,
    this.gl.UNSIGNED_BYTE,
    luts
  );
  return this;
}; // refreshColormaps()

// not included in public docs
Niivue.prototype.sliceScale = function () {
  var dims = [
    1.0,
    this.back.dims[1] * this.back.pixDims[1],
    this.back.dims[2] * this.back.pixDims[2],
    this.back.dims[3] * this.back.pixDims[3],
  ];
  var longestAxis = Math.max(dims[1], Math.max(dims[2], dims[3]));
  var volScale = [
    dims[1] / longestAxis,
    dims[2] / longestAxis,
    dims[3] / longestAxis,
  ];
  var vox = [this.back.dims[1], this.back.dims[2], this.back.dims[3]];
  return { volScale, vox };
}; // sliceScale()

// not included in public docs
Niivue.prototype.mouseClick = function (x, y, posChange = 0, isDelta = true) {
  var posNow;
  var posFuture;
  this.canvas.focus();
  if (this.thumbnailVisible) {
    this.gl.deleteTexture(this.bmpTexture);
    this.bmpTexture = null;
    this.thumbnailVisible = false;
    //the thumbnail is now released, do something profound: actually load the images
    this.loadVolumes(this.deferredVolumes);
    this.loadMeshes(this.deferredMeshes);
    return;
  }
  if (
    this.graph.opacity > 0.0 &&
    this.volumes[0].nFrame4D > 1 &&
    this.graph.plotLTWH
  ) {
    let pos = [x - this.graph.plotLTWH[0], y - this.graph.plotLTWH[1]];
    if (
      pos[0] > 0 &&
      pos[1] > 0 &&
      pos[0] <= this.graph.plotLTWH[2] &&
      pos[1] <= this.graph.plotLTWH[3]
    ) {
      let vol = Math.round(
        (pos[0] / this.graph.plotLTWH[2]) * (this.volumes[0].nFrame4D - 1)
      );
      //this.graph.selectedColumn = vol;
      this.volumes[0].frame4D = vol;
      this.updateGLVolume();
      return;
    }
  }
  if (this.sliceType === this.sliceTypeRender) {
    if (posChange === 0) return;
    //n.b. clip plane only influences voxel-based volumes, so zoom is only action for meshes

    if (this.volumes.length > 0 && this.scene.clipPlaneDepthAziElev[0] < 1.8) {
      //clipping mode: change clip plane depth
      //if (this.scene.clipPlaneDepthAziElev[0] > 1.8) return;
      let depthAziElev = this.scene.clipPlaneDepthAziElev.slice();
      //bound clip sqrt(3) = 1.73
      if (posChange > 0)
        depthAziElev[0] = Math.min(1.5, depthAziElev[0] + 0.025);
      if (posChange < 0)
        depthAziElev[0] = Math.max(-1.5, depthAziElev[0] - 0.025); //Math.max(-1.7,
      if (depthAziElev[0] !== this.scene.clipPlaneDepthAziElev[0]) {
        this.scene.clipPlaneDepthAziElev = depthAziElev;
        return this.setClipPlane(this.scene.clipPlaneDepthAziElev);
      }
      return;
    }
    if (posChange > 0)
      this.volScaleMultiplier = Math.min(2.0, this.volScaleMultiplier * 1.1);
    if (posChange < 0)
      this.volScaleMultiplier = Math.max(0.5, this.volScaleMultiplier * 0.9);
    this.drawScene();
    return;
  }
  if (
    this.numScreenSlices < 1 ||
    this.gl.canvas.height < 1 ||
    this.gl.canvas.width < 1
  )
    return;
  //mouse click X,Y in screen coordinates, origin at top left
  // webGL clip space L,R,T,B = [-1, 1, 1, 1]
  // n.b. webGL Y polarity reversed
  // https://webglfundamentals.org/webgl/lessons/webgl-fundamentals.html
  for (let i = 0; i < this.numScreenSlices; i++) {
    var axCorSag = this.screenSlices[i].axCorSag;
    if (this.drawPenAxCorSag >= 0 && this.drawPenAxCorSag !== axCorSag)
      continue; //if mouse is drawing on axial slice, ignore any entry to coronal slice
    if (axCorSag > this.sliceTypeSagittal) continue;
    var ltwh = this.screenSlices[i].leftTopWidthHeight;
    let isMirror = false;
    if (ltwh[2] < 0) {
      isMirror = true;
      ltwh[0] += ltwh[2];
      ltwh[2] = -ltwh[2];
    }
    var fracX = (x - ltwh[0]) / ltwh[2];
    if (isMirror) fracX = 1.0 - fracX;
    var fracY = 1.0 - (y - ltwh[1]) / ltwh[3];
    if (fracX >= 0.0 && fracX < 1.0 && fracY >= 0.0 && fracY < 1.0) {
      //user clicked on slice i
      if (!isDelta) {
        this.scene.crosshairPos[2 - axCorSag] = posChange;
        this.drawScene();
        return;
      }
      // scrolling... not mouse
      if (posChange !== 0) {
        posNow = this.scene.crosshairPos[2 - axCorSag];
        posFuture = posNow + posChange;
        if (posFuture > 1) posFuture = 1;
        if (posFuture < 0) posFuture = 0;
        this.scene.crosshairPos[2 - axCorSag] = posFuture;
        this.drawScene();
        this.scene.location$.next({
          mm: this.frac2mm(this.scene.crosshairPos),
          vox: this.frac2vox(this.scene.crosshairPos),
          frac: this.scene.crosshairPos,
          values: this.volumes.map((v) => {
            let mm = this.frac2mm(this.scene.crosshairPos);
            let vox = v.mm2vox(mm);
            let val = v.getValue(...vox);
            return val;
          }),
        });
        return;
      }
      if (axCorSag === this.sliceTypeAxial) {
        this.scene.crosshairPos[0] = fracX;
        this.scene.crosshairPos[1] = fracY;
      }
      if (axCorSag === this.sliceTypeCoronal) {
        this.scene.crosshairPos[0] = fracX;
        this.scene.crosshairPos[2] = fracY;
      }
      if (axCorSag === this.sliceTypeSagittal) {
        this.scene.crosshairPos[1] = fracX;
        this.scene.crosshairPos[2] = fracY;
      }
      if (this.opts.drawingEnabled) {
        let pt = this.frac2vox(this.scene.crosshairPos);
        if (isNaN(this.drawPenLocation[0])) {
          this.drawPenAxCorSag = axCorSag;
          this.drawPenFillPts = [];
          this.drawPt(...pt, this.opts.penValue);
          this.drawUndoBitmap = this.drawBitmap.slice();
        } else {
          if (
            pt[0] === this.drawPenLocation[0] &&
            pt[1] === this.drawPenLocation[1] &&
            pt[2] === this.drawPenLocation[2]
          )
            return;
          this.drawLine(pt, this.drawPenLocation, this.opts.penValue);
        }
        this.drawPenLocation = pt;
        if (this.opts.isFilledPen) this.drawPenFillPts.push(pt);
        this.refreshDrawing(false);
      }
      this.drawScene();
      this.scene.location$.next({
        mm: this.frac2mm(this.scene.crosshairPos),
        vox: this.frac2vox(this.scene.crosshairPos),
        frac: this.scene.crosshairPos,
        values: this.volumes.map((v) => {
          let mm = this.frac2mm(this.scene.crosshairPos);
          let vox = v.mm2vox(mm);
          let val = v.getValue(...vox);
          return val;
        }),
      });
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
Niivue.prototype.drawSelectionBox = function (leftTopWidthHeight) {
  this.lineShader.use(this.gl);
  this.gl.uniform4fv(
    this.lineShader.uniforms["lineColor"],
    this.opts.selectionBoxColor
  );
  this.gl.uniform2fv(this.lineShader.uniforms["canvasWidthHeight"], [
    this.gl.canvas.width,
    this.gl.canvas.height,
  ]);
  this.gl.uniform4f(
    this.lineShader.uniforms["leftTopWidthHeight"],
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
Niivue.prototype.drawColorbar = function (leftTopWidthHeight) {
  if (leftTopWidthHeight[2] <= 0 || leftTopWidthHeight[3] <= 0) return;
  // if (this.opts.crosshairWidth > 0) {
  // 	//gl.disable(gl.DEPTH_TEST);
  // 	this.lineShader.use(this.gl)
  // 	this.gl.uniform4fv(this.lineShader.uniforms["lineColor"], this.opts.crosshairColor);
  // 	this.gl.uniform2fv(this.lineShader.uniforms["canvasWidthHeight"], [this.gl.canvas.width, this.gl.canvas.height]);
  // 	let ltwh = [leftTopWidthHeight[0]-1, leftTopWidthHeight[1]-1, leftTopWidthHeight[2]+2, leftTopWidthHeight[3]+2];
  // 	this.gl.uniform4f(this.lineShader.uniforms["leftTopWidthHeight"], ltwh[0], ltwh[1], ltwh[2], ltwh[3]);
  // 	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  // }
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
  this.gl.uniform2fv(this.colorbarShader.uniforms["canvasWidthHeight"], [
    this.gl.canvas.width,
    this.gl.canvas.height,
  ]);
  this.gl.uniform4f(
    this.colorbarShader.uniforms["leftTopWidthHeight"],
    leftTopWidthHeight[0],
    leftTopWidthHeight[1],
    leftTopWidthHeight[2],
    leftTopWidthHeight[3]
  );
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
  //gl.enable(gl.DEPTH_TEST);
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
  this.gl.uniform4f(this.fontShader.uniforms["leftTopWidthHeight"], l, t, w, h);
  this.gl.uniform4fv(
    this.fontShader.uniforms["uvLeftTopWidthHeight"],
    metrics.uv_lbwh
  );
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  return scale * metrics.xadv;
}; // drawChar()

// not included in public docs
Niivue.prototype.drawLoadingText = function (text) {
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.enable(this.gl.CULL_FACE);
  this.gl.enable(this.gl.BLEND);
  this.drawTextBelow([this.canvas.width / 2, this.canvas.height / 2], text, 3);
  this.canvas.focus();
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
    this.fontShader.uniforms["canvasWidthHeight"],
    this.gl.canvas.width,
    this.gl.canvas.height
  );
  if (color === null) color = this.opts.crosshairColor;
  this.gl.uniform4fv(this.fontShader.uniforms["fontColor"], color);
  let screenPxRange = (size / this.fontMets.size) * this.fontMets.distanceRange;
  screenPxRange = Math.max(screenPxRange, 1.0); //screenPxRange() must never be lower than 1
  this.gl.uniform1f(this.fontShader.uniforms["screenPxRange"], screenPxRange);
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
}; // drawTextRight()

// not included in public docs
Niivue.prototype.drawTextBelow = function (xy, str, scale = 1, color = null) {
  //horizontally centered on x, below y
  if (this.opts.textHeight <= 0) return;
  let size = this.opts.textHeight * this.gl.canvas.height * scale;
  xy[0] -= 0.5 * this.textWidth(size, str);
  this.drawText(xy, str, scale, color);
}; // drawTextBelow()

Niivue.prototype.updateInterpolation = function (layer) {
  let interp = this.gl.LINEAR;
  if (this.opts.isNearestInterpolation) interp = this.gl.NEAREST;
  if (layer === 0) this.gl.activeTexture(this.gl.TEXTURE0);
  //background
  else this.gl.activeTexture(this.gl.TEXTURE2);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, interp);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, interp);
};

Niivue.prototype.setAtlasOutline = function (isOutline) {
  this.opts.isAtlasOutline = isOutline;
  this.updateGLVolume();
  this.drawScene();
}; // setAtlasOutline()

Niivue.prototype.setInterpolation = function (isNearest) {
  this.opts.isNearestInterpolation = isNearest;
  let numLayers = this.volumes.length;
  if (numLayers < 1) return;
  this.updateInterpolation(0);
  if (numLayers > 1) this.updateInterpolation(1);
  this.drawScene();
}; // setInterpolation()

Niivue.prototype.calculateMvpMatrixX = function () {
  let whratio = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
  //pivot from center of objects
  //let scale = this.furthestVertexFromOrigin;
  //let origin = [0,0,0];
  let scale = this.furthestFromPivot;
  let origin = [0, 0, 0];
  let projectionMatrix = mat.mat4.create();
  //scale = (0.8 * scale) / this.volScaleMultiplier; //2.0 WebGL viewport has range of 2.0 [-1,-1]...[1,1]
  if (whratio < 1)
    //tall window: "portrait" mode, width constrains
    mat.mat4.ortho(
      projectionMatrix,
      -scale,
      scale,
      -scale / whratio,
      scale / whratio,
      0.01,
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
      0.01,
      scale * 8.0
    );
  const modelMatrix = mat.mat4.create();
  modelMatrix[0] = -1; //mirror X coordinate
  //push the model away from the camera so camera not inside model

  let translateVec3 = mat.vec3.fromValues(0, 0, -scale * 1.8); // to avoid clipping, >= SQRT(3)
  mat.mat4.translate(modelMatrix, modelMatrix, translateVec3);
  if (this.position)
    mat.mat4.translate(modelMatrix, modelMatrix, this.position);

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
  //this.gl.uniformMatrix4fv(this.meshShader.uniforms["mvpMtx"], false, m);

  // transpose(out, a) - > {mat4}
  // invert(out, a)
  //  normalMatrix := modelMatrix.Inverse.Transpose;
  let modelViewProjectionMatrix = mat.mat4.create();
  mat.mat4.multiply(modelViewProjectionMatrix, projectionMatrix, modelMatrix);
  return [modelViewProjectionMatrix, modelMatrix, normalMatrix];
}; // calculateMvpMatrix

Niivue.prototype.drawMesh3DX = function (
  isDepthTest = true,
  alpha = 1.0,
  leftTopWidthHeight
) {
  if (this.meshes.length < 1) return;
  let gl = this.gl;
  let m, modelMtx, normMtx;
  [m, modelMtx, normMtx] = this.calculateMvpMatrixX(
    this.volumeObject3D,
    leftTopWidthHeight
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
  this.meshShader.use(this.gl); // set Shader
  //set shader uniforms
  gl.uniformMatrix4fv(this.meshShader.uniforms["mvpMtx"], false, m);
  gl.uniformMatrix4fv(this.meshShader.uniforms["modelMtx"], false, modelMtx);
  gl.uniformMatrix4fv(this.meshShader.uniforms["normMtx"], false, normMtx);
  gl.uniform1f(this.meshShader.uniforms["opacity"], alpha);
  let hasFibers = false;

  for (let i = 0; i < this.meshes.length; i++) {
    if (this.meshes[i].indexCount < 3) continue;
    if (this.meshes[i].offsetPt0) {
      hasFibers = true;
      continue;
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
  let shader = this.fiberShader;
  shader.use(this.gl);
  gl.uniformMatrix4fv(shader.uniforms["mvpMtx"], false, m);
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
Niivue.prototype.draw2D = function (leftTopWidthHeight, axCorSag) {
  this.gl.cullFace(this.gl.FRONT);
  let gl = this.gl;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.disable(gl.DEPTH_TEST);

  var crossXYZ = [
    this.scene.crosshairPos[0],
    this.scene.crosshairPos[1],
    this.scene.crosshairPos[2],
  ]; //axial: width=i, height=j, slice=k
  if (axCorSag === this.sliceTypeCoronal)
    crossXYZ = [
      this.scene.crosshairPos[0],
      this.scene.crosshairPos[2],
      this.scene.crosshairPos[1],
    ]; //coronal: width=i, height=k, slice=j
  if (axCorSag === this.sliceTypeSagittal)
    crossXYZ = [
      this.scene.crosshairPos[1],
      this.scene.crosshairPos[2],
      this.scene.crosshairPos[0],
    ]; //sagittal: width=j, height=k, slice=i
  let isMirrorLR =
    this.opts.isRadiologicalConvention && axCorSag < this.sliceTypeSagittal;
  this.sliceShader.use(this.gl);
  this.gl.uniform1f(
    this.sliceShader.uniforms["opacity"],
    this.volumes[0].opacity
  );
  this.gl.uniform1i(
    this.sliceShader.uniforms["backgroundMasksOverlays"],
    this.backgroundMasksOverlays
  );
  this.gl.uniform1i(this.sliceShader.uniforms["axCorSag"], axCorSag);
  this.gl.uniform1f(this.sliceShader.uniforms["slice"], crossXYZ[2]);
  this.gl.uniform2fv(this.sliceShader.uniforms["canvasWidthHeight"], [
    this.gl.canvas.width,
    this.gl.canvas.height,
  ]);
  if (isMirrorLR) {
    this.gl.disable(this.gl.CULL_FACE);
    leftTopWidthHeight[2] = -leftTopWidthHeight[2];
    leftTopWidthHeight[0] = leftTopWidthHeight[0] - leftTopWidthHeight[2];
  }
  this.gl.uniform4f(
    this.sliceShader.uniforms["leftTopWidthHeight"],
    leftTopWidthHeight[0],
    leftTopWidthHeight[1],
    leftTopWidthHeight[2],
    leftTopWidthHeight[3]
  );
  //gl.uniform4f(sliceShader.uniforms["leftTopWidthHeight"], leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3]);
  //gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  this.gl.bindVertexArray(this.genericVAO); //set vertex attributes
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  //record screenSlices to detect mouse click positions
  this.screenSlices[this.numScreenSlices].leftTopWidthHeight =
    leftTopWidthHeight;
  this.screenSlices[this.numScreenSlices].axCorSag = axCorSag;
  this.numScreenSlices += 1;
  if (this.opts.crosshairWidth <= 0.0) return;
  this.lineShader.use(this.gl);
  this.gl.uniform4fv(
    this.lineShader.uniforms["lineColor"],
    this.opts.crosshairColor
  );
  this.gl.uniform2fv(this.lineShader.uniforms["canvasWidthHeight"], [
    this.gl.canvas.width,
    this.gl.canvas.height,
  ]);
  //vertical line of crosshair:
  var xleft = leftTopWidthHeight[0] + leftTopWidthHeight[2] * crossXYZ[0];
  this.gl.uniform4f(
    this.lineShader.uniforms["leftTopWidthHeight"],
    xleft - 0.5 * this.opts.crosshairWidth,
    leftTopWidthHeight[1],
    this.opts.crosshairWidth,
    leftTopWidthHeight[3]
  );
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  //horizontal line of crosshair:
  var xtop =
    leftTopWidthHeight[1] + leftTopWidthHeight[3] * (1.0 - crossXYZ[1]);
  this.gl.uniform4f(
    this.lineShader.uniforms["leftTopWidthHeight"],
    leftTopWidthHeight[0],
    xtop - 0.5 * this.opts.crosshairWidth,
    leftTopWidthHeight[2],
    this.opts.crosshairWidth
  );
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  this.gl.bindVertexArray(this.unusedVAO); //set vertex attributes

  this.gl.enable(this.gl.CULL_FACE);
  if (isMirrorLR)
    this.drawTextRight(
      [
        leftTopWidthHeight[0] + leftTopWidthHeight[2] + 1,
        leftTopWidthHeight[1] + 0.5 * leftTopWidthHeight[3],
      ],
      "R"
    );
  else if (axCorSag < this.sliceTypeSagittal)
    this.drawTextRight(
      [
        leftTopWidthHeight[0] + 1,
        leftTopWidthHeight[1] + 0.5 * leftTopWidthHeight[3],
      ],
      "L"
    );
  if (axCorSag === this.sliceTypeAxial)
    this.drawTextBelow(
      [
        leftTopWidthHeight[0] + 0.5 * leftTopWidthHeight[2],
        leftTopWidthHeight[1] + 1,
      ],
      "A"
    );
  if (axCorSag > this.sliceTypeAxial)
    this.drawTextBelow(
      [
        leftTopWidthHeight[0] + 0.5 * leftTopWidthHeight[2],
        leftTopWidthHeight[1] + 1,
      ],
      "S"
    );
  if (axCorSag !== this.sliceTypeAxial) return;
  //  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  this.setPivot3D();
  gl.viewport(
    leftTopWidthHeight[0],
    leftTopWidthHeight[1],
    leftTopWidthHeight[2],
    leftTopWidthHeight[3]
  );
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.ALWAYS);
  gl.clearDepth(0.0);
  this.sync();
}; // draw2D()

Niivue.prototype.calculateMvpMatrix = function () {
  function deg2rad(deg) {
    return deg * (Math.PI / 180.0);
  }
  let whratio = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
  //pivot from center of objects
  //let scale = this.furthestVertexFromOrigin;
  //let origin = [0,0,0];
  let scale = this.furthestFromPivot;
  let origin = this.pivot3D;
  let projectionMatrix = mat.mat4.create();
  scale = (0.8 * scale) / this.volScaleMultiplier; //2.0 WebGL viewport has range of 2.0 [-1,-1]...[1,1]
  if (whratio < 1)
    //tall window: "portrait" mode, width constrains
    mat.mat4.ortho(
      projectionMatrix,
      -scale,
      scale,
      -scale / whratio,
      scale / whratio,
      0.01,
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
      0.01,
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
  mat.mat4.rotateX(
    modelMatrix,
    modelMatrix,
    deg2rad(270 - this.scene.renderElevation)
  );
  //apply azimuth
  mat.mat4.rotateZ(
    modelMatrix,
    modelMatrix,
    deg2rad(this.scene.renderAzimuth - 180)
  );
  //translate object to be in center of field of view (e.g. CT brain scans where origin is distant table center)
  /*if (this.volumeObject3D) {
    mat.mat4.translate(
      modelMatrix,
      modelMatrix,
      this.volumeObject3D.originNegate
    );
  }*/

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
  //this.gl.uniformMatrix4fv(this.meshShader.uniforms["mvpMtx"], false, m);

  // transpose(out, a) - > {mat4}
  // invert(out, a)
  //  normalMatrix := modelMatrix.Inverse.Transpose;
  let modelViewProjectionMatrix = mat.mat4.create();
  mat.mat4.multiply(modelViewProjectionMatrix, projectionMatrix, modelMatrix);
  return [modelViewProjectionMatrix, modelMatrix, normalMatrix];
}; // calculateMvpMatrix

// not included in public docs
Niivue.prototype.calculateRayDirection = function () {
  function deg2rad(deg) {
    return deg * (Math.PI / 180.0);
  }
  const modelMatrix = mat.mat4.create();
  modelMatrix[0] = -1; //mirror X coordinate
  //push the model away from the camera so camera not inside model
  //apply elevation
  mat.mat4.rotateX(
    modelMatrix,
    modelMatrix,
    deg2rad(270 - this.scene.renderElevation)
  );
  //apply azimuth
  mat.mat4.rotateZ(
    modelMatrix,
    modelMatrix,
    deg2rad(this.scene.renderAzimuth - 180)
  );
  if (this.back.obliqueRAS) {
    let oblique = mat.mat4.clone(this.back.obliqueRAS);
    mat.mat4.multiply(modelMatrix, modelMatrix, oblique);
  }
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

Niivue.prototype.setPivot3D = function () {
  //compute extents of all volumes and meshes in scene
  // pivot around center of these.
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
  }
  if (this.meshes.length > 0) {
    if (this.volumes.length < 1) {
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
  let pivot = mat.vec3.create();
  //pivot is half way between min and max:
  mat.vec3.add(pivot, mn, mx);
  mat.vec3.scale(pivot, pivot, 0.5);
  this.pivot3D = [pivot[0], pivot[1], pivot[2]];
  //find scale of scene
  mat.vec3.subtract(pivot, mx, mn);
  this.furthestFromPivot = mat.vec3.length(pivot) * 0.5; //pivot is half way between the extreme vertices
}; // setPivot3D()

Niivue.prototype.drawGraphLine = function (
  LTRB,
  color = [1, 0, 0, 0.5],
  thickness = 2
) {
  this.graphShader.use(this.gl);
  this.gl.uniform4fv(this.graphShader.uniforms["lineColor"], color);
  this.gl.uniform2fv(this.graphShader.uniforms["canvasWidthHeight"], [
    this.gl.canvas.width,
    this.gl.canvas.height,
  ]);
  this.gl.uniform1f(this.graphShader.uniforms["thickness"], thickness);
  this.gl.uniform4f(
    this.graphShader.uniforms["leftTopRightBottom"],
    LTRB[0],
    LTRB[1],
    LTRB[2],
    LTRB[3]
  );
  this.gl.bindVertexArray(this.genericVAO);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  this.gl.bindVertexArray(this.unusedVAO); //switch off to avoid tampering with settings
};

Niivue.prototype.drawRect = function (LTWH, color = [1, 0, 0, 0.5]) {
  this.lineShader.use(this.gl);
  this.gl.uniform4fv(this.lineShader.uniforms["lineColor"], color);
  this.gl.uniform2fv(this.lineShader.uniforms["canvasWidthHeight"], [
    this.gl.canvas.width,
    this.gl.canvas.height,
  ]);
  this.gl.uniform4f(
    this.lineShader.uniforms["leftTopWidthHeight"],
    LTWH[0],
    LTWH[1],
    LTWH[2],
    LTWH[3]
  );
  this.gl.bindVertexArray(this.genericVAO);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  this.gl.bindVertexArray(this.unusedVAO); //switch off to avoid tampering with settings
};

function tickSpacing(tickCount, mn, mx) {
  //https://www.realtimerendering.com/resources/GraphicsGems/gems/Label.c
  //https://stackoverflow.com/questions/326679/choosing-an-attractive-linear-scale-for-a-graphs-y-axis
  let range = Math.abs(mx - mn);
  if (range === 0.0) return [0, 0];
  let unroundedTickSize = range / (tickCount - 1);
  let x = Math.ceil(Math.log10(unroundedTickSize) - 1);
  let pow10x = Math.pow(10, x);
  let spacing = Math.ceil(unroundedTickSize / pow10x) * pow10x;
  let ticMin = mn;
  if ((mn / spacing) % 1 !== 0.0)
    ticMin = Math.sign(ticMin) * Math.round(Math.abs(ticMin));
  return [spacing, ticMin];
}

Niivue.prototype.drawGraph = function () {
  let gl = this.gl;
  let graph = this.graph;
  if (
    this.graph.autoSizeMultiplanar &&
    this.sliceType === this.sliceTypeMultiplanar
  ) {
    for (let i = 0; i < this.numScreenSlices; i++) {
      var axCorSag = this.screenSlices[i].axCorSag;
      if (axCorSag !== this.sliceTypeSagittal) continue;
      var ltwh = this.screenSlices[i].leftTopWidthHeight;
      graph.LTWH[0] = ltwh[0];
      graph.LTWH[1] = ltwh[1] + ltwh[3];
      graph.LTWH[2] = ltwh[2];
      graph.LTWH[3] = ltwh[2];
    }
  }
  if (graph.opacity <= 0.0 || graph.LTWH[2] <= 5 || graph.LTWH[3] <= 5) {
    return;
  }
  graph.backColor = [0.15, 0.15, 0.15, graph.opacity];
  graph.lineColor = [1, 1, 1, 1];
  graph.lineThickness = 4;
  graph.lineAlpha = 1;
  graph.textColor = [1, 1, 1, 1];
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
  //let vols = graph.vols;
  let maxVols = this.volumes[vols[0]].nFrame4D;
  this.graph.selectedColumn = this.volumes[vols[0]].frame4D;
  if (maxVols < 2) {
    console.log("Unable to generate a graph: Selected volume is 3D not 4D");
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
  let dark = 0.9; //make border around graph a bit darker than graph body
  let borderColor = [
    dark * graph.backColor[0],
    dark * graph.backColor[1],
    dark * graph.backColor[2],
    graph.backColor[3],
  ];
  this.drawRect(graph.LTWH, borderColor);
  let [spacing, ticMin] = tickSpacing(5, mn, mx);
  //determine font size
  function humanize(x) {
    //drop trailing zeros from numerical string
    return x.toFixed(6).replace(/\.?0*$/, "");
  }
  let minWH = Math.min(graph.LTWH[2], graph.LTWH[3]);
  let fntScale = 0.1 * (minWH / this.fontMets.size);
  let fntSize = this.opts.textHeight * this.gl.canvas.height * fntScale;
  if (fntSize < 16) fntSize = 0;
  //let fntHeight = fntScale * this.fontMets.size;
  let maxTextWid = 0;
  let lineH = ticMin;
  //determine widest label in vertical axis

  while (fntSize > 0 && lineH <= mx) {
    let str = humanize(lineH);
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
  this.graph.plotLTWH = plotLTWH;
  this.drawRect(plotLTWH, [
    graph.backColor[0],
    graph.backColor[1],
    graph.backColor[2],
    graph.backColor[3] * 2,
  ]);
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
    this.drawGraphLine(
      [plotLTWH[0], y, plotLTWH[0] + plotLTWH[2], y],
      thinColor,
      0.5 * graph.lineThickness
    );
    lineH += spacing;
  }
  lineH = ticMin;
  //draw thick horizontal lines
  while (lineH <= mx) {
    let y = plotBottom - (lineH - mn) * scaleH;
    this.drawGraphLine(
      [plotLTWH[0], y, plotLTWH[0] + plotLTWH[2], y],
      graph.lineColor,
      graph.lineThickness
    );
    let str = humanize(lineH);
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
      this.drawGraphLine(
        [x, plotLTWH[1], x, plotLTWH[1] + plotLTWH[3]],
        thinColor,
        thick
      );
    } else if (i > 0) {
      let str = humanize(i);
      if (fntSize > 0)
        this.drawTextBelow(
          [x, 2 + plotLTWH[1] + plotLTWH[3]],
          str,
          fntScale,
          graph.textColor
        );
      this.drawGraphLine(
        [x, plotLTWH[1], x, plotLTWH[1] + plotLTWH[3]],
        graph.lineColor,
        thick
      );
    } //this.drawTextBelow(xy, str, scale = 1);
    //this.drawRect([x, plotLTWH[1], 1, plotLTWH[3]], graph.lineColor);
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
      this.drawGraphLine(LTWH, lineRGBA, graph.lineThickness);
    } //for i: each point
  } //for j: each line
  //draw vertical line indicating selected volume
  if (
    graph.selectedColumn >= 0 &&
    graph.selectedColumn < graph.lines[0].length
  ) {
    let x = graph.selectedColumn * scaleW + plotLTWH[0];
    let color = graph.lineRGB[0];
    this.drawGraphLine(
      [x, plotLTWH[1], x, plotLTWH[1] + plotLTWH[3]],
      [graph.lineRGB[3][0], graph.lineRGB[3][1], graph.lineRGB[3][2], 1],
      graph.lineThickness
    );
  }
};

// not included in public docs
Niivue.prototype.draw3D = function () {
  this.setPivot3D();
  let gl = this.gl;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.ALWAYS);
  gl.clearDepth(0.0);
  if (this.volumes.length === 0) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.drawMesh3D(true, 1);
    return;
  }

  // mvp matrix and ray direction can now be a constant because of world space
  let mvpMatrix, modelMatrix, normalMatrix;
  // eslint-disable-next-line no-unused-vars
  [mvpMatrix, modelMatrix, normalMatrix] = this.calculateMvpMatrix(
    this.volumeObject3D
  );
  const rayDir = this.calculateRayDirection();
  let object3D = this.volumeObject3D;
  // render picking surfaces
  if (this.scene.mouseDepthPicker) {
    //start PICKING: picking shader and reading values is slow
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.scene.mouseDepthPicker = false;
    if (object3D.isVisible && object3D.isPickable) {
      let shader = this.pickingShader;
      shader.use(this.gl);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.FRONT); //TH switch since we L/R flipped in calculateMvpMatrix
      gl.uniformMatrix4fv(shader.mvpUniformLoc, false, mvpMatrix);
      gl.uniform3fv(shader.rayDirUniformLoc, rayDir);
      gl.uniform4fv(shader.clipPlaneUniformLoc, this.scene.clipPlane);
      gl.uniform1i(shader.uniforms["id"], object3D.id);
      gl.bindVertexArray(object3D.vao);
      gl.drawElements(object3D.mode, object3D.indexCount, gl.UNSIGNED_SHORT, 0);
      gl.bindVertexArray(this.unusedVAO);
    }
    //check if we have a selected object
    const pixelX = (this.mousePos[0] * gl.canvas.width) / gl.canvas.clientWidth;
    const pixelY =
      gl.canvas.height -
      (this.mousePos[1] * gl.canvas.height) / gl.canvas.clientHeight -
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
    }
    //if (253 === rgbaPixel[3]) { ... clip plane clicked
  } //end PICKING

  //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (this.volumeObject3D.isVisible) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT); //TH switch since we L/R flipped in calculateMvpMatrix
    let shader = this.renderShader; //.use(this.gl);
    shader.use(this.gl);
    gl.uniform1i(
      shader.uniforms["backgroundMasksOverlays"],
      this.backgroundMasksOverlays
    );
    gl.uniformMatrix4fv(shader.mvpUniformLoc, false, mvpMatrix);
    gl.uniformMatrix4fv(shader.mvpMatRASLoc, false, this.back.matRAS);
    gl.uniform3fv(shader.rayDirUniformLoc, rayDir);
    gl.uniform4fv(shader.clipPlaneUniformLoc, this.scene.clipPlane);
    gl.bindVertexArray(object3D.vao);
    gl.drawElements(object3D.mode, object3D.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(this.unusedVAO);
  }
  this.drawCrosshairs3D(true, 1.0);
  this.drawMesh3D(true, 1.0);
  this.drawMesh3D(false, 0.02);
  //  this.drawMesh3D(true, 1.0);
  this.drawCrosshairs3D(false, 0.15);
  let posString =
    "azimuth: " +
    this.scene.renderAzimuth.toFixed(0) +
    " elevation: " +
    this.scene.renderElevation.toFixed(0);
  this.drawGraph();
  //bus.$emit('crosshair-pos-change', posString);
  this.readyForSync = true;
  this.sync();
  return posString;
}; // draw3D()

Niivue.prototype.drawMesh3D = function (isDepthTest = true, alpha = 1.0) {
  if (this.meshes.length < 1) return;
  let gl = this.gl;
  let m, modelMtx, normMtx;
  [m, modelMtx, normMtx] = this.calculateMvpMatrix(this.volumeObject3D);

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
  this.meshShader.use(this.gl); // set Shader
  //set shader uniforms
  gl.uniformMatrix4fv(this.meshShader.uniforms["mvpMtx"], false, m);
  gl.uniformMatrix4fv(this.meshShader.uniforms["modelMtx"], false, modelMtx);
  gl.uniformMatrix4fv(this.meshShader.uniforms["normMtx"], false, normMtx);
  gl.uniform1f(this.meshShader.uniforms["opacity"], alpha);
  let hasFibers = false;

  for (let i = 0; i < this.meshes.length; i++) {
    if (this.meshes[i].indexCount < 3) continue;
    if (this.meshes[i].offsetPt0) {
      hasFibers = true;
      continue;
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
  let shader = this.fiberShader;
  shader.use(this.gl);
  gl.uniformMatrix4fv(shader.uniforms["mvpMtx"], false, m);
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

Niivue.prototype.drawCrosshairs3D = function (isDepthTest = true, alpha = 1.0) {
  if (!this.opts.show3Dcrosshair) return;
  let gl = this.gl;
  let mm = this.frac2mm(this.scene.crosshairPos);
  // mm = [-20, 0, 30]; // <- set any value here to test
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
    let radius = Math.min(
      Math.min(this.back.pixDims[1], this.back.pixDims[2]),
      this.back.pixDims[3]
    );
    this.crosshairs3D = NiivueObject3D.generateCrosshairs(
      this.gl,
      1,
      mm,
      this.volumeObject3D.extentsMin,
      this.volumeObject3D.extentsMax,
      radius
    );
    //this.crosshairs3D.minExtent = this.volumeObject3D.minExtent;
    //this.crosshairs3D.maxExtent = this.volumeObject3D.maxExtent;
    this.crosshairs3D.mm = mm;
    //this.crosshairs3D.originNegate = this.volumeObject3D.originNegate;
  }
  let crosshairsShader = this.surfaceShader;
  crosshairsShader.use(this.gl);
  let m, modelMtx, normMtx;
  // eslint-disable-next-line no-unused-vars
  [m, modelMtx, normMtx] = this.calculateMvpMatrix(this.crosshairs3D);
  gl.uniformMatrix4fv(crosshairsShader.uniforms["mvpMtx"], false, m);

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
  gl.uniform4fv(crosshairsShader.uniforms["surfaceColor"], color);
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
Niivue.prototype.mm2frac = function (mm, volIdx = 0) {
  //given mm, return volume fraction
  //convert from object space in millimeters to normalized texture space XYZ= [0..1, 0..1 ,0..1]
  let mm4 = mat.vec4.fromValues(mm[0], mm[1], mm[2], 1);
  let d = this.volumes[volIdx].dimsRAS;
  let frac = [0, 0, 0];
  if (typeof d === "undefined") {
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
  let vox = [
    Math.round(frac[0] * this.volumes[volIdx].dims[1] - 0.5), // dims == RAS
    Math.round(frac[1] * this.volumes[volIdx].dims[2] - 0.5), // dims == RAS
    Math.round(frac[2] * this.volumes[volIdx].dims[3] - 0.5), // dims == RAS
  ];
  return vox;
}; // frac2vox()

// not included in public docs
Niivue.prototype.moveCrosshairInVox = function (x, y, z) {
  let vox = this.frac2vox(this.scene.crosshairPos);
  vox[0] += x;
  vox[1] += y;
  vox[2] += z;
  this.scene.crosshairPos = this.vox2frac(vox);
  this.drawScene();
};

// not included in public docs
Niivue.prototype.frac2mm = function (frac, volIdx = 0) {
  //convert from normalized texture space XYZ= [0..1, 0..1 ,0..1] to object space in millimeters
  let pos = mat.vec4.fromValues(frac[0], frac[1], frac[2], 1);
  //let d = overlayItem.hdr.dims;
  let dim = mat.vec4.fromValues(
    this.volumes[volIdx].dimsRAS[1],
    this.volumes[volIdx].dimsRAS[2],
    this.volumes[volIdx].dimsRAS[3],
    1
  );
  let sform = mat.mat4.clone(this.volumes[volIdx].matRAS);
  mat.mat4.transpose(sform, sform);
  mat.vec4.mul(pos, pos, dim);
  let shim = mat.vec4.fromValues(-0.5, -0.5, -0.5, 0); //bitmap with 5 voxels scaled 0..1, voxel centers are 0.1,0.3,0.5,0.7,0.9
  mat.vec4.add(pos, pos, shim);
  mat.vec4.transformMat4(pos, pos, sform);
  return pos;
}; // frac2mm()

// not included in public docs
Niivue.prototype.canvasPos2frac = function (canvasPos) {
  let x, y, z;

  // convert canvas pos to normalized texture space
  for (let i = 0; i < this.numScreenSlices; i++) {
    var axCorSag = this.screenSlices[i].axCorSag;
    if (axCorSag > this.sliceTypeSagittal) continue;

    var ltwh = this.screenSlices[i].leftTopWidthHeight;
    let isMirror = false;
    if (ltwh[2] < 0) {
      isMirror = true;
      ltwh[0] += ltwh[2];
      ltwh[2] = -ltwh[2];
    }

    var fracX = (canvasPos[0] - ltwh[0]) / ltwh[2];
    if (isMirror) {
      fracX = 1.0 - fracX;
    }

    var fracY = 1.0 - (canvasPos[1] - ltwh[1]) / ltwh[3];
    if (fracX >= 0.0 && fracX < 1.0 && fracY >= 0.0 && fracY < 1.0) {
      // this is the slice the user right clicked in
      switch (axCorSag) {
        case this.sliceTypeAxial:
          break;
        case this.sliceTypeCoronal:
          break;
        default:
      }

      if (axCorSag === this.sliceTypeAxial) {
        x = fracX;
        y = fracY;
        z = this.scene.crosshairPos[2];
      }
      if (axCorSag === this.sliceTypeCoronal) {
        x = fracX;
        y = this.scene.crosshairPos[1];
        z = fracY;
      }
      if (axCorSag === this.sliceTypeSagittal) {
        x = this.scene.crosshairPos[0];
        y = fracX;
        z = fracY;
      }

      break;
    }
  }

  return [x, y, z];
}; // canvas2frac

// not included in public docs
// note: we also have a "sliceScale" method, which could be confusing
Niivue.prototype.scaleSlice = function (w, h) {
  let scalePix = this.gl.canvas.clientWidth / w;
  if (h * scalePix > this.gl.canvas.clientHeight)
    scalePix = this.gl.canvas.clientHeight / h;
  //canvas space is 0,0...w,h with origin at upper left
  let wPix = w * scalePix;
  let hPix = h * scalePix;
  let leftTopWidthHeight = [
    (this.gl.canvas.clientWidth - wPix) * 0.5,
    (this.gl.canvas.clientHeight - hPix) * 0.5,
    wPix,
    hPix,
  ];
  //let leftTopWidthHeight = [(gl.canvas.clientWidth-wPix) * 0.5, 80, wPix, hPix];
  return leftTopWidthHeight;
}; // scaleSlice()

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
};

// not included in public docs
Niivue.prototype.drawScene = function () {
  if (!this.initialized) {
    return; // do not do anything until we are initialized (init will call drawScene).
  }
  this.gl.clearColor(
    this.opts.backColor[0],
    this.opts.backColor[1],
    this.opts.backColor[2],
    this.opts.backColor[3]
  );
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  if (this.bmpTexture) {
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
      this.sliceType = this.sliceTypeRender; //only meshes loaded: we must use 3D render mode
      return this.draw3D(); //meshes loaded but no volume
    }
    this.drawLoadingText(this.loadingText);
    return;
  }
  if (!this.back.hasOwnProperty("dims")) return;
  if (this.sliceType === this.sliceTypeRender) {
    //draw rendering
    if (this.isDragging && this.scene.clipPlaneDepthAziElev[0] < 1.8) {
      //if (this.scene.clipPlaneDepthAziElev[0] > 1.8) return;
      let x = this.dragStart[0] - this.dragEnd[0];
      let y = this.dragStart[1] - this.dragEnd[1];
      let depthAziElev = this.dragClipPlaneStartDepthAziElev.slice();
      depthAziElev[1] -= x;
      depthAziElev[1] = depthAziElev[1] % 360;
      depthAziElev[2] += y;
      //gimbal lock: these next two lines could be changed - when we go over the pole, the Azimuth reverses
      //if (depthAziElev[2] > 90) depthAziElev[2] = 90;
      //if (depthAziElev[2] < -90) depthAziElev[2] = -90;
      if (
        depthAziElev[1] !== this.scene.clipPlaneDepthAziElev[1] ||
        depthAziElev[2] !== this.scene.clipPlaneDepthAziElev[2]
      ) {
        this.scene.clipPlaneDepthAziElev = depthAziElev;
        return this.setClipPlane(this.scene.clipPlaneDepthAziElev);
      }
    }
    return this.draw3D();
  }
  let { volScale } = this.sliceScale();
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.numScreenSlices = 0;
  if (this.sliceType === this.sliceTypeAxial) {
    //draw axial
    let leftTopWidthHeight = this.scaleSlice(volScale[0], volScale[1]);
    this.draw2D(leftTopWidthHeight, 0);
  } else if (this.sliceType === this.sliceTypeCoronal) {
    //draw coronal
    let leftTopWidthHeight = this.scaleSlice(volScale[0], volScale[2]);
    this.draw2D(leftTopWidthHeight, 1);
  } else if (this.sliceType === this.sliceTypeSagittal) {
    //draw sagittal
    let leftTopWidthHeight = this.scaleSlice(volScale[1], volScale[2]);
    this.draw2D(leftTopWidthHeight, 2);
  } else {
    //sliceTypeMultiplanar
    let ltwh = this.scaleSlice(
      volScale[0] + volScale[1],
      volScale[1] + volScale[2]
    );
    let wX = (ltwh[2] * volScale[0]) / (volScale[0] + volScale[1]);
    let ltwh3x1 = this.scaleSlice(
      volScale[0] + volScale[0] + volScale[1],
      Math.max(volScale[1], volScale[2])
    );
    let wX1 =
      (ltwh3x1[2] * volScale[0]) / (volScale[0] + volScale[0] + volScale[1]);
    if (wX1 > wX && !this.graph.autoSizeMultiplanar) {
      //landscape screen ratio: 3 slices in single row
      let pixScale = wX1 / volScale[0];
      let hY1 = volScale[1] * pixScale;
      let hZ1 = volScale[2] * pixScale;
      //draw axial
      this.draw2D([ltwh3x1[0], ltwh3x1[1], wX1, hY1], 0);
      //draw coronal
      this.draw2D([ltwh3x1[0] + wX1, ltwh3x1[1], wX1, hZ1], 1);
      //draw sagittal
      this.draw2D([ltwh3x1[0] + wX1 + wX1, ltwh3x1[1], hY1, hZ1], 2);
    } else {
      let wY = ltwh[2] - wX;
      let hY = (ltwh[3] * volScale[1]) / (volScale[1] + volScale[2]);
      let hZ = ltwh[3] - hY;
      //draw axial
      this.draw2D([ltwh[0], ltwh[1] + hZ, wX, hY], 0);
      //draw coronal
      this.draw2D([ltwh[0], ltwh[1], wX, hZ], 1);
      //draw sagittal
      this.draw2D([ltwh[0] + wX, ltwh[1], wY, hZ], 2);
      //draw colorbar (optional) // TODO currently only drawing one colorbar, there may be one per overlay + one for the background
      var margin = this.opts.colorBarMargin * hY;
      if (!this.graph.autoSizeMultiplanar) {
        this.drawColorbar([
          ltwh[0] + wX + margin,
          ltwh[1] + hZ + margin,
          wY - margin - margin,
          hY * this.opts.colorbarHeight,
        ]);
      }
      // drawTextBelow(gl, [ltwh[0]+ wX + (wY * 0.5), ltwh[1] + hZ + margin + hY * colorbarHeight], "Syzygy"); //DEMO
    }
  }
  if (this.isDragging && this.sliceType !== this.sliceTypeRender) {
    let width = Math.abs(this.dragStart[0] - this.dragEnd[0]);
    let height = Math.abs(this.dragStart[1] - this.dragEnd[1]);

    this.drawSelectionBox([
      Math.min(this.dragStart[0], this.dragEnd[0]),
      Math.min(this.dragStart[1], this.dragEnd[1]),
      width,
      height,
    ]);
  }

  const pos = this.frac2mm([
    this.scene.crosshairPos[0],
    this.scene.crosshairPos[1],
    this.scene.crosshairPos[2],
  ]);
  this.drawGraph();

  posString =
    pos[0].toFixed(2) + "×" + pos[1].toFixed(2) + "×" + pos[2].toFixed(2);
  this.gl.finish();

  this.readyForSync = true; // by the time we get here, all volumes should be loaded and ready to be drawn. We let other niivue instances know that we can now reliably sync draw calls (images are loaded)
  return posString;
}; // drawScene()
