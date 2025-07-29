// src/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react'
import type { NVImage, NVMesh, Niivue, SLICE_TYPE } from '@niivue/niivue'
import { layouts } from '../../common/layouts.js'

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
  drawing?: Uint8Array
  setDrawing: (data: Uint8Array) => void
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
}

const AppContext = createContext<AppContextType | null>(null)

export const AppProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [documents, setDocuments] = useState<NiivueInstanceContext[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string>('')

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

  return (
    <AppContext.Provider
      value={{
        documents,
        selectedDocId,
        addDocument,
        removeDocument,
        selectDocument,
        updateDocument
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
