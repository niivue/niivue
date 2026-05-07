/**
 * 3D binary mask dilation with 6-connectivity (face neighbors).
 * Uses double-buffering: reads from src, writes to dst, then swaps.
 *
 * @param mask     Input mask (non-zero = foreground). Not modified.
 * @param nx       Volume width
 * @param ny       Volume height
 * @param nz       Volume depth
 * @param iterations Number of dilation passes
 * @returns New Uint8Array with 0/1 values
 */
export function dilateMask3D(
  mask: ArrayLike<number>,
  nx: number,
  ny: number,
  nz: number,
  iterations: number
): Uint8Array {
  const len = nx * ny * nz
  let src = new Uint8Array(len)
  let dst = new Uint8Array(len)

  // Binarize input into src
  for (let i = 0; i < len; i++) {
    src[i] = mask[i] !== 0 ? 1 : 0
  }

  const nxy = nx * ny

  for (let iter = 0; iter < iterations; iter++) {
    dst.set(src)

    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const idx = z * nxy + y * nx + x
          if (src[idx] === 1) continue // already foreground
          // Check 6 face neighbors
          if (
            (x > 0 && src[idx - 1] === 1) ||
            (x < nx - 1 && src[idx + 1] === 1) ||
            (y > 0 && src[idx - nx] === 1) ||
            (y < ny - 1 && src[idx + nx] === 1) ||
            (z > 0 && src[idx - nxy] === 1) ||
            (z < nz - 1 && src[idx + nxy] === 1)
          ) {
            dst[idx] = 1
          }
        }
      }
    }

    // Swap buffers
    const tmp = src
    src = dst
    dst = tmp
  }

  return src
}
