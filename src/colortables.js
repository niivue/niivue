import * as cmaps from "./cmaps";

export const colortables = function () {
  this.version = 0.1;
  this.gamma = 1.0;
};

colortables.prototype.colorMaps = function (sort = true) {
  let cm = [];
  for (const [key] of Object.entries(cmaps)) {
    cm.push(key);
  }
  return sort === true ? cm.sort() : cm;
};

// not included in public docs
colortables.prototype.colormap = function (lutName = "") {
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

colortables.prototype.colormapFromKey = function (name) {
  let availMaps = this.colorMaps();
  for (let i = 0; i < availMaps.length; i++) {
    let key = availMaps[i];
    if (name.toLowerCase() === key.toLowerCase()) {
      return cmaps[key];
    }
  }
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
