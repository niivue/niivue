function createCommonjsModule(fn) {
  var module = { exports: {} };
	return fn(module, module.exports), module.exports;
}

function commonjsRequire (path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

/*jslint browser: true, node: true */

var utilities = createCommonjsModule(function (module) {
/*** Imports ***/

var nifti = nifti || {};
nifti.Utils = nifti.Utils || {};
/*** Static Pseudo-constants ***/

nifti.Utils.crcTable = null;
nifti.Utils.GUNZIP_MAGIC_COOKIE1 = 31;
nifti.Utils.GUNZIP_MAGIC_COOKIE2 = 139;
/*** Static methods ***/

nifti.Utils.getStringAt = function (data, start, end) {
  var str = "",
      ctr,
      ch;

  for (ctr = start; ctr < end; ctr += 1) {
    ch = data.getUint8(ctr);

    if (ch !== 0) {
      str += String.fromCharCode(ch);
    }
  }

  return str;
};

nifti.Utils.getByteAt = function (data, start) {
  return data.getInt8(start);
};

nifti.Utils.getShortAt = function (data, start, littleEndian) {
  return data.getInt16(start, littleEndian);
};

nifti.Utils.getIntAt = function (data, start, littleEndian) {
  return data.getInt32(start, littleEndian);
};

nifti.Utils.getFloatAt = function (data, start, littleEndian) {
  return data.getFloat32(start, littleEndian);
};

nifti.Utils.getDoubleAt = function (data, start, littleEndian) {
  return data.getFloat64(start, littleEndian);
};

nifti.Utils.getLongAt = function (data, start, littleEndian) {
  var ctr,
      array = [],
      value = 0;

  for (ctr = 0; ctr < 8; ctr += 1) {
    array[ctr] = nifti.Utils.getByteAt(data, start + ctr, littleEndian);
  }

  for (ctr = array.length - 1; ctr >= 0; ctr--) {
    value = value * 256 + array[ctr];
  }

  return value;
};

nifti.Utils.toArrayBuffer = function (buffer) {
  var ab, view, i;
  ab = new ArrayBuffer(buffer.length);
  view = new Uint8Array(ab);

  for (i = 0; i < buffer.length; i += 1) {
    view[i] = buffer[i];
  }

  return ab;
};

nifti.Utils.isString = function (obj) {
  return typeof obj === "string" || obj instanceof String;
};

nifti.Utils.formatNumber = function (num, shortFormat) {
  var val = 0;

  if (nifti.Utils.isString(num)) {
    val = Number(num);
  } else {
    val = num;
  }

  if (shortFormat) {
    val = val.toPrecision(5);
  } else {
    val = val.toPrecision(7);
  }

  return parseFloat(val);
}; // http://stackoverflow.com/questions/18638900/javascript-crc32


nifti.Utils.makeCRCTable = function () {
  var c;
  var crcTable = [];

  for (var n = 0; n < 256; n++) {
    c = n;

    for (var k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ c >>> 1 : c >>> 1;
    }

    crcTable[n] = c;
  }

  return crcTable;
};

nifti.Utils.crc32 = function (dataView) {
  var crcTable = nifti.Utils.crcTable || (nifti.Utils.crcTable = nifti.Utils.makeCRCTable());
  var crc = 0 ^ -1;

  for (var i = 0; i < dataView.byteLength; i++) {
    crc = crc >>> 8 ^ crcTable[(crc ^ dataView.getUint8(i)) & 0xFF];
  }

  return (crc ^ -1) >>> 0;
};

if (module.exports) {
  module.exports = nifti.Utils;
}
});

/*jslint browser: true, node: true */

var nifti1 = createCommonjsModule(function (module) {
/*** Imports ***/

var nifti = nifti || {};
nifti.Utils = nifti.Utils || (typeof commonjsRequire !== 'undefined' ? utilities : null);
/*** Constructor ***/

/**
 * The NIFTI1 constructor.
 * @constructor
 * @property {boolean} littleEndian
 * @property {number} dim_info
 * @property {number[]} dims - image dimensions
 * @property {number} intent_p1
 * @property {number} intent_p2
 * @property {number} intent_p3
 * @property {number} intent_code
 * @property {number} datatypeCode
 * @property {number} numBitsPerVoxel
 * @property {number} slice_start
 * @property {number} slice_end
 * @property {number} slice_code
 * @property {number[]} pixDims - voxel dimensions
 * @property {number} vox_offset
 * @property {number} scl_slope
 * @property {number} scl_inter
 * @property {number} xyzt_units
 * @property {number} cal_max
 * @property {number} cal_min
 * @property {number} slice_duration
 * @property {number} toffset
 * @property {string} description
 * @property {string} aux_file
 * @property {string} intent_name
 * @property {number} qform_code
 * @property {number} sform_code
 * @property {number} quatern_b
 * @property {number} quatern_c
 * @property {number} quatern_d
 * @property {number} quatern_x
 * @property {number} quatern_y
 * @property {number} quatern_z
 * @property {Array.<Array.<number>>} affine
 * @property {string} magic
 * @property {boolean} isHDR - if hdr/img format
 * @property {number[]} extensionFlag
 * @property {number} extensionSize
 * @property {number} extensionCode
 * @type {Function}
 */

nifti.NIFTI1 = nifti.NIFTI1 || function () {
  this.littleEndian = false;
  this.dim_info = 0;
  this.dims = [];
  this.intent_p1 = 0;
  this.intent_p2 = 0;
  this.intent_p3 = 0;
  this.intent_code = 0;
  this.datatypeCode = 0;
  this.numBitsPerVoxel = 0;
  this.slice_start = 0;
  this.slice_end = 0;
  this.slice_code = 0;
  this.pixDims = [];
  this.vox_offset = 0;
  this.scl_slope = 1;
  this.scl_inter = 0;
  this.xyzt_units = 0;
  this.cal_max = 0;
  this.cal_min = 0;
  this.slice_duration = 0;
  this.toffset = 0;
  this.description = "";
  this.aux_file = "";
  this.intent_name = "";
  this.qform_code = 0;
  this.sform_code = 0;
  this.quatern_b = 0;
  this.quatern_c = 0;
  this.quatern_d = 0;
  this.qoffset_x = 0;
  this.qoffset_y = 0;
  this.qoffset_z = 0;
  this.affine = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  this.magic = 0;
  this.isHDR = false;
  this.extensionFlag = [0, 0, 0, 0];
  this.extensionSize = 0;
  this.extensionCode = 0;
};
/*** Static Pseudo-constants ***/
// datatype codes


nifti.NIFTI1.TYPE_NONE = 0;
nifti.NIFTI1.TYPE_BINARY = 1;
nifti.NIFTI1.TYPE_UINT8 = 2;
nifti.NIFTI1.TYPE_INT16 = 4;
nifti.NIFTI1.TYPE_INT32 = 8;
nifti.NIFTI1.TYPE_FLOAT32 = 16;
nifti.NIFTI1.TYPE_COMPLEX64 = 32;
nifti.NIFTI1.TYPE_FLOAT64 = 64;
nifti.NIFTI1.TYPE_RGB24 = 128;
nifti.NIFTI1.TYPE_INT8 = 256;
nifti.NIFTI1.TYPE_UINT16 = 512;
nifti.NIFTI1.TYPE_UINT32 = 768;
nifti.NIFTI1.TYPE_INT64 = 1024;
nifti.NIFTI1.TYPE_UINT64 = 1280;
nifti.NIFTI1.TYPE_FLOAT128 = 1536;
nifti.NIFTI1.TYPE_COMPLEX128 = 1792;
nifti.NIFTI1.TYPE_COMPLEX256 = 2048; // transform codes

nifti.NIFTI1.XFORM_UNKNOWN = 0;
nifti.NIFTI1.XFORM_SCANNER_ANAT = 1;
nifti.NIFTI1.XFORM_ALIGNED_ANAT = 2;
nifti.NIFTI1.XFORM_TALAIRACH = 3;
nifti.NIFTI1.XFORM_MNI_152 = 4; // unit codes

nifti.NIFTI1.SPATIAL_UNITS_MASK = 0x07;
nifti.NIFTI1.TEMPORAL_UNITS_MASK = 0x38;
nifti.NIFTI1.UNITS_UNKNOWN = 0;
nifti.NIFTI1.UNITS_METER = 1;
nifti.NIFTI1.UNITS_MM = 2;
nifti.NIFTI1.UNITS_MICRON = 3;
nifti.NIFTI1.UNITS_SEC = 8;
nifti.NIFTI1.UNITS_MSEC = 16;
nifti.NIFTI1.UNITS_USEC = 24;
nifti.NIFTI1.UNITS_HZ = 32;
nifti.NIFTI1.UNITS_PPM = 40;
nifti.NIFTI1.UNITS_RADS = 48; // nifti1 codes

nifti.NIFTI1.MAGIC_COOKIE = 348;
nifti.NIFTI1.STANDARD_HEADER_SIZE = 348;
nifti.NIFTI1.MAGIC_NUMBER_LOCATION = 344;
nifti.NIFTI1.MAGIC_NUMBER = [0x6E, 0x2B, 0x31]; // n+1 (.nii)

nifti.NIFTI1.MAGIC_NUMBER2 = [0x6E, 0x69, 0x31]; // ni1 (.hdr/.img)

nifti.NIFTI1.EXTENSION_HEADER_SIZE = 8;
/*** Prototype Methods ***/

/**
 * Reads the header data.
 * @param {ArrayBuffer} data
 */

nifti.NIFTI1.prototype.readHeader = function (data) {
  var rawData = new DataView(data),
      magicCookieVal = nifti.Utils.getIntAt(rawData, 0, this.littleEndian),
      ctr,
      ctrOut,
      ctrIn,
      index;

  if (magicCookieVal !== nifti.NIFTI1.MAGIC_COOKIE) {
    // try as little endian
    this.littleEndian = true;
    magicCookieVal = nifti.Utils.getIntAt(rawData, 0, this.littleEndian);
  }

  if (magicCookieVal !== nifti.NIFTI1.MAGIC_COOKIE) {
    throw new Error("This does not appear to be a NIFTI file!");
  }

  this.dim_info = nifti.Utils.getByteAt(rawData, 39);

  for (ctr = 0; ctr < 8; ctr += 1) {
    index = 40 + ctr * 2;
    this.dims[ctr] = nifti.Utils.getShortAt(rawData, index, this.littleEndian);
  }

  this.intent_p1 = nifti.Utils.getFloatAt(rawData, 56, this.littleEndian);
  this.intent_p2 = nifti.Utils.getFloatAt(rawData, 60, this.littleEndian);
  this.intent_p3 = nifti.Utils.getFloatAt(rawData, 64, this.littleEndian);
  this.intent_code = nifti.Utils.getShortAt(rawData, 68, this.littleEndian);
  this.datatypeCode = nifti.Utils.getShortAt(rawData, 70, this.littleEndian);
  this.numBitsPerVoxel = nifti.Utils.getShortAt(rawData, 72, this.littleEndian);
  this.slice_start = nifti.Utils.getShortAt(rawData, 74, this.littleEndian);

  for (ctr = 0; ctr < 8; ctr += 1) {
    index = 76 + ctr * 4;
    this.pixDims[ctr] = nifti.Utils.getFloatAt(rawData, index, this.littleEndian);
  }

  this.vox_offset = nifti.Utils.getFloatAt(rawData, 108, this.littleEndian);
  this.scl_slope = nifti.Utils.getFloatAt(rawData, 112, this.littleEndian);
  this.scl_inter = nifti.Utils.getFloatAt(rawData, 116, this.littleEndian);
  this.slice_end = nifti.Utils.getShortAt(rawData, 120, this.littleEndian);
  this.slice_code = nifti.Utils.getByteAt(rawData, 122);
  this.xyzt_units = nifti.Utils.getByteAt(rawData, 123);
  this.cal_max = nifti.Utils.getFloatAt(rawData, 124, this.littleEndian);
  this.cal_min = nifti.Utils.getFloatAt(rawData, 128, this.littleEndian);
  this.slice_duration = nifti.Utils.getFloatAt(rawData, 132, this.littleEndian);
  this.toffset = nifti.Utils.getFloatAt(rawData, 136, this.littleEndian);
  this.description = nifti.Utils.getStringAt(rawData, 148, 228);
  this.aux_file = nifti.Utils.getStringAt(rawData, 228, 252);
  this.qform_code = nifti.Utils.getShortAt(rawData, 252, this.littleEndian);
  this.sform_code = nifti.Utils.getShortAt(rawData, 254, this.littleEndian);
  this.quatern_b = nifti.Utils.getFloatAt(rawData, 256, this.littleEndian);
  this.quatern_c = nifti.Utils.getFloatAt(rawData, 260, this.littleEndian);
  this.quatern_d = nifti.Utils.getFloatAt(rawData, 264, this.littleEndian);
  this.qoffset_x = nifti.Utils.getFloatAt(rawData, 268, this.littleEndian);
  this.qoffset_y = nifti.Utils.getFloatAt(rawData, 272, this.littleEndian);
  this.qoffset_z = nifti.Utils.getFloatAt(rawData, 276, this.littleEndian);

  for (ctrOut = 0; ctrOut < 3; ctrOut += 1) {
    for (ctrIn = 0; ctrIn < 4; ctrIn += 1) {
      index = 280 + (ctrOut * 4 + ctrIn) * 4;
      this.affine[ctrOut][ctrIn] = nifti.Utils.getFloatAt(rawData, index, this.littleEndian);
    }
  }

  this.affine[3][0] = 0;
  this.affine[3][1] = 0;
  this.affine[3][2] = 0;
  this.affine[3][3] = 1;
  this.intent_name = nifti.Utils.getStringAt(rawData, 328, 344);
  this.magic = nifti.Utils.getStringAt(rawData, 344, 348);
  this.isHDR = this.magic === nifti.NIFTI1.MAGIC_NUMBER2;

  if (rawData.byteLength > nifti.NIFTI1.MAGIC_COOKIE) {
    this.extensionFlag[0] = nifti.Utils.getByteAt(rawData, 348);
    this.extensionFlag[1] = nifti.Utils.getByteAt(rawData, 348 + 1);
    this.extensionFlag[2] = nifti.Utils.getByteAt(rawData, 348 + 2);
    this.extensionFlag[3] = nifti.Utils.getByteAt(rawData, 348 + 3);

    if (this.extensionFlag[0]) {
      this.extensionSize = this.getExtensionSize(rawData);
      this.extensionCode = this.getExtensionCode(rawData);
    }
  }
};
/**
 * Returns a formatted string of header fields.
 * @returns {string}
 */


nifti.NIFTI1.prototype.toFormattedString = function () {
  var fmt = nifti.Utils.formatNumber,
      string = "";
  string += "Dim Info = " + this.dim_info + "\n";
  string += "Image Dimensions (1-8): " + this.dims[0] + ", " + this.dims[1] + ", " + this.dims[2] + ", " + this.dims[3] + ", " + this.dims[4] + ", " + this.dims[5] + ", " + this.dims[6] + ", " + this.dims[7] + "\n";
  string += "Intent Parameters (1-3): " + this.intent_p1 + ", " + this.intent_p2 + ", " + this.intent_p3 + "\n";
  string += "Intent Code = " + this.intent_code + "\n";
  string += "Datatype = " + this.datatypeCode + " (" + this.getDatatypeCodeString(this.datatypeCode) + ")\n";
  string += "Bits Per Voxel = " + this.numBitsPerVoxel + "\n";
  string += "Slice Start = " + this.slice_start + "\n";
  string += "Voxel Dimensions (1-8): " + fmt(this.pixDims[0]) + ", " + fmt(this.pixDims[1]) + ", " + fmt(this.pixDims[2]) + ", " + fmt(this.pixDims[3]) + ", " + fmt(this.pixDims[4]) + ", " + fmt(this.pixDims[5]) + ", " + fmt(this.pixDims[6]) + ", " + fmt(this.pixDims[7]) + "\n";
  string += "Image Offset = " + this.vox_offset + "\n";
  string += "Data Scale:  Slope = " + fmt(this.scl_slope) + "  Intercept = " + fmt(this.scl_inter) + "\n";
  string += "Slice End = " + this.slice_end + "\n";
  string += "Slice Code = " + this.slice_code + "\n";
  string += "Units Code = " + this.xyzt_units + " (" + this.getUnitsCodeString(nifti.NIFTI1.SPATIAL_UNITS_MASK & this.xyzt_units) + ", " + this.getUnitsCodeString(nifti.NIFTI1.TEMPORAL_UNITS_MASK & this.xyzt_units) + ")\n";
  string += "Display Range:  Max = " + fmt(this.cal_max) + "  Min = " + fmt(this.cal_min) + "\n";
  string += "Slice Duration = " + this.slice_duration + "\n";
  string += "Time Axis Shift = " + this.toffset + "\n";
  string += "Description: \"" + this.description + "\"\n";
  string += "Auxiliary File: \"" + this.aux_file + "\"\n";
  string += "Q-Form Code = " + this.qform_code + " (" + this.getTransformCodeString(this.qform_code) + ")\n";
  string += "S-Form Code = " + this.sform_code + " (" + this.getTransformCodeString(this.sform_code) + ")\n";
  string += "Quaternion Parameters:  " + "b = " + fmt(this.quatern_b) + "  " + "c = " + fmt(this.quatern_c) + "  " + "d = " + fmt(this.quatern_d) + "\n";
  string += "Quaternion Offsets:  " + "x = " + this.qoffset_x + "  " + "y = " + this.qoffset_y + "  " + "z = " + this.qoffset_z + "\n";
  string += "S-Form Parameters X: " + fmt(this.affine[0][0]) + ", " + fmt(this.affine[0][1]) + ", " + fmt(this.affine[0][2]) + ", " + fmt(this.affine[0][3]) + "\n";
  string += "S-Form Parameters Y: " + fmt(this.affine[1][0]) + ", " + fmt(this.affine[1][1]) + ", " + fmt(this.affine[1][2]) + ", " + fmt(this.affine[1][3]) + "\n";
  string += "S-Form Parameters Z: " + fmt(this.affine[2][0]) + ", " + fmt(this.affine[2][1]) + ", " + fmt(this.affine[2][2]) + ", " + fmt(this.affine[2][3]) + "\n";
  string += "Intent Name: \"" + this.intent_name + "\"\n";

  if (this.extensionFlag[0]) {
    string += "Extension: Size = " + this.extensionSize + "  Code = " + this.extensionCode + "\n";
  }

  return string;
};
/**
 * Returns a human-readable string of datatype.
 * @param {number} code
 * @returns {string}
 */


nifti.NIFTI1.prototype.getDatatypeCodeString = function (code) {
  if (code === nifti.NIFTI1.TYPE_UINT8) {
    return "1-Byte Unsigned Integer";
  } else if (code === nifti.NIFTI1.TYPE_INT16) {
    return "2-Byte Signed Integer";
  } else if (code === nifti.NIFTI1.TYPE_INT32) {
    return "4-Byte Signed Integer";
  } else if (code === nifti.NIFTI1.TYPE_FLOAT32) {
    return "4-Byte Float";
  } else if (code === nifti.NIFTI1.TYPE_FLOAT64) {
    return "8-Byte Float";
  } else if (code === nifti.NIFTI1.TYPE_RGB24) {
    return "RGB";
  } else if (code === nifti.NIFTI1.TYPE_INT8) {
    return "1-Byte Signed Integer";
  } else if (code === nifti.NIFTI1.TYPE_UINT16) {
    return "2-Byte Unsigned Integer";
  } else if (code === nifti.NIFTI1.TYPE_UINT32) {
    return "4-Byte Unsigned Integer";
  } else if (code === nifti.NIFTI1.TYPE_INT64) {
    return "8-Byte Signed Integer";
  } else if (code === nifti.NIFTI1.TYPE_UINT64) {
    return "8-Byte Unsigned Integer";
  } else {
    return "Unknown";
  }
};
/**
 * Returns a human-readable string of transform type.
 * @param {number} code
 * @returns {string}
 */


nifti.NIFTI1.prototype.getTransformCodeString = function (code) {
  if (code === nifti.NIFTI1.XFORM_SCANNER_ANAT) {
    return "Scanner";
  } else if (code === nifti.NIFTI1.XFORM_ALIGNED_ANAT) {
    return "Aligned";
  } else if (code === nifti.NIFTI1.XFORM_TALAIRACH) {
    return "Talairach";
  } else if (code === nifti.NIFTI1.XFORM_MNI_152) {
    return "MNI";
  } else {
    return "Unknown";
  }
};
/**
 * Returns a human-readable string of spatial and temporal units.
 * @param {number} code
 * @returns {string}
 */


nifti.NIFTI1.prototype.getUnitsCodeString = function (code) {
  if (code === nifti.NIFTI1.UNITS_METER) {
    return "Meters";
  } else if (code === nifti.NIFTI1.UNITS_MM) {
    return "Millimeters";
  } else if (code === nifti.NIFTI1.UNITS_MICRON) {
    return "Microns";
  } else if (code === nifti.NIFTI1.UNITS_SEC) {
    return "Seconds";
  } else if (code === nifti.NIFTI1.UNITS_MSEC) {
    return "Milliseconds";
  } else if (code === nifti.NIFTI1.UNITS_USEC) {
    return "Microseconds";
  } else if (code === nifti.NIFTI1.UNITS_HZ) {
    return "Hz";
  } else if (code === nifti.NIFTI1.UNITS_PPM) {
    return "PPM";
  } else if (code === nifti.NIFTI1.UNITS_RADS) {
    return "Rads";
  } else {
    return "Unknown";
  }
};
/**
 * Returns the qform matrix.
 * @returns {Array.<Array.<number>>}
 */


nifti.NIFTI1.prototype.getQformMat = function () {
  return this.convertNiftiQFormToNiftiSForm(this.quatern_b, this.quatern_c, this.quatern_d, this.qoffset_x, this.qoffset_y, this.qoffset_z, this.pixDims[1], this.pixDims[2], this.pixDims[3], this.pixDims[0]);
};
/**
 * Converts qform to an affine.  (See http://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1_io.c)
 * @param {number} qb
 * @param {number} qc
 * @param {number} qd
 * @param {number} qx
 * @param {number} qy
 * @param {number} qz
 * @param {number} dx
 * @param {number} dy
 * @param {number} dz
 * @param {number} qfac
 * @returns {Array.<Array.<number>>}
 */


nifti.NIFTI1.prototype.convertNiftiQFormToNiftiSForm = function (qb, qc, qd, qx, qy, qz, dx, dy, dz, qfac) {
  var R = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      a,
      b = qb,
      c = qc,
      d = qd,
      xd,
      yd,
      zd; // last row is always [ 0 0 0 1 ]

  R[3][0] = R[3][1] = R[3][2] = 0.0;
  R[3][3] = 1.0; // compute a parameter from b,c,d

  a = 1.0 - (b * b + c * c + d * d);

  if (a < 0.0000001) {
    /* special case */
    a = 1.0 / Math.sqrt(b * b + c * c + d * d);
    b *= a;
    c *= a;
    d *= a;
    /* normalize (b,c,d) vector */

    a = 0.0;
    /* a = 0 ==> 180 degree rotation */
  } else {
    a = Math.sqrt(a);
    /* angle = 2*arccos(a) */
  } // load rotation matrix, including scaling factors for voxel sizes


  xd = dx > 0.0 ? dx : 1.0;
  /* make sure are positive */

  yd = dy > 0.0 ? dy : 1.0;
  zd = dz > 0.0 ? dz : 1.0;

  if (qfac < 0.0) {
    zd = -zd;
    /* left handedness? */
  }

  R[0][0] = (a * a + b * b - c * c - d * d) * xd;
  R[0][1] = 2.0 * (b * c - a * d) * yd;
  R[0][2] = 2.0 * (b * d + a * c) * zd;
  R[1][0] = 2.0 * (b * c + a * d) * xd;
  R[1][1] = (a * a + c * c - b * b - d * d) * yd;
  R[1][2] = 2.0 * (c * d - a * b) * zd;
  R[2][0] = 2.0 * (b * d - a * c) * xd;
  R[2][1] = 2.0 * (c * d + a * b) * yd;
  R[2][2] = (a * a + d * d - c * c - b * b) * zd; // load offsets

  R[0][3] = qx;
  R[1][3] = qy;
  R[2][3] = qz;
  return R;
};
/**
 * Converts sform to an orientation string (e.g., XYZ+--).  (See http://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1_io.c)
 * @param {Array.<Array.<number>>} R
 * @returns {string}
 */


nifti.NIFTI1.prototype.convertNiftiSFormToNEMA = function (R) {
  var xi, xj, xk, yi, yj, yk, zi, zj, zk, val, detQ, detP, i, j, k, p, q, r, ibest, jbest, kbest, pbest, qbest, rbest, M, vbest, Q, P, iChar, jChar, kChar, iSense, jSense, kSense;
  k = 0;
  Q = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  P = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; //if( icod == NULL || jcod == NULL || kcod == NULL ) return ; /* bad */
  //*icod = *jcod = *kcod = 0 ; /* this.errorMessage returns, if sh*t happens */

  /* load column vectors for each (i,j,k) direction from matrix */

  /*-- i axis --*/

  /*-- j axis --*/

  /*-- k axis --*/

  xi = R[0][0];
  xj = R[0][1];
  xk = R[0][2];
  yi = R[1][0];
  yj = R[1][1];
  yk = R[1][2];
  zi = R[2][0];
  zj = R[2][1];
  zk = R[2][2];
  /* normalize column vectors to get unit vectors along each ijk-axis */

  /* normalize i axis */

  val = Math.sqrt(xi * xi + yi * yi + zi * zi);

  if (val === 0.0) {
    /* stupid input */
    return null;
  }

  xi /= val;
  yi /= val;
  zi /= val;
  /* normalize j axis */

  val = Math.sqrt(xj * xj + yj * yj + zj * zj);

  if (val === 0.0) {
    /* stupid input */
    return null;
  }

  xj /= val;
  yj /= val;
  zj /= val;
  /* orthogonalize j axis to i axis, if needed */

  val = xi * xj + yi * yj + zi * zj;
  /* dot product between i and j */

  if (Math.abs(val) > 1.E-4) {
    xj -= val * xi;
    yj -= val * yi;
    zj -= val * zi;
    val = Math.sqrt(xj * xj + yj * yj + zj * zj);
    /* must renormalize */

    if (val === 0.0) {
      /* j was parallel to i? */
      return null;
    }

    xj /= val;
    yj /= val;
    zj /= val;
  }
  /* normalize k axis; if it is zero, make it the cross product i x j */


  val = Math.sqrt(xk * xk + yk * yk + zk * zk);

  if (val === 0.0) {
    xk = yi * zj - zi * yj;
    yk = zi * xj - zj * xi;
    zk = xi * yj - yi * xj;
  } else {
    xk /= val;
    yk /= val;
    zk /= val;
  }
  /* orthogonalize k to i */


  val = xi * xk + yi * yk + zi * zk;
  /* dot product between i and k */

  if (Math.abs(val) > 1.E-4) {
    xk -= val * xi;
    yk -= val * yi;
    zk -= val * zi;
    val = Math.sqrt(xk * xk + yk * yk + zk * zk);

    if (val === 0.0) {
      /* bad */
      return null;
    }

    xk /= val;
    yk /= val;
    zk /= val;
  }
  /* orthogonalize k to j */


  val = xj * xk + yj * yk + zj * zk;
  /* dot product between j and k */

  if (Math.abs(val) > 1.e-4) {
    xk -= val * xj;
    yk -= val * yj;
    zk -= val * zj;
    val = Math.sqrt(xk * xk + yk * yk + zk * zk);

    if (val === 0.0) {
      /* bad */
      return null;
    }

    xk /= val;
    yk /= val;
    zk /= val;
  }

  Q[0][0] = xi;
  Q[0][1] = xj;
  Q[0][2] = xk;
  Q[1][0] = yi;
  Q[1][1] = yj;
  Q[1][2] = yk;
  Q[2][0] = zi;
  Q[2][1] = zj;
  Q[2][2] = zk;
  /* at this point, Q is the rotation matrix from the (i,j,k) to (x,y,z) axes */

  detQ = this.nifti_mat33_determ(Q);

  if (detQ === 0.0) {
    /* shouldn't happen unless user is a DUFIS */
    return null;
  }
  /* Build and test all possible +1/-1 coordinate permutation matrices P;
   then find the P such that the rotation matrix M=PQ is closest to the
   identity, in the sense of M having the smallest total rotation angle. */

  /* Despite the formidable looking 6 nested loops, there are
   only 3*3*3*2*2*2 = 216 passes, which will run very quickly. */


  vbest = -666.0;
  ibest = pbest = qbest = rbest = 1;
  jbest = 2;
  kbest = 3;

  for (i = 1; i <= 3; i += 1) {
    /* i = column number to use for row #1 */
    for (j = 1; j <= 3; j += 1) {
      /* j = column number to use for row #2 */
      if (i !== j) {
        for (k = 1; k <= 3; k += 1) {
          /* k = column number to use for row #3 */
          if (!(i === k || j === k)) {
            P[0][0] = P[0][1] = P[0][2] = P[1][0] = P[1][1] = P[1][2] = P[2][0] = P[2][1] = P[2][2] = 0.0;

            for (p = -1; p <= 1; p += 2) {
              /* p,q,r are -1 or +1      */
              for (q = -1; q <= 1; q += 2) {
                /* and go into rows #1,2,3 */
                for (r = -1; r <= 1; r += 2) {
                  P[0][i - 1] = p;
                  P[1][j - 1] = q;
                  P[2][k - 1] = r;
                  detP = this.nifti_mat33_determ(P);
                  /* sign of permutation */

                  if (detP * detQ > 0.0) {
                    M = this.nifti_mat33_mul(P, Q);
                    /* angle of M rotation = 2.0*acos(0.5*sqrt(1.0+trace(M)))       */

                    /* we want largest trace(M) == smallest angle == M nearest to I */

                    val = M[0][0] + M[1][1] + M[2][2];
                    /* trace */

                    if (val > vbest) {
                      vbest = val;
                      ibest = i;
                      jbest = j;
                      kbest = k;
                      pbest = p;
                      qbest = q;
                      rbest = r;
                    }
                  }
                  /* doesn't match sign of Q */

                }
              }
            }
          }
        }
      }
    }
  }
  /* At this point ibest is 1 or 2 or 3; pbest is -1 or +1; etc.
    The matrix P that corresponds is the best permutation approximation
   to Q-inverse; that is, P (approximately) takes (x,y,z) coordinates
   to the (i,j,k) axes.
    For example, the first row of P (which contains pbest in column ibest)
   determines the way the i axis points relative to the anatomical
   (x,y,z) axes.  If ibest is 2, then the i axis is along the y axis,
   which is direction P2A (if pbest > 0) or A2P (if pbest < 0).
    So, using ibest and pbest, we can assign the output code for
   the i axis.  Mutatis mutandis for the j and k axes, of course. */


  iChar = jChar = kChar = iSense = jSense = kSense = 0;

  switch (ibest * pbest) {
    case 1:
      /*i = NIFTI_L2R*/
      iChar = 'X';
      iSense = '+';
      break;

    case -1:
      /*i = NIFTI_R2L*/
      iChar = 'X';
      iSense = '-';
      break;

    case 2:
      /*i = NIFTI_P2A*/
      iChar = 'Y';
      iSense = '+';
      break;

    case -2:
      /*i = NIFTI_A2P*/
      iChar = 'Y';
      iSense = '-';
      break;

    case 3:
      /*i = NIFTI_I2S*/
      iChar = 'Z';
      iSense = '+';
      break;

    case -3:
      /*i = NIFTI_S2I*/
      iChar = 'Z';
      iSense = '-';
      break;
  }

  switch (jbest * qbest) {
    case 1:
      /*j = NIFTI_L2R*/
      jChar = 'X';
      jSense = '+';
      break;

    case -1:
      /*j = NIFTI_R2L*/
      jChar = 'X';
      jSense = '-';
      break;

    case 2:
      /*j = NIFTI_P2A*/
      jChar = 'Y';
      jSense = '+';
      break;

    case -2:
      /*j = NIFTI_A2P*/
      jChar = 'Y';
      jSense = '-';
      break;

    case 3:
      /*j = NIFTI_I2S*/
      jChar = 'Z';
      jSense = '+';
      break;

    case -3:
      /*j = NIFTI_S2I*/
      jChar = 'Z';
      jSense = '-';
      break;
  }

  switch (kbest * rbest) {
    case 1:
      /*k = NIFTI_L2R*/
      kChar = 'X';
      kSense = '+';
      break;

    case -1:
      /*k = NIFTI_R2L*/
      kChar = 'X';
      kSense = '-';
      break;

    case 2:
      /*k = NIFTI_P2A*/
      kChar = 'Y';
      kSense = '+';
      break;

    case -2:
      /*k = NIFTI_A2P*/
      kChar = 'Y';
      kSense = '-';
      break;

    case 3:
      /*k = NIFTI_I2S*/
      kChar = 'Z';
      kSense = '+';
      break;

    case -3:
      /*k = NIFTI_S2I*/
      kChar = 'Z';
      kSense = '-';
      break;
  }

  return iChar + jChar + kChar + iSense + jSense + kSense;
};

nifti.NIFTI1.prototype.nifti_mat33_mul = function (A, B) {
  var C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      i,
      j;

  for (i = 0; i < 3; i += 1) {
    for (j = 0; j < 3; j += 1) {
      C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
    }
  }

  return C;
};

nifti.NIFTI1.prototype.nifti_mat33_determ = function (R) {
  var r11, r12, r13, r21, r22, r23, r31, r32, r33;
  /*  INPUT MATRIX:  */

  r11 = R[0][0];
  r12 = R[0][1];
  r13 = R[0][2];
  r21 = R[1][0];
  r22 = R[1][1];
  r23 = R[1][2];
  r31 = R[2][0];
  r32 = R[2][1];
  r33 = R[2][2];
  return r11 * r22 * r33 - r11 * r32 * r23 - r21 * r12 * r33 + r21 * r32 * r13 + r31 * r12 * r23 - r31 * r22 * r13;
};
/**
 * Returns the byte index of the extension.
 * @returns {number}
 */


nifti.NIFTI1.prototype.getExtensionLocation = function () {
  return nifti.NIFTI1.MAGIC_COOKIE + 4;
};
/**
 * Returns the extension size.
 * @param {DataView} data
 * @returns {number}
 */


nifti.NIFTI1.prototype.getExtensionSize = function (data) {
  return nifti.Utils.getIntAt(data, this.getExtensionLocation(), this.littleEndian);
};
/**
 * Returns the extension code.
 * @param {DataView} data
 * @returns {number}
 */


nifti.NIFTI1.prototype.getExtensionCode = function (data) {
  return nifti.Utils.getIntAt(data, this.getExtensionLocation() + 4, this.littleEndian);
};

if (module.exports) {
  module.exports = nifti.NIFTI1;
}
});

/*jslint browser: true, node: true */

var nifti2 = createCommonjsModule(function (module) {
/*** Imports ***/

var nifti = nifti || {};
nifti.Utils = nifti.Utils || (typeof commonjsRequire !== 'undefined' ? utilities : null);
nifti.NIFTI1 = nifti.NIFTI1 || (typeof commonjsRequire !== 'undefined' ? nifti1 : null);
/*** Constructor ***/

/**
 * The NIFTI2 constructor.
 * @constructor
 * @property {boolean} littleEndian
 * @property {number} dim_info
 * @property {number[]} dims - image dimensions
 * @property {number} intent_p1
 * @property {number} intent_p2
 * @property {number} intent_p3
 * @property {number} intent_code
 * @property {number} datatypeCode
 * @property {number} numBitsPerVoxel
 * @property {number} slice_start
 * @property {number} slice_end
 * @property {number} slice_code
 * @property {number[]} pixDims - voxel dimensions
 * @property {number} vox_offset
 * @property {number} scl_slope
 * @property {number} scl_inter
 * @property {number} xyzt_units
 * @property {number} cal_max
 * @property {number} cal_min
 * @property {number} slice_duration
 * @property {number} toffset
 * @property {string} description
 * @property {string} aux_file
 * @property {string} intent_name
 * @property {number} qform_code
 * @property {number} sform_code
 * @property {number} quatern_b
 * @property {number} quatern_c
 * @property {number} quatern_d
 * @property {number} quatern_x
 * @property {number} quatern_y
 * @property {number} quatern_z
 * @property {Array.<Array.<number>>} affine
 * @property {string} magic
 * @property {number[]} extensionFlag
 * @type {Function}
 */

nifti.NIFTI2 = nifti.NIFTI2 || function () {
  this.littleEndian = false;
  this.dim_info = 0;
  this.dims = [];
  this.intent_p1 = 0;
  this.intent_p2 = 0;
  this.intent_p3 = 0;
  this.intent_code = 0;
  this.datatypeCode = 0;
  this.numBitsPerVoxel = 0;
  this.slice_start = 0;
  this.slice_end = 0;
  this.slice_code = 0;
  this.pixDims = [];
  this.vox_offset = 0;
  this.scl_slope = 1;
  this.scl_inter = 0;
  this.xyzt_units = 0;
  this.cal_max = 0;
  this.cal_min = 0;
  this.slice_duration = 0;
  this.toffset = 0;
  this.description = "";
  this.aux_file = "";
  this.intent_name = "";
  this.qform_code = 0;
  this.sform_code = 0;
  this.quatern_b = 0;
  this.quatern_c = 0;
  this.quatern_d = 0;
  this.qoffset_x = 0;
  this.qoffset_y = 0;
  this.qoffset_z = 0;
  this.affine = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  this.magic = 0;
  this.extensionFlag = [0, 0, 0, 0];
};
/*** Static Pseudo-constants ***/


nifti.NIFTI2.MAGIC_COOKIE = 540;
nifti.NIFTI2.MAGIC_NUMBER_LOCATION = 4;
nifti.NIFTI2.MAGIC_NUMBER = [0x6E, 0x2B, 0x32, 0, 0x0D, 0x0A, 0x1A, 0x0A]; // n+2\0

/*** Prototype Methods ***/

/**
 * Reads the header data.
 * @param {ArrayBuffer} data
 */

nifti.NIFTI2.prototype.readHeader = function (data) {
  var rawData = new DataView(data),
      magicCookieVal = nifti.Utils.getIntAt(rawData, 0, this.littleEndian),
      ctr,
      ctrOut,
      ctrIn,
      index;

  if (magicCookieVal !== nifti.NIFTI2.MAGIC_COOKIE) {
    // try as little endian
    this.littleEndian = true;
    magicCookieVal = nifti.Utils.getIntAt(rawData, 0, this.littleEndian);
  }

  if (magicCookieVal !== nifti.NIFTI2.MAGIC_COOKIE) {
    throw new Error("This does not appear to be a NIFTI file!");
  }

  this.datatypeCode = nifti.Utils.getShortAt(rawData, 12, this.littleEndian);
  this.numBitsPerVoxel = nifti.Utils.getShortAt(rawData, 14, this.littleEndian);

  for (ctr = 0; ctr < 8; ctr += 1) {
    index = 16 + ctr * 8;
    this.dims[ctr] = nifti.Utils.getLongAt(rawData, index, this.littleEndian);
  }

  this.intent_p1 = nifti.Utils.getDoubleAt(rawData, 80, this.littleEndian);
  this.intent_p2 = nifti.Utils.getDoubleAt(rawData, 88, this.littleEndian);
  this.intent_p3 = nifti.Utils.getDoubleAt(rawData, 96, this.littleEndian);

  for (ctr = 0; ctr < 8; ctr += 1) {
    index = 104 + ctr * 8;
    this.pixDims[ctr] = nifti.Utils.getDoubleAt(rawData, index, this.littleEndian);
  }

  this.vox_offset = nifti.Utils.getLongAt(rawData, 168, this.littleEndian);
  this.scl_slope = nifti.Utils.getDoubleAt(rawData, 176, this.littleEndian);
  this.scl_inter = nifti.Utils.getDoubleAt(rawData, 184, this.littleEndian);
  this.cal_max = nifti.Utils.getDoubleAt(rawData, 192, this.littleEndian);
  this.cal_min = nifti.Utils.getDoubleAt(rawData, 200, this.littleEndian);
  this.slice_duration = nifti.Utils.getDoubleAt(rawData, 208, this.littleEndian);
  this.toffset = nifti.Utils.getDoubleAt(rawData, 216, this.littleEndian);
  this.slice_start = nifti.Utils.getLongAt(rawData, 224, this.littleEndian);
  this.slice_end = nifti.Utils.getLongAt(rawData, 232, this.littleEndian);
  this.description = nifti.Utils.getStringAt(rawData, 240, 240 + 80);
  this.aux_file = nifti.Utils.getStringAt(rawData, 320, 320 + 24);
  this.qform_code = nifti.Utils.getIntAt(rawData, 344, this.littleEndian);
  this.sform_code = nifti.Utils.getIntAt(rawData, 348, this.littleEndian);
  this.quatern_b = nifti.Utils.getDoubleAt(rawData, 352, this.littleEndian);
  this.quatern_c = nifti.Utils.getDoubleAt(rawData, 360, this.littleEndian);
  this.quatern_d = nifti.Utils.getDoubleAt(rawData, 368, this.littleEndian);
  this.qoffset_x = nifti.Utils.getDoubleAt(rawData, 376, this.littleEndian);
  this.qoffset_y = nifti.Utils.getDoubleAt(rawData, 384, this.littleEndian);
  this.qoffset_z = nifti.Utils.getDoubleAt(rawData, 392, this.littleEndian);

  for (ctrOut = 0; ctrOut < 3; ctrOut += 1) {
    for (ctrIn = 0; ctrIn < 4; ctrIn += 1) {
      index = 400 + (ctrOut * 4 + ctrIn) * 8;
      this.affine[ctrOut][ctrIn] = nifti.Utils.getDoubleAt(rawData, index, this.littleEndian);
    }
  }

  this.affine[3][0] = 0;
  this.affine[3][1] = 0;
  this.affine[3][2] = 0;
  this.affine[3][3] = 1;
  this.slice_code = nifti.Utils.getIntAt(rawData, 496, this.littleEndian);
  this.xyzt_units = nifti.Utils.getIntAt(rawData, 500, this.littleEndian);
  this.intent_code = nifti.Utils.getIntAt(rawData, 504, this.littleEndian);
  this.intent_name = nifti.Utils.getStringAt(rawData, 508, 508 + 16);
  this.dim_info = nifti.Utils.getByteAt(rawData, 524);

  if (rawData.byteLength > nifti.NIFTI2.MAGIC_COOKIE) {
    this.extensionFlag[0] = nifti.Utils.getByteAt(rawData, 540);
    this.extensionFlag[1] = nifti.Utils.getByteAt(rawData, 540 + 1);
    this.extensionFlag[2] = nifti.Utils.getByteAt(rawData, 540 + 2);
    this.extensionFlag[3] = nifti.Utils.getByteAt(rawData, 540 + 3);

    if (this.extensionFlag[0]) {
      this.extensionSize = this.getExtensionSize(rawData);
      this.extensionCode = this.getExtensionCode(rawData);
    }
  }
};
/**
 * Returns a formatted string of header fields.
 * @returns {string}
 */


nifti.NIFTI2.prototype.toFormattedString = function () {
  var fmt = nifti.Utils.formatNumber,
      string = "";
  string += "Datatype = " + +this.datatypeCode + " (" + this.getDatatypeCodeString(this.datatypeCode) + ")\n";
  string += "Bits Per Voxel = " + " = " + this.numBitsPerVoxel + "\n";
  string += "Image Dimensions" + " (1-8): " + this.dims[0] + ", " + this.dims[1] + ", " + this.dims[2] + ", " + this.dims[3] + ", " + this.dims[4] + ", " + this.dims[5] + ", " + this.dims[6] + ", " + this.dims[7] + "\n";
  string += "Intent Parameters (1-3): " + this.intent_p1 + ", " + this.intent_p2 + ", " + this.intent_p3 + "\n";
  string += "Voxel Dimensions (1-8): " + fmt(this.pixDims[0]) + ", " + fmt(this.pixDims[1]) + ", " + fmt(this.pixDims[2]) + ", " + fmt(this.pixDims[3]) + ", " + fmt(this.pixDims[4]) + ", " + fmt(this.pixDims[5]) + ", " + fmt(this.pixDims[6]) + ", " + fmt(this.pixDims[7]) + "\n";
  string += "Image Offset = " + this.vox_offset + "\n";
  string += "Data Scale:  Slope = " + fmt(this.scl_slope) + "  Intercept = " + fmt(this.scl_inter) + "\n";
  string += "Display Range:  Max = " + fmt(this.cal_max) + "  Min = " + fmt(this.cal_min) + "\n";
  string += "Slice Duration = " + this.slice_duration + "\n";
  string += "Time Axis Shift = " + this.toffset + "\n";
  string += "Slice Start = " + this.slice_start + "\n";
  string += "Slice End = " + this.slice_end + "\n";
  string += "Description: \"" + this.description + "\"\n";
  string += "Auxiliary File: \"" + this.aux_file + "\"\n";
  string += "Q-Form Code = " + this.qform_code + " (" + this.getTransformCodeString(this.qform_code) + ")\n";
  string += "S-Form Code = " + this.sform_code + " (" + this.getTransformCodeString(this.sform_code) + ")\n";
  string += "Quaternion Parameters:  " + "b = " + fmt(this.quatern_b) + "  " + "c = " + fmt(this.quatern_c) + "  " + "d = " + fmt(this.quatern_d) + "\n";
  string += "Quaternion Offsets:  " + "x = " + this.qoffset_x + "  " + "y = " + this.qoffset_y + "  " + "z = " + this.qoffset_z + "\n";
  string += "S-Form Parameters X: " + fmt(this.affine[0][0]) + ", " + fmt(this.affine[0][1]) + ", " + fmt(this.affine[0][2]) + ", " + fmt(this.affine[0][3]) + "\n";
  string += "S-Form Parameters Y: " + fmt(this.affine[1][0]) + ", " + fmt(this.affine[1][1]) + ", " + fmt(this.affine[1][2]) + ", " + fmt(this.affine[1][3]) + "\n";
  string += "S-Form Parameters Z: " + fmt(this.affine[2][0]) + ", " + fmt(this.affine[2][1]) + ", " + fmt(this.affine[2][2]) + ", " + fmt(this.affine[2][3]) + "\n";
  string += "Slice Code = " + this.slice_code + "\n";
  string += "Units Code = " + this.xyzt_units + " (" + this.getUnitsCodeString(nifti.NIFTI1.SPATIAL_UNITS_MASK & this.xyzt_units) + ", " + this.getUnitsCodeString(nifti.NIFTI1.TEMPORAL_UNITS_MASK & this.xyzt_units) + ")\n";
  string += "Intent Code = " + this.intent_code + "\n";
  string += "Intent Name: \"" + this.intent_name + "\"\n";
  string += "Dim Info = " + this.dim_info + "\n";
  return string;
};
/**
 * Returns the byte index of the extension.
 * @returns {number}
 */


nifti.NIFTI2.prototype.getExtensionLocation = function () {
  return nifti.NIFTI2.MAGIC_COOKIE + 4;
};
/**
 * Returns the extension size.
 * @param {DataView} data
 * @returns {number}
 */


nifti.NIFTI2.prototype.getExtensionSize = nifti.NIFTI1.prototype.getExtensionSize;
/**
 * Returns the extension code.
 * @param {DataView} data
 * @returns {number}
 */

nifti.NIFTI2.prototype.getExtensionCode = nifti.NIFTI1.prototype.getExtensionCode;
/**
 * Returns a human-readable string of datatype.
 * @param {number} code
 * @returns {string}
 */

nifti.NIFTI2.prototype.getDatatypeCodeString = nifti.NIFTI1.prototype.getDatatypeCodeString;
/**
 * Returns a human-readable string of transform type.
 * @param {number} code
 * @returns {string}
 */

nifti.NIFTI2.prototype.getTransformCodeString = nifti.NIFTI1.prototype.getTransformCodeString;
/**
 * Returns a human-readable string of spatial and temporal units.
 * @param {number} code
 * @returns {string}
 */

nifti.NIFTI2.prototype.getUnitsCodeString = nifti.NIFTI1.prototype.getUnitsCodeString;
/**
 * Returns the qform matrix.
 * @returns {Array.<Array.<number>>}
 */

nifti.NIFTI2.prototype.getQformMat = nifti.NIFTI1.prototype.getQformMat;
/**
 * Converts qform to an affine.  (See http://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1_io.c)
 * @param {number} qb
 * @param {number} qc
 * @param {number} qd
 * @param {number} qx
 * @param {number} qy
 * @param {number} qz
 * @param {number} dx
 * @param {number} dy
 * @param {number} dz
 * @param {number} qfac
 * @returns {Array.<Array.<number>>}
 */

nifti.NIFTI2.prototype.convertNiftiQFormToNiftiSForm = nifti.NIFTI1.prototype.convertNiftiQFormToNiftiSForm;
/**
 * Converts sform to an orientation string (e.g., XYZ+--).  (See http://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1_io.c)
 * @param {Array.<Array.<number>>} R
 * @returns {string}
 */

nifti.NIFTI2.prototype.convertNiftiSFormToNEMA = nifti.NIFTI1.prototype.convertNiftiSFormToNEMA;
nifti.NIFTI2.prototype.nifti_mat33_mul = nifti.NIFTI1.prototype.nifti_mat33_mul;
nifti.NIFTI2.prototype.nifti_mat33_determ = nifti.NIFTI1.prototype.nifti_mat33_determ;

if (module.exports) {
  module.exports = nifti.NIFTI2;
}
});

// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

/* eslint-disable space-unary-ops */

/* Public constants ==========================================================*/

/* ===========================================================================*/
//const Z_FILTERED          = 1;
//const Z_HUFFMAN_ONLY      = 2;
//const Z_RLE               = 3;

const Z_FIXED$1 = 4; //const Z_DEFAULT_STRATEGY  = 0;

/* Possible values of the data_type field (though see inflate()) */

const Z_BINARY = 0;
const Z_TEXT = 1; //const Z_ASCII             = 1; // = Z_TEXT

const Z_UNKNOWN$1 = 2;
/*============================================================================*/

function zero$1(buf) {
  let len = buf.length;

  while (--len >= 0) {
    buf[len] = 0;
  }
} // From zutil.h


const STORED_BLOCK = 0;
const STATIC_TREES = 1;
const DYN_TREES = 2;
/* The three kinds of block type */

const MIN_MATCH$1 = 3;
const MAX_MATCH$1 = 258;
/* The minimum and maximum match lengths */
// From deflate.h

/* ===========================================================================
 * Internal compression state.
 */

const LENGTH_CODES$1 = 29;
/* number of length codes, not counting the special END_BLOCK code */

const LITERALS$1 = 256;
/* number of literal bytes 0..255 */

const L_CODES$1 = LITERALS$1 + 1 + LENGTH_CODES$1;
/* number of Literal or Length codes, including the END_BLOCK code */

const D_CODES$1 = 30;
/* number of distance codes */

const BL_CODES$1 = 19;
/* number of codes used to transfer the bit lengths */

const HEAP_SIZE$1 = 2 * L_CODES$1 + 1;
/* maximum heap size */

const MAX_BITS$1 = 15;
/* All codes must not exceed MAX_BITS bits */

const Buf_size = 16;
/* size of bit buffer in bi_buf */

/* ===========================================================================
 * Constants
 */

const MAX_BL_BITS = 7;
/* Bit length codes must not exceed MAX_BL_BITS bits */

const END_BLOCK = 256;
/* end of block literal code */

const REP_3_6 = 16;
/* repeat previous bit length 3-6 times (2 bits of repeat count) */

const REPZ_3_10 = 17;
/* repeat a zero length 3-10 times  (3 bits of repeat count) */

const REPZ_11_138 = 18;
/* repeat a zero length 11-138 times  (7 bits of repeat count) */

/* eslint-disable comma-spacing,array-bracket-spacing */

const extra_lbits =
/* extra bits for each length code */
new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]);
const extra_dbits =
/* extra bits for each distance code */
new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]);
const extra_blbits =
/* extra bits for each bit length code */
new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]);
const bl_order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
/* eslint-enable comma-spacing,array-bracket-spacing */

/* The lengths of the bit length codes are sent in order of decreasing
 * probability, to avoid transmitting the lengths for unused bit length codes.
 */

/* ===========================================================================
 * Local data. These are initialized only once.
 */
// We pre-fill arrays with 0 to avoid uninitialized gaps

const DIST_CODE_LEN = 512;
/* see definition of array dist_code below */
// !!!! Use flat array instead of structure, Freq = i*2, Len = i*2+1

const static_ltree = new Array((L_CODES$1 + 2) * 2);
zero$1(static_ltree);
/* The static literal tree. Since the bit lengths are imposed, there is no
 * need for the L_CODES extra codes used during heap construction. However
 * The codes 286 and 287 are needed to build a canonical tree (see _tr_init
 * below).
 */

const static_dtree = new Array(D_CODES$1 * 2);
zero$1(static_dtree);
/* The static distance tree. (Actually a trivial tree since all codes use
 * 5 bits.)
 */

const _dist_code = new Array(DIST_CODE_LEN);

zero$1(_dist_code);
/* Distance codes. The first 256 values correspond to the distances
 * 3 .. 258, the last 256 values correspond to the top 8 bits of
 * the 15 bit distances.
 */

const _length_code = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);

zero$1(_length_code);
/* length code for each normalized match length (0 == MIN_MATCH) */

const base_length = new Array(LENGTH_CODES$1);
zero$1(base_length);
/* First normalized length for each code (0 = MIN_MATCH) */

const base_dist = new Array(D_CODES$1);
zero$1(base_dist);
/* First normalized distance for each code (0 = distance of 1) */

function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
  this.static_tree = static_tree;
  /* static tree or NULL */

  this.extra_bits = extra_bits;
  /* extra bits for each code or NULL */

  this.extra_base = extra_base;
  /* base index for extra_bits */

  this.elems = elems;
  /* max number of elements in the tree */

  this.max_length = max_length;
  /* max bit length for the codes */
  // show if `static_tree` has data or dummy - needed for monomorphic objects

  this.has_stree = static_tree && static_tree.length;
}

let static_l_desc;
let static_d_desc;
let static_bl_desc;

function TreeDesc(dyn_tree, stat_desc) {
  this.dyn_tree = dyn_tree;
  /* the dynamic tree */

  this.max_code = 0;
  /* largest code with non zero frequency */

  this.stat_desc = stat_desc;
  /* the corresponding static tree */
}

const d_code = dist => {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
};
/* ===========================================================================
 * Output a short LSB first on the stream.
 * IN assertion: there is enough room in pendingBuf.
 */


const put_short = (s, w) => {
  //    put_byte(s, (uch)((w) & 0xff));
  //    put_byte(s, (uch)((ush)(w) >> 8));
  s.pending_buf[s.pending++] = w & 0xff;
  s.pending_buf[s.pending++] = w >>> 8 & 0xff;
};
/* ===========================================================================
 * Send a value on a given number of bits.
 * IN assertion: length <= 16 and value fits in length bits.
 */


const send_bits = (s, value, length) => {
  if (s.bi_valid > Buf_size - length) {
    s.bi_buf |= value << s.bi_valid & 0xffff;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> Buf_size - s.bi_valid;
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= value << s.bi_valid & 0xffff;
    s.bi_valid += length;
  }
};

const send_code = (s, c, tree) => {
  send_bits(s, tree[c * 2]
  /*.Code*/
  , tree[c * 2 + 1]
  /*.Len*/
  );
};
/* ===========================================================================
 * Reverse the first len bits of a code, using straightforward code (a faster
 * method would use a table)
 * IN assertion: 1 <= len <= 15
 */


const bi_reverse = (code, len) => {
  let res = 0;

  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);

  return res >>> 1;
};
/* ===========================================================================
 * Flush the bit buffer, keeping at most 7 bits in it.
 */


const bi_flush = s => {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;
  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 0xff;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
};
/* ===========================================================================
 * Compute the optimal bit lengths for a tree and update the total bit length
 * for the current block.
 * IN assertion: the fields freq and dad are set, heap[heap_max] and
 *    above are the tree nodes sorted by increasing frequency.
 * OUT assertions: the field len is set to the optimal bit length, the
 *     array bl_count contains the frequencies for each bit length.
 *     The length opt_len is updated; static_len is also updated if stree is
 *     not null.
 */


const gen_bitlen = (s, desc) => //    deflate_state *s;
//    tree_desc *desc;    /* the tree descriptor */
{
  const tree = desc.dyn_tree;
  const max_code = desc.max_code;
  const stree = desc.stat_desc.static_tree;
  const has_stree = desc.stat_desc.has_stree;
  const extra = desc.stat_desc.extra_bits;
  const base = desc.stat_desc.extra_base;
  const max_length = desc.stat_desc.max_length;
  let h;
  /* heap index */

  let n, m;
  /* iterate over the tree elements */

  let bits;
  /* bit length */

  let xbits;
  /* extra bits */

  let f;
  /* frequency */

  let overflow = 0;
  /* number of elements with bit length too large */

  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    s.bl_count[bits] = 0;
  }
  /* In a first pass, compute the optimal bit lengths (which may
   * overflow in the case of the bit length tree).
   */


  tree[s.heap[s.heap_max] * 2 + 1]
  /*.Len*/
  = 0;
  /* root of the heap */

  for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
    n = s.heap[h];
    bits = tree[tree[n * 2 + 1]
    /*.Dad*/
    * 2 + 1]
    /*.Len*/
    + 1;

    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }

    tree[n * 2 + 1]
    /*.Len*/
    = bits;
    /* We overwrite tree[n].Dad which is no longer needed */

    if (n > max_code) {
      continue;
    }
    /* not a leaf node */


    s.bl_count[bits]++;
    xbits = 0;

    if (n >= base) {
      xbits = extra[n - base];
    }

    f = tree[n * 2]
    /*.Freq*/
    ;
    s.opt_len += f * (bits + xbits);

    if (has_stree) {
      s.static_len += f * (stree[n * 2 + 1]
      /*.Len*/
      + xbits);
    }
  }

  if (overflow === 0) {
    return;
  } // Trace((stderr,"\nbit length overflow\n"));

  /* This happens for example on obj2 and pic of the Calgary corpus */

  /* Find the first bit length which could increase: */


  do {
    bits = max_length - 1;

    while (s.bl_count[bits] === 0) {
      bits--;
    }

    s.bl_count[bits]--;
    /* move one leaf down the tree */

    s.bl_count[bits + 1] += 2;
    /* move one overflow item as its brother */

    s.bl_count[max_length]--;
    /* The brother of the overflow item also moves one step up,
     * but this does not affect bl_count[max_length]
     */

    overflow -= 2;
  } while (overflow > 0);
  /* Now recompute all bit lengths, scanning in increasing frequency.
   * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
   * lengths instead of fixing only the wrong ones. This idea is taken
   * from 'ar' written by Haruhiko Okumura.)
   */


  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];

    while (n !== 0) {
      m = s.heap[--h];

      if (m > max_code) {
        continue;
      }

      if (tree[m * 2 + 1]
      /*.Len*/
      !== bits) {
        // Trace((stderr,"code %d bits %d->%d\n", m, tree[m].Len, bits));
        s.opt_len += (bits - tree[m * 2 + 1]
        /*.Len*/
        ) * tree[m * 2]
        /*.Freq*/
        ;
        tree[m * 2 + 1]
        /*.Len*/
        = bits;
      }

      n--;
    }
  }
};
/* ===========================================================================
 * Generate the codes for a given tree and bit counts (which need not be
 * optimal).
 * IN assertion: the array bl_count contains the bit length statistics for
 * the given tree and the field len is set for all tree elements.
 * OUT assertion: the field code is set for all tree elements of non
 *     zero code length.
 */


const gen_codes = (tree, max_code, bl_count) => //    ct_data *tree;             /* the tree to decorate */
//    int max_code;              /* largest code with non zero frequency */
//    ushf *bl_count;            /* number of codes at each bit length */
{
  const next_code = new Array(MAX_BITS$1 + 1);
  /* next code value for each bit length */

  let code = 0;
  /* running code value */

  let bits;
  /* bit index */

  let n;
  /* code index */

  /* The distribution counts are first used to generate the code values
   * without bit reversal.
   */

  for (bits = 1; bits <= MAX_BITS$1; bits++) {
    next_code[bits] = code = code + bl_count[bits - 1] << 1;
  }
  /* Check that the bit counts in bl_count are consistent. The last code
   * must be all ones.
   */
  //Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
  //        "inconsistent bit counts");
  //Tracev((stderr,"\ngen_codes: max_code %d ", max_code));


  for (n = 0; n <= max_code; n++) {
    let len = tree[n * 2 + 1]
    /*.Len*/
    ;

    if (len === 0) {
      continue;
    }
    /* Now reverse the bits */


    tree[n * 2]
    /*.Code*/
    = bi_reverse(next_code[len]++, len); //Tracecv(tree != static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ",
    //     n, (isgraph(n) ? n : ' '), len, tree[n].Code, next_code[len]-1));
  }
};
/* ===========================================================================
 * Initialize the various 'constant' tables.
 */


const tr_static_init = () => {
  let n;
  /* iterates over tree elements */

  let bits;
  /* bit counter */

  let length;
  /* length value */

  let code;
  /* code value */

  let dist;
  /* distance index */

  const bl_count = new Array(MAX_BITS$1 + 1);
  /* number of codes at each bit length for an optimal tree */
  // do check in _tr_init()
  //if (static_init_done) return;

  /* For some embedded targets, global variables are not initialized: */

  /*#ifdef NO_INIT_GLOBAL_POINTERS
    static_l_desc.static_tree = static_ltree;
    static_l_desc.extra_bits = extra_lbits;
    static_d_desc.static_tree = static_dtree;
    static_d_desc.extra_bits = extra_dbits;
    static_bl_desc.extra_bits = extra_blbits;
  #endif*/

  /* Initialize the mapping length (0..255) -> length code (0..28) */

  length = 0;

  for (code = 0; code < LENGTH_CODES$1 - 1; code++) {
    base_length[code] = length;

    for (n = 0; n < 1 << extra_lbits[code]; n++) {
      _length_code[length++] = code;
    }
  } //Assert (length == 256, "tr_static_init: length != 256");

  /* Note that the length 255 (match length 258) can be represented
   * in two different ways: code 284 + 5 bits or code 285, so we
   * overwrite length_code[255] to use the best encoding:
   */


  _length_code[length - 1] = code;
  /* Initialize the mapping dist (0..32K) -> dist code (0..29) */

  dist = 0;

  for (code = 0; code < 16; code++) {
    base_dist[code] = dist;

    for (n = 0; n < 1 << extra_dbits[code]; n++) {
      _dist_code[dist++] = code;
    }
  } //Assert (dist == 256, "tr_static_init: dist != 256");


  dist >>= 7;
  /* from now on, all distances are divided by 128 */

  for (; code < D_CODES$1; code++) {
    base_dist[code] = dist << 7;

    for (n = 0; n < 1 << extra_dbits[code] - 7; n++) {
      _dist_code[256 + dist++] = code;
    }
  } //Assert (dist == 256, "tr_static_init: 256+dist != 512");

  /* Construct the codes of the static literal tree */


  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    bl_count[bits] = 0;
  }

  n = 0;

  while (n <= 143) {
    static_ltree[n * 2 + 1]
    /*.Len*/
    = 8;
    n++;
    bl_count[8]++;
  }

  while (n <= 255) {
    static_ltree[n * 2 + 1]
    /*.Len*/
    = 9;
    n++;
    bl_count[9]++;
  }

  while (n <= 279) {
    static_ltree[n * 2 + 1]
    /*.Len*/
    = 7;
    n++;
    bl_count[7]++;
  }

  while (n <= 287) {
    static_ltree[n * 2 + 1]
    /*.Len*/
    = 8;
    n++;
    bl_count[8]++;
  }
  /* Codes 286 and 287 do not exist, but we must include them in the
   * tree construction to get a canonical Huffman tree (longest code
   * all ones)
   */


  gen_codes(static_ltree, L_CODES$1 + 1, bl_count);
  /* The static distance tree is trivial: */

  for (n = 0; n < D_CODES$1; n++) {
    static_dtree[n * 2 + 1]
    /*.Len*/
    = 5;
    static_dtree[n * 2]
    /*.Code*/
    = bi_reverse(n, 5);
  } // Now data ready and we can init static trees


  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS$1 + 1, L_CODES$1, MAX_BITS$1);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES$1, MAX_BITS$1);
  static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES$1, MAX_BL_BITS); //static_init_done = true;
};
/* ===========================================================================
 * Initialize a new block.
 */


const init_block = s => {
  let n;
  /* iterates over tree elements */

  /* Initialize the trees. */

  for (n = 0; n < L_CODES$1; n++) {
    s.dyn_ltree[n * 2]
    /*.Freq*/
    = 0;
  }

  for (n = 0; n < D_CODES$1; n++) {
    s.dyn_dtree[n * 2]
    /*.Freq*/
    = 0;
  }

  for (n = 0; n < BL_CODES$1; n++) {
    s.bl_tree[n * 2]
    /*.Freq*/
    = 0;
  }

  s.dyn_ltree[END_BLOCK * 2]
  /*.Freq*/
  = 1;
  s.opt_len = s.static_len = 0;
  s.last_lit = s.matches = 0;
};
/* ===========================================================================
 * Flush the bit buffer and align the output on a byte boundary
 */


const bi_windup = s => {
  if (s.bi_valid > 8) {
    put_short(s, s.bi_buf);
  } else if (s.bi_valid > 0) {
    //put_byte(s, (Byte)s->bi_buf);
    s.pending_buf[s.pending++] = s.bi_buf;
  }

  s.bi_buf = 0;
  s.bi_valid = 0;
};
/* ===========================================================================
 * Copy a stored block, storing first the length and its
 * one's complement if requested.
 */


const copy_block = (s, buf, len, header) => //DeflateState *s;
//charf    *buf;    /* the input data */
//unsigned len;     /* its length */
//int      header;  /* true if block header must be written */
{
  bi_windup(s);
  /* align on byte boundary */

  if (header) {
    put_short(s, len);
    put_short(s, ~len);
  } //  while (len--) {
  //    put_byte(s, *buf++);
  //  }


  s.pending_buf.set(s.window.subarray(buf, buf + len), s.pending);
  s.pending += len;
};
/* ===========================================================================
 * Compares to subtrees, using the tree depth as tie breaker when
 * the subtrees have equal frequency. This minimizes the worst case length.
 */


const smaller = (tree, n, m, depth) => {
  const _n2 = n * 2;

  const _m2 = m * 2;

  return tree[_n2]
  /*.Freq*/
  < tree[_m2]
  /*.Freq*/
  || tree[_n2]
  /*.Freq*/
  === tree[_m2]
  /*.Freq*/
  && depth[n] <= depth[m];
};
/* ===========================================================================
 * Restore the heap property by moving down the tree starting at node k,
 * exchanging a node with the smallest of its two sons if necessary, stopping
 * when the heap property is re-established (each father smaller than its
 * two sons).
 */


const pqdownheap = (s, tree, k) => //    deflate_state *s;
//    ct_data *tree;  /* the tree to restore */
//    int k;               /* node to move down */
{
  const v = s.heap[k];
  let j = k << 1;
  /* left son of k */

  while (j <= s.heap_len) {
    /* Set j to the smallest of the two sons: */
    if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
      j++;
    }
    /* Exit if v is smaller than both sons */


    if (smaller(tree, v, s.heap[j], s.depth)) {
      break;
    }
    /* Exchange v with the smallest son */


    s.heap[k] = s.heap[j];
    k = j;
    /* And continue down the tree, setting j to the left son of k */

    j <<= 1;
  }

  s.heap[k] = v;
}; // inlined manually
// const SMALLEST = 1;

/* ===========================================================================
 * Send the block data compressed using the given Huffman trees
 */


const compress_block = (s, ltree, dtree) => //    deflate_state *s;
//    const ct_data *ltree; /* literal tree */
//    const ct_data *dtree; /* distance tree */
{
  let dist;
  /* distance of matched string */

  let lc;
  /* match length or unmatched char (if dist == 0) */

  let lx = 0;
  /* running index in l_buf */

  let code;
  /* the code to send */

  let extra;
  /* number of extra bits to send */

  if (s.last_lit !== 0) {
    do {
      dist = s.pending_buf[s.d_buf + lx * 2] << 8 | s.pending_buf[s.d_buf + lx * 2 + 1];
      lc = s.pending_buf[s.l_buf + lx];
      lx++;

      if (dist === 0) {
        send_code(s, lc, ltree);
        /* send a literal byte */
        //Tracecv(isgraph(lc), (stderr," '%c' ", lc));
      } else {
        /* Here, lc is the match length - MIN_MATCH */
        code = _length_code[lc];
        send_code(s, code + LITERALS$1 + 1, ltree);
        /* send the length code */

        extra = extra_lbits[code];

        if (extra !== 0) {
          lc -= base_length[code];
          send_bits(s, lc, extra);
          /* send the extra length bits */
        }

        dist--;
        /* dist is now the match distance - 1 */

        code = d_code(dist); //Assert (code < D_CODES, "bad d_code");

        send_code(s, code, dtree);
        /* send the distance code */

        extra = extra_dbits[code];

        if (extra !== 0) {
          dist -= base_dist[code];
          send_bits(s, dist, extra);
          /* send the extra distance bits */
        }
      }
      /* literal or match pair ? */

      /* Check that the overlay between pending_buf and d_buf+l_buf is ok: */
      //Assert((uInt)(s->pending) < s->lit_bufsize + 2*lx,
      //       "pendingBuf overflow");

    } while (lx < s.last_lit);
  }

  send_code(s, END_BLOCK, ltree);
};
/* ===========================================================================
 * Construct one Huffman tree and assigns the code bit strings and lengths.
 * Update the total bit length for the current block.
 * IN assertion: the field freq is set for all tree elements.
 * OUT assertions: the fields len and code are set to the optimal bit length
 *     and corresponding code. The length opt_len is updated; static_len is
 *     also updated if stree is not null. The field max_code is set.
 */


const build_tree = (s, desc) => //    deflate_state *s;
//    tree_desc *desc; /* the tree descriptor */
{
  const tree = desc.dyn_tree;
  const stree = desc.stat_desc.static_tree;
  const has_stree = desc.stat_desc.has_stree;
  const elems = desc.stat_desc.elems;
  let n, m;
  /* iterate over heap elements */

  let max_code = -1;
  /* largest code with non zero frequency */

  let node;
  /* new node being created */

  /* Construct the initial heap, with least frequent element in
   * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
   * heap[0] is not used.
   */

  s.heap_len = 0;
  s.heap_max = HEAP_SIZE$1;

  for (n = 0; n < elems; n++) {
    if (tree[n * 2]
    /*.Freq*/
    !== 0) {
      s.heap[++s.heap_len] = max_code = n;
      s.depth[n] = 0;
    } else {
      tree[n * 2 + 1]
      /*.Len*/
      = 0;
    }
  }
  /* The pkzip format requires that at least one distance code exists,
   * and that at least one bit should be sent even if there is only one
   * possible code. So to avoid special checks later on we force at least
   * two codes of non zero frequency.
   */


  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
    tree[node * 2]
    /*.Freq*/
    = 1;
    s.depth[node] = 0;
    s.opt_len--;

    if (has_stree) {
      s.static_len -= stree[node * 2 + 1]
      /*.Len*/
      ;
    }
    /* node is 0 or 1 so it does not have extra bits */

  }

  desc.max_code = max_code;
  /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
   * establish sub-heaps of increasing lengths:
   */

  for (n = s.heap_len >> 1
  /*int /2*/
  ; n >= 1; n--) {
    pqdownheap(s, tree, n);
  }
  /* Construct the Huffman tree by repeatedly combining the least two
   * frequent nodes.
   */


  node = elems;
  /* next internal node of the tree */

  do {
    //pqremove(s, tree, n);  /* n = node of least frequency */

    /*** pqremove ***/
    n = s.heap[1
    /*SMALLEST*/
    ];
    s.heap[1
    /*SMALLEST*/
    ] = s.heap[s.heap_len--];
    pqdownheap(s, tree, 1
    /*SMALLEST*/
    );
    /***/

    m = s.heap[1
    /*SMALLEST*/
    ];
    /* m = node of next least frequency */

    s.heap[--s.heap_max] = n;
    /* keep the nodes sorted by frequency */

    s.heap[--s.heap_max] = m;
    /* Create a new node father of n and m */

    tree[node * 2]
    /*.Freq*/
    = tree[n * 2]
    /*.Freq*/
    + tree[m * 2]
    /*.Freq*/
    ;
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n * 2 + 1]
    /*.Dad*/
    = tree[m * 2 + 1]
    /*.Dad*/
    = node;
    /* and insert the new node in the heap */

    s.heap[1
    /*SMALLEST*/
    ] = node++;
    pqdownheap(s, tree, 1
    /*SMALLEST*/
    );
  } while (s.heap_len >= 2);

  s.heap[--s.heap_max] = s.heap[1
  /*SMALLEST*/
  ];
  /* At this point, the fields freq and dad are set. We can now
   * generate the bit lengths.
   */

  gen_bitlen(s, desc);
  /* The field len is now set, we can generate the bit codes */

  gen_codes(tree, max_code, s.bl_count);
};
/* ===========================================================================
 * Scan a literal or distance tree to determine the frequencies of the codes
 * in the bit length tree.
 */


const scan_tree = (s, tree, max_code) => //    deflate_state *s;
//    ct_data *tree;   /* the tree to be scanned */
//    int max_code;    /* and its largest code of non zero frequency */
{
  let n;
  /* iterates over all tree elements */

  let prevlen = -1;
  /* last emitted length */

  let curlen;
  /* length of current code */

  let nextlen = tree[0 * 2 + 1]
  /*.Len*/
  ;
  /* length of next code */

  let count = 0;
  /* repeat count of the current code */

  let max_count = 7;
  /* max repeat count */

  let min_count = 4;
  /* min repeat count */

  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }

  tree[(max_code + 1) * 2 + 1]
  /*.Len*/
  = 0xffff;
  /* guard */

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1]
    /*.Len*/
    ;

    if (++count < max_count && curlen === nextlen) {
      continue;
    } else if (count < min_count) {
      s.bl_tree[curlen * 2]
      /*.Freq*/
      += count;
    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        s.bl_tree[curlen * 2] /*.Freq*/++;
      }

      s.bl_tree[REP_3_6 * 2] /*.Freq*/++;
    } else if (count <= 10) {
      s.bl_tree[REPZ_3_10 * 2] /*.Freq*/++;
    } else {
      s.bl_tree[REPZ_11_138 * 2] /*.Freq*/++;
    }

    count = 0;
    prevlen = curlen;

    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
/* ===========================================================================
 * Send a literal or distance tree in compressed form, using the codes in
 * bl_tree.
 */


const send_tree = (s, tree, max_code) => //    deflate_state *s;
//    ct_data *tree; /* the tree to be scanned */
//    int max_code;       /* and its largest code of non zero frequency */
{
  let n;
  /* iterates over all tree elements */

  let prevlen = -1;
  /* last emitted length */

  let curlen;
  /* length of current code */

  let nextlen = tree[0 * 2 + 1]
  /*.Len*/
  ;
  /* length of next code */

  let count = 0;
  /* repeat count of the current code */

  let max_count = 7;
  /* max repeat count */

  let min_count = 4;
  /* min repeat count */

  /* tree[max_code+1].Len = -1; */

  /* guard already set */

  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1]
    /*.Len*/
    ;

    if (++count < max_count && curlen === nextlen) {
      continue;
    } else if (count < min_count) {
      do {
        send_code(s, curlen, s.bl_tree);
      } while (--count !== 0);
    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      } //Assert(count >= 3 && count <= 6, " 3_6?");


      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count - 3, 2);
    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count - 3, 3);
    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count - 11, 7);
    }

    count = 0;
    prevlen = curlen;

    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
/* ===========================================================================
 * Construct the Huffman tree for the bit lengths and return the index in
 * bl_order of the last bit length code to send.
 */


const build_bl_tree = s => {
  let max_blindex;
  /* index of last bit length code of non zero freq */

  /* Determine the bit length frequencies for literal and distance trees */

  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
  /* Build the bit length tree: */

  build_tree(s, s.bl_desc);
  /* opt_len now includes the length of the tree representations, except
   * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
   */

  /* Determine the number of bit length codes to send. The pkzip format
   * requires that at least 4 bit length codes be sent. (appnote.txt says
   * 3 but the actual value used is 4.)
   */

  for (max_blindex = BL_CODES$1 - 1; max_blindex >= 3; max_blindex--) {
    if (s.bl_tree[bl_order[max_blindex] * 2 + 1]
    /*.Len*/
    !== 0) {
      break;
    }
  }
  /* Update opt_len to include the bit length tree and counts */


  s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4; //Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
  //        s->opt_len, s->static_len));

  return max_blindex;
};
/* ===========================================================================
 * Send the header for a block using dynamic Huffman trees: the counts, the
 * lengths of the bit length codes, the literal tree and the distance tree.
 * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
 */


const send_all_trees = (s, lcodes, dcodes, blcodes) => //    deflate_state *s;
//    int lcodes, dcodes, blcodes; /* number of codes for each tree */
{
  let rank;
  /* index in bl_order */
  //Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
  //Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES,
  //        "too many codes");
  //Tracev((stderr, "\nbl counts: "));

  send_bits(s, lcodes - 257, 5);
  /* not +255 as stated in appnote.txt */

  send_bits(s, dcodes - 1, 5);
  send_bits(s, blcodes - 4, 4);
  /* not -3 as stated in appnote.txt */

  for (rank = 0; rank < blcodes; rank++) {
    //Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
    send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1]
    /*.Len*/
    , 3);
  } //Tracev((stderr, "\nbl tree: sent %ld", s->bits_sent));


  send_tree(s, s.dyn_ltree, lcodes - 1);
  /* literal tree */
  //Tracev((stderr, "\nlit tree: sent %ld", s->bits_sent));

  send_tree(s, s.dyn_dtree, dcodes - 1);
  /* distance tree */
  //Tracev((stderr, "\ndist tree: sent %ld", s->bits_sent));
};
/* ===========================================================================
 * Check if the data type is TEXT or BINARY, using the following algorithm:
 * - TEXT if the two conditions below are satisfied:
 *    a) There are no non-portable control characters belonging to the
 *       "black list" (0..6, 14..25, 28..31).
 *    b) There is at least one printable character belonging to the
 *       "white list" (9 {TAB}, 10 {LF}, 13 {CR}, 32..255).
 * - BINARY otherwise.
 * - The following partially-portable control characters form a
 *   "gray list" that is ignored in this detection algorithm:
 *   (7 {BEL}, 8 {BS}, 11 {VT}, 12 {FF}, 26 {SUB}, 27 {ESC}).
 * IN assertion: the fields Freq of dyn_ltree are set.
 */


const detect_data_type = s => {
  /* black_mask is the bit mask of black-listed bytes
   * set bits 0..6, 14..25, and 28..31
   * 0xf3ffc07f = binary 11110011111111111100000001111111
   */
  let black_mask = 0xf3ffc07f;
  let n;
  /* Check for non-textual ("black-listed") bytes. */

  for (n = 0; n <= 31; n++, black_mask >>>= 1) {
    if (black_mask & 1 && s.dyn_ltree[n * 2]
    /*.Freq*/
    !== 0) {
      return Z_BINARY;
    }
  }
  /* Check for textual ("white-listed") bytes. */


  if (s.dyn_ltree[9 * 2]
  /*.Freq*/
  !== 0 || s.dyn_ltree[10 * 2]
  /*.Freq*/
  !== 0 || s.dyn_ltree[13 * 2]
  /*.Freq*/
  !== 0) {
    return Z_TEXT;
  }

  for (n = 32; n < LITERALS$1; n++) {
    if (s.dyn_ltree[n * 2]
    /*.Freq*/
    !== 0) {
      return Z_TEXT;
    }
  }
  /* There are no "black-listed" or "white-listed" bytes:
   * this stream either is empty or has tolerated ("gray-listed") bytes only.
   */


  return Z_BINARY;
};

let static_init_done = false;
/* ===========================================================================
 * Initialize the tree data structures for a new zlib stream.
 */

const _tr_init$1 = s => {
  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }

  s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
  s.bi_buf = 0;
  s.bi_valid = 0;
  /* Initialize the first block of the first file: */

  init_block(s);
};
/* ===========================================================================
 * Send a stored block
 */


const _tr_stored_block$1 = (s, buf, stored_len, last) => //DeflateState *s;
//charf *buf;       /* input block */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
  /* send block type */

  copy_block(s, buf, stored_len, true);
  /* with header */
};
/* ===========================================================================
 * Send one empty static block to give enough lookahead for inflate.
 * This takes 10 bits, of which 7 may remain in the bit buffer.
 */


const _tr_align$1 = s => {
  send_bits(s, STATIC_TREES << 1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
};
/* ===========================================================================
 * Determine the best encoding for the current block: dynamic trees, static
 * trees or store, and output the encoded block to the zip file.
 */


const _tr_flush_block$1 = (s, buf, stored_len, last) => //DeflateState *s;
//charf *buf;       /* input block, or NULL if too old */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  let opt_lenb, static_lenb;
  /* opt_len and static_len in bytes */

  let max_blindex = 0;
  /* index of last bit length code of non zero freq */

  /* Build the Huffman trees unless a stored block is forced */

  if (s.level > 0) {
    /* Check if the file is binary or text */
    if (s.strm.data_type === Z_UNKNOWN$1) {
      s.strm.data_type = detect_data_type(s);
    }
    /* Construct the literal and distance trees */


    build_tree(s, s.l_desc); // Tracev((stderr, "\nlit data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));

    build_tree(s, s.d_desc); // Tracev((stderr, "\ndist data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));

    /* At this point, opt_len and static_len are the total bit lengths of
     * the compressed block data, excluding the tree representations.
     */

    /* Build the bit length tree for the above two trees, and get the index
     * in bl_order of the last bit length code to send.
     */

    max_blindex = build_bl_tree(s);
    /* Determine the best encoding. Compute the block lengths in bytes. */

    opt_lenb = s.opt_len + 3 + 7 >>> 3;
    static_lenb = s.static_len + 3 + 7 >>> 3; // Tracev((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u ",
    //        opt_lenb, s->opt_len, static_lenb, s->static_len, stored_len,
    //        s->last_lit));

    if (static_lenb <= opt_lenb) {
      opt_lenb = static_lenb;
    }
  } else {
    // Assert(buf != (char*)0, "lost buf");
    opt_lenb = static_lenb = stored_len + 5;
    /* force a stored block */
  }

  if (stored_len + 4 <= opt_lenb && buf !== -1) {
    /* 4: two words for the lengths */

    /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
     * Otherwise we can't have processed more than WSIZE input bytes since
     * the last block flush, because compression would have been
     * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
     * transform a block into a stored block.
     */
    _tr_stored_block$1(s, buf, stored_len, last);
  } else if (s.strategy === Z_FIXED$1 || static_lenb === opt_lenb) {
    send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);
  } else {
    send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  } // Assert (s->compressed_len == s->bits_sent, "bad compressed size");

  /* The above check is made mod 2^32, for files larger than 512 MB
   * and uLong implemented on 32 bits.
   */


  init_block(s);

  if (last) {
    bi_windup(s);
  } // Tracev((stderr,"\ncomprlen %lu(%lu) ", s->compressed_len>>3,
  //       s->compressed_len-7*last));

};
/* ===========================================================================
 * Save the match info and tally the frequency counts. Return true if
 * the current block must be flushed.
 */


const _tr_tally$1 = (s, dist, lc) => //    deflate_state *s;
//    unsigned dist;  /* distance of matched string */
//    unsigned lc;    /* match length-MIN_MATCH or unmatched char (if dist==0) */
{
  //let out_length, in_length, dcode;
  s.pending_buf[s.d_buf + s.last_lit * 2] = dist >>> 8 & 0xff;
  s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;
  s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
  s.last_lit++;

  if (dist === 0) {
    /* lc is the unmatched char */
    s.dyn_ltree[lc * 2] /*.Freq*/++;
  } else {
    s.matches++;
    /* Here, lc is the match length - MIN_MATCH */

    dist--;
    /* dist = match distance - 1 */
    //Assert((ush)dist < (ush)MAX_DIST(s) &&
    //       (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) &&
    //       (ush)d_code(dist) < (ush)D_CODES,  "_tr_tally: bad match");

    s.dyn_ltree[(_length_code[lc] + LITERALS$1 + 1) * 2] /*.Freq*/++;
    s.dyn_dtree[d_code(dist) * 2] /*.Freq*/++;
  } // (!) This block is disabled in zlib defaults,
  // don't enable it for binary compatibility
  //#ifdef TRUNCATE_BLOCK
  //  /* Try to guess if it is profitable to stop the current block here */
  //  if ((s.last_lit & 0x1fff) === 0 && s.level > 2) {
  //    /* Compute an upper bound for the compressed length */
  //    out_length = s.last_lit*8;
  //    in_length = s.strstart - s.block_start;
  //
  //    for (dcode = 0; dcode < D_CODES; dcode++) {
  //      out_length += s.dyn_dtree[dcode*2]/*.Freq*/ * (5 + extra_dbits[dcode]);
  //    }
  //    out_length >>>= 3;
  //    //Tracev((stderr,"\nlast_lit %u, in %ld, out ~%ld(%ld%%) ",
  //    //       s->last_lit, in_length, out_length,
  //    //       100L - out_length*100L/in_length));
  //    if (s.matches < (s.last_lit>>1)/*int /2*/ && out_length < (in_length>>1)/*int /2*/) {
  //      return true;
  //    }
  //  }
  //#endif


  return s.last_lit === s.lit_bufsize - 1;
  /* We avoid equality with lit_bufsize because of wraparound at 64K
   * on 16 bit machines and because stored blocks are restricted to
   * 64K-1 bytes.
   */
};

var _tr_init_1 = _tr_init$1;
var _tr_stored_block_1 = _tr_stored_block$1;
var _tr_flush_block_1 = _tr_flush_block$1;
var _tr_tally_1 = _tr_tally$1;
var _tr_align_1 = _tr_align$1;

var trees = {
	_tr_init: _tr_init_1,
	_tr_stored_block: _tr_stored_block_1,
	_tr_flush_block: _tr_flush_block_1,
	_tr_tally: _tr_tally_1,
	_tr_align: _tr_align_1
};

// It isn't worth it to make additional optimizations as in original.
// Small size is preferable.
// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

const adler32 = (adler, buf, len, pos) => {
  let s1 = adler & 0xffff | 0,
      s2 = adler >>> 16 & 0xffff | 0,
      n = 0;

  while (len !== 0) {
    // Set limit ~ twice less than 5552, to keep
    // s2 in 31-bits, because we force signed ints.
    // in other case %= will fail.
    n = len > 2000 ? 2000 : len;
    len -= n;

    do {
      s1 = s1 + buf[pos++] | 0;
      s2 = s2 + s1 | 0;
    } while (--n);

    s1 %= 65521;
    s2 %= 65521;
  }

  return s1 | s2 << 16 | 0;
};

var adler32_1 = adler32;

// So write code to minimize size - no pregenerated tables
// and array tools dependencies.
// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.
// Use ordinary array, since untyped makes no boost here

const makeTable = () => {
  let c,
      table = [];

  for (var n = 0; n < 256; n++) {
    c = n;

    for (var k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ c >>> 1 : c >>> 1;
    }

    table[n] = c;
  }

  return table;
}; // Create table on load. Just 255 signed longs. Not a problem.


const crcTable = new Uint32Array(makeTable());

const crc32 = (crc, buf, len, pos) => {
  const t = crcTable;
  const end = pos + len;
  crc ^= -1;

  for (let i = pos; i < end; i++) {
    crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 0xFF];
  }

  return crc ^ -1; // >>> 0;
};

var crc32_1 = crc32;

// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var messages = {
  2: 'need dictionary',

  /* Z_NEED_DICT       2  */
  1: 'stream end',

  /* Z_STREAM_END      1  */
  0: '',

  /* Z_OK              0  */
  '-1': 'file error',

  /* Z_ERRNO         (-1) */
  '-2': 'stream error',

  /* Z_STREAM_ERROR  (-2) */
  '-3': 'data error',

  /* Z_DATA_ERROR    (-3) */
  '-4': 'insufficient memory',

  /* Z_MEM_ERROR     (-4) */
  '-5': 'buffer error',

  /* Z_BUF_ERROR     (-5) */
  '-6': 'incompatible version'
  /* Z_VERSION_ERROR (-6) */

};

// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var constants$2 = {
  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,

  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  //Z_VERSION_ERROR: -6,

  /* compression levels */
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,

  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY: 0,
  Z_TEXT: 1,
  //Z_ASCII:                1, // = Z_TEXT (deprecated)
  Z_UNKNOWN: 2,

  /* The deflate compression method */
  Z_DEFLATED: 8 //Z_NULL:                 null // Use -1 or null inline, depending on var type

};

// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

const {
  _tr_init,
  _tr_stored_block,
  _tr_flush_block,
  _tr_tally,
  _tr_align
} = trees;






/* Public constants ==========================================================*/

/* ===========================================================================*/


const {
  Z_NO_FLUSH: Z_NO_FLUSH$2,
  Z_PARTIAL_FLUSH,
  Z_FULL_FLUSH: Z_FULL_FLUSH$1,
  Z_FINISH: Z_FINISH$3,
  Z_BLOCK: Z_BLOCK$1,
  Z_OK: Z_OK$3,
  Z_STREAM_END: Z_STREAM_END$3,
  Z_STREAM_ERROR: Z_STREAM_ERROR$2,
  Z_DATA_ERROR: Z_DATA_ERROR$2,
  Z_BUF_ERROR: Z_BUF_ERROR$1,
  Z_DEFAULT_COMPRESSION: Z_DEFAULT_COMPRESSION$1,
  Z_FILTERED,
  Z_HUFFMAN_ONLY,
  Z_RLE,
  Z_FIXED,
  Z_DEFAULT_STRATEGY: Z_DEFAULT_STRATEGY$1,
  Z_UNKNOWN,
  Z_DEFLATED: Z_DEFLATED$2
} = constants$2;
/*============================================================================*/


const MAX_MEM_LEVEL = 9;
/* Maximum value for memLevel in deflateInit2 */

const MAX_WBITS$1 = 15;
/* 32K LZ77 window */

const DEF_MEM_LEVEL = 8;
const LENGTH_CODES = 29;
/* number of length codes, not counting the special END_BLOCK code */

const LITERALS = 256;
/* number of literal bytes 0..255 */

const L_CODES = LITERALS + 1 + LENGTH_CODES;
/* number of Literal or Length codes, including the END_BLOCK code */

const D_CODES = 30;
/* number of distance codes */

const BL_CODES = 19;
/* number of codes used to transfer the bit lengths */

const HEAP_SIZE = 2 * L_CODES + 1;
/* maximum heap size */

const MAX_BITS = 15;
/* All codes must not exceed MAX_BITS bits */

const MIN_MATCH = 3;
const MAX_MATCH = 258;
const MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
const PRESET_DICT = 0x20;
const INIT_STATE = 42;
const EXTRA_STATE = 69;
const NAME_STATE = 73;
const COMMENT_STATE = 91;
const HCRC_STATE = 103;
const BUSY_STATE = 113;
const FINISH_STATE = 666;
const BS_NEED_MORE = 1;
/* block not completed, need more input or more output */

const BS_BLOCK_DONE = 2;
/* block flush performed */

const BS_FINISH_STARTED = 3;
/* finish started, need only more output at next deflate */

const BS_FINISH_DONE = 4;
/* finish done, accept no more input or output */

const OS_CODE = 0x03; // Unix :) . Don't detect, use this default.

const err = (strm, errorCode) => {
  strm.msg = messages[errorCode];
  return errorCode;
};

const rank = f => {
  return (f << 1) - (f > 4 ? 9 : 0);
};

const zero = buf => {
  let len = buf.length;

  while (--len >= 0) {
    buf[len] = 0;
  }
};
/* eslint-disable new-cap */


let HASH_ZLIB = (s, prev, data) => (prev << s.hash_shift ^ data) & s.hash_mask; // This hash causes less collisions, https://github.com/nodeca/pako/issues/135
// But breaks binary compatibility
//let HASH_FAST = (s, prev, data) => ((prev << 8) + (prev >> 8) + (data << 4)) & s.hash_mask;


let HASH = HASH_ZLIB;
/* =========================================================================
 * Flush as much pending output as possible. All deflate() output goes
 * through this function so some applications may wish to modify it
 * to avoid allocating a large strm->output buffer and copying into it.
 * (See also read_buf()).
 */

const flush_pending = strm => {
  const s = strm.state; //_tr_flush_bits(s);

  let len = s.pending;

  if (len > strm.avail_out) {
    len = strm.avail_out;
  }

  if (len === 0) {
    return;
  }

  strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
  strm.next_out += len;
  s.pending_out += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending -= len;

  if (s.pending === 0) {
    s.pending_out = 0;
  }
};

const flush_block_only = (s, last) => {
  _tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);

  s.block_start = s.strstart;
  flush_pending(s.strm);
};

const put_byte = (s, b) => {
  s.pending_buf[s.pending++] = b;
};
/* =========================================================================
 * Put a short in the pending buffer. The 16-bit value is put in MSB order.
 * IN assertion: the stream state is correct and there is enough room in
 * pending_buf.
 */


const putShortMSB = (s, b) => {
  //  put_byte(s, (Byte)(b >> 8));
  //  put_byte(s, (Byte)(b & 0xff));
  s.pending_buf[s.pending++] = b >>> 8 & 0xff;
  s.pending_buf[s.pending++] = b & 0xff;
};
/* ===========================================================================
 * Read a new buffer from the current input stream, update the adler32
 * and total number of bytes read.  All deflate() input goes through
 * this function so some applications may wish to modify it to avoid
 * allocating a large strm->input buffer and copying from it.
 * (See also flush_pending()).
 */


const read_buf = (strm, buf, start, size) => {
  let len = strm.avail_in;

  if (len > size) {
    len = size;
  }

  if (len === 0) {
    return 0;
  }

  strm.avail_in -= len; // zmemcpy(buf, strm->next_in, len);

  buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);

  if (strm.state.wrap === 1) {
    strm.adler = adler32_1(strm.adler, buf, len, start);
  } else if (strm.state.wrap === 2) {
    strm.adler = crc32_1(strm.adler, buf, len, start);
  }

  strm.next_in += len;
  strm.total_in += len;
  return len;
};
/* ===========================================================================
 * Set match_start to the longest match starting at the given string and
 * return its length. Matches shorter or equal to prev_length are discarded,
 * in which case the result is equal to prev_length and match_start is
 * garbage.
 * IN assertions: cur_match is the head of the hash chain for the current
 *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
 * OUT assertion: the match length is not greater than s->lookahead.
 */


const longest_match = (s, cur_match) => {
  let chain_length = s.max_chain_length;
  /* max hash chain length */

  let scan = s.strstart;
  /* current string */

  let match;
  /* matched string */

  let len;
  /* length of current match */

  let best_len = s.prev_length;
  /* best match length so far */

  let nice_match = s.nice_match;
  /* stop if match long enough */

  const limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0
  /*NIL*/
  ;
  const _win = s.window; // shortcut

  const wmask = s.w_mask;
  const prev = s.prev;
  /* Stop when cur_match becomes <= limit. To simplify the code,
   * we prevent matches with the string of window index 0.
   */

  const strend = s.strstart + MAX_MATCH;
  let scan_end1 = _win[scan + best_len - 1];
  let scan_end = _win[scan + best_len];
  /* The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of 16.
   * It is easy to get rid of this optimization if necessary.
   */
  // Assert(s->hash_bits >= 8 && MAX_MATCH == 258, "Code too clever");

  /* Do not waste too much time if we already have a good match: */

  if (s.prev_length >= s.good_match) {
    chain_length >>= 2;
  }
  /* Do not look for matches beyond the end of the input. This is necessary
   * to make deflate deterministic.
   */


  if (nice_match > s.lookahead) {
    nice_match = s.lookahead;
  } // Assert((ulg)s->strstart <= s->window_size-MIN_LOOKAHEAD, "need lookahead");


  do {
    // Assert(cur_match < s->strstart, "no future");
    match = cur_match;
    /* Skip to next match if the match length cannot increase
     * or if the match length is less than 2.  Note that the checks below
     * for insufficient lookahead only occur occasionally for performance
     * reasons.  Therefore uninitialized memory will be accessed, and
     * conditional jumps will be made that depend on those values.
     * However the length of the match is limited to the lookahead, so
     * the output of deflate is not affected by the uninitialized values.
     */

    if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
      continue;
    }
    /* The check at best_len-1 can be removed because it will be made
     * again later. (This heuristic is not always a win.)
     * It is not necessary to compare scan[2] and match[2] since they
     * are always equal when the other bytes match, given that
     * the hash keys are equal and that HASH_BITS >= 8.
     */


    scan += 2;
    match++; // Assert(*scan == *match, "match[2]?");

    /* We check for insufficient lookahead only every 8th comparison;
     * the 256th check will be made at strstart+258.
     */

    do {
      /*jshint noempty:false*/
    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend); // Assert(scan <= s->window+(unsigned)(s->window_size-1), "wild scan");


    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;

    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;

      if (len >= nice_match) {
        break;
      }

      scan_end1 = _win[scan + best_len - 1];
      scan_end = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

  if (best_len <= s.lookahead) {
    return best_len;
  }

  return s.lookahead;
};
/* ===========================================================================
 * Fill the window when the lookahead becomes insufficient.
 * Updates strstart and lookahead.
 *
 * IN assertion: lookahead < MIN_LOOKAHEAD
 * OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
 *    At least one byte has been read, or avail_in == 0; reads are
 *    performed for at least two bytes (required for the zip translate_eol
 *    option -- not supported here).
 */


const fill_window = s => {
  const _w_size = s.w_size;
  let p, n, m, more, str; //Assert(s->lookahead < MIN_LOOKAHEAD, "already enough lookahead");

  do {
    more = s.window_size - s.lookahead - s.strstart; // JS ints have 32 bit, block below not needed

    /* Deal with !@#$% 64K limit: */
    //if (sizeof(int) <= 2) {
    //    if (more == 0 && s->strstart == 0 && s->lookahead == 0) {
    //        more = wsize;
    //
    //  } else if (more == (unsigned)(-1)) {
    //        /* Very unlikely, but possible on 16 bit machine if
    //         * strstart == 0 && lookahead == 1 (input done a byte at time)
    //         */
    //        more--;
    //    }
    //}

    /* If the window is almost full and there is insufficient lookahead,
     * move the upper half to the lower one to make room in the upper half.
     */

    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
      s.window.set(s.window.subarray(_w_size, _w_size + _w_size), 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      /* we now have strstart >= MAX_DIST */

      s.block_start -= _w_size;
      /* Slide the hash table (could be avoided with 32 bit values
       at the expense of memory usage). We slide even when level == 0
       to keep the hash table consistent if we switch back to level > 0
       later. (Using level 0 permanently is not an optimal usage of
       zlib, so we don't care about this pathological case.)
       */

      n = s.hash_size;
      p = n;

      do {
        m = s.head[--p];
        s.head[p] = m >= _w_size ? m - _w_size : 0;
      } while (--n);

      n = _w_size;
      p = n;

      do {
        m = s.prev[--p];
        s.prev[p] = m >= _w_size ? m - _w_size : 0;
        /* If n is not on any hash chain, prev[n] is garbage but
         * its value will never be used.
         */
      } while (--n);

      more += _w_size;
    }

    if (s.strm.avail_in === 0) {
      break;
    }
    /* If there was no sliding:
     *    strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
     *    more == window_size - lookahead - strstart
     * => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
     * => more >= window_size - 2*WSIZE + 2
     * In the BIG_MEM or MMAP case (not yet supported),
     *   window_size == input_size + MIN_LOOKAHEAD  &&
     *   strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
     * Otherwise, window_size == 2*WSIZE so more >= 2.
     * If there was sliding, more >= WSIZE. So in all cases, more >= 2.
     */
    //Assert(more >= 2, "more < 2");


    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;
    /* Initialize the hash value now that we have some input: */

    if (s.lookahead + s.insert >= MIN_MATCH) {
      str = s.strstart - s.insert;
      s.ins_h = s.window[str];
      /* UPDATE_HASH(s, s->ins_h, s->window[str + 1]); */

      s.ins_h = HASH(s, s.ins_h, s.window[str + 1]); //#if MIN_MATCH != 3
      //        Call update_hash() MIN_MATCH-3 more times
      //#endif

      while (s.insert) {
        /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
        s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
        s.insert--;

        if (s.lookahead + s.insert < MIN_MATCH) {
          break;
        }
      }
    }
    /* If the whole input has less than MIN_MATCH bytes, ins_h is garbage,
     * but this is not important since only literal bytes will be emitted.
     */

  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
  /* If the WIN_INIT bytes after the end of the current data have never been
   * written, then zero those bytes in order to avoid memory check reports of
   * the use of uninitialized (or uninitialised as Julian writes) bytes by
   * the longest match routines.  Update the high water mark for the next
   * time through here.  WIN_INIT is set to MAX_MATCH since the longest match
   * routines allow scanning to strstart + MAX_MATCH, ignoring lookahead.
   */
  //  if (s.high_water < s.window_size) {
  //    const curr = s.strstart + s.lookahead;
  //    let init = 0;
  //
  //    if (s.high_water < curr) {
  //      /* Previous high water mark below current data -- zero WIN_INIT
  //       * bytes or up to end of window, whichever is less.
  //       */
  //      init = s.window_size - curr;
  //      if (init > WIN_INIT)
  //        init = WIN_INIT;
  //      zmemzero(s->window + curr, (unsigned)init);
  //      s->high_water = curr + init;
  //    }
  //    else if (s->high_water < (ulg)curr + WIN_INIT) {
  //      /* High water mark at or above current data, but below current data
  //       * plus WIN_INIT -- zero out to current data plus WIN_INIT, or up
  //       * to end of window, whichever is less.
  //       */
  //      init = (ulg)curr + WIN_INIT - s->high_water;
  //      if (init > s->window_size - s->high_water)
  //        init = s->window_size - s->high_water;
  //      zmemzero(s->window + s->high_water, (unsigned)init);
  //      s->high_water += init;
  //    }
  //  }
  //
  //  Assert((ulg)s->strstart <= s->window_size - MIN_LOOKAHEAD,
  //    "not enough room for search");

};
/* ===========================================================================
 * Copy without compression as much as possible from the input stream, return
 * the current block state.
 * This function does not insert new strings in the dictionary since
 * uncompressible data is probably not useful. This function is used
 * only for the level=0 compression option.
 * NOTE: this function should be optimized to avoid extra copying from
 * window to pending_buf.
 */


const deflate_stored = (s, flush) => {
  /* Stored blocks are limited to 0xffff bytes, pending_buf is limited
   * to pending_buf_size, and each stored block has a 5 byte header:
   */
  let max_block_size = 0xffff;

  if (max_block_size > s.pending_buf_size - 5) {
    max_block_size = s.pending_buf_size - 5;
  }
  /* Copy as much as possible from input to output: */


  for (;;) {
    /* Fill the window as much as possible: */
    if (s.lookahead <= 1) {
      //Assert(s->strstart < s->w_size+MAX_DIST(s) ||
      //  s->block_start >= (long)s->w_size, "slide too late");
      //      if (!(s.strstart < s.w_size + (s.w_size - MIN_LOOKAHEAD) ||
      //        s.block_start >= s.w_size)) {
      //        throw  new Error("slide too late");
      //      }
      fill_window(s);

      if (s.lookahead === 0 && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }

      if (s.lookahead === 0) {
        break;
      }
      /* flush the current block */

    } //Assert(s->block_start >= 0L, "block gone");
    //    if (s.block_start < 0) throw new Error("block gone");


    s.strstart += s.lookahead;
    s.lookahead = 0;
    /* Emit a stored block if pending_buf will be full: */

    const max_start = s.block_start + max_block_size;

    if (s.strstart === 0 || s.strstart >= max_start) {
      /* strstart == 0 is possible when wraparound on 16-bit machine */
      s.lookahead = s.strstart - max_start;
      s.strstart = max_start;
      /*** FLUSH_BLOCK(s, 0); ***/

      flush_block_only(s, false);

      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/

    }
    /* Flush if we may have to slide, otherwise block_start may become
     * negative and the data will be gone:
     */


    if (s.strstart - s.block_start >= s.w_size - MIN_LOOKAHEAD) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);

      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/

    }
  }

  s.insert = 0;

  if (flush === Z_FINISH$3) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);

    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/


    return BS_FINISH_DONE;
  }

  if (s.strstart > s.block_start) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);

    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/

  }

  return BS_NEED_MORE;
};
/* ===========================================================================
 * Compress as much as possible from the input stream, return the current
 * block state.
 * This function does not perform lazy evaluation of matches and inserts
 * new strings in the dictionary only for unmatched strings or for short
 * matches. It is used only for the fast compression options.
 */


const deflate_fast = (s, flush) => {
  let hash_head;
  /* head of the hash chain */

  let bflush;
  /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);

      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }

      if (s.lookahead === 0) {
        break;
        /* flush the current block */
      }
    }
    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */


    hash_head = 0
    /*NIL*/
    ;

    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }
    /* Find the longest match, discarding those <= prev_length.
     * At this point we have always match_length < MIN_MATCH
     */


    if (hash_head !== 0
    /*NIL*/
    && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
      /* To simplify the code, we prevent matches with the string
       * of window index 0 (in particular we have to avoid a match
       * of the string with itself at the start of the input file).
       */
      s.match_length = longest_match(s, hash_head);
      /* longest_match() sets match_start */
    }

    if (s.match_length >= MIN_MATCH) {
      // check_match(s, s.strstart, s.match_start, s.match_length); // for debug only

      /*** _tr_tally_dist(s, s.strstart - s.match_start,
                     s.match_length - MIN_MATCH, bflush); ***/
      bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      /* Insert new strings in the hash table only if the match length
       * is not too large. This saves time but degrades compression.
       */

      if (s.match_length <= s.max_lazy_match
      /*max_insert_length*/
      && s.lookahead >= MIN_MATCH) {
        s.match_length--;
        /* string at strstart already in table */

        do {
          s.strstart++;
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/

          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/

          /* strstart never exceeds WSIZE-MAX_MATCH, so there are
           * always MIN_MATCH bytes ahead.
           */
        } while (--s.match_length !== 0);

        s.strstart++;
      } else {
        s.strstart += s.match_length;
        s.match_length = 0;
        s.ins_h = s.window[s.strstart];
        /* UPDATE_HASH(s, s.ins_h, s.window[s.strstart+1]); */

        s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]); //#if MIN_MATCH != 3
        //                Call UPDATE_HASH() MIN_MATCH-3 more times
        //#endif

        /* If lookahead < MIN_MATCH, ins_h is garbage, but it does not
         * matter since it will be recomputed at next deflate call.
         */
      }
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s.window[s.strstart]));

      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }

    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);

      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/

    }
  }

  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;

  if (flush === Z_FINISH$3) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);

    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/


    return BS_FINISH_DONE;
  }

  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);

    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/

  }

  return BS_BLOCK_DONE;
};
/* ===========================================================================
 * Same as above, but achieves better compression. We use a lazy
 * evaluation for matches: a match is finally adopted only if there is
 * no better match at the next window position.
 */


const deflate_slow = (s, flush) => {
  let hash_head;
  /* head of hash chain */

  let bflush;
  /* set if current block must be flushed */

  let max_insert;
  /* Process the input block. */

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);

      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }

      if (s.lookahead === 0) {
        break;
      }
      /* flush the current block */

    }
    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */


    hash_head = 0
    /*NIL*/
    ;

    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }
    /* Find the longest match, discarding those <= prev_length.
     */


    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH - 1;

    if (hash_head !== 0
    /*NIL*/
    && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD
    /*MAX_DIST(s)*/
    ) {
        /* To simplify the code, we prevent matches with the string
         * of window index 0 (in particular we have to avoid a match
         * of the string with itself at the start of the input file).
         */
        s.match_length = longest_match(s, hash_head);
        /* longest_match() sets match_start */

        if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096
        /*TOO_FAR*/
        )) {
          /* If prev_match is also MIN_MATCH, match_start is garbage
           * but we will ignore the current match anyway.
           */
          s.match_length = MIN_MATCH - 1;
        }
      }
    /* If there was a match at the previous step and the current
     * match is not better, output the previous match:
     */


    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      /* Do not insert strings in hash table beyond this. */
      //check_match(s, s.strstart-1, s.prev_match, s.prev_length);

      /***_tr_tally_dist(s, s.strstart - 1 - s.prev_match,
                     s.prev_length - MIN_MATCH, bflush);***/

      bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
      /* Insert in hash table all strings up to the end of the match.
       * strstart-1 and strstart are already inserted. If there is not
       * enough lookahead, the last two strings are not inserted in
       * the hash table.
       */

      s.lookahead -= s.prev_length - 1;
      s.prev_length -= 2;

      do {
        if (++s.strstart <= max_insert) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }
      } while (--s.prev_length !== 0);

      s.match_available = 0;
      s.match_length = MIN_MATCH - 1;
      s.strstart++;

      if (bflush) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);

        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/

      }
    } else if (s.match_available) {
      /* If there was no match at the previous position, output a
       * single literal. If there was a match but the current match
       * is longer, truncate the previous match to a single literal.
       */
      //Tracevv((stderr,"%c", s->window[s->strstart-1]));

      /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
      bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);

      if (bflush) {
        /*** FLUSH_BLOCK_ONLY(s, 0) ***/
        flush_block_only(s, false);
        /***/
      }

      s.strstart++;
      s.lookahead--;

      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    } else {
      /* There is no previous match to compare with, wait for
       * the next step to decide.
       */
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  } //Assert (flush != Z_NO_FLUSH, "no flush?");


  if (s.match_available) {
    //Tracevv((stderr,"%c", s->window[s->strstart-1]));

    /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
    bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
    s.match_available = 0;
  }

  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;

  if (flush === Z_FINISH$3) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);

    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/


    return BS_FINISH_DONE;
  }

  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);

    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/

  }

  return BS_BLOCK_DONE;
};
/* ===========================================================================
 * For Z_RLE, simply look for runs of bytes, generate matches only of distance
 * one.  Do not maintain a hash table.  (It will be regenerated if this run of
 * deflate switches away from Z_RLE.)
 */


const deflate_rle = (s, flush) => {
  let bflush;
  /* set if current block must be flushed */

  let prev;
  /* byte at distance one to match */

  let scan, strend;
  /* scan goes up to strend for length of run */

  const _win = s.window;

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the longest run, plus one for the unrolled loop.
     */
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);

      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }

      if (s.lookahead === 0) {
        break;
      }
      /* flush the current block */

    }
    /* See how many times the previous byte repeats */


    s.match_length = 0;

    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];

      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;

        do {
          /*jshint noempty:false*/
        } while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);

        s.match_length = MAX_MATCH - (strend - scan);

        if (s.match_length > s.lookahead) {
          s.match_length = s.lookahead;
        }
      } //Assert(scan <= s->window+(uInt)(s->window_size-1), "wild scan");

    }
    /* Emit match if have run of MIN_MATCH or longer, else emit literal */


    if (s.match_length >= MIN_MATCH) {
      //check_match(s, s.strstart, s.strstart - 1, s.match_length);

      /*** _tr_tally_dist(s, 1, s.match_length - MIN_MATCH, bflush); ***/
      bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s->window[s->strstart]));

      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }

    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);

      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/

    }
  }

  s.insert = 0;

  if (flush === Z_FINISH$3) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);

    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/


    return BS_FINISH_DONE;
  }

  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);

    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/

  }

  return BS_BLOCK_DONE;
};
/* ===========================================================================
 * For Z_HUFFMAN_ONLY, do not look for matches.  Do not maintain a hash table.
 * (It will be regenerated if this run of deflate switches away from Huffman.)
 */


const deflate_huff = (s, flush) => {
  let bflush;
  /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we have a literal to write. */
    if (s.lookahead === 0) {
      fill_window(s);

      if (s.lookahead === 0) {
        if (flush === Z_NO_FLUSH$2) {
          return BS_NEED_MORE;
        }

        break;
        /* flush the current block */
      }
    }
    /* Output a literal byte */


    s.match_length = 0; //Tracevv((stderr,"%c", s->window[s->strstart]));

    /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/

    bflush = _tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;

    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);

      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/

    }
  }

  s.insert = 0;

  if (flush === Z_FINISH$3) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);

    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/


    return BS_FINISH_DONE;
  }

  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);

    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/

  }

  return BS_BLOCK_DONE;
};
/* Values for max_lazy_match, good_match and max_chain_length, depending on
 * the desired pack level (0..9). The values given below have been tuned to
 * exclude worst case performance for pathological files. Better values may be
 * found for specific files.
 */


function Config(good_length, max_lazy, nice_length, max_chain, func) {
  this.good_length = good_length;
  this.max_lazy = max_lazy;
  this.nice_length = nice_length;
  this.max_chain = max_chain;
  this.func = func;
}

const configuration_table = [
/*      good lazy nice chain */
new Config(0, 0, 0, 0, deflate_stored),
/* 0 store only */
new Config(4, 4, 8, 4, deflate_fast),
/* 1 max speed, no lazy matches */
new Config(4, 5, 16, 8, deflate_fast),
/* 2 */
new Config(4, 6, 32, 32, deflate_fast),
/* 3 */
new Config(4, 4, 16, 16, deflate_slow),
/* 4 lazy matches */
new Config(8, 16, 32, 32, deflate_slow),
/* 5 */
new Config(8, 16, 128, 128, deflate_slow),
/* 6 */
new Config(8, 32, 128, 256, deflate_slow),
/* 7 */
new Config(32, 128, 258, 1024, deflate_slow),
/* 8 */
new Config(32, 258, 258, 4096, deflate_slow)
/* 9 max compression */
];
/* ===========================================================================
 * Initialize the "longest match" routines for a new zlib stream
 */

const lm_init = s => {
  s.window_size = 2 * s.w_size;
  /*** CLEAR_HASH(s); ***/

  zero(s.head); // Fill with NIL (= 0);

  /* Set the default configuration parameters:
   */

  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;
  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
};

function DeflateState() {
  this.strm = null;
  /* pointer back to this zlib stream */

  this.status = 0;
  /* as the name implies */

  this.pending_buf = null;
  /* output still pending */

  this.pending_buf_size = 0;
  /* size of pending_buf */

  this.pending_out = 0;
  /* next pending byte to output to the stream */

  this.pending = 0;
  /* nb of bytes in the pending buffer */

  this.wrap = 0;
  /* bit 0 true for zlib, bit 1 true for gzip */

  this.gzhead = null;
  /* gzip header information to write */

  this.gzindex = 0;
  /* where in extra, name, or comment */

  this.method = Z_DEFLATED$2;
  /* can only be DEFLATED */

  this.last_flush = -1;
  /* value of flush param for previous deflate call */

  this.w_size = 0;
  /* LZ77 window size (32K by default) */

  this.w_bits = 0;
  /* log2(w_size)  (8..16) */

  this.w_mask = 0;
  /* w_size - 1 */

  this.window = null;
  /* Sliding window. Input bytes are read into the second half of the window,
   * and move to the first half later to keep a dictionary of at least wSize
   * bytes. With this organization, matches are limited to a distance of
   * wSize-MAX_MATCH bytes, but this ensures that IO is always
   * performed with a length multiple of the block size.
   */

  this.window_size = 0;
  /* Actual size of window: 2*wSize, except when the user input buffer
   * is directly used as sliding window.
   */

  this.prev = null;
  /* Link to older string with same hash index. To limit the size of this
   * array to 64K, this link is maintained only for the last 32K strings.
   * An index in this array is thus a window index modulo 32K.
   */

  this.head = null;
  /* Heads of the hash chains or NIL. */

  this.ins_h = 0;
  /* hash index of string to be inserted */

  this.hash_size = 0;
  /* number of elements in hash table */

  this.hash_bits = 0;
  /* log2(hash_size) */

  this.hash_mask = 0;
  /* hash_size-1 */

  this.hash_shift = 0;
  /* Number of bits by which ins_h must be shifted at each input
   * step. It must be such that after MIN_MATCH steps, the oldest
   * byte no longer takes part in the hash key, that is:
   *   hash_shift * MIN_MATCH >= hash_bits
   */

  this.block_start = 0;
  /* Window position at the beginning of the current output block. Gets
   * negative when the window is moved backwards.
   */

  this.match_length = 0;
  /* length of best match */

  this.prev_match = 0;
  /* previous match */

  this.match_available = 0;
  /* set if previous match exists */

  this.strstart = 0;
  /* start of string to insert */

  this.match_start = 0;
  /* start of matching string */

  this.lookahead = 0;
  /* number of valid bytes ahead in window */

  this.prev_length = 0;
  /* Length of the best match at previous step. Matches not greater than this
   * are discarded. This is used in the lazy match evaluation.
   */

  this.max_chain_length = 0;
  /* To speed up deflation, hash chains are never searched beyond this
   * length.  A higher limit improves compression ratio but degrades the
   * speed.
   */

  this.max_lazy_match = 0;
  /* Attempt to find a better match only when the current match is strictly
   * smaller than this value. This mechanism is used only for compression
   * levels >= 4.
   */
  // That's alias to max_lazy_match, don't use directly
  //this.max_insert_length = 0;

  /* Insert new strings in the hash table only if the match length is not
   * greater than this length. This saves time but degrades compression.
   * max_insert_length is used only for compression levels <= 3.
   */

  this.level = 0;
  /* compression level (1..9) */

  this.strategy = 0;
  /* favor or force Huffman coding*/

  this.good_match = 0;
  /* Use a faster search when the previous match is longer than this */

  this.nice_match = 0;
  /* Stop searching when current match exceeds this */

  /* used by trees.c: */

  /* Didn't use ct_data typedef below to suppress compiler warning */
  // struct ct_data_s dyn_ltree[HEAP_SIZE];   /* literal and length tree */
  // struct ct_data_s dyn_dtree[2*D_CODES+1]; /* distance tree */
  // struct ct_data_s bl_tree[2*BL_CODES+1];  /* Huffman tree for bit lengths */
  // Use flat array of DOUBLE size, with interleaved fata,
  // because JS does not support effective

  this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
  this.dyn_dtree = new Uint16Array((2 * D_CODES + 1) * 2);
  this.bl_tree = new Uint16Array((2 * BL_CODES + 1) * 2);
  zero(this.dyn_ltree);
  zero(this.dyn_dtree);
  zero(this.bl_tree);
  this.l_desc = null;
  /* desc. for literal tree */

  this.d_desc = null;
  /* desc. for distance tree */

  this.bl_desc = null;
  /* desc. for bit length tree */
  //ush bl_count[MAX_BITS+1];

  this.bl_count = new Uint16Array(MAX_BITS + 1);
  /* number of codes at each bit length for an optimal tree */
  //int heap[2*L_CODES+1];      /* heap used to build the Huffman trees */

  this.heap = new Uint16Array(2 * L_CODES + 1);
  /* heap used to build the Huffman trees */

  zero(this.heap);
  this.heap_len = 0;
  /* number of elements in the heap */

  this.heap_max = 0;
  /* element of largest frequency */

  /* The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
   * The same heap array is used to build all trees.
   */

  this.depth = new Uint16Array(2 * L_CODES + 1); //uch depth[2*L_CODES+1];

  zero(this.depth);
  /* Depth of each subtree used as tie breaker for trees of equal frequency
   */

  this.l_buf = 0;
  /* buffer index for literals or lengths */

  this.lit_bufsize = 0;
  /* Size of match buffer for literals/lengths.  There are 4 reasons for
   * limiting lit_bufsize to 64K:
   *   - frequencies can be kept in 16 bit counters
   *   - if compression is not successful for the first block, all input
   *     data is still in the window so we can still emit a stored block even
   *     when input comes from standard input.  (This can also be done for
   *     all blocks if lit_bufsize is not greater than 32K.)
   *   - if compression is not successful for a file smaller than 64K, we can
   *     even emit a stored file instead of a stored block (saving 5 bytes).
   *     This is applicable only for zip (not gzip or zlib).
   *   - creating new Huffman trees less frequently may not provide fast
   *     adaptation to changes in the input data statistics. (Take for
   *     example a binary file with poorly compressible code followed by
   *     a highly compressible string table.) Smaller buffer sizes give
   *     fast adaptation but have of course the overhead of transmitting
   *     trees more frequently.
   *   - I can't count above 4
   */

  this.last_lit = 0;
  /* running index in l_buf */

  this.d_buf = 0;
  /* Buffer index for distances. To simplify the code, d_buf and l_buf have
   * the same number of elements. To use different lengths, an extra flag
   * array would be necessary.
   */

  this.opt_len = 0;
  /* bit length of current block with optimal trees */

  this.static_len = 0;
  /* bit length of current block with static trees */

  this.matches = 0;
  /* number of string matches in current block */

  this.insert = 0;
  /* bytes at end of window left to insert */

  this.bi_buf = 0;
  /* Output buffer. bits are inserted starting at the bottom (least
   * significant bits).
   */

  this.bi_valid = 0;
  /* Number of valid bits in bi_buf.  All bits above the last valid bit
   * are always zero.
   */
  // Used for window memory init. We safely ignore it for JS. That makes
  // sense only for pointers and memory check tools.
  //this.high_water = 0;

  /* High water mark offset in window for initialized bytes -- bytes above
   * this are set to zero in order to avoid memory check warnings when
   * longest match routines access bytes past the input.  This is then
   * updated to the new high water mark.
   */
}

const deflateResetKeep = strm => {
  if (!strm || !strm.state) {
    return err(strm, Z_STREAM_ERROR$2);
  }

  strm.total_in = strm.total_out = 0;
  strm.data_type = Z_UNKNOWN;
  const s = strm.state;
  s.pending = 0;
  s.pending_out = 0;

  if (s.wrap < 0) {
    s.wrap = -s.wrap;
    /* was made negative by deflate(..., Z_FINISH); */
  }

  s.status = s.wrap ? INIT_STATE : BUSY_STATE;
  strm.adler = s.wrap === 2 ? 0 // crc32(0, Z_NULL, 0)
  : 1; // adler32(0, Z_NULL, 0)

  s.last_flush = Z_NO_FLUSH$2;

  _tr_init(s);

  return Z_OK$3;
};

const deflateReset = strm => {
  const ret = deflateResetKeep(strm);

  if (ret === Z_OK$3) {
    lm_init(strm.state);
  }

  return ret;
};

const deflateSetHeader = (strm, head) => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$2;
  }

  if (strm.state.wrap !== 2) {
    return Z_STREAM_ERROR$2;
  }

  strm.state.gzhead = head;
  return Z_OK$3;
};

const deflateInit2 = (strm, level, method, windowBits, memLevel, strategy) => {
  if (!strm) {
    // === Z_NULL
    return Z_STREAM_ERROR$2;
  }

  let wrap = 1;

  if (level === Z_DEFAULT_COMPRESSION$1) {
    level = 6;
  }

  if (windowBits < 0) {
    /* suppress zlib wrapper */
    wrap = 0;
    windowBits = -windowBits;
  } else if (windowBits > 15) {
    wrap = 2;
    /* write gzip wrapper instead */

    windowBits -= 16;
  }

  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED$2 || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED) {
    return err(strm, Z_STREAM_ERROR$2);
  }

  if (windowBits === 8) {
    windowBits = 9;
  }
  /* until 256-byte window bug fixed */


  const s = new DeflateState();
  strm.state = s;
  s.strm = strm;
  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;
  s.hash_bits = memLevel + 7;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
  s.window = new Uint8Array(s.w_size * 2);
  s.head = new Uint16Array(s.hash_size);
  s.prev = new Uint16Array(s.w_size); // Don't need mem init magic for JS.
  //s.high_water = 0;  /* nothing written to s->window yet */

  s.lit_bufsize = 1 << memLevel + 6;
  /* 16K elements by default */

  s.pending_buf_size = s.lit_bufsize * 4; //overlay = (ushf *) ZALLOC(strm, s->lit_bufsize, sizeof(ush)+2);
  //s->pending_buf = (uchf *) overlay;

  s.pending_buf = new Uint8Array(s.pending_buf_size); // It is offset from `s.pending_buf` (size is `s.lit_bufsize * 2`)
  //s->d_buf = overlay + s->lit_bufsize/sizeof(ush);

  s.d_buf = 1 * s.lit_bufsize; //s->l_buf = s->pending_buf + (1+sizeof(ush))*s->lit_bufsize;

  s.l_buf = (1 + 2) * s.lit_bufsize;
  s.level = level;
  s.strategy = strategy;
  s.method = method;
  return deflateReset(strm);
};

const deflateInit = (strm, level) => {
  return deflateInit2(strm, level, Z_DEFLATED$2, MAX_WBITS$1, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY$1);
};

const deflate$2 = (strm, flush) => {
  let beg, val; // for gzip header write only

  if (!strm || !strm.state || flush > Z_BLOCK$1 || flush < 0) {
    return strm ? err(strm, Z_STREAM_ERROR$2) : Z_STREAM_ERROR$2;
  }

  const s = strm.state;

  if (!strm.output || !strm.input && strm.avail_in !== 0 || s.status === FINISH_STATE && flush !== Z_FINISH$3) {
    return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR$1 : Z_STREAM_ERROR$2);
  }

  s.strm = strm;
  /* just in case */

  const old_flush = s.last_flush;
  s.last_flush = flush;
  /* Write the header */

  if (s.status === INIT_STATE) {
    if (s.wrap === 2) {
      // GZIP header
      strm.adler = 0; //crc32(0L, Z_NULL, 0);

      put_byte(s, 31);
      put_byte(s, 139);
      put_byte(s, 8);

      if (!s.gzhead) {
        // s->gzhead == Z_NULL
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
        put_byte(s, OS_CODE);
        s.status = BUSY_STATE;
      } else {
        put_byte(s, (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16));
        put_byte(s, s.gzhead.time & 0xff);
        put_byte(s, s.gzhead.time >> 8 & 0xff);
        put_byte(s, s.gzhead.time >> 16 & 0xff);
        put_byte(s, s.gzhead.time >> 24 & 0xff);
        put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
        put_byte(s, s.gzhead.os & 0xff);

        if (s.gzhead.extra && s.gzhead.extra.length) {
          put_byte(s, s.gzhead.extra.length & 0xff);
          put_byte(s, s.gzhead.extra.length >> 8 & 0xff);
        }

        if (s.gzhead.hcrc) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending, 0);
        }

        s.gzindex = 0;
        s.status = EXTRA_STATE;
      }
    } else // DEFLATE header
      {
        let header = Z_DEFLATED$2 + (s.w_bits - 8 << 4) << 8;
        let level_flags = -1;

        if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
          level_flags = 0;
        } else if (s.level < 6) {
          level_flags = 1;
        } else if (s.level === 6) {
          level_flags = 2;
        } else {
          level_flags = 3;
        }

        header |= level_flags << 6;

        if (s.strstart !== 0) {
          header |= PRESET_DICT;
        }

        header += 31 - header % 31;
        s.status = BUSY_STATE;
        putShortMSB(s, header);
        /* Save the adler32 of the preset dictionary: */

        if (s.strstart !== 0) {
          putShortMSB(s, strm.adler >>> 16);
          putShortMSB(s, strm.adler & 0xffff);
        }

        strm.adler = 1; // adler32(0L, Z_NULL, 0);
      }
  } //#ifdef GZIP


  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra
    /* != Z_NULL*/
    ) {
        beg = s.pending;
        /* start of bytes to update crc */

        while (s.gzindex < (s.gzhead.extra.length & 0xffff)) {
          if (s.pending === s.pending_buf_size) {
            if (s.gzhead.hcrc && s.pending > beg) {
              strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
            }

            flush_pending(strm);
            beg = s.pending;

            if (s.pending === s.pending_buf_size) {
              break;
            }
          }

          put_byte(s, s.gzhead.extra[s.gzindex] & 0xff);
          s.gzindex++;
        }

        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
        }

        if (s.gzindex === s.gzhead.extra.length) {
          s.gzindex = 0;
          s.status = NAME_STATE;
        }
      } else {
      s.status = NAME_STATE;
    }
  }

  if (s.status === NAME_STATE) {
    if (s.gzhead.name
    /* != Z_NULL*/
    ) {
        beg = s.pending;
        /* start of bytes to update crc */
        //int val;

        do {
          if (s.pending === s.pending_buf_size) {
            if (s.gzhead.hcrc && s.pending > beg) {
              strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
            }

            flush_pending(strm);
            beg = s.pending;

            if (s.pending === s.pending_buf_size) {
              val = 1;
              break;
            }
          } // JS specific: little magic to add zero terminator to end of string


          if (s.gzindex < s.gzhead.name.length) {
            val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
          } else {
            val = 0;
          }

          put_byte(s, val);
        } while (val !== 0);

        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
        }

        if (val === 0) {
          s.gzindex = 0;
          s.status = COMMENT_STATE;
        }
      } else {
      s.status = COMMENT_STATE;
    }
  }

  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment
    /* != Z_NULL*/
    ) {
        beg = s.pending;
        /* start of bytes to update crc */
        //int val;

        do {
          if (s.pending === s.pending_buf_size) {
            if (s.gzhead.hcrc && s.pending > beg) {
              strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
            }

            flush_pending(strm);
            beg = s.pending;

            if (s.pending === s.pending_buf_size) {
              val = 1;
              break;
            }
          } // JS specific: little magic to add zero terminator to end of string


          if (s.gzindex < s.gzhead.comment.length) {
            val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
          } else {
            val = 0;
          }

          put_byte(s, val);
        } while (val !== 0);

        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
        }

        if (val === 0) {
          s.status = HCRC_STATE;
        }
      } else {
      s.status = HCRC_STATE;
    }
  }

  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
      }

      if (s.pending + 2 <= s.pending_buf_size) {
        put_byte(s, strm.adler & 0xff);
        put_byte(s, strm.adler >> 8 & 0xff);
        strm.adler = 0; //crc32(0L, Z_NULL, 0);

        s.status = BUSY_STATE;
      }
    } else {
      s.status = BUSY_STATE;
    }
  } //#endif

  /* Flush as much pending output as possible */


  if (s.pending !== 0) {
    flush_pending(strm);

    if (strm.avail_out === 0) {
      /* Since avail_out is 0, deflate will be called again with
       * more output space, but possibly with both pending and
       * avail_in equal to zero. There won't be anything to do,
       * but this is not an error situation so make sure we
       * return OK instead of BUF_ERROR at next call of deflate:
       */
      s.last_flush = -1;
      return Z_OK$3;
    }
    /* Make sure there is something to do and avoid duplicate consecutive
     * flushes. For repeated and useless calls with Z_FINISH, we keep
     * returning Z_STREAM_END instead of Z_BUF_ERROR.
     */

  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH$3) {
    return err(strm, Z_BUF_ERROR$1);
  }
  /* User must not provide more input after the first FINISH: */


  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
    return err(strm, Z_BUF_ERROR$1);
  }
  /* Start a new block or continue the current one.
   */


  if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH$2 && s.status !== FINISH_STATE) {
    let bstate = s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);

    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
      s.status = FINISH_STATE;
    }

    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        /* avoid BUF_ERROR next call, see above */
      }

      return Z_OK$3;
      /* If flush != Z_NO_FLUSH && avail_out == 0, the next call
       * of deflate should use the same flush parameter to make sure
       * that the flush is complete. So we don't have to output an
       * empty block here, this will be done at next call. This also
       * ensures that for a very small output buffer, we emit at most
       * one empty block.
       */
    }

    if (bstate === BS_BLOCK_DONE) {
      if (flush === Z_PARTIAL_FLUSH) {
        _tr_align(s);
      } else if (flush !== Z_BLOCK$1) {
        /* FULL_FLUSH or SYNC_FLUSH */
        _tr_stored_block(s, 0, 0, false);
        /* For a full flush, this empty block will be recognized
         * as a special marker by inflate_sync().
         */


        if (flush === Z_FULL_FLUSH$1) {
          /*** CLEAR_HASH(s); ***/

          /* forget history */
          zero(s.head); // Fill with NIL (= 0);

          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }

      flush_pending(strm);

      if (strm.avail_out === 0) {
        s.last_flush = -1;
        /* avoid BUF_ERROR at next call, see above */

        return Z_OK$3;
      }
    }
  } //Assert(strm->avail_out > 0, "bug2");
  //if (strm.avail_out <= 0) { throw new Error("bug2");}


  if (flush !== Z_FINISH$3) {
    return Z_OK$3;
  }

  if (s.wrap <= 0) {
    return Z_STREAM_END$3;
  }
  /* Write the trailer */


  if (s.wrap === 2) {
    put_byte(s, strm.adler & 0xff);
    put_byte(s, strm.adler >> 8 & 0xff);
    put_byte(s, strm.adler >> 16 & 0xff);
    put_byte(s, strm.adler >> 24 & 0xff);
    put_byte(s, strm.total_in & 0xff);
    put_byte(s, strm.total_in >> 8 & 0xff);
    put_byte(s, strm.total_in >> 16 & 0xff);
    put_byte(s, strm.total_in >> 24 & 0xff);
  } else {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 0xffff);
  }

  flush_pending(strm);
  /* If avail_out is zero, the application will call deflate again
   * to flush the rest.
   */

  if (s.wrap > 0) {
    s.wrap = -s.wrap;
  }
  /* write the trailer only once! */


  return s.pending !== 0 ? Z_OK$3 : Z_STREAM_END$3;
};

const deflateEnd = strm => {
  if (!strm
  /*== Z_NULL*/
  || !strm.state
  /*== Z_NULL*/
  ) {
      return Z_STREAM_ERROR$2;
    }

  const status = strm.state.status;

  if (status !== INIT_STATE && status !== EXTRA_STATE && status !== NAME_STATE && status !== COMMENT_STATE && status !== HCRC_STATE && status !== BUSY_STATE && status !== FINISH_STATE) {
    return err(strm, Z_STREAM_ERROR$2);
  }

  strm.state = null;
  return status === BUSY_STATE ? err(strm, Z_DATA_ERROR$2) : Z_OK$3;
};
/* =========================================================================
 * Initializes the compression dictionary from the given byte
 * sequence without producing any compressed output.
 */


const deflateSetDictionary = (strm, dictionary) => {
  let dictLength = dictionary.length;

  if (!strm
  /*== Z_NULL*/
  || !strm.state
  /*== Z_NULL*/
  ) {
      return Z_STREAM_ERROR$2;
    }

  const s = strm.state;
  const wrap = s.wrap;

  if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) {
    return Z_STREAM_ERROR$2;
  }
  /* when using zlib wrappers, compute Adler-32 for provided dictionary */


  if (wrap === 1) {
    /* adler32(strm->adler, dictionary, dictLength); */
    strm.adler = adler32_1(strm.adler, dictionary, dictLength, 0);
  }

  s.wrap = 0;
  /* avoid computing Adler-32 in read_buf */

  /* if dictionary would fill window, just replace the history */

  if (dictLength >= s.w_size) {
    if (wrap === 0) {
      /* already empty otherwise */

      /*** CLEAR_HASH(s); ***/
      zero(s.head); // Fill with NIL (= 0);

      s.strstart = 0;
      s.block_start = 0;
      s.insert = 0;
    }
    /* use the tail */
    // dictionary = dictionary.slice(dictLength - s.w_size);


    let tmpDict = new Uint8Array(s.w_size);
    tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
    dictionary = tmpDict;
    dictLength = s.w_size;
  }
  /* insert dictionary into window and hash */


  const avail = strm.avail_in;
  const next = strm.next_in;
  const input = strm.input;
  strm.avail_in = dictLength;
  strm.next_in = 0;
  strm.input = dictionary;
  fill_window(s);

  while (s.lookahead >= MIN_MATCH) {
    let str = s.strstart;
    let n = s.lookahead - (MIN_MATCH - 1);

    do {
      /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
      s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
      s.prev[str & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = str;
      str++;
    } while (--n);

    s.strstart = str;
    s.lookahead = MIN_MATCH - 1;
    fill_window(s);
  }

  s.strstart += s.lookahead;
  s.block_start = s.strstart;
  s.insert = s.lookahead;
  s.lookahead = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  strm.next_in = next;
  strm.input = input;
  strm.avail_in = avail;
  s.wrap = wrap;
  return Z_OK$3;
};

var deflateInit_1 = deflateInit;
var deflateInit2_1 = deflateInit2;
var deflateReset_1 = deflateReset;
var deflateResetKeep_1 = deflateResetKeep;
var deflateSetHeader_1 = deflateSetHeader;
var deflate_2$1 = deflate$2;
var deflateEnd_1 = deflateEnd;
var deflateSetDictionary_1 = deflateSetDictionary;
var deflateInfo = 'pako deflate (from Nodeca project)';
/* Not implemented
module.exports.deflateBound = deflateBound;
module.exports.deflateCopy = deflateCopy;
module.exports.deflateParams = deflateParams;
module.exports.deflatePending = deflatePending;
module.exports.deflatePrime = deflatePrime;
module.exports.deflateTune = deflateTune;
*/

var deflate_1$2 = {
	deflateInit: deflateInit_1,
	deflateInit2: deflateInit2_1,
	deflateReset: deflateReset_1,
	deflateResetKeep: deflateResetKeep_1,
	deflateSetHeader: deflateSetHeader_1,
	deflate: deflate_2$1,
	deflateEnd: deflateEnd_1,
	deflateSetDictionary: deflateSetDictionary_1,
	deflateInfo: deflateInfo
};

const _has = (obj, key) => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

var assign = function (obj
/*from1, from2, from3, ...*/
) {
  const sources = Array.prototype.slice.call(arguments, 1);

  while (sources.length) {
    const source = sources.shift();

    if (!source) {
      continue;
    }

    if (typeof source !== 'object') {
      throw new TypeError(source + 'must be non-object');
    }

    for (const p in source) {
      if (_has(source, p)) {
        obj[p] = source[p];
      }
    }
  }

  return obj;
}; // Join array of chunks to single array.


var flattenChunks = chunks => {
  // calculate data length
  let len = 0;

  for (let i = 0, l = chunks.length; i < l; i++) {
    len += chunks[i].length;
  } // join chunks


  const result = new Uint8Array(len);

  for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
    let chunk = chunks[i];
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result;
};

var common = {
	assign: assign,
	flattenChunks: flattenChunks
};

// String encode/decode helpers
//
// - apply(Array) can fail on Android 2.2
// - apply(Uint8Array) can fail on iOS 5.1 Safari
//

let STR_APPLY_UIA_OK = true;

try {
  String.fromCharCode.apply(null, new Uint8Array(1));
} catch (__) {
  STR_APPLY_UIA_OK = false;
} // Table with utf8 lengths (calculated by first byte of sequence)
// Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
// because max possible codepoint is 0x10ffff


const _utf8len = new Uint8Array(256);

for (let q = 0; q < 256; q++) {
  _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
}

_utf8len[254] = _utf8len[254] = 1; // Invalid sequence start
// convert string to array (typed, when possible)

var string2buf = str => {
  let buf,
      c,
      c2,
      m_pos,
      i,
      str_len = str.length,
      buf_len = 0; // count binary size

  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);

    if ((c & 0xfc00) === 0xd800 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);

      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + (c - 0xd800 << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }

    buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  } // allocate buffer


  buf = new Uint8Array(buf_len); // convert

  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);

    if ((c & 0xfc00) === 0xd800 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);

      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + (c - 0xd800 << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }

    if (c < 0x80) {
      /* one byte */
      buf[i++] = c;
    } else if (c < 0x800) {
      /* two bytes */
      buf[i++] = 0xC0 | c >>> 6;
      buf[i++] = 0x80 | c & 0x3f;
    } else if (c < 0x10000) {
      /* three bytes */
      buf[i++] = 0xE0 | c >>> 12;
      buf[i++] = 0x80 | c >>> 6 & 0x3f;
      buf[i++] = 0x80 | c & 0x3f;
    } else {
      /* four bytes */
      buf[i++] = 0xf0 | c >>> 18;
      buf[i++] = 0x80 | c >>> 12 & 0x3f;
      buf[i++] = 0x80 | c >>> 6 & 0x3f;
      buf[i++] = 0x80 | c & 0x3f;
    }
  }

  return buf;
}; // Helper


const buf2binstring = (buf, len) => {
  // On Chrome, the arguments in a function call that are allowed is `65534`.
  // If the length of the buffer is smaller than that, we can use this optimization,
  // otherwise we will take a slower path.
  if (len < 65534) {
    if (buf.subarray && STR_APPLY_UIA_OK) {
      return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
    }
  }

  let result = '';

  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }

  return result;
}; // convert array to string


var buf2string = (buf, max) => {
  let i, out;
  const len = max || buf.length; // Reserve max possible length (2 words per char)
  // NB: by unknown reasons, Array is significantly faster for
  //     String.fromCharCode.apply than Uint16Array.

  const utf16buf = new Array(len * 2);

  for (out = 0, i = 0; i < len;) {
    let c = buf[i++]; // quick process ascii

    if (c < 0x80) {
      utf16buf[out++] = c;
      continue;
    }

    let c_len = _utf8len[c]; // skip 5 & 6 byte codes

    if (c_len > 4) {
      utf16buf[out++] = 0xfffd;
      i += c_len - 1;
      continue;
    } // apply mask on first byte


    c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07; // join the rest

    while (c_len > 1 && i < len) {
      c = c << 6 | buf[i++] & 0x3f;
      c_len--;
    } // terminated by end of string?


    if (c_len > 1) {
      utf16buf[out++] = 0xfffd;
      continue;
    }

    if (c < 0x10000) {
      utf16buf[out++] = c;
    } else {
      c -= 0x10000;
      utf16buf[out++] = 0xd800 | c >> 10 & 0x3ff;
      utf16buf[out++] = 0xdc00 | c & 0x3ff;
    }
  }

  return buf2binstring(utf16buf, out);
}; // Calculate max possible position in utf8 buffer,
// that will not break sequence. If that's not possible
// - (very small limits) return max size as is.
//
// buf[] - utf8 bytes array
// max   - length limit (mandatory);


var utf8border = (buf, max) => {
  max = max || buf.length;

  if (max > buf.length) {
    max = buf.length;
  } // go back from last position, until start of sequence found


  let pos = max - 1;

  while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) {
    pos--;
  } // Very small and broken sequence,
  // return max, because we should return something anyway.


  if (pos < 0) {
    return max;
  } // If we came to start of buffer - that means buffer is too small,
  // return max too.


  if (pos === 0) {
    return max;
  }

  return pos + _utf8len[buf[pos]] > max ? pos : max;
};

var strings = {
	string2buf: string2buf,
	buf2string: buf2string,
	utf8border: utf8border
};

// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function ZStream() {
  /* next input byte */
  this.input = null; // JS specific, because we have no pointers

  this.next_in = 0;
  /* number of bytes available at input */

  this.avail_in = 0;
  /* total number of input bytes read so far */

  this.total_in = 0;
  /* next output byte should be put there */

  this.output = null; // JS specific, because we have no pointers

  this.next_out = 0;
  /* remaining free space at output */

  this.avail_out = 0;
  /* total number of bytes output so far */

  this.total_out = 0;
  /* last error message, NULL if no error */

  this.msg = ''
  /*Z_NULL*/
  ;
  /* not visible by applications */

  this.state = null;
  /* best guess about the data type: binary or text */

  this.data_type = 2
  /*Z_UNKNOWN*/
  ;
  /* adler32 value of the uncompressed data */

  this.adler = 0;
}

var zstream = ZStream;

const toString$1 = Object.prototype.toString;
/* Public constants ==========================================================*/

/* ===========================================================================*/

const {
  Z_NO_FLUSH: Z_NO_FLUSH$1,
  Z_SYNC_FLUSH,
  Z_FULL_FLUSH,
  Z_FINISH: Z_FINISH$2,
  Z_OK: Z_OK$2,
  Z_STREAM_END: Z_STREAM_END$2,
  Z_DEFAULT_COMPRESSION,
  Z_DEFAULT_STRATEGY,
  Z_DEFLATED: Z_DEFLATED$1
} = constants$2;
/* ===========================================================================*/

/**
 * class Deflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[deflate]],
 * [[deflateRaw]] and [[gzip]].
 **/

/* internal
 * Deflate.chunks -> Array
 *
 * Chunks of output data, if [[Deflate#onData]] not overridden.
 **/

/**
 * Deflate.result -> Uint8Array
 *
 * Compressed result, generated by default [[Deflate#onData]]
 * and [[Deflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Deflate#push]] with `Z_FINISH` / `true` param).
 **/

/**
 * Deflate.err -> Number
 *
 * Error code after deflate finished. 0 (Z_OK) on success.
 * You will not need it in real life, because deflate errors
 * are possible only on wrong options or bad `onData` / `onEnd`
 * custom handlers.
 **/

/**
 * Deflate.msg -> String
 *
 * Error message, if [[Deflate.err]] != 0
 **/

/**
 * new Deflate(options)
 * - options (Object): zlib deflate options.
 *
 * Creates new deflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `level`
 * - `windowBits`
 * - `memLevel`
 * - `strategy`
 * - `dictionary`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw deflate
 * - `gzip` (Boolean) - create gzip wrapper
 * - `header` (Object) - custom header for gzip
 *   - `text` (Boolean) - true if compressed data believed to be text
 *   - `time` (Number) - modification time, unix timestamp
 *   - `os` (Number) - operation system code
 *   - `extra` (Array) - array of bytes with extra data (max 65536)
 *   - `name` (String) - file name (binary string)
 *   - `comment` (String) - comment (binary string)
 *   - `hcrc` (Boolean) - true if header crc should be added
 *
 * ##### Example:
 *
 * ```javascript
 * const pako = require('pako')
 *   , chunk1 = new Uint8Array([1,2,3,4,5,6,7,8,9])
 *   , chunk2 = new Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * const deflate = new pako.Deflate({ level: 3});
 *
 * deflate.push(chunk1, false);
 * deflate.push(chunk2, true);  // true -> last chunk
 *
 * if (deflate.err) { throw new Error(deflate.err); }
 *
 * console.log(deflate.result);
 * ```
 **/


function Deflate$1(options) {
  this.options = common.assign({
    level: Z_DEFAULT_COMPRESSION,
    method: Z_DEFLATED$1,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: Z_DEFAULT_STRATEGY
  }, options || {});
  let opt = this.options;

  if (opt.raw && opt.windowBits > 0) {
    opt.windowBits = -opt.windowBits;
  } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
    opt.windowBits += 16;
  }

  this.err = 0; // error code, if happens (0 = Z_OK)

  this.msg = ''; // error message

  this.ended = false; // used to avoid multiple onEnd() calls

  this.chunks = []; // chunks of compressed data

  this.strm = new zstream();
  this.strm.avail_out = 0;
  let status = deflate_1$2.deflateInit2(this.strm, opt.level, opt.method, opt.windowBits, opt.memLevel, opt.strategy);

  if (status !== Z_OK$2) {
    throw new Error(messages[status]);
  }

  if (opt.header) {
    deflate_1$2.deflateSetHeader(this.strm, opt.header);
  }

  if (opt.dictionary) {
    let dict; // Convert data if needed

    if (typeof opt.dictionary === 'string') {
      // If we need to compress text, change encoding to utf8.
      dict = strings.string2buf(opt.dictionary);
    } else if (toString$1.call(opt.dictionary) === '[object ArrayBuffer]') {
      dict = new Uint8Array(opt.dictionary);
    } else {
      dict = opt.dictionary;
    }

    status = deflate_1$2.deflateSetDictionary(this.strm, dict);

    if (status !== Z_OK$2) {
      throw new Error(messages[status]);
    }

    this._dict_set = true;
  }
}
/**
 * Deflate#push(data[, flush_mode]) -> Boolean
 * - data (Uint8Array|ArrayBuffer|String): input data. Strings will be
 *   converted to utf8 byte sequence.
 * - flush_mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
 *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` means Z_FINISH.
 *
 * Sends input data to deflate pipe, generating [[Deflate#onData]] calls with
 * new compressed chunks. Returns `true` on success. The last data block must
 * have `flush_mode` Z_FINISH (or `true`). That will flush internal pending
 * buffers and call [[Deflate#onEnd]].
 *
 * On fail call [[Deflate#onEnd]] with error code and return false.
 *
 * ##### Example
 *
 * ```javascript
 * push(chunk, false); // push one of data chunks
 * ...
 * push(chunk, true);  // push last chunk
 * ```
 **/


Deflate$1.prototype.push = function (data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;

  let status, _flush_mode;

  if (this.ended) {
    return false;
  }

  if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;else _flush_mode = flush_mode === true ? Z_FINISH$2 : Z_NO_FLUSH$1; // Convert data if needed

  if (typeof data === 'string') {
    // If we need to compress text, change encoding to utf8.
    strm.input = strings.string2buf(data);
  } else if (toString$1.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  for (;;) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    } // Make sure avail_out > 6 to avoid repeating markers


    if ((_flush_mode === Z_SYNC_FLUSH || _flush_mode === Z_FULL_FLUSH) && strm.avail_out <= 6) {
      this.onData(strm.output.subarray(0, strm.next_out));
      strm.avail_out = 0;
      continue;
    }

    status = deflate_1$2.deflate(strm, _flush_mode); // Ended => flush and finish

    if (status === Z_STREAM_END$2) {
      if (strm.next_out > 0) {
        this.onData(strm.output.subarray(0, strm.next_out));
      }

      status = deflate_1$2.deflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return status === Z_OK$2;
    } // Flush if out buffer full


    if (strm.avail_out === 0) {
      this.onData(strm.output);
      continue;
    } // Flush if requested and has data


    if (_flush_mode > 0 && strm.next_out > 0) {
      this.onData(strm.output.subarray(0, strm.next_out));
      strm.avail_out = 0;
      continue;
    }

    if (strm.avail_in === 0) break;
  }

  return true;
};
/**
 * Deflate#onData(chunk) -> Void
 * - chunk (Uint8Array): output data.
 *
 * By default, stores data blocks in `chunks[]` property and glue
 * those in `onEnd`. Override this handler, if you need another behaviour.
 **/


Deflate$1.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};
/**
 * Deflate#onEnd(status) -> Void
 * - status (Number): deflate status. 0 (Z_OK) on success,
 *   other if not.
 *
 * Called once after you tell deflate that the input stream is
 * complete (Z_FINISH). By default - join collected chunks,
 * free memory and fill `results` / `err` properties.
 **/


Deflate$1.prototype.onEnd = function (status) {
  // On success - join
  if (status === Z_OK$2) {
    this.result = common.flattenChunks(this.chunks);
  }

  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
/**
 * deflate(data[, options]) -> Uint8Array
 * - data (Uint8Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * Compress `data` with deflate algorithm and `options`.
 *
 * Supported options are:
 *
 * - level
 * - windowBits
 * - memLevel
 * - strategy
 * - dictionary
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 *
 * ##### Example:
 *
 * ```javascript
 * const pako = require('pako')
 * const data = new Uint8Array([1,2,3,4,5,6,7,8,9]);
 *
 * console.log(pako.deflate(data));
 * ```
 **/


function deflate$1(input, options) {
  const deflator = new Deflate$1(options);
  deflator.push(input, true); // That will never happens, if you don't cheat with options :)

  if (deflator.err) {
    throw deflator.msg || messages[deflator.err];
  }

  return deflator.result;
}
/**
 * deflateRaw(data[, options]) -> Uint8Array
 * - data (Uint8Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/


function deflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return deflate$1(input, options);
}
/**
 * gzip(data[, options]) -> Uint8Array
 * - data (Uint8Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but create gzip wrapper instead of
 * deflate one.
 **/


function gzip$1(input, options) {
  options = options || {};
  options.gzip = true;
  return deflate$1(input, options);
}

var Deflate_1$1 = Deflate$1;
var deflate_2 = deflate$1;
var deflateRaw_1$1 = deflateRaw$1;
var gzip_1$1 = gzip$1;
var constants$1 = constants$2;

var deflate_1$1 = {
	Deflate: Deflate_1$1,
	deflate: deflate_2,
	deflateRaw: deflateRaw_1$1,
	gzip: gzip_1$1,
	constants: constants$1
};

// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.
// See state defs from inflate.js

const BAD$1 = 30;
/* got a data error -- remain here until reset */

const TYPE$1 = 12;
/* i: waiting for type bits, including last-flag bit */

/*
   Decode literal, length, and distance codes and write out the resulting
   literal and match bytes until either not enough input or output is
   available, an end-of-block is encountered, or a data error is encountered.
   When large enough input and output buffers are supplied to inflate(), for
   example, a 16K input buffer and a 64K output buffer, more than 95% of the
   inflate execution time is spent in this routine.

   Entry assumptions:

        state.mode === LEN
        strm.avail_in >= 6
        strm.avail_out >= 258
        start >= strm.avail_out
        state.bits < 8

   On return, state.mode is one of:

        LEN -- ran out of enough output space or enough available input
        TYPE -- reached end of block code, inflate() to interpret next block
        BAD -- error in block data

   Notes:

    - The maximum input bits used by a length/distance pair is 15 bits for the
      length code, 5 bits for the length extra, 15 bits for the distance code,
      and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
      Therefore if strm.avail_in >= 6, then there is enough input to avoid
      checking for available input while decoding.

    - The maximum bytes that a single length/distance pair can output is 258
      bytes, which is the maximum length that can be coded.  inflate_fast()
      requires strm.avail_out >= 258 for each loop to avoid checking for
      output space.
 */

var inffast = function inflate_fast(strm, start) {
  let _in;
  /* local strm.input */


  let last;
  /* have enough input while in < last */

  let _out;
  /* local strm.output */


  let beg;
  /* inflate()'s initial strm.output */

  let end;
  /* while out < end, enough space available */
  //#ifdef INFLATE_STRICT

  let dmax;
  /* maximum distance from zlib header */
  //#endif

  let wsize;
  /* window size or zero if not using window */

  let whave;
  /* valid bytes in the window */

  let wnext;
  /* window write index */
  // Use `s_window` instead `window`, avoid conflict with instrumentation tools

  let s_window;
  /* allocated sliding window, if wsize != 0 */

  let hold;
  /* local strm.hold */

  let bits;
  /* local strm.bits */

  let lcode;
  /* local strm.lencode */

  let dcode;
  /* local strm.distcode */

  let lmask;
  /* mask for first level of length codes */

  let dmask;
  /* mask for first level of distance codes */

  let here;
  /* retrieved table entry */

  let op;
  /* code bits, operation, extra bits, or */

  /*  window position, window bytes to copy */

  let len;
  /* match length, unused bytes */

  let dist;
  /* match distance */

  let from;
  /* where to copy match from */

  let from_source;
  let input, output; // JS specific, because we have no pointers

  /* copy state to local variables */

  const state = strm.state; //here = state.here;

  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257); //#ifdef INFLATE_STRICT

  dmax = state.dmax; //#endif

  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;
  /* decode literals and length/distances until end-of-block or not enough
     input data or output space */

  top: do {
    if (bits < 15) {
      hold += input[_in++] << bits;
      bits += 8;
      hold += input[_in++] << bits;
      bits += 8;
    }

    here = lcode[hold & lmask];

    dolen: for (;;) {
      // Goto emulation
      op = here >>> 24
      /*here.bits*/
      ;
      hold >>>= op;
      bits -= op;
      op = here >>> 16 & 0xff
      /*here.op*/
      ;

      if (op === 0) {
        /* literal */
        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
        //        "inflate:         literal '%c'\n" :
        //        "inflate:         literal 0x%02x\n", here.val));
        output[_out++] = here & 0xffff
        /*here.val*/
        ;
      } else if (op & 16) {
        /* length base */
        len = here & 0xffff
        /*here.val*/
        ;
        op &= 15;
        /* number of extra bits */

        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits;
            bits += 8;
          }

          len += hold & (1 << op) - 1;
          hold >>>= op;
          bits -= op;
        } //Tracevv((stderr, "inflate:         length %u\n", len));


        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }

        here = dcode[hold & dmask];

        dodist: for (;;) {
          // goto emulation
          op = here >>> 24
          /*here.bits*/
          ;
          hold >>>= op;
          bits -= op;
          op = here >>> 16 & 0xff
          /*here.op*/
          ;

          if (op & 16) {
            /* distance base */
            dist = here & 0xffff
            /*here.val*/
            ;
            op &= 15;
            /* number of extra bits */

            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;

              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
            }

            dist += hold & (1 << op) - 1; //#ifdef INFLATE_STRICT

            if (dist > dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD$1;
              break top;
            } //#endif


            hold >>>= op;
            bits -= op; //Tracevv((stderr, "inflate:         distance %u\n", dist));

            op = _out - beg;
            /* max distance in output */

            if (dist > op) {
              /* see if copy from window */
              op = dist - op;
              /* distance back in window */

              if (op > whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD$1;
                  break top;
                } // (!) This block is disabled in zlib defaults,
                // don't enable it for binary compatibility
                //#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
                //                if (len <= op - whave) {
                //                  do {
                //                    output[_out++] = 0;
                //                  } while (--len);
                //                  continue top;
                //                }
                //                len -= op - whave;
                //                do {
                //                  output[_out++] = 0;
                //                } while (--op > whave);
                //                if (op === 0) {
                //                  from = _out - dist;
                //                  do {
                //                    output[_out++] = output[from++];
                //                  } while (--len);
                //                  continue top;
                //                }
                //#endif

              }

              from = 0; // window index

              from_source = s_window;

              if (wnext === 0) {
                /* very common case */
                from += wsize - op;

                if (op < len) {
                  /* some from window */
                  len -= op;

                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);

                  from = _out - dist;
                  /* rest from output */

                  from_source = output;
                }
              } else if (wnext < op) {
                /* wrap around window */
                from += wsize + wnext - op;
                op -= wnext;

                if (op < len) {
                  /* some from end of window */
                  len -= op;

                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);

                  from = 0;

                  if (wnext < len) {
                    /* some from start of window */
                    op = wnext;
                    len -= op;

                    do {
                      output[_out++] = s_window[from++];
                    } while (--op);

                    from = _out - dist;
                    /* rest from output */

                    from_source = output;
                  }
                }
              } else {
                /* contiguous in window */
                from += wnext - op;

                if (op < len) {
                  /* some from window */
                  len -= op;

                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);

                  from = _out - dist;
                  /* rest from output */

                  from_source = output;
                }
              }

              while (len > 2) {
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                len -= 3;
              }

              if (len) {
                output[_out++] = from_source[from++];

                if (len > 1) {
                  output[_out++] = from_source[from++];
                }
              }
            } else {
              from = _out - dist;
              /* copy direct from output */

              do {
                /* minimum length is three */
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                len -= 3;
              } while (len > 2);

              if (len) {
                output[_out++] = output[from++];

                if (len > 1) {
                  output[_out++] = output[from++];
                }
              }
            }
          } else if ((op & 64) === 0) {
            /* 2nd level distance code */
            here = dcode[(here & 0xffff) + (
            /*here.val*/
            hold & (1 << op) - 1)];
            continue dodist;
          } else {
            strm.msg = 'invalid distance code';
            state.mode = BAD$1;
            break top;
          }

          break; // need to emulate goto via "continue"
        }
      } else if ((op & 64) === 0) {
        /* 2nd level length code */
        here = lcode[(here & 0xffff) + (
        /*here.val*/
        hold & (1 << op) - 1)];
        continue dolen;
      } else if (op & 32) {
        /* end-of-block */
        //Tracevv((stderr, "inflate:         end of block\n"));
        state.mode = TYPE$1;
        break top;
      } else {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD$1;
        break top;
      }

      break; // need to emulate goto via "continue"
    }
  } while (_in < last && _out < end);
  /* return unused bytes (on entry, bits < 8, so in won't go too far back) */


  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;
  /* update state and return */

  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
  strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
  state.hold = hold;
  state.bits = bits;
  return;
};

// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

const MAXBITS = 15;
const ENOUGH_LENS$1 = 852;
const ENOUGH_DISTS$1 = 592; //const ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

const CODES$1 = 0;
const LENS$1 = 1;
const DISTS$1 = 2;
const lbase = new Uint16Array([
/* Length codes 257..285 base */
3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0]);
const lext = new Uint8Array([
/* Length codes 257..285 extra */
16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78]);
const dbase = new Uint16Array([
/* Distance codes 0..29 base */
1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0]);
const dext = new Uint8Array([
/* Distance codes 0..29 extra */
16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64]);

const inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
  const bits = opts.bits; //here = opts.here; /* table entry for duplication */

  let len = 0;
  /* a code's length in bits */

  let sym = 0;
  /* index of code symbols */

  let min = 0,
      max = 0;
  /* minimum and maximum code lengths */

  let root = 0;
  /* number of index bits for root table */

  let curr = 0;
  /* number of index bits for current table */

  let drop = 0;
  /* code bits to drop for sub-table */

  let left = 0;
  /* number of prefix codes available */

  let used = 0;
  /* code entries in table used */

  let huff = 0;
  /* Huffman code */

  let incr;
  /* for incrementing code, index */

  let fill;
  /* index for replicating entries */

  let low;
  /* low bits for current root entry */

  let mask;
  /* mask for low root bits */

  let next;
  /* next available space in table */

  let base = null;
  /* base value table to use */

  let base_index = 0; //  let shoextra;    /* extra bits table to use */

  let end;
  /* use base and extra for symbol > end */

  const count = new Uint16Array(MAXBITS + 1); //[MAXBITS+1];    /* number of codes of each length */

  const offs = new Uint16Array(MAXBITS + 1); //[MAXBITS+1];     /* offsets in table for each length */

  let extra = null;
  let extra_index = 0;
  let here_bits, here_op, here_val;
  /*
   Process a set of code lengths to create a canonical Huffman code.  The
   code lengths are lens[0..codes-1].  Each length corresponds to the
   symbols 0..codes-1.  The Huffman code is generated by first sorting the
   symbols by length from short to long, and retaining the symbol order
   for codes with equal lengths.  Then the code starts with all zero bits
   for the first code of the shortest length, and the codes are integer
   increments for the same length, and zeros are appended as the length
   increases.  For the deflate format, these bits are stored backwards
   from their more natural integer increment ordering, and so when the
   decoding tables are built in the large loop below, the integer codes
   are incremented backwards.
    This routine assumes, but does not check, that all of the entries in
   lens[] are in the range 0..MAXBITS.  The caller must assure this.
   1..MAXBITS is interpreted as that code length.  zero means that that
   symbol does not occur in this code.
    The codes are sorted by computing a count of codes for each length,
   creating from that a table of starting indices for each length in the
   sorted table, and then entering the symbols in order in the sorted
   table.  The sorted table is work[], with that space being provided by
   the caller.
    The length counts are used for other purposes as well, i.e. finding
   the minimum and maximum length codes, determining if there are any
   codes at all, checking for a valid set of lengths, and looking ahead
   at length counts to determine sub-table sizes when building the
   decoding tables.
   */

  /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */

  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }

  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }
  /* bound code lengths, force root to be within code lengths */


  root = bits;

  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) {
      break;
    }
  }

  if (root > max) {
    root = max;
  }

  if (max === 0) {
    /* no symbols to code at all */
    //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
    //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
    //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
    table[table_index++] = 1 << 24 | 64 << 16 | 0; //table.op[opts.table_index] = 64;
    //table.bits[opts.table_index] = 1;
    //table.val[opts.table_index++] = 0;

    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    opts.bits = 1;
    return 0;
    /* no symbols, but wait for decoding to report error */
  }

  for (min = 1; min < max; min++) {
    if (count[min] !== 0) {
      break;
    }
  }

  if (root < min) {
    root = min;
  }
  /* check for an over-subscribed or incomplete set of lengths */


  left = 1;

  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];

    if (left < 0) {
      return -1;
    }
    /* over-subscribed */

  }

  if (left > 0 && (type === CODES$1 || max !== 1)) {
    return -1;
    /* incomplete set */
  }
  /* generate offsets into symbol table for each length for sorting */


  offs[1] = 0;

  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }
  /* sort symbols by length, by symbol order within each length */


  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }
  /*
   Create and fill in decoding tables.  In this loop, the table being
   filled is at next and has curr index bits.  The code being used is huff
   with length len.  That code is converted to an index by dropping drop
   bits off of the bottom.  For codes where len is less than drop + curr,
   those top drop + curr - len bits are incremented through all values to
   fill the table with replicated entries.
    root is the number of index bits for the root table.  When len exceeds
   root, sub-tables are created pointed to by the root entry with an index
   of the low root bits of huff.  This is saved in low to check for when a
   new sub-table should be started.  drop is zero when the root table is
   being filled, and drop is root when sub-tables are being filled.
    When a new sub-table is needed, it is necessary to look ahead in the
   code lengths to determine what size sub-table is needed.  The length
   counts are used for this, and so count[] is decremented as codes are
   entered in the tables.
    used keeps track of how many table entries have been allocated from the
   provided *table space.  It is checked for LENS and DIST tables against
   the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
   the initial root table size constants.  See the comments in inftrees.h
   for more information.
    sym increments through all symbols, and the loop terminates when
   all codes of length max, i.e. all codes, have been processed.  This
   routine permits incomplete codes, so another loop after this one fills
   in the rest of the decoding tables with invalid code markers.
   */

  /* set up for code type */
  // poor man optimization - use if-else instead of switch,
  // to avoid deopts in old v8


  if (type === CODES$1) {
    base = extra = work;
    /* dummy value--not used */

    end = 19;
  } else if (type === LENS$1) {
    base = lbase;
    base_index -= 257;
    extra = lext;
    extra_index -= 257;
    end = 256;
  } else {
    /* DISTS */
    base = dbase;
    extra = dext;
    end = -1;
  }
  /* initialize opts for loop */


  huff = 0;
  /* starting code */

  sym = 0;
  /* starting code symbol */

  len = min;
  /* starting code length */

  next = table_index;
  /* current table to fill in */

  curr = root;
  /* current table index bits */

  drop = 0;
  /* current bits to drop from code for index */

  low = -1;
  /* trigger new sub-table when len > root */

  used = 1 << root;
  /* use root table entries */

  mask = used - 1;
  /* mask for comparing low */

  /* check available table space */

  if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
    return 1;
  }
  /* process all codes and make table entries */


  for (;;) {
    /* create table entry */
    here_bits = len - drop;

    if (work[sym] < end) {
      here_op = 0;
      here_val = work[sym];
    } else if (work[sym] > end) {
      here_op = extra[extra_index + work[sym]];
      here_val = base[base_index + work[sym]];
    } else {
      here_op = 32 + 64;
      /* end of block */

      here_val = 0;
    }
    /* replicate for those indices with low len bits equal to huff */


    incr = 1 << len - drop;
    fill = 1 << curr;
    min = fill;
    /* save offset to next table */

    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
    } while (fill !== 0);
    /* backwards increment the len-bit code huff */


    incr = 1 << len - 1;

    while (huff & incr) {
      incr >>= 1;
    }

    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }
    /* go to next symbol, update count, len */


    sym++;

    if (--count[len] === 0) {
      if (len === max) {
        break;
      }

      len = lens[lens_index + work[sym]];
    }
    /* create new sub-table if needed */


    if (len > root && (huff & mask) !== low) {
      /* if first time, transition to sub-tables */
      if (drop === 0) {
        drop = root;
      }
      /* increment past last table */


      next += min;
      /* here min is 1 << curr */

      /* determine length of next table */

      curr = len - drop;
      left = 1 << curr;

      while (curr + drop < max) {
        left -= count[curr + drop];

        if (left <= 0) {
          break;
        }

        curr++;
        left <<= 1;
      }
      /* check for enough space */


      used += 1 << curr;

      if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
        return 1;
      }
      /* point entry in root table to sub-table */


      low = huff & mask;
      /*table.op[low] = curr;
      table.bits[low] = root;
      table.val[low] = next - opts.table_index;*/

      table[low] = root << 24 | curr << 16 | next - table_index | 0;
    }
  }
  /* fill in remaining table entry if code is incomplete (guaranteed to have
   at most one remaining entry, since if the code is incomplete, the
   maximum code length that was allowed to get this far is one bit) */


  if (huff !== 0) {
    //table.op[next + huff] = 64;            /* invalid code marker */
    //table.bits[next + huff] = len - drop;
    //table.val[next + huff] = 0;
    table[next + huff] = len - drop << 24 | 64 << 16 | 0;
  }
  /* set return parameters */
  //opts.table_index += used;


  opts.bits = root;
  return 0;
};

var inftrees = inflate_table;

// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.









const CODES = 0;
const LENS = 1;
const DISTS = 2;
/* Public constants ==========================================================*/

/* ===========================================================================*/

const {
  Z_FINISH: Z_FINISH$1,
  Z_BLOCK,
  Z_TREES,
  Z_OK: Z_OK$1,
  Z_STREAM_END: Z_STREAM_END$1,
  Z_NEED_DICT: Z_NEED_DICT$1,
  Z_STREAM_ERROR: Z_STREAM_ERROR$1,
  Z_DATA_ERROR: Z_DATA_ERROR$1,
  Z_MEM_ERROR: Z_MEM_ERROR$1,
  Z_BUF_ERROR,
  Z_DEFLATED
} = constants$2;
/* STATES ====================================================================*/

/* ===========================================================================*/


const HEAD = 1;
/* i: waiting for magic header */

const FLAGS = 2;
/* i: waiting for method and flags (gzip) */

const TIME = 3;
/* i: waiting for modification time (gzip) */

const OS = 4;
/* i: waiting for extra flags and operating system (gzip) */

const EXLEN = 5;
/* i: waiting for extra length (gzip) */

const EXTRA = 6;
/* i: waiting for extra bytes (gzip) */

const NAME = 7;
/* i: waiting for end of file name (gzip) */

const COMMENT = 8;
/* i: waiting for end of comment (gzip) */

const HCRC = 9;
/* i: waiting for header crc (gzip) */

const DICTID = 10;
/* i: waiting for dictionary check value */

const DICT = 11;
/* waiting for inflateSetDictionary() call */

const TYPE = 12;
/* i: waiting for type bits, including last-flag bit */

const TYPEDO = 13;
/* i: same, but skip check to exit inflate on new block */

const STORED = 14;
/* i: waiting for stored size (length and complement) */

const COPY_ = 15;
/* i/o: same as COPY below, but only first time in */

const COPY = 16;
/* i/o: waiting for input or output to copy stored block */

const TABLE = 17;
/* i: waiting for dynamic block table lengths */

const LENLENS = 18;
/* i: waiting for code length code lengths */

const CODELENS = 19;
/* i: waiting for length/lit and distance code lengths */

const LEN_ = 20;
/* i: same as LEN below, but only first time in */

const LEN = 21;
/* i: waiting for length/lit/eob code */

const LENEXT = 22;
/* i: waiting for length extra bits */

const DIST = 23;
/* i: waiting for distance code */

const DISTEXT = 24;
/* i: waiting for distance extra bits */

const MATCH = 25;
/* o: waiting for output space to copy string */

const LIT = 26;
/* o: waiting for output space to write literal */

const CHECK = 27;
/* i: waiting for 32-bit check value */

const LENGTH = 28;
/* i: waiting for 32-bit length (gzip) */

const DONE = 29;
/* finished check, done -- remain here until reset */

const BAD = 30;
/* got a data error -- remain here until reset */

const MEM = 31;
/* got an inflate() memory error -- remain here until reset */

const SYNC = 32;
/* looking for synchronization bytes to restart inflate() */

/* ===========================================================================*/

const ENOUGH_LENS = 852;
const ENOUGH_DISTS = 592; //const ENOUGH =  (ENOUGH_LENS+ENOUGH_DISTS);

const MAX_WBITS = 15;
/* 32K LZ77 window */

const DEF_WBITS = MAX_WBITS;

const zswap32 = q => {
  return (q >>> 24 & 0xff) + (q >>> 8 & 0xff00) + ((q & 0xff00) << 8) + ((q & 0xff) << 24);
};

function InflateState() {
  this.mode = 0;
  /* current inflate mode */

  this.last = false;
  /* true if processing last block */

  this.wrap = 0;
  /* bit 0 true for zlib, bit 1 true for gzip */

  this.havedict = false;
  /* true if dictionary provided */

  this.flags = 0;
  /* gzip header method and flags (0 if zlib) */

  this.dmax = 0;
  /* zlib header max distance (INFLATE_STRICT) */

  this.check = 0;
  /* protected copy of check value */

  this.total = 0;
  /* protected copy of output count */
  // TODO: may be {}

  this.head = null;
  /* where to save gzip header information */

  /* sliding window */

  this.wbits = 0;
  /* log base 2 of requested window size */

  this.wsize = 0;
  /* window size or zero if not using window */

  this.whave = 0;
  /* valid bytes in the window */

  this.wnext = 0;
  /* window write index */

  this.window = null;
  /* allocated sliding window, if needed */

  /* bit accumulator */

  this.hold = 0;
  /* input bit accumulator */

  this.bits = 0;
  /* number of bits in "in" */

  /* for string and stored block copying */

  this.length = 0;
  /* literal or length of data to copy */

  this.offset = 0;
  /* distance back to copy string from */

  /* for table and code decoding */

  this.extra = 0;
  /* extra bits needed */

  /* fixed and dynamic code tables */

  this.lencode = null;
  /* starting table for length/literal codes */

  this.distcode = null;
  /* starting table for distance codes */

  this.lenbits = 0;
  /* index bits for lencode */

  this.distbits = 0;
  /* index bits for distcode */

  /* dynamic table building */

  this.ncode = 0;
  /* number of code length code lengths */

  this.nlen = 0;
  /* number of length code lengths */

  this.ndist = 0;
  /* number of distance code lengths */

  this.have = 0;
  /* number of code lengths in lens[] */

  this.next = null;
  /* next available space in codes[] */

  this.lens = new Uint16Array(320);
  /* temporary storage for code lengths */

  this.work = new Uint16Array(288);
  /* work area for code table building */

  /*
   because we don't have pointers in js, we use lencode and distcode directly
   as buffers so we don't need codes
  */
  //this.codes = new Int32Array(ENOUGH);       /* space for code tables */

  this.lendyn = null;
  /* dynamic table for length/literal codes (JS specific) */

  this.distdyn = null;
  /* dynamic table for distance codes (JS specific) */

  this.sane = 0;
  /* if false, allow invalid distance too far */

  this.back = 0;
  /* bits back of last unprocessed length/lit */

  this.was = 0;
  /* initial length of match */
}

const inflateResetKeep = strm => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }

  const state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = '';
  /*Z_NULL*/

  if (state.wrap) {
    /* to support ill-conceived Java test suite */
    strm.adler = state.wrap & 1;
  }

  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.dmax = 32768;
  state.head = null
  /*Z_NULL*/
  ;
  state.hold = 0;
  state.bits = 0; //state.lencode = state.distcode = state.next = state.codes;

  state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
  state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
  state.sane = 1;
  state.back = -1; //Tracev((stderr, "inflate: reset\n"));

  return Z_OK$1;
};

const inflateReset = strm => {
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }

  const state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);
};

const inflateReset2 = (strm, windowBits) => {
  let wrap;
  /* get the state */

  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }

  const state = strm.state;
  /* extract wrap request from windowBits parameter */

  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else {
    wrap = (windowBits >> 4) + 1;

    if (windowBits < 48) {
      windowBits &= 15;
    }
  }
  /* set number of window bits, free window if different */


  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR$1;
  }

  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }
  /* update state and reset the rest of it */


  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
};

const inflateInit2 = (strm, windowBits) => {
  if (!strm) {
    return Z_STREAM_ERROR$1;
  } //strm.msg = Z_NULL;                 /* in case we return an error */


  const state = new InflateState(); //if (state === Z_NULL) return Z_MEM_ERROR;
  //Tracev((stderr, "inflate: allocated\n"));

  strm.state = state;
  state.window = null
  /*Z_NULL*/
  ;
  const ret = inflateReset2(strm, windowBits);

  if (ret !== Z_OK$1) {
    strm.state = null
    /*Z_NULL*/
    ;
  }

  return ret;
};

const inflateInit = strm => {
  return inflateInit2(strm, DEF_WBITS);
};
/*
 Return state with length and distance decoding tables and index sizes set to
 fixed code decoding.  Normally this returns fixed tables from inffixed.h.
 If BUILDFIXED is defined, then instead this routine builds the tables the
 first time it's called, and returns those tables the first time and
 thereafter.  This reduces the size of the code by about 2K bytes, in
 exchange for a little execution time.  However, BUILDFIXED should not be
 used for threaded applications, since the rewriting of the tables and virgin
 may not be thread-safe.
 */


let virgin = true;
let lenfix, distfix; // We have no pointers in JS, so keep tables separate

const fixedtables = state => {
  /* build fixed huffman tables if first call (may not be thread safe) */
  if (virgin) {
    lenfix = new Int32Array(512);
    distfix = new Int32Array(32);
    /* literal/length table */

    let sym = 0;

    while (sym < 144) {
      state.lens[sym++] = 8;
    }

    while (sym < 256) {
      state.lens[sym++] = 9;
    }

    while (sym < 280) {
      state.lens[sym++] = 7;
    }

    while (sym < 288) {
      state.lens[sym++] = 8;
    }

    inftrees(LENS, state.lens, 0, 288, lenfix, 0, state.work, {
      bits: 9
    });
    /* distance table */

    sym = 0;

    while (sym < 32) {
      state.lens[sym++] = 5;
    }

    inftrees(DISTS, state.lens, 0, 32, distfix, 0, state.work, {
      bits: 5
    });
    /* do this just once */

    virgin = false;
  }

  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
};
/*
 Update the window with the last wsize (normally 32K) bytes written before
 returning.  If window does not exist yet, create it.  This is only called
 when a window is already in use, or when output has been written during this
 inflate call, but the end of the deflate stream has not been reached yet.
 It is also called to create a window for dictionary data when a dictionary
 is loaded.

 Providing output buffers larger than 32K to inflate() should provide a speed
 advantage, since only the last 32K of output is copied to the sliding window
 upon return from inflate(), and since all distances after the first 32K of
 output will fall in the output data, making match copies simpler and faster.
 The advantage may be dependent on the size of the processor's data caches.
 */


const updatewindow = (strm, src, end, copy) => {
  let dist;
  const state = strm.state;
  /* if it hasn't been done already, allocate space for the window */

  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;
    state.window = new Uint8Array(state.wsize);
  }
  /* copy state->wsize or less output bytes into the circular window */


  if (copy >= state.wsize) {
    state.window.set(src.subarray(end - state.wsize, end), 0);
    state.wnext = 0;
    state.whave = state.wsize;
  } else {
    dist = state.wsize - state.wnext;

    if (dist > copy) {
      dist = copy;
    } //zmemcpy(state->window + state->wnext, end - copy, dist);


    state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
    copy -= dist;

    if (copy) {
      //zmemcpy(state->window, end - copy, copy);
      state.window.set(src.subarray(end - copy, end), 0);
      state.wnext = copy;
      state.whave = state.wsize;
    } else {
      state.wnext += dist;

      if (state.wnext === state.wsize) {
        state.wnext = 0;
      }

      if (state.whave < state.wsize) {
        state.whave += dist;
      }
    }
  }

  return 0;
};

const inflate$2 = (strm, flush) => {
  let state;
  let input, output; // input/output buffers

  let next;
  /* next input INDEX */

  let put;
  /* next output INDEX */

  let have, left;
  /* available input and output */

  let hold;
  /* bit buffer */

  let bits;
  /* bits in bit buffer */

  let _in, _out;
  /* save starting available input and output */


  let copy;
  /* number of stored or match bytes to copy */

  let from;
  /* where to copy match bytes from */

  let from_source;
  let here = 0;
  /* current decoding table entry */

  let here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
  //let last;                   /* parent table entry */

  let last_bits, last_op, last_val; // paked "last" denormalized (JS specific)

  let len;
  /* length to copy for repeats, bits to drop */

  let ret;
  /* return code */

  const hbuf = new Uint8Array(4);
  /* buffer for gzip header crc calculation */

  let opts;
  let n; // temporary variable for NEED_BITS

  const order =
  /* permutation of code lengths */
  new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);

  if (!strm || !strm.state || !strm.output || !strm.input && strm.avail_in !== 0) {
    return Z_STREAM_ERROR$1;
  }

  state = strm.state;

  if (state.mode === TYPE) {
    state.mode = TYPEDO;
  }
  /* skip check */
  //--- LOAD() ---


  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits; //---

  _in = have;
  _out = left;
  ret = Z_OK$1;

  inf_leave: // goto emulation
  for (;;) {
    switch (state.mode) {
      case HEAD:
        if (state.wrap === 0) {
          state.mode = TYPEDO;
          break;
        } //=== NEEDBITS(16);


        while (bits < 16) {
          if (have === 0) {
            break inf_leave;
          }

          have--;
          hold += input[next++] << bits;
          bits += 8;
        } //===//


        if (state.wrap & 2 && hold === 0x8b1f) {
          /* gzip header */
          state.check = 0
          /*crc32(0L, Z_NULL, 0)*/
          ; //=== CRC2(state.check, hold);

          hbuf[0] = hold & 0xff;
          hbuf[1] = hold >>> 8 & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0); //===//
          //=== INITBITS();

          hold = 0;
          bits = 0; //===//

          state.mode = FLAGS;
          break;
        }

        state.flags = 0;
        /* expect zlib header */

        if (state.head) {
          state.head.done = false;
        }

        if (!(state.wrap & 1) ||
        /* check if zlib header allowed */
        (((hold & 0xff) <<
        /*BITS(8)*/
        8) + (hold >> 8)) % 31) {
          strm.msg = 'incorrect header check';
          state.mode = BAD;
          break;
        }

        if ((hold & 0x0f) !==
        /*BITS(4)*/
        Z_DEFLATED) {
          strm.msg = 'unknown compression method';
          state.mode = BAD;
          break;
        } //--- DROPBITS(4) ---//


        hold >>>= 4;
        bits -= 4; //---//

        len = (hold & 0x0f) +
        /*BITS(4)*/
        8;

        if (state.wbits === 0) {
          state.wbits = len;
        } else if (len > state.wbits) {
          strm.msg = 'invalid window size';
          state.mode = BAD;
          break;
        } // !!! pako patch. Force use `options.windowBits` if passed.
        // Required to always use max window size by default.


        state.dmax = 1 << state.wbits; //state.dmax = 1 << len;
        //Tracev((stderr, "inflate:   zlib header ok\n"));

        strm.adler = state.check = 1
        /*adler32(0L, Z_NULL, 0)*/
        ;
        state.mode = hold & 0x200 ? DICTID : TYPE; //=== INITBITS();

        hold = 0;
        bits = 0; //===//

        break;

      case FLAGS:
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) {
            break inf_leave;
          }

          have--;
          hold += input[next++] << bits;
          bits += 8;
        } //===//


        state.flags = hold;

        if ((state.flags & 0xff) !== Z_DEFLATED) {
          strm.msg = 'unknown compression method';
          state.mode = BAD;
          break;
        }

        if (state.flags & 0xe000) {
          strm.msg = 'unknown header flags set';
          state.mode = BAD;
          break;
        }

        if (state.head) {
          state.head.text = hold >> 8 & 1;
        }

        if (state.flags & 0x0200) {
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = hold >>> 8 & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0); //===//
        } //=== INITBITS();


        hold = 0;
        bits = 0; //===//

        state.mode = TIME;

      /* falls through */

      case TIME:
        //=== NEEDBITS(32); */
        while (bits < 32) {
          if (have === 0) {
            break inf_leave;
          }

          have--;
          hold += input[next++] << bits;
          bits += 8;
        } //===//


        if (state.head) {
          state.head.time = hold;
        }

        if (state.flags & 0x0200) {
          //=== CRC4(state.check, hold)
          hbuf[0] = hold & 0xff;
          hbuf[1] = hold >>> 8 & 0xff;
          hbuf[2] = hold >>> 16 & 0xff;
          hbuf[3] = hold >>> 24 & 0xff;
          state.check = crc32_1(state.check, hbuf, 4, 0); //===
        } //=== INITBITS();


        hold = 0;
        bits = 0; //===//

        state.mode = OS;

      /* falls through */

      case OS:
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) {
            break inf_leave;
          }

          have--;
          hold += input[next++] << bits;
          bits += 8;
        } //===//


        if (state.head) {
          state.head.xflags = hold & 0xff;
          state.head.os = hold >> 8;
        }

        if (state.flags & 0x0200) {
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = hold >>> 8 & 0xff;
          state.check = crc32_1(state.check, hbuf, 2, 0); //===//
        } //=== INITBITS();


        hold = 0;
        bits = 0; //===//

        state.mode = EXLEN;

      /* falls through */

      case EXLEN:
        if (state.flags & 0x0400) {
          //=== NEEDBITS(16); */
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }

            have--;
            hold += input[next++] << bits;
            bits += 8;
          } //===//


          state.length = hold;

          if (state.head) {
            state.head.extra_len = hold;
          }

          if (state.flags & 0x0200) {
            //=== CRC2(state.check, hold);
            hbuf[0] = hold & 0xff;
            hbuf[1] = hold >>> 8 & 0xff;
            state.check = crc32_1(state.check, hbuf, 2, 0); //===//
          } //=== INITBITS();


          hold = 0;
          bits = 0; //===//
        } else if (state.head) {
          state.head.extra = null
          /*Z_NULL*/
          ;
        }

        state.mode = EXTRA;

      /* falls through */

      case EXTRA:
        if (state.flags & 0x0400) {
          copy = state.length;

          if (copy > have) {
            copy = have;
          }

          if (copy) {
            if (state.head) {
              len = state.head.extra_len - state.length;

              if (!state.head.extra) {
                // Use untyped array for more convenient processing later
                state.head.extra = new Uint8Array(state.head.extra_len);
              }

              state.head.extra.set(input.subarray(next, // extra field is limited to 65536 bytes
              // - no need for additional size check
              next + copy),
              /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
              len); //zmemcpy(state.head.extra + len, next,
              //        len + copy > state.head.extra_max ?
              //        state.head.extra_max - len : copy);
            }

            if (state.flags & 0x0200) {
              state.check = crc32_1(state.check, input, copy, next);
            }

            have -= copy;
            next += copy;
            state.length -= copy;
          }

          if (state.length) {
            break inf_leave;
          }
        }

        state.length = 0;
        state.mode = NAME;

      /* falls through */

      case NAME:
        if (state.flags & 0x0800) {
          if (have === 0) {
            break inf_leave;
          }

          copy = 0;

          do {
            // TODO: 2 or 1 bytes?
            len = input[next + copy++];
            /* use constant limit because in js we should not preallocate memory */

            if (state.head && len && state.length < 65536
            /*state.head.name_max*/
            ) {
              state.head.name += String.fromCharCode(len);
            }
          } while (len && copy < have);

          if (state.flags & 0x0200) {
            state.check = crc32_1(state.check, input, copy, next);
          }

          have -= copy;
          next += copy;

          if (len) {
            break inf_leave;
          }
        } else if (state.head) {
          state.head.name = null;
        }

        state.length = 0;
        state.mode = COMMENT;

      /* falls through */

      case COMMENT:
        if (state.flags & 0x1000) {
          if (have === 0) {
            break inf_leave;
          }

          copy = 0;

          do {
            len = input[next + copy++];
            /* use constant limit because in js we should not preallocate memory */

            if (state.head && len && state.length < 65536
            /*state.head.comm_max*/
            ) {
              state.head.comment += String.fromCharCode(len);
            }
          } while (len && copy < have);

          if (state.flags & 0x0200) {
            state.check = crc32_1(state.check, input, copy, next);
          }

          have -= copy;
          next += copy;

          if (len) {
            break inf_leave;
          }
        } else if (state.head) {
          state.head.comment = null;
        }

        state.mode = HCRC;

      /* falls through */

      case HCRC:
        if (state.flags & 0x0200) {
          //=== NEEDBITS(16); */
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }

            have--;
            hold += input[next++] << bits;
            bits += 8;
          } //===//


          if (hold !== (state.check & 0xffff)) {
            strm.msg = 'header crc mismatch';
            state.mode = BAD;
            break;
          } //=== INITBITS();


          hold = 0;
          bits = 0; //===//
        }

        if (state.head) {
          state.head.hcrc = state.flags >> 9 & 1;
          state.head.done = true;
        }

        strm.adler = state.check = 0;
        state.mode = TYPE;
        break;

      case DICTID:
        //=== NEEDBITS(32); */
        while (bits < 32) {
          if (have === 0) {
            break inf_leave;
          }

          have--;
          hold += input[next++] << bits;
          bits += 8;
        } //===//


        strm.adler = state.check = zswap32(hold); //=== INITBITS();

        hold = 0;
        bits = 0; //===//

        state.mode = DICT;

      /* falls through */

      case DICT:
        if (state.havedict === 0) {
          //--- RESTORE() ---
          strm.next_out = put;
          strm.avail_out = left;
          strm.next_in = next;
          strm.avail_in = have;
          state.hold = hold;
          state.bits = bits; //---

          return Z_NEED_DICT$1;
        }

        strm.adler = state.check = 1
        /*adler32(0L, Z_NULL, 0)*/
        ;
        state.mode = TYPE;

      /* falls through */

      case TYPE:
        if (flush === Z_BLOCK || flush === Z_TREES) {
          break inf_leave;
        }

      /* falls through */

      case TYPEDO:
        if (state.last) {
          //--- BYTEBITS() ---//
          hold >>>= bits & 7;
          bits -= bits & 7; //---//

          state.mode = CHECK;
          break;
        } //=== NEEDBITS(3); */


        while (bits < 3) {
          if (have === 0) {
            break inf_leave;
          }

          have--;
          hold += input[next++] << bits;
          bits += 8;
        } //===//


        state.last = hold & 0x01
        /*BITS(1)*/
        ; //--- DROPBITS(1) ---//

        hold >>>= 1;
        bits -= 1; //---//

        switch (hold & 0x03) {
          /*BITS(2)*/
          case 0:
            /* stored block */
            //Tracev((stderr, "inflate:     stored block%s\n",
            //        state.last ? " (last)" : ""));
            state.mode = STORED;
            break;

          case 1:
            /* fixed block */
            fixedtables(state); //Tracev((stderr, "inflate:     fixed codes block%s\n",
            //        state.last ? " (last)" : ""));

            state.mode = LEN_;
            /* decode codes */

            if (flush === Z_TREES) {
              //--- DROPBITS(2) ---//
              hold >>>= 2;
              bits -= 2; //---//

              break inf_leave;
            }

            break;

          case 2:
            /* dynamic block */
            //Tracev((stderr, "inflate:     dynamic codes block%s\n",
            //        state.last ? " (last)" : ""));
            state.mode = TABLE;
            break;

          case 3:
            strm.msg = 'invalid block type';
            state.mode = BAD;
        } //--- DROPBITS(2) ---//


        hold >>>= 2;
        bits -= 2; //---//

        break;

      case STORED:
        //--- BYTEBITS() ---// /* go to byte boundary */
        hold >>>= bits & 7;
        bits -= bits & 7; //---//
        //=== NEEDBITS(32); */

        while (bits < 32) {
          if (have === 0) {
            break inf_leave;
          }

          have--;
          hold += input[next++] << bits;
          bits += 8;
        } //===//


        if ((hold & 0xffff) !== (hold >>> 16 ^ 0xffff)) {
          strm.msg = 'invalid stored block lengths';
          state.mode = BAD;
          break;
        }

        state.length = hold & 0xffff; //Tracev((stderr, "inflate:       stored length %u\n",
        //        state.length));
        //=== INITBITS();

        hold = 0;
        bits = 0; //===//

        state.mode = COPY_;

        if (flush === Z_TREES) {
          break inf_leave;
        }

      /* falls through */

      case COPY_:
        state.mode = COPY;

      /* falls through */

      case COPY:
        copy = state.length;

        if (copy) {
          if (copy > have) {
            copy = have;
          }

          if (copy > left) {
            copy = left;
          }

          if (copy === 0) {
            break inf_leave;
          } //--- zmemcpy(put, next, copy); ---


          output.set(input.subarray(next, next + copy), put); //---//

          have -= copy;
          next += copy;
          left -= copy;
          put += copy;
          state.length -= copy;
          break;
        } //Tracev((stderr, "inflate:       stored end\n"));


        state.mode = TYPE;
        break;

      case TABLE:
        //=== NEEDBITS(14); */
        while (bits < 14) {
          if (have === 0) {
            break inf_leave;
          }

          have--;
          hold += input[next++] << bits;
          bits += 8;
        } //===//


        state.nlen = (hold & 0x1f) +
        /*BITS(5)*/
        257; //--- DROPBITS(5) ---//

        hold >>>= 5;
        bits -= 5; //---//

        state.ndist = (hold & 0x1f) +
        /*BITS(5)*/
        1; //--- DROPBITS(5) ---//

        hold >>>= 5;
        bits -= 5; //---//

        state.ncode = (hold & 0x0f) +
        /*BITS(4)*/
        4; //--- DROPBITS(4) ---//

        hold >>>= 4;
        bits -= 4; //---//
        //#ifndef PKZIP_BUG_WORKAROUND

        if (state.nlen > 286 || state.ndist > 30) {
          strm.msg = 'too many length or distance symbols';
          state.mode = BAD;
          break;
        } //#endif
        //Tracev((stderr, "inflate:       table sizes ok\n"));


        state.have = 0;
        state.mode = LENLENS;

      /* falls through */

      case LENLENS:
        while (state.have < state.ncode) {
          //=== NEEDBITS(3);
          while (bits < 3) {
            if (have === 0) {
              break inf_leave;
            }

            have--;
            hold += input[next++] << bits;
            bits += 8;
          } //===//


          state.lens[order[state.have++]] = hold & 0x07; //BITS(3);
          //--- DROPBITS(3) ---//

          hold >>>= 3;
          bits -= 3; //---//
        }

        while (state.have < 19) {
          state.lens[order[state.have++]] = 0;
        } // We have separate tables & no pointers. 2 commented lines below not needed.
        //state.next = state.codes;
        //state.lencode = state.next;
        // Switch to use dynamic table


        state.lencode = state.lendyn;
        state.lenbits = 7;
        opts = {
          bits: state.lenbits
        };
        ret = inftrees(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
        state.lenbits = opts.bits;

        if (ret) {
          strm.msg = 'invalid code lengths set';
          state.mode = BAD;
          break;
        } //Tracev((stderr, "inflate:       code lengths ok\n"));


        state.have = 0;
        state.mode = CODELENS;

      /* falls through */

      case CODELENS:
        while (state.have < state.nlen + state.ndist) {
          for (;;) {
            here = state.lencode[hold & (1 << state.lenbits) - 1];
            /*BITS(state.lenbits)*/

            here_bits = here >>> 24;
            here_op = here >>> 16 & 0xff;
            here_val = here & 0xffff;

            if (here_bits <= bits) {
              break;
            } //--- PULLBYTE() ---//


            if (have === 0) {
              break inf_leave;
            }

            have--;
            hold += input[next++] << bits;
            bits += 8; //---//
          }

          if (here_val < 16) {
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits; //---//

            state.lens[state.have++] = here_val;
          } else {
            if (here_val === 16) {
              //=== NEEDBITS(here.bits + 2);
              n = here_bits + 2;

              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }

                have--;
                hold += input[next++] << bits;
                bits += 8;
              } //===//
              //--- DROPBITS(here.bits) ---//


              hold >>>= here_bits;
              bits -= here_bits; //---//

              if (state.have === 0) {
                strm.msg = 'invalid bit length repeat';
                state.mode = BAD;
                break;
              }

              len = state.lens[state.have - 1];
              copy = 3 + (hold & 0x03); //BITS(2);
              //--- DROPBITS(2) ---//

              hold >>>= 2;
              bits -= 2; //---//
            } else if (here_val === 17) {
              //=== NEEDBITS(here.bits + 3);
              n = here_bits + 3;

              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }

                have--;
                hold += input[next++] << bits;
                bits += 8;
              } //===//
              //--- DROPBITS(here.bits) ---//


              hold >>>= here_bits;
              bits -= here_bits; //---//

              len = 0;
              copy = 3 + (hold & 0x07); //BITS(3);
              //--- DROPBITS(3) ---//

              hold >>>= 3;
              bits -= 3; //---//
            } else {
              //=== NEEDBITS(here.bits + 7);
              n = here_bits + 7;

              while (bits < n) {
                if (have === 0) {
                  break inf_leave;
                }

                have--;
                hold += input[next++] << bits;
                bits += 8;
              } //===//
              //--- DROPBITS(here.bits) ---//


              hold >>>= here_bits;
              bits -= here_bits; //---//

              len = 0;
              copy = 11 + (hold & 0x7f); //BITS(7);
              //--- DROPBITS(7) ---//

              hold >>>= 7;
              bits -= 7; //---//
            }

            if (state.have + copy > state.nlen + state.ndist) {
              strm.msg = 'invalid bit length repeat';
              state.mode = BAD;
              break;
            }

            while (copy--) {
              state.lens[state.have++] = len;
            }
          }
        }
        /* handle error breaks in while */


        if (state.mode === BAD) {
          break;
        }
        /* check for end-of-block code (better have one) */


        if (state.lens[256] === 0) {
          strm.msg = 'invalid code -- missing end-of-block';
          state.mode = BAD;
          break;
        }
        /* build code tables -- note: do not change the lenbits or distbits
           values here (9 and 6) without reading the comments in inftrees.h
           concerning the ENOUGH constants, which depend on those values */


        state.lenbits = 9;
        opts = {
          bits: state.lenbits
        };
        ret = inftrees(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts); // We have separate tables & no pointers. 2 commented lines below not needed.
        // state.next_index = opts.table_index;

        state.lenbits = opts.bits; // state.lencode = state.next;

        if (ret) {
          strm.msg = 'invalid literal/lengths set';
          state.mode = BAD;
          break;
        }

        state.distbits = 6; //state.distcode.copy(state.codes);
        // Switch to use dynamic table

        state.distcode = state.distdyn;
        opts = {
          bits: state.distbits
        };
        ret = inftrees(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts); // We have separate tables & no pointers. 2 commented lines below not needed.
        // state.next_index = opts.table_index;

        state.distbits = opts.bits; // state.distcode = state.next;

        if (ret) {
          strm.msg = 'invalid distances set';
          state.mode = BAD;
          break;
        } //Tracev((stderr, 'inflate:       codes ok\n'));


        state.mode = LEN_;

        if (flush === Z_TREES) {
          break inf_leave;
        }

      /* falls through */

      case LEN_:
        state.mode = LEN;

      /* falls through */

      case LEN:
        if (have >= 6 && left >= 258) {
          //--- RESTORE() ---
          strm.next_out = put;
          strm.avail_out = left;
          strm.next_in = next;
          strm.avail_in = have;
          state.hold = hold;
          state.bits = bits; //---

          inffast(strm, _out); //--- LOAD() ---

          put = strm.next_out;
          output = strm.output;
          left = strm.avail_out;
          next = strm.next_in;
          input = strm.input;
          have = strm.avail_in;
          hold = state.hold;
          bits = state.bits; //---

          if (state.mode === TYPE) {
            state.back = -1;
          }

          break;
        }

        state.back = 0;

        for (;;) {
          here = state.lencode[hold & (1 << state.lenbits) - 1];
          /*BITS(state.lenbits)*/

          here_bits = here >>> 24;
          here_op = here >>> 16 & 0xff;
          here_val = here & 0xffff;

          if (here_bits <= bits) {
            break;
          } //--- PULLBYTE() ---//


          if (have === 0) {
            break inf_leave;
          }

          have--;
          hold += input[next++] << bits;
          bits += 8; //---//
        }

        if (here_op && (here_op & 0xf0) === 0) {
          last_bits = here_bits;
          last_op = here_op;
          last_val = here_val;

          for (;;) {
            here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >>
            /*BITS(last.bits + last.op)*/
            last_bits)];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 0xff;
            here_val = here & 0xffff;

            if (last_bits + here_bits <= bits) {
              break;
            } //--- PULLBYTE() ---//


            if (have === 0) {
              break inf_leave;
            }

            have--;
            hold += input[next++] << bits;
            bits += 8; //---//
          } //--- DROPBITS(last.bits) ---//


          hold >>>= last_bits;
          bits -= last_bits; //---//

          state.back += last_bits;
        } //--- DROPBITS(here.bits) ---//


        hold >>>= here_bits;
        bits -= here_bits; //---//

        state.back += here_bits;
        state.length = here_val;

        if (here_op === 0) {
          //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
          //        "inflate:         literal '%c'\n" :
          //        "inflate:         literal 0x%02x\n", here.val));
          state.mode = LIT;
          break;
        }

        if (here_op & 32) {
          //Tracevv((stderr, "inflate:         end of block\n"));
          state.back = -1;
          state.mode = TYPE;
          break;
        }

        if (here_op & 64) {
          strm.msg = 'invalid literal/length code';
          state.mode = BAD;
          break;
        }

        state.extra = here_op & 15;
        state.mode = LENEXT;

      /* falls through */

      case LENEXT:
        if (state.extra) {
          //=== NEEDBITS(state.extra);
          n = state.extra;

          while (bits < n) {
            if (have === 0) {
              break inf_leave;
            }

            have--;
            hold += input[next++] << bits;
            bits += 8;
          } //===//


          state.length += hold & (1 << state.extra) - 1
          /*BITS(state.extra)*/
          ; //--- DROPBITS(state.extra) ---//

          hold >>>= state.extra;
          bits -= state.extra; //---//

          state.back += state.extra;
        } //Tracevv((stderr, "inflate:         length %u\n", state.length));


        state.was = state.length;
        state.mode = DIST;

      /* falls through */

      case DIST:
        for (;;) {
          here = state.distcode[hold & (1 << state.distbits) - 1];
          /*BITS(state.distbits)*/

          here_bits = here >>> 24;
          here_op = here >>> 16 & 0xff;
          here_val = here & 0xffff;

          if (here_bits <= bits) {
            break;
          } //--- PULLBYTE() ---//


          if (have === 0) {
            break inf_leave;
          }

          have--;
          hold += input[next++] << bits;
          bits += 8; //---//
        }

        if ((here_op & 0xf0) === 0) {
          last_bits = here_bits;
          last_op = here_op;
          last_val = here_val;

          for (;;) {
            here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >>
            /*BITS(last.bits + last.op)*/
            last_bits)];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 0xff;
            here_val = here & 0xffff;

            if (last_bits + here_bits <= bits) {
              break;
            } //--- PULLBYTE() ---//


            if (have === 0) {
              break inf_leave;
            }

            have--;
            hold += input[next++] << bits;
            bits += 8; //---//
          } //--- DROPBITS(last.bits) ---//


          hold >>>= last_bits;
          bits -= last_bits; //---//

          state.back += last_bits;
        } //--- DROPBITS(here.bits) ---//


        hold >>>= here_bits;
        bits -= here_bits; //---//

        state.back += here_bits;

        if (here_op & 64) {
          strm.msg = 'invalid distance code';
          state.mode = BAD;
          break;
        }

        state.offset = here_val;
        state.extra = here_op & 15;
        state.mode = DISTEXT;

      /* falls through */

      case DISTEXT:
        if (state.extra) {
          //=== NEEDBITS(state.extra);
          n = state.extra;

          while (bits < n) {
            if (have === 0) {
              break inf_leave;
            }

            have--;
            hold += input[next++] << bits;
            bits += 8;
          } //===//


          state.offset += hold & (1 << state.extra) - 1
          /*BITS(state.extra)*/
          ; //--- DROPBITS(state.extra) ---//

          hold >>>= state.extra;
          bits -= state.extra; //---//

          state.back += state.extra;
        } //#ifdef INFLATE_STRICT


        if (state.offset > state.dmax) {
          strm.msg = 'invalid distance too far back';
          state.mode = BAD;
          break;
        } //#endif
        //Tracevv((stderr, "inflate:         distance %u\n", state.offset));


        state.mode = MATCH;

      /* falls through */

      case MATCH:
        if (left === 0) {
          break inf_leave;
        }

        copy = _out - left;

        if (state.offset > copy) {
          /* copy from window */
          copy = state.offset - copy;

          if (copy > state.whave) {
            if (state.sane) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD;
              break;
            } // (!) This block is disabled in zlib defaults,
            // don't enable it for binary compatibility
            //#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
            //          Trace((stderr, "inflate.c too far\n"));
            //          copy -= state.whave;
            //          if (copy > state.length) { copy = state.length; }
            //          if (copy > left) { copy = left; }
            //          left -= copy;
            //          state.length -= copy;
            //          do {
            //            output[put++] = 0;
            //          } while (--copy);
            //          if (state.length === 0) { state.mode = LEN; }
            //          break;
            //#endif

          }

          if (copy > state.wnext) {
            copy -= state.wnext;
            from = state.wsize - copy;
          } else {
            from = state.wnext - copy;
          }

          if (copy > state.length) {
            copy = state.length;
          }

          from_source = state.window;
        } else {
          /* copy from output */
          from_source = output;
          from = put - state.offset;
          copy = state.length;
        }

        if (copy > left) {
          copy = left;
        }

        left -= copy;
        state.length -= copy;

        do {
          output[put++] = from_source[from++];
        } while (--copy);

        if (state.length === 0) {
          state.mode = LEN;
        }

        break;

      case LIT:
        if (left === 0) {
          break inf_leave;
        }

        output[put++] = state.length;
        left--;
        state.mode = LEN;
        break;

      case CHECK:
        if (state.wrap) {
          //=== NEEDBITS(32);
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }

            have--; // Use '|' instead of '+' to make sure that result is signed

            hold |= input[next++] << bits;
            bits += 8;
          } //===//


          _out -= left;
          strm.total_out += _out;
          state.total += _out;

          if (_out) {
            strm.adler = state.check =
            /*UPDATE(state.check, put - _out, _out);*/
            state.flags ? crc32_1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out);
          }

          _out = left; // NB: crc32 stored as signed 32-bit int, zswap32 returns signed too

          if ((state.flags ? hold : zswap32(hold)) !== state.check) {
            strm.msg = 'incorrect data check';
            state.mode = BAD;
            break;
          } //=== INITBITS();


          hold = 0;
          bits = 0; //===//
          //Tracev((stderr, "inflate:   check matches trailer\n"));
        }

        state.mode = LENGTH;

      /* falls through */

      case LENGTH:
        if (state.wrap && state.flags) {
          //=== NEEDBITS(32);
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }

            have--;
            hold += input[next++] << bits;
            bits += 8;
          } //===//


          if (hold !== (state.total & 0xffffffff)) {
            strm.msg = 'incorrect length check';
            state.mode = BAD;
            break;
          } //=== INITBITS();


          hold = 0;
          bits = 0; //===//
          //Tracev((stderr, "inflate:   length matches trailer\n"));
        }

        state.mode = DONE;

      /* falls through */

      case DONE:
        ret = Z_STREAM_END$1;
        break inf_leave;

      case BAD:
        ret = Z_DATA_ERROR$1;
        break inf_leave;

      case MEM:
        return Z_MEM_ERROR$1;

      case SYNC:
      /* falls through */

      default:
        return Z_STREAM_ERROR$1;
    }
  } // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

  /*
     Return from inflate(), updating the total counts and the check value.
     If there was no progress during the inflate() call, return a buffer
     error.  Call updatewindow() to create and/or update the window state.
     Note: a memory error from inflate() is non-recoverable.
   */
  //--- RESTORE() ---


  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits; //---

  if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH$1)) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) ;
  }

  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;

  if (state.wrap && _out) {
    strm.adler = state.check =
    /*UPDATE(state.check, strm.next_out - _out, _out);*/
    state.flags ? crc32_1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out);
  }

  strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);

  if ((_in === 0 && _out === 0 || flush === Z_FINISH$1) && ret === Z_OK$1) {
    ret = Z_BUF_ERROR;
  }

  return ret;
};

const inflateEnd = strm => {
  if (!strm || !strm.state
  /*|| strm->zfree == (free_func)0*/
  ) {
      return Z_STREAM_ERROR$1;
    }

  let state = strm.state;

  if (state.window) {
    state.window = null;
  }

  strm.state = null;
  return Z_OK$1;
};

const inflateGetHeader = (strm, head) => {
  /* check state */
  if (!strm || !strm.state) {
    return Z_STREAM_ERROR$1;
  }

  const state = strm.state;

  if ((state.wrap & 2) === 0) {
    return Z_STREAM_ERROR$1;
  }
  /* save header structure */


  state.head = head;
  head.done = false;
  return Z_OK$1;
};

const inflateSetDictionary = (strm, dictionary) => {
  const dictLength = dictionary.length;
  let state;
  let dictid;
  let ret;
  /* check state */

  if (!strm
  /* == Z_NULL */
  || !strm.state
  /* == Z_NULL */
  ) {
      return Z_STREAM_ERROR$1;
    }

  state = strm.state;

  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR$1;
  }
  /* check for correct dictionary identifier */


  if (state.mode === DICT) {
    dictid = 1;
    /* adler32(0, null, 0)*/

    /* dictid = adler32(dictid, dictionary, dictLength); */

    dictid = adler32_1(dictid, dictionary, dictLength, 0);

    if (dictid !== state.check) {
      return Z_DATA_ERROR$1;
    }
  }
  /* copy dictionary to window using updatewindow(), which will amend the
   existing dictionary if appropriate */


  ret = updatewindow(strm, dictionary, dictLength, dictLength);

  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR$1;
  }

  state.havedict = 1; // Tracev((stderr, "inflate:   dictionary set\n"));

  return Z_OK$1;
};

var inflateReset_1 = inflateReset;
var inflateReset2_1 = inflateReset2;
var inflateResetKeep_1 = inflateResetKeep;
var inflateInit_1 = inflateInit;
var inflateInit2_1 = inflateInit2;
var inflate_2$1 = inflate$2;
var inflateEnd_1 = inflateEnd;
var inflateGetHeader_1 = inflateGetHeader;
var inflateSetDictionary_1 = inflateSetDictionary;
var inflateInfo = 'pako inflate (from Nodeca project)';
/* Not implemented
module.exports.inflateCopy = inflateCopy;
module.exports.inflateGetDictionary = inflateGetDictionary;
module.exports.inflateMark = inflateMark;
module.exports.inflatePrime = inflatePrime;
module.exports.inflateSync = inflateSync;
module.exports.inflateSyncPoint = inflateSyncPoint;
module.exports.inflateUndermine = inflateUndermine;
*/

var inflate_1$2 = {
	inflateReset: inflateReset_1,
	inflateReset2: inflateReset2_1,
	inflateResetKeep: inflateResetKeep_1,
	inflateInit: inflateInit_1,
	inflateInit2: inflateInit2_1,
	inflate: inflate_2$1,
	inflateEnd: inflateEnd_1,
	inflateGetHeader: inflateGetHeader_1,
	inflateSetDictionary: inflateSetDictionary_1,
	inflateInfo: inflateInfo
};

// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function GZheader() {
  /* true if compressed data believed to be text */
  this.text = 0;
  /* modification time */

  this.time = 0;
  /* extra flags (not used when writing a gzip file) */

  this.xflags = 0;
  /* operating system */

  this.os = 0;
  /* pointer to extra field or Z_NULL if none */

  this.extra = null;
  /* extra field length (valid if extra != Z_NULL) */

  this.extra_len = 0; // Actually, we don't need it in JS,
  // but leave for few code modifications
  //
  // Setup limits is not necessary because in js we should not preallocate memory
  // for inflate use constant limit in 65536 bytes
  //

  /* space at extra (only when reading header) */
  // this.extra_max  = 0;

  /* pointer to zero-terminated file name or Z_NULL */

  this.name = '';
  /* space at name (only when reading header) */
  // this.name_max   = 0;

  /* pointer to zero-terminated comment or Z_NULL */

  this.comment = '';
  /* space at comment (only when reading header) */
  // this.comm_max   = 0;

  /* true if there was or will be a header crc */

  this.hcrc = 0;
  /* true when done reading gzip header (not used when writing a gzip file) */

  this.done = false;
}

var gzheader = GZheader;

const toString = Object.prototype.toString;
/* Public constants ==========================================================*/

/* ===========================================================================*/

const {
  Z_NO_FLUSH,
  Z_FINISH,
  Z_OK,
  Z_STREAM_END,
  Z_NEED_DICT,
  Z_STREAM_ERROR,
  Z_DATA_ERROR,
  Z_MEM_ERROR
} = constants$2;
/* ===========================================================================*/

/**
 * class Inflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[inflate]]
 * and [[inflateRaw]].
 **/

/* internal
 * inflate.chunks -> Array
 *
 * Chunks of output data, if [[Inflate#onData]] not overridden.
 **/

/**
 * Inflate.result -> Uint8Array|String
 *
 * Uncompressed result, generated by default [[Inflate#onData]]
 * and [[Inflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Inflate#push]] with `Z_FINISH` / `true` param).
 **/

/**
 * Inflate.err -> Number
 *
 * Error code after inflate finished. 0 (Z_OK) on success.
 * Should be checked if broken data possible.
 **/

/**
 * Inflate.msg -> String
 *
 * Error message, if [[Inflate.err]] != 0
 **/

/**
 * new Inflate(options)
 * - options (Object): zlib inflate options.
 *
 * Creates new inflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `windowBits`
 * - `dictionary`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw inflate
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 * By default, when no options set, autodetect deflate/gzip data format via
 * wrapper header.
 *
 * ##### Example:
 *
 * ```javascript
 * const pako = require('pako')
 * const chunk1 = new Uint8Array([1,2,3,4,5,6,7,8,9])
 * const chunk2 = new Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * const inflate = new pako.Inflate({ level: 3});
 *
 * inflate.push(chunk1, false);
 * inflate.push(chunk2, true);  // true -> last chunk
 *
 * if (inflate.err) { throw new Error(inflate.err); }
 *
 * console.log(inflate.result);
 * ```
 **/


function Inflate$1(options) {
  this.options = common.assign({
    chunkSize: 1024 * 64,
    windowBits: 15,
    to: ''
  }, options || {});
  const opt = this.options; // Force window size for `raw` data, if not set directly,
  // because we have no header for autodetect.

  if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
    opt.windowBits = -opt.windowBits;

    if (opt.windowBits === 0) {
      opt.windowBits = -15;
    }
  } // If `windowBits` not defined (and mode not raw) - set autodetect flag for gzip/deflate


  if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
    opt.windowBits += 32;
  } // Gzip header has no info about windows size, we can do autodetect only
  // for deflate. So, if window size not set, force it to max when gzip possible


  if (opt.windowBits > 15 && opt.windowBits < 48) {
    // bit 3 (16) -> gzipped data
    // bit 4 (32) -> autodetect gzip/deflate
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }

  this.err = 0; // error code, if happens (0 = Z_OK)

  this.msg = ''; // error message

  this.ended = false; // used to avoid multiple onEnd() calls

  this.chunks = []; // chunks of compressed data

  this.strm = new zstream();
  this.strm.avail_out = 0;
  let status = inflate_1$2.inflateInit2(this.strm, opt.windowBits);

  if (status !== Z_OK) {
    throw new Error(messages[status]);
  }

  this.header = new gzheader();
  inflate_1$2.inflateGetHeader(this.strm, this.header); // Setup dictionary

  if (opt.dictionary) {
    // Convert data if needed
    if (typeof opt.dictionary === 'string') {
      opt.dictionary = strings.string2buf(opt.dictionary);
    } else if (toString.call(opt.dictionary) === '[object ArrayBuffer]') {
      opt.dictionary = new Uint8Array(opt.dictionary);
    }

    if (opt.raw) {
      //In raw mode we need to set the dictionary early
      status = inflate_1$2.inflateSetDictionary(this.strm, opt.dictionary);

      if (status !== Z_OK) {
        throw new Error(messages[status]);
      }
    }
  }
}
/**
 * Inflate#push(data[, flush_mode]) -> Boolean
 * - data (Uint8Array|ArrayBuffer): input data
 * - flush_mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE
 *   flush modes. See constants. Skipped or `false` means Z_NO_FLUSH,
 *   `true` means Z_FINISH.
 *
 * Sends input data to inflate pipe, generating [[Inflate#onData]] calls with
 * new output chunks. Returns `true` on success. If end of stream detected,
 * [[Inflate#onEnd]] will be called.
 *
 * `flush_mode` is not needed for normal operation, because end of stream
 * detected automatically. You may try to use it for advanced things, but
 * this functionality was not tested.
 *
 * On fail call [[Inflate#onEnd]] with error code and return false.
 *
 * ##### Example
 *
 * ```javascript
 * push(chunk, false); // push one of data chunks
 * ...
 * push(chunk, true);  // push last chunk
 * ```
 **/


Inflate$1.prototype.push = function (data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  const dictionary = this.options.dictionary;

  let status, _flush_mode, last_avail_out;

  if (this.ended) return false;
  if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;else _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH; // Convert data if needed

  if (toString.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  for (;;) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }

    status = inflate_1$2.inflate(strm, _flush_mode);

    if (status === Z_NEED_DICT && dictionary) {
      status = inflate_1$2.inflateSetDictionary(strm, dictionary);

      if (status === Z_OK) {
        status = inflate_1$2.inflate(strm, _flush_mode);
      } else if (status === Z_DATA_ERROR) {
        // Replace code with more verbose
        status = Z_NEED_DICT;
      }
    } // Skip snyc markers if more data follows and not raw mode


    while (strm.avail_in > 0 && status === Z_STREAM_END && strm.state.wrap > 0 && data[strm.next_in] !== 0) {
      inflate_1$2.inflateReset(strm);
      status = inflate_1$2.inflate(strm, _flush_mode);
    }

    switch (status) {
      case Z_STREAM_ERROR:
      case Z_DATA_ERROR:
      case Z_NEED_DICT:
      case Z_MEM_ERROR:
        this.onEnd(status);
        this.ended = true;
        return false;
    } // Remember real `avail_out` value, because we may patch out buffer content
    // to align utf8 strings boundaries.


    last_avail_out = strm.avail_out;

    if (strm.next_out) {
      if (strm.avail_out === 0 || status === Z_STREAM_END) {
        if (this.options.to === 'string') {
          let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
          let tail = strm.next_out - next_out_utf8;
          let utf8str = strings.buf2string(strm.output, next_out_utf8); // move tail & realign counters

          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail) strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
          this.onData(utf8str);
        } else {
          this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
        }
      }
    } // Must repeat iteration if out buffer is full


    if (status === Z_OK && last_avail_out === 0) continue; // Finalize if end of stream reached.

    if (status === Z_STREAM_END) {
      status = inflate_1$2.inflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return true;
    }

    if (strm.avail_in === 0) break;
  }

  return true;
};
/**
 * Inflate#onData(chunk) -> Void
 * - chunk (Uint8Array|String): output data. When string output requested,
 *   each chunk will be string.
 *
 * By default, stores data blocks in `chunks[]` property and glue
 * those in `onEnd`. Override this handler, if you need another behaviour.
 **/


Inflate$1.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};
/**
 * Inflate#onEnd(status) -> Void
 * - status (Number): inflate status. 0 (Z_OK) on success,
 *   other if not.
 *
 * Called either after you tell inflate that the input stream is
 * complete (Z_FINISH). By default - join collected chunks,
 * free memory and fill `results` / `err` properties.
 **/


Inflate$1.prototype.onEnd = function (status) {
  // On success - join
  if (status === Z_OK) {
    if (this.options.to === 'string') {
      this.result = this.chunks.join('');
    } else {
      this.result = common.flattenChunks(this.chunks);
    }
  }

  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
/**
 * inflate(data[, options]) -> Uint8Array|String
 * - data (Uint8Array): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Decompress `data` with inflate/ungzip and `options`. Autodetect
 * format via wrapper header by default. That's why we don't provide
 * separate `ungzip` method.
 *
 * Supported options are:
 *
 * - windowBits
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 *
 * ##### Example:
 *
 * ```javascript
 * const pako = require('pako');
 * const input = pako.deflate(new Uint8Array([1,2,3,4,5,6,7,8,9]));
 * let output;
 *
 * try {
 *   output = pako.inflate(input);
 * } catch (err)
 *   console.log(err);
 * }
 * ```
 **/


function inflate$1(input, options) {
  const inflator = new Inflate$1(options);
  inflator.push(input); // That will never happens, if you don't cheat with options :)

  if (inflator.err) throw inflator.msg || messages[inflator.err];
  return inflator.result;
}
/**
 * inflateRaw(data[, options]) -> Uint8Array|String
 * - data (Uint8Array): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * The same as [[inflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/


function inflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return inflate$1(input, options);
}
/**
 * ungzip(data[, options]) -> Uint8Array|String
 * - data (Uint8Array): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Just shortcut to [[inflate]], because it autodetects format
 * by header.content. Done for convenience.
 **/


var Inflate_1$1 = Inflate$1;
var inflate_2 = inflate$1;
var inflateRaw_1$1 = inflateRaw$1;
var ungzip$1 = inflate$1;
var constants = constants$2;

var inflate_1$1 = {
	Inflate: Inflate_1$1,
	inflate: inflate_2,
	inflateRaw: inflateRaw_1$1,
	ungzip: ungzip$1,
	constants: constants
};

const {
  Deflate,
  deflate,
  deflateRaw,
  gzip
} = deflate_1$1;

const {
  Inflate,
  inflate,
  inflateRaw,
  ungzip
} = inflate_1$1;



var Deflate_1 = Deflate;
var deflate_1 = deflate;
var deflateRaw_1 = deflateRaw;
var gzip_1 = gzip;
var Inflate_1 = Inflate;
var inflate_1 = inflate;
var inflateRaw_1 = inflateRaw;
var ungzip_1 = ungzip;
var constants_1 = constants$2;

var pako = {
	Deflate: Deflate_1,
	deflate: deflate_1,
	deflateRaw: deflateRaw_1,
	gzip: gzip_1,
	Inflate: Inflate_1,
	inflate: inflate_1,
	inflateRaw: inflateRaw_1,
	ungzip: ungzip_1,
	constants: constants_1
};

/*jslint browser: true, node: true */

var nifti_1 = createCommonjsModule(function (module) {
/*** Imports ***/

/**
 * nifti
 * @type {*|{}}
 */

var nifti = nifti || {};
nifti.NIFTI1 = nifti.NIFTI1 || (typeof commonjsRequire !== 'undefined' ? nifti1 : null);
nifti.NIFTI2 = nifti.NIFTI2 || (typeof commonjsRequire !== 'undefined' ? nifti2 : null);
nifti.Utils = nifti.Utils || (typeof commonjsRequire !== 'undefined' ? utilities : null);
var pako$1 = pako$1 || (typeof commonjsRequire !== 'undefined' ? pako : null);
/*** Static Methods ***/

/**
 * Returns true if this data represents a NIFTI-1 header.
 * @param {ArrayBuffer} data
 * @returns {boolean}
 */

nifti.isNIFTI1 = function (data) {
  var buf, mag1, mag2, mag3;

  if (data.byteLength < nifti.NIFTI1.STANDARD_HEADER_SIZE) {
    return false;
  }

  buf = new DataView(data);
  if (buf) mag1 = buf.getUint8(nifti.NIFTI1.MAGIC_NUMBER_LOCATION);
  mag2 = buf.getUint8(nifti.NIFTI1.MAGIC_NUMBER_LOCATION + 1);
  mag3 = buf.getUint8(nifti.NIFTI1.MAGIC_NUMBER_LOCATION + 2);
  return !!(mag1 === nifti.NIFTI1.MAGIC_NUMBER[0] && mag2 === nifti.NIFTI1.MAGIC_NUMBER[1] && mag3 === nifti.NIFTI1.MAGIC_NUMBER[2]);
};
/**
 * Returns true if this data represents a NIFTI-2 header.
 * @param {ArrayBuffer} data
 * @returns {boolean}
 */


nifti.isNIFTI2 = function (data) {
  var buf, mag1, mag2, mag3;

  if (data.byteLength < nifti.NIFTI1.STANDARD_HEADER_SIZE) {
    return false;
  }

  buf = new DataView(data);
  mag1 = buf.getUint8(nifti.NIFTI2.MAGIC_NUMBER_LOCATION);
  mag2 = buf.getUint8(nifti.NIFTI2.MAGIC_NUMBER_LOCATION + 1);
  mag3 = buf.getUint8(nifti.NIFTI2.MAGIC_NUMBER_LOCATION + 2);
  return !!(mag1 === nifti.NIFTI2.MAGIC_NUMBER[0] && mag2 === nifti.NIFTI2.MAGIC_NUMBER[1] && mag3 === nifti.NIFTI2.MAGIC_NUMBER[2]);
};
/**
 * Returns true if this data represents a NIFTI header.
 * @param {ArrayBuffer} data
 * @returns {boolean}
 */


nifti.isNIFTI = function (data) {
  return nifti.isNIFTI1(data) || nifti.isNIFTI2(data);
};
/**
 * Returns true if this data is GZIP compressed.
 * @param {ArrayBuffer} data
 * @returns {boolean}
 */


nifti.isCompressed = function (data) {
  var buf, magicCookie1, magicCookie2;

  if (data) {
    buf = new DataView(data);
    magicCookie1 = buf.getUint8(0);
    magicCookie2 = buf.getUint8(1);

    if (magicCookie1 === nifti.Utils.GUNZIP_MAGIC_COOKIE1) {
      return true;
    }

    if (magicCookie2 === nifti.Utils.GUNZIP_MAGIC_COOKIE2) {
      return true;
    }
  }

  return false;
};
/**
 * Returns decompressed data.
 * @param {ArrayBuffer} data
 * @returns {ArrayBuffer}
 */


nifti.decompress = function (data) {
  return pako$1.inflate(data).buffer;
};
/**
 * Reads and returns the header object.
 * @param {ArrayBuffer} data
 * @returns {nifti.NIFTI1|nifti.NIFTI2|null}
 */


nifti.readHeader = function (data) {
  var header = null;

  if (nifti.isCompressed(data)) {
    data = nifti.decompress(data);
  }

  if (nifti.isNIFTI1(data)) {
    header = new nifti.NIFTI1();
  } else if (nifti.isNIFTI2(data)) {
    header = new nifti.NIFTI2();
  }

  if (header) {
    header.readHeader(data);
  } else {
    console.error("That file does not appear to be NIFTI!");
  }

  return header;
};
/**
 * Returns true if this header contains an extension.
 * @param {nifti.NIFTI1|nifti.NIFTI2} header
 * @returns {boolean}
 */


nifti.hasExtension = function (header) {
  return header.extensionFlag[0] != 0;
};
/**
 * Returns the image data.
 * @param {nifti.NIFTI1|nifti.NIFTI2} header
 * @param {ArrayBuffer} data
 * @returns {ArrayBuffer}
 */


nifti.readImage = function (header, data) {
  var imageOffset = header.vox_offset,
      timeDim = 1,
      statDim = 1;

  if (header.dims[4]) {
    timeDim = header.dims[4];
  }

  if (header.dims[5]) {
    statDim = header.dims[5];
  }

  var imageSize = header.dims[1] * header.dims[2] * header.dims[3] * timeDim * statDim * (header.numBitsPerVoxel / 8);
  return data.slice(imageOffset, imageOffset + imageSize);
};
/**
 * Returns the extension data (including extension header).
 * @param {nifti.NIFTI1|nifti.NIFTI2} header
 * @param {ArrayBuffer} data
 * @returns {ArrayBuffer}
 */


nifti.readExtension = function (header, data) {
  var loc = header.getExtensionLocation(),
      size = header.extensionSize;
  return data.slice(loc, loc + size);
};
/**
 * Returns the extension data.
 * @param {nifti.NIFTI1|nifti.NIFTI2} header
 * @param {ArrayBuffer} data
 * @returns {ArrayBuffer}
 */


nifti.readExtensionData = function (header, data) {
  var loc = header.getExtensionLocation(),
      size = header.extensionSize;
  return data.slice(loc + 8, loc + size - 8);
};

if (module.exports) {
  module.exports = nifti;
}
});

// shader.js is taken from github user Twinklebear: https://github.com/Twinklebear/webgl-util
var Shader = function (gl, vertexSrc, fragmentSrc) {
  var self = this;
  this.program = compileShader(gl, vertexSrc, fragmentSrc);
  var regexUniform = /uniform[^;]+[ ](\w+);/g;
  var matchUniformName = /uniform[^;]+[ ](\w+);/;
  this.uniforms = {};
  var vertexUnifs = vertexSrc.match(regexUniform);
  var fragUnifs = fragmentSrc.match(regexUniform);

  if (vertexUnifs) {
    vertexUnifs.forEach(function (unif) {
      var m = unif.match(matchUniformName);
      self.uniforms[m[1]] = -1;
    });
  }

  if (fragUnifs) {
    fragUnifs.forEach(function (unif) {
      var m = unif.match(matchUniformName);
      self.uniforms[m[1]] = -1;
    });
  }

  for (var unif in this.uniforms) {
    this.uniforms[unif] = gl.getUniformLocation(this.program, unif);
  }
};

Shader.prototype.use = function (gl) {
  gl.useProgram(this.program);
}; // Compile and link the shaders vert and frag. vert and frag should contain
// the shader source code for the vertex and fragment shaders respectively
// Returns the compiled and linked program, or null if compilation or linking failed


var compileShader = function (gl, vert, frag) {
  var vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vert);
  gl.compileShader(vs);

  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    alert("Vertex shader failed to compile, see console for log");
    console.log(gl.getShaderInfoLog(vs));
    return null;
  }

  var fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, frag);
  gl.compileShader(fs);

  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    alert("Fragment shader failed to compile, see console for log");
    console.log(gl.getShaderInfoLog(fs));
    return null;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    alert("Shader failed to link, see console for log");
    console.log(gl.getProgramInfoLog(program));
    return null;
  }

  return program;
};

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * Create a new mat3 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m10 Component in column 1, row 0 position (index 3)
 * @param {Number} m11 Component in column 1, row 1 position (index 4)
 * @param {Number} m12 Component in column 1, row 2 position (index 5)
 * @param {Number} m20 Component in column 2, row 0 position (index 6)
 * @param {Number} m21 Component in column 2, row 1 position (index 7)
 * @param {Number} m22 Component in column 2, row 2 position (index 8)
 * @returns {mat3} A new mat3
 */

function fromValues$3(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
  var out = new ARRAY_TYPE(9);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m10;
  out[4] = m11;
  out[5] = m12;
  out[6] = m20;
  out[7] = m21;
  out[8] = m22;
  return out;
}

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create$2() {
  var out = new ARRAY_TYPE(16);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */

function clone(a) {
  var out = new ARRAY_TYPE(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Create a new mat4 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} A new mat4
 */

function fromValues$2(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  var out = new ARRAY_TYPE(16);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    var a12 = a[6],
        a13 = a[7];
    var a23 = a[11];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a01;
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a02;
    out[9] = a12;
    out[11] = a[14];
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;
  } else {
    out[0] = a[0];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a[1];
    out[5] = a[5];
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a[2];
    out[9] = a[6];
    out[10] = a[10];
    out[11] = a[14];
    out[12] = a[3];
    out[13] = a[7];
    out[14] = a[11];
    out[15] = a[15];
  }

  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply$1(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$1() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues$1(x, y, z) {
  var out = new ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$1();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */

function fromValues(x, y, z, w) {
  var out = new ARRAY_TYPE(4);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}
/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec4} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
  return out;
}
/**
 * Alias for {@link vec4.multiply}
 * @function
 */

var mul = multiply;
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
})();

var vertRenderShader = `#version 300 es
#line 4
layout(location=0) in vec3 pos;
uniform mat4 mvpMtx;
out vec3 vColor;
void main(void) {
	gl_Position = mvpMtx * vec4(2.0 * (pos.xyz - 0.5), 1.0);
	vColor = pos;
}`;
var fragRenderShader = `#version 300 es
#line 15
precision highp int;
precision highp float;
uniform vec3 rayDir;
uniform vec3 texVox;
uniform vec4 clipPlane;
uniform highp sampler3D volume, overlay;
uniform float overlays;
uniform float backOpacity;
in vec3 vColor;
out vec4 fColor;
vec3 GetBackPosition (vec3 startPosition) {
 vec3 invR = 1.0 / rayDir;
 vec3 tbot = invR * (vec3(0.0)-startPosition);
 vec3 ttop = invR * (vec3(1.0)-startPosition);
 vec3 tmax = max(ttop, tbot);
 vec2 t = min(tmax.xx, tmax.yz);
 return startPosition + (rayDir * min(t.x, t.y));
}
vec4 applyClip (vec3 dir, inout vec4 samplePos, inout float len) {
	float cdot = dot(dir,clipPlane.xyz);
	if  ((clipPlane.a > 1.0) || (cdot == 0.0)) return samplePos;
    bool frontface = (cdot > 0.0);
	float clipThick = 2.0;
    float dis = (-clipPlane.a - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
    float  disBackFace = (-(clipPlane.a-clipThick) - dot(clipPlane.xyz, samplePos.xyz-0.5)) / cdot;
    if (((frontface) && (dis >= len)) || ((!frontface) && (dis <= 0.0))) {
        samplePos.a = len + 1.0;
        return samplePos;
    }
    if (frontface) {
        dis = max(0.0, dis);
        samplePos = vec4(samplePos.xyz+dir * dis, dis);
        len = min(disBackFace, len);
    }
    if (!frontface) {
        len = min(dis, len);
        disBackFace = max(0.0, disBackFace);
        samplePos = vec4(samplePos.xyz+dir * disBackFace, disBackFace);
    }
    return samplePos;
}
void main() {
    fColor = vec4(0.0,0.0,0.0,0.0);
	vec3 start = vColor;
	vec3 backPosition = GetBackPosition(start);
	//fColor = vec4(backPosition, 1.0); return;
    vec3 dir = backPosition - start;
    float len = length(dir);
	float lenVox = length((texVox * start) - (texVox * backPosition));
	if (lenVox < 0.5) return;
	float sliceSize = len / lenVox; //e.g. if ray length is 1.0 and traverses 50 voxels, each voxel is 0.02 in unit cube
	float stepSize = sliceSize; //quality: larger step is faster traversal, but fewer samples
	float opacityCorrection = stepSize/sliceSize;
    dir = normalize(dir);
	vec4 deltaDir = vec4(dir.xyz * stepSize, stepSize);
	vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	float lenNoClip = len;
	vec4 clipPos = applyClip(dir, samplePos, len);
	//start: OPTIONAL fast pass: rapid traversal until first hit
	float stepSizeFast = sliceSize * 1.9;
	vec4 deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(volume, samplePos.xyz).r;
		if (val > 0.01) break;
		samplePos += deltaDirFast; //advance ray position
	}
	if ((samplePos.a > len) && (overlays < 1.0)) return;
	samplePos -= deltaDirFast;
	if (samplePos.a < 0.0)
		vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	//end: fast pass
	vec4 colAcc = vec4(0.0,0.0,0.0,0.0);
	const float earlyTermination = 0.95;
	float backNearest = len; //assume no hit
    float ran = fract(sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453);
    samplePos += deltaDir * ran; //jitter ray
	while (samplePos.a <= len) {
		vec4 colorSample = texture(volume, samplePos.xyz);
		samplePos += deltaDir; //advance ray position
		if (colorSample.a < 0.01) continue;
		backNearest = min(backNearest, samplePos.a);
		colorSample.a = 1.0-pow((1.0 - colorSample.a), opacityCorrection);
		colorSample.rgb *= colorSample.a;
		colAcc= (1.0 - colAcc.a) * colorSample + colAcc;
		if ( colAcc.a > earlyTermination )
			break;
	}
	colAcc.a = (colAcc.a / earlyTermination) * backOpacity;
	fColor = colAcc;
	if (overlays < 1.0) return;
	//overlay pass
	len = lenNoClip;
	samplePos = vec4(start.xyz, 0.0); //ray position
    //start: OPTIONAL fast pass: rapid traversal until first hit
	stepSizeFast = sliceSize * 1.9;
	deltaDirFast = vec4(dir.xyz * stepSizeFast, stepSizeFast);
	while (samplePos.a <= len) {
		float val = texture(overlay, samplePos.xyz).a;
		if (val > 0.01) break;
		samplePos += deltaDirFast; //advance ray position
	}
	if (samplePos.a > len) return;
	samplePos -= deltaDirFast;
	if (samplePos.a < 0.0)
		vec4 samplePos = vec4(start.xyz, 0.0); //ray position
	//end: fast pass
	float overFarthest = len;
	colAcc = vec4(0.0, 0.0, 0.0, 0.0);
	samplePos += deltaDir * ran; //jitter ray
	while (samplePos.a <= len) {
		vec4 colorSample = texture(overlay, samplePos.xyz);
		samplePos += deltaDir; //advance ray position
		if (colorSample.a < 0.01) continue;
		colorSample.a = 1.0-pow((1.0 - colorSample.a), opacityCorrection);
		colorSample.rgb *= colorSample.a;
		colAcc= (1.0 - colAcc.a) * colorSample + colAcc;
		overFarthest = samplePos.a;
		if ( colAcc.a > earlyTermination )
			break;
	}
	float overMix = colAcc.a;
	float overlayDepth = 0.3;
	if (fColor.a <= 0.0)
			overMix = 1.0;
	else if (((overFarthest) > backNearest)) {
		float dx = (overFarthest - backNearest)/1.73;
		dx = fColor.a * pow(dx, overlayDepth);
		overMix *= 1.0 - dx;
	}
	fColor.rgb = mix(fColor.rgb, colAcc.rgb, overMix);
	fColor.a = max(fColor.a, colAcc.a);
}`;
var vertSliceShader = `#version 300 es
#line 150
layout(location=0) in vec3 pos;
uniform int axCorSag;
uniform float slice;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
out vec3 texPos;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
	if (axCorSag == 1)
		texPos = vec3(pos.x, slice, pos.y);
	else if (axCorSag == 2)
		texPos = vec3(slice, pos.x, pos.y);
	else
		texPos = vec3(pos.xy, slice);
}`;
var fragSliceShader = `#version 300 es
#line 173
precision highp int;
precision highp float;
uniform highp sampler3D volume, overlay;
uniform float opacity;
in vec3 texPos;
out vec4 color;
void main() {
	color = vec4(texture(volume, texPos).rgb, opacity);
	vec4 ocolor = texture(overlay, texPos);
    float aout = ocolor.a + (1.0 - ocolor.a) * color.a;
    if (aout <= 0.0) return;
    color.rgb = ((ocolor.rgb * ocolor.a) + (color.rgb * color.a * (1.0 - ocolor.a))) / aout;
    color.a = aout;
}`;
var fragLineShader = `#version 300 es
#line 189
precision highp int;
precision highp float;
uniform vec4 lineColor;
out vec4 color;
void main() {
	color = lineColor;
}`;
var vertColorbarShader = `#version 300 es
#line 200
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
out vec2 vColor;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
	vColor = pos.xy;
}`;
var fragColorbarShader = `#version 300 es
#line 217
precision highp int;
precision highp float;
uniform highp sampler2D colormap;
in vec2 vColor;
out vec4 color;
void main() {
	color = vec4(texture(colormap, vColor).rgb, 1.0);
}`;
var vertLineShader = `#version 300 es
#line 229
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
}`;
var vertFontShader = `#version 300 es
#line 244
layout(location=0) in vec3 pos;
uniform vec2 canvasWidthHeight;
uniform vec4 leftTopWidthHeight;
uniform vec4 uvLeftTopWidthHeight;
out vec2 vUV;
void main(void) {
	//convert pixel x,y space 1..canvasWidth,1..canvasHeight to WebGL 1..-1,-1..1
	vec2 frac;
	frac.x = (leftTopWidthHeight.x + (pos.x * leftTopWidthHeight.z)) / canvasWidthHeight.x; //0..1
	frac.y = 1.0 - ((leftTopWidthHeight.y + ((1.0 - pos.y) * leftTopWidthHeight.w)) / canvasWidthHeight.y); //1..0
	frac = (frac * 2.0) - 1.0;
	gl_Position = vec4(frac, 0.0, 1.0);
	vUV = vec2(uvLeftTopWidthHeight.x + (pos.x * uvLeftTopWidthHeight.z), uvLeftTopWidthHeight.y  + ((1.0 - pos.y) * uvLeftTopWidthHeight.w) );
}`;
var fragFontShader = `#version 300 es
#line 262
precision highp int;
precision highp float;
uniform highp sampler2D fontTexture;
uniform vec4 fontColor;
uniform float screenPxRange;
in vec2 vUV;
out vec4 color;
float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}
void main() {
	vec3 msd = texture(fontTexture, vUV).rgb;
	float sd = median(msd.r, msd.g, msd.b);
    float screenPxDistance = screenPxRange*(sd - 0.5);
    float opacity = clamp(screenPxDistance + 0.5, 0.0, 1.0);
	color = vec4(fontColor.rgb , fontColor.a * opacity);
}`;
var vertOrientShader = `#version 300 es
#line 283
precision highp int;
precision highp float;
in vec3 vPos;
out vec2 TexCoord;
void main() {
    TexCoord = vPos.xy;
    gl_Position = vec4( (vPos.xy-vec2(0.5,0.5)) * 2.0, 0.0, 1.0);
}`;
var fragOrientShaderU = `#version 300 es
uniform highp usampler3D intensityVol;
`;
var fragOrientShaderI = `#version 300 es
uniform highp isampler3D intensityVol;
`;
var fragOrientShaderF = `#version 300 es
uniform highp sampler3D intensityVol;
`;
var fragOrientShader = `#line 309
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform float layer;
uniform float numLayers;
uniform float scl_slope;
uniform float scl_inter;
uniform float cal_max;
uniform float cal_min;
uniform highp sampler2D colormap;
uniform lowp sampler3D blend3D;
uniform float opacity;
uniform mat4 mtx;
void main(void) {
 vec4 vx = vec4(TexCoord.xy, coordZ, 1.0) * mtx;
 float f = (scl_slope * float(texture(intensityVol, vx.xyz).r)) + scl_inter;
 float r = max(0.00001, abs(cal_max - cal_min));
 float mn = min(cal_min, cal_max);
 f = mix(0.0, 1.0, (f - mn) / r);
 //float y = 1.0 / numLayers;
 //y = ((layer + 0.5) * y);
 //https://stackoverflow.com/questions/5879403/opengl-texture-coordinates-in-pixel-space
 float y = (2.0 * layer + 1.0)/(2.0 * numLayers);
 FragColor = texture(colormap, vec2(f, y)).rgba;
 FragColor.a *= opacity;
 if (layer < 2.0) return;
 vec2 texXY = TexCoord.xy*0.5 +vec2(0.5,0.5);
 vec4 prevColor = texture(blend3D, vec3(texXY, coordZ));
 // https://en.wikipedia.org/wiki/Alpha_compositing
 float aout = FragColor.a + (1.0 - FragColor.a) * prevColor.a;
 if (aout <= 0.0) return;
 FragColor.rgb = ((FragColor.rgb * FragColor.a) + (prevColor.rgb * prevColor.a * (1.0 - FragColor.a))) / aout;
 FragColor.a = aout;
}`;
var vertPassThroughShader = `#version 300 es
#line 283
precision highp int;
precision highp float;
in vec3 vPos;
out vec2 TexCoord;
void main() {
    TexCoord = vPos.xy;
    gl_Position = vec4(vPos.x, vPos.y, 0.0, 1.0);
}`;
var fragPassThroughShader = `#version 300 es
precision highp int;
precision highp float;
in vec2 TexCoord;
out vec4 FragColor;
uniform float coordZ;
uniform lowp sampler3D in3D;
void main(void) {
 FragColor = texture(in3D, vec3(TexCoord.xy, coordZ));
}`;

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
    colorBarMargin: 0.05          // x axis margin arount color bar, fraction of canvas width
  }

  let myNiivue = new Niivue(opts)
 */

let Niivue = function (opts = {}) {
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
    colorBarMargin: 0.05          // x axis margin arount color bar, fraction of canvas width
  }
    *
   */

  this.defaults = {
    textHeight: 0.03,
    // 0 for no text, fraction of canvas height
    colorbarHeight: 0.05,
    // 0 for no colorbars, fraction of Nifti j dimension
    crosshairWidth: 1,
    // 0 for no crosshairs
    backColor: [0, 0, 0, 1],
    crosshairColor: [1, 0, 0, 1],
    colorBarMargin: 0.05 // x axis margin arount color bar, clip space coordinates

  };
  this.gl = null;
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
  this.back = {}; // base layer; defines image space to work in. Defined as this.volumes[0] in Niivue.loadVolumes

  this.overlays = []; // layers added on top of base image (e.g. masks or stat maps). Essentially everything after this.volumes[0] is an overlay. So is this necessary?

  this.volumes = []; // all loaded images. Can add in the ability to push or slice as needed

  this.backTexture = [];
  this.isRadiologicalConvention = false;
  this.volScaleMultiplier = 1;
  this.mousePos = [0, 0];
  this.numScreenSlices = 0; // e.g. for multiplanar view, 3 simultaneous slices: axial, coronal, sagittal

  this.screenSlices = [//location and type of each 2D slice on screen, allows clicking to detect position
  {
    leftTopWidthHeight: [1, 0, 0, 1],
    axCorSag: this.sliceTypeAxial
  }, {
    leftTopWidthHeight: [1, 0, 0, 1],
    axCorSag: this.sliceTypeAxial
  }, {
    leftTopWidthHeight: [1, 0, 0, 1],
    axCorSag: this.sliceTypeAxial
  }, {
    leftTopWidthHeight: [1, 0, 0, 1],
    axCorSag: this.sliceTypeAxial
  }];
  this.backOpacity = 1.0; // loop through known Niivue properties
  // if the user supplied opts object has a
  // property listed in the known properties, then set
  // Niivue.opts.<prop> to that value, else apply defaults.

  for (let prop in this.defaults) {
    this.opts[prop] = opts[prop] === undefined ? this.defaults[prop] : opts[prop];
  }
};
/**
 * test if two arrays have equal values for each element
 * @param {Array} a the first array
 * @param {Array} b the second array
 * @example Niivue.arrayEquals(a, b)
 */

Niivue.prototype.arrayEquals = function (a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index]);
}; // update mouse position from new mouse down coordinates


Niivue.prototype.mouseDown = function mouseDown(x, y) {
  if (this.sliceType != this.sliceTypeRender) return;
  this.mousePos = [x, y];
}; // mouseDown()


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
  let Theta = (azimuth - 90) % 360 * (Math.PI / 180);
  let ret = [Math.cos(Phi) * Math.cos(Theta), Math.cos(Phi) * Math.sin(Theta), Math.sin(Phi)];
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


Niivue.prototype.sliceScroll2D = function (posChange, x, y, isDelta = true) {
  this.mouseClick(x, y, posChange, isDelta);
}; // sliceScroll2D()


Niivue.prototype.setSliceType = function (st) {
  this.sliceType = st;
  this.drawScene();
}; // setSliceType()


Niivue.prototype.setOpacity = function (volIdx, newOpacity) {
  this.volumes[volIdx].opacity = newOpacity;

  if (volIdx === 0) {
    //background layer opacity set dynamically with shader
    this.backOpacity = newOpacity;
    this.drawScene();
    return;
  } //all overlays are combined as a single texture, so changing opacity to one requires us to refresh textures


  this.updateGLVolume(); //
}; // setOpacity()


Niivue.prototype.setScale = function (scale) {
  this.volScaleMultiplier = scale;
  this.drawScene();
}; // setScale()
// attach the Niivue instance to the webgl2 canvas by element id
// @example niivue = new Niivue().attachTo('#gl')


Niivue.prototype.attachTo = function (id) {
  this.gl = document.querySelector(id).getContext("webgl2");

  if (!this.gl) {
    alert("unable to get webgl2 context. Perhaps this browser does not support webgl2");
    console.log("unable to get webgl2 context. Perhaps this browser does not support webgl2");
  }

  this.init();
  return this;
}; // attachTo


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
  let sform = clone(mtx);
  transpose(sform, sform);
  let pos = fromValues(XYZ[0], XYZ[1], XYZ[2], 1);
  transformMat4(pos, pos, sform);
  let pos3 = fromValues$1(pos[0], pos[1], pos[2]);
  return pos3;
}; // vox2mm()


Niivue.prototype.nii2RAS = function (overlayItem) {
  //Transform to orient NIfTI image to Left->Right,Posterior->Anterior,Inferior->Superior (48 possible permutations)
  // port of Matlab reorient() https://github.com/xiangruili/dicm2nii/blob/master/nii_viewer.m
  // not elegant, as JavaScript arrays are always 1D
  let hdr = overlayItem.volume.hdr;
  let a = hdr.affine;
  let absR = fromValues$3(Math.abs(a[0][0]), Math.abs(a[0][1]), Math.abs(a[0][2]), Math.abs(a[1][0]), Math.abs(a[1][1]), Math.abs(a[1][2]), Math.abs(a[2][0]), Math.abs(a[2][1]), Math.abs(a[2][2])); //1st column = x

  let ixyz = [1, 1, 1];
  if (absR[3] > absR[0]) ixyz[0] = 2; //(absR[1][0] > absR[0][0]) ixyz[0] = 2;

  if (absR[6] > absR[0] && absR[6] > absR[3]) ixyz[0] = 3; //((absR[2][0] > absR[0][0]) && (absR[2][0]> absR[1][0])) ixyz[0] = 3;
  //2nd column = y

  ixyz[1] = 1;

  if (ixyz[0] === 1) {
    if (absR[4] > absR[7]) //(absR[1][1] > absR[2][1])
      ixyz[1] = 2;else ixyz[1] = 3;
  } else if (ixyz[0] === 2) {
    if (absR[1] > absR[7]) //(absR[0][1] > absR[2][1])
      ixyz[1] = 1;else ixyz[1] = 3;
  } else {
    if (absR[1] > absR[4]) //(absR[0][1] > absR[1][1])
      ixyz[1] = 1;else ixyz[1] = 2;
  } //3rd column = z: constrained as x+y+z = 1+2+3 = 6


  ixyz[2] = 6 - ixyz[1] - ixyz[0];
  let perm = [1, 2, 3];
  perm[ixyz[0] - 1] = 1;
  perm[ixyz[1] - 1] = 2;
  perm[ixyz[2] - 1] = 3;
  let rotM = fromValues$2(a[0][0], a[0][1], a[0][2], a[0][3], a[1][0], a[1][1], a[1][2], a[1][3], a[2][0], a[2][1], a[2][2], a[2][3], 0, 0, 0, 1); //n.b. 0.5 in these values to account for voxel centers, e.g. a 3-pixel wide bitmap in unit space has voxel centers at 0.25, 0.5 and 0.75

  overlayItem.mm000 = this.vox2mm([-0.5, -0.5, -0.5], rotM);
  overlayItem.mm100 = this.vox2mm([hdr.dims[1] - 0.5, -0.5, -0.5], rotM);
  overlayItem.mm010 = this.vox2mm([-0.5, hdr.dims[2] - 0.5, -0.5], rotM);
  overlayItem.mm001 = this.vox2mm([-0.5, -0.5, hdr.dims[3] - 0.5], rotM);
  let R = create$2();
  copy(R, rotM);

  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R[i * 4 + j] = rotM[i * 4 + perm[j] - 1]; //rotM[i+(4*(perm[j]-1))];//rotM[i],[perm[j]-1];


  let flip = [0, 0, 0];
  if (R[0] < 0) flip[0] = 1; //R[0][0]

  if (R[5] < 0) flip[1] = 1; //R[1][1]

  if (R[10] < 0) flip[2] = 1; //R[2][2]

  overlayItem.dimsRAS = [hdr.dims[0], hdr.dims[perm[0]], hdr.dims[perm[1]], hdr.dims[perm[2]]];
  overlayItem.pixDimsRAS = [hdr.pixDims[0], hdr.pixDims[perm[0]], hdr.pixDims[perm[1]], hdr.pixDims[perm[2]]];

  if (this.arrayEquals(perm, [1, 2, 3]) && this.arrayEquals(flip, [0, 0, 0])) {
    overlayItem.toRAS = create$2(); //aka fromValues(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);

    overlayItem.matRAS = clone(rotM);
    return; //no rotation required!
  }

  identity(rotM);
  rotM[0 + 0 * 4] = 1 - flip[0] * 2;
  rotM[1 + 1 * 4] = 1 - flip[1] * 2;
  rotM[2 + 2 * 4] = 1 - flip[2] * 2;
  rotM[3 + 0 * 4] = (hdr.dims[perm[0]] - 1) * flip[0];
  rotM[3 + 1 * 4] = (hdr.dims[perm[1]] - 1) * flip[1];
  rotM[3 + 2 * 4] = (hdr.dims[perm[2]] - 1) * flip[2];
  let residualR = create$2();
  invert(residualR, rotM);
  multiply$1(residualR, residualR, R);
  overlayItem.matRAS = clone(residualR);
  rotM = fromValues$2(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1);
  rotM[perm[0] - 1 + 0 * 4] = -flip[0] * 2 + 1;
  rotM[perm[1] - 1 + 1 * 4] = -flip[1] * 2 + 1;
  rotM[perm[2] - 1 + 2 * 4] = -flip[2] * 2 + 1;
  rotM[3 + 0 * 4] = flip[0];
  rotM[3 + 1 * 4] = flip[1];
  rotM[3 + 2 * 4] = flip[2];
  overlayItem.toRAS = clone(rotM);
}; // nii2RAS()
// currently: volumeList is an array if objects, each object is a volume that can be loaded


Niivue.prototype.loadVolumes = function (volumeList) {
  this.volumes = volumeList;
  this.back = this.volumes[0]; // load first volume as back layer

  this.overlays = this.volumes.slice(1); // remove first element (that is now this.back, all other imgaes are overlays)

  let xhr = [];
  let hdr = null;
  let img = null; // for loop to load all volumes in volumeList

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
        hdr = nifti_1.readHeader(dataBuffer);

        if (nii.isCompressed(dataBuffer)) {
          img = nifti_1.readImage(hdr, nii.decompress(dataBuffer));
        } else {
          img = nifti_1.readImage(hdr, dataBuffer);
        }
      } else {
        alert("Unable to load buffer properly from volume?");
        console.log("no buffer?");
      }

      this.volumes[i].volume = {};
      this.volumes[i].volume.hdr = hdr;
      this.volumes[i].volume.img = img;
      this.volumes[i].opacity = 1;
      this.nii2RAS(this.volumes[i]); //_overlayItem = overlayItem
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
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
  this.gl.texStorage3D(this.gl.TEXTURE_3D, 1, this.gl.RGBA8, dims[1], dims[2], dims[3]); //output background dimensions

  if (isInit) {
    let img8 = new Uint8Array(dims[1] * dims[2] * dims[3] * 4);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, dims[1], dims[2], dims[3], this.gl.RGBA, this.gl.UNSIGNED_BYTE, img8);
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
    this.gl.bindTexture(this.gl.TEXTURE_2D, pngTexture); // Set the parameters so we can render any size image.

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR); // Upload the image into the texture.

    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pngImage);
  }.bind(this); // bind "this" context to niivue instance


  pngImage.src = pngName; // MUST BE SAME DOMAIN!!!
  //console.log("loading PNG ", pngName);
}; // loadPng()


Niivue.prototype.initText = async function () {
  //load bitmap
  await this.loadPng('fnt.png'); //create font metrics

  this.fontMets = [];

  for (let id = 0; id < 256; id++) {
    //clear ASCII codes 0..256
    this.fontMets[id] = {};
    this.fontMets[id].xadv = 0;
    this.fontMets[id].uv_lbwh = [0, 0, 0, 0];
    this.fontMets[id].lbwh = [0, 0, 0, 0];
  } //load metrics values: may only sparsely describe range 0..255


  var metrics = [];

  async function fetchMetrics() {
    const response = await fetch('./fnt.json');
    metrics = await response.json();
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


Niivue.prototype.init = async function () {
  //initial setup: only at the startup of the component
  // print debug info (gpu vendor and renderer)
  let debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
  let vendor = this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
  let renderer = this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  console.log("gpu vendor: ", vendor);
  console.log("gpu renderer: ", renderer);
  this.gl.enable(this.gl.CULL_FACE);
  this.gl.cullFace(this.gl.FRONT);
  this.gl.enable(this.gl.BLEND);
  this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA); // register volume and overlay textures

  this.rgbaTex(this.volumeTexture, this.gl.TEXTURE0, [2, 2, 2, 2], true);
  this.rgbaTex(this.overlayTexture, this.gl.TEXTURE2, [2, 2, 2, 2], true);
  let cubeStrip = [0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0];
  let vao = this.gl.createVertexArray();
  this.gl.bindVertexArray(vao);
  let vbo = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(cubeStrip), this.gl.STATIC_DRAW);
  this.gl.enableVertexAttribArray(0);
  this.gl.vertexAttribPointer(0, 3, this.gl.FLOAT, false, 0, 0); // slice shader

  this.sliceShader = new Shader(this.gl, vertSliceShader, fragSliceShader);
  this.sliceShader.use(this.gl);
  this.gl.uniform1i(this.sliceShader.uniforms["volume"], 0);
  this.gl.uniform1i(this.sliceShader.uniforms["colormap"], 1);
  this.gl.uniform1i(this.sliceShader.uniforms["overlay"], 2); // line shader (crosshair)

  this.lineShader = new Shader(this.gl, vertLineShader, fragLineShader); // render shader (3D)

  this.renderShader = new Shader(this.gl, vertRenderShader, fragRenderShader);
  this.renderShader.use(this.gl);
  this.gl.uniform1i(this.renderShader.uniforms["volume"], 0);
  this.gl.uniform1i(this.renderShader.uniforms["colormap"], 1);
  this.gl.uniform1i(this.renderShader.uniforms["overlay"], 2); // colorbar shader

  this.colorbarShader = new Shader(this.gl, vertColorbarShader, fragColorbarShader);
  this.colorbarShader.use(this.gl);
  this.gl.uniform1i(this.colorbarShader.uniforms["colormap"], 1); // font shader
  //multi-channel signed distance font https://github.com/Chlumsky/msdfgen

  this.fontShader = new Shader(this.gl, vertFontShader, fragFontShader);
  this.fontShader.use(this.gl);
  this.gl.uniform1i(this.fontShader.uniforms["fontTexture"], 3); // orientation shaders

  this.passThroughShader = new Shader(this.gl, vertPassThroughShader, fragPassThroughShader); //this.passThroughShader  = new Shader(this.gl, vertOrientShader,fragPassThroughShader);

  this.orientShaderU = new Shader(this.gl, vertOrientShader, fragOrientShaderU.concat(fragOrientShader));
  this.orientShaderI = new Shader(this.gl, vertOrientShader, fragOrientShaderI.concat(fragOrientShader));
  this.orientShaderF = new Shader(this.gl, vertOrientShader, fragOrientShaderF.concat(fragOrientShader));
  await this.initText();
  return this;
}; // init()


Niivue.prototype.updateGLVolume = function () {
  //load volume or change contrast
  let visibleLayers = 0;
  let numLayers = this.volumes.length; // loop through loading volumes in this.volume

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
} // given an overlayItem and its img TypedArray, calculate 2% and 98% display range if needed
//clone FSL robust_range estimates https://github.com/rordenlab/niimath/blob/331758459140db59290a794350d0ff3ad4c37b67/src/core32.c#L1215
//ToDo: convert to web assembly, this is slow in JavaScript


Niivue.prototype.calMinMaxCore = function (overlayItem, img, percentileFrac = 0.02, ignoreZeroVoxels = false) {
  let imgRaw;
  let hdr = overlayItem.volume.hdr;
  if (hdr.datatypeCode === 2) imgRaw = new Uint8Array(img);else if (hdr.datatypeCode === 4) imgRaw = new Int16Array(img);else if (hdr.datatypeCode === 16) imgRaw = new Float32Array(img);else if (hdr.datatypeCode === 64) imgRaw = new Float64Array(img);else if (hdr.datatypeCode === 512) imgRaw = new Uint16Array(img); //determine full range: min..max

  let mn = img[0];
  let mx = img[0];
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
  console.log("full range %f..%f  (voxels 0 or NaN = %i) robust range %f..%f", mnScale, mxScale, nZero, pct2, pct98);

  if (overlayItem.volume.hdr.cal_min < overlayItem.volume.hdr.cal_max && overlayItem.volume.hdr.cal_min >= mnScale && overlayItem.volume.hdr.cal_max <= mxScale) {
    console.log("ignoring robust range: using header cal_min and cal_max");
    pct2 = overlayItem.volume.hdr.cal_min;
    pct98 = overlayItem.volume.hdr.cal_max;
  }

  return [pct2, pct98, mnScale, mxScale];
}; //sliceScale


Niivue.prototype.calMinMax = function (overlayItem, img, percentileFrac = 0.02, ignoreZeroVoxels = false) {
  let minMax = this.calMinMaxCore(overlayItem, img, percentileFrac, ignoreZeroVoxels);
  console.log("cal_min, cal_max, global_min, global_max", minMax[0], minMax[1], minMax[2], minMax[3]);
  overlayItem.cal_min = minMax[0];
  overlayItem.cal_max = minMax[1];
  overlayItem.global_min = minMax[2];
  overlayItem.global_max = minMax[3];
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
    outTexture = this.rgbaTex(this.volumeTexture, this.gl.TEXTURE0, overlayItem.dimsRAS); //this.back.dims)
  } else {
    if (this.back.dims === undefined) console.log('Fatal error: Unable to render overlay: background dimensions not defined!');
    let f000 = this.mm2frac(overlayItem.mm000); //origin in output space

    let f100 = this.mm2frac(overlayItem.mm100);
    let f010 = this.mm2frac(overlayItem.mm010);
    let f001 = this.mm2frac(overlayItem.mm001);
    f100 = subtract(f100, f100, f000); // direction of i dimension from origin

    f010 = subtract(f010, f010, f000); // direction of j dimension from origin

    f001 = subtract(f001, f001, f000); // direction of k dimension from origin

    mtx = fromValues$2(f100[0], f100[1], f100[2], f000[0], f010[0], f010[1], f010[2], f000[1], f001[0], f001[1], f001[2], f000[2], 0, 0, 0, 1);
    invert(mtx, mtx); //console.log('v2', mtx);

    if (layer === 1) {
      outTexture = this.rgbaTex(this.overlayTexture, this.gl.TEXTURE2, this.back.dims);
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
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1); //https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html
  //https://www.khronos.org/registry/OpenGL-Refpages/es3.0/html/glTexStorage3D.xhtml

  let orientShader = this.orientShaderU;

  if (hdr.datatypeCode === 2) {
    // raw input data
    imgRaw = new Uint8Array(img);
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 6, this.gl.R8UI, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RED_INTEGER, this.gl.UNSIGNED_BYTE, imgRaw);
  } else if (hdr.datatypeCode === 4) {
    imgRaw = new Int16Array(img);
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 6, this.gl.R16I, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RED_INTEGER, this.gl.SHORT, imgRaw);
    orientShader = this.orientShaderI;
  } else if (hdr.datatypeCode === 16) {
    imgRaw = new Float32Array(img);
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 6, this.gl.R32F, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RED, this.gl.FLOAT, imgRaw);
    orientShader = this.orientShaderF;
  } else if (hdr.datatypeCode === 64) {
    imgRaw = new Float64Array(img);
    let img32f = new Float32Array();
    img32f = Float32Array.from(imgRaw);
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 6, this.gl.R32F, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RED, this.gl.FLOAT, img32f);
    orientShader = this.orientShaderF;
  } else if (hdr.datatypeCode === 512) {
    imgRaw = new Uint16Array(img);
    this.gl.texStorage3D(this.gl.TEXTURE_3D, 6, this.gl.R16UI, hdr.dims[1], hdr.dims[2], hdr.dims[3]);
    this.gl.texSubImage3D(this.gl.TEXTURE_3D, 0, 0, 0, 0, hdr.dims[1], hdr.dims[2], hdr.dims[3], this.gl.RED_INTEGER, this.gl.UNSIGNED_SHORT, imgRaw);
  }

  if (overlayItem.global_min === undefined) //only once, first time volume is loaded
    this.calMinMax(overlayItem, imgRaw); //blend texture

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
      let coordZ = 1 / this.back.dims[3] * (i + 0.5);
      this.gl.uniform1f(passShader.uniforms["coordZ"], coordZ);
      this.gl.framebufferTextureLayer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, blendTexture, 0, i); //this.gl.clear(this.gl.DEPTH_BUFFER_BIT); //exhaustive, so not required

      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
    }
  } else blendTexture = this.rgbaTex(blendTexture, this.gl.TEXTURE5, [2, 2, 2, 2]);

  orientShader.use(this.gl); //this.selectColormap(overlayItem.colorMap)
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
    let coordZ = 1 / this.back.dims[3] * (i + 0.5);
    this.gl.uniform1f(orientShader.uniforms["coordZ"], coordZ);
    this.gl.framebufferTextureLayer(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, outTexture, 0, i); //this.gl.clear(this.gl.DEPTH_BUFFER_BIT); //exhaustive, so not required

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  }

  this.gl.deleteTexture(tempTex3D);
  this.gl.deleteTexture(blendTexture);
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.deleteFramebuffer(fb);
}; // refreshLayers()


Niivue.prototype.colormap = function (lutName = "") {
  //function colormap(lutName = "") {
  var lut = this.makeLut([0, 255], [0, 255], [0, 255], [0, 128], [0, 255]); //gray

  if (lutName === "Winter") lut = this.makeLut([0, 0, 0], [0, 128, 255], [255, 196, 128], [0, 64, 128], [0, 128, 255]); //winter

  if (lutName === "Warm") lut = this.makeLut([255, 255, 255], [127, 196, 254], [0, 0, 0], [0, 64, 128], [0, 128, 255]); //warm

  if (lutName === "Plasma") lut = this.makeLut([13, 156, 237, 240], [8, 23, 121, 249], [135, 158, 83, 33], [0, 56, 80, 88], [0, 64, 192, 255]); //plasma

  if (lutName === "Viridis") lut = this.makeLut([68, 49, 53, 253], [1, 104, 183, 231], [84, 142, 121, 37], [0, 56, 80, 88], [0, 65, 192, 255]); //viridis

  if (lutName === "Inferno") lut = this.makeLut([0, 120, 237, 240], [0, 28, 105, 249], [4, 109, 37, 33], [0, 56, 80, 88], [0, 64, 192, 255]); //inferno

  return lut;
}; // colormap()


Niivue.prototype.refreshColormaps = function () {
  let nLayer = this.volumes.length;
  if (nLayer < 1) return;
  if (this.colormapTexture !== null) this.gl.deleteTexture(this.colormapTexture);
  this.colormapTexture = this.gl.createTexture();
  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
  this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.RGBA8, 256, nLayer);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR); //this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  //this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_R, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
  let luts = this.colormap(this.volumes[0].colorMap);

  if (nLayer > 1) {
    for (let i = 1; i < nLayer; i++) {
      let lut = this.colormap(this.volumes[i].colorMap);
      let c = new Uint8ClampedArray(luts.length + lut.length);
      c.set(luts);
      c.set(lut, luts.length);
      luts = c; //console.log(i, '>>>',this.volumes[i].colorMap)
    } //colorMap

  }

  this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, 256, nLayer, this.gl.RGBA, this.gl.UNSIGNED_BYTE, luts);
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
  var dims = [1.0, this.back.dims[1] * this.back.pixDims[1], this.back.dims[2] * this.back.pixDims[2], this.back.dims[3] * this.back.pixDims[3]];
  var longestAxis = Math.max(dims[1], Math.max(dims[2], dims[3]));
  var volScale = [dims[1] / longestAxis, dims[2] / longestAxis, dims[3] / longestAxis];
  var vox = [this.back.dims[1], this.back.dims[2], this.back.dims[3]];
  return {
    volScale,
    vox
  };
}; // sliceScale()


Niivue.prototype.mouseClick = function (x, y, posChange = 0, isDelta = true) {
  var posNow;
  var posFuture;

  if (this.sliceType === this.sliceTypeRender) {
    if (posChange === 0) return;
    if (posChange > 0) this.volScaleMultiplier = Math.min(2.0, this.volScaleMultiplier * 1.1);
    if (posChange < 0) this.volScaleMultiplier = Math.max(0.5, this.volScaleMultiplier * 0.9);
    this.drawScene();
    return;
  }

  if (this.numScreenSlices < 1 || this.gl.canvas.height < 1 || this.gl.canvas.width < 1) return; //mouse click X,Y in screen coordinates, origin at top left
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
        if (posFuture < 0) posFuture = 0; //console.log(scrollVal,':',axCorSag, '>>', posFuture);

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


Niivue.prototype.drawColorbar = function (leftTopWidthHeight) {
  if (leftTopWidthHeight[2] <= 0 || leftTopWidthHeight[3] <= 0) return; //console.log("bar:", leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3]);

  if (this.opts.crosshairWidth > 0) {
    //gl.disable(gl.DEPTH_TEST);
    this.lineShader.use(this.gl);
    this.gl.uniform4fv(this.lineShader.uniforms["lineColor"], this.opts.crosshairColor);
    this.gl.uniform2fv(this.lineShader.uniforms["canvasWidthHeight"], [this.gl.canvas.width, this.gl.canvas.height]);
    let ltwh = [leftTopWidthHeight[0] - 1, leftTopWidthHeight[1] - 1, leftTopWidthHeight[2] + 2, leftTopWidthHeight[3] + 2];
    this.gl.uniform4f(this.lineShader.uniforms["leftTopWidthHeight"], ltwh[0], ltwh[1], ltwh[2], ltwh[3]);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  }

  this.colorbarShader.use(this.gl);
  this.gl.activeTexture(this.gl.TEXTURE1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
  this.gl.uniform2fv(this.colorbarShader.uniforms["canvasWidthHeight"], [this.gl.canvas.width, this.gl.canvas.height]);
  this.gl.uniform4f(this.colorbarShader.uniforms["leftTopWidthHeight"], leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3]);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR); //gl.enable(gl.DEPTH_TEST);
}; // drawColorbar()


Niivue.prototype.textWidth = function (scale, str) {
  let w = 0;
  var bytes = new Buffer(str);

  for (let i = 0; i < str.length; i++) w += scale * this.fontMets[bytes[i]].xadv;

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
  this.gl.uniform4fv(this.fontShader.uniforms["uvLeftTopWidthHeight"], metrics.uv_lbwh);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  return scale * metrics.xadv;
}; // drawChar()


Niivue.prototype.drawText = function (xy, str) {
  //to right of x, vertically centered on y
  if (this.opts.textHeight <= 0) return;
  this.fontShader.use(this.gl);
  let scale = this.opts.textHeight * this.gl.canvas.height;
  this.gl.enable(this.gl.BLEND);
  this.gl.uniform2f(this.fontShader.uniforms["canvasWidthHeight"], this.gl.canvas.width, this.gl.canvas.height);
  this.gl.uniform4fv(this.fontShader.uniforms["fontColor"], this.opts.crosshairColor);
  let screenPxRange = scale / this.fontMets.size * this.fontMets.distanceRange;
  screenPxRange = Math.max(screenPxRange, 1.0); //screenPxRange() must never be lower than 1

  this.gl.uniform1f(this.fontShader.uniforms["screenPxRange"], screenPxRange);
  var bytes = new Buffer(str);

  for (let i = 0; i < str.length; i++) xy[0] += this.drawChar(xy, scale, bytes[i]);
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
  var crossXYZ = [this.scene.crosshairPos[0], this.scene.crosshairPos[1], this.scene.crosshairPos[2]]; //axial: width=i, height=j, slice=k

  if (axCorSag === this.sliceTypeCoronal) crossXYZ = [this.scene.crosshairPos[0], this.scene.crosshairPos[2], this.scene.crosshairPos[1]]; //coronal: width=i, height=k, slice=j

  if (axCorSag === this.sliceTypeSagittal) crossXYZ = [this.scene.crosshairPos[1], this.scene.crosshairPos[2], this.scene.crosshairPos[0]]; //sagittal: width=j, height=k, slice=i

  let isMirrorLR = this.isRadiologicalConvention && axCorSag < this.sliceTypeSagittal;
  this.sliceShader.use(this.gl);
  this.gl.uniform1f(this.sliceShader.uniforms["opacity"], this.backOpacity);
  this.gl.uniform1i(this.sliceShader.uniforms["axCorSag"], axCorSag);
  this.gl.uniform1f(this.sliceShader.uniforms["slice"], crossXYZ[2]);
  this.gl.uniform2fv(this.sliceShader.uniforms["canvasWidthHeight"], [this.gl.canvas.width, this.gl.canvas.height]);

  if (isMirrorLR) {
    this.gl.disable(this.gl.CULL_FACE);
    leftTopWidthHeight[2] = -leftTopWidthHeight[2];
    leftTopWidthHeight[0] = leftTopWidthHeight[0] - leftTopWidthHeight[2];
  }

  this.gl.uniform4f(this.sliceShader.uniforms["leftTopWidthHeight"], leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3]); //console.log(leftTopWidthHeight);
  //gl.uniform4f(sliceShader.uniforms["leftTopWidthHeight"], leftTopWidthHeight[0], leftTopWidthHeight[1], leftTopWidthHeight[2], leftTopWidthHeight[3]);
  //gl.drawArrays(gl.TRIANGLE_STRIP, 5, 4);

  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4); //record screenSlices to detect mouse click positions

  this.screenSlices[this.numScreenSlices].leftTopWidthHeight = leftTopWidthHeight;
  this.screenSlices[this.numScreenSlices].axCorSag = axCorSag;
  this.numScreenSlices += 1;
  if (this.opts.crosshairWidth <= 0.0) return;
  this.lineShader.use(this.gl);
  this.gl.uniform4fv(this.lineShader.uniforms["lineColor"], this.opts.crosshairColor);
  this.gl.uniform2fv(this.lineShader.uniforms["canvasWidthHeight"], [this.gl.canvas.width, this.gl.canvas.height]); //vertical line of crosshair:

  var xleft = leftTopWidthHeight[0] + leftTopWidthHeight[2] * crossXYZ[0];
  this.gl.uniform4f(this.lineShader.uniforms["leftTopWidthHeight"], xleft - 0.5 * this.opts.crosshairWidth, leftTopWidthHeight[1], this.opts.crosshairWidth, leftTopWidthHeight[3]);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4); //horizontal line of crosshair:

  var xtop = leftTopWidthHeight[1] + leftTopWidthHeight[3] * (1.0 - crossXYZ[1]);
  this.gl.uniform4f(this.lineShader.uniforms["leftTopWidthHeight"], leftTopWidthHeight[0], xtop - 0.5 * this.opts.crosshairWidth, leftTopWidthHeight[2], this.opts.crosshairWidth);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 5, 4);
  this.gl.enable(this.gl.CULL_FACE);
  if (isMirrorLR) this.drawTextRight([leftTopWidthHeight[0] + leftTopWidthHeight[2] + 1, leftTopWidthHeight[1] + 0.5 * leftTopWidthHeight[3]], "R");else if (axCorSag < this.sliceTypeSagittal) this.drawTextRight([leftTopWidthHeight[0] + 1, leftTopWidthHeight[1] + 0.5 * leftTopWidthHeight[3]], "L");
  if (axCorSag === this.sliceTypeAxial) this.drawTextBelow([leftTopWidthHeight[0] + 0.5 * leftTopWidthHeight[2], leftTopWidthHeight[1] + 1], "A");
  if (axCorSag > this.sliceTypeAxial) this.drawTextBelow([leftTopWidthHeight[0] + 0.5 * leftTopWidthHeight[2], leftTopWidthHeight[1] + 1], "S");
}; // draw2D()


Niivue.prototype.draw3D = function () {
  let {
    volScale,
    vox
  } = this.sliceScale(); // slice scale determined by this.back --> the base image layer

  this.renderShader.use(this.gl);
  let mn = Math.min(this.gl.canvas.width, this.gl.canvas.height);
  if (mn <= 0) return;
  mn *= this.volScaleMultiplier;
  let xCenter = this.gl.canvas.width / 2;
  let yCenter = this.gl.canvas.height / 2;
  let xPix = mn;
  let yPix = mn;
  this.gl.viewport(xCenter - xPix * 0.5, yCenter - yPix * 0.5, xPix, yPix);
  this.gl.clearColor(0.2, 0, 0, 1);
  var m = create$2();
  var fDistance = -0.54; //https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthRange
  // default is 0..1
  // unit cube with corner aligned
  //this.gl.depthRange(0.1, -fDistance * 3.0); //xerxes
  //modelMatrix *= TMat4.Translate(0, 0, -fDistance);

  translate(m, m, [0, 0, fDistance]); // https://glmatrix.net/docs/module-mat4.html  https://glmatrix.net/docs/mat4.js.html

  var rad = (90 - this.scene.renderElevation - volScale[0]) * Math.PI / 180;
  rotate(m, m, rad, [-1, 0, 0]);
  rad = this.scene.renderAzimuth * Math.PI / 180;
  rotate(m, m, rad, [0, 0, 1]);
  scale(m, m, volScale); // volume aspect ratio

  scale(m, m, [0.57, 0.57, 0.57]); //unit cube has maximum 1.73
  //compute ray direction

  var inv = create$2();
  invert(inv, m);
  var rayDir4 = fromValues(0, 0, -1, 1);
  transformMat4(rayDir4, rayDir4, inv);
  var rayDir = fromValues$1(rayDir4[0], rayDir4[1], rayDir4[2]);
  normalize(rayDir, rayDir); //defuzz, avoid divide by zero

  const tiny = 0.00001;
  if (Math.abs(rayDir[0]) < tiny) rayDir[0] = tiny;
  if (Math.abs(rayDir[1]) < tiny) rayDir[1] = tiny;
  if (Math.abs(rayDir[2]) < tiny) rayDir[2] = tiny; //console.log( ">>", renderAzimuth, " : ", renderElevation, ">>>> ", rayDir);
  //this.gl.disable(this.gl.DEPTH_TEST);
  //gl.enable(gl.CULL_FACE);
  //gl.cullFace(gl.FRONT);

  this.gl.enable(this.gl.CULL_FACE);
  this.gl.uniformMatrix4fv(this.renderShader.uniforms["mvpMtx"], false, m);
  this.gl.uniform1f(this.renderShader.uniforms["overlays"], this.overlays);
  this.gl.uniform1f(this.renderShader.uniforms["backOpacity"], this.volumes[0].opacity);
  this.gl.uniform4fv(this.renderShader.uniforms["clipPlane"], this.scene.clipPlane);
  this.gl.uniform3fv(this.renderShader.uniforms["rayDir"], rayDir);
  this.gl.uniform3fv(this.renderShader.uniforms["texVox"], vox);
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 14); //cube is 12 triangles, triangle-strip creates n-2 triangles

  let posString = 'azimuth: ' + this.scene.renderAzimuth.toFixed(0) + ' elevation: ' + this.scene.renderElevation.toFixed(0); //bus.$emit('crosshair-pos-change', posString);

  return posString;
}; // draw3D()


Niivue.prototype.mm2frac = function (mm) {
  //given mm, return volume fraction
  //convert from object space in millimeters to normalized texture space XYZ= [0..1, 0..1 ,0..1]
  let mm4 = fromValues(mm[0], mm[1], mm[2], 1);
  let d = this.back.dims;
  let frac = [0, 0, 0];
  if (d[1] < 1 || d[2] < 1 || d[3] < 1) return frac;
  let sform = clone(this.back.matRAS);
  transpose(sform, sform);
  invert(sform, sform);
  transformMat4(mm4, mm4, sform);
  frac[0] = (mm4[0] + 0.5) / d[1];
  frac[1] = (mm4[1] + 0.5) / d[2];
  frac[2] = (mm4[2] + 0.5) / d[3]; //console.log("mm", mm, " -> frac", frac);

  return frac;
}; // mm2frac()


Niivue.prototype.vox2frac = function (vox) {
  //convert from  0-index voxel space [0..dim[1]-1, 0..dim[2]-1, 0..dim[3]-1] to normalized texture space XYZ= [0..1, 0..1 ,0..1]
  //consider dimension with 3 voxels, the voxel centers are at 0.25, 0.5, 0.75 corresponding to 0,1,2
  let frac = [(vox[0] + 0.5) / this.back.dims[1], (vox[1] + 0.5) / this.back.dims[2], (vox[2] + 0.5) / this.back.dims[3]];
  return frac;
}; // vox2frac()


Niivue.prototype.frac2vox = function (frac) {
  //convert from normalized texture space XYZ= [0..1, 0..1 ,0..1] to 0-index voxel space [0..dim[1]-1, 0..dim[2]-1, 0..dim[3]-1]
  //consider dimension with 3 voxels, the voxel centers are at 0.25, 0.5, 0.75 corresponding to 0,1,2
  let vox = [frac[0] * this.back.dims[1] - 0.5, frac[1] * this.back.dims[2] - 0.5, frac[2] * this.back.dims[3] - 0.5];
  return vox;
}; // frac2vox()


Niivue.prototype.frac2mm = function (frac) {
  //convert from normalized texture space XYZ= [0..1, 0..1 ,0..1] to object space in millimeters
  let pos = fromValues(frac[0], frac[1], frac[2], 1); //let d = overlayItem.volume.hdr.dims;

  let dim = fromValues(this.back.dims[1], this.back.dims[2], this.back.dims[3], 1);
  let sform = clone(this.back.matRAS);
  transpose(sform, sform);
  mul(pos, pos, dim);
  let shim = fromValues(-0.5, -0.5, -0.5, 0); //bitmap with 5 voxels scaled 0..1, voxel centers are 0.1,0.3,0.5,0.7,0.9

  add(pos, pos, shim);
  transformMat4(pos, pos, sform);
  this.mm2frac(pos);
  return pos;
}; // frac2mm()


Niivue.prototype.scaleSlice = function (w, h) {
  let scalePix = this.gl.canvas.clientWidth / w;
  if (h * scalePix > this.gl.canvas.clientHeight) scalePix = this.gl.canvas.clientHeight / h; //canvas space is 0,0...w,h with origin at upper left

  let wPix = w * scalePix;
  let hPix = h * scalePix;
  let leftTopWidthHeight = [(this.gl.canvas.clientWidth - wPix) * 0.5, (this.gl.canvas.clientHeight - hPix) * 0.5, wPix, hPix]; //let leftTopWidthHeight = [(gl.canvas.clientWidth-wPix) * 0.5, 80, wPix, hPix];

  return leftTopWidthHeight;
}; // scaleSlice()


Niivue.prototype.drawScene = function () {
  this.gl.clearColor(this.opts.backColor[0], this.opts.backColor[1], this.opts.backColor[2], this.opts.backColor[3]);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  let posString = '';
  if (!this.back.dims) // exit if we have nothing to draw
    return;
  if (this.sliceType === this.sliceTypeRender) //draw rendering
    return this.draw3D();
  let {
    volScale
  } = this.sliceScale();
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
    let ltwh = this.scaleSlice(volScale[0] + volScale[1], volScale[1] + volScale[2]);
    let wX = ltwh[2] * volScale[0] / (volScale[0] + volScale[1]);
    let ltwh3x1 = this.scaleSlice(volScale[0] + volScale[0] + volScale[1], Math.max(volScale[1], volScale[2]));
    let wX1 = ltwh3x1[2] * volScale[0] / (volScale[0] + volScale[0] + volScale[1]);

    if (wX1 > wX) {
      let pixScale = wX1 / volScale[0];
      let hY1 = volScale[1] * pixScale;
      let hZ1 = volScale[2] * pixScale; //draw axial

      this.draw2D([ltwh3x1[0], ltwh3x1[1], wX1, hY1], 0); //draw coronal

      this.draw2D([ltwh3x1[0] + wX1, ltwh3x1[1], wX1, hZ1], 1); //draw sagittal

      this.draw2D([ltwh3x1[0] + wX1 + wX1, ltwh3x1[1], hY1, hZ1], 2);
    } else {
      let wY = ltwh[2] - wX;
      let hY = ltwh[3] * volScale[1] / (volScale[1] + volScale[2]);
      let hZ = ltwh[3] - hY; //draw axial

      this.draw2D([ltwh[0], ltwh[1] + hZ, wX, hY], 0); //draw coronal

      this.draw2D([ltwh[0], ltwh[1], wX, hZ], 1); //draw sagittal

      this.draw2D([ltwh[0] + wX, ltwh[1], wY, hZ], 2); //draw colorbar (optional) // TODO currently only drawing one colorbar, there may be one per overlay + one for the background

      var margin = this.opts.colorBarMargin * hY;
      this.drawColorbar([ltwh[0] + wX + margin, ltwh[1] + hZ + margin, wY - margin - margin, hY * this.opts.colorbarHeight]); // drawTextBelow(gl, [ltwh[0]+ wX + (wY * 0.5), ltwh[1] + hZ + margin + hY * colorbarHeight], "Syzygy"); //DEMO
    }
  }

  const pos = this.frac2mm([this.scene.crosshairPos[0], this.scene.crosshairPos[1], this.scene.crosshairPos[2]]);
  posString = pos[0].toFixed(2) + '×' + pos[1].toFixed(2) + '×' + pos[2].toFixed(2);
  this.gl.finish(); // temporary event bus mechanism. It uses Vue, but it would be ideal to divorce vue from this gl code.
  //bus.$emit('crosshair-pos-change', posString);

  return posString;
}; // drawScene()

export { Niivue };
