import { useContext, useEffect, useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Flex, Switch, Button } from '@radix-ui/themes'
import { AppContext } from '../App'
import { loadFMRIEvents, fmriEvents, getColorForTrialType } from '@renderer/types/events'

const electron = window.electron


export const VolumeTab = (): JSX.Element => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current
  const [graphVisible, setGraphVisible] = useState(false)
  const [normalizeGraph, setNormalizeGraph] = useState<boolean>(nv.graph.normalizeValues)
  const [eventVersion, setEventVersion] = useState(0) // forces re-render when events change

  const trialTypes = Array.from(new Set(fmriEvents.map(ev => ev.trial_type)))

  useEffect(() => {
    if (nv) {
      setGraphVisible(nv.graph.opacity > 0)
      nv.graph.autoSizeMultiplanar = true
    }
  }, [nv])

  const toggleGraphVisibility = (visible: boolean) => {
    if (!nv) return
    nv.graph.opacity = visible ? 1.0 : 0.0
    nv.drawScene()
    setGraphVisible(visible)
  }

  const loadFMRIEventsFromFile = async () => {
    const paths = await electron.ipcRenderer.invoke('dialog:openFile', {
      title: 'Load fMRI Events',
      filters: [{ name: 'TSV Files', extensions: ['tsv'] }]
    })
    if (!paths || paths.length === 0) return

    const path = paths[0]
    const base64 = await electron.ipcRenderer.invoke('loadFromFile', path)
    const decodedText = atob(base64)
    loadFMRIEvents(decodedText, nvRef.current)
    setEventVersion(v => v + 1) // trigger re-render so trialTypes updates
  }

  if (!nv || nv.getMaxVols() <= 0) return <></>

  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <Accordion.Root type="multiple" defaultValue={['graph-settings']} className="w-full">
        <Accordion.Item value="graph-settings" className="border-b border-gray-200">
          <Accordion.Header>
            <Accordion.Trigger className="flex justify-between items-center w-full my-2 pr-2 text-left">
              <Text size="2" weight="bold">
                Graph Settings
              </Text>
              <span className="transition-transform duration-200 transform rotate-0 data-[state=open]:rotate-180">
                ▼
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-4 py-2">
            <Flex align="center" gap="2" mb="4">
              <Text size="2" weight="bold" className="mr-auto">
                Show Graph
              </Text>
              <Switch
                checked={graphVisible}
                onCheckedChange={toggleGraphVisibility}
              />
            </Flex>

            {nv.graph.opacity > 0 && (
              <>
                <Flex align="center" gap="2" ml="4" mb="4">
                  <Text size="2" weight="bold" className="mr-auto">
                    Normalize Graph
                  </Text>
                  <Switch
                    checked={normalizeGraph}
                    onCheckedChange={(checked) => {
                      setNormalizeGraph(checked)
                      nv.graph.normalizeValues = checked
                      nv.updateGLVolume()
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
            {nv.graph.opacity > 0 && trialTypes.length > 0 && (
              <Flex direction="column" gap="1" ml="4" mt="2">
                <Text size="2" weight="bold">Event Legend</Text>
                {trialTypes.map((type) => {
                  const [r, g, b, a] = getColorForTrialType(type)
                  const colorStyle = {
                    width: '12px',
                    height: '12px',
                    backgroundColor: `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`,
                    borderRadius: '2px'
                  }
                  return (
                    <Flex key={type} align="center" gap="2">
                      <div style={colorStyle} />
                      <Text size="1">{type}</Text>
                    </Flex>
                  )
                })}
              </Flex>
            )}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </ScrollArea>
  )
}
