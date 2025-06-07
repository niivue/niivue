import { Tabs, Text } from '@radix-ui/themes'
import { GeneralTab } from './GeneralTab'
import { MeshTab } from './MeshTab'
import { VolumeTab } from './VolumeTab'
import { AtlasTab } from './AtlasTab'

export const SceneTabs = (): JSX.Element => {
  return (
    <Tabs.Root defaultValue="general">
      <Tabs.List>
        <Tabs.Trigger value="general">
          <Text size="1">Controls</Text>
        </Tabs.Trigger>
        <Tabs.Trigger value="volume">
          <Text size="1">Volume</Text>
        </Tabs.Trigger>
        <Tabs.Trigger value="mesh">
          <Text size="1">Mesh</Text>
        </Tabs.Trigger>
        <Tabs.Trigger value="atlas">
          <Text size="1">Atlas</Text>
        </Tabs.Trigger>
      </Tabs.List>
      <div className="flex flex-col grow w-full">
        <Tabs.Content value="general">
          <GeneralTab />
        </Tabs.Content>
        <Tabs.Content value="volume">
          <VolumeTab />
        </Tabs.Content>
        <Tabs.Content value="mesh">
          <MeshTab />
        </Tabs.Content>
        <Tabs.Content value="atlas">
          <AtlasTab />
        </Tabs.Content>
      </div>
    </Tabs.Root>
  )
}
