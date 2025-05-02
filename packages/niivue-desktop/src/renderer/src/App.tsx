import { Sidebar } from './components/Sidebar'
import { Viewer } from './components/Viewer'
import React, { createContext, useEffect, useRef, useState } from 'react'
import { NVImage, NVMesh, SLICE_TYPE, Niivue, SHOW_RENDER } from '@niivue/niivue'
import { Niimath } from '@niivue/niimath'
import { loadDroppedFiles } from './utils/dragAndDrop'
import { registerLoadStandardHandler } from './ipcHandlers/loadStandard'
import { registerLoadRecentFileHandler } from './ipcHandlers/loadRecentFiles'
import {
  registerLayoutHandler,
  registerSliceTypeHandler,
  registerCrosshairHandler,
  registerOrientationLabelsPositionHandler,
  registerOrientationLabelsHeightHandler,
  registerOrientationCubeHandler,
  registerColorbarHandler,
  registerRulerHander,
  register3DCrosshairHandler,
  registerDragModeHandler,
  registerMultiplanarEqualSizeHandler,
  registerOrientationLabelsInMarginHandler,
  registerResetPreferencesHandler,
  registerLabelManagerDialogHandler
} from './ipcHandlers/menuHandlers'
import { registerLoadMeshHandler } from './ipcHandlers/loadMesh'
import { registerLoadVolumeHandler } from './ipcHandlers/loadVolume'
import { registerLoadDocumentHandler } from './ipcHandlers/loadDocument'
import { registerSaveCompressedDocumentHandler } from './ipcHandlers/saveDocument'
import { fmriEvents, getColorForTrialType } from './types/events'
import { PreferencesDialog } from './components/PreferencesDialog'
import { LabelManagerDialog } from './components/LabelManagerDialog'

const electron = window.electron

// disable niivue drag and drop handler in favor of our custom electron solution
const nv = new Niivue({
  // loadingText: '',
  dragAndDropEnabled: false,
  // multiplanarEqualSize: true,
  // tileMargin: -1
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

function overrideDrawGraph(nv: any) {
  const originalDrawGraph = nv.drawGraph.bind(nv)

  nv.drawGraph = () => {
    originalDrawGraph()

    if (!nv.graph.plotLTWH || !fmriEvents.length) return

    const [plotX, plotY, plotW, plotH] = nv.graph.plotLTWH
    const numFrames = nv.graph.lines?.[0]?.length || 0
    if (numFrames === 0) return

    const hdr = nv.volumes[0]?.hdr
    const TR = hdr?.pixDims?.[4] ?? 1
    const scaleW = plotW / numFrames

    for (const ev of fmriEvents) {
      const startFrame = ev.onset / TR
      const endFrame = (ev.onset + ev.duration) / TR
      const x0 = plotX + startFrame * scaleW
      const x1 = plotX + endFrame * scaleW
      const color = getColorForTrialType(ev.trial_type)
      nv.drawRect([x0, plotY, x1 - x0, plotH], color)
    }
  }
}

function App(): JSX.Element {
  const [volumes, setVolumes] = useState<NVImage[]>([])
  const [meshes, setMeshes] = useState<NVMesh[]>([])
  const [selectedImage, setSelectedImage] = useState<NVImage | null>(null)
  const [sliceType, setSliceType] = useState<SLICE_TYPE | null>(null)
  const [labelDialogOpen, setLabelDialogOpen] = useState(false)
  const [labelEditMode, setLabelEditMode] = useState(false)

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

  const handleRemoveMesh = (mesh: NVMesh): void => {
    nv.removeMesh(mesh)
    setMeshes((prev) => prev.filter((m) => m.id !== mesh.id))
  }

  const handleRemoveVolume = (vol: NVImage): void => {
    nv.removeVolume(vol)
    setVolumes((prev) => prev.filter((v) => v.id !== vol.id))
  }

  const handleMoveVolumeUp = (vol: NVImage): void => {
    // deduplicate images
    const set = new Set<NVImage>([...volumes])
    nv.volumes = Array.from(set)
    let index = nv.volumes.indexOf(vol)
    if (index > 0) {
      --index
      nv.setVolume(vol, index)
      setVolumes([...nv.volumes])
    }
  }

  const handleMoveVolumeDown = (vol: NVImage): void => {
    // deduplicate images
    const set = new Set<NVImage>([...volumes])
    nv.volumes = Array.from(set)
    let index = nv.volumes.indexOf(vol)
    if (index < nv.volumes.length - 1) {
      ++index
      nv.setVolume(vol, index)
      setVolumes([...nv.volumes])
    }
  }
  
  useEffect(() => {
    window.electron?.ipcRenderer.on('openLabelManagerDialog', () => {
      console.log('[Renderer] Received openLabelManagerDialog')
      setLabelDialogOpen(true)
      setLabelEditMode(false)
    })
  }, [])

  useEffect(() => {    
    const initApp = async (): Promise<void> => {
      const prefs = await electron.ipcRenderer.invoke('getPreferences')
  
      if (prefs) {
        console.log('Loaded preferences:', prefs)
        console.log('options', nv.opts)        
        Object.entries(prefs).forEach(([key, value]) => {          
          if (key in nv.opts) {
            // @ts-ignore
            nv.opts[key] = value
          }
        })
      }
      nv.setSliceType(nv.sliceTypeMultiplanar)
      // nv.graph.autoSizeMultiplanar = true
      // nv.opts.multiplanarShowRender = SHOW_RENDER.ALWAYS
      if (!nv._gl) return

      // override the default graph drawing function
      overrideDrawGraph(nv)
      const niimath = niimathRef.current
      await niimath.init()
  
      // // const volBase64 = await electron.ipcRenderer.invoke('loadStandard', 'mni152.nii.gz')
      // // const vol = await NVImage.loadFromBase64({
      // //   base64: volBase64,
      // //   name: 'mni152.nii.gz'
      // // })
      // // const meshBase64ICBM = await electron.ipcRenderer.invoke('loadStandard', 'ICBM152.lh.mz3')
      // // const arrayBufferICBM = Uint8Array.from(atob(meshBase64ICBM), (c) => c.charCodeAt(0)).buffer
      // // const meshICBM = await NVMesh.loadFromFile({
      // //   file: new File([arrayBufferICBM], 'ICBM152.lh.mz3'),
      // //   gl: nv.gl,
      // //   name: 'ICBM152.lh.mz3'
      // // })
  
      // setVolumes([vol])
      // setMeshes([meshICBM])
  
      // now register handlers
      registerLoadStandardHandler({ nv, setVolumes, setMeshes })
      registerLoadRecentFileHandler({ nv, setVolumes, setMeshes })
      registerSliceTypeHandler(nv)
      registerLayoutHandler(nv)
      registerCrosshairHandler(nv)
      registerOrientationLabelsPositionHandler(nv)
      registerOrientationLabelsHeightHandler(nv)
      registerOrientationCubeHandler(nv)
      registerColorbarHandler(nv)
      registerRulerHander(nv)
      register3DCrosshairHandler(nv)
      registerDragModeHandler(nv)
      registerMultiplanarEqualSizeHandler(nv)
      registerOrientationLabelsInMarginHandler(nv)
      registerLoadMeshHandler({ nv, setMeshes })
      registerLoadVolumeHandler({ setVolumes })
      registerLoadDocumentHandler({nv, setVolumes, setMeshes})
      registerSaveCompressedDocumentHandler(nv)
      registerResetPreferencesHandler()
      registerLabelManagerDialogHandler(setLabelDialogOpen, setLabelEditMode)
      nv.drawScene() // draw after loading prefs
    }
  
    initApp()
  }, [])

  useEffect(() => {
    const handleClearScene = () => {
      nv.volumes = []
      nv.meshes = []
      nv.mediaUrlMap.clear()
      nv.createEmptyDrawing()
      nv.drawScene()
      setVolumes([])
      setMeshes([])
      setSelectedImage(null)
    }

    electron.ipcRenderer.on('clear-scene', handleClearScene)

    return () => {
      electron.ipcRenderer.removeAllListeners('clear-scene')
    }
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
        <Sidebar
          onRemoveMesh={handleRemoveMesh}
          onRemoveVolume={handleRemoveVolume}
          onMoveVolumeUp={handleMoveVolumeUp}
          onMoveVolumeDown={handleMoveVolumeDown}
        />
        <Viewer />
      </div>
      <PreferencesDialog />
      <LabelManagerDialog open={labelDialogOpen} setOpen={setLabelDialogOpen} editMode={labelEditMode} setEditMode={setLabelEditMode} />
    </AppContext.Provider>
  )
}

export default App
