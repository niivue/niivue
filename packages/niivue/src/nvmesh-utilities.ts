import { vec3 } from 'gl-matrix'

type Extents = {
  mxDx: number
  extentsMin: number | number[]
  extentsMax: number | number[]
}

/**
 * Utilities class for common mesh functions
 */
export class NVMeshUtilities {
  static getClusterBoundaryU8(u8: Uint8Array, faces: number[] | Uint32Array): boolean[] {
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

  static async gzip(data: Uint8Array): Promise<Uint8Array> {
    const stream = new CompressionStream('gzip')
    const writer = stream.writable.getWriter()
    writer.write(data).catch(console.error)
    const closePromise = writer.close().catch(console.error)
    const response = new Response(stream.readable)
    const result = new Uint8Array(await response.arrayBuffer())
    await closePromise // Ensure close happens eventually
    return result
  }

  static createMZ3(
    vertices: Float32Array,
    indices: Uint32Array,
    compress: boolean = false,
    colors: Uint8Array | null = null
  ): ArrayBuffer {
    // generate binary MZ3 format mesh
    // n.b. small, precise and small but support is not widespread
    // n.b. result can be compressed with gzip
    // https://github.com/neurolabusc/surf-ice/tree/master/mz3

    const magic = 23117
    const isRGBA = colors instanceof Uint8Array && colors.length === (vertices.length / 3) * 4
    const attr = isRGBA ? 7 : 3
    const nface = indices.length / 3
    const nvert = vertices.length / 3
    const nskip = 0
    // Calculate buffer size
    const headerSize = 16
    const indexSize = nface * 3 * 4 // Uint32Array
    const vertexSize = nvert * 3 * 4 // Float32Array
    const totalSize = headerSize + indexSize + vertexSize
    const buffer = new ArrayBuffer(totalSize)
    const writer = new DataView(buffer)
    // Write header
    writer.setUint16(0, magic, true)
    writer.setUint16(2, attr, true)
    writer.setUint32(4, nface, true)
    writer.setUint32(8, nvert, true)
    writer.setUint32(12, nskip, true)
    // Write indices
    let offset = headerSize
    new Uint32Array(buffer, offset, indices.length).set(indices)
    offset += indexSize
    // Write vertices
    new Float32Array(buffer, offset, vertices.length).set(vertices)
    // Write colors
    if (isRGBA) {
      offset += vertexSize
      new Uint8Array(buffer, offset, colors.length).set(colors)
    }
    if (compress) {
      throw new Error('Call async createMZ3Async() for compression')
    }
    return buffer
  }

  static async createMZ3Async(
    vertices: Float32Array,
    indices: Uint32Array,
    compress: boolean = false,
    colors: Uint8Array | null = null
  ): Promise<ArrayBuffer> {
    const buffer = this.createMZ3(vertices, indices, compress, colors)
    if (compress) {
      return await this.gzip(new Uint8Array(buffer))
    }
    return buffer
  }

  static createOBJ(vertices: Float32Array, indices: Uint32Array): ArrayBuffer {
    // generate binary OBJ format mesh
    // n.b. widespread support, but large and slow due to ASCII
    // https://en.wikipedia.org/wiki/Wavefront_.obj_file
    let objContent = ''
    // Add vertices to OBJ content
    for (let i = 0; i < vertices.length; i += 3) {
      objContent += `v ${vertices[i]} ${vertices[i + 1]} ${vertices[i + 2]}\n`
    }
    // Add faces to OBJ content (OBJ indices start at 1, not 0)
    for (let i = 0; i < indices.length; i += 3) {
      objContent += `f ${indices[i] + 1} ${indices[i + 1] + 1} ${indices[i + 2] + 1}\n`
    }
    // Encode the OBJ content as an ArrayBuffer
    const encoder = new TextEncoder()
    const arrayBuffer = encoder.encode(objContent).buffer
    return arrayBuffer
  }

  static createSTL(vertices: Float32Array, indices: Uint32Array): ArrayBuffer {
    // generate binary STL format mesh
    // n.b. inefficient and slow as vertices are not reused
    // https://en.wikipedia.org/wiki/STL_(file_format)#Binary
    const numTriangles = indices.length / 3
    const bufferLength = 84 + numTriangles * 50
    const arrayBuffer = new ArrayBuffer(bufferLength)
    const dataView = new DataView(arrayBuffer)
    // Write header (80 bytes)
    for (let i = 0; i < 80; i++) {
      dataView.setUint8(i, 0)
    }
    // Write number of triangles (4 bytes)
    dataView.setUint32(80, numTriangles, true)
    let offset = 84
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3
      const i1 = indices[i + 1] * 3
      const i2 = indices[i + 2] * 3
      // Normal vector (12 bytes, set to zero)
      dataView.setFloat32(offset, 0, true) // Normal X
      dataView.setFloat32(offset + 4, 0, true) // Normal Y
      dataView.setFloat32(offset + 8, 0, true) // Normal Z
      offset += 12
      // Vertex 1 (12 bytes)
      dataView.setFloat32(offset, vertices[i0], true) // Vertex 1 X
      dataView.setFloat32(offset + 4, vertices[i0 + 1], true) // Vertex 1 Y
      dataView.setFloat32(offset + 8, vertices[i0 + 2], true) // Vertex 1 Z
      offset += 12
      // Vertex 2 (12 bytes)
      dataView.setFloat32(offset, vertices[i1], true) // Vertex 2 X
      dataView.setFloat32(offset + 4, vertices[i1 + 1], true) // Vertex 2 Y
      dataView.setFloat32(offset + 8, vertices[i1 + 2], true) // Vertex 2 Z
      offset += 12
      // Vertex 3 (12 bytes)
      dataView.setFloat32(offset, vertices[i2], true) // Vertex 3 X
      dataView.setFloat32(offset + 4, vertices[i2 + 1], true) // Vertex 3 Y
      dataView.setFloat32(offset + 8, vertices[i2 + 2], true) // Vertex 3 Z
      offset += 12
      // Attribute byte count (2 bytes, set to zero)
      dataView.setUint16(offset, 0, true)
      offset += 2
    }
    return arrayBuffer
  }

  static downloadArrayBuffer(buffer: ArrayBuffer, filename: string): void {
    const blob = new Blob([buffer], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.style.display = 'none'
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 0)
  }

  static async saveMesh(
    vertices: Float32Array,
    indices: Uint32Array,
    filename: string = '.mz3',
    compress: boolean = false
  ): Promise<ArrayBuffer> {
    let buff = new ArrayBuffer(0)
    if (/\.obj$/i.test(filename)) {
      buff = this.createOBJ(vertices, indices)
    } else if (/\.stl$/i.test(filename)) {
      buff = this.createSTL(vertices, indices)
    } else {
      if (!/\.mz3$/i.test(filename)) {
        filename += '.mz3'
      }
      buff = await this.createMZ3Async(vertices, indices, compress)
    }
    if (filename.length > 4) {
      this.downloadArrayBuffer(buff, filename)
    }
    return buff
  }

  static getClusterBoundary(rgba8: Uint8Array, faces: number[] | Uint32Array): boolean[] {
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
  static getExtents(pts: number[] | Float32Array): Extents {
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
  static generateNormals(pts: number[] | Float32Array, tris: number[] | Uint32Array): Float32Array {
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

      const p1 = [pts[index1], pts[index1 + 1], pts[index1 + 2]]
      const p2 = [pts[index2], pts[index2 + 1], pts[index2 + 2]]
      const p3 = [pts[index3], pts[index3 + 1], pts[index3 + 2]]

      qx = p2[0] - p1[0]
      qy = p2[1] - p1[1]
      qz = p2[2] - p1[2]
      px = p3[0] - p1[0]
      py = p3[1] - p1[1]
      pz = p3[2] - p1[2]

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
