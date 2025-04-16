import React, { useState, useEffect, useContext } from 'react'
import { AppContext } from '../App'
import { Niivue } from '@niivue/niivue'
import { Button } from '@radix-ui/themes'

export function MosaicControls() {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current as Niivue

  // Array of slice offsets in millimeters.
  const [mosaicSlices, setMosaicSlices] = useState<number[]>([-16, 0, 16, 32, 44, 60, 76])
  // Flag for whether cross-slice lines should be drawn.
  const [crossSliceEnabled, setCrossSliceEnabled] = useState<boolean>(false)

  // Update the mosaic string whenever nv, mosaicSlices, or cross-slice flag change.
  useEffect(() => {
    if (!nv) return
    updateMosaic(mosaicSlices, crossSliceEnabled)
  }, [nv, mosaicSlices, crossSliceEnabled])

  const handleSlicesChange = (newSlices: number[]) => {
    setMosaicSlices(newSlices)
    updateMosaic(newSlices, crossSliceEnabled)
  }

  const shiftSlicesUp = () => {
    // Shift each slice upward by 5 mm.
    const shifted = mosaicSlices.map(val => val + 5)
    handleSlicesChange(shifted)
  }

  const shiftSlicesDown = () => {
    // Shift each slice downward by 5 mm.
    const shifted = mosaicSlices.map(val => val - 5)
    handleSlicesChange(shifted)
  }

  const toggleCrossSlice = () => {
    setCrossSliceEnabled(!crossSliceEnabled)
  }

  // The onWheel event handler: if deltaY is negative (wheel up) shift slices upward, otherwise downward.
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    // On many devices, negative deltaY means scrolling upward.
    if (e.deltaY < 0) {
      shiftSlicesUp()
    } else {
      shiftSlicesDown()
    }
  }

  // Helper: update the mosaic string in Niivue.
  function updateMosaic(slices: number[], crossEnabled: boolean) {
    if (!nv) return

    let mosaicString = ''
    if (crossEnabled) {
      // Insert "X" before each slice token.
      mosaicString = 'A'
      slices.forEach((slice) => {
        mosaicString += ' X ' + slice
      })
    } else {
      mosaicString = 'A ' + slices.join(' ')
    }
    // Set the mosaic string and redraw the scene.
    nv.setSliceMosaicString(mosaicString as unknown as string)
    nv.drawScene()
  }

  return (
    <div
      style={{
        margin: '1rem',
        padding: '0.5rem',
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '4px',
        boxShadow: '0px 2px 4px rgba(0,0,0,0.3)',
      }}
      onWheel={handleWheel}
    >
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 'bold' }}>Mosaic Slices</h3>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
        {/* Using arrow symbols with Button components */}
        <Button onClick={shiftSlicesUp} variant="outline" style={{ fontSize: '1.5rem' }}>
          ▲
        </Button>
        <Button onClick={shiftSlicesDown} variant="outline" style={{ fontSize: '1.5rem' }}>
          ▼
        </Button>
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{ fontWeight: 'bold' }}>
          <input type="checkbox" checked={crossSliceEnabled} onChange={toggleCrossSlice} /> Show Cross Slice
        </label>
      </div>
      <p style={{ margin: '0' }}>Current Slices: {mosaicSlices.join(', ')}</p>
      {/* Hint: inform the user that scrolling the mouse wheel works in this control */}
      <p style={{ marginTop: '0.5rem', fontStyle: 'italic', color: '#666' }}>
        Tip: Use the mouse wheel or the above buttons to scroll through slices.
      </p>
    </div>
  )
}
