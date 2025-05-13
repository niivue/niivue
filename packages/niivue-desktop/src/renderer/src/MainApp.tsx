import React, { useEffect, useRef, useState } from 'react'
import { NVImage, NVMesh, SLICE_TYPE, Niivue } from '@niivue/niivue'
import { Niimath } from '@niivue/niimath'
import { Sidebar } from './components/Sidebar'
import { Viewer } from './components/Viewer'
import { PreferencesDialog } from './components/PreferencesDialog'
import { LabelManagerDialog } from './components/LabelManagerDialog'
import { NiivueInstanceContext, useSelectedInstance } from './AppContext'
import { registerAllIpcHandlers } from './ipcHandlers/registerAllIpcHandlers'
import { registerSaveCompressedDocumentHandler } from './ipcHandlers/saveDocument'
import { fmriEvents, getColorForTrialType } from './types/events'
import { loadDroppedFiles } from './utils/dragAndDrop'
import { useAppContext } from './AppContext'
import { IpcRendererEvent } from 'electron'

const electron = window.electron

function overrideDrawGraph(nv: Niivue): void {
  const originalDrawGraph = nv.drawGraph.bind(nv)
  nv.drawGraph = (): void => {
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
  const [labelDialogOpen, setLabelDialogOpen] = useState(false)
  const [labelEditMode, setLabelEditMode] = useState(false)

  const { documents, selectedDocId, addDocument, removeDocument, selectDocument, updateDocument } =
    useAppContext()

  const selected = useSelectedInstance()

  useEffect((): void => {
    if (documents.length > 0) return
    createNewDocument()
  }, [documents.length])

  useEffect((): (() => void) => {
    const handleSaved = (
      _e: IpcRendererEvent,
      { id, path }: { id: string; path: string }
    ): void => {
      const title = path.split('/').pop()?.replace(/\.nvd$/, '') || 'Untitled'
      updateDocument(id, { title })
    }
    electron.ipcRenderer.on('document:saved', handleSaved)
    return () => {
      electron.ipcRenderer.removeListener('document:saved', handleSaved)
    }
  }, [updateDocument])

  const createNewDocument = async (): Promise<void> => {
    const nv = new Niivue({ dragAndDropEnabled: false })
    const nvRef = { current: nv }
    const docId = `doc-${documents.length + 1}`

    const resolveState = <T,>(val: React.SetStateAction<T>, current: T): T =>
      typeof val === 'function' ? (val as (prev: T) => T)(current) : val

    const doc: NiivueInstanceContext = {
      id: docId,
      nvRef,
      volumes: [],
      setVolumes: (vols: React.SetStateAction<NVImage[]>): void => {
        const currentVols = documents.find((d) => d.id === docId)?.volumes || []
        updateDocument(docId, { volumes: resolveState(vols, currentVols) })
      },
      meshes: [],
      setMeshes: (meshes: React.SetStateAction<NVMesh[]>): void => {
        const currentMeshes = documents.find((d) => d.id === docId)?.meshes || []
        updateDocument(docId, { meshes: resolveState(meshes, currentMeshes) })
      },
      selectedImage: null,
      setSelectedImage: (img: NVImage | null): void => {
        updateDocument(docId, { selectedImage: img })
      },
      sliceType: null,
      setSliceType: (st: SLICE_TYPE | null): void => {
        updateDocument(docId, { sliceType: st })
      },
      opts: { ...nv.opts },
      setOpts: (opts: Partial<typeof nv.opts>): void => {
        updateDocument(docId, {
          opts: {
            ...nv.opts,
            ...opts
          }
        })
      },
      title: 'Untitled'
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

    registerSaveCompressedDocumentHandler(nv, docId, (title: string): void => {
      updateDocument(docId, { title })
    })

    nv.drawScene()
  }

  useEffect((): void => {
    if (!selected) return
    registerAllIpcHandlers(
      selected.nvRef.current,
      selected.setVolumes,
      selected.setMeshes,
      setLabelDialogOpen,
      setLabelEditMode
    )
  }, [selected])

  useEffect((): void => {
    window.electron?.ipcRenderer.on('openLabelManagerDialog', () => {
      setLabelDialogOpen(true)
      setLabelEditMode(false)
    })
  }, [])

  useEffect((): (() => void) => {
    const handleClearScene = (): void => {
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

  useEffect(() => {
    if (!selected) return
    const nv = selected.nvRef.current
    if (!nv) return
  
    // Apply the document-specific opts to the Niivue instance
    Object.assign(nv.opts, selected.opts)
  
    nv.drawScene()
  }, [selected])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
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
    selected.setMeshes((prev) => prev.filter((m) => m.id !== mesh.id))
  }

  const handleRemoveVolume = (vol: NVImage): void => {
    const nv = selected?.nvRef.current
    if (!nv) return
    nv.removeVolume(vol)
    selected.setVolumes((prev) => prev.filter((v) => v.id !== vol.id))
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

  const renderTabs = (): JSX.Element => (
    <div className="flex flex-row bg-gray-800 text-white px-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className={`px-4 py-2 cursor-pointer ${doc.id === selectedDocId ? 'bg-gray-700' : ''}`}
          onClick={(): void => selectDocument(doc.id)}
        >
          {doc.title || doc.id}
        </div>
      ))}
      <div
        className="px-4 py-2 cursor-pointer bg-green-700 hover:bg-green-600"
        onClick={() => {
          void createNewDocument()
        }}
      >
        +
      </div>
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
