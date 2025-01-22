export const hexToRgba10 = (hex: string): number[] => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const a = 255
  let rgba = [r, g, b, a]
  rgba = rgba.map((c) => c / 255)
  return rgba
}

export const rgba10ToHex = (rgba: number[] | Float32Array): string => {
  const [r, g, b] = rgba.map((c) => Math.round(c * 255))
  const hex = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
  return hex
}
