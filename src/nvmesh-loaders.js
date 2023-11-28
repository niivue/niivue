import { mat4, vec4 } from 'gl-matrix'
import { decompressSync, unzipSync } from 'fflate/browser'
import { Log } from './logger'
import { cmapper } from './colortables'
import { NiivueObject3D } from './niivue-object3D'

/**
 * Global logger for utilities
 * @constant
 * @global
 */
const utiltiesLogger = new Log()

/**
 * Class to load different mesh formats
 */
export class NVMeshLoaders {
  // read undocumented AFNI tract.niml format streamlines
  static readTRACT(buffer) {
    const len = buffer.byteLength
    if (len < 20) {
      throw new Error('File too small to be niml.tract: bytes = ' + len)
    }
    const reader = new DataView(buffer)
    const bytes = new Uint8Array(buffer)
    let pos = 0
    function readStr() {
      // read until right angle bracket ">"
      while (pos < len && bytes[pos] !== 60) {
        pos++
      } // start with "<"
      const startPos = pos
      while (pos < len && bytes[pos] !== 62) {
        pos++
      }
      pos++ // skip EOLN
      if (pos - startPos < 1) {
        return ''
      }
      return new TextDecoder().decode(buffer.slice(startPos, pos - 1)).trim()
    }

    let line = readStr() // 1st line: signature '<network'
    function readNumericTag(TagName) {
      // Tag 'Dim1' will return 3 for Dim1="3"
      const pos = line.indexOf(TagName)
      if (pos < 0) {
        return 0
      }
      const spos = line.indexOf('"', pos) + 1
      const epos = line.indexOf('"', spos)
      const str = line.slice(spos, epos)
      return parseInt(str)
    }
    const n_tracts = readNumericTag('N_tracts=')
    if (!line.startsWith('<network') || n_tracts < 1) {
      console.log('This is not a valid niml.tract file ' + line)
    }
    let npt = 0
    const offsetPt0 = []
    offsetPt0.push(npt) // 1st streamline starts at 0
    const pts = []
    const dps = []
    dps.push({
      id: 'tract',
      vals: []
    })
    for (let t = 0; t < n_tracts; t++) {
      line = readStr() // <tracts ...
      const new_tracts = readNumericTag('ni_dimen=')
      const bundleTag = readNumericTag('Bundle_Tag=')
      const isLittleEndian = line.includes('binary.lsbfirst')
      // console.log(new_tracts, pos, isLittleEndian);
      for (let i = 0; i < new_tracts; i++) {
        // let id = reader.getUint32(pos, isLittleEndian);
        pos += 4
        const new_pts = reader.getUint32(pos, isLittleEndian) / 3
        pos += 4
        // console.log('offset', pos, 'new', new_pts,'id', id);
        for (let j = 0; j < new_pts; j++) {
          pts.push(reader.getFloat32(pos, isLittleEndian))
          pos += 4
          pts.push(-reader.getFloat32(pos, isLittleEndian))
          pos += 4
          pts.push(reader.getFloat32(pos, isLittleEndian))
          pos += 4
        }
        npt += new_pts
        offsetPt0.push(npt)
        dps[0].vals.push(bundleTag) // each streamline associated with tract
      }
      line = readStr() // </tracts>
    }
    return {
      pts,
      offsetPt0,
      dps
    }
  } // readTRACT()

  // read TRX format tractogram
  // https://github.com/tee-ar-ex/trx-spec/blob/master/specifications.md
  static async readTRX(buffer) {
    // Javascript does not support float16, so we convert to float32
    // https://stackoverflow.com/questions/5678432/decompressing-half-precision-floats-in-javascript
    function decodeFloat16(binary) {
      'use strict'
      const exponent = (binary & 0x7c00) >> 10
      const fraction = binary & 0x03ff
      return (
        (binary >> 15 ? -1 : 1) *
        (exponent
          ? exponent === 0x1f
            ? fraction
              ? NaN
              : Infinity
            : Math.pow(2, exponent - 15) * (1 + fraction / 0x400)
          : 6.103515625e-5 * (fraction / 0x400))
      )
    } // decodeFloat16()
    let noff = 0
    let npt = 0
    let pts = []
    let offsetPt0 = []
    const dpg = []
    const dps = []
    const dpv = []
    let header = []
    let isOverflowUint64 = false
    /* if (urlIsLocalFile) {
      data = fs.readFileSync(url);
    } else {
      let response = await fetch(url);
      if (!response.ok) throw Error(response.statusText);
      data = await response.arrayBuffer();
    } */
    const decompressed = unzipSync(new Uint8Array(buffer), {
      filter(file) {
        return file.originalSize > 0
      }
    })
    const keys = Object.keys(decompressed)
    for (let i = 0, len = keys.length; i < len; i++) {
      const parts = keys[i].split('/')
      const fname = parts.slice(-1)[0] // my.trx/dpv/fx.float32 -> fx.float32
      if (fname.startsWith('.')) {
        continue
      }
      const pname = parts.slice(-2)[0] // my.trx/dpv/fx.float32 -> dpv
      const tag = fname.split('.')[0] // "positions.3.float16 -> "positions"
      // todo: should tags be censored for invalid characters: https://stackoverflow.com/questions/8676011/which-characters-are-valid-invalid-in-a-json-key-name
      const data = decompressed[keys[i]]
      if (fname.includes('header.json')) {
        const jsonString = new TextDecoder().decode(data)
        header = JSON.parse(jsonString)
        continue
      }
      // next read arrays for all possible datatypes: int8/16/32/64 uint8/16/32/64 float16/32/64
      let nval = 0
      let vals = []
      if (fname.endsWith('.uint64') || fname.endsWith('.int64')) {
        // javascript does not have 64-bit integers! read lower 32-bits
        // note for signed int64 we only read unsigned bytes
        // for both signed and unsigned, generate an error if any value is out of bounds
        // one alternative might be to convert to 64-bit double that has a flintmax of 2^53.
        nval = data.length / 8 // 8 bytes per 64bit input
        vals = new Uint32Array(nval)
        const u32 = new Uint32Array(data.buffer)
        let j = 0
        for (let i = 0; i < nval; i++) {
          vals[i] = u32[j]
          if (u32[j + 1] !== 0) {
            isOverflowUint64 = true
          }
          j += 2
        }
      } else if (fname.endsWith('.uint32')) {
        vals = new Uint32Array(data.buffer)
      } else if (fname.endsWith('.uint16')) {
        vals = new Uint16Array(data.buffer)
      } else if (fname.endsWith('.uint8')) {
        vals = new Uint8Array(data.buffer)
      } else if (fname.endsWith('.int32')) {
        vals = new Int32Array(data.buffer)
      } else if (fname.endsWith('.int16')) {
        vals = new Int16Array(data.buffer)
      } else if (fname.endsWith('.int8')) {
        vals = new Int8Array(data.buffer)
      } else if (fname.endsWith('.float64')) {
        vals = new Float64Array(data.buffer)
      } else if (fname.endsWith('.float32')) {
        vals = new Float32Array(data.buffer)
      } else if (fname.endsWith('.float16')) {
        // javascript does not have 16-bit floats! Convert to 32-bits
        nval = data.length / 2 // 2 bytes per 16bit input
        vals = new Float32Array(nval)
        const u16 = new Uint16Array(data.buffer)
        for (let i = 0; i < nval; i++) {
          vals[i] = decodeFloat16(u16[i])
        }
      } else {
        continue
      } // not a data array
      nval = vals.length

      // next: read data_per_group
      if (pname.includes('groups')) {
        dpg.push({
          id: tag,
          vals: vals.slice()
        })
        continue
      }
      /* if (pname.includes("dpg")) {
        dpg.push({
          id: tag,
          vals: vals.slice(),
        });
        continue;
      } */
      // next: read data_per_vertex
      if (pname.includes('dpv')) {
        dpv.push({
          id: tag,
          vals: vals.slice()
        })
        continue
      }
      // next: read data_per_streamline
      if (pname.includes('dps')) {
        dps.push({
          id: tag,
          vals: vals.slice()
        })
        continue
      }
      // Next: read offsets: Always uint64
      if (fname.startsWith('offsets.')) {
        // javascript does not have 64-bit integers! read lower 32-bits
        noff = nval // 8 bytes per 64bit input
        // we need to solve the fence post problem, so we can not use slice
        offsetPt0 = new Uint32Array(nval + 1)
        for (let i = 0; i < nval; i++) {
          offsetPt0[i] = vals[i]
        }
      }
      if (fname.startsWith('positions.3.')) {
        npt = nval // 4 bytes per 32bit input
        pts = vals.slice()
      }
    }
    if (noff === 0 || npt === 0) {
      utiltiesLogger.error('Failure reading TRX format (no offsets or points).')
      return
    }
    if (isOverflowUint64) {
      alert('Too many vertices: JavaScript does not support 64 bit integers')
    }
    offsetPt0[noff] = npt / 3 // solve fence post problem, offset for final streamline
    return {
      pts,
      offsetPt0,
      dpg,
      dps,
      dpv,
      header
    }
  } // readTRX()

  // read mrtrix tck format streamlines
  // https://mrtrix.readthedocs.io/en/latest/getting_started/image_data.html#tracks-file-format-tck
  static readTCK(buffer) {
    const len = buffer.byteLength
    if (len < 20) {
      throw new Error('File too small to be TCK: bytes = ' + len)
    }
    const bytes = new Uint8Array(buffer)
    let pos = 0
    function readStr() {
      while (pos < len && bytes[pos] === 10) {
        pos++
      } // skip blank lines
      const startPos = pos
      while (pos < len && bytes[pos] !== 10) {
        pos++
      }
      pos++ // skip EOLN
      if (pos - startPos < 1) {
        return ''
      }
      return new TextDecoder().decode(buffer.slice(startPos, pos - 1))
    }
    let line = readStr() // 1st line: signature 'mrtrix tracks'
    if (!line.includes('mrtrix tracks')) {
      console.log('Not a valid TCK file')
      return
    }
    let offset = -1 // "file: offset" is REQUIRED
    while (pos < len && !line.includes('END')) {
      line = readStr()
      if (line.toLowerCase().startsWith('file:')) {
        offset = parseInt(line.split(' ').pop())
      }
    }
    if (offset < 20) {
      console.log('Not a valid TCK file (missing file offset)')
      return
    }
    pos = offset
    const reader = new DataView(buffer)
    // read and transform vertex positions
    let npt = 0
    const offsetPt0 = []
    offsetPt0.push(npt) // 1st streamline starts at 0
    const pts = []
    while (pos + 12 < len) {
      const ptx = reader.getFloat32(pos, true)
      pos += 4
      const pty = reader.getFloat32(pos, true)
      pos += 4
      const ptz = reader.getFloat32(pos, true)
      pos += 4
      if (!isFinite(ptx)) {
        // both NaN and Infinity are not finite
        offsetPt0.push(npt)
        if (!isNaN(ptx)) {
          // terminate if infinity
          break
        }
      } else {
        pts.push(ptx)
        pts.push(pty)
        pts.push(ptz)
        npt++
      }
    }
    return {
      pts,
      offsetPt0
    }
  } // readTCK()

  // not included in public docs
  // read trackvis trk format streamlines
  // http://trackvis.org/docs/?subsect=fileformat
  static readTRK(buffer) {
    // http://www.tractometer.org/fiberweb/
    // https://github.com/xtk/X/tree/master/io
    // in practice, always little endian
    let reader = new DataView(buffer)
    let magic = reader.getUint32(0, true) // 'TRAC'
    if (magic !== 1128354388) {
      // e.g. TRK.gz
      let raw
      if (magic === 4247762216) {
        // e.g. TRK.zstd
        // raw = fzstd.decompress(new Uint8Array(buffer));
        // raw = new Uint8Array(raw);
        throw new Error('zstd TRK decompression is not supported')
      } else {
        raw = decompressSync(new Uint8Array(buffer))
      }
      buffer = raw.buffer
      reader = new DataView(buffer)
      magic = reader.getUint32(0, true) // 'TRAC'
    }
    const vers = reader.getUint32(992, true) // 2
    const hdr_sz = reader.getUint32(996, true) // 1000
    if (vers > 2 || hdr_sz !== 1000 || magic !== 1128354388) {
      throw new Error('Not a valid TRK file')
    }
    const dps = []
    const dpv = []
    const n_scalars = reader.getInt16(36, true)
    if (n_scalars > 0) {
      // data_per_vertex
      for (let i = 0; i < n_scalars; i++) {
        const arr = new Uint8Array(buffer.slice(38 + i * 20, 58 + i * 20))
        const str = new TextDecoder().decode(arr).split('\0').shift()
        dpv.push({
          id: str.trim(),
          vals: []
        })
      }
    }
    const voxel_sizeX = reader.getFloat32(12, true)
    const voxel_sizeY = reader.getFloat32(16, true)
    const voxel_sizeZ = reader.getFloat32(20, true)
    const zoomMat = mat4.fromValues(
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
    )
    const n_properties = reader.getInt16(238, true)
    if (n_properties > 0) {
      for (let i = 0; i < n_properties; i++) {
        const arr = new Uint8Array(buffer.slice(240 + i * 20, 260 + i * 20))
        const str = new TextDecoder().decode(arr).split('\0').shift()
        dps.push({
          id: str.trim(),
          vals: []
        })
      }
    }
    const mat = mat4.create()
    for (let i = 0; i < 16; i++) {
      mat[i] = reader.getFloat32(440 + i * 4, true)
    }
    if (mat[15] === 0.0) {
      // vox_to_ras[3][3] is 0, it means the matrix is not recorded
      console.log('TRK vox_to_ras not set')
      mat4.identity(mat)
    }
    const vox2mmMat = mat4.create()
    mat4.mul(vox2mmMat, mat, zoomMat)
    // translation is in mm and not influenced by resolution
    vox2mmMat[3] = mat[3]
    vox2mmMat[7] = mat[7]
    vox2mmMat[11] = mat[11]
    let i32 = null
    let f32 = null
    i32 = new Int32Array(buffer.slice(hdr_sz))
    f32 = new Float32Array(i32.buffer)
    const ntracks = i32.length
    if (ntracks < 1) {
      utiltiesLogger.error('Empty TRK file.')
      return
    }
    // read and transform vertex positions
    let i = 0
    let npt = 0
    const offsetPt0 = []
    const pts = []
    while (i < ntracks) {
      const n_pts = i32[i]
      i = i + 1 // read 1 32-bit integer for number of points in this streamline
      offsetPt0.push(npt) // index of first vertex in this streamline
      for (let j = 0; j < n_pts; j++) {
        const ptx = f32[i + 0]
        const pty = f32[i + 1]
        const ptz = f32[i + 2]
        i += 3 // read 3 32-bit floats for XYZ position
        pts.push(ptx * vox2mmMat[0] + pty * vox2mmMat[1] + ptz * vox2mmMat[2] + vox2mmMat[3])
        pts.push(ptx * vox2mmMat[4] + pty * vox2mmMat[5] + ptz * vox2mmMat[6] + vox2mmMat[7])
        pts.push(ptx * vox2mmMat[8] + pty * vox2mmMat[9] + ptz * vox2mmMat[10] + vox2mmMat[11])
        if (n_scalars > 0) {
          for (let s = 0; s < n_scalars; s++) {
            dpv[s].vals.push(f32[i])
            i++
          }
        }
        npt++
      } // for j: each point in streamline
      if (n_properties > 0) {
        for (let j = 0; j < n_properties; j++) {
          dps[j].vals.push(f32[i])
          i++
        }
      }
    } // for each streamline: while i < n_count
    offsetPt0.push(npt) // add 'first index' as if one more line was added (fence post problem)
    return {
      pts,
      offsetPt0,
      dps,
      dpv
    }
  } // readTRK()

  // read legacy VTK text format file
  static readTxtVTK(buffer) {
    const enc = new TextDecoder('utf-8')
    const txt = enc.decode(buffer)
    const lines = txt.split('\n')
    const n = lines.length
    if (n < 7 || !lines[0].startsWith('# vtk DataFile')) {
      alert('Invalid VTK image')
    }
    if (!lines[2].startsWith('ASCII')) {
      alert('Not ASCII VTK mesh')
    }
    let pos = 3
    while (lines[pos].length < 1) {
      pos++
    } // skip blank lines
    if (!lines[pos].includes('POLYDATA')) {
      alert('Not ASCII VTK polydata')
    }
    pos++
    while (lines[pos].length < 1) {
      pos++
    } // skip blank lines
    if (!lines[pos].startsWith('POINTS')) {
      alert('Not VTK POINTS')
    }
    let items = lines[pos].trim().split(/\s+/)
    const nvert = parseInt(items[1]) // POINTS 10261 float
    const nvert3 = nvert * 3
    const positions = new Float32Array(nvert * 3)
    let v = 0
    while (v < nvert * 3) {
      pos++
      const str = lines[pos].trim()
      const pts = str.trim().split(/\s+/)
      for (let i = 0; i < pts.length; i++) {
        if (v >= nvert3) {
          break
        }
        positions[v] = parseFloat(pts[i])
        v++
      }
    }
    const tris = []
    pos++
    while (lines[pos].length < 1) {
      pos++
    } // skip blank lines
    items = lines[pos].trim().split(/\s+/)
    pos++
    if (items[0].includes('LINES')) {
      const n_count = parseInt(items[1])
      if (n_count < 1) {
        alert('Corrupted VTK ASCII')
      }
      let str = lines[pos].trim()
      let offsetPt0 = []
      let pts = []
      if (str.startsWith('OFFSETS')) {
        // 'new' line style https://discourse.vtk.org/t/upcoming-changes-to-vtkcellarray/2066
        offsetPt0 = new Uint32Array(n_count)
        pos++
        let c = 0
        while (c < n_count) {
          str = lines[pos].trim()
          pos++
          const items = str.trim().split(/\s+/)
          for (let i = 0; i < items.length; i++) {
            offsetPt0[c] = parseInt(items[i])
            c++
            if (c >= n_count) {
              break
            }
          } // for each line
        } // while offset array not filled
        pts = positions
      } else {
        // classic line style https://www.visitusers.org/index.php?title=ASCII_VTK_Files
        offsetPt0 = new Uint32Array(n_count + 1)
        let npt = 0
        pts = []
        offsetPt0[0] = 0 // 1st streamline starts at 0
        let asciiInts = []
        let asciiIntsPos = 0

        function lineToInts() {
          // VTK can save one array across multiple ASCII lines
          str = lines[pos].trim()
          const items = str.trim().split(/\s+/)
          asciiInts = []
          for (let i = 0; i < items.length; i++) {
            asciiInts.push(parseInt(items[i]))
          }
          asciiIntsPos = 0
          pos++
        }

        lineToInts()
        for (let c = 0; c < n_count; c++) {
          if (asciiIntsPos >= asciiInts.length) {
            lineToInts()
          }
          const numPoints = asciiInts[asciiIntsPos++]
          npt += numPoints
          offsetPt0[c + 1] = npt
          for (let i = 0; i < numPoints; i++) {
            if (asciiIntsPos >= asciiInts.length) {
              lineToInts()
            }
            const idx = asciiInts[asciiIntsPos++] * 3
            pts.push(positions[idx + 0]) // X
            pts.push(positions[idx + 1]) // Y
            pts.push(positions[idx + 2]) // Z
          } // for numPoints: number of segments in streamline
        } // for n_count: number of streamlines
      }
      return {
        pts,
        offsetPt0
      }
    } else if (items[0].includes('TRIANGLE_STRIPS')) {
      const nstrip = parseInt(items[1])
      for (let i = 0; i < nstrip; i++) {
        const str = lines[pos].trim()
        pos++
        const vs = str.trim().split(/\s+/)
        const ntri = parseInt(vs[0]) - 2 // -2 as triangle strip is creates pts - 2 faces
        let k = 1
        for (let t = 0; t < ntri; t++) {
          if (t % 2) {
            // preserve winding order
            tris.push(parseInt(vs[k + 2]))
            tris.push(parseInt(vs[k + 1]))
            tris.push(parseInt(vs[k]))
          } else {
            tris.push(parseInt(vs[k]))
            tris.push(parseInt(vs[k + 1]))
            tris.push(parseInt(vs[k + 2]))
          }
          k += 1
        } // for each triangle
      } // for each strip
    } else if (items[0].includes('POLYGONS')) {
      const npoly = parseInt(items[1])
      for (let i = 0; i < npoly; i++) {
        const str = lines[pos].trim()
        pos++
        const vs = str.trim().split(/\s+/)
        const ntri = parseInt(vs[0]) - 2 // e.g. 3 for triangle
        const fx = parseInt(vs[1])
        let fy = parseInt(vs[2])
        for (let t = 0; t < ntri; t++) {
          const fz = parseInt(vs[3 + t])
          tris.push(fx)
          tris.push(fy)
          tris.push(fz)
          fy = fz
        }
      }
    } else {
      alert('Unsupported ASCII VTK datatype ' + items[0])
    }
    const indices = new Int32Array(tris)
    return {
      positions,
      indices
    }
  } // readTxtVTK()

  // read mesh overlay to influence vertex colors
  static readLayer(
    name,
    buffer,
    nvmesh,
    opacity = 0.5,
    colormap = 'warm',
    colormapNegative = 'winter',
    useNegativeCmap = false,
    cal_min = null,
    cal_max = null,
    isOutlineBorder = false
  ) {
    const layer = []
    layer.colormapInvert = false
    layer.alphaThreshold = false
    layer.isTransparentBelowCalMin = true
    layer.isAdditiveBlend = false
    layer.colorbarVisible = true
    layer.colormapLabel = []
    const isReadColortables = true
    const n_vert = nvmesh.vertexCount / 3 // each vertex has XYZ component
    if (n_vert < 3) {
      return
    }
    const re = /(?:\.([^.]+))?$/
    let ext = re.exec(name)[1]
    ext = ext.toUpperCase()
    if (ext === 'GZ') {
      ext = re.exec(name.slice(0, -3))[1] // img.trk.gz -> img.trk
      ext = ext.toUpperCase()
    }
    if (ext === 'MZ3') {
      layer.values = NVMeshLoaders.readMZ3(buffer, n_vert)
    } else if (ext === 'ANNOT') {
      if (!isReadColortables) {
        layer.values = NVMeshLoaders.readANNOT(buffer, n_vert)
      } else {
        const obj = NVMeshLoaders.readANNOT(buffer, n_vert, true)
        if ('scalars' in obj) {
          layer.values = obj.scalars
          layer.colormapLabel = obj.colormapLabel
        } // unable to decode colormapLabel
        else {
          layer.values = obj
        }
      }
    } else if (ext === 'CRV' || ext === 'CURV') {
      layer.values = NVMeshLoaders.readCURV(buffer, n_vert)
      layer.isTransparentBelowCalMin = false
    } else if (ext === 'GII') {
      const obj = NVMeshLoaders.readGII(buffer, n_vert)
      layer.values = obj.scalars // colormapLabel
      layer.colormapLabel = obj.colormapLabel
    } else if (ext === 'MGH' || ext === 'MGZ') {
      if (!isReadColortables) {
        layer.values = NVMeshLoaders.readMGH(buffer, n_vert)
      } else {
        const obj = NVMeshLoaders.readMGH(buffer, n_vert, true)
        if ('scalars' in obj) {
          layer.values = obj.scalars
          layer.colormapLabel = obj.colormapLabel
        } // unable to decode colormapLabel
        else {
          layer.values = obj
        }
      }
    } else if (ext === 'NII') {
      layer.values = NVMeshLoaders.readNII(buffer, n_vert)
    } else if (ext === 'SMP') {
      layer.values = NVMeshLoaders.readSMP(buffer, n_vert)
    } else if (ext === 'STC') {
      layer.values = NVMeshLoaders.readSTC(buffer, n_vert)
    } else {
      console.log('Unknown layer overlay format ' + name)
      return
    }
    if (!layer.values) {
      return
    }
    layer.nFrame4D = layer.values.length / n_vert
    layer.frame4D = 0
    layer.isOutlineBorder = isOutlineBorder
    // determine global min..max
    let mn = layer.values[0]
    let mx = layer.values[0]
    for (let i = 0; i < layer.values.length; i++) {
      mn = Math.min(mn, layer.values[i])
      mx = Math.max(mx, layer.values[i])
    }
    // console.log('layer range: ', mn, mx);
    layer.global_min = mn
    layer.global_max = mx
    layer.cal_min = cal_min
    if (!cal_min) {
      layer.cal_min = mn
    }
    layer.cal_max = cal_max
    if (!cal_max) {
      layer.cal_max = mx
    }
    layer.cal_minNeg = NaN
    layer.cal_maxNeg = NaN
    layer.opacity = opacity
    layer.colormap = colormap
    layer.colormapNegative = colormapNegative
    layer.useNegativeCmap = useNegativeCmap
    nvmesh.layers.push(layer)
  } // readLayer()

  // read brainvoyager smp format file
  // https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/40-the-format-of-smp-files
  static readSMP(buffer, n_vert) {
    const len = buffer.byteLength
    let reader = new DataView(buffer)
    let vers = reader.getUint16(0, true)
    if (vers > 5) {
      // assume gzip
      const raw = decompressSync(new Uint8Array(buffer))
      reader = new DataView(raw.buffer)
      vers = reader.getUint16(0, true)
      buffer = raw.buffer
    }
    if (vers > 5) {
      console.log('Unsupported or invalid BrainVoyager SMP version ' + vers)
    }
    const nvert = reader.getUint32(2, true)
    if (nvert !== n_vert) {
      console.log('SMP file has ' + nvert + ' vertices, background mesh has ' + n_vert)
    }
    const nMaps = reader.getUint16(6, true)

    const scalars = new Float32Array(nvert * nMaps)
    const maps = []
    // read Name of SRF
    let pos = 9

    function readStr() {
      const startPos = pos
      while (pos < len && reader.getUint8(pos) !== 0) {
        pos++
      }
      pos++ // skip null termination
      return new TextDecoder().decode(buffer.slice(startPos, pos - 1))
    } // readStr: read variable length string

    for (let i = 0; i < nMaps; i++) {
      const m = []
      m.mapType = reader.getUint32(pos, true)
      pos += 4
      // Read additional values only if a lag map
      if (vers >= 3 && m.mapType === 3) {
        m.nLags = reader.getUint32(pos, true)
        pos += 4
        m.mnLag = reader.getUint32(pos, true)
        pos += 4
        m.mxLag = reader.getUint32(pos, true)
        pos += 4
        m.ccOverlay = reader.getUint32(pos, true)
        pos += 4
      }
      m.clusterSize = reader.getUint32(pos, true)
      pos += 4
      m.clusterCheck = reader.getUint8(pos)
      pos += 1
      m.critThresh = reader.getFloat32(pos, true)
      pos += 4
      m.maxThresh = reader.getFloat32(pos, true)
      pos += 4
      if (vers >= 4) {
        m.includeValuesGreaterThreshMax = reader.getUint32(pos, true)
        pos += 4
      }
      m.df1 = reader.getUint32(pos, true)
      pos += 4
      m.df2 = reader.getUint32(pos, true)
      pos += 4
      if (vers >= 5) {
        m.posNegFlag = reader.getUint32(pos, true)
        pos += 4
      } else {
        m.posNegFlag = 3
      }
      m.cortexBonferroni = reader.getUint32(pos, true)
      pos += 4
      m.posMinRGB = [0, 0, 0]
      m.posMaxRGB = [0, 0, 0]
      m.negMinRGB = [0, 0, 0]
      m.negMaxRGB = [0, 0, 0]
      if (vers >= 2) {
        m.posMinRGB[0] = reader.getUint8(pos)
        pos++
        m.posMinRGB[1] = reader.getUint8(pos)
        pos++
        m.posMinRGB[2] = reader.getUint8(pos)
        pos++
        m.posMaxRGB[0] = reader.getUint8(pos)
        pos++
        m.posMaxRGB[1] = reader.getUint8(pos)
        pos++
        m.posMaxRGB[2] = reader.getUint8(pos)
        pos++
        if (vers >= 4) {
          m.negMinRGB[0] = reader.getUint8(pos)
          pos++
          m.negMinRGB[1] = reader.getUint8(pos)
          pos++
          m.negMinRGB[2] = reader.getUint8(pos)
          pos++
          m.negMaxRGB[0] = reader.getUint8(pos)
          pos++
          m.negMaxRGB[1] = reader.getUint8(pos)
          pos++
          m.negMaxRGB[2] = reader.getUint8(pos)
          pos++
        } // vers >= 4
        m.enableSMPColor = reader.getUint8(pos)
        pos++
        if (vers >= 4) {
          m.lut = readStr()
        }
        m.colorAlpha = reader.getFloat32(pos, true)
        pos += 4
      } // vers >= 2
      m.name = readStr()
      const scalarsNew = new Float32Array(buffer, pos, nvert, true)
      scalars.set(scalarsNew, i * nvert)
      pos += nvert * 4
      maps.push(m)
    } // for i to nMaps
    return scalars
  } // readSMP()

  // read mne stc format file, not to be confused with brainvoyager stc format
  // https://github.com/mne-tools/mne-python/blob/main/mne/source_estimate.py#L211-L365
  static readSTC(buffer, n_vert) {
    // https://github.com/fahsuanlin/fhlin_toolbox/blob/400cb73cda4880d9ad7841d9dd68e4e9762976bf/codes/inverse_read_stc.m
    // let len = buffer.byteLength;
    const reader = new DataView(buffer)
    // first 12 bytes are header
    // let epoch_begin_latency = reader.getFloat32(0, false);
    // let sample_period = reader.getFloat32(4, false);
    const n_vertex = reader.getInt32(8, false)
    if (n_vertex !== n_vert) {
      console.log('Overlay has ' + n_vertex + ' vertices, expected ' + n_vert)
      return
    }
    // next 4*n_vertex bytes are vertex IDS
    let pos = 12 + n_vertex * 4
    // next 4 bytes reports number of volumes/time points
    const n_time = reader.getUint32(pos, false)
    pos += 4
    const f32 = new Float32Array(n_time * n_vertex)
    // reading all floats with .slice() would be faster, but lets handle endian-ness
    for (let i = 0; i < n_time * n_vertex; i++) {
      f32[i] = reader.getFloat32(pos, false)
      pos += 4
    }
    return f32
  } // readSTC()

  // read freesurfer curv big-endian format
  // https://github.com/bonilhamusclab/MRIcroS/blob/master/%2BfileUtils/%2Bpial/readPial.m
  // http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm
  static readCURV(buffer, n_vert) {
    const view = new DataView(buffer) // ArrayBuffer to dataview
    // ALWAYS big endian
    const sig0 = view.getUint8(0)
    const sig1 = view.getUint8(1)
    const sig2 = view.getUint8(2)
    const n_vertex = view.getUint32(3, false)
    // let num_f = view.getUint32(7, false);
    const n_time = view.getUint32(11, false)
    if (sig0 !== 255 || sig1 !== 255 || sig2 !== 255) {
      utiltiesLogger.debug('Unable to recognize file type: does not appear to be FreeSurfer format.')
    }
    if (n_vert !== n_vertex) {
      utiltiesLogger.debug('CURV file has different number of vertices ( ' + n_vertex + ')than mesh (' + n_vert + ')')
      return
    }
    if (buffer.byteLength < 15 + 4 * n_vertex * n_time) {
      console.log('CURV file smaller than specified')
      return
    }
    const f32 = new Float32Array(n_time * n_vertex)
    let pos = 15
    // reading all floats with .slice() would be faster, but lets handle endian-ness
    for (let i = 0; i < n_time * n_vertex; i++) {
      f32[i] = view.getFloat32(pos, false)
      pos += 4
    }
    let mn = f32[0]
    let mx = f32[0]
    for (let i = 0; i < f32.length; i++) {
      mn = Math.min(mn, f32[i])
      mx = Math.max(mx, f32[i])
    }
    // normalize
    const scale = 1.0 / (mx - mn)
    for (let i = 0; i < f32.length; i++) {
      f32[i] = 1.0 - (f32[i] - mn) * scale
    }
    return f32
  } // readCURV()

  // read freesurfer Annotation file provides vertex colors
  // https://surfer.nmr.mgh.harvard.edu/fswiki/LabelsClutsAnnotationFiles
  static readANNOT(buffer, n_vert, isReadColortables = false) {
    const view = new DataView(buffer) // ArrayBuffer to dataview
    // ALWAYS big endian
    const n_vertex = view.getUint32(0, false)
    if (n_vert !== n_vertex) {
      console.log('ANNOT file has different number of vertices than mesh')
      return
    }
    if (buffer.byteLength < 4 + 8 * n_vertex) {
      console.log('ANNOT file smaller than specified')
      return
    }
    let pos = 0
    // reading all floats with .slice() would be faster, but lets handle endian-ness
    const rgba32 = new Uint32Array(n_vertex)
    for (let i = 0; i < n_vertex; i++) {
      const idx = view.getUint32((pos += 4), false)
      rgba32[idx] = view.getUint32((pos += 4), false)
    }
    if (!isReadColortables) {
      // only read label colors, ignore labels
      return rgba32
    }
    let tag = 0
    try {
      tag = view.getInt32((pos += 4), false)
    } catch (error) {
      return rgba32
    }
    const TAG_OLD_COLORTABLE = 1
    if (tag !== TAG_OLD_COLORTABLE) {
      // undocumented old format
      return rgba32
    }
    const ctabversion = view.getInt32((pos += 4), false)
    if (ctabversion > 0) {
      // undocumented old format
      return rgba32
    }
    const maxstruc = view.getInt32((pos += 4), false)
    const len = view.getInt32((pos += 4), false)
    pos += len
    const num_entries = view.getInt32((pos += 4), false)
    if (num_entries < 1) {
      // undocumented old format
      return rgba32
    }
    // preallocate lookuptable
    const LUT = {
      R: Array(maxstruc).fill(0),
      G: Array(maxstruc).fill(0),
      B: Array(maxstruc).fill(0),
      A: Array(maxstruc).fill(0),
      I: Array(maxstruc).fill(0),
      labels: Array(maxstruc).fill('')
    }
    for (let i = 0; i < num_entries; i++) {
      const struc = view.getInt32((pos += 4), false)
      const labelLen = view.getInt32((pos += 4), false)
      pos += 4
      let txt = ''
      for (let c = 0; c < labelLen; c++) {
        const val = view.getUint8(pos++)
        if (val === 0) {
          break
        }
        txt += String.fromCharCode(val)
      }
      pos -= 4
      const R = view.getInt32((pos += 4), false)
      const G = view.getInt32((pos += 4), false)
      const B = view.getInt32((pos += 4), false)
      const A = view.getInt32((pos += 4), false)
      if (struc < 0 || struc >= maxstruc) {
        console.log('annot entry out of range')
        continue
      }
      LUT.R[struc] = R
      LUT.G[struc] = G
      LUT.B[struc] = B
      LUT.A[struc] = A
      LUT.I[struc] = (A << 24) + (B << 16) + (G << 8) + R
      LUT.labels[struc] = txt
    }
    const scalars = new Float32Array(n_vertex)
    scalars.fill(-1)
    let nError = 0
    for (let i = 0; i < n_vert; i++) {
      const RGB = rgba32[i]
      for (let c = 0; c < maxstruc; c++) {
        if (LUT.I[c] === RGB) {
          scalars[i] = c
          break
        }
      } // for c
      if (scalars[i] < 0) {
        nError++
        scalars[i] = 0
      }
    }
    if (nError > 0) {
      console.log(`annot vertex colors do not match ${nError} of ${n_vertex} vertices.`)
    }
    for (let i = 0; i < maxstruc; i++) {
      LUT.I[i] = i
    }
    const colormapLabel = cmapper.makeLabelLut(LUT)
    return {
      scalars,
      colormapLabel
    }
  } // readANNOT()

  // read BrainNet viewer format
  // https://www.nitrc.org/projects/bnv/
  static readNV(buffer) {
    // n.b. clockwise triangle winding, indexed from 1
    const len = buffer.byteLength
    const bytes = new Uint8Array(buffer)
    let pos = 0
    function readStr() {
      while (pos < len && bytes[pos] === 10) {
        pos++
      } // skip blank lines
      const startPos = pos
      while (pos < len && bytes[pos] !== 10) {
        pos++
      }
      pos++ // skip EOLN
      if (pos - startPos < 1) {
        return ''
      }
      return new TextDecoder().decode(buffer.slice(startPos, pos - 1))
    }
    let nvert = 0 // 173404 346804
    let ntri = 0
    let v = 0
    let t = 0
    let positions = []
    let indices = []
    while (pos < len) {
      const line = readStr()
      if (line.startsWith('#')) {
        continue
      }
      const items = line.trim().split(/\s+/)
      if (nvert < 1) {
        nvert = parseInt(items[0])
        positions = new Float32Array(nvert * 3)
        continue
      }
      if (v < nvert * 3) {
        positions[v] = parseFloat(items[0])
        positions[v + 1] = parseFloat(items[1])
        positions[v + 2] = parseFloat(items[2])
        v += 3
        continue
      }
      if (ntri < 1) {
        ntri = parseInt(items[0])
        indices = new Int32Array(ntri * 3)
        continue
      }
      if (t >= ntri * 3) {
        break
      }
      indices[t + 2] = parseInt(items[0]) - 1
      indices[t + 1] = parseInt(items[1]) - 1
      indices[t + 0] = parseInt(items[2]) - 1
      t += 3
    }
    return {
      positions,
      indices
    }
  } // readNV()

  // read ASCII Patch File format
  // https://afni.nimh.nih.gov/pub/dist/doc/htmldoc/demos/Bootcamp/CD.html#cd
  // http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm
  static readASC(buffer) {
    const len = buffer.byteLength
    const bytes = new Uint8Array(buffer)
    let pos = 0
    function readStr() {
      while (pos < len && bytes[pos] === 10) {
        pos++
      } // skip blank lines
      const startPos = pos
      while (pos < len && bytes[pos] !== 10) {
        pos++
      }
      pos++ // skip EOLN
      if (pos - startPos < 1) {
        return ''
      }
      return new TextDecoder().decode(buffer.slice(startPos, pos - 1))
    }
    let line = readStr() // 1st line: '#!ascii version of lh.pial'
    if (!line.startsWith('#!ascii')) {
      console.log('Invalid ASC mesh')
    }
    line = readStr() // 1st line: signature
    let items = line.trim().split(/\s+/)
    const nvert = parseInt(items[0]) // 173404 346804
    const ntri = parseInt(items[1])
    const positions = new Float32Array(nvert * 3)
    let j = 0
    for (let i = 0; i < nvert; i++) {
      line = readStr() // 1st line: signature
      items = line.trim().split(/\s+/)
      positions[j] = parseFloat(items[0])
      positions[j + 1] = parseFloat(items[1])
      positions[j + 2] = parseFloat(items[2])
      j += 3
    }
    const indices = new Int32Array(ntri * 3)
    j = 0
    for (let i = 0; i < ntri; i++) {
      line = readStr() // 1st line: signature
      items = line.trim().split(/\s+/)
      indices[j] = parseInt(items[0])
      indices[j + 1] = parseInt(items[1])
      indices[j + 2] = parseInt(items[2])
      j += 3
    }
    return {
      positions,
      indices
    }
  } // readASC()

  // read legacy VTK format
  static readVTK(buffer) {
    const len = buffer.byteLength
    if (len < 20) {
      throw new Error('File too small to be VTK: bytes = ' + buffer.byteLength)
    }
    const bytes = new Uint8Array(buffer)
    let pos = 0
    function readStr(isSkipBlank = true) {
      if (isSkipBlank) {
        while (pos < len && bytes[pos] === 10) {
          pos++
        }
      } // skip blank lines
      const startPos = pos
      while (pos < len && bytes[pos] !== 10) {
        pos++
      }
      pos++ // skip EOLN
      if (pos - startPos < 1) {
        return ''
      }
      return new TextDecoder().decode(buffer.slice(startPos, pos - 1))
    }
    let line = readStr() // 1st line: signature
    if (!line.startsWith('# vtk DataFile')) {
      alert('Invalid VTK mesh')
    }
    line = readStr(false) // 2nd line comment, n.b. MRtrix stores empty line
    line = readStr() // 3rd line ASCII/BINARY
    if (line.startsWith('ASCII')) {
      return NVMeshLoaders.readTxtVTK(buffer)
    } else if (!line.startsWith('BINARY')) {
      alert('Invalid VTK image, expected ASCII or BINARY', line)
    }
    line = readStr() // 5th line "DATASET POLYDATA"
    if (!line.includes('POLYDATA')) {
      alert('Only able to read VTK POLYDATA', line)
    }
    line = readStr() // 6th line "POINTS 10261 float"
    if (!line.includes('POINTS') || (!line.includes('double') && !line.includes('float'))) {
      console.log('Only able to read VTK float or double POINTS' + line)
    }
    const isFloat64 = line.includes('double')
    let items = line.trim().split(/\s+/)
    const nvert = parseInt(items[1]) // POINTS 10261 float
    const nvert3 = nvert * 3
    const positions = new Float32Array(nvert3)
    const reader = new DataView(buffer)
    if (isFloat64) {
      for (let i = 0; i < nvert3; i++) {
        positions[i] = reader.getFloat64(pos, false)
        pos += 8
      }
    } else {
      for (let i = 0; i < nvert3; i++) {
        positions[i] = reader.getFloat32(pos, false)
        pos += 4
      }
    }
    line = readStr() // Type, "LINES 11885 "
    items = line.trim().split(/\s+/)
    const tris = []
    if (items[0].includes('LINES')) {
      const n_count = parseInt(items[1])
      // tractogaphy data: detect if borked by DiPy
      const posOK = pos
      line = readStr() // borked files "OFFSETS vtktypeint64"
      if (line.startsWith('OFFSETS')) {
        // console.log("invalid VTK file created by DiPy");
        let isInt64 = false
        if (line.includes('int64')) {
          isInt64 = true
        }
        const offsetPt0 = new Uint32Array(n_count)
        if (isInt64) {
          let isOverflowInt32 = false
          for (let c = 0; c < n_count; c++) {
            let idx = reader.getInt32(pos, false)
            if (idx !== 0) {
              isOverflowInt32 = true
            }
            pos += 4
            idx = reader.getInt32(pos, false)
            pos += 4
            offsetPt0[c] = idx
          }
          if (isOverflowInt32) {
            console.log('int32 overflow: JavaScript does not support int64')
          }
        } else {
          for (let c = 0; c < n_count; c++) {
            const idx = reader.getInt32(pos, false)
            pos += 4
            offsetPt0[c] = idx
          }
        }
        const pts = positions
        return {
          pts,
          offsetPt0
        }
      }
      pos = posOK // valid VTK file
      let npt = 0
      const offsetPt0 = []
      const pts = []
      offsetPt0.push(npt) // 1st streamline starts at 0
      for (let c = 0; c < n_count; c++) {
        const numPoints = reader.getInt32(pos, false)
        pos += 4
        npt += numPoints
        offsetPt0.push(npt)
        for (let i = 0; i < numPoints; i++) {
          const idx = reader.getInt32(pos, false) * 3
          pos += 4
          pts.push(positions[idx + 0])
          pts.push(positions[idx + 1])
          pts.push(positions[idx + 2])
        } // for numPoints: number of segments in streamline
      } // for n_count: number of streamlines
      return {
        pts,
        offsetPt0
      }
    } else if (items[0].includes('TRIANGLE_STRIPS')) {
      const nstrip = parseInt(items[1])
      for (let i = 0; i < nstrip; i++) {
        const ntri = reader.getInt32(pos, false) - 2 // -2 as triangle strip is creates pts - 2 faces
        pos += 4
        for (let t = 0; t < ntri; t++) {
          if (t % 2) {
            // preserve winding order
            tris.push(reader.getInt32(pos + 8, false))
            tris.push(reader.getInt32(pos + 4, false))
            tris.push(reader.getInt32(pos, false))
          } else {
            tris.push(reader.getInt32(pos, false))
            tris.push(reader.getInt32(pos + 4, false))
            tris.push(reader.getInt32(pos + 8, false))
          }
          pos += 4
        } // for each triangle
        pos += 8
      } // for each strip
    } else if (items[0].includes('POLYGONS')) {
      const npoly = parseInt(items[1])
      for (let i = 0; i < npoly; i++) {
        const ntri = reader.getInt32(pos, false) - 2 // 3 for single triangle, 4 for 2 triangles
        if (i === 0 && ntri > 65535) {
          alert('Invalid VTK binary polygons using little-endian data (MRtrix)')
          return null
        }
        pos += 4
        const fx = reader.getInt32(pos, false)
        pos += 4
        let fy = reader.getInt32(pos, false)
        pos += 4
        for (let t = 0; t < ntri; t++) {
          const fz = reader.getInt32(pos, false)
          pos += 4
          tris.push(fx)
          tris.push(fy)
          tris.push(fz)
          fy = fz
        } // for each triangle
      } // for each polygon
    } else {
      alert('Unsupported binary VTK datatype ', items[0])
    }
    const indices = new Int32Array(tris)
    return {
      positions,
      indices
    }
  } // readVTK()

  // read brainsuite DFS format
  // http://brainsuite.org/formats/dfs/
  static readDFS(buffer /*, n_vert = 0 */) {
    // Does not play with other formats: vertex positions do not use Aneterior Commissure as origin
    const reader = new DataView(buffer)
    const magic = reader.getUint32(0, true) // "DFS_"
    const LE = reader.getUint16(4, true) // "LE"
    if (magic !== 1599292996 || LE !== 17740) {
      console.log('Not a little-endian brainsuite DFS mesh')
    }
    const hdrBytes = reader.getUint32(12, true)
    // var mdoffset = reader.getUint32(16, true);
    // var pdoffset = reader.getUint32(20, true);
    const nface = reader.getUint32(24, true) // number of triangles
    const nvert = reader.getUint32(28, true)
    // var nStrips = reader.getUint32(32, true); //deprecated
    // var stripSize = reader.getUint32(36, true); //deprecated
    // var normals = reader.getUint32(40, true);
    // var uvStart = reader.getUint32(44, true);
    const vcoffset = reader.getUint32(48, true) // vertexColor offset
    // var precision = reader.getUint32(52, true);
    // float64 orientation[4][4]; //4x4 matrix, affine transformation to world coordinates*)
    let pos = hdrBytes
    const indices = new Int32Array(buffer, pos, nface * 3, true)
    pos += nface * 3 * 4
    const positions = new Float32Array(buffer, pos, nvert * 3, true)
    // oops, triangle winding opposite of CCW convention
    for (let i = 0; i < nvert * 3; i += 3) {
      const tmp = positions[i]
      positions[i] = positions[i + 1]
      positions[i + 1] = tmp
    }
    let colors = null
    if (vcoffset >= 0) {
      colors = new Float32Array(buffer, vcoffset, nvert * 3, true)
    }
    return {
      positions,
      indices,
      colors
    }
  }

  // read surfice MZ3 format
  // https://github.com/neurolabusc/surf-ice/tree/master/mz3
  static readMZ3(buffer, n_vert = 0) {
    // ToDo: mz3 always little endian: support big endian? endian https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array
    if (buffer.byteLength < 20) {
      // 76 for raw, not sure of gzip
      throw new Error('File too small to be mz3: bytes = ' + buffer.byteLength)
    }
    let reader = new DataView(buffer)
    // get number of vertices and faces
    let magic = reader.getUint16(0, true)
    let _buffer = buffer
    if (magic === 35615 || magic === 8075) {
      // gzip signature 0x1F8B in little and big endian
      const raw = decompressSync(new Uint8Array(buffer))
      reader = new DataView(raw.buffer)
      magic = reader.getUint16(0, true)
      _buffer = raw.buffer
      // throw new Error( 'Gzip MZ3 file' );
    }
    const attr = reader.getUint16(2, true)
    const nface = reader.getUint32(4, true)
    let nvert = reader.getUint32(8, true)
    const nskip = reader.getUint32(12, true)
    utiltiesLogger.debug('MZ3 magic %d attr %d face %d vert %d skip %d', magic, attr, nface, nvert, nskip)
    if (magic !== 23117) {
      throw new Error('Invalid MZ3 file')
    }
    const isFace = (attr & 1) !== 0
    const isVert = (attr & 2) !== 0
    const isRGBA = (attr & 4) !== 0
    let isSCALAR = (attr & 8) !== 0
    const isDOUBLE = (attr & 16) !== 0
    // var isAOMap = attr & 32;
    if (attr > 63) {
      throw new Error('Unsupported future version of MZ3 file')
    }
    let bytesPerScalar = 4
    if (isDOUBLE) {
      bytesPerScalar = 8
    }
    let NSCALAR = 0
    if (n_vert > 0 && !isFace && nface < 1 && !isRGBA) {
      isSCALAR = true
    }
    if (isSCALAR) {
      const FSizeWoScalars = 16 + nskip + isFace * nface * 12 + isVert * n_vert * 12 + isRGBA * n_vert * 4
      const scalarFloats = Math.floor((_buffer.byteLength - FSizeWoScalars) / bytesPerScalar)
      if (nvert !== n_vert && scalarFloats % n_vert === 0) {
        console.log('Issue 729: mz3 mismatch scalar NVERT does not match mesh NVERT')
        nvert = n_vert
      }
      NSCALAR = Math.floor(scalarFloats / nvert)
      if (NSCALAR < 1) {
        console.log('Corrupt MZ3: file reports NSCALAR but not enough bytes')
        isSCALAR = false
      }
    }
    if (nvert < 3 && n_vert < 3) {
      throw new Error('Not a mesh MZ3 file (maybe scalar)')
    }
    if (n_vert > 0 && n_vert !== nvert) {
      console.log('Layer has ' + nvert + 'vertices, but background mesh has ' + n_vert)
    }
    let filepos = 16 + nskip
    let indices = null
    if (isFace) {
      indices = new Int32Array(_buffer, filepos, nface * 3, true)
      filepos += nface * 3 * 4
    }
    let positions = null
    if (isVert) {
      positions = new Float32Array(_buffer, filepos, nvert * 3, true)
      filepos += nvert * 3 * 4
    }
    let colors = null
    if (isRGBA) {
      colors = new Float32Array(nvert * 3)
      const rgba8 = new Uint8Array(_buffer, filepos, nvert * 4, true)
      filepos += nvert * 4
      let k3 = 0
      let k4 = 0
      for (let i = 0; i < nvert; i++) {
        for (let j = 0; j < 3; j++) {
          // for RGBA
          colors[k3] = rgba8[k4] / 255
          k3++
          k4++
        }
        k4++ // skip Alpha
      } // for i
    } // if isRGBA
    let scalars = []
    if (!isRGBA && isSCALAR && NSCALAR > 0) {
      if (isDOUBLE) {
        const flt64 = new Float64Array(_buffer, filepos, NSCALAR * nvert)
        scalars = Float32Array.from(flt64)
      } else {
        scalars = new Float32Array(_buffer, filepos, NSCALAR * nvert)
      }
      filepos += bytesPerScalar * NSCALAR * nvert
    }
    if (n_vert > 0) {
      return scalars
    }
    return {
      positions,
      indices,
      scalars,
      colors
    }
  } // readMZ3()

  // read PLY format
  // https://en.wikipedia.org/wiki/PLY_(file_format)
  static readPLY(buffer) {
    const len = buffer.byteLength
    const bytes = new Uint8Array(buffer)
    let pos = 0
    function readStr() {
      while (pos < len && bytes[pos] === 10) {
        pos++
      } // skip blank lines
      const startPos = pos
      while (pos < len && bytes[pos] !== 10) {
        pos++
      }
      pos++ // skip EOLN
      if (pos - startPos < 1) {
        return ''
      }
      return new TextDecoder().decode(buffer.slice(startPos, pos - 1))
    }
    let line = readStr() // 1st line: magic 'ply'
    if (!line.startsWith('ply')) {
      console.log('Not a valid PLY file')
      return
    }
    line = readStr() // 2nd line: format 'format binary_little_endian 1.0'
    const isAscii = line.includes('ascii')
    function dataTypeBytes(str) {
      if (str === 'char' || str === 'uchar' || str === 'int8' || str === 'uint8') {
        return 1
      }
      if (str === 'short' || str === 'ushort' || str === 'int16' || str === 'uint16') {
        return 2
      }
      if (
        str === 'int' ||
        str === 'uint' ||
        str === 'int32' ||
        str === 'uint32' ||
        str === 'float' ||
        str === 'float32'
      ) {
        return 4
      }
      if (str === 'double') {
        return 8
      }
      console.log('Unknown data type: ' + str)
    }
    const isLittleEndian = line.includes('binary_little_endian')
    let nvert = 0
    let vertIsDouble = false
    let vertStride = 0 // e.g. if each vertex stores xyz as float32 and rgb as uint8, stride is 15
    let indexStrideBytes = 0 // "list uchar int vertex_indices" has stride 1 + 3 * 4
    let indexCountBytes = 0 // if "property list uchar int vertex_index" this is 1 (uchar)
    let indexBytes = 0 // if "property list uchar int vertex_index" this is 4 (int)
    let indexPaddingBytes = 0
    let nIndexPadding = 0
    let nface = 0
    while (pos < len && !line.startsWith('end_header')) {
      line = readStr()
      if (line.startsWith('comment')) {
        continue
      }
      // line = line.replaceAll('\t', ' '); // ?are tabs valid white space?
      let items = line.split(/\s/)
      if (line.startsWith('element vertex')) {
        nvert = parseInt(items[items.length - 1])
        // read vertex properties:
        line = readStr()
        items = line.split(/\s/)
        while (line.startsWith('property')) {
          const datatype = items[1]
          if (items[2] === 'x' && datatype.startsWith('double')) {
            vertIsDouble = true
          } else if (items[2] === 'x' && !datatype.startsWith('float')) {
            console.log('Error: expect ply xyz to be float or double: ' + line)
          }
          vertStride += dataTypeBytes(datatype)
          line = readStr()
          items = line.split(/\s/)
        }
      }
      if (line.startsWith('element face')) {
        nface = parseInt(items[items.length - 1])
        // read face properties:
        line = readStr()
        items = line.split(/\s/)
        while (line.startsWith('property')) {
          // console.log("property", line);
          if (items[1] === 'list') {
            indexCountBytes = dataTypeBytes(items[2])
            indexBytes = dataTypeBytes(items[3])
            indexStrideBytes += indexCountBytes + 3 * indexBytes // e.g. "uchar int" is 1 + 3 * 4 bytes
          } else {
            const bytes = dataTypeBytes(items[1])
            indexStrideBytes += bytes
            if (indexBytes === 0) {
              // this index property is BEFORE the list
              indexPaddingBytes += bytes
              nIndexPadding++
            }
          }
          line = readStr()
          items = line.split(/\s/)
        }
      }
    } // while reading all lines of header
    if (isAscii) {
      if (nface < 1) {
        console.log(`Malformed ply format: faces ${nface} `)
      }
      const positions = new Float32Array(nvert * 3)
      let v = 0
      for (let i = 0; i < nvert; i++) {
        line = readStr()
        const items = line.split(/\s/)
        positions[v] = parseFloat(items[0])
        positions[v + 1] = parseFloat(items[1])
        positions[v + 2] = parseFloat(items[2])
        v += 3
      }
      let indices = new Int32Array(nface * 3)
      let f = 0
      for (let i = 0; i < nface; i++) {
        line = readStr()
        const items = line.split(/\s/)
        const nTri = parseInt(items[nIndexPadding]) - 2
        if (nTri < 1) {
          break
        } // error
        if (f + nTri * 3 > indices.length) {
          const c = new Int32Array(indices.length + indices.length)
          c.set(indices)
          indices = c.slice()
        }
        const idx0 = parseInt(items[nIndexPadding + 1])
        let idx1 = parseInt(items[nIndexPadding + 2])
        for (let j = 0; j < nTri; j++) {
          const idx2 = parseInt(items[nIndexPadding + 3 + j])
          indices[f + 0] = idx0
          indices[f + 1] = idx1
          indices[f + 2] = idx2
          idx1 = idx2
          f += 3
        }
      }
      if (indices.length !== f) {
        indices = indices.slice(0, f)
      }
      return {
        positions,
        indices
      }
    } // if isAscii
    if (vertStride < 12 || indexCountBytes < 1 || indexBytes < 1 || nface < 1) {
      console.log(
        `Malformed ply format: stride ${vertStride} count ${indexCountBytes} iBytes ${indexBytes} iStrideBytes ${indexStrideBytes} iPadBytes ${indexPaddingBytes} faces ${nface}`
      )
    }
    const reader = new DataView(buffer)
    let positions = []
    if (pos % 4 === 0 && vertStride === 12 && isLittleEndian) {
      // optimization: vertices only store xyz position as float
      // n.b. start offset of Float32Array must be a multiple of 4
      positions = new Float32Array(buffer, pos, nvert * 3)
      pos += nvert * vertStride
    } else {
      positions = new Float32Array(nvert * 3)
      let v = 0
      for (let i = 0; i < nvert; i++) {
        if (vertIsDouble) {
          positions[v] = reader.getFloat64(pos, isLittleEndian)
          positions[v + 1] = reader.getFloat64(pos + 8, isLittleEndian)
          positions[v + 2] = reader.getFloat64(pos + 16, isLittleEndian)
        } else {
          positions[v] = reader.getFloat32(pos, isLittleEndian)
          positions[v + 1] = reader.getFloat32(pos + 4, isLittleEndian)
          positions[v + 2] = reader.getFloat32(pos + 8, isLittleEndian)
        }
        v += 3
        pos += vertStride
      }
    }
    const indices = new Int32Array(nface * 3) // assume triangular mesh: pre-allocation optimization
    let isTriangular = true
    let j = 0
    if (indexCountBytes === 1 && indexBytes === 4 && indexStrideBytes === 13) {
      // default mode: "list uchar int vertex_indices" without other properties
      for (let i = 0; i < nface; i++) {
        const nIdx = reader.getUint8(pos)
        pos += indexCountBytes
        if (nIdx !== 3) {
          isTriangular = false
        }
        indices[j] = reader.getUint32(pos, isLittleEndian)
        pos += 4
        indices[j + 1] = reader.getUint32(pos, isLittleEndian)
        pos += 4
        indices[j + 2] = reader.getUint32(pos, isLittleEndian)
        pos += 4
        j += 3
      }
    } else {
      // not 1:4 index data
      let startPos = pos
      for (let i = 0; i < nface; i++) {
        pos = startPos + indexPaddingBytes
        let nIdx = 0
        if (indexCountBytes === 1) {
          nIdx = reader.getUint8(pos)
        } else if (indexCountBytes === 2) {
          nIdx = reader.getUint16(pos, isLittleEndian)
        } else if (indexCountBytes === 4) {
          nIdx = reader.getUint32(pos, isLittleEndian)
        }
        pos += indexCountBytes
        if (nIdx !== 3) {
          isTriangular = false
        }
        for (let k = 0; k < 3; k++) {
          if (indexBytes === 1) {
            indices[j] = reader.getUint8(pos, isLittleEndian)
          } else if (indexBytes === 2) {
            indices[j] = reader.getUint16(pos, isLittleEndian)
          } else if (indexBytes === 4) {
            indices[j] = reader.getUint32(pos, isLittleEndian)
          }
          j++
          pos += indexBytes
        }
        startPos += indexStrideBytes
      } // for each face
    } // if not 1:4 datatype
    if (!isTriangular) {
      console.log('Only able to read PLY meshes limited to triangles.')
    }
    return {
      positions,
      indices
    }
  } // readPLY()

  // FreeSurfer can convert meshes to ICO/TRI format text files
  // https://github.com/dfsp-spirit/freesurferformats/blob/434962608108c75d4337d5e7a5096e3bd4ee6ee6/R/read_fs_surface.R#L1090
  // detect TRI format that uses same extension
  // http://paulbourke.net/dataformats/tri/
  static readICO(buffer) {
    const enc = new TextDecoder('utf-8')
    const txt = enc.decode(buffer)
    const lines = txt.split('\n')
    let header = lines[0].trim().split(/\s+/)
    // read line 0: header
    // FreeSurfer header has one item: [0]'num_verts'
    // Bourke header has 2 items: [0]'num_verts', [1]'num_faces'
    if (header.length > 1) {
      console.log('This is not a valid FreeSurfer ICO/TRI mesh.')
    }
    const num_v = parseInt(header[0])
    // read vertices: each line has 4 values: index, x, y, z
    const positions = new Float32Array(num_v * 3)
    // let v = 0;
    let line = 1 // line 0 is header
    for (let i = 0; i < num_v; i++) {
      const items = lines[line].trim().split(/\s+/)
      line++
      // idx is indexed from 1, not 0
      let idx = parseInt(items[0]) - 1
      const x = parseFloat(items[1])
      const y = parseFloat(items[2])
      const z = parseFloat(items[3])
      if (idx < 0 || idx >= num_v) {
        console.log('ICO vertices corrupted')
        break
      }
      idx *= 3
      positions[idx] = x
      positions[idx + 1] = y
      positions[idx + 2] = z
    } // read all vertices
    // read faces
    header = lines[line].trim().split(/\s+/)
    line++
    const num_f = parseInt(header[0])
    const indices = new Int32Array(num_f * 3)
    for (let i = 0; i < num_f; i++) {
      const items = lines[line].trim().split(/\s+/)
      line++
      // all values indexed from 1, not 0
      let idx = parseInt(items[0]) - 1
      const x = parseInt(items[1]) - 1
      const y = parseInt(items[2]) - 1
      const z = parseInt(items[3]) - 1
      if (idx < 0 || idx >= num_f) {
        console.log('ICO indices corrupted')
        break
      }
      idx *= 3
      indices[idx] = x
      indices[idx + 1] = y
      indices[idx + 2] = z
    } // read all faces
    // FreeSurfer seems to enforce clockwise winding: reverse to CCW
    for (let j = 0; j < indices.length; j += 3) {
      const tri = indices[j]
      indices[j] = indices[j + 1]
      indices[j + 1] = tri
    }
    return {
      positions,
      indices
    }
  } // readICO()

  // While BYU and FreeSurfer GEO are related
  // - BYU can have multiple parts
  // - BYU faces not always triangular
  // http://www.grahamwideman.com/gw/brain/fs/surfacefileformats.htm#GeoFile
  // http://www.eg-models.de/formats/Format_Byu.html
  // https://github.com/dfsp-spirit/freesurferformats/blob/dafaf88a601dac90fa3c9aae4432f003f5344546/R/read_fs_surface.R#L924
  // https://github.com/dfsp-spirit/freesurferformats/blob/434962608108c75d4337d5e7a5096e3bd4ee6ee6/R/read_fs_surface.R#L1144
  // n.b. AFNI uses the '.g' extension for this format 'ConvertSurface  -i_gii L.surf.gii -o_byu L'
  static readGEO(buffer, isFlipWinding = false) {
    const enc = new TextDecoder('utf-8')
    const txt = enc.decode(buffer)
    const lines = txt.split('\n')
    const header = lines[0].trim().split(/\s+/)
    // read line 0: header
    // header[0]='nparts', [1]'npoints/vertices', [2]'npolys/faces', [3]'nconnects'
    const num_p = parseInt(header[0])
    let num_v = parseInt(header[1])
    let num_f = parseInt(header[2])
    const num_c = parseInt(header[3])
    if (num_p > 1 || num_c !== num_f * 3) {
      console.log('Multi-part BYU/GEO header or not a triangular mesh.')
    }
    // skip line 1: it is redundant (contains number of faces once more)
    // next read the vertices (points)
    const pts = []
    num_v *= 3 // each vertex has three components (x,y,z)
    let v = 0
    let line = 2 // line 0 and 1 are header
    while (v < num_v) {
      const items = lines[line].trim().split(/\s+/)
      line++
      for (let i = 0; i < items.length; i++) {
        pts.push(parseFloat(items[i]))
        v++
        if (v >= num_v) {
          break
        }
      } // for each item
    } // read all vertices
    // next read faces (triangles)
    const t = []
    num_f *= 3 // each triangle has three vertices (i,j,k)
    let f = 0
    while (f < num_f) {
      const items = lines[line].trim().split(/\s+/)
      line++
      for (let i = 0; i < items.length; i++) {
        t.push(Math.abs(parseInt(items[i])) - 1)
        f++
        if (f >= num_f) {
          break
        }
      } // for each item
    } // read all faces
    // FreeSurfer seems to enforce clockwise winding: reverse to CCW
    if (isFlipWinding) {
      for (let j = 0; j < t.length; j += 3) {
        const tri = t[j]
        t[j] = t[j + 1]
        t[j + 1] = tri
      }
    }
    // return results
    const positions = new Float32Array(pts)
    const indices = new Int32Array(t)
    return {
      positions,
      indices
    }
  } // readGEO()

  // read OFF format
  // https://en.wikipedia.org/wiki/OFF_(file_format)
  static readOFF(buffer) {
    const enc = new TextDecoder('utf-8')
    const txt = enc.decode(buffer)
    // let txt = await response.text();
    const lines = txt.split('\n')
    // var n = lines.length;
    const pts = []
    const t = []
    let i = 0
    // first line signature "OFF", but R freesurfer package uses "# OFF"
    if (!lines[i].includes('OFF')) {
      console.log('File does not start with OFF')
    } else {
      i++
    }
    let items = lines[i].trim().split(/\s+/)
    const num_v = parseInt(items[0])
    const num_f = parseInt(items[1])
    i++
    for (let j = 0; j < num_v; j++) {
      const str = lines[i]
      items = str.trim().split(/\s+/)
      pts.push(parseFloat(items[0]))
      pts.push(parseFloat(items[1]))
      pts.push(parseFloat(items[2]))
      i++
    }
    for (let j = 0; j < num_f; j++) {
      const str = lines[i]
      items = str.trim().split(/\s+/)
      const n = parseInt(items[0])
      if (n !== 3) {
        console.log('Only able to read OFF files with triangular meshes')
      }
      t.push(parseInt(items[1]))
      t.push(parseInt(items[2]))
      t.push(parseInt(items[3]))
      i++
    }
    const positions = new Float32Array(pts)
    const indices = new Int32Array(t)
    return {
      positions,
      indices
    }
  } // readOFF()

  static readOBJ(buffer) {
    // WaveFront OBJ format
    const enc = new TextDecoder('utf-8')
    const txt = enc.decode(buffer)
    // let txt = await response.text();
    const lines = txt.split('\n')
    const n = lines.length
    const pts = []
    const t = []
    for (let i = 0; i < n; i++) {
      const str = lines[i]
      if (str[0] === 'v' && str[1] === ' ') {
        // 'v ' but not 'vt' or 'vn'
        const items = str.trim().split(/\s+/)
        pts.push(parseFloat(items[1]))
        pts.push(parseFloat(items[2]))
        pts.push(parseFloat(items[3]))
        // v 0 -0.5 -0
      }
      if (str[0] === 'f') {
        const items = str.trim().split(/\s+/)
        const new_t = items.length - 3 // number of new triangles created
        if (new_t < 1) {
          break
        } // error
        let tn = items[1].split('/')
        const t0 = parseInt(tn[0]) - 1 // first vertex
        tn = items[2].split('/')
        let tprev = parseInt(tn[0]) - 1 // previous vertex
        for (let j = 0; j < new_t; j++) {
          tn = items[3 + j].split('/')
          const tcurr = parseInt(tn[0]) - 1 // current vertex
          t.push(t0)
          t.push(tprev)
          t.push(tcurr)
          tprev = tcurr
        }
      }
    } // for all lines
    const positions = new Float32Array(pts)
    const indices = new Int32Array(t)
    return {
      positions,
      indices
    }
  } // readOBJ()

  // read FreeSurfer big endian format
  static readFreeSurfer(buffer) {
    const bytes = new Uint8Array(buffer)
    if (bytes[0] === 35 && bytes[1] === 33 && bytes[2] === 97) {
      return NVMeshLoaders.readASC(buffer) // "#!ascii version"
    }
    const view = new DataView(buffer) // ArrayBuffer to dataview
    const sig0 = view.getUint32(0, false)
    const sig1 = view.getUint32(4, false)
    if (sig0 !== 4294966883 || sig1 !== 1919246708) {
      utiltiesLogger.debug('Unable to recognize file type: does not appear to be FreeSurfer format.')
    }
    let offset = 0
    while (view.getUint8(offset) !== 10) {
      offset++
    }
    offset += 2
    let nv = view.getUint32(offset, false) // number of vertices
    offset += 4
    let nf = view.getUint32(offset, false) // number of faces
    offset += 4
    nv *= 3 // each vertex has 3 positions: XYZ
    const positions = new Float32Array(nv)
    for (let i = 0; i < nv; i++) {
      positions[i] = view.getFloat32(offset, false)
      offset += 4
    }
    nf *= 3 // each triangle face indexes 3 triangles
    const indices = new Int32Array(nf)
    for (let i = 0; i < nf; i++) {
      indices[i] = view.getUint32(offset, false)
      offset += 4
    }
    // read undocumented footer
    // https://github.com/nipy/nibabel/blob/8fea2a8e50aaf4d8b0d4bfff7a21b132914120ee/nibabel/freesurfer/io.py#L58C5-L58C9
    const head0 = view.getUint32(offset, false)
    offset += 4
    let headOK = head0 === 20
    if (headOK !== 20) {
      // read two more int32s
      const head1 = view.getUint32(offset, false)
      offset += 4
      const head2 = view.getUint32(offset, false)
      offset += 4
      headOK = head0 === 2 && head1 === 0 && head2 === 20
    }
    if (!headOK) {
      console.log('Unknown FreeSurfer Mesh extension code.')
    } else {
      const footer = new TextDecoder().decode(buffer.slice(offset)).trim()
      const strings = footer.split('\n')
      for (let s = 0; s < strings.length; s++) {
        if (!strings[s].startsWith('cras')) {
          continue
        }
        const cras = strings[s].split('=')[1].trim()
        const FreeSurferTranlate = cras.split(' ').map(Number)
        const nvert = Math.floor(positions.length / 3)
        let i = 0
        for (let v = 0; v < nvert; v++) {
          positions[i] += FreeSurferTranlate[0]
          i++
          positions[i] += FreeSurferTranlate[1]
          i++
          positions[i] += FreeSurferTranlate[2]
          i++
        }
      }
    }
    return {
      positions,
      indices
    }
  } // readFreeSurfer()

  // read brainvoyager SRF format
  // https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/344-users-guide-2-3-the-format-of-srf-files
  static readSRF(buffer) {
    const bytes = new Uint8Array(buffer)
    if (bytes[0] === 35 && bytes[1] === 33 && bytes[2] === 97) {
      // .srf also used for freesurfer https://brainder.org/research/brain-for-blender/
      return NVMeshLoaders.readASC(buffer) // "#!ascii version"
    }
    if (bytes[0] === 31 && bytes[1] === 139) {
      // handle .srf.gz
      const raw = decompressSync(new Uint8Array(buffer))
      buffer = raw.buffer
    }
    const reader = new DataView(buffer)
    const ver = reader.getFloat32(0, true)
    const nVert = reader.getUint32(8, true)
    const nTri = reader.getUint32(12, true)
    const oriX = reader.getFloat32(16, true)
    const oriY = reader.getFloat32(20, true)
    const oriZ = reader.getFloat32(24, true)
    const positions = new Float32Array(nVert * 3)
    // BrainVoyager does not use Talairach coordinates for XYZ!
    // read X component of each vertex
    let pos = 28
    let j = 1 // BrainVoyager X is Talairach Y
    for (let i = 0; i < nVert; i++) {
      positions[j] = -reader.getFloat32(pos, true) + oriX
      j += 3 // read one of 3 components: XYZ
      pos += 4 // read one float32
    }
    // read Y component of each vertex
    j = 2 // BrainVoyager Y is Talairach Z
    for (let i = 0; i < nVert; i++) {
      positions[j] = -reader.getFloat32(pos, true) + oriY
      j += 3 // read one of 3 components: XYZ
      pos += 4 // read one float32
    }
    // read Z component of each vertex
    j = 0 // BrainVoyager Z is Talairach X
    for (let i = 0; i < nVert; i++) {
      positions[j] = -reader.getFloat32(pos, true) + oriZ
      j += 3 // read one of 3 components: XYZ
      pos += 4 // read one float32
    }
    // not sure why normals are stored, does bulk up file size
    pos = 28 + 4 * 6 * nVert // each vertex has 6 float32s: XYZ for position and normal
    // read concave and convex colors:
    const rVex = reader.getFloat32(pos, true)
    const gVex = reader.getFloat32(pos + 4, true)
    const bVex = reader.getFloat32(pos + 8, true)
    const rCave = reader.getFloat32(pos + 16, true)
    const gCave = reader.getFloat32(pos + 20, true)
    const bCave = reader.getFloat32(pos + 24, true)
    pos += 8 * 4 // skip 8 floats (RGBA convex/concave)
    // read per-vertex colors
    const colors = new Float32Array(nVert * 3)
    const colorsIdx = new Uint32Array(buffer, pos, nVert, true)
    j = 0 // convert RGBA -> RGB
    for (let i = 0; i < nVert; i++) {
      const c = colorsIdx[i]
      if (c > 1056964608) {
        colors[j + 0] = ((c >> 16) & 0xff) / 255
        colors[j + 1] = ((c >> 8) & 0xff) / 255
        colors[j + 2] = (c & 0xff) / 255
      }
      if (c === 0) {
        // convex
        colors[j + 0] = rVex
        colors[j + 1] = gVex
        colors[j + 2] = bVex
      }
      if (c === 1) {
        // concave
        colors[j + 0] = rCave
        colors[j + 1] = gCave
        colors[j + 2] = bCave
      }
      j += 3
    }
    pos += nVert * 4 // MeshColor, sequence of color indices
    // not sure why nearest neighbors are stored, slower and bigger files
    for (let i = 0; i < nVert; i++) {
      const nNearest = reader.getUint32(pos, true)
      pos += 4 + 4 * nNearest
    }
    const indices = new Int32Array(nTri * 3)
    for (let i = 0; i < nTri * 3; i++) {
      indices[i] = reader.getInt32(pos, true)
      pos += 4
    }
    if (ver !== 4) {
      console.log('Not valid SRF')
    }

    return {
      positions,
      indices,
      colors
    }
  } // readSRF()

  // read STL ASCII format file
  // http://paulbourke.net/dataformats/stl/
  static readTxtSTL(buffer) {
    const enc = new TextDecoder('utf-8')
    const txt = enc.decode(buffer)
    const lines = txt.split('\n')
    if (!lines[0].startsWith('solid')) {
      console.log('Not a valid STL file')
      return null
    }
    const pts = []
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].includes('vertex')) {
        continue
      }
      const items = lines[i].trim().split(/\s+/)
      for (let j = 1; j < items.length; j++) {
        pts.push(parseFloat(items[j]))
      }
    }
    const npts = Math.floor(pts.length / 3) // each vertex has x,y,z
    if (npts * 3 !== pts.length) {
      console.log('Unable to parse ASCII STL file.')
      return null
    }
    const positions = new Float32Array(pts)
    const indices = new Int32Array(npts)
    for (let i = 0; i < npts; i++) {
      indices[i] = i
    }
    return {
      positions,
      indices
    }
  } // readTxtSTL()

  // read STL format, nb this format does not reuse vertices
  // https://en.wikipedia.org/wiki/STL_(file_format)
  static readSTL(buffer) {
    if (buffer.byteLength < 80 + 4 + 50) {
      throw new Error('File too small to be STL: bytes = ' + buffer.byteLength)
    }
    const reader = new DataView(buffer)
    const sig = reader.getUint32(0, true)
    if (sig === 1768714099) {
      return NVMeshLoaders.readTxtSTL(buffer)
    }
    const ntri = reader.getUint32(80, true)
    const ntri3 = 3 * ntri
    if (buffer.byteLength < 80 + 4 + ntri * 50) {
      throw new Error('STL file too small to store triangles = ', ntri)
    }
    const indices = new Int32Array(ntri3)
    const positions = new Float32Array(ntri3 * 3)
    let pos = 80 + 4 + 12
    let v = 0 // vertex
    for (let i = 0; i < ntri; i++) {
      for (let j = 0; j < 9; j++) {
        positions[v] = reader.getFloat32(pos, true)
        v += 1
        pos += 4
      }
      pos += 14 // 50 bytes for triangle, only 36 used for position
    }
    for (let i = 0; i < ntri3; i++) {
      indices[i] = i
    }
    return {
      positions,
      indices
    }
  } // readSTL()

  // read NIfTI2 format with embedded CIfTI
  // this variation very specific to connectome workbench
  // https://brainder.org/2015/04/03/the-nifti-2-file-format/
  static readNII2(buffer, n_vert = 0) {
    let scalars = []
    const len = buffer.byteLength
    let isLittleEndian = true
    const reader = new DataView(buffer)
    let magic = reader.getUint16(0, isLittleEndian)
    if (magic === 469893120) {
      isLittleEndian = false
      magic = reader.getUint16(0, isLittleEndian)
    }
    if (magic !== 540) {
      console.log('Not a valid NIfTI-2 dataset')
      return scalars
    }
    const voxoffset = Number(reader.getBigInt64(168, isLittleEndian))
    const scl_slope = reader.getFloat64(176, isLittleEndian)
    const scl_inter = reader.getFloat64(184, isLittleEndian)
    if (scl_slope !== 1 || scl_inter !== 0) {
      console.log('ignoring scale slope and intercept')
    }
    const intent_code = reader.getUint32(504, isLittleEndian)
    const datatype = reader.getUint16(12, isLittleEndian)
    if (datatype !== 2 && datatype !== 4 && datatype !== 8 && datatype !== 16) {
      console.log('Unsupported NIfTI datatype ' + datatype)
      return scalars
    }
    let nvert = 1
    const dim = [1, 1, 1, 1, 1, 1, 1, 1]
    for (let i = 1; i < 8; i++) {
      dim[i] = Math.max(Number(reader.getBigInt64(16 + i * 8, isLittleEndian)), 1)
      nvert *= dim[i]
    }
    if (intent_code >= 3000 && intent_code <= 3099 && voxoffset > 580) {
      // CIFTI ConnDenseScalar
      let indexOffset = 0
      let indexCount = 0
      let surfaceNumberOfVertices = 0
      let brainStructure = ''
      let vertexIndices = []
      const bytes = new Uint8Array(buffer)
      let pos = 552

      function readStrX() {
        while (pos < len && bytes[pos] === 10) {
          pos++
        } // skip blank lines
        const startPos = pos
        while (pos < len && bytes[pos] !== 10) {
          pos++
        }
        pos++ // skip EOLN
        if (pos - startPos < 1) {
          return ''
        }
        return new TextDecoder().decode(buffer.slice(startPos, pos - 1)).trim()
      }

      function readStr() {
        // concatenate lines to return tag <...>
        let line = readStrX()
        if (!line.startsWith('<') || line.endsWith('>')) {
          return line
        }
        while (pos < len && !line.endsWith('>')) {
          line += readStrX()
        }
        return line
      }
      let line = []

      function readNumericTag(TagName, asString = false) {
        // Tag 'Dim1' will return 3 for Dim1="3"
        const tpos = line.indexOf(TagName)
        if (tpos < 0) {
          return 1
        }
        const spos = line.indexOf('"', tpos) + 1
        const epos = line.indexOf('"', spos)
        const str = line.slice(spos, epos)
        if (asString) {
          return str
        }
        return parseInt(str)
      } // readNumericTag

      const nFrame4D = dim[5] // number of timepoints/frames per vertex
      const scalars = new Float32Array(n_vert * nFrame4D)

      // eslint-disable-next-line no-unmodified-loop-condition -- pos is modified within readStr
      while (pos < len) {
        line = readStr()
        if (line.includes('</CIFTI>')) {
          break
        }
        if (line.includes('<BrainModel')) {
          const nv = readNumericTag('SurfaceNumberOfVertices=')
          const bStruct = readNumericTag('BrainStructure=', true).toUpperCase()
          if (nv % n_vert !== 0) {
            continue
          }
          // a single CIfTI file can contain multiple structures, but only one structure per mesh
          // The big kludge: try to find CIfTI structure that matches GIfTI mesh
          let isMatch = false
          if (this.AnatomicalStructurePrimary.includes('CORTEX') && bStruct.includes('CORTEX')) {
            isMatch = true
          }
          // to do: other anatomy: cerebellum
          if (!isMatch) {
            continue
          }
          isMatch = false
          if (this.AnatomicalStructurePrimary.includes('LEFT') && bStruct.includes('LEFT')) {
            isMatch = true
          }
          if (this.AnatomicalStructurePrimary.includes('RIGHT') && bStruct.includes('RIGHT')) {
            isMatch = true
          }
          if (!isMatch) {
            continue
          }
          surfaceNumberOfVertices = nv
          indexOffset = readNumericTag('IndexOffset=')
          indexCount = readNumericTag('IndexCount=')
          brainStructure = bStruct
          if (!line.includes('<VertexIndices>')) {
            line = readStr()
          }
          if (!line.startsWith('<VertexIndices>') || !line.endsWith('</VertexIndices>')) {
            console.log('Unable to find CIfTI <VertexIndices>')
            return scalars
          }
          line = line.slice(15, -16)
          const items = line.trim().split(/\s+/)
          if (items.length < indexCount) {
            console.log('Error parsing VertexIndices')
          }
          vertexIndices = new Int32Array(indexCount)
          for (let i = 0; i < indexCount; i++) {
            vertexIndices[i] = parseInt(items[i])
          }
        } // read <BrainModel
      } // while (pos < len) or reached </CIFTI>

      if (surfaceNumberOfVertices === 0 || vertexIndices.length === 0) {
        console.log('Unable to find CIfTI structure that matches the mesh.')
        return scalars
      }
      if (datatype !== 16) {
        console.log('Only able to read float32 CIfTI (only known datatype).')
        return scalars
      }

      const vals = new Float32Array(indexCount * nFrame4D)
      const off = voxoffset + nFrame4D * indexOffset * 4
      for (let i = 0; i < indexCount * nFrame4D; i++) {
        vals[i] = reader.getFloat32(off + i * 4, isLittleEndian)
      }
      // }
      let j = 0

      for (let i = 0; i < indexCount; i++) {
        for (let f = 0; f < nFrame4D; f++) {
          scalars[vertexIndices[i] + f * n_vert] = vals[j]
          j++
        }
      }
      console.log(
        'CIfTI diagnostics',
        surfaceNumberOfVertices,
        brainStructure,
        indexOffset,
        indexCount,
        indexOffset,
        this.AnatomicalStructurePrimary
      )
      //
      return scalars
    } // is CIfTI
    if (nvert % n_vert !== 0) {
      console.log('Vertices in NIfTI (' + nvert + ') is not a multiple of number of vertices (' + n_vert + ')')
      return scalars
    }
    if (isLittleEndian) {
      // block read native endian
      if (datatype === 16) {
        scalars = new Float32Array(buffer, voxoffset, nvert)
      } else if (datatype === 8) {
        scalars = new Int32Array(buffer, voxoffset, nvert)
      } else if (datatype === 4) {
        scalars = new Int16Array(buffer, voxoffset, nvert)
      }
    } else {
      // if isLittleEndian
      if (datatype === 16) {
        scalars = new Float32Array(nvert)
        for (let i = 0; i < nvert; i++) {
          scalars[i] = reader.getFloat32(voxoffset + i * 4, isLittleEndian)
        }
      } else if (datatype === 8) {
        scalars = new Int32Array(nvert)
        for (let i = 0; i < nvert; i++) {
          scalars[i] = reader.getInt32(voxoffset + i * 4, isLittleEndian)
        }
      } else if (datatype === 4) {
        scalars = new Int16Array(nvert)
        for (let i = 0; i < nvert; i++) {
          scalars[i] = reader.getInt16(voxoffset + i * 2, isLittleEndian)
        }
      }
    } // if isLittleEndian else big end
    if (datatype === 2) {
      scalars = new Uint8Array(buffer, voxoffset, nvert)
    }
    return scalars
  } // readNII2()

  // read NIfTI1/2 as vertex colors
  // https://brainder.org/2012/09/23/the-nifti-file-format/#:~:text=In%20the%20nifti%20format%2C%20the,seventh%2C%20are%20for%20other%20uses.
  static readNII(buffer, n_vert = 0) {
    let scalars = []
    let isLittleEndian = true
    let reader = new DataView(buffer)
    let magic = reader.getUint16(0, isLittleEndian)
    if (magic === 540 || magic === 469893120) {
      return NVMeshLoaders.readNII2(buffer, n_vert)
    }
    if (magic === 23553) {
      isLittleEndian = false
      magic = reader.getUint16(0, isLittleEndian)
    }
    if (magic !== 348) {
      // gzip signature 0x1F8B in little and big endian
      const raw = decompressSync(new Uint8Array(buffer))
      reader = new DataView(raw.buffer)
      buffer = raw.buffer
      magic = reader.getUint16(0, isLittleEndian)
      if (magic === 540 || magic === 469893120) {
        return NVMeshLoaders.readNII2(buffer)
      }
      if (magic === 23553) {
        isLittleEndian = false
        magic = reader.getUint16(0, isLittleEndian)
      }
    }
    if (magic !== 348) {
      console.log('Not a valid NIfTI image.')
    }
    const voxoffset = reader.getFloat32(108, isLittleEndian)
    const scl_slope = reader.getFloat32(112, isLittleEndian)
    const scl_inter = reader.getFloat32(116, isLittleEndian)
    if (scl_slope !== 1 || scl_inter !== 0) {
      console.log('ignoring scale slope and intercept')
    }
    const datatype = reader.getUint16(70, isLittleEndian)
    if (datatype !== 2 && datatype !== 4 && datatype !== 8 && datatype !== 16) {
      console.log('Unsupported NIfTI datatype ' + datatype)
      return scalars
    }
    let nvert = 1
    for (let i = 1; i < 8; i++) {
      const dim = reader.getUint16(40 + i * 2, isLittleEndian)
      nvert *= Math.max(dim, 1)
    }
    if (nvert % n_vert !== 0) {
      console.log('Vertices in NIfTI (' + nvert + ') is not a multiple of number of vertices (' + n_vert + ')')
      return scalars
    }
    if (isLittleEndian) {
      // block read native endian
      if (datatype === 16) {
        scalars = new Float32Array(buffer, voxoffset, nvert)
      } else if (datatype === 8) {
        scalars = new Int32Array(buffer, voxoffset, nvert)
      } else if (datatype === 4) {
        scalars = new Int16Array(buffer, voxoffset, nvert)
      }
    } else {
      // if isLittleEndian
      if (datatype === 16) {
        scalars = new Float32Array(nvert)
        for (let i = 0; i < nvert; i++) {
          scalars[i] = reader.getFloat32(voxoffset + i * 4, isLittleEndian)
        }
      } else if (datatype === 8) {
        scalars = new Int32Array(nvert)
        for (let i = 0; i < nvert; i++) {
          scalars[i] = reader.getInt32(voxoffset + i * 4, isLittleEndian)
        }
      } else if (datatype === 4) {
        scalars = new Int16Array(nvert)
        for (let i = 0; i < nvert; i++) {
          scalars[i] = reader.getInt16(voxoffset + i * 2, isLittleEndian)
        }
      }
    } // if isLittleEndian else big end
    if (datatype === 2) {
      scalars = new Uint8Array(buffer, voxoffset, nvert)
    }
    return scalars
  } // readNII();

  // read MGH format as vertex colors (not voxel-based image)
  // https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/MghFormat
  static readMGH(buffer, n_vert = 0, isReadColortables = false) {
    let reader = new DataView(buffer)
    const raw = buffer
    if (reader.getUint8(0) === 31 && reader.getUint8(1) === 139) {
      const decompressed = decompressSync(new Uint8Array(buffer))
      reader = new DataView(decompressed.buffer)
    }
    const version = reader.getInt32(0, false)
    const width = Math.max(1, reader.getInt32(4, false))
    const height = Math.max(1, reader.getInt32(8, false))
    const depth = Math.max(1, reader.getInt32(12, false))
    const nframes = Math.max(1, reader.getInt32(16, false))
    const mtype = reader.getInt32(20, false)
    let voxoffset = 284 // ALWAYS fixed header size
    const isLittleEndian = false // ALWAYS byte order is BIG ENDIAN
    if (version !== 1 || mtype < 0 || mtype > 4) {
      console.log('Not a valid MGH file')
    }
    const nvert = width * height * depth * nframes
    let scalars = []
    if (nvert % n_vert !== 0) {
      console.log('Vertices in NIfTI (' + nvert + ') is not a multiple of number of vertices (' + n_vert + ')')
      return scalars
    }
    if (mtype === 3) {
      scalars = new Float32Array(nvert)
      for (let i = 0; i < nvert; i++) {
        scalars[i] = reader.getFloat32(voxoffset + i * 4, isLittleEndian)
      }
    } else if (mtype === 1) {
      scalars = new Int32Array(nvert)
      for (let i = 0; i < nvert; i++) {
        scalars[i] = reader.getInt32(voxoffset + i * 4, isLittleEndian)
      }
    } else if (mtype === 4) {
      scalars = new Int16Array(nvert)
      for (let i = 0; i < nvert; i++) {
        scalars[i] = reader.getInt16(voxoffset + i * 2, isLittleEndian)
      }
    } else if (mtype === 0) {
      scalars = new Uint8Array(buffer, voxoffset, nvert)
    }
    if (!isReadColortables) {
      return scalars
    }
    // next: read footer
    let bytesPerVertex = 4
    if (mtype === 4) {
      bytesPerVertex = 2
    }
    if (mtype === 0) {
      bytesPerVertex = 1
    }
    voxoffset += bytesPerVertex * nvert
    voxoffset += 4 * 4 // skip TR, FlipAngle, TE, TI, FOV
    const TAG_OLD_COLORTABLE = 1
    const TAG_OLD_USEREALRAS = 2
    // const TAG_CMDLINE = 3;
    // const TAG_USEREALRAS = 4;
    // const TAG_COLORTABLE = 5;
    // const TAG_GCAMORPH_GEOM = 10;
    // const TAG_GCAMORPH_TYPE = 11;
    // const TAG_GCAMORPH_LABELS = 12;
    const TAG_OLD_SURF_GEOM = 20
    // const TAG_SURF_GEOM = 21;
    const TAG_OLD_MGH_XFORM = 30
    // const TAG_MGH_XFORM = 31;
    // const TAG_GROUP_AVG_SURFACE_AREA = 32;
    // const TAG_AUTO_ALIGN = 33;
    // const TAG_SCALAR_DOUBLE = 40;
    // const TAG_PEDIR = 41;
    // const TAG_MRI_FRAME = 42;
    // const TAG_FIELDSTRENGTH = 43;
    // const TAG_ORIG_RAS2VOX = 44;
    const nBytes = raw.byteLength
    let colormapLabel = []
    while (voxoffset < nBytes - 8) {
      // let vx = voxoffset;
      const tagType = reader.getInt32((voxoffset += 4), isLittleEndian)
      let plen = 0
      switch (tagType) {
        case TAG_OLD_MGH_XFORM:
          // doesn't include null
          plen = reader.getInt32((voxoffset += 4), isLittleEndian) - 1
          break
        case TAG_OLD_SURF_GEOM: // these don't take lengths at all
        case TAG_OLD_USEREALRAS:
          plen = 0
          break
        case TAG_OLD_COLORTABLE:
          plen = 0
          // CTABreadFromBinary()
          {
            let version = reader.getInt32((voxoffset += 4), isLittleEndian)
            if (version > 0) {
              console.log('unsupported CTABreadFromBinaryV1')
              return scalars
            }
            version = -version
            if (version !== 2) {
              console.log('CTABreadFromBinary: unknown version')
              return scalars
            }
            // CTABreadFromBinaryV2() follows
            const nentries = reader.getInt32((voxoffset += 4), isLittleEndian)
            if (nentries < 0) {
              console.log('CTABreadFromBinaryV2: nentries was ', nentries)
              return scalars
            }
            // skip the file name
            const len = reader.getInt32((voxoffset += 4), isLittleEndian)
            voxoffset += len
            const num_entries_to_read = reader.getInt32((voxoffset += 4), isLittleEndian)
            if (num_entries_to_read < 0) {
              return scalars
            }
            // Allocate our table.
            const Labels = { R: [], G: [], B: [], A: [], I: [], labels: [] }
            for (let i = 0; i < num_entries_to_read; i++) {
              const structure = reader.getInt32((voxoffset += 4), isLittleEndian)
              const labelLen = reader.getInt32((voxoffset += 4), isLittleEndian)
              let pos = voxoffset + 4
              let txt = ''
              for (let c = 0; c < labelLen; c++) {
                const val = reader.getUint8(pos++)
                if (val === 0) {
                  break
                }
                txt += String.fromCharCode(val)
              } // for labelLen
              voxoffset += labelLen
              const R = reader.getInt32((voxoffset += 4), isLittleEndian)
              const G = reader.getInt32((voxoffset += 4), isLittleEndian)
              const B = reader.getInt32((voxoffset += 4), isLittleEndian)
              const A = 255 - reader.getInt32((voxoffset += 4), isLittleEndian)
              Labels.I.push(structure)
              Labels.R.push(R)
              Labels.G.push(G)
              Labels.B.push(B)
              Labels.A.push(A)
              Labels.labels.push(txt)
              // break
            } // for num_entries_to_read
            colormapLabel = cmapper.makeLabelLut(Labels)
          }
          break
        default:
          plen = reader.getInt32((voxoffset += 8), isLittleEndian)
      }
      voxoffset += plen
    }
    return {
      scalars,
      colormapLabel
    }
  } // readMGH()

  // read X3D format mesh
  // https://en.wikipedia.org/wiki/X3D
  static readX3D(buffer /*, n_vert = 0 */) {
    // n.b. only plain text ".x3d", not binary ".x3db"
    // beware: The values of XML attributes are delimited by either single or double quotes
    const len = buffer.byteLength
    if (len < 20) {
      throw new Error('File too small to be GII: bytes = ' + len)
    }
    const bytes = new Uint8Array(buffer)
    let pos = 0
    function readStrX() {
      while (pos < len && bytes[pos] === 10) {
        pos++
      } // skip blank lines
      const startPos = pos
      while (pos < len && bytes[pos] !== 10) {
        pos++
      }
      pos++ // skip EOLN
      if (pos - startPos < 1) {
        return ''
      }
      return new TextDecoder().decode(buffer.slice(startPos, pos - 1)).trim()
    }
    function readStr() {
      // concatenate lines to return tag <...>
      let line = readStrX()
      if (!line.startsWith('<') || line.endsWith('>')) {
        return line
      }
      while (pos < len && !line.endsWith('>')) {
        line += readStrX()
      }
      return line
    }
    let line = readStr() // 1st line: signature 'mrtrix tracks'
    function readStringTag(TagName) {
      // Tag 'DEF' will return l3 for DEF='l3'
      const fpos = line.indexOf(TagName + '=')
      if (fpos < 0) {
        return ''
      }
      const delimiter = line[fpos + TagName.length + 1]
      const spos = line.indexOf(delimiter, fpos) + 1
      const epos = line.indexOf(delimiter, spos)
      return line.slice(spos, epos)
    }
    function readNumericTag(TagName) {
      // Tag 'Dim1' will return 3 for Dim1="3"
      const fpos = line.indexOf(TagName + '=')
      if (fpos < 0) {
        return 1
      }
      const delimiter = line[fpos + TagName.length + 1]
      const spos = line.indexOf(delimiter, fpos) + 1
      const epos = line.indexOf(delimiter, spos)
      const str = line.slice(spos, epos).trim()
      const items = str.trim().split(/\s+/)
      if (items.length < 2) {
        return parseFloat(str)
      }
      const ret = []
      for (let i = 0; i < items.length; i++) {
        ret.push(parseFloat(items[i]))
      }
      return ret
    }
    if (!line.includes('xml version')) {
      console.log('Not a X3D image')
    }
    let positions = []
    let indices = []
    let rgba255 = []
    let color = []
    let translation = [0, 0, 0]
    let rotation = [0, 0, 0, 0]
    let rgba = [255, 255, 255, 255]
    let rgbaGlobal = [255, 255, 255, 255]
    const appearanceStyles = []
    function readAppearance() {
      if (!line.endsWith('/>')) {
        if (line.startsWith('<Appearance>')) {
          // eslint-disable-next-line no-unmodified-loop-condition -- modified within readStr
          while (pos < len && !line.endsWith('</Appearance>')) {
            line += readStr()
          }
        } else {
          // eslint-disable-next-line no-unmodified-loop-condition -- modified within readStr
          while (pos < len && !line.endsWith('/>')) {
            line += readStr()
          }
        }
      }
      const ref = readStringTag('USE')
      if (ref.length > 1) {
        if (ref in appearanceStyles) {
          rgba = appearanceStyles[ref]
        } else {
          console.log('Unable to find DEF for ' + ref)
        }
        return
      }
      const diffuseColor = readNumericTag('diffuseColor')
      if (diffuseColor.length < 3) {
        return
      }
      rgba[0] = Math.round(diffuseColor[0] * 255)
      rgba[1] = Math.round(diffuseColor[1] * 255)
      rgba[2] = Math.round(diffuseColor[2] * 255)
      const def = readStringTag('DEF')
      if (length.def < 1) {
        return
      }
      appearanceStyles[def] = rgba
    }
    // eslint-disable-next-line no-unmodified-loop-condition -- modified within readStr
    while (pos < len) {
      line = readStr()
      rgba = rgbaGlobal.slice()
      if (line.startsWith('<Transform')) {
        translation = readNumericTag('translation')
        rotation = readNumericTag('rotation')
      }
      if (line.startsWith('<Appearance')) {
        readAppearance()
        rgbaGlobal = rgba.slice()
      }
      if (line.startsWith('<Shape')) {
        let radius = 1.0
        let height = 1.0
        let coordIndex = []
        let point = []

        // eslint-disable-next-line no-unmodified-loop-condition -- modified within readAppearance
        while (pos < len) {
          line = readStr()
          if (line.startsWith('<Appearance')) {
            readAppearance()
          }
          if (line.startsWith('</Shape')) {
            break
          }
          if (line.startsWith('<Sphere')) {
            radius = readNumericTag('radius')
            height = -1.0
          }
          if (line.startsWith('<Cylinder')) {
            radius = readNumericTag('radius')
            height = readNumericTag('height')
          }
          if (line.startsWith('<IndexedFaceSet')) {
            height = -2
            // https://www.web3d.org/specifications/X3Dv4Draft/ISO-IEC19775-1v4-CD/Part01/components/geometry3D.html#IndexedFaceSet
            coordIndex = readNumericTag('coordIndex')
          }
          if (line.startsWith('<IndexedTriangleStripSet')) {
            height = -3
            // https://www.web3d.org/specifications/X3Dv4Draft/ISO-IEC19775-1v4-CD/Part01/components/geometry3D.html#IndexedFaceSet
            coordIndex = readNumericTag('index')
          }
          if (line.startsWith('<Coordinate')) {
            point = readNumericTag('point')
          } // Coordinate point
          if (line.startsWith('<Color')) {
            color = readNumericTag('color')
          } // Coordinate point
          if (line.startsWith('<Box')) {
            height = -4
            console.log('Unsupported x3d shape: Box')
          }
          if (line.startsWith('<Cone')) {
            height = -5
            console.log('Unsupported x3d shape: Cone')
          }
          if (line.startsWith('<ElevationGrid')) {
            height = -6
            console.log('Unsupported x3d shape: ElevationGrid')
          }
        } // while not </shape
        if (height < -3.0) {
          // cone, box, elevation grid
          // unsupported
        } else if (height < -1.0) {
          // indexed triangle mesh or strip
          if (coordIndex.length < 1 || point.length < 3 || point.length === undefined) {
            console.log('Indexed mesh must specify indices and points')
            break
          }
          const idx0 = Math.floor(positions.length / 3) // first new vertex will be AFTER previous vertices
          let j = 2
          if (height === -2) {
            // if triangles
            // see Castle engine should_be_manifold.x3d.stl test image
            let triStart = 0
            while (j < coordIndex.length) {
              if (coordIndex[j] >= 0) {
                // new triangle
                indices.push(coordIndex[triStart] + idx0)
                indices.push(coordIndex[j - 1] + idx0)
                indices.push(coordIndex[j - 0] + idx0)
                j += 1
              } else {
                // coordIndex[j] === -1, next polygon
                j += 3
                triStart = j - 2
              }
            }
          } else {
            // if triangles else triangle strips
            while (j < coordIndex.length) {
              if (coordIndex[j] >= 0) {
                // new triangle
                indices.push(coordIndex[j - 2] + idx0)
                indices.push(coordIndex[j - 1] + idx0)
                indices.push(coordIndex[j - 0] + idx0)
                j += 1
              } else {
                // coordIndex[j] === -1, next polygon
                j += 3
              }
            }
          }
          // n.b. positions.push(...point) can generate "Maximum call stack size exceeded"
          positions = [...positions, ...point]
          const npt = Math.floor(point.length / 3)
          const rgbas = Array(npt).fill(rgba).flat()
          if (color.length === npt * 3) {
            // colors are rgb 0..1, rgbas are RGBA 0..255
            let c3 = 0
            let c4 = 0
            for (let i = 0; i < npt; i++) {
              for (let j = 0; j < 3; j++) {
                rgbas[c4] = Math.round(color[c3] * 255.0)
                c3++
                c4++
              }
              c4++
            }
          }
          rgba255 = [...rgba255, ...rgbas]
        } else if (height < 0.0) {
          // sphere
          NiivueObject3D.makeColoredSphere(positions, indices, rgba255, radius, translation, rgba)
        } else {
          // https://www.andre-gaschler.com/rotationconverter/
          const r = mat4.create() // rotation mat4x4
          mat4.fromRotation(r, rotation[3], [rotation[0], rotation[1], rotation[2]])
          const pti = vec4.fromValues(0, -height * 0.5, 0, 1)
          const ptj = vec4.fromValues(0, +height * 0.5, 0, 1)
          vec4.transformMat4(pti, pti, r)
          vec4.transformMat4(ptj, ptj, r)
          vec4.add(pti, pti, translation)
          vec4.add(ptj, ptj, translation)
          // https://www.web3d.org/specifications/X3Dv4Draft/ISO-IEC19775-1v4-CD/Part01/components/geometry3D.html#Cylinder
          NiivueObject3D.makeColoredCylinder(positions, indices, rgba255, pti, ptj, radius, rgba)
        }
      } // while <shape
    }
    indices = new Int32Array(indices)
    return {
      positions,
      indices,
      rgba255
    }
  } // readX3D()

  // read GIfTI format mesh
  // https://www.nitrc.org/projects/gifti/
  static readGII(buffer, n_vert = 0) {
    let len = buffer.byteLength
    if (len < 20) {
      throw new Error('File too small to be GII: bytes = ' + len)
    }
    let chars = new TextDecoder('ascii').decode(buffer)
    if (chars[0].charCodeAt(0) === 31) {
      // raw GIFTI saved as .gii.gz is smaller than gz GIFTI due to base64 overhead
      const raw = decompressSync(new Uint8Array(buffer))
      buffer = raw.buffer
      chars = new TextDecoder('ascii').decode(raw.buffer)
    }
    let pos = 0
    function readXMLtag() {
      let isEmptyTag = true
      let startPos = pos
      while (isEmptyTag) {
        // while (pos < len && chars[pos] === 10) pos++; //skip blank lines
        while (pos < len && chars[pos] !== '<') {
          pos++
        } // find tag start symbol: '<' e.g. "<tag>"
        startPos = pos
        while (pos < len && chars[pos] !== '>') {
          pos++
        } // find tag end symbol: '>' e.g. "<tag>"
        isEmptyTag = chars[pos - 1] === '/' // empty tag ends "/>" e.g. "<br/>"
        if (startPos + 1 < len && chars[startPos + 1] === '/') {
          // skip end tag "</"
          pos += 1
          isEmptyTag = true
        }
        // let endTagPos = pos;
        if (pos >= len) {
          break
        }
      }
      const tagString = new TextDecoder().decode(buffer.slice(startPos + 1, pos)).trim()
      const startTag = tagString.split(' ')[0].trim()
      // ignore declarations https://stackoverflow.com/questions/60801060/what-does-mean-in-xml
      const contentStartPos = pos
      let contentEndPos = pos
      let endPos = pos
      if (chars[startPos + 1] !== '?' && chars[startPos + 1] !== '!') {
        // ignore declarations "<?" and "<!"
        const endTag = '</' + startTag + '>'
        contentEndPos = chars.indexOf(endTag, contentStartPos)
        endPos = contentEndPos + endTag.length - 1
      }
      // <name>content</name>
      // a    b      c      d
      // a: startPos
      // b: contentStartPos
      // c: contentEndPos
      // d: endPos
      return {
        name: tagString,
        startPos,
        contentStartPos,
        contentEndPos,
        endPos
      } //, 'startTagLastPos': startTagLastPos, 'endTagFirstPos': endTagFirstPos, 'endTagLastPos': endTagLastPos];
    }
    let tag = readXMLtag()
    if (!tag.name.startsWith('?xml')) {
      console.log('readGII: Invalid XML file')
      return null
    }
    while (!tag.name.startsWith('GIFTI') && tag.endPos < len) {
      tag = readXMLtag()
    }
    if (!tag.name.startsWith('GIFTI') || tag.contentStartPos === tag.contentEndPos) {
      console.log('readGII: XML file does not include GIFTI tag')
      return null
    }
    len = tag.contentEndPos // only read contents of GIfTI tag
    let positions = []
    let indices = []
    let scalars = []
    let isIdx = false
    let isPts = false
    let isVectors = false
    let isColMajor = false
    let Dims = [1, 1, 1]
    const FreeSurferTranlate = [0, 0, 0] // https://gist.github.com/alexisthual/f0b2f9eb2a67b8f61798f2c138dda981
    let dataType = 0
    // let isLittleEndian = true;
    let isGzip = false
    let isASCII = false
    let nvert = 0
    // FreeSurfer versions after 20221225 disambiguate if transform has been applied
    // "./mris_convert --to-scanner" store raw vertex positions in scanner space, so transforms should be ignored.
    //  FreeSurfer versions after 20221225 report that the transform is applied by reporting:
    //   <DataSpace><![CDATA[NIFTI_XFORM_SCANNER_ANAT
    let isDataSpaceScanner = false
    tag.endPos = tag.contentStartPos // read the children of the 'GIFTI' tag
    let line = ''
    function readNumericTag(TagName, isFloat = false) {
      // Tag 'Dim1' will return 3 for Dim1="3"
      const pos = line.indexOf(TagName)
      if (pos < 0) {
        return 1
      }
      const spos = line.indexOf('"', pos) + 1
      const epos = line.indexOf('"', spos)
      const str = line.slice(spos, epos)
      if (isFloat) {
        return parseFloat(str)
      } else {
        return parseInt(str)
      }
    }
    function readBracketTag(TagName) {
      const pos = line.indexOf(TagName)
      if (pos < 0) {
        return ''
      }
      const spos = pos + TagName.length
      const epos = line.indexOf(']', spos)
      return line.slice(spos, epos)
    }
    const Labels = { R: [], G: [], B: [], A: [], I: [], labels: [] }
    while (tag.endPos < len && tag.name.length > 1) {
      tag = readXMLtag()
      if (tag.name.startsWith('Label Key')) {
        line = tag.name
        Labels.I.push(readNumericTag('Key='))
        Labels.R.push(Math.round(255 * readNumericTag('Red=', true)))
        Labels.G.push(Math.round(255 * readNumericTag('Green=', true)))
        Labels.B.push(Math.round(255 * readNumericTag('Blue=', true)))
        Labels.A.push(Math.round(255 * readNumericTag('Alpha', true)))
        line = new TextDecoder().decode(buffer.slice(tag.contentStartPos + 1, tag.contentEndPos)).trim()
        Labels.labels.push(readBracketTag('<![CDATA['))
      }
      if (tag.name.trim() === 'Data') {
        if (isVectors) {
          continue
        }
        line = new TextDecoder().decode(buffer.slice(tag.contentStartPos + 1, tag.contentEndPos)).trim()
        // Data can be on one to three lines...
        let datBin = []
        if (isASCII) {
          const nvert = Dims[0] * Dims[1] * Dims[2]
          const lines = line.split(/\s+/) // .split(/[ ,]+/);
          if (nvert !== lines.length) {
            throw new Error('Unable to parse ASCII GIfTI')
          }
          if (dataType === 2) {
            dataType = 8
          } // UInt8 -> Int32
          if (dataType === 32) {
            dataType = 16
          } // float64 -> float32
          if (dataType === 8) {
            datBin = new Int32Array(nvert)
            for (let v = 0; v < nvert; v++) {
              datBin[v] = parseInt(lines[v])
            }
          }
          if (dataType === 16) {
            datBin = new Float32Array(nvert)
            for (let v = 0; v < nvert; v++) {
              datBin[v] = parseFloat(lines[v])
            }
          }
        } else if (typeof Buffer === 'undefined') {
          // raw.gii
          function base64ToUint8(base64) {
            const binary_string = atob(base64)
            const len = binary_string.length
            const bytes = new Uint8Array(len)
            for (let i = 0; i < len; i++) {
              bytes[i] = binary_string.charCodeAt(i)
            }
            return bytes
          }
          if (isGzip) {
            const datZ = base64ToUint8(line.slice())
            datBin = decompressSync(new Uint8Array(datZ))
          } else {
            datBin = base64ToUint8(line.slice())
          }
        } else {
          // if Buffer not defined
          if (isGzip) {
            const datZ = Buffer.from(line.slice(), 'base64')
            datBin = decompressSync(new Uint8Array(datZ))
          } else {
            datBin = Buffer.from(line.slice(), 'base64')
          }
        }
        if (isPts) {
          if (dataType !== 16) {
            console.log('expect positions as FLOAT32')
          }
          positions = new Float32Array(datBin.buffer)
          if (isColMajor) {
            const tmp = positions.slice()
            const np = tmp.length / 3
            let j = 0
            for (let p = 0; p < np; p++) {
              for (let i = 0; i < 3; i++) {
                positions[j] = tmp[i * np + p]
                j++
              }
            }
          } // isColMajor
        } else if (isIdx) {
          if (dataType !== 8) {
            console.log('expect indices as INT32')
          }
          indices = new Int32Array(datBin.buffer)
          if (isColMajor) {
            const tmp = indices.slice()
            const np = tmp.length / 3
            let j = 0
            for (let p = 0; p < np; p++) {
              for (let i = 0; i < 3; i++) {
                indices[j] = tmp[i * np + p]
                j++
              }
            }
          } // isColMajor
        } else {
          // not position or indices: assume scalars NIFTI_INTENT_NONE
          nvert = Dims[0] * Dims[1] * Dims[2]
          if (n_vert !== 0) {
            if (nvert % n_vert !== 0) {
              console.log('Number of vertices in scalar overlay (' + nvert + ') does not match mesh (' + n_vert + ')')
            }
          }
          function Float32Concat(first, second) {
            const firstLength = first.length
            const result = new Float32Array(firstLength + second.length)
            result.set(first)
            result.set(second, firstLength)
            return result
          } // Float32Concat()
          let scalarsNew = []
          if (dataType === 2) {
            const scalarsInt = new Uint8Array(datBin.buffer)
            scalarsNew = Float32Array.from(scalarsInt)
          } else if (dataType === 8) {
            const scalarsInt = new Int32Array(datBin.buffer)
            scalarsNew = Float32Array.from(scalarsInt)
          } else if (dataType === 16) {
            scalarsNew = new Float32Array(datBin.buffer)
          } else if (dataType === 32) {
            const scalarFloat = new Float64Array(datBin.buffer)
            scalarsNew = Float32Array.from(scalarFloat)
          } else {
            throw new Error(`Invalid dataType: ${dataType}`)
          }
          scalars = Float32Concat(scalars, scalarsNew)
        }
        continue
      }
      if (tag.name.trim() === 'DataSpace') {
        line = new TextDecoder().decode(buffer.slice(tag.contentStartPos + 1, tag.contentEndPos)).trim()
        if (line.includes('NIFTI_XFORM_SCANNER_ANAT')) {
          isDataSpaceScanner = true
        }
      }
      if (tag.name.trim() === 'MD') {
        line = new TextDecoder().decode(buffer.slice(tag.contentStartPos + 1, tag.contentEndPos)).trim()
        if (line.includes('AnatomicalStructurePrimary') && line.includes('CDATA[')) {
          this.AnatomicalStructurePrimary = readBracketTag('<Value><![CDATA[').toUpperCase()
        }
        if (line.includes('VolGeom') && line.includes('CDATA[')) {
          let e = -1
          if (line.includes('VolGeomC_R')) {
            e = 0
          }
          if (line.includes('VolGeomC_A')) {
            e = 1
          }
          if (line.includes('VolGeomC_S')) {
            e = 2
          }
          if (e < 0) {
            continue
          }
          FreeSurferTranlate[e] = parseFloat(readBracketTag('<Value><![CDATA['))
        }
      }
      // read DataArray properties
      if (!tag.name.startsWith('DataArray')) {
        continue
      }
      line = tag.name
      Dims = [1, 1, 1]
      isGzip = line.includes('Encoding="GZipBase64Binary"')
      isASCII = line.includes('Encoding="ASCII"')
      isIdx = line.includes('Intent="NIFTI_INTENT_TRIANGLE"')
      isPts = line.includes('Intent="NIFTI_INTENT_POINTSET"')
      isVectors = line.includes('Intent="NIFTI_INTENT_VECTOR"')
      isColMajor = line.includes('ArrayIndexingOrder="ColumnMajorOrder"')
      // isLittleEndian = line.includes('Endian="LittleEndian"');
      if (line.includes('DataType="NIFTI_TYPE_UINT8"')) {
        dataType = 2
      } // DT_UINT8
      if (line.includes('DataType="NIFTI_TYPE_INT32"')) {
        dataType = 8
      } // DT_INT32
      if (line.includes('DataType="NIFTI_TYPE_FLOAT32"')) {
        dataType = 16
      } // DT_FLOAT32
      if (line.includes('DataType="NIFTI_TYPE_FLOAT64"')) {
        dataType = 32
      } // DT_FLOAT64
      Dims[0] = readNumericTag('Dim0=')
      Dims[1] = readNumericTag('Dim1=')
      Dims[2] = readNumericTag('Dim2=')
    }
    // console.log(`p=${positions.length} i=${indices.length} s=${scalars.length}`);
    let colormapLabel = []
    if (Labels.I.length > 1) {
      colormapLabel = cmapper.makeLabelLut(Labels)
    }
    if (n_vert > 0) {
      return { scalars, colormapLabel }
    }
    if (
      positions.length > 2 &&
      !isDataSpaceScanner &&
      (FreeSurferTranlate[0] !== 0 || FreeSurferTranlate[1] !== 0 || FreeSurferTranlate[2] !== 0)
    ) {
      nvert = Math.floor(positions.length / 3)
      let i = 0
      for (let v = 0; v < nvert; v++) {
        positions[i] += FreeSurferTranlate[0]
        i++
        positions[i] += FreeSurferTranlate[1]
        i++
        positions[i] += FreeSurferTranlate[2]
        i++
      }
    } // issue416: apply FreeSurfer translation
    return {
      positions,
      indices,
      scalars,
      colormapLabel
    } // MatrixData
  } // readGII()
}
