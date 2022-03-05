import { Shader } from "./shader.js";
import * as mat from "gl-matrix";
import { vertSliceShader, fragSliceShader } from "./shader-srcs.js";
import { vertLineShader, fragLineShader } from "./shader-srcs.js";
import { vertRenderShader, fragRenderShader } from "./shader-srcs.js";
import { vertColorbarShader, fragColorbarShader } from "./shader-srcs.js";
import { vertFontShader, fragFontShader } from "./shader-srcs.js";
import {
  vertOrientShader,
  vertPassThroughShader,
  fragPassThroughShader,
  fragOrientShaderU,
  fragOrientShaderI,
  fragOrientShaderF,
  fragOrientShader,
  fragOrientShaderAtlas,
  fragRGBOrientShader,
  vertSurfaceShader,
  fragSurfaceShader,
  fragDepthPickingShader,
  fragVolumePickingShader,
} from "./shader-srcs.js";
import * as cmaps from "./cmaps";
import { Subject } from "rxjs";
import { NiivueObject3D } from "./niivue-object3D.js";
import { NiivueShader3D } from "./niivue-shader3D";
import { NVImage } from "./nvimage.js";
export { NVImage } from "./nvimage";
import { Log } from "./logger";
import defaultFontPNG from "./fonts/Roboto-Regular.png";
import defaultFontMetrics from "./fonts/Roboto-Regular.json";
//import { niimathWorker } from "@niivue/niimath-js";
import { v4 as uuidv4 } from "uuid";
const log = new Log();

/**
 * @class Niivue
 * @description
 * Niivue can be attached to a canvas. An instance of Niivue contains methods for
 * loading and rendering NIFTI image data in a WebGL 2.0 context.
 * @constructor
 * @param {object} [options] options object to set modifiable Niivue properties
 * @param {number} [options.textHeight=0.3] the text height for orientation labels (0 to 1). Zero for no text labels
 * @param {number} [options.colorbarHeight=0.05] size of colorbar. 0 for no colorbars, fraction of Nifti j dimension
 * @param {number} [options.colorBarMargin=0.05] padding around colorbar when displayed
 * @param {number} [options.crosshairWidth=1] crosshair size. Zero for no crosshair
 * @param {array}  [options.backColor=[0,0,0,1]] the background color. RGBA values from 0 to 1. Default is black
 * @param {array}  [options.crosshairColor=[1,0,0,1]] the crosshair color. RGBA values from 0 to 1. Default is red
 * @param {array}  [options.selectionBoxColor=[1,1,1,0.5]] the selection box color when the intensty selection box is shown (right click and drag). RGBA values from 0 to 1. Default is transparent white
 * @param {array}  [options.clipPlaneColor=[1,1,1,0.5]] the color of the visible clip plane. RGBA values from 0 to 1. Default is white
 * @param {boolean} [options.trustCalMinMax=true] true/false whether to trust the nifti header values for cal_min and cal_max. Trusting them results in faster loading because we skip computing these values from the data
 * @param {string} [options.clipPlaneHotKey="KeyC"] the keyboard key used to cycle through clip plane orientations. The default is "c"
 * @param {string} [options.viewModeHotKey="KeyV"] the keyboard key used to cycle through view modes. The default is "v"
 * @param {number} [options.keyDebounceTime=50] the keyUp debounce time in milliseconds. The default is 50 ms. You must wait this long before a new hot-key keystroke will be registered by the event listener
 * @param {boolean} [options.isRadiologicalConvention=false] whether or not to use radiological convention in the display
 * @param {string} [options.logging=false] turn on logging or not (true/false)
 * @param {string} [options.loadingText="waiting on images..."] the loading text to display when there is a blank canvas and no images
 * @param {boolean} [options.dragAndDropEnabled=true] whether or not to allow file and url drag and drop on the canvas
 * @example
 * let niivue = new Niivue({crosshairColor: [0,1,0,0.5], textHeight: 0.5}) // a see-through green crosshair, and larger text labels
 */
export const Niivue = function (options = {}) {
  this.opts = {}; // will be populate with opts or defaults when a new Niivue object instance is created
  this.defaults = {
    textHeight: 0.06, // 0 for no text, fraction of canvas min(height,width)
    colorbarHeight: 0.05, // 0 for no colorbars, fraction of Nifti j dimension
    crosshairWidth: 1, // 0 for no crosshairs
    show3Dcrosshair: false,
    backColor: [0, 0, 0, 1],
    crosshairColor: [1, 0, 0, 1],
    selectionBoxColor: [1, 1, 1, 0.5],
    clipPlaneColor: [1, 1, 1, 0.5],
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
  };

  this.canvas = null; // the canvas element on the page
  this.gl = null; // the gl context
  this.colormapTexture = null;
  this.volumeTexture = null;
  this.overlayTexture = null;
  this.sliceShader = null;
  this.lineShader = null;
  this.renderShader = null;
  this.pickingShader = null;
  this.colorbarShader = null;
  this.fontShader = null;
  this.passThroughShader = null;
  this.orientShaderAtlasU = null;
  this.orientShaderU = null;
  this.orientShaderI = null;
  this.orientShaderF = null;
  this.orientShaderRGBU = null;
  this.surfaceShader = null;
  this.crosshairs3D = null;
  this.pickingSurfaceShader = null;

  this.DEFAULT_FONT_GLYPH_SHEET = defaultFontPNG; //"/fonts/Roboto-Regular.png";
  this.DEFAULT_FONT_METRICS = defaultFontMetrics; //"/fonts/Roboto-Regular.json";
  this.fontMets = null;

  this.sliceTypeAxial = 0;
  this.sliceTypeCoronal = 1;
  this.sliceTypeSagittal = 2;
  this.sliceTypeMultiplanar = 3;
  this.sliceTypeRender = 4;
  this.sliceType = this.sliceTypeMultiplanar; // sets current view in webgl canvas
  this.scene = {};
  this.syncOpts = {};
  this.scene.renderAzimuth = 110; //-45;
  this.scene.renderElevation = 10; //-165; //15;
  this.scene.crosshairPos = [0.5, 0.5, 0.5];
  this.scene.clipPlane = [0, 0, 0, 0];
  this.scene.mousedown = false;
  this.scene.touchdown = false;
  this.scene.mouseButtonLeft = 0;
  this.scene.mouseButtonRight = 2;
  this.scene.mouseButtonLeftDown = false;
  this.scene.mouseButtonRightDown = false;
  this.scene.prevX = 0;
  this.scene.prevY = 0;
  this.scene.currX = 0;
  this.scene.currY = 0;
  this.back = {}; // base layer; defines image space to work in. Defined as this.volumes[0] in Niivue.loadVolumes
  this.overlays = []; // layers added on top of base image (e.g. masks or stat maps). Essentially everything after this.volumes[0] is an overlay. So is this necessary?
  this.volumes = []; // all loaded images. Can add in the ability to push or slice as needed
  this.backTexture = [];
  this.objectsToRender3D = [];
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
  this.backOpacity = 1.0;
  this.isDragging = false;
  this.dragStart = [0.0, 0.0];
  this.dragEnd = [0.0, 0.0];
  this.lastTwoTouchDistance = 0;
  this.otherNV = null; // another niivue instance that we wish to sync postion with
  this.volumeObject3D = null;
  this.clipPlaneObject3D = null;
  this.intensityRange$ = new Subject(); // needs to be updated to have an intensity range for each loaded image #172
  this.scene.location$ = new Subject(); // object with properties: {mm: [N N N], vox: [N N N], frac: [N N N]}
  this.scene.loading$ = new Subject(); // whether or not the scene is loading
  this.currentClipPlaneIndex = 0;
  this.lastCalled = new Date().getTime();
  this.multiTouchGesture = false;
  this.gestureInterval = null;
  this.selectedObjectId = -1;
  this.CLIP_PLANE_ID = 1;
  this.VOLUME_ID = 250;
  this.DISTANCE_FROM_CAMERA = -0.54;

  this.initialized = false;
  // loop through known Niivue properties
  // if the user supplied opts object has a
  // property listed in the known properties, then set
  // Niivue.opts.<prop> to that value, else apply defaults.
  for (let prop in this.defaults) {
    this.opts[prop] =
      options[prop] === undefined ? this.defaults[prop] : options[prop];
  }

  this.loadingText = this.opts.loadingText;

  log.setLogLevel(this.opts.logging);

  // maping of keys (event strings) to rxjs subjects
  this.eventsToSubjects = {
    location: this.scene.location$,
    loading: this.scene.loading$,
  };

  // rxjs subscriptions. Keeping a reference array like this allows us to unsubscribe later
  this.subscriptions = [];
};

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

  var mnScale = intensityRaw2Scaled(hdr, lo);
  var mxScale = intensityRaw2Scaled(hdr, hi);
  this.volumes[volIdx].cal_min = mnScale;
  this.volumes[volIdx].cal_max = mxScale;
  this.intensityRange$.next([mnScale, mxScale]);
};

// not included in public docs
// handler for mouse button up (all buttons)
// note: no test yet
Niivue.prototype.mouseUpListener = function () {
  this.scene.mousedown = false;
  this.scene.mouseButtonRightDown = false;
  this.scene.mouseButtonLeftDown = false;
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
    return;
  }
  this.volumes[0].cal_min = this.volumes[0].robust_min;
  this.volumes[0].cal_max = this.volumes[0].robust_max;
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
      this.currentClipPlaneIndex = (this.currentClipPlaneIndex + 1) % 4;
      this.clipPlaneObject3D.isVisible = this.currentClipPlaneIndex;
      switch (this.currentClipPlaneIndex) {
        case 0:
          this.scene.clipPlane = [0, 0, 0, 0];
          this.clipPlaneObject3D.rotation = [0, 0, 0];
          break;
        case 1:
          this.scene.clipPlane = [1, 0, 0, 0];
          this.clipPlaneObject3D.rotation = [0, 1, 0];
          break;
        case 2:
          this.scene.clipPlane = [0, 1, 0, 0];
          this.clipPlaneObject3D.rotation = [1, 0, 0];
          break;
        case 3:
          this.scene.clipPlane = [0, 0, 1, 0];
          this.clipPlaneObject3D.rotation = [0, 0, 1];
          break;
      }
      this.drawScene();
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
Niivue.prototype.dropListener = async function (e) {
  e.stopPropagation();
  e.preventDefault();
  // don't do anything if drag and drop has been turned off
  if (!this.opts.dragAndDropEnabled) {
    return;
  }

  const dt = e.dataTransfer;
  const url = dt.getData("text/uri-list");
  if (url) {
    let volume = await NVImage.loadFromUrl(url);
    this.setVolume(volume);
  } else {
    const files = dt.files;
    if (files.length > 0) {
      this.volumes = [];
      this.overlays = [];
      let volume = await NVImage.loadFromFile(files[0]);
      this.setVolume(volume);
    }
  }
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
 * niivue.addVolume(NVImage.loadFromUrl('./someURL.nii.gz'))
 */
Niivue.prototype.addVolume = function (volume) {
  this.volumes.push(volume);
  let idx = this.volumes.length === 1 ? 1 : this.volumes.length - 1;
  this.setVolume(volume, idx);
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

Niivue.prototype.removeVolume = function (volume) {
  this.setVolume(volume, -1);
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
 * niivue.clipPlaneUpdate([42, 42])
 */
Niivue.prototype.clipPlaneUpdate = function (azimuthElevation) {
  // azimuthElevation is 2 component vector [a, e, d]
  //  azimuth: camera position in degrees around object, typically 0..360 (or -180..+180)
  //  elevation: camera height in degrees, range -90..90
  //  depth: distance of clip plane from center of volume, range 0..~1.73 (e.g. 2.0 for no clip plane)
  if (this.sliceType != this.sliceTypeRender) return;
  let v = this.sph2cartDeg(azimuthElevation[0], azimuthElevation[1]);
  this.scene.clipPlane = [v[0], v[1], v[2], azimuthElevation[2]];
  this.drawScene();
}; // clipPlaneUpdate()

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
    this.backOpacity = newOpacity;
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
  if (!this.initialized) {
    //await this.init();
  }
  this.volumes = [];
  this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);

  this.scene.loading$.next(false);
  // for loop to load all volumes in volumeList
  for (let i = 0; i < volumeList.length; i++) {
    this.scene.loading$.next(true);
    let volume = await NVImage.loadFromUrl(
      volumeList[i].url,
      volumeList[i].name,
      volumeList[i].colorMap,
      volumeList[i].opacity,
      this.opts.trustCalMinMax
    );
    this.scene.loading$.next(false);
    this.volumes.push(volume);
    if (i === 0) {
      this.back = volume;
    }
    this.overlays = this.volumes.slice(1);
    this.updateGLVolume();
  } // for
  return this;
}; // loadVolumes()

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
Niivue.prototype.loadFontTexture = function (fontUrl) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => {
      let pngTexture = this.gl.createTexture();
      this.gl.activeTexture(this.gl.TEXTURE3);
      this.gl.bindTexture(this.gl.TEXTURE_2D, pngTexture);
      this.gl.uniform1i(this.fontShader.uniforms["fontTexture"], 3);
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
    };

    img.onerror = reject;

    this.requestCORSIfNotSameOrigin(img, fontUrl);
    img.src = fontUrl;
  });
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
  this.gl.uniform1i(this.fontShader.uniforms["fontTexture"], 3);
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

Niivue.prototype.initText = async function () {
  // font shader
  //multi-channel signed distance font https://github.com/Chlumsky/msdfgen
  this.fontShader = new Shader(this.gl, vertFontShader, fragFontShader);
  this.fontShader.use(this.gl);

  await this.loadDefaultFont();
  this.drawLoadingText(this.loadingText);
}; // initText()

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

  this.gl.enable(this.gl.CULL_FACE);
  this.gl.cullFace(this.gl.FRONT);
  this.gl.enable(this.gl.BLEND);
  this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

  // register volume and overlay textures
  this.rgbaTex(this.volumeTexture, this.gl.TEXTURE0, [2, 2, 2, 2], true);
  this.rgbaTex(this.overlayTexture, this.gl.TEXTURE2, [2, 2, 2, 2], true);

  let vao = this.gl.createVertexArray();
  this.gl.bindVertexArray(vao);

  // We will render the objects in order they are stored in this.objectsToRender3D

  // clip plane geometry
  let clipPlaneVertices = new Float32Array([
    0.0,
    1.0,
    0.5,
    1.0,
    1.0,
    0.5,
    1.0,
    0.0,
    0.5, // Triangle 1
    0.0,
    1.0,
    0.5,
    1.0,
    0.0,
    0.5,
    0.0,
    0.0,
    0.5, // Triangle 2
  ]);

  // Create a buffer object
  let vertexBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
  this.gl.bufferData(
    this.gl.ARRAY_BUFFER,
    clipPlaneVertices,
    this.gl.STATIC_DRAW
  );
  this.gl.enableVertexAttribArray(0);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);

  this.clipPlaneObject3D = new NiivueObject3D(
    this.CLIP_PLANE_ID,
    vertexBuffer,
    this.gl.TRIANGLES,
    6
  );
  this.clipPlaneObject3D.position = [0, 0, this.DISTANCE_FROM_CAMERA];
  this.clipPlaneObject3D.isVisible = false; // clip plane should be invisible until activated
  this.clipPlaneObject3D.rotationRadians = Math.PI / 2;

  this.objectsToRender3D.push(this.clipPlaneObject3D);

  let cubeStrip = [
    0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0,
    0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0,
  ];
  this.cuboidVertexBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cuboidVertexBuffer);
  this.gl.bufferData(
    this.gl.ARRAY_BUFFER,
    new Float32Array(cubeStrip),
    this.gl.STATIC_DRAW
  );

  let vbo = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
  this.gl.bufferData(
    this.gl.ARRAY_BUFFER,
    new Float32Array(cubeStrip),
    this.gl.STATIC_DRAW
  );
  this.gl.enableVertexAttribArray(0);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);

  this.volumeObject3D = new NiivueObject3D(
    this.VOLUME_ID,
    vbo,
    this.gl.TRIANGLE_STRIP,
    14
  ); //cube is 12 triangles, triangle-strip creates n-2 triangles
  this.volumeObject3D.glFlags =
    this.volumeObject3D.BLEND |
    this.volumeObject3D.CULL_FACE |
    this.volumeObject3D.CULL_FRONT;
  this.volumeObject3D.position = [0, 0, this.DISTANCE_FROM_CAMERA];
  let pickingShader = new Shader(
    this.gl,
    vertRenderShader,
    fragVolumePickingShader
  );
  pickingShader.use(this.gl);
  this.gl.uniform1i(pickingShader.uniforms["volume"], 0);
  this.gl.uniform1i(pickingShader.uniforms["colormap"], 1);
  this.gl.uniform1i(pickingShader.uniforms["overlay"], 2);
  pickingShader.mvpUniformName = "mvpMtx";
  pickingShader.rayDirUniformName = "rayDir";
  pickingShader.clipPlaneUniformName = "clipPlane";
  this.volumeObject3D.pickingShader = pickingShader;
  this.objectsToRender3D.push(this.volumeObject3D);

  // slice shader
  this.sliceShader = new Shader(this.gl, vertSliceShader, fragSliceShader);
  this.sliceShader.use(this.gl);
  this.gl.uniform1i(this.sliceShader.uniforms["volume"], 0);
  this.gl.uniform1i(this.sliceShader.uniforms["colormap"], 1);
  this.gl.uniform1i(this.sliceShader.uniforms["overlay"], 2);

  // line shader (crosshair)
  this.lineShader = new Shader(this.gl, vertLineShader, fragLineShader);

  // render shader (3D)
  this.renderShader = new Shader(this.gl, vertRenderShader, fragRenderShader);
  this.renderShader.use(this.gl);
  this.gl.uniform1i(this.renderShader.uniforms["volume"], 0);
  this.gl.uniform1i(this.renderShader.uniforms["colormap"], 1);
  this.gl.uniform1i(this.renderShader.uniforms["overlay"], 2);

  this.pickingShader = new Shader(
    this.gl,
    vertRenderShader,
    fragVolumePickingShader
  );

  // add shader to object
  let volumeRenderShader = new NiivueShader3D(this.renderShader);
  volumeRenderShader.mvpUniformName = "mvpMtx";
  volumeRenderShader.matRASUniformName = "matRAS";
  volumeRenderShader.rayDirUniformName = "rayDir";
  volumeRenderShader.clipPlaneUniformName = "clipPlane";
  this.volumeObject3D.renderShaders.push(volumeRenderShader);

  // colorbar shader
  this.colorbarShader = new Shader(
    this.gl,
    vertColorbarShader,
    fragColorbarShader
  );
  this.colorbarShader.use(this.gl);
  this.gl.uniform1i(this.colorbarShader.uniforms["colormap"], 1);

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

  // clip planer shader
  this.surfaceShader = new Shader(
    this.gl,
    vertSurfaceShader,
    fragSurfaceShader
  );

  this.surfaceShader.use(this.gl);
  this.gl.uniform4fv(
    this.surfaceShader.uniforms["surfaceColor"],
    this.opts.clipPlaneColor
  );

  let clipPlaneShader = new NiivueShader3D(this.surfaceShader);
  clipPlaneShader.mvpUniformName = "mvpMtx";
  this.clipPlaneObject3D.renderShaders.push(clipPlaneShader);

  await this.initText();
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
  this.drawScene();
}; // updateVolume()

// not included in public docs
Niivue.prototype.refreshLayers = function (overlayItem, layer, numLayers) {
  let hdr = overlayItem.hdr;
  let img = overlayItem.img;
  let opacity = overlayItem.opacity;
  let outTexture = null;

  if (this.crosshairs3D !== null) this.crosshairs3D.mm[0] = NaN; //force crosshairs3D redraw
  let mtx = mat.mat4.clone(overlayItem.toRAS);
  if (layer === 0) {
    this.volumeObject3D = overlayItem.toNiivueObject3D(this.VOLUME_ID, this.gl);
    this.volumeObject3D.glFlags = this.volumeObject3D.CULL_FACE;
    this.objectsToRender3D.splice(0, 1, this.volumeObject3D);

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
    volumeRenderShader.mvpUniformName = "mvpMtx";
    volumeRenderShader.matRASUniformName = "matRAS";
    volumeRenderShader.rayDirUniformName = "rayDir";
    volumeRenderShader.clipPlaneUniformName = "clipPlane";
    pickingShader.use(this.gl);
    this.gl.uniform1i(pickingShader.uniforms["volume"], 0);
    this.gl.uniform1i(pickingShader.uniforms["colormap"], 1);
    this.gl.uniform1i(pickingShader.uniforms["overlay"], 2);
    pickingShader.mvpUniformName = "mvpMtx";
    pickingShader.rayDirUniformName = "rayDir";
    pickingShader.clipPlaneUniformName = "clipPlane";
    this.gl.uniform3fv(pickingShader.uniforms["volScale"], volScale);
    if (this.volumeObject3D.pickingShader === null)
      this.volumeObject3D.pickingShader = pickingShader;

    this.volumeObject3D.renderShaders.push(volumeRenderShader);
    // let mm = this.frac2mm(this.scene.crosshairPos);
    //mm = [-20, 0, 30]; // <- set any value here to test
    // generate our crosshairs for the base volume
    // this.crosshairs3D = NiivueObject3D.generateCrosshairs(
    //   this.gl,
    //   1,
    //   mm,
    //   this.volumeObject3D.extentsMin,
    //   this.volumeObject3D.extentsMax,
    //   Math.max(this.volumeObject3D.furthestVertexFromOrigin / 50.0, 1.0)
    // );
    // this.crosshairs3D.isPickable = false;
    // this.crosshairs3D.minExtent = this.volumeObject3D.minExtent;
    // this.crosshairs3D.maxExtent = this.volumeObject3D.maxExtent;
    // this.crosshairs3D.furthestVertexFromOrigin =
    //   this.volumeObject3D.furthestVertexFromOrigin;
    // this.crosshairs3D.glFlags |= this.crosshairs3D.ENABLE_DEPTH_TEST;
    // this.crosshairs3D.glFlags |= this.crosshairs3D.BLEND;
    log.debug(this.volumeObject3D);
    // let crosshairsShader = new NiivueShader3D(this.surfaceShader);
    // crosshairsShader.mvpUniformName = "mvpMtx";
    // this.crosshairs3D.renderShaders.push(crosshairsShader);
    // this.objectsToRender3D.splice(1, 1, this.crosshairs3D);
    // // this.objectsToRender3D.splice(0, 0, this.crosshairs3D);
    // console.log(this.objectsToRender3D);
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
      f100[1],
      f100[2],
      f000[0],
      f010[0],
      f010[1],
      f010[2],
      f000[1],
      f001[0],
      f001[1],
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
      this.backTexture = outTexture;
    } else outTexture = this.backTexture;
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
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
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
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  }
  this.gl.deleteTexture(tempTex3D);
  this.gl.deleteTexture(blendTexture);
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.deleteFramebuffer(fb);

  // set overlays for slice shader
  this.sliceShader.use(this.gl);
  this.gl.uniform1f(this.sliceShader.uniforms["overlays"], this.overlays);

  // set slice scale for render shader
  this.renderShader.use(this.gl);
  let slicescl = this.sliceScale(); // slice scale determined by this.back --> the base image layer
  let vox = slicescl.vox;
  let volScale = slicescl.volScale;
  this.gl.uniform1f(this.renderShader.uniforms["overlays"], this.overlays);
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
  this.volumeObject3D.pickingShader.use(this.gl);
  this.gl.uniform1f(this.pickingShader.uniforms["overlays"], this.overlays);
  this.gl.uniform3fv(this.volumeObject3D.pickingShader.uniforms["texVox"], vox);
  this.updateInterpolation(layer);
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
  let cm = [];
  for (const [key] of Object.entries(cmaps)) {
    cm.push(key);
  }
  return sort === true ? cm.sort() : cm;
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

// not included in public docs
Niivue.prototype.colormapFromKey = function (name) {
  let availMaps = this.colorMaps();
  for (let i = 0; i < availMaps.length; i++) {
    let key = availMaps[i];
    if (name.toLowerCase() === key.toLowerCase()) {
      return cmaps[key];
    }
  }
};

// not included in public docs
Niivue.prototype.colormap = function (lutName = "") {
  //function colormap(lutName = "") {
  let defaultLutName = "gray";
  let availMaps = this.colorMaps();
  for (let i = 0; i < availMaps.length; i++) {
    let key = availMaps[i];
    if (lutName.toLowerCase() === key.toLowerCase()) {
      return this.makeLut(
        cmaps[key].R,
        cmaps[key].G,
        cmaps[key].B,
        cmaps[key].A,
        cmaps[key].I
      );
    }
  }
  // if no match the return the default gray lut
  return this.makeLut(
    cmaps[defaultLutName].R,
    cmaps[defaultLutName].G,
    cmaps[defaultLutName].B,
    cmaps[defaultLutName].A,
    cmaps[defaultLutName].I
  );
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
Niivue.prototype.makeLut = function (Rs, Gs, Bs, As, Is) {
  //create color lookup table provided arrays of reds, greens, blues, alphas and intensity indices
  //intensity indices should be in increasing order with the first value 0 and the last 255.
  // this.makeLut([0, 255], [0, 0], [0,0], [0,128],[0,255]); //red gradient
  var lut = new Uint8ClampedArray(256 * 4);
  for (var i = 0; i < Is.length - 1; i++) {
    //return a + f * (b - a);
    var idxLo = Is[i];
    var idxHi = Is[i + 1];
    var idxRng = idxHi - idxLo;
    var k = idxLo * 4;
    for (var j = idxLo; j <= idxHi; j++) {
      var f = (j - idxLo) / idxRng;
      lut[k++] = Rs[i] + f * (Rs[i + 1] - Rs[i]); //Red
      lut[k++] = Gs[i] + f * (Gs[i + 1] - Gs[i]); //Green
      lut[k++] = Bs[i] + f * (Bs[i + 1] - Bs[i]); //Blue
      lut[k++] = As[i] + f * (As[i + 1] - As[i]); //Alpha
    }
  }
  return lut;
}; // makeLut()

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

  if (this.sliceType === this.sliceTypeRender) {
    if (posChange === 0) return;
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
          values: this.volumes.map((v, index) => {
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
      this.drawScene();
      this.scene.location$.next({
        mm: this.frac2mm(this.scene.crosshairPos),
        vox: this.frac2vox(this.scene.crosshairPos),
        frac: this.scene.crosshairPos,
        values: this.volumes.map((v, index) => {
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
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
};

// not included in public docs
Niivue.prototype.drawColorbar = function (leftTopWidthHeight) {
  if (leftTopWidthHeight[2] <= 0 || leftTopWidthHeight[3] <= 0) return;
  //console.log("bar:", leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3]);
  // if (this.opts.crosshairWidth > 0) {
  // 	//gl.disable(gl.DEPTH_TEST);
  // 	this.lineShader.use(this.gl)
  // 	this.gl.uniform4fv(this.lineShader.uniforms["lineColor"], this.opts.crosshairColor);
  // 	this.gl.uniform2fv(this.lineShader.uniforms["canvasWidthHeight"], [this.gl.canvas.width, this.gl.canvas.height]);
  // 	let ltwh = [leftTopWidthHeight[0]-1, leftTopWidthHeight[1]-1, leftTopWidthHeight[2]+2, leftTopWidthHeight[3]+2];
  // 	this.gl.uniform4f(this.lineShader.uniforms["leftTopWidthHeight"], ltwh[0], ltwh[1], ltwh[2], ltwh[3]);
  // 	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
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
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
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
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  return scale * metrics.xadv;
}; // drawChar()

// not included in public docs
Niivue.prototype.drawLoadingText = function (text) {
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.enableVertexAttribArray(0);
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cuboidVertexBuffer);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
  this.gl.enable(this.gl.CULL_FACE);

  this.drawTextBelow([this.canvas.width / 2, this.canvas.height / 2], text, 3);
  this.canvas.focus();
};

// not included in public docs
Niivue.prototype.drawText = function (xy, str, scale = 1) {
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
  this.gl.uniform4fv(
    this.fontShader.uniforms["fontColor"],
    this.opts.crosshairColor
  );
  let screenPxRange = (size / this.fontMets.size) * this.fontMets.distanceRange;
  screenPxRange = Math.max(screenPxRange, 1.0); //screenPxRange() must never be lower than 1
  this.gl.uniform1f(this.fontShader.uniforms["screenPxRange"], screenPxRange);
  var bytes = new TextEncoder().encode(str);
  for (let i = 0; i < str.length; i++)
    xy[0] += this.drawChar(xy, size, bytes[i]);
}; // drawText()

// not included in public docs
Niivue.prototype.drawTextRight = function (xy, str, scale = 1) {
  //to right of x, vertically centered on y
  if (this.opts.textHeight <= 0) return;
  xy[1] -= 0.5 * this.opts.textHeight * this.gl.canvas.height;
  this.drawText(xy, str, scale);
}; // drawTextRight()

// not included in public docs
Niivue.prototype.drawTextBelow = function (xy, str, scale = 1) {
  //horizontally centered on x, below y
  if (this.opts.textHeight <= 0) return;
  let size = this.opts.textHeight * this.gl.canvas.height * scale;
  xy[0] -= 0.5 * this.textWidth(size, str);
  this.drawText(xy, str, scale);
}; // drawTextBelow()

Niivue.prototype.updateInterpolation = function (layer) {
  let interp = this.gl.LINEAR;
  if (this.opts.isNearestInterpolation) interp = this.gl.NEAREST;
  if (layer === 0)
    //background
    this.gl.activeTexture(this.gl.TEXTURE0);
  else this.gl.activeTexture(this.gl.TEXTURE2);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, interp);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, interp);
  let numLayers = this.volumes.length;
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

// not included in public docs
Niivue.prototype.draw2D = function (leftTopWidthHeight, axCorSag) {
  this.gl.cullFace(this.gl.FRONT);
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cuboidVertexBuffer);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);

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
  this.gl.uniform1f(this.sliceShader.uniforms["opacity"], this.backOpacity);
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
  //console.log(leftTopWidthHeight);
  //gl.uniform4f(sliceShader.uniforms["leftTopWidthHeight"], leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3]);
  //gl.drawArrays(gl.TRIANGLE_STRIP, 5, 4);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
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
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
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
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
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
  this.sync();
}; // draw2D()

Niivue.prototype.calculateMvpMatrix = function (object3D) {
  function deg2rad(deg) {
    return deg * (Math.PI / 180.0);
  }
  let whratio = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
  let projectionMatrix = mat.mat4.create();
  let scale =
    (0.7 * this.volumeObject3D.furthestVertexFromOrigin * 1.0) /
    this.volScaleMultiplier; //2.0 WebGL viewport has range of 2.0 [-1,-1]...[1,1]
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
  mat.mat4.translate(modelMatrix, modelMatrix, this.volumeObject3D.position);
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
  mat.mat4.translate(
    modelMatrix,
    modelMatrix,
    this.volumeObject3D.originNegate
  );
  let modelViewProjectionMatrix = mat.mat4.create();
  mat.mat4.multiply(modelViewProjectionMatrix, projectionMatrix, modelMatrix);
  return modelViewProjectionMatrix;
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
  let oblique = mat.mat4.clone(this.back.obliqueRAS);
  mat.mat4.multiply(modelMatrix, modelMatrix, oblique);
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
Niivue.prototype.draw3D = function () {
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  // render picking surfaces

  // mvp matrix and ray direction can now be a constant because of world space
  const mvpMatrix = this.calculateMvpMatrix(this.volumeObject3D);
  const rayDir = this.calculateRayDirection();

  for (const object3D of this.objectsToRender3D) {
    if (!object3D.isVisible || !object3D.isPickable) {
      continue;
    }

    let pickingShader = object3D.pickingShader
      ? object3D.pickingShader
      : this.pickingSurfaceShader;
    pickingShader.use(this.gl);

    if (object3D.glFlags & object3D.CULL_FACE) {
      this.gl.enable(this.gl.CULL_FACE);
      if (object3D.glFlags & object3D.CULL_FRONT) {
        this.gl.cullFace(this.gl.FRONT);
      } else {
        this.gl.cullFace(this.gl.FRONT);
      }
    } else {
      this.gl.disable(this.gl.CULL_FACE);
    }

    this.gl.uniformMatrix4fv(
      pickingShader.uniforms["mvpMtx"],
      false,
      mvpMatrix
    );

    if (pickingShader.rayDirUniformName) {
      let rayDir = this.calculateRayDirection();
      this.gl.uniform3fv(
        pickingShader.uniforms[pickingShader.rayDirUniformName],
        rayDir
      );
    }

    if (pickingShader.clipPlaneUniformName) {
      this.gl.uniform4fv(
        pickingShader.uniforms["clipPlane"],
        this.scene.clipPlane
      );
    }

    this.gl.uniform1i(pickingShader.uniforms["id"], object3D.id);

    this.gl.enableVertexAttribArray(0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, object3D.vertexBuffer);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);

    if (object3D.textureCoordinateBuffer) {
      this.gl.enableVertexAttribArray(1);
      this.gl.bindBuffer(
        this.gl.ARRAY_BUFFER,
        object3D.textureCoordinateBuffer
      );
      this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, 0, 0);
    } else {
      this.gl.disableVertexAttribArray(1);
    }

    if (object3D.indexBuffer) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, object3D.indexBuffer);
    }

    if (object3D.glFlags & object3D.CULL_FACE) {
      this.gl.enable(this.gl.CULL_FACE);
      if (object3D.glFlags & object3D.CULL_FRONT) {
        this.gl.cullFace(this.gl.FRONT);
      } else {
        this.gl.cullFace(this.gl.FRONT); //TH switch since we L/R flipped in calculateMvpMatrix
      }
    } else {
      this.gl.disable(this.gl.CULL_FACE);
    }
  if (object3D.mode === this.gl.TRIANGLE_STRIP) {
    console.log(object3D.mode, 'picking clip plane (strip)', object3D.vertexBuffer);
    continue; //nx= TO DO: support clip planes
  }
    this.gl.drawElements(
      object3D.mode,
      object3D.indexCount,
      this.gl.UNSIGNED_SHORT,
      0
    );
  }
  // // check if we have a selected object
  const pixelX =
    (this.mousePos[0] * this.gl.canvas.width) / this.gl.canvas.clientWidth;
  const pixelY =
    this.gl.canvas.height -
    (this.mousePos[1] * this.gl.canvas.height) / this.gl.canvas.clientHeight -
    1;
  const rgbaPixel = new Uint8Array(4);
  this.gl.readPixels(
    pixelX, // x
    pixelY, // y
    1, // width
    1, // height
    this.gl.RGBA, // format
    this.gl.UNSIGNED_BYTE, // type
    rgbaPixel
  ); // typed array to hold result

  //restore default vertex buffer:
  this.gl.enableVertexAttribArray(0);
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cuboidVertexBuffer);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
  
  this.selectedObjectId = rgbaPixel[3];
  if (this.selectedObjectId === this.VOLUME_ID) {
    this.scene.crosshairPos = new Float32Array(rgbaPixel.slice(0, 3)).map(
      (x) => x / 255.0
    );
  }

  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  //???WHY this.gl.clearColor(0.2, 0, 0, 1);
  for (const object3D of this.objectsToRender3D) {
    if (!object3D.isVisible) {
      continue;
    }

    this.gl.enableVertexAttribArray(0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, object3D.vertexBuffer);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
    if (object3D.textureCoordinateBuffer) {
      this.gl.enableVertexAttribArray(1);
      this.gl.bindBuffer(
        this.gl.ARRAY_BUFFER,
        object3D.textureCoordinateBuffer
      );
      this.gl.vertexAttribPointer(1, 3, this.gl.FLOAT, false, 0, 0);
    }

    if (object3D.indexBuffer) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, object3D.indexBuffer);
    }
    // set GL options
    if (object3D.glFlags & object3D.BLEND) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    } else {
      this.gl.disable(this.gl.BLEND);
    }

    if (object3D.glFlags & object3D.CULL_FACE) {
      this.gl.enable(this.gl.CULL_FACE);
      if (object3D.glFlags & object3D.CULL_FRONT) {
        this.gl.cullFace(this.gl.FRONT);
      } else {
        this.gl.cullFace(this.gl.FRONT); //TH switch since we L/R flipped in calculateMvpMatrix
      }
    } else {
      this.gl.disable(this.gl.CULL_FACE);
    }

    for (const shader of object3D.renderShaders) {
      shader.use(this.gl);
      if (shader.mvpUniformName) {
        this.gl.uniformMatrix4fv(
          shader.uniforms[shader.mvpUniformName],
          false,
          mvpMatrix
        );
      }
      if (shader.matRASUniformName) {
        this.gl.uniformMatrix4fv(
          shader.uniforms[shader.matRASUniformName],
          false,
          this.back.matRAS
        );
      }
      if (shader.rayDirUniformName) {
        this.gl.uniform3fv(shader.uniforms[shader.rayDirUniformName], rayDir);
      }

      if (shader.clipPlaneUniformName) {
        this.gl.uniform4fv(shader.uniforms["clipPlane"], this.scene.clipPlane);
      }

      this.gl.drawElements(
        object3D.mode,
        object3D.indexCount,
        this.gl.UNSIGNED_SHORT,
        0
      );
    }
  }

  this.drawCrosshairs3D(true, 1.0);
  this.drawCrosshairs3D(false, 0.35);

  let posString =
    "azimuth: " +
    this.scene.renderAzimuth.toFixed(0) +
    " elevation: " +
    this.scene.renderElevation.toFixed(0);
  //bus.$emit('crosshair-pos-change', posString);

  this.sync();
  return posString;
}; // draw3D()

Niivue.prototype.drawCrosshairs3D = function (isDepthTest = true, alpha = 1.0) {
  if (!this.opts.show3Dcrosshair) {
    return;
  }
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
    //let radius = Math.max(this.volumeObject3D.furthestVertexFromOrigin / 50.0, 1.0);
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
    this.crosshairs3D.isPickable = false;
    this.crosshairs3D.minExtent = this.volumeObject3D.minExtent;
    this.crosshairs3D.maxExtent = this.volumeObject3D.maxExtent;
    this.crosshairs3D.mm = mm;
    this.crosshairs3D.originNegate = this.volumeObject3D.originNegate;
    this.crosshairs3D.furthestVertexFromOrigin =
      this.volumeObject3D.furthestVertexFromOrigin;
  }
  let crosshairsShader = new NiivueShader3D(this.surfaceShader);
  crosshairsShader.mvpUniformName = "mvpMtx";
  this.crosshairs3D.renderShaders.push(crosshairsShader);

  {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.crosshairs3D.vertexBuffer);
    gl.vertexAttribPointer(
      this.surfaceShader.uniforms["pos"],
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    gl.enableVertexAttribArray(this.surfaceShader.uniforms["pos"]);
  }

  crosshairsShader.use(this.gl);
  let m = this.calculateMvpMatrix(this.crosshairs3D);
  gl.uniformMatrix4fv(crosshairsShader.uniforms["mvpMtx"], false, m);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.crosshairs3D.indexBuffer);

  gl.enable(gl.DEPTH_TEST);
  let color = [...this.opts.crosshairColor];
  if (isDepthTest) {
    gl.disable(gl.BLEND);
    //gl.depthFunc(gl.LESS); //pass if LESS than incoming value
    gl.depthFunc(gl.GREATER);
    color[3] = alpha;
  } else {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthFunc(gl.ALWAYS);
    color[3] = alpha;
  }

  gl.uniform4fv(crosshairsShader.uniforms["surfaceColor"], color);

  {
    const vertexCount = this.crosshairs3D.indexCount;
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }
  //restore default vertex buffer:
  this.gl.enableVertexAttribArray(0);
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cuboidVertexBuffer);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
}; //drawCrosshairs3D()

// not included in public docs
Niivue.prototype.mm2frac = function (mm, volIdx = 0) {
  //given mm, return volume fraction
  //convert from object space in millimeters to normalized texture space XYZ= [0..1, 0..1 ,0..1]
  let mm4 = mat.vec4.fromValues(mm[0], mm[1], mm[2], 1);
  let d = this.volumes[volIdx].hdr.dims;
  let frac = [0, 0, 0];
  if (typeof d === "undefined") {
    return frac;
  }
  if (d[1] < 1 || d[2] < 1 || d[3] < 1) return frac;
  let sform = mat.mat4.clone(this.volumes[volIdx].matRAS);
  mat.mat4.transpose(sform, sform);
  mat.mat4.invert(sform, sform);
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
    (vox[0] + 0.5) / this.volumes[volIdx].hdr.dims[1],
    (vox[1] + 0.5) / this.volumes[volIdx].hdr.dims[2],
    (vox[2] + 0.5) / this.volumes[volIdx].hdr.dims[3],
  ];
  return frac;
}; // vox2frac()

// not included in public docs
Niivue.prototype.frac2vox = function (frac, volIdx = 0) {
  //convert from normalized texture space XYZ= [0..1, 0..1 ,0..1] to 0-index voxel space [0..dim[1]-1, 0..dim[2]-1, 0..dim[3]-1]
  //consider dimension with 3 voxels, the voxel centers are at 0.25, 0.5, 0.75 corresponding to 0,1,2
  let vox = [
    Math.round(frac[0] * this.volumes[volIdx].hdr.dims[1] - 0.5),
    Math.round(frac[1] * this.volumes[volIdx].hdr.dims[2] - 0.5),
    Math.round(frac[2] * this.volumes[volIdx].hdr.dims[3] - 0.5),
  ];
  return vox;
}; // frac2vox()

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
  let posString = "";

  if (
    this.volumes.length === 0 ||
    typeof this.volumes[0].dims === "undefined"
  ) {
    this.drawLoadingText(this.loadingText);
    return;
  }

  if (this.sliceType === this.sliceTypeRender)
    //draw rendering
    return this.draw3D();
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
    if (wX1 > wX) {
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
      this.drawColorbar([
        ltwh[0] + wX + margin,
        ltwh[1] + hZ + margin,
        wY - margin - margin,
        hY * this.opts.colorbarHeight,
      ]);
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
  posString =
    pos[0].toFixed(2) + "×" + pos[1].toFixed(2) + "×" + pos[2].toFixed(2);
  this.gl.finish();
  // temporary event bus mechanism. It uses Vue, but it would be ideal to divorce vue from this gl code.
  //bus.$emit('crosshair-pos-change', posString);
  return posString;
}; // drawScene()
