import { mat4, vec3, vec4 } from 'gl-matrix'
import { Log } from '../logger'

const log = new Log()

// rotate image to match right-anterior-superior voxel order
export function img2ras16(volume) {
  // return image oriented to RAS space as int16
  const dims = volume.hdr.dims // reverse to original
  const perm = volume.permRAS
  const vx = dims[1] * dims[2] * dims[3]
  // this.drawBitmap = new Uint8Array(vx);
  const img16 = new Int16Array(vx)
  const layout = [0, 0, 0]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (Math.abs(perm[i]) - 1 !== j) {
        continue
      }
      layout[j] = i * Math.sign(perm[i])
    }
  }
  let stride = 1
  const instride = [1, 1, 1]
  const inflip = [false, false, false]
  for (let i = 0; i < layout.length; i++) {
    for (let j = 0; j < layout.length; j++) {
      const a = Math.abs(layout[j])
      if (a !== i) {
        continue
      }
      instride[j] = stride
      // detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
      if (layout[j] < 0 || Object.is(layout[j], -0)) {
        inflip[j] = true
      }
      stride *= dims[j + 1]
    }
  }
  // lookup table for flips and stride offsets:
  const range = (start, stop, step) => Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step)
  let xlut = range(0, dims[1] - 1, 1)
  if (inflip[0]) {
    xlut = range(dims[1] - 1, 0, -1)
  }
  for (let i = 0; i < dims[1]; i++) {
    xlut[i] *= instride[0]
  }
  let ylut = range(0, dims[2] - 1, 1)
  if (inflip[1]) {
    ylut = range(dims[2] - 1, 0, -1)
  }
  for (let i = 0; i < dims[2]; i++) {
    ylut[i] *= instride[1]
  }
  let zlut = range(0, dims[3] - 1, 1)
  if (inflip[2]) {
    zlut = range(dims[3] - 1, 0, -1)
  }
  for (let i = 0; i < dims[3]; i++) {
    zlut[i] *= instride[2]
  }
  // convert data
  let j = 0
  for (let z = 0; z < dims[3]; z++) {
    for (let y = 0; y < dims[2]; y++) {
      for (let x = 0; x < dims[1]; x++) {
        img16[xlut[x] + ylut[y] + zlut[z]] = volume.img[j]
        j++
      }
    }
  }
  return img16
}

function nice(x, round) {
  const exp = Math.floor(Math.log(x) / Math.log(10))
  const f = x / Math.pow(10, exp)
  let nf
  if (round) {
    if (f < 1.5) {
      nf = 1
    } else if (f < 3) {
      nf = 2
    } else if (f < 7) {
      nf = 5
    } else {
      nf = 10
    }
  } else {
    if (f <= 1) {
      nf = 1
    } else if (f <= 2) {
      nf = 2
    } else if (f <= 5) {
      nf = 5
    } else {
      nf = 10
    }
  }
  return nf * Math.pow(10, exp)
}

function loose_label(min, max, ntick = 4) {
  const range = nice(max - min, false)
  const d = nice(range / (ntick - 1), true)
  const graphmin = Math.floor(min / d) * d
  const graphmax = Math.ceil(max / d) * d
  const perfect = graphmin === min && graphmax === max
  return [d, graphmin, graphmax, perfect]
}

// "Nice Numbers for Graph Labels", Graphics Gems, pp 61-63
// https://github.com/cenfun/nice-ticks/blob/master/docs/Nice-Numbers-for-Graph-Labels.pdf
export function tickSpacing(mn, mx) {
  let v = loose_label(mn, mx, 3)
  if (!v[3]) {
    v = loose_label(mn, mx, 5)
  }
  if (!v[3]) {
    v = loose_label(mn, mx, 4)
  }
  if (!v[3]) {
    v = loose_label(mn, mx, 3)
  }
  if (!v[3]) {
    v = loose_label(mn, mx, 5)
  }
  return [v[0], v[1], v[2]]
}

// convert degrees to radians
export function deg2rad(deg) {
  return deg * (Math.PI / 180.0)
}

export function negMinMax(min, max, minNeg, maxNeg) {
  let mn = -min
  let mx = -max
  if (isFinite(minNeg) && isFinite(maxNeg)) {
    mn = minNeg
    mx = maxNeg
  }
  if (mn > mx) {
    ;[mn, mx] = [mx, mn]
  }
  return [mn, mx]
}

export function swizzleVec3(vec, order = [0, 1, 2]) {
  const vout = vec3.create()
  vout[0] = vec[order[0]]
  vout[1] = vec[order[1]]
  vout[2] = vec[order[2]]
  return vout
}

// return boolean is 2D slice view is radiological
// n.b. ambiguous for pure sagittal views
export function isRadiological(mtx) {
  const vRight = vec4.fromValues(1, 0, 0, 0) // pure right vector
  const vRotated = vec4.create()
  vec4.transformMat4(vRotated, vRight, mtx)
  return vRotated[0]
}

export function unProject(winX, winY, winZ, mvpMatrix) {
  // https://github.com/bringhurst/webgl-unproject
  const inp = vec4.fromValues(winX, winY, winZ, 1.0)
  const finalMatrix = mat4.clone(mvpMatrix)
  // mat.mat4.multiply(finalMatrix, model, proj);
  mat4.invert(finalMatrix, finalMatrix)
  // view is leftTopWidthHeight
  /* Map to range -1 to 1 */
  inp[0] = inp[0] * 2 - 1
  inp[1] = inp[1] * 2 - 1
  inp[2] = inp[2] * 2 - 1
  const out = vec4.create()
  vec4.transformMat4(out, inp, finalMatrix)
  if (out[3] === 0.0) {
    return out
  } // error
  out[0] /= out[3]
  out[1] /= out[3]
  out[2] /= out[3]
  return out
}

export function unpackFloatFromVec4i(val) {
  // Convert 32-bit rgba to float32
  // https://github.com/rii-mango/Papaya/blob/782a19341af77a510d674c777b6da46afb8c65f1/src/js/viewer/screensurface.js#L552
  const bitSh = [1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0]
  return (val[0] * bitSh[0] + val[1] * bitSh[1] + val[2] * bitSh[2] + val[3] * bitSh[3]) / 255.0
}

// https://stackoverflow.com/questions/11409895/whats-the-most-elegant-way-to-cap-a-number-to-a-segment
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

// Internal function to compress drawing using run length encoding
// inputs
// data: Uint8Array to compress
// output
// returns rle compressed Uint8Array
export function encodeRLE(data) {
  // https://en.wikipedia.org/wiki/PackBits
  // run length encoding
  // input and output are Uint8Array
  // Will compress data with long runs up to x64
  // Worst case encoded size is ~1% larger than input
  const dl = data.length // input length
  let dp = 0 // input position
  // worst case: run length encoding (1+1/127) times larger than input
  const r = new Uint8Array(dl + Math.ceil(0.01 * dl))
  const rI = new Int8Array(r.buffer) // typecast as header can be negative
  let rp = 0 // run length position
  while (dp < dl) {
    // for each byte in input
    let v = data[dp]
    dp++
    let rl = 1 // run length
    while (rl < 129 && dp < dl && data[dp] === v) {
      dp++
      rl++
    }
    if (rl > 1) {
      // header
      rI[rp] = -rl + 1
      rp++
      r[rp] = v
      rp++
      continue
    }
    // count literal length
    while (dp < dl) {
      if (rl > 127) {
        break
      }
      if (dp + 2 < dl) {
        // console.log(':', v, data[dp], data[dp+1]);
        if (v !== data[dp] && data[dp + 2] === data[dp] && data[dp + 1] === data[dp]) {
          break
        }
      }
      v = data[dp]
      dp++
      rl++
    }
    // write header
    r[rp] = rl - 1
    rp++
    for (let i = 0; i < rl; i++) {
      r[rp] = data[dp - rl + i]
      rp++
    }
  }
  log.info('PackBits ' + dl + ' -> ' + rp + ' bytes (x' + dl / rp + ')')
  return r.slice(0, rp)
}

// Internal function to decompress drawing using run length encoding
// inputs
// rle: packbits compressed stream
// decodedlen: size of uncompressed data
// output
// returns Uint8Array of decodedlen bytes
export function decodeRLE(rle, decodedlen) {
  const r = new Uint8Array(rle.buffer)
  const rI = new Int8Array(r.buffer) // typecast as header can be negative
  let rp = 0 // input position in rle array
  // d: output uncompressed data array
  const d = new Uint8Array(decodedlen)
  let dp = 0 // output position in decoded array
  while (rp < r.length) {
    // read header
    const hdr = rI[rp]
    rp++
    if (hdr < 0) {
      // write run
      const v = rI[rp]
      rp++
      for (let i = 0; i < 1 - hdr; i++) {
        d[dp] = v
        dp++
      }
    } else {
      // write literal
      for (let i = 0; i < hdr + 1; i++) {
        d[dp] = rI[rp]
        rp++
        dp++
      }
    }
  }
  return d
}

/**
 * scale the raw intensity values by the header scale slope and intercept
 * @param {object} hdr the header object
 * @param {Array} raw the raw intensity values
 * @returns {Array} the scaled intensity values
 * @private
 */
export function intensityRaw2Scaled(hdr, raw) {
  if (hdr.scl_slope === 0) {
    hdr.scl_slope = 1.0
  }
  return raw * hdr.scl_slope + hdr.scl_inter
}
