// src/AppContext.tsx
import React, { createContext, useContext, useState } from 'react'
import { NVImage, NVMesh, SLICE_TYPE, Niivue } from '@niivue/niivue'

export interface NiivueInstanceContext {
  id: string
  title?: string
  nvRef: React.MutableRefObject<Niivue>
  volumes: NVImage[]
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
  meshes: NVMesh[]
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
  selectedImage: NVImage | null
  setSelectedImage: (img: NVImage | null) => void
  sliceType: SLICE_TYPE | null
  setSliceType: (s: SLICE_TYPE | null) => void
  opts: Partial<Niivue['opts']>
  setOpts: (opts: Partial<Niivue['opts']>) => void
}

interface AppCtx {
  documents: NiivueInstanceContext[]
  selectedDocId: string
  selectDocument: (id: string) => void
  addDocument: (doc: NiivueInstanceContext) => void
  updateDocument: (id: string, updates: Partial<NiivueInstanceContext>) => void
  removeDocument: (id: string) => void
}

const AppContext = createContext<AppCtx | null>(null)

export const AppProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [documents, setDocuments] = useState<NiivueInstanceContext[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string>('')

  const selectDocument = (id: string): void => {
    setSelectedDocId(id)
  }

  const addDocument = (doc: NiivueInstanceContext): void => {
    setDocuments((prev) => [...prev, doc])
    setSelectedDocId(doc.id)
  }

  const updateDocument = (id: string, updates: Partial<NiivueInstanceContext>): void => {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc)))
  }

  const removeDocument = (id: string): void => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    if (selectedDocId === id && documents.length > 1) {
      const fallback = documents.find((d) => d.id !== id)
      if (fallback) setSelectedDocId(fallback.id)
    }
  }

  return (
    <AppContext.Provider
      value={{
        documents,
        selectedDocId,
        selectDocument,
        addDocument,
        updateDocument,
        removeDocument
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = (): AppCtx => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppContext not found')
  return ctx
}

export const useSelectedInstance = (): NiivueInstanceContext | undefined => {
  const { documents, selectedDocId } = useAppContext()
  return documents.find((doc) => doc.id === selectedDocId)
}
