// Numpy-style allclose, ported from bidsui (reproinx.py origin). Two values
// are "close" when |a - b| <= atol + rtol * max(|a|, |b|); symmetric in a/b.
// NaN is never close to anything (matches numpy).

type AllcloseInput = number | readonly AllcloseInput[]

export function allclose(a: AllcloseInput, b: AllcloseInput, rtol = 0.05, atol = 1e-8): boolean {
  const aIsArray = Array.isArray(a)
  const bIsArray = Array.isArray(b)
  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!allclose(a[i], b[i], rtol, atol)) return false
    }
    return true
  }
  if (aIsArray !== bIsArray) return false
  const x = a as unknown
  const y = b as unknown
  const aIsNum = typeof x === 'number' && Number.isFinite(x)
  const bIsNum = typeof y === 'number' && Number.isFinite(y)
  if (!aIsNum || !bIsNum) return x === y
  return Math.abs(x - y) <= atol + rtol * Math.max(Math.abs(x), Math.abs(y))
}

/**
 * Heudiconv's compatibility test used by the fmap-pairing pass:
 *   - both inputs arrays of strings → element-wise string equality
 *   - otherwise → allclose at 5% rtol
 */
export function paramsMatch(
  a: readonly unknown[] | null | undefined,
  b: readonly unknown[] | null | undefined
): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return false
  }
  if (a.length !== b.length) return false
  const aAllStrings = a.every((x) => typeof x === 'string')
  const bAllStrings = b.every((x) => typeof x === 'string')
  if (aAllStrings && bAllStrings) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }
  for (let i = 0; i < a.length; i++) {
    if (!allclose(a[i] as AllcloseInput, b[i] as AllcloseInput, 0.05)) {
      return false
    }
  }
  return true
}
