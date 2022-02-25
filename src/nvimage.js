import * as nifti from "nifti-reader-js";
import { v4 as uuidv4 } from "uuid";
import * as mat from "gl-matrix";
import * as cmaps from "./cmaps";
import { NiivueObject3D } from "./niivue-object3D";

/**
 * query all available color maps that can be applied to volumes
 * @param {boolean} [sort=true] whether or not to sort the returned array
 * @returns {array} an array of colormap strings
 * @example
 * niivue = new Niivue()
 * colormaps = niivue.colorMaps()
 */

/**
 * @class NVImage
 * @description
 * a NVImage encapsulates some images data and provides methods to query and operate on images
 * @constructor
 * @param {array} dataBuffer an array buffer of image data to load (there are also methods that abstract this more. See loadFromUrl, and loadFromFile)
 * @param {string} [name=''] a name for this image. Default is an empty string
 * @param {string} [colorMap='gray'] a color map to use. default is gray
 * @param {number} [opacity=1.0] the opacity for this image. default is 1
 * @param {boolean} [trustCalMinMax=true] whether or not to trust cal_min and cal_max from the nifti header (trusting results in faster loading)
 * @param {number} [percentileFrac=0.02] the percentile to use for setting the robust range of the display values (smart intensity setting for images with large ranges)
 * @param {boolean} [ignoreZeroVoxels=false] whether or not to ignore zero voxels in setting the robust range of display values
 * @param {boolean} [visible=true] whether or not this image is to be visible
 */
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
  this.id = uuidv4();
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
    case this.DT_INT8:
      let i8 = new Int8Array(imgRaw);
      var vx8 = i8.length;
      this.img = new Int16Array(vx8);
      for (var i = 0; i < vx8 - 1; i++) this.img[i] = i8[i];
      this.hdr.datatypeCode = this.DT_SIGNED_SHORT;
      break;
    case this.DT_UINT32:
      let u32 = new Uint32Array(imgRaw);
      var vx32 = u32.length;
      this.img = new Float64Array(vx32);
      for (var i = 0; i < vx32 - 1; i++) this.img[i] = u32[i];
      this.hdr.datatypeCode = this.DT_DOUBLE;
      break;
    case this.DT_SIGNED_INT:
      let i32 = new Int32Array(imgRaw);
      var vxi32 = i32.length;
      this.img = new Float64Array(vxi32);
      for (var i = 0; i < vxi32 - 1; i++) this.img[i] = i32[i];
      this.hdr.datatypeCode = this.DT_DOUBLE;
      break;
    case this.DT_INT64:
      let i64 = new BigInt64Array(imgRaw);
      let vx = i64.length;
      this.img = new Float64Array(vx);
      for (var i = 0; i < vx - 1; i++) this.img[i] = Number(i64[i]);
      this.hdr.datatypeCode = this.DT_DOUBLE;
      break;
    default:
      throw "datatype " + this.hdr.datatypeCode + " not supported";
  }

  this.calculateRAS();
  this.calMinMax();
};

// not included in public docs
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
  if (absR[3] > absR[0]) {
    ixyz[0] = 2; //(absR[1][0] > absR[0][0]) ixyz[0] = 2;
  }
  if (absR[6] > absR[0] && absR[6] > absR[3]) {
    ixyz[0] = 3; //((absR[2][0] > absR[0][0]) && (absR[2][0]> absR[1][0])) ixyz[0] = 3;
  } //2nd column = y
  ixyz[1] = 1;
  if (ixyz[0] === 1) {
    if (absR[4] > absR[7]) {
      //(absR[1][1] > absR[2][1])
      ixyz[1] = 2;
    } else {
      ixyz[1] = 3;
    }
  } else if (ixyz[0] === 2) {
    if (absR[1] > absR[7]) {
      //(absR[0][1] > absR[2][1])
      ixyz[1] = 1;
    } else {
      ixyz[1] = 3;
    }
  } else {
    if (absR[1] > absR[4]) {
      //(absR[0][1] > absR[1][1])
      ixyz[1] = 1;
    } else {
      ixyz[1] = 2;
    }
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
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      R[i * 4 + j] = rotM[i * 4 + perm[j] - 1]; //rotM[i+(4*(perm[j]-1))];//rotM[i],[perm[j]-1];
    }
  }
  let flip = [0, 0, 0];
  if (R[0] < 0) {
    flip[0] = 1; //R[0][0]
  }
  if (R[5] < 0) {
    flip[1] = 1; //R[1][1]
  }
  if (R[10] < 0) {
    flip[2] = 1; //R[2][2]
  }
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
  console.log(this.hdr.dims);
  console.log(this.dimsRAS);
};

// not included in public docs
NVImage.prototype.vox2mm = function (XYZ, mtx) {
  let sform = mat.mat4.clone(mtx);
  mat.mat4.transpose(sform, sform);
  let pos = mat.vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1);
  mat.vec4.transformMat4(pos, pos, sform);
  let pos3 = mat.vec3.fromValues(pos[0], pos[1], pos[2]);
  return pos3;
}; // vox2mm()

NVImage.prototype.mm2vox = function (mm) {
  let sform = mat.mat4.fromValues(...this.hdr.affine.flat());
  let out = mat.mat4.clone(sform);
  mat.mat4.transpose(out, sform);
  mat.mat4.invert(out, out);
  let pos = mat.vec4.fromValues(mm[0], mm[1], mm[2], 1);
  mat.vec4.transformMat4(pos, pos, out);
  let pos3 = mat.vec3.fromValues(pos[0], pos[1], pos[2]);
  return [Math.round(pos3[0]), Math.round(pos3[1]), Math.round(pos3[2])];
}; // vox2mm()

// not included in public docs
NVImage.prototype.arrayEquals = function (a, b) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
};

/**
 * query all available color maps that can be applied to volumes
 * @param {boolean} [sort=true] whether or not to sort the returned array
 * @returns {array} an array of colormap strings
 * @example
 * myImage = NVImage.loadFromUrl('./someURL/someFile.nii.gz')
 * colormaps = myImage.colorMaps()
 */
NVImage.prototype.colorMaps = function (sort = true) {
  let cm = [];
  for (const [key] of Object.entries(cmaps)) {
    cm.push(key);
  }
  return sort === true ? cm.sort() : cm;
};

// not included in public docs
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

// not included in public docs
NVImage.prototype.intensityRaw2Scaled = function (hdr, raw) {
  if (hdr.scl_slope === 0) hdr.scl_slope = 1.0;
  return raw * hdr.scl_slope + hdr.scl_inter;
};

/**
 * factory function to load and return a new NVImage instance from a given URL
 * @param {string} url the resolvable URL pointing to a nifti image to load
 * @param {string} [name=''] a name for this image. Default is an empty string
 * @param {string} [colorMap='gray'] a color map to use. default is gray
 * @param {number} [opacity=1.0] the opacity for this image. default is 1
 * @param {boolean} [trustCalMinMax=true] whether or not to trust cal_min and cal_max from the nifti header (trusting results in faster loading)
 * @param {number} [percentileFrac=0.02] the percentile to use for setting the robust range of the display values (smart intensity setting for images with large ranges)
 * @param {boolean} [ignoreZeroVoxels=false] whether or not to ignore zero voxels in setting the robust range of display values
 * @param {boolean} [visible=true] whether or not this image is to be visible
 * @returns {NVImage} returns a NVImage intance
 * @example
 * myImage = NVImage.loadFromUrl('./someURL/image.nii.gz') // must be served from a server (local or remote)
 */
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

// not included in public docs
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

/**
 * factory function to load and return a new NVImage instance from a file in the browser
 * @param {string} file the file object
 * @param {string} [name=''] a name for this image. Default is an empty string
 * @param {string} [colorMap='gray'] a color map to use. default is gray
 * @param {number} [opacity=1.0] the opacity for this image. default is 1
 * @param {boolean} [trustCalMinMax=true] whether or not to trust cal_min and cal_max from the nifti header (trusting results in faster loading)
 * @param {number} [percentileFrac=0.02] the percentile to use for setting the robust range of the display values (smart intensity setting for images with large ranges)
 * @param {boolean} [ignoreZeroVoxels=false] whether or not to ignore zero voxels in setting the robust range of display values
 * @param {boolean} [visible=true] whether or not this image is to be visible
 * @returns {NVImage} returns a NVImage intance
 * @example
 * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
 */
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

/**
 * make a clone of a NVImage instance and return a new NVImage
 * @returns {NVImage} returns a NVImage intance
 * @example
 * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
 * clonedImage = myImage.clone()
 */
NVImage.prototype.clone = function () {
  let clonedImage = new NVImage();
  clonedImage.id = this.id;
  clonedImage.hdr = Object.assign({}, this.hdr);
  clonedImage.img = this.img.slice();
  clonedImage.calculateRAS();
  clonedImage.calMinMax();
  return clonedImage;
};

/**
 * fill a NVImage instance with zeros for the image data
 * @example
 * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
 * clonedImageWithZeros = myImage.clone().zeroImage()
 */
NVImage.prototype.zeroImage = function () {
  this.img.fill(0);
};

/**
 * Image M.
 * @typedef {Object} NVImage~MetaData
 * @property {uuidv4} id - unique if of image
 * @property {number} datatypeCode - data type
 * @property {number} nx - number of columns
 * @property {number} ny - number of rows
 * @property {number} nz - number of slices
 * @property {number} nt - number of volumes
 * @property {number} dx - space between columns
 * @property {number} dy - space between rows
 * @property {number} dz - space between slices
 * @property {number} dt - time between volumes
 * @property {number} bpx - bits per voxel
 */

/**
 * get nifti specific metadata about the image
 * @returns {NVImage~Metadata} - {@link NVImage~Metadata}
 */
NVImage.prototype.getImageMetadata = function () {
  const id = this.id;
  const datatypeCode = this.hdr.datatypeCode;
  const dims = this.hdr.dims;
  const nx = dims[1];
  const ny = dims[2];
  const nz = dims[3];
  const nt = Math.max(1, dims[4]);
  const pixDims = this.hdr.pixDims;
  const dx = pixDims[1];
  const dy = pixDims[2];
  const dz = pixDims[3];
  const dt = pixDims[4];
  const bpv = Math.floor(this.hdr.numBitsPerVoxel / 8);

  return {
    id,
    datatypeCode,
    nx,
    ny,
    nz,
    nt,
    dx,
    dy,
    dz,
    dt,
    bpv,
  };
};
/**
 * a factory function to make a zero filled image given a NVImage as a reference
 * @param {NVImage} nvImage an existing NVImage as a reference
 * @returns {NVImage} returns a new NVImage filled with zeros for the image data
 * @example
 * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
 * newZeroImage = NVImage.zerosLike(myImage)
 */
NVImage.zerosLike = function (nvImage) {
  let zeroClone = nvImage.clone();
  zeroClone.zeroImage();
  return zeroClone;
};

String.prototype.getBytes = function () {
  let bytes = [];
  for (var i = 0; i < this.length; i++) {
    bytes.push(this.charCodeAt(i));
  }

  return bytes;
};

NVImage.prototype.getValue = function (x, y, z) {
  const { nx, ny } = this.getImageMetadata();
  if (this.hdr.datatypeCode === this.DT_RGBA32) {
    let vx = 4 * (x + y * nx + z * nx * ny);
    //convert rgb to luminance
    return Math.round(
      this.img[vx] * 0.21 + this.img[vx + 1] * 0.72 + this.img[vx + 2] * 0.07
    );
  }
  if (this.hdr.datatypeCode === this.DT_RGB) {
    let vx = 3 * (x + y * nx + z * nx * ny);
    //convert rgb to luminance
    return Math.round(
      this.img[vx] * 0.21 + this.img[vx + 1] * 0.72 + this.img[vx + 2] * 0.07
    );
  }
  return this.img[x + y * nx + z * nx * ny];
};

/**
 * @typedef {Object} NVImage~Extents
 * @property {number[]} min - min bounding point
 * @property {number[]} max - max bounding point
 * @property {number} furthestVertexFromOrigin - point furthest from origin
 */

/**
 *
 * @param {number[]} positions
 * @returns {NVImage~Extents}
 */
function getExtents(positions) {
  const min = positions.slice(0, 3);
  const max = positions.slice(0, 3);
  let mxDx = 0.0;
  for (let i = 3; i < positions.length; i += 3) {
    for (let j = 0; j < 3; ++j) {
      const v = positions[i + j];
      min[j] = Math.min(v, min[j]);
      max[j] = Math.max(v, max[j]);
    }
    let dx =
      positions[i] * positions[i] +
      positions[i + 1] * positions[i + 1] +
      positions[i + 2] * positions[i + 2];
    mxDx = Math.max(mxDx, dx);
  }
  let furthestVertexFromOrigin = Math.sqrt(mxDx);
  return { min, max, furthestVertexFromOrigin };
}

// returns the left, right, up, down, front and back via pixdims, qform or sform
// +x = Right  +y = Anterior  +z = Superior.
// https://nifti.nimh.nih.gov/nifti-1/documentation/nifti1fields/nifti1fields_pages/qsform.html

/**
 * calculate cuboid extents via pixdims * dims
 * @returns {number[]}
 */

/**
 * @param {number} id - id of 3D Object (is this the base volume or an overlay?)
 * @param {WebGLRenderingContext} gl - WebGL rendering context
 * @returns {NiivueObject3D} returns a new 3D object in model space
 */
NVImage.prototype.toNiivueObject3D = function (id, gl) {
  let v000 = this.vox2mm([0.0, 0.0, 0.0], this.matRAS);
  let v111 = this.vox2mm(
    [this.dimsRAS[1] - 1, this.dimsRAS[2] - 1, this.dimsRAS[3] - 1],
    this.matRAS
  );
  let left = v000[0];
  let right = v111[0];
  let posterior = v000[1];
  let anterior = v111[1];
  let inferior = v000[2];
  let superior = v111[2];

  const positions = [
    // Superior face
    left,
    posterior,
    superior,
    right,
    posterior,
    superior,
    right,
    anterior,
    superior,
    left,
    anterior,
    superior,

    // Inferior face
    left,
    posterior,
    inferior,
    left,
    anterior,
    inferior,
    right,
    anterior,
    inferior,
    right,
    posterior,
    inferior,

    // Anterior face
    left,
    anterior,
    inferior,
    left,
    anterior,
    superior,
    right,
    anterior,
    superior,
    right,
    anterior,
    inferior,

    // Posterior face
    left,
    posterior,
    inferior,
    right,
    posterior,
    inferior,
    right,
    posterior,
    superior,
    left,
    posterior,
    superior,

    // Right face
    right,
    posterior,
    inferior,
    right,
    anterior,
    inferior,
    right,
    anterior,
    superior,
    right,
    posterior,
    superior,

    // Left face
    left,
    posterior,
    inferior,
    left,
    posterior,
    superior,
    left,
    anterior,
    superior,
    left,
    anterior,
    inferior,
  ];

  const textureCoordinates = [
    // Superior Z=1.0
    0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0,

    // Inferior Z=1.0
    0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,

    // Anterior Y=1
    0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0,

    // Posterior Y=0
    0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0,

    // Right X=1
    1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0,

    // Left X=0
    0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0,
  ];

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  const indices = [
    0,
    3,
    2,
    2,
    1,
    0, // Top
    4,
    7,
    6,
    6,
    5,
    4, // Bottom
    8,
    11,
    10,
    10,
    9,
    8, // Front
    12,
    15,
    14,
    14,
    13,
    12, // Back
    16,
    19,
    18,
    18,
    17,
    16, // right
    20,
    23,
    22,
    22,
    21,
    20, // left
  ];
  // Now send the element array to GL

  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(textureCoordinates),
    gl.STATIC_DRAW
  );

  const obj3D = new NiivueObject3D(
    id,
    vertexBuffer,
    gl.TRIANGLES,
    indices.length,
    indexBuffer,
    textureCoordBuffer
  );

  const extents = getExtents(positions);
  obj3D.extentsMin = extents.min;
  obj3D.extentsMax = extents.max;
  obj3D.furthestVertexFromOrigin = extents.furthestVertexFromOrigin;
  return obj3D;
};