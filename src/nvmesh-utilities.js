import { vec3 } from 'gl-matrix'

/**
 * Utilities class for common mesh functions
 */
export class NVMeshUtilities {
  static getClusterBoundaryU8(u8, faces) {
    // assume all vertices are not near a border
    const border = new Array(u8.length).fill(false)
    const binary = new Array(u8.length).fill(false)
    for (let i = 0; i < u8.length; i++) {
      if (u8[i] > 0) {
        binary[i] = true
      }
    }
    const nTri = faces.length / 3
    let j = 0
    // interior: a triangle where all three vertices are the same color
    // else, all three vertices are on a border
    for (let i = 0; i < nTri; i++) {
      const v0 = faces[j]
      const v1 = faces[j + 1]
      const v2 = faces[j + 2]
      j += 3
      if (binary[v0] === binary[v1] && binary[v0] === binary[v2] && binary[v1] === binary[v2]) {
        continue
      }
      border[v0] = true
      border[v1] = true
      border[v2] = true
    }
    return border
  }

  static getClusterBoundary(rgba8, faces) {
    const rgba32 = new Uint32Array(rgba8.buffer)
    // assume all vertices are not near a border
    const border = new Array(rgba32.length).fill(false)
    const nTri = faces.length / 3
    let j = 0
    // interior: a triangle where all three vertices are the same color
    // else, all three vertices are on a border
    for (let i = 0; i < nTri; i++) {
      const v0 = faces[j]
      const v1 = faces[j + 1]
      const v2 = faces[j + 2]
      j += 3
      if (rgba32[v0] === rgba32[v1] && rgba32[v0] === rgba32[v2] && rgba32[v1] === rgba32[v2]) {
        continue
      }
      border[v0] = true
      border[v1] = true
      border[v2] = true
    }
    return border
  }

  // return spatial extremes for vertices
  static getExtents(pts) {
    if ((!ArrayBuffer.isView(pts) && !Array.isArray(pts)) || pts.length < 3) {
      return { mxDx: 0.0, extentsMin: 0.0, extentsMax: 0.0 }
    }

    // each vertex has 3 coordinates: XYZ
    let mxDx = 0.0
    const mn = vec3.fromValues(pts[0], pts[1], pts[2])
    const mx = vec3.fromValues(pts[0], pts[1], pts[2])
    for (let i = 0; i < pts.length; i += 3) {
      const v = vec3.fromValues(pts[i], pts[i + 1], pts[i + 2])
      mxDx = Math.max(mxDx, vec3.len(v))
      vec3.min(mn, mn, v)
      vec3.max(mx, mx, v)
    }
    const extentsMin = [mn[0], mn[1], mn[2]]
    const extentsMax = [mx[0], mx[1], mx[2]]
    return { mxDx, extentsMin, extentsMax }
  }

  // determine vector orthogonal to plane defined by triangle
  // triangle winding determines front/back face
  static generateNormals(pts, tris) {
    // from https://github.com/rii-mango/Papaya
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
    const p1 = []
    const p2 = []
    const p3 = []
    const normal = []
    // nn = [],
    let ctr
    const normalsDataLength = pts.length
    let qx
    let qy
    let qz
    let px
    let py
    let pz
    let index1
    let index2
    let index3

    const norms = new Float32Array(normalsDataLength)
    const numIndices = tris.length
    for (ctr = 0; ctr < numIndices; ctr += 3) {
      index1 = tris[ctr] * 3
      index2 = tris[ctr + 1] * 3
      index3 = tris[ctr + 2] * 3

      p1.x = pts[index1]
      p1.y = pts[index1 + 1]
      p1.z = pts[index1 + 2]

      p2.x = pts[index2]
      p2.y = pts[index2 + 1]
      p2.z = pts[index2 + 2]

      p3.x = pts[index3]
      p3.y = pts[index3 + 1]
      p3.z = pts[index3 + 2]

      qx = p2.x - p1.x
      qy = p2.y - p1.y
      qz = p2.z - p1.z
      px = p3.x - p1.x
      py = p3.y - p1.y
      pz = p3.z - p1.z

      normal[0] = py * qz - pz * qy
      normal[1] = pz * qx - px * qz
      normal[2] = px * qy - py * qx

      norms[index1] += normal[0]
      norms[index1 + 1] += normal[1]
      norms[index1 + 2] += normal[2]

      norms[index2] += normal[0]
      norms[index2 + 1] += normal[1]
      norms[index2 + 2] += normal[2]

      norms[index3] += normal[0]
      norms[index3 + 1] += normal[1]
      norms[index3 + 2] += normal[2]
    }
    for (ctr = 0; ctr < normalsDataLength; ctr += 3) {
      normal[0] = -1 * norms[ctr]
      normal[1] = -1 * norms[ctr + 1]
      normal[2] = -1 * norms[ctr + 2]
      let len = normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]
      if (len > 0) {
        len = 1.0 / Math.sqrt(len)
        normal[0] *= len
        normal[1] *= len
        normal[2] *= len
      }
      norms[ctr] = normal[0]
      norms[ctr + 1] = normal[1]
      norms[ctr + 2] = normal[2]
    }
    return norms
  }
}
