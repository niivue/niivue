import { Niivue, NVImage } from '@niivue/niivue'
// import type { vec3 } from 'gl-matrix'

export function getCurrentCursorLocation(
  nv: Niivue,
  selectedImage: NVImage | null,
  setCursorLocation: (text: string) => void
): void {
  const pos = nv.scene.crosshairPos

  const vol = selectedImage ?? nv.volumes[0]
  if (!vol || !vol.matRAS) {
    setCursorLocation('')
    return
  }

  const pt = nv.frac2vox(pos) as [number, number, number]
  const voxStr = `${pt[0]}, ${pt[1]}, ${pt[2]}`
  const mm = nv.vox2mm(pt, vol.matRAS)
  const mmStr = `${mm[0].toFixed(2)}, ${mm[1].toFixed(2)}, ${mm[2].toFixed(2)}`
  const val = vol.getValue(pt[0], pt[1], pt[2])
  const valStr = val?.toPrecision ? val.toPrecision(4) : String(val)

  const label = `Voxel: [${voxStr}]  |  World: [${mmStr}]  |  Value: ${valStr}`
  setCursorLocation(label)
}
