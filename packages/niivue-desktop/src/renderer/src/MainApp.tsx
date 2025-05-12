// src/MainApp.tsx
import React, { useEffect, useRef, useState } from 'react'
import { NVImage, NVMesh, SLICE_TYPE, Niivue } from '@niivue/niivue'
import { Niimath } from '@niivue/niimath'
import { Sidebar } from './components/Sidebar'
import { Viewer } from './components/Viewer'
import { PreferencesDialog } from './components/PreferencesDialog'
import { LabelManagerDialog } from './components/LabelManagerDialog'
import { AppContext, NiivueInstanceContext, useSelectedInstance } from './AppContext'
import { registerAllIpcHandlers } from './ipcHandlers/registerAllIpcHandlers'

const electron = window.electron

function MainApp(): JSX.Element {
  const niimathRef = useRef(new Niimath())
  const nvRef = useRef<Niivue>(new Niivue({ dragAndDropEnabled: false }))

  const [volumes, setVolumes] = useState<NVImage[]>([])
  const [meshes, setMeshes] = useState<NVMesh[]>([])
  const [selectedImage, setSelectedImage] = useState<NVImage | null>(null)
  const [sliceType, setSliceType] = useState<SLICE_TYPE | null>(null)
  const [labelDialogOpen, setLabelDialogOpen] = useState(false)
  const [labelEditMode, setLabelEditMode] = useState(false)

  const {
    documents,
    selectedDocId,
    addDocument,
    removeDocument,
    selectDocument
  } = React.useContext(AppContext)

  const selected = useSelectedInstance()

  useEffect(() => {
    const nv = nvRef.current

    const init = async () => {
      if (documents.length === 0) {
        const doc: NiivueInstanceContext = {
          id: 'doc-1',
          nvRef,
          volumes,
          setVolumes,
          meshes,
          setMeshes,
          selectedImage,
          setSelectedImage,
          sliceType,
          setSliceType
        }

        addDocument(doc)

        const prefs = await electron.ipcRenderer.invoke('getPreferences')
        Object.entries(prefs ?? {}).forEach(([key, value]) => {
          if (key in nv.opts) {
            // @ts-ignore
            nv.opts[key] = value
          }
        })

        await niimathRef.current.init()
      }

      registerAllIpcHandlers(nv, setVolumes, setMeshes, setLabelDialogOpen, setLabelEditMode)
      nv.drawScene()
    }

    init()
  }, [documents.length])

  const handleRemoveMesh = (mesh: NVMesh): void => {
    const nv = selected?.nvRef.current
    if (!nv) return
    nv.removeMesh(mesh)
    selected.setMeshes(prev => prev.filter(m => m.id !== mesh.id))
  }

  const handleRemoveVolume = (vol: NVImage): void => {
    const nv = selected?.nvRef.current
    if (!nv) return
    nv.removeVolume(vol)
    selected.setVolumes(prev => prev.filter(v => v.id !== vol.id))
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

  const renderTabs = () => (
    <div className="flex flex-row bg-gray-800 text-white px-2">
      {documents.map(doc => (
        <div
          key={doc.id}
          className={`px-4 py-2 cursor-pointer ${doc.id === selectedDocId ? 'bg-gray-700' : ''}`}
          onClick={() => selectDocument(doc.id)}
        >
          {doc.id}
        </div>
      ))}
    </div>
  )

  return (
    <>
      {renderTabs()}
      <div className="flex flex-row size-full">
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
