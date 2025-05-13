// AppContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction
} from 'react'
import { NVImage, NVMesh, Niivue, SLICE_TYPE } from '@niivue/niivue'

export interface NiivueInstanceContext {
  id: string
  nvRef: React.MutableRefObject<Niivue>
  volumes: NVImage[]
  setVolumes: Dispatch<SetStateAction<NVImage[]>>
  meshes: NVMesh[]
  setMeshes: Dispatch<SetStateAction<NVMesh[]>>
  selectedImage: NVImage | null
  setSelectedImage: (img: NVImage | null) => void
  sliceType: SLICE_TYPE | null
  setSliceType: (st: SLICE_TYPE | null) => void
  title: string
}

interface AppCtx {
  documents: NiivueInstanceContext[]
  selectedDocId: string | null
  addDocument: (doc: NiivueInstanceContext) => void
  removeDocument: (id: string) => void
  selectDocument: (id: string) => void
  updateDocument: <K extends keyof NiivueInstanceContext>(
    id: string,
    updates: Partial<{ [P in K]: SetStateAction<NiivueInstanceContext[P]> }>
  ) => void
}

const AppContext = createContext<AppCtx | null>(null)

export const AppProvider = ({ children }: { children: ReactNode }) => {
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

  const updateDocument = <K extends keyof NiivueInstanceContext>(
    id: string,
    updates: Partial<{ [P in K]: SetStateAction<NiivueInstanceContext[P]> }>
  ) => {
    setDocuments(prev =>
      prev.map(doc => {
        if (doc.id !== id) return doc
        const updated = { ...doc }
        for (const key in updates) {
          const val = updates[key as K]
          updated[key as K] =
            typeof val === 'function'
              ? (val as (prev: any) => any)(doc[key as K])
              : val
        }
        return updated
      })
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
        updateDocument
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// ✅ use this instead of React.useContext(AppContext)
export const useAppContext = (): AppCtx => {
  const context = useContext(AppContext)
  if (!context) throw new Error('AppContext must be used within AppProvider')
  return context
}

export const useSelectedInstance = (): NiivueInstanceContext | undefined => {
  const { documents, selectedDocId } = useAppContext()
  return documents.find(doc => doc.id === selectedDocId)
}
