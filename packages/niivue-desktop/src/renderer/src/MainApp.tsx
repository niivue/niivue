// src/MainApp.tsx
import React, { useEffect, useRef, useState } from 'react'
import { NVImage, NVMesh, SLICE_TYPE, Niivue } from '@niivue/niivue'
import { Niimath } from '@niivue/niimath'
import { Sidebar } from './components/Sidebar.js'
import { Viewer } from './components/Viewer.js'
import { PreferencesDialog } from './components/PreferencesDialog.js'
import { LabelManagerDialog } from './components/LabelManagerDialog.js'
import { NiivueInstanceContext, useSelectedInstance, useAppContext } from './AppContext.js'
import { registerAllIpcHandlers } from './ipcHandlers/registerAllIpcHandlers.js'
import { fmriEvents, getColorForTrialType } from './types/events.js'
import { loadDroppedFiles } from './utils/dragAndDrop.js'
import { layouts } from '../../common/layouts.js'
import { NiimathToolbar } from './components/NiimathToolbar.js'

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
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const lastSyncedDoc = useRef<string | null>(null)
  const selected = useSelectedInstance()
  const modeMap = useRef(new Map<string, 'replace'|'overlay'>()).current
  const indexMap = useRef(new Map<string, number>()).current

  // Create the first document on mount
  useEffect((): void => {
    window.electron.setZoomFactor(1)
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

    nv.updateGLVolume()

    nv.drawScene()
    if (lastSyncedDoc.current !== selected.id) {
      // seed your React state with the current volumes & meshes
      selected.setVolumes([...nv.volumes])
      selected.setMeshes([...nv.meshes])
      lastSyncedDoc.current = selected.id
    }

    registerAllIpcHandlers(
      nv,
      selected.setVolumes,
      selected.setMeshes,
      setLabelDialogOpen,
      setLabelEditMode,
      modeMap,
      indexMap,
      (newTitle: string) => {
        updateDocument(selected.id, { title: newTitle })
      }
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
      updateDocument(selected.id, {
        volumes: [],
        meshes: [],
        selectedImage: null,
        isDirty: true
      })
    }
    electron.ipcRenderer.on('clear-scene', handleClear)
    return (): void => {
      electron.ipcRenderer.removeAllListeners('clear-scene')
    }
  }, [selected])

  useEffect(() => {
    // define once, with `selected` & `updateDocument` in scope
    const onSave = async (): Promise<void> => {
      if (!selected) return
      const { id, title, nvRef } = selected
      const nv = nvRef.current

      const jsonStr = JSON.stringify(nv.document.json())
      const base = (title || id).replace(/\.nvd(\.gz)?$/, '')
      const suggestedName = `${base}.nvd`
      const savedPath: string | undefined = await window.electron.ipcRenderer.invoke(
        'saveCompressedNVD',
        jsonStr,
        suggestedName
      )
      if (savedPath) {
        const raw = savedPath.split('/').pop() || suggestedName
        const newTitle = raw.replace(/\.nvd(\.gz)?$/, '') || suggestedName
        updateDocument(id, {
          title: newTitle,
          filePath: savedPath,
          isDirty: false
        })
      }
    }

    window.electron.ipcRenderer.on('saveCompressedDocument', onSave)
    return (): void => {
      window.electron.ipcRenderer.removeListener('saveCompressedDocument', onSave)
    }
  }, [selected, updateDocument])

  /**
   * Create a brand‐new Niivue document instance,
   * wire up its IPC & state setters, then add to context.
   */
  async function createNewDocument(): Promise<void> {
    const nv = new Niivue({ dragAndDropEnabled: false })
    // const nvRef = { current: nv }
    const docId = `doc-${documents.length + 1}`

    function getCurrent<T extends keyof NiivueInstanceContext>(
      field: T
    ): NiivueInstanceContext[T] | undefined {
      const d = documents.find((d) => d.id === docId)
      return d?.[field]
    }

    const setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>> = (action) => {
      const prev = (getCurrent('volumes') as NVImage[]) ?? []
      const next =
        typeof action === 'function' ? (action as (prev: NVImage[]) => NVImage[])(prev) : action
      updateDocument(docId, { volumes: next, isDirty: true })
    }

    const setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>> = (action) => {
      const prev = (getCurrent('meshes') as NVMesh[]) ?? []
      const next =
        typeof action === 'function' ? (action as (prev: NVMesh[]) => NVMesh[])(prev) : action
      updateDocument(docId, { meshes: next, isDirty: true })
    }

    const setSelectedImage: React.Dispatch<React.SetStateAction<NVImage | null>> = (action) => {
      const prev = getCurrent('selectedImage') as NVImage | null
      const next =
        typeof action === 'function'
          ? (action as (prev: NVImage | null) => NVImage | null)(prev)
          : action
      updateDocument(docId, { selectedImage: next, isDirty: true })
    }

    const setSliceType: React.Dispatch<React.SetStateAction<SLICE_TYPE | null>> = (action) => {
      const prev = getCurrent('sliceType') as SLICE_TYPE | null
      const next =
        typeof action === 'function'
          ? (action as (prev: SLICE_TYPE | null) => SLICE_TYPE | null)(prev)
          : action
      if (next !== null) nv.setSliceType(next)
      updateDocument(docId, { sliceType: next, isDirty: true })
    }

    const setOpts: React.Dispatch<React.SetStateAction<Partial<Niivue['opts']>>> = (action) => {
      // 1. Grab the previous opts from your context
      const prevOpts = getCurrent('opts') as Partial<Niivue['opts']>

      // 2. Compute the “next” opts, whether action is a value or updater fn
      const nextOpts =
        typeof action === 'function'
          ? (action as (prev: Partial<Niivue['opts']>) => Partial<Niivue['opts']>)(prevOpts)
          : action

      // 3. Apply to Niivue instance and push into your document state
      Object.assign(nv.opts, nextOpts)
      updateDocument(docId, { opts: { ...nv.opts }, isDirty: true })
    }

    const setLayout: React.Dispatch<React.SetStateAction<keyof typeof layouts>> = (action) => {
      const prevLayout = getCurrent('layout') as keyof typeof layouts
      const nextLayout =
        typeof action === 'function'
          ? (action as (prev: keyof typeof layouts) => keyof typeof layouts)(prevLayout)
          : action

      const layoutValue = layouts[nextLayout]
      if (layoutValue) nv.setMultiplanarLayout(layoutValue)
      updateDocument(docId, { layout: nextLayout, isDirty: true })
    }

    // 2) Mosaic orientation setter
    type Ori = 'A' | 'C' | 'S'
    const setMosaicOrientation: React.Dispatch<React.SetStateAction<Ori>> = (action) => {
      const prevOri = getCurrent('mosaicOrientation') as Ori
      const nextOri =
        typeof action === 'function' ? (action as (prev: Ori) => Ori)(prevOri) : action

      // if you need to drive Niivue itself:
      // nv.setSliceMosaicOrientation?.(nextOri)

      updateDocument(docId, { mosaicOrientation: nextOri, isDirty: true })
    }

    const doc: NiivueInstanceContext = {
      id: docId,
      nvRef: { current: nv },

      volumes: [],
      setVolumes,

      meshes: [],
      setMeshes,

      selectedImage: null,
      setSelectedImage,

      sliceType: null,
      setSliceType,

      opts: { ...nv.opts },
      setOpts,

      layout: 'Row',
      setLayout,

      mosaicOrientation: 'A',
      setMosaicOrientation,

      title: 'Untitled',

      filePath: null,
      isDirty: false
    }

    addDocument(doc)

    // load persisted prefs
    const prefs = await electron.ipcRenderer.invoke('getPreferences')
    Object.entries(prefs ?? {}).forEach(([key, value]) => {
      if (key in nv.opts) {
        nv.opts[key] = value
      }
    })

    nv.setSliceType(nv.sliceTypeMultiplanar)
    overrideDrawGraph(nv)
    await niimathRef.current.init()

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
    selected.setMeshes((prev) => {
      updateDocument(selected.id, { isDirty: true })
      return prev.filter((m) => m.id !== mesh.id)
    })
  }
  function handleRemoveVolume(vol: NVImage): void {
    if (!selected) return
    const nv = selected.nvRef.current
    nv.removeVolume(vol)
    selected.setVolumes((prev) => {
      updateDocument(selected.id, { isDirty: true })
      return prev.filter((v) => v.id !== vol.id)
    })
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
      updateDocument(selected.id, { isDirty: true })
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
      updateDocument(selected.id, { isDirty: true })
    }
  }

  // Tab strip
  function renderTabs(nv: Niivue): JSX.Element {
    return (
      <div className="flex flex-row bg-gray-800 text-white px-2">
        {documents.map((doc) => {
          const isEditing = doc.id === editingDocId
          return (
            <div
              key={doc.id}
              className={`px-4 py-2 cursor-pointer ${
                doc.id === selectedDocId ? 'bg-gray-700' : ''
              }`}
              onClick={() => {
                if (!isEditing) selectDocument(doc.id)
              }}
              draggable
              onDragStart={(e) => {
                e.preventDefault()
                const fileName = `${doc.title || doc.id}.nvd`
                const jsonStr = JSON.stringify(nv.document.json(), null, 2)
                window.electron.startTabDrag(fileName, jsonStr)
              }}
            >
              {isEditing ? (
                <input
                  type="text"
                  className="bg-white text-black px-1 py-0.5 w-full"
                  value={editingName}
                  autoFocus
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => {
                    const newTitle = editingName.trim() || doc.id
                    updateDocument(doc.id, { title: newTitle, isDirty: true })
                    setEditingDocId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const newTitle = editingName.trim() || doc.id
                      updateDocument(doc.id, { title: newTitle, isDirty: true })
                      setEditingDocId(null)
                    } else if (e.key === 'Escape') {
                      setEditingDocId(null)
                    }
                  }}
                />
              ) : (
                <span
                  onDoubleClick={() => {
                    setEditingDocId(doc.id)
                    setEditingName(doc.title ?? '')
                  }}
                >
                  {(doc.title || doc.id) + (doc.isDirty ? ' *' : '')}
                </span>
              )}
            </div>
          )
        })}

        <div
          className="px-4 py-2 cursor-pointer bg-green-700 hover:bg-green-600"
          onClick={() => void createNewDocument()}
        >
          +
        </div>
      </div>
    )
  }

  return (
    <>
      {selected?.nvRef.current && renderTabs(selected.nvRef.current)}
      <NiimathToolbar modeMap={modeMap} indexMap={indexMap} />
      <div className="flex flex-row size-full" onDrop={handleDrop} onDragOver={handleDragOver}>
        <Sidebar
          onRemoveMesh={handleRemoveMesh}
          onRemoveVolume={handleRemoveVolume}
          onMoveVolumeUp={handleMoveVolumeUp}
          onMoveVolumeDown={handleMoveVolumeDown}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        {selected && <Viewer doc={selected} collapsed={sidebarCollapsed} />}
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
