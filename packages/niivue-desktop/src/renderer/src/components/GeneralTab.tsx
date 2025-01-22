import React, { useState, useContext } from 'react'
import { ScrollArea, Text, Switch } from '@radix-ui/themes'
import { ZoomSlider } from './ZoomSlider'
import { SliceSelection } from './SliceSelection'
import { AppContext } from '../App'
import { ColorPicker } from './ColorPicker'
import { hexToRgba10 } from '../utils/colors'

export const GeneralTab: React.FC = () => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  const [show3Dcrosshair, setShow3Dcrosshair] = useState(nv.opts.show3Dcrosshair)
  const [crosshairColor, setCrosshairColor] = useState(nv.opts.crosshairColor)
  const [fontColor, setFontColor] = useState(nv.opts.fontColor)
  const [backgroundColor, setBackgroundColor] = useState(nv.opts.backColor)

  const handleCrosshairColorChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const color = e.target.value
    const rgba = hexToRgba10(color)
    setCrosshairColor(rgba)
    nv.opts.crosshairColor = rgba
    nv.drawScene()
  }

  const handleFontColorChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const color = e.target.value
    const rgba = hexToRgba10(color)
    setFontColor(rgba)
    nv.opts.fontColor = rgba
    nv.drawScene()
  }

  const handleBackgroundColorChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    console.log(e.target.value)
    const color = e.target.value
    const rgba = hexToRgba10(color)
    setBackgroundColor(rgba)
    nv.opts.backColor = rgba
    nv.drawScene()
  }

  const handleShow3DcrosshairChange = (checked: boolean): void => {
    setShow3Dcrosshair(checked)
    nv.opts.show3Dcrosshair = checked
    nv.drawScene()
  }

  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <Text size="2" weight="bold" className="mb-1">
        Move Crosshair
      </Text>
      <div className="mb-6">
        <SliceSelection />
      </div>
      <div className="flex items-center mb-4">
        <Text size="2" weight="bold" className="mr-2">
          Show 3D Crosshair
        </Text>
        <Switch
          checked={show3Dcrosshair}
          onCheckedChange={handleShow3DcrosshairChange}
          className="mr-2"
        />
      </div>
      <ColorPicker
        label="Crosshair Color"
        colorRGBA10={crosshairColor}
        onChange={handleCrosshairColorChange}
      />

      {/* font color */}
      <ColorPicker label="Font Color" colorRGBA10={fontColor} onChange={handleFontColorChange} />

      {/* background color */}
      <ColorPicker
        label="Background Color"
        colorRGBA10={backgroundColor}
        onChange={handleBackgroundColorChange}
      />

      <Text size="2" weight="bold" className="mb-1">
        2D Zoom
      </Text>
      <ZoomSlider />
    </ScrollArea>
  )
}

export default GeneralTab
