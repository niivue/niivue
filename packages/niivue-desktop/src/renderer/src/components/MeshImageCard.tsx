import { useEffect, useState, useContext } from 'react'
import { ContextMenu, Card, Text, Checkbox } from '@radix-ui/themes'
import { NVMesh } from '@niivue/niivue'
import { baseName } from '../utils/baseName'
import { AppContext } from '@renderer/App'

export function MeshImageCard({ image }: { image: NVMesh }): JSX.Element {
  const [displayName, setDisplayName] = useState<string>(image.name)
  const [visible, setVisible] = useState<boolean>(true)
  const { nvRef } = useContext(AppContext)
  const nv = nvRef.current

  useEffect(() => {
    setDisplayName(baseName(image.name))
  }, [image.name])

  const handleVisibilityChange = (value: boolean): void => {
    const id = image.id
    const volIdx = nv.getMeshIndexByID(id)
    const checked = value
    setVisible(checked)
    // request animation frame removes the lag between react state rerenders and niivue updates
    requestAnimationFrame(() => {
      nv.meshes[volIdx].visible = checked
      nv.updateGLVolume()
    })
  }

  return (
    <Card className="flex flex-col p-2 my-1 gap-2 bg-white">
      <div className="flex flex-row gap-2 items-center">
        <ContextMenu.Root>
          <ContextMenu.Trigger className="mr-auto">
            <Text title={image.name} size="2" weight="bold" className="mr-auto" truncate>
              {displayName}
            </Text>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item>Open</ContextMenu.Item>
            <ContextMenu.Item>Close</ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
        <Checkbox checked={visible} onCheckedChange={handleVisibilityChange} />
      </div>
    </Card>
  )
}
