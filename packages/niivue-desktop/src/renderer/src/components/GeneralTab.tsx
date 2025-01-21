import React, { useState, useContext } from 'react'
import { ScrollArea, Text, Switch } from '@radix-ui/themes'
import { ZoomSlider } from './ZoomSlider'
import { CrosshairSize } from './CrosshairSize'
import { SliceSelection } from './SliceSelection'
import { AppContext } from '../App'
import ColorPickerControl from './ColorPickerControl'

export const GeneralTab: React.FC = () => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  const [show3Dcrosshair, setShow3Dcrosshair] = useState(nv.opts.show3Dcrosshair)
  const [crosshairColor, setCrosshairColor] = useState(nv.opts.crosshairColor)
  const [fontColor, setFontColor] = useState(nv.opts.fontColor)
  const [backgroundColor, setBackgroundColor] = useState(nv.opts.backColor)

  const handleCrosshairColorChange = (color: number[]): void => {
    setCrosshairColor(color)
    nv.opts.crosshairColor = color
    nv.drawScene()
  }

  const handleFontColorChange = (color: number[]): void => {
    setFontColor(color)
    nv.opts.fontColor = color
    nv.drawScene()
  }

  const handleBackgroundColorChange = (color: number[]): void => {
    setBackgroundColor(color)
    nv.opts.backColor = color
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
      <Text size="2" weight="bold" className="mb-1">
        Crosshair Color
      </Text>
      <ColorPickerControl color={crosshairColor} onChange={handleCrosshairColorChange} />
      <Text size="2" weight="bold" className="mb-1">
        Font Color
      </Text>
      <ColorPickerControl color={fontColor as number[]} onChange={handleFontColorChange} />
      <Text size="2" weight="bold" className="mb-1">
        Background Color
      </Text>
      <ColorPickerControl color={backgroundColor} onChange={handleBackgroundColorChange} />
      <Text size="2" weight="bold" className="mb-1">
        2D Zoom
      </Text>
      <ZoomSlider />
    </ScrollArea>
  )
}

export default GeneralTab
