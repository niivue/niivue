// Pure-TS parser for the 348-byte NIfTI-1 header. Used by the import
// post-pass to compute the ImagingVolume key info (affine + shape3) for
// fmap-to-target matching. Reads ONLY 348 bytes (not the full file) and
// only the fields the post-pass needs.

export interface NiftiHeader {
  /** dim[1..3] = X, Y, Z shape. dim[0] is the number of dimensions. */
  dim: readonly number[]
  /** pixdim[0] is qfac (-1 or +1); pixdim[1..3] are voxel sizes. */
  pixdim: readonly number[]
  qformCode: number
  sformCode: number
  /** quaternion components b, c, d (a is derived). */
  quaternBCD: readonly [number, number, number]
  /** qoffset_x, qoffset_y, qoffset_z. */
  qoffsetXYZ: readonly [number, number, number]
  srowX: readonly [number, number, number, number]
  srowY: readonly [number, number, number, number]
  srowZ: readonly [number, number, number, number]
  endianness: 'le' | 'be'
}

const NIFTI1_HEADER_SIZE = 348

/**
 * Parse a NIfTI-1 header from a byte buffer. Returns null when the buffer
 * is too short or sizeof_hdr doesn't match 348 in either endianness.
 */
export function parseNiftiHeader(buf: Uint8Array): NiftiHeader | null {
  if (buf.length < NIFTI1_HEADER_SIZE) return null

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)

  let littleEndian: boolean
  if (view.getInt32(0, true) === NIFTI1_HEADER_SIZE) {
    littleEndian = true
  } else if (view.getInt32(0, false) === NIFTI1_HEADER_SIZE) {
    littleEndian = false
  } else {
    return null
  }

  const dim = readInt16Array(view, 40, 8, littleEndian)
  const pixdim = readFloat32Array(view, 76, 8, littleEndian)
  const qformCode = view.getInt16(252, littleEndian)
  const sformCode = view.getInt16(254, littleEndian)
  const quaternBCD: [number, number, number] = [
    view.getFloat32(256, littleEndian),
    view.getFloat32(260, littleEndian),
    view.getFloat32(264, littleEndian)
  ]
  const qoffsetXYZ: [number, number, number] = [
    view.getFloat32(268, littleEndian),
    view.getFloat32(272, littleEndian),
    view.getFloat32(276, littleEndian)
  ]
  const srowX = readFloat32Tuple4(view, 280, littleEndian)
  const srowY = readFloat32Tuple4(view, 296, littleEndian)
  const srowZ = readFloat32Tuple4(view, 312, littleEndian)

  return {
    dim,
    pixdim,
    qformCode,
    sformCode,
    quaternBCD,
    qoffsetXYZ,
    srowX,
    srowY,
    srowZ,
    endianness: littleEndian ? 'le' : 'be'
  }
}

function readInt16Array(view: DataView, offset: number, count: number, le: boolean): number[] {
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    out.push(view.getInt16(offset + i * 2, le))
  }
  return out
}

function readFloat32Array(view: DataView, offset: number, count: number, le: boolean): number[] {
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    out.push(view.getFloat32(offset + i * 4, le))
  }
  return out
}

function readFloat32Tuple4(
  view: DataView,
  offset: number,
  le: boolean
): [number, number, number, number] {
  return [
    view.getFloat32(offset, le),
    view.getFloat32(offset + 4, le),
    view.getFloat32(offset + 8, le),
    view.getFloat32(offset + 12, le)
  ]
}
