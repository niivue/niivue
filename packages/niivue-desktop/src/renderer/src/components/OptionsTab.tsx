import React, { useState, useContext } from 'react'
import { SketchPicker } from 'react-color'
import { Text, Slider, Switch } from '@radix-ui/themes'
import { AppContext } from '../App'

const OptionsTab: React.FC = () => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  const [textHeight, setTextHeight] = useState([nv.opts.textHeight])
  const [show3Dcrosshair, setShow3Dcrosshair] = useState(nv.opts.show3Dcrosshair)
  const [crosshairColor, setCrosshairColor] = useState(nv.opts.crosshairColor)
  const [fontColor, setFontColor] = useState(nv.opts.fontColor)

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

  const handleCrosshairColorChange = (color: any): void => {
    const rgbaColor = [color.rgb.r / 255, color.rgb.g / 255, color.rgb.b / 255, color.rgb.a]
    setCrosshairColor(rgbaColor)
    nv.opts.crosshairColor = rgbaColor
    nv.drawScene()
  }

  const handleFontColorChange = (color: any): void => {
    const rgbaColor = [color.rgb.r / 255, color.rgb.g / 255, color.rgb.b / 255, color.rgb.a]
    setFontColor(rgbaColor)
    nv.opts.fontColor = rgbaColor
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
      <div className="flex flex-col mb-4">
        <Text size="2" className="mb-1">
          Crosshair Color
        </Text>
        <SketchPicker
          color={{
            r: crosshairColor[0] * 255,
            g: crosshairColor[1] * 255,
            b: crosshairColor[2] * 255,
            a: crosshairColor[3]
          }}
          onChangeComplete={handleCrosshairColorChange}
        />
      </div>

      {/* Font Color Picker */}
      <div className="flex flex-col mb-4">
        <Text size="2" className="mb-1">
          Font Color
        </Text>
        <SketchPicker
          color={{
            r: fontColor[0] * 255,
            g: fontColor[1] * 255,
            b: fontColor[2] * 255,
            a: fontColor[3]
          }}
          onChangeComplete={handleFontColorChange}
        />
      </div>
    </div>
  )
}

export default OptionsTab
