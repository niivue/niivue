import { mat4, vec3 } from 'gl-matrix'
import { NiivueObject3D } from '@/niivue-object3D'
import { getExtents } from '@/nvimage/utils'
import type { NVImage } from '@/nvimage'

/**
 * Creates a NiivueObject3D representation for WebGL rendering from an NVImage.
 * @param nvImage - The NVImage instance
 * @param id - Unique ID for the 3D object
 * @param gl - WebGL2 rendering context
 * @returns NiivueObject3D instance
 */
export function toNiivueObject3D(nvImage: NVImage, id: number, gl: WebGL2RenderingContext): NiivueObject3D {
  // Ensure necessary RAS properties are available on the nvImage object
  if (!nvImage.dimsRAS || !nvImage.matRAS || !nvImage.pixDimsRAS || !nvImage.vox2mm) {
    throw new Error('Cannot create NiivueObject3D: Missing required RAS properties or vox2mm access on NVImage.')
  }

  const dimsRAS = nvImage.dimsRAS as number[]
  const matRAS = nvImage.matRAS as mat4
  const pixDimsRAS = nvImage.pixDimsRAS as number[]

  const L = -0.5
  const P = -0.5
  const I = -0.5
  const R = dimsRAS[1] - 1 + 0.5
  const A = dimsRAS[2] - 1 + 0.5
  const S = dimsRAS[3] - 1 + 0.5

  const vox2mmFn = nvImage.vox2mm

  // Calculate corner coordinates in mm space
  const LPI = vox2mmFn.call(nvImage, [L, P, I], matRAS)
  const LAI = vox2mmFn.call(nvImage, [L, A, I], matRAS)
  const LPS = vox2mmFn.call(nvImage, [L, P, S], matRAS)
  const LAS = vox2mmFn.call(nvImage, [L, A, S], matRAS)
  const RPI = vox2mmFn.call(nvImage, [R, P, I], matRAS)
  const RAI = vox2mmFn.call(nvImage, [R, A, I], matRAS)
  const RPS = vox2mmFn.call(nvImage, [R, P, S], matRAS)
  const RAS = vox2mmFn.call(nvImage, [R, A, S], matRAS)

  // Define vertex positions (XYZ) and texture coordinates (UVW)
  const posTex = [
    // Superior face vertices (Indices 0-3)
    ...LPS,
    ...[0.0, 0.0, 1.0], // 0
    ...RPS,
    ...[1.0, 0.0, 1.0], // 1
    ...RAS,
    ...[1.0, 1.0, 1.0], // 2
    ...LAS,
    ...[0.0, 1.0, 1.0], // 3

    // Inferior face vertices (Indices 4-7)
    ...LPI,
    ...[0.0, 0.0, 0.0], // 4
    ...LAI,
    ...[0.0, 1.0, 0.0], // 5
    ...RAI,
    ...[1.0, 1.0, 0.0], // 6
    ...RPI,
    ...[1.0, 0.0, 0.0] // 7
  ]

  const indexBuffer = gl.createBuffer()
  if (!indexBuffer) {
    throw new Error('Failed to create GL index buffer')
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)

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
    5,
    6,
    2,
    2,
    3,
    5, // Front -> Corresponds to LAI(5), RAI(6), RAS(2) / RAS(2), LAS(3), LAI(5)
    4,
    0,
    1,
    1,
    7,
    4, // Back -> Corresponds to LPI(4), LPS(0), RPS(1) / RPS(1), RPI(7), LPI(4)
    7,
    1,
    2,
    2,
    6,
    7, // Right -> Corresponds to RPI(7), RPS(1), RAS(2) / RAS(2), RAI(6), RPI(7)
    4,
    5,
    3,
    3,
    0,
    4 // Left -> Corresponds to LPI(4), LAI(5), LAS(3) / LAS(3), LPS(0), LPI(4)
  ]

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

  // Create buffer for position and texture coordinates
  const posTexBuffer = gl.createBuffer()
  if (!posTexBuffer) {
    throw new Error('Failed to create GL vertex buffer')
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, posTexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posTex), gl.STATIC_DRAW)

  // Create Vertex Array Object (VAO)
  const vao = gl.createVertexArray()
  if (!vao) {
    throw new Error('Failed to create GL VAO')
  }
  gl.bindVertexArray(vao)

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer) // Associate index buffer with VAO

  gl.bindBuffer(gl.ARRAY_BUFFER, posTexBuffer) // Associate vertex data buffer with VAO
  // Configure vertex attributes pointers
  const stride = 24 // 6 floats * 4 bytes/float = 24 bytes
  // Vertex spatial position (XYZ) - location 0
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0)
  // Texture coordinates (UVW) - location 1
  gl.enableVertexAttribArray(1)
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12) // Offset 12 bytes (3 floats * 4 bytes/float)

  gl.bindVertexArray(null) // Unbind VAO

  // Create the NiivueObject3D instance
  const obj3D = new NiivueObject3D(id, posTexBuffer, gl.TRIANGLES, indices.length, indexBuffer, vao)

  const allCorners = [...LPS, ...RPS, ...RAS, ...LAS, ...LPI, ...LAI, ...RAI, ...RPI]
  const extents = getExtents(allCorners) // Use the utility function

  obj3D.extentsMin = extents.min.slice() // Use slice() for safety
  obj3D.extentsMax = extents.max.slice() // Use slice() for safety
  obj3D.furthestVertexFromOrigin = extents.furthestVertexFromOrigin

  obj3D.originNegate = vec3.clone(extents.origin)
  vec3.negate(obj3D.originNegate, obj3D.originNegate)

  // Calculate field of view based on RAS dimensions and pixel sizes
  obj3D.fieldOfViewDeObliqueMM = [dimsRAS[1] * pixDimsRAS[1], dimsRAS[2] * pixDimsRAS[2], dimsRAS[3] * pixDimsRAS[3]]

  return obj3D
}
