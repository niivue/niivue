import { Sidebar } from './components/Sidebar'
import { Viewer } from './components/Viewer'
import { Divider } from './components/Divider'
import { createContext, useEffect, useRef, useState } from 'react'
import { NVImage, NVMesh, SLICE_TYPE } from '@niivue/niivue'
import { Niimath } from '@niivue/niimath'
import { loadDroppedFiles } from './utils/dragAndDrop'

declare global {
  interface Window {
    api: {
      loadFromFile: (path: string) => Promise<string>
    }
  }
}

type AppCtx = {
  volumes: NVImage[]
  setVolumes: (volumes: NVImage[]) => void
  meshes: NVMesh[]
  setMeshes: (meshes: NVMesh[]) => void
  selectedImage: NVImage | null
  setSelectedImage: (image: NVImage | null) => void
  sliceType: SLICE_TYPE | null
  setSliceType: (sliceType: SLICE_TYPE | null) => void
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
    loadDroppedFiles(e, setVolumes)
  }

  useEffect(() => {
    const init = async (): Promise<void> => {
      const niimath = niimathRef.current
      await niimath.init()
    }
    init()
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
        setSliceType
      }}
    >
      <div className="flex flex-row size-full" onDrop={handleDrop} onDragOver={handleDragOver}>
        <Sidebar />
        <Divider />
        <Viewer />
      </div>
    </AppContext.Provider>
  )
}

export default App
