import { NIFTI1 } from 'nifti-reader-js'
import type { NVImage } from '@/nvimage'
import { Zip } from '@/nvutilities'

/**
 * Helper function to determine byte size per element from numpy dtype string.
 * @param dtype - NumPy dtype string (e.g., '<f4', '<i2', '|b1')
 * @returns Byte size of the data type
 */
function getTypeSize(dtype: string): number {
    const typeMap: Record<string, number> = {
        '|b1': 1, // Boolean
        '<i1': 1, // Int8
        '<u1': 1, // UInt8
        '<i2': 2, // Int16
        '<u2': 2, // UInt16
        '<i4': 4, // Int32
        '<u4': 4, // UInt32
        '<f4': 4, // Float32
        '<f8': 8 // Float64
    }
    return typeMap[dtype] ?? 1
}

/**
 * Helper function to determine NIfTI datatype code from numpy dtype string.
 * @param dtype - NumPy dtype string (e.g., '<f4', '<i2', '|b1')
 * @returns NIfTI datatype code
 */
function getDataTypeCode(dtype: string): number {
    const typeMap: Record<string, number> = {
        '|b1': 2, // DT_BINARY
        '<i1': 256, // DT_INT8
        '<u1': 2, // DT_UINT8
        '<i2': 4, // DT_INT16
        '<u2': 512, // DT_UINT16
        '<i4': 8, // DT_INT32
        '<u4': 768, // DT_UINT32
        '<f4': 16, // DT_FLOAT32
        '<f8': 64 // DT_FLOAT64
    }
    return typeMap[dtype] ?? 16 // Default to FLOAT32
}

/**
 * Reads NumPy NPY format file, modifying the provided NVImage header
 * and returning the raw image data buffer.
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the NPY file data.
 * @returns Promise resolving to ArrayBuffer containing the image data.
 * @throws Error if the file is not a valid NPY file.
 */
export async function readNPY(nvImage: NVImage, buffer: ArrayBuffer): Promise<ArrayBuffer> {
    const dv = new DataView(buffer)
    // Verify magic number
    const magicBytes = [dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3), dv.getUint8(4), dv.getUint8(5)]

    // Expected magic number: [0x93, 0x4E, 0x55, 0x4D, 0x50, 0x59] ('\x93NUMPY')
    const expectedMagic = [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59]

    if (!magicBytes.every((byte, i) => byte === expectedMagic[i])) {
        throw new Error('Not a valid NPY file: Magic number mismatch')
    }

    // Extract version and header length
    // const _version = dv.getUint8(6)
    // const _minorVersion = dv.getUint8(7)
    const headerLen = dv.getUint16(8, true) // Little-endian
    // Decode header as ASCII string
    const headerText = new TextDecoder('utf-8').decode(buffer.slice(10, 10 + headerLen))

    // Extract shape from header
    const shapeMatch = headerText.match(/'shape': \((.*?)\)/)
    if (!shapeMatch) {
        throw new Error('Invalid NPY header: Shape not found')
    }
    const shape = shapeMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '')
        .map(Number)

    // Determine data type (assumes '|b1' (bool), '<f4' (float32), etc.)
    const dtypeMatch = headerText.match(/'descr': '([^']+)'/)
    if (!dtypeMatch) {
        throw new Error('Invalid NPY header: Data type not found')
    }
    const dtype = dtypeMatch[1]
    // Compute number of elements
    const numElements = shape.reduce((a, b) => a * b, 1)
    // Extract data start position
    const dataStart = 10 + headerLen
    // Read data as an ArrayBuffer
    const dataBuffer = buffer.slice(dataStart, dataStart + numElements * getTypeSize(dtype))
    // Interpret as 2D/3D data
    const width = shape.length > 0 ? shape[shape.length - 1] : 1
    const height = shape.length > 1 ? shape[shape.length - 2] : 1
    const slices = shape.length > 2 ? shape[shape.length - 3] : 1
    // Create NIFTI header
    nvImage.hdr = new NIFTI1()
    const hdr = nvImage.hdr
    hdr.dims = [3, width, height, slices, 0, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    hdr.affine = [
        [hdr.pixDims[1], 0, 0, -(hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
        [0, -hdr.pixDims[2], 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
        [0, 0, -hdr.pixDims[3], (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
        [0, 0, 0, 1]
    ]
    hdr.numBitsPerVoxel = getTypeSize(dtype) * 8
    hdr.datatypeCode = getDataTypeCode(dtype)
    return dataBuffer
}

/**
 * Reads NumPy NPZ format file (zipped NPY arrays), modifying the provided
 * NVImage header and returning the raw image data buffer.
 *
 * Note: Currently only reads the first NPY file found in the archive.
 * TODO: Support reading multiple NPY images from a single NPZ file.
 *
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the NPZ file data.
 * @returns Promise resolving to ArrayBuffer containing the image data.
 */
export async function readNPZ(nvImage: NVImage, buffer: ArrayBuffer): Promise<ArrayBuffer | undefined> {
    // todo: a single NPZ file can contain multiple NPY images
    const zip = new Zip(buffer)
    for (let i = 0; i < zip.entries.length; i++) {
        const entry = zip.entries[i]
        if (entry.fileName.toLowerCase().endsWith('.npy')) {
            const data = await entry.extract()
            return await readNPY(nvImage, data.buffer as ArrayBuffer)
        }
    }
}
