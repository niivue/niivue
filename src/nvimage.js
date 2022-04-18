import nifti from "nifti-reader-js";
import daikon from "daikon";
import { v4 as uuidv4 } from "uuid";
import { mat3, mat4, vec3, vec4 } from "gl-matrix";
import * as cmaps from "./cmaps";
import * as fflate from "fflate";
import { NiivueObject3D } from "./niivue-object3D";
import { Log } from "./logger";
const log = new Log();

function isPlatformLittleEndian() {
  //inspired by https://github.com/rii-mango/Papaya
  var buffer = new ArrayBuffer(2);
  new DataView(buffer).setInt16(0, 256, true);
  return new Int16Array(buffer)[0] === 256;
}

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
 * @type NVImage
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
export function NVImage(
  dataBuffer,
  name = "",
  colorMap = "gray",
  opacity = 1.0,
  pairedImgData = null,
  trustCalMinMax = true,
  percentileFrac = 0.02,
  ignoreZeroVoxels = false,
  visible = true,
  useQFormNotSForm = false
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
  this.frame4D = 0; //indexed from 0!
  this.opacity = opacity > 1.0 ? 1.0 : opacity; //make sure opacity can't be initialized greater than 1 see: #107 and #117 on github
  this.percentileFrac = percentileFrac;
  this.ignoreZeroVoxels = ignoreZeroVoxels;
  this.trustCalMinMax = trustCalMinMax;
  this.visible = visible;
  this.series = []; // for concatenating dicom images

  // Added to support zerosLike
  if (!dataBuffer) {
    return;
  }
  var re = /(?:\.([^.]+))?$/;
  let ext = re.exec(name)[1] || "";
  ext = ext.toUpperCase();
  if (ext === "GZ") {
    ext = re.exec(name.slice(0, -3))[1]; //img.trk.gz -> img.trk
    ext = ext.toUpperCase();
  }
  let imgRaw = null;
  this.hdr = null;
  if (ext === "DCM") {
    imgRaw = this.readDICOM(dataBuffer);
  } else if (ext === "MIH" || ext === "MIF") {
    imgRaw = this.readMIF(dataBuffer, pairedImgData); //detached
  } else if (ext === "NHDR" || ext === "NRRD") {
    imgRaw = this.readNRRD(dataBuffer, pairedImgData); //detached
  } else if (ext === "MHD" || ext === "MHA") {
    imgRaw = this.readMHA(dataBuffer); //to do: pairedImgData
  } else if (ext === "MGH" || ext === "MGZ") {
    imgRaw = this.readMGH(dataBuffer);
  } else if (ext === "V") {
    imgRaw = this.readECAT(dataBuffer);
  } else if (ext === "V16") {
    imgRaw = this.readV16(dataBuffer);
  } else if (ext === "VMR") {
    imgRaw = this.readVMR(dataBuffer);
  } else if (ext === "HEAD") {
    imgRaw = this.readHEAD(dataBuffer, pairedImgData); //paired = .BRIK
  } else {
    this.hdr = nifti.readHeader(dataBuffer);
    if (this.hdr.cal_min === 0 && this.hdr.cal_max === 255)
      this.hdr.cal_max = 0.0;
    if (nifti.isCompressed(dataBuffer)) {
      imgRaw = nifti.readImage(this.hdr, nifti.decompress(dataBuffer));
    } else {
      imgRaw = nifti.readImage(this.hdr, dataBuffer);
    }
  }
  this.nFrame4D = 1;
  for (let i = 4; i < 7; i++)
    if (this.hdr.dims[i] > 1) this.nFrame4D *= this.hdr.dims[i];
  this.nVox3D = this.hdr.dims[1] * this.hdr.dims[2] * this.hdr.dims[3];
  let nVol4D = imgRaw.byteLength / this.nVox3D / (this.hdr.numBitsPerVoxel / 8);
  if (nVol4D !== this.nFrame4D)
    console.log(
      "This header does not match voxel data",
      this.hdr,
      imgRaw.byteLength
    );
  if (
    this.hdr.intent_code === 1007 &&
    this.nFrame4D === 3 &&
    this.hdr.datatypeCode === this.DT_FLOAT
  ) {
    let tmp = new Float32Array(imgRaw);
    let f32 = tmp.slice();
    this.hdr.datatypeCode = this.DT_RGB;
    this.nFrame4D = 1;
    for (let i = 4; i < 7; i++) this.hdr.dims[i] = 1;
    this.hdr.dims[0] = 3; //3D
    imgRaw = new Uint8Array(this.nVox3D * 3); //*3 for RGB
    let mx = Math.abs(f32[0]);
    for (let i = 0; i < this.nVox3D * 3; i++)
      mx = Math.max(mx, Math.abs(f32[i]));
    let slope = 1.0;
    if (mx > 0) slope = 1.0 / mx;

    let nVox3D2 = this.nVox3D * 2;
    let j = 0;
    for (let i = 0; i < this.nVox3D; i++) {
      imgRaw[j] = 255.0 * Math.abs(f32[i] * slope);
      imgRaw[j + 1] = 255.0 * Math.abs(f32[i + this.nVox3D] * slope);
      imgRaw[j + 2] = 255.0 * Math.abs(f32[i + nVox3D2] * slope);
      j += 3;
    }
  } //NIFTI_INTENT_VECTOR: this is a RGB tensor
  if (
    this.hdr.pixDims[1] === 0.0 ||
    this.hdr.pixDims[2] === 0.0 ||
    this.hdr.pixDims[3] === 0.0
  )
    console.log("pixDims not plausible", this.hdr);
  function isAffineOK(mtx) {
    //A good matrix should not have any components that are not a number
    //A good spatial transformation matrix should not have a row or column that is all zeros
    let iOK = [false, false, false, false];
    let jOK = [false, false, false, false];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (isNaN(mtx[i][j])) return false;
      }
    }
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (mtx[i][j] === 0.0) continue;
        iOK[i] = true;
        jOK[j] = true;
      }
    }
    for (let i = 0; i < 3; i++) {
      if (!iOK[i]) return false;
      if (!jOK[i]) return false;
    }
    return true;
  } //
  if (isNaN(this.hdr.scl_slope) || this.hdr.scl_slope === 0.0)
    this.hdr.scl_slope = 1.0; //https://github.com/nipreps/fmriprep/issues/2507
  if (isNaN(this.hdr.scl_inter)) this.hdr.scl_inter = 0.0;
  let affineOK = isAffineOK(this.hdr.affine);
  if (
    useQFormNotSForm ||
    !affineOK ||
    this.hdr.qform_code > this.hdr.sform_code
  ) {
    log.debug("spatial transform based on QForm");
    //https://github.com/rii-mango/NIFTI-Reader-JS/blob/6908287bf99eb3bc4795c1591d3e80129da1e2f6/src/nifti1.js#L238
    // Define a, b, c, d for coding covenience
    const b = this.hdr.quatern_b;
    const c = this.hdr.quatern_c;
    const d = this.hdr.quatern_d;
    // quatern_a is a parameter in quaternion [a, b, c, d], which is required in affine calculation (METHOD 2)
    // mentioned in the nifti1.h file
    // It can be calculated by a = sqrt(1.0-(b*b+c*c+d*d))
    const a = Math.sqrt(
      1.0 - (Math.pow(b, 2) + Math.pow(c, 2) + Math.pow(d, 2))
    );
    const qfac = this.hdr.pixDims[0] === 0 ? 1 : this.hdr.pixDims[0];
    const quatern_R = [
      [
        a * a + b * b - c * c - d * d,
        2 * b * c - 2 * a * d,
        2 * b * d + 2 * a * c,
      ],
      [
        2 * b * c + 2 * a * d,
        a * a + c * c - b * b - d * d,
        2 * c * d - 2 * a * b,
      ],
      [
        2 * b * d - 2 * a * c,
        2 * c * d + 2 * a * b,
        a * a + d * d - c * c - b * b,
      ],
    ];
    const affine = this.hdr.affine;
    for (let ctrOut = 0; ctrOut < 3; ctrOut += 1) {
      for (let ctrIn = 0; ctrIn < 3; ctrIn += 1) {
        affine[ctrOut][ctrIn] =
          quatern_R[ctrOut][ctrIn] * this.hdr.pixDims[ctrIn + 1];
        if (ctrIn === 2) {
          affine[ctrOut][ctrIn] *= qfac;
        }
      }
    }
    // The last row of affine matrix is the offset vector
    affine[0][3] = this.hdr.qoffset_x;
    affine[1][3] = this.hdr.qoffset_y;
    affine[2][3] = this.hdr.qoffset_z;
    this.hdr.affine = affine;
  }
  affineOK = isAffineOK(this.hdr.affine);
  if (!affineOK) {
    log.debug("Defective NIfTI: spatial transform does not make sense");
    let x = this.hdr.pixDims[1];
    let y = this.hdr.pixDims[2];
    let z = this.hdr.pixDims[3];
    if (isNaN(x) || x === 0.0) x = 1.0;
    if (isNaN(y) || y === 0.0) y = 1.0;
    if (isNaN(z) || z === 0.0) z = 1.0;
    this.hdr.pixDims[1] = x;
    this.hdr.pixDims[2] = y;
    this.hdr.pixDims[3] = z;
    const affine = [
      [x, 0, 0, 0],
      [0, y, 0, 0],
      [0, 0, z, 0],
      [0, 0, 0, 1],
    ];
    this.hdr.affine = affine;
  } //defective affine
  //swap data if foreign endian:
  if (
    this.hdr.datatypeCode !== this.DT_RGB &&
    this.hdr.datatypeCode !== this.DT_RGBA32 &&
    this.hdr.littleEndian !== isPlatformLittleEndian() &&
    this.hdr.numBitsPerVoxel > 8
  ) {
    if (this.hdr.numBitsPerVoxel === 16) {
      //inspired by https://github.com/rii-mango/Papaya
      var u16 = new Uint16Array(imgRaw);
      for (let i = 0; i < u16.length; i++) {
        let val = u16[i];
        u16[i] = ((((val & 0xff) << 8) | ((val >> 8) & 0xff)) << 16) >> 16; // since JS uses 32-bit  when bit shifting
      }
    } else if (this.hdr.numBitsPerVoxel === 32) {
      //inspired by https://github.com/rii-mango/Papaya
      var u32 = new Uint32Array(imgRaw);
      for (let i = 0; i < u32.length; i++) {
        let val = u32[i];
        u32[i] =
          ((val & 0xff) << 24) |
          ((val & 0xff00) << 8) |
          ((val >> 8) & 0xff00) |
          ((val >> 24) & 0xff);
      }
    } else if (this.hdr.numBitsPerVoxel === 64) {
      //inspired by MIT licensed code: https://github.com/rochars/endianness
      let numBytesPerVoxel = this.hdr.numBitsPerVoxel / 8;
      var u8 = new Uint8Array(imgRaw);
      for (let index = 0; index < u8.length; index += numBytesPerVoxel) {
        let offset = bytesPer - 1;
        for (let x = 0; x < offset; x++) {
          let theByte = u8[index + x];
          u8[index + x] = u8[index + offset];
          u8[index + offset] = theByte;
          offset--;
        }
      }
    } //if 64-bits
  } //swap byte order
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
    case this.DT_INT8: {
      let i8 = new Int8Array(imgRaw);
      var vx8 = i8.length;
      this.img = new Int16Array(vx8);
      for (let i = 0; i < vx8 - 1; i++) this.img[i] = i8[i];
      this.hdr.datatypeCode = this.DT_SIGNED_SHORT;
      break;
    }
    case this.DT_UINT32: {
      let u32 = new Uint32Array(imgRaw);
      var vx32 = u32.length;
      this.img = new Float64Array(vx32);
      for (let i = 0; i < vx32 - 1; i++) this.img[i] = u32[i];
      this.hdr.datatypeCode = this.DT_DOUBLE;
      break;
    }
    case this.DT_SIGNED_INT: {
      let i32 = new Int32Array(imgRaw);
      var vxi32 = i32.length;
      this.img = new Float64Array(vxi32);
      for (let i = 0; i < vxi32 - 1; i++) this.img[i] = i32[i];
      this.hdr.datatypeCode = this.DT_DOUBLE;
      break;
    }
    case this.DT_INT64: {
      // eslint-disable-next-line no-undef
      let i64 = new BigInt64Array(imgRaw);
      let vx = i64.length;
      this.img = new Float64Array(vx);
      for (let i = 0; i < vx - 1; i++) this.img[i] = Number(i64[i]);
      this.hdr.datatypeCode = this.DT_DOUBLE;
      break;
    }
    default:
      throw "datatype " + this.hdr.datatypeCode + " not supported";
  }
  this.calculateRAS();
  this.calMinMax();
}

NVImage.prototype.calculateOblique = function () {
  let LPI = this.vox2mm([0.0, 0.0, 0.0], this.matRAS);
  let X1mm = this.vox2mm([1.0 / this.pixDimsRAS[1], 0.0, 0.0], this.matRAS);
  let Y1mm = this.vox2mm([0.0, 1.0 / this.pixDimsRAS[2], 0.0], this.matRAS);
  let Z1mm = this.vox2mm([0.0, 0.0, 1.0 / this.pixDimsRAS[3]], this.matRAS);
  vec3.subtract(X1mm, X1mm, LPI);
  vec3.subtract(Y1mm, Y1mm, LPI);
  vec3.subtract(Z1mm, Z1mm, LPI);
  let oblique = mat4.fromValues(
    X1mm[0],
    X1mm[1],
    X1mm[2],
    0,
    Y1mm[0],
    Y1mm[1],
    Y1mm[2],
    0,
    Z1mm[0],
    Z1mm[1],
    Z1mm[2],
    0,
    0,
    0,
    0,
    1
  );
  this.obliqueRAS = mat4.clone(oblique);
  let XY = Math.abs(90 - vec3.angle(X1mm, Y1mm) * (180 / Math.PI));
  let XZ = Math.abs(90 - vec3.angle(X1mm, Z1mm) * (180 / Math.PI));
  let YZ = Math.abs(90 - vec3.angle(Y1mm, Z1mm) * (180 / Math.PI));
  let maxShear = Math.max(Math.max(XY, XZ), YZ);
  if (maxShear > 0.1)
    log.debug("Warning: shear detected (gantry tilt) of %f degrees", maxShear);
};

NVImage.prototype.THD_daxes_to_NIFTI = function (
  xyzDelta,
  xyzOrigin,
  orientSpecific
) {
  //https://github.com/afni/afni/blob/d6997e71f2b625ac1199460576d48f3136dac62c/src/thd_niftiwrite.c#L315
  let hdr = this.hdr;
  hdr.sform_code = 2;
  const ORIENT_xyz = "xxyyzzg"; //note strings indexed from 0!
  let nif_x_axnum = -1;
  let nif_y_axnum = -1;
  let nif_z_axnum = -1;
  let axcode = ["x", "y", "z"];
  axcode[0] = ORIENT_xyz[orientSpecific[0]];
  axcode[1] = ORIENT_xyz[orientSpecific[1]];
  axcode[2] = ORIENT_xyz[orientSpecific[2]];
  let axstep = xyzDelta.slice(0, 3);
  let axstart = xyzOrigin.slice(0, 3);
  for (var ii = 0; ii < 3; ii++) {
    if (axcode[ii] === "x") nif_x_axnum = ii;
    else if (axcode[ii] === "y") nif_y_axnum = ii;
    else nif_z_axnum = ii;
  }
  if (nif_x_axnum < 0 || nif_y_axnum < 0 || nif_z_axnum < 0) return; //not assigned
  if (
    nif_x_axnum === nif_y_axnum ||
    nif_x_axnum === nif_z_axnum ||
    nif_y_axnum === nif_z_axnum
  )
    return; //not assigned
  hdr.pixDims[1] = Math.abs(axstep[0]);
  hdr.pixDims[2] = Math.abs(axstep[1]);
  hdr.pixDims[3] = Math.abs(axstep[2]);
  hdr.affine = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  hdr.affine[0][nif_x_axnum] = -axstep[nif_x_axnum];
  hdr.affine[1][nif_y_axnum] = -axstep[nif_y_axnum];
  hdr.affine[2][nif_z_axnum] = axstep[nif_z_axnum];
  hdr.affine[0][3] = -axstart[nif_x_axnum];
  hdr.affine[1][3] = -axstart[nif_y_axnum];
  hdr.affine[2][3] = axstart[nif_z_axnum];
};

NVImage.prototype.SetPixDimFromSForm = function () {
  let m = this.hdr.affine;
  let mat = mat4.fromValues(
    m[0][0],
    m[0][1],
    m[0][2],
    m[0][3],
    m[1][0],
    m[1][1],
    m[1][2],
    m[1][3],
    m[2][0],
    m[2][1],
    m[2][2],
    m[2][3],
    m[3][0],
    m[3][1],
    m[3][2],
    m[3][3]
  );
  let mm000 = this.vox2mm([0, 0, 0], mat);
  let mm100 = this.vox2mm([1, 0, 0], mat);
  vec3.subtract(mm100, mm100, mm000);
  let mm010 = this.vox2mm([0, 1, 0], mat);
  vec3.subtract(mm010, mm010, mm000);
  let mm001 = this.vox2mm([0, 0, 1], mat);
  vec3.subtract(mm001, mm001, mm000);
  this.hdr.pixDims[1] = vec3.length(mm100);
  this.hdr.pixDims[2] = vec3.length(mm010);
  this.hdr.pixDims[3] = vec3.length(mm001);
};

function getBestTransform(imageDirections, voxelDimensions, imagePosition) {
  //https://github.com/rii-mango/Papaya/blob/782a19341af77a510d674c777b6da46afb8c65f1/src/js/volume/dicom/header-dicom.js#L605
  /*Copyright (c) 2012-2015, RII-UTHSCSA
All rights reserved.

THIS PRODUCT IS NOT FOR CLINICAL USE.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
following conditions are met:

 - Redistributions of source code must retain the above copyright notice, this list of conditions and the following
   disclaimer.

 - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following
   disclaimer in the documentation and/or other materials provided with the distribution.

 - Neither the name of the RII-UTHSCSA nor the names of its contributors may be used to endorse or promote products
   derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
  var cosines = imageDirections,
    m = null;
  if (cosines) {
    var vs = {
      colSize: voxelDimensions[0],
      rowSize: voxelDimensions[1],
      sliceSize: voxelDimensions[2],
    };
    var coord = imagePosition;
    var cosx = [cosines[0], cosines[1], cosines[2]];
    var cosy = [cosines[3], cosines[4], cosines[5]];
    var cosz = [
      cosx[1] * cosy[2] - cosx[2] * cosy[1],
      cosx[2] * cosy[0] - cosx[0] * cosy[2],
      cosx[0] * cosy[1] - cosx[1] * cosy[0],
    ];
    m = [
      [
        cosx[0] * vs.colSize * -1,
        cosy[0] * vs.rowSize,
        cosz[0] * vs.sliceSize,
        -1 * coord[0],
      ],
      [
        cosx[1] * vs.colSize,
        cosy[1] * vs.rowSize * -1,
        cosz[1] * vs.sliceSize,
        -1 * coord[1],
      ],
      [
        cosx[2] * vs.colSize,
        cosy[2] * vs.rowSize,
        cosz[2] * vs.sliceSize,
        coord[2],
      ],
      [0, 0, 0, 1],
    ];
  }
  return m;
}

NVImage.prototype.readDICOM = function (
  buf,
  existingSeries = new daikon.Series()
) {
  this.series = existingSeries;
  // parse DICOM file
  var image = daikon.Series.parseImage(new DataView(buf));
  if (image === null) {
    console.error(daikon.Series.parserError);
  } else if (image.hasPixelData()) {
    // if it's part of the same series, add it
    if (
      this.series.images.length === 0 ||
      image.getSeriesId() === this.series.images[0].getSeriesId()
    ) {
      this.series.addImage(image);
    }
  }
  // order the image files, determines number of frames, etc.
  this.series.buildSeries();
  // output some header info
  console.log("Number of images read is " + this.series.images.length);
  // concat the image data into a single ArrayBuffer
  this.hdr = new nifti.NIFTI1();
  let hdr = this.hdr;
  hdr.scl_inter = this.series.images[0].getDataScaleIntercept();
  hdr.scl_slope = this.series.images[0].getDataScaleSlope();
  hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0];
  hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0];
  hdr.dims[1] = this.series.images[0].getCols();
  hdr.dims[2] = this.series.images[0].getRows();
  hdr.dims[3] = this.series.images[0].getNumberOfFrames();
  let rc = this.series.images[0].getPixelSpacing(); //TODO: order?
  hdr.pixDims[1] = rc[0];
  hdr.pixDims[2] = rc[1];
  hdr.pixDims[3] = Math.max(
    this.series.images[0].getSliceGap(),
    this.series.images[0].getSliceThickness()
  );
  hdr.pixDims[4] = this.series.images[0].getTR() / 1000.0; //msec -> sec
  let dt = this.series.images[0].getDataType(); //2=int,3=uint,4=float,
  let bpv = this.series.images[0].getBitsAllocated();
  hdr.numBitsPerVoxel = bpv;
  if (bpv === 8 && dt === 2) hdr.datatypeCode = this.DT_INT8;
  else if (bpv === 8 && dt === 3) hdr.datatypeCode = this.DT_UNSIGNED_CHAR;
  else if (bpv === 16 && dt === 2) hdr.datatypeCode = this.DT_SIGNED_SHORT;
  else if (bpv === 16 && dt === 3) hdr.datatypeCode = this.DT_UINT16;
  else if (bpv === 32 && dt === 2) hdr.datatypeCode = this.DT_SIGNED_INT;
  else if (bpv === 32 && dt === 3) hdr.datatypeCode = this.DT_UINT32;
  else if (bpv === 32 && dt === 4) hdr.datatypeCode = this.DT_FLOAT;
  else if (bpv === 64 && dt === 4) hdr.datatypeCode = this.DT_DOUBLE;
  else console.log("Unsupported DICOM format: " + dt + " " + bpv);
  let voxelDimensions = hdr.pixDims.slice(1, 4);
  let m = getBestTransform(
    this.series.images[0].getImageDirections(),
    voxelDimensions,
    this.series.images[0].getImagePosition()
  );
  if (m) {
    hdr.sform_code = 1;
    hdr.affine = [
      [m[0][0], m[0][1], m[0][2], m[0][3]],
      [m[1][0], m[1][1], m[1][2], m[1][3]],
      [m[2][0], m[2][1], m[2][2], m[2][3]],
      [0, 0, 0, 1],
    ];
  }
  console.log("DICOM", this.series.images[0]);
  console.log("NIfTI", hdr);
  let imgRaw = [];
  let byteLength = hdr.dims[1] * hdr.dims[2] * hdr.dims[3] * (bpv / 8);
  if (true) {
    imgRaw = new Uint8Array(byteLength);
    for (var i = 1; i < byteLength; i++) imgRaw[i] = i % 255;
  } else {
    //TODO
    series.concatenateImageData(null, function (imageData) {
      console.log(
        "Total image data size is " + imageData.byteLength + " bytes"
      );
      imgRaw = imageData.slice();
    });
  }
  return imgRaw;
}; // readDICOM()

NVImage.prototype.readECAT = function (buffer) {
  //https://github.com/openneuropet/PET2BIDS/tree/28aae3fab22309047d36d867c624cd629c921ca6/ecat_validation/ecat_info
  this.hdr = new nifti.NIFTI1();
  let hdr = this.hdr;
  hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0];
  hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0];
  var reader = new DataView(buffer);
  var raw = buffer;
  let signature = reader.getInt32(0, false); //"MATR"
  let filetype = reader.getInt16(50, false);
  if (signature !== 1296127058 || filetype < 1 || filetype > 14) {
    console.log("Not a valid ECAT file");
    return;
  }
  //list header, starts at 512 bytes: int32_t hdr[4], r[31][4];
  let pos = 512; //512=main header, 4*32-bit hdr
  let vols = 0;
  let frame_duration = [];
  let rawImg = [];
  while (true) {
    //read 512 block lists
    let hdr0 = reader.getInt32(pos, false);
    let hdr3 = reader.getInt32(pos + 12, false);
    if (hdr0 + hdr3 !== 31) break;
    let lpos = pos + 20; //skip hdr and read slice offset (r[0][1])
    let r = 0;
    let voloffset = 0;
    while (r < 31) {
      //r[0][1]...r[30][1]
      voloffset = reader.getInt32(lpos, false);
      lpos += 16; //e.g. r[0][1] to r[1][1]
      if (voloffset === 0) break;
      r++;
      let ipos = voloffset * 512; //image start position
      let spos = ipos - 512; //subheader for matrix image, immediately before image
      let data_type = reader.getUint16(spos, false);
      hdr.dims[1] = reader.getUint16(spos + 4, false);
      hdr.dims[2] = reader.getUint16(spos + 6, false);
      hdr.dims[3] = reader.getUint16(spos + 8, false);
      let scale_factor = reader.getFloat32(spos + 26, false);
      hdr.pixDims[1] = reader.getFloat32(spos + 34, false) * 10.0; //cm -> mm
      hdr.pixDims[2] = reader.getFloat32(spos + 38, false) * 10.0; //cm -> mm
      hdr.pixDims[3] = reader.getFloat32(spos + 42, false) * 10.0; //cm -> mm
      hdr.pixDims[4] = reader.getUint32(spos + 46, false) / 1000.0; //ms -> sec
      frame_duration.push(hdr.pixDims[4]);
      let nvox3D = hdr.dims[1] * hdr.dims[2] * hdr.dims[3];
      var newImg = new Float32Array(nvox3D); //convert to float32 as scale varies
      if (data_type == 1)
        //uint8
        for (var i = 0; i < nvox3D; i++) {
          newImg[i] = reader.getUint8(ipos) * scale_factor;
          ipos++;
        }
      else if (data_type == 6) {
        //uint16
        for (var i = 0; i < nvox3D; i++) {
          newImg[i] = reader.getUint16(ipos, false) * scale_factor;
          ipos += 2;
        }
      } else if (ihdr.data_type == 7) {
        //uint32
        for (var i = 0; i < nvox3D; i++) {
          newImg[i] = reader.getUint32(ipos, false) * scale_factor;
          ipos += 4;
        }
      } else console.log("Unknown ECAT data type " + data_type);
      let prevImg = rawImg.slice();
      rawImg = new Float32Array(prevImg.length + newImg.length);
      rawImg.set(prevImg);
      rawImg.set(newImg, prevImg.length);
      vols++;
    }
    if (voloffset === 0) break;
    pos += 512; //possible to have multiple 512-byte lists of images
  }
  hdr.dims[4] = vols;
  hdr.pixDims[4] = frame_duration[0];
  if (vols > 1) {
    hdr.dims[0] = 4;
    let isFDvaries = false;
    for (var i = 0; i < vols; i++)
      if (frame_duration[i] !== frame_duration[0]) isFDvaries = true;
    if (isFDvaries) console.log("Frame durations vary");
  }
  hdr.sform_code = 1;
  hdr.affine = [
    [-hdr.pixDims[1], 0, 0, (hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
    [0, -hdr.pixDims[2], 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
    [0, 0, -hdr.pixDims[3], (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
    [0, 0, 0, 1],
  ];
  hdr.numBitsPerVoxel = 32;
  hdr.datatypeCode = this.DT_FLOAT;
  return rawImg;
}; // readECAT()

NVImage.prototype.readV16 = function (buffer) {
  this.hdr = new nifti.NIFTI1();
  let hdr = this.hdr;
  hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0];
  hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0];
  var reader = new DataView(buffer);
  hdr.dims[1] = reader.getUint16(0, true);
  hdr.dims[2] = reader.getUint16(2, true);
  hdr.dims[3] = reader.getUint16(4, true);
  let nBytes = 2 * hdr.dims[1] * hdr.dims[2] * hdr.dims[3];
  if (nBytes + 6 !== buffer.byteLength)
    console.log("This does not look like a valid BrainVoyager V16 file");
  hdr.numBitsPerVoxel = 16;
  hdr.datatypeCode = this.DT_UINT16;
  console.log("Warning: V16 files have no spatial transforms");
  hdr.affine = [
    [0, 0, -hdr.pixDims[1], (hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
    [-hdr.pixDims[2], 0, 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
    [0, -hdr.pixDims[3], 0, (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
    [0, 0, 0, 1],
  ];
  hdr.littleEndian = true;
  return buffer.slice(6);
}; // readV16()

NVImage.prototype.readVMR = function (buffer) {
  //https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/343-developer-guide-2-6-the-format-of-vmr-files
  this.hdr = new nifti.NIFTI1();
  let hdr = this.hdr;
  hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0];
  hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0];
  var reader = new DataView(buffer);
  let version = reader.getUint16(0, true);
  if (version !== 4) console.log("Not a valid version 4 VMR image");
  hdr.dims[1] = reader.getUint16(2, true);
  hdr.dims[2] = reader.getUint16(4, true);
  hdr.dims[3] = reader.getUint16(6, true);
  let nBytes = hdr.dims[1] * hdr.dims[2] * hdr.dims[3];
  if (version >= 4) {
    let pos = 8 + nBytes; //offset to post header
    let xoff = reader.getUint16(pos, true);
    let yoff = reader.getUint16(pos + 2, true);
    let zoff = reader.getUint16(pos + 4, true);
    let framingCube = reader.getUint16(pos + 6, true);
    let posInfo = reader.getUint32(pos + 8, true);
    let coordSys = reader.getUint32(pos + 12, true);
    let XmmStart = reader.getFloat32(pos + 16, true);
    let YmmStart = reader.getFloat32(pos + 20, true);
    let ZmmStart = reader.getFloat32(pos + 24, true);
    let XmmEnd = reader.getFloat32(pos + 28, true);
    let YmmEnd = reader.getFloat32(pos + 32, true);
    let ZmmEnd = reader.getFloat32(pos + 36, true);
    let Xsl = reader.getFloat32(pos + 40, true);
    let Ysl = reader.getFloat32(pos + 44, true);
    let Zsl = reader.getFloat32(pos + 48, true);
    let colDirX = reader.getFloat32(pos + 52, true);
    let colDirY = reader.getFloat32(pos + 56, true);
    let colDirZ = reader.getFloat32(pos + 60, true);
    let nRow = reader.getUint32(pos + 64, true);
    let nCol = reader.getUint32(pos + 68, true);
    let FOVrow = reader.getFloat32(pos + 72, true);
    let FOVcol = reader.getFloat32(pos + 76, true);
    let sliceThickness = reader.getFloat32(pos + 80, true);
    let gapThickness = reader.getFloat32(pos + 84, true);
    let nSpatialTransforms = reader.getUint32(pos + 88, true);
    pos = pos + 92;
    if (nSpatialTransforms > 0) {
      let len = buffer.byteLength;
      for (let i = 0; i < nSpatialTransforms; i++) {
        //read variable length name name...
        while (pos < len && reader.getUint8(pos) !== 0) pos++;
        pos++;
        let typ = reader.getUint32(pos, true);
        pos += 4;
        //read variable length name name...
        while (pos < len && reader.getUint8(pos) !== 0) pos++;
        pos++;
        let nValues = reader.getUint32(pos, true);
        pos += 4;
        for (let j = 0; j < nValues; j++) pos += 4;
      }
    }
    let LRconv = reader.getUint8(pos);
    let ref = reader.getUint8(pos + 1);
    hdr.pixDims[1] = reader.getFloat32(pos + 2, true);
    hdr.pixDims[2] = reader.getFloat32(pos + 6, true);
    hdr.pixDims[3] = reader.getFloat32(pos + 10, true);
    let isVer = reader.getUint8(pos + 14);
    let isTal = reader.getUint8(pos + 15);
    let minInten = reader.getInt32(pos + 16, true);
    let meanInten = reader.getInt32(pos + 20, true);
    let maxInten = reader.getInt32(pos + 24, true);
  }
  console.log("Warning: VMR spatial transform not implemented");
  //if (XmmStart === XmmEnd) { // https://brainvoyager.com/bv/sampledata/index.html??
  hdr.affine = [
    [0, 0, -hdr.pixDims[1], (hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
    [-hdr.pixDims[2], 0, 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
    [0, -hdr.pixDims[3], 0, (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
    [0, 0, 0, 1],
  ];
  //}
  console.log(hdr);
  hdr.numBitsPerVoxel = 8;
  hdr.datatypeCode = this.DT_UNSIGNED_CHAR;
  return buffer.slice(8, 8 + nBytes);
}; // readVMR()

NVImage.prototype.readMGH = function (buffer) {
  this.hdr = new nifti.NIFTI1();
  let hdr = this.hdr;
  hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0];
  hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0];
  var reader = new DataView(buffer);
  var raw = buffer;
  if (reader.getUint8(0) === 31 && reader.getUint8(1) === 139) {
    var raw = fflate.decompressSync(new Uint8Array(buffer));
    reader = new DataView(raw.buffer);
  }
  let version = reader.getInt32(0, false);
  let width = reader.getInt32(4, false);
  let height = reader.getInt32(8, false);
  let depth = reader.getInt32(12, false);
  let nframes = reader.getInt32(16, false);
  let mtype = reader.getInt32(20, false);
  let dof = reader.getInt32(24, false);
  let goodRASFlag = reader.getInt16(28, false);
  let spacingX = reader.getFloat32(30, false);
  let spacingY = reader.getFloat32(34, false);
  let spacingZ = reader.getFloat32(38, false);
  let xr = reader.getFloat32(42, false);
  let xa = reader.getFloat32(46, false);
  let xs = reader.getFloat32(50, false);
  let yr = reader.getFloat32(54, false);
  let ya = reader.getFloat32(58, false);
  let ys = reader.getFloat32(62, false);
  let zr = reader.getFloat32(66, false);
  let za = reader.getFloat32(70, false);
  let zs = reader.getFloat32(74, false);
  let cr = reader.getFloat32(78, false);
  let ca = reader.getFloat32(82, false);
  let cs = reader.getFloat32(86, false);
  if (version !== 1 || mtype < 0 || mtype > 4)
    console.log("Not a valid MGH file");
  if (mtype === 0) {
    hdr.numBitsPerVoxel = 8;
    hdr.datatypeCode = this.DT_UNSIGNED_CHAR;
  } else if (mtype === 4) {
    hdr.numBitsPerVoxel = 16;
    hdr.datatypeCode = this.DT_SIGNED_SHORT;
  } else if (mtype === 1) {
    hdr.numBitsPerVoxel = 32;
    hdr.datatypeCode = this.DT_SIGNED_INT;
  } else if (mtype === 3) {
    hdr.numBitsPerVoxel = 32;
    hdr.datatypeCode = this.DT_FLOAT;
  }
  hdr.dims[1] = width;
  hdr.dims[2] = height;
  hdr.dims[3] = depth;
  hdr.dims[4] = nframes;
  if (nframes > 1) hdr.dims[0] = 4;
  hdr.pixDims[1] = spacingX;
  hdr.pixDims[2] = spacingY;
  hdr.pixDims[3] = spacingZ;
  hdr.vox_offset = 284;
  hdr.sform_code = 1;
  let rot44 = mat4.fromValues(
    xr * hdr.pixDims[1],
    yr * hdr.pixDims[2],
    zr * hdr.pixDims[3],
    0,
    xa * hdr.pixDims[1],
    ya * hdr.pixDims[2],
    za * hdr.pixDims[3],
    0,
    xs * hdr.pixDims[1],
    ys * hdr.pixDims[2],
    zs * hdr.pixDims[3],
    0,
    0,
    0,
    0,
    1
  );
  let base = 0.0; //0 or 1: are voxels indexed from 0 or 1?
  let Pcrs = [
    hdr.dims[1] / 2.0 + base,
    hdr.dims[2] / 2.0 + base,
    hdr.dims[3] / 2.0 + base,
    1,
  ];
  let PxyzOffset = [0, 0, 0, 0];
  for (var i = 0; i < 3; i++) {
    //multiply Pcrs * m
    for (var j = 0; j < 3; j++) {
      PxyzOffset[i] = PxyzOffset[i] + rot44[i + j * 4] * Pcrs[j];
    }
  }
  hdr.affine = [
    [rot44[0], rot44[1], rot44[2], PxyzOffset[0]],
    [rot44[4], rot44[5], rot44[6], PxyzOffset[1]],
    [rot44[8], rot44[9], rot44[10], PxyzOffset[2]],
    [0, 0, 0, 1],
  ];
  let nBytes =
    hdr.dims[1] *
    hdr.dims[2] *
    hdr.dims[3] *
    hdr.dims[4] *
    (hdr.numBitsPerVoxel / 8);
  return raw.slice(hdr.vox_offset, hdr.vox_offset + nBytes);
}; // readMGH()

NVImage.prototype.readHEAD = function (dataBuffer, pairedImgData) {
  this.hdr = new nifti.NIFTI1();
  let hdr = this.hdr;
  hdr.dims[0] = 3;
  hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0];
  let orientSpecific = [0, 0, 0];
  let xyzOrigin = [0, 0, 0];
  let xyzDelta = [1, 1, 1];
  let txt = new TextDecoder().decode(dataBuffer);
  var lines = txt.split("\n");
  let nlines = lines.length;
  let i = 0;
  let hasIJK_TO_DICOM_REAL = false;
  while (i < nlines) {
    let line = lines[i]; //e.g. 'type = string-attribute'
    i++;
    if (!line.startsWith("type")) continue; //n.b. white space varies, "type =" vs "type  ="
    let isInt = line.includes("integer-attribute");
    let isFloat = line.includes("float-attribute");
    line = lines[i]; //e.g. 'name = IDCODE_DATE'
    i++;
    if (!line.startsWith("name")) continue;
    let items = line.split("= ");
    let key = items[1]; //e.g. 'IDCODE_DATE'
    line = lines[i]; //e.g. 'count = 5'
    i++;
    items = line.split("= ");
    let count = parseInt(items[1]); //e.g. '5'
    if (count < 1) continue;
    line = lines[i]; //e.g. ''LSB_FIRST~'
    i++;
    items = line.trim().split(/\s+/);
    if (isFloat || isInt) {
      //read arrays written on multiple lines
      while (items.length < count) {
        line = lines[i]; //e.g. ''LSB_FIRST~'
        i++;
        let items2 = line.trim().split(/\s+/);
        items.push(...items2);
      }
      for (var j = 0; j < count; j++) items[j] = parseFloat(items[j]);
    }
    switch (key) {
      case "BYTEORDER_STRING":
        if (items[0].includes("LSB_FIRST")) hdr.littleEndian = true;
        else if (items[0].includes("MSB_FIRST")) hdr.littleEndian = false;
        break;
      case "BRICK_TYPES":
        hdr.dims[4] = count;
        let datatype = parseInt(items[0]);
        if (datatype === 0) {
          hdr.numBitsPerVoxel = 8;
          hdr.datatypeCode = this.DT_UNSIGNED_CHAR;
        } else if (datatype === 1) {
          hdr.numBitsPerVoxel = 16;
          hdr.datatypeCode = this.DT_SIGNED_SHORT;
        } else if (datatype === 1) {
          hdr.numBitsPerVoxel = 32;
          hdr.datatypeCode = this.DT_FLOAT;
        } else console.log("Unknown BRICK_TYPES ", datatype);
        break;
      case "IJK_TO_DICOM_REAL":
        if (count < 12) break;
        hasIJK_TO_DICOM_REAL = true;
        hdr.sform_code = 2;
        //note DICOM space is LPS while NIfTI is RAS
        hdr.affine = [
          [-items[0], -items[1], -items[2], -items[3]],
          [-items[4], -items[5], -items[6], -items[7]],
          [items[8], items[9], items[10], items[11]],
          [0, 0, 0, 1],
        ];
        break;
      case "DATASET_DIMENSIONS":
        count = Math.max(count, 3);
        for (var j = 0; j < count; j++) hdr.dims[j + 1] = items[j];
        break;
      case "ORIENT_SPECIFIC":
        orientSpecific = items;
        break;
      case "ORIGIN":
        xyzOrigin = items;
        break;
      case "DELTA":
        xyzDelta = items;
        break;
      case "TAXIS_FLOATS":
        hdr.pixDims[4] = items[0];
        break;
      default:
      //console.log('Unknown:',key);
    } //read item
  } //read all lines
  if (!hasIJK_TO_DICOM_REAL)
    this.THD_daxes_to_NIFTI(xyzDelta, xyzOrigin, orientSpecific);
  else this.SetPixDimFromSForm();
  let nBytes =
    (hdr.numBitsPerVoxel / 8) *
    hdr.dims[1] *
    hdr.dims[2] *
    hdr.dims[3] *
    hdr.dims[4];
  if (pairedImgData.byteLength < nBytes) {
    //n.b. npm run dev implicitly extracts gz, npm run demo does not!
    //assume gz compressed
    var raw = fflate.decompressSync(new Uint8Array(buffer));
    return raw.buffer;
  }
  let v = pairedImgData.slice();
  return pairedImgData.slice();
};

NVImage.prototype.readMHA = function (buffer, pairedImgData) {
  //https://itk.org/Wiki/ITK/MetaIO/Documentation#Reading_a_Brick-of-Bytes_.28an_N-Dimensional_volume_in_a_single_file.29
  let len = buffer.byteLength;
  if (len < 20)
    throw new Error("File too small to be VTK: bytes = " + buffer.byteLength);
  var bytes = new Uint8Array(buffer);
  let pos = 0;
  function readStr() {
    while (pos < len && bytes[pos] === 10) pos++; //skip blank lines
    let startPos = pos;
    while (pos < len && bytes[pos] !== 10) pos++;
    pos++; //skip EOLN
    if (pos - startPos < 1) return "";
    return new TextDecoder().decode(buffer.slice(startPos, pos - 1));
  }
  let line = readStr(); //1st line: signature
  this.hdr = new nifti.NIFTI1();
  let hdr = this.hdr;
  hdr.littleEndian = true;
  let isGz = false;
  let isDetached = false;
  let compressedDataSize = 0;
  let mat33 = mat3.fromValues(NaN, 0, 0, 0, 1, 0, 0, 0, 1);
  let offset = vec3.fromValues(0, 0, 0);
  while (line !== "") {
    let items = line.split(" ");
    if (items.length > 2);
    items = items.slice(2);
    if (line.startsWith("BinaryDataByteOrderMSB") && items[0].includes("False"))
      hdr.littleEndian = true;
    if (line.startsWith("BinaryDataByteOrderMSB") && items[0].includes("True"))
      hdr.littleEndian = false;
    if (line.startsWith("CompressedData") && items[0].includes("True"))
      isGz = true;
    if (line.startsWith("CompressedDataSize"))
      compressedDataSize = parseInt(items[0]);
    if (line.startsWith("TransformMatrix")) {
      for (var d = 0; d < 9; d++) mat33[d] = parseFloat(items[d]);
    }
    if (line.startsWith("Offset")) {
      offset[0] = parseFloat(items[0]);
      offset[1] = parseFloat(items[1]);
      offset[2] = parseFloat(items[2]);
    }
    //if (line.startsWith("AnatomicalOrientation")) //we can ignore, tested with Slicer3D converting NIfTIspace images
    if (line.startsWith("ElementSpacing")) {
      hdr.pixDims[1] = parseFloat(items[0]);
      hdr.pixDims[2] = parseFloat(items[1]);
      hdr.pixDims[3] = parseFloat(items[2]);
      if (items.length > 3) hdr.pixDims[4] = parseFloat(items[3]);
    }
    if (line.startsWith("DimSize")) {
      hdr.dims[0] = items.length;
      for (var d = 0; d < items.length; d++)
        hdr.dims[d + 1] = parseInt(items[d]);
    }
    if (line.startsWith("ElementType")) {
      switch (items[0]) {
        case "MET_UCHAR":
          hdr.numBitsPerVoxel = 8;
          hdr.datatypeCode = this.DT_UNSIGNED_CHAR;
          break;
        case "MET_CHAR":
          hdr.numBitsPerVoxel = 8;
          hdr.datatypeCode = this.DT_INT8;
          break;
        case "MET_SHORT":
          hdr.numBitsPerVoxel = 16;
          hdr.datatypeCode = this.DT_SIGNED_SHORT;
          break;
        case "MET_USHORT":
          hdr.numBitsPerVoxel = 16;
          hdr.datatypeCode = this.DT_UINT16;
          break;
        case "MET_INT":
          hdr.numBitsPerVoxel = 32;
          hdr.datatypeCode = this.DT_SIGNED_INT;
          break;
        case "MET_UINT":
          hdr.numBitsPerVoxel = 32;
          hdr.datatypeCode = this.DT_UINT32;
          break;
        case "MET_FLOAT":
          hdr.numBitsPerVoxel = 32;
          hdr.datatypeCode = this.DT_FLOAT;
          break;
        case "MET_DOUBLE":
          hdr.numBitsPerVoxel = 64;
          hdr.datatypeCode = this.DT_DOUBLE;
          break;
        default:
          throw new Error("Unsupported NRRD data type: " + value);
      }
    }
    if (line.startsWith("ObjectType") && !items[0].includes("Image"))
      console.log("Only able to read ObjectType = Image, not " + line);
    if (line.startsWith("ElementDataFile")) {
      if (items[0] !== "LOCAL") isDetached = true;
      break;
    }
    line = readStr();
  }
  let mmMat = mat3.fromValues(
    hdr.pixDims[1],
    0,
    0,
    0,
    hdr.pixDims[2],
    0,
    0,
    0,
    hdr.pixDims[3]
  );
  mat3.multiply(mat33, mmMat, mat33);
  hdr.affine = [
    [-mat33[0], -mat33[3], -mat33[6], -offset[0]],
    [-mat33[1], -mat33[4], -mat33[7], -offset[1]],
    [mat33[2], mat33[5], mat33[8], offset[2]],
    [0, 0, 0, 1],
  ];
  hdr.vox_offset = pos;
  if (isDetached && pairedImgData) {
    if (isGz)
      return fflate.decompressSync(new Uint8Array(buffer.slice(hdr.vox_offset)))
        .buffer;
    return pairedImgData.slice();
  }
  if (isGz)
    return fflate.decompressSync(new Uint8Array(buffer.slice(hdr.vox_offset)))
      .buffer;
  return buffer.slice(hdr.vox_offset);
}; //readMHA()

NVImage.prototype.readMIF = function (buffer, pairedImgData) {
  //https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#mrtrix-image-formats
  this.hdr = new nifti.NIFTI1();
  let hdr = this.hdr;
  hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0];
  hdr.dims = [1, 1, 1, 1, 1, 1, 1, 1];
  let len = buffer.byteLength;
  if (len < 20) throw new Error("File too small to be MIF: bytes = " + len);
  var bytes = new Uint8Array(buffer);
  if (bytes[0] === 31 && bytes[1] === 139) {
    console.log("MIF with GZ decompression");
    var raw = fflate.decompressSync(new Uint8Array(buffer));
    buffer = raw.buffer;
    len = buffer.byteLength;
  }
  let pos = 0;
  function readStr() {
    while (pos < len && bytes[pos] === 10) pos++; //skip blank lines
    let startPos = pos;
    while (pos < len && bytes[pos] !== 10) pos++;
    pos++; //skip EOLN
    if (pos - startPos < 1) return "";
    return new TextDecoder().decode(buffer.slice(startPos, pos - 1));
  }
  let line = readStr(); //1st line: signature 'mrtrix tracks'
  if (!line.startsWith("mrtrix image")) {
    console.log("Not a valid MIF file");
    return;
  }
  let layout = [];
  let nTransform = 0;
  let TR = 0;
  let isDetached = false;
  line = readStr();
  while (pos < len && !line.startsWith("END")) {
    let items = line.split(":"); // "vox: 1,1,1" -> "vox", " 1,1,1"
    line = readStr();
    if (items.length < 2) break; //
    let tag = items[0]; // "datatype", "dim"
    items = items[1].split(","); // " 1,1,1" -> " 1", "1", "1"
    for (let i = 0; i < items.length; i++) items[i] = items[i].trim(); // " 1", "1", "1" -> "1", "1", "1"
    switch (tag) {
      case "dim":
        hdr.dims[0] = items.length;
        for (let i = 0; i < items.length; i++)
          hdr.dims[i + 1] = parseInt(items[i]);
        break;
      case "vox":
        for (let i = 0; i < items.length; i++) {
          hdr.pixDims[i + 1] = parseFloat(items[i]);
          if (isNaN(hdr.pixDims[i + 1])) hdr.pixDims[i + 1] = 0.0;
        }
        break;
      case "layout":
        for (let i = 0; i < items.length; i++) layout.push(parseInt(items[i])); //n.b. JavaScript preserves sign for -0
        break;
      case "datatype":
        let dt = items[0];
        if (dt.startsWith("Int8")) hdr.datatypeCode = this.DT_INT8;
        else if (dt.startsWith("UInt8"))
          hdr.datatypeCode = this.DT_UNSIGNED_CHAR;
        else if (dt.startsWith("Int16"))
          hdr.datatypeCode = this.DT_SIGNED_SHORT;
        else if (dt.startsWith("UInt16")) hdr.datatypeCode = this.DT_UINT16;
        else if (dt.startsWith("Int32")) hdr.datatypeCode = this.DT_SIGNED_INT;
        else if (dt.startsWith("UInt32")) hdr.datatypeCode = this.DT_UINT32;
        else if (dt.startsWith("Float32")) hdr.datatypeCode = this.DT_FLOAT;
        else if (dt.startsWith("Float64")) hdr.datatypeCode = this.DT_DOUBLE;
        else console.log("Unsupported datatype " + dt);
        if (dt.includes("8")) hdr.numBitsPerVoxel = 8;
        else if (dt.includes("16")) hdr.numBitsPerVoxel = 16;
        else if (dt.includes("32")) hdr.numBitsPerVoxel = 32;
        else if (dt.includes("64")) hdr.numBitsPerVoxel = 64;
        hdr.littleEndian = true; //native, to do support big endian readers
        if (dt.endsWith("LE")) hdr.littleEndian = true;
        if (dt.endsWith("BE")) hdr.littleEndian = false;
        break;
      case "transform":
        if (nTransform > 2 || items.length !== 4) break;
        hdr.affine[nTransform][0] = parseFloat(items[0]);
        hdr.affine[nTransform][1] = parseFloat(items[1]);
        hdr.affine[nTransform][2] = parseFloat(items[2]);
        hdr.affine[nTransform][3] = parseFloat(items[3]);
        nTransform++;
        break;
      case "RepetitionTime":
        TR = parseFloat(items[0]);
        break;
      case "file":
        isDetached = !items[0].startsWith(". ");
        if (!isDetached) {
          items = items[0].split(" "); //". 2336" -> ". ", "2336"
          hdr.vox_offset = parseInt(items[1]);
        }
        break;
    }
  }
  let nvox = hdr.dims[1] * hdr.dims[2] * hdr.dims[3] * hdr.dims[4];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      //hdr.affine[i][j] *= hdr.pixDims[i + 1];
      hdr.affine[i][j] *= hdr.pixDims[j + 1];
    }
  }
  console.log("mif affine:" + hdr.affine[0]);
  if (TR > 0) hdr.pixDims[4] = TR;
  if (isDetached && !pairedImgData)
    console.log("MIH header provided without paired image data");
  let rawImg = [];
  if (isDetached) rawImg = pairedImgData.slice();
  //n.b. mrconvert can pad files? See dtitest_Siemens_SC 4_dti_nopf_x2_pitch
  else
    rawImg = buffer.slice(
      hdr.vox_offset,
      hdr.vox_offset + nvox * (hdr.numBitsPerVoxel / 8)
    );
  if (layout.length != hdr.dims[0]) console.log("dims does not match layout");
  if (hdr.dims[0] > 4) console.log("reader only designed for 4D data (XYZT)");
  //estimate strides:
  let stride = 1;
  let instride = [1, 1, 1, 1, 1];
  let inflip = [false, false, false, false, false];
  for (let i = 0; i < layout.length; i++) {
    for (let j = 0; j < layout.length; j++) {
      let a = Math.abs(layout[j]);
      if (a != i) continue;
      instride[j] = stride;
      //detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
      if (layout[j] < 0 || Object.is(layout[j], -0)) inflip[j] = true;
      stride *= hdr.dims[j + 1];
    }
  }
  //lookup table for flips and stride offsets:
  const range = (start, stop, step) =>
    Array.from(
      { length: (stop - start) / step + 1 },
      (_, i) => start + i * step
    );
  let xlut = range(0, hdr.dims[1] - 1, 1);
  if (inflip[0]) xlut = range(hdr.dims[1] - 1, 0, -1);
  for (let i = 0; i < hdr.dims[1]; i++) xlut[i] *= instride[0];
  let ylut = range(0, hdr.dims[2] - 1, 1);
  if (inflip[1]) ylut = range(hdr.dims[2] - 1, 0, -1);
  for (let i = 0; i < hdr.dims[2]; i++) ylut[i] *= instride[1];
  let zlut = range(0, hdr.dims[3] - 1, 1);
  if (inflip[2]) zlut = range(hdr.dims[3] - 1, 0, -1);
  for (let i = 0; i < hdr.dims[3]; i++) zlut[i] *= instride[2];
  //input and output arrays
  let j = 0;
  let inVs = [];
  let outVs = [];
  if (hdr.numBitsPerVoxel === 8) {
    inVs = new Uint8Array(rawImg);
    outVs = new Uint8Array(nvox);
  } //8bit
  if (hdr.numBitsPerVoxel === 16) {
    inVs = new Uint16Array(rawImg);
    outVs = new Uint16Array(nvox);
  }
  if (hdr.numBitsPerVoxel === 32) {
    inVs = new Uint32Array(rawImg);
    outVs = new Uint32Array(nvox);
  } //32bit
  if (hdr.numBitsPerVoxel === 64) {
    inVs = new BigUint64Array(rawImg);
    outVs = new BigUint64Array(nvox);
  } //64bit
  for (let t = 0; t < hdr.dims[4]; t++) {
    for (let z = 0; z < hdr.dims[3]; z++) {
      for (let y = 0; y < hdr.dims[2]; y++) {
        for (let x = 0; x < hdr.dims[1]; x++) {
          outVs[j] = inVs[xlut[x] + ylut[y] + zlut[z]];
          j++;
        } //for x
      } //for y
    } //for z
  } //for t
  return outVs;
}; // readMIF()

NVImage.prototype.readNRRD = function (dataBuffer, pairedImgData) {
  //inspired by parserNRRD.js in https://github.com/xtk
  //Copyright (c) 2012 The X Toolkit Developers <dev@goXTK.com>
  // http://www.opensource.org/licenses/mit-license.php
  this.hdr = new nifti.NIFTI1();
  let hdr = this.hdr;
  hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0];
  let len = dataBuffer.byteLength;
  //extract initial text header
  var txt = null;
  var bytes = new Uint8Array(dataBuffer);
  for (var i = 1; i < len; i++) {
    if (bytes[i - 1] == 10 && bytes[i] == 10) {
      let v = dataBuffer.slice(0, i - 1);
      txt = new TextDecoder().decode(v);
      hdr.vox_offset = i + 1;
      break;
    }
  }
  var lines = txt.split("\n");
  if (!lines[0].startsWith("NRRD")) alert("Invalid NRRD image");
  var n = lines.length;
  let isGz = false;
  let isMicron = false;
  let isDetached = false;
  let mat33 = mat3.fromValues(NaN, 0, 0, 0, 1, 0, 0, 0, 1);
  let offset = vec3.fromValues(0, 0, 0);
  let rot33 = mat3.create();
  for (let i = 1; i < n; i++) {
    let str = lines[i];
    if (str[0] === "#") continue; //comment
    str = str.toLowerCase();
    let items = str.split(":");
    if (items.length < 2) continue;
    let key = items[0].trim();
    let value = items[1].trim();
    value = value.replaceAll(")", " ");
    value = value.replaceAll("(", " ");
    value = value.trim();
    switch (key) {
      case "data file":
        isDetached = true;
        break;
      case "encoding":
        if (value.includes("raw")) isGz = false;
        else if (value.includes("gz")) isGz = true;
        else alert("Unsupported NRRD encoding");
        break;
      case "type":
        switch (value) {
          case "uchar":
          case "unsigned char":
          case "uint8":
          case "uint8_t":
            hdr.numBitsPerVoxel = 8;
            hdr.datatypeCode = this.DT_UNSIGNED_CHAR;
            break;
          case "signed char":
          case "int8":
          case "int8_t":
            hdr.numBitsPerVoxel = 8;
            hdr.datatypeCode = this.DT_INT8;
            break;
          case "short":
          case "short int":
          case "signed short":
          case "signed short int":
          case "int16":
          case "int16_t":
            hdr.numBitsPerVoxel = 16;
            hdr.datatypeCode = this.DT_SIGNED_SHORT;
            break;
          case "ushort":
          case "unsigned short":
          case "unsigned short int":
          case "uint16":
          case "uint16_t":
            hdr.numBitsPerVoxel = 16;
            hdr.datatypeCode = this.DT_UINT16;
            break;
          case "int":
          case "signed int":
          case "int32":
          case "int32_t":
            hdr.numBitsPerVoxel = 32;
            hdr.datatypeCode = this.DT_SIGNED_INT;
            break;
          case "uint":
          case "unsigned int":
          case "uint32":
          case "uint32_t":
            hdr.numBitsPerVoxel = 32;
            hdr.datatypeCode = this.DT_UINT32;
            break;
          case "float":
            hdr.numBitsPerVoxel = 32;
            hdr.datatypeCode = this.DT_FLOAT;
            break;
          case "double":
            hdr.numBitsPerVoxel = 64;
            hdr.datatypeCode = this.DT_DOUBLE;
            break;
          default:
            throw new Error("Unsupported NRRD data type: " + value);
        }
        break;
      case "spacings":
        let pixdims = value.split(/[ ,]+/);
        for (var d = 0; d < pixdims.length; d++)
          hdr.pixDims[d + 1] = parseFloat(dims[d]);
      case "sizes":
        let dims = value.split(/[ ,]+/);
        hdr.dims[0] = dims.length;
        for (let d = 0; d < dims.length; d++)
          hdr.dims[d + 1] = parseInt(dims[d]);
        break;
      case "endian":
        if (value.includes("little")) hdr.littleEndian = true;
        else if (value.includes("big")) hdr.littleEndian = false;
        break;
      case "space directions":
        let vs = value.split(/[ ,]+/);
        if (vs.length !== 9) break;
        for (var d = 0; d < 9; d++) mat33[d] = parseFloat(vs[d]);
        break;
      case "space origin":
        let ts = value.split(/[ ,]+/);
        if (ts.length !== 3) break;
        offset[0] = parseFloat(ts[0]);
        offset[1] = parseFloat(ts[1]);
        offset[2] = parseFloat(ts[2]);
        break;
      case "space units":
        if (value.includes("microns")) isMicron = true;
        break;
      case "space":
        if (value.includes("right-anterior-superior") || value.includes("RAS"))
          rot33 = mat3.fromValues(
            1,
            0,
            0,

            0,
            1,
            0,

            0,
            0,
            1
          );
        else if (
          value.includes("left-anterior-superior") ||
          value.includes("LAS")
        )
          rot33 = mat3.fromValues(
            -1,
            0,
            0,

            0,
            1,
            0,

            0,
            0,
            1
          );
        else if (
          value.includes("left-posterior-superior") ||
          value.includes("LPS")
        )
          rot33 = mat3.fromValues(
            -1,
            0,
            0,

            0,
            -1,
            0,

            0,
            0,
            1
          );
        else console.log("Unsupported NRRD space value:", value);
        break;
      default:
      //console.log('Unknown:',key);
    } //read line
  } //read all lines
  if (!isNaN(mat33[0])) {
    //if spatial transform provided
    this.hdr.sform_code = 2;
    if (isMicron) {
      //convert micron to mm
      mat4.multiplyScalar(mat33, mat33, 0.001);
      offset[0] *= 0.001;
      offset[1] *= 0.001;
      offset[2] *= 0.001;
    }
    if (rot33[0] < 0) offset[0] = -offset[0]; //origin L<->R
    if (rot33[4] < 0) offset[1] = -offset[1]; //origin A<->P
    if (rot33[8] < 0) offset[2] = -offset[2]; //origin S<->I
    mat3.multiply(mat33, rot33, mat33);
    let mat = mat4.fromValues(
      mat33[0],
      mat33[3],
      mat33[6],
      offset[0],
      mat33[1],
      mat33[4],
      mat33[7],
      offset[1],
      mat33[2],
      mat33[5],
      mat33[8],
      offset[2],
      0,
      0,
      0,
      1
    );
    let mm000 = this.vox2mm([0, 0, 0], mat);
    let mm100 = this.vox2mm([1, 0, 0], mat);
    vec3.subtract(mm100, mm100, mm000);
    let mm010 = this.vox2mm([0, 1, 0], mat);
    vec3.subtract(mm010, mm010, mm000);
    let mm001 = this.vox2mm([0, 0, 1], mat);
    vec3.subtract(mm001, mm001, mm000);
    hdr.pixDims[1] = vec3.length(mm100);
    hdr.pixDims[2] = vec3.length(mm010);
    hdr.pixDims[3] = vec3.length(mm001);
    hdr.affine = [
      [mat[0], mat[1], mat[2], mat[3]],
      [mat[4], mat[5], mat[6], mat[7]],
      [mat[8], mat[9], mat[10], mat[11]],
      [0, 0, 0, 1],
    ];
  }

  let nvox = hdr.dims[1] * hdr.dims[2] * hdr.dims[3];
  if (isDetached && pairedImgData) {
    //??? .gz files automatically decompressed?
    return pairedImgData.slice();
  }
  if (isDetached)
    console.log(
      "Missing data: NRRD header describes detached data file but only one URL provided"
    );
  if (isGz)
    return fflate.decompressSync(
      new Uint8Array(dataBuffer.slice(hdr.vox_offset))
    ).buffer;
  else return dataBuffer.slice(hdr.vox_offset);
}; //readNRRD()

// not included in public docs
NVImage.prototype.calculateRAS = function () {
  //Transform to orient NIfTI image to Left->Right,Posterior->Anterior,Inferior->Superior (48 possible permutations)
  // port of Matlab reorient() https://github.com/xiangruili/dicm2nii/blob/master/nii_viewer.m
  // not elegant, as JavaScript arrays are always 1D
  let a = this.hdr.affine;
  let header = this.hdr;
  let absR = mat3.fromValues(
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
  let rotM = mat4.fromValues(
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
  let R = mat4.create();
  mat4.copy(R, rotM);
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
    this.toRAS = mat4.create(); //aka fromValues(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
    this.matRAS = mat4.clone(rotM);
    this.calculateOblique();
    return; //no rotation required!
  }
  mat4.identity(rotM);
  rotM[0 + 0 * 4] = 1 - flip[0] * 2;
  rotM[1 + 1 * 4] = 1 - flip[1] * 2;
  rotM[2 + 2 * 4] = 1 - flip[2] * 2;
  rotM[3 + 0 * 4] = (header.dims[perm[0]] - 1) * flip[0];
  rotM[3 + 1 * 4] = (header.dims[perm[1]] - 1) * flip[1];
  rotM[3 + 2 * 4] = (header.dims[perm[2]] - 1) * flip[2];
  let residualR = mat4.create();
  mat4.invert(residualR, rotM);
  mat4.multiply(residualR, residualR, R);
  this.matRAS = mat4.clone(residualR);
  rotM = mat4.fromValues(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);
  rotM[perm[0] - 1 + 0 * 4] = -flip[0] * 2 + 1;
  rotM[perm[1] - 1 + 1 * 4] = -flip[1] * 2 + 1;
  rotM[perm[2] - 1 + 2 * 4] = -flip[2] * 2 + 1;
  rotM[3 + 0 * 4] = flip[0];
  rotM[3 + 1 * 4] = flip[1];
  rotM[3 + 2 * 4] = flip[2];
  this.toRAS = mat4.clone(rotM);
  log.debug(this.hdr.dims);
  log.debug(this.dimsRAS);
  this.calculateOblique();
};

// not included in public docs
NVImage.prototype.vox2mm = function (XYZ, mtx) {
  let sform = mat4.clone(mtx);
  mat4.transpose(sform, sform);
  let pos = vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1);
  vec4.transformMat4(pos, pos, sform);
  let pos3 = vec3.fromValues(pos[0], pos[1], pos[2]);
  return pos3;
}; // vox2mm()

NVImage.prototype.mm2vox = function (mm) {
  let sform = mat4.fromValues(...this.hdr.affine.flat());
  let out = mat4.clone(sform);
  mat4.transpose(out, sform);
  mat4.invert(out, out);
  let pos = vec4.fromValues(mm[0], mm[1], mm[2], 1);
  vec4.transformMat4(pos, pos, out);
  let pos3 = vec3.fromValues(pos[0], pos[1], pos[2]);
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

NVImage.prototype.setColorMap = function (cm) {
  let allColorMaps = this.colorMaps();
  if (allColorMaps.indexOf(cm.toLowerCase()) !== -1) {
    this.colorMap = cm.toLowerCase();
    this.calMinMax();
  } else {
    log.warn(`color map ${cm} is not a valid color map`);
  }
};

// not included in public docs
// given an overlayItem and its img TypedArray, calculate 2% and 98% display range if needed
//clone FSL robust_range estimates https://github.com/rordenlab/niimath/blob/331758459140db59290a794350d0ff3ad4c37b67/src/core32.c#L1215
//ToDo: convert to web assembly, this is slow in JavaScript
NVImage.prototype.calMinMax = function () {
  let cm = this.colorMap;
  let allColorMaps = this.colorMaps();
  let cmMin = 0;
  let cmMax = 0;
  if (allColorMaps.indexOf(cm.toLowerCase()) !== -1) {
    cmMin = cmaps[cm.toLowerCase()].min;
    cmMax = cmaps[cm.toLowerCase()].max;
  }

  if (
    cmMin === cmMax &&
    this.trustCalMinMax &&
    isFinite(this.hdr.cal_min) &&
    isFinite(this.hdr.cal_max) &&
    this.hdr.cal_max > this.hdr.cal_min
  ) {
    this.cal_min = this.hdr.cal_min;
    this.cal_max = this.hdr.cal_max;
    this.robust_min = this.cal_min;
    this.robust_max = this.cal_max;
    this.global_min = this.hdr.cal_min;
    this.global_max = this.hdr.cal_max;
    return [
      this.hdr.cal_min,
      this.hdr.cal_max,
      this.hdr.cal_min,
      this.hdr.cal_max,
    ];
  }
  // if color map specifies non zero values for min and max then use them
  if (cmMin != cmMax) {
    this.cal_min = cmMin;
    this.cal_max = cmMax;
    this.robust_min = this.cal_min;
    this.robust_max = this.cal_max;
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
    log.debug("no variability in image intensity?");
    this.cal_min = mnScale;
    this.cal_max = mxScale;
    this.robust_min = this.cal_min;
    this.robust_max = this.cal_max;
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
  if (
    this.hdr.cal_min < this.hdr.cal_max &&
    this.hdr.cal_min >= mnScale &&
    this.hdr.cal_max <= mxScale
  ) {
    pct2 = this.hdr.cal_min;
    pct98 = this.hdr.cal_max;
  }
  this.cal_min = pct2;
  this.cal_max = pct98;
  this.robust_min = this.cal_min;
  this.robust_max = this.cal_max;
  this.global_min = mnScale;
  this.global_max = mxScale;
  return [pct2, pct98, mnScale, mxScale];
}; //calMinMax

// not included in public docs
NVImage.prototype.intensityRaw2Scaled = function (hdr, raw) {
  if (hdr.scl_slope === 0) hdr.scl_slope = 1.0;
  return raw * hdr.scl_slope + hdr.scl_inter;
};

/**
 * factory function to load and return a new NVImage instance from a given URL
 * @constructs NVImage
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
NVImage.loadFromUrl = async function ({
  url = "",
  urlImgData = "",
  name = "",
  colorMap = "gray",
  opacity = 1.0,
  trustCalMinMax = true,
  percentileFrac = 0.02,
  ignoreZeroVoxels = false,
  visible = true,
} = {}) {
  if (url === "") {
    throw Error("url must not be empty");
  }

  let response = await fetch(url);
  let nvimage = null;
  if (!response.ok) {
    throw Error(response.statusText);
  }
  var re = /(?:\.([^.]+))?$/;
  let ext = re.exec(url)[1];
  if (ext.toUpperCase() === "NHDR") {
    if (urlImgData === "") {
    }
  } else if (ext.toUpperCase() === "HEAD") {
    if (urlImgData === "") {
      urlImgData = url.substring(0, url.lastIndexOf("HEAD")) + "BRIK";
    }
  }
  let urlParts = url.split("/"); // split url parts at slash
  name = urlParts.slice(-1)[0]; // name will be last part of url (e.g. some/url/image.nii.gz --> image.nii.gz)
  let dataBuffer = await response.arrayBuffer();
  let pairedImgData = null;
  if (urlImgData.length > 0) {
    let resp = await fetch(urlImgData);
    if (resp.status === 404) {
      if (urlImgData.lastIndexOf("BRIK") !== -1) {
        resp = await fetch(urlImgData + ".gz");
      }
    }
    pairedImgData = await resp.arrayBuffer();
  }

  if (dataBuffer) {
    nvimage = new NVImage(
      dataBuffer,
      name,
      colorMap,
      opacity,
      pairedImgData,
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
      if (file.name.lastIndexOf("gz") !== -1) {
        resolve(nifti.decompress(reader.result));
      } else {
        resolve(reader.result);
      }
    };

    reader.onerror = reject;

    reader.readAsArrayBuffer(file);
  });
};

/**
 * factory function to load and return a new NVImage instance from a file in the browser
 * @constructs NVImage
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
NVImage.loadFromFile = async function ({
  file = null,
  name = "",
  colorMap = "gray",
  opacity = 1.0,
  urlImgData = null,
  trustCalMinMax = true,
  percentileFrac = 0.02,
  ignoreZeroVoxels = false,
  visible = true,
} = {}) {
  let nvimage = null;
  try {
    let dataBuffer = await this.readFileAsync(file);
    let pairedImgData = null;
    if (urlImgData) {
      pairedImgData = await this.readFileAsync(urlImgData);
    }
    name = file.name;
    nvimage = new NVImage(
      dataBuffer,
      name,
      colorMap,
      opacity,
      pairedImgData,
      trustCalMinMax,
      percentileFrac,
      ignoreZeroVoxels,
      visible
    );
  } catch (err) {
    log.debug(err);
  }
  return nvimage;
};

NVImage.loadFromBase64 = async function ({
  base64 = null,
  name = "",
  colorMap = "gray",
  opacity = 1.0,
  trustCalMinMax = true,
  percentileFrac = 0.02,
  ignoreZeroVoxels = false,
  visible = true,
} = {}) {
  //https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
  function base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  let nvimage = null;
  try {
    let dataBuffer = base64ToArrayBuffer(base64);
    let pairedImgData = null;
    nvimage = new NVImage(
      dataBuffer,
      name,
      colorMap,
      opacity,
      pairedImgData,
      trustCalMinMax,
      percentileFrac,
      ignoreZeroVoxels,
      visible
    );
  } catch (err) {
    log.debug(err);
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
 * @typedef {Object} NVImageMetadata
 * @property {string} id - unique if of image
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
 * @returns {NVImageMetadata} - {@link NVImageMetadata}
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
 * @param {dataType} string the output data type. Options: 'same', 'uint8'
 * @returns {NVImage} returns a new NVImage filled with zeros for the image data
 * @example
 * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
 * newZeroImage = NVImage.zerosLike(myImage)
 */
NVImage.zerosLike = function (nvImage, dataType = "same") {
  // dataType can be: 'same', 'uint8'
  // 'same' means that the zeroed image data type is the same as the input image
  let zeroClone = nvImage.clone();
  zeroClone.zeroImage();
  if (dataType === "uint8") {
    zeroClone.img = Uint8Array.from(zeroClone.img);
    zeroClone.hdr.datatypeCode = zeroClone.DT_UNSIGNED_CHAR;
    zeroClone.hdr.numBitsPerVoxel = 8;
  }
  return zeroClone;
};

String.prototype.getBytes = function () {
  //CR??? What does this do?
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
  let i = this.img[x + y * nx + z * nx * ny];
  return this.hdr.scl_slope * i + this.hdr.scl_inter;
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
function getExtents(positions, forceOriginInVolume = true) {
  let nV = (positions.length / 3).toFixed(); //each vertex has 3 components: XYZ
  let origin = vec3.fromValues(0, 0, 0); //default center of rotation
  let mn = vec3.create();
  let mx = vec3.create();
  let mxDx = 0.0;
  let nLoops = 1;
  if (forceOriginInVolume) nLoops = 2; //second pass to reposition origin
  for (let loop = 0; loop < nLoops; loop++) {
    mxDx = 0.0;
    for (let i = 0; i < nV; i++) {
      let v = vec3.fromValues(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );
      if (i === 0) {
        vec3.copy(mn, v);
        vec3.copy(mx, v);
      }
      vec3.min(mn, mn, v);
      vec3.max(mx, mx, v);
      vec3.subtract(v, v, origin);
      let dx = vec3.len(v);
      mxDx = Math.max(mxDx, dx);
    }
    if (loop + 1 >= nLoops) break;
    let ok = true;
    for (let j = 0; j < 3; ++j) {
      if (mn[j] > origin[j]) ok = false;
      if (mx[j] < origin[j]) ok = false;
    }
    if (ok) break;
    vec3.lerp(origin, mn, mx, 0.5);
    log.debug("origin moved inside volume: ", origin);
  }
  let min = [mn[0], mn[1], mn[2]];
  let max = [mx[0], mx[1], mx[2]];
  let furthestVertexFromOrigin = mxDx;
  return { min, max, furthestVertexFromOrigin, origin };
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
  //cube has 8 vertices: left/right, posterior/anterior, inferior/superior
  let LPI = this.vox2mm([0.0, 0.0, 0.0], this.matRAS);
  //TODO: ray direction needs to be corrected for oblique rotations
  let LAI = this.vox2mm([0.0, this.dimsRAS[2] - 1, 0.0], this.matRAS);
  let LPS = this.vox2mm([0.0, 0.0, this.dimsRAS[3] - 1], this.matRAS);
  let LAS = this.vox2mm(
    [0.0, this.dimsRAS[2] - 1, this.dimsRAS[3] - 1],
    this.matRAS
  );
  let RPI = this.vox2mm([this.dimsRAS[1] - 1, 0.0, 0.0], this.matRAS);
  let RAI = this.vox2mm(
    [this.dimsRAS[1] - 1, this.dimsRAS[2] - 1, 0.0],
    this.matRAS
  );
  let RPS = this.vox2mm(
    [this.dimsRAS[1] - 1, 0.0, this.dimsRAS[3] - 1],
    this.matRAS
  );
  let RAS = this.vox2mm(
    [this.dimsRAS[1] - 1, this.dimsRAS[2] - 1, this.dimsRAS[3] - 1],
    this.matRAS
  );

  let posTex = [
    //spatial position (XYZ), texture coordinates UVW
    // Superior face
    ...LPS,
    ...[0.0, 0.0, 1.0],
    ...RPS,
    ...[1.0, 0.0, 1.0],
    ...RAS,
    ...[1.0, 1.0, 1.0],
    ...LAS,
    ...[0.0, 1.0, 1.0],

    // Inferior face
    ...LPI,
    ...[0.0, 0.0, 0.0],
    ...LAI,
    ...[0.0, 1.0, 0.0],
    ...RAI,
    ...[1.0, 1.0, 0.0],
    ...RPI,
    ...[1.0, 0.0, 0.0],
  ];

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  const indices = [
    //six faces of cube: each has 2 triangles (6 indices)
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
    5,
    6,
    2,
    2,
    3,
    5, // Front
    4,
    0,
    1,
    1,
    7,
    4, // Back
    7,
    1,
    2,
    2,
    6,
    7, // Right
    4,
    5,
    3,
    3,
    0,
    4, // Left
  ];
  // Now send the element array to GL

  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  const posTexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posTexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posTex), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bindBuffer(gl.ARRAY_BUFFER, posTexBuffer);
  //vertex spatial position: 3 floats X,Y,Z
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  //UVW texCoord: (also three floats)
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  gl.bindVertexArray(null);

  const obj3D = new NiivueObject3D(
    id,
    posTexBuffer,
    gl.TRIANGLES,
    indices.length,
    indexBuffer,
    vao
  );

  const extents = getExtents([
    ...LPS,
    ...RPS,
    ...RAS,
    ...LAS,
    ...LPI,
    ...LAI,
    ...RAI,
    ...RPI,
  ]);
  obj3D.extentsMin = extents.min;
  obj3D.extentsMax = extents.max;
  obj3D.furthestVertexFromOrigin = extents.furthestVertexFromOrigin;
  obj3D.originNegate = vec3.clone(extents.origin);
  vec3.negate(obj3D.originNegate, obj3D.originNegate);
  return obj3D;
};