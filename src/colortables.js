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

colortables.prototype.colormaps = function () {
  return Object.keys(this.cluts);
};

//for backward compatibility: prior to v0.34 "colormaps" used to be "colorMaps"
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

colortables.prototype.makeLabelLut = function (cm, alphaFill = 64) {
  if (
    !cm.hasOwnProperty("R") ||
    !cm.hasOwnProperty("G") ||
    !cm.hasOwnProperty("B")
  ) {
    console.log("Invalid colormap table.", cm);
    return [];
  }
  let nLabels = cm.R.length;
  //if indices not provided, indices default to 0..(nLabels-1)
  let idxs = Array.apply(null, { length: nLabels }).map(Number.call, Number);
  if (cm.hasOwnProperty("I")) idxs = cm.I;
  if (
    nLabels !== cm.G.length ||
    nLabels !== cm.B.length ||
    nLabels !== idxs.length
  ) {
    console.log("colormap does not make sense.", cm);
    return [];
  }
  let As = new Uint8ClampedArray(nLabels).fill(alphaFill);
  As[0] = 0;
  if (cm.hasOwnProperty("A")) As = cm.A;
  let mnIdx = Math.min(...idxs);
  let mxIdx = Math.max(...idxs);
  //n.b. number of input labels can be sparse: I:[0,3,4] output is dense [0,1,2,3,4]
  let nLabelsDense = mxIdx - mnIdx + 1;
  var lut = new Uint8ClampedArray(nLabelsDense * 4).fill(0);
  for (var i = 0; i < nLabels; i++) {
    let k = (idxs[i] - mnIdx) * 4;
    lut[k++] = cm.R[i]; //Red
    lut[k++] = cm.G[i]; //Green
    lut[k++] = cm.B[i]; //Blue
    lut[k++] = As[i]; //Alpha
  }
  let cmap = [];
  //labels are optional
  if (cm.hasOwnProperty("labels")) {
    let nL = cm.labels.length;
    if (nL === nLabelsDense) cmap.labels = cm.labels;
    else if (nL === nLabels) {
      cmap.labels = Array(nLabelsDense).fill("?");
      for (var i = 0; i < nLabels; i++) {
        let idx = idxs[i];
        cmap.labels[idx] = cm.labels[i];
      }
    }
  }
  cmap.lut = lut;
  cmap.min = mnIdx;
  cmap.max = mxIdx;
  return cmap;
};

colortables.prototype.makeLabelLutFromUrl = async function (name) {
  async function fetchJSON(fnm) {
    const response = await fetch(fnm);
    const js = await response.json();
    return js;
  }
  let cm = await fetchJSON(name);
  return this.makeLabelLut(cm);
};

// not included in public docs
// The drawing colormap is a variant of the label colormap with precisely 256 colors
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
  let cm = this.makeLabelLut(cmap, 255);
  if (!cm.hasOwnProperty("labels")) cm.labels = [];
  if (cm.labels.length < 256) {
    let j = cm.labels.length;
    for (let i = j; i < 256; i++) {
      //make all unused slots opaque red
      cm.labels.push(i.toString());
    }
  }
  var lut = new Uint8ClampedArray(256 * 4);
  var k = 0;
  for (let i = 0; i < 256; i++) {
    lut[k++] = 255; //Red
    lut[k++] = 0; //Green
    lut[k++] = 0; //Blue
    lut[k++] = 255; //Alpha
  }
  lut[3] = 0; //make first alpha transparent: not part of drawing
  //drawings can have no more than 256 colors
  let explicitLUTbytes = Math.min(cm.lut.length, 256 * 4);
  if (explicitLUTbytes > 0) {
    for (let i = 0; i < explicitLUTbytes; i++) lut[i] = cm.lut[i];
  }
  return {
    lut: lut,
    labels: cm.labels,
  };
}; // makeDrawLut()

// not included in public docs
colortables.prototype.makeLut = function (Rs, Gs, Bs, As, Is) {
  //create color lookup table provided arrays of reds, greens, blues, alphas and intensity indices
  //intensity indices should be in increasing order with the first value 0 and the last 255.
  // this.makeLut([0, 255], [0, 0], [0,0], [0,128],[0,255]); //red gradient
  var lut = new Uint8ClampedArray(256 * 4);
  let nIdx = Rs.length;
  if (typeof Is === "undefined") {
    Is = new Uint8ClampedArray(nIdx).fill(0);
    for (var i = 0; i < nIdx; i++) Is[i] = Math.round((i * 255.0) / (nIdx - 1));
  }
  if (typeof As === "undefined") {
    As = new Uint8ClampedArray(nIdx).fill(64);
    As[0] = 0;
  }
  for (var i = 0; i < nIdx - 1; i++) {
    //return a + f * (b - a);
    var idxLo = Is[i];
    var idxHi = Is[i + 1];
    if (i === 0 && idxLo !== 0)
      console.log(
        "colormap issue: indices expected to start with 0 not ",
        idxLo
      );
    if (i === Is.length - 2 && idxHi !== 255) {
      console.log(
        "padding colormap: indices expected end with 255 not ",
        idxHi
      );
      idxHi = 255;
    }
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
