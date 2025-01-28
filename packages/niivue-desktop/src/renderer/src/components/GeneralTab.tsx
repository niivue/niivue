import React, { useState, useContext } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import * as Select from '@radix-ui/react-select'
import { ScrollArea, Text, Switch } from '@radix-ui/themes'
import { ZoomSlider } from './ZoomSlider'
import { SliceSelection } from './SliceSelection'
import { AppContext } from '../App'
import { ColorPicker } from './ColorPicker'
import { hexToRgba10 } from '../utils/colors'
import { MULTIPLANAR_TYPE, NVConfigOptions, SLICE_TYPE } from '@niivue/niivue'

// Utility to get only key-value mappings from the enum
const filterEnum = (enumObj: object): Record<string, number> =>
  Object.fromEntries(Object.entries(enumObj).filter(([key, value]) => isNaN(Number(key))))

const EnumSelect: React.FC<{
  value: string
  onChange: (value: string) => void
  options: Record<string, number>
}> = ({ value, onChange, options }) => (
  <Select.Root value={value} onValueChange={onChange}>
    <Select.Trigger className="flex items-center justify-between border rounded px-2 py-1">
      <Select.Value />
      <Select.Icon>▼</Select.Icon>
    </Select.Trigger>
    <Select.Content className="bg-white border rounded shadow">
      <Select.Viewport>
        {Object.entries(options).map(([label, val]) => (
          <Select.Item key={val} value={val.toString()} className="p-2 hover:bg-gray-100">
            <Select.ItemText>{label}</Select.ItemText>
          </Select.Item>
        ))}
      </Select.Viewport>
    </Select.Content>
  </Select.Root>
)

export const GeneralTab: React.FC = (): JSX.Element => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  const [show3Dcrosshair, setShow3Dcrosshair] = useState<boolean>(nv.opts.show3Dcrosshair)
  const [crosshairColor, setCrosshairColor] = useState<number[]>(Array.from(nv.opts.crosshairColor))
  const [fontColor, setFontColor] = useState<number[]>(Array.from(nv.opts.fontColor))
  const [backgroundColor, setBackgroundColor] = useState<number[]>(Array.from(nv.opts.backColor))
  const [isAlphaClipDark, setIsAlphaClipDark] = useState<boolean>(nv.opts.isAlphaClipDark)
  // State for sliceType
  // State for sliceType and multiplanarLayout
  const [sliceType, setSliceType] = useState<string>(nv.opts.sliceType.toString())
  const [multiplanarLayout, setMultiplanarLayout] = useState<string>(
    nv.opts.multiplanarLayout.toString()
  )

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
        {/* Slice Settings */}
        <Accordion.Item value="slice-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
              <Text size="2" weight="bold">
                Slice Settings
              </Text>
              <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">
                ▼
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            {/* Slice Type Dropdown */}
            <div className="mb-4">
              <Text size="2" weight="bold" className="mb-1">
                Slice Type
              </Text>
              <EnumSelect
                value={sliceType}
                onChange={(value) => {
                  setSliceType(value)
                  updateOption('sliceType', parseInt(value, 10))
                }}
                options={filterEnum(SLICE_TYPE)}
              />
            </div>

            {/* Multiplanar Layout Dropdown */}
            <div>
              <Text size="2" weight="bold" className="mb-1">
                Multiplanar Layout
              </Text>
              <EnumSelect
                value={multiplanarLayout}
                onChange={(value) => {
                  setMultiplanarLayout(value)
                  updateOption('multiplanarLayout', parseInt(value, 10))
                }}
                options={filterEnum(MULTIPLANAR_TYPE)}
              />
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
              onChange={handleColorChange(setFontColor, 'fontColor')}
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
