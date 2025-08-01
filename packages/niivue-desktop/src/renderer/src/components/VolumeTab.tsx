// src/components/VolumeTab.tsx
import { useEffect, useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Flex, Switch, Button } from '@radix-ui/themes'
import { useSelectedInstance } from '../AppContext.js'
import { loadFMRIEvents } from '@renderer/types/events.js'
import { MosaicControls } from './MosaicControls.js'

const electron = window.electron

export const VolumeTab = (): JSX.Element => {
  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current
  if (!nv || !instance) return <></>

  const hasTimeSeries: boolean =
    nv.volumes?.[0]?.nFrame4D !== undefined && nv.volumes[0].nFrame4D > 1

  const [graphVisible, setGraphVisible] = useState<boolean>(nv.graph.opacity > 0)
  const [normalizeGraph, setNormalizeGraph] = useState<boolean>(nv.graph.normalizeValues)
  const [showColorMaps, setShowColorMaps] = useState<boolean>(nv.opts.isColorbar)
  const [mosaicStr, setMosaicStr] = useState(() => instance.opts.sliceMosaicString ?? '')

  useEffect((): void => {
    nv.graph.autoSizeMultiplanar = true
    setGraphVisible(nv.graph.opacity > 0)
    setNormalizeGraph(nv.graph.normalizeValues)
    setShowColorMaps(nv.opts.isColorbar)
    setMosaicStr(nv.opts.sliceMosaicString ?? '')
  }, [nv, nv.opts.sliceMosaicString])

  const toggleGraphVisibility = (visible: boolean): void => {
    nv.graph.opacity = visible ? 1.0 : 0.0
    nv.drawScene()
    setGraphVisible(visible)
  }

  const toggleColorbar = (visible: boolean): void => {
    nv.opts.isColorbar = visible
    instance.setOpts({ isColorbar: visible })
    nv.drawScene()
    setShowColorMaps(visible)
  }

  const loadFMRIEventsFromFile = async (): Promise<void> => {
    const paths: string[] = await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Load fMRI Events',
      filters: [{ name: 'TSV Files', extensions: ['tsv'] }]
    })
    if (!paths?.length) return
    const base64: string = await electron.ipcRenderer.invoke('loadFromFile', paths[0])
    loadFMRIEvents(atob(base64), nv)
  }

  // const handleMosaicChange = (newStr: string): void => {
  //   setMosaicStr(newStr)
  //   nv.setSliceMosaicString(newStr)
  //   instance.setSliceMosaicString(newStr)
  //   nv.drawScene()
  // }

  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <Accordion.Root type="multiple" className="w-full">
        {/* Graph Settings */}
        {hasTimeSeries && (
          <Accordion.Item value="graph-settings" className="border-b border-gray-200">
            <Accordion.Header>
              <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left group">
                <Text size="2" weight="bold">
                  Graph Settings
                </Text>
                <span
                  className="
      transform transition-transform duration-200
      rotate-0
      group-data-[state=open]:rotate-90
    "
                  aria-hidden
                >
                  ▶
                </span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-4 py-2">
              <Flex align="center" gap="2" mb="4">
                <Text size="2" weight="bold" className="mr-auto">
                  Show Graph
                </Text>
                <Switch checked={graphVisible} onCheckedChange={toggleGraphVisibility} />
              </Flex>
              {graphVisible && (
                <>
                  <Flex align="center" gap="2" ml="4" mb="4">
                    <Text size="2" weight="bold" className="mr-auto">
                      Normalize Graph
                    </Text>
                    <Switch
                      checked={normalizeGraph}
                      onCheckedChange={(checked: boolean): void => {
                        nv.graph.normalizeValues = checked
                        nv.updateGLVolume()
                        setNormalizeGraph(checked)
                      }}
                    />
                  </Flex>
                  <Flex justify="start" ml="4" mt="2">
                    <Button size="2" onClick={loadFMRIEventsFromFile}>
                      Load fMRI Events (.tsv)
                    </Button>
                  </Flex>
                </>
              )}
            </Accordion.Content>
          </Accordion.Item>
        )}

        {/* Color Map Display */}
        <Accordion.Item value="colormap-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left group">
              <Text size="2" weight="bold">
                Color Map Display
              </Text>
              <span
                className="
      transform transition-transform duration-200
      rotate-0
      group-data-[state=open]:rotate-90
    "
                aria-hidden
              >
                ▶
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            <Flex align="center" gap="2">
              <Text size="2" weight="bold" className="mr-auto">
                Show Color Maps
              </Text>
              <Switch checked={showColorMaps} onCheckedChange={toggleColorbar} />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        {/* Mosaic Settings */}
        {mosaicStr.trim() !== '' && (
          <Accordion.Item value="mosaic-settings" className="border-b border-gray-200">
            <Accordion.Header>
              <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left gropp">
                <Text size="2" weight="bold">
                  Mosaic Settings
                </Text>
                <span
                  className="
      transform transition-transform duration-200
      rotate-0
      group-data-[state=open]:rotate-90
    "
                  aria-hidden
                >
                  ▶
                </span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-4 py-2">
              <p className="text-xs italic text-gray-500 mt-2">
                Edit the mosaic string to change the mosaic view.
              </p>
              <MosaicControls />
            </Accordion.Content>
          </Accordion.Item>
        )}
      </Accordion.Root>
    </ScrollArea>
  )
}

export default VolumeTab
