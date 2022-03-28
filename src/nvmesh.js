import * as gifti from "gifti-reader-js/release/current/gifti-reader";
import * as pako from "pako";
import { v4 as uuidv4 } from "uuid";
import * as cmaps from "./cmaps";
import { Log } from "./logger";
import { NiivueObject3D } from "./niivue-object3D.js"; //n.b. used by connectome
import { mat3, mat4, vec3, vec4 } from "gl-matrix";
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
  posNormClr,
  tris,
  name = "",
  colorMap = "green",
  opacity = 1.0,
  visible = true,
  gl,
  //following properties generated when new mesh is created by this function
  indexCount = 0,
  vertexBuffer = null,
  indexBuffer = null,
  vao = null
) {
  this.name = name;
  this.id = uuidv4();
  this.colorMap = colorMap;
  this.opacity = opacity > 1.0 ? 1.0 : opacity; //make sure opacity can't be initialized greater than 1 see: #107 and #117 on github
  this.visible = visible;

  if (name.startsWith("*")) {
    // The tractography kludge!
    //nvmesh = new NVMesh(pts, offsetPt0, '*');
    let pts = posNormClr;
    let offsetPt0 = tris;
    //determine fiber colors
    let npt = pts.length / 3; //each point has three components: X,Y,Z
    var f32 = new Float32Array(npt * 4); //four 32-bit components X,Y,Z,C
    var rgba32 = new Uint32Array(f32.buffer); //typecast of our X,Y,Z,C array
    //fill XYZ position of XYZC array
    let i3 = 0;
    let i4 = 0;
    for (let i = 0; i < npt; i++) {
      f32[i4 + 0] = pts[i3 + 0];
      f32[i4 + 1] = pts[i3 + 1];
      f32[i4 + 2] = pts[i3 + 2];
      i3 += 3;
      i4 += 4;
    }
    //fill fiber Color
    let dither = 0.1;
    let ditherHalf = dither * 0.5;
    let r = 0.0;
    let n_count = offsetPt0.length - 1;
    for (let i = 0; i < n_count; i++) {
      let vStart = offsetPt0[i]; //line start
      let vEnd = offsetPt0[i + 1] - 1; //line end
      let vStart3 = vStart * 3; //pts have 3 components XYZ
      let vEnd3 = vEnd * 3;
      let v = vec3.fromValues(
        pts[vStart3] - pts[vEnd3],
        pts[vStart3 + 1] - pts[vEnd3 + 1],
        pts[vStart3 + 2] - pts[vEnd3 + 2]
      );
      vec3.normalize(v, v);
      if (dither > 0.0) r = dither * Math.random() - ditherHalf;
      for (let j = 0; j < 3; j++)
        v[j] = 255 * Math.max(Math.min(Math.abs(v[j]) + r, 1.0), 0.0);
      let RBGA = v[0] + (v[1] << 8) + (v[2] << 16);
      //let RBGA =  (Math.abs(v[0]) * 255) + ((Math.abs(v[1]) *255) << 8) + ((Math.abs(v[2]) *255) << 16) + (0 << 24); //RGBA
      let vStart4 = vStart * 4 + 3; //+3: fill 4th component colors: XYZC = 0123
      let vEnd4 = vEnd * 4 + 3;
      for (let j = vStart4; j <= vEnd4; j += 4) rgba32[j] = RBGA;
    }

    //  https://blog.spacepatroldelta.com/a?ID=00950-d878555f-a97a-4e32-9f40-fd9a449cb4fe
    let primitiveRestart = Math.pow(2, 32) - 1; //for gl.UNSIGNED_INT
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint32Array(rgba32), gl.STATIC_DRAW);
    n_count = offsetPt0.length - 1;
    let indices = [];
    let min_pts = 4;
    for (let i = 0; i < n_count; i++) {
      let n_pts = offsetPt0[i + 1] - offsetPt0[i]; //if streamline0 starts at point 0 and streamline1 at point 4, then streamline0 has 4 points: 0,1,2,3
      if (n_pts < min_pts) continue;
      for (let j = offsetPt0[i]; j < offsetPt0[i + 1]; j++) indices.push(j);
      indices.push(primitiveRestart);
    }
    this.indexCount = indices.length;
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(indices),
      gl.STATIC_DRAW
    );
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    //vertex position: 3 floats X,Y,Z
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
    //vertex color
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 16, 12);

    gl.bindVertexArray(null); // https://stackoverflow.com/questions/43904396/are-we-not-allowed-to-bind-gl-array-buffer-and-vertex-attrib-array-to-0-in-webgl
    return;
  }
  this.posNormClr = posNormClr;
  this.tris = tris;
  //generate webGL buffers and vao
  this.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(tris), gl.STATIC_DRAW);
  this.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posNormClr), gl.STATIC_DRAW);
  this.indexCount = tris.length;
  //the VAO binds the vertices and indices as well as describing the vertex layout
  this.vao = gl.createVertexArray();
  gl.bindVertexArray(this.vao);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  //vertex position: 3 floats X,Y,Z
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  //vertex surface normal vector: (also three floats)
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
  //vertex color
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 28, 24);
  gl.bindVertexArray(null); // https://stackoverflow.com/questions/43904396/are-we-not-allowed-to-bind-gl-array-buffer-and-vertex-attrib-array-to-0-in-webgl
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
  if (pts.length < 3 || rgba255.length < 4)
    log.error("Catastrophic failure generatePosNormClr()");
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
    p += 3; //read 3 input components: XYZ
    f += 7; //write 7 output components: 3*Position, 3*Normal, 1*RGBA
    u += 28; //stride of 28 bytes
  }
  return f32;
};

NVMesh.readTCK = function (buffer) {
  //https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#tracks-file-format-tck
  let len = buffer.byteLength;
  if (len < 20)
    throw new Error("File too small to be TCK: bytes = " + buffer.byteLength);
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
  let line = readStr(); //1st line: signature 'mrtrix tracks'
  if (!line.includes("mrtrix tracks")) {
    console.log("Not a valid TCK file");
    return;
  }
  while (pos < len && !line.includes("END")) line = readStr();
  var reader = new DataView(buffer);
  //read and transform vertex positions
  let npt = 0;
  let offsetPt0 = [];
  offsetPt0.push(npt); //1st streamline starts at 0
  let pts = [];
  while (pos + 12 < len) {
    var ptx = reader.getFloat32(pos, true);
    pos += 4;
    var pty = reader.getFloat32(pos, true);
    pos += 4;
    var ptz = reader.getFloat32(pos, true);
    pos += 4;
    if (!isFinite(ptx)) {
      //both NaN and Inifinity are not finite
      offsetPt0.push(npt);
      if (!isNaN(ptx))
        //terminate if infinity
        break;
    } else {
      pts.push(ptx);
      pts.push(pty);
      pts.push(ptz);
      npt++;
    }
  }
  return {
    pts,
    offsetPt0,
  };
}; //readTCK()

NVMesh.readTRK = function (buffer) {
  // http://trackvis.org/docs/?subsect=fileformat
  // http://www.tractometer.org/fiberweb/
  // https://github.com/xtk/X/tree/master/io
  // in practice, always little endian
  var reader = new DataView(buffer);
  var magic = reader.getUint32(0, true); //'TRAC'
  var vers = reader.getUint32(992, true); //2
  var hdr_sz = reader.getUint32(996, true); //1000
  if (vers > 2 || hdr_sz !== 1000 || magic !== 1128354388)
    throw new Error("Not a valid TRK file");
  var n_scalars = reader.getInt16(36, true);
  var voxel_sizeX = reader.getFloat32(12, true);
  var voxel_sizeY = reader.getFloat32(16, true);
  var voxel_sizeZ = reader.getFloat32(20, true);
  var zoomMat = mat4.fromValues(
    1 / voxel_sizeX,
    0,
    0,
    -0.5,
    0,
    1 / voxel_sizeY,
    0,
    -0.5,
    0,
    0,
    1 / voxel_sizeZ,
    -0.5,
    0,
    0,
    0,
    1
  );
  var n_properties = reader.getInt16(238, true);
  var mat = mat4.create();
  for (let i = 0; i < 16; i++) mat[i] = reader.getFloat32(440 + i * 4, true);
  if (mat[15] === 0.0) {
    //vox_to_ras[3][3] is 0, it means the matrix is not recorded
    console.log("TRK vox_to_ras not set");
    mat4.identity(mat);
  }
  var vox2mmMat = mat4.create();
  mat4.mul(vox2mmMat, mat, zoomMat);
  let i32 = null;
  let f32 = null;
  if (n_scalars === 0 && n_properties === 0) {
    //fast reading
    i32 = new Int32Array(buffer.slice(hdr_sz));
    f32 = new Float32Array(i32.buffer);
  } else {
    console.log("ooops");
  }
  let ntracks = i32.length;
  //read and transform vertex positions
  let i = 0;
  let npt = 0;
  let offsetPt0 = [];
  let pts = [];
  while (i < ntracks) {
    let n_pts = i32[i];
    i = i + 1; // read 1 32-bit integer for number of points in this streamline
    offsetPt0.push(npt); //index of first vertex in this streamline
    for (var j = 0; j < n_pts; j++) {
      let ptx = f32[i + 0];
      let pty = f32[i + 1];
      let ptz = f32[i + 2];
      i += 3; //read 3 32-bit floats for XYZ position
      pts.push(
        ptx * vox2mmMat[0] +
          pty * vox2mmMat[1] +
          ptz * vox2mmMat[2] +
          vox2mmMat[3]
      );
      pts.push(
        ptx * vox2mmMat[4] +
          pty * vox2mmMat[5] +
          ptz * vox2mmMat[6] +
          vox2mmMat[7]
      );
      pts.push(
        ptx * vox2mmMat[8] +
          pty * vox2mmMat[9] +
          ptz * vox2mmMat[10] +
          vox2mmMat[11]
      );
      npt++;
    }
  } //compute n_count
  offsetPt0.push(npt); //add 'first index' as if one more line was added (fence post problem)
  console.log(
    "TRK streamlines (n_count) >>",
    offsetPt0.length - 1,
    " vertices: ",
    pts.length / 3
  );
  return {
    pts,
    offsetPt0,
  };
}; //readTRK()

NVMesh.readTxtVTK = function (buffer) {
  var enc = new TextDecoder("utf-8");
  var txt = enc.decode(buffer);
  var lines = txt.split("\n");
  var n = lines.length;
  if (n < 7 || !lines[0].startsWith("# vtk DataFile"))
    alert("Invalid VTK image");
  if (!lines[2].startsWith("ASCII")) alert("Not ASCII VTK mesh");
  let pos = 3;
  while (lines[pos].length < 1) pos++; //skip blank lines
  if (!lines[pos].includes("POLYDATA")) alert("Not ASCII VTK polydata");
  pos++;
  while (lines[pos].length < 1) pos++; //skip blank lines
  if (!lines[pos].startsWith("POINTS")) alert("Not VTK POINTS");
  let items = lines[pos].split(" ");
  let nvert = parseInt(items[1]); //POINTS 10261 float
  let nvert3 = nvert * 3;
  var positions = new Float32Array(nvert * 3);
  let v = 0;
  while (v < nvert * 3) {
    pos++;
    let str = lines[pos].trim();
    let pts = str.split(" ");
    for (let i = 0; i < pts.length; i++) {
      if (v >= nvert3) break;
      positions[v] = parseFloat(pts[i]);
      v++;
    }
  }
  let tris = [];
  pos++;
  while (lines[pos].length < 1) pos++; //skip blank lines
  items = lines[pos].split(" ");
  pos++;
  if (items[0].includes("TRIANGLE_STRIPS")) {
    let nstrip = parseInt(items[1]);
    for (let i = 0; i < nstrip; i++) {
      let str = lines[pos].trim();
      pos++;
      let vs = str.split(" ");
      let ntri = parseInt(vs[0]) - 2; //-2 as triangle strip is creates pts - 2 faces
      let k = 1;
      for (let t = 0; t < ntri; t++) {
        if (t % 2) {
          // preserve winding order
          tris.push(parseInt(vs[k + 2]));
          tris.push(parseInt(vs[k + 1]));
          tris.push(parseInt(vs[k]));
        } else {
          tris.push(parseInt(vs[k]));
          tris.push(parseInt(vs[k + 1]));
          tris.push(parseInt(vs[k + 2]));
        }
        k += 1;
      } //for each triangle
    } //for each strip
  } else if (items[0].includes("POLYGONS")) {
    let npoly = parseInt(items[1]);
    for (let i = 0; i < npoly; i++) {
      let str = lines[pos].trim();
      pos++;
      let vs = str.split(" ");
      let ntri = parseInt(vs[0]) - 2; //e.g. 3 for triangle
      let fx = parseInt(vs[1]);
      let fy = parseInt(vs[2]);
      for (let t = 0; t < ntri; t++) {
        let fz = parseInt(vs[3 + t]);
        tris.push(fx);
        tris.push(fy);
        tris.push(fz);
        fy = fz;
      }
    }
  } else alert("Unsupported ASCII VTK datatype ", items[0]);
  var indices = new Int32Array(tris);
  return {
    positions,
    indices,
  };
}; // readTxtVTK()

NVMesh.readVTK = function (buffer) {
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
  if (!line.startsWith("# vtk DataFile")) alert("Invalid VTK mesh");
  line = readStr(); //2nd line comment
  line = readStr(); //3rd line ASCII/BINARY
  if (line.startsWith("ASCII")) return this.readTxtVTK(buffer);
  else if (!line.startsWith("BINARY"))
    alert("Invalid VTK image, expected ASCII or BINARY", line);
  line = readStr(); //5th line "DATASET POLYDATA"
  if (!line.includes("POLYDATA")) alert("Only able to read VTK POLYDATA", line);
  line = readStr(); //6th line "POINTS 10261 float"
  if (!line.includes("POINTS") || !line.includes("float"))
    alert("Only able to read VTK float POINTS", line);
  let items = line.split(" ");
  let nvert = parseInt(items[1]); //POINTS 10261 float
  let nvert3 = nvert * 3;
  var positions = new Float32Array(nvert3);
  var reader = new DataView(buffer);
  for (let i = 0; i < nvert3; i++) {
    positions[i] = reader.getFloat32(pos, false);
    pos += 4;
  }
  line = readStr();
  items = line.split(" ");
  let tris = [];
  if (items[0].includes("TRIANGLE_STRIPS")) {
    let nstrip = parseInt(items[1]);
    for (let i = 0; i < nstrip; i++) {
      let ntri = reader.getInt32(pos, false) - 2; //-2 as triangle strip is creates pts - 2 faces
      pos += 4;
      for (let t = 0; t < ntri; t++) {
        if (t % 2) {
          // preserve winding order
          tris.push(reader.getInt32(pos + 8, false));
          tris.push(reader.getInt32(pos + 4, false));
          tris.push(reader.getInt32(pos, false));
        } else {
          tris.push(reader.getInt32(pos, false));
          tris.push(reader.getInt32(pos + 4, false));
          tris.push(reader.getInt32(pos + 8, false));
        }
        pos += 4;
      } //for each triangle
      pos += 8;
    } //for each strip
  } else if (items[0].includes("POLYGONS")) {
    let npoly = parseInt(items[1]);
    for (let i = 0; i < npoly; i++) {
      let ntri = reader.getInt32(pos, false) - 2; //3 for single triangle, 4 for 2 triangles
      pos += 4;
      let fx = reader.getInt32(pos, false);
      pos += 4;
      let fy = reader.getInt32(pos, false);
      pos += 4;
      for (let t = 0; t < ntri; t++) {
        let fz = reader.getInt32(pos, false);
        pos += 4;
        tris.push(fx);
        tris.push(fy);
        tris.push(fz);
        fy = fz;
      } //for each triangle
    } //for each polygon
  } else alert("Unsupported ASCII VTK datatype ", items[0]);
  var indices = new Int32Array(tris);
  return {
    positions,
    indices,
  };
}; // readVTK()

NVMesh.readMZ3 = function (buffer) {
  if (buffer.byteLength < 20)
    //76 for raw, not sure of gzip
    throw new Error("File too small to be mz3: bytes = " + buffer.byteLength);
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
}; // readMZ3()

NVMesh.readOBJ = function (buffer) {
  //WaveFront OBJ format
  var enc = new TextDecoder("utf-8");
  var txt = enc.decode(buffer);
  //let txt = await response.text();
  var lines = txt.split("\n");
  var n = lines.length;
  let pts = [];
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
  } //for all lines
  var positions = new Float32Array(pts);
  var indices = new Int32Array(t);
  return {
    positions,
    indices,
  };
}; //readOBJ

NVMesh.readFreeSurfer = function (buffer) {
  const view = new DataView(buffer); //ArrayBuffer to dataview
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
  var positions = new Float32Array(nv);
  for (let i = 0; i < nv; i++) {
    positions[i] = view.getFloat32(offset, false);
    offset += 4;
  }
  nf *= 3; //each triangle face indexes 3 triangles
  var indices = new Int32Array(nf);
  for (let i = 0; i < nf; i++) {
    indices[i] = view.getUint32(offset, false);
    offset += 4;
  }
  return {
    positions,
    indices,
  };
}; // readFreeSurfer()

NVMesh.readSTL = function (buffer) {
  if (buffer.byteLength < 80 + 4 + 50)
    throw new Error("File too small to be STL: bytes = " + buffer.byteLength);
  var reader = new DataView(buffer);
  let sig = reader.getUint32(80, true);
  if (sig === 1768714099)
    throw new Error("Only able to read binary (not ASCII) STL files.");
  var ntri = reader.getUint32(80, true);
  let ntri3 = 3 * ntri;
  if (buffer.byteLength < 80 + 4 + ntri * 50)
    throw new Error("STL file too small to store triangles = ", ntri);
  var indices = new Int32Array(ntri3);
  var positions = new Float32Array(ntri3 * 3);
  let pos = 80 + 4 + 12;
  let v = 0; //vertex
  for (var i = 0; i < ntri; i++) {
    for (var j = 0; j < 9; j++) {
      positions[v] = reader.getFloat32(pos, true);
      v += 1;
      pos += 4;
    }
    pos += 14; //50 bytes for triangle, only 36 used for position
  }
  for (var i = 0; i < ntri3; i++) indices[i] = i;
  return {
    positions,
    indices,
  };
};

NVMesh.makeLut = function (Rs, Gs, Bs, As, Is) {
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

NVMesh.colormap = function (lutName = "") {
  let cmaps = {
    min: 0,
    max: 0,
    R: [0, 128, 255],
    G: [0, 0, 0],
    B: [0, 0, 0],
    A: [0, 64, 128],
    I: [0, 128, 255],
  };
  return this.makeLut(cmaps.R, cmaps.G, cmaps.B, cmaps.A, cmaps.I);
};

NVMesh.loadConnectomeFromJSON = async function (
  json,
  gl,
  name = "",
  colorMap = "",
  opacity = 1.0,
  visible = true
) {
  let nvmesh = null;
  let tris = [];
  if (json.hasOwnProperty("name")) name = json.name;
  //draw nodes
  let nNode = json.nodes.X.length;
  let hasEdges = false;
  if (nNode > 1 && json.hasOwnProperty("edges")) {
    let nEdges = json.edges.length;
    if ((nEdges = nNode * nNode)) hasEdges = true;
    else console.log("Expected %d edges not %d", nNode * nNode, nEdges);
  }
  //draw all nodes
  let vtx = [];
  let rgba255 = [];
  let lut = this.colormap(json.nodeColormap);
  let lutNeg = this.colormap(json.nodeColormapNegative);
  let hasNeg = json.hasOwnProperty("nodeColormapNegative");
  let min = json.nodeMinColor;
  let max = json.nodeMaxColor;
  for (let i = 0; i < nNode; i++) {
    let radius = json.nodes.Size[i] * json.nodeScale;
    if (radius <= 0.0) continue;
    let color = json.nodes.Color[i];
    let isNeg = false;
    if (hasNeg && color < 0) {
      isNeg = true;
      color = -color;
    }
    if (min < max) {
      if (color < min) continue;
      color = (color - min) / (max - min);
    } else color = 1.0;
    color = Math.round(Math.max(Math.min(255, color * 255)), 1) * 4;
    let rgba = [lut[color], lut[color + 1], lut[color + 2], 255];
    if (isNeg)
      rgba = [lutNeg[color], lutNeg[color + 1], lutNeg[color + 2], 255];
    let pt = [json.nodes.X[i], json.nodes.Y[i], json.nodes.Z[i]];
    NiivueObject3D.makeColoredSphere(vtx, tris, rgba255, radius, pt, rgba);
  }
  //draw all edges
  if (hasEdges) {
    lut = this.colormap(json.edgeColormap);
    lutNeg = this.colormap(json.edgeColormapNegative);
    hasNeg = json.hasOwnProperty("edgeColormapNegative");
    min = json.edgeMin;
    max = json.edgeMax;
    for (let i = 0; i < nNode - 1; i++) {
      for (let j = i + 1; j < nNode; j++) {
        let color = json.edges[i * nNode + j];
        let isNeg = false;
        if (hasNeg && color < 0) {
          isNeg = true;
          color = -color;
        }
        let radius = color * json.edgeScale;
        if (radius <= 0) continue;
        if (min < max) {
          if (color < min) continue;
          color = (color - min) / (max - min);
        } else color = 1.0;
        color = Math.round(Math.max(Math.min(255, color * 255)), 1) * 4;
        let rgba = [lut[color], lut[color + 1], lut[color + 2], 255];
        if (isNeg)
          rgba = [lutNeg[color], lutNeg[color + 1], lutNeg[color + 2], 255];

        let pti = [json.nodes.X[i], json.nodes.Y[i], json.nodes.Z[i]];
        let ptj = [json.nodes.X[j], json.nodes.Y[j], json.nodes.Z[j]];
        NiivueObject3D.makeColoredCylinder(
          vtx,
          tris,
          rgba255,
          pti,
          ptj,
          radius,
          rgba
        );
      } //for j
    } //for i
  } //hasEdges
  let gix = []; //???? we do not want "gii", e.g. if we load mz3, obj ply
  let posNormClr = this.generatePosNormClr(vtx, tris, rgba255);
  if (posNormClr) {
    nvmesh = new NVMesh(posNormClr, tris, name, colorMap, opacity, visible, gl);
  } else {
    alert("Unable to load buffer properly from mesh");
  }
  return nvmesh;
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
NVMesh.loadFromUrl = async function ({
  url = "",
  gl = null,
  name = "",
  colorMap = "yellow",
  opacity = 1.0,
  rgba255 = [255, 255, 255, 255],
  visible = true,
} = {}) {
  if (url === "") throw Error("url must not be empty");
  if (gl === null) throw Error("gl context is null");
  let response = await fetch(url);
  let nvmesh = null;
  if (!response.ok) throw Error(response.statusText);
  let urlParts = url.split("/"); // split url parts at slash
  name = urlParts.slice(-1)[0]; // name will be last part of url (e.g. some/url/image.nii.gz --> image.nii.gz)
  let tris = [];
  var pts = [];
  var re = /(?:\.([^.]+))?$/;
  let ext = re.exec(name)[1];
  if (ext.toUpperCase() === "TCK") {
    let buffer = await response.arrayBuffer();
    let obj = this.readTCK(buffer);
    let offsetPt0 = new Int32Array(obj.offsetPt0.slice());
    let pts = new Float32Array(obj.pts.slice());
    nvmesh = new NVMesh(pts, offsetPt0, "*", colorMap, opacity, visible, gl);
    return nvmesh;
  } else if (ext.toUpperCase() === "TRK") {
    let buffer = await response.arrayBuffer();
    let obj = this.readTRK(buffer);
    let offsetPt0 = new Int32Array(obj.offsetPt0.slice());
    let pts = new Float32Array(obj.pts.slice());
    nvmesh = new NVMesh(pts, offsetPt0, "*", colorMap, opacity, visible, gl);
    return nvmesh;
  } else if (ext.toUpperCase() === "GII") {
    //GIFTI
    let xmlStr = await response.text();
    let gii = gifti.parse(xmlStr);
    pts = gii.getPointsDataArray().getData();
    tris = gii.getTrianglesDataArray().getData();
  } else {
    let buffer = await response.arrayBuffer();
    let obj = [];
    if (ext.toUpperCase() === "MZ3") obj = this.readMZ3(buffer);
    else if (ext.toUpperCase() === "OBJ") obj = this.readOBJ(buffer);
    else if (ext.toUpperCase() === "VTK") obj = this.readVTK(buffer);
    else if (ext.toUpperCase() === "STL") obj = this.readSTL(buffer);
    //unknown file extension, try freeSurfer as hail mary
    else obj = this.readFreeSurfer(buffer);
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
      } //for i: each vertex
    } //obj includes colors
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
  let posNormClr = this.generatePosNormClr(pts, tris, rgba255);
  if (posNormClr) {
    nvmesh = new NVMesh(posNormClr, tris, name, colorMap, opacity, visible, gl);
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
