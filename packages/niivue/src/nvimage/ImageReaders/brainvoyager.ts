import { NIFTI1 } from 'nifti-reader-js'
import { log } from '@/logger'
import type { NVImage } from '@/nvimage'
import { NiiDataType } from '@/nvimage/utils'

/**
 * Reads BrainVoyager V16 format image, modifying the provided NVImage header
 * and returning the raw image data buffer.
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the V16 file data.
 * @returns ArrayBuffer containing the image data.
 */
export function readV16(nvImage: NVImage, buffer: ArrayBuffer): ArrayBuffer {
    nvImage.hdr = new NIFTI1()
    const hdr = nvImage.hdr
    hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    const reader = new DataView(buffer)
    hdr.dims[1] = reader.getUint16(0, true)
    hdr.dims[2] = reader.getUint16(2, true)
    hdr.dims[3] = reader.getUint16(4, true)
    const nBytes = 2 * hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
    if (nBytes + 6 !== buffer.byteLength) {
        log.warn('This does not look like a valid BrainVoyager V16 file')
    }
    hdr.numBitsPerVoxel = 16
    hdr.datatypeCode = NiiDataType.DT_UINT16
    log.warn('Warning: V16 files have no spatial transforms')
    hdr.affine = [
        [0, 0, -hdr.pixDims[1], (hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
        [-hdr.pixDims[2], 0, 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
        [0, -hdr.pixDims[3], 0, (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
        [0, 0, 0, 1]
    ]
    hdr.littleEndian = true
    return buffer.slice(6)
}

/**
 * Reads BrainVoyager VMR format image, modifying the provided NVImage header
 * and returning the raw image data buffer.
 *
 * Format specification:
 * https://support.brainvoyager.com/brainvoyager/automation-development/84-file-formats/343-developer-guide-2-6-the-format-of-vmr-files
 *
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the VMR file data.
 * @returns ArrayBuffer containing the image data.
 */
export function readVMR(nvImage: NVImage, buffer: ArrayBuffer): ArrayBuffer {
    nvImage.hdr = new NIFTI1()
    const hdr = nvImage.hdr
    hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    const reader = new DataView(buffer)
    const version = reader.getUint16(0, true)
    if (version !== 4) {
        log.warn('Not a valid version 4 VMR image')
    }
    hdr.dims[1] = reader.getUint16(2, true)
    hdr.dims[2] = reader.getUint16(4, true)
    hdr.dims[3] = reader.getUint16(6, true)
    const nBytes = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
    if (version >= 4) {
        let pos = 8 + nBytes // offset to post header
        // let xoff = reader.getUint16(pos, true);
        // let yoff = reader.getUint16(pos + 2, true);
        // let zoff = reader.getUint16(pos + 4, true);
        // let framingCube = reader.getUint16(pos + 6, true);
        // let posInfo = reader.getUint32(pos + 8, true);
        // let coordSys = reader.getUint32(pos + 12, true);
        // let XmmStart = reader.getFloat32(pos + 16, true);
        // let YmmStart = reader.getFloat32(pos + 20, true);
        // let ZmmStart = reader.getFloat32(pos + 24, true);
        // let XmmEnd = reader.getFloat32(pos + 28, true);
        // let YmmEnd = reader.getFloat32(pos + 32, true);
        // let ZmmEnd = reader.getFloat32(pos + 36, true);
        // let Xsl = reader.getFloat32(pos + 40, true);
        // let Ysl = reader.getFloat32(pos + 44, true);
        // let Zsl = reader.getFloat32(pos + 48, true);
        // let colDirX = reader.getFloat32(pos + 52, true);
        // let colDirY = reader.getFloat32(pos + 56, true);
        // let colDirZ = reader.getFloat32(pos + 60, true);
        // let nRow = reader.getUint32(pos + 64, true);
        // let nCol = reader.getUint32(pos + 68, true);
        // let FOVrow = reader.getFloat32(pos + 72, true);
        // let FOVcol = reader.getFloat32(pos + 76, true);
        // let sliceThickness = reader.getFloat32(pos + 80, true);
        // let gapThickness = reader.getFloat32(pos + 84, true);
        const nSpatialTransforms = reader.getUint32(pos + 88, true)
        pos = pos + 92
        if (nSpatialTransforms > 0) {
            const len = buffer.byteLength
            for (let i = 0; i < nSpatialTransforms; i++) {
                // read variable length name name...
                while (pos < len && reader.getUint8(pos) !== 0) {
                    pos++
                }
                pos++
                // let typ = reader.getUint32(pos, true);
                pos += 4
                // read variable length name name...
                while (pos < len && reader.getUint8(pos) !== 0) {
                    pos++
                }
                pos++
                const nValues = reader.getUint32(pos, true)
                pos += 4
                for (let j = 0; j < nValues; j++) {
                    pos += 4
                }
            }
        }
        // let LRconv = reader.getUint8(pos);
        // let ref = reader.getUint8(pos + 1);
        hdr.pixDims[1] = reader.getFloat32(pos + 2, true)
        hdr.pixDims[2] = reader.getFloat32(pos + 6, true)
        hdr.pixDims[3] = reader.getFloat32(pos + 10, true)
        // let isVer = reader.getUint8(pos + 14);
        // let isTal = reader.getUint8(pos + 15);
        // let minInten = reader.getInt32(pos + 16, true);
        // let meanInten = reader.getInt32(pos + 20, true);
        // let maxInten = reader.getInt32(pos + 24, true);
    }
    log.warn('Warning: VMR spatial transform not implemented')
    // if (XmmStart === XmmEnd) { // https://brainvoyager.com/bv/sampledata/index.html??
    hdr.affine = [
        [0, 0, -hdr.pixDims[1], (hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
        [-hdr.pixDims[2], 0, 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
        [0, -hdr.pixDims[3], 0, (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
        [0, 0, 0, 1]
    ]
    // }
    log.debug(hdr)
    hdr.numBitsPerVoxel = 8
    hdr.datatypeCode = NiiDataType.DT_UINT8
    return buffer.slice(8, 8 + nBytes)
}
