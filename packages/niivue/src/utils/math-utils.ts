import { nice } from '@/utils/nice'

function loose_label(min: number, max: number, ntick = 4): [number, number, number, boolean] {
  const range = nice(max - min, false)
  const d = nice(range / (ntick - 1), true)
  const graphmin = Math.floor(min / d) * d
  const graphmax = Math.ceil(max / d) * d
  const perfect = graphmin === min && graphmax === max
  return [d, graphmin, graphmax, perfect]
}

// "Nice Numbers for Graph Labels", Graphics Gems, pp 61-63
// https://github.com/cenfun/nice-ticks/blob/master/docs/Nice-Numbers-for-Graph-Labels.pdf
export function tickSpacing(mn: number, mx: number): number[] {
  let v = loose_label(mn, mx, 3)
  if (!v[3]) {
    v = loose_label(mn, mx, 5)
  }
  if (!v[3]) {
    v = loose_label(mn, mx, 4)
  }
  if (!v[3]) {
    v = loose_label(mn, mx, 3)
  }
  if (!v[3]) {
    v = loose_label(mn, mx, 5)
  }
  return [v[0], v[1], v[2]]
}

// convert degrees to radians
export function deg2rad(deg: number): number {
  return deg * (Math.PI / 180.0)
}

export function negMinMax(min: number, max: number, minNeg: number, maxNeg: number): [number, number] {
  let mn = -min
  let mx = -max
  if (isFinite(minNeg) && isFinite(maxNeg)) {
    mn = minNeg
    mx = maxNeg
  }
  if (mn > mx) {
    ;[mn, mx] = [mx, mn]
  }
  return [mn, mx]
}

// https://stackoverflow.com/questions/11409895/whats-the-most-elegant-way-to-cap-a-number-to-a-segment
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
