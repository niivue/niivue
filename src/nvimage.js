import * as nifti from "nifti-reader-js";
import * as mat from "gl-matrix";
import * as cmaps from "./cmaps";

export var NVImage = function (
  dataBuffer,
  name = "",
  colorMap = "gray",
  opacity = 1.0,
  trustCalMinMax = true,
  percentileFrac = 0.02,
  ignoreZeroVoxels = false,
  visible = true
) {
  // https://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1.h
  this.DT_NONE = 0;
  this.DT_UNKNOWN = 0; /* what it says, dude           */
  this.DT_BINARY = 1; /* binary (1 bit/voxel)         */
  this.DT_UNSIGNED_CHAR = 2; /* unsigned char (8 bits/voxel) */
  this.DT_SIGNED_SHORT = 4; /* signed short (16 bits/voxel) */
  this.DT_SIGNED_INT = 8; /* signed int (32 bits/voxel)   */
  this.DT_FLOAT = 16; /* float (32 bits/voxel)        */
  this.DT_COMPLEX = 32; /* complex (64 bits/voxel)      */
  this.DT_DOUBLE = 64; /* double (64 bits/voxel)       */
  this.DT_RGB = 128; /* RGB triple (24 bits/voxel)   */
  this.DT_ALL = 255; /* not very useful (?)          */
  this.DT_INT8 = 256; /* signed char (8 bits)         */
  this.DT_UINT16 = 512; /* unsigned short (16 bits)     */
  this.DT_UINT32 = 768; /* unsigned int (32 bits)       */
  this.DT_INT64 = 1024; /* long long (64 bits)          */
  this.DT_UINT64 = 1280; /* unsigned long long (64 bits) */
  this.DT_FLOAT128 = 1536; /* long double (128 bits)       */
  this.DT_COMPLEX128 = 1792; /* double pair (128 bits)       */
  this.DT_COMPLEX256 = 2048; /* long double pair (256 bits)  */
  this.DT_RGBA32 = 2304; /* 4 byte RGBA (32 bits/voxel)  */

  this.name = name;
  this.colorMap = colorMap;
  this.opacity = opacity > 1.0 ? 1.0 : opacity; //make sure opacity can't be initialized greater than 1 see: #107 and #117 on github
  this.percentileFrac = percentileFrac;
  this.ignoreZeroVoxels = ignoreZeroVoxels;
  this.trustCalMinMax = trustCalMinMax;
  this.visible = visible;

  // Added to support zerosLike
  if (!dataBuffer) {
    return;
  }

  this.hdr = nifti.readHeader(dataBuffer);
  let imgRaw = null;
  if (nifti.isCompressed(dataBuffer)) {
    imgRaw = nifti.readImage(this.hdr, nifti.decompress(dataBuffer));
  } else {
    imgRaw = nifti.readImage(this.hdr, dataBuffer);
  }

  switch (this.hdr.datatypeCode) {
    case this.DT_UNSIGNED_CHAR:
      this.img = new Uint8Array(imgRaw);
      break;
    case this.DT_SIGNED_SHORT:
      this.img = new Int16Array(imgRaw);
      break;
    case this.DT_FLOAT:
      this.img = new Float32Array(imgRaw);
      break;
    case this.DT_DOUBLE:
      this.img = new Float64Array(imgRaw);
      break;
    case this.DT_RGB:
      this.img = new Uint8Array(imgRaw);
      break;
    case this.DT_UINT16:
      this.img = new Uint16Array(imgRaw);
      break;
    case this.DT_RGBA32:
      this.img = new Uint8Array(imgRaw);
      break;
    default:
      throw "datatype " + this.hdr.datatypeCode + " not supported";
  }

  this.calculateRAS();
  this.calMinMax();
};

NVImage.prototype.calculateRAS = function () {
  //Transform to orient NIfTI image to Left->Right,Posterior->Anterior,Inferior->Superior (48 possible permutations)
  // port of Matlab reorient() https://github.com/xiangruili/dicm2nii/blob/master/nii_viewer.m
  // not elegant, as JavaScript arrays are always 1D
  let a = this.hdr.affine;
  let header = this.hdr;
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
  this.mm000 = this.vox2mm([-0.5, -0.5, -0.5], rotM);
  this.mm100 = this.vox2mm([header.dims[1] - 0.5, -0.5, -0.5], rotM);
  this.mm010 = this.vox2mm([-0.5, header.dims[2] - 0.5, -0.5], rotM);
  this.mm001 = this.vox2mm([-0.5, -0.5, header.dims[3] - 0.5], rotM);
  let R = mat.mat4.create();
  mat.mat4.copy(R, rotM);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) R[i * 4 + j] = rotM[i * 4 + perm[j] - 1]; //rotM[i+(4*(perm[j]-1))];//rotM[i],[perm[j]-1];
  let flip = [0, 0, 0];
  if (R[0] < 0) flip[0] = 1; //R[0][0]
  if (R[5] < 0) flip[1] = 1; //R[1][1]
  if (R[10] < 0) flip[2] = 1; //R[2][2]
  this.dimsRAS = [
    header.dims[0],
    header.dims[perm[0]],
    header.dims[perm[1]],
    header.dims[perm[2]],
  ];
  this.pixDimsRAS = [
    header.pixDims[0],
    header.pixDims[perm[0]],
    header.pixDims[perm[1]],
    header.pixDims[perm[2]],
  ];
  if (this.arrayEquals(perm, [1, 2, 3]) && this.arrayEquals(flip, [0, 0, 0])) {
    this.toRAS = mat.mat4.create(); //aka fromValues(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
    this.matRAS = mat.mat4.clone(rotM);
    return; //no rotation required!
  }
  mat.mat4.identity(rotM);
  rotM[0 + 0 * 4] = 1 - flip[0] * 2;
  rotM[1 + 1 * 4] = 1 - flip[1] * 2;
  rotM[2 + 2 * 4] = 1 - flip[2] * 2;
  rotM[3 + 0 * 4] = (header.dims[perm[0]] - 1) * flip[0];
  rotM[3 + 1 * 4] = (header.dims[perm[1]] - 1) * flip[1];
  rotM[3 + 2 * 4] = (header.dims[perm[2]] - 1) * flip[2];
  let residualR = mat.mat4.create();
  mat.mat4.invert(residualR, rotM);
  mat.mat4.multiply(residualR, residualR, R);
  this.matRAS = mat.mat4.clone(residualR);
  rotM = mat.mat4.fromValues(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);
  rotM[perm[0] - 1 + 0 * 4] = -flip[0] * 2 + 1;
  rotM[perm[1] - 1 + 1 * 4] = -flip[1] * 2 + 1;
  rotM[perm[2] - 1 + 2 * 4] = -flip[2] * 2 + 1;
  rotM[3 + 0 * 4] = flip[0];
  rotM[3 + 1 * 4] = flip[1];
  rotM[3 + 2 * 4] = flip[2];
  this.toRAS = mat.mat4.clone(rotM);
};

NVImage.prototype.vox2mm = function (XYZ, mtx) {
  let sform = mat.mat4.clone(mtx);
  mat.mat4.transpose(sform, sform);
  let pos = mat.vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1);
  mat.vec4.transformMat4(pos, pos, sform);
  let pos3 = mat.vec3.fromValues(pos[0], pos[1], pos[2]);
  return pos3;
}; // vox2mm()

/**
 * test if two arrays have equal values for each element
 * @param {Array} a the first array
 * @param {Array} b the second array
 * @example Niivue.arrayEquals(a, b)
 */
NVImage.prototype.arrayEquals = function (a, b) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
};

NVImage.prototype.colorMaps = function (sort = true) {
  let cm = [];
  for (const [key] of Object.entries(cmaps)) {
    cm.push(key);
  }
  return sort === true ? cm.sort() : cm;
};

// given an overlayItem and its img TypedArray, calculate 2% and 98% display range if needed
//clone FSL robust_range estimates https://github.com/rordenlab/niimath/blob/331758459140db59290a794350d0ff3ad4c37b67/src/core32.c#L1215
//ToDo: convert to web assembly, this is slow in JavaScript
NVImage.prototype.calMinMax = function () {
  if (
    this.trustCalMinMax &&
    isFinite(this.hdr.cal_min) &&
    isFinite(this.hdr.cal_max) &&
    this.hdr.cal_max > this.hdr.cal_min
  ) {
    this.cal_min = this.hdr.cal_min;
    this.cal_max = this.hdr.cal_max;
    this.global_min = this.hdr.cal_min;
    this.global_max = this.hdr.cal_max;
    return [
      this.hdr.cal_min,
      this.hdr.cal_max,
      this.hdr.cal_min,
      this.hdr.cal_max,
    ];
  }

  let cm = this.colorMap;
  let allColorMaps = this.colorMaps();
  let cmMin = 0;
  let cmMax = 0;
  if (allColorMaps.indexOf(cm.toLowerCase()) != -1) {
    cmMin = cmaps[cm.toLowerCase()].min;
    cmMax = cmaps[cm.toLowerCase()].max;
  }

  // if color map specifies non zero values for min and max then use them
  if (cmMin != cmMax) {
    this.cal_min = cmMin;
    this.cal_max = cmMax;
    return [cmMin, cmMax, cmMin, cmMax];
  }

  //determine full range: min..max
  let mn = this.img[0];
  let mx = this.img[0];
  let nZero = 0;
  let nNan = 0;
  let nVox = this.img.length;
  for (let i = 0; i < nVox; i++) {
    if (isNaN(this.img[i])) {
      nNan++;
      continue;
    }
    if (this.img[i] === 0) {
      nZero++;
      if (this.ignoreZeroVoxels) {
        continue;
      }
    }
    mn = Math.min(this.img[i], mn);
    mx = Math.max(this.img[i], mx);
  }
  var mnScale = this.intensityRaw2Scaled(this.hdr, mn);
  var mxScale = this.intensityRaw2Scaled(this.hdr, mx);
  if (!this.ignoreZeroVoxels) nZero = 0;
  nZero += nNan;
  let n2pct = Math.round((nVox - nZero) * this.percentileFrac);
  if (n2pct < 1 || mn === mx) {
    console.log("no variability in image intensity?");
    this.cal_min = mnScale;
    this.cal_max = mxScale;
    this.global_min = mnScale;
    this.global_max = mxScale;
    return [mnScale, mxScale, mnScale, mxScale];
  }
  let nBins = 1001;
  let scl = (nBins - 1) / (mx - mn);
  let hist = new Array(nBins);
  for (let i = 0; i < nBins; i++) {
    hist[i] = 0;
  }
  if (this.ignoreZeroVoxels) {
    for (let i = 0; i <= nVox; i++) {
      if (this.img[i] === 0) continue;
      if (isNaN(this.img[i])) continue;
      hist[Math.round((this.img[i] - mn) * scl)]++;
    }
  } else {
    for (let i = 0; i <= nVox; i++) {
      if (isNaN(this.img[i])) {
        continue;
      }
      hist[Math.round((this.img[i] - mn) * scl)]++;
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
  var pct2 = this.intensityRaw2Scaled(this.hdr, lo / scl + mn);
  var pct98 = this.intensityRaw2Scaled(this.hdr, hi / scl + mn);
  // console.log(
  //   "full range %f..%f  (voxels 0 or NaN = %i) robust range %f..%f",
  //   mnScale,
  //   mxScale,
  //   nZero,
  //   pct2,
  //   pct98
  // );
  if (
    this.hdr.cal_min < this.hdr.cal_max &&
    this.hdr.cal_min >= mnScale &&
    this.hdr.cal_max <= mxScale
  ) {
    // console.log("ignoring robust range: using header cal_min and cal_max");
    pct2 = this.hdr.cal_min;
    pct98 = this.hdr.cal_max;
  }
  this.cal_min = pct2;
  this.cal_max = pct98;
  this.global_min = mnScale;
  this.global_max = mxScale;
  return [pct2, pct98, mnScale, mxScale];
}; //calMinMaxCore

NVImage.prototype.intensityRaw2Scaled = function (hdr, raw) {
  if (hdr.scl_slope === 0) hdr.scl_slope = 1.0;
  return raw * hdr.scl_slope + hdr.scl_inter;
};

NVImage.loadFromUrl = async function (
  url,
  name = "",
  colorMap = "gray",
  opacity = 1.0,
  trustCalMinMax = true,
  percentileFrac = 0.02,
  ignoreZeroVoxels = false,
  visible = true
) {
  let response = await fetch(url);
  let nvimage = null;

  if (!response.ok) {
    throw Error(response.statusText);
  }

  let urlParts = url.split("/"); // split url parts at slash
  name = urlParts.slice(-1)[0]; // name will be last part of url (e.g. some/url/image.nii.gz --> image.nii.gz)

  let dataBuffer = await response.arrayBuffer();
  if (dataBuffer) {
    nvimage = new NVImage(
      dataBuffer,
      name,
      colorMap,
      opacity,
      trustCalMinMax,
      percentileFrac,
      ignoreZeroVoxels,
      visible
    );
  } else {
    alert("Unable to load buffer properly from volume");
  }

  return nvimage;
};

// loading Nifti files
NVImage.readFileAsync = function (file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = reject;

    reader.readAsArrayBuffer(file);
  });
};

NVImage.loadFromFile = async function (
  file,
  name = "",
  colorMap = "gray",
  opacity = 1.0,
  trustCalMinMax = true,
  percentileFrac = 0.02,
  ignoreZeroVoxels = false,
  visible = true
) {
  let nvimage = null;
  try {
    let dataBuffer = await this.readFileAsync(file);
    nvimage = new NVImage(
      dataBuffer,
      name,
      colorMap,
      opacity,
      trustCalMinMax,
      percentileFrac,
      ignoreZeroVoxels,
      visible
    );
  } catch (err) {
    console.log(err);
  }
  return nvimage;
};

NVImage.prototype.clone = function () {
  let clonedImage = new NVImage();
  clonedImage.hdr = Object.assign({}, this.hdr);
  clonedImage.img = this.img.slice();
  clonedImage.calculateRAS();
  clonedImage.calMinMax();
  return clonedImage;
};

NVImage.prototype.zeroImage = function () {
  this.img.fill(0);
};

NVImage.zerosLike = function (nvImage) {
  let zeroClone = nvImage.clone();
  zeroClone.zeroImage();
  return zeroClone;
};
