import { NIFTI1 } from 'nifti-reader-js'
import type { NVImage } from '@/nvimage'
import { Zip } from '@/nvutilities'

/**
 * Helper function to determine byte size per element from numpy dtype string.
 * @param dtype - NumPy dtype string (e.g., '<f4', '<i2', '|b1')
 * @returns Byte size of the data type
 */
function getTypeSize(dtype: string): number {
    if (dtype.length < 2) {
        throw new Error(`Invalid NPY dtype: ${dtype}`)
    }

    const dtypeWithoutEndian = dtype.slice(1)
    const sizeMap: Record<string, number> = {
        b1: 1, // Boolean
        i1: 1, // Int8
        u1: 1, // UInt8
        i2: 2, // Int16
        u2: 2, // UInt16
        i4: 4, // Int32
        u4: 4, // UInt32
        f4: 4, // Float32
        f8: 8 // Float64
    }

    const typeSize = sizeMap[dtypeWithoutEndian]

    if (typeSize === undefined) {
        throw new Error(`Unsupported NPY dtype: ${dtype}`)
    }

    return typeSize
}

/**
 * Helper function to determine NIfTI datatype code from numpy dtype string.
 * @param dtype - NumPy dtype string (e.g., '<f4', '<i2', '|b1')
 * @returns NIfTI datatype code
 */
function getDataTypeCode(dtype: string): number {
    if (dtype.length < 2) {
        throw new Error(`Invalid NPY dtype: ${dtype}`)
    }
    const dtypeWithoutEndian = dtype.slice(1)

    const typeMap: Record<string, number> = {
        b1: 2, // DT_BINARY / uint8-compatible
        i1: 256, // DT_INT8
        u1: 2, // DT_UINT8
        i2: 4, // DT_INT16
        u2: 512, // DT_UINT16
        i4: 8, // DT_INT32
        u4: 768, // DT_UINT32
        f4: 16, // DT_FLOAT32
        f8: 64 // DT_FLOAT64
    }

    const datatypeCode = typeMap[dtypeWithoutEndian]

    if (datatypeCode === undefined) {
        throw new Error(`Unsupported NPY dtype: ${dtype}`)
    }

    return datatypeCode
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
    // offset   size        meaning
    // ------   ---------   -------------------------------
    // 0        6 bytes     magic string: \x93NUMPY
    // 6        1 byte      major version
    // 7        1 byte      minor version
    // 8        2 or 4      header length, little-endian
    // 10/12    header_len  header data
    // ...      ...         array data

    const dv = new DataView(buffer)

    // Verify magic number (first 6 bytes should be: 0x93, 'N', 'U', 'M', 'P', 'Y')
    const magicBytes = [dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3), dv.getUint8(4), dv.getUint8(5)]
    const expectedMagic = [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59]
    if (!magicBytes.every((byte, i) => byte === expectedMagic[i])) {
        throw new Error('Not a valid NPY file: Magic number mismatch')
    }

    const majorVersionByte = dv.getUint8(6)
    const minorVersionByte = dv.getUint8(7)

    let headerLen: number
    let headerStart: number
    let headerEncoding: string

    if (majorVersionByte === 1) {
        // Version 1.0: header length is a 2-byte little-endian unsigned short
        headerLen = dv.getUint16(8, true)
        headerStart = 10
        headerEncoding = 'latin1'
    } else if (majorVersionByte === 2 || majorVersionByte === 3) {
        // Version 2.0 and 3.0: header length is a 4-byte little-endian unsigned int
        headerLen = dv.getUint32(8, true)
        headerStart = 12
        headerEncoding = majorVersionByte === 3 ? 'utf-8' : 'latin1'
    } else {
        throw new Error(`Unsupported NPY version: ${majorVersionByte}.${minorVersionByte}`)
    }

    // check that header fits within the buffer
    const dataStart = headerStart + headerLen
    if (dataStart > buffer.byteLength) {
        throw new Error('Invalid NPY file: Header length exceeds buffer size')
    }

    // Parse header text to extract shape and data type information
    const headerText = new TextDecoder(headerEncoding).decode(buffer.slice(headerStart, dataStart))

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

    // validate shape values
    if (shape.length === 0 || shape.some((value) => !Number.isInteger(value) || value <= 0)) {
        throw new Error(`Invalid NPY header: invalid shape (${shapeMatch[1]})`)
    }

    if (shape.length < 2 || shape.length > 4) {
        throw new Error(`Unsupported NPY shape: expected 2D, 3D, or 4D array, got (${shape.join(', ')})`)
    }

    // Determine data type (assumes '|b1' (bool), '<f4' (float32), etc.)
    const dtypeMatch = headerText.match(/'descr': '([^']+)'/)
    if (!dtypeMatch) {
        throw new Error('Invalid NPY header: Data type not found')
    }
    const dtype = dtypeMatch[1]
    const endianPrefix = dtype[0]
    const isHostLittleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1

    if (!['<', '>', '|', '='].includes(endianPrefix)) {
        throw new Error(`Invalid NPY dtype endian prefix: ${dtype}`)
    }

    // Compute number of elements
    const numElements = shape.reduce((a, b) => a * b, 1)

    // Read data as an ArrayBuffer

    const bytesPerElement = getTypeSize(dtype)
    const expectedBytes = numElements * bytesPerElement
    const availableBytes = buffer.byteLength - dataStart
    if (availableBytes < expectedBytes) {
        throw new Error('Invalid .npy file: not enough data bytes for specified shape and data type')
    }

    const dataBuffer = buffer.slice(dataStart, dataStart + expectedBytes)

    const niftiDimCount = shape.length
    const width = shape[shape.length - 1]
    const height = shape[shape.length - 2]
    const slices = shape.length >= 3 ? shape[shape.length - 3] : 1
    const timepoints = shape.length === 4 ? shape[0] : 1

    // create & set up the dummy NIFTI header
    nvImage.hdr = new NIFTI1()
    const hdr = nvImage.hdr

    hdr.dims = [niftiDimCount, width, height, slices, timepoints, 1, 1, 1]
    hdr.pixDims = [1, 1, 1, 1, 1, 1, 1, 1]
    hdr.affine = [
        [hdr.pixDims[1], 0, 0, -(hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
        [0, -hdr.pixDims[2], 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
        [0, 0, -hdr.pixDims[3], (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
        [0, 0, 0, 1]
    ]
    hdr.numBitsPerVoxel = bytesPerElement * 8
    hdr.datatypeCode = getDataTypeCode(dtype)
    // Tell downstream NIfTI processing whether the raw NPY payload is little-endian.
    hdr.littleEndian = endianPrefix === '<' || endianPrefix === '|' || (endianPrefix === '=' && isHostLittleEndian)

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

            const npyBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
            return await readNPY(nvImage, npyBuffer)
        }
    }
}
