import { Sidebar } from './components/Sidebar'
import { Viewer } from './components/Viewer'
import React, { createContext, useEffect, useRef, useState } from 'react'
import { NVImage, NVMesh, SLICE_TYPE, Niivue } from '@niivue/niivue'
import { Niimath } from '@niivue/niimath'
import { loadDroppedFiles } from './utils/dragAndDrop'
import { registerLoadStandardHandler } from './ipcHandlers/loadStandard'
const electron = window.electron

// disable niivue drag and drop handler in favor of the electron handler
const nv = new Niivue({ loadingText: '', dragAndDropEnabled: false })

electron.ipcRenderer.on('toggleCrosshair', (_, state) => {
  if (state) {
    nv.setCrosshairWidth(1)
  } else {
    nv.setCrosshairWidth(0)
  }
})

type AppCtx = {
  volumes: NVImage[]
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
  meshes: NVMesh[]
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
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
    const initNiimath = async (): Promise<void> => {
      const niimath = niimathRef.current
      await niimath.init()
    }
    initNiimath()
    const loadImages = async (): Promise<void> => {
      const volBase64 = await electron.ipcRenderer.invoke('loadStandard', 'mni152.nii.gz')
      const vol = NVImage.loadFromBase64({
        base64: volBase64,
        name: 'mni152.nii.gz'
      })
      const meshBase64 = await electron.ipcRenderer.invoke('loadStandard', 'aal.mz3')
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
    registerLoadStandardHandler({ nv, setVolumes, setMeshes })
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
