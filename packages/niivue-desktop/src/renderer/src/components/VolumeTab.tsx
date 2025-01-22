import { ScrollArea, Text } from '@radix-ui/themes'

export const VolumeTab = (): JSX.Element => {
  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <Text size="2" weight="bold" className="mb-1">
        TBD - Volume specific scene settings
      </Text>
    </ScrollArea>
  )
}
