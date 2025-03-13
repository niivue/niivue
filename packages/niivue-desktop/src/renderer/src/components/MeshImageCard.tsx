import React, { useEffect, useState, useContext } from 'react'
import { ContextMenu, Card, Text, Popover, Select, Button } from '@radix-ui/themes'
import { NVMesh, NVMeshLayerDefaults } from '@niivue/niivue'
import { baseName } from '../utils/baseName'
import { AppContext } from '../App'
import { MeshLayerCard } from './MeshLayerCard'
import { EyeOpenIcon, EyeNoneIcon } from '@radix-ui/react-icons'

const electron = window.electron

interface MeshImageCardProps {
  image: NVMesh
  onRemoveMesh: (mesh: NVMesh) => void
  // meshLayers: NVMeshLayer[]
}

export function MeshImageCard({ image, onRemoveMesh }: MeshImageCardProps): JSX.Element {
  const [displayName, setDisplayName] = useState<string>(image.name)
  const [visible, setVisible] = useState<boolean>(true)
  const [shaders, setShaders] = useState<string[]>([])
  const [shader, setShader] = useState<string>('Phong')
  const { nvRef, setMeshes } = useContext(AppContext)
  const nv = nvRef.current

  useEffect(() => {
    electron.ipcRenderer.on('openMeshFileDialogResult', async (_, path) => {
      console.log('openMeshFileDialogResult', path)
      // // ICBM152.lh.motor.mz3 mesh
      const layerBase64 = await electron.ipcRenderer.invoke('loadFromFile', path)
      const layer = {
        url: path,
        name: path,
        opacity: 1,
        colormap: 'warm',
        base64: layerBase64
      }
      const layerOptions = {
        ...NVMeshLayerDefaults,
        ...layer
      }
      await NVMesh.loadLayer(layerOptions, image)
      // patch for missing url and name properties in the NVMeshLayer once it is added to the mesh object.
      // TODO: fix this in Niivue
      image.layers[image.layers.length - 1].url = path
      image.layers[image.layers.length - 1].name = path
      // update the mesh and set meshes
      setMeshes((prev) => {
        const idx = prev.findIndex((m) => m.id === image.id)
        prev[idx] = image
        return [...prev]
      })
    })
  }, [])

  useEffect(() => {
    setShaders(nv.meshShaderNames())
  }, [nv])

  useEffect(() => {
    setDisplayName(baseName(image.name))
  }, [image.name])

  const handleVisibilityChange = (): void => {
    const id = image.id
    const volIdx = nv.getMeshIndexByID(id)
    const newVisibility = !visible
    setVisible(newVisibility)
    requestAnimationFrame(() => {
      nv.meshes[volIdx].visible = newVisibility
      nv.updateGLVolume()
    })
  }

  const handleShaderChange = (value: string): void => {
    const id = image.id
    setShader(value)
    // request animation frame removes the lag between react state rerenders and niivue updates
    requestAnimationFrame(() => {
      //@ts-expect-error - id is a string, but niivue expects a number. TODO: fix this type error in Niivue
      nv.setMeshShader(id, value)
    })
  }

  const handleLoadLayer = (): void => {
    electron.ipcRenderer.invoke('openMeshFileDialog')
  }

  return (
    <React.Fragment>
      <Card className="flex flex-col p-2 my-1 gap-2 bg-white">
        <div className="flex flex-row gap-2 items-center">
          <ContextMenu.Root>
            <ContextMenu.Trigger className="mr-auto">
              <Text title={image.name} size="2" weight="bold" className="mr-auto" truncate>
                {displayName}
              </Text>
            </ContextMenu.Trigger>
            <ContextMenu.Content>
              <ContextMenu.Item
                onClick={() => {
                  onRemoveMesh(image)
                }}
              >
                Remove
              </ContextMenu.Item>
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
                {/* button to load layer */}
                <Button
                  className="w-full"
                  onClick={handleLoadLayer}
                  variant="outline"
                  color="gray"
                  size="1"
                >
                  Load Layer
                </Button>
                <div className="flex gap-1 justify-between items-center">
                  <Text size="1">Shader</Text>
                  <Select.Root
                    size="1"
                    value={shader}
                    defaultValue="Phong"
                    onValueChange={handleShaderChange}
                  >
                    <Select.Trigger className="truncate w-3/4 min-w-3/4" />
                    <Select.Content className="truncate">
                      {shaders.map((shad, idx) => (
                        <Select.Item key={idx} value={shad}>
                          {shad}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
              </div>
            </Popover.Content>
          </Popover.Root>
          <Text size="1" color="gray">
            mesh
          </Text>
        </div>
      </Card>
      {image.layers.map((layer, idx) => (
        <MeshLayerCard key={idx} image={layer} parentMesh={image} idx={idx} />
      ))}
    </React.Fragment>
  )
}