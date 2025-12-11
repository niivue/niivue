/**
 * ZarrProcessor module
 *
 * Handles Zarr format-specific loading logic:
 * - Parses Zarr URL parameters for slice selection
 * - Fetches Zarr array data from remote stores
 * - Handles 3D and 4D array slicing
 * - Validates slice indices against array dimensions
 *
 * Zarr is a cloud-optimized format for chunked, compressed N-dimensional arrays.
 */

import * as zarr from 'zarrita'

/**
 * Result of Zarr data loading, containing the raw data buffer
 * and metadata about the array structure.
 */
export interface ZarrLoadResult {
    dataBuffer: ArrayBuffer
    zarrData: {
        data: ArrayBuffer
        width: number
        height: number
        depth: number
        channels?: number
    }
}

/**
 * Load Zarr array data from a URL with optional slice selection.
 * Supports query parameters ?x=N, ?y=N, ?z=N for slice selection.
 *
 * @param url - Zarr URL (may include query parameters for slicing)
 * @returns Load result with data buffer and metadata
 *
 * @example
 * ```typescript
 * // Load full array
 * const result = await loadZarrData('https://example.com/data.zarr')
 *
 * // Load specific slice
 * const result = await loadZarrData('https://example.com/data.zarr?z=50&y=100&x=100')
 * ```
 */
export async function loadZarrData(url: string): Promise<ZarrLoadResult> {
    // Get the z, x, y slice indices from the query string
    const urlParams = new URL(url).searchParams
    const zIndex = urlParams.get('z')
    const yIndex = urlParams.get('y')
    const xIndex = urlParams.get('x')

    const zRange = zIndex ? zarr.slice(parseInt(zIndex), parseInt(zIndex) + 1) : null
    const yRange = yIndex ? zarr.slice(parseInt(yIndex), parseInt(yIndex) + 1) : null
    const xRange = xIndex ? zarr.slice(parseInt(xIndex), parseInt(xIndex) + 1) : null

    // Remove the query string from the original URL
    const zarrUrl = url.split('?')[0]

    // If multiscale, must provide the full path to the zarr array data
    const store = new zarr.FetchStore(zarrUrl)
    const root = zarr.root(store)

    let arr
    try {
        // Try to resolve the full URL path first
        arr = await zarr.open(root.resolve(url), { kind: 'array' })
    } catch (e) {
        // Fall back to opening the root directly
        arr = await zarr.open(root, { kind: 'array' })
    }

    let view
    if (arr.shape.length === 4) {
        // 4D array (e.g., RGB/RGBA volume data)
        const cRange = null // Load all channels

        // Make sure we are not exceeding the array shape. If so, clamp to max
        const zDim = arr.shape[2]
        const yDim = arr.shape[1]
        const xDim = arr.shape[0]

        if (zRange && zRange[0] >= zDim) {
            zRange[0] = zDim - 1
        }
        if (yRange && yRange[0] >= yDim) {
            yRange[0] = yDim - 1
        }
        if (xRange && xRange[0] >= xDim) {
            xRange[0] = xDim - 1
        }

        view = await zarr.get(arr, [xRange, yRange, zRange, cRange])
    } else {
        // 3D array
        view = await zarr.get(arr, [xRange, yRange, zRange])
    }

    const dataBuffer = view.data as ArrayBuffer
    const [height, width, zDim, cDim] = view.shape

    const zarrData = {
        data: dataBuffer,
        width,
        height,
        depth: zDim,
        channels: cDim
    }

    return {
        dataBuffer,
        zarrData
    }
}
