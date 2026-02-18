/**
 * Post-processing for brain segmentation: connected-component filtering.
 *
 * After inference, the label volume may contain small disconnected clusters
 * (skull fragments, meninges) outside the main brain region. This module
 * binarizes all nonzero labels, finds connected components of the binary mask,
 * keeps only the single largest connected blob, and zeroes out everything else.
 * Original label values are preserved for surviving voxels.
 *
 * This matches the brainchop.org postprocessing strategy.
 *
 * Uses union-find (disjoint set) with path compression and union by rank,
 * scanning with 26-connectivity (13 forward neighbors to avoid double work).
 */

/**
 * Keep only the largest connected cluster across all nonzero labels.
 * Binarizes the mask (all nonzero → 1), finds connected components with
 * 26-connectivity, keeps the single largest component, and zeroes out
 * voxels not in that component. Original label values are preserved.
 *
 * Mutates `labels` in-place.
 *
 * @param labels  Flat Uint8Array of label values (length = dx * dy * dz)
 * @param dims    Volume dimensions [dx, dy, dz]
 */
export function keepLargestClusterPerClass(labels: Uint8Array, dims: [number, number, number]): void {
  const [dx, dy, dz] = dims
  const n = dx * dy * dz

  // --- Union-Find data structures ---
  const parent = new Int32Array(n)
  const rank = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    parent[i] = i
  }

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]] // path compression (halving)
      x = parent[x]
    }
    return x
  }

  function union(a: number, b: number): void {
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) return
    if (rank[ra] < rank[rb]) {
      parent[ra] = rb
    } else if (rank[ra] > rank[rb]) {
      parent[rb] = ra
    } else {
      parent[rb] = ra
      rank[ra]++
    }
  }

  // --- 13 forward neighbor offsets for 26-connectivity ---
  const strideY = dx
  const strideZ = dx * dy
  const forwardOffsets: [number, number, number][] = [
    // 6-connectivity forward neighbors (3)
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    // 18-connectivity edge neighbors, forward only (6)
    [1, 1, 0],
    [-1, 1, 0],
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    // 26-connectivity corner neighbors, forward only (4)
    [1, 1, 1],
    [-1, 1, 1],
    [1, -1, 1],
    [-1, -1, 1]
  ]

  // --- Pass 1: Union adjacent nonzero voxels (binary mask, ignoring label values) ---
  for (let z = 0; z < dz; z++) {
    for (let y = 0; y < dy; y++) {
      for (let x = 0; x < dx; x++) {
        const idx = z * strideZ + y * strideY + x
        if (labels[idx] === 0) continue

        for (const [ox, oy, oz] of forwardOffsets) {
          const nx = x + ox
          const ny = y + oy
          const nz = z + oz
          if (nx < 0 || nx >= dx || ny < 0 || ny >= dy || nz < 0 || nz >= dz) continue
          const nIdx = nz * strideZ + ny * strideY + nx
          if (labels[nIdx] !== 0) {
            union(idx, nIdx)
          }
        }
      }
    }
  }

  // --- Pass 2: Count component sizes and find the single largest component ---
  const componentSize = new Map<number, number>()

  for (let i = 0; i < n; i++) {
    if (labels[i] === 0) continue
    const root = find(i)
    componentSize.set(root, (componentSize.get(root) ?? 0) + 1)
  }

  let largestRoot = -1
  let largestSize = 0
  for (const [root, size] of componentSize) {
    if (size > largestSize) {
      largestSize = size
      largestRoot = root
    }
  }

  // --- Pass 3: Zero out voxels not in the largest component ---
  let removedCount = 0
  for (let i = 0; i < n; i++) {
    if (labels[i] === 0) continue
    if (find(i) !== largestRoot) {
      labels[i] = 0
      removedCount++
    }
  }

  console.log(`[postprocess] Removed ${removedCount} voxels from non-largest cluster (kept ${largestSize} voxels)`)
}
