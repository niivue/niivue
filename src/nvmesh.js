import * as gifti from "gifti-reader-js/release/current/gifti-reader";
import { v4 as uuidv4 } from "uuid";
import * as cmaps from "./cmaps";
import { Log } from "./logger";
import * as mat from "gl-matrix";
const log = new Log();

/**
 * @class NVMesh
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
  visible = true,
) {
  this.name = name;
  this.id = uuidv4();
  this.colorMap = colorMap;
  this.opacity = opacity > 1.0 ? 1.0 : opacity; //make sure opacity can't be initialized greater than 1 see: #107 and #117 on github
  this.visible = visible;

  // Added to support zerosLike
  if (!data) {
    return;
  }
  this.gii = gifti.parse(data);
}
  
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
    var p1 = [], p2 = [], p3 = [], normal = [], nn = [], ctr,
        normalsDataLength = pts.length, numIndices,
        qx, qy, qz, px, py, pz, index1, index2, index3;

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

        normal[0] = (py * qz) - (pz * qy);
        normal[1] = (pz * qx) - (px * qz);
        normal[2] = (px * qy) - (py * qx);

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
        let len = normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2];
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
};

NVMesh.generatePosNormClr = function (pts, tris, rgba255) {
//function generatePosNormClr(pts) {
  if (pts.length < 3) {
    console.log('Catastrophic failure generatePosNormClr()')
  }
  let norms = generateNormals(pts, tris)
  //typecast 32-bit UINT8 RGBA as a 32-bit float!
  //let rgba255 = [255,0,0,255];
  var f32rgba = new Float32Array(1);
  const u32rgba = new Uint32Array(f32rgba.buffer);
  u32rgba[0] =  rgba255[0] + (rgba255[1] << 8) + (rgba255[2] << 16) +  (rgba255[3] << 24);
  //

  let npt = pts.length / 3
  var f32 = new Float32Array(npt * 7); //Each vertex has 7 components: PositionXYZ, NormalXYZ, RGBA32
  let p = 0 //position
  let j = 0
  for (let i = 0; i < npt; i++) {
    f32[j+0] = pts[p+0]
    f32[j+1] = pts[p+1]
    f32[j+2] = pts[p+2]
    f32[j+3] = norms[p+0]
    f32[j+4] = norms[p+1]
    f32[j+5] = norms[p+2]
    f32[j+6] = f32rgba[0]
    p += 3; //read 3 input components: XYZ
    j += 7; //write 7 output components: 3*Position, 3*Normal, 1*RGBA
  }
  return f32
}

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
  rgba255 = [192,0,192,255],
  visible = true
) {
  let response = await fetch(url);

  let nvmesh = null;

  if (!response.ok) {
    throw Error(response.statusText);
  }

  let urlParts = url.split("/"); // split url parts at slash
  name = urlParts.slice(-1)[0]; // name will be last part of url (e.g. some/url/image.nii.gz --> image.nii.gz)

  let xmlStr = await response.text();
  let gii = gifti.parse(xmlStr)

  var pts = gii.getPointsDataArray().getData();
  let npt = pts.length / 3
  let tris = gii.getTrianglesDataArray().getData();
  let ntri = tris.length / 3
  if ((ntri < 1) || (npt < 3)) {
      alert('GIfTI mesh should have at least one triangle and three vertices');
      return;
  }
  console.log('npts ', npt, ' ntri ', ntri)
  if (tris.constructor !== Int32Array) {
    alert("Expected triangle indices to be of type INT32");
  }
  let posNormClr = this.generatePosNormClr(pts, tris, rgba255);
  if (posNormClr) {
    nvmesh = new NVMesh(
      gii,
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

