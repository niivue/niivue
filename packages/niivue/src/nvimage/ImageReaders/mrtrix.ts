import { NIFTI1 } from 'nifti-reader-js'
import { log } from '@/logger'
import type { NVImage } from '@/nvimage'
import { NiiDataType } from '@/nvimage/utils'
import { NVUtilities } from '@/nvutilities'

/**
 * Reads MRtrix MIF format image, modifying the provided NVImage header
 * and returning the raw image data buffer.
 *
 * MIF files typically contain 3D (anatomical) or 4D (fMRI, DWI) data.
 * 5D data is rarely seen. This reader supports up to 5D.
 *
 * Format specification: https://mrtrix.readthedocs.io/en/latest/
 *
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the MIF file data.
 * @param pairedImgData - Optional paired image data for detached MIH headers.
 * @returns Promise resolving to ArrayBuffer containing the image data.
 * @throws Error if the file is not a valid MIF file.
 */
export async function readMIF(nvImage: NVImage, buffer: ArrayBuffer, pairedImgData: ArrayBuffer | null): Promise<ArrayBuffer> {
    // MIF files typically 3D (e.g. anatomical), 4D (fMRI, DWI). 5D rarely seen
    // This read currently supports up to 5D. To create test: "mrcat -axis 4 a4d.mif b4d.mif out5d.mif"
    nvImage.hdr = new NIFTI1()
    const hdr = nvImage.hdr
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    hdr.dims = [1, 1, 1, 1, 1, 1, 1, 1]
    let len = buffer.byteLength
    if (len < 20) {
        throw new Error('File too small to be MIF: bytes = ' + len)
    }
    let bytes = new Uint8Array(buffer)
    if (bytes[0] === 31 && bytes[1] === 139) {
        log.debug('MIF with GZ decompression')
        buffer = await NVUtilities.decompressToBuffer(new Uint8Array(buffer))
        len = buffer.byteLength
        bytes = new Uint8Array(buffer)
    }
    let pos = 0
    function readStr(): string {
        while (pos < len && bytes[pos] === 10) {
            pos++
        } // skip blank lines
        const startPos = pos
        while (pos < len && bytes[pos] !== 10) {
            pos++
        }
        pos++ // skip EOLN
        if (pos - startPos < 1) {
            return ''
        }
        return new TextDecoder().decode(buffer.slice(startPos, pos - 1))
    }
    let line = readStr() // 1st line: signature 'mrtrix tracks'
    if (!line.startsWith('mrtrix image')) {
        throw new Error('Not a valid MIF file')
    }
    const layout = []
    let isBit = false
    let nTransform = 0
    let TR = 0
    let isDetached = false
    // let isTensor = false
    line = readStr()
    while (pos < len && !line.startsWith('END')) {
        let items = line.split(':') // "vox: 1,1,1" -> "vox", " 1,1,1"
        line = readStr()
        if (items.length < 2) {
            break
        } //
        const tag = items[0] // "datatype", "dim"
        items = items[1].split(',') // " 1,1,1" -> " 1", "1", "1"
        for (let i = 0; i < items.length; i++) {
            items[i] = items[i].trim()
        } // " 1", "1", "1" -> "1", "1", "1"
        switch (tag) {
            case 'dim':
                hdr.dims[0] = items.length
                for (let i = 0; i < items.length; i++) {
                    hdr.dims[i + 1] = parseInt(items[i])
                }
                break
            case 'vox':
                for (let i = 0; i < items.length; i++) {
                    hdr.pixDims[i + 1] = parseFloat(items[i])
                    if (isNaN(hdr.pixDims[i + 1])) {
                        hdr.pixDims[i + 1] = 0.0
                    }
                }
                break
            case 'layout':
                for (let i = 0; i < items.length; i++) {
                    layout.push(parseInt(items[i]))
                } // n.b. JavaScript preserves sign for -0
                break
            case 'datatype':
                {
                    const dt = items[0]
                    if (dt.startsWith('Bit')) {
                        isBit = true
                        hdr.datatypeCode = NiiDataType.DT_UINT8
                    } else if (dt.startsWith('Int8')) {
                        hdr.datatypeCode = NiiDataType.DT_INT8
                    } else if (dt.startsWith('UInt8')) {
                        hdr.datatypeCode = NiiDataType.DT_UINT8
                    } else if (dt.startsWith('Int16')) {
                        hdr.datatypeCode = NiiDataType.DT_INT16
                    } else if (dt.startsWith('UInt16')) {
                        hdr.datatypeCode = NiiDataType.DT_UINT16
                    } else if (dt.startsWith('Int32')) {
                        hdr.datatypeCode = NiiDataType.DT_INT32
                    } else if (dt.startsWith('UInt32')) {
                        hdr.datatypeCode = NiiDataType.DT_UINT32
                    } else if (dt.startsWith('Float32')) {
                        hdr.datatypeCode = NiiDataType.DT_FLOAT32
                    } else if (dt.startsWith('Float64')) {
                        hdr.datatypeCode = NiiDataType.DT_FLOAT64
                    } else {
                        log.warn('Unsupported datatype ' + dt)
                    }
                    if (dt.includes('8')) {
                        hdr.numBitsPerVoxel = 8
                    } else if (dt.includes('16')) {
                        hdr.numBitsPerVoxel = 16
                    } else if (dt.includes('32')) {
                        hdr.numBitsPerVoxel = 32
                    } else if (dt.includes('64')) {
                        hdr.numBitsPerVoxel = 64
                    }
                    hdr.littleEndian = true // native, to do support big endian readers
                    if (dt.endsWith('LE')) {
                        hdr.littleEndian = true
                    }
                    if (dt.endsWith('BE')) {
                        hdr.littleEndian = false
                    }
                }
                break
            case 'transform':
                if (nTransform > 2 || items.length !== 4) {
                    break
                }
                hdr.affine[nTransform][0] = parseFloat(items[0])
                hdr.affine[nTransform][1] = parseFloat(items[1])
                hdr.affine[nTransform][2] = parseFloat(items[2])
                hdr.affine[nTransform][3] = parseFloat(items[3])
                nTransform++
                break
            case 'comments':
                hdr.description = items[0].substring(0, Math.min(79, items[0].length))
                break
            /* case 'command_history':
        if (items[0].startsWith('dwi2tensor')) {
          isTensor = true
        }
        break */
            case 'RepetitionTime':
                TR = parseFloat(items[0])
                break
            case 'file':
                isDetached = !items[0].startsWith('. ')
                if (!isDetached) {
                    items = items[0].split(' ') // ". 2336" -> ". ", "2336"
                    hdr.vox_offset = parseInt(items[1])
                }
                break
        }
    }
    const ndim = hdr.dims[0]
    if (ndim > 5) {
        log.warn('reader only designed for a maximum of 5 dimensions (XYZTD)')
    }
    let nvox = 1
    for (let i = 0; i < ndim; i++) {
        nvox *= Math.max(hdr.dims[i + 1], 1)
    }
    // let nvox = hdr.dims[1] * hdr.dims[2] * hdr.dims[3] * hdr.dims[4];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            // hdr.affine[i][j] *= hdr.pixDims[i + 1];
            hdr.affine[i][j] *= hdr.pixDims[j + 1]
        }
    }
    log.debug('mif affine:' + hdr.affine[0])
    if (TR > 0) {
        hdr.pixDims[4] = TR
    }
    if (isDetached && !pairedImgData) {
        log.warn('MIH header provided without paired image data')
    }
    let rawImg: ArrayBuffer
    if (pairedImgData && isDetached) {
        rawImg = pairedImgData.slice(0)
    } else if (isBit) {
        hdr.numBitsPerVoxel = 8
        const img8 = new Uint8Array(nvox)
        const buffer1 = buffer.slice(hdr.vox_offset, hdr.vox_offset + Math.ceil(nvox / 8))
        const img1 = new Uint8Array(buffer1)
        let j = 0
        for (let i = 0; i < nvox; i++) {
            const bit = i % 8
            img8[i] = (img1[j] >> (7 - bit)) & 1
            if (bit === 7) {
                j++
            }
        }
        rawImg = img8.buffer
    } else {
        // n.b. mrconvert can pad files? See dtitest_Siemens_SC 4_dti_nopf_x2_pitch
        rawImg = buffer.slice(hdr.vox_offset, hdr.vox_offset + nvox * (hdr.numBitsPerVoxel / 8))
    }
    if (layout.length !== hdr.dims[0]) {
        log.warn('dims does not match layout')
    }
    // estimate strides:
    let stride = 1
    const instride = [1, 1, 1, 1, 1]
    const inflip = [false, false, false, false, false]
    for (let i = 0; i < layout.length; i++) {
        for (let j = 0; j < layout.length; j++) {
            const a = Math.abs(layout[j])
            if (a !== i) {
                continue
            }
            instride[j] = stride
            // detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
            if (layout[j] < 0 || Object.is(layout[j], -0)) {
                inflip[j] = true
            }
            stride *= hdr.dims[j + 1]
        }
    }
    // lookup table for flips and stride offsets:
    let xlut = NVUtilities.range(0, hdr.dims[1] - 1, 1)
    if (inflip[0]) {
        xlut = NVUtilities.range(hdr.dims[1] - 1, 0, -1)
    }
    for (let i = 0; i < hdr.dims[1]; i++) {
        xlut[i] *= instride[0]
    }
    let ylut = NVUtilities.range(0, hdr.dims[2] - 1, 1)
    if (inflip[1]) {
        ylut = NVUtilities.range(hdr.dims[2] - 1, 0, -1)
    }
    for (let i = 0; i < hdr.dims[2]; i++) {
        ylut[i] *= instride[1]
    }
    let zlut = NVUtilities.range(0, hdr.dims[3] - 1, 1)
    if (inflip[2]) {
        zlut = NVUtilities.range(hdr.dims[3] - 1, 0, -1)
    }
    for (let i = 0; i < hdr.dims[3]; i++) {
        zlut[i] *= instride[2]
    }
    let tlut = NVUtilities.range(0, hdr.dims[4] - 1, 1)
    if (inflip[3]) {
        tlut = NVUtilities.range(hdr.dims[4] - 1, 0, -1)
    }
    for (let i = 0; i < hdr.dims[4]; i++) {
        tlut[i] *= instride[3]
    }
    let dlut = NVUtilities.range(0, hdr.dims[5] - 1, 1)
    if (inflip[4]) {
        dlut = NVUtilities.range(hdr.dims[5] - 1, 0, -1)
    }
    for (let i = 0; i < hdr.dims[5]; i++) {
        dlut[i] *= instride[4]
    }
    // input and output arrays
    let j = 0
    let inVs: Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array
    let outVs: Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array
    switch (hdr.datatypeCode) {
        case NiiDataType.DT_INT8:
            inVs = new Int8Array(rawImg)
            outVs = new Int8Array(nvox)
            break
        case NiiDataType.DT_UINT8:
            inVs = new Uint8Array(rawImg)
            outVs = new Uint8Array(nvox)
            break
        case NiiDataType.DT_INT16:
            inVs = new Int16Array(rawImg)
            outVs = new Int16Array(nvox)
            break
        case NiiDataType.DT_UINT16:
            inVs = new Uint16Array(rawImg)
            outVs = new Uint16Array(nvox)
            break
        case NiiDataType.DT_INT32:
            inVs = new Int32Array(rawImg)
            outVs = new Int32Array(nvox)
            break
        case NiiDataType.DT_UINT32:
            inVs = new Uint32Array(rawImg)
            outVs = new Uint32Array(nvox)
            break
        case NiiDataType.DT_FLOAT32:
            inVs = new Float32Array(rawImg)
            outVs = new Float32Array(nvox)
            break
        case NiiDataType.DT_FLOAT64:
            inVs = new Float64Array(rawImg)
            outVs = new Float64Array(nvox)
            break
        default:
            throw new Error('unknown datatypeCode')
    }
    for (let d = 0; d < hdr.dims[5]; d++) {
        for (let t = 0; t < hdr.dims[4]; t++) {
            for (let z = 0; z < hdr.dims[3]; z++) {
                for (let y = 0; y < hdr.dims[2]; y++) {
                    for (let x = 0; x < hdr.dims[1]; x++) {
                        outVs[j] = inVs[xlut[x] + ylut[y] + zlut[z] + tlut[t] + dlut[d]]
                        j++
                    } // for x
                } // for y
            } // for z
        } // for t (time)
    } // for d (direction, phase/real, etc)
    return outVs.buffer as ArrayBuffer
}
