import React, { useContext, useEffect, useState } from 'react'
import { ScrollArea, Text } from '@radix-ui/themes'
import { AppContext } from '../App'
import { SceneTabs } from './SceneTabs'
import { VolumeImageCard } from './VolumeImageCard'
import { MeshImageCard } from './MeshImageCard'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { NVImage, NVMesh } from '@niivue/niivue'

interface SidebarProps {
  onRemoveVolume: (volume: NVImage) => void;
  onRemoveMesh: (mesh: NVMesh) => void;
  onMoveVolumeUp: (volume: NVImage) => void;
  onMoveVolumeDown: (volume: NVImage) => void;
}

export function Sidebar({
  onRemoveMesh,
  onRemoveVolume,
  onMoveVolumeUp,
  onMoveVolumeDown
}: SidebarProps): JSX.Element {
  const { volumes, meshes } = useContext(AppContext)
  const [orderedVolumes, setOrderedVolumes] = useState<NVImage[]>([])

  useEffect(() => {
    setOrderedVolumes(volumes)
  }, [volumes])

  const handleDragEnd = (result: DropResult) => {
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

  return (
    <div className="flex flex-col bg-gray-100 px-2 w-1/3 basis-1/3 min-w-[300px] max-w-[500px]">
      <DragDropContext onDragEnd={handleDragEnd}>
        <ScrollArea style={{ height: '50%', paddingRight: '10px', marginBottom: '12px' }}>
          <Text size="2" weight="bold">Layers</Text>
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
      </DragDropContext>
      
      {/* Scene tab selectors */}
      <SceneTabs />

      
    </div>
  )
}
