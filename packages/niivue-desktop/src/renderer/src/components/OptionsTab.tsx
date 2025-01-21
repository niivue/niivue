import React, { useState, useContext } from 'react'
import { Text, Slider, Switch } from '@radix-ui/themes'
import { AppContext } from '../App'
import ColorPickerControl from './ColorPickerControl'

const OptionsTab: React.FC = () => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  const [textHeight, setTextHeight] = useState([nv.opts.textHeight])
  const [show3Dcrosshair, setShow3Dcrosshair] = useState(nv.opts.show3Dcrosshair)
  const [crosshairColor, setCrosshairColor] = useState(nv.opts.crosshairColor)
  const [fontColor, setFontColor] = useState(nv.opts.fontColor)
  const [backgroundColor, setBackgroundColor] = useState(nv.opts.backColor)

  const handleTextHeightChange = (value: number[]): void => {
    setTextHeight(value)
    nv.opts.textHeight = value[0]
    nv.drawScene()
  }

  const handleShow3DcrosshairChange = (checked: boolean): void => {
    setShow3Dcrosshair(checked)
    nv.opts.show3Dcrosshair = checked
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

      {/* Show 3D Crosshair Switch */}
      <div className="flex flex-col mb-4">
        <Text size="2" className="mb-1">
          Show 3D Crosshair
        </Text>
        <Switch
          checked={show3Dcrosshair}
          onCheckedChange={handleShow3DcrosshairChange}
          className="mb-2"
        />
      </div>

      {/* Crosshair Color Picker */}
      <ColorPickerControl
        label="Crosshair Color"
        color={crosshairColor}
        onChange={(color) => {
          setCrosshairColor(color)
          nv.opts.crosshairColor = color
          nv.drawScene()
        }}
      />

      {/* Font Color Picker */}
      <ColorPickerControl
        label="Font Color"
        color={fontColor as number[]}
        onChange={(color) => {
          setFontColor(color)
          nv.opts.fontColor = color
          nv.drawScene()
        }}
      />

      {/* Background Color Picker */}
      <ColorPickerControl
        label="Background Color"
        color={backgroundColor}
        onChange={(color) => {
          setBackgroundColor(color)
          nv.opts.backColor = color
          nv.drawScene()
        }}
      />
    </div>
  )
}

export default OptionsTab
