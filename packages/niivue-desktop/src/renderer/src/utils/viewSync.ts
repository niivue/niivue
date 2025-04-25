import { sliceTypeMap } from '../../../common/sliceTypes'
import { layouts } from '../../../common/layouts.js'
import { SHOW_RENDER, type Niivue, type SLICE_TYPE } from '@niivue/niivue'

/**
 * Registers monkey-patches on the Niivue instance to emit IPC events
 * whenever view-related methods are called, keeping the Electron menu in sync.
 */
export function registerViewSync(nv: Niivue): void {
  patchMultiplanarLayout(nv)
  patchSliceType(nv)
  // add more patches here, e.g. for crosshair, dragMode, etc.
}

/**
 * Monkey-patch setMultiplanarLayout to notify main when layout changes.
 */
function patchMultiplanarLayout(nv: Niivue) {
  const orig = nv.setMultiplanarLayout.bind(nv)
  nv.setMultiplanarLayout = (layoutValue: any) => {
    const result = orig(layoutValue)
    const layoutKey = Object.keys(layouts)
      .find((key) => layouts[key] === layoutValue)
    if (layoutKey) {
      window.electron.ipcRenderer.send('renderer:layout-changed', layoutKey)
    }
    return result
  }
}

/**
 * Monkey-patch setSliceType to notify main when slice type changes.
 * Updated to match signature: setSliceType(st: SLICE_TYPE): Niivue
 */
function patchSliceType(nv: Niivue) {
  const orig = nv.setSliceType.bind(nv)

  nv.setSliceType = (st: SLICE_TYPE) => {
    const result = orig(st)

    const sliceKey = Object.keys(sliceTypeMap)
      .find((key) => sliceTypeMap[key].sliceType === st)

    if (sliceKey) {
      const isRenderShown = nv.opts.multiplanarShowRender === SHOW_RENDER.ALWAYS
      
      let sliceName = (isRenderShown && sliceKey === 'Multiplanar' ) ? 'Multiplanar + 3D render' : sliceKey
      window.electron.ipcRenderer.send('renderer:sliceType-changed', sliceName)
      console.log('slice name', sliceName)
    }

    return result
  }
}
