import { mat4, vec3, vec4 } from 'gl-matrix'

export function swizzleVec3(vec: vec3, order = [0, 1, 2]): vec3 {
  const vout = vec3.create()
  vout[0] = vec[order[0]]
  vout[1] = vec[order[1]]
  vout[2] = vec[order[2]]
  return vout
}

// return boolean is 2D slice view is radiological
// n.b. ambiguous for pure sagittal views
export function isRadiological(mtx: mat4): number {
  const vRight = vec4.fromValues(1, 0, 0, 0) // pure right vector
  const vRotated = vec4.create()
  vec4.transformMat4(vRotated, vRight, mtx)
  return vRotated[0]
}

export function unProject(winX: number, winY: number, winZ: number, mvpMatrix: mat4): vec4 {
  // https://github.com/bringhurst/webgl-unproject
  const inp = vec4.fromValues(winX, winY, winZ, 1.0)
  const finalMatrix = mat4.clone(mvpMatrix)
  // mat.mat4.multiply(finalMatrix, model, proj);
  mat4.invert(finalMatrix, finalMatrix)
  // view is leftTopWidthHeight
  /* Map to range -1 to 1 */
  inp[0] = inp[0] * 2 - 1
  inp[1] = inp[1] * 2 - 1
  inp[2] = inp[2] * 2 - 1
  const out = vec4.create()
  vec4.transformMat4(out, inp, finalMatrix)
  if (out[3] === 0.0) {
    return out
  } // error
  out[0] /= out[3]
  out[1] /= out[3]
  out[2] /= out[3]
  return out
}
