import { DRAG_MODE } from '@niivue/niivue'

export const dragModeMap = {
  None: DRAG_MODE.none,
  Contrast: DRAG_MODE.contrast,
  'Pan/Zoom': DRAG_MODE.pan,
  Measure: DRAG_MODE.measurement,
  Slicer3D: DRAG_MODE.slicer3D,
  'ROI selection': DRAG_MODE.roiSelection
}
