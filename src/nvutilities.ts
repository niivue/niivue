import arrayEqual from 'array-equal'
import { compressSync, decompressSync, strToU8 } from 'fflate/browser'

/**
 * Namespace for utility functions
 */
export class NVUtilities {
  static arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer)
    return NVUtilities.uint8tob64(bytes)
  }

  /*
https://gist.github.com/jonleighton/958841
MIT LICENSE
Copyright 2011 Jon Leighton
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
  static uint8tob64(bytes: Uint8Array) {
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
  static download(content: Blob, fileName: string, contentType: string) {
    const a = document.createElement('a')
    const file = new Blob([content], { type: contentType })
    a.href = URL.createObjectURL(file)
    a.download = fileName
    a.click()
  }

  static readFileAsync(file: Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result)
      }

      reader.onerror = reject

      reader.readAsArrayBuffer(file)
    })
  }

  static blobToBase64(blob: Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  }

  static decompressBase64String(base64: string) {
    const compressed = atob(base64)
    // convert to an array buffer
    const compressedBuffer = new ArrayBuffer(compressed.length)
    const compressedView = new Uint8Array(compressedBuffer)
    for (let i = 0; i < compressed.length; i++) {
      compressedView[i] = compressed.charCodeAt(i)
    }
    // decompress the array buffer
    const decompressedBuffer = decompressSync(compressedView)
    // convert the array buffer to a string
    const decompressed = new TextDecoder('utf-8').decode(decompressedBuffer)
    // console.log(decompressed);
    return decompressed
  }

  static compressToBase64String(string: string) {
    const buf = strToU8(string)
    const compressed = compressSync(buf)
    const base64 = NVUtilities.uint8tob64(compressed)
    return base64
  }

  static arraysAreEqual(a: unknown[], b: unknown[]) {
    return arrayEqual(a, b)
  }
}
