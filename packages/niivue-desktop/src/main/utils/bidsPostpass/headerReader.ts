// Locate the NIfTI volume next to a sidecar JSON and return its 348-byte
// NIfTI-1 header. Prefers `.nii.gz` over `.nii` (dcm2niix `-z y` output).

import type { PostPassFs } from './fs.js'

const NIFTI1_HEADER_SIZE = 348

/**
 * Given a path like `/dataset/sub-01/anat/sub-01_T1w.json`, look for a
 * sibling `sub-01_T1w.nii` or `sub-01_T1w.nii.gz` and return the
 * decompressed first 348 bytes. Returns null when neither file exists or
 * both reads fail.
 */
export async function readNiftiHeaderBytes(
  sidecarJsonPath: string,
  fs: PostPassFs
): Promise<Uint8Array | null> {
  const stem = sidecarJsonPath.replace(/\.json$/i, '')
  if (stem === sidecarJsonPath) return null
  const gz = `${stem}.nii.gz`
  const nii = `${stem}.nii`

  try {
    if (await fs.exists(gz)) {
      return await fs.readPartialGzipBytes(gz, NIFTI1_HEADER_SIZE)
    }
  } catch {
    // fall through
  }

  try {
    if (await fs.exists(nii)) {
      return await fs.readPartialBytes(nii, NIFTI1_HEADER_SIZE)
    }
  } catch {
    return null
  }

  return null
}
