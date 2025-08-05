import { Volume, NiftiHeader } from '@/types'
import { NVUtilities } from '@/nvutilities'

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

export function unpackFloatFromVec4i(val: Uint8Array): number {
  // Convert 32-bit rgba to float32
  // https://github.com/rii-mango/Papaya/blob/782a19341af77a510d674c777b6da46afb8c65f1/src/js/viewer/screensurface.js#L552
  const bitSh = [1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0]
  return (val[0] * bitSh[0] + val[1] * bitSh[1] + val[2] * bitSh[2] + val[3] * bitSh[3]) / 255.0
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
