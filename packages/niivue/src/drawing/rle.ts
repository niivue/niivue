import { log } from '@/logger'
// Internal function to compress drawing using run length encoding
// inputs
// data: Uint8Array to compress
// output
// returns rle compressed Uint8Array
export function encodeRLE(data: Uint8Array): Uint8Array {
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
  log.debug('PackBits ' + dl + ' -> ' + rp + ' bytes (x' + dl / rp + ')')
  return r.slice(0, rp)
}

// Internal function to decompress drawing using run length encoding
// inputs
// rle: packbits compressed stream
// decodedlen: size of uncompressed data
// output
// returns Uint8Array of decodedlen bytes
export function decodeRLE(rle: Uint8Array, decodedlen: number): Uint8Array {
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
