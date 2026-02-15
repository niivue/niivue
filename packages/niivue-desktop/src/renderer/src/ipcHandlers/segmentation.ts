import React from 'react'
import { Niivue, NVImage } from '@niivue/niivue'
import { brainchopService } from '../services/brainchop/index.js'
import type { SegmentationResult } from '../services/brainchop/types.js'

const electron = window.electron

export interface SegmentationHandlerProps {
  nv: Niivue
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>
  onSegmentationStart?: (modelId: string) => void
  onSegmentationProgress?: (progress: number, status: string) => void
  onSegmentationComplete?: (result: SegmentationResult) => void
  onSegmentationError?: (error: Error) => void
  onTogglePanel?: () => void
}

// Track cancellation
let abortController: AbortController | null = null

/**
 * Register IPC handlers for brain segmentation
 */
export const registerSegmentationHandlers = ({
  nv,
  setVolumes,
  onSegmentationStart,
  onSegmentationProgress,
  onSegmentationComplete,
  onSegmentationError,
  onTogglePanel
}: SegmentationHandlerProps): void => {
  console.log('[Renderer] registerSegmentationHandlers called')

  // Clear any existing listeners
  electron.ipcRenderer.removeAllListeners('run-segmentation')
  electron.ipcRenderer.removeAllListeners('cancel-segmentation')
  electron.ipcRenderer.removeAllListeners('toggle-segmentation-panel')

  /**
   * Run segmentation handler
   * Triggered from menu or other UI
   */
  electron.ipcRenderer.on('run-segmentation', async (_event, modelId: string) => {
    console.log('[Renderer] run-segmentation received for model:', modelId)

    try {
      // Check if there's a volume loaded
      if (!nv || nv.volumes.length === 0) {
        alert('Please load a volume first')
        return
      }

      // Get the base volume (first volume) and conform to 256³ @ 1mm isotropic
      // Brainchop models expect this specific format
      const baseVolume = await nv.conform(nv.volumes[0], true)

      // Initialize brainchop service if needed
      if (!brainchopService.isReady()) {
        console.log('[Renderer] Initializing brainchop service...')
        onSegmentationProgress?.(0, 'Initializing TensorFlow.js...')
        await brainchopService.initialize()
      }

      // Notify UI that segmentation is starting
      onSegmentationStart?.(modelId)

      // Create abort controller for cancellation
      abortController = new AbortController()

      // Run segmentation
      const result = await brainchopService.runSegmentation(baseVolume, modelId, {
        onProgress: (progress, status) => {
          console.log(`[Renderer] Segmentation progress: ${progress}% - ${status}`)
          onSegmentationProgress?.(progress, status || '')
        },
        abortSignal: abortController.signal
      })

      console.log('[Renderer] Segmentation complete:', result)
      console.log('[Renderer] Segmentation volume details:', {
        name: result.volume.name,
        dims: result.volume.dims,
        cal_min: result.volume.cal_min,
        cal_max: result.volume.cal_max,
        colormap: result.volume.colormap,
        dataType: result.volume.img?.constructor.name,
        dataLength: result.volume.img?.length
      })

      // Add segmentation as overlay
      nv.addVolume(result.volume)
      const overlayIndex = nv.volumes.length - 1

      console.log('[Renderer] Added overlay at index:', overlayIndex)
      console.log('[Renderer] Total volumes:', nv.volumes.length)

      // Set opacity for overlay visibility
      nv.setOpacity(overlayIndex, 0.7) // 70% opacity for better visibility

      // For parcellation models, apply colormap labels for atlas display
      if (result.modelInfo.type === 'parcellation' && result.modelInfo.labelsPath) {
        console.log('[Renderer] Loading parcellation labels from:', result.modelInfo.labelsPath)
        try {
          const labelsJson = await window.electron.loadBrainchopLabels(result.modelInfo.labelsPath)
          result.volume.setColormapLabel(labelsJson)
          if (result.volume.colormapLabel?.lut) {
            // Keep background transparent, set other labels to semi-transparent
            result.volume.colormapLabel.lut = result.volume.colormapLabel.lut.map((v, i) =>
              i % 4 === 3 ? (v === 0 ? 0 : 178) : v
            )
          }
          console.log('[Renderer] Applied parcellation colormap labels')
        } catch (err) {
          console.error('[Renderer] Failed to load parcellation labels:', err)
        }
      }

      // Update React state
      setVolumes((prev) => [...prev, result.volume])

      // Force redraw
      nv.updateGLVolume()
      nv.drawScene()

      console.log('[Renderer] Scene redrawn with overlay')

      // Notify UI
      onSegmentationComplete?.(result)

      // Show success message
      alert(
        `Segmentation complete!\nModel: ${result.modelInfo.name}\nTime: ${(result.inferenceTimeMs / 1000).toFixed(2)}s`
      )
    } catch (error) {
      console.error('[Renderer] Segmentation failed:', error)

      // Check if it was cancelled
      if (error instanceof Error && error.message.includes('cancel')) {
        console.log('[Renderer] Segmentation cancelled by user')
        alert('Segmentation cancelled')
      } else {
        onSegmentationError?.(error as Error)
        alert(`Segmentation failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    } finally {
      abortController = null
    }
  })

  /**
   * Cancel segmentation handler
   */
  electron.ipcRenderer.on('cancel-segmentation', () => {
    console.log('[Renderer] cancel-segmentation received')
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  })

  /**
   * Toggle segmentation panel handler
   */
  electron.ipcRenderer.on('toggle-segmentation-panel', () => {
    console.log('[Renderer] toggle-segmentation-panel received')
    onTogglePanel?.()
  })
}

/**
 * Cancel ongoing segmentation
 */
export const cancelSegmentation = (): void => {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}
