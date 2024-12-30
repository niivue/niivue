import { Sidebar } from './components/Sidebar'
import { Viewer } from './components/Viewer'
import React, { createContext, useEffect, useRef, useState } from 'react'
import { NVImage, NVMesh, SLICE_TYPE, Niivue } from '@niivue/niivue'
import { Niimath } from '@niivue/niimath'
import { loadDroppedFiles } from './utils/dragAndDrop'

// disable niivue drag and drop handler in favor of the electron handler
const nv = new Niivue({ loadingText: '', dragAndDropEnabled: false })

// declare global types for window.api for better type checking.
// These are the custom APIs exposed to the renderer process from our preload script.
declare global {
  interface Window {
    api: {
      loadFromFile: (path: string) => Promise<string>
      loadStandard: (path: string) => Promise<string>
      onToggleCrosshair: (callback: (state: boolean) => void) => void
    }
  }
}

// listen for toggleCrosshair event from main process
window.api.onToggleCrosshair((state: boolean) => {
  if (state) {
    nv.setCrosshairWidth(1)
  } else {
    nv.setCrosshairWidth(0)
  }
})

type AppCtx = {
  volumes: NVImage[]
  setVolumes: (volumes: NVImage[]) => void
  meshes: NVMesh[]
  setMeshes: (meshes: NVMesh[]) => void
  selectedImage: NVImage | null
  setSelectedImage: (image: NVImage | null) => void
  sliceType: SLICE_TYPE | null
  setSliceType: (sliceType: SLICE_TYPE | null) => void
  // store niivue instance as a ref
  nvRef: React.MutableRefObject<Niivue>
}

// setup context provider for the app
export const AppContext = createContext<AppCtx>(null as unknown as AppCtx)

function App(): JSX.Element {
  const [volumes, setVolumes] = useState<NVImage[]>([])
  const [meshes, setMeshes] = useState<NVMesh[]>([])
  const [selectedImage, setSelectedImage] = useState<NVImage | null>(null)
  const [sliceType, setSliceType] = useState<SLICE_TYPE | null>(null)
  const niimathRef = useRef<Niimath>(new Niimath())

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    nv.volumes = []
    nv.meshes = []
    nv.updateGLVolume()
    loadDroppedFiles(e, setVolumes, setMeshes, nv.gl)
  }

  useEffect(() => {
    console.log('nv.gl', nv._gl)
    if (!nv._gl) return
    const init = async (): Promise<void> => {
      const niimath = niimathRef.current
      await niimath.init()
    }
    init()
    const loadImages = async (): Promise<void> => {
      const volBase64 = await window.api.loadStandard('mni152.nii.gz')
      const vol = NVImage.loadFromBase64({
        base64: volBase64,
        name: 'mni152.nii.gz'
      })
      const meshBase64 = await window.api.loadStandard('aal.mz3')
      const arrayBuffer = Uint8Array.from(atob(meshBase64), (c) => c.charCodeAt(0)).buffer
      const mesh = await NVMesh.loadFromFile({
        file: new File([arrayBuffer], 'aal.mz3'),
        gl: nv.gl,
        name: 'aal.mz3'
      })
      setVolumes([vol])
      setMeshes([mesh])
    }
    loadImages()
  }, [])

  return (
    <AppContext.Provider
      value={{
        volumes,
        setVolumes,
        meshes,
        setMeshes,
        selectedImage,
        setSelectedImage,
        sliceType,
        setSliceType,
        nvRef: useRef<Niivue>(nv)
      }}
    >
      <div className="flex flex-row size-full" onDrop={handleDrop} onDragOver={handleDragOver}>
        <Sidebar />
        <Viewer />
      </div>
    </AppContext.Provider>
  )
}

export default App
