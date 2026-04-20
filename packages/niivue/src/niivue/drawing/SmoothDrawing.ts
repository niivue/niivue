/**
 * Smooth drawing utilities: 3-pass sliding-window box blur of drawing bitmaps.
 *
 * Three box-blur passes along X, Y, Z approximate a Gaussian by the central
 * limit theorem.  The sliding-window approach is O(n) per pass regardless of
 * radius, unlike the O(n·radius) naive convolution.
 */

// ---------------------------------------------------------------------------
// Core algorithm (pure function, no imports — safe to inline in a Web Worker)
// ---------------------------------------------------------------------------

/**
 * Three-pass separable box blur using O(n) sliding-window per pass.
 * Safe to call from a Web Worker (no DOM/GL dependencies).
 */
function _boxBlur3D(src: Float32Array, nx: number, ny: number, nz: number, radius: number): Float32Array {
    const r = Math.max(1, Math.ceil(radius))
    let a = src
    let b = new Float32Array(nx * ny * nz)

    // Pass 1: blur along X
    for (let z = 0; z < nz; z++) {
        for (let y = 0; y < ny; y++) {
            const base = (z * ny + y) * nx
            // Initialise running sum for x = 0: window [-r..r] clamped to [0, nx-1]
            let sum = a[base] * (r + 1) // left clamping: index 0 counts (r+1) times
            for (let k = 1; k <= r; k++) {
                sum += a[base + Math.min(k, nx - 1)]
            }
            b[base] = sum / (2 * r + 1)
            for (let x = 1; x < nx; x++) {
                sum += a[base + Math.min(x + r, nx - 1)]
                sum -= a[base + Math.max(x - r - 1, 0)]
                b[base + x] = sum / (2 * r + 1)
            }
        }
    }

    // Pass 2: blur along Y — swap roles of a and b
    ;[a, b] = [b, new Float32Array(nx * ny * nz)]
    for (let z = 0; z < nz; z++) {
        for (let x = 0; x < nx; x++) {
            const stride = nx
            const base0 = z * ny * nx + x
            let sum = a[base0] * (r + 1)
            for (let k = 1; k <= r; k++) {
                sum += a[base0 + Math.min(k, ny - 1) * stride]
            }
            b[base0] = sum / (2 * r + 1)
            for (let y = 1; y < ny; y++) {
                sum += a[base0 + Math.min(y + r, ny - 1) * stride]
                sum -= a[base0 + Math.max(y - r - 1, 0) * stride]
                b[base0 + y * stride] = sum / (2 * r + 1)
            }
        }
    }

    // Pass 3: blur along Z — swap roles of a and b
    ;[a, b] = [b, new Float32Array(nx * ny * nz)]
    const sliceSize = ny * nx
    for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
            const base0 = y * nx + x
            let sum = a[base0] * (r + 1)
            for (let k = 1; k <= r; k++) {
                sum += a[base0 + Math.min(k, nz - 1) * sliceSize]
            }
            b[base0] = sum / (2 * r + 1)
            for (let z = 1; z < nz; z++) {
                sum += a[base0 + Math.min(z + r, nz - 1) * sliceSize]
                sum -= a[base0 + Math.max(z - r - 1, 0) * sliceSize]
                b[base0 + z * sliceSize] = sum / (2 * r + 1)
            }
        }
    }

    return b
}

// ---------------------------------------------------------------------------
// Public sync API
// ---------------------------------------------------------------------------

/**
 * Blur a drawing bitmap synchronously on the calling thread.
 * Prefer {@link blurDrawingBitmapAsync} to avoid blocking the main thread.
 */
export function blurDrawingBitmap(bitmap: Uint8Array, dims: number[], radius: number): Float32Array {
    const nx = dims[1]
    const ny = dims[2]
    const nz = dims[3]
    const n = nx * ny * nz
    if (bitmap.length < n) {
        return new Float32Array(n)
    }
    const input = new Float32Array(n)
    for (let i = 0; i < n; i++) {
        input[i] = bitmap[i] > 0 ? 1.0 : 0.0
    }
    return _boxBlur3D(input, nx, ny, nz, radius)
}

// ---------------------------------------------------------------------------
// Async Web Worker API
// ---------------------------------------------------------------------------

// Build the worker source at runtime by stringifying _boxBlur3D — no
// duplication of the algorithm.  The onmessage glue is the only
// worker-specific boilerplate.
function _buildWorkerSource(): string {
    return `
var _boxBlur3D = ${_boxBlur3D.toString()};
self.onmessage = function(e) {
    var bitmap = new Uint8Array(e.data.bitmap);
    var dims = e.data.dims;
    var radius = e.data.radius;
    var generation = e.data.generation;
    var nx = dims[1], ny = dims[2], nz = dims[3];
    var n = nx * ny * nz;
    var input = new Float32Array(n);
    for (var i = 0; i < n; i++) input[i] = bitmap[i] > 0 ? 1.0 : 0.0;
    var result = _boxBlur3D(input, nx, ny, nz, radius);
    self.postMessage({ smoothed: result.buffer, generation: generation }, [result.buffer]);
};
`
}

let _sharedWorker: Worker | null = null

/**
 * Returns a shared singleton Web Worker that runs the blur off the main thread.
 * Created lazily on first call.
 *
 * The Worker is constructed via an indirect `Function` call so that bundlers
 * (Webpack 5 in particular) do not attempt to statically analyse it as a
 * module-worker import.  Returns null if the environment does not support
 * Blob-URL workers (e.g. a restrictive CSP blocks worker-src blob:).
 */
export function getSmoothDrawingWorker(): Worker | null {
    if (_sharedWorker) {
        return _sharedWorker
    }
    try {
        const blob = new Blob([_buildWorkerSource()], { type: 'application/javascript' })
        const url = URL.createObjectURL(blob)
        // Indirect construction avoids Webpack 5 static-analysis of `new Worker()`
        // which would otherwise try to treat the argument as a module specifier.
        // eslint-disable-next-line no-new-func
        const WorkerCtor = /* @__PURE__ */ new Function('u', 'return new Worker(u)') as (u: string) => Worker
        _sharedWorker = WorkerCtor(url)
    } catch {
        // Blob workers unavailable (CSP, SSR, old browser); caller falls back to sync
        return null
    }
    return _sharedWorker
}

/** Terminate and drop the shared worker (call on teardown). */
export function terminateSmoothDrawingWorker(): void {
    if (_sharedWorker) {
        _sharedWorker.terminate()
        _sharedWorker = null
    }
}
