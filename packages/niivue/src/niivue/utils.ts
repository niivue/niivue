import { mat4, vec3, vec4 } from 'gl-matrix'
import { NiftiHeader, Volume } from '@/types'
import { NVUtilities } from '@/nvutilities'
import { nice } from '@/utils/index'

export function readFileAsDataURL(input: File | FileSystemFileEntry): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let filePromise: Promise<File>

    if (input instanceof File) {
      filePromise = Promise.resolve(input)
    } else {
      filePromise = new Promise<File>((resolve, reject) => {
        input.file(resolve, reject)
      })
    }

    filePromise
      .then((file) => {
        const reader = new FileReader()

        reader.onload = (): void => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
          } else {
            reject(new Error('Expected a string from FileReader.result'))
          }
        }

        reader.onerror = (): void => {
          reject(reader.error ?? new Error('Unknown FileReader error'))
        }

        reader.readAsDataURL(file)
      })
      .catch((err) => reject(err))
  })
}

// rotate image to match right-anterior-superior voxel order
export function img2ras16(volume: Volume): Int16Array {
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
  let xlut = NVUtilities.range(0, dims[1] - 1, 1)
  if (inflip[0]) {
    xlut = NVUtilities.range(dims[1] - 1, 0, -1)
  }
  for (let i = 0; i < dims[1]; i++) {
    xlut[i] *= instride[0]
  }
  let ylut = NVUtilities.range(0, dims[2] - 1, 1)
  if (inflip[1]) {
    ylut = NVUtilities.range(dims[2] - 1, 0, -1)
  }
  for (let i = 0; i < dims[2]; i++) {
    ylut[i] *= instride[1]
  }
  let zlut = NVUtilities.range(0, dims[3] - 1, 1)
  if (inflip[2]) {
    zlut = NVUtilities.range(dims[3] - 1, 0, -1)
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

function loose_label(min: number, max: number, ntick = 4): [number, number, number, boolean] {
  const range = nice(max - min, false)
  const d = nice(range / (ntick - 1), true)
  const graphmin = Math.floor(min / d) * d
  const graphmax = Math.ceil(max / d) * d
  const perfect = graphmin === min && graphmax === max
  return [d, graphmin, graphmax, perfect]
}

// "Nice Numbers for Graph Labels", Graphics Gems, pp 61-63
// https://github.com/cenfun/nice-ticks/blob/master/docs/Nice-Numbers-for-Graph-Labels.pdf
export function tickSpacing(mn: number, mx: number): number[] {
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
export function deg2rad(deg: number): number {
  return deg * (Math.PI / 180.0)
}

export function negMinMax(min: number, max: number, minNeg: number, maxNeg: number): [number, number] {
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

export function swizzleVec3(vec: vec3, order = [0, 1, 2]): vec3 {
  const vout = vec3.create()
  vout[0] = vec[order[0]]
  vout[1] = vec[order[1]]
  vout[2] = vec[order[2]]
  return vout
}

// return boolean is 2D slice view is radiological
// n.b. ambiguous for pure sagittal views
// TODO: this doesn't return a boolean.
export function isRadiological(mtx: mat4): number {
  const vRight = vec4.fromValues(1, 0, 0, 0) // pure right vector
  const vRotated = vec4.create()
  vec4.transformMat4(vRotated, vRight, mtx)
  return vRotated[0]
}

export function unProject(winX: number, winY: number, winZ: number, mvpMatrix: mat4): vec4 {
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

export function unpackFloatFromVec4i(val: Uint8Array): number {
  // Convert 32-bit rgba to float32
  // https://github.com/rii-mango/Papaya/blob/782a19341af77a510d674c777b6da46afb8c65f1/src/js/viewer/screensurface.js#L552
  const bitSh = [1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0]
  return (val[0] * bitSh[0] + val[1] * bitSh[1] + val[2] * bitSh[2] + val[3] * bitSh[3]) / 255.0
}

// https://stackoverflow.com/questions/11409895/whats-the-most-elegant-way-to-cap-a-number-to-a-segment
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Scale the raw intensity values by the header scale slope and intercept
 * @param hdr - the header object
 * @param raw - the raw intensity values
 * @returns the scaled intensity values
 * @internal
 */
export function intensityRaw2Scaled(hdr: NiftiHeader, raw: number): number {
  if (hdr.scl_slope === 0) {
    hdr.scl_slope = 1.0
  }
  return raw * hdr.scl_slope + hdr.scl_inter
}
