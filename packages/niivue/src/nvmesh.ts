import { vec3, vec4 } from 'gl-matrix'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { log } from '@/logger'
import { NiivueObject3D } from '@/niivue-object3D'
import { ColorMap, LUT, cmapper } from '@/colortables'
import { NVMeshUtilities } from '@/nvmesh-utilities'
import { NVMeshLoaders } from '@/nvmesh-loaders'
import { NVLabel3D, LabelTextAlignment, LabelLineTerminator } from '@/nvlabel'

import { LegacyConnectome, LegacyNodes, NVConnectomeEdge, NVConnectomeNode, Point } from '@/types'
import {
  DefaultMeshType,
  GII,
  MZ3,
  TCK,
  TRACT,
  TRK,
  TT,
  TRX,
  VTK,
  ValuesArray,
  X3D,
  AnyNumberArray
} from '@/nvmesh-types'
import { COLORMAP_TYPE } from '@/nvdocument'

/** Enum for text alignment
 */
export enum MeshType {
  MESH = 'mesh',
  CONNECTOME = 'connectome',
  FIBER = 'fiber'
}

export type NVMeshLayer = {
  name?: string
  key?: string
  url?: string
  headers?: Record<string, string>
  opacity: number
  colormap: string
  colormapNegative?: string
  colormapInvert?: boolean
  colormapLabel?: ColorMap | LUT
  useNegativeCmap?: boolean
  global_min?: number
  global_max?: number
  cal_min: number
  cal_max: number
  cal_minNeg: number
  cal_maxNeg: number
  isAdditiveBlend?: boolean
  frame4D: number
  nFrame4D: number
  values: AnyNumberArray // number[] | Float32Array | Uint32Array
  outlineBorder?: number
  isTransparentBelowCalMin?: boolean
  colormapType?: number
  base64?: string
  // TODO referenced in niivue/refreshColormaps
  colorbarVisible?: boolean
  showLegend?: boolean
  labels?: NVLabel3D[]
  atlasValues?: AnyNumberArray
}

export const NVMeshLayerDefaults = {
  colormap: 'gray',
  opacity: 0.0,
  nFrame4D: 0,
  frame4D: 0,
  outlineBorder: 0,
  cal_min: 0,
  cal_max: 0,
  cal_minNeg: 0,
  cal_maxNeg: 0,
  colormapType: COLORMAP_TYPE.MIN_TO_MAX,
  values: new Array<number>(),
  useNegativeCmap: false,
  showLegend: true
}

export class NVMeshFromUrlOptions {
  url: string
  gl: WebGL2RenderingContext | null
  name: string
  opacity: number
  rgba255: Uint8Array
  visible: boolean
  layers: NVMeshLayer[]
  colorbarVisible: boolean

  constructor(
    url = '',
    gl = null,
    name = '',
    opacity = 1.0,
    rgba255 = new Uint8Array([255, 255, 255, 255]),
    visible = true,
    layers = [],
    colorbarVisible = true
  ) {
    this.url = url
    this.gl = gl
    this.name = name
    this.opacity = opacity
    this.rgba255 = rgba255
    this.visible = visible
    this.layers = layers
    this.colorbarVisible = colorbarVisible
  }
}

/**
 * Parameters for loading a base mesh or volume.
 */
type BaseLoadParams = {
  /** WebGL rendering context. */
  gl: WebGL2RenderingContext
  /** Name for this image. Default is an empty string. */
  name: string
  /** Opacity for this image. Default is 1. */
  opacity: number
  /** Base color of the mesh in RGBA [0-255]. Default is white. */
  rgba255: number[] | Uint8Array
  /** Whether this image is visible. */
  visible: boolean
  /** Layers of the mesh to load. */
  layers: NVMeshLayer[]
}

export type LoadFromUrlParams = Partial<BaseLoadParams> & {
  // the resolvable URL pointing to a mesh to load
  url: string
  headers?: Record<string, string>
  buffer?: ArrayBuffer
}

type LoadFromFileParams = BaseLoadParams & {
  // the file object
  file: Blob
}

type LoadFromBase64Params = BaseLoadParams & {
  // the base64 encoded string
  base64: string
}

/**
 * a NVMesh encapsulates some mesh data and provides methods to query and operate on meshes
 */
export class NVMesh {
  id: string
  name: string
  anatomicalStructurePrimary: string
  colorbarVisible: boolean
  furthestVertexFromOrigin: number
  extentsMin: number | number[]
  extentsMax: number | number[]
  opacity: number
  visible: boolean
  meshShaderIndex = 0
  offsetPt0: Uint32Array | null = null

  colormapInvert = false
  fiberGroupColormap: ColorMap | null = null

  indexBuffer: WebGLBuffer
  vertexBuffer: WebGLBuffer
  vao: WebGLVertexArrayObject
  vaoFiber: WebGLVertexArrayObject

  pts: Float32Array
  tris?: Uint32Array
  layers: NVMeshLayer[]
  type = MeshType.MESH

  data_type?: string
  rgba255: Uint8Array
  fiberLength?: number
  fiberLengths?: Uint32Array
  fiberDensity?: Float32Array
  fiberDither = 0.1
  fiberColor = 'Global'
  fiberDecimationStride = 1 // e.g. if 2 the 50% of streamlines visible, if 3 then 1/3rd
  fiberSides = 5 // 1=streamline, 2=imposter, >2=mesh(cylinder with fiberSides sides)
  fiberRadius = 0 // in mm, e.g. 3 means 6mm diameter fibers, ignored if fiberSides < 3
  fiberOcclusion = 0 // value 0..1 to simulate ambient occlusion
  f32PerVertex = 5 // MUST be 5 or 7: number of float32s per vertex DEPRECATED, future releases will ALWAYS be 5
  fiberMask?: unknown[]
  colormap?: ColorMap | LegacyConnectome | string | null
  dpg?: ValuesArray | null
  dps?: ValuesArray | null
  dpv?: ValuesArray | null

  hasConnectome = false
  connectome?: LegacyConnectome | string

  // TODO this should somehow get aligned with connectome
  indexCount?: number
  vertexCount = 1
  nodeScale = 4
  edgeScale = 1
  legendLineThickness = 0
  showLegend = true
  nodeColormap = 'warm'
  edgeColormap = 'warm'
  nodeColormapNegative?: string
  edgeColormapNegative?: string
  nodeMinColor?: number
  nodeMaxColor?: number
  edgeMin?: number
  edgeMax?: number

  nodes?: LegacyNodes | NVConnectomeNode[]

  edges?: number[] | NVConnectomeEdge[]

  points?: Point[]

  /**
   * @param pts - a 3xN array of vertex positions (X,Y,Z coordinates).
   * @param tris - a 3xN array of triangle indices (I,J,K; indexed from zero). Each triangle generated from three vertices.
   * @param name - a name for this image. Default is an empty string
   * @param rgba255 - the base color of the mesh. RGBA values from 0 to 255. Default is white
   * @param opacity - the opacity for this mesh. default is 1
   * @param visible - whether or not this image is to be visible
   * @param gl - WebGL rendering context
   * @param connectome - specify connectome edges and nodes. Default is null (not a connectome).
   * @param dpg - Data per group for tractography, see TRK format. Default is null (not tractograpgy)
   * @param dps - Data per streamline for tractography, see TRK format.  Default is null (not tractograpgy)
   * @param dpv - Data per vertex for tractography, see TRK format.  Default is null (not tractograpgy)
   * @param colorbarVisible - does this mesh display a colorbar
   * @param anatomicalStructurePrimary - region for mesh. Default is an empty string
   */
  constructor(
    pts: Float32Array,
    tris: Uint32Array,
    name = '',
    rgba255 = new Uint8Array([255, 255, 255, 255]),
    opacity = 1.0,
    visible = true,
    gl: WebGL2RenderingContext,
    connectome: LegacyConnectome | string | null = null,
    dpg: ValuesArray | null = null,
    dps: ValuesArray | null = null,
    dpv: ValuesArray | null = null,
    colorbarVisible = true,
    anatomicalStructurePrimary = ''
  ) {
    this.anatomicalStructurePrimary = anatomicalStructurePrimary
    this.name = name
    this.colorbarVisible = colorbarVisible
    this.id = uuidv4()
    const obj = NVMeshUtilities.getExtents(pts)
    this.furthestVertexFromOrigin = obj.mxDx
    this.extentsMin = obj.extentsMin
    this.extentsMax = obj.extentsMax
    this.opacity = opacity > 1.0 ? 1.0 : opacity // make sure opacity can't be initialized greater than 1 see: #107 and #117 on github
    this.visible = visible
    this.meshShaderIndex = 0
    this.indexBuffer = gl.createBuffer()!
    this.vertexBuffer = gl.createBuffer()!
    this.vao = gl.createVertexArray()!
    // the VAO binds the vertices and indices as well as describing the vertex layout
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    // vertex position: 3 floats X,Y,Z
    gl.enableVertexAttribArray(0)

    gl.enableVertexAttribArray(1)
    const f32PerVertex = this.f32PerVertex
    if (f32PerVertex !== 7) {
      // n32
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0)
      // vertex surface normal vector: (also three floats)
      gl.vertexAttribPointer(1, 4, gl.BYTE, true, 20, 12)
      // vertex color
      gl.enableVertexAttribArray(2)
      gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 20, 16)
    } else {
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0)
      // vertex surface normal vector: (also three floats)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12)
      // vertex color
      gl.enableVertexAttribArray(2)
      gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 28, 24)
    }
    gl.bindVertexArray(null) // https://stackoverflow.com/questions/43904396/are-we-not-allowed-to-bind-gl-array-buffer-and-vertex-attrib-array-to-0-in-webgl

    this.vaoFiber = gl.createVertexArray()!
    this.offsetPt0 = null
    this.hasConnectome = false
    this.colormapInvert = false
    this.fiberGroupColormap = null
    this.pts = pts
    this.layers = []
    this.type = MeshType.MESH
    this.tris = tris
    if (rgba255[3] < 1) {
      this.rgba255 = rgba255
      this.fiberLength = 2
      this.fiberDither = 0.1
      this.fiberColor = 'Global'
      this.fiberDecimationStride = 1 // e.g. if 2 the 50% of streamlines visible, if 3 then 1/3rd
      this.fiberMask = [] // provide method to show/hide specific fibers
      this.colormap = connectome
      this.dpg = dpg
      this.dps = dps
      this.dpv = dpv
      if (dpg) {
        this.initValuesArray(dpg)
      }
      if (dps) {
        this.initValuesArray(dps)
      }
      if (dpv) {
        this.initValuesArray(dpv)
      }
      this.offsetPt0 = new Uint32Array(tris)
      this.tris = new Uint32Array(0)
      this.updateFibers(gl)
      // define VAO
      gl.bindVertexArray(this.vaoFiber)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
      // vertex position: 3 floats X,Y,Z
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0)
      // vertex color
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 16, 12)
      gl.bindVertexArray(null) // https://stackoverflow.com/questions/43904396/are-we-not-allowed-to-bind-gl-array-buffer-and-vertex-attrib-array-to-0-in-webgl
      return
    } // if fiber not mesh
    if (connectome) {
      this.connectome = connectome
      this.hasConnectome = true
      const keysArray = Object.keys(connectome)
      for (let i = 0, len = keysArray.length; i < len; i++) {
        this[keysArray[i]] = connectome[keysArray[i]]
      }
    }
    this.rgba255 = rgba255

    this.updateMesh(gl)
  }

  initValuesArray(va: ValuesArray): ValuesArray {
    for (let i = 0; i < va.length; i++) {
      const mn = va[i].vals.reduce((acc, current) => Math.min(acc, current))
      const mx = va[i].vals.reduce((acc, current) => Math.max(acc, current))
      va[i].global_min = mn
      va[i].global_max = mx
      va[i].cal_min = mn
      va[i].cal_max = mx
    }
    return va
  }

  // given streamlines (which webGL renders as a single pixel), extrude to cylinders
  linesToCylinders(gl: WebGL2RenderingContext, posClrF32: Float32Array, indices: number[]): void {
    // return Float32Array
    // const posClrF32 four 32-bit components X,Y,Z,C where C is Uint32 with RGBA
    function v4ToV3(v4: vec4): vec3 {
      return vec3.fromValues(v4[0], v4[1], v4[2])
    }
    const primitiveRestart = Math.pow(2, 32) - 1 // for gl.UNSIGNED_INT
    const n_count = indices.length
    let n_line_vtx = 0
    let n_streamlines = 0
    // n.b. each streamline terminates with a `primitiveRestart`, even the final one
    for (let i = 0; i < n_count; i++) {
      if (indices[i] === primitiveRestart) {
        n_streamlines++
        continue
      }
      n_line_vtx++
    }
    const cyl_sides = this.fiberSides
    // next: generate extruded cylinders
    // npt is number of points (vertices) for cylinders
    const npt = cyl_sides * n_line_vtx
    const f32PerVertex = this.f32PerVertex // 7 if NormalXYZ is 3 floats, 5 if normalXYZ is packed into rgb32
    if (f32PerVertex !== 5) {
      throw Error('fiberSides > 1 requires f32PerVertex == 5')
    }
    const f32 = new Float32Array(npt * f32PerVertex) // Each vertex has 5 components: PosX, PosY, PosZ, NormalXYZ, RGBA32
    const u8 = new Uint8Array(f32.buffer) // Each vertex has 7 components: PositionXYZ, NormalXYZ, RGBA32
    let vtx = 0
    //
    // previous vector location
    let prevV4 = vec4.create()
    let currV4 = vec4.create()
    let nextV4 = vec4.create()
    const v1 = vec3.create()
    let prevV2 = vec3.create()
    let node = 0
    const radius = this.fiberRadius
    for (let i = 0; i < n_count; i++) {
      const isLineEnd = indices[i] === primitiveRestart
      if (isLineEnd && node < 1) {
        continue
      } // two restarts in a row!
      let idx = indices[i] * 4 // each posClrF32 has 4 elements X,Y,Z,C
      node++
      if (node <= 1) {
        // first vertex in a streamline, no previous vertex
        prevV4 = vec4.fromValues(posClrF32[idx + 0], posClrF32[idx + 1], posClrF32[idx + 2], posClrF32[idx + 3])
        currV4 = vec4.clone(prevV4)
        if (i + 1 < n_count && indices[i + 1] !== primitiveRestart) {
          idx = indices[i + 1] * 4
          nextV4 = vec4.fromValues(posClrF32[idx + 0], posClrF32[idx + 1], posClrF32[idx + 2], posClrF32[idx + 3])
          vec3.subtract(v1, v4ToV3(prevV4), v4ToV3(nextV4))
          vec3.normalize(v1, v1) // principle axis of cylinder
          prevV2 = NiivueObject3D.getFirstPerpVector(v1)
        }
        continue
      }
      if (isLineEnd) {
        // last vertex of streamline, no next vertex
        nextV4 = vec4.clone(currV4)
      } else {
        nextV4 = vec4.fromValues(posClrF32[idx + 0], posClrF32[idx + 1], posClrF32[idx + 2], posClrF32[idx + 3])
      }
      // mean direction at joint
      // n.b. vec4 -> vec3 we ignore 4th dimension (color)
      vec3.subtract(v1, v4ToV3(prevV4), v4ToV3(nextV4))
      vec3.normalize(v1, v1) // principle axis of cylinder
      // avoid twisted cylinders: ensure v2 as closely aligned with previous v2 as possible
      // method simpler than Frenet–Serret apparatus
      // https://math.stackexchange.com/questions/410530/find-closest-vector-to-a-which-is-perpendicular-to-b
      // const v2 = NiivueObject3D.getFirstPerpVector(v1)
      // 𝐷=𝐴×𝐵, and then 𝐶=𝐵×𝐷. 𝐶 is automatically orthogonal to 𝐵
      const D = vec3.create()
      vec3.cross(D, prevV2, v1)
      const v2 = vec3.create()
      vec3.cross(v2, v1, D)
      prevV2 = vec3.clone(prevV2)
      // the next line of code would create arbitrary v2 that might show twisting
      // v2 = NiivueObject3D.getFirstPerpVector(v1)
      // Get the second perp vector by cross product
      const v3 = vec3.create()
      vec3.cross(v3, v1, v2) // a unit length vector orthogonal to v1 and v2
      vec3.normalize(v3, v3)
      const vtxXYZ = vec3.create()
      for (let j = 0; j < cyl_sides; j++) {
        const c = Math.cos((j / cyl_sides) * 2 * Math.PI)
        const s = Math.sin((j / cyl_sides) * 2 * Math.PI)
        vtxXYZ[0] = radius * (c * v2[0] + s * v3[0])
        vtxXYZ[1] = radius * (c * v2[1] + s * v3[1])
        vtxXYZ[2] = radius * (c * v2[2] + s * v3[2])
        vec3.add(vtxXYZ, v4ToV3(currV4), vtxXYZ)
        const fidx = vtx * f32PerVertex
        f32[fidx + 0] = vtxXYZ[0]
        f32[fidx + 1] = vtxXYZ[1]
        f32[fidx + 2] = vtxXYZ[2]
        // compute normal
        const n3 = vec3.create()
        vec3.subtract(n3, vtxXYZ, v4ToV3(currV4))
        vec3.normalize(n3, n3)
        const fidxU8 = (fidx + 3) * 4 // 4 Uint8 per Float32
        u8[fidxU8 + 0] = n3[0] * 127
        u8[fidxU8 + 1] = n3[1] * 127
        u8[fidxU8 + 2] = n3[2] * 127
        // f32[fidx+3] = normal;
        f32[fidx + 4] = currV4[3]
        // u32[fidx+3] = 65555;
        // u32[fidx+4] = 65555;
        vtx++
      }
      prevV4 = vec4.clone(currV4)
      currV4 = vec4.clone(nextV4)
      if (isLineEnd) {
        node = 0
      }
    }
    // ntri = number of triangles
    // each cylinder is composed of 2 * cyl_sides (e.g. triangular cylinder is 6 triangles)
    // each streamline with n nodes has n-1 cylinders (fencepost)
    // each triangle defined by three indices, each referring to a vertex
    const nidx = (n_line_vtx - n_streamlines) * cyl_sides * 2 * 3
    const idxs = new Uint32Array(nidx)
    let idx = 0
    vtx = 0
    for (let i = 1; i < n_count; i++) {
      if (indices[i] === primitiveRestart) {
        vtx += cyl_sides
        continue
      }
      if (indices[i - 1] === primitiveRestart) {
        // fencepost: do not create indices for first node in each streamline
        continue
      }
      let prevStartVtx = vtx // startOfPreviousCylinder
      let startVtx = vtx + cyl_sides // startOfCurrentCylinder
      const prevStartVtxOverflow = startVtx // startOfCurrentCylinder
      const startVtxOverflow = startVtx + cyl_sides // startOfNextCylinder
      for (let j = 0; j < cyl_sides; j++) {
        // emit triangle with one vertex on previous
        idxs[idx++] = prevStartVtx
        idxs[idx++] = startVtx++
        if (startVtx === startVtxOverflow) {
          startVtx = startVtxOverflow - cyl_sides
        }
        idxs[idx++] = startVtx
        // emit triangle with two vertex on previous
        idxs[idx++] = prevStartVtx++
        if (prevStartVtx === prevStartVtxOverflow) {
          prevStartVtx = prevStartVtxOverflow - cyl_sides
        }
        idxs[idx++] = startVtx
        idxs[idx++] = prevStartVtx
      }
      vtx += cyl_sides
    }
    // copy index and vertex buffer to GPU
    // no need to release: https://registry.khronos.org/OpenGL-Refpages/gl4/html/glBufferData.xhtml
    // any pre-existing data store is deleted
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint32Array.from(idxs), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    // issue1129
    // gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(f32), gl.STATIC_DRAW)
    gl.bufferData(gl.ARRAY_BUFFER, u8, gl.STATIC_DRAW)
    this.indexCount = nidx
  } // linesToCylinders

  createFiberDensityMap(): void {
    // generate a fiber density map
    // the array fiberDensity has one element per vertex
    // this provides the normalized (0..1) neighboring vertices
    if (this.fiberDensity) {
      return
    }
    const pts = this.pts
    const npt = pts.length / 3 // each point has three components: X,Y,Z
    let maxExtentsRange = 0
    for (let i = 0; i < 3; i++) {
      const range = this.extentsMax[i] - this.extentsMin[i]
      maxExtentsRange = Math.max(maxExtentsRange, range)
    }
    this.fiberDensity = new Float32Array(npt)
    if (maxExtentsRange === 0) {
      return
    }
    // DSI-Studio counts vertex density per voxel
    // However, some tract formats do not store voxel dimensions
    // therefore, we will create a 3D volume of size bins*bins*bins
    const bins = 64
    const binWidth = maxExtentsRange / (bins - 1)
    const half = binWidth / 2
    const scale = (bins - 1) / maxExtentsRange
    let densityMap = new Float32Array(bins * bins * bins)
    const mn = [this.extentsMin[0] - half, this.extentsMin[1] - half, this.extentsMin[2] - half]
    // sum density map
    const xyz = [0, 0, 0]
    const prevVx = -1
    const binsXbins = bins * bins
    let j = 0
    for (let i = 0; i < npt; i++) {
      xyz[0] = Math.round((pts[j++] - mn[0]) * scale)
      xyz[1] = Math.round((pts[j++] - mn[1]) * scale)
      xyz[2] = Math.round((pts[j++] - mn[2]) * scale)
      const vx = xyz[0] + xyz[1] * bins + xyz[2] * binsXbins
      if (vx === prevVx) {
        // each streamline contributes once per voxel
        continue
      }
      densityMap[vx]++
    }
    function blur3D(vol: Float32Array, dim: number): Float32Array {
      // let raw = vol.slice()
      let raw = vol.slice()
      let v = -1
      const dim1 = dim - 1
      // blur in x
      for (let z = 0; z < dim; z++) {
        for (let y = 0; y < dim; y++) {
          for (let x = 0; x < dim; x++) {
            v++
            if (x < 1 || x >= dim1) {
              continue
            }
            vol[v] = raw[v - 1] + raw[v] + raw[v] + raw[v + 1]
          }
        }
      }
      // blur in y
      v = -1
      raw = vol.slice()
      for (let z = 0; z < dim; z++) {
        for (let y = 0; y < dim; y++) {
          for (let x = 0; x < dim; x++) {
            v++
            if (y < 1 || y >= dim1) {
              continue
            }
            vol[v] = raw[v - dim] + raw[v] + raw[v] + raw[v + dim]
          }
        }
      }
      // blur in z
      const dimXdim = dim * dim
      v = -1
      raw = vol.slice()
      for (let z = 0; z < dim; z++) {
        for (let y = 0; y < dim; y++) {
          for (let x = 0; x < dim; x++) {
            v++
            if (z < 1 || z >= dim1) {
              continue
            }
            vol[v] = raw[v - dimXdim] + raw[v] + raw[v] + raw[dimXdim]
          }
        }
      }
      return vol
    }
    densityMap = blur3D(densityMap, bins)
    densityMap = blur3D(densityMap, bins)
    // let raw = densityMap.slice()
    let mx = 0
    let mn0 = Infinity
    const binsXbinsXbins = bins * bins * bins
    for (let i = 0; i < binsXbinsXbins; i++) {
      if (densityMap[i] <= 0) {
        continue
      }
      mx = Math.max(mx, densityMap[i])
      mn0 = Math.min(mn0, densityMap[i])
    }
    // console.log('Maximum streamlines in a voxel:', mx, mn0)
    if (mx <= 1 || mx <= mn0) {
      // no neighbors: no ambient occlusion
      return
    }
    j = 0
    for (let i = 0; i < binsXbinsXbins; i++) {
      // least occluded vertices should have no occlusion
      densityMap[i] = Math.max(0, densityMap[i] - mn0)
    }
    mx -= mn0
    for (let i = 0; i < npt; i++) {
      xyz[0] = Math.round((pts[j++] - mn[0]) * scale)
      xyz[1] = Math.round((pts[j++] - mn[1]) * scale)
      xyz[2] = Math.round((pts[j++] - mn[2]) * scale)
      const vx = xyz[0] + xyz[1] * bins + xyz[2] * binsXbins
      this.fiberDensity[i] = densityMap[vx] / mx
    }
  }

  // not included in public docs
  // internal function filters tractogram to identify which color and visibility of streamlines
  updateFibers(gl: WebGL2RenderingContext): void {
    if (!this.offsetPt0 || !this.fiberLength) {
      return
    }
    const pts = this.pts
    const offsetPt0 = this.offsetPt0
    const n_count = offsetPt0.length - 1
    const npt = pts.length / 3 // each point has three components: X,Y,Z
    // only once: compute length of each streamline
    if (!this.fiberLengths) {
      this.fiberLengths = new Uint32Array(n_count)
      for (let i = 0; i < n_count; i++) {
        // for each streamline
        const vStart3 = offsetPt0[i] * 3 // first vertex in streamline
        const vEnd3 = (offsetPt0[i + 1] - 1) * 3 // last vertex in streamline
        let len = 0
        for (let j = vStart3; j < vEnd3; j += 3) {
          const v = vec3.fromValues(pts[j + 0] - pts[j + 3], pts[j + 1] - pts[j + 4], pts[j + 2] - pts[j + 5])
          len += vec3.len(v)
        }
        this.fiberLengths[i] = len
      }
    } // only once: compute length of each streamline
    // determine fiber colors
    // Each streamline vertex has color and position attributes
    // Interleaved Vertex Data https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/TechniquesforWorkingwithVertexData/TechniquesforWorkingwithVertexData.html
    const posClrF32 = new Float32Array(npt * 4) // four 32-bit components X,Y,Z,C
    const posClrU32 = new Uint32Array(posClrF32.buffer) // typecast of our X,Y,Z,C array
    // fill XYZ position of XYZC array
    let i3 = 0
    let i4 = 0
    for (let i = 0; i < npt; i++) {
      posClrF32[i4 + 0] = pts[i3 + 0]
      posClrF32[i4 + 1] = pts[i3 + 1]
      posClrF32[i4 + 2] = pts[i3 + 2]
      i3 += 3
      i4 += 4
    }
    // fill fiber Color
    const dither = this.fiberDither
    const ditherHalf = dither * 0.5
    function rgb2int32(r: number, g: number, b: number): number {
      const ditherFrac = dither * Math.random()
      const d = 255.0 * (ditherFrac - ditherHalf)
      r = Math.max(Math.min(r + d, 255.0), 0.0)
      g = Math.max(Math.min(g + d, 255.0), 0.0)
      b = Math.max(Math.min(b + d, 255.0), 0.0)
      return r + (g << 8) + (b << 16)
    }
    function direction2rgb(
      x1: number,
      y1: number,
      z1: number,
      x2: number,
      y2: number,
      z2: number,
      ditherFrac: number
    ): number {
      // generate color based on direction between two 3D spatial positions
      const v = vec3.fromValues(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2))
      vec3.normalize(v, v)
      const r = ditherFrac - ditherHalf
      for (let j = 0; j < 3; j++) {
        v[j] = 255 * Math.max(Math.min(Math.abs(v[j]) + r, 1.0), 0.0)
      }
      return v[0] + (v[1] << 8) + (v[2] << 16)
    } // direction2rgb()
    // Determine color: local, global, dps0, dpv0, etc.
    const fiberColor = this.fiberColor.toLowerCase()
    let dps: Float32Array | null = null
    let dpv: ValuesArray[0] | null = null
    if (fiberColor.startsWith('dps') && this.dps && this.dps.length > 0) {
      const n = parseInt(fiberColor.substring(3))
      if (n < this.dps.length && this.dps[n].vals.length === n_count) {
        dps = this.dps[n].vals
      }
    }
    if (fiberColor.startsWith('dpv') && this.dpv && this.dpv.length > 0) {
      const n = parseInt(fiberColor.substring(3))
      if (n < this.dpv.length && this.dpv[n].vals.length === npt) {
        dpv = this.dpv[n]
      }
    }
    const streamlineVisible = new Int16Array(n_count)
    // if ((this.dpg !== null) && (this.fiberGroupMask !== null) && (this.fiberGroupMask.length === this.dpg.length)) {
    if (this.dpg && this.fiberGroupColormap !== null) {
      const lut = new Uint8ClampedArray(this.dpg.length * 4) // 4 component RGBA for each group
      const groupVisible = new Array(this.dpg.length).fill(false)
      const cmap = this.fiberGroupColormap
      if (cmap.A === undefined) {
        cmap.A = Array.from(new Uint8ClampedArray(cmap.I.length).fill(255))
      }
      for (let i = 0; i < cmap.I.length; i++) {
        let idx = cmap.I[i]
        if (idx < 0 || idx >= this.dpg.length) {
          continue
        }
        if (cmap.A[i] < 1) {
          continue
        }
        groupVisible[idx] = true
        idx *= 4
        lut[idx] = cmap.R[i]
        lut[idx + 1] = cmap.G[i]
        lut[idx + 2] = cmap.B[i]
        lut[idx + 3] = 255 // opaque
      }
      streamlineVisible.fill(-1) // -1 assume streamline not visible
      for (let i = 0; i < this.dpg.length; i++) {
        if (!groupVisible[i]) {
          continue
        } // this group is not visible
        for (let v = 0; v < this.dpg[i].vals.length; v++) {
          streamlineVisible[this.dpg[i].vals[v]] = i
        }
      }
      for (let i = 0; i < n_count; i++) {
        if (streamlineVisible[i] < 0) {
          continue
        } // hidden
        const color = (streamlineVisible[i] % 256) * 4
        // let RGBA = lut[color] + (lut[color + 1] << 8) + (lut[color + 2] << 16);
        const RGBA = rgb2int32(lut[color], lut[color + 1], lut[color + 2])
        const vStart = offsetPt0[i] // first vertex in streamline
        const vEnd = offsetPt0[i + 1] - 1 // last vertex in streamline
        const vStart4 = vStart * 4 + 3 // +3: fill 4th component colors: XYZC = 0123
        const vEnd4 = vEnd * 4 + 3
        for (let j = vStart4; j <= vEnd4; j += 4) {
          posClrU32[j] = RGBA
        }
      }
    } else if (dpv) {
      // color per vertex
      const lut = cmapper.colormap(this.colormap as string, this.colormapInvert)
      const mn = dpv.cal_min
      const mx = dpv.cal_max
      let v4 = 3 // +3: fill 4th component colors: XYZC = 0123
      for (let i = 0; i < npt; i++) {
        let color = Math.min(Math.max((dpv.vals[i] - mn!) / (mx! - mn!), 0), 1)
        color = Math.round(Math.max(Math.min(255, color * 255))) * 4
        const RGBA = lut[color] + (lut[color + 1] << 8) + (lut[color + 2] << 16)
        posClrU32[v4] = RGBA
        v4 += 4
      }
    } else if (dps) {
      // color per streamline
      const lut = cmapper.colormap(this.colormap as string, this.colormapInvert)
      let mn = dps[0]
      let mx = dps[0]
      for (let i = 0; i < n_count; i++) {
        mn = Math.min(mn, dps[i])
        mx = Math.max(mx, dps[i])
      }
      if (mx === mn) {
        mn -= 1
      } // avoid divide by zero
      for (let i = 0; i < n_count; i++) {
        let color = (dps[i] - mn) / (mx - mn)
        color = Math.round(Math.max(Math.min(255, color * 255))) * 4
        const RGBA = lut[color] + (lut[color + 1] << 8) + (lut[color + 2] << 16)
        const vStart = offsetPt0[i] // first vertex in streamline
        const vEnd = offsetPt0[i + 1] - 1 // last vertex in streamline
        const vStart4 = vStart * 4 + 3 // +3: fill 4th component colors: XYZC = 0123
        const vEnd4 = vEnd * 4 + 3
        for (let j = vStart4; j <= vEnd4; j += 4) {
          posClrU32[j] = RGBA
        }
      }
    } else if (fiberColor.includes('fixed')) {
      if (dither === 0.0) {
        const RGBA = this.rgba255[0] + (this.rgba255[1] << 8) + (this.rgba255[2] << 16)
        let v4 = 3 // +3: fill 4th component colors: XYZC = 0123
        for (let i = 0; i < npt; i++) {
          posClrU32[v4] = RGBA
          v4 += 4
        }
      } else {
        for (let i = 0; i < n_count; i++) {
          const RGBA = rgb2int32(this.rgba255[0], this.rgba255[1], this.rgba255[2])
          const vStart = offsetPt0[i] // first vertex in streamline
          const vEnd = offsetPt0[i + 1] - 1 // last vertex in streamline
          const vStart4 = vStart * 4 + 3 // +3: fill 4th component colors: XYZC = 0123
          const vEnd4 = vEnd * 4 + 3
          for (let j = vStart4; j <= vEnd4; j += 4) {
            posClrU32[j] = RGBA
          }
        }
      } // else fixed with dither
    } else if (fiberColor.includes('local')) {
      for (let i = 0; i < n_count; i++) {
        // for each streamline
        const vStart = offsetPt0[i] // first vertex in streamline
        const vEnd = offsetPt0[i + 1] - 1 // last vertex in streamline
        let v3 = vStart * 3 // pts have 3 components XYZ
        const vEnd3 = vEnd * 3
        const ditherFrac = dither * Math.random() // same dither amount throughout line
        // for first point, we do not have a prior sample
        let RGBA = direction2rgb(pts[v3], pts[v3 + 1], pts[v3 + 2], pts[v3 + 4], pts[v3 + 5], pts[v3 + 6], ditherFrac)
        let v4 = vStart * 4 + 3 // +3: fill 4th component colors: XYZC = 0123
        while (v3 < vEnd3) {
          posClrU32[v4] = RGBA
          v4 += 4 // stride is 4 32-bit values: float32 XYZ and 32-bit rgba
          v3 += 3 // read next vertex
          // direction estimated based on previous and next vertex
          RGBA = direction2rgb(pts[v3 - 3], pts[v3 - 2], pts[v3 - 1], pts[v3 + 3], pts[v3 + 4], pts[v3 + 5], ditherFrac)
        }
        posClrU32[v4] = posClrU32[v4 - 4]
      }
    } else {
      // if color is local direction, else global
      for (let i = 0; i < n_count; i++) {
        // for each streamline
        const vStart = offsetPt0[i] // first vertex in streamline
        const vEnd = offsetPt0[i + 1] - 1 // last vertex in streamline
        const vStart3 = vStart * 3 // pts have 3 components XYZ
        const vEnd3 = vEnd * 3
        const RGBA = direction2rgb(
          pts[vStart3],
          pts[vStart3 + 1],
          pts[vStart3 + 2],
          pts[vEnd3],
          pts[vEnd3 + 1],
          pts[vEnd3 + 2],
          dither * Math.random()
        )
        const vStart4 = vStart * 4 + 3 // +3: fill 4th component colors: XYZC = 0123
        const vEnd4 = vEnd * 4 + 3
        for (let j = vStart4; j <= vEnd4; j += 4) {
          posClrU32[j] = RGBA
        }
      }
    }
    // SHADING: ambient occlusion
    if (this.fiberOcclusion > 0) {
      this.createFiberDensityMap()
      function shadeRGBA(rgba: number, frac: number): number {
        const r = frac * (rgba & 0xff)
        const g = frac * ((rgba >> 8) & 0xff)
        const b = frac * ((rgba >> 16) & 0xff)
        return r + (g << 8) + (b << 16)
      }
      for (let i = 0; i < n_count; i++) {
        // for each streamline
        const vStart = offsetPt0[i] // first vertex in streamline
        const vEnd = offsetPt0[i + 1] - 1 // last vertex in streamline
        const vStart4 = vStart * 4 + 3 // +3: fill 4th component colors: XYZC = 0123
        const vEnd4 = vEnd * 4 + 3
        let vtx = vStart
        const bias = Math.min(this.fiberOcclusion, 0.99)
        for (let j = vStart4; j <= vEnd4; j += 4) {
          let shade = this.fiberDensity[vtx++]
          if (shade <= 0) {
            continue
          }
          // Schlick's fast bias function
          // https://github.com/ayamflow/schlick-curve
          shade = shade / ((1.0 / bias - 2.0) * (1.0 - shade) + 1.0)
          const frac = 1 - Math.min(shade, 0.9)
          // console.log(shade, frac)
          let RGBA = posClrU32[j]
          RGBA = shadeRGBA(RGBA, frac)
          posClrU32[j] = RGBA
        }
      }
    }
    // INDICES:
    const min_mm = this.fiberLength
    //  https://blog.spacepatroldelta.com/a?ID=00950-d878555f-a97a-4e32-9f40-fd9a449cb4fe
    const primitiveRestart = Math.pow(2, 32) - 1 // for gl.UNSIGNED_INT
    const indices: number[] = []
    let stride = -1
    for (let i = 0; i < n_count; i++) {
      // let n_pts = offsetPt0[i + 1] - offsetPt0[i]; //if streamline0 starts at point 0 and streamline1 at point 4, then streamline0 has 4 points: 0,1,2,3
      if (streamlineVisible[i] < 0) {
        continue
      }
      if (this.fiberLengths[i] < min_mm) {
        continue
      }
      stride++
      if (stride % this.fiberDecimationStride !== 0) {
        continue
      } // e.g. if stride is 2 then half culled
      for (let j = offsetPt0[i]; j < offsetPt0[i + 1]; j++) {
        indices.push(j)
      }
      indices.push(primitiveRestart)
    }
    if (this.fiberSides > 2 && this.fiberRadius > 0) {
      this.linesToCylinders(gl, posClrF32, indices)
    } else {
      // copy streamlines to GPU
      this.indexCount = indices.length
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, Uint32Array.from(posClrU32), gl.STATIC_DRAW)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint32Array.from(indices), gl.STATIC_DRAW)
    }
  } // updateFibers()

  // given X,Y,Z coordinates in world space, return index of nearest vertex as well as
  // the distance of this closest vertex to the coordinates
  indexNearestXYZmm(Xmm: number, Ymm: number, Zmm: number): number[] {
    const pts = this.pts
    const nvtx = this.pts.length / 3
    let i = 0
    let mnDx = Infinity
    let mnIdx = 0
    for (let j = 0; j < nvtx; j++) {
      const dx = Math.pow(pts[i] - Xmm, 2) + Math.pow(pts[i + 1] - Ymm, 2) + Math.pow(pts[i + 2] - Zmm, 2)
      if (dx < mnDx) {
        mnDx = dx
        mnIdx = j
      }
      i += 3
    }
    // Pythagorean theorem sqrt(x^2+y^2+z^2)
    // only calculate sqrt once
    mnDx = Math.sqrt(mnDx)
    return [mnIdx, mnDx]
  } // indexNearestXYZmm()

  // internal function discards GPU resources
  unloadMesh(gl: WebGL2RenderingContext): void {
    // free WebGL resources
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
    gl.deleteBuffer(this.vertexBuffer)
    gl.deleteBuffer(this.indexBuffer)
    gl.deleteVertexArray(this.vao)
    gl.deleteVertexArray(this.vaoFiber)
    // presumably, if we null the mesh we dereference all the arrays, or do we have to explicitly null arrays
    this.offsetPt0 = null
    this.tris = null
    this.pts = null
    if (this.layers && this.layers.length > 0) {
      for (let i = 0; i < this.layers.length; i++) {
        this.layers[i].values = null
      }
    }
    if (this.dpg && this.dpg.length > 0) {
      for (let i = 0; i < this.dpg.length; i++) {
        this.dpg[i].vals = null
      }
    }
    if (this.dps && this.dps.length > 0) {
      for (let i = 0; i < this.dps.length; i++) {
        this.dps[i].vals = null
      }
    }
  }

  // apply color lookup table to convert scalar array to RGBA array
  scalars2RGBA(
    rgba: Uint8ClampedArray,
    layer: NVMeshLayer,
    scalars: AnyNumberArray,
    isNegativeCmap: boolean = false
  ): Uint8ClampedArray {
    const nValues = scalars.length
    if (4 * nValues < rgba.length) {
      log.error(`colormap2RGBA incorrectly specified ${nValues}*4 != ${rgba.length}`)
      return rgba
    }
    const opa255 = Math.round(layer.opacity * 255)
    let mn = layer.cal_min
    let mx = layer.cal_max
    let lut = cmapper.colormap(layer.colormap as string, this.colormapInvert)
    let flip = 1
    if (isNegativeCmap) {
      if (!layer.useNegativeCmap) {
        return rgba
      }
      flip = -1
      lut = cmapper.colormap(layer.colormapNegative, layer.colormapInvert)
      mn = layer.cal_min
      mx = layer.cal_max
      if (isFinite(layer.cal_minNeg) && isFinite(layer.cal_minNeg)) {
        mn = -layer.cal_minNeg
        mx = -layer.cal_maxNeg
      }
    }
    let mnCal = mn
    if (!layer.isTransparentBelowCalMin) {
      mnCal = Number.NEGATIVE_INFINITY
    }
    const isTranslucentBelowMin = layer.colormapType === COLORMAP_TYPE.ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN

    if (layer.colormapType !== COLORMAP_TYPE.MIN_TO_MAX) {
      mn = Math.min(mn, 0.0)
    }
    const scale255 = 255.0 / (mx - mn)
    for (let j = 0; j < nValues; j++) {
      let v = scalars[j] * flip
      if (isNaN(v)) {
        continue
      }
      let opa = opa255
      if (v < mnCal) {
        if (v > 0 && isTranslucentBelowMin) {
          opa = Math.round(layer.opacity * 255 * Math.pow(v / mnCal, 2.0))
        } else {
          continue
        }
      }
      v = (v - mn) * scale255
      if (v < 0 && layer.isTransparentBelowCalMin) {
        continue
      }
      v = Math.min(255, Math.max(0, Math.round(v))) * 4
      const idx = j * 4
      rgba[idx + 0] = lut[v + 0]
      rgba[idx + 1] = lut[v + 1]
      rgba[idx + 2] = lut[v + 2]
      rgba[idx + 3] = opa
    }
    return rgba
  }

  blendColormap(
    u8: Uint8Array,
    additiveRGBA: Uint8Array,
    layer: NVMeshLayer,
    mn: number,
    mx: number,
    lut: Uint8ClampedArray,
    invert: boolean = false
  ): void {
    const nvtx = this.pts.length / 3
    const opacity = Math.min(layer.opacity, 1.0)
    function lerp(x: number, y: number, a: number): number {
      // https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/mix.xhtml
      return x * (1 - a) + y * a
    }
    function additiveBlend(x: number, y: number): number {
      return Math.min(x + y, 255.0)
    }
    const scaleFlip = invert ? -1 : 1
    const frame = Math.min(Math.max(layer.frame4D, 0), layer.nFrame4D - 1)
    const frameOffset = nvtx * frame
    let mnCal = mn
    if (!layer.isTransparentBelowCalMin) {
      mnCal = Number.NEGATIVE_INFINITY
    }
    if (layer.colormapType !== COLORMAP_TYPE.MIN_TO_MAX) {
      mn = Math.min(mn, 0.0)
    }
    const scale255 = 255.0 / (mx - mn)
    // create border map for optional outline
    let borders = new Array(nvtx).fill(false)
    if (layer.outlineBorder !== 0.0) {
      const v255s = new Uint8Array(nvtx).fill(0)
      for (let j = 0; j < nvtx; j++) {
        const v = scaleFlip * layer.values[j + frameOffset]
        if (v >= mnCal) {
          v255s[j] = 1
        }
      }
      borders = NVMeshUtilities.getClusterBoundaryU8(v255s, this.tris)
      for (let j = 0; j < nvtx; j++) {
        const v = scaleFlip * layer.values[j + frameOffset]
        if (v < mnCal) {
          borders[j] = false
        }
      }
    }
    // create lookup table for translucency
    const alphas = new Float32Array(256).fill(opacity)
    if (mnCal > mn && layer.colormapType === COLORMAP_TYPE.ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN) {
      let minOpaque = Math.round((mnCal - mn) * scale255)
      minOpaque = Math.max(minOpaque, 1)
      for (let j = 1; j < minOpaque; j++) {
        alphas[j] = opacity * Math.pow(j / minOpaque, 2.0)
      }
      alphas[0] = 0
      mnCal = mn + Number.EPSILON
    }
    for (let j = 0; j < nvtx; j++) {
      const v = scaleFlip * layer.values[j + frameOffset]
      if (v < mnCal) {
        continue
      }
      let v255 = Math.round((v - mn) * scale255)
      if (v255 < 0 && layer.isTransparentBelowCalMin) {
        continue
      }
      v255 = Math.max(0.0, v255)
      v255 = Math.min(255.0, v255)
      let opa = alphas[v255]
      v255 *= 4
      let vtx = j * 28 + 24 // posNormClr is 28 bytes stride, RGBA color at offset 24,
      if (this.f32PerVertex !== 7) {
        vtx = j * 20 + 16
      }
      if (layer.isAdditiveBlend) {
        const j4 = j * 4
        // sum red, green and blue layers
        additiveRGBA[j4 + 0] = additiveBlend(additiveRGBA[j4 + 0], lut[v255 + 0])
        additiveRGBA[j4 + 1] = additiveBlend(additiveRGBA[j4 + 1], lut[v255 + 1])
        additiveRGBA[j4 + 2] = additiveBlend(additiveRGBA[j4 + 2], lut[v255 + 2])
        additiveRGBA[j4 + 3] = additiveBlend(additiveRGBA[j4 + 3], 255.0)
      } else {
        if (borders[j]) {
          opa = layer.outlineBorder
          if (layer.outlineBorder < 0) {
            u8[vtx + 0] = 0
            u8[vtx + 1] = 0
            u8[vtx + 2] = 0
            continue
          }
        }
        u8[vtx + 0] = lerp(u8[vtx + 0], lut[v255 + 0], opa)
        u8[vtx + 1] = lerp(u8[vtx + 1], lut[v255 + 1], opa)
        u8[vtx + 2] = lerp(u8[vtx + 2], lut[v255 + 2], opa)
      }
    }
  } // blendColormap()

  // internal function filters mesh to identify which color of triangulated mesh vertices
  updateMesh(gl: WebGL2RenderingContext): void {
    if (this.offsetPt0) {
      this.updateFibers(gl)
      return // fiber not mesh
    }
    if (this.hasConnectome) {
      // this.updateConnectome(gl)
      return // connectome not mesh
    }
    if (!this.pts || !this.tris || !this.rgba255) {
      log.warn('underspecified mesh')
      return
    }
    function lerp(x: number, y: number, a: number): number {
      // https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/mix.xhtml
      return x * (1 - a) + y * a
    }
    const posNormClr = this.generatePosNormClr(this.pts, this.tris, this.rgba255)
    const nvtx = this.pts.length / 3
    const u8 = new Uint8Array(posNormClr.buffer) // Each vertex has 7 components: PositionXYZ, NormalXYZ, RGBA32
    // create emission values
    // let posNormClrEmission = posNormClr.slice();
    let maxAdditiveBlend = 0
    const additiveRGBA = new Uint8Array(nvtx * 4) // emission
    let tris = this.tris
    if (this.layers && this.layers.length > 0) {
      for (let i = 0; i < this.layers.length; i++) {
        const layer = this.layers[i]
        const opacity = layer.opacity
        if (opacity <= 0.0 || layer.cal_min > layer.cal_max) {
          continue
        }
        if (layer.outlineBorder === undefined) {
          layer.outlineBorder = 0
        }
        if (layer.isAdditiveBlend === undefined) {
          layer.isAdditiveBlend = false
        }
        // build a label colormap
        if (layer.colormapLabel && (layer.colormapLabel as ColorMap).R && !(layer.colormapLabel as LUT).lut) {
          // convert colormap JSON to RGBA LUT
          layer.colormapLabel = cmapper.makeLabelLut(layer.colormapLabel as ColorMap)
        }
        if (layer.colormapLabel && (layer.colormapLabel as LUT).lut) {
          const colormapLabel = layer.colormapLabel as LUT
          let minv = 0
          if (layer.colormapLabel.min) {
            minv = layer.colormapLabel.min
          }
          let lut = colormapLabel.lut
          const opa255 = Math.round(layer.opacity * 255)
          if (lut[3] > 0) {
            lut[3] = opa255
          }
          for (let j = 7; j < lut.length; j += 4) {
            lut[j] = opa255
          }
          const nLabel = Math.floor(lut.length / 4)
          if (layer.atlasValues && nLabel > 0 && nLabel === layer.atlasValues.length && layer.colormap) {
            const atlasValues = layer.atlasValues
            let hasNaN = false
            let onlyNaN = true
            for (let j = 0; j < nLabel; j++) {
              if (isNaN(atlasValues[j])) {
                hasNaN = true
              } else {
                onlyNaN = false
              }
            }
            if (onlyNaN) {
              log.debug(`invisible mesh: all atlasValues are NaN.`)
              return
            }
            if (hasNaN) {
              log.debug(`some vertices have NaN atlasValues (mesh will be decimated).`)
              // First: identify all vertices mapped to NaN
              const nanVtxs = new Array(nvtx).fill(false)
              for (let j = 0; j < nvtx; j++) {
                const v = Math.round(layer.values[j]) - minv
                if (isNaN(atlasValues[v])) {
                  nanVtxs[j] = true
                }
              }

              // next: find all triangle indices that have NaN vertices
              const nanIdxs = new Array(tris.length).fill(false)
              for (let j = 0; j < tris.length; j++) {
                if (nanVtxs[tris[j]]) {
                  nanIdxs[j] = true
                }
              }
              // each triangle has 3 indices
              const trisIn = this.tris
              let nTriOK = 0
              for (let j = 0; j < trisIn.length; j += 3) {
                if (!nanIdxs[j] && !nanIdxs[j + 1] && !nanIdxs[j + 2]) {
                  nTriOK++
                }
              }
              if (nTriOK === 0) {
                log.debug(`invisible mesh: all triangles of a vertex with a NaN atlasValue.`)
              }
              tris = new Uint32Array(nTriOK * 3)
              let k = 0
              for (let j = 0; j < trisIn.length; j += 3) {
                if (!nanIdxs[j] && !nanIdxs[j + 1] && !nanIdxs[j + 2]) {
                  tris[k++] = trisIn[j]
                  tris[k++] = trisIn[j + 1]
                  tris[k++] = trisIn[j + 2]
                }
              }
            }
            lut.fill(0) // make all transparent
            lut = this.scalars2RGBA(lut, layer, atlasValues)
            if (layer.useNegativeCmap) {
              lut = this.scalars2RGBA(lut, layer, atlasValues, true)
            }
          } else if (layer.atlasValues) {
            log.warn(`Expected ${nLabel} atlasValues but got ${layer.atlasValues.length} for mesh layer`)
          }
          // create labels for legend
          if (layer.showLegend && nLabel === layer.colormapLabel.labels.length) {
            layer.labels = []
            for (let j = 0; j < nLabel; j++) {
              const rgba = Array.from(lut.slice(j * 4, j * 4 + 4)).map((v) => v / 255)
              const labelName = layer.colormapLabel.labels[j]
              // xyzMM is the center of mass for the label
              // For folded cortical regions, this point often lies within the volume
              const xyzMM = [0, 0, 0]
              let count = 0
              for (let i = 0; i < nvtx; i++) {
                if (layer.values[i] === j) {
                  const idx = i * 3
                  xyzMM[0] += this.pts[idx]
                  xyzMM[1] += this.pts[idx + 1]
                  xyzMM[2] += this.pts[idx + 2]
                  count++
                }
              }
              if (count > 0) {
                xyzMM[0] /= count
                xyzMM[1] /= count
                xyzMM[2] /= count
              }
              if (
                rgba[3] === 0 ||
                !labelName || // handles empty string, null, undefined
                labelName.startsWith('_')
              ) {
                continue
              }
              rgba[3] = 1
              const label = new NVLabel3D(
                labelName,
                {
                  textColor: rgba,
                  bulletScale: 1,
                  bulletColor: rgba,
                  lineWidth: 0,
                  lineColor: rgba,
                  textScale: 1.0,
                  textAlignment: LabelTextAlignment.LEFT,
                  lineTerminator: LabelLineTerminator.NONE
                },
                xyzMM
              )
              layer.labels.push(label)
              log.debug('label for mesh layer:', label)
            } // for each label
          } else {
            delete layer.labels
          }
          const frame = Math.min(Math.max(layer.frame4D, 0), layer.nFrame4D - 1)
          const frameOffset = nvtx * frame
          const rgba8 = new Uint8Array(nvtx * 4)
          let k = 0
          for (let j = 0; j < nvtx; j++) {
            // eslint-disable-next-line
            const v = layer.values[j + frameOffset] - minv
            const idx = 4 * Math.min(Math.max(v, 0), nLabel - 1)
            rgba8[k + 0] = lut[idx + 0]
            rgba8[k + 1] = lut[idx + 1]
            rgba8[k + 2] = lut[idx + 2]
            rgba8[k + 3] = lut[idx + 3]
            k += 4
          }
          let opaque = new Array(nvtx).fill(false)
          if (layer.outlineBorder !== 0.0) {
            opaque = NVMeshUtilities.getClusterBoundary(rgba8, this.tris)
          }
          k = 0
          for (let j = 0; j < nvtx; j++) {
            let vtx = j * 28 + 24 // posNormClr is 28 bytes stride, RGBA color at offset 24,
            if (this.f32PerVertex !== 7) {
              vtx = j * 20 + 16
            }
            let opa = rgba8[k + 3] / 255
            if (opaque[j]) {
              opa = layer.outlineBorder
              if (layer.outlineBorder < 0) {
                u8[vtx + 0] = 0
                u8[vtx + 1] = 0
                u8[vtx + 2] = 0
                k += 4
                continue
              }
            }
            u8[vtx + 0] = lerp(u8[vtx + 0], rgba8[k + 0], opa)
            u8[vtx + 1] = lerp(u8[vtx + 1], rgba8[k + 1], opa)
            u8[vtx + 2] = lerp(u8[vtx + 2], rgba8[k + 2], opa)
            k += 4
          } // for each vertex
          continue
        } // if colormapLabel
        if (layer.values instanceof Uint8Array) {
          const rgba8 = new Uint8Array(layer.values.buffer)
          let opaque = new Array(nvtx).fill(true)
          if (layer.outlineBorder !== 0) {
            opaque = NVMeshUtilities.getClusterBoundary(rgba8, this.tris)
          }
          let k = 0
          for (let j = 0; j < layer.values.length; j++) {
            let vtx = j * 28 + 24 // posNormClr is 28 bytes stride, RGBA color at offset 24,
            if (this.f32PerVertex !== 7) {
              vtx = j * 20 + 16
            }
            let opa = opacity
            if (opaque[j]) {
              opa = layer.outlineBorder
              if (layer.outlineBorder < 0) {
                u8[vtx + 0] = 0
                u8[vtx + 1] = 0
                u8[vtx + 2] = 0
                k += 4
                continue
              }
            }
            u8[vtx + 0] = lerp(u8[vtx + 0], rgba8[k + 0], opa)
            u8[vtx + 1] = lerp(u8[vtx + 1], rgba8[k + 1], opa)
            u8[vtx + 2] = lerp(u8[vtx + 2], rgba8[k + 2], opa)
            k += 4
          }
          continue
        }
        if (layer.useNegativeCmap) {
          layer.cal_min = Math.max(Number.EPSILON, layer.cal_min)
          layer.cal_max = Math.max(layer.cal_min + 0.000001, layer.cal_max)
        }
        if (layer.isTransparentBelowCalMin === undefined) {
          layer.isTransparentBelowCalMin = true
        }
        const lut = cmapper.colormap(layer.colormap, layer.colormapInvert)
        if (layer.isAdditiveBlend) {
          maxAdditiveBlend++
        }
        this.blendColormap(u8, additiveRGBA, layer, layer.cal_min, layer.cal_max, lut)
        if (layer.useNegativeCmap) {
          const neglut = cmapper.colormap(layer.colormapNegative, layer.colormapInvert)
          let mn = layer.cal_min
          let mx = layer.cal_max
          if (isFinite(layer.cal_minNeg) && isFinite(layer.cal_minNeg)) {
            mn = -layer.cal_minNeg
            mx = -layer.cal_maxNeg
          }
          this.blendColormap(u8, additiveRGBA, layer, mn, mx, neglut, true)
        }
      }
    }
    if (maxAdditiveBlend > 0) {
      for (let j = 0; j < nvtx; j++) {
        let vtx = j * 28 + 24 // posNormClr is 28 bytes stride, RGBA color at offset 24,
        if (this.f32PerVertex !== 7) {
          vtx = j * 20 + 16
        }
        const v = j * 4 // additiveRGBA is 4 bytes stride, RGBA color at offset 0,
        const opacity = Math.min(maxAdditiveBlend, additiveRGBA[v + 3] / 255)
        if (opacity <= 0) {
          continue
        }
        function modulate(x: number, y: number): number {
          return Math.min(x * y * (1 / 255), 255.0)
        }
        u8[vtx + 0] = modulate(u8[vtx + 0], additiveRGBA[v + 0])
        u8[vtx + 1] = modulate(u8[vtx + 1], additiveRGBA[v + 1])
        u8[vtx + 2] = modulate(u8[vtx + 2], additiveRGBA[v + 2])
        u8[vtx + 0] = lerp(u8[vtx + 0], additiveRGBA[v + 0], opacity)
        u8[vtx + 1] = lerp(u8[vtx + 1], additiveRGBA[v + 1], opacity)
        u8[vtx + 2] = lerp(u8[vtx + 2], additiveRGBA[v + 2], opacity)
      }
    } // isAdditiveBlend
    // generate webGL buffers and vao
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint32Array.from(tris), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    // issue1129
    // gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(posNormClr), gl.STATIC_DRAW)
    gl.bufferData(gl.ARRAY_BUFFER, u8, gl.STATIC_DRAW)
    this.indexCount = tris.length
    this.vertexCount = this.pts.length
  } // updateMesh()

  // internal function filters mesh to identify which color of triangulated mesh vertices
  reverseFaces(gl: WebGL2RenderingContext): void {
    if (this.offsetPt0) {
      return
    } // fiber not mesh
    if (this.hasConnectome) {
      return
    } // connectome not mesh
    const tris = this.tris || [] // TODO tris should probably be assigned in the constructor
    for (let j = 0; j < tris.length; j += 3) {
      const tri = tris[j]
      tris[j] = tris[j + 1]
      tris[j + 1] = tri
    }
    this.updateMesh(gl) // apply the new properties...
  }

  hierarchicalOrder(): number {
    const V0 = 12
    const F0 = 20
    const nF = this.tris.length / 3
    const order = Math.log(nF / F0) / Math.log(4)
    // Sanity checks
    if (nF !== Math.pow(4, order) * F0) {
      return NaN
    }
    const nV = this.pts.length / 3
    if (nV !== Math.pow(4, order) * (V0 - 2) + 2) {
      return NaN
    }
    // next checks are in case FreeSurfer was optimized with more local face indices
    // for an example see BrainMesh_ICBM152.lh.mz3
    for (let i = 0; i < 15; i += 3) {
      if (this.tris[i] !== 0) {
        return NaN
      }
    }
    for (let i = 15; i < 24; i += 3) {
      if (this.tris[i] !== 3) {
        return NaN
      }
    }
    for (let i = 24; i < 30; i += 3) {
      if (this.tris[i] !== 4) {
        return NaN
      }
    }
    return order
  }

  decimateFaces(n: number, ntarget: number): void {
    let fac = this.tris
    // Constants for the icosahedron
    const V0 = 12
    const F0 = 20
    for (let j = n - 1; j >= ntarget; j--) {
      const nVjprev = Math.pow(4, j + 1) * (V0 - 2) + 2
      const nVj = Math.pow(4, j) * (V0 - 2) + 2
      const nFjprev = fac.length / 3 // = 4^(j+1)*F0
      const nFj = Math.pow(4, j) * F0

      console.log(`order ${j + 1} -> ${j} vertices ${nVjprev} -> ${nVj} faces ${nFjprev} -> ${nFj}`)

      const remap = Array.from({ length: nVjprev }, (_, i) => i + 1)

      for (let i = 0; i < nFjprev; i++) {
        const v1 = fac[3 * i]
        const v2 = fac[3 * i + 1]
        const v3 = fac[3 * i + 2]
        remap[v1 - 1] = Math.min(remap[v1 - 1], v2, v3)
      }

      const facJ = new Uint32Array(nFj * 3)
      for (let i = 0; i < nFj; i++) {
        facJ[3 * i] = remap[fac[3 * i] - 1]
        facJ[3 * i + 1] = remap[fac[3 * i + 1] - 1]
        facJ[3 * i + 2] = remap[fac[3 * i + 2] - 1]
      }
      fac = facJ
    }
    this.tris = new Uint32Array(fac)
  }

  // internal function simplifies FreeSurfer triangulated mesh and overlays
  decimateHierarchicalMesh(gl: WebGL2RenderingContext, order: number = 4): boolean {
    const inputOrder = this.hierarchicalOrder()
    if (isNaN(inputOrder)) {
      log.warn('Unable to decimate mesh: it does not have a hierarchical structure')
      return false
    }
    if (order >= inputOrder) {
      log.warn(`Unable to decimate mesh: input order (${inputOrder}) must be larger than downsampled order (${order})`)
      return false
    }
    const inputVLength = this.pts.length / 3
    const V0 = 12
    const nV = Math.pow(4, order) * (V0 - 2) + 2
    this.pts = new Float32Array(this.pts.slice(0, nV * 3))
    this.decimateFaces(inputOrder, order)
    if (this.layers && this.layers.length > 0) {
      for (let i = 0; i < this.layers.length; i++) {
        const layer = this.layers[i]
        if (layer.values instanceof Float32Array || layer.values.length !== inputVLength) {
          layer.values = new Float32Array(layer.values.slice(0, nV))
        } else {
          log.warn(`decimation logic needs to be updated`)
        }
      }
    }
    this.updateMesh(gl) // apply the new properties...
    return true
  }

  // adjust attributes of a mesh layer. invoked by niivue.setMeshLayerProperty()
  // TODO this method is a bit too generic
  async setLayerProperty(
    id: number,
    key: keyof NVMeshLayer,
    val: number | string | boolean,
    gl: WebGL2RenderingContext
  ): Promise<void> {
    const layer = this.layers[id]
    if (!layer || !(key in layer)) {
      log.warn('mesh does not have property ', key, ' for layer ', layer)
      return
    }
    if (key === 'colormapLabel') {
      if (typeof val === 'object') {
        // assume JSON
        layer[key] = cmapper.makeLabelLut(val)
      } else if (typeof val === 'string') {
        // assume URL
        const cmap = await cmapper.makeLabelLutFromUrl(val)
        layer[key] = cmap
        this.updateMesh(gl) // apply the new properties...
        return
      } else {
        log.error('colormapLabel requires a string or object')
      }
    } else {
      // @ts-expect-error TODO generic property access
      layer[key] = val
    }
    this.updateMesh(gl) // apply the new properties...
  }

  // adjust mesh attributes. invoked by niivue.setMeshProperty(()
  // TODO this method is too generic
  setProperty(
    key: keyof this,
    val: number | string | boolean | Uint8Array | number[] | ColorMap | LegacyConnectome | Float32Array,
    gl: WebGL2RenderingContext
  ): void {
    if (!(key in this)) {
      console.warn('Mesh does not have property:', key, this)
      return
    }
    /* if (typeof val !== 'number' && typeof val !== 'string' && typeof val !== 'boolean' && !Array.isArray(val)) {
      console.warn('Invalid value type. Expected number, numbers, string, or boolean but received:', typeof val)
      return
    } */
    ;(this as any)[key] = val // TypeScript safety workaround
    this.updateMesh(gl) // Apply the new properties
  }

  // Each streamline vertex has color, normal and position attributes
  // Interleaved Vertex Data https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/TechniquesforWorkingwithVertexData/TechniquesforWorkingwithVertexData.html
  generatePosNormClr(pts: Float32Array, tris: Uint32Array, rgba255: Uint8Array): Float32Array {
    if (pts.length < 3 || rgba255.length < 4) {
      log.error('Catastrophic failure generatePosNormClr()')
      log.debug('this', this)
      log.debug('pts', pts)
      log.debug('rgba', rgba255)
    }
    const norms = NVMeshUtilities.generateNormals(pts, tris)
    const npt = pts.length / 3
    const isPerVertexColors = npt === rgba255.length / 4
    // n32
    const f32PerVertex = this.f32PerVertex // 7 if NormalXYZ is 3 floats, 5 if normalXYZ is packed into rgb32
    const f32 = new Float32Array(npt * f32PerVertex) // Each vertex has 7 components: PositionXYZ, NormalXYZ, RGBA32
    const u8 = new Uint8Array(f32.buffer) // Each vertex has 7 components: PositionXYZ, NormalXYZ, RGBA32
    let p = 0 // input position
    let c = 0 // input color
    let f = 0 // output float32 location (position and normals)
    let u = (f32PerVertex - 1) * 4 // output uint8 location (colors), offset 24 as after 3*position+3*normal
    for (let i = 0; i < npt; i++) {
      f32[f + 0] = pts[p + 0]
      f32[f + 1] = pts[p + 1]
      f32[f + 2] = pts[p + 2]
      if (f32PerVertex !== 7) {
        u8[u - 4] = norms[p + 0] * 127
        u8[u - 3] = norms[p + 1] * 127
        u8[u - 2] = norms[p + 2] * 127
      } else {
        f32[f + 3] = norms[p + 0]
        f32[f + 4] = norms[p + 1]
        f32[f + 5] = norms[p + 2]
      }
      u8[u] = rgba255[c + 0]
      u8[u + 1] = rgba255[c + 1]
      u8[u + 2] = rgba255[c + 2]
      u8[u + 3] = rgba255[c + 3]
      if (isPerVertexColors) {
        c += 4
      }
      p += 3 // read 3 input components: XYZ
      f += f32PerVertex // write 7 output components: 3*Position, 3*Normal, 1*RGBA
      u += f32PerVertex * 4 // stride of 28 bytes
    }
    return f32
  }

  // wrapper to read meshes, tractograms and connectomes regardless of format
  static async readMesh(
    buffer: ArrayBuffer,
    name: string,
    gl: WebGL2RenderingContext,
    opacity = 1.0,
    rgba255 = new Uint8Array([255, 255, 255, 255]),
    visible = true
  ): Promise<NVMesh> {
    let tris: Uint32Array = new Uint32Array([])
    let pts: Float32Array = new Float32Array([])
    let anatomicalStructurePrimary = ''
    let obj: TCK | TRACT | TT | TRX | TRK | GII | MZ3 | X3D | VTK | DefaultMeshType
    const re = /(?:\.([^.]+))?$/
    let ext = re.exec(name)![1]
    ext = ext.toUpperCase()
    if (ext === 'GZ') {
      ext = re.exec(name.slice(0, -3))![1] // img.trk.gz -> img.trk
      ext = ext.toUpperCase()
    }
    if (ext === 'JCON') {
      // return NVMesh.loadConnectomeFromJSON(JSON.parse(new TextDecoder().decode(buffer)), gl, name, opacity)
      log.error('you should never see this message: load using nvconnectome not nvmesh')
    }
    if (ext === 'JSON') {
      // return NVMesh.loadConnectomeFromFreeSurfer(JSON.parse(new TextDecoder().decode(buffer)), gl, name, opacity)
      log.error('you should never see this message: load using nvconnectome not nvmesh')
    }
    rgba255[3] = Math.max(1, rgba255[3])
    if (ext === 'TCK' || ext === 'TRK' || ext === 'TT' || ext === 'TRX' || ext === 'TRACT') {
      if (ext === 'TCK') {
        obj = NVMeshLoaders.readTCK(buffer)
      } else if (ext === 'TRACT') {
        obj = NVMeshLoaders.readTRACT(buffer)
      } else if (ext === 'TT') {
        obj = await NVMeshLoaders.readTT(buffer)
      } else if (ext === 'TRX') {
        obj = await NVMeshLoaders.readTRX(buffer)
      } else {
        obj = await NVMeshLoaders.readTRK(buffer)
      }
      if (typeof obj === 'undefined') {
        const pts = new Float32Array([0, 0, 0, 0, 0, 0])
        const offsetPt0 = new Uint32Array([0])
        obj = { pts, offsetPt0 }
        log.error('Creating empty tracts')
      }
      rgba255[3] = 0.0
      return new NVMesh(
        obj.pts,
        obj.offsetPt0,
        name,
        rgba255, // colormap,
        opacity, // opacity,
        visible, // visible,
        gl,
        'inferno',
        (obj as TRX).dpg || null,
        (obj as TRX).dps || null,
        (obj as TRX).dpv || null
      )
    } // is fibers
    if (ext === 'GII') {
      obj = await NVMeshLoaders.readGII(buffer)
    } else if (ext === 'MZ3') {
      obj = await NVMeshLoaders.readMZ3(buffer)
      if (!('positions' in obj)) {
        log.warn('MZ3 does not have positions (statistical overlay?)')
      }
    } else if (ext === 'ASC') {
      obj = NVMeshLoaders.readASC(buffer)
    } else if (ext === 'DFS') {
      obj = NVMeshLoaders.readDFS(buffer)
    } else if (ext === 'BYU' || ext === 'G') {
      obj = NVMeshLoaders.readGEO(buffer)
    } else if (ext === 'GEO') {
      obj = NVMeshLoaders.readGEO(buffer, true)
    } else if (ext === 'ICO' || ext === 'TRI') {
      obj = NVMeshLoaders.readICO(buffer)
    } else if (ext === 'OFF') {
      obj = NVMeshLoaders.readOFF(buffer)
    } else if (ext === 'NV') {
      obj = NVMeshLoaders.readNV(buffer)
    } else if (ext === 'OBJ') {
      obj = await NVMeshLoaders.readOBJ(buffer)
    } else if (ext === 'PLY') {
      obj = NVMeshLoaders.readPLY(buffer)
    } else if (ext === 'WRL') {
      obj = NVMeshLoaders.readWRL(buffer)
    } else if (ext === 'X3D') {
      obj = NVMeshLoaders.readX3D(buffer)
    } else if (ext === 'FIB' || ext === 'VTK') {
      obj = NVMeshLoaders.readVTK(buffer)
      if ('offsetPt0' in obj) {
        // VTK files used both for meshes and streamlines
        rgba255[3] = 0.0
        return new NVMesh(
          obj.pts,
          obj.offsetPt0,
          name,
          rgba255, // colormap,
          opacity, // opacity,
          visible, // visible,
          gl,
          'inferno'
        )
      } // if streamlines, not mesh
    } else if (ext === 'SRF') {
      obj = await NVMeshLoaders.readSRF(buffer)
    } else if (ext === 'STL') {
      obj = NVMeshLoaders.readSTL(buffer)
    } else {
      obj = NVMeshLoaders.readFreeSurfer(buffer)
    } // freesurfer hail mary
    if ((obj as GII).anatomicalStructurePrimary) {
      anatomicalStructurePrimary = (obj as GII).anatomicalStructurePrimary
    }
    if (obj instanceof Float32Array) {
      throw new Error('fatal: unknown mesh type loaded')
    }

    if (!('positions' in obj)) {
      throw new Error('positions not loaded')
    }
    if (!obj.indices) {
      throw new Error('indices not loaded')
    }

    pts = obj.positions
    tris = obj.indices

    if ('rgba255' in obj && obj.rgba255.length > 0) {
      // e.g. x3D format
      // rgba255 = Array.from(obj.rgba255)
      rgba255 = obj.rgba255
    }
    if ('colors' in obj && obj.colors && obj.colors.length === pts.length) {
      const n = pts.length / 3
      rgba255 = new Uint8Array(n * 4)
      let c = 0
      let k = 0
      for (let i = 0; i < n; i++) {
        // convert ThreeJS unit RGB to RGBA255
        rgba255[k++] = obj.colors[c] * 255 // red
        rgba255[k++] = obj.colors[c + 1] * 255 // green
        rgba255[k++] = obj.colors[c + 2] * 255 // blue
        rgba255[k++] = 255 // alpha
        c += 3
      } // for i: each vertex
    } // obj includes colors
    const npt = pts.length / 3
    const ntri = tris.length / 3
    if (ntri < 1 || npt < 3) {
      throw new Error('Mesh should have at least one triangle and three vertices')
    }
    rgba255[3] = Math.max(1, rgba255[3]) // mesh not streamline
    const nvm = new NVMesh(
      pts,
      tris,
      name,
      rgba255, // colormap,
      opacity, // opacity,
      visible, // visible,
      gl,
      null, // connectome
      null, // dpg
      null, // dps
      null, // dpv
      true, // colorbarVisible
      anatomicalStructurePrimary
    )
    if ('scalars' in obj && obj.scalars.length > 0) {
      const newLayer = await NVMeshLoaders.readLayer(name, buffer, nvm, opacity, 'gray')
      if (typeof newLayer === 'undefined') {
        log.warn('readLayer() failed to convert scalars')
      } else {
        nvm.layers.push(newLayer)
        nvm.updateMesh(gl)
      }
    }
    return nvm
  }

  static async loadLayer(layer: NVMeshLayer, nvmesh: NVMesh): Promise<void> {
    let buffer = new Uint8Array().buffer

    function base64ToArrayBuffer(base64: string): ArrayBuffer {
      const binary_string = window.atob(base64)
      const len = binary_string.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
      }
      return bytes.buffer
    }

    if (layer.base64 !== undefined) {
      // populate buffer with base64 if exists
      buffer = base64ToArrayBuffer(layer.base64)
    } else {
      if (!layer.url) {
        throw new Error('layer: missing url')
      }
      // fetch url otherwise
      const response = await fetch(layer.url, { headers: layer.headers })
      if (!response.ok) {
        throw Error(response.statusText)
      }
      buffer = await response.arrayBuffer()
    }

    let layerName: string
    let urlParts: string[] = []
    if (layer.name && layer.name !== '') {
      layerName = layer.name
    } else {
      if (!layer.url) {
        throw new Error('layer: missing url')
      }
      // urlParts = layer.url.split("/");
      // layerName = urlParts.slice(-1)[0];
      try {
        // if a full url like https://domain/path/file.nii.gz?query=filter
        // parse the url and get the pathname component without the query
        urlParts = new URL(layer.url).pathname.split('/')
      } catch (e) {
        // if a relative url then parse the path (assuming no query)
        urlParts = layer.url.split('/')
      } finally {
        layerName = urlParts.slice(-1)[0]
      }
    }
    if (layerName.indexOf('?') > -1) {
      layerName = layerName.slice(0, layerName.indexOf('?')) // remove query string if any
    }

    let opacity = 0.5
    if ('opacity' in layer) {
      opacity = layer.opacity
    }
    let colormap = 'warm'
    if ('colormap' in layer) {
      colormap = layer.colormap!
    }
    let colormapNegative = 'winter'
    if ('colormapNegative' in layer) {
      colormapNegative = layer.colormapNegative!
    }
    let useNegativeCmap = false
    if ('useNegativeCmap' in layer) {
      useNegativeCmap = layer.useNegativeCmap!
    }
    let cal_min: number | null = null
    if ('cal_min' in layer) {
      cal_min = layer.cal_min
    }
    let cal_max: number | null = null
    if ('cal_max' in layer) {
      cal_max = layer.cal_max
    }

    const newLayer = await NVMeshLoaders.readLayer(
      layerName,
      buffer,
      nvmesh,
      opacity,
      colormap,
      colormapNegative,
      useNegativeCmap,
      cal_min,
      cal_max
    )
    if (newLayer) {
      nvmesh.layers.push(newLayer)
    }
  }

  /**
   * factory function to load and return a new NVMesh instance from a given URL
   */
  static async loadFromUrl({
    url = '',
    headers = {},
    gl,
    name = '',
    opacity = 1.0,
    rgba255 = [255, 255, 255, 255],
    visible = true,
    layers = [],
    buffer = new ArrayBuffer(0)
  }: Partial<LoadFromUrlParams> = {}): Promise<NVMesh> {
    let urlParts = url.split('/') // split url parts at slash
    if (name === '') {
      try {
        // if a full url like https://domain/path/file.nii.gz?query=filter
        // parse the url and get the pathname component without the query
        urlParts = new URL(url).pathname.split('/')
      } catch (e) {
        // if a relative url then parse the path (assuming no query)
        urlParts = url.split('/')
      }
      name = urlParts.slice(-1)[0] // name will be last part of url (e.g. some/url/image.nii.gz --> image.nii.gz
      if (name.indexOf('?') > -1) {
        name = name.slice(0, name.indexOf('?')) // remove query string if any
      }
    }
    if (url === '') {
      throw Error('url must not be empty')
    }
    if (!gl) {
      throw Error('gl context is null')
    }
    let buff
    if (buffer.byteLength > 0) {
      buff = buffer
    } else {
      // TRX format is special (its a zip archive of multiple files)
      const response = await fetch(url, { headers })
      if (!response.ok) {
        throw Error(response.statusText)
      }
      buff = await response.arrayBuffer()
    }
    const nvmesh = await this.readMesh(buff, name, gl, opacity, new Uint8Array(rgba255), visible)

    if (!layers || layers.length < 1) {
      return nvmesh
    }

    for (let i = 0; i < layers.length; i++) {
      await NVMesh.loadLayer(layers[i], nvmesh)
    }

    // apply the new properties
    nvmesh.updateMesh(gl)
    return nvmesh
  }

  // not included in public docs
  // loading Nifti files
  static async readFileAsync(file: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (): void => {
        resolve(reader.result as ArrayBuffer)
      }

      reader.onerror = reject

      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * factory function to load and return a new NVMesh instance from a file in the browser
   *
   * @returns NVMesh instance
   */
  static async loadFromFile({
    file,
    gl,
    name = '',
    opacity = 1.0,
    rgba255 = [255, 255, 255, 255],
    visible = true,
    layers = []
  }: Partial<LoadFromFileParams> = {}): Promise<NVMesh> {
    if (!file) {
      throw new Error('file must be set')
    }
    if (!gl) {
      throw new Error('rendering context must be set')
    }

    const buffer = await NVMesh.readFileAsync(file)
    const nvmesh = await NVMesh.readMesh(buffer, name, gl, opacity, new Uint8Array(rgba255), visible)

    if (!layers || layers.length < 1) {
      return nvmesh
    }

    for (let i = 0; i < layers.length; i++) {
      await NVMesh.loadLayer(layers[i], nvmesh)
    }

    // apply the new properties
    nvmesh.updateMesh(gl)
    return nvmesh
  }

  /**
   * load and return a new NVMesh instance from a base64 encoded string
   */
  async loadFromBase64({
    base64,
    gl,
    name = '',
    opacity = 1.0,
    rgba255 = [255, 255, 255, 255],
    visible = true,
    layers = []
  }: Partial<LoadFromBase64Params> = {}): Promise<NVMesh> {
    if (!base64) {
      throw new Error('base64 must bet set')
    }
    if (!gl) {
      throw new Error('rendering context must be set')
    }

    // https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
    function base64ToArrayBuffer(base64: string): ArrayBuffer {
      const binary_string = window.atob(base64)
      const len = binary_string.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
      }
      return bytes.buffer
    }

    const buffer = base64ToArrayBuffer(base64)
    const nvmesh = await NVMesh.readMesh(buffer, name, gl, opacity, new Uint8Array(rgba255), visible)

    if (!layers || layers.length < 1) {
      return nvmesh
    }
    for (let i = 0; i < layers.length; i++) {
      await NVMesh.loadLayer(layers[i], nvmesh)
    }

    // apply new properties
    nvmesh.updateMesh(gl)
    return nvmesh
  }
}
