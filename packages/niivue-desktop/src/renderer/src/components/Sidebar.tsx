import { useEffect, useState } from 'react'
import { ScrollArea, Text, Tooltip } from '@radix-ui/themes'
import { VolumeImageCard } from './VolumeImageCard.js'
import { MeshImageCard } from './MeshImageCard.js'
import { ModelsPanel } from './ModelsPanel.js'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { NVImage, NVMesh } from '@niivue/niivue'
import { useSelectedInstance } from '../AppContext.js'
import type { ModelInfo } from '../services/brainchop/types.js'

interface SidebarProps {
  onRemoveVolume: (volume: NVImage) => void
  onRemoveMesh: (mesh: NVMesh) => void
  onMoveVolumeUp: (volume: NVImage) => void
  onMoveVolumeDown: (volume: NVImage) => void
  onReplaceVolume: (volume: NVImage) => void
  activePanel: string | null
  onSetActivePanel: (panel: string | null) => void
  availableModels: ModelInfo[]
  onRunSegmentation: (modelId: string) => void
  onModelsChanged?: () => void
}

const panels = [
  {
    id: 'layers',
    title: 'Layers',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    )
  },
  {
    id: 'models',
    title: 'Models',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    )
  }
]

export function Sidebar({
  onRemoveMesh,
  onRemoveVolume,
  onMoveVolumeUp,
  onMoveVolumeDown,
  onReplaceVolume,
  activePanel,
  onSetActivePanel,
  availableModels,
  onRunSegmentation,
  onModelsChanged
}: SidebarProps): JSX.Element {
  const instance = useSelectedInstance()
  const selectedImage = instance?.selectedImage ?? null
  const volumes = instance?.volumes ?? []
  const meshes = instance?.meshes ?? []
  const [orderedVolumes, setOrderedVolumes] = useState<NVImage[]>([])

  useEffect(() => {
    const currentIds = orderedVolumes.map((v) => v.id).join(',')
    const nextIds = volumes.map((v) => v.id).join(',')
    if (currentIds !== nextIds) {
      setOrderedVolumes(volumes)
    }
  }, [volumes])

  const handleDragEnd = (result: DropResult): void => {
    if (!result.destination) return
    const sourceIndex = result.source.index
    const destIndex = result.destination.index
    if (sourceIndex === destIndex) return

    const draggedVolume = orderedVolumes[sourceIndex]
    const diff = destIndex - sourceIndex
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        onMoveVolumeDown(draggedVolume)
      }
    } else {
      for (let i = 0; i < Math.abs(diff); i++) {
        onMoveVolumeUp(draggedVolume)
      }
    }
  }

  const handleIconClick = (panelId: string): void => {
    if (activePanel === panelId) {
      onSetActivePanel(null)
    } else {
      onSetActivePanel(panelId)
    }
  }

  const isExpanded = activePanel !== null

  return (
    <div className="flex h-full">
      {/* Activity Bar */}
      <div className="flex flex-col items-center w-12 bg-gray-800 py-2 gap-1 flex-shrink-0">
        {panels.map((panel) => (
          <Tooltip key={panel.id} content={panel.title} side="right">
            <button
              onClick={() => handleIconClick(panel.id)}
              className={
                'p-2 rounded transition-colors ' +
                (activePanel === panel.id
                  ? 'bg-gray-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700')
              }
            >
              {panel.icon}
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Panel area */}
      {isExpanded && (
        <aside className="flex flex-col bg-gray-100 px-2 h-full w-80 min-w-[300px] transition-all duration-200">
          {activePanel === 'layers' && instance && (
            <DragDropContext onDragEnd={handleDragEnd}>
              <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
                <Text size="2" weight="bold">
                  Layers
                </Text>

                <Droppable droppableId="volumesDroppable">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {orderedVolumes.map((volume, index) => (
                        <Draggable
                          key={volume.id ?? index.toString()}
                          draggableId={volume.id ?? index.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                userSelect: 'none',
                                margin: '0 0 8px 0',
                                ...provided.draggableProps.style,
                                background: snapshot.isDragging ? '#f0f0f0' : 'white'
                              }}
                            >
                              <VolumeImageCard
                                image={volume}
                                onRemoveVolume={onRemoveVolume}
                                onReplaceVolume={onReplaceVolume}
                                onMoveVolumeUp={onMoveVolumeUp}
                                onMoveVolumeDown={onMoveVolumeDown}
                                isSelected={selectedImage?.id === volume.id}
                                onSelect={() => instance.setSelectedImage(volume)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {meshes.map((mesh, idx) => (
                  <MeshImageCard key={idx} image={mesh} onRemoveMesh={onRemoveMesh} />
                ))}
              </ScrollArea>
            </DragDropContext>
          )}

          {activePanel === 'models' && (
            <ModelsPanel
              availableModels={availableModels}
              onRunSegmentation={onRunSegmentation}
              onModelsChanged={onModelsChanged}
            />
          )}
        </aside>
      )}
    </div>
  )
}
