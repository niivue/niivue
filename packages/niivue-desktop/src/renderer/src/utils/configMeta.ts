// utils/configMeta.ts

export const generalHandledKeys = [
  'show3Dcrosshair',
  'crosshairColor',
  'fontColor',
  'backColor',
  'isAlphaClipDark',
  'heroSliceType',
  'heroImageFraction'
]

export const groupedConfigMeta = {
  Text: [
    ['textHeight', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: true, requiresUpdateGLVolume: false }],
    ['isCornerOrientationText', { type: 'boolean', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['isOrientationTextVisible', { type: 'boolean', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['loadingText', { type: 'text', requiresDraw: true, requiresUpdateGLVolume: false }]
  ],
  Colors: [
    ['colorbarHeight', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }],
    ['colorbarWidth', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }],
    ['showColorbarBorder', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['backColor', { type: 'color', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['crosshairColor', { type: 'color', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['fontColor', { type: 'color', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['selectionBoxColor', { type: 'color', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['clipPlaneColor', { type: 'color', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['rulerColor', { type: 'color', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['colorbarMargin', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }],
    ['isColorbar', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['legendBackgroundColor', { type: 'color', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['legendTextColor', { type: 'color', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['measureTextColor', { type: 'color', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['measureLineColor', { type: 'color', requiresDraw: true, requiresUpdateGLVolume: false }]
  ],
  Crosshair: [
    ['crosshairWidth', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: true, requiresUpdateGLVolume: false }],
    ['crosshairWidthUnit', { type: 'enum', enum: ['voxels', 'mm', 'percent'], requiresDraw: true, requiresUpdateGLVolume: false }],
    ['crosshairGap', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: true, requiresUpdateGLVolume: false }],
    ['show3Dcrosshair', { type: 'boolean', requiresDraw: true, requiresUpdateGLVolume: false }]
  ],
  Measurement: [
    ['rulerWidth', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: true, requiresUpdateGLVolume: false }],
    ['isRuler', { type: 'boolean', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['showMeasureUnits', { type: 'boolean', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['measureTextJustify', { type: 'enum', enum: ['start', 'center', 'end'], requiresDraw: true, requiresUpdateGLVolume: false }],
    ['measureTextHeight', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: true, requiresUpdateGLVolume: false }]
  ],
  Clipping: [
    ['clipThick', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }],
    ['clipPlaneHotKey', { type: 'text', requiresDraw: false, requiresUpdateGLVolume: false }],
    ['isAlphaClipDark', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }]
  ],
  SlicingAndMosaic: [
    ['sliceType', { type: 'enum', enum: 'SLICE_TYPE', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['heroSliceType', { type: 'enum', enum: 'SLICE_TYPE', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['isSliceMM', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['isV1SliceShader', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['sliceMosaicString', { type: 'text', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['centerMosaic', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }]
  ],
  HeroImage: [
    ['heroImageFraction', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }]
  ],
  Interaction: [
    ['doubleTouchTimeout', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: false }],
    ['longTouchTimeout', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: false }],
    ['dragMode', { type: 'enum', enum: 'DRAG_MODE', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['dragModePrimary', { type: 'enum', enum: 'DRAG_MODE_PRIMARY', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['isForceMouseClickToVoxelCenters', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['dragAndDropEnabled', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: false }],
    ['interactive', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: false }]
  ],
  Rendering: [
    ['isNearestInterpolation', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['isAdditiveBlend', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['renderOverlayBlend', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }]
  ],
  ZoomAndScale: [
    ['yoke3Dto2DZoom', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }]
  ],
  Drawing: [
    ['drawingEnabled', { type: 'boolean', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['penValue', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: true, requiresUpdateGLVolume: false }],
    ['penSize', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: true, requiresUpdateGLVolume: false }],
    ['isFilledPen', { type: 'boolean', requiresDraw: true, requiresUpdateGLVolume: false }],
    ['maxDrawUndoBitmaps', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: false }]
  ],
  Segmentation: [
    ['clickToSegment', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['clickToSegmentRadius', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }],
    ['clickToSegmentBright', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['clickToSegmentAutoIntensity', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['clickToSegmentIntensityMax', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }],
    ['clickToSegmentIntensityMin', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }],
    ['clickToSegmentPercent', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }],
    ['clickToSegmentMaxDistanceMM', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }],
    ['clickToSegmentIs2D', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }]
  ],
  Layout: [
    ['tileMargin', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }]
  ],
  MultiPlanarViews: [
    ['multiplanarPadPixels', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: true }],
    ['multiplanarForceRender', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['multiplanarEqualSize', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['multiplanarShowRender', { type: 'enum', enum: 'SHOW_RENDER', requiresDraw: false, requiresUpdateGLVolume: true }],
    ['multiplanarLayout', { type: 'enum', enum: 'MULTIPLANAR_TYPE', requiresDraw: false, requiresUpdateGLVolume: true }]
  ],
  Legend: [
    ['showLegend', { type: 'boolean', requiresDraw: true, requiresUpdateGLVolume: false }]
  ],
  File: [
    ['thumbnail', { type: 'text', requiresDraw: false, requiresUpdateGLVolume: false }]
  ],
  Canvas: [
    ['isResizeCanvas', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: false }]
  ],
  KeyboardShortcuts: [
    ['viewModeHotKey', { type: 'text', requiresDraw: false, requiresUpdateGLVolume: false }],
    ['keyDebounceTime', { type: 'slider', min: 0, max: 1, step: 0.01, requiresDraw: false, requiresUpdateGLVolume: false }]
  ],
  Logging: [
    ['logLevel', { type: 'enum', enum: ['debug', 'info', 'warn', 'error', 'fatal', 'silent'], requiresDraw: false, requiresUpdateGLVolume: false }],
    ['isRadiologicalConvention', { type: 'boolean', requiresDraw: false, requiresUpdateGLVolume: true }]
  ]
} as const
