import { Niivue } from '@niivue/niivue'
import { sliceTypeMap } from '../../../common/sliceTypes'
import { layouts } from '../../../common/layouts'
import { orientationLabelMap } from '../../../common/orientationLabels'

const electron = window.electron

export const registerSliceTypeHandler = (nv: Niivue): void => {
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
