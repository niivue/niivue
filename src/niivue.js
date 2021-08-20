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
} from "./shader-srcs.js";
import { fontPng } from "./fnt.js"; // pngName;
import metrics from "./fnt.json";
import { Subject } from "rxjs";
import { NiivueObject3D } from "./niivue-object3D.js";
import { NiivueShader3D } from "./niivue-shader3D";

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
  this.otherNV = null; // another niivue instance that we wish to sync postion with
  this.volumeObject3D = null;
  this.clipPlaneObject3D = null;
  this.crosshairPosition$ = new Subject();
  this.intensityRange$ = new Subject();
  this.currentClipPlaneIndex = 0;
  this.lastCalled = new Date().getTime();

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
Niivue.prototype.attachTo = function (id) {
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
  this.init();
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

  let imgRaw;
  const datatypeCode = this.volumes[0].volume.hdr.datatypeCode;
  const hdr = this.volumes[0].volume.hdr;
  const img = this.volumes[0].volume.img;
  console.log(this.volumes[0]);
  // console.log('datatype code is ' + datatypeCode);

  switch (datatypeCode) {
    case 2:
      imgRaw = new Uint8Array(img);
      break;
    case 4:
      imgRaw = new Int16Array(img);
      break;
    case 16:
      imgRaw = new Float32Array(img);
      break;
    case 64:
      imgRaw = new Float64Array(img);
      break;
    case 512:
      imgRaw = new Uint16Array(img);
      break;
  }

  console.log(imgRaw[xrange[0] * yrange[0] * zrange[0]]);
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
        if (lo > imgRaw[index]) {
          lo = imgRaw[index];
        }
        if (hi < imgRaw[index]) {
          hi = imgRaw[index];
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

// handler for single finger touch event (like mouse down)
// note: no test yet
Niivue.prototype.touchStartListener = function (e) {
  e.preventDefault();
  this.scene.touchdown = true;
  var rect = this.canvas.getBoundingClientRect();
  this.mouseClick(
    e.touches[0].clientX - rect.left,
    e.touches[0].clientY - rect.top
  );
  this.mouseDown(
    e.touches[0].clientX - rect.left,
    e.touches[0].clientY - rect.top
  );
};

// handler for touchend (finger lift off screen)
// note: no test yet
Niivue.prototype.touchEndListener = function () {
  this.scene.touchdown = false;
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
  }
};

// handler for keyboard shortcuts
Niivue.prototype.keyUpListener = function (e) {
  console.log("keyup listener called");
  if (e.code === this.opts.clipPlaneHotKey) {
    let now = new Date().getTime();
    let elapsed = now - this.lastCalled;

    if (elapsed > 1000) {
      this.currentClipPlaneIndex = (this.currentClipPlaneIndex + 1) % 4;
      this.clipPlaneObject3D.isVisible = this.currentClipPlaneIndex;
      console.log("clip plane index is " + this.currentClipPlaneIndex);
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

  // add keyup
  this.canvas.setAttribute("tabindex", 0);
  this.canvas.addEventListener("keyup", this.keyUpListener.bind(this), false);
  this.canvas.focus();
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

Niivue.prototype.nii2RAS = function (overlayItem) {
  //Transform to orient NIfTI image to Left->Right,Posterior->Anterior,Inferior->Superior (48 possible permutations)
  // port of Matlab reorient() https://github.com/xiangruili/dicm2nii/blob/master/nii_viewer.m
  // not elegant, as JavaScript arrays are always 1D
  let hdr = overlayItem.volume.hdr;
  let a = hdr.affine;
  let absR = mat.mat3.fromValues(
    Math.abs(a[0][0]),
    Math.abs(a[0][1]),
    Math.abs(a[0][2]),
    Math.abs(a[1][0]),
    Math.abs(a[1][1]),
    Math.abs(a[1][2]),
    Math.abs(a[2][0]),
    Math.abs(a[2][1]),
    Math.abs(a[2][2])
  );
  //1st column = x
  let ixyz = [1, 1, 1];
  if (absR[3] > absR[0]) ixyz[0] = 2; //(absR[1][0] > absR[0][0]) ixyz[0] = 2;
  if (absR[6] > absR[0] && absR[6] > absR[3]) ixyz[0] = 3; //((absR[2][0] > absR[0][0]) && (absR[2][0]> absR[1][0])) ixyz[0] = 3;
  //2nd column = y
  ixyz[1] = 1;
  if (ixyz[0] === 1) {
    if (absR[4] > absR[7])
      //(absR[1][1] > absR[2][1])
      ixyz[1] = 2;
    else ixyz[1] = 3;
  } else if (ixyz[0] === 2) {
    if (absR[1] > absR[7])
      //(absR[0][1] > absR[2][1])
      ixyz[1] = 1;
    else ixyz[1] = 3;
  } else {
    if (absR[1] > absR[4])
      //(absR[0][1] > absR[1][1])
      ixyz[1] = 1;
    else ixyz[1] = 2;
  }
  //3rd column = z: constrained as x+y+z = 1+2+3 = 6
  ixyz[2] = 6 - ixyz[1] - ixyz[0];
  let perm = [1, 2, 3];
  perm[ixyz[0] - 1] = 1;
  perm[ixyz[1] - 1] = 2;
  perm[ixyz[2] - 1] = 3;
  let rotM = mat.mat4.fromValues(
    a[0][0],
    a[0][1],
    a[0][2],
    a[0][3],
    a[1][0],
    a[1][1],
    a[1][2],
    a[1][3],
    a[2][0],
    a[2][1],
    a[2][2],
    a[2][3],
    0,
    0,
    0,
    1
  );
  //n.b. 0.5 in these values to account for voxel centers, e.g. a 3-pixel wide bitmap in unit space has voxel centers at 0.25, 0.5 and 0.75
  overlayItem.mm000 = this.vox2mm([-0.5, -0.5, -0.5], rotM);
  overlayItem.mm100 = this.vox2mm([hdr.dims[1] - 0.5, -0.5, -0.5], rotM);
  overlayItem.mm010 = this.vox2mm([-0.5, hdr.dims[2] - 0.5, -0.5], rotM);
  overlayItem.mm001 = this.vox2mm([-0.5, -0.5, hdr.dims[3] - 0.5], rotM);
  let R = mat.mat4.create();
  mat.mat4.copy(R, rotM);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) R[i * 4 + j] = rotM[i * 4 + perm[j] - 1]; //rotM[i+(4*(perm[j]-1))];//rotM[i],[perm[j]-1];
  let flip = [0, 0, 0];
  if (R[0] < 0) flip[0] = 1; //R[0][0]
  if (R[5] < 0) flip[1] = 1; //R[1][1]
  if (R[10] < 0) flip[2] = 1; //R[2][2]
  overlayItem.dimsRAS = [
    hdr.dims[0],
    hdr.dims[perm[0]],
    hdr.dims[perm[1]],
    hdr.dims[perm[2]],
  ];
  overlayItem.pixDimsRAS = [
    hdr.pixDims[0],
    hdr.pixDims[perm[0]],
    hdr.pixDims[perm[1]],
    hdr.pixDims[perm[2]],
  ];
  if (this.arrayEquals(perm, [1, 2, 3]) && this.arrayEquals(flip, [0, 0, 0])) {
    overlayItem.toRAS = mat.mat4.create(); //aka fromValues(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
    overlayItem.matRAS = mat.mat4.clone(rotM);
    return; //no rotation required!
  }
  mat.mat4.identity(rotM);
  rotM[0 + 0 * 4] = 1 - flip[0] * 2;
  rotM[1 + 1 * 4] = 1 - flip[1] * 2;
  rotM[2 + 2 * 4] = 1 - flip[2] * 2;
  rotM[3 + 0 * 4] = (hdr.dims[perm[0]] - 1) * flip[0];
  rotM[3 + 1 * 4] = (hdr.dims[perm[1]] - 1) * flip[1];
  rotM[3 + 2 * 4] = (hdr.dims[perm[2]] - 1) * flip[2];
  let residualR = mat.mat4.create();
  mat.mat4.invert(residualR, rotM);
  mat.mat4.multiply(residualR, residualR, R);
  overlayItem.matRAS = mat.mat4.clone(residualR);
  rotM = mat.mat4.fromValues(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);
  rotM[perm[0] - 1 + 0 * 4] = -flip[0] * 2 + 1;
  rotM[perm[1] - 1 + 1 * 4] = -flip[1] * 2 + 1;
  rotM[perm[2] - 1 + 2 * 4] = -flip[2] * 2 + 1;
  rotM[3 + 0 * 4] = flip[0];
  rotM[3 + 1 * 4] = flip[1];
  rotM[3 + 2 * 4] = flip[2];
  overlayItem.toRAS = mat.mat4.clone(rotM);
}; // nii2RAS()

// currently: volumeList is an array if objects, each object is a volume that can be loaded
Niivue.prototype.loadVolumes = function (volumeList) {
  this.volumes = volumeList;
  this.back = this.volumes[0]; // load first volume as back layer
  this.overlays = this.volumes.slice(1); // remove first element (that is now this.back, all other imgaes are overlays)
  let xhr = [];
  let hdr = null;
  let img = null;
  // for loop to load all volumes in volumeList
  for (let i = 0; i < volumeList.length; i++) {
    console.log("loading ", volumeList[i].url);
    let url = this.volumes[i].url;
    xhr.push(new XMLHttpRequest());
    xhr[i].open("GET", url, true);
    xhr[i].responseType = "arraybuffer";
    xhr[i].onerror = function () {
      console.error("error loading volume ", this.volumes[i].url);
      alert("error loading " + this.volumes[i].url);
    };
    xhr[i].onload = function () {
      let dataBuffer = xhr[i].response;
      hdr = null;
      img = null;
      if (dataBuffer) {
        hdr = nifti.readHeader(dataBuffer);
        if (nifti.isCompressed(dataBuffer)) {
          img = nifti.readImage(hdr, nifti.decompress(dataBuffer));
        } else {
          img = nifti.readImage(hdr, dataBuffer);
        }
      } else {
        alert("Unable to load buffer properly from volume?");
        console.log("no buffer?");
      }
      this.volumes[i].volume = {};
      this.volumes[i].volume.hdr = hdr;
      this.volumes[i].volume.img = img;
      this.volumes[i].opacity = 1;
      this.nii2RAS(this.volumes[i]);
      //_overlayItem = overlayItem
      //this.selectColormap(this.volumes[0].colorMap) //only base image for now
      this.updateGLVolume();
    }.bind(this); // bind "this" niivue instance context
    xhr[i].send();
  } // for
  return this;
}; // loadVolume()

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

Niivue.prototype.initText = async function () {
  //load bitmap
  await this.loadPng("fnt.png");
  //create font metrics
  this.fontMets = [];
  for (let id = 0; id < 256; id++) {
    //clear ASCII codes 0..256
    this.fontMets[id] = {};
    this.fontMets[id].xadv = 0;
    this.fontMets[id].uv_lbwh = [0, 0, 0, 0];
    this.fontMets[id].lbwh = [0, 0, 0, 0];
  }
  //load metrics values: may only sparsely describe range 0..255
  //var metrics = [];
  async function fetchMetrics() {
    //const response = await fetch('./fnt.json');
    //metrics = await response.json();
  }
  await fetchMetrics();
  this.fontMets.distanceRange = metrics.atlas.distanceRange;
  this.fontMets.size = metrics.atlas.size;
  let scaleW = metrics.atlas.width;
  let scaleH = metrics.atlas.height;
  for (let i = 0; i < metrics.glyphs.length; i++) {
    let glyph = metrics.glyphs[i];
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
}; // initText()

const CLIP_PLANE_INDEX = 0;
const VOLUME_INDEX = 1;
const DISTANCE_FROM_CAMERA = -0.54;

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
    vertexBuffer,
    this.gl.TRIANGLES,
    6
  );
  this.clipPlaneObject3D.position = [0, 0, DISTANCE_FROM_CAMERA];
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

  this.volumeObject3D = new NiivueObject3D(vbo, this.gl.TRIANGLE_STRIP, 14); //cube is 12 triangles, triangle-strip creates n-2 triangles
  this.volumeObject3D.glFlags =
    this.volumeObject3D.BLEND |
    this.volumeObject3D.CULL_FACE |
    this.volumeObject3D.CULL_FRONT;
  this.volumeObject3D.position = [0, 0, DISTANCE_FROM_CAMERA];
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
  this.objectsToRender3D[VOLUME_INDEX].shaders.push(volumeRenderShader);

  // colorbar shader
  this.colorbarShader = new Shader(
    this.gl,
    vertColorbarShader,
    fragColorbarShader
  );
  this.colorbarShader.use(this.gl);
  this.gl.uniform1i(this.colorbarShader.uniforms["colormap"], 1);

  // font shader
  //multi-channel signed distance font https://github.com/Chlumsky/msdfgen
  this.fontShader = new Shader(this.gl, vertFontShader, fragFontShader);
  this.fontShader.use(this.gl);
  this.gl.uniform1i(this.fontShader.uniforms["fontTexture"], 3);

  // orientation shaders
  this.passThroughShader = new Shader(
    this.gl,
    vertPassThroughShader,
    fragPassThroughShader
  );

  //this.passThroughShader  = new Shader(this.gl, vertOrientShader,fragPassThroughShader);
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
  this.clipPlaneObject3D.shaders.push(clipPlaneShader);

  await this.initText();
  this.updateGLVolume();
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

function intensityRaw2Scaled(hdr, raw) {
  if (hdr.scl_slope === 0) hdr.scl_slope = 1.0;
  return raw * hdr.scl_slope + hdr.scl_inter;
}

// given an overlayItem and its img TypedArray, calculate 2% and 98% display range if needed
//clone FSL robust_range estimates https://github.com/rordenlab/niimath/blob/331758459140db59290a794350d0ff3ad4c37b67/src/core32.c#L1215
//ToDo: convert to web assembly, this is slow in JavaScript
Niivue.prototype.calMinMaxCore = function (
  overlayItem,
  img,
  percentileFrac = 0.02,
  ignoreZeroVoxels = false
) {
  if (
    this.opts.trustCalMinMax &&
    isFinite(overlayItem.volume.hdr.cal_min) &&
    isFinite(overlayItem.volume.hdr.cal_max) &&
    overlayItem.volume.hdr.cal_max > overlayItem.volume.hdr.cal_min
  ) {
    console.log("using hdr calminmax");
    return [
      overlayItem.volume.hdr.cal_min,
      overlayItem.volume.hdr.cal_max,
      overlayItem.volume.hdr.cal_min,
      overlayItem.volume.hdr.cal_max,
    ];
  }
  let imgRaw;
  let hdr = overlayItem.volume.hdr;
  //   console.log('hdr');
  //   console.log(hdr);

  if (hdr.datatypeCode === 2) imgRaw = new Uint8Array(img);
  else if (hdr.datatypeCode === 4) imgRaw = new Int16Array(img);
  else if (hdr.datatypeCode === 16) imgRaw = new Float32Array(img);
  else if (hdr.datatypeCode === 64) imgRaw = new Float64Array(img);
  else if (hdr.datatypeCode === 128) {
    imgRaw = new Uint8Array(img);
  } else if (hdr.datatypeCode === 512) imgRaw = new Uint16Array(img);
  else if (hdr.datatypeCode === 2304) {
    imgRaw = new Uint8Array(img);
  }

  //determine full range: min..max
  let mn = Number.MAX_VALUE; //img[0]
  let mx = -Number.MAX_VALUE;
  let nZero = 0;
  let nNan = 0;
  let nVox = imgRaw.length;
  for (let i = 0; i < nVox; i++) {
    if (isNaN(imgRaw[i])) {
      nNan++;
      continue;
    }
    if (imgRaw[i] === 0) {
      nZero++;
      continue;
    }
    mn = Math.min(imgRaw[i], mn);
    mx = Math.max(imgRaw[i], mx);
  }
  var mnScale = intensityRaw2Scaled(hdr, mn);
  var mxScale = intensityRaw2Scaled(hdr, mx);
  if (!ignoreZeroVoxels) nZero = 0;
  nZero += nNan;
  let n2pct = Math.round((nVox - nZero) * percentileFrac);
  if (n2pct < 1 || mn === mx) {
    console.log("no variability in image intensity?");
    return [mnScale, mxScale, mnScale, mxScale];
  }
  let nBins = 1001;
  let scl = (nBins - 1) / (mx - mn);
  let hist = new Array(nBins);
  for (let i = 0; i < nBins; i++) hist[i] = 0;
  if (ignoreZeroVoxels) {
    for (let i = 0; i <= nVox; i++) {
      if (imgRaw[i] === 0) continue;
      if (isNaN(imgRaw[i])) continue;
      hist[(imgRaw[i] - mn) * scl]++;
    }
  } else {
    for (let i = 0; i <= nVox; i++) {
      if (isNaN(imgRaw[i])) continue;
      hist[(imgRaw[i] - mn) * scl]++;
    }
  }
  let n = 0;
  let lo = 0;
  while (n < n2pct) {
    n += hist[lo];
    lo++;
  }
  lo--; //remove final increment
  n = 0;
  let hi = nBins;
  while (n < n2pct) {
    hi--;
    n += hist[hi];
  }
  if (lo == hi) {
    //MAJORITY are not black or white
    let ok = -1;
    while (ok !== 0) {
      if (lo > 0) {
        lo--;
        if (hist[lo] > 0) ok = 0;
      }
      if (ok != 0 && hi < nBins - 1) {
        hi++;
        if (hist[hi] > 0) ok = 0;
      }
      if (lo == 0 && hi == nBins - 1) ok = 0;
    } //while not ok
  } //if lo == hi
  var pct2 = intensityRaw2Scaled(hdr, lo / scl + mn);
  var pct98 = intensityRaw2Scaled(hdr, hi / scl + mn);
  console.log(
    "full range %f..%f  (voxels 0 or NaN = %i) robust range %f..%f",
    mnScale,
    mxScale,
    nZero,
    pct2,
    pct98
  );
  if (
    overlayItem.volume.hdr.cal_min < overlayItem.volume.hdr.cal_max &&
    overlayItem.volume.hdr.cal_min >= mnScale &&
    overlayItem.volume.hdr.cal_max <= mxScale
  ) {
    console.log("ignoring robust range: using header cal_min and cal_max");
    pct2 = overlayItem.volume.hdr.cal_min;
    pct98 = overlayItem.volume.hdr.cal_max;
  }
  return [pct2, pct98, mnScale, mxScale];
}; //calMinMaxCore

Niivue.prototype.calMinMax = function (
  overlayItem,
  img,
  percentileFrac = 0.02,
  ignoreZeroVoxels = false
) {
  let minMax = this.calMinMaxCore(
    overlayItem,
    img,
    percentileFrac,
    ignoreZeroVoxels
  );
  console.log(
    "cal_min, cal_max, global_min, global_max",
    minMax[0],
    minMax[1],
    minMax[2],
    minMax[3]
  );
  overlayItem.cal_min = minMax[0];
  overlayItem.cal_max = minMax[1];
  overlayItem.global_min = minMax[2];
  overlayItem.global_max = minMax[3];

  overlayItem.cal_min = overlayItem.global_min;
  overlayItem.cal_max = overlayItem.global_max;
  return minMax;
}; // calMinMax()

Niivue.prototype.refreshLayers = function (overlayItem, layer, numLayers) {
  let hdr = overlayItem.volume.hdr;
  let img = overlayItem.volume.img;
  let opacity = overlayItem.opacity;
  let imgRaw;
  let outTexture = null;

  let mtx = [];
  if (layer === 0) {
    this.back = {};
    mtx = overlayItem.toRAS;
    opacity = 1.0;
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
    imgRaw = new Uint8Array(img);
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
      imgRaw
    );
  } else if (hdr.datatypeCode === 4) {
    imgRaw = new Int16Array(img);
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
      imgRaw
    );
    orientShader = this.orientShaderI;
  } else if (hdr.datatypeCode === 16) {
    imgRaw = new Float32Array(img);
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
      imgRaw
    );
    orientShader = this.orientShaderF;
  } else if (hdr.datatypeCode === 64) {
    imgRaw = new Float64Array(img);
    let img32f = new Float32Array();
    img32f = Float32Array.from(imgRaw);
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
    imgRaw = new Uint8Array(img);
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
      imgRaw
    );
  } else if (hdr.datatypeCode === 512) {
    imgRaw = new Uint16Array(img);
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
      imgRaw
    );
  } else if (hdr.datatypeCode === 2304) {
    orientShader = this.orientShaderRGBU;
    orientShader.use(this.gl);
    this.gl.uniform1i(orientShader.uniforms["hasAlpha"], true);
    imgRaw = new Uint8Array(img);
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
      imgRaw
    );
  }

  if (overlayItem.global_min === undefined)
    //only once, first time volume is loaded
    this.calMinMax(overlayItem, imgRaw);

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
}; // refreshLayers()

Niivue.prototype.colormap = function (lutName = "") {
  //function colormap(lutName = "") {
  var lut = this.makeLut([0, 255], [0, 255], [0, 255], [0, 128], [0, 255]); //gray
  if (lutName === "Winter")
    lut = this.makeLut(
      [0, 0, 0],
      [0, 128, 255],
      [255, 196, 128],
      [0, 64, 128],
      [0, 128, 255]
    ); //winter
  if (lutName === "Warm")
    lut = this.makeLut(
      [255, 255, 255],
      [127, 196, 254],
      [0, 0, 0],
      [0, 64, 128],
      [0, 128, 255]
    ); //warm
  if (lutName === "Plasma")
    lut = this.makeLut(
      [13, 156, 237, 240],
      [8, 23, 121, 249],
      [135, 158, 83, 33],
      [0, 56, 80, 88],
      [0, 64, 192, 255]
    ); //plasma
  if (lutName === "Viridis")
    lut = this.makeLut(
      [68, 49, 53, 253],
      [1, 104, 183, 231],
      [84, 142, 121, 37],
      [0, 56, 80, 88],
      [0, 65, 192, 255]
    ); //viridis
  if (lutName === "Inferno")
    lut = this.makeLut(
      [0, 120, 237, 240],
      [0, 28, 105, 249],
      [4, 109, 37, 33],
      [0, 56, 80, 88],
      [0, 64, 192, 255]
    ); //inferno
  return lut;
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

Niivue.prototype.drawText = function (xy, str) {
  //to right of x, vertically centered on y
  if (this.opts.textHeight <= 0) return;
  this.fontShader.use(this.gl);
  let scale = this.opts.textHeight * this.gl.canvas.height;
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
  let screenPxRange =
    (scale / this.fontMets.size) * this.fontMets.distanceRange;
  screenPxRange = Math.max(screenPxRange, 1.0); //screenPxRange() must never be lower than 1
  this.gl.uniform1f(this.fontShader.uniforms["screenPxRange"], screenPxRange);
  var bytes = new Buffer(str);
  for (let i = 0; i < str.length; i++)
    xy[0] += this.drawChar(xy, scale, bytes[i]);
}; // drawText()

Niivue.prototype.drawTextRight = function (xy, str) {
  //to right of x, vertically centered on y
  if (this.opts.textHeight <= 0) return;
  this.fontShader.use(this.gl);
  xy[1] -= 0.5 * this.opts.textHeight * this.gl.canvas.height;
  this.drawText(xy, str);
}; // drawTextRight()

Niivue.prototype.drawTextBelow = function (xy, str) {
  //horizontally centered on x, below y
  if (this.opts.textHeight <= 0) return;
  this.fontShader.use(this.gl);
  let scale = this.opts.textHeight * this.gl.canvas.height;
  xy[0] -= 0.5 * this.textWidth(scale, str);
  this.drawText(xy, str);
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

Niivue.prototype.draw3D = function () {
  // let { volScale, vox } = this.sliceScale(); // slice scale determined by this.back --> the base image layer

  let mn = Math.min(this.gl.canvas.width, this.gl.canvas.height);
  if (mn <= 0) return;
  mn *= this.volScaleMultiplier;
  let xCenter = this.gl.canvas.width / 2;
  let yCenter = this.gl.canvas.height / 2;
  let xPix = mn;
  let yPix = mn;
  this.gl.viewport(xCenter - xPix * 0.5, yCenter - yPix * 0.5, xPix, yPix);
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

    // let m = this.calculateMvpMatrix(object3D.modelMatrix, volScale);
    let m = this.calculateMvpMatrix(object3D);

    //compute ray direction
    var inv = mat.mat4.create();
    mat.mat4.invert(inv, m);
    var rayDir4 = mat.vec4.fromValues(0, 0, -1, 1);
    mat.vec4.transformMat4(rayDir4, rayDir4, inv);
    var rayDir = mat.vec3.fromValues(rayDir4[0], rayDir4[1], rayDir4[2]);
    mat.vec3.normalize(rayDir, rayDir);
    //defuzz, avoid divide by zero
    const tiny = 0.00001;
    if (Math.abs(rayDir[0]) < tiny) rayDir[0] = tiny;
    if (Math.abs(rayDir[1]) < tiny) rayDir[1] = tiny;
    if (Math.abs(rayDir[2]) < tiny) rayDir[2] = tiny;

    for (const shader of object3D.shaders) {
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
    }

    this.gl.drawArrays(object3D.mode, 0, object3D.indexCount);
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
  let frac = this.scene.crosshairPos; // default to center, or last known
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
  //let d = overlayItem.volume.hdr.dims;
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
  this.gl.clearColor(
    this.opts.backColor[0],
    this.opts.backColor[1],
    this.opts.backColor[2],
    this.opts.backColor[3]
  );
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  let posString = "";
  if (!this.back.dims)
    // exit if we have nothing to draw
    return;
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
