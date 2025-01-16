import React, { useState, useContext } from 'react'
import { SLICE_TYPE } from '@niivue/niivue'
import { Text, Slider } from '@radix-ui/themes'
import { AppContext } from '../App'

const OptionsTab: React.FC = () => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  const [textHeight, setTextHeight] = useState([nv.opts.textHeight])
  const [colorbarHeight, setColorbarHeight] = useState([nv.opts.colorbarHeight])
  const [heroSliceType, setHeroSliceType] = useState(nv.opts.heroSliceType)

  const handleTextHeightChange = (value: number[]): void => {
    setTextHeight(value)
    nv.opts.textHeight = value[0]
    nv.drawScene()
  }

  const handleColorbarHeightChange = (value: number[]): void => {
    setColorbarHeight(value)
    nv.opts.colorbarHeight = value[0]
    nv.drawScene()
  }

  const handleHeroSliceTypeChange = (value: SLICE_TYPE): void => {
    setHeroSliceType(value)
    nv.opts.heroSliceType = value
    nv.drawScene()
  }

  return (
    <div className="flex flex-col p-4">
      <Text size="3" weight="bold" className="mb-4">
        Options Tab
      </Text>

      {/* Text Height Slider */}
      <div className="flex flex-col mb-4">
        <Text size="2" className="mb-1">
          Text Height
        </Text>
        <Slider
          size="1"
          min={0}
          max={0.2}
          step={0.01}
          value={textHeight}
          className="mb-2"
          style={{ width: '90%' }}
          onValueChange={handleTextHeightChange}
        />
      </div>

      {/* Colorbar Height Slider */}
      <div className="flex flex-col mb-4">
        <Text size="2" className="mb-1">
          Colorbar Height
        </Text>
        <Slider
          size="1"
          min={0}
          max={0.2}
          step={0.01}
          value={colorbarHeight}
          className="mb-2"
          style={{ width: '90%' }}
          onValueChange={handleColorbarHeightChange}
        />
      </div>

      {/* Hero Slice Type Dropdown */}
      <div className="flex flex-col mb-4">
        <Text size="2" className="mb-1">
          Hero Slice Type
        </Text>
        <select
          value={heroSliceType}
          onChange={(e) => handleHeroSliceTypeChange(parseInt(e.target.value) as SLICE_TYPE)}
          className="p-2 border rounded"
        >
          {Object.entries(SLICE_TYPE).map(([key, value]) => (
            <option key={key} value={value}>
              {key}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default OptionsTab
