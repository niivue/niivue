import { mat4, vec3, vec4 } from 'gl-matrix'

type Geometry = {
  vertexBuffer: WebGLBuffer
  indexBuffer: WebGLBuffer
  indexCount: number
  vao: WebGLVertexArrayObject | null
}

/**
 * Represents a 3D object rendered with WebGL, including geometry, transformations, and rendering state.
 * Used internally by Niivue for rendering meshes and crosshairs.
 */
export class NiivueObject3D {
  static BLEND = 1
  static CULL_FACE = 2
  static CULL_FRONT = 4
  static CULL_BACK = 8
  static ENABLE_DEPTH_TEST = 16

  sphereIdx: number[] = []
  sphereVtx: number[] = []
  renderShaders: number[] = []
  isVisible = true
  isPickable = true
  vertexBuffer: WebGLVertexArrayObject
  indexCount: number
  indexBuffer: WebGLVertexArrayObject | null
  vao: WebGLVertexArrayObject | null
  mode: number
  glFlags = 0
  id: number
  colorId: [number, number, number, number]

  modelMatrix = mat4.create()
  scale = [1, 1, 1]
  position = [0, 0, 0]
  rotation = [0, 0, 0]
  rotationRadians = 0.0

  extentsMin: number[] = []
  extentsMax: number[] = []

  // TODO needed through NVImage
  furthestVertexFromOrigin?: number
  originNegate?: vec3
  fieldOfViewDeObliqueMM?: vec3

  // TODO needed through crosshairs in NiiVue
  mm?: vec4

  constructor(
    id: number,
    vertexBuffer: WebGLBuffer,
    mode: number,
    indexCount: number,
    indexBuffer: WebGLVertexArrayObject | null = null,
    vao: WebGLVertexArrayObject | null = null
  ) {
    this.vertexBuffer = vertexBuffer
    this.indexCount = indexCount
    this.indexBuffer = indexBuffer
    this.vao = vao
    this.mode = mode

    this.id = id
    this.colorId = [
      ((id >> 0) & 0xff) / 255.0,
      ((id >> 8) & 0xff) / 255.0,
      ((id >> 16) & 0xff) / 255.0,
      ((id >> 24) & 0xff) / 255.0
    ]
  }

  static generateCrosshairs = function (
    gl: WebGL2RenderingContext,
    id: number,
    xyzMM: vec4,
    xyzMin: vec3,
    xyzMax: vec3,
    radius: number,
    sides = 20,
    gap = 0
  ): NiivueObject3D {
    const geometry = NiivueObject3D.generateCrosshairsGeometry(gl, xyzMM, xyzMin, xyzMax, radius, sides, gap)
    return new NiivueObject3D(
      id,
      geometry.vertexBuffer,
      gl.TRIANGLES,
      geometry.indexCount,
      geometry.indexBuffer,
      geometry.vao
    )
  }

  // not included in public docs
  static generateCrosshairsGeometry = function (
    gl: WebGL2RenderingContext,
    xyzMM: vec4,
    xyzMin: vec3,
    xyzMax: vec3,
    radius: number,
    sides = 20,
    gap = 0
  ): Geometry {
    const vertices: number[] = []
    const indices: number[] = []
    const gapX = radius * gap
    if (gapX <= 0) {
      // left-right
      let start = vec3.fromValues(xyzMin[0], xyzMM[1], xyzMM[2])
      let dest = vec3.fromValues(xyzMax[0], xyzMM[1], xyzMM[2])
      NiivueObject3D.makeCylinder(vertices, indices, start, dest, radius, sides)
      // anterior-posterior
      start = vec3.fromValues(xyzMM[0], xyzMin[1], xyzMM[2])
      dest = vec3.fromValues(xyzMM[0], xyzMax[1], xyzMM[2])
      NiivueObject3D.makeCylinder(vertices, indices, start, dest, radius, sides)
      // superior-inferior
      start = vec3.fromValues(xyzMM[0], xyzMM[1], xyzMin[2])
      dest = vec3.fromValues(xyzMM[0], xyzMM[1], xyzMax[2])
      NiivueObject3D.makeCylinder(vertices, indices, start, dest, radius, sides)
    } else {
      // left-right
      let start = vec3.fromValues(xyzMin[0], xyzMM[1], xyzMM[2])
      let dest = vec3.fromValues(xyzMM[0] - gapX, xyzMM[1], xyzMM[2])
      NiivueObject3D.makeCylinder(vertices, indices, start, dest, radius, sides, false)
      start = vec3.fromValues(xyzMM[0] + gapX, xyzMM[1], xyzMM[2])
      dest = vec3.fromValues(xyzMax[0], xyzMM[1], xyzMM[2])
      NiivueObject3D.makeCylinder(vertices, indices, start, dest, radius, sides, false)
      // anterior-posterior
      start = vec3.fromValues(xyzMM[0], xyzMin[1], xyzMM[2])
      dest = vec3.fromValues(xyzMM[0], xyzMM[1] - gapX, xyzMM[2])
      NiivueObject3D.makeCylinder(vertices, indices, start, dest, radius, sides, false)
      start = vec3.fromValues(xyzMM[0], xyzMM[1] + gapX, xyzMM[2])
      dest = vec3.fromValues(xyzMM[0], xyzMax[1], xyzMM[2])
      NiivueObject3D.makeCylinder(vertices, indices, start, dest, radius, sides, false)
      // superior-inferior
      start = vec3.fromValues(xyzMM[0], xyzMM[1], xyzMin[2])
      dest = vec3.fromValues(xyzMM[0], xyzMM[1], xyzMM[2] - gapX)
      NiivueObject3D.makeCylinder(vertices, indices, start, dest, radius, sides, false)
      start = vec3.fromValues(xyzMM[0], xyzMM[1], xyzMM[2] + gapX)
      dest = vec3.fromValues(xyzMM[0], xyzMM[1], xyzMax[2])
      NiivueObject3D.makeCylinder(vertices, indices, start, dest, radius, sides, false)
    }
    // console.log('i:',indices.length / 3, 'v:',vertices.length / 3);
    const vertexBuffer = gl.createBuffer()
    if (vertexBuffer === null) {
      throw new Error('could not instantiate vertex buffer')
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

    // index buffer allocated in parent class
    const indexBuffer = gl.createBuffer()
    if (indexBuffer === null) {
      throw new Error('could not instantiate index buffer')
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW)

    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    // vertex position: 3 floats X,Y,Z
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null) // https://stackoverflow.com/questions/43904396/are-we-not-allowed-to-bind-gl-array-buffer-and-vertex-attrib-array-to-0-in-webgl

    return {
      vertexBuffer,
      indexBuffer,
      indexCount: indices.length,
      vao
    }
  }

  static getFirstPerpVector = function (v1: vec3): vec3 {
    const v2 = vec3.fromValues(0.0, 0.0, 0.0)
    if (v1[0] === 0.0) {
      v2[0] = 1.0
    } else if (v1[1] === 0.0) {
      v2[1] = 1.0
    } else if (v1[2] === 0.0) {
      v2[2] = 1.0
    } else {
      // If xyz is all set, we set the z coordinate as first and second argument .
      // As the scalar product must be zero, we add the negated sum of x and y as third argument
      v2[0] = v1[2] // scalp = z*x
      v2[1] = v1[2] // scalp = z*(x+y)
      v2[2] = -(v1[0] + v1[1]) // scalp = z*(x+y)-z*(x+y) = 0
      vec3.normalize(v2, v2)
    }
    return v2
  }

  static subdivide = function (verts: number[], faces: number[]): void {
    // Subdivide each triangle into four triangles, pushing verts to the unit sphere"""
    let nv = verts.length / 3
    let nf = faces.length / 3
    const n = nf
    const vNew = vec3.create()
    const nNew = vec3.create()
    for (let faceIndex = 0; faceIndex < n; faceIndex++) {
      // setlength(verts, nv + 3);
      const fx = faces[faceIndex * 3 + 0]
      const fy = faces[faceIndex * 3 + 1]
      const fz = faces[faceIndex * 3 + 2]
      const vx = vec3.fromValues(verts[fx * 3 + 0], verts[fx * 3 + 1], verts[fx * 3 + 2])
      const vy = vec3.fromValues(verts[fy * 3 + 0], verts[fy * 3 + 1], verts[fy * 3 + 2])
      const vz = vec3.fromValues(verts[fz * 3 + 0], verts[fz * 3 + 1], verts[fz * 3 + 2])
      vec3.add(vNew, vx, vy)
      vec3.normalize(nNew, vNew)
      verts.push(...nNew)

      vec3.add(vNew, vy, vz)
      vec3.normalize(nNew, vNew)
      verts.push(...nNew)

      vec3.add(vNew, vx, vz)
      vec3.normalize(nNew, vNew)
      verts.push(...nNew)
      // Split the current triangle into four smaller triangles:
      let face = [nv, nv + 1, nv + 2]
      faces.push(...face)
      face = [fx, nv, nv + 2]
      faces.push(...face)
      face = [nv, fy, nv + 1]
      faces.push(...face)
      faces[faceIndex * 3 + 0] = nv + 2
      faces[faceIndex * 3 + 1] = nv + 1
      faces[faceIndex * 3 + 2] = fz
      nf = nf + 3
      nv = nv + 3
    }
  }

  static weldVertices = function (verts: number[], faces: number[]): number[] {
    // unify identical vertices
    const nv = verts.length / 3
    // yikes: bubble sort! TO DO: see Surfice for more efficient solution
    let nUnique = 0 // first vertex is unique
    // var remap = new Array();
    const remap = new Int32Array(nv)
    for (let i = 0; i < nv - 1; i++) {
      if (remap[i] !== 0) {
        continue
      } // previously tested
      remap[i] = nUnique
      let v = i * 3
      const x = verts[v]
      const y = verts[v + 1]
      const z = verts[v + 2]
      for (let j = i + 1; j < nv; j++) {
        v += 3
        if (x === verts[v] && y === verts[v + 1] && z === verts[v + 2]) {
          remap[j] = nUnique
        }
      }
      nUnique++ // another new vertex
    } // for i
    if (nUnique === nv) {
      return verts
    }
    // console.log('welding vertices removed redundant positions ', nv, '->', nUnique);
    const nf = faces.length
    for (let f = 0; f < nf; f++) {
      faces[f] = remap[faces[f]]
    }
    const vtx = verts.slice(0, nUnique * 3 - 1)
    for (let i = 0; i < nv - 1; i++) {
      const v = i * 3
      const r = remap[i] * 3
      vtx[r] = verts[v]
      vtx[r + 1] = verts[v + 1]
      vtx[r + 2] = verts[v + 2]
    }
    return vtx
  }

  static makeSphere = function (
    vertices: number[],
    indices: number[],
    radius: number,
    origin: vec3 | vec4 = [0, 0, 0]
  ): void {
    let vtx = [
      0.0, 0.0, 1.0, 0.894, 0.0, 0.447, 0.276, 0.851, 0.447, -0.724, 0.526, 0.447, -0.724, -0.526, 0.447, 0.276, -0.851,
      0.447, 0.724, 0.526, -0.447, -0.276, 0.851, -0.447, -0.894, 0.0, -0.447, -0.276, -0.851, -0.447, 0.724, -0.526,
      -0.447, 0.0, 0.0, -1.0
    ]
    // let idx = new Uint16Array([
    const idx = [
      0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 1, 7, 6, 11, 8, 7, 11, 9, 8, 11, 10, 9, 11, 6, 10, 11, 6, 2, 1, 7, 3, 2,
      8, 4, 3, 9, 5, 4, 10, 1, 5, 6, 7, 2, 7, 8, 3, 8, 9, 4, 9, 10, 5, 10, 6, 1
    ]
    NiivueObject3D.subdivide(vtx, idx)
    NiivueObject3D.subdivide(vtx, idx)
    vtx = NiivueObject3D.weldVertices(vtx, idx)

    for (let i = 0; i < vtx.length; i++) {
      vtx[i] = vtx[i] * radius
    }
    const nvtx = vtx.length / 3
    let j = 0
    for (let i = 0; i < nvtx; i++) {
      vtx[j] = vtx[j] + origin[0]
      j++
      vtx[j] = vtx[j] + origin[1]
      j++
      vtx[j] = vtx[j] + origin[2]
      j++
    }
    const idx0 = Math.floor(vertices.length / 3) // first new vertex will be AFTER previous vertices
    for (let i = 0; i < idx.length; i++) {
      idx[i] = idx[i] + idx0
    }

    indices.push(...idx)
    vertices.push(...vtx)
  }

  static makeCylinder = function (
    vertices: number[],
    indices: number[],
    start: vec3,
    dest: vec3,
    radius: number,
    sides = 20,
    endcaps = true
  ): void {
    if (sides < 3) {
      sides = 3
    } // prism is minimal 3D cylinder
    const v1 = vec3.create()
    vec3.subtract(v1, dest, start)
    vec3.normalize(v1, v1) // principle axis of cylinder
    const v2 = NiivueObject3D.getFirstPerpVector(v1) // a unit length vector orthogonal to v1
    // Get the second perp vector by cross product
    const v3 = vec3.create()
    vec3.cross(v3, v1, v2) // a unit length vector orthogonal to v1 and v2
    vec3.normalize(v3, v3)
    let num_v = 2 * sides
    let num_f = 2 * sides
    if (endcaps) {
      num_f += 2 * sides
      num_v += 2
    }
    const idx0 = Math.floor(vertices.length / 3) // first new vertex will be AFTER previous vertices
    const idx = new Uint32Array(num_f * 3)
    const vtx = new Float32Array(num_v * 3)
    function setV(i: number, vec3: vec3): void {
      vtx[i * 3 + 0] = vec3[0]
      vtx[i * 3 + 1] = vec3[1]
      vtx[i * 3 + 2] = vec3[2]
    }
    function setI(i: number, a: number, b: number, c: number): void {
      idx[i * 3 + 0] = a + idx0
      idx[i * 3 + 1] = b + idx0
      idx[i * 3 + 2] = c + idx0
    }
    const startPole = 2 * sides
    const destPole = startPole + 1
    if (endcaps) {
      setV(startPole, start)
      setV(destPole, dest)
    }
    const pt1 = vec3.create()
    const pt2 = vec3.create()
    for (let i = 0; i < sides; i++) {
      const c = Math.cos((i / sides) * 2 * Math.PI)
      const s = Math.sin((i / sides) * 2 * Math.PI)
      pt1[0] = radius * (c * v2[0] + s * v3[0])
      pt1[1] = radius * (c * v2[1] + s * v3[1])
      pt1[2] = radius * (c * v2[2] + s * v3[2])
      vec3.add(pt2, start, pt1)
      setV(i, pt2)
      vec3.add(pt2, dest, pt1)
      setV(i + sides, pt2)
      let nxt = 0
      if (i < sides - 1) {
        nxt = i + 1
      }
      setI(i * 2, i, nxt, i + sides)
      setI(i * 2 + 1, nxt, nxt + sides, i + sides)
      if (endcaps) {
        setI(sides * 2 + i, i, startPole, nxt)
        setI(sides * 2 + i + sides, destPole, i + sides, nxt + sides)
      }
    }
    indices.push(...idx)
    vertices.push(...vtx)
  }

  static makeColoredCylinder = function (
    vertices: number[],
    indices: number[],
    colors: number[],
    start: vec3,
    dest: vec3,
    radius: number,
    rgba255 = [192, 0, 0, 255],
    sides = 20,
    endcaps = false
  ): void {
    let nv = vertices.length / 3
    NiivueObject3D.makeCylinder(vertices, indices, start, dest, radius, sides, endcaps)
    nv = vertices.length / 3 - nv
    const clrs = []
    for (let i = 0; i < nv * 4 - 1; i += 4) {
      clrs[i] = rgba255[0]
      clrs[i + 1] = rgba255[1]
      clrs[i + 2] = rgba255[2]
      clrs[i + 3] = rgba255[3]
    }
    colors.push(...clrs)
  }

  static makeColoredSphere = function (
    vertices: number[],
    indices: number[],
    colors: number[],
    radius: number,
    origin: vec3 | vec4 = [0, 0, 0],
    rgba255 = [0, 0, 192, 255]
  ): void {
    let nv = vertices.length / 3
    NiivueObject3D.makeSphere(vertices, indices, radius, origin)
    nv = vertices.length / 3 - nv
    const clrs = []
    for (let i = 0; i < nv * 4 - 1; i += 4) {
      clrs[i] = rgba255[0]
      clrs[i + 1] = rgba255[1]
      clrs[i + 2] = rgba255[2]
      clrs[i + 3] = rgba255[3]
    }
    colors.push(...clrs)
  }
}
