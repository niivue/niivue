import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Niivue } from './niivue/index.ts'

const demoImages = [{ url: 'https://niivue.github.io/niivue-demo-images/mni152.nii.gz' }]

const defaultNvOpts = {
  isColorbar: true,
  logLevel: 'info'
}

export function HotGestureDemo() {
  const canvasRef = useRef(null)
  const niivueRef = useRef(null)
  const [primaryDrag, setPrimaryDrag] = useState('crosshair')
  const [secondaryDrag, setSecondaryDrag] = useState('contrast')
  const nvOpts = useMemo(() => ({ ...defaultNvOpts }), [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (!canvasRef.current || niivueRef.current) {
        return
      }
      const nv = new Niivue(nvOpts)
      niivueRef.current = nv
      await nv.attachToCanvas(canvasRef.current)
      nv.setSliceType(nv.sliceTypeAxial)
      await nv.loadVolumes(demoImages)
      if (!cancelled) {
        nv.opts.dragModePrimary = nv.dragModes.crosshair
        nv.opts.dragMode = nv.dragModes.contrast
      }
    }

    init()
    return () => {
      cancelled = true
      niivueRef.current = null
    }
  }, [nvOpts])

  useEffect(() => {
    const nv = niivueRef.current
    if (!nv) {
      return
    }
    nv.opts.dragModePrimary = primaryDrag === 'brightnessContrast' ? 1 : nv.dragModes.crosshair
  }, [primaryDrag])

  useEffect(() => {
    const nv = niivueRef.current
    if (!nv) {
      return
    }
    if (nv.dragModes[secondaryDrag]) {
      nv.opts.dragMode = nv.dragModes[secondaryDrag]
    }
  }, [secondaryDrag])

  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        padding: 16,
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gap: 12
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <strong>NiiVue React Hot Demo</strong>
        <label>
          Primary Drag{' '}
          <select value={primaryDrag} onChange={(e) => setPrimaryDrag(e.target.value)}>
            <option value="crosshair">crosshair</option>
            <option value="brightnessContrast">brightness/contrast</option>
          </select>
        </label>
        <label>
          Secondary Drag{' '}
          <select value={secondaryDrag} onChange={(e) => setSecondaryDrag(e.target.value)}>
            <option value="contrast">contrast</option>
            <option value="pan">pan</option>
            <option value="measurement">measurement</option>
            <option value="slicer3D">slicer3D</option>
            <option value="none">none</option>
          </select>
        </label>
      </div>

      <div style={{ minHeight: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 'min(100%, 1100px)', aspectRatio: '4 / 3', border: '1px solid #2a3242' }}>
          <canvas ref={canvasRef} width={1100} height={825} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
      </div>
    </div>
  )
}
