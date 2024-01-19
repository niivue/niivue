import { vec3 } from 'gl-matrix'
import { v4 as uuidv4 } from '@lukeed/uuid'
import { log } from './logger.js'
import { NiivueObject3D } from './niivue-object3D.js' // n.b. used by connectome
import { ColorMap, LUT, cmapper } from './colortables.js'
import { NVMeshUtilities } from './nvmesh-utilities.js'
import { NVMeshLoaders } from './nvmesh-loaders.js'
import { LegacyConnectome, LegacyNodes, NVConnectomeEdge, NVConnectomeNode, Point } from './types.js'
import {
  ANNOT,
  DefaultMeshType,
  GII,
  MGH,
  MZ3,
  TCK,
  TRACT,
  TRK,
  TT,
  TRX,
  VTK,
  ValuesArray,
  X3D
} from './nvmesh-types.js'

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
  colormapNegative: string
  colormapInvert: boolean
  colormapLabel?: ColorMap | LUT
  useNegativeCmap: boolean
  global_min: number
  global_max: number
  cal_min: number
  cal_max: number
  cal_minNeg: number
  cal_maxNeg: number
  isAdditiveBlend: boolean
  frame4D: number
  nFrame4D: number
  values: number[]
  isOutlineBorder: boolean
  isTransparentBelowCalMin?: boolean
  alphaThreshold: boolean

  base64?: string

  // TODO referenced in niivue/refreshColormaps
  colorbarVisible?: boolean
}

export class NVMeshFromUrlOptions {
  url: string
  gl: WebGL2RenderingContext | null
  name: string
  opacity: number
  rgba255: number[]
  visible: boolean
  layers: NVMeshLayer[]
  colorbarVisible: boolean

  constructor(
    url = '',
    gl = null,
    name = '',
    opacity = 1.0,
    rgba255 = [255, 255, 255, 255],
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

type BaseLoadParams = {
  // WebGL rendering context
  gl: WebGL2RenderingContext
  // a name for this image. Default is an empty string
  name: string
  // the opacity for this image. default is 1
  opacity: number
  // the base color of the mesh. RGBA values from 0 to 255. Default is white
  rgba255: number[]
  // whether or not this image is to be visible
  visible: boolean
  // layers of the mesh to load
  layers: NVMeshLayer[]
}

export type LoadFromUrlParams = Partial<BaseLoadParams> & {
  // the resolvable URL pointing to a mesh to load
  url: string
  headers?: Record<string, string>
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
  offsetPt0: number[] | Uint32Array | null = null

  colormapInvert = false
  fiberGroupColormap: ColorMap | null = null

  indexBuffer: WebGLBuffer
  vertexBuffer: WebGLBuffer
  vao: WebGLVertexArrayObject

  pts: number[] | Float32Array
  tris?: number[] | Uint32Array
  layers: NVMeshLayer[]
  type = MeshType.MESH

  data_type?: string
  rgba255: number[]
  fiberLength?: number
  fiberLengths?: number[]
  fiberDither = 0.1
  fiberColor = 'Global'
  fiberDecimationStride = 1 // e.g. if 2 the 50% of streamlines visible, if 3 then 1/3rd
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
    pts: number[] | Float32Array,
    tris: number[] | Uint32Array,
    name = '',
    rgba255 = [255, 255, 255, 255],
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
    this.offsetPt0 = null
    this.hasConnectome = false
    this.colormapInvert = false
    this.fiberGroupColormap = null
    this.pts = pts
    this.layers = []
    this.type = MeshType.MESH
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
      this.offsetPt0 = tris
      this.updateFibers(gl)
      // define VAO
      gl.bindVertexArray(this.vao)
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
        // @ts-expect-error -- this should be done explicitly
        this[keysArray[i]] = connectome[keysArray[i]]
      }
    }
    this.rgba255 = rgba255
    this.tris = tris
    this.updateMesh(gl)
    // the VAO binds the vertices and indices as well as describing the vertex layout
    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    // vertex position: 3 floats X,Y,Z
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0)
    // vertex surface normal vector: (also three floats)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12)
    // vertex color
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 28, 24)
    gl.bindVertexArray(null) // https://stackoverflow.com/questions/43904396/are-we-not-allowed-to-bind-gl-array-buffer-and-vertex-attrib-array-to-0-in-webgl
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
      this.fiberLengths = []
      for (let i = 0; i < n_count; i++) {
        // for each streamline
        const vStart3 = offsetPt0[i] * 3 // first vertex in streamline
        const vEnd3 = (offsetPt0[i + 1] - 1) * 3 // last vertex in streamline
        let len = 0
        for (let j = vStart3; j < vEnd3; j += 3) {
          const v = vec3.fromValues(pts[j + 0] - pts[j + 3], pts[j + 1] - pts[j + 4], pts[j + 2] - pts[j + 5])
          len += vec3.len(v)
        }
        this.fiberLengths.push(len)
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
    let dps: number[] | null = null
    let dpv: number[] | null = null
    if (fiberColor.startsWith('dps') && this.dps && this.dps.length > 0) {
      const n = parseInt(fiberColor.substring(3))
      if (n < this.dps.length && this.dps[n].vals.length === n_count) {
        dps = this.dps[n].vals
      }
    }
    if (fiberColor.startsWith('dpv') && this.dpv && this.dpv.length > 0) {
      const n = parseInt(fiberColor.substring(3))
      if (n < this.dpv.length && this.dpv[n].vals.length === npt) {
        dpv = this.dpv[n].vals
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
      let mn = dpv[0]
      let mx = dpv[0]
      for (let i = 0; i < npt; i++) {
        mn = Math.min(mn, dpv[i])
        mx = Math.max(mx, dpv[i])
      }
      let v4 = 3 // +3: fill 4th component colors: XYZC = 0123
      for (let i = 0; i < npt; i++) {
        let color = (dpv[i] - mn) / (mx - mn)
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
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Uint32Array(posClrU32), gl.STATIC_DRAW)
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
    this.indexCount = indices.length
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW)
  } // updateFibers()

  // internal function filters connectome to identify which color, size and visibility of nodes and edges
  updateConnectome(gl: WebGL2RenderingContext): void {
    // draw nodes
    const tris: number[] = []
    const nNode = (this.nodes as LegacyNodes).X.length
    let hasEdges = false
    if (nNode > 1 && this.edges) {
      let nEdges = this.edges!.length
      if ((nEdges = nNode * nNode)) {
        hasEdges = true
      } else {
        log.warn('Expected %d edges not %d', nNode * nNode, nEdges)
      }
    }

    // draw all nodes
    const pts: number[] = []
    const rgba255: number[] = []
    let lut = cmapper.colormap(this.nodeColormap, this.colormapInvert)
    let lutNeg = cmapper.colormap(this.nodeColormapNegative, this.colormapInvert)
    let hasNeg = this.nodeColormapNegative !== undefined
    let min = this.nodeMinColor!
    let max = this.nodeMaxColor!
    for (let i = 0; i < nNode; i++) {
      const radius = (this.nodes as LegacyNodes).Size[i] * this.nodeScale
      if (radius <= 0.0) {
        continue
      }
      let color = (this.nodes as LegacyNodes).Color[i]
      let isNeg = false
      if (hasNeg && color < 0) {
        isNeg = true
        color = -color
      }
      if (min < max) {
        if (color < min) {
          continue
        }
        color = (color - min) / (max - min)
      } else {
        color = 1.0
      }
      color = Math.round(Math.max(Math.min(255, color * 255))) * 4
      let rgba = [lut[color], lut[color + 1], lut[color + 2], 255]
      if (isNeg) {
        rgba = [lutNeg[color], lutNeg[color + 1], lutNeg[color + 2], 255]
      }
      const pt: vec3 = [
        (this.nodes as LegacyNodes).X[i],
        (this.nodes as LegacyNodes).Y[i],
        (this.nodes as LegacyNodes).Z[i]
      ] // TODO defined assertions should not be necessary here, this should be correctly assigned in the constructor
      NiivueObject3D.makeColoredSphere(pts, tris, rgba255, radius, pt, rgba)
    }
    // draw all edges
    if (hasEdges) {
      lut = cmapper.colormap(this.edgeColormap, this.colormapInvert)
      lutNeg = cmapper.colormap(this.edgeColormapNegative, this.colormapInvert)
      hasNeg = this.edgeColormapNegative !== undefined
      min = this.edgeMin!
      max = this.edgeMax!
      for (let i = 0; i < nNode - 1; i++) {
        for (let j = i + 1; j < nNode; j++) {
          let color = (this.edges as number[])[i * nNode + j]
          let isNeg = false
          if (hasNeg && color < 0) {
            isNeg = true
            color = -color
          }
          const radius = color * this.edgeScale
          if (radius <= 0) {
            continue
          }
          if (min < max) {
            if (color < min) {
              continue
            }
            color = (color - min) / (max - min)
          } else {
            color = 1.0
          }
          color = Math.round(Math.max(Math.min(255, color * 255))) * 4
          let rgba = [lut[color], lut[color + 1], lut[color + 2], 255]
          if (isNeg) {
            rgba = [lutNeg[color], lutNeg[color + 1], lutNeg[color + 2], 255]
          }
          const pti: vec3 = [
            (this.nodes as LegacyNodes).X[i],
            (this.nodes as LegacyNodes).Y[i],
            (this.nodes as LegacyNodes).Z[i]
          ]
          const ptj: vec3 = [
            (this.nodes as LegacyNodes).X[j],
            (this.nodes as LegacyNodes).Y[j],
            (this.nodes as LegacyNodes).Z[j]
          ]
          NiivueObject3D.makeColoredCylinder(pts, tris, rgba255, pti, ptj, radius, rgba)
        } // for j
      } // for i
    } // hasEdges
    // calculate spatial extent of connectome: user adjusting node sizes may influence size
    const obj = NVMeshUtilities.getExtents(pts)
    this.furthestVertexFromOrigin = obj.mxDx
    this.extentsMin = obj.extentsMin
    this.extentsMax = obj.extentsMax
    const posNormClr = this.generatePosNormClr(pts, tris, rgba255)
    // generate webGL buffers and vao
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(tris), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posNormClr), gl.STATIC_DRAW)
    this.indexCount = tris.length
  }

  // internal function filters mesh to identify which color of triangulated mesh vertices
  updateMesh(gl: WebGL2RenderingContext): void {
    if (this.offsetPt0) {
      this.updateFibers(gl)
      return // fiber not mesh
    }
    if (this.hasConnectome) {
      this.updateConnectome(gl)
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
    function additiveBlend(x: number, y: number): number {
      return Math.min(x + y, 255.0)
    }
    const posNormClr = this.generatePosNormClr(this.pts, this.tris, this.rgba255)
    const nvtx = this.pts.length / 3
    const u8 = new Uint8Array(posNormClr.buffer) // Each vertex has 7 components: PositionXYZ, NormalXYZ, RGBA32
    // create emission values
    // let posNormClrEmission = posNormClr.slice();
    let maxAdditiveBlend = 0
    const additiveRGBA = new Uint8Array(nvtx * 4) // emission

    if (this.layers && this.layers.length > 0) {
      for (let i = 0; i < this.layers.length; i++) {
        const layer = this.layers[i]
        const opacity = layer.opacity
        if (opacity <= 0.0 || layer.cal_min > layer.cal_max) {
          continue
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
          const lut = colormapLabel.lut
          const nLabel = Math.floor(lut.length / 4)
          const frame = Math.min(Math.max(layer.frame4D, 0), layer.nFrame4D - 1)
          const frameOffset = nvtx * frame
          // let mx = 0
          const rgba8 = new Uint8Array(nvtx * 4)
          let k = 0
          for (let j = 0; j < layer.values.length; j++) {
            // eslint-disable-next-line
            let idx = 4 * Math.min(Math.max(layer.values[j + frameOffset], 0), nLabel - 1)
            rgba8[k + 0] = lut[idx + 0]
            rgba8[k + 1] = lut[idx + 1]
            rgba8[k + 2] = lut[idx + 2]
            k += 4
          }
          let opaque = new Array(nvtx).fill(true)
          if (layer.isOutlineBorder) {
            opaque = NVMeshUtilities.getClusterBoundary(rgba8, this.tris)
          }
          k = 0
          for (let j = 0; j < layer.values.length; j++) {
            if (!opaque[j]) {
              k += 4
              continue
            }
            const vtx = j * 28 + 24 // posNormClr is 28 bytes stride, RGBA color at offset 24,
            u8[vtx + 0] = lerp(u8[vtx + 0], rgba8[k + 0], opacity)
            u8[vtx + 1] = lerp(u8[vtx + 1], rgba8[k + 1], opacity)
            u8[vtx + 2] = lerp(u8[vtx + 2], rgba8[k + 2], opacity)
            k += 4
          } // for each vertex
          continue
        } // if colormapLabel
        if (layer.values instanceof Uint8Array) {
          const rgba8 = new Uint8Array(layer.values.buffer)
          let opaque = new Array(nvtx).fill(true)
          if (layer.isOutlineBorder) {
            opaque = NVMeshUtilities.getClusterBoundary(rgba8, this.tris)
          }
          let k = 0
          for (let j = 0; j < layer.values.length; j++) {
            const vtx = j * 28 + 24 // posNormClr is 28 bytes stride, RGBA color at offset 24,
            if (!opaque[j]) {
              u8[vtx + 3] = 0
              k += 4
              continue
            }
            u8[vtx + 0] = lerp(u8[vtx + 0], rgba8[k + 0], opacity)
            u8[vtx + 1] = lerp(u8[vtx + 1], rgba8[k + 1], opacity)
            u8[vtx + 2] = lerp(u8[vtx + 2], rgba8[k + 2], opacity)
            k += 4
          }
          continue
        }
        const lut = cmapper.colormap(layer.colormap, layer.colormapInvert)
        const frame = Math.min(Math.max(layer.frame4D, 0), layer.nFrame4D - 1)
        const frameOffset = nvtx * frame
        if (layer.isAdditiveBlend) {
          maxAdditiveBlend = Math.max(maxAdditiveBlend, opacity)
        }
        if (layer.useNegativeCmap) {
          layer.cal_min = Math.max(0, layer.cal_min)
          layer.cal_max = Math.max(layer.cal_min + 0.000001, layer.cal_max)
        }
        if (layer.isTransparentBelowCalMin === undefined) {
          layer.isTransparentBelowCalMin = true
        }
        let mn = layer.cal_min
        // let mnVisible = mn;
        if (layer.alphaThreshold) {
          mn = Math.min(mn, 0.0)
        }

        const scale255 = 255.0 / (layer.cal_max - mn)
        let mnCal = layer.cal_min
        if (!layer.isTransparentBelowCalMin) {
          mnCal = Number.NEGATIVE_INFINITY
        }

        if (!layer.isOutlineBorder) {
          // blend colors for each voxel
          for (let j = 0; j < nvtx; j++) {
            const v = layer.values[j + frameOffset]
            if (v < mnCal) {
              continue
            }
            let v255 = Math.round((v - mn) * scale255)
            if (v255 < 0 && layer.isTransparentBelowCalMin) {
              continue
            }
            v255 = Math.max(0.0, v255)
            v255 = Math.min(255.0, v255) * 4
            const vtx = j * 28 + 24 // posNormClr is 28 bytes stride, RGBA color at offset 24,
            if (layer.isAdditiveBlend) {
              const j4 = j * 4
              // sum red, green and blue layers
              additiveRGBA[j4 + 0] = additiveBlend(additiveRGBA[j4 + 0], lut[v255 + 0])
              additiveRGBA[j4 + 1] = additiveBlend(additiveRGBA[j4 + 1], lut[v255 + 1])
              additiveRGBA[j4 + 2] = additiveBlend(additiveRGBA[j4 + 2], lut[v255 + 2])
              additiveRGBA[j4 + 3] = additiveBlend(additiveRGBA[j4 + 3], 255.0)
            } else {
              u8[vtx + 0] = lerp(u8[vtx + 0], lut[v255 + 0], opacity)
              u8[vtx + 1] = lerp(u8[vtx + 1], lut[v255 + 1], opacity)
              u8[vtx + 2] = lerp(u8[vtx + 2], lut[v255 + 2], opacity)
            }
          }
        } else {
          // isOutlineBorder
          const v255s = new Uint8Array(nvtx)
          for (let j = 0; j < nvtx; j++) {
            let v255 = Math.round((layer.values[j + frameOffset] - layer.cal_min) * scale255)
            if (v255 < 0) {
              continue
            }
            v255 = Math.min(255.0, v255)
            v255s[j] = v255
          }
          const opaque = NVMeshUtilities.getClusterBoundaryU8(v255s, this.tris)
          for (let j = 0; j < nvtx; j++) {
            let v255 = 255 // v255s[j];
            if (!opaque[j]) {
              continue
            }
            v255 = Math.min(255.0, v255) * 4
            const vtx = j * 28 + 24 // posNormClr is 28 bytes stride, RGBA color at offset 24,
            u8[vtx + 0] = lerp(u8[vtx + 0], lut[v255 + 0], opacity)
            u8[vtx + 1] = lerp(u8[vtx + 1], lut[v255 + 1], opacity)
            u8[vtx + 2] = lerp(u8[vtx + 2], lut[v255 + 2], opacity)
          }
        }
        if (layer.useNegativeCmap) {
          const lut = cmapper.colormap(layer.colormapNegative, layer.colormapInvert)
          if (!layer.isOutlineBorder) {
            let mn = layer.cal_min
            let mx = layer.cal_max

            if (isFinite(layer.cal_minNeg) && isFinite(layer.cal_minNeg)) {
              mn = -layer.cal_minNeg
              mx = -layer.cal_maxNeg
            }
            if (mx < mn) {
              ;[mn, mx] = [mx, mn]
            }
            let mnVisible = mn
            if (mnVisible === 0.0) {
              mnVisible = Number.EPSILON
            } // do not shade 0.0 twice with positive and negative colormap
            if (layer.alphaThreshold) {
              mn = 0.0
            }
            const scale255neg = 255.0 / (mx - mn)
            for (let j = 0; j < nvtx; j++) {
              const v = -layer.values[j + frameOffset]
              if (v < mnVisible) {
                continue
              }
              let v255 = Math.round((v - mn) * scale255neg)
              /* let v255 = Math.round(
                (-layer.values[j + frameOffset] - layer.cal_min) * scale255
              ); */
              if (v255 < 0) {
                continue
              }
              v255 = Math.min(255.0, v255) * 4
              const vtx = j * 28 + 24 // posNormClr is 28 bytes stride, RGBA color at offset 24,

              if (layer.isAdditiveBlend) {
                const j4 = j * 4
                // sum red, green and blue layers
                additiveRGBA[j4 + 0] = additiveBlend(additiveRGBA[j4 + 0], lut[v255 + 0])
                additiveRGBA[j4 + 1] = additiveBlend(additiveRGBA[j4 + 1], lut[v255 + 1])
                additiveRGBA[j4 + 2] = additiveBlend(additiveRGBA[j4 + 2], lut[v255 + 2])
                additiveRGBA[j4 + 3] = additiveBlend(additiveRGBA[j4 + 3], 255.0)
              } else {
                u8[vtx + 0] = lerp(u8[vtx + 0], lut[v255 + 0], opacity)
                u8[vtx + 1] = lerp(u8[vtx + 1], lut[v255 + 1], opacity)
                u8[vtx + 2] = lerp(u8[vtx + 2], lut[v255 + 2], opacity)
              }
            }
          } else {
            // isOutlineBorder
            const v255s = new Uint8Array(nvtx)
            for (let j = 0; j < nvtx; j++) {
              const v255 = Math.round((-layer.values[j + frameOffset] - layer.cal_min) * scale255)
              if (v255 < 0) {
                continue
              }
              v255s[j] = Math.min(255.0, v255)
            }
            const opaque = NVMeshUtilities.getClusterBoundaryU8(v255s, this.tris)
            for (let j = 0; j < nvtx; j++) {
              let v255 = 255 // v255s[j];
              if (!opaque[j]) {
                continue
              }
              v255 = Math.min(255.0, v255) * 4
              const vtx = j * 28 + 24 // posNormClr is 28 bytes stride, RGBA color at offset 24,
              u8[vtx + 0] = lerp(u8[vtx + 0], lut[v255 + 0], opacity)
              u8[vtx + 1] = lerp(u8[vtx + 1], lut[v255 + 1], opacity)
              u8[vtx + 2] = lerp(u8[vtx + 2], lut[v255 + 2], opacity)
            }
          }
        }
      }
    }
    if (maxAdditiveBlend > 0) {
      for (let j = 0; j < nvtx; j++) {
        const vtx = j * 28 + 24 // posNormClr is 28 bytes stride, RGBA color at offset 24,
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
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(this.tris), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posNormClr), gl.STATIC_DRAW)
    this.indexCount = this.tris.length
    this.vertexCount = this.pts.length
  }

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

  // adjust attributes of a mesh layer. invoked by niivue.setMeshLayerProperty()
  // TODO this method is a bit too generic
  setLayerProperty(
    id: number,
    key: keyof NVMeshLayer,
    val: number | string | boolean,
    gl: WebGL2RenderingContext
  ): void {
    const layer = this.layers[id]
    if (!layer || !(key in layer)) {
      log.warn('mesh does not have property ', key, ' for layer ', layer)
      return
    }
    // @ts-expect-error TODO generic property access
    layer[key] = val
    this.updateMesh(gl) // apply the new properties...
  }

  // adjust mesh attributes. invoked by niivue.setMeshProperty(()
  // TODO this method is too generic
  setProperty(key: keyof this, val: unknown, gl: WebGL2RenderingContext): void {
    if (!(key in this)) {
      log.warn('mesh does not have property ', key, this)
      return
    }
    // @ts-expect-error TODO generic access
    this[key] = val
    this.updateMesh(gl) // apply the new properties...
  }

  // Each streamline vertex has color, normal and position attributes
  // Interleaved Vertex Data https://developer.apple.com/library/archive/documentation/3DDrawing/Conceptual/OpenGLES_ProgrammingGuide/TechniquesforWorkingwithVertexData/TechniquesforWorkingwithVertexData.html
  generatePosNormClr(pts: number[] | Float32Array, tris: number[] | Uint32Array, rgba255: number[]): Float32Array {
    if (pts.length < 3 || rgba255.length < 4) {
      log.error('Catastrophic failure generatePosNormClr()')
      log.debug('this', this)
      log.debug('pts', pts)
      log.debug('rgba', rgba255)
    }
    const norms = NVMeshUtilities.generateNormals(pts, tris)
    const npt = pts.length / 3
    const isPerVertexColors = npt === rgba255.length / 4
    const f32 = new Float32Array(npt * 7) // Each vertex has 7 components: PositionXYZ, NormalXYZ, RGBA32
    const u8 = new Uint8Array(f32.buffer) // Each vertex has 7 components: PositionXYZ, NormalXYZ, RGBA32
    let p = 0 // input position
    let c = 0 // input color
    let f = 0 // output float32 location (position and normals)
    let u = 24 // output uint8 location (colors), offset 24 as after 3*position+3*normal
    for (let i = 0; i < npt; i++) {
      f32[f + 0] = pts[p + 0]
      f32[f + 1] = pts[p + 1]
      f32[f + 2] = pts[p + 2]
      f32[f + 3] = norms[p + 0]
      f32[f + 4] = norms[p + 1]
      f32[f + 5] = norms[p + 2]
      u8[u] = rgba255[c + 0]
      u8[u + 1] = rgba255[c + 1]
      u8[u + 2] = rgba255[c + 2]
      u8[u + 3] = rgba255[c + 3]
      if (isPerVertexColors) {
        c += 4
      }
      p += 3 // read 3 input components: XYZ
      f += 7 // write 7 output components: 3*Position, 3*Normal, 1*RGBA
      u += 28 // stride of 28 bytes
    }
    return f32
  }

  static loadConnectomeFromFreeSurfer(
    json: {
      points?: Point[]
      data_type: string
    },
    gl: WebGL2RenderingContext,
    name = '',
    // colormap = "",
    opacity = 1.0,
    visible = true
  ): NVMesh {
    let isValid = true
    if (json.data_type === undefined) {
      isValid = false
    } else if (json.data_type !== 'fs_pointset') {
      isValid = false
    }
    if (json.points === undefined) {
      isValid = false
    }
    if (!isValid) {
      throw Error('not a valid FreeSurfer json pointset')
    }
    const jcon: LegacyConnectome = {
      nodes: {
        names: [],
        prefilled: [],
        X: [],
        Y: [],
        Z: [],
        Color: [],
        Size: []
      },
      edges: [],
      // @ts-expect-error not sure where this should come from
      name: this.data_type
    }

    if (!json.points) {
      throw new Error('points are not set!')
    }
    for (let i = 0; i < json.points.length; i++) {
      let name = ''
      if (json.points[i].comments) {
        if (json.points[i].comments[0].text) {
          name = json.points[i].comments[0].text
        }
      }
      jcon.nodes.names.push(name)
      let prefilled = ''
      if (json.points[i].comments) {
        if (json.points[i].comments[0].prefilled) {
          prefilled = json.points[i].comments[0].prefilled as string
        }
      }
      jcon.nodes.prefilled.push(prefilled)
      jcon.nodes.X.push(json.points[i].coordinates.x)
      jcon.nodes.Y.push(json.points[i].coordinates.y)
      jcon.nodes.Z.push(json.points[i].coordinates.z)
      jcon.nodes.Color.push(1)
      jcon.nodes.Size.push(1)
    }
    return new NVMesh([], [], name, [], opacity, visible, gl, jcon)
  } // loadConnectomeFromFreeSurfer

  // read connectome saved as JSON
  static loadConnectomeFromJSON(
    json: Record<string, unknown>,
    gl: WebGL2RenderingContext,
    name = '',
    // colormap = "",
    opacity = 1.0,
    visible = true
  ): NVMesh {
    if ('name' in json) {
      name = this.name
    }
    if (!('nodes' in json)) {
      throw Error('not a valid jcon connectome file')
    }
    return new NVMesh([], [], name, [], opacity, visible, gl, json as LegacyConnectome)
  } // loadConnectomeFromJSON()

  // wrapper to read meshes, tractograms and connectomes regardless of format
  static readMesh(
    buffer: ArrayBuffer,
    name: string,
    gl: WebGL2RenderingContext,
    opacity = 1.0,
    rgba255 = [255, 255, 255, 255],
    visible = true
  ): NVMesh {
    let tris: number[] = []
    let pts: number[] = []
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
      return NVMesh.loadConnectomeFromJSON(JSON.parse(new TextDecoder().decode(buffer)), gl, name, opacity)
    }
    if (ext === 'JSON') {
      return NVMesh.loadConnectomeFromFreeSurfer(JSON.parse(new TextDecoder().decode(buffer)), gl, name, opacity)
    }
    rgba255[3] = Math.max(0, rgba255[3])
    if (ext === 'TCK' || ext === 'TRK' || ext === 'TT' || ext === 'TRX' || ext === 'TRACT') {
      if (ext === 'TCK') {
        obj = NVMeshLoaders.readTCK(buffer)
      } else if (ext === 'TRACT') {
        obj = NVMeshLoaders.readTRACT(buffer)
      } else if (ext === 'TT') {
        obj = NVMeshLoaders.readTT(buffer)
      } else if (ext === 'TRX') {
        obj = NVMeshLoaders.readTRX(buffer)
      } else {
        obj = NVMeshLoaders.readTRK(buffer)
      }
      if (typeof obj === 'undefined') {
        const pts = [0, 0, 0, 0, 0, 0]
        const offsetPt0 = [0]
        obj = { pts, offsetPt0 }
        log.error('Creating empty tracts')
      }

      rgba255[3] = -1.0
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
      obj = NVMeshLoaders.readGII(buffer)
    } else if (ext === 'MZ3') {
      obj = NVMeshLoaders.readMZ3(buffer)
      if (obj instanceof Float32Array || obj.positions === null) {
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
      obj = NVMeshLoaders.readOBJ(buffer)
    } else if (ext === 'PLY') {
      obj = NVMeshLoaders.readPLY(buffer)
    } else if (ext === 'X3D') {
      obj = NVMeshLoaders.readX3D(buffer)
    } else if (ext === 'FIB' || ext === 'VTK') {
      obj = NVMeshLoaders.readVTK(buffer)
      if ('offsetPt0' in obj) {
        // VTK files used both for meshes and streamlines
        rgba255[3] = -1.0
        return new NVMesh(
          Array.from(obj.pts),
          Array.from(obj.offsetPt0),
          name,
          rgba255, // colormap,
          opacity, // opacity,
          visible, // visible,
          gl,
          'inferno'
        )
      } // if streamlines, not mesh
    } else if (ext === 'SRF') {
      obj = NVMeshLoaders.readSRF(buffer)
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

    if (!obj.positions) {
      throw new Error('positions not loaded')
    }
    if (!obj.indices) {
      throw new Error('indices not loaded')
    }

    pts = Array.from(obj.positions)
    tris = Array.from(obj.indices)

    if ('rgba255' in obj && obj.rgba255.length > 0) {
      // e.g. x3D format
      rgba255 = obj.rgba255
    }
    if ('colors' in obj && obj.colors && obj.colors.length === pts.length) {
      rgba255 = []
      const n = pts.length / 3
      let c = 0
      for (let i = 0; i < n; i++) {
        // convert ThreeJS unit RGB to RGBA255
        rgba255.push(obj.colors[c] * 255) // red
        rgba255.push(obj.colors[c + 1] * 255) // green
        rgba255.push(obj.colors[c + 2] * 255) // blue
        rgba255.push(255) // alpha
        c += 3
      } // for i: each vertex
    } // obj includes colors
    const npt = pts.length / 3
    const ntri = tris.length / 3
    if (ntri < 1 || npt < 3) {
      throw new Error('Mesh should have at least one triangle and three vertices')
    }
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
      NVMeshLoaders.readLayer(name, buffer, nvm, opacity, 'gray')
      nvm.updateMesh(gl)
    }
    return nvm
  }

  static async loadLayer(layer: NVMeshLayer, nvmesh: NVMesh): Promise<void> {
    let buffer

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
      colormap = layer.colormap
    }
    let colormapNegative = 'winter'
    if ('colormapNegative' in layer) {
      colormapNegative = layer.colormapNegative
    }
    let useNegativeCmap = false
    if ('useNegativeCmap' in layer) {
      useNegativeCmap = layer.useNegativeCmap
    }
    let cal_min: number | null = null
    if ('cal_min' in layer) {
      cal_min = layer.cal_min
    }
    let cal_max: number | null = null
    if ('cal_max' in layer) {
      cal_max = layer.cal_max
    }

    NVMeshLoaders.readLayer(
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
    layers = []
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
    // TRX format is special (its a zip archive of multiple files)
    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw Error(response.statusText)
    }
    // let tris = [];
    // var pts = [];
    const buffer = await response.arrayBuffer()
    const nvmesh = await this.readMesh(buffer, name, gl, opacity, rgba255, visible)

    if (!layers || layers.length < 1) {
      return nvmesh
    }

    for (let i = 0; i < layers.length; i++) {
      await this.loadLayer(layers[i], nvmesh)
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
    const nvmesh = NVMesh.readMesh(buffer, name, gl, opacity, rgba255, visible)

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
    const nvmesh = await NVMesh.readMesh(buffer, name, gl, opacity, rgba255, visible)

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

  // loaders
  static readGII(buffer: ArrayBuffer): GII {
    return NVMeshLoaders.readGII(buffer)
  }

  static readX3D(buffer: ArrayBuffer): X3D {
    return NVMeshLoaders.readX3D(buffer)
  }

  static readNII(buffer: ArrayBuffer, n_vert = 0): Uint8Array | Float32Array | Int32Array | Int16Array {
    return NVMeshLoaders.readNII(buffer, n_vert)
  }

  static readNII2(buffer: ArrayBuffer, n_vert = 0): Uint8Array | Float32Array | Int32Array | Int16Array {
    return NVMeshLoaders.readNII2(buffer, n_vert)
  }

  static readMGH(buffer: ArrayBuffer): MGH {
    return NVMeshLoaders.readMGH(buffer)
  }

  static readSTL(buffer: ArrayBuffer): DefaultMeshType {
    return NVMeshLoaders.readSTL(buffer)
  }

  static readTxtSTL(buffer: ArrayBuffer): DefaultMeshType {
    return NVMeshLoaders.readTxtSTL(buffer)
  }

  static readSRF(buffer: ArrayBuffer): DefaultMeshType {
    return NVMeshLoaders.readSRF(buffer)
  }

  static readFreeSurfer(buffer: ArrayBuffer): DefaultMeshType {
    return NVMeshLoaders.readFreeSurfer(buffer)
  }

  static readOBJ(buffer: ArrayBuffer): DefaultMeshType {
    return NVMeshLoaders.readOBJ(buffer)
  }

  static readOFF(buffer: ArrayBuffer): DefaultMeshType {
    return NVMeshLoaders.readOFF(buffer)
  }

  static readGEO(buffer: ArrayBuffer, isFlipWinding = false): DefaultMeshType {
    return NVMeshLoaders.readGEO(buffer, isFlipWinding)
  }

  static readICO(buffer: ArrayBuffer): DefaultMeshType {
    return NVMeshLoaders.readICO(buffer)
  }

  static readPLY(buffer: ArrayBuffer): DefaultMeshType {
    return NVMeshLoaders.readPLY(buffer)
  }

  static readMZ3(buffer: ArrayBuffer, n_vert = 0): MZ3 {
    return NVMeshLoaders.readMZ3(buffer, n_vert)
  }

  static readVTK(buffer: ArrayBuffer): VTK {
    return NVMeshLoaders.readVTK(buffer)
  }

  static readASC(buffer: ArrayBuffer): DefaultMeshType {
    return NVMeshLoaders.readASC(buffer)
  }

  static readNV(buffer: ArrayBuffer): DefaultMeshType {
    return NVMeshLoaders.readNV(buffer)
  }

  static readANNOT(buffer: ArrayBuffer, n_vert: number, isReadColortables = false): ANNOT {
    return NVMeshLoaders.readANNOT(buffer, n_vert, isReadColortables)
  }

  static readCURV(buffer: ArrayBuffer, n_vert: number): Float32Array {
    return NVMeshLoaders.readCURV(buffer, n_vert)
  }

  static readSTC(buffer: ArrayBuffer, n_vert: number): Float32Array {
    return NVMeshLoaders.readSTC(buffer, n_vert)
  }

  static readSMP(buffer: ArrayBuffer, n_vert: number): Float32Array {
    return NVMeshLoaders.readSMP(buffer, n_vert)
  }

  static readTxtVTK(buffer: ArrayBuffer): VTK {
    return NVMeshLoaders.readTxtVTK(buffer)
  }

  static readTRK(buffer: ArrayBuffer): TRK {
    return NVMeshLoaders.readTRK(buffer)
  }

  static readTCK(buffer: ArrayBuffer): TCK {
    return NVMeshLoaders.readTCK(buffer)
  }

  static readTT(buffer: ArrayBuffer): TT {
    return NVMeshLoaders.readTRX(buffer)
  }

  static readTRX(buffer: ArrayBuffer): TRX {
    return NVMeshLoaders.readTRX(buffer)
  }

  static readTRACT(buffer: ArrayBuffer): TRACT {
    return NVMeshLoaders.readTRACT(buffer)
  }
}
