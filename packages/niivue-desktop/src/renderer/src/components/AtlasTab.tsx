import React, { useContext, useEffect, useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Flex, Switch, Button } from '@radix-ui/themes'
import { AppContext } from '../App'
import { NVImage, SHOW_RENDER } from '@niivue/niivue'
import { base64ToString } from '@renderer/utils/base64ToJSON'

const electron = window.electron

export const AtlasTab: React.FC = () => {
  const { nvRef, setVolumes } = useContext(AppContext)
  const nv = nvRef.current

  // Labels for atlas regions
  const [atlasLabels, setAtlasLabels] = useState<string[]>([])
  const [hoverLabel, setHoverLabel] = useState<string>('')
  const [clickLabel, setClickLabel] = useState<string>('')

  // Handle hover: update hoverLabel when mouse moves over atlas
  useEffect(() => {
    if (!nv || !nv.gl?.canvas || atlasLabels.length === 0) return
    const canvas = nv.gl.canvas
    let prevIdx = -1
    const onMouseMove: EventListener = evt => {
      const e = evt as MouseEvent
      const pos = nv.getNoPaddingNoBorderCanvasRelativeMousePosition(e, canvas)
      if (!pos || !nv.uiData?.dpr) return
      const frac = nv.canvasPos2frac([pos.x * nv.uiData.dpr, pos.y * nv.uiData.dpr])
      if (frac[0] < 0) return
      const mm = nv.frac2mm(frac)
      const vox = nv.volumes[1].mm2vox(Array.from(mm))
      const idx = nv.volumes[1].getValue(vox[0], vox[1], vox[2])
      if (!isFinite(idx) || idx === prevIdx) return
      prevIdx = idx
      const label = atlasLabels[idx] || ''
      setHoverLabel(label)
    }
    canvas.addEventListener('mousemove', onMouseMove)
    return () => canvas.removeEventListener('mousemove', onMouseMove)
  }, [nv, atlasLabels])

  // Handle click: update clickLabel when user clicks on atlas
  useEffect(() => {
    if (!nv || !nv.gl?.canvas || atlasLabels.length === 0) return
    const canvas = nv.gl.canvas
    const onClick: EventListener = evt => {
      const e = evt as MouseEvent
      const pos = nv.getNoPaddingNoBorderCanvasRelativeMousePosition(e, canvas)
      if (!pos || !nv.uiData?.dpr) return
      const frac = nv.canvasPos2frac([pos.x * nv.uiData.dpr, pos.y * nv.uiData.dpr])
      if (frac[0] < 0) return
      const mm = nv.frac2mm(frac)
      const vox = nv.volumes[1].mm2vox(Array.from(mm))
      const idx = nv.volumes[1].getValue(vox[0], vox[1], vox[2])
      if (!isFinite(idx)) return
      const label = atlasLabels[idx] || ''
      setClickLabel(label)
    }
    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [nv, atlasLabels])

  // Load built-in atlas volumes and labels
  const loadDefaultAtlas = async () => {
    if (!nv) return
    // Volume data
    const mniB64 = await electron.ipcRenderer.invoke('loadStandard', 'mni152.nii.gz')
    const aalB64 = await electron.ipcRenderer.invoke('loadStandard', 'aal.nii.gz')
    const mniVol = await NVImage.loadFromBase64({ base64: mniB64, name: 'mni152.nii.gz' })
    const aalVol = await NVImage.loadFromBase64({ base64: aalB64, name: 'aal.nii.gz' })
    setVolumes(prev => [...prev, mniVol, aalVol])

    // Label JSON
    const jsonB64 = await electron.ipcRenderer.invoke('loadStandard', 'aal.json')
    const jsonText = base64ToString(jsonB64)
    const atlasJson = JSON.parse(jsonText)
    setAtlasLabels(atlasJson.labels || [])

    // Apply labels to AAL volume
    aalVol.setColormapLabel(atlasJson)
    if (aalVol.colormapLabel?.lut) {
      aalVol.colormapLabel.lut = aalVol.colormapLabel.lut.map((v, i) => (i % 4 === 3 ? 96 : v))
      nv.updateGLVolume()
    }
    nv.drawScene()
  }

  // Allow user to pick custom atlas files
  const loadCustomAtlas = async () => {
    if (!nv) return
    const [volPath] = await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Select Atlas Volume',
      properties: ['openFile'],
      filters: [{ name: 'Volumes', extensions: ['nii','nii.gz'] }]
    }) as string[]
    if (!volPath) return

    const [jsonPath] = await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Select Atlas Labels (JSON)',
      properties: ['openFile'],
      filters: [{ name: 'Labelmaps', extensions: ['json'] }]
    }) as string[]
    if (!jsonPath) return

    // Load volume
    const volB64 = await electron.ipcRenderer.invoke('loadFromFile', volPath)
    const vol = await NVImage.loadFromBase64({ base64: volB64, name: volPath })
    setVolumes(prev => [...prev, vol])

    // Load JSON labels
    const jsonB64 = await electron.ipcRenderer.invoke('loadFromFile', jsonPath)
    const atlasJson = JSON.parse(base64ToString(jsonB64))
    setAtlasLabels(atlasJson.labels || [])

    // Apply to custom volume
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
            {/* Buttons on separate lines, equal width */}
            <Flex align="center" mb="2">
              <Button size="2" style={{ width: '100%' }} onClick={loadDefaultAtlas}>
                Load Default Atlas
              </Button>
            </Flex>
            <Flex align="center" mb="4">
              <Button size="2" style={{ width: '100%' }} onClick={loadCustomAtlas}>
                Load Custom Atlas…
              </Button>
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

            <div className="mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
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
