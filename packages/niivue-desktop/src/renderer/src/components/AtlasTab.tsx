import React, { useContext, useEffect, useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Flex, Switch, Button } from '@radix-ui/themes'
import { AppContext } from '../App'
import { NVImage, NVMesh } from '@niivue/niivue'
import { MESH_EXTENSIONS } from '../../../common/extensions'
import { base64ToString } from '@renderer/utils/base64ToJSON'

const electron = window.electron

export const AtlasTab: React.FC = () => {
  const { nvRef, setVolumes, setMeshes } = useContext(AppContext)
  const nv = nvRef.current

  // Labels for atlas regions
  const [atlasLabels, setAtlasLabels] = useState<string[]>([])
  const [hoverLabel, setHoverLabel] = useState<string>('')
  const [clickLabel, setClickLabel] = useState<string>('')

  // Handle hover
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
      setHoverLabel(atlasLabels[idx] || '')
    }
    canvas.addEventListener('mousemove', onMouseMove)
    return () => canvas.removeEventListener('mousemove', onMouseMove)
  }, [nv, atlasLabels])

  // Handle click
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
      setClickLabel(atlasLabels[idx] || '')
    }
    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [nv, atlasLabels])

  // Load default atlas
  const loadDefaultAtlas = async () => {
    if (!nv) return
    

    // Volumes
    const mniB64 = await electron.ipcRenderer.invoke('loadStandard', 'mni152.nii.gz')
    const aalB64 = await electron.ipcRenderer.invoke('loadStandard', 'aal.nii.gz')
    const mniVol = await NVImage.loadFromBase64({ base64: mniB64, name: 'mni152.nii.gz' })
    const aalVol = await NVImage.loadFromBase64({ base64: aalB64, name: 'aal.nii.gz' })
    setVolumes([mniVol, aalVol])

    // Labels
    const jsonB64 = await electron.ipcRenderer.invoke('loadStandard', 'aal.json')
    const atlasJson = JSON.parse(base64ToString(jsonB64))
    setAtlasLabels(atlasJson.labels || [])
    aalVol.setColormapLabel(atlasJson)
    if (aalVol.colormapLabel?.lut) {
      aalVol.colormapLabel.lut = aalVol.colormapLabel.lut.map((v, i) => (i % 4 === 3 ? 96 : v))
      nv.updateGLVolume()
    }
    nv.drawScene()
  }

  // Load custom atlas (volume or mesh)
  const loadCustomAtlas = async () => {
    if (!nv) return
    

    const [path] = await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Select Atlas Volume or Mesh',
      properties: ['openFile'],
      filters: [
        { name: 'Volume', extensions: ['nii','nii.gz'] },
        { name: 'Mesh', extensions: MESH_EXTENSIONS }
      ]
    }) as string[]
    if (!path) return
    const lower = path.toLowerCase()

    // Mesh
    if (MESH_EXTENSIONS.some(ext => lower.endsWith(ext.toLowerCase()))) {
      const b64 = await electron.ipcRenderer.invoke('loadFromFile', path)
      const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer
      const mesh = await NVMesh.loadFromFile({ file: new File([buf], path), gl: nv.gl, name: path })
      setMeshes(prev => [...prev, mesh])
      nv.addMesh(mesh)
      nv.drawScene()
      return
    }

    // Volume
    const volB64 = await electron.ipcRenderer.invoke('loadFromFile', path)
    const vol = await NVImage.loadFromBase64({ base64: volB64, name: path })
    setVolumes([vol])

    const [jsonPath] = await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Select Atlas Labels (JSON)', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }]
    }) as string[]
    if (!jsonPath) return
    const atlasJson = JSON.parse(base64ToString(await electron.ipcRenderer.invoke('loadFromFile', jsonPath)))
    setAtlasLabels(atlasJson.labels || [])
    vol.setColormapLabel(atlasJson)
    if (vol.colormapLabel?.lut) vol.colormapLabel.lut = vol.colormapLabel.lut.map((v,i)=>i%4===3?96:v)
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
            <Flex align="center" mb="2">
              <Button size="2" style={{ width: '100%' }} onClick={loadDefaultAtlas}>Load Default Atlas</Button>
            </Flex>
            <Flex align="center" mb="4">
              <Button size="2" style={{ width: '100%' }} onClick={loadCustomAtlas}>Load Custom Atlas…</Button>
            </Flex>
            <Flex align="center" gap="2" mb="4">
              <Text size="2" weight="bold">Interpolation</Text>
              <Switch checked={nv?.opts.isNearestInterpolation ?? true} onCheckedChange={v=>nv?.setInterpolation(v)} />
            </Flex>
            <Flex align="center" gap="2" mb="4">
              <Text size="2" weight="bold">Outline Opacity</Text>
              <input type="range" min={0} max={255} defaultValue={1} onChange={e=>nv?.setAtlasOutline(+e.target.value/255)} />
            </Flex>
            <Flex align="center" gap="2" mb="4">
              <Text size="2" weight="bold">Volume Opacity</Text>
              <input type="range" min={1} max={255} defaultValue={255} onChange={e=>nv?.setOpacity(1,+e.target.value/255)} />
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
