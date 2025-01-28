import { SHOW_RENDER, SLICE_TYPE } from '@niivue/niivue'
export const sliceTypeMap = {
  '3D Render': {
    name: '3D Render',
    sliceType: SLICE_TYPE.RENDER,
    showRender: SHOW_RENDER.ALWAYS,
    noseLeft: false
  },
  Axial: {
    name: 'axial',
    sliceType: SLICE_TYPE.AXIAL,
    showRender: SHOW_RENDER.NEVER,
    noseLeft: false
  },
  Coronal: {
    name: 'coronal',
    sliceType: SLICE_TYPE.CORONAL,
    showRender: SHOW_RENDER.NEVER,
    noseLeft: false
  },
  Sagittal: {
    name: 'sagittal',
    sliceType: SLICE_TYPE.SAGITTAL,
    showRender: SHOW_RENDER.NEVER,
    noseLeft: false
  },
  'Sagittal (nose left)': {
    name: 'sagittal_nose_left',
    sliceType: SLICE_TYPE.SAGITTAL,
    showRender: SHOW_RENDER.NEVER,
    noseLeft: true
  },
  Multiplanar: {
    name: 'multiplanar',
    sliceType: SLICE_TYPE.MULTIPLANAR,
    showRender: SHOW_RENDER.NEVER,
    noseLeft: false
  },
  'Multiplanar + 3D render': {
    name: 'multiplanar_3d_render',
    sliceType: SLICE_TYPE.MULTIPLANAR,
    showRender: SHOW_RENDER.ALWAYS,
    noseLeft: false
  },
  mosaic: {
    name: 'mosaic',
    sliceType: -1,
    showRender: SHOW_RENDER.NEVER,
    noseLeft: false
  }
}
