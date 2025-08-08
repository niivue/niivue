import { SLICE_TYPE } from "@niivue/niivue";

export const groupedConfigMeta = {
  Text: [
    ['isOrientationTextVisible', { type: 'boolean', requiresDraw: true }],
    ['measureTextHeight', { type: 'slider', min: 0, max: 0.2, step: 0.01, requiresDraw: true }],
    ['fontSizeScaling', { type: 'slider', min: 0.1, max: 2.0, step: 0.05, requiresDraw: true }],
    ['fontMinPx', { type: 'slider', min: 8, max: 36, step: 1, requiresDraw: true }],
    ['fontColor', { type: 'color', requiresDraw: true }],
    ['loadingText', { type: 'text', requiresDraw: true }]
  ],

  Appearance: [
    ['backColor', { type: 'color', requiresDraw: true }],
    ['isAlphaClipDark', { type: 'boolean', requiresDraw: true }],    
    ['colorbarWidth', { type: 'slider', min: 0, max: 1, step: 0.01, requiresUpdateGLVolume: true }],
    ['showColorbarBorder', { type: 'boolean', requiresUpdateGLVolume: true }],
    ['legendBackgroundColor', { type: 'color', requiresDraw: true }],
    ['legendTextColor', { type: 'color', requiresDraw: true }]
  ],

  Crosshair: [
    ['crosshairColor', { type: 'color', requiresDraw: true }],
    ['crosshairWidth', { type: 'slider', min: 0, max: 10, step: 1, requiresDraw: true }],
    ['crosshairGap', { type: 'slider', min: 0, max: 10, step: 1, requiresDraw: true }],
    ['show3Dcrosshair', { type: 'boolean', requiresDraw: true }]
  ],

  Measurement: [
    ['rulerColor', { type: 'color', requiresDraw: true }],
    ['rulerWidth', { type: 'slider', min: 1, max: 10, step: 1, requiresDraw: true }],
    ['isRuler', { type: 'boolean', requiresDraw: true }],
    ['showMeasureUnits', { type: 'boolean', requiresDraw: true }]
  ],

  Hero: [
    [
      'heroSliceType',
      { type: 'enum', enum: SLICE_TYPE, exclude: ['multiplanar'], requiresDraw: true }
    ],
    ['heroImageFraction', { type: 'slider', min: 0, max: 1, step: 0.1, requiresDraw: true }]
  ]
} as const
