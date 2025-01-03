import { ScrollArea, Text } from '@radix-ui/themes'
import { ZoomSlider } from './ZoomSlider'
import { CrosshairSize } from './CrosshairSize'
import { SliceSelection } from './SliceSelection'

export const GeneralTab = (): JSX.Element => {
  return (
    <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
      <Text size="2" weight="bold" className="mb-1">
        Crosshair size
      </Text>
      <CrosshairSize />
      <Text size="2" weight="bold" className="mb-1">
        Move crosshair
      </Text>
      <SliceSelection />
      <Text size="2" weight="bold" className="mb-1">
        2D Zoom
      </Text>
      <ZoomSlider />
    </ScrollArea>
  )
}
