import * as gifti from "gifti-reader-js/release/current/gifti-reader";
import * as pako from "pako";
import { v4 as uuidv4 } from "uuid";
import * as cmaps from "./cmaps";
import { Log } from "./logger";
const log = new Log();

/**
 * @class NVMesh
 * @type NVMesh
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
export var NVMesh = function (
  data,
  posNormClr,
  tris,
  name = "",
  colorMap = "green",
  opacity = 1.0,
  visible = true
) {
  this.name = name;
  this.posNormClr = posNormClr;
  this.tris = tris;
  this.id = uuidv4();
  this.colorMap = colorMap;
  this.opacity = opacity > 1.0 ? 1.0 : opacity; //make sure opacity can't be initialized greater than 1 see: #107 and #117 on github
  this.visible = visible;

  // Added to support zerosLike
  if (!data) {
    return;
  }
  //???? this.gii = gifti.parse(data);
};

NVMesh.prototype.colorMaps = function (sort = true) {
  let cm = [];
  for (const [key] of Object.entries(cmaps)) {
    cm.push(key);
  }
  return sort === true ? cm.sort() : cm;
};

NVMesh.prototype.setColorMap = function (cm) {
  let allColorMaps = this.colorMaps();
  if (allColorMaps.indexOf(cm.toLowerCase()) !== -1) {
    this.colorMap = cm.toLowerCase();
    this.calMinMax();
  } else {
    log.warn(`color map ${cm} is not a valid color map`);
  }
};

function generateNormals(pts, tris) {
  //from https://github.com/rii-mango/Papaya
  /*
Copyright (c) 2012-2015, RII-UTHSCSA
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
  var p1 = [],
    p2 = [],
    p3 = [],
    normal = [],
    nn = [],
    ctr,
    normalsDataLength = pts.length,
    numIndices,
    qx,
    qy,
    qz,
    px,
    py,
    pz,
    index1,
    index2,
    index3;

  let norms = new Float32Array(normalsDataLength);
  numIndices = tris.length;
  for (ctr = 0; ctr < numIndices; ctr += 3) {
    index1 = tris[ctr] * 3;
    index2 = tris[ctr + 1] * 3;
    index3 = tris[ctr + 2] * 3;

    p1.x = pts[index1];
    p1.y = pts[index1 + 1];
    p1.z = pts[index1 + 2];

    p2.x = pts[index2];
    p2.y = pts[index2 + 1];
    p2.z = pts[index2 + 2];

    p3.x = pts[index3];
    p3.y = pts[index3 + 1];
    p3.z = pts[index3 + 2];

    qx = p2.x - p1.x;
    qy = p2.y - p1.y;
    qz = p2.z - p1.z;
    px = p3.x - p1.x;
    py = p3.y - p1.y;
    pz = p3.z - p1.z;

    normal[0] = py * qz - pz * qy;
    normal[1] = pz * qx - px * qz;
    normal[2] = px * qy - py * qx;

    norms[index1] += normal[0];
    norms[index1 + 1] += normal[1];
    norms[index1 + 2] += normal[2];

    norms[index2] += normal[0];
    norms[index2 + 1] += normal[1];
    norms[index2 + 2] += normal[2];

    norms[index3] += normal[0];
    norms[index3 + 1] += normal[1];
    norms[index3 + 2] += normal[2];
  }
  for (ctr = 0; ctr < normalsDataLength; ctr += 3) {
    normal[0] = -1 * norms[ctr];
    normal[1] = -1 * norms[ctr + 1];
    normal[2] = -1 * norms[ctr + 2];
    let len =
      normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2];
    if (len > 0) {
      len = 1.0 / Math.sqrt(len);
      normal[0] *= len;
      normal[1] *= len;
      normal[2] *= len;
    }
    norms[ctr] = normal[0];
    norms[ctr + 1] = normal[1];
    norms[ctr + 2] = normal[2];
  }
  return norms;
}

NVMesh.generatePosNormClr = function (pts, tris, rgba255) {
  //function generatePosNormClr(pts) {
  if (pts.length < 3 || rgba255.length < 4) {
    log.error("Catastrophic failure generatePosNormClr()");
  }
  let norms = generateNormals(pts, tris);
  let npt = pts.length / 3;
  let isPerVertexColors = npt === rgba255.length / 4;
  var f32 = new Float32Array(npt * 7); //Each vertex has 7 components: PositionXYZ, NormalXYZ, RGBA32
  var u8 = new Uint8Array(f32.buffer); //Each vertex has 7 components: PositionXYZ, NormalXYZ, RGBA32
  let p = 0; //input position
  let c = 0; //input color
  let f = 0; //output float32 location (position and normals)
  let u = 24; //output uint8 location (colors), offset 24 as after 3*position+3*normal
  for (let i = 0; i < npt; i++) {
    f32[f + 0] = pts[p + 0];
    f32[f + 1] = pts[p + 1];
    f32[f + 2] = pts[p + 2];
    f32[f + 3] = norms[p + 0];
    f32[f + 4] = norms[p + 1];
    f32[f + 5] = norms[p + 2];
    u8[u] = rgba255[c + 0];
    u8[u + 1] = rgba255[c + 1];
    u8[u + 2] = rgba255[c + 2];
    u8[u + 3] = rgba255[c + 3];
    if (isPerVertexColors) c += 4;
    //if (i > 13500) f32[j+6] = f32rgba1[0]
    p += 3; //read 3 input components: XYZ
    f += 7; //write 7 output components: 3*Position, 3*Normal, 1*RGBA
    u += 28; //stride of 28 bytes
  }
  return f32;
};

NVMesh.readMZ3 = function (buffer) {
  //NVMesh.generatePosNormClr = function (pts, tris, rgba255) {
  if (buffer.byteLength < 20)
    //76 for raw, not sure of gzip
    throw new Error("File to small to be mz3: bytes = " + buffer.byteLength);
  var reader = new DataView(buffer);
  //get number of vertices and faces
  var magic = reader.getUint16(0, true);
  var _buffer = buffer;
  if (magic === 35615 || magic === 8075) {
    //gzip signature 0x1F8B in little and big endian
    //console.log("detected gzipped mz3");
    //HTML should source an inflate script:
    // <script src="https://cdn.jsdelivr.net/pako/1.0.3/pako.min.js"></script>
    // <script src="js/libs/gunzip.min.js"></script>
    //for decompression there seems to be little real world difference
    var raw;
    if (typeof pako === "object" && typeof pako.deflate === "function") {
      raw = pako.inflate(new Uint8Array(buffer));
    } else if (typeof Zlib === "object" && typeof Zlib.Gunzip === "function") {
      var inflate = new Zlib.Gunzip(new Uint8Array(buffer)); // eslint-disable-line no-undef
      raw = inflate.decompress();
    } else
      alert(
        "Required script missing: include either pako.min.js or gunzip.min.js"
      );
    //console.log("gz->raw %d->%d", buffer.byteLength, raw.length);
    var reader = new DataView(raw.buffer);
    var magic = reader.getUint16(0, true);
    _buffer = raw.buffer;
    //throw new Error( 'Gzip MZ3 file' );
  }
  var attr = reader.getUint16(2, true);
  var nface = reader.getUint32(4, true);
  var nvert = reader.getUint32(8, true);
  var nskip = reader.getUint32(12, true);
  log.debug(
    "MZ3 magic %d attr %d face %d vert %d skip %d",
    magic,
    attr,
    nface,
    nvert,
    nskip
  );
  if (magic != 23117) throw new Error("Invalid MZ3 file");
  var isFace = attr & 1;
  var isVert = attr & 2;
  var isRGBA = attr & 4;
  var isSCALAR = attr & 8;
  var isDOUBLE = attr & 16;
  var isAOMap = attr & 32;
  if (attr > 63) throw new Error("Unsupported future version of MZ3 file");
  if (!isFace || !isVert || nface < 1 || nvert < 3)
    throw new Error("Not a mesh MZ3 file (maybe scalar)");
  var filepos = 16 + nskip;
  var indices = null;
  if (isFace) {
    indices = new Int32Array(_buffer, filepos, nface * 3, true);
    filepos += nface * 3 * 4;
  }
  var positions = null;
  if (isVert) {
    positions = new Float32Array(_buffer, filepos, nvert * 3, true);
    filepos += nvert * 3 * 4;
  }
  var colors = null;
  if (isRGBA) {
    colors = new Float32Array(nvert * 3);
    var rgba8 = new Uint8Array(_buffer, filepos, nvert * 4, true);
    filepos += nvert * 4;
    var k3 = 0;
    var k4 = 0;
    for (var i = 0; i < nvert; i++) {
      for (var j = 0; j < 3; j++) {
        //for RGBA
        colors[k3] = rgba8[k4] / 255;
        k3++;
        k4++;
      }
      k4++; //skip Alpha
    } //for i
  } //if isRGBA
  //
  var uv2 = null;
  if (!isRGBA && isSCALAR && isAOMap) {
    var scalars = new Float32Array(_buffer, filepos, nvert, true);
    filepos += nvert * 4;
    /*var mn = scalars[0];
    var mx = scalars[0];
    for ( var i = 0; i < nvert; i ++ ) {
      if (scalars[i] < mn) mn = scalars[i];
      if (scalars[i] > mx) mx = scalars[i];
    }
    console.log("scalar range %g...%g", mn, mx);*/
    uv2 = new Float32Array(nvert * 2);
    for (var i = 0; i < nvert; i++) {
      uv2[i * 2] = uv2[i * 2 + 1] = scalars[i];
    }
  }
  return {
    positions,
    indices,
    uv2,
    colors,
  };
};
/**
 * factory function to load and return a new NVMesh instance from a given URL
 * @param {string} url the resolvable URL pointing to a nifti image to load
 * @param {string} [name=''] a name for this image. Default is an empty string
 * @param {string} [colorMap='gray'] a color map to use. default is gray
 * @param {number} [opacity=1.0] the opacity for this image. default is 1
 * @param {boolean} [visible=true] whether or not this image is to be visible
 * @returns {NVMesh} returns a NVImage intance
 * @example
 * myImage = NVMesh.loadFromUrl('./someURL/mesh.gii') // must be served from a server (local or remote)
 */
NVMesh.loadFromUrl = async function (
  url,
  name = "",
  colorMap = "yellow",
  opacity = 1.0,
  rgba255 = [192, 128, 129, 255],
  visible = true
) {
  let response = await fetch(url);

  let nvmesh = null;

  if (!response.ok) {
    throw Error(response.statusText);
  }

  let urlParts = url.split("/"); // split url parts at slash
  name = urlParts.slice(-1)[0]; // name will be last part of url (e.g. some/url/image.nii.gz --> image.nii.gz)
  let tris = [];
  var pts = [];
  var re = /(?:\.([^.]+))?$/;
  let ext = re.exec(name)[1];
  if (ext.toUpperCase() === "MZ3") {
    let buffer = await response.arrayBuffer();
    //use Three.JS reader, could be simplified by using native types
    let obj = this.readMZ3(buffer);
    pts = obj.positions.slice();
    tris = obj.indices.slice();
    if (obj.colors && obj.colors.length === pts.length) {
      rgba255 = [];
      let n = pts.length / 3;
      let c = 0;
      for (let i = 0; i < n; i++) {
        //convert ThreeJS unit RGB to RGBA255
        rgba255.push(obj.colors[c] * 255); //red
        rgba255.push(obj.colors[c + 1] * 255); //green
        rgba255.push(obj.colors[c + 2] * 255); //blue
        rgba255.push(255); //alpha
        c += 3;
      }
    } //colors
  } else if (ext.toUpperCase() === "OBJ") {
    //GIFTI
    let txt = await response.text();
    var lines = txt.split("\n");
    var n = lines.length;
    let t = [];
    for (let i = 0; i < n; i++) {
      let str = lines[i];
      if (str[0] === "v" && str[1] === " ") {
        //'v ' but not 'vt' or 'vn'
        let items = str.split(" ");
        pts.push(parseFloat(items[1]));
        pts.push(parseFloat(items[2]));
        pts.push(parseFloat(items[3]));
        //v 0 -0.5 -0
      }
      if (str[0] === "f") {
        let items = str.split(" ");
        let tn = items[1].split("/");
        t.push(parseInt(tn - 1));
        tn = items[2].split("/");
        t.push(parseInt(tn - 1));
        tn = items[3].split("/");
        t.push(parseInt(tn - 1));
      }
      tris = new Int32Array(t);
    } //for all lines
    log.debug(">>>", tris);
  } else if (ext.toUpperCase() === "GII") {
    //GIFTI
    let xmlStr = await response.text();
    let gii = gifti.parse(xmlStr);
    pts = gii.getPointsDataArray().getData();
    tris = gii.getTrianglesDataArray().getData();
  } else {
    //file extension not recognized: assume FreeSurfer
    let buf = await response.arrayBuffer();
    const view = new DataView(buf); //ArrayBuffer to dataview
    //ALWAYS big endian
    let sig0 = view.getUint32(0, false);
    let sig1 = view.getUint32(4, false);
    if (sig0 !== 4294966883 || sig1 !== 1919246708)
      log.debug(
        "Unable to recognize file type: does not appear to be FreeSurfer format."
      );
    let offset = 0;
    while (view.getUint8(offset) !== 10) offset++;
    offset += 2;
    let nv = view.getUint32(offset, false); //number of vertices
    offset += 4;
    let nf = view.getUint32(offset, false); //number of faces
    offset += 4;
    nv *= 3; //each vertex has 3 positions: XYZ
    pts = new Float32Array(nv);
    for (let i = 0; i < nv; i++) {
      pts[i] = view.getFloat32(offset, false);
      offset += 4;
    }
    nf *= 3; //each triangle face indexes 3 triangles
    tris = new Int32Array(nf);
    for (let i = 0; i < nf; i++) {
      tris[i] = view.getUint32(offset, false);
      offset += 4;
    }
  } //read file types
  let npt = pts.length / 3;
  let ntri = tris.length / 3;
  if (ntri < 1 || npt < 3) {
    alert("Mesh should have at least one triangle and three vertices");
    return;
  }
  //console.log('npts ', npt, ' ntri ', ntri)
  if (tris.constructor !== Int32Array) {
    alert("Expected triangle indices to be of type INT32");
  }
  let gix = []; //???? we do not want "gii", e.g. if we load mz3, obj ply
  let posNormClr = this.generatePosNormClr(pts, tris, rgba255);
  if (posNormClr) {
    nvmesh = new NVMesh(
      gix,
      posNormClr,
      tris,
      name,
      colorMap,
      opacity,
      visible
    );
  } else {
    alert("Unable to load buffer properly from mesh");
  }
  return nvmesh;
};

// not included in public docs
// loading Nifti files
NVMesh.readFileAsync = function (file) {
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
NVMesh.loadFromFile = async function (
  file,
  name = "",
  colorMap = "blue",
  opacity = 1.0,
  trustCalMinMax = true,
  percentileFrac = 0.02,
  ignoreZeroVoxels = false,
  visible = true
) {
  let nvmesh = null;
  try {
    let dataBuffer = await this.readFileAsync(file);
    nvmesh = new NVMesh(
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
    log.debug(err);
  }
  return nvmesh;
};

String.prototype.getBytes = function () {
  let bytes = [];
  for (var i = 0; i < this.length; i++) {
    bytes.push(this.charCodeAt(i));
  }

  return bytes;
};
