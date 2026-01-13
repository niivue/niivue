import { mat4 } from 'gl-matrix'

/**
 * Represents an affine transformation in decomposed form.
 */
export interface AffineTransform {
    translation: [number, number, number] // X, Y, Z in mm
    rotation: [number, number, number] // Euler angles in degrees (X, Y, Z order)
    scale: [number, number, number] // Scale factors
}

/**
 * Identity transform with no translation, rotation, or scale change.
 */
export const identityTransform: AffineTransform = {
    translation: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1]
}

/**
 * Convert degrees to radians.
 */
export function degToRad(degrees: number): number {
    return (degrees * Math.PI) / 180
}

/**
 * Create a rotation matrix from Euler angles (XYZ order).
 * Angles are in degrees.
 */
export function eulerToRotationMatrix(rx: number, ry: number, rz: number): mat4 {
    const out = mat4.create()

    const radX = degToRad(rx)
    const radY = degToRad(ry)
    const radZ = degToRad(rz)

    // Apply rotations in XYZ order
    mat4.rotateX(out, out, radX)
    mat4.rotateY(out, out, radY)
    mat4.rotateZ(out, out, radZ)

    return out
}

/**
 * Create a 4x4 transformation matrix from decomposed transform components.
 * Order: Scale -> Rotate -> Translate
 */
export function createTransformMatrix(transform: AffineTransform): mat4 {
    const out = mat4.create()

    // Translation
    mat4.translate(out, out, transform.translation)

    // Rotation (XYZ Euler angles)
    const rotation = eulerToRotationMatrix(transform.rotation[0], transform.rotation[1], transform.rotation[2])
    mat4.multiply(out, out, rotation)

    // Scale
    mat4.scale(out, out, transform.scale)

    return out
}

/**
 * Convert a 2D array (row-major, as used by NIfTI) to gl-matrix mat4 (column-major).
 */
export function arrayToMat4(arr: number[][]): mat4 {
    // NIfTI stores as row-major, gl-matrix uses column-major
    // arr[row][col] -> mat4 is column-major (index = col * 4 + row)
    return mat4.fromValues(
        arr[0][0],
        arr[1][0],
        arr[2][0],
        arr[3][0], // column 0
        arr[0][1],
        arr[1][1],
        arr[2][1],
        arr[3][1], // column 1
        arr[0][2],
        arr[1][2],
        arr[2][2],
        arr[3][2], // column 2
        arr[0][3],
        arr[1][3],
        arr[2][3],
        arr[3][3] // column 3
    )
}

/**
 * Convert gl-matrix mat4 (column-major) to 2D array (row-major, as used by NIfTI).
 */
export function mat4ToArray(m: mat4): number[][] {
    // mat4 is column-major: index = col * 4 + row
    // We need row-major: arr[row][col]
    return [
        [m[0], m[4], m[8], m[12]], // row 0
        [m[1], m[5], m[9], m[13]], // row 1
        [m[2], m[6], m[10], m[14]], // row 2
        [m[3], m[7], m[11], m[15]] // row 3
    ]
}

/**
 * Multiply a transformation matrix by an affine matrix (as 2D array).
 * Returns the result as a 2D array.
 *
 * The transform is applied to the left: result = transform * original
 * This means the transform happens in world coordinate space.
 */
export function multiplyAffine(original: number[][], transform: mat4): number[][] {
    const originalMat = arrayToMat4(original)
    const result = mat4.create()
    mat4.multiply(result, transform, originalMat)
    return mat4ToArray(result)
}

/**
 * Deep copy a 2D affine matrix array.
 */
export function copyAffine(affine: number[][]): number[][] {
    return affine.map((row) => [...row])
}

/**
 * Check if two transforms are approximately equal.
 */
export function transformsEqual(a: AffineTransform, b: AffineTransform, epsilon = 0.0001): boolean {
    for (let i = 0; i < 3; i++) {
        if (Math.abs(a.translation[i] - b.translation[i]) > epsilon) {
            return false
        }
        if (Math.abs(a.rotation[i] - b.rotation[i]) > epsilon) {
            return false
        }
        if (Math.abs(a.scale[i] - b.scale[i]) > epsilon) {
            return false
        }
    }
    return true
}
