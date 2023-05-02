import * as cmaps from "./cmaps";

export const colortables = function () {
  this.version = 0.1;
  this.gamma = 1.0;
  let cmapsSorted = [];
  if (cmaps.length > 0) return this.cmaps;
  for (const [key] of Object.entries(cmaps)) {
    if (key.startsWith("$")) continue; //ignore drawing maps
    cmapsSorted.push(key);
  }
  cmapsSorted.sort();
  this.cluts = {};
  for (let i = 0; i < cmapsSorted.length; i++) {
    let key = cmapsSorted[i];
    this.cluts[key] = cmaps[key];
  }
};

colortables.prototype.addColormap = function (key, cmap) {
  this.cluts[key] = cmap;
};

colortables.prototype.colorMaps = function () {
  return Object.keys(this.cluts);
};

// returns key name if it exists, otherwise returns default "gray"
/*colortables.prototype.key2key = function (key = "") {
  let cmap = this.cluts[key];
  if (cmap !== undefined) return key;
  console.log("No color map named " + key);
  return "Gray";
};*/

colortables.prototype.colormapFromKey = function (name) {
  let cmap = this.cluts[name];
  if (cmap !== undefined) return cmap;
  cmap = this.cluts[name.toLowerCase()];
  if (cmap !== undefined) return cmap;
  if (name.length > 0) console.log("No color map named " + name);
  cmap = {
    min: 0,
    max: 0,
    R: [0, 255],
    G: [0, 255],
    B: [0, 255],
    A: [0, 255],
    I: [0, 255],
  };
  return cmap;
};

// not included in public docs
colortables.prototype.colormap = function (key = "") {
  let cmap = this.colormapFromKey(key);
  return this.makeLut(cmap.R, cmap.G, cmap.B, cmap.A, cmap.I);
}; // colormap()

// not included in public docs
colortables.prototype.makeDrawLut = function (name) {
  let cmap = [];
  if (typeof name === "object") cmap = name;
  else cmap = cmaps[name];
  if (cmap === undefined) {
    cmap = {
      min: 0,
      max: 0,
      R: [0, 255, 0, 0, 255, 0, 255],
      G: [0, 0, 255, 0, 255, 255, 0],
      B: [0, 0, 0, 255, 0, 255, 255],
      A: [0, 255, 255, 255, 255, 255, 255],
    };
  }
  if (cmap.R.length < 256) {
    let j = 256 - cmap.R.length;
    for (let i = 0; i < j; i++) {
      //make all unused slots opaque red
      cmap.R.push(255);
      cmap.G.push(0);
      cmap.B.push(0);
      cmap.A.push(255);
    }
  }
  if (!cmap.hasOwnProperty("labels")) cmap.labels = [];
  if (cmap.labels.length < 256) {
    let j = cmap.labels.length;
    for (let i = j; i < 256; i++) {
      //make all unused slots opaque red
      cmap.labels.push(i.toString());
    }
  }
  var lut = new Uint8ClampedArray(256 * 4);
  var k = 0;
  for (let i = 0; i < 256; i++) {
    lut[k++] = cmap.R[i]; //Red
    lut[k++] = cmap.G[i]; //Green
    lut[k++] = cmap.B[i]; //Blue
    lut[k++] = cmap.A[i]; //Alpha
  }
  return {
    lut: lut,
    labels: cmap.labels,
  };
};

// not included in public docs
colortables.prototype.makeLut = function (Rs, Gs, Bs, As, Is) {
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
  if (this.gamma === 1.0) return lut;
  for (var i = 0; i < 255 * 4; i++) {
    if (i % 4 === 3) continue; //gamma changes RGB, not Alpha
    lut[i] = Math.pow(lut[i] / 255, 1 / this.gamma) * 255;
  }
  return lut;
}; // makeLut()

export const cmapper = new colortables();
