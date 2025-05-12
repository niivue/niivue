import React, { createContext, useState, useContext } from 'react'
import { Niivue, NVImage, NVMesh, SLICE_TYPE } from '@niivue/niivue'

export type NiivueInstanceContext = {
  id: string
  nvRef: React.MutableRefObject<Niivue>
  volumes: NVImage[]
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
  meshes: NVMesh[]
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
  selectedImage: NVImage | null
  setSelectedImage: (image: NVImage | null) => void
  sliceType: SLICE_TYPE | null
  setSliceType: (sliceType: SLICE_TYPE | null) => void
}

type AppCtx = {
  documents: NiivueInstanceContext[]
  selectedDocId: string | null
  addDocument: (doc: NiivueInstanceContext) => void
  removeDocument: (id: string) => void
  selectDocument: (id: string) => void
}

export const AppContext = createContext<AppCtx>({
  documents: [],
  selectedDocId: null,
  addDocument: () => {},
  removeDocument: () => {},
  selectDocument: () => {}
})

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<NiivueInstanceContext[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

  const addDocument = (doc: NiivueInstanceContext) => {
    setDocuments(prev => [...prev, doc])
    setSelectedDocId(doc.id)
  }

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id))
    setSelectedDocId(prev => (prev === id ? null : prev))
  }

  const selectDocument = (id: string) => {
    setSelectedDocId(id)
  }

  return (
    <AppContext.Provider value={{ documents, selectedDocId, addDocument, removeDocument, selectDocument }}>
      {children}
    </AppContext.Provider>
  )
}

// Hook to get currently selected document
export function useSelectedInstance(): NiivueInstanceContext | null {
  const { documents, selectedDocId } = useContext(AppContext)
  return documents.find(d => d.id === selectedDocId) ?? null
}
