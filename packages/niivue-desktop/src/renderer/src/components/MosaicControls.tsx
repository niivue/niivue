import React, { useState, useEffect, useContext } from 'react'
import { AppContext } from '../App'
import { Niivue } from '@niivue/niivue'
import { Button, TextField } from '@radix-ui/themes'

/**
 * shiftToken:
 * Extracts the leading numeric part from a token and adds delta,
 * preserving any trailing characters.
 * E.g., "20;" shifted by 5 becomes "25;".
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
 * This function parses the mosaic string token by token while tracking the current orientation.
 * For every numeric token encountered while the current orientation matches the user-selected one,
 * shift it by delta—except when the token immediately follows an "R" token that is directly followed by an "X" token.
 *
 * In that case, "R" and "X" are pushed unchanged and the subsequent numeric token is skipped (left as is).
 */
function updateMosaicForSelectedOrientation(
  mosaicStr: string,
  selected: string,
  delta: number
): string {
  // Split the mosaic string into tokens by whitespace.
  const tokens = mosaicStr.trim().split(/\s+/)
  let currentOrientation: string | null = null
  const newTokens: string[] = []
  let i = 0
  while (i < tokens.length) {
    let rawToken = tokens[i]
    // Check for trailing semicolon and remove it temporarily.
    let token = rawToken
    let trailing = ""
    if (token.endsWith(";")) {
      trailing = ";"
      token = token.slice(0, -1)
    }
    // If token is exactly an orientation letter, update the current orientation.
    if (/^(A|C|S)$/.test(token)) {
      currentOrientation = token
      newTokens.push(token + trailing)
      i++
      continue
    }
    // Check if token is exactly "R" and if next token is "X".
    if (token === "R" && i + 1 < tokens.length && tokens[i + 1] === "X") {
      // Push "R" and "X" as is.
      newTokens.push("R")
      newTokens.push("X")
      i += 2
      // If there is a next token (assumed to be numeric) then skip updating it.
      if (i < tokens.length) {
        let nextRaw = tokens[i]
        let nextToken = nextRaw
        let nextTrailing = ""
        if (nextToken.endsWith(";")) {
          nextTrailing = ";"
          nextToken = nextToken.slice(0, -1)
        }
        newTokens.push(nextToken + nextTrailing)
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
    // Otherwise, push the token unchanged.
    newTokens.push(token + trailing)
    i++
  }
  return newTokens.join(" ")
}

export function MosaicControls() {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current as Niivue

  // Initialize the mosaic string from the Niivue instance (or use a default)
  const initialMosaicStr =
    nv.opts.sliceMosaicString && nv.opts.sliceMosaicString.trim() !== ''
      ? nv.opts.sliceMosaicString
      : 'A -10 0 20; C -10 0; S -10 0 20'
  const [mosaicStr, setMosaicStr] = useState<string>(initialMosaicStr)
  
  // Let the user select which orientation's slices (groups) should be updated.
  const [selectedOrientation, setSelectedOrientation] = useState<'A' | 'C' | 'S'>('A')

  // Update Niivue whenever the mosaic string changes.
  useEffect(() => {
    if (!nv) return
    nv.setSliceMosaicString(mosaicStr)
    nv.drawScene()
  }, [nv, mosaicStr])

  // Handler for manual input changes.
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMosaicStr(e.target.value)
  }

  // Mouse wheel handler: increment or decrement based on scroll direction.
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const step = 5 // Adjust as desired
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
          Orientation:
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
        Tip: The mouse wheel (or buttons) will update all numeric slice positions for the selected orientation—
        except when a number follows an "R X" pair, which is left unchanged.
      </p>
    </div>
  )
}
