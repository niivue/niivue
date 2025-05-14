// src/MainApp.tsx
import React, { useEffect, useRef, useState } from 'react'
import { NVImage, NVMesh, SLICE_TYPE, Niivue } from '@niivue/niivue'
import { Niimath } from '@niivue/niimath'
import { Sidebar } from './components/Sidebar'
import { Viewer } from './components/Viewer'
import { PreferencesDialog } from './components/PreferencesDialog'
import { LabelManagerDialog } from './components/LabelManagerDialog'
import { NiivueInstanceContext, useSelectedInstance, useAppContext } from './AppContext'
import { registerAllIpcHandlers } from './ipcHandlers/registerAllIpcHandlers'
import { registerSaveCompressedDocumentHandler } from './ipcHandlers/saveDocument'
import { fmriEvents, getColorForTrialType } from './types/events'
import { loadDroppedFiles } from './utils/dragAndDrop'
import { layouts } from '../../common/layouts'

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
  const { documents, selectedDocId, addDocument, selectDocument, updateDocument } = useAppContext()
  const selected = useSelectedInstance()

  // Create the first document on mount
  useEffect((): void => {
    if (documents.length === 0) {
      createNewDocument().catch(console.error)
    }
  }, [documents.length])

  // Listen for document:saved to update the tab title
  useEffect((): (() => void) => {
    const handleSaved = (_e: unknown, { id, path }: { id: string; path: string }): void => {
      const title =
        path
          .split('/')
          .pop()
          ?.replace(/\.nvd$/, '') || 'Untitled'
      updateDocument(id, { title })
    }
    electron.ipcRenderer.on('document:saved', handleSaved)
    return (): void => {
      electron.ipcRenderer.removeListener('document:saved', handleSaved)
    }
  }, [updateDocument])

  // When the selected document changes, restore its state and re-register IPC
  useEffect((): void => {
    if (!selected) return

    const nv = selected.nvRef.current
    // Restore opts
    Object.assign(nv.opts, selected.opts)
    // Restore sliceType
    if (selected.sliceType) {
      nv.setSliceType(selected.sliceType)
    }
    // Restore layout
    const layoutValue = layouts[selected.layout]
    if (layoutValue) {
      nv.setMultiplanarLayout(layoutValue)
    }
    // Restore mosaic string
    nv.setSliceMosaicString(selected.opts.sliceMosaicString || '')
    nv.drawScene()

    registerAllIpcHandlers(
      nv,
      selected.setVolumes,
      selected.setMeshes,
      setLabelDialogOpen,
      setLabelEditMode
    )
  }, [selected])

  // Open Label Manager from menu
  const [labelDialogOpen, setLabelDialogOpen] = useState<boolean>(false)
  const [labelEditMode, setLabelEditMode] = useState<boolean>(false)
  useEffect((): (() => void) => {
    const openLM = (): void => {
      setLabelDialogOpen(true)
      setLabelEditMode(false)
    }
    electron.ipcRenderer.on('openLabelManagerDialog', openLM)
    return (): void => {
      electron.ipcRenderer.removeAllListeners('openLabelManagerDialog')
    }
  }, [])

  // Clear scene command
  useEffect((): (() => void) => {
    const handleClear = (): void => {
      if (!selected) return
      const nv = selected.nvRef.current
      nv.volumes = []
      nv.meshes = []
      nv.mediaUrlMap.clear()
      nv.createEmptyDrawing()
      nv.drawScene()
      selected.setVolumes([])
      selected.setMeshes([])
      selected.setSelectedImage(null)
    }
    electron.ipcRenderer.on('clear-scene', handleClear)
    return (): void => {
      electron.ipcRenderer.removeAllListeners('clear-scene')
    }
  }, [selected])

  /**
   * Create a brand‐new Niivue document instance,
   * wire up its IPC & state setters, then add to context.
   */
  async function createNewDocument(): Promise<void> {
    const nv = new Niivue({ dragAndDropEnabled: false })
    const nvRef = { current: nv }
    const docId = `doc-${documents.length + 1}`

    // Placeholder: will be populated after addDocument runs
    let instance!: NiivueInstanceContext

    const doc: NiivueInstanceContext = {
      id: docId,
      nvRef,

      volumes: [],
      setVolumes: (vols: React.SetStateAction<NVImage[]>): void => {
        const old = instance.volumes
        const newVolumes = typeof vols === 'function' ? (vols as any)(old) : vols
        updateDocument(docId, { volumes: newVolumes })
      },

      meshes: [],
      setMeshes: (meshs: React.SetStateAction<NVMesh[]>): void => {
        const old = instance.meshes
        const newMeshes = typeof meshs === 'function' ? (meshs as any)(old) : meshs
        updateDocument(docId, { meshes: newMeshes })
      },

      selectedImage: null,
      setSelectedImage: (img: NVImage | null): void => {
        updateDocument(docId, { selectedImage: img })
      },

      sliceType: null,
      setSliceType: (st: SLICE_TYPE | null): void => {
        if (st != null) nv.setSliceType(st)
        updateDocument(docId, { sliceType: st })
      },

      opts: { ...nv.opts },
      setOpts: (opts): void => {
        nv.opts = { ...nv.opts, ...opts }
        updateDocument(docId, { opts: { ...nv.opts } })
      },

      layout: 'Row',
      setLayout: (layoutName: string): void => {
        const layoutValue = layouts[layoutName]
        if (layoutValue) nv.setMultiplanarLayout(layoutValue)
        updateDocument(docId, { layout: layoutName })
      },

      mosaicOrientation: 'A',
      setMosaicOrientation: (ori: 'A' | 'C' | 'S'): void => {
        updateDocument(docId, { mosaicOrientation: ori })
      },

      title: 'Untitled'
    }

    addDocument(doc)
    // grab the live instance for setters:
    instance = (documents.find((d) => d.id === docId) as NiivueInstanceContext) || doc

    // load persisted prefs
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

    registerSaveCompressedDocumentHandler(nv, docId, (newTitle: string): void => {
      updateDocument(docId, { title: newTitle })
    })

    nv.drawScene()
  }

  // Sidebar drag/drop handlers
  function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault()
  }
  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    if (!selected) return
    const nv = selected.nvRef.current
    nv.volumes = []
    nv.meshes = []
    nv.updateGLVolume()
    loadDroppedFiles(e, selected.setVolumes, selected.setMeshes, nv.gl)
  }

  // Sidebar remove/move
  function handleRemoveMesh(mesh: NVMesh): void {
    if (!selected) return
    const nv = selected.nvRef.current
    nv.removeMesh(mesh)
    selected.setMeshes((prev) => prev.filter((m) => m.id !== mesh.id))
  }
  function handleRemoveVolume(vol: NVImage): void {
    if (!selected) return
    const nv = selected.nvRef.current
    nv.removeVolume(vol)
    selected.setVolumes((prev) => prev.filter((v) => v.id !== vol.id))
  }
  function handleMoveVolumeUp(vol: NVImage): void {
    if (!selected) return
    const nv = selected.nvRef.current
    const vols = [...nv.volumes]
    const idx = vols.indexOf(vol)
    if (idx > 0) {
      vols.splice(idx, 1)
      vols.splice(idx - 1, 0, vol)
      nv.volumes = vols
      selected.setVolumes(vols)
    }
  }
  function handleMoveVolumeDown(vol: NVImage): void {
    if (!selected) return
    const nv = selected.nvRef.current
    const vols = [...nv.volumes]
    const idx = vols.indexOf(vol)
    if (idx < vols.length - 1) {
      vols.splice(idx, 1)
      vols.splice(idx + 1, 0, vol)
      nv.volumes = vols
      selected.setVolumes(vols)
    }
  }

  // Tab strip
  function renderTabs(): JSX.Element {
    return (
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
          onClick={(): void => void createNewDocument()}
        >
          +
        </div>
      </div>
    )
  }

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
