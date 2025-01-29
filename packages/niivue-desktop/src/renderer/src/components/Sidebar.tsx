import { useContext } from 'react'
import { AppContext } from '../App'
import { VolumeImageCard } from './VolumeImageCard'
import { MeshImageCard } from './MeshImageCard'
import { NVMesh, NVImage } from '@niivue/niivue'
import { Text, ScrollArea } from '@radix-ui/themes'
import { SceneTabs } from './SceneTabs'

interface SidebarProps {
  onRemoveVolume: (volume: NVImage) => void
  onRemoveMesh: (mesh: NVMesh) => void
  onMoveVolumeUp: (volume: NVImage) => void
  onMoveVolumeDown: (volume: NVImage) => void
}

export function Sidebar({
  onRemoveMesh,
  onRemoveVolume,
  onMoveVolumeUp,
  onMoveVolumeDown
}: SidebarProps): JSX.Element {
  const { volumes, meshes } = useContext(AppContext)
  return (
    <div className="flex flex-col bg-gray-100 px-2 w-1/3 basis-1/3 min-w-[300px] max-w-[500px]">
      <ScrollArea style={{ height: '50%', paddingRight: '10px', marginBottom: '12px' }}>
        <Text size="2" weight="bold">
          Layers
        </Text>
        {volumes.map((volume, idx) => (
          <VolumeImageCard
            key={idx}
            image={volume}
            onRemoveVolume={onRemoveVolume}
            onMoveVolumeUp={onMoveVolumeUp}
            onMoveVolumeDown={onMoveVolumeDown}
          />
        ))}
        {meshes.map((mesh, idx) => (
          <MeshImageCard key={idx} image={mesh} onRemoveMesh={onRemoveMesh} />
        ))}
      </ScrollArea>
      <SceneTabs />
    </div>
  )
}
