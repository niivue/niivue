import React, { useEffect, useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Flex, Switch, Button } from '@radix-ui/themes'
import { useSelectedInstance } from '../AppContext'
import { NVImage, NVMesh } from '@niivue/niivue'
import { MESH_EXTENSIONS } from '../../../common/extensions'
import { base64ToString } from '@renderer/utils/base64ToJSON'

const electron = window.electron
type LocationChangeEvent = {
  string: string
  mm: [number, number, number]
  values: number[]
  frame4D: number
}

export const AtlasTab: React.FC = () => {
  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current
  if (!nv) return <></>

  const setVolumes = instance?.setVolumes ?? ((): void => {})
  const setMeshes = instance?.setMeshes ?? ((): void => {})

  // Track current atlas type and index
  const [atlasInfo, setAtlasInfo] = useState<{ type: 'volume' | 'mesh'; idx: number } | null>(null)

  // Labels for voxel-based atlas regions
  const [atlasLabels, setAtlasLabels] = useState<string[]>([])
  const [hoverLabel, setHoverLabel] = useState<string>('')
  const [clickLabel, setClickLabel] = useState<string>('')

  // Hover effect only for volume atlases
  useEffect(() => {
    if (!nv || atlasInfo?.type !== 'volume' || atlasInfo.idx == null || atlasLabels.length === 0)
      return
    const canvas = nv.gl?.canvas
    if (!canvas) return
    let prevIdx = -1
    const onMouseMove = (evt: Event): void => {
      const e = evt as MouseEvent
      const pos = nv.getNoPaddingNoBorderCanvasRelativeMousePosition(e, canvas)
      if (!pos || !nv.uiData?.dpr) return
      const frac = nv.canvasPos2frac([pos.x * nv.uiData.dpr, pos.y * nv.uiData.dpr])
      if (frac[0] < 0) return
      const mm = nv.frac2mm(frac)
      const vox = nv.volumes[atlasInfo.idx].mm2vox(Array.from(mm))
      const idx = nv.volumes[atlasInfo.idx].getValue(vox[0], vox[1], vox[2])
      if (!isFinite(idx) || idx === prevIdx) return
      prevIdx = idx
      const newLabel = atlasLabels[idx] || ''
      if (newLabel !== hoverLabel) {
        setHoverLabel(newLabel)
      }
    }
    canvas.addEventListener('mousemove', onMouseMove)
    return (): void => canvas.removeEventListener('mousemove', onMouseMove)
  }, [nv, atlasInfo, atlasLabels])

  // Click effect only for volume atlases
  useEffect(() => {
    if (!nv || atlasInfo?.type !== 'volume' || atlasInfo.idx == null || atlasLabels.length === 0)
      return
    const canvas = nv.gl?.canvas
    if (!canvas) return
    const onClick = (evt: Event): void => {
      const e = evt as MouseEvent
      const pos = nv.getNoPaddingNoBorderCanvasRelativeMousePosition(e, canvas)
      if (!pos || !nv.uiData?.dpr) return
      const frac = nv.canvasPos2frac([pos.x * nv.uiData.dpr, pos.y * nv.uiData.dpr])
      if (frac[0] < 0) return
      const mm = nv.frac2mm(frac)
      const vox = nv.volumes[atlasInfo.idx].mm2vox(Array.from(mm))
      const idx = nv.volumes[atlasInfo.idx].getValue(vox[0], vox[1], vox[2])
      if (!isFinite(idx)) return
      setClickLabel(atlasLabels[idx] || '')
    }
    canvas.addEventListener('click', onClick)
    return (): void => canvas.removeEventListener('click', onClick)
  }, [nv, atlasInfo, atlasLabels])

  // Load built-in atlas (volumetric only)
  const loadDefaultAtlas = async (): Promise<void> => {
    if (!nv) return
    // Load volumes
    const mniB64 = await electron.ipcRenderer.invoke('loadStandard', 'mni152.nii.gz')
    const aalB64 = await electron.ipcRenderer.invoke('loadStandard', 'aal.nii.gz')
    const mniVol = await NVImage.loadFromBase64({ base64: mniB64, name: 'mni152.nii.gz' })
    const aalVol = await NVImage.loadFromBase64({ base64: aalB64, name: 'aal.nii.gz' })
    setVolumes([mniVol, aalVol])
    setAtlasInfo({ type: 'volume', idx: 1 })

    // Load JSON labels
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

  // Load custom atlas (detect volume vs mesh)
  const loadCustomAtlas = async (): Promise<void> => {
    if (!nv) return
    const [path] = (await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Select Atlas Volume or Mesh',
      properties: ['openFile'],
      filters: [
        { name: 'Volume', extensions: ['nii', 'nii.gz'] },
        { name: 'Mesh', extensions: MESH_EXTENSIONS }
      ]
    })) as string[]
    if (!path) return
    const lower = path.toLowerCase()

    // Mesh branch
    if (MESH_EXTENSIONS.some((ext) => lower.endsWith(ext.toLowerCase()))) {
      const b64 = await electron.ipcRenderer.invoke('loadFromFile', path)
      const buf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer
      const mesh = await NVMesh.loadFromFile({ file: new File([buf], path), gl: nv.gl, name: path })
      // Register mesh
      setMeshes((prev) => [...prev, mesh])
      nv.addMesh(mesh)
      setAtlasInfo({ type: 'mesh', idx: nv.meshes.length - 1 })

      // Optionally load JSON labels/colormap for mesh
      const [jsonPath] = (await electron.ipcRenderer.invoke('dialog:openFile', {
        title: 'Select Mesh Colormap Labels (JSON)',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })) as string[]
      if (jsonPath) {
        const jsonB64 = await electron.ipcRenderer.invoke('loadFromFile', jsonPath)
        const colJson = JSON.parse(base64ToString(jsonB64))
        // Apply the colormap labels to layer 0
        await nv.setMeshLayerProperty(nv.meshes.length - 1, 0, 'colormapLabel', colJson)
      }

      // Mesh click callback
      nv.onLocationChange = (data: unknown): void => {
        console.log('location change', data)
        setClickLabel((data as LocationChangeEvent).string)
      }
      nv.drawScene()
      return
    }

    // Volume branch
    const volB64 = await electron.ipcRenderer.invoke('loadFromFile', path)
    const vol = await NVImage.loadFromBase64({ base64: volB64, name: path })
    setVolumes([vol])
    setAtlasInfo({ type: 'volume', idx: 0 })

    // Ask for label JSON
    const [jsonPath] = (await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Select Atlas Labels (JSON)',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })) as string[]
    if (!jsonPath) return
    const atlasJson = JSON.parse(
      base64ToString(await electron.ipcRenderer.invoke('loadFromFile', jsonPath))
    )
    setAtlasLabels(atlasJson.labels || [])
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
              <Text size="2" weight="bold">
                Atlas Settings
              </Text>
              <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">
                ▼
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
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
              <Text size="2" weight="bold">
                Interpolation
              </Text>
              <Switch
                checked={nv?.opts.isNearestInterpolation ?? true}
                onCheckedChange={(v) => nv?.setInterpolation(v)}
              />
            </Flex>
            <Flex align="center" gap="2" mb="4">
              <Text size="2" weight="bold">
                Outline Opacity
              </Text>
              <input
                type="range"
                min={0}
                max={255}
                defaultValue={1}
                onChange={(e) => nv?.setAtlasOutline(+e.target.value / 255)}
              />
            </Flex>
            <Flex align="center" gap="2" mb="4">
              <Text size="2" weight="bold">
                Volume Opacity
              </Text>
              <input
                type="range"
                min={1}
                max={255}
                defaultValue={255}
                onChange={(e) => nv?.setOpacity(1, +e.target.value / 255)}
              />
            </Flex>
            <div
              className="mt-4"
              style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
            >
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
