/**
 * ImageFactory Module
 *
 * Pure utility functions for loading and creating NVImage instances.
 * This module contains helper functions for:
 * - Fetching data from URLs and files
 * - Stream decompression and partial loading
 * - Format detection and filename parsing
 * - Data conversion utilities
 *
 * These functions are intentionally pure and do not depend on the NVImage class,
 * avoiding circular dependencies.
 */

import { Gunzip } from 'fflate'
import { readHeaderAsync } from 'nifti-reader-js'
import { uncompressStream } from '@/nvimage/utils'

/**
 * Fetch DICOM manifest and return array of file data
 * @param url - URL to DICOM manifest or folder
 * @param headers - HTTP headers for requests
 * @returns Array of {name, data} objects for each DICOM file
 */
export async function fetchDicomData(url: string, headers: Record<string, string> = {}): Promise<Array<{ name: string; data: ArrayBuffer }>> {
    if (url === '') {
        throw Error('url must not be empty')
    }

    // https://stackoverflow.com/questions/10687099/how-to-test-if-a-url-string-is-absolute-or-relative
    const absoluteUrlRE = /^(?:[a-z+]+:)?\/\//i

    let manifestUrl = absoluteUrlRE.test(url) ? url : new URL(url, window.location.href)
    const extensionRE = /(?:.([^.]+))?$/
    const extension = extensionRE.exec((manifestUrl as URL).pathname)
    if (!extension) {
        manifestUrl = new URL('niivue-manifest.txt', url)
    }

    let response = await fetch(manifestUrl, { headers })
    if (!response.ok) {
        throw Error(response.statusText)
    }
    const text = await response.text()
    const lines = text.split('\n')

    const baseUrlRE = /(.*\/).*/
    const folderUrl = baseUrlRE.exec(manifestUrl as string)![0]
    const dataBuffer = []
    for (const line of lines) {
        const fileUrl = new URL(line, folderUrl)
        response = await fetch(fileUrl, { headers })
        if (!response.ok) {
            throw Error(response.statusText)
        }
        const contents = await response.arrayBuffer()
        dataBuffer.push({ name: line, data: contents })
    }
    return dataBuffer
}

/**
 * Read and decompress first N bytes from a gzipped stream
 * @param stream - ReadableStream of compressed data
 * @param minBytes - Minimum bytes to read (decompressed)
 * @returns Decompressed bytes
 */
export async function readFirstDecompressedBytes(stream: ReadableStream<Uint8Array>, minBytes: number): Promise<Uint8Array> {
    const reader: ReadableStreamDefaultReader<Uint8Array> = stream.getReader()
    const gunzip = new Gunzip()

    const decompressedChunks: Uint8Array[] = []
    let totalDecompressed = 0
    let doneReading = false

    let resolveFn: (value: Uint8Array) => void
    let rejectFn: (reason?: any) => void

    const promise = new Promise<Uint8Array>((resolve, reject): undefined => {
        resolveFn = resolve
        rejectFn = reject
        return undefined
    })

    function finalize(): void {
        // Combine chunks into a single Uint8Array
        const result = new Uint8Array(totalDecompressed)
        let offset = 0
        for (const chunk of decompressedChunks) {
            result.set(chunk, offset)
            offset += chunk.length
        }
        resolveFn(result)
    }

    gunzip.ondata = (chunk: Uint8Array): void => {
        decompressedChunks.push(chunk)
        totalDecompressed += chunk.length
        if (totalDecompressed >= minBytes) {
            doneReading = true
            reader.cancel().catch(() => {})
            finalize()
        }
    }
    ;(async (): Promise<void> => {
        try {
            while (!doneReading) {
                const { done, value } = await reader.read()
                if (done) {
                    doneReading = true
                    gunzip.push(new Uint8Array(), true) // Signal end-of-stream
                    return
                }
                gunzip.push(value, false) // Push data into fflate
            }
        } catch (err) {
            rejectFn(err)
        }
    })().catch(() => {})

    return promise
}

/**
 * Extract filename from URL query parameters or pathname
 * @param url - URL string to parse
 * @returns Extracted filename or null
 */
export function extractFilenameFromUrl(url: string): string | null {
    const params = new URL(url).searchParams
    const contentDisposition = params.get('response-content-disposition')
    if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/)
        if (match) {
            return decodeURIComponent(match[1])
        }
    }
    // Fallback: extract from pathname if possible
    return url.split('/').pop()!.split('?')[0]
}

/**
 * Load partial 4D volumes from gzipped NIfTI file
 * @param url - URL to gzipped NIfTI file
 * @param headers - HTTP headers
 * @param limitFrames4D - Maximum number of frames to load
 * @returns ArrayBuffer with partial data or null if full load needed
 */
export async function loadInitialVolumesGz(url = '', headers = {}, limitFrames4D = NaN): Promise<ArrayBuffer | null> {
    if (isNaN(limitFrames4D)) {
        return null
    }
    const response = await fetch(url, { headers, cache: 'force-cache' })
    let hdrBytes = 352
    let hdrU8s = await readFirstDecompressedBytes(response.body!, hdrBytes)
    const hdrView = new DataView(hdrU8s.buffer, hdrU8s.byteOffset, hdrU8s.byteLength)
    const u16 = hdrView.getUint16(0, true)
    const isNIfTI1 = u16 === 348
    const isNIfTI1be = u16 === 23553
    if (!isNIfTI1 && !isNIfTI1be) {
        return null
    }
    // start of edge cases: huge header extensions with small gz block size
    if (hdrU8s.length > 111) {
        hdrBytes = hdrView.getFloat32(108, isNIfTI1)
    }
    if (hdrBytes > hdrU8s.length) {
        hdrU8s = await readFirstDecompressedBytes(response.body!, hdrBytes)
    }
    // end of edge case
    const isNifti1 = (hdrU8s[0] === 92 && hdrU8s[1] === 1) || (hdrU8s[1] === 92 && hdrU8s[0] === 1)
    if (!isNifti1) {
        return null
    }
    const hdr = await readHeaderAsync(hdrU8s.buffer as ArrayBuffer)
    if (!hdr) {
        throw new Error('Could not read NIfTI header')
    }
    // Calculate required data size
    const nBytesPerVoxel = hdr.numBitsPerVoxel / 8
    const nVox3D = [1, 2, 3].reduce((acc, i) => acc * (hdr.dims[i] > 1 ? hdr.dims[i] : 1), 1)
    const nFrame4D = [4, 5, 6].reduce((acc, i) => acc * (hdr.dims[i] > 1 ? hdr.dims[i] : 1), 1)
    const volsToLoad = Math.max(Math.min(limitFrames4D, nFrame4D), 1)
    const bytesToLoad = hdr.vox_offset + volsToLoad * nVox3D * nBytesPerVoxel
    if (volsToLoad === nFrame4D) {
        // read entire file: compression streams is faster than fflate
        return null
    }
    const responseImg = await fetch(url, { headers, cache: 'force-cache' })
    const dataBytes = await readFirstDecompressedBytes(responseImg.body!, bytesToLoad)
    return dataBytes.buffer.slice(0, bytesToLoad) as ArrayBuffer
}

/**
 * Load partial 4D volumes from uncompressed NIfTI file
 * @param url - URL to NIfTI file
 * @param headers - HTTP headers
 * @param limitFrames4D - Maximum number of frames to load
 * @returns ArrayBuffer with partial data or null if full load needed
 */
export async function loadInitialVolumes(url = '', headers = {}, limitFrames4D = NaN): Promise<ArrayBuffer | null> {
    if (isNaN(limitFrames4D)) {
        return null
    }
    const response = await fetch(url, { headers, cache: 'force-cache' })
    const reader = response.body!.getReader()
    const { value, done } = await reader.read()
    let hdrU8s = value!
    if (done || !hdrU8s || hdrU8s.length < 2) {
        throw new Error('Not enough data to determine compression')
    }
    const hdrView = new DataView(hdrU8s.buffer, hdrU8s.byteOffset, hdrU8s.byteLength)
    const u16 = hdrView.getUint16(0, true)
    const isGz = u16 === 35615
    if (isGz) {
        await reader.cancel() // Stop streaming and release the lock
        return loadInitialVolumesGz(url, headers, limitFrames4D)
    }
    const isNIfTI1 = u16 === 348
    const isNIfTI1be = u16 === 23553
    if (!isNIfTI1 && !isNIfTI1be) {
        await reader.cancel()
        return null
    }
    // start of edge cases: huge header extensions with degraded packet size
    let hdrBytes = 352
    if (hdrU8s.length > 111) {
        hdrBytes = hdrView.getFloat32(108, isNIfTI1)
    }
    while (hdrU8s.length < hdrBytes) {
        const { value, done } = await reader.read()
        if (done || !value) {
            break
        }
        function concatU8s(arr1: Uint8Array, arr2: Uint8Array): Uint8Array {
            const result = new Uint8Array(arr1.length + arr2.length)
            result.set(arr1, 0)
            result.set(arr2, arr1.length)
            return result
        }
        hdrU8s = concatU8s(hdrU8s, value)
    }
    // end of edge cases
    const hdr = await readHeaderAsync(hdrU8s.buffer as ArrayBuffer)
    if (!hdr) {
        throw new Error('Could not read NIfTI header')
    }
    // Calculate required data size
    const nBytesPerVoxel = hdr.numBitsPerVoxel / 8
    const nVox3D = [1, 2, 3].reduce((acc, i) => acc * (hdr.dims[i] > 1 ? hdr.dims[i] : 1), 1)
    const nFrame4D = [4, 5, 6].reduce((acc, i) => acc * (hdr.dims[i] > 1 ? hdr.dims[i] : 1), 1)
    const volsToLoad = Math.max(Math.min(limitFrames4D, nFrame4D), 1)
    const bytesToLoad = hdr.vox_offset + volsToLoad * nVox3D * nBytesPerVoxel
    const imgU8s = new Uint8Array(bytesToLoad)
    // Ensure we don't copy more than needed from hdrU8s
    const hdrCopyLength = Math.min(hdrU8s.length, bytesToLoad)
    imgU8s.set(hdrU8s.subarray(0, hdrCopyLength), 0)
    let bytesRead = hdrCopyLength
    while (bytesRead < bytesToLoad) {
        const { value, done } = await reader.read()
        if (done || !value) {
            await reader.cancel()
            return null
        }
        // Ensure we only copy up to bytesToLoad
        const remaining = Math.min(value.length, bytesToLoad - bytesRead)
        imgU8s.set(value.subarray(0, remaining), bytesRead)
        bytesRead += remaining
    }
    await reader.cancel()
    return imgU8s.buffer
}

/**
 * Read File object with streaming decompression
 * @param file - Browser File object
 * @param bytesToLoad - Optional limit on bytes to read
 * @returns ArrayBuffer with file data
 */
export async function readFileAsync(file: File, bytesToLoad = NaN): Promise<ArrayBuffer> {
    let stream = file.stream()

    if (!isNaN(bytesToLoad)) {
        let bytesRead = 0
        const limiter = new TransformStream({
            transform(chunk: Uint8Array, controller: TransformStreamDefaultController): void {
                if (bytesRead >= bytesToLoad) {
                    controller.terminate()
                    return
                }
                const remainingBytes = bytesToLoad - bytesRead
                if (chunk.length > remainingBytes) {
                    controller.enqueue(chunk.slice(0, remainingBytes))
                    controller.terminate()
                } else {
                    controller.enqueue(chunk)
                }
                bytesRead += chunk.length
            }
        })
        stream = stream.pipeThrough(limiter)
    }

    const uncompressedStream = await uncompressStream(stream)

    const chunks: Uint8Array[] = []
    const reader = uncompressedStream.getReader()

    while (true) {
        const { done, value } = await reader.read()
        if (done) {
            break
        }
        chunks.push(value)
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const result = new ArrayBuffer(totalLength)
    const resultView = new Uint8Array(result)

    let offset = 0
    for (const chunk of chunks) {
        resultView.set(chunk, offset)
        offset += chunk.length
    }

    return result
}

/**
 * Convert base64 string to ArrayBuffer
 * @param base64 - Base64 encoded string
 * @returns Decoded ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64)
    const len = binary_string.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
    }
    return bytes.buffer
}

/**
 * Get primary file extension (without compression suffix)
 * @param filename - Filename to parse
 * @returns Primary extension (e.g., "nii" from "file.nii.gz")
 */
export function getPrimaryExtension(filename: string): string {
    // .nii.gz -> .nii
    const match = filename.match(/\.([^.]+)(?:\.gz|\.bz2|\.xz)?$/)
    return match ? match[1] : ''
}
