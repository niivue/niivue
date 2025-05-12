// src/MainApp.tsx
import React, { useEffect, useRef, useState } from 'react'
import { NVImage, NVMesh, SLICE_TYPE, Niivue } from '@niivue/niivue'
import { Niimath } from '@niivue/niimath'
import { Sidebar } from './components/Sidebar'
import { Viewer } from './components/Viewer'
import { PreferencesDialog } from './components/PreferencesDialog'
import { LabelManagerDialog } from './components/LabelManagerDialog'
import { AppContext, NiivueInstanceContext, useSelectedInstance } from './AppContext'
import { registerAllIpcHandlers } from './ipcHandlers/registerAllIpcHandlers'
import { fmriEvents, getColorForTrialType } from './types/events'
import { loadDroppedFiles } from './utils/dragAndDrop'

const electron = window.electron

function overrideDrawGraph(nv: Niivue) {
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

function MainApp(): JSX.Element {
  const niimathRef = useRef(new Niimath())
  const defaultNvRef = useRef<Niivue>(new Niivue({ dragAndDropEnabled: false }))
  const [labelDialogOpen, setLabelDialogOpen] = useState(false)
  const [labelEditMode, setLabelEditMode] = useState(false)

  const {
    documents,
    selectedDocId,
    addDocument,
    removeDocument,
    selectDocument
  } = React.useContext(AppContext)

  const selected = useSelectedInstance()

  const [volumes, setVolumes] = useState<NVImage[]>([])
  const [meshes, setMeshes] = useState<NVMesh[]>([])
  const [selectedImage, setSelectedImage] = useState<NVImage | null>(null)
  const [sliceType, setSliceType] = useState<SLICE_TYPE | null>(null)

  useEffect(() => {
    if (documents.length > 0) return

    const init = async () => {
      const nv = defaultNvRef.current

      const doc: NiivueInstanceContext = {
        id: 'doc-1',
        nvRef: defaultNvRef,
        volumes,
        setVolumes,
        meshes,
        setMeshes,
        selectedImage,
        setSelectedImage,
        sliceType,
        setSliceType
      }

      addDocument(doc)

      const prefs = await electron.ipcRenderer.invoke('getPreferences')
      Object.entries(prefs ?? {}).forEach(([key, value]) => {
        if (key in nv.opts) {
          // @ts-ignore
          nv.opts[key] = value
        }
      })

      nv.setSliceType(nv.sliceTypeMultiplanar)
      overrideDrawGraph(nv)

      await niimathRef.current.init()
      nv.drawScene()
    }

    init()
  }, [documents.length])

  useEffect(() => {
    if (!selected) return
    registerAllIpcHandlers(
      selected.nvRef.current,
      selected.setVolumes,
      selected.setMeshes,
      setLabelDialogOpen,
      setLabelEditMode
    )
  }, [selected])

  useEffect(() => {
    window.electron?.ipcRenderer.on('openLabelManagerDialog', () => {
      setLabelDialogOpen(true)
      setLabelEditMode(false)
    })
  }, [])

  useEffect(() => {
    const handleClearScene = () => {
      const nv = selected?.nvRef.current
      if (!nv) return
      nv.volumes = []
      nv.meshes = []
      nv.mediaUrlMap.clear()
      nv.createEmptyDrawing()
      nv.drawScene()
      selected.setVolumes([])
      selected.setMeshes([])
      selected.setSelectedImage(null)
    }

    electron.ipcRenderer.on('clear-scene', handleClearScene)
    return () => {
      electron.ipcRenderer.removeAllListeners('clear-scene')
    }
  }, [selected])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const nv = selected?.nvRef.current
    if (!nv || !selected) return
    nv.volumes = []
    nv.meshes = []
    nv.updateGLVolume()
    loadDroppedFiles(e, selected.setVolumes, selected.setMeshes, nv.gl)
  }

  const handleRemoveMesh = (mesh: NVMesh): void => {
    const nv = selected?.nvRef.current
    if (!nv) return
    nv.removeMesh(mesh)
    selected.setMeshes(prev => prev.filter(m => m.id !== mesh.id))
  }

  const handleRemoveVolume = (vol: NVImage): void => {
    const nv = selected?.nvRef.current
    if (!nv) return
    nv.removeVolume(vol)
    selected.setVolumes(prev => prev.filter(v => v.id !== vol.id))
  }

  const handleMoveVolumeUp = (vol: NVImage): void => {
    const nv = selected?.nvRef.current
    if (!nv) return
    const vols = [...nv.volumes]
    const index = vols.indexOf(vol)
    if (index > 0) {
      vols.splice(index, 1)
      vols.splice(index - 1, 0, vol)
      nv.volumes = vols
      selected.setVolumes(vols)
    }
  }

  const handleMoveVolumeDown = (vol: NVImage): void => {
    const nv = selected?.nvRef.current
    if (!nv) return
    const vols = [...nv.volumes]
    const index = vols.indexOf(vol)
    if (index < vols.length - 1) {
      vols.splice(index, 1)
      vols.splice(index + 1, 0, vol)
      nv.volumes = vols
      selected.setVolumes(vols)
    }
  }

  const renderTabs = () => (
    <div className="flex flex-row bg-gray-800 text-white px-2">
      {documents.map(doc => (
        <div
          key={doc.id}
          className={`px-4 py-2 cursor-pointer ${doc.id === selectedDocId ? 'bg-gray-700' : ''}`}
          onClick={() => selectDocument(doc.id)}
        >
          {doc.id}
        </div>
      ))}
    </div>
  )

  return (
    <>
      {renderTabs()}
      <div className="flex flex-row size-full" onDrop={handleDrop} onDragOver={handleDragOver}>
        <Sidebar
          onRemoveMesh={handleRemoveMesh}
          onRemoveVolume={handleRemoveVolume}
          onMoveVolumeUp={handleMoveVolumeUp}
          onMoveVolumeDown={handleMoveVolumeDown}
        />
        {selected && <Viewer doc={selected} />}
      </div>
      <PreferencesDialog />
      <LabelManagerDialog
        open={labelDialogOpen}
        setOpen={setLabelDialogOpen}
        editMode={labelEditMode}
        setEditMode={setLabelEditMode}
      />
    </>
  )
}

export default MainApp
