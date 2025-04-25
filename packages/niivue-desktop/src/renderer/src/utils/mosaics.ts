import { NVImage } from "@niivue/niivue";

/**
 * Defines the three possible slice orientations for viewing data
 * Each orientation corresponds to a different anatomical plane and dimension in the volume
 */
export enum SliceOrientation {
  AXIAL = "axial", // Z axis, dims[3]
  SAGITTAL = "sagittal", // X axis, dims[1]
  CORONAL = "coronal", // Y axis, dims[2]
}

/**
 * Result type for mosaic calculations containing:
 * - mosaicString: formatted string of slice positions for Niivue
 * - grid: the calculated optimal grid dimensions
 */
interface MosaicResult {
  mosaicString: string;
  grid: { rows: number; cols: number };
}

/**
 * Calculates mosaic layout parameters for displaying multiple slices of a 3D volume
 * @param volume - The NVImage instance
 * @param canvasWidth - Width of the canvas in pixels
 * @param canvasHeight - Height of the canvas in pixels
 * @param orientation - The anatomical orientation for slicing (default: AXIAL)
 * @returns MosaicResult containing the mosaic string and grid dimensions
 */
export function calculateMosaic(
  volume: NVImage,
  canvasWidth: number,
  canvasHeight: number,
  orientation: SliceOrientation = SliceOrientation.AXIAL
): MosaicResult {
  if (!volume?.hdr?.affine || !Array.isArray(volume.hdr.dims)) {
    throw new Error("Invalid volume structure");
  }

  const dims = volume.hdr.dims;
  const m = volume.hdr.affine;

  // Select the appropriate dimension and affine matrix row based on orientation
  // Each orientation uses different axes of the volume
  const dimensionIndex =
    orientation === SliceOrientation.SAGITTAL
      ? 1 // X dimension
      : orientation === SliceOrientation.CORONAL
      ? 2 // Y dimension
      : 3; // Z dimension (axial)

  // Select the corresponding row from the affine matrix
  // This row contains the scaling and translation for the chosen orientation
  const affineRow =
    orientation === SliceOrientation.SAGITTAL
      ? 0 // X axis transformation
      : orientation === SliceOrientation.CORONAL
      ? 1 // Y axis transformation
      : 2; // Z axis transformation

  // Validate affine matrix for selected orientation
  if (!m[affineRow]?.[affineRow] || !m[affineRow]?.[3]) {
    throw new Error(`Invalid affine matrix for ${orientation} orientation`);
  }

  const nSlices = dims[dimensionIndex] | 0; // force integer
  if (nSlices <= 0) {
    throw new Error(`Invalid number of ${orientation} slices.`);
  }

  if (canvasWidth <= 0 || canvasHeight <= 0) {
    throw new Error("Invalid canvas dimensions.");
  }

  // Cache frequently used values
  const canvasRatio = canvasWidth / canvasHeight;
  const mDiagonal = m[affineRow][affineRow];
  const mTranslation = m[affineRow][3];

  /**
   * Converts slice indices to world coordinates using the affine transformation
   * Caches results for performance since coordinates are reused
   */
  const coordinateCache = new Float64Array(nSlices);
  let cacheInitialized = false;

  const getCoordinate = (sliceIndex: number): number => {
    if (!cacheInitialized) {
      for (let i = 0; i < nSlices; i++) {
        coordinateCache[i] = mDiagonal * i + mTranslation;
      }
      cacheInitialized = true;
    }
    return coordinateCache[sliceIndex];
  };

  // Calculate the optimal grid layout
  // The goal is to create a grid that:
  // 1. Fits all slices
  // 2. Maintains aspect ratio similar to the canvas
  // 3. Minimizes empty space
  const { cols: bestCols, rows: bestRows } = (() => {
    if (nSlices === 1) return { cols: 1, rows: 1 };

    const idealColsFloat = Math.sqrt(nSlices * canvasRatio);
    const colsCandidate1 = Math.max(1, Math.floor(idealColsFloat));
    const colsCandidate2 = Math.max(1, Math.ceil(idealColsFloat));

    const rowsCandidate1 = Math.ceil(nSlices / colsCandidate1);
    const rowsCandidate2 = Math.ceil(nSlices / colsCandidate2);

    const ratio1 = colsCandidate1 / rowsCandidate1;
    const ratio2 = colsCandidate2 / rowsCandidate2;

    const diff1 = Math.abs(canvasRatio - ratio1);
    const diff2 = Math.abs(canvasRatio - ratio2);

    return diff1 <= diff2
      ? { cols: colsCandidate1, rows: Math.ceil(nSlices / colsCandidate1) }
      : { cols: colsCandidate2, rows: Math.ceil(nSlices / colsCandidate2) };
  })();

  // Pre-allocate arrays when building the mosaic string
  const mosaicRows = new Array<string>(bestRows);
  const rowSlices = new Array<number>(bestCols);

  // Each orientation uses its first letter as a prefix in the mosaic string
  // A: Axial, S: Sagittal, C: Coronal
  const orientationPrefix = orientation[0].toUpperCase();

  // Build the mosaic string row by row
  // Format: "<orientation> pos1 pos2 pos3; <orientation> pos4 pos5 pos6; ..."
  // Where positions are world coordinates for each slice in the requested orientation
  for (let r = 0; r < bestRows; r++) {
    let sliceCount = 0;
    const baseIndex = r * bestCols;

    for (let c = 0; c < bestCols; c++) {
      const sliceIndex = baseIndex + c;
      if (sliceIndex >= nSlices) break;

      rowSlices[sliceCount++] = getCoordinate(sliceIndex);
    }

    if (sliceCount > 0) {
      mosaicRows[r] = `${orientationPrefix} ${rowSlices
        .slice(0, sliceCount)
        .map((mm) => mm.toFixed(2))
        .join(" ")}`;
    }
  }

  return {
    mosaicString: mosaicRows.join(";"),
    grid: { rows: bestRows, cols: bestCols },
  };
}