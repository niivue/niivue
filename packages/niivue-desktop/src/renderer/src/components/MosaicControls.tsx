import React, { useState, useEffect, useContext } from 'react'
import { AppContext } from '../App'
import { Niivue } from '@niivue/niivue'
import { Button, TextField } from '@radix-ui/themes'

/**
 * shiftToken:
 * Extracts the leading numeric part from a token and adds delta,
 * preserving any trailing characters.
 * For example, "20;" shifted by 5 becomes "25;".
 */
function shiftToken(token: string, delta: number): string {
  const match = token.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/)
  if (!match) return token
  const numericPart = match[1]
  const leftover = match[2]
  const num = parseFloat(numericPart)
  if (isNaN(num)) return token
  return String(num + delta) + leftover
}

/**
 * updateMosaicForSelectedOrientation:
 *
 * Parses the mosaic string token by token while tracking the current orientation.
 * For every token that begins with a number, if the current orientation equals the
 * user-selected orientation, its numeric part is shifted by delta—unless it immediately
 * follows an "R" token followed by an "X" token (in which case that number is skipped).
 */
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
    let rawToken = tokens[i]
    // Save and remove any trailing semicolon.
    let token = rawToken
    let trailing = ""
    if (token.endsWith(";")) {
      trailing = ";"
      token = token.slice(0, -1)
    }
    // If token exactly matches an orientation letter, set currentOrientation.
    if (/^(A|C|S)$/.test(token)) {
      currentOrientation = token
      newTokens.push(token + trailing)
      i++
      continue
    }
    // If token is exactly "R" and the next token is exactly "X",
    // then push them unchanged and skip the following numeric token.
    if (token === "R" && i + 1 < tokens.length && tokens[i + 1] === "X") {
      newTokens.push("R")
      newTokens.push("X")
      i += 2
      if (i < tokens.length) {
        // Push the next token without modification.
        let nextRaw = tokens[i]
        let nextTrailing = ""
        if (nextRaw.endsWith(";")) {
          nextTrailing = ";"
          nextRaw = nextRaw.slice(0, -1)
        }
        newTokens.push(nextRaw + nextTrailing)
        i++
      }
      continue
    }
    // If token starts with a number...
    const match = token.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/)
    if (match) {
      if (currentOrientation === selected) {
        newTokens.push(shiftToken(token, delta) + trailing)
      } else {
        newTokens.push(token + trailing)
      }
      i++
      continue
    }
    // Otherwise, push token unchanged.
    newTokens.push(token + trailing)
    i++
  }
  return newTokens.join(" ")
}

export function MosaicControls() {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current as Niivue

  // If no mosaic slice string is defined in the Niivue instance, use an empty string.
  const initialMosaicStr =
    nv.opts.sliceMosaicString && nv.opts.sliceMosaicString.trim() !== ''
      ? nv.opts.sliceMosaicString
      : ''

  const [mosaicStr, setMosaicStr] = useState<string>(initialMosaicStr)
  const [selectedOrientation, setSelectedOrientation] = useState<'A' | 'C' | 'S'>('A')

  // Only update Niivue if mosaicStr is non-empty.
  useEffect(() => {
    if (!nv || mosaicStr.trim() === '') return
    nv.setSliceMosaicString(mosaicStr)
    nv.drawScene()
  }, [nv, mosaicStr])

  // Manual input handler.
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMosaicStr(e.target.value)
  }

  // Mouse wheel handler updates the mosaic string based on the selected orientation.
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const step = 5
    const newMosaic = updateMosaicForSelectedOrientation(
      mosaicStr,
      selectedOrientation,
      e.deltaY < 0 ? step : -step
    )
    setMosaicStr(newMosaic)
  }

  // Button handlers.
  const handleScrollUp = () => {
    setMosaicStr(prev =>
      updateMosaicForSelectedOrientation(prev, selectedOrientation, 5)
    )
  }
  const handleScrollDown = () => {
    setMosaicStr(prev =>
      updateMosaicForSelectedOrientation(prev, selectedOrientation, -5)
    )
  }

  // Orientation selection handler.
  const handleOrientationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOrientation(e.target.value as 'A' | 'C' | 'S')
  }

  // If no mosaic string is defined, we avoid rendering the controls.
  if (initialMosaicStr.trim() === '') {
    return <p>Mosaic view is not enabled.</p>
  }

  return (
    <div
      style={{
        margin: '1rem',
        padding: '0.5rem',
        background: 'rgba(255,255,255,0.9)',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}
      onWheel={handleWheel}
    >
      <h3 style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Mosaic Settings</h3>
      <TextField.Root
        type="text"
        value={mosaicStr}
        onChange={handleInputChange}
        style={{ width: '100%', marginBottom: '0.5rem' }}
      />
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>
          Scroll Axis:
        </label>
        <select value={selectedOrientation} onChange={handleOrientationChange}>
          <option value="A">Axial (A)</option>
          <option value="C">Coronal (C)</option>
          <option value="S">Sagittal (S)</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
        <Button variant="outline" onClick={handleScrollUp}>
          Scroll Up
        </Button>
        <Button variant="outline" onClick={handleScrollDown}>
          Scroll Down
        </Button>
      </div>
      <p style={{ fontStyle: 'italic', color: '#666' }}>
        Tip: The mouse wheel (or buttons) will update all numeric slice positions for the selected orientation,
        except when the number immediately follows an "R X" pair.
      </p>
    </div>
  )
}
