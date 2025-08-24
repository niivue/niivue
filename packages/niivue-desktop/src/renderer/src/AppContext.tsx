// src/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react'
import { NVImage, NVMesh, Niivue, SLICE_TYPE } from '@niivue/niivue'
import { layouts } from '../../common/layouts.js'
import { fmriEvents, getColorForTrialType } from './types/events.js'

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

export type NiivueInstanceContext = {
  id: string
  nvRef: React.MutableRefObject<Niivue>
  volumes: NVImage[]
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
  meshes: NVMesh[]
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
  selectedImage: NVImage | null
  setSelectedImage: React.Dispatch<React.SetStateAction<NVImage | null>>
  sliceType: SLICE_TYPE | null
  setSliceType: (st: SLICE_TYPE | null) => void
  opts: Partial<Niivue['opts']>
  setOpts: React.Dispatch<React.SetStateAction<Partial<Niivue['opts']>>>
  layout: keyof typeof layouts
  setLayout: (layout: keyof typeof layouts) => void
  mosaicOrientation: 'A' | 'C' | 'S'
  setMosaicOrientation: (orient: 'A' | 'C' | 'S') => void
  sliceMosaicString: string
  setSliceMosaicString: React.Dispatch<React.SetStateAction<string>>
  title: string
  filePath: string | null // ✅ NEW: Full path to .nvd file or null if unsaved
  isDirty: boolean // ✅ NEW: True if unsaved changes exist
}

export type AppContextType = {
  documents: NiivueInstanceContext[]
  selectedDocId: string
  addDocument: (doc: NiivueInstanceContext) => void
  removeDocument: (id: string) => void
  selectDocument: (id: string) => void
  updateDocument: (id: string, partial: Partial<NiivueInstanceContext>) => void
  createDocument: () => Promise<NiivueInstanceContext>
  showNiimathToolbar: boolean
  setShowNiimathToolbar: (val: boolean) => void
  showStatusBar: boolean
  setShowStatusBar: (val: boolean) => void
}

const AppContext = createContext<AppContextType | null>(null)

export const AppProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [documents, setDocuments] = useState<NiivueInstanceContext[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [showNiimathToolbar, setShowNiimathToolbar] = useState<boolean>(false)
  const [showStatusBar, setShowStatusBar] = useState<boolean>(false)

  const addDocument = (doc: NiivueInstanceContext): void => {
    setDocuments((docs) => [...docs, doc])
    setSelectedDocId(doc.id)
  }

  const removeDocument = (id: string): void => {
    setDocuments((docs) => docs.filter((d) => d.id !== id))
    if (selectedDocId === id && documents.length > 1) {
      // select the first remaining document
      setSelectedDocId(documents.find((d) => d.id !== id)!.id)
    }
  }

  const selectDocument = (id: string): void => {
    setSelectedDocId(id)
  }

  const updateDocument = (id: string, partial: Partial<NiivueInstanceContext>): void => {
    setDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, ...partial } : d)))
  }

  const createDocument = async (): Promise<NiivueInstanceContext> => {
    const nv = new Niivue({ dragAndDropEnabled: false })
    const docId = `doc-${documents.length + 1}`

    // helpers to wire setState → updateDocument(...)
    function makeSetter<T extends keyof NiivueInstanceContext>(
      field: T,
      applyToNV?: (value: NiivueInstanceContext[T]) => void
    ): React.Dispatch<React.SetStateAction<NiivueInstanceContext[T]>> {
      return (action) => {
        setDocuments((docs) =>
          docs.map((d) => {
            if (d.id !== docId) return d

            // previous state of that field
            const prev = d[field] as NiivueInstanceContext[T]

            // figure out next value
            let next: NiivueInstanceContext[T]
            if (typeof action === 'function') {
              // cast it to the proper updater type
              const updater = action as (
                prevState: NiivueInstanceContext[T]
              ) => NiivueInstanceContext[T]
              next = updater(prev)
            } else {
              next = action as NiivueInstanceContext[T]
            }

            // optionally apply to the Niivue instance itself
            if (applyToNV) applyToNV(next)

            // return updated doc with new field + mark dirty
            return { ...d, [field]: next, isDirty: true }
          })
        )
      }
    }

    const doc: NiivueInstanceContext = {
      id: docId,
      nvRef: { current: nv },
      volumes: [],
      meshes: [],
      selectedImage: null,
      sliceType: null,
      sliceMosaicString: nv.opts.sliceMosaicString || '',
      opts: { ...nv.opts },
      layout: 'Row',
      mosaicOrientation: 'A',
      title: 'Untitled',
      filePath: null,
      isDirty: false,

      setVolumes: makeSetter('volumes'),
      setMeshes: makeSetter('meshes'),
      setSelectedImage: makeSetter('selectedImage'),
      setSliceType: makeSetter('sliceType', (v) => v && nv.setSliceType(v)),
      setSliceMosaicString: makeSetter('sliceMosaicString', (v) => nv.setSliceMosaicString(v)),
      setOpts: makeSetter('opts', (v) => Object.assign(nv.opts, v)),
      setLayout: makeSetter('layout', (layoutKey) => nv.setMultiplanarLayout(layouts[layoutKey])),
      setMosaicOrientation: makeSetter('mosaicOrientation')
    }

    addDocument(doc)
    selectDocument(docId)
    // …any post-init (prefs load, overrideDrawGraph)
    overrideDrawGraph(nv)
    nv.setSliceType(nv.sliceTypeMultiplanar)
    nv.drawScene()
    return doc
  }

  return (
    <AppContext.Provider
      value={{
        documents,
        selectedDocId,
        addDocument,
        removeDocument,
        selectDocument,
        updateDocument,
        createDocument,
        showNiimathToolbar,
        setShowNiimathToolbar,
        showStatusBar,
        setShowStatusBar
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return ctx
}

export function useSelectedInstance(): NiivueInstanceContext | null {
  const { documents, selectedDocId } = useAppContext()
  return documents.find((d) => d.id === selectedDocId) || null
}
