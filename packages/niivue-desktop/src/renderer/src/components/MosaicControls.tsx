import React, { useState, useEffect } from 'react'
import { useSelectedInstance } from '../AppContext'
import { Button, TextField, Switch } from '@radix-ui/themes'
import { calculateMosaic, SliceOrientation } from '../utils/mosaics'

function shiftToken(token: string, delta: number): string {
  const match = token.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/)
  if (!match) return token
  const [, numericPart, leftover] = match
  const num = parseFloat(numericPart)
  return isNaN(num) ? token : String(num + delta) + leftover
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
    let token = tokens[i]
    let trail = ''
    if (token.endsWith(';')) {
      trail = ';'
      token = token.slice(0, -1)
    }

    if (/^[ACS]$/.test(token)) {
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
      newTokens.push(
        currentOrientation === selected
          ? shiftToken(token, delta) + trail
          : token + trail
      )
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
  if (!nv) return <></>

  const [selectedOrientation, setSelectedOrientation] = useState<'A' | 'C' | 'S'>('A')
  const [showAllSlices, setShowAllSlices] = useState(false)
  const [cachedMosaic, setCachedMosaic] = useState<string | null>(null)

  const mosaicStr = instance.opts.sliceMosaicString?.trim() || ''
  const centerMosaic = !!instance.opts.centerMosaic

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
      instance.setOpts({ sliceMosaicString: mosaicString })
    } else if (cachedMosaic !== null) {
      instance.setOpts({ sliceMosaicString: cachedMosaic })
      setCachedMosaic(null)
    }
  }, [showAllSlices, selectedOrientation])

  useEffect(() => {
    if (!nv) return
    nv.opts.centerMosaic = centerMosaic
    nv.setSliceMosaicString(mosaicStr)
    nv.drawScene()
  }, [nv, mosaicStr, centerMosaic])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    instance.setOpts({ sliceMosaicString: e.target.value })
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>): void => {
    if (showAllSlices) return
    e.preventDefault()
    const step = 5
    instance.setOpts({
      sliceMosaicString: updateMosaicForSelectedOrientation(
        mosaicStr,
        selectedOrientation,
        e.deltaY < 0 ? step : -step
      )
    })
  }

  const handleScroll = (delta: number): void => {
    if (showAllSlices) return
    instance.setOpts({
      sliceMosaicString: updateMosaicForSelectedOrientation(
        mosaicStr,
        selectedOrientation,
        delta
      )
    })
  }

  const axisNames = { A: 'Axial', C: 'Coronal', S: 'Sagittal' }

  return (
    <div
      style={{
        margin: '1rem',
        padding: '0.5rem',
        background: 'rgba(255,255,255,0.9)',
        borderRadius: 4,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}
      onWheel={handleWheel}
    >
      <h3 style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Mosaic Settings</h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <Switch id="showAll" checked={showAllSlices} onCheckedChange={setShowAllSlices} />
        <label htmlFor="showAll" style={{ marginRight: '2rem' }}>
          Show all {axisNames[selectedOrientation]} slices
        </label>

        <Switch
          id="centerMosaic"
          checked={centerMosaic}
          onCheckedChange={(checked) => instance.setOpts({ centerMosaic: !!checked })}
        />
        <label htmlFor="centerMosaic">Center Mosaic</label>
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
