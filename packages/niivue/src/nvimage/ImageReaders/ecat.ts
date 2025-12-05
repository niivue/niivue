import { NIFTI1 } from 'nifti-reader-js'
import { log } from '@/logger'
import type { NVImage } from '@/nvimage'
import { NiiDataType } from '@/nvimage/utils'

/**
 * Reads ECAT7 PET format image, modifying the provided NVImage header
 * and returning the raw image data buffer.
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the ECAT file data.
 * @returns ArrayBuffer containing the image data.
 * @throws Error if the file is not a valid ECAT file.
 */
export function readECAT(nvImage: NVImage, buffer: ArrayBuffer): ArrayBuffer {
    nvImage.hdr = new NIFTI1()
    const hdr = nvImage.hdr
    hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    const reader = new DataView(buffer)

    const signature = reader.getInt32(0, false) // "MATR"
    const filetype = reader.getInt16(50, false)
    if (signature !== 1296127058 || filetype < 1 || filetype > 14) {
        throw new Error('Not a valid ECAT file')
    }
    // list header, starts at 512 bytes: int32_t hdr[4], r[31][4];
    let pos = 512 // 512=main header, 4*32-bit hdr
    let vols = 0
    const frame_duration = []
    let rawImg = new Float32Array()
    while (true) {
        // read 512 block lists
        const hdr0 = reader.getInt32(pos, false)
        const hdr3 = reader.getInt32(pos + 12, false)
        if (hdr0 + hdr3 !== 31) {
            break
        }
        let lpos = pos + 20 // skip hdr and read slice offset (r[0][1])
        let r = 0
        let voloffset = 0
        while (r < 31) {
            // r[0][1]...r[30][1]
            voloffset = reader.getInt32(lpos, false)
            lpos += 16 // e.g. r[0][1] to r[1][1]
            if (voloffset === 0) {
                break
            }
            r++
            let ipos = voloffset * 512 // image start position
            const spos = ipos - 512 // subheader for matrix image, immediately before image
            const data_type = reader.getUint16(spos, false)
            hdr.dims[1] = reader.getUint16(spos + 4, false)
            hdr.dims[2] = reader.getUint16(spos + 6, false)
            hdr.dims[3] = reader.getUint16(spos + 8, false)
            const scale_factor = reader.getFloat32(spos + 26, false)
            hdr.pixDims[1] = reader.getFloat32(spos + 34, false) * 10.0 // cm -> mm
            hdr.pixDims[2] = reader.getFloat32(spos + 38, false) * 10.0 // cm -> mm
            hdr.pixDims[3] = reader.getFloat32(spos + 42, false) * 10.0 // cm -> mm
            hdr.pixDims[4] = reader.getUint32(spos + 46, false) / 1000.0 // ms -> sec
            frame_duration.push(hdr.pixDims[4])
            const nvox3D = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
            const newImg = new Float32Array(nvox3D) // convert to float32 as scale varies
            if (data_type === 1) {
                // uint8
                for (let i = 0; i < nvox3D; i++) {
                    newImg[i] = reader.getUint8(ipos) * scale_factor
                    ipos++
                }
            } else if (data_type === 6) {
                // uint16
                for (let i = 0; i < nvox3D; i++) {
                    newImg[i] = reader.getUint16(ipos, false) * scale_factor
                    ipos += 2
                }
            } else if (data_type === 7) {
                // uint32
                for (let i = 0; i < nvox3D; i++) {
                    newImg[i] = reader.getUint32(ipos, false) * scale_factor
                    ipos += 4
                }
            } else {
                log.warn('Unknown ECAT data type ' + data_type)
            }
            const prevImg = rawImg.slice(0)
            rawImg = new Float32Array(prevImg.length + newImg.length)
            rawImg.set(prevImg)
            rawImg.set(newImg, prevImg.length)
            vols++
        }
        if (voloffset === 0) {
            break
        }
        pos += 512 // possible to have multiple 512-byte lists of images
    }
    hdr.dims[4] = vols
    hdr.pixDims[4] = frame_duration[0]
    if (vols > 1) {
        hdr.dims[0] = 4
        let isFDvaries = false
        for (let i = 0; i < vols; i++) {
            if (frame_duration[i] !== frame_duration[0]) {
                isFDvaries = true
            }
        }
        if (isFDvaries) {
            log.warn('Frame durations vary')
        }
    }
    hdr.sform_code = 1
    hdr.affine = [
        [-hdr.pixDims[1], 0, 0, (hdr.dims[1] - 2) * 0.5 * hdr.pixDims[1]],
        [0, -hdr.pixDims[2], 0, (hdr.dims[2] - 2) * 0.5 * hdr.pixDims[2]],
        [0, 0, -hdr.pixDims[3], (hdr.dims[3] - 2) * 0.5 * hdr.pixDims[3]],
        [0, 0, 0, 1]
    ]
    hdr.numBitsPerVoxel = 32
    hdr.datatypeCode = NiiDataType.DT_FLOAT32
    return rawImg.buffer as ArrayBuffer
}
