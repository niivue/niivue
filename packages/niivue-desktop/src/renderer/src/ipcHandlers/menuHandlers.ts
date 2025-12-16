import { Niivue } from '@niivue/niivue'
import { sliceTypeMap } from '../../../common/sliceTypes.js'
import { layouts } from '../../../common/layouts.js'
import { orientationLabelMap } from '../../../common/orientationLabels.js'

const electron = window.electron

export const registerSliceTypeHandler = (
  nv: Niivue,
  onMosaicStringChange?: (sliceMosaicString: string) => void
): void => {
  electron.ipcRenderer.on('setSliceType', (_, sliceTypeName: string) => {
    // get sliceType object from the name property
    const sliceType = Object.values(sliceTypeMap).find(
      (sliceTypeValue) => sliceTypeValue.name === sliceTypeName
    )
    if (sliceType === undefined) {
      throw new Error(`Invalid slice type: ${sliceTypeName}`)
    }
    nv.opts.sagittalNoseLeft = sliceType.noseLeft
    nv.opts.multiplanarShowRender = sliceType.showRender
    if (sliceTypeName === 'mosaic') {
      nv.setSliceMosaicString('A 0 1 2')
      console.log('n slice mosaic string', nv.sliceMosaicString)
      if (onMosaicStringChange) {
        onMosaicStringChange(nv.sliceMosaicString)
      }
      return
    }
    // issue1134: unset mosaic string for non-mosaic views
    nv.setSliceMosaicString('')
    nv.setSliceType(sliceType.sliceType)
  })
}

export const registerLayoutHandler = (nv: Niivue): void => {
  electron.ipcRenderer.on('setLayout', (_, layout: string) => {
    const layoutValue = layouts[layout]
    if (layoutValue === undefined) {
      throw new Error(`Invalid layout: ${layout}`)
    }
    nv.setMultiplanarLayout(layoutValue)
  })
}

export const registerDragModeHandler = (nv: Niivue): void => {
  electron.ipcRenderer.on('setDragMode', (_, dragMode: number) => {
    nv.opts.dragMode = dragMode
  })
}

export const registerOrientationLabelsInMarginHandler = (nv: Niivue): void => {
  electron.ipcRenderer.on('setOrientationLabelsInMargin', (_, state: boolean) => {
    nv.opts.tileMargin = state ? -1 : 0
    nv.updateGLVolume()
  })
}

export const registerMultiplanarEqualSizeHandler = (nv: Niivue): void => {
  electron.ipcRenderer.on('setMultiplanarEqualSize', (_, state: boolean) => {
    nv.opts.multiplanarEqualSize = state
    nv.updateGLVolume()
  })
}

export const registerCrosshairHandler = (nv: Niivue): void => {
  electron.ipcRenderer.on('setCrosshair', (_, crosshairValue: boolean) => {
    // the menu item is a checkbox, so the value will be a boolean.
    // We convert the boolean to a width value since a width of 0 will hide the crosshair.
    const crosshairWidth = crosshairValue ? 1 : 0
    nv.setCrosshairWidth(crosshairWidth)
  })
}

export const register3DCrosshairHandler = (nv: Niivue): void => {
  electron.ipcRenderer.on('setCrosshair3D', (_, state: boolean) => {
    nv.opts.show3Dcrosshair = state
    nv.drawScene()
  })
}

export const registerOrientationCubeHandler = (nv: Niivue): void => {
  electron.ipcRenderer.on('setOrientationCube', (_, showOrientationCube: boolean) => {
    nv.opts.isOrientCube = showOrientationCube
    nv.drawScene()
  })
}

export const registerOrientationLabelsHeightHandler = (nv: Niivue): void => {
  electron.ipcRenderer.on('setOrientationLabelsHeight', (_, orientationLabelHeight: string) => {
    nv.opts.textHeight = orientationLabelMap[orientationLabelHeight]
    nv.drawScene()
  })
}

export const registerOrientationLabelsPositionHandler = (nv: Niivue): void => {
  // corner or centered
  electron.ipcRenderer.on('setOrientationLabelsPosition', (_, position: string) => {
    switch (position) {
      case 'corner':
        nv.setCornerOrientationText(true)
        break
      case 'centered':
        nv.setCornerOrientationText(false)
        break
    }
  })
}

export const registerRulerHander = (nv: Niivue): void => {
  electron.ipcRenderer.on('setRuler', (_, state: boolean) => {
    nv.opts.isRuler = state
    nv.drawScene()
  })
}

export const registerColorbarHandler = (nv: Niivue): void => {
  electron.ipcRenderer.on('setColorbar', (_, state: boolean) => {
    nv.opts.isColorbar = state
    nv.updateGLVolume()
  })
}

export const registerPreferencesDialogHandler = (setOpen: (v: boolean) => void): void => {
  window.electron.ipcRenderer.on('openPreferencesDialog', () => {
    console.log('[Renderer] Received openPreferencesDialog')
    setOpen(true)
  })
}

export const registerResetPreferencesHandler = (): void => {
  window.electron.ipcRenderer.on('resetPreferencesConfirm', async () => {
    const confirmed = window.confirm('Are you sure you want to reset all preferences?')
    if (confirmed) {
      await window.electron.ipcRenderer.invoke('resetPreferences')
      window.location.reload() // or reinitialize your app logic
    }
  })
}

export const registerLabelManagerDialogHandler = (
  setOpen: (v: boolean) => void,
  setEditMode: (v: boolean) => void
): void => {
  window.electron.ipcRenderer.on('openLabelManagerDialog', () => {
    setEditMode(false)
    setOpen(true)
  })
}

// add near the other register* handlers in your renderer handlers file
export const registerToggleColorBarsHandler = (
  nv: Niivue,
  setShowColorBars?: (v: boolean) => void
): void => {
  // main process will send ('toggle-color-bars', boolean)
  electron.ipcRenderer.on('toggle-color-bars', (_: any, checked: boolean) => {
    const show = Boolean(checked)

    // 1) Update Niivue's internal option so the native colorbar (if used) updates
    try {
      nv.opts.isColorbar = show
      // prefer updateGLVolume which re-uploads uniforms / textures used by the GL renderer
      if (typeof nv.updateGLVolume === 'function') nv.updateGLVolume()
      else if (typeof nv.drawScene === 'function') nv.drawScene()
    } catch (err) {
      // guard against NV not being initialized yet
      // console.warn('Failed to set nv colorbar option:', err)
    }

    // 2) Call optional React state setter so the app can show a dedicated ColorBars panel
    if (typeof setShowColorBars === 'function') {
      setShowColorBars(show)
    }
  })
}

