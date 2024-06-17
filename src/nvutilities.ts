import arrayEqual from 'array-equal'
import { compress, decompress, decompressSync, strFromU8, strToU8 } from 'fflate/browser'
import { mat4, vec3, vec4 } from 'gl-matrix'

// TODO: TypedNumberArray also in nvmesh-types.ts
type TypedNumberArray =
  | Float64Array
  | Float32Array
  | Uint32Array
  | Uint16Array
  | Uint8Array
  | Int32Array
  | Int16Array
  | Int8Array

/**
 * Namespace for utility functions
 * @ignore
 */
export class NVUtilities {
  static arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
    const bytes = new Uint8Array(arrayBuffer)
    return NVUtilities.uint8tob64(bytes)
  }

  static readMatV4(buffer: ArrayBuffer): Record<string, TypedNumberArray> {
    let len = buffer.byteLength
    if (len < 40) {
      throw new Error('File too small to be MAT v4: bytes = ' + buffer.byteLength)
    }
    let reader = new DataView(buffer)
    let magic = reader.getUint16(0, true)
    let _buffer = buffer
    if (magic === 35615 || magic === 8075) {
      // gzip signature 0x1F8B in little and big endian
      const raw = decompressSync(new Uint8Array(buffer))
      reader = new DataView(raw.buffer)
      magic = reader.getUint16(0, true)
      _buffer = raw.buffer
      len = _buffer.byteLength
    }
    const textDecoder = new TextDecoder('utf-8')
    const bytes = new Uint8Array(_buffer)
    let pos = 0
    const mat: Record<string, TypedNumberArray> = {}
    function getTensDigit(v: number): number {
      return Math.floor(v / 10) % 10
    }
    function readArray(tagDataType: number, tagBytesStart: number, tagBytesEnd: number): TypedNumberArray {
      const byteArray = new Uint8Array(bytes.subarray(tagBytesStart, tagBytesEnd))
      if (tagDataType === 1) {
        return new Float32Array(byteArray.buffer)
      }
      if (tagDataType === 2) {
        return new Int32Array(byteArray.buffer)
      }
      if (tagDataType === 3) {
        return new Int16Array(byteArray.buffer)
      }
      if (tagDataType === 4) {
        return new Uint16Array(byteArray.buffer)
      }
      if (tagDataType === 5) {
        return new Uint8Array(byteArray.buffer)
      }
      return new Float64Array(byteArray.buffer)
    }
    function readTag(): void {
      const mtype = reader.getUint32(pos, true)
      const mrows = reader.getUint32(pos + 4, true)
      const ncols = reader.getUint32(pos + 8, true)
      const imagf = reader.getUint32(pos + 12, true)
      const namlen = reader.getUint32(pos + 16, true)
      pos += 20 // skip header
      if (imagf !== 0) {
        throw new Error('Matlab V4 reader does not support imaginary numbers')
      }
      const tagArrayItems = mrows * ncols
      if (tagArrayItems < 1) {
        throw new Error('mrows * ncols must be greater than one')
      }
      const byteArray = new Uint8Array(bytes.subarray(pos, pos + namlen))
      const tagName = textDecoder.decode(byteArray).trim().replaceAll('\x00', '')
      const tagDataType = getTensDigit(mtype)
      // 0 double-precision (64-bit) floating-point numbers
      // 1 single-precision (32-bit) floating-point numbers
      // 2 32-bit signed integers
      // 3 16-bit signed integers
      // 4 16-bit unsigned integers
      // 5 8-bit unsigned integers
      let tagBytesPerItem = 8
      if (tagDataType >= 1 && tagDataType <= 2) {
        tagBytesPerItem = 4
      } else if (tagDataType >= 3 && tagDataType <= 4) {
        tagBytesPerItem = 2
      } else if (tagDataType === 5) {
        tagBytesPerItem = 1
      } else if (tagDataType !== 0) {
        throw new Error('impossible Matlab v4 datatype')
      }
      pos += namlen // skip name
      if (mtype > 50) {
        throw new Error('Does not appear to be little-endian V4 Matlab file')
      }
      const posEnd = pos + tagArrayItems * tagBytesPerItem
      mat[tagName] = readArray(tagDataType, pos, posEnd)
      pos = posEnd
    }
    while (pos + 20 < len) {
      readTag()
    }
    return mat
  } // readMatV4()

  /*
https://gist.github.com/jonleighton/958841
MIT LICENSE
Copyright 2011 Jon Leighton
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
  static uint8tob64(bytes: Uint8Array): string {
    // TODO: use TextDecoder instead of shipping own implementation

    let base64 = ''
    const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const byteLength = bytes.byteLength
    const byteRemainder = byteLength % 3
    const mainLength = byteLength - byteRemainder

    let a, b, c, d
    let chunk

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i = i + 3) {
      // Combine the three bytes into a single integer
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

      // Use bitmasks to extract 6-bit segments from the triplet
      a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
      b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
      c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
      d = chunk & 63 // 63       = 2^6 - 1

      // Convert the raw binary segments to the appropriate ASCII encoding
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder === 1) {
      chunk = bytes[mainLength]

      a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

      // Set the 4 least significant bits to zero
      b = (chunk & 3) << 4 // 3   = 2^2 - 1

      base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder === 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

      a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

      // Set the 2 least significant bits to zero
      c = (chunk & 15) << 2 // 15    = 2^4 - 1

      base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }

    return base64
  }

  // https://stackoverflow.com/questions/34156282/how-do-i-save-json-to-local-text-file
  static download(content: string | ArrayBuffer, fileName: string, contentType: string): void {
    const a = document.createElement('a')
    const contentArray = Array.isArray(content) ? content : [content]
    const file = new Blob(contentArray, { type: contentType })
    a.href = URL.createObjectURL(file)
    a.download = fileName
    a.click()
  }

  static readFileAsync(file: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (): void => {
        resolve(reader.result as ArrayBuffer)
      }

      reader.onerror = reject

      reader.readAsArrayBuffer(file)
    })
  }

  static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = (): void => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  }

  static async decompressBase64String(base64: string): Promise<string> {
    const compressed = atob(base64)
    // convert to an array buffer
    const compressedBuffer = new ArrayBuffer(compressed.length)
    const compressedView = new Uint8Array(compressedBuffer)
    for (let i = 0; i < compressed.length; i++) {
      compressedView[i] = compressed.charCodeAt(i)
    }
    return NVUtilities.decompressArrayBuffer(compressedView)
  }

  static async compressToBase64String(string: string): Promise<string> {
    const buf = await NVUtilities.compressStringToArrayBuffer(string)
    return NVUtilities.uint8tob64(new Uint8Array(buf))
  }

  static async compressStringToArrayBuffer(input: string): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const uint8Array = strToU8(input)

      compress(uint8Array, (err, compressed) => {
        if (err) {
          reject(err)
        } else {
          resolve(compressed.buffer)
        }
      })
    })
  }

  static isArrayBufferCompressed(buffer: ArrayBuffer): boolean {
    if (buffer && buffer.byteLength) {
      const arr = new Uint8Array(buffer)
      const magicNumber = (arr[0] << 8) | arr[1]
      return magicNumber === 0x1f8b
    } else {
      return false
    }
  }

  static async decompressArrayBuffer(buffer: ArrayBuffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const uint8Array = new Uint8Array(buffer)

      decompress(uint8Array, (err, decompressed) => {
        if (err) {
          reject(err)
        } else {
          const result = strFromU8(decompressed)
          resolve(result)
        }
      })
    })
  }

  static arraysAreEqual(a: unknown[], b: unknown[]): boolean {
    return arrayEqual(a, b)
  }

  /**
   * Generate a pre-filled number array.
   *
   * @param start - start value
   * @param stop - stop value
   * @param step - step value
   * @returns filled number array
   */
  static range(start: number, stop: number, step: number): number[] {
    return Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step)
  }

  /**
   * convert spherical AZIMUTH, ELEVATION to Cartesian
   * @param azimuth - azimuth number
   * @param elevation - elevation number
   * @returns the converted [x, y, z] coordinates
   * @example
   * xyz = NVUtilities.sph2cartDeg(42, 42)
   */
  static sph2cartDeg(azimuth: number, elevation: number): number[] {
    // convert spherical AZIMUTH,ELEVATION,RANGE to Cartesion
    // see Matlab's [x,y,z] = sph2cart(THETA,PHI,R)
    // reverse with cart2sph
    const Phi = -elevation * (Math.PI / 180)
    const Theta = ((azimuth - 90) % 360) * (Math.PI / 180)
    const ret = [Math.cos(Phi) * Math.cos(Theta), Math.cos(Phi) * Math.sin(Theta), Math.sin(Phi)]
    const len = Math.sqrt(ret[0] * ret[0] + ret[1] * ret[1] + ret[2] * ret[2])
    if (len <= 0.0) {
      return ret
    }
    ret[0] /= len
    ret[1] /= len
    ret[2] /= len
    return ret
  }

  static vox2mm(XYZ: number[], mtx: mat4): vec3 {
    const sform = mat4.clone(mtx)
    mat4.transpose(sform, sform)
    const pos = vec4.fromValues(XYZ[0], XYZ[1], XYZ[2], 1)
    vec4.transformMat4(pos, pos, sform)
    const pos3 = vec3.fromValues(pos[0], pos[1], pos[2])
    return pos3
  }
}
