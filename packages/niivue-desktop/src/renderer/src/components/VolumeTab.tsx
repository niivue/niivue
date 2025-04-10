import { useContext, useEffect, useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ScrollArea, Text, Flex, Switch } from '@radix-ui/themes'
import { AppContext } from '../App'

export const VolumeTab = (): JSX.Element => {
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current
  const [graphVisible, setGraphVisible] = useState(false)
  const [normalizeGraph, setNormalizeGraph] = useState<boolean>(nv.graph.normalizeValues)

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
  )}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </ScrollArea>
  )
}
