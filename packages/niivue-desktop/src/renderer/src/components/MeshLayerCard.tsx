import { useEffect, useState, useContext } from 'react'
import { ContextMenu, Card, Text, Popover, Select, Button } from '@radix-ui/themes'
import { EyeOpenIcon, EyeNoneIcon } from '@radix-ui/react-icons'
import { NVMesh } from '@niivue/niivue'
import { baseName } from '../utils/baseName'
import { AppContext } from '../App'
import { NVMeshLayer } from '@renderer/types/MeshLayer'

interface MeshImageCardProps {
  image: NVMeshLayer // TODO: export NVMeshLayer type from Niivue
  idx: number
  parentMesh: NVMesh
}

export function MeshLayerCard({ image, idx, parentMesh }: MeshImageCardProps): JSX.Element {
  const [displayName, setDisplayName] = useState<string>(image.name!)
  const [visible, setVisible] = useState<boolean>(true)
  const [colormaps, setColormaps] = useState<string[]>([])
  const [colormap, setColormap] = useState<string>('warm')
  const { nvRef, setMeshes } = useContext(AppContext)
  const nv = nvRef.current

  useEffect(() => {
    // make sure the layer is visible by default
    // TODO: fix the first argument type error in Niivue
    const index = nv.meshes.indexOf(parentMesh)
    nv.setMeshLayerProperty(index, idx, 'opacity', 1)
  }, [])

  useEffect(() => {
    setColormaps(nv.colormaps())
  }, [nv])

  useEffect(() => {
    if (image.name) setDisplayName(baseName(image.name))
  }, [image.name])

  const handleVisibilityChange = (): void => {
    const newVisibility = !visible
    setVisible(newVisibility)
    const opacity = newVisibility ? 1 : 0
    // request animation frame removes the lag between react state rerenders and niivue updates
    const index = nv.meshes.indexOf(parentMesh)
    requestAnimationFrame(() => {
      nv.setMeshLayerProperty(index, idx, 'opacity', opacity)
    })
  }

  const handleRemove = (): void => {
    parentMesh.layers.splice(idx, 1)
    parentMesh.updateMesh(nv.gl)
    setMeshes((prev) => {
      const idx = prev.findIndex((m) => m.id === parentMesh.id)
      prev[idx] = parentMesh
      return [...prev]
    })
  }

  const handleColormapChange = (value: string): void => {
    // const id = image.id
    setColormap(value)
    // request animation frame removes the lag between react state rerenders and niivue updates
    requestAnimationFrame(() => {
      //@ts-expect-error - id is a string, but niivue expects a number. TODO: fix this type error in Niivue
      // nv.setMeshShader(id, value)
      nv.setMeshLayerProperty(parentMesh.id, idx, 'colormap', value)
    })
  }

  return (
    <Card className="flex flex-col p-2 my-1 ml-8 gap-2 bg-white">
      <div className="flex flex-row gap-2 items-center">
        <ContextMenu.Root>
          <ContextMenu.Trigger className="mr-auto">
            <Text title={image.name} size="2" weight="bold" className="mr-auto" truncate>
              {displayName}
            </Text>
          </ContextMenu.Trigger>
          <ContextMenu.Content>
            <ContextMenu.Item onClick={handleRemove}>Remove</ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
        <Button onClick={handleVisibilityChange} variant="ghost" color="gray">
          {visible ? (
            <EyeOpenIcon width="20" height="20" />
          ) : (
            <EyeNoneIcon width="20" height="20" />
          )}
        </Button>
      </div>
      <div className="flex flex-row justify-between gap-2">
        <Popover.Root>
          <Popover.Trigger>
            <Text size="1" color="gray" className="hover:underline cursor-pointer">
              options
            </Text>
          </Popover.Trigger>
          <Popover.Content side="right">
            <div className="flex flex-col gap-2 width-[200px] min-w-[200px]">
              <div className="flex gap-1 justify-between items-center">
                <Text size="1">Layer colormap</Text>
                <Select.Root
                  size="1"
                  value={colormap}
                  defaultValue="warm"
                  onValueChange={handleColormapChange}
                >
                  <Select.Trigger className="truncate w-3/4 min-w-3/4" />
                  <Select.Content className="truncate">
                    {colormaps.map((cmap, idx) => (
                      <Select.Item key={idx} value={cmap}>
                        {cmap}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
            </div>
          </Popover.Content>
        </Popover.Root>
        <Text size="1" color="gray">
          mesh layer
        </Text>
      </div>
    </Card>
  )
}