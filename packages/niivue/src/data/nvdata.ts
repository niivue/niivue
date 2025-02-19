/**
 * Enum for supported image types (e.g. NII, NRRD, DICOM)
 */
export enum DataFileType {
  UNKNOWN = 0,
  NII = 1,
  DCM = 2,
  DCM_MANIFEST = 3,
  MIH = 4,
  MIF = 5,
  NHDR = 6,
  NRRD = 7,
  MHD = 8,
  MHA = 9,
  MGH = 10,
  MGZ = 11,
  V = 12,
  V16 = 13,
  VMR = 14,
  HEAD = 15,
  DCM_FOLDER = 16,
  SRC = 17,
  FIB = 18
}
export class NVData<T> {
  data: T

  constructor(data: T) {
    this.data = data
  }

  /* protected parse(buffer: ArrayBuffer): T {
    throw new Error('parse must be implemented in a subclass')
  } */

  /** Reads a file as an ArrayBuffer, with gzip decompression if necessary */
  static async readFile(file: File): Promise<ArrayBuffer> {
    const buffer = await file.arrayBuffer()

    // Check if the file is gzipped (magic bytes: 1F 8B)
    const isGzipped =
      buffer.byteLength > 2 && new Uint8Array(buffer, 0, 2)[0] === 0x1f && new Uint8Array(buffer, 0, 2)[1] === 0x8b

    if (!isGzipped) {
      return buffer
    }

    console.log(`Decompressing file: ${file.name}`)
    return NVData.decompressGzip(buffer)
  }

  /** Fetches a binary file from a URL, decompressing if necessary */
  static async fetchBinary(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url, {
      headers: { 'Accept-Encoding': 'gzip, deflate' }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }

    const isGzipped = response.headers.get('Content-Encoding') === 'gzip'

    const buffer = await response.arrayBuffer()
    return isGzipped ? NVData.decompressGzip(buffer) : buffer
  }

  /** Decompress a gzipped ArrayBuffer using the Compression Streams API */
  static async decompressGzip(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    const compressedStream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))
    const decompressedBlob = await new Response(compressedStream).blob()
    return decompressedBlob.arrayBuffer()
  }
}
