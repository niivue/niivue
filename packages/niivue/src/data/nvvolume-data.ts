import { NVData } from './nvdata.js'

export type TypedArray =
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array

export enum NVDataType {
  UINT8 = 2,
  INT16 = 4,
  UINT16 = 8,
  INT32 = 16,
  UINT32 = 32,
  INT64 = 64,
  FLOAT32 = 128,
  FLOAT64 = 256,
  RGB24 = 512,
  RGBA32 = 1024,
  INT8 = 2048,
  BINARY = 4096,
  COMPLEX64 = 8192
}

export class NVVolumeData extends NVData<ArrayBuffer> {
  volumeData: TypedArray
  dimensions: [number, number, number]

  constructor(buffer: ArrayBuffer, dimensions: [number, number, number], datatype: NVDataType) {
    const parsedData = NVVolumeData.convertToTypedArray(buffer, datatype)
    super(buffer) // Pass raw ArrayBuffer to base class

    this.volumeData = parsedData
    this.dimensions = dimensions
  }

  static convertToTypedArray(buffer: ArrayBuffer, datatype: NVDataType): TypedArray {
    switch (datatype) {
      case NVDataType.UINT8:
        return new Uint8Array(buffer)
      case NVDataType.INT16:
        return new Int16Array(buffer)
      case NVDataType.UINT16:
        return new Uint16Array(buffer)
      case NVDataType.INT32:
        return new Int32Array(buffer)
      case NVDataType.UINT32:
        return new Float64Array(new Uint32Array(buffer).map((v) => v)) // Convert to Float64
      case NVDataType.INT64: {
        const bigIntArray = new BigInt64Array(buffer)
        return new Float64Array(bigIntArray.length).map((_, i) => Number(bigIntArray[i])) // ✅ Convert safely
      }
      case NVDataType.FLOAT32:
        return new Float32Array(buffer)
      case NVDataType.FLOAT64:
        return new Float64Array(buffer)
      case NVDataType.RGB24:
      case NVDataType.RGBA32:
        return new Uint8Array(buffer) // Store as raw bytes
      case NVDataType.BINARY:
        return NVVolumeData.convertBinaryToUint8(new Uint8Array(buffer))
      case NVDataType.COMPLEX64:
        return NVVolumeData.convertComplexToFloat32(new Float32Array(buffer))
      case NVDataType.INT8:
        return new Int16Array(new Int8Array(buffer).map((v) => v)) // Convert Int8 to Int16
      default:
        throw new Error(`Unsupported datatype: ${datatype}`)
    }
  }

  static convertBinaryToUint8(imgRaw: Uint8Array): Uint8Array {
    const nvox = imgRaw.length * 8
    const binaryData = new Uint8Array(nvox)
    const lut = new Uint8Array(8).map((_, i) => 2 ** i)
    let i1 = -1
    for (let i = 0; i < nvox; i++) {
      const bit = i % 8
      if (bit === 0) {
        i1++
      }
      binaryData[i] = (imgRaw[i1] & lut[bit]) !== 0 ? 1 : 0
    }
    return binaryData
  }

  static convertComplexToFloat32(complexData: Float32Array): Float32Array {
    const nvx = Math.floor(complexData.length / 2)
    const realPart = new Float32Array(nvx)
    let r = 0
    for (let i = 0; i < nvx; i++) {
      realPart[i] = complexData[r]
      r += 2
    }
    return realPart
  }
}
