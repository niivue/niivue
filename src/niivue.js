var Buffer = require("buffer/").Buffer;
import * as nifti from "nifti-reader-js";
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
  fragRGBOrientShader,
  vertSurfaceShader,
  fragSurfaceShader,
  vertDepthPickingShader,
  fragDepthPickingShader,
  vertVolumePickingShader,
  fragVolumePickingShader,
} from "./shader-srcs.js";
import { fontPng } from "./fnt.js"; // pngName;
import metrics from "./fnt.json";
import * as cmaps from "./cmaps";
import { Subject } from "rxjs";
import { NiivueObject3D } from "./niivue-object3D.js";
import { NiivueShader3D } from "./niivue-shader3D";
import { NVImage } from "./nvimage.js";

/**
 * @class Niivue
 * @description
 * Documentation is a work in progress
 * @constructor
 * @param {object} [opts] options object to set modifiable properties of the canvas
 * @example
 * // All available properties are listed in the example.
 * // All properties are optional. If omitted, a default will be used from Niivue.defaults
 * opts = {
    textHeight: 0.03,             // 0 for no text, fraction of canvas height
    colorbarHeight: 0.05,         // 0 for no colorbars, fraction of Nifti j dimension
    crosshairWidth: 1,            // 0 for no crosshairs
    backColor: [0, 0, 0, 1],      // [R, G, B, A] range 0..1
    crosshairColor: [1, 0, 0 ,1], // [R, G, B, A] range 0..1
  selectionBoxColor: [1, 1, 1, .5] // [R, G, B, A] range 0..1
    colorBarMargin: 0.05          // x axis margin arount color bar, fraction of canvas width
  }

  let myNiivue = new Niivue(opts)
 */
export let Niivue = function (opts = {}) {
  this.opts = {}; // will be populate with opts or defaults when a new Niivue object instance is created

  /**
   * @memberof Niivue
   * @property {object} defaults - the default values for all options a user might supply in an opts object
   * @example
   * // The example shows all available use configurable properties.
   * this.defaults = {
    textHeight: 0.03,             // 0 for no text, fraction of canvas height
    colorbarHeight: 0.05,         // 0 for no colorbars, fraction of Nifti j dimension
    crosshairWidth: 1,            // 0 for no crosshairs
    backColor: [0, 0, 0, 1],      // [R, G, B, A] range 0..1
    crosshairColor: [1, 0, 0 ,1], // [R, G, B, A] range 0..1
  selectionBoxColor: [1, 1, 1, .5] // [R, G, B, A] range 0..1
    colorBarMargin: 0.05          // x axis margin arount color bar, fraction of canvas width
  }

   *
   */
  this.defaults = {
    textHeight: 0.03, // 0 for no text, fraction of canvas height
    colorbarHeight: 0.05, // 0 for no colorbars, fraction of Nifti j dimension
    crosshairWidth: 1, // 0 for no crosshairs
    backColor: [0, 0, 0, 1],
    crosshairColor: [1, 0, 0, 1],
    selectionBoxColor: [1, 1, 1, 0.5],
    clipPlaneColor: [1, 1, 1, 0.5],
    colorBarMargin: 0.05, // x axis margin arount color bar, clip space coordinates
    briStep: 1, // step size for brightness changes
    conStep: 1, // step size for contrast changes
    trustCalMinMax: true, // trustCalMinMax: if true do not calculate cal_min or cal_max if set in image header. If false, always calculate display intensity range.
    clipPlaneHotKey: "KeyC", // keyboard short cut to activate the clip plane
  };

  this.canvas = null; // the canvas element on the page
  this.gl = null; // the gl context
  this.colormapTexture = null;
  this.volumeTexture = null;
  this.overlayTexture = null;
  this.sliceShader = null;
  this.lineShader = null;
  this.renderShader = null;
  this.colorbarShader = null;
  this.fontShader = null;
  this.passThroughShader = null;
  this.orientShaderU = null;
  this.orientShaderI = null;
  this.orientShaderF = null;
  this.orientShaderRGBU = null;
  this.surfaceShader = null;
  this.pickingSurfaceShader = null;

  this.DEFAULT_FONT_GLYPH_SHEET = "/fonts/Roboto-Regular.png";
  this.DEFAULT_FONT_METRICS = "/fonts/Roboto-Regular.json";
  this.fontMets = null;

  this.sliceTypeAxial = 0;
  this.sliceTypeCoronal = 1;
  this.sliceTypeSagittal = 2;
  this.sliceTypeMultiplanar = 3;
  this.sliceTypeRender = 4;
  this.sliceType = this.sliceTypeMultiplanar; // sets current view in webgl canvas
  this.scene = {};
  this.scene.renderAzimuth = 120;
  this.scene.renderElevation = 15;
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
  this.isRadiologicalConvention = false;
  this.volScaleMultiplier = 1;
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
  this.crosshairPosition$ = new Subject();
  this.intensityRange$ = new Subject();
  this.currentClipPlaneIndex = 0;
  this.lastCalled = new Date().getTime();
  this.multiTouchGesture = false;
  this.gestureInterval = null;
  this.selectedObjectId = -1;
  this.CLIP_PLANE_ID = 1;
  this.VOLUME_ID = 2;
  this.DISTANCE_FROM_CAMERA = -0.54;

  this.initialized = false;
  // loop through known Niivue properties
  // if the user supplied opts object has a
  // property listed in the known properties, then set
  // Niivue.opts.<prop> to that value, else apply defaults.
  for (let prop in this.defaults) {
    this.opts[prop] =
      opts[prop] === undefined ? this.defaults[prop] : opts[prop];
  }
};

// attach the Niivue instance to the webgl2 canvas by element id
// @example niivue = new Niivue().attachTo('gl')
Niivue.prototype.attachTo = async function (id) {
  this.canvas = document.getElementById(id);
  this.gl = this.canvas.getContext("webgl2");
  if (!this.gl) {
    alert(
      "unable to get webgl2 context. Perhaps this browser does not support webgl2"
    );
    console.log(
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
}; // attachTo

Niivue.prototype.syncWith = function (otherNV) {
  // this.scene.renderAzimuth = 120;
  // this.scene.renderElevation = 15;
  // this.scene.crosshairPos = [0.5, 0.5, 0.5];
  // this.scene.clipPlane = [0, 0, 0, 0];
  this.otherNV = otherNV;
  // console.log(otherNV);
};

Niivue.prototype.sync = function () {
  if (!this.otherNV || typeof this.otherNV === "undefined") {
    return;
  }
  let thisMM = this.frac2mm(this.scene.crosshairPos);
  this.otherNV.scene.crosshairPos = this.otherNV.mm2frac(thisMM);
  this.otherNV.scene.renderAzimuth = this.scene.renderAzimuth;
  this.otherNV.scene.renderElevation = this.scene.renderElevation;
  this.otherNV.drawScene();
};

/**
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

/*
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

// handler for context menu (right click)
// here, we disable the normal context menu so that
// we can use some custom right click events
// note: no test yet
Niivue.prototype.mouseContextMenuListener = function (e) {
  e.preventDefault();
};

// handler for all mouse button presses
// note: no test yet
Niivue.prototype.mouseDownListener = function (e) {
  e.preventDefault();
  var rect = this.canvas.getBoundingClientRect();
  this.scene.mousedown = true;
  if (e.button === this.scene.mouseButtonLeft) {
    this.scene.mouseButtonLeftDown = true;
    this.mouseLeftButtonHandler(e, rect);
  } else if (e.button === this.scene.mouseButtonRight) {
    this.scene.mouseButtonRightDown = true;
    this.mouseRightButtonHandler(e, rect);
  }
};

// handler for mouse left button down
// note: no test yet
Niivue.prototype.mouseLeftButtonHandler = function (e, rect) {
  let pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(
    e,
    this.gl.canvas
  );
  this.mouseClick(pos.x, pos.y);
  this.mouseDown(pos.x, pos.y);
};

// handler for mouse right button down
// note: no test yet
Niivue.prototype.mouseRightButtonHandler = function (e, rect) {
  this.isDragging = true;
  let pos = this.getNoPaddingNoBorderCanvasRelativeMousePosition(
    e,
    this.gl.canvas
  );
  this.dragStart[0] = pos.x;
  this.dragStart[1] = pos.y;
  return;
};

Niivue.prototype.calculateMinMaxVoxIdx = function (array) {
  if (array.length > 2) {
    throw new Error("array must not contain more than two values");
  }
  return [
    Math.floor(Math.min(array[0], array[1])),
    Math.floor(Math.max(array[0], array[1])),
  ];
};

function intensityRaw2Scaled(hdr, raw) {
  if (hdr.scl_slope === 0) hdr.scl_slope = 1.0;
  return raw * hdr.scl_slope + hdr.scl_inter;
}

// note: no test yet
Niivue.prototype.calculateNewRange = function () {
  if (this.sliceType === this.sliceTypeRender) {
    return;
  }
  // calculate our box
  let frac = this.canvasPos2frac([this.dragStart[0], this.dragStart[1]]);
  let startVox = this.frac2vox(frac);

  frac = this.canvasPos2frac([this.dragEnd[0], this.dragEnd[1]]);
  let endVox = this.frac2vox(frac);

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

  const hdr = this.volumes[0].hdr;
  const img = this.volumes[0].img;
  console.log(this.volumes[0]);

  console.log(img[xrange[0] * yrange[0] * zrange[0]]);
  console.log(xrange);
  console.log(yrange);
  console.log(zrange);
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

  console.log("hi is " + hi);
  console.log("lo is " + lo);
  var mnScale = intensityRaw2Scaled(hdr, lo);
  var mxScale = intensityRaw2Scaled(hdr, hi);
  console.log(mxScale);
  console.log(mnScale);
  console.log("scaled");
  this.volumes[0].cal_min = mnScale;
  this.volumes[0].cal_max = mxScale;
  this.intensityRange$.next([mnScale, mxScale]);
};

// handler for mouse button up (all buttons)
// note: no test yet
Niivue.prototype.mouseUpListener = function () {
  this.scene.mousedown = false;
  this.scene.mouseButtonRightDown = false;
  this.scene.mouseButtonLeftDown = false;
  if (this.isDragging) {
    this.isDragging = false;
    this.calculateNewRange();
    // remove colorbar
    // this.drawScene();
    this.refreshLayers(this.volumes[0], 0, this.volumes.length);

    console.log(this.volumes[0].cal_min, this.volumes[0].cal_max);
    this.drawScene();
  }
};

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

// handler for single finger touch event (like mouse down)
// note: no test yet
Niivue.prototype.touchStartListener = function (e) {
  e.preventDefault();
  this.scene.touchdown = true;
  if (this.scene.touchdown && e.touches.length < 2) {
  } else {
    this.multiTouchGesture = true;
  }

  setTimeout(this.checkMultitouch.bind(this), 1, e);
};

// handler for touchend (finger lift off screen)
// note: no test yet
Niivue.prototype.touchEndListener = function () {
  this.scene.touchdown = false;
  this.lastTwoTouchDistance = 0;
  this.multiTouchGesture = false;
};

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

// reset brightness and contrast to global min and max
// note: no test yet
Niivue.prototype.resetBriCon = function () {
  this.volumes[0].cal_min = this.volumes[0].global_min;
  this.volumes[0].cal_max = this.volumes[0].global_max;
  this.refreshLayers(this.volumes[0], 0, this.volumes.length);
  this.drawScene();
};

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

// handler for keyboard shortcuts
Niivue.prototype.keyUpListener = function (e) {
  //   console.log("keyup listener called");
  if (e.code === this.opts.clipPlaneHotKey) {
    let now = new Date().getTime();
    let elapsed = now - this.lastCalled;

    if (elapsed > 1000) {
      this.currentClipPlaneIndex = (this.currentClipPlaneIndex + 1) % 4;
      this.clipPlaneObject3D.isVisible = this.currentClipPlaneIndex;
      //   console.log("clip plane index is " + this.currentClipPlaneIndex);
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

      console.log(this.scene.clipPlane);
      this.drawScene();
      // e.preventDefault();
    }
    this.lastCalled = now;
  }
};

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

Niivue.prototype.dragEnterListener = function (e) {
  e.stopPropagation();
  e.preventDefault();
  // console.log("drag enter");
};

Niivue.prototype.dragOverListener = function (e) {
  e.stopPropagation();
  e.preventDefault();
  // console.log("drag over");
};

Niivue.prototype.dropListener = async function (e) {
  e.stopPropagation();
  e.preventDefault();
  const dt = e.dataTransfer;
  const url = dt.getData("text/uri-list");
  if (url) {
    console.log("dropped url: " + url);
    let volume = await NVImage.loadFromUrl(url);
    this.addVolume(volume);
  } else {
    const files = dt.files;
    if (files.length > 0) {
      let volume = await NVImage.loadFromFile(files[0]);
      this.addVolume(volume);
    }
  }
};

Niivue.prototype.addVolume = function (volume) {
  if (this.volumes.length > 0) {
    this.volumes[0] = volume;
  } else {
    this.volumes.push(volume);
  }
  this.updateGLVolume();
};
// update mouse position from new mouse down coordinates
// note: no test yet
Niivue.prototype.mouseDown = function mouseDown(x, y) {
  if (this.sliceType != this.sliceTypeRender) return;
  this.mousePos = [x, y];
}; // mouseDown()

// note: no test yet
Niivue.prototype.mouseMove = function mouseMove(x, y) {
  if (this.sliceType != this.sliceTypeRender) return;
  this.scene.renderAzimuth += x - this.mousePos[0];
  this.scene.renderElevation += y - this.mousePos[1];
  this.mousePos = [x, y];
  this.drawScene();
}; // mouseMove()

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

Niivue.prototype.clipPlaneUpdate = function (azimuthElevationDepth) {
  // azimuthElevationDepth is 3 component vector [a, e, d]
  //  azimuth: camera position in degrees around object, typically 0..360 (or -180..+180)
  //  elevation: camera height in degrees, range -90..90
  //  depth: distance of clip plane from center of volume, range 0..~1.73 (e.g. 2.0 for no clip plane)
  if (this.sliceType != this.sliceTypeRender) return;
  let v = this.sph2cartDeg(azimuthElevationDepth[0], azimuthElevationDepth[1]);
  this.scene.clipPlane = [v[0], v[1], v[2], azimuthElevationDepth[2]];
  this.drawScene();
}; // clipPlaneUpdate()

Niivue.prototype.setCrosshairColor = function (color) {
  this.opts.crosshairColor = color;
  this.drawScene();
}; // setCrosshairColor()

Niivue.prototype.setSelectionBoxColor = function (color) {
  this.opts.selectionBoxColor = color;
}; // setSelectionBoxColor()

Niivue.prototype.sliceScroll2D = function (posChange, x, y, isDelta = true) {
  this.mouseClick(x, y, posChange, isDelta);
}; // sliceScroll2D()

Niivue.prototype.setSliceType = function (st) {
  this.sliceType = st;
  this.drawScene();
  return this;
}; // setSliceType()

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

Niivue.prototype.setScale = function (scale) {
  this.volScaleMultiplier = scale;
  this.drawScene();
}; // setScale()

Niivue.prototype.setClipPlaneColor = function (color) {
  this.opts.clipPlaneColor = color;
}; // setClipPlaneColor()

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

Niivue.prototype.vox2mm = function (XYZ, mtx) {
  let sform = mat.mat4.clone(mtx);
  mat.mat4.transpose(sform, sform);
  let pos = mat.vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1);
  mat.vec4.transformMat4(pos, pos, sform);
  let pos3 = mat.vec3.fromValues(pos[0], pos[1], pos[2]);
  return pos3;
}; // vox2mm()

// currently: volumeList is an array if objects, each object is a volume that can be loaded
Niivue.prototype.loadVolumes = async function (volumeList) {
  if (!this.initialized) {
    await this.init();
  }
  this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.volumes = volumeList;
  this.back = this.volumes[0]; // load first volume as back layer
  this.overlays = this.volumes.slice(1); // remove first element (that is now this.back, all other imgaes are overlays)

  // for loop to load all volumes in volumeList
  for (let i = 0; i < volumeList.length; i++) {
    let volume = await NVImage.loadFromUrl(
      this.volumes[i].url,
      this.volumes[i].name,
      this.volumes[i].colorMap,
      this.volumes[i].opacity,
      this.opts.trustCalMinMax
    );
    this.volumes[i] = volume;
    this.updateGLVolume();
  } // for

  return this;
}; // loadVolumes()

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

Niivue.prototype.loadPng = function (pngName) {
  var pngImage = null;
  pngImage = new Image();
  pngImage.onload = function () {
    //console.log("PNG resolution ", pngImage.width, ",", pngImage.height);
    var pngTexture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE3);
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
      pngImage
    );
  }.bind(this); // bind "this" context to niivue instance
  pngImage.src = fontPng;
  //console.log("loading PNG ", pngName);
}; // loadPng()

// remove cross origin if not from same domain. From https://webglfundamentals.org/webgl/lessons/webgl-cors-permission.html
Niivue.prototype.requestCORSIfNotSameOrigin = function (img, url) {
  if (new URL(url, window.location.href).origin !== window.location.origin) {
    img.crossOrigin = "";
  }
};

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

Niivue.prototype.loadFont = async function (fontSheetUrl, metricsUrl) {
  await this.loadFontTexture(fontSheetUrl);
  let response = await fetch(metricsUrl);
  if (!response.ok) {
    throw Error(response.statusText);
  }

  let jsonText = await response.text();
  console.log(jsonText);
  this.fontMetrics = JSON.parse(jsonText);
  console.log(this.fontMetrics);

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

  this.fontShader.use(this.gl);
  this.gl.uniform1i(this.fontShader.uniforms["fontTexture"], 3);

  console.log("font metrics loaded");
  console.log(this.fontMets);
  this.drawScene();
};

Niivue.prototype.initText = async function () {
  // font shader
  //multi-channel signed distance font https://github.com/Chlumsky/msdfgen
  this.fontShader = new Shader(this.gl, vertFontShader, fragFontShader);
  this.fontShader.use(this.gl);

  await this.loadFont(this.DEFAULT_FONT_GLYPH_SHEET, this.DEFAULT_FONT_METRICS);
  this.drawLoadingText("drag and drop");
}; // initText()

Niivue.prototype.init = async function () {
  //initial setup: only at the startup of the component
  // print debug info (gpu vendor and renderer)
  let debugInfo = this.gl.getExtension("WEBGL_debug_renderer_info");
  let vendor = this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
  let renderer = this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  console.log("gpu vendor: ", vendor);
  console.log("gpu renderer: ", renderer);
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
    vertVolumePickingShader,
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

  // add shader to object
  let volumeRenderShader = new NiivueShader3D(this.renderShader);
  volumeRenderShader.mvpUniformName = "mvpMtx";
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
    vertDepthPickingShader,
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

Niivue.prototype.refreshLayers = function (overlayItem, layer, numLayers) {
  let hdr = overlayItem.hdr;
  let img = overlayItem.img;
  let opacity = overlayItem.opacity;

  let outTexture = null;

  let mtx = [];
  if (layer === 0) {
    // this.back = {};
    mtx = overlayItem.toRAS;
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
  } else {
    if (this.back.dims === undefined)
      console.log(
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
    //console.log('v2', mtx);
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
    this.gl.texStorage3D(
      this.gl.TEXTURE_3D,
      6,
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
      6,
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
      6,
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
      6,
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
      6,
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
      6,
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
      6,
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
  //this.selectColormap(overlayItem.colorMap)
  //this.refreshColormaps()
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

  // set slice scale for render shader
  this.renderShader.use(this.gl);
  let { _, vox } = this.sliceScale(); // slice scale determined by this.back --> the base image layer
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

  this.volumeObject3D.pickingShader.use(this.gl);
  this.gl.uniform3fv(this.volumeObject3D.pickingShader.uniforms["texVox"], vox);
}; // refreshLayers()

Niivue.prototype.colorMaps = function (sort = true) {
  let cm = [];
  for (const [key, value] of Object.entries(cmaps)) {
    cm.push(key);
  }
  console.log(cm);
  return sort === true ? cm.sort() : cm;
};

Niivue.prototype.colormapFromKey = function (name) {
  let availMaps = this.colorMaps();
  for (let i = 0; i < availMaps.length; i++) {
    let key = availMaps[i];
    if (name.toLowerCase() === key.toLowerCase()) {
      return cmaps[key];
    }
  }
};

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
      //console.log(i, '>>>',this.volumes[i].colorMap)
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
        //console.log(scrollVal,':',axCorSag, '>>', posFuture);
        this.scene.crosshairPos[2 - axCorSag] = posFuture;
        this.drawScene();
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
      this.crosshairPosition$.next([
        this.scene.crosshairPos[0],
        this.scene.crosshairPos[1],
        this.scene.crosshairPos[2],
      ]);
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

Niivue.prototype.textWidth = function (scale, str) {
  let w = 0;
  var bytes = new Buffer(str);
  for (let i = 0; i < str.length; i++)
    w += scale * this.fontMets[bytes[i]].xadv;
  return w;
}; // textWidth()

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

Niivue.prototype.drawLoadingText = function (text) {
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.enableVertexAttribArray(0);
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.volumeObject3D.vertexBuffer);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);
  this.gl.enable(this.gl.CULL_FACE);

  this.drawTextBelow([this.canvas.width / 2, this.canvas.height / 2], text, 3);
  this.canvas.focus();
};

Niivue.prototype.drawText = function (xy, str, scale = 1) {
  //to right of x, vertically centered on y
  if (this.opts.textHeight <= 0) return;
  this.fontShader.use(this.gl);
  let size = this.opts.textHeight * this.gl.canvas.height * scale;
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
  var bytes = new Buffer(str);
  for (let i = 0; i < str.length; i++)
    xy[0] += this.drawChar(xy, size, bytes[i]);
}; // drawText()

Niivue.prototype.drawTextRight = function (xy, str, scale = 1) {
  //to right of x, vertically centered on y
  if (this.opts.textHeight <= 0) return;
  xy[1] -= 0.5 * this.opts.textHeight * this.gl.canvas.height;
  this.drawText(xy, str, scale);
}; // drawTextRight()

Niivue.prototype.drawTextBelow = function (xy, str, scale = 1) {
  //horizontally centered on x, below y
  if (this.opts.textHeight <= 0) return;
  let size = this.opts.textHeight * this.gl.canvas.height * scale;
  xy[0] -= 0.5 * this.textWidth(size, str);
  this.drawText(xy, str, scale);
}; // drawTextBelow()

Niivue.prototype.draw2D = function (leftTopWidthHeight, axCorSag) {
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
    this.isRadiologicalConvention && axCorSag < this.sliceTypeSagittal;
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
  let m = mat.mat4.clone(object3D.modelMatrix);
  mat.mat4.translate(m, m, object3D.position);
  // https://glmatrix.net/docs/module-mat4.html  https://glmatrix.net/docs/mat4.js.html
  var rad =
    ((90 - this.scene.renderElevation - object3D.scale[0]) * Math.PI) / 180;
  mat.mat4.rotate(m, m, rad, [-1, 0, 0]);
  rad = (this.scene.renderAzimuth * Math.PI) / 180;
  mat.mat4.rotate(m, m, rad, [0, 0, 1]);
  mat.mat4.rotate(m, m, object3D.rotationRadians, object3D.rotation);
  mat.mat4.scale(m, m, object3D.scale); // volume aspect ratio
  mat.mat4.scale(m, m, [0.57, 0.57, 0.57]); //unit cube has maximum 1.73
  return m;
}; // calculateMvpMatrix

Niivue.prototype.calculateRayDirection = function (mvpMatrix) {
  //compute ray direction
  var inv = mat.mat4.create();
  mat.mat4.invert(inv, mvpMatrix);
  var rayDir4 = mat.vec4.fromValues(0, 0, -1, 1);
  mat.vec4.transformMat4(rayDir4, rayDir4, inv);
  let rayDir = mat.vec3.fromValues(rayDir4[0], rayDir4[1], rayDir4[2]);
  mat.vec3.normalize(rayDir, rayDir);
  //defuzz, avoid divide by zero
  const tiny = 0.00001;
  if (Math.abs(rayDir[0]) < tiny) rayDir[0] = tiny;
  if (Math.abs(rayDir[1]) < tiny) rayDir[1] = tiny;
  if (Math.abs(rayDir[2]) < tiny) rayDir[2] = tiny;

  return rayDir;
}; // calculateRayDirection

Niivue.prototype.draw3D = function () {
  let mn = Math.min(this.gl.canvas.width, this.gl.canvas.height);
  if (mn <= 0) return;
  mn *= this.volScaleMultiplier;
  let xCenter = this.gl.canvas.width / 2;
  let yCenter = this.gl.canvas.height / 2;
  let xPix = mn;
  let yPix = mn;
  this.gl.viewport(xCenter - xPix * 0.5, yCenter - yPix * 0.5, xPix, yPix);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

  // render picking surfaces
  let m = null;
  this.gl.disable(this.gl.BLEND);

  for (const object3D of this.objectsToRender3D) {
    if (!object3D.isVisible) {
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
        this.gl.cullFace(this.gl.BACK);
      }
    } else {
      this.gl.disable(this.gl.CULL_FACE);
    }

    this.gl.enableVertexAttribArray(0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, object3D.vertexBuffer);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);

    m = this.calculateMvpMatrix(object3D);
    this.gl.uniformMatrix4fv(pickingShader.uniforms["mvpMtx"], false, m);

    if (pickingShader.rayDirUniformName) {
      let rayDir = this.calculateRayDirection(m);
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

    this.gl.drawArrays(object3D.mode, 0, object3D.indexCount);
  }

  // check if we have a selected object
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

  this.selectedObjectId = rgbaPixel[3];
  if (this.selectedObjectId === this.VOLUME_ID) {
    this.scene.crosshairPos = new Float32Array(rgbaPixel.slice(0, 3)).map(
      (x) => x / 255.0
    );
  }

  console.log("object id is " + this.selectedObjectId);
  console.log(this.scene.crosshairPos);

  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  this.gl.clearColor(0.2, 0, 0, 1);

  for (const object3D of this.objectsToRender3D) {
    if (!object3D.isVisible) {
      continue;
    }

    this.gl.enableVertexAttribArray(0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, object3D.vertexBuffer);
    this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0);

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
        this.gl.cullFace(this.gl.BACK);
      }
    } else {
      this.gl.disable(this.gl.CULL_FACE);
    }

    m = this.calculateMvpMatrix(object3D);

    let rayDir = this.calculateRayDirection(m);

    for (const shader of object3D.renderShaders) {
      shader.use(this.gl);
      if (shader.mvpUniformName) {
        this.gl.uniformMatrix4fv(
          shader.uniforms[shader.mvpUniformName],
          false,
          m
        );
      }

      if (shader.rayDirUniformName) {
        this.gl.uniform3fv(shader.uniforms[shader.rayDirUniformName], rayDir);
      }

      if (shader.clipPlaneUniformName) {
        this.gl.uniform4fv(shader.uniforms["clipPlane"], this.scene.clipPlane);
      }

      this.gl.drawArrays(object3D.mode, 0, object3D.indexCount);
    }
  }

  let posString =
    "azimuth: " +
    this.scene.renderAzimuth.toFixed(0) +
    " elevation: " +
    this.scene.renderElevation.toFixed(0);
  //bus.$emit('crosshair-pos-change', posString);

  this.sync();
  return posString;
}; // draw3D()

Niivue.prototype.mm2frac = function (mm) {
  //given mm, return volume fraction
  //convert from object space in millimeters to normalized texture space XYZ= [0..1, 0..1 ,0..1]
  let mm4 = mat.vec4.fromValues(mm[0], mm[1], mm[2], 1);
  let d = this.back.dims;
  let frac = [0, 0, 0];
  if (typeof d === "undefined") {
    return frac;
  }
  if (d[1] < 1 || d[2] < 1 || d[3] < 1) return frac;
  let sform = mat.mat4.clone(this.back.matRAS);
  mat.mat4.transpose(sform, sform);
  mat.mat4.invert(sform, sform);
  mat.vec4.transformMat4(mm4, mm4, sform);
  frac[0] = (mm4[0] + 0.5) / d[1];
  frac[1] = (mm4[1] + 0.5) / d[2];
  frac[2] = (mm4[2] + 0.5) / d[3];
  //console.log("mm", mm, " -> frac", frac);
  return frac;
}; // mm2frac()

Niivue.prototype.vox2frac = function (vox) {
  //convert from  0-index voxel space [0..dim[1]-1, 0..dim[2]-1, 0..dim[3]-1] to normalized texture space XYZ= [0..1, 0..1 ,0..1]
  //consider dimension with 3 voxels, the voxel centers are at 0.25, 0.5, 0.75 corresponding to 0,1,2
  let frac = [
    (vox[0] + 0.5) / this.back.dims[1],
    (vox[1] + 0.5) / this.back.dims[2],
    (vox[2] + 0.5) / this.back.dims[3],
  ];
  return frac;
}; // vox2frac()

Niivue.prototype.frac2vox = function (frac) {
  //convert from normalized texture space XYZ= [0..1, 0..1 ,0..1] to 0-index voxel space [0..dim[1]-1, 0..dim[2]-1, 0..dim[3]-1]
  //consider dimension with 3 voxels, the voxel centers are at 0.25, 0.5, 0.75 corresponding to 0,1,2
  let vox = [
    Math.round(frac[0] * this.back.dims[1] - 0.5),
    Math.round(frac[1] * this.back.dims[2] - 0.5),
    Math.round(frac[2] * this.back.dims[3] - 0.5),
  ];
  return vox;
}; // frac2vox()

Niivue.prototype.frac2mm = function (frac) {
  //convert from normalized texture space XYZ= [0..1, 0..1 ,0..1] to object space in millimeters
  let pos = mat.vec4.fromValues(frac[0], frac[1], frac[2], 1);
  //let d = overlayItem.hdr.dims;
  let dim = mat.vec4.fromValues(
    this.back.dims[1],
    this.back.dims[2],
    this.back.dims[3],
    1
  );
  let sform = mat.mat4.clone(this.back.matRAS);
  mat.mat4.transpose(sform, sform);
  mat.vec4.mul(pos, pos, dim);
  let shim = mat.vec4.fromValues(-0.5, -0.5, -0.5, 0); //bitmap with 5 voxels scaled 0..1, voxel centers are 0.1,0.3,0.5,0.7,0.9
  mat.vec4.add(pos, pos, shim);
  mat.vec4.transformMat4(pos, pos, sform);
  this.mm2frac(pos);
  return pos;
}; // frac2mm()

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

  if (!this.back.dims) {
    if (this.volumes && this.volumes.length > 0) {
      // let the user know we are loading
      this.drawLoadingText("loading");
    } else {
      this.drawLoadingText("drag and drop a file to start");
    }
    // exit if we have nothing to draw
    console.log("nothing to draw");
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
