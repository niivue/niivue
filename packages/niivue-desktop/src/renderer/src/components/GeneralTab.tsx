import React, { useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Switch } from '@radix-ui/themes'
import { ZoomSlider } from './ZoomSlider.js'
import { SliceSelection } from './SliceSelection.js'
import { useAppContext, useSelectedInstance } from '../AppContext.js'
import { ColorPicker } from './ColorPicker.js'
import { hexToRgba10 } from '../utils/colors.js'
import { NVConfigOptions } from '@niivue/niivue'

export const GeneralTab: React.FC = (): JSX.Element => {
  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current
  if (!nv) return <></>

  const [show3Dcrosshair, setShow3Dcrosshair] = useState<boolean>(nv.opts.show3Dcrosshair)
  const [crosshairColor, setCrosshairColor] = useState<number[]>(Array.from(nv.opts.crosshairColor))

  const { showNiimathToolbar, setShowNiimathToolbar, showStatusBar, setShowStatusBar } =
    useAppContext()

  const updateOption = <K extends keyof NVConfigOptions>(
    optionKey: K,
    value: NVConfigOptions[K]
  ): void => {
    nv.opts[optionKey] = value
    nv.drawScene()
  }

  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <Accordion.Root type="multiple" defaultValue={[]} className="w-full">
        {/* Crosshair Settings */}
        <Accordion.Item value="crosshair-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left group">
              <Text size="2" weight="bold">
                Crosshair Settings
              </Text>
              <span className="transform transition-transform duration-200 rotate-0 group-data-[state=open]:rotate-90">
                ▶
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

        {/* Zoom Settings */}
        <Accordion.Item value="zoom-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left group">
              <Text size="2" weight="bold">
                Zoom Settings
              </Text>
              <span className="transform transition-transform duration-200 rotate-0 group-data-[state=open]:rotate-90">
                ▶
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            <ZoomSlider />
          </Accordion.Content>
        </Accordion.Item>

        {/* Controls Settings */}
        <Accordion.Item value="controls-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left group">
              <Text size="2" weight="bold">
                Status Bar
              </Text>
              <span className="transform transition-transform duration-200 rotate-0 group-data-[state=open]:rotate-90">
                ▶
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            <div className="flex items-center mb-2">
              <Text size="2" weight="bold" className="mr-2">
                Show Status Bar
              </Text>
              <Switch
                checked={showStatusBar}
                onCheckedChange={(checked) => {
                  setShowStatusBar(checked)
                }}
              />
            </div>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="controls-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left group">
              <Text size="2" weight="bold">
                Niimath
              </Text>
              <span className="transform transition-transform duration-200 rotate-0 group-data-[state=open]:rotate-90">
                ▶
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            <div className="flex items-center mb-2">
              <Text size="2" weight="bold" className="mr-2">
                Show Niimath Toolbar
              </Text>
              <Switch
                checked={showNiimathToolbar}
                onCheckedChange={(checked) => {
                  setShowNiimathToolbar(checked)
                }}
              />
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </ScrollArea>
  )
}

export default GeneralTab
