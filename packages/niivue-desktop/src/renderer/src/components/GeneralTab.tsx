import React, { useState, useContext } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Switch, Slider } from '@radix-ui/themes'
import { ZoomSlider } from './ZoomSlider'
import { SliceSelection } from './SliceSelection'
import { AppContext } from '../App'
import { ColorPicker } from './ColorPicker'
import { hexToRgba10 } from '../utils/colors'
import { NVConfigOptions, SLICE_TYPE } from '@niivue/niivue'
import { filterEnum } from '@renderer/utils/config'
import { EnumSelect } from './EnumSelect'

export const GeneralTab: React.FC = (): JSX.Element => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  const [show3Dcrosshair, setShow3Dcrosshair] = useState<boolean>(nv.opts.show3Dcrosshair)
  const [crosshairColor, setCrosshairColor] = useState<number[]>(Array.from(nv.opts.crosshairColor))
  const [fontColor, setFontColor] = useState<number[]>(Array.from(nv.opts.fontColor))
  const [backgroundColor, setBackgroundColor] = useState<number[]>(Array.from(nv.opts.backColor))
  const [isAlphaClipDark, setIsAlphaClipDark] = useState<boolean>(nv.opts.isAlphaClipDark)

  // State for heroSliceType and heroImageFraction
  const [heroSliceType, setHeroSliceType] = useState<string>(nv.opts.heroSliceType.toString())
  const [heroImageFraction, setHeroImageFraction] = useState<number>(nv.opts.heroImageFraction)

  const updateOption = <K extends keyof NVConfigOptions>(
    optionKey: K,
    value: NVConfigOptions[K]
  ): void => {
    nv.opts[optionKey] = value
    nv.drawScene()
  }

  const handleEnumChange =
    (
      optionKey: keyof NVConfigOptions,
      setter: React.Dispatch<React.SetStateAction<string>>
    ): ((value: string) => void) =>
    (value: string): void => {
      setter(value)
      updateOption(optionKey, parseInt(value, 10))
    }

  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <Accordion.Root type="multiple" defaultValue={[]} className="w-full">
        {/* Crosshair Settings */}
        <Accordion.Item value="crosshair-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
              <Text size="2" weight="bold">
                Crosshair Settings
              </Text>
              <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">
                ▼
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            <SliceSelection />
            <div className="flex items-center mb-4">
              <Text size="2" weight="bold" className="mr-2">
                Show 3D Crosshair
              </Text>
              <Switch
                checked={show3Dcrosshair}
                onCheckedChange={(checked) => {
                  setShow3Dcrosshair(checked)
                  updateOption('show3Dcrosshair', checked)
                }}
              />
            </div>
            <ColorPicker
              label="Crosshair Color"
              colorRGBA10={crosshairColor}
              onChange={(e) => {
                const rgba = hexToRgba10(e.target.value)
                setCrosshairColor(rgba)
                updateOption('crosshairColor', rgba)
              }}
            />
          </Accordion.Content>
        </Accordion.Item>

        {/* Hero Settings */}
        <Accordion.Item value="hero-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
              <Text size="2" weight="bold">
                Hero Settings
              </Text>
              <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">
                ▼
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            {/* Hero Slice Type Dropdown */}
            <div className="mb-4">
              <Text size="2" weight="bold" className="mb-1">
                Hero Slice Type
              </Text>
              <EnumSelect
                value={heroSliceType}
                onChange={handleEnumChange('heroSliceType', setHeroSliceType)}
                options={filterEnum(SLICE_TYPE)}
              />
            </div>

            {/* Hero Image Fraction Slider */}
            <div className="mb-4">
              <Text size="2" weight="bold" className="mb-1">
                Hero Image Fraction
              </Text>
              <Text size="2" weight="bold" className="mb-1">
                Hero Image Fraction
              </Text>
              {/* slider for volume alpha */}
              <div className="flex gap-1 items-center">
                <Slider
                  size="1"
                  min={0}
                  max={1}
                  step={0.1}
                  defaultValue={[1.0]}
                  value={[heroImageFraction]}
                  onValueChange={(newValue) => {
                    setHeroImageFraction(newValue[0])
                    updateOption('heroImageFraction', newValue[0])
                  }}
                />
                <div className="text-center text-sm mt-1">{heroImageFraction.toFixed(2)}</div>
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>

        {/* Font Settings */}
        <Accordion.Item value="font-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
              <Text size="2" weight="bold">
                Font Settings
              </Text>
              <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">
                ▼
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            <ColorPicker
              label="Font Color"
              colorRGBA10={fontColor}
              onChange={(e) => {
                const rgba = hexToRgba10(e.target.value)
                setFontColor(rgba)
                updateOption('fontColor', rgba)
              }}
            />
          </Accordion.Content>
        </Accordion.Item>

        {/* Background Settings */}
        <Accordion.Item value="background-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
              <Text size="2" weight="bold">
                Background Settings
              </Text>
              <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">
                ▼
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            <ColorPicker
              label="Background Color"
              colorRGBA10={backgroundColor}
              onChange={(e) => {
                const rgba = hexToRgba10(e.target.value)
                setBackgroundColor(rgba)
                updateOption('backColor', rgba)
              }}
            />
            <div className="flex items-center mt-4">
              <Text size="2" weight="bold" className="mr-2">
                Alpha Clip Dark
              </Text>
              <Switch
                checked={isAlphaClipDark}
                onCheckedChange={(checked) => {
                  setIsAlphaClipDark(checked)
                  updateOption('isAlphaClipDark', checked)
                }}
              />
            </div>
          </Accordion.Content>
        </Accordion.Item>

        {/* Zoom Settings */}
        <Accordion.Item value="zoom-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
              <Text size="2" weight="bold">
                Zoom Settings
              </Text>
              <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">
                ▼
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            <ZoomSlider />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </ScrollArea>
  )
}

export default GeneralTab
