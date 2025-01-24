import React, { useState, useContext } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Switch } from '@radix-ui/themes'
import { ZoomSlider } from './ZoomSlider'
import { SliceSelection } from './SliceSelection'
import { AppContext } from '../App'
import { ColorPicker } from './ColorPicker'
import { hexToRgba10 } from '../utils/colors'
import { NVConfigOptions } from '@niivue/niivue'

export const GeneralTab: React.FC = (): JSX.Element => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  const [show3Dcrosshair, setShow3Dcrosshair] = useState<boolean>(nv.opts.show3Dcrosshair)
  const [crosshairColor, setCrosshairColor] = useState<number[]>(nv.opts.crosshairColor)
  const [fontColor, setFontColor] = useState<number[]>(Array.from(nv.opts.fontColor))
  const [backgroundColor, setBackgroundColor] = useState<number[]>(nv.opts.backColor)
  const [isAlphaClipDark, setIsAlphaClipDark] = useState<boolean>(nv.opts.isAlphaClipDark)

  // Define a type-safe utility function for updating options
  const updateOption = <K extends keyof NVConfigOptions>(
    optionKey: K,
    value: NVConfigOptions[K]
  ): void => {
    nv.opts[optionKey] = value
    nv.drawScene()
  }

  const handleColorChange =
    (
      setter: React.Dispatch<React.SetStateAction<number[]>>,
      optionKey: keyof NVConfigOptions
    ): ((e: React.ChangeEvent<HTMLInputElement>) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const color = e.target.value
      const rgba = hexToRgba10(color)
      setter(rgba)
      updateOption(optionKey, rgba)
    }

  const handleSwitchChange =
    (
      setter: React.Dispatch<React.SetStateAction<boolean>>,
      optionKey: keyof NVConfigOptions
    ): ((checked: boolean) => void) =>
    (checked: boolean): void => {
      setter(checked)
      updateOption(optionKey, checked)
    }

  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <Accordion.Root type="multiple" defaultValue={[]}>
        {/* Crosshair Settings */}
        <Accordion.Item value="crosshair-settings">
          <Accordion.Header>
            <Accordion.Trigger>
              <Text size="2" weight="bold">
                Crosshair Settings
              </Text>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <SliceSelection />
            <div className="flex items-center mb-4">
              <Text size="2" weight="bold" className="mr-2">
                Show 3D Crosshair
              </Text>
              <Switch
                checked={show3Dcrosshair}
                onCheckedChange={handleSwitchChange(setShow3Dcrosshair, 'show3Dcrosshair')}
              />
            </div>
            <ColorPicker
              label="Crosshair Color"
              colorRGBA10={crosshairColor}
              onChange={handleColorChange(setCrosshairColor, 'crosshairColor')}
            />
          </Accordion.Content>
        </Accordion.Item>

        {/* Font Settings */}
        <Accordion.Item value="font-settings">
          <Accordion.Header>
            <Accordion.Trigger>
              <Text size="2" weight="bold">
                Font Settings
              </Text>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <ColorPicker
              label="Font Color"
              colorRGBA10={fontColor}
              onChange={handleColorChange(setFontColor, 'fontColor')}
            />
          </Accordion.Content>
        </Accordion.Item>

        {/* Background Settings */}
        <Accordion.Item value="background-settings">
          <Accordion.Header>
            <Accordion.Trigger>
              <Text size="2" weight="bold">
                Background Settings
              </Text>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <ColorPicker
              label="Background Color"
              colorRGBA10={backgroundColor}
              onChange={handleColorChange(setBackgroundColor, 'backColor')}
            />
            <div className="flex items-center mt-4">
              <Text size="2" weight="bold" className="mr-2">
                Alpha Clip Dark
              </Text>
              <Switch
                checked={isAlphaClipDark}
                onCheckedChange={handleSwitchChange(setIsAlphaClipDark, 'isAlphaClipDark')}
              />
            </div>
          </Accordion.Content>
        </Accordion.Item>

        {/* Zoom Settings */}
        <Accordion.Item value="zoom-settings">
          <Accordion.Header>
            <Accordion.Trigger>
              <Text size="2" weight="bold">
                Zoom Settings
              </Text>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <ZoomSlider />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </ScrollArea>
  )
}

export default GeneralTab
