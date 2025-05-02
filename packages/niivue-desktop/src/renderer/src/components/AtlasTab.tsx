import React, { useContext, useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Flex, Switch, Button } from '@radix-ui/themes'
import { AppContext } from '../App'
import { NVImage, NVMesh, SHOW_RENDER } from '@niivue/niivue'
import { base64ToString } from '@renderer/utils/base64ToJSON'

const electron = window.electron

export const AtlasTab: React.FC = () => {
  const { nvRef, setVolumes } = useContext(AppContext)
  const nv = nvRef.current
  const [hoverLabel, setHoverLabel] = useState<string>('')
  const [clickLabel, setClickLabel] = useState<string>('')

  // Load built-in atlas volumes and labels
  const loadDefaultAtlas = async () => {
    if (!nv) return
    const mniB64 = await electron.ipcRenderer.invoke('loadStandard', 'mni152.nii.gz')
    // use the volumetric AAL atlas, not the mesh
    const aalB64 = await electron.ipcRenderer.invoke('loadStandard', 'aal.nii.gz')
    const mniVol = await NVImage.loadFromBase64({ base64: mniB64, name: 'mni152.nii.gz' })
    const aalVol = await NVImage.loadFromBase64({ base64: aalB64, name: 'aal.nii.gz' })
    // register volumes in state
    setVolumes(prev => [...prev, mniVol, aalVol])

    // apply JSON labels to volumetric AAL
    const jsonB64 = await electron.ipcRenderer.invoke('loadStandard', 'aal.json');
    const jsonText = base64ToString(jsonB64);
    const atlasJson = JSON.parse(jsonText);
    aalVol.setColormapLabel(atlasJson)
    if (aalVol.colormapLabel?.lut) {
      const lut = aalVol.colormapLabel.lut.map((v, i) => (i % 4 === 3 ? 96 : v))
      aalVol.colormapLabel.lut = lut
      // ensure Niivue updates the atlas rendering
      nv.updateGLVolume()
    }
    nv.drawScene()
  }

  // Allow user to pick custom atlas files
  const loadCustomAtlas = async () => {
    if (!nv) return
    // pick volume file
    const [volPath] = await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Select Atlas Volume',
      properties: ['openFile'],
      filters: [{ name: 'Volumes', extensions: ['nii','nii.gz','mz3'] }]
    }) as string[]
    if (!volPath) return

    // pick JSON labelmap file
    const [jsonPath] = await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Select Atlas Labels (JSON)',
      properties: ['openFile'],
      filters: [{ name: 'Labelmaps', extensions: ['json'] }]
    }) as string[]
    if (!jsonPath) return

    // load volume via NVImage
    const volB64 = await electron.ipcRenderer.invoke('loadFromFile', volPath)
    const vol = await NVImage.loadFromBase64({ base64: volB64, name: volPath })
    setVolumes(prev => [...prev, vol])

    // apply JSON labels
    const jsonB64 = await electron.ipcRenderer.invoke('loadFromFile', jsonPath)
    const atlasJson = JSON.parse(atob(jsonB64))
    vol.setColormapLabel(atlasJson)
    if (vol.colormapLabel?.lut) {
      vol.colormapLabel.lut = vol.colormapLabel.lut.map((v, i) => (i % 4 === 3 ? 96 : v))
    }
    nv.drawScene()
  }

  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <Accordion.Root type="multiple" className="w-full">
        <Accordion.Item value="atlas-settings">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
              <Text size="2" weight="bold">Atlas Settings</Text>
              <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">▼</span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            <Flex align="center" gap="2" mb="4">
              <Button size="2" onClick={loadDefaultAtlas}>Load Default Atlas</Button>
              <Button size="2" onClick={loadCustomAtlas}>Load Custom Atlas…</Button>
            </Flex>
            <Flex align="center" gap="2" mb="4">
              <Text size="2" weight="bold">Interpolation</Text>
              <Switch
                checked={nv?.opts.isNearestInterpolation ?? true}
                onCheckedChange={v => nv?.setInterpolation(v)}
              />
            </Flex>
            <Flex align="center" gap="2" mb="4">
              <Text size="2" weight="bold">Outline Opacity</Text>
              <input
                type="range"
                min={0}
                max={255}
                defaultValue={1}
                onChange={e => nv?.setAtlasOutline(+e.target.value / 255)}
              />
            </Flex>
            <Flex align="center" gap="2" mb="4">
              <Text size="2" weight="bold">Volume Opacity</Text>
              <input
                type="range"
                min={1}
                max={255}
                defaultValue={255}
                onChange={e => nv?.setOpacity(1, +e.target.value / 255)}
              />
            </Flex>
            <Flex align="center" gap="2" mb="4">
              <Text size="2" weight="bold">Padding</Text>
              <input
                type="range"
                min={0}
                max={10}
                defaultValue={5}
                onChange={e => nv?.setMultiplanarPadPixels(+e.target.value)}
              />
            </Flex>
            <Flex align="center" gap="2">
              <Text size="2" weight="bold">Crosshair Gap</Text>
              <input
                type="range"
                min={0}
                max={36}
                defaultValue={12}
                onChange={e => { nv && (nv.opts.crosshairGap = +e.target.value); nv?.drawScene() }}
              />
            </Flex>
            <div className="mt-4">
              <Text size="2">Hover Label: {hoverLabel}</Text>
              <Text size="2">Click Label: {clickLabel}</Text>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </ScrollArea>
  )
}

export default AtlasTab
