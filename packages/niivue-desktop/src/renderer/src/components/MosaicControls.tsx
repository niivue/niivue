// src/components/MosaicControls.tsx

import React, { useEffect, useState } from 'react'
import { useSelectedInstance } from '../AppContext.js'
import { Button, TextField, Switch } from '@radix-ui/themes'
import { calculateMosaic, SliceOrientation } from '../utils/mosaics.js'

function shiftToken(token: string, delta: number): string {
  const match = token.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/)
  if (!match) return token
  const [, numericPart, leftover] = match
  const num = parseFloat(numericPart)
  if (isNaN(num)) return token
  return String(num + delta) + leftover
}

function updateMosaicForSelectedOrientation(
  mosaicStr: string,
  selected: string,
  delta: number
): string {
  const tokens = mosaicStr.trim().split(/\s+/)
  let currentOrientation: string | null = null
  const newTokens: string[] = []
  let i = 0
  while (i < tokens.length) {
    const raw = tokens[i]
    let token = raw
    let trail = ''
    if (token.endsWith(';')) {
      trail = ';'
      token = token.slice(0, -1)
    }
    if (/^(A|C|S)$/.test(token)) {
      currentOrientation = token
      newTokens.push(token + trail)
      i++
      continue
    }
    if (token === 'R' && tokens[i + 1] === 'X') {
      newTokens.push('R', 'X')
      i += 2
      if (i < tokens.length) {
        let nxt = tokens[i]
        let t2 = ''
        if (nxt.endsWith(';')) {
          t2 = ';'
          nxt = nxt.slice(0, -1)
        }
        newTokens.push(nxt + t2)
        i++
      }
      continue
    }
    const numMatch = token.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/)
    if (numMatch) {
      if (currentOrientation === selected) {
        newTokens.push(shiftToken(token, delta) + trail)
      } else {
        newTokens.push(token + trail)
      }
      i++
      continue
    }
    newTokens.push(token + trail)
    i++
  }
  return newTokens.join(' ')
}

export function MosaicControls(): JSX.Element {
  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current
  if (!nv || !instance) return <></>

  const [selectedOrientation, setSelectedOrientation] = useState<'A' | 'C' | 'S'>('A')
  const [showAllSlices, setShowAllSlices] = useState(false)
  const [cachedMosaic, setCachedMosaic] = useState<string | null>(null)
  const [centerMosaic, setCenterMosaic] = useState<boolean>(instance.opts.centerMosaic ?? true)
  const [mosaicStr, setMosaicStr] = useState<string>(
    instance.opts.sliceMosaicString?.trim() || 'A -10 0 20; C -10 0; S -10 0 20'
  )

  // Reset cache when switching documents
  useEffect(() => {
    setMosaicStr(instance.opts.sliceMosaicString?.trim() || 'A -10 0 20; C -10 0; S -10 0 20')
    setCachedMosaic(null)
    setCenterMosaic(instance.opts.centerMosaic ?? true)
    setShowAllSlices(false)
  }, [instance.id])

  // Update mosaic string when toggling showAllSlices
  useEffect(() => {
    if (!nv) return
    if (showAllSlices) {
      setCachedMosaic(mosaicStr)
      const orientEnum =
        selectedOrientation === 'A'
          ? SliceOrientation.AXIAL
          : selectedOrientation === 'C'
            ? SliceOrientation.CORONAL
            : SliceOrientation.SAGITTAL
      const canvas = nv.gl.canvas as HTMLCanvasElement
      const vol = nv.volumes[0]
      if (!vol) return
      const { mosaicString } = calculateMosaic(vol, canvas.width, canvas.height, orientEnum)
      setMosaicStr(mosaicString)
    } else if (cachedMosaic !== null) {
      setMosaicStr(cachedMosaic)
      setCachedMosaic(null)
    }
  }, [showAllSlices, selectedOrientation, nv])

  // Apply changes to Niivue and instance state
  useEffect(() => {
    if (!nv) return
    nv.opts.centerMosaic = centerMosaic
    nv.setSliceMosaicString(mosaicStr)
    instance.setOpts({
      centerMosaic,
      sliceMosaicString: mosaicStr
    })
    nv.drawScene()
  }, [nv, mosaicStr, centerMosaic])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setMosaicStr(e.target.value)
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>): void => {
    if (showAllSlices) return
    e.preventDefault()
    const step = 5
    setMosaicStr((prev) =>
      updateMosaicForSelectedOrientation(prev, selectedOrientation, e.deltaY < 0 ? step : -step)
    )
  }

  const handleScroll = (delta: number): void => {
    if (showAllSlices) return
    setMosaicStr((prev) => updateMosaicForSelectedOrientation(prev, selectedOrientation, delta))
  }

  const axisNames = { A: 'Axial', C: 'Coronal', S: 'Sagittal' }

  return (
    <div
      style={{
        margin: '1rem',
        padding: '0.5rem',
        background: 'rgba(255,255,255,0.9)',
        borderRadius: 4,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        maxHeight: 'none',
        overflow: 'visible'
      }}
      onWheel={handleWheel}
    >
      <h3 style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Mosaic Settings</h3>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '0.5rem',
          justifyContent: 'space-between'
        }}
      >
        <label htmlFor="showAll" style={{ marginRight: '2rem' }}>
          Show all {axisNames[selectedOrientation]} slices
        </label>
        <Switch id="showAll" checked={showAllSlices} onCheckedChange={setShowAllSlices} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}
      >
        <label htmlFor="centerMosaic">Center Mosaic</label>
        <Switch
          id="centerMosaic"
          checked={centerMosaic}
          onCheckedChange={(checked) => setCenterMosaic(checked as boolean)}
        />
      </div>

      <TextField.Root
        type="text"
        value={mosaicStr}
        onChange={handleInputChange}
        disabled={showAllSlices}
        title={mosaicStr}
        style={{ width: '100%', marginBottom: '0.5rem' }}
      />

      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>Orientation:</label>
        <select
          value={selectedOrientation}
          onChange={(e) => setSelectedOrientation(e.target.value as 'A' | 'C' | 'S')}
          disabled={showAllSlices}
        >
          <option value="A">Axial (A)</option>
          <option value="C">Coronal (C)</option>
          <option value="S">Sagittal (S)</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
        <Button variant="outline" onClick={() => handleScroll(5)} disabled={showAllSlices}>
          Scroll Up
        </Button>
        <Button variant="outline" onClick={() => handleScroll(-5)} disabled={showAllSlices}>
          Scroll Down
        </Button>
      </div>

      <p style={{ fontStyle: 'italic', color: '#666' }}>
        {showAllSlices
          ? `Showing full ${axisNames[selectedOrientation]} mosaic.`
          : 'Tip: Use the mouse wheel or buttons to shift slice positions (except after R X).'}
      </p>
    </div>
  )
}
