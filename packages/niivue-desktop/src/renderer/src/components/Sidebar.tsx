import { useContext } from 'react'
import { AppContext } from '../App'
import { VolumeImageCard } from './VolumeImageCard'
import { MeshImageCard } from './MeshImageCard'
import { Text } from '@radix-ui/themes'

export function Sidebar(): JSX.Element {
  const { volumes, meshes } = useContext(AppContext)
  return (
    <div className="flex flex-col bg-gray-100 px-2 w-1/3 basis-1/3">
      <Text size="2" weight="bold">
        Layers
      </Text>
      {volumes.map((volume, idx) => (
        <VolumeImageCard key={idx} image={volume} />
      ))}
      {meshes.map((mesh, idx) => (
        <MeshImageCard key={idx} image={mesh} />
      ))}
    </div>
  )
}
