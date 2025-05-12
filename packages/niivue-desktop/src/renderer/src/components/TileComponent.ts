import { SLICE_TYPE, Niivue } from '@niivue/niivue'

export interface Transform {
  scale: number
  scrollX: number
  scrollY: number
  canvasWidth: number
  canvasHeight: number
}

export class TileComponent {
  id: string
  relativeBounds: [number, number, number, number]
  sliceType: SLICE_TYPE
  nvId: string
  customMM: number

  constructor(
    id: string,
    bounds: [number, number, number, number],
    sliceType: SLICE_TYPE,
    nvId: string,
    customMM: number = NaN
  ) {
    this.id = id
    this.relativeBounds = bounds
    this.sliceType = sliceType
    this.nvId = nvId
    this.customMM = customMM
  }

  draw(
    gl: WebGL2RenderingContext,
    transform: Transform,
    getNV: (id: string) => Niivue | undefined
  ) {
    const nv = getNV(this.nvId)
    if (!nv) return

    const [rx, ry, rw, rh] = this.relativeBounds
    const px = (rx - transform.scrollX) * transform.scale
    const py = (ry - transform.scrollY) * transform.scale
    const pw = rw * transform.scale
    const ph = rh * transform.scale

    // Skip offscreen
    if (px + pw < 0 || py + ph < 0 || px > transform.canvasWidth || py > transform.canvasHeight)
      return

    if (this.sliceType === SLICE_TYPE.RENDER) {
      nv.draw3D([px, py, pw, ph], null!, null!, null!, 0, 0)
    } else {
      nv.draw2D([px, py, pw, ph], this.sliceType, this.customMM)
    }
  }

  toJSON() {
    return {
      id: this.id,
      relativeBounds: this.relativeBounds,
      sliceType: this.sliceType,
      nvId: this.nvId,
      customMM: this.customMM
    }
  }

  static fromJSON(json: any): TileComponent {
    return new TileComponent(
      json.id,
      json.relativeBounds,
      json.sliceType,
      json.nvId,
      json.customMM
    )
  }
}
