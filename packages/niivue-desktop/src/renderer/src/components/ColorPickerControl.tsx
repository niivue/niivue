import React, { useState } from 'react'
import { SketchPicker, ColorResult } from 'react-color'

interface ColorPickerControlProps {
  label?: string // Optional label
  color: number[]
  onChange: (color: number[]) => void
}

const ColorPickerControl: React.FC<ColorPickerControlProps> = ({ label, color, onChange }) => {
  const [isPickerVisible, setIsPickerVisible] = useState(false)

  const handleColorChange = (selectedColor: ColorResult): void => {
    const rgbaColor = [
      selectedColor.rgb.r / 255,
      selectedColor.rgb.g / 255,
      selectedColor.rgb.b / 255,
      selectedColor.rgb.a ?? 1
    ]
    onChange(rgbaColor)
    setIsPickerVisible(false)
  }

  return (
    <div className="flex flex-col mb-4">
      {label && <label className="mb-1">{label}</label>}
      <div
        style={{
          width: '24px',
          height: '24px',
          backgroundColor: `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, ${color[3]})`,
          border: '1px solid #ccc',
          cursor: 'pointer'
        }}
        onClick={() => setIsPickerVisible(!isPickerVisible)}
      />
      {isPickerVisible && (
        <SketchPicker
          color={{
            r: color[0] * 255,
            g: color[1] * 255,
            b: color[2] * 255,
            a: color[3]
          }}
          onChangeComplete={handleColorChange}
        />
      )}
    </div>
  )
}

export default ColorPickerControl
