import { NIFTI1 } from 'nifti-reader-js'
import type { NVImage } from '@/nvimage'
import { NiiDataType } from '@/nvimage/utils'
import { NVUtilities } from '@/nvutilities'

/**
 * Reads DSI Studio FIB format (fiber orientation data), modifying the provided
 * NVImage header and returning the raw image data buffer and V1 vector data.
 *
 * Format specification:
 * https://dsi-studio.labsolver.org/doc/cli_data.html
 *
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the FIB file data.
 * @returns Promise resolving to [ArrayBuffer, Float32Array] - image data and V1 vectors.
 * @throws Error if the file is not a valid DSI Studio FIB file.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function readFIB(nvImage: NVImage, buffer: ArrayBuffer): Promise<[ArrayBuffer, Float32Array]> {
    nvImage.hdr = new NIFTI1()
    const hdr = nvImage.hdr
    hdr.littleEndian = false // MGH always big endian
    hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    const mat = await NVUtilities.readMatV4(buffer, true)
    if (!('dimension' in mat) || !('dti_fa' in mat)) {
        throw new Error('Not a valid DSIstudio FIB file')
    }
    const hasV1 = 'index0' in mat && 'index1' in mat && 'index2' in mat && 'odf_vertices' in mat
    // const hasV1 = false
    hdr.numBitsPerVoxel = 32
    hdr.datatypeCode = NiiDataType.DT_FLOAT32
    hdr.dims[1] = mat.dimension[0]
    hdr.dims[2] = mat.dimension[1]
    hdr.dims[3] = mat.dimension[2]
    hdr.dims[4] = 1
    hdr.pixDims[1] = mat.voxel_size[0]
    hdr.pixDims[2] = mat.voxel_size[1]
    hdr.pixDims[3] = mat.voxel_size[2]
    hdr.sform_code = 1
    const xmm = (hdr.dims[1] - 1) * 0.5 * hdr.pixDims[1]
    const ymm = (hdr.dims[2] - 1) * 0.5 * hdr.pixDims[2]
    const zmm = (hdr.dims[3] - 1) * 0.5 * hdr.pixDims[3]
    hdr.affine = [
        [hdr.pixDims[1], 0, 0, -xmm],
        [0, -hdr.pixDims[2], 0, ymm],
        [0, 0, hdr.pixDims[2], -zmm],
        [0, 0, 0, 1]
    ]
    hdr.littleEndian = true
    const nVox3D = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
    const nBytes3D = nVox3D * Math.ceil(hdr.numBitsPerVoxel / 8)
    const nBytes = nBytes3D * hdr.dims[4]
    const buff8v1 = new Uint8Array(new ArrayBuffer(nVox3D * 4 * 3)) // 4=Float32, 3=x,y,z
    if (hasV1) {
        // read directions, stored as index
        const nvox = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
        const dir0 = new Float32Array(nvox)
        const dir1 = new Float32Array(nvox)
        const dir2 = new Float32Array(nvox)
        const idxs = mat.index0
        const dirs = mat.odf_vertices
        for (let i = 0; i < nvox; i++) {
            const idx = idxs[i] * 3
            dir0[i] = dirs[idx + 0]
            dir1[i] = dirs[idx + 1]
            dir2[i] = -dirs[idx + 2]
        }
        buff8v1.set(new Uint8Array(dir0.buffer, dir0.byteOffset, dir0.byteLength), 0 * nBytes3D)
        buff8v1.set(new Uint8Array(dir1.buffer, dir1.byteOffset, dir1.byteLength), 1 * nBytes3D)
        buff8v1.set(new Uint8Array(dir2.buffer, dir2.byteOffset, dir2.byteLength), 2 * nBytes3D)
    }
    if ('report' in mat) {
        hdr.description = new TextDecoder().decode(mat.report.subarray(0, Math.min(79, mat.report.byteLength)))
    }
    const buff8 = new Uint8Array(new ArrayBuffer(nBytes))
    const arrFA = Float32Array.from(mat.dti_fa)
    if ('mask' in mat) {
        let slope = 1
        if ('dti_fa_slope' in mat) {
            slope = mat.dti_fa_slope[0]
        }
        let inter = 1
        if ('dti_fa_inter' in mat) {
            inter = mat.dti_fa_inter[0]
        }
        const nvox = hdr.dims[1] * hdr.dims[2] * hdr.dims[3]
        const mask = mat.mask
        const f32 = new Float32Array(nvox)
        let j = 0
        for (let i = 0; i < nvox; i++) {
            if (mask[i] !== 0) {
                f32[i] = arrFA[j] * slope + inter
                j++
            }
        }
        return [f32.buffer, new Float32Array(buff8v1.buffer)]
    }
    // read FA
    const imgFA = new Uint8Array(arrFA.buffer, arrFA.byteOffset, arrFA.byteLength)
    buff8.set(imgFA, 0)
    return [buff8.buffer, new Float32Array(buff8v1.buffer)]
}

/**
 * Reads DSI Studio SRC format (DWI source data), modifying the provided
 * NVImage header and returning the raw image data buffer.
 *
 * Format specification:
 * https://dsi-studio.labsolver.org/doc/cli_data.html
 *
 * @param nvImage - The NVImage instance whose header will be modified.
 * @param buffer - ArrayBuffer containing the SRC file data.
 * @returns Promise resolving to ArrayBuffer containing the image data.
 * @throws Error if the file is not a valid DSI Studio SRC file.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function readSRC(nvImage: NVImage, buffer: ArrayBuffer): Promise<ArrayBuffer> {
    nvImage.hdr = new NIFTI1()
    const hdr = nvImage.hdr
    hdr.littleEndian = false // MGH always big ending
    hdr.dims = [3, 1, 1, 1, 0, 0, 0, 0]
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]
    const mat = await NVUtilities.readMatV4(buffer)
    if (!('dimension' in mat) || !('image0' in mat)) {
        throw new Error('Not a valid DSIstudio SRC file')
    }
    let n = 0
    let len = 0
    for (const [key, value] of Object.entries(mat)) {
        if (!key.startsWith('image')) {
            continue
        }
        if (n === 0) {
            len = value.length
        } else if (len !== value.length) {
            len = -1
        }
        if (value.constructor !== Uint16Array) {
            throw new Error('DSIstudio SRC files always use Uint16 datatype')
        }
        n++
    }
    if (len < 1 || n < 1) {
        throw new Error('SRC file not valid DSI Studio data. The image(s) should have the same length')
    }
    hdr.numBitsPerVoxel = 16
    hdr.datatypeCode = NiiDataType.DT_UINT16
    hdr.dims[1] = mat.dimension[0]
    hdr.dims[2] = mat.dimension[1]
    hdr.dims[3] = mat.dimension[2]
    hdr.dims[4] = n
    if (hdr.dims[4] > 1) {
        hdr.dims[0] = 4
    }
    hdr.pixDims[1] = mat.voxel_size[0]
    hdr.pixDims[2] = mat.voxel_size[1]
    hdr.pixDims[3] = mat.voxel_size[2]
    hdr.sform_code = 1
    const xmm = (hdr.dims[1] - 1) * 0.5 * hdr.pixDims[1]
    const ymm = (hdr.dims[2] - 1) * 0.5 * hdr.pixDims[2]
    const zmm = (hdr.dims[3] - 1) * 0.5 * hdr.pixDims[3]
    hdr.affine = [
        [hdr.pixDims[1], 0, 0, -xmm],
        [0, -hdr.pixDims[2], 0, ymm],
        [0, 0, hdr.pixDims[2], -zmm],
        [0, 0, 0, 1]
    ]
    hdr.littleEndian = true
    const nBytes3D = hdr.dims[1] * hdr.dims[2] * hdr.dims[3] * (hdr.numBitsPerVoxel / 8)
    const nBytes = nBytes3D * hdr.dims[4]
    const buff8 = new Uint8Array(new ArrayBuffer(nBytes))
    let offset = 0
    for (let i = 0; i < n; i++) {
        const arr = mat[`image${i}`]
        const img8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
        buff8.set(img8, offset)
        offset += nBytes3D
    }
    if ('report' in mat) {
        hdr.description = new TextDecoder().decode(mat.report.subarray(0, Math.min(79, mat.report.byteLength)))
    }
    return buff8.buffer
}
