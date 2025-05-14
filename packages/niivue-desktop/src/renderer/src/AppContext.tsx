// src/AppContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react'
import type { NVImage, NVMesh, Niivue, SLICE_TYPE } from '@niivue/niivue'
import { layouts } from '../common/layouts'

export type NiivueInstanceContext = {
  id: string
  nvRef: React.MutableRefObject<Niivue>
  volumes: NVImage[]
  setVolumes: (vols: NVImage[]) => void
  meshes: NVMesh[]
  setMeshes: (meshes: NVMesh[]) => void
  selectedImage: NVImage | null
  setSelectedImage: (img: NVImage | null) => void
  sliceType: SLICE_TYPE | null
  setSliceType: (st: SLICE_TYPE | null) => void
  opts: Partial<Niivue['opts']>
  setOpts: (opts: Partial<Niivue['opts']>) => void
  layout: keyof typeof layouts
  setLayout: (layout: keyof typeof layouts) => void
  mosaicOrientation: 'A' | 'C' | 'S'
  setMosaicOrientation: (orient: 'A' | 'C' | 'S') => void
  title: string
}

export type AppContextType = {
  documents: NiivueInstanceContext[]
  selectedDocId: string
  addDocument: (doc: NiivueInstanceContext) => void
  removeDocument: (id: string) => void
  selectDocument: (id: string) => void
  updateDocument: (
    id: string,
    partial: Partial<NiivueInstanceContext>
  ) => void
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

  const updateDocument = (
    id: string,
    partial: Partial<NiivueInstanceContext>
  ): void => {
    setDocuments((docs) =>
      docs.map((d) => (d.id === id ? { ...d, ...partial } : d))
    )
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
