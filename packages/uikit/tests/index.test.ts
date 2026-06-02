// @vitest-environment happy-dom
// The package entry (../src) registers a window 'load' listener at import
// time for the demo bootstrap, so a DOM environment is required to import it.
import {
  UIKRenderer,
  UIKFont,
  UIKSlider,
  UIKColormapSelector,
  UIK_VERSION,
  checkUIKitCompatibility,
  MIN_TEXT_DEVICE_PX
} from '../src'
import { describe, it, expect } from 'vitest'

// Real Roboto-Regular MSDF atlas metrics (packages/uikit/src/fonts/Roboto-Regular.json).
const ROBOTO_METRICS = {
  distanceRange: 2,
  size: 59.65625,
  lineHeight: 1.171875,
  ascender: 0.927734375,
  descender: -0.244140625,
  underlineY: -0.09765625,
  underlineThickness: 0.048828125,
  mets: {}
}

function makeFont(): UIKFont {
  // fitTextScale is pure math over fontMetrics — no GL needed, so a stub
  // context is fine. Populate metrics and mark the font loaded by hand.
  const font = new UIKFont({} as unknown as WebGL2RenderingContext)
  ;(font as unknown as { fontMetrics: typeof ROBOTO_METRICS }).fontMetrics = ROBOTO_METRICS
  ;(font as unknown as { isFontLoaded: boolean }).isFontLoaded = true
  return font
}

describe('UIKFont.fitTextScale', () => {
  const em = ROBOTO_METRICS.size
  const lineSpan = ROBOTO_METRICS.ascender - ROBOTO_METRICS.descender

  it('returns 0 when the font is not loaded', () => {
    const font = new UIKFont({} as unknown as WebGL2RenderingContext)
    expect(font.fitTextScale(35, 0.4, 0.5)).toBe(0)
  })

  it('floors the rendered em at MIN_TEXT_DEVICE_PX on a standard-DPR box', () => {
    // 35 px button at DPR 1: the 40% target (~14 px em) is below the floor.
    const font = makeFont()
    const scale = font.fitTextScale(35, 0.4, 0.5)
    expect(scale * em).toBeCloseTo(MIN_TEXT_DEVICE_PX, 5)
    // Floor must win over the fraction-based size.
    expect(scale * em).toBeGreaterThan(35 * 0.4)
  })

  it('leaves a high-DPR box on its fraction-based size (floor not triggered)', () => {
    // Same button at DPR 2 (70 device px): 40% target (~28 px em) clears the floor.
    const font = makeFont()
    const scale = font.fitTextScale(70, 0.4, 0.5)
    expect(scale * em).toBeCloseTo(70 * 0.4, 5)
    expect(scale * em).toBeGreaterThan(MIN_TEXT_DEVICE_PX)
  })

  it('shrinks to fit when the element is too short for the floor', () => {
    // A 12 px row cannot fit a 20 px em; the line must fit within the box.
    const font = makeFont()
    const scale = font.fitTextScale(12, 0.6, 0.45)
    const lineHeightPx = scale * lineSpan * em
    expect(lineHeightPx).toBeLessThanOrEqual(12)
    expect(scale * em).toBeLessThan(MIN_TEXT_DEVICE_PX)
  })

  it('never exceeds maxScale', () => {
    const font = makeFont()
    expect(font.fitTextScale(1000, 0.6, 0.45)).toBeCloseTo(0.45, 5)
  })

  it('returns 0 for a degenerate line span (ascender === descender)', () => {
    const font = new UIKFont({} as unknown as WebGL2RenderingContext)
    ;(font as any).fontMetrics = { ...ROBOTO_METRICS, ascender: 0, descender: 0 }
    ;(font as any).isFontLoaded = true
    expect(font.fitTextScale(40, 0.4, 0.5)).toBe(0)
  })

  it('returns 0 for a non-finite em size', () => {
    const font = new UIKFont({} as unknown as WebGL2RenderingContext)
    ;(font as any).fontMetrics = { ...ROBOTO_METRICS, size: NaN }
    ;(font as any).isFontLoaded = true
    expect(font.fitTextScale(40, 0.4, 0.5)).toBe(0)
  })
})

// Pure-logic component tests — constructors take a renderer but don't touch
// WebGL, so a stub is sufficient.
const stubRenderer = {} as unknown as UIKRenderer

describe('UIKSlider.setValue', () => {
  const makeSlider = (cfg: Record<string, unknown> = {}): UIKSlider =>
    new UIKSlider(stubRenderer, { bounds: [0, 0, 100, 20], min: 0, max: 1, value: 0.5, ...cfg } as any)

  it('coerces a non-finite value to the minimum', () => {
    const s = makeSlider({ min: 0.2, max: 0.8 })
    s.setValue(NaN)
    expect(s.getValue()).toBe(0.2)
  })

  it('keeps a stepped value within [min, max]', () => {
    const s = makeSlider({ min: 0.05, max: 0.95, step: 0.5 })
    s.setValue(0.95)
    const v = s.getValue()
    expect(v).toBeGreaterThanOrEqual(0.05)
    expect(v).toBeLessThanOrEqual(0.95)
  })

  it('does not poison the value when max === min', () => {
    const s = makeSlider({ min: 1, max: 1, value: 1 })
    s.setValue(5)
    expect(Number.isFinite(s.getValue())).toBe(true)
    expect(s.getValue()).toBe(1)
  })
})

describe('UIKColormapSelector selection', () => {
  const make = (): UIKColormapSelector =>
    new UIKColormapSelector(stubRenderer, {
      bounds: [0, 0, 200, 120],
      selectedColormap: 'gray',
      colormaps: ['gray', 'plasma', 'viridis'],
      onColormapChange: () => {}
    })

  it('snaps an unknown colormap to the first entry so getter matches the UI', () => {
    const c = make()
    c.setSelectedColormap('does-not-exist')
    expect(c.getSelectedColormap()).toBe('gray')
  })

  it('normalizes an unknown initial colormap in the constructor', () => {
    const c = new UIKColormapSelector(stubRenderer, {
      bounds: [0, 0, 200, 120],
      selectedColormap: 'does-not-exist',
      colormaps: ['gray', 'plasma', 'viridis'],
      onColormapChange: () => {}
    })
    // Highlighted row is 0; the getter must agree rather than echo the unknown.
    expect(c.getSelectedColormap()).toBe('gray')
  })

  it('reports no hovered colormap initially', () => {
    expect(make().getHoveredColormap()).toBeNull()
  })

  it('does not hover or select with an empty colormap list', () => {
    const c = new UIKColormapSelector(stubRenderer, {
      bounds: [0, 0, 100, 100],
      selectedColormap: 'gray',
      colormaps: [],
      onColormapChange: () => {}
    })
    // A mousemove inside the bounds must not divide by zero or set a bogus index.
    const handled = c.handleMouseEvent({ type: 'mousemove', offsetX: 10, offsetY: 10 } as unknown as MouseEvent)
    expect(handled).toBe(false)
    expect(c.getHoveredColormap()).toBeNull()
  })
})

describe('UIKit exports', () => {
  it('should export UIKRenderer class', () => {
    expect(UIKRenderer).toBeDefined()
    expect(typeof UIKRenderer).toBe('function')
  })

  it('should export UIKFont class', () => {
    expect(UIKFont).toBeDefined()
    expect(typeof UIKFont).toBe('function')
  })

  it('should export version information', () => {
    expect(UIK_VERSION).toBeDefined()
    expect(typeof UIK_VERSION).toBe('string')
    expect(UIK_VERSION).toMatch(/\d+\.\d+\.\d+/)
  })

  it('should export compatibility checker', () => {
    expect(checkUIKitCompatibility).toBeDefined()
    expect(typeof checkUIKitCompatibility).toBe('function')
  })
})
