import arrayEqual from 'array-equal'
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

/**
 * Read ZIP files using asynchronous compression streams API, supports data descriptors
 * todo: check ZIP64 support
 * https://github.com/libyal/assorted/blob/main/documentation/ZIP%20archive%20format.asciidoc
 * https://en.wikipedia.org/wiki/ZIP_(file_format)
 * https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
 * https://dev.to/ndesmic/writing-a-simple-browser-zip-file-decompressor-with-compressionstreams-5che
 */

interface Entry {
  signature: string
  version: number
  generalPurpose: number
  compressionMethod: number
  lastModifiedTime: number
  lastModifiedDate: number
  crc: number
  compressedSize: number
  uncompressedSize: number
  fileNameLength: number
  extraLength: number
  fileName: string
  extra: string
  startsAt?: number
  extract?: () => Promise<Uint8Array>
}

interface CentralDirectoryEntry {
  versionCreated: number
  versionNeeded: number
  fileCommentLength: number
  diskNumber: number
  internalAttributes: number
  externalAttributes: number
  offset: number
  comments: string
  fileNameLength: number
  extraLength: number
}

interface EndOfCentralDirectory {
  numberOfDisks: number
  centralDirectoryStartDisk: number
  numberCentralDirectoryRecordsOnThisDisk: number
  numberCentralDirectoryRecords: number
  centralDirectorySize: number
  centralDirectoryOffset: number
  commentLength: number
  comment: string
}

export class Zip {
  #dataView: DataView
  #index: number = 0
  #localFiles: Entry[] = []
  #centralDirectories: CentralDirectoryEntry[] = []
  #endOfCentralDirectory?: EndOfCentralDirectory

  constructor(arrayBuffer: ArrayBuffer) {
    this.#dataView = new DataView(arrayBuffer)
    this.read()
  }

  async extract(entry: Entry): Promise<Uint8Array> {
    const buffer = new Uint8Array(this.#dataView.buffer.slice(entry.startsAt!, entry.startsAt! + entry.compressedSize))
    if (entry.compressionMethod === 0x00) {
      return buffer
    } else if (entry.compressionMethod === 0x08) {
      const stream = new DecompressionStream('deflate-raw')
      const writer = stream.writable.getWriter()
      writer.write(buffer).catch(console.error)
      const closePromise = writer.close().catch(console.error)
      const response = new Response(stream.readable)
      const result = new Uint8Array(await response.arrayBuffer())
      await closePromise
      return result
    }
    throw new Error(`Unsupported compression method: ${entry.compressionMethod}`)
  }

  private read(): void {
    while (!this.#endOfCentralDirectory && this.#index < this.#dataView.byteLength) {
      const signature = this.#dataView.getUint32(this.#index, true)
      if (signature === 0x04034b50) {
        const entry = this.readLocalFile(this.#index)
        entry.extract = this.extract.bind(this, entry)
        this.#localFiles.push(entry)
        const hasDataDescriptor = (entry.generalPurpose & 0x0008) !== 0
        entry.startsAt = this.#index + 30 + entry.fileNameLength + entry.extraLength
        if (entry.compressedSize === 0 && hasDataDescriptor) {
          let scanIndex = entry.startsAt
          while (scanIndex! + 20 <= this.#dataView.byteLength) {
            const possibleSignature = this.#dataView.getUint32(scanIndex!, true)
            if (possibleSignature === 0x08074b50) {
              const nextPK = this.#dataView.getUint16(scanIndex! + 16, true) === 0x4b50
              if (nextPK) {
                scanIndex! += 4
                break
              }
            }
            scanIndex!++
          }
          entry.crc = this.#dataView.getUint32(scanIndex!, true)
          entry.compressedSize = this.#dataView.getUint32(scanIndex! + 4, true)
          entry.uncompressedSize = this.#dataView.getUint32(scanIndex! + 8, true)
          this.#index = scanIndex! + 12
        } else {
          this.#index = entry.startsAt + entry.compressedSize
        }
      } else if (signature === 0x02014b50) {
        const entry = this.readCentralDirectory(this.#index)
        this.#centralDirectories.push(entry)
        this.#index += 46 + entry.fileNameLength + entry.extraLength + entry.fileCommentLength
      } else if (signature === 0x06054b50) {
        this.#endOfCentralDirectory = this.readEndCentralDirectory(this.#index)
        break
      } else if (signature === 0x06064b50) {
        this.#endOfCentralDirectory = this.readEndCentralDirectory64(this.#index)
        break
      } else {
        console.error(`Unexpected ZIP signature 0x${signature.toString(16).padStart(8, '0')} at index ${this.#index}`)
        break
      }
    }
  }

  private readLocalFile(offset: number): Entry {
    let compressedSize = this.#dataView.getUint32(offset + 18, true)
    let uncompressedSize = this.#dataView.getUint32(offset + 22, true)
    const fileNameLength = this.#dataView.getUint16(offset + 26, true)
    const extraLength = this.#dataView.getUint16(offset + 28, true)
    const extraOffset = offset + 30 + fileNameLength
    const extra = this.readString(extraOffset, extraLength)
    if (compressedSize === 0xffffffff && uncompressedSize === 0xffffffff) {
      let zip64Offset = extraOffset
      let foundZip64 = false
      while (zip64Offset < extraOffset + extraLength - 4) {
        const fieldSignature = this.#dataView.getUint16(zip64Offset, true)
        const fieldLength = this.#dataView.getUint16(zip64Offset + 2, true)
        zip64Offset += 4 // Move past signature and length
        if (fieldSignature === 0x0001) {
          // ZIP64 Extended Information Extra Field
          if (fieldLength >= 16) {
            // Ensure we have enough bytes
            uncompressedSize = Number(this.#dataView.getBigUint64(zip64Offset, true))
            zip64Offset += 8
            compressedSize = Number(this.#dataView.getBigUint64(zip64Offset, true))
            foundZip64 = true
            break
          } else {
            throw new Error(
              `ZIP64 extra field found but is too small (expected at least 16 bytes, got ${fieldLength}).`
            )
          }
        }
        zip64Offset += fieldLength // Move to the next extra field
      }
      if (!foundZip64) {
        throw new Error('ZIP64 format missing extra field with signature 0x0001.')
      }
    }
    return {
      signature: this.readString(offset, 4),
      version: this.#dataView.getUint16(offset + 4, true),
      generalPurpose: this.#dataView.getUint16(offset + 6, true),
      compressionMethod: this.#dataView.getUint16(offset + 8, true),
      lastModifiedTime: this.#dataView.getUint16(offset + 10, true),
      lastModifiedDate: this.#dataView.getUint16(offset + 12, true),
      crc: this.#dataView.getUint32(offset + 14, true),
      compressedSize,
      uncompressedSize,
      fileNameLength,
      extraLength,
      fileName: this.readString(offset + 30, fileNameLength),
      extra: this.readString(offset + 30 + fileNameLength, extraLength)
    }
  }

  private readCentralDirectory(offset: number): CentralDirectoryEntry {
    return {
      versionCreated: this.#dataView.getUint16(offset + 4, true),
      versionNeeded: this.#dataView.getUint16(offset + 6, true),
      fileNameLength: this.#dataView.getUint16(offset + 28, true),
      extraLength: this.#dataView.getUint16(offset + 30, true),
      fileCommentLength: this.#dataView.getUint16(offset + 32, true),
      diskNumber: this.#dataView.getUint16(offset + 34, true),
      internalAttributes: this.#dataView.getUint16(offset + 36, true),
      externalAttributes: this.#dataView.getUint32(offset + 38, true),
      offset: this.#dataView.getUint32(offset + 42, true),
      comments: this.readString(offset + 46, this.#dataView.getUint16(offset + 32, true))
    }
  }

  private readEndCentralDirectory(offset: number): EndOfCentralDirectory {
    const commentLength = this.#dataView.getUint16(offset + 20, true)
    return {
      numberOfDisks: this.#dataView.getUint16(offset + 4, true),
      centralDirectoryStartDisk: this.#dataView.getUint16(offset + 6, true),
      numberCentralDirectoryRecordsOnThisDisk: this.#dataView.getUint16(offset + 8, true),
      numberCentralDirectoryRecords: this.#dataView.getUint16(offset + 10, true),
      centralDirectorySize: this.#dataView.getUint32(offset + 12, true),
      centralDirectoryOffset: this.#dataView.getUint32(offset + 16, true),
      commentLength,
      comment: this.readString(offset + 22, commentLength)
    }
  }

  private readEndCentralDirectory64(offset: number): EndOfCentralDirectory {
    const commentLength = Number(this.#dataView.getBigUint64(offset + 0, true))
    return {
      numberOfDisks: this.#dataView.getUint32(offset + 16, true),
      centralDirectoryStartDisk: this.#dataView.getUint32(offset + 20, true),
      numberCentralDirectoryRecordsOnThisDisk: Number(this.#dataView.getBigUint64(offset + 24, true)),
      numberCentralDirectoryRecords: Number(this.#dataView.getBigUint64(offset + 32, true)),
      centralDirectorySize: Number(this.#dataView.getBigUint64(offset + 40, true)),
      centralDirectoryOffset: Number(this.#dataView.getBigUint64(offset + 48, true)),
      commentLength,
      comment: ''
    }
  }

  private readString(offset: number, length: number): string {
    return Array.from({ length }, (_, i) => String.fromCharCode(this.#dataView.getUint8(offset + i))).join('')
  }

  get entries(): Entry[] {
    return this.#localFiles
  }
}

export class NVUtilities {
  static arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
    const bytes = new Uint8Array(arrayBuffer)
    return NVUtilities.uint8tob64(bytes)
  }

  static async decompress(data: Uint8Array): Promise<Uint8Array> {
    const format =
      data[0] === 31 && data[1] === 139 && data[2] === 8
        ? 'gzip'
        : data[0] === 120 && (data[1] === 1 || data[1] === 94 || data[1] === 156 || data[1] === 218)
          ? 'deflate'
          : 'deflate-raw'
    const stream = new DecompressionStream(format)
    const writer = stream.writable.getWriter()
    writer.write(data).catch(console.error) // Do not await this
    // Close without awaiting directly, preventing the hang issue
    const closePromise = writer.close().catch(console.error)
    const response = new Response(stream.readable)
    const result = new Uint8Array(await response.arrayBuffer())
    await closePromise // Ensure close happens eventually
    return result
  }

  static async decompressToBuffer(data: Uint8Array): Promise<ArrayBuffer> {
    const decompressed = await NVUtilities.decompress(data)
    return decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength)
  }

  static async readMatV4(
    buffer: ArrayBuffer,
    isReplaceDots: boolean = false
  ): Promise<Record<string, TypedNumberArray>> {
    let len = buffer.byteLength
    if (len < 40) {
      throw new Error('File too small to be MAT v4: bytes = ' + buffer.byteLength)
    }
    let reader = new DataView(buffer)
    let magic = reader.getUint16(0, true)
    let _buffer = buffer
    if (magic === 35615 || magic === 8075) {
      // gzip signature 0x1F8B in little and big endian
      const raw = await this.decompress(new Uint8Array(buffer))
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
      let tagName = textDecoder.decode(byteArray).trim().replaceAll('\x00', '')
      // n.b. DSI studio have array mat.dti_fa[] and mat.dti_fa.slope
      if (isReplaceDots) {
        // kludge for invalid DSIstudio FZ files
        tagName = tagName.replaceAll('.', '_')
      }
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

  static b64toUint8(base64: string): Uint8Array {
    const binaryString = atob(base64)
    const length = binaryString.length
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

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

  /**
   * Converts a string into a Uint8Array for use with compression/decompression methods (101arrowz/fflate: MIT License)
   * @param str The string to encode
   * @param latin1 Whether or not to interpret the data as Latin-1. This should
   *               not need to be true unless decoding a binary string.
   * @returns The string encoded in UTF-8/Latin-1 binary
   */

  static strToU8(str: string, latin1?: boolean): Uint8Array {
    if (latin1) {
      const ar = new Uint8Array(str.length)
      for (let i = 0; i < str.length; ++i) {
        ar[i] = str.charCodeAt(i)
      }
      return ar
    }
    const l = str.length
    // TODO: strToU8 and strFromU8 both define slc
    // typed array slice - allows garbage collector to free original reference,
    // while being more compatible than .slice
    const slc = (v: Uint8Array, s: number, e?: number): Uint8Array => {
      if (s == null || s < 0) {
        s = 0
      }
      if (e == null || e > v.length) {
        e = v.length
      }
      // can't use .constructor in case user-supplied
      return new Uint8Array(v.subarray(s, e))
    }
    let ar = new Uint8Array(str.length + (str.length >> 1))
    let ai = 0
    const w = (v: number): void => {
      ar[ai++] = v
    }
    for (let i = 0; i < l; ++i) {
      if (ai + 5 > ar.length) {
        const n = new Uint8Array(ai + 8 + ((l - i) << 1))
        n.set(ar)
        ar = n
      }
      let c = str.charCodeAt(i)
      if (c < 128 || latin1) {
        w(c)
      } else if (c < 2048) {
        w(192 | (c >> 6))
        w(128 | (c & 63))
      } else if (c > 55295 && c < 57344) {
        c = (65536 + (c & (1023 << 10))) | (str.charCodeAt(++i) & 1023)
        w(240 | (c >> 18))
        w(128 | ((c >> 12) & 63))
        w(128 | ((c >> 6) & 63))
        w(128 | (c & 63))
      } else {
        c = (65536 + (c & (1023 << 10))) | (str.charCodeAt(++i) & 1023)
        w(240 | (c >> 18))
        w(128 | ((c >> 12) & 63))
        w(128 | ((c >> 6) & 63))
        w(128 | (c & 63))
      }
    }
    return slc(ar, 0, ai)
  }

  static async compress(data: Uint8Array, format: CompressionFormat = 'gzip'): Promise<ArrayBuffer> {
    // mimics fflate, use 'deflate-raw' 'deflate' or 'gzip' if needed
    // const format = 'deflate-raw'
    const stream = new CompressionStream(format)
    const writer = stream.writable.getWriter()

    writer.write(data).catch(console.error) // Do not await this
    const closePromise = writer.close().catch(console.error)

    const response = new Response(stream.readable)
    const result = await response.arrayBuffer()

    await closePromise // Ensure close happens eventually
    return result
  }

  static async compressStringToArrayBuffer(input: string): Promise<ArrayBuffer> {
    const uint8Array = this.strToU8(input)
    return await this.compress(uint8Array)
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

  /**
   * Converts a Uint8Array to a string (101arrowz/fflate: MIT License)
   * @param dat The data to decode to string
   * @param latin1 Whether or not to interpret the data as Latin-1. This should
   *               not need to be true unless encoding to binary string.
   * @returns The original UTF-8/Latin-1 string
   */
  static strFromU8(dat: Uint8Array, latin1?: boolean): string {
    if (latin1) {
      let r = ''
      for (let i = 0; i < dat.length; i += 16384) {
        r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384))
      }
      return r
    } else {
      // typed array slice - allows garbage collector to free original reference,
      // while being more compatible than .slice
      const slc = (v: Uint8Array, s: number, e?: number): Uint8Array => {
        if (s == null || s < 0) {
          s = 0
        }
        if (e == null || e > v.length) {
          e = v.length
        }
        // can't use .constructor in case user-supplied
        return new Uint8Array(v.subarray(s, e))
      }
      // decode UTF8
      const dutf8 = (d: Uint8Array): { s: string; r: Uint8Array } => {
        for (let r = '', i = 0; ; ) {
          let c = d[i++]
          const eb =
            ((c > 127) as unknown as number) + ((c > 223) as unknown as number) + ((c > 239) as unknown as number)
          if (i + eb > d.length) {
            return { s: r, r: slc(d, i - 1) }
          }
          if (!eb) {
            r += String.fromCharCode(c)
          } else if (eb === 3) {
            c = (((c & 15) << 18) | ((d[i++] & 63) << 12) | ((d[i++] & 63) << 6) | (d[i++] & 63)) - 65536
            r += String.fromCharCode(55296 | (c >> 10), 56320 | (c & 1023))
          } else if (eb & 1) {
            r += String.fromCharCode(((c & 31) << 6) | (d[i++] & 63))
          } else {
            r += String.fromCharCode(((c & 15) << 12) | ((d[i++] & 63) << 6) | (d[i++] & 63))
          }
        }
      }
      const { s, r } = dutf8(dat)
      if (r.length) {
        throw new Error('Unexpected trailing bytes in UTF-8 decoding')
      }
      return s
    }
  }

  static async decompressArrayBuffer(buffer: ArrayBuffer): Promise<string> {
    const decompressed = await this.decompress(new Uint8Array(buffer))
    return this.strFromU8(decompressed)
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
    // convert spherical AZIMUTH,ELEVATION,RANGE to Cartesian
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
