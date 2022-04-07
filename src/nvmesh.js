import * as gifti from "gifti-reader-js/release/current/gifti-reader";
import * as pako from "pako";
import * as JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import * as cmaps from "./cmaps";
import { Log } from "./logger";
import { NiivueObject3D } from "./niivue-object3D.js"; //n.b. used by connectome
import { mat4, vec3 } from "gl-matrix";
import { colortables } from "./colortables";
const cmapper = new colortables();
const log = new Log();

/**
 * @class NVMesh
 * @type NVMesh
 * @description
 * a NVImage encapsulates some images data and provides methods to query and operate on images
 * @constructor
 * @param {array} dataBuffer an array buffer of image data to load (there are also methods that abstract this more. See loadFromUrl, and loadFromFile)
 * @param {string} [name=''] a name for this image. Default is an empty string
 * @param {number} [opacity=1.0] the opacity for this image. default is 1
 * @param {boolean} [trustCalMinMax=true] whether or not to trust cal_min and cal_max from the nifti header (trusting results in faster loading)
 * @param {number} [percentileFrac=0.02] the percentile to use for setting the robust range of the display values (smart intensity setting for images with large ranges)
 * @param {boolean} [ignoreZeroVoxels=false] whether or not to ignore zero voxels in setting the robust range of display values
 * @param {boolean} [visible=true] whether or not this image is to be visible
 */
export function NVMesh(
  pts,
  tris,
  name = "",
  rgba255 = [1, 0, 0, 0],
  opacity = 1.0,
  visible = true,
  gl,
  connectome = null
) {
  this.name = name;
  this.id = uuidv4();
  this.furthestVertexFromOrigin = getFurthestVertexFromOrigin(pts);
  this.opacity = opacity > 1.0 ? 1.0 : opacity; //make sure opacity can't be initialized greater than 1 see: #107 and #117 on github
  this.visible = visible;
  this.indexBuffer = gl.createBuffer();
  this.vertexBuffer = gl.createBuffer();
  this.vao = gl.createVertexArray();
  this.offsetPt0 = null;
  this.hasConnectome = false;
  this.pts = pts;
  this.layers = [];
  if (!rgba255) {
    this.fiberLength = 2;
    this.fiberDither = 0.1;
    this.offsetPt0 = tris;
    this.updateFibers(gl);
    //define VAO
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
  } //if fiber not mesh
  if (connectome) {
    this.hasConnectome = true;
    var keysArray = Object.keys(connectome);
    for (var i = 0, len = keysArray.length; i < len; i++) {
      this[keysArray[i]] = connectome[keysArray[i]];
    }
  }
  this.rgba255 = rgba255;
  this.tris = tris;
  this.updateMesh(gl);
  //the VAO binds the vertices and indices as well as describing the vertex layout
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
}

NVMesh.prototype.updateFibers = function (gl) {
  if (!this.offsetPt0 || !this.fiberLength) return;
  //VERTICES:
  let pts = this.pts;
  let offsetPt0 = this.offsetPt0;
  let n_count = offsetPt0.length - 1;
  let npt = pts.length / 3; //each point has three components: X,Y,Z
  //only once: compute length of each streamline
  if (!this.fiberLengths) {
    this.fiberLengths = [];
    for (let i = 0; i < n_count; i++) {
      //for each streamline
      let vStart3 = offsetPt0[i] * 3; //first vertex in streamline
      let vEnd3 = (offsetPt0[i + 1] - 1) * 3; //last vertex in streamline
      let len = 0;
      for (let j = vStart3; j < vEnd3; j += 3) {
        let v = vec3.fromValues(
          pts[j + 0] - pts[j + 3],
          pts[j + 1] - pts[j + 4],
          pts[j + 2] - pts[j + 5]
        );
        len += vec3.len(v);
      }
      this.fiberLengths.push(len);
    }
  } //only once: compute length of each streamline
  //determine fiber colors
  //Each streamline vertex has color and position attributes
  //Interleaved Vertex Data https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/TechniquesforWorkingwithVertexData/TechniquesforWorkingwithVertexData.html
  var posClrF32 = new Float32Array(npt * 4); //four 32-bit components X,Y,Z,C
  var posClrU32 = new Uint32Array(posClrF32.buffer); //typecast of our X,Y,Z,C array
  //fill XYZ position of XYZC array
  let i3 = 0;
  let i4 = 0;
  for (let i = 0; i < npt; i++) {
    posClrF32[i4 + 0] = pts[i3 + 0];
    posClrF32[i4 + 1] = pts[i3 + 1];
    posClrF32[i4 + 2] = pts[i3 + 2];
    i3 += 3;
    i4 += 4;
  }
  //fill fiber Color
  let dither = this.fiberDither;
  let ditherHalf = dither * 0.5;
  let r = 0.0;
  for (let i = 0; i < n_count; i++) {
    let vStart = offsetPt0[i]; //first vertex in streamline
    let vEnd = offsetPt0[i + 1] - 1; //last vertex in streamline
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
    for (let j = vStart4; j <= vEnd4; j += 4) posClrU32[j] = RBGA;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint32Array(posClrU32), gl.STATIC_DRAW);
  //INDICES:
  let min_mm = this.fiberLength;
  //  https://blog.spacepatroldelta.com/a?ID=00950-d878555f-a97a-4e32-9f40-fd9a449cb4fe
  let primitiveRestart = Math.pow(2, 32) - 1; //for gl.UNSIGNED_INT
  let indices = [];
  for (let i = 0; i < n_count; i++) {
    //let n_pts = offsetPt0[i + 1] - offsetPt0[i]; //if streamline0 starts at point 0 and streamline1 at point 4, then streamline0 has 4 points: 0,1,2,3
    if (this.fiberLengths[i] < min_mm) continue;
    for (let j = offsetPt0[i]; j < offsetPt0[i + 1]; j++) indices.push(j);
    indices.push(primitiveRestart);
  }
  this.indexCount = indices.length;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  //glBufferData creates a new data store for the buffer object currently bound to target​. Any pre-existing data store is deleted.
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(indices),
    gl.STATIC_DRAW
  );
};

NVMesh.prototype.updateConnectome = function (gl) {
  //draw nodes
  let json = this;
  //draw nodes
  let tris = [];
  let nNode = json.nodes.X.length;
  let hasEdges = false;
  if (nNode > 1 && json.hasOwnProperty("edges")) {
    let nEdges = json.edges.length;
    if ((nEdges = nNode * nNode)) hasEdges = true;
    else console.log("Expected %d edges not %d", nNode * nNode, nEdges);
  }
  //draw all nodes
  let pts = [];
  let rgba255 = [];
  let lut = cmapper.colormap(json.nodeColormap);
  let lutNeg = cmapper.colormap(json.nodeColormapNegative);
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
    NiivueObject3D.makeColoredSphere(pts, tris, rgba255, radius, pt, rgba);
  }
  //draw all edges
  if (hasEdges) {
    lut = cmapper.colormap(json.edgeColormap);
    lutNeg = cmapper.colormap(json.edgeColormapNegative);
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
          pts,
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
  let posNormClr = this.generatePosNormClr(pts, tris, rgba255);
  //generate webGL buffers and vao
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(tris), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posNormClr), gl.STATIC_DRAW);
  this.indexCount = tris.length;
};

NVMesh.prototype.updateMesh = function (gl) {
  if (this.offsetPt0) {
    this.updateFibers(gl);
    return; //fiber not mesh
  }
  if (this.hasConnectome) {
    this.updateConnectome(gl);
    return; //connectome not mesh
  }
  if (!this.pts || !this.tris || !this.rgba255) {
    console.log("underspecified mesh");
    return;
  }
  console.log("Points " + this.pts.length + " Indices " + this.tris.length);
  let posNormClr = this.generatePosNormClr(this.pts, this.tris, this.rgba255);
  if (this.layers && this.layers.length > 0) {
    for (let i = 0; i < this.layers.length; i++) {
      let layer = this.layers[i];
      if (layer.opacity <= 0.0 || layer.cal_min >= layer.cal_max) continue;
      let opacity = layer.opacity;
      var u8 = new Uint8Array(posNormClr.buffer); //Each vertex has 7 components: PositionXYZ, NormalXYZ, RGBA32
      function lerp(x, y, a) {
        //https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/mix.xhtml
        return x * (1 - a) + y * a;
      }
      if (layer.values.constructor === Uint32Array) {
        //isRGBA!
        let rgba8 = new Uint8Array(layer.values.buffer);
        let k = 0;
        for (let j = 0; j < layer.values.length; j++) {
          let vtx = j * 28 + 24; //posNormClr is 28 bytes stride, RGBA color at offset 24,
          u8[vtx + 0] = lerp(u8[vtx + 0], rgba8[k + 0], opacity);
          u8[vtx + 1] = lerp(u8[vtx + 1], rgba8[k + 1], opacity);
          u8[vtx + 2] = lerp(u8[vtx + 2], rgba8[k + 2], opacity);
          k += 4;
        }
        continue;
      }
      let lut = cmapper.colormap(layer.colorMap);
      let frame = Math.min(Math.max(layer.frame4D, 0), layer.nFrame4D - 1);
      let nvtx = this.pts.length / 3;
      let frameOffset = nvtx * frame;
      let scale255 = 255.0 / (layer.cal_max - layer.cal_min);
      //blend colors for each voxel
      let k = 0;
      for (let j = 0; j < nvtx; j++) {
        let v255 = Math.round(
          (layer.values[j + frameOffset] - layer.cal_min) * scale255
        );
        if (v255 < 0) continue;
        v255 = Math.min(255.0, v255) * 4;
        let vtx = j * 28 + 24; //posNormClr is 28 bytes stride, RGBA color at offset 24,
        u8[vtx + 0] = lerp(u8[vtx + 0], lut[v255 + 0], opacity);
        u8[vtx + 1] = lerp(u8[vtx + 1], lut[v255 + 1], opacity);
        u8[vtx + 2] = lerp(u8[vtx + 2], lut[v255 + 2], opacity);
      }
    }
  }
  //generate webGL buffers and vao
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Int32Array(this.tris),
    gl.STATIC_DRAW
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posNormClr), gl.STATIC_DRAW);
  this.indexCount = this.tris.length;
  this.vertexCount = this.pts.length;
};

NVMesh.prototype.setLayerProperty = function (id, key, val, gl) {
  let layer = this.layers[id];
  if (!layer.hasOwnProperty(key)) {
    console.log("mesh does not have property ", key, layer);
    return;
  }
  layer[key] = val;
  this.updateMesh(gl); //apply the new properties...
};
NVMesh.prototype.setProperty = function (key, val, gl) {
  if (!this.hasOwnProperty(key)) {
    console.log("mesh does not have property ", key, this);
    return;
  }
  this[key] = val;
  //console.log(this);
  this.updateMesh(gl); //apply the new properties...
};

function getFurthestVertexFromOrigin(pts) {
  //each vertex has 3 coordinates: XYZ
  let mxDx = 0.0;
  for (let i = 0; i < pts.length; i += 3) {
    let v = vec3.fromValues(pts[i], pts[i + 1], pts[i + 2]);
    mxDx = Math.max(mxDx, vec3.len(v));
  }
  return mxDx;
}

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

NVMesh.prototype.generatePosNormClr = function (pts, tris, rgba255) {
  //Each streamline vertex has color, normal and position attributes
  //Interleaved Vertex Data https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/TechniquesforWorkingwithVertexData/TechniquesforWorkingwithVertexData.html
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

//ToDo: readTRX
// https://stackoverflow.com/questions/32633585/how-do-you-convert-to-half-floats-in-javascript
NVMesh.readTRX = function (buf) {
  console.log("OK", buf); //buffer.byteLength
  //var zip = new AdmZip.ZipFile(buf);
  /*
  for (var i = 0; i < zipEntries.length; i++) {
      if (zipEntries[i].entryName.match(/readme/))
        console.log(zip.readAsText(zipEntries[i]));
  }*/
};

NVMesh.readTRK = function (buffer) {
  // http://trackvis.org/docs/?subsect=fileformat
  // http://www.tractometer.org/fiberweb/
  // https://github.com/xtk/X/tree/master/io
  // in practice, always little endian
  var reader = new DataView(buffer);
  var magic = reader.getUint32(0, true); //'TRAC'
  if (magic !== 1128354388) {
    //e.g. TRK.gz
    var raw;
    if (typeof pako === "object" && typeof pako.deflate === "function") {
      raw = pako.inflate(new Uint8Array(buffer));
    } else if (typeof Zlib === "object" && typeof Zlib.Gunzip === "function") {
      var inflate = new Zlib.Gunzip(new Uint8Array(buffer)); // eslint-disable-line no-undef
      raw = inflate.decompress();
    }
    buffer = raw.buffer;
    reader = new DataView(buffer);
    magic = reader.getUint32(0, true); //'TRAC'
  }
  var vers = reader.getUint32(992, true); //2
  var hdr_sz = reader.getUint32(996, true); //1000

  if (vers > 2 || hdr_sz !== 1000 || magic !== 1128354388)
    throw new Error("Not a valid TRK file");
  var n_scalars = reader.getInt16(36, true);
  let scalar_names = [];
  if (n_scalars > 0) {
    for (let i = 0; i < n_scalars; i++) {
      let arr = new Uint8Array(buffer.slice(38 + i * 20, 58 + i * 20));
      var str = new TextDecoder().decode(arr).split("\0").shift();
      scalar_names.push(str.trim()); //trim: https://github.com/johncolby/along-tract-stats
    }
  }
  //console.log('scalar_names',scalar_names);
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
  let property_names = [];
  if (n_properties > 0) {
    for (let i = 0; i < n_properties; i++) {
      let arr = new Uint8Array(buffer.slice(240 + i * 20, 260 + i * 20));
      var str = new TextDecoder().decode(arr).split("\0").shift();
      property_names.push(str.trim());
    }
  }
  //console.log('property_names',property_names);
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
  i32 = new Int32Array(buffer.slice(hdr_sz));
  f32 = new Float32Array(i32.buffer);

  let ntracks = i32.length;
  //read and transform vertex positions
  let i = 0;
  let npt = 0;
  let offsetPt0 = [];
  let pts = [];
  let scalars = [];
  let properties = [];
  while (i < ntracks) {
    let n_pts = i32[i];
    i = i + 1; // read 1 32-bit integer for number of points in this streamline
    offsetPt0.push(npt); //index of first vertex in this streamline
    for (let j = 0; j < n_pts; j++) {
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
      if (n_scalars > 0) {
        for (let s = 0; s < n_scalars; s++) {
          scalars.push(f32[i]);
          i++;
        }
      }
      npt++;
    } // for j: each point in streamline
    if (n_properties > 0) {
      for (let j = 0; j < n_properties; j++) {
        properties.push(f32[i]);
        i++;
      }
    }
  } //for each streamline: while i < n_count
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

NVMesh.readSTC = function (buffer, n_vert) {
  //mne STC format
  //https://github.com/mne-tools/mne-python/blob/main/mne/source_estimate.py#L211-L365
  //https://github.com/fahsuanlin/fhlin_toolbox/blob/400cb73cda4880d9ad7841d9dd68e4e9762976bf/codes/inverse_read_stc.m
  let len = buffer.byteLength;
  var reader = new DataView(buffer);
  //first 12 bytes are header
  let epoch_begin_latency = reader.getFloat32(0, false);
  let sample_period = reader.getFloat32(4, false);
  let n_vertex = reader.getInt32(8, false);
  if (n_vertex !== n_vert) {
    console.log("Overlay has " + n_vertex + " vertices, expected " + n_vert);
    return;
  }
  //next 4*n_vertex bytes are vertex IDS
  let pos = 12 + n_vertex * 4;
  //next 4 bytes reports number of volumes/time points
  let n_time = reader.getUint32(pos, false);
  pos += 4;
  let f32 = new Float32Array(n_time * n_vertex);
  //reading all floats with .slice() would be faster, but lets handle endian-ness
  for (let i = 0; i < n_time * n_vertex; i++) {
    f32[i] = reader.getFloat32(pos, false);
    pos += 4;
  }
  return f32;
  //this.vertexCount = this.pts.length;
}; // readSTC()

NVMesh.readCURV = function (buffer, n_vert) {
  //simple format used by Freesurfer  BIG-ENDIAN
  // https://github.com/bonilhamusclab/MRIcroS/blob/master/%2BfileUtils/%2Bpial/readPial.m
  // http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm
  const view = new DataView(buffer); //ArrayBuffer to dataview
  //ALWAYS big endian
  let sig0 = view.getUint8(0);
  let sig1 = view.getUint8(1);
  let sig2 = view.getUint8(2);
  let n_vertex = view.getUint32(3, false);
  let num_f = view.getUint32(7, false);
  let n_time = view.getUint32(11, false);
  if (sig0 !== 255 || sig1 !== 255 || sig2 !== 255)
    log.debug(
      "Unable to recognize file type: does not appear to be FreeSurfer format."
    );
  if (n_vert !== n_vertex) {
    console.log("CURV file has different number of vertices than mesh");
    return;
  }
  if (buffer.byteLength < 15 + 4 * n_vertex * n_time) {
    console.log("CURV file smaller than specified");
    return;
  }
  let f32 = new Float32Array(n_time * n_vertex);
  let pos = 15;
  //reading all floats with .slice() would be faster, but lets handle endian-ness
  for (let i = 0; i < n_time * n_vertex; i++) {
    f32[i] = view.getFloat32(pos, false);
    pos += 4;
  }
  let mn = f32[0];
  let mx = f32[0];
  for (var i = 0; i < f32.length; i++) {
    mn = Math.min(mn, f32[i]);
    mx = Math.max(mx, f32[i]);
  }
  //normalize and invert then sqrt
  let scale = 1.0 / (mx - mn);
  for (var i = 0; i < f32.length; i++)
    f32[i] = Math.sqrt(1.0 - (f32[i] - mn) * scale);
  return f32;
}; // readCURV()

NVMesh.readANNOT = function (buffer, n_vert) {
  //freesurfer Annotation file provides vertex colors
  //  https://surfer.nmr.mgh.harvard.edu/fswiki/LabelsClutsAnnotationFiles
  const view = new DataView(buffer); //ArrayBuffer to dataview
  //ALWAYS big endian
  let n_vertex = view.getUint32(0, false);
  if (n_vert !== n_vertex) {
    console.log("ANNOT file has different number of vertices than mesh");
    return;
  }
  if (buffer.byteLength < 4 + 8 * n_vertex) {
    console.log("ANNOT file smaller than specified");
    return;
  }
  let pos = 4;
  //reading all floats with .slice() would be faster, but lets handle endian-ness
  let rgba32 = new Uint32Array(n_vertex);
  for (let i = 0; i < n_vertex; i++) {
    let idx = view.getUint32(pos, false);
    pos += 4;
    rgba32[idx] = view.getUint32(pos, false);
    pos += 4;
  }
  return rgba32;
}; // readANNOT()

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
  line = readStr(); //Type, "LINES 11885 "
  items = line.split(" ");
  let tris = [];
  if (items[0].includes("LINES")) {
    //tractogaphy data
    console.log("boingo", line);
    let n_count = parseInt(items[1]);
    let npt = 0;
    let offsetPt0 = [];
    let pts = [];
    offsetPt0.push(npt); //1st streamline starts at 0
    offsetPt0 = [];
    for (let c = 0; c < n_count; c++) {
      let numPoints = reader.getInt32(pos, false);
      pos += 4;
      npt += numPoints;
      offsetPt0.push(npt);
      for (let i = 0; i < numPoints; i++) {
        let idx = reader.getInt32(pos, false) * 3;
        pos += 4;
        pts.push(positions[idx + 0]);
        pts.push(positions[idx + 1]);
        pts.push(positions[idx + 2]);
      } //for numPoints: number of segments in streamline
    } //for n_count: number of streamlines
    return {
      pts,
      offsetPt0,
    };
  } else if (items[0].includes("TRIANGLE_STRIPS")) {
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

NVMesh.readMZ3 = function (buffer, n_vert = 0) {
  //ToDo: mz3 always little endian: support big endian? endian https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array
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
    reader = new DataView(raw.buffer);
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
  if (nvert < 3) throw new Error("Not a mesh MZ3 file (maybe scalar)");
  if (n_vert > 0 && n_vert !== nvert) {
    console.log(
      "Layer has " + nvert + "vertices, but background mesh has " + n_vert
    );
  }
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
  let scalars = [];
  if (!isRGBA && isSCALAR) {
    let nFrame4D = Math.floor((_buffer.byteLength - filepos) / 4 / nvert);
    if (nFrame4D < 1) {
      console.log("MZ3 corrupted");
      return;
    }
    scalars = new Float32Array(_buffer, filepos, nFrame4D * nvert);
    filepos += nvert * 4;
  }
  if (n_vert > 0) return scalars;
  return {
    positions,
    indices,
    scalars,
    colors,
  };
}; // readMZ3()

NVMesh.readLayer = function (
  name,
  buffer,
  nvmesh,
  opacity = 0.5,
  colorMap = "rocket"
) {
  let layer = [];
  let n_vert = nvmesh.vertexCount / 3; //each vertex has XYZ component
  if (n_vert < 3) return;
  var re = /(?:\.([^.]+))?$/;
  let ext = re.exec(name)[1];
  ext = ext.toUpperCase();
  if (ext === "GZ") {
    ext = re.exec(name.slice(0, -3))[1]; //img.trk.gz -> img.trk
    ext = ext.toUpperCase();
  }
  //console.log(name, ":", n_vert, ">>>", buffer);
  if (ext === "MZ3") layer.values = this.readMZ3(buffer, n_vert);
  else if (ext === "ANNOT") layer.values = this.readANNOT(buffer, n_vert);
  else if (ext === "CRV" || ext === "CURV")
    layer.values = this.readCURV(buffer, n_vert);
  else if (ext === "GII") layer.values = this.readGII(buffer, n_vert);
  else if (ext === "STC") layer.values = this.readSTC(buffer, n_vert);
  else {
    console.log("Unknown layer overlay format " + name);
    return;
  }
  if (!layer.values) return;
  layer.nFrame4D = layer.values.length / n_vert;
  layer.frame4D = 0;
  //determine global min..max
  let mn = layer.values[0];
  let mx = layer.values[0];
  for (var i = 0; i < layer.values.length; i++) {
    mn = Math.min(mn, layer.values[i]);
    mx = Math.max(mx, layer.values[i]);
  }
  layer.global_min = mn;
  layer.global_max = mx;
  layer.cal_min = mn;
  layer.cal_max = mx;
  layer.opacity = opacity;
  layer.colorMap = colorMap;
  nvmesh.layers.push(layer);
};

NVMesh.readOFF = function (buffer) {
  //https://en.wikipedia.org/wiki/OFF_(file_format)
  var enc = new TextDecoder("utf-8");
  var txt = enc.decode(buffer);
  //let txt = await response.text();
  var lines = txt.split("\n");
  var n = lines.length;
  let pts = [];
  let t = [];
  let i = 0;
  if (!lines[i].startsWith("OFF")) {
    console.log("File does not start with OFF");
  } else i++;
  let items = lines[i].split(" ");
  let num_v = parseInt(items[0]);
  let num_f = parseInt(items[1]);
  i++;
  for (let j = 0; j < num_v; j++) {
    let str = lines[i];
    items = str.split(" ");
    pts.push(parseFloat(items[0]));
    pts.push(parseFloat(items[1]));
    pts.push(parseFloat(items[2]));
    i++;
  }
  for (let j = 0; j < num_f; j++) {
    let str = lines[i];
    items = str.split(" ");
    let n = parseInt(items[0]);
    if (n !== 3)
      console.log("Only able to read OFF files with triangular meshes");
    t.push(parseInt(items[1]));
    t.push(parseInt(items[2]));
    t.push(parseInt(items[3]));
    i++;
  }
  var positions = new Float32Array(pts);
  var indices = new Int32Array(t);
  return {
    positions,
    indices,
  };
}; // readOFF()

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
}; // readOBJ()

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
}; // readSTL()

NVMesh.readGII = function (buffer, n_vert = 0) {
  var enc = new TextDecoder("utf-8");
  var xmlStr = enc.decode(buffer);
  let gii = gifti.parse(xmlStr);
  if (n_vert > 0) {
    //add as overlay layer
    if (gii.dataArrays.length < 0) {
      console.log("Not a valid GIfTI overlay");
    }
    let scalars = [];
    for (var i = 0; i < gii.dataArrays.length; i++) {
      let layer = gii.dataArrays[i];
      if (n_vert !== layer.getNumElements()) {
        console.log(
          "Number of vertices of overlay layer does not match mesh " +
            n_vert +
            " vs " +
            getNumElements()
        );
        return;
      }
      if (layer.isColors()) console.log("TODO: check color mesh layers");
      let scalarsI = new Float32Array(layer.getData());
      scalars.push(...scalarsI);
    }
    //console.log('::::',scalars);
    return scalars;
  }
  if (gii.getNumTriangles() === 0 || gii.getNumPoints() === 0) {
    console.log("Not a GIfTI mesh (perhaps an overlay layer)");
    return;
  }
  var positions = gii.getPointsDataArray().getData();
  var indices = gii.getTrianglesDataArray().getData();
  //next: ColumnMajorOrder https://github.com/rii-mango/GIFTI-Reader-JS/issues/2
  if (
    gii.getPointsDataArray().attributes.ArrayIndexingOrder ===
    "ColumnMajorOrder"
  ) {
    //transpose points, xx..xyy..yzz..z -> xyzxyz..
    let ps = positions.slice();
    let np = ps.length / 3;
    let j = 0;
    for (var p = 0; p < np; p++)
      for (var i = 0; i < 3; i++) {
        positions[j] = ps[i * np + p];
        j++;
      }
  }
  if (
    gii.getTrianglesDataArray().attributes.ArrayIndexingOrder ===
    "ColumnMajorOrder"
  ) {
    //transpose indices, xx..xyy..yzz..z -> xyzxyz..
    let ps = indices.slice();
    let np = ps.length / 3;
    let j = 0;
    for (var p = 0; p < np; p++)
      for (var i = 0; i < 3; i++) {
        indices[j] = ps[i * np + p];
        j++;
      }
  }
  return {
    positions,
    indices,
  };
}; // readGII()

NVMesh.loadConnectomeFromJSON = async function (
  json,
  gl,
  name = "",
  colorMap = "",
  opacity = 1.0,
  visible = true
) {
  if (json.hasOwnProperty("name")) name = json.name;
  return new NVMesh([], [], name, [], opacity, visible, gl, json);
}; //loadConnectomeFromJSON()

NVMesh.readMesh = function (
  buffer,
  name,
  gl,
  opacity = 1.0,
  rgba255 = [255, 255, 255, 255],
  visible = true
) {
  let nvmesh = null;
  let tris = [];
  let pts = [];
  let obj = [];
  var re = /(?:\.([^.]+))?$/;
  let ext = re.exec(name)[1];
  ext = ext.toUpperCase();
  if (ext === "GZ") {
    ext = re.exec(name.slice(0, -3))[1]; //img.trk.gz -> img.trk
    ext = ext.toUpperCase();
  }
  if (ext === "TCK" || ext === "TRK" || ext === "TRX") {
    if (ext === "TCK") obj = this.readTCK(buffer);
    else if (ext === "TRX") obj = this.readTRX(buffer);
    else obj = this.readTRK(buffer);
    let offsetPt0 = new Int32Array(obj.offsetPt0.slice());
    let pts = new Float32Array(obj.pts.slice());
    return new NVMesh(
      pts,
      offsetPt0,
      name,
      null, //colorMap,
      opacity, //opacity,
      visible, //visible,
      gl
    );
  } //is fibers
  if (ext === "GII") obj = this.readGII(buffer);
  else if (ext === "MZ3") obj = this.readMZ3(buffer);
  else if (ext === "OFF") obj = this.readOFF(buffer);
  else if (ext === "OBJ") obj = this.readOBJ(buffer);
  else if (ext === "FIB" || ext === "VTK") {
    obj = this.readVTK(buffer);
    if (obj.hasOwnProperty("offsetPt0")) {
      //VTK files used both for meshes and streamlines
      let offsetPt0 = new Int32Array(obj.offsetPt0.slice());
      let pts = new Float32Array(obj.pts.slice());
      return new NVMesh(
        pts,
        offsetPt0,
        name,
        null, //colorMap,
        opacity, //opacity,
        visible, //visible,
        gl
      );
    } //if streamlines, not mesh
  } else if (ext === "STL") obj = this.readSTL(buffer);
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
  let npt = pts.length / 3;
  let ntri = tris.length / 3;
  if (ntri < 1 || npt < 3) {
    alert("Mesh should have at least one triangle and three vertices");
    return;
  }
  if (tris.constructor !== Int32Array) {
    alert("Expected triangle indices to be of type INT32");
  }

  let nvm = new NVMesh(
    pts,
    tris,
    name,
    rgba255, //colorMap,
    opacity, //opacity,
    visible, //visible,
    gl
  );
  if (obj.hasOwnProperty("scalars") && obj.scalars.length > 0) {
    this.readLayer(name, buffer, nvm, opacity, "gray");
    nvm.updateMesh(gl);
  }
  console.log(nvm);
  return nvm;
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
  opacity = 1.0,
  rgba255 = [255, 255, 255, 255],
  visible = true,
  layers = [],
} = {}) {
  /*if (url.endsWith('trx')) { 
  console.log('URL', url);
  JSZip.loadAsync(url).then(function(zip) {
      for(let [filename, file] of Object.entries(zip.files)) {
          // TODO Your code goes here
          console.log(filename);
      }
  }).catch(function(err) {
      console.error("Failed to open", filename, " as ZIP file:", err);
  })
}*/
  if (url === "") throw Error("url must not be empty");
  if (gl === null) throw Error("gl context is null");
  let response = await fetch(url);
  if (!response.ok) throw Error(response.statusText);
  let urlParts = url.split("/"); // split url parts at slash
  name = urlParts.slice(-1)[0]; // name will be last part of url (e.g. some/url/image.nii.gz --> image.nii.gz)
  let tris = [];
  var pts = [];
  let buffer = await response.arrayBuffer();
  let nvmesh = this.readMesh(buffer, name, gl, opacity, rgba255, visible);
  if (!layers || layers.length < 1) return nvmesh;
  for (let i = 0; i < layers.length; i++) {
    response = await fetch(layers[i].url);
    if (!response.ok) throw Error(response.statusText);
    buffer = await response.arrayBuffer();
    urlParts = layers[i].url.split("/");
    let opacity = 0.5;
    if (layers[i].hasOwnProperty("opacity")) opacity = layers[i].opacity;
    let colorMap = "viridis";
    if (layers[i].hasOwnProperty("colorMap")) colorMap = layers[i].colorMap;
    this.readLayer(urlParts.slice(-1)[0], buffer, nvmesh, opacity, colorMap);
  }
  nvmesh.updateMesh(gl); //apply the new properties...
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
 * @param {number} [opacity=1.0] the opacity for this image. default is 1
 * @param {boolean} [trustCalMinMax=true] whether or not to trust cal_min and cal_max from the nifti header (trusting results in faster loading)
 * @param {number} [percentileFrac=0.02] the percentile to use for setting the robust range of the display values (smart intensity setting for images with large ranges)
 * @param {boolean} [ignoreZeroVoxels=false] whether or not to ignore zero voxels in setting the robust range of display values
 * @param {boolean} [visible=true] whether or not this image is to be visible
 * @returns {NVImage} returns a NVImage intance
 * @example
 * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
 */
NVMesh.loadFromFile = async function ({
  file,
  gl,
  name = "",
  opacity = 1.0,
  rgba255 = [255, 255, 255, 255],
  visible = true,
  layers = [],
} = {}) {
  let buffer = await this.readFileAsync(file);
  return this.readMesh(buffer, name, gl, opacity, rgba255, visible, layers);
};

String.prototype.getBytes = function () {
  //CR??? What does this do?
  let bytes = [];
  for (var i = 0; i < this.length; i++) {
    bytes.push(this.charCodeAt(i));
  }

  return bytes;
};