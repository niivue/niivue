import { ScrollArea } from '@radix-ui/themes'
import { SliderMeshDepth2D } from './SliderMeshDepth2D'
import { SliderMeshXRay } from './SliderMeshXRay'

export const MeshTab = (): JSX.Element => {
  return (
    <ScrollArea style={{ paddingRight: '10px' }}>
      <div className="flex flex-col py-4 px-2 gap-2">
        <SliderMeshDepth2D />
        <SliderMeshXRay />
      </div>
    </ScrollArea>
  )
}
