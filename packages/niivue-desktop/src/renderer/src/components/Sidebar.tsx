import { useEffect, useState } from 'react'
import { ScrollArea, Text } from '@radix-ui/themes'
import { SceneTabs } from './SceneTabs.js'
import { VolumeImageCard } from './VolumeImageCard.js'
import { MeshImageCard } from './MeshImageCard.js'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { NVImage, NVMesh } from '@niivue/niivue'
import { useSelectedInstance } from '../AppContext.js'

interface SidebarProps {
  onRemoveVolume: (volume: NVImage) => void
  onRemoveMesh: (mesh: NVMesh) => void
  onMoveVolumeUp: (volume: NVImage) => void
  onMoveVolumeDown: (volume: NVImage) => void
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({
  onRemoveMesh,
  onRemoveVolume,
  onMoveVolumeUp,
  onMoveVolumeDown,
  collapsed,
  onToggle
}: SidebarProps): JSX.Element {
  const instance = useSelectedInstance()
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

  if (!instance) return <></>

  return (
    <aside
      className={
        `flex flex-col bg-gray-100 px-2 h-full relative transition-all duration-200 ` +
        (collapsed
          ? 'w-[60px] min-w-[40px]'
          : 'w-80 min-w-[300px]')
      }
    >
      {/* toggle button */}
      <button
        className="toggle-btn absolute top-2 right-2  w-6 h-6 rounded-full shadow z-10"
        onClick={onToggle}
      >
        {collapsed ? '▶' : '◀'}
      </button>

      {!collapsed && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <ScrollArea
            style={{
              height: '50%',
              paddingRight: '10px',
              marginBottom: '12px'
            }}
          >
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
                            onMoveVolumeUp={onMoveVolumeUp}
                            onMoveVolumeDown={onMoveVolumeDown}
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

          <SceneTabs />
        </DragDropContext>
      )}
    </aside>
  )
}
