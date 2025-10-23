// src/MainApp.tsx
import React, { useEffect, useRef, useState } from 'react'
import { NVImage, NVMesh, NiiVueLocation, Niivue } from '@niivue/niivue'
import { Sidebar } from './components/Sidebar.js'
import { Viewer } from './components/Viewer.js'
import { PreferencesDialog } from './components/PreferencesDialog.js'
import { LabelManagerDialog } from './components/LabelManagerDialog.js'
import { NiivueInstanceContext, useSelectedInstance, useAppContext } from './AppContext.js'
import { registerAllIpcHandlers } from './ipcHandlers/registerAllIpcHandlers.js'
// import { fmriEvents, getColorForTrialType } from './types/events.js'
// import { loadDroppedFiles } from './utils/dragAndDrop.js'
// import { layouts } from '../../common/layouts.js'
import { NiimathToolbar } from './components/NiimathToolbar.js'
import { StatusBar } from './components/StatusBar.js'
import { DicomImportDialog } from './components/DicomImportDialog.js'

const electron = window.electron

// function overrideDrawGraph(nv: Niivue): void {
//   const originalDrawGraph = nv.drawGraph.bind(nv)
//   nv.drawGraph = (): void => {
//     originalDrawGraph()
//     if (!nv.graph.plotLTWH || !fmriEvents.length) return
//     const [plotX, plotY, plotW, plotH] = nv.graph.plotLTWH
//     const numFrames = nv.graph.lines?.[0]?.length || 0
//     if (numFrames === 0) return
//     const hdr = nv.volumes[0]?.hdr
//     const TR = hdr?.pixDims?.[4] ?? 1
//     const scaleW = plotW / numFrames
//     for (const ev of fmriEvents) {
//       const startFrame = ev.onset / TR
//       const endFrame = (ev.onset + ev.duration) / TR
//       const x0 = plotX + startFrame * scaleW
//       const x1 = plotX + endFrame * scaleW
//       const color = getColorForTrialType(ev.trial_type)
//       nv.drawRect([x0, plotY, x1 - x0, plotH], color)
//     }
//   }
// }

function MainApp(): JSX.Element {
  const {
    documents,
    selectedDocId,
    // addDocument,
    selectDocument,
    updateDocument,
    removeDocument,
    createDocument
  } = useAppContext()
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { showNiimathToolbar, showStatusBar } = useAppContext()
  const [cursorLocation, setCursorLocation] = useState<string>('')
  const lastSyncedDoc = useRef<string | null>(null)
  const selected = useSelectedInstance()
  const modeMap = useRef(new Map<string, 'replace' | 'overlay'>()).current
  const indexMap = useRef(new Map<string, number>()).current

  const getTarget = async (): Promise<NiivueInstanceContext> => {
    if (!selected) throw new Error('no document!')
    const hasContent = selected.volumes.length > 0 || selected.meshes.length > 0
    if (!hasContent) return selected
    return createDocument()
  }

  // Create the first document on mount
  useEffect((): void => {
    window.electron.setZoomFactor(1)
    if (documents.length === 0) {
      createDocument().catch(console.error)
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

  useEffect(() => {
    if (showStatusBar && selected?.nvRef.current) {
      console.log('calling get current cursor location')
      selected.nvRef.current.createOnLocationChange()
    }
  }, [showStatusBar, selected])

  // When the selected document changes, restore its state and re-register IPC
  // inside MainApp()
  // inside MainApp.tsx
  useEffect(() => {
    if (!selected) return
    const nv = selected.nvRef.current
    nv.onLocationChange = (location: unknown): void => {
      if (typeof location === 'object' && location !== null && 'string' in location) {
        const loc = location as NiiVueLocation
        setCursorLocation(loc.string ?? '')
      } else {
        setCursorLocation('')
      }
    }

    // Restore viewer prefs
    // Object.assign(nv.opts, selected.opts)
    // if (selected.sliceType) nv.setSliceType(selected.sliceType)
    // const layoutVal = layouts[selected.layout]
    // if (layoutVal) nv.setMultiplanarLayout(layoutVal)
    // nv.setSliceMosaicString(selected.opts.sliceMosaicString ?? '')

    // Re-draw everything
    nv.updateGLVolume()
    nv.drawScene()

    // Seed React state on first sync
    if (lastSyncedDoc.current !== selected.id) {
      selected.setVolumes([...nv.volumes])
      selected.setMeshes([...nv.meshes])
      // restore selectedImage
      const prev = selected.selectedImage
      const found = prev ? nv.volumes.find((v) => v.id === prev.id) : undefined
      selected.setSelectedImage(found ?? nv.volumes[0] ?? null)
      lastSyncedDoc.current = selected.id
    }

    // Re‑register all your IPC handlers
    registerAllIpcHandlers({
      modeMap,
      indexMap,
      nv: selected.nvRef.current!, // raw Niivue instance for menu handlers
      docId: selected.id,
      setVolumes: selected.setVolumes,
      setMeshes: selected.setMeshes,
      getTarget,
      getTitle: () => selected.title || selected.id,
      setLabelDialogOpen,
      setLabelEditMode,
      onDocumentLoaded: (newTitle: string, targetId: string) =>
        updateDocument(targetId, { title: newTitle, isDirty: true }),
      onMosaicStringChange: selected.setSliceMosaicString
    })
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

  // /**
  //  * Create a brand‐new Niivue document instance,
  //  * wire up its IPC & state setters, then add to context.
  //  */
  // async function createNewDocument(): Promise<void> {
  //   const nv = new Niivue({ dragAndDropEnabled: false })
  //   // const nvRef = { current: nv }
  //   const docId = `doc-${documents.length + 1}`

  //   function getCurrent<T extends keyof NiivueInstanceContext>(
  //     field: T
  //   ): NiivueInstanceContext[T] | undefined {
  //     const d = documents.find((d) => d.id === docId)
  //     return d?.[field]
  //   }

  //   const setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>> = (action) => {
  //     const prev = (getCurrent('volumes') as NVImage[]) ?? []
  //     const next =
  //       typeof action === 'function' ? (action as (prev: NVImage[]) => NVImage[])(prev) : action
  //     updateDocument(docId, { volumes: next, isDirty: true })
  //   }

  //   const setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>> = (action) => {
  //     const prev = (getCurrent('meshes') as NVMesh[]) ?? []
  //     const next =
  //       typeof action === 'function' ? (action as (prev: NVMesh[]) => NVMesh[])(prev) : action
  //     updateDocument(docId, { meshes: next, isDirty: true })
  //   }

  //   const setSelectedImage: React.Dispatch<React.SetStateAction<NVImage | null>> = (action) => {
  //     const prev = getCurrent('selectedImage') as NVImage | null
  //     const next =
  //       typeof action === 'function'
  //         ? (action as (prev: NVImage | null) => NVImage | null)(prev)
  //         : action
  //     updateDocument(docId, { selectedImage: next, isDirty: true })
  //   }

  //   const setSliceType: React.Dispatch<React.SetStateAction<SLICE_TYPE | null>> = (action) => {
  //     const prev = getCurrent('sliceType') as SLICE_TYPE | null
  //     const next =
  //       typeof action === 'function'
  //         ? (action as (prev: SLICE_TYPE | null) => SLICE_TYPE | null)(prev)
  //         : action
  //     if (next !== null) nv.setSliceType(next)
  //     updateDocument(docId, { sliceType: next, isDirty: true })
  //   }

  //   const setSliceMosaicString: React.Dispatch<React.SetStateAction<string>> = (action) => {
  //     const prev = getCurrent('sliceMosaicString')
  //     const next =
  //       typeof action === 'function' ? (action as (prev: string) => string)(prev!) : action
  //     nv.setSliceMosaicString(next)

  //     updateDocument(docId, { sliceMosaicString: next, isDirty: true })
  //   }

  //   const setOpts: React.Dispatch<React.SetStateAction<Partial<Niivue['opts']>>> = (action) => {
  //     // 1. Grab the previous opts from your context
  //     const prevOpts = getCurrent('opts') as Partial<Niivue['opts']>

  //     // 2. Compute the “next” opts, whether action is a value or updater fn
  //     const nextOpts =
  //       typeof action === 'function'
  //         ? (action as (prev: Partial<Niivue['opts']>) => Partial<Niivue['opts']>)(prevOpts)
  //         : action

  //     // 3. Apply to Niivue instance and push into your document state
  //     Object.assign(nv.opts, nextOpts)
  //     updateDocument(docId, { opts: { ...nv.opts }, isDirty: true })
  //   }

  //   const setLayout: React.Dispatch<React.SetStateAction<keyof typeof layouts>> = (action) => {
  //     const prevLayout = getCurrent('layout') as keyof typeof layouts
  //     const nextLayout =
  //       typeof action === 'function'
  //         ? (action as (prev: keyof typeof layouts) => keyof typeof layouts)(prevLayout)
  //         : action

  //     const layoutValue = layouts[nextLayout]
  //     if (layoutValue) nv.setMultiplanarLayout(layoutValue)
  //     updateDocument(docId, { layout: nextLayout, isDirty: true })
  //   }

  //   // 2) Mosaic orientation setter
  //   type Ori = 'A' | 'C' | 'S'
  //   const setMosaicOrientation: React.Dispatch<React.SetStateAction<Ori>> = (action) => {
  //     const prevOri = getCurrent('mosaicOrientation') as Ori
  //     const nextOri =
  //       typeof action === 'function' ? (action as (prev: Ori) => Ori)(prevOri) : action

  //     // if you need to drive Niivue itself:
  //     // nv.setSliceMosaicOrientation?.(nextOri)

  //     updateDocument(docId, { mosaicOrientation: nextOri, isDirty: true })
  //   }

  //   const doc: NiivueInstanceContext = {
  //     id: docId,
  //     nvRef: { current: nv },

  //     volumes: [],
  //     setVolumes,

  //     meshes: [],
  //     setMeshes,

  //     selectedImage: null,
  //     setSelectedImage,

  //     sliceType: null,
  //     setSliceType,

  //     opts: { ...nv.opts },
  //     setOpts,

  //     layout: 'Row',
  //     setLayout,

  //     mosaicOrientation: 'A',
  //     setMosaicOrientation,

  //     sliceMosaicString: '',
  //     setSliceMosaicString,

  //     title: 'Untitled',

  //     filePath: null,
  //     isDirty: false
  //   }

  //   addDocument(doc)

  //   // load persisted prefs
  //   const prefs = await electron.ipcRenderer.invoke('getPreferences')
  //   Object.entries(prefs ?? {}).forEach(([key, value]) => {
  //     if (key in nv.opts) {
  //       nv.opts[key] = value
  //     }
  //   })

  //   nv.setSliceType(nv.sliceTypeMultiplanar)
  //   overrideDrawGraph(nv)
  //   await niimathRef.current.init()

  //   nv.drawScene()
  // }

  // // Sidebar drag/drop handlers
  // function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
  //   e.preventDefault()
  // }
  // function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
  //   if (!selected) return
  //   const nv = selected.nvRef.current
  //   nv.volumes = []
  //   nv.meshes = []
  //   nv.updateGLVolume()
  //   loadDroppedFiles(e, selected.setVolumes, selected.setMeshes, nv.gl)
  // }

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
    const remainingImages = nv.volumes.filter((v) => v.id !== vol.id)
    selected.setVolumes(remainingImages)
    updateDocument(selected.id, { isDirty: true })
  }

  function handleReplaceVolume(vol: NVImage): void {
    if (!selected) return
    const nv = selected.nvRef.current

    const index = nv.volumes.findIndex((v) => v.id === vol.id)
    if (index === -1) return

    // Listen for dialog result
    window.electron.ipcRenderer.once(
      'replaceVolumeFileDialogResult',
      async (_e, { index, path }) => {
        if (!path) return

        try {
          const base64 = await window.electron.ipcRenderer.invoke('loadFromFile', path)
          const newVol = await NVImage.loadFromBase64({ base64, name: path })
          const vol = nv.volumes[index]

          nv.setVolume(newVol, index)
          newVol.colorMap = vol.colorMap
          newVol.opacity = vol.opacity

          selected.setVolumes([...nv.volumes])
          selected.setSelectedImage(newVol)
          nv.updateGLVolume()
          updateDocument(selected.id, { isDirty: true })
        } catch (err) {
          console.error('Failed to replace volume:', err)
          window.alert('Failed to load replacement volume.')
        }
      }
    )

    // Trigger the dialog with index
    window.electron.ipcRenderer.invoke('openReplaceVolumeFileDialog', index)
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
  const handleCloseTab = async (e: React.MouseEvent, doc: NiivueInstanceContext): Promise<void> => {
    e.stopPropagation()
    if (doc.isDirty) {
      const save = window.confirm(`Save changes to “${doc.title}”?`)
      if (save) {
        const { id, nvRef, title } = doc
        const nv = nvRef.current
        const jsonStr = JSON.stringify(nv.document.json())
        const base = (title || id).replace(/\.nvd(\.gz)?$/, '')
        const suggestedName = `${base}.nvd`
        const savedPath = await window.electron.ipcRenderer.invoke(
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
      } else {
        const discard = window.confirm(`Discard changes to “${doc.title}”?`)
        if (!discard) return
      }
    }
    removeDocument(doc.id)
  }

  function renderTabs(nv: Niivue): JSX.Element {
    return (
      <div className="flex flex-row bg-gray-800 text-white px-2">
        {documents.map((doc) => {
          const isEditing = doc.id === editingDocId
          return (
            <div
              key={doc.id}
              className={`group relative px-4 py-2 cursor-pointer ${
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
              <button
                onClick={(e) => handleCloseTab(e, doc)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                aria-label="Close tab"
              >
                ✕
              </button>
            </div>
          )
        })}
        <div
          className="px-4 py-2 cursor-pointer bg-green-700 hover:bg-green-600"
          onClick={() => void createDocument()}
        >
          +
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* 1) Tabs bar */}
      <div className="flex-none">
        {selected?.nvRef.current && renderTabs(selected.nvRef.current)}
      </div>

      {/* 2) Toolbar full width */}
      <div className="flex-none">
        {selected && showNiimathToolbar && <NiimathToolbar modeMap={modeMap} indexMap={indexMap} />}
      </div>

      {/* 3) Main content: sidebar & viewer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (left) */}
        <div className="flex-shrink-0 overflow-auto">
          <Sidebar
            onRemoveMesh={handleRemoveMesh}
            onRemoveVolume={handleRemoveVolume}
            onMoveVolumeUp={handleMoveVolumeUp}
            onMoveVolumeDown={handleMoveVolumeDown}
            onReplaceVolume={handleReplaceVolume}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
        {/* Viewer (right) */}
        <div className="flex-1 relative overflow-hidden">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="absolute inset-0"
              style={{ display: doc.id === selectedDocId ? 'block' : 'none' }}
            >
              <Viewer doc={doc} collapsed={sidebarCollapsed} />
            </div>
          ))}
        </div>
      </div>
      {/* Status bar (optional footer) */}
      {showStatusBar && <StatusBar location={cursorLocation} />}
      {/* Dialogs (overlay) */}
      <PreferencesDialog />
      <LabelManagerDialog
        open={labelDialogOpen}
        setOpen={setLabelDialogOpen}
        editMode={labelEditMode}
        setEditMode={setLabelEditMode}
      />
      <DicomImportDialog />
    </div>
  )
}

export default MainApp
