import React, { useEffect, useRef, useState } from 'react'
import { ContextMenu, Card, Text, Popover, Select, Button } from '@radix-ui/themes'
import { NVMesh, NVMeshLayerDefaults } from '@niivue/niivue'
import { baseName } from '../utils/baseName.js'
import { useSelectedInstance } from '../AppContext.js'
import { MeshLayerCard } from './MeshLayerCard.js'
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
  const imageRef = useRef(image) // keep latest image available to the handler
  const instance = useSelectedInstance()
  const nv = instance?.nvRef.current
  const setMeshes = instance?.setMeshes
  if (!nv || !setMeshes) return <></>

  // keep ref in sync whenever `image` changes
useEffect(() => {
  imageRef.current = image
}, [image])

useEffect(() => {
  // handler that can run many times (for multiple layers)
  const handler = async (_: any, path: string): Promise<void> => {
  try {
    console.log('openMeshFileDialogResult', path)

    const layerBase64 = await electron.ipcRenderer.invoke('loadFromFile', path)

    const layerOptions = {
      ...NVMeshLayerDefaults,
      // help Niivue if it copies these, but don't rely on it
      name: path,
      url: path,
      opacity: 1,
      colormap: 'warm',
      base64: layerBase64
    }

    // use the latest instance
    const img = imageRef.current

    // loadLayer mutates img in-place and returns void
    await NVMesh.loadLayer(layerOptions, img)

    // ensure the last layer exists and explicitly set its name/url
    if (!img.layers || img.layers.length === 0) {
      console.warn('No layers present after loadLayer', img)
    } else {
      const lastIdx = img.layers.length - 1
      const lastLayer = img.layers[lastIdx]

      // explicitly assign name/url onto the real layer object
      lastLayer.name = path
      lastLayer.url = path

      // If you want to make a shallow copy of that single layer (so child components
      // that depend on identity update) you can replace it with a new object:
      // img.layers[lastIdx] = { ...lastLayer }
      // But don't clone the whole `img` (that loses NVMesh prototype/methods)
    }

    // Put the exact mutated NVMesh instance into state (preserve prototype & methods)
    setMeshes((prev: NVMesh[]) => prev.map((m) => (m.id === img.id ? img : m)))

    // helpful debug
    console.log('mesh layers after load:', img.layers)
  } catch (err) {
    console.error('Failed to load mesh layer:', err)
  }
}



  // register the listener (many times allowed)
  electron.ipcRenderer.on('openMeshFileDialogResult', handler)

  // cleanup on unmount
  return () => {
    electron.ipcRenderer.removeListener('openMeshFileDialogResult', handler)
  }
}, []) // run once on mount

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
