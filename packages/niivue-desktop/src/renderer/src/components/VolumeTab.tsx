import { useContext, useEffect, useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Flex, Switch, Button, TextField } from '@radix-ui/themes'
import { AppContext } from '../App'
import { loadFMRIEvents, fmriEvents, getColorForTrialType } from '@renderer/types/events'
import { MosaicControls } from './MosaicControls'

const electron = window.electron

export const VolumeTab = (): JSX.Element => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  // Time series?
  const hasTimeSeries =
    nv.volumes &&
    nv.volumes.length > 0 &&
    nv.volumes[0].nFrame4D &&
    nv.volumes[0].nFrame4D > 1

  // Graph settings state
  const [graphVisible, setGraphVisible] = useState(nv.graph.opacity > 0)
  const [normalizeGraph, setNormalizeGraph] = useState<boolean>(nv.graph.normalizeValues)

  // Color bar toggle state
  const [showColorMaps, setShowColorMaps] = useState<boolean>(!!nv.opts.isColorbar)

  // Mosaic state
  const [mosaicStr, setMosaicStr] = useState<string>(
    nv.opts.sliceMosaicString?.trim() || ''
  )

  const trialTypes = Array.from(new Set(fmriEvents.map(ev => ev.trial_type)))

  useEffect(() => {
    if (nv) {
      setGraphVisible(nv.graph.opacity > 0)
      nv.graph.autoSizeMultiplanar = true
    }
  }, [nv])

  // Poll for mosaic-string changes (so controls appear/disappear)
  useEffect(() => {
    if (!nv) return
    const interval = setInterval(() => {
      const current = nv.opts.sliceMosaicString?.trim() || ''
      if (current !== mosaicStr.trim()) setMosaicStr(current)
    }, 1000)
    return () => clearInterval(interval)
  }, [nv, mosaicStr])

  const toggleGraphVisibility = (visible: boolean) => {
    nv.graph.opacity = visible ? 1.0 : 0.0
    nv.drawScene()
    setGraphVisible(visible)
  }

  const loadFMRIEventsFromFile = async () => {
    const paths = await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Load fMRI Events',
      filters: [{ name: 'TSV Files', extensions: ['tsv'] }]
    })
    if (!paths?.length) return
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', paths[0])
    loadFMRIEvents(atob(base64), nv)
  }

  // Watch the colorbar toggle
  const toggleColorbar = (visible: boolean) => {
    nv.opts.isColorbar = visible
    nv.drawScene()
    setShowColorMaps(visible)
  }

  // Update mosaic when user edits or polls pick up a change
  useEffect(() => {
    if (mosaicStr.trim()) {
      nv.setSliceMosaicString(mosaicStr)
      nv.drawScene()
    }
  }, [nv, mosaicStr])

  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <Accordion.Root type="multiple" className="w-full">

        {/* Graph Settings */}
        {hasTimeSeries && (
          <Accordion.Item value="graph-settings" className="border-b border-gray-200">
            <Accordion.Header>
              <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
                <Text size="2" weight="bold">Graph Settings</Text>
                <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">▼</span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-4 py-2">
              <Flex align="center" gap="2" mb="4">
                <Text size="2" weight="bold" className="mr-auto">Show Graph</Text>
                <Switch checked={graphVisible} onCheckedChange={toggleGraphVisibility} />
              </Flex>
              {graphVisible && (
                <>
                  <Flex align="center" gap="2" ml="4" mb="4">
                    <Text size="2" weight="bold" className="mr-auto">Normalize Graph</Text>
                    <Switch
                      checked={normalizeGraph}
                      onCheckedChange={checked => {
                        nv.graph.normalizeValues = checked
                        nv.updateGLVolume()
                        setNormalizeGraph(checked)
                      }}
                    />
                  </Flex>
                  <Flex justify="start" ml="4" mt="2">
                    <Button size="2" onClick={loadFMRIEventsFromFile}>Load fMRI Events (.tsv)</Button>
                  </Flex>
                </>
              )}
            </Accordion.Content>
          </Accordion.Item>
        )}

        {/* Color Map Display */}
        <Accordion.Item value="colormap-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
              <Text size="2" weight="bold">Color Map Display</Text>
              <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">▼</span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            <Flex align="center" gap="2">
              <Text size="2" weight="bold" className="mr-auto">Show Color Maps</Text>
              <Switch checked={showColorMaps} onCheckedChange={toggleColorbar} />
            </Flex>
          </Accordion.Content>
        </Accordion.Item>

        {/* Mosaic Settings */}
        {mosaicStr.trim() !== '' && (
          <Accordion.Item value="mosaic-settings" className="border-b border-gray-200">
            <Accordion.Header>
              <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
                <Text size="2" weight="bold">Mosaic Settings</Text>
                <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">▼</span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-4 py-2">
              <TextField.Root
                type="text"
                value={mosaicStr}
                onChange={e => setMosaicStr(e.target.value)}
                className="w-full"
              />
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
