import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { VolumeImageCard } from './VolumeImageCard';
import { MeshImageCard } from './MeshImageCard';
import { NVMesh, NVImage } from '@niivue/niivue';
import { Text, ScrollArea } from '@radix-ui/themes';
import { SceneTabs } from './SceneTabs';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

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
  const { volumes, meshes } = useContext(AppContext);
  // Use local state to drive the ordering in the UI.
  // We assume that whenever App updates volumes (e.g. after a move),
  // this effect will update the local ordering.
  const [orderedVolumes, setOrderedVolumes] = useState<NVImage[]>([]);

  useEffect(() => {
    setOrderedVolumes(volumes);
  }, [volumes]);

  /**
   * When a drag ends, determine how far the item moved.
   * Then, repeatedly call the appropriate move callback to update
   * the Niivue volumes order.
   */
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;

    // Get the dragged volume from our local ordering.
    const draggedVolume = orderedVolumes[sourceIndex];
    const diff = destinationIndex - sourceIndex;

    if (diff > 0) {
      // Moving down: call the onMoveVolumeDown function repeatedly.
      for (let i = 0; i < diff; i++) {
        onMoveVolumeDown(draggedVolume);
      }
    } else {
      // Moving up: call the onMoveVolumeUp function repeatedly.
      for (let i = 0; i < Math.abs(diff); i++) {
        onMoveVolumeUp(draggedVolume);
      }
    }
    // The global volumes ordering will update in App.tsx, which then
    // updates the orderedVolumes state via the useEffect.
  };

  return (
    <div className="flex flex-col bg-gray-100 px-2 w-1/3 basis-1/3 min-w-[300px] max-w-[500px]">
      <DragDropContext onDragEnd={handleDragEnd}>
        <ScrollArea style={{ height: '50%', paddingRight: '10px', marginBottom: '12px' }}>
          <Text size="2" weight="bold">
            Layers
          </Text>
          <Droppable droppableId="volumesDroppable">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {orderedVolumes.map((volume, index) => (
                  <Draggable
                    key={volume.id || index.toString()}
                    draggableId={volume.id || index.toString()}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        // If you want to restrict the drag handle to a sub-component,
                        // remove the spread of dragHandleProps here and pass it inside VolumeImageCard.
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
          {/* MeshImageCards remain outside the draggable list. */}
          {meshes.map((mesh, idx) => (
            <MeshImageCard key={idx} image={mesh} onRemoveMesh={onRemoveMesh} />
          ))}
        </ScrollArea>
      </DragDropContext>
      <SceneTabs />
    </div>
  );
}
