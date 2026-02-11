// src/MainApp.tsx
import React, { useEffect, useRef, useState } from 'react'
import { NVImage, NVMesh, NiiVueLocation, Niivue, NVDocument } from '@niivue/niivue'
import { Sidebar } from './components/Sidebar.js'
import { Viewer } from './components/Viewer.js'
import { PreferencesDialog } from './components/PreferencesDialog.js'
import { LabelManagerDialog } from './components/LabelManagerDialog.js'
import { NiivueInstanceContext, useSelectedInstance, useAppContext } from './AppContext.js'
import { registerAllIpcHandlers } from './ipcHandlers/registerAllIpcHandlers.js'
// import { fmriEvents, getColorForTrialType } from './types/events.js'
// import { loadDroppedFiles } from './utils/dragAndDrop.js'
// import { layouts } from '../../common/layouts.js'
import { StatusBar } from './components/StatusBar.js'
import { DicomImportDialog } from './components/DicomImportDialog.js'
import { RightPanel } from './components/RightPanel.js'
import { SegmentationDialog } from './components/SegmentationDialog.js'
import { brainchopService } from './services/brainchop/index.js'
import type { ModelInfo } from './services/brainchop/types.js'
import { parseLabelJson, resolveLabels } from '../../common/labelResolver.js'
import { extractSubvolume as extractSubvolumeUtil } from './utils/extractSubvolume.js'

const electron = window.electron

interface LabelCacheEntry {
  labelVolume: NVImage
  baseVolumeId: string
  modelInfo: ModelInfo
}

// function overrideDrawGraph(nv: Niivue): void {
//   const originalDrawGraph = nv.drawGraph.bind(nv)
//   nv.drawGraph = (): void => {
//     originalDrawGraph()
//     if (!nv.graph.plotLTWH || !fmriEvents.length) return
//     const [plotX, plotY, plotW, plotH] = nv.graph.plotLTWH
//     const numFrames = nv.graph.lines?.[0]?.length || 0
//     if (numFrames === 0) return
//     const hdr = nv.volumes[0]?.hdr
//     const TR = hdr?.pixDims?.[4] ?? 1
//     const scaleW = plotW / numFrames
//     for (const ev of fmriEvents) {
//       const startFrame = ev.onset / TR
//       const endFrame = (ev.onset + ev.duration) / TR
//       const x0 = plotX + startFrame * scaleW
//       const x1 = plotX + endFrame * scaleW
//       const color = getColorForTrialType(ev.trial_type)
//       nv.drawRect([x0, plotY, x1 - x0, plotH], color)
//     }
//   }
// }

function MainApp(): JSX.Element {
  const {
    documents,
    selectedDocId,
    // addDocument,
    selectDocument,
    updateDocument,
    removeDocument,
    createDocument
  } = useAppContext()
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const [activeLeftPanel, setActiveLeftPanel] = useState<string | null>('layers')
  const { showStatusBar } = useAppContext()
  const [cursorLocation, setCursorLocation] = useState<string>('')
  const lastSyncedDoc = useRef<string | null>(null)
  const selected = useSelectedInstance()
  // Use ref to always get latest selected, avoiding stale closures in IPC handlers
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const modeMap = useRef(new Map<string, 'replace' | 'overlay'>()).current
  const indexMap = useRef(new Map<string, number>()).current
  const labelCache = useRef(new Map<string, LabelCacheEntry>()).current

  // Right panel state
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState('controls')
  const [segmentationRunning, setSegmentationRunning] = useState(false)
  const [segmentationProgress, setSegmentationProgress] = useState(0)
  const [segmentationStatus, setSegmentationStatus] = useState('')
  const [segmentationModelName, setSegmentationModelName] = useState('')
  const [modelsVersion, setModelsVersion] = useState(0)
  const [extractSubvolumeEnabled, setExtractSubvolumeEnabled] = useState(false)
  const [selectedExtractLabels, setSelectedExtractLabels] = useState<Set<number>>(new Set())
  const availableModels = brainchopService.getAvailableModels()
  // modelsVersion is used to trigger re-render when user adds models via wizard
  void modelsVersion

  const getTarget = async (): Promise<NiivueInstanceContext> => {
    // Use ref to get latest selected, avoiding stale closures
    const current = selectedRef.current
    if (!current) throw new Error('no document!')
    // Check actual Niivue instance state, not React state (which may be stale)
    const nv = current.nvRef.current
    const hasContent = nv.volumes.length > 0 || nv.meshes.length > 0
    if (!hasContent) return current
    return createDocument()
  }

  // Create the first document on mount
  useEffect((): void => {
    window.electron.setZoomFactor(1)
    if (documents.length === 0) {
      createDocument().catch(console.error)
    }
  }, [documents.length])

  // Listen for document:saved to update the tab title
  useEffect((): (() => void) => {
    const handleSaved = (_e: unknown, { id, path }: { id: string; path: string }): void => {
      const title =
        path
          .split('/')
          .pop()
          ?.replace(/\.nvd$/, '') || 'Untitled'
      updateDocument(id, { title })
    }
    electron.ipcRenderer.on('document:saved', handleSaved)
    return (): void => {
      electron.ipcRenderer.removeListener('document:saved', handleSaved)
    }
  }, [updateDocument])

  useEffect(() => {
    if (showStatusBar && selected?.nvRef.current) {
      console.log('calling get current cursor location')
      selected.nvRef.current.createOnLocationChange()
    }
  }, [showStatusBar, selected])

  // When the selected document changes, restore its state and re-register IPC
  // inside MainApp()
  // inside MainApp.tsx
  useEffect(() => {
    if (!selected) return
    const nv = selected.nvRef.current
    nv.onLocationChange = (location: unknown): void => {
      if (typeof location === 'object' && location !== null && 'string' in location) {
        const loc = location as NiiVueLocation
        setCursorLocation(loc.string ?? '')
      } else {
        setCursorLocation('')
      }
    }

    // Restore viewer prefs
    // Object.assign(nv.opts, selected.opts)
    // if (selected.sliceType) nv.setSliceType(selected.sliceType)
    // const layoutVal = layouts[selected.layout]
    // if (layoutVal) nv.setMultiplanarLayout(layoutVal)
    // nv.setSliceMosaicString(selected.opts.sliceMosaicString ?? '')

    // Re-draw everything
    nv.updateGLVolume()
    nv.drawScene()

    // Seed React state on first sync
    if (lastSyncedDoc.current !== selected.id) {
      selected.setVolumes([...nv.volumes])
      selected.setMeshes([...nv.meshes])
      // restore selectedImage
      const prev = selected.selectedImage
      const found = prev ? nv.volumes.find((v) => v.id === prev.id) : undefined
      selected.setSelectedImage(found ?? nv.volumes[0] ?? null)
      lastSyncedDoc.current = selected.id
    }

    // Re‑register all your IPC handlers
    registerAllIpcHandlers({
      modeMap,
      indexMap,
      nv: selected.nvRef.current!, // raw Niivue instance for menu handlers
      docId: selected.id,
      setVolumes: selected.setVolumes,
      setMeshes: selected.setMeshes,
      getTarget,
      getTitle: () => selected.title || selected.id,
      setLabelDialogOpen,
      setLabelEditMode,
      onDocumentLoaded: (newTitle: string, targetId: string) =>
        updateDocument(targetId, { title: newTitle, isDirty: true }),
      onMosaicStringChange: selected.setSliceMosaicString,
      onToggleSegmentationPanel: () => {
        setRightPanelTab('segmentation')
        setRightPanelOpen((prev) => !prev)
      },
      onOpenRightPanelTab: (tab: string) => {
        setRightPanelTab(tab)
        setRightPanelOpen(true)
      },
      onHideRightPanel: () => setRightPanelOpen(false)
    })
  }, [selected])

  // Segmentation handlers
  const handleRunSegmentation = async (modelId: string): Promise<void> => {
    if (!selected || selected.volumes.length === 0) {
      alert('Please load a volume first')
      return
    }

    const nv = selected.nvRef.current
    const baseVolume = nv.volumes[0]
    const modelInfo = brainchopService.getModelInfo(modelId)

    if (!modelInfo) {
      alert(`Model not found: ${modelId}`)
      return
    }

    try {
      // Check label cache for a hit (same model + same base volume)
      const cached = labelCache.get(modelId)
      const cacheHit = cached && cached.baseVolumeId === baseVolume.id
      let labelVolume: NVImage
      let resultModelInfo: ModelInfo
      let conformedVolume: NVImage | undefined

      if (cacheHit) {
        // Cache hit: show brief feedback and use cached result
        setSegmentationRunning(true)
        setSegmentationProgress(100)
        setSegmentationStatus('Using cached segmentation result')
        setSegmentationModelName(cached.modelInfo.name)
        await new Promise((r) => setTimeout(r, 600))
        labelVolume = cached.labelVolume
        resultModelInfo = cached.modelInfo
      } else {
        // Cache miss: run full segmentation
        if (!brainchopService.isReady()) {
          setSegmentationStatus('Initializing TensorFlow.js...')
          setSegmentationProgress(0)
          setSegmentationRunning(true)
          setSegmentationModelName(modelInfo.name)
          await brainchopService.initialize()
        }

        setSegmentationRunning(true)
        setSegmentationProgress(0)
        setSegmentationStatus('Starting segmentation...')
        setSegmentationModelName(modelInfo.name)

        // Conform to 256³ @ 1mm Uint8 — matches brainchop.org: nv.conform(volume, false)
        conformedVolume = await nv.conform(baseVolume, false)

        console.log('[MainApp] Running segmentation on conformed volume:', {
          dims: conformedVolume.dims,
          'hdr.dims': conformedVolume.hdr?.dims,
          pixDims: conformedVolume.pixDims,
          'img.length': conformedVolume.img?.length
        })

        // Run segmentation on conformed volume
        const result = await brainchopService.runSegmentation(conformedVolume, modelId, {
          onProgress: (progress, status) => {
            setSegmentationProgress(progress)
            setSegmentationStatus(status || '')
          }
        })

        labelVolume = result.volume
        resultModelInfo = result.modelInfo

        // Always cache the result for future re-extraction
        labelCache.set(modelId, {
          labelVolume,
          baseVolumeId: baseVolume.id,
          modelInfo: resultModelInfo
        })
      }

      if (extractSubvolumeEnabled && selectedExtractLabels.size > 0) {
        // Extract subvolume: create masked intensity volume
        // For cache hits, conform the volume to match the label space
        const sourceVolume = cacheHit ? await nv.conform(baseVolume, false) : conformedVolume!
        const extractedVolume = extractSubvolumeUtil(sourceVolume, labelVolume, selectedExtractLabels)

        // Build descriptive name
        const baseName = baseVolume.name?.replace(/\.(nii|nii\.gz)$/i, '') || 'volume'
        const labelCount = selectedExtractLabels.size
        const labelSummary = labelCount <= 3
          ? [...selectedExtractLabels].join('-')
          : `${labelCount}labels`
        extractedVolume.name = `${baseName}_extract_${labelSummary}.nii.gz`

        nv.addVolume(extractedVolume)
      } else {
        // Default behavior: add label overlay (clone to keep cache pristine)
        const overlayVolume = labelVolume.clone()
        nv.addVolume(overlayVolume)
        const overlayIndex = nv.volumes.length - 1
        nv.setOpacity(overlayIndex, 0.5)

        // For parcellation models, apply colormap labels for atlas display
        if (resultModelInfo.type === 'parcellation' && resultModelInfo.labelsPath) {
          try {
            const labelsJson = await window.electron.loadBrainchopLabels(resultModelInfo.labelsPath)
            overlayVolume.setColormapLabel(labelsJson)
            if (overlayVolume.colormapLabel?.lut) {
              overlayVolume.colormapLabel.lut = overlayVolume.colormapLabel.lut.map((v, i) =>
                i % 4 === 3 ? (v === 0 ? 0 : 178) : v
              )
            }
          } catch (err) {
            console.error('Failed to load parcellation labels:', err)
          }
        }
      }

      selected.setVolumes([...nv.volumes])
      nv.updateGLVolume()
      updateDocument(selected.id, { isDirty: true })

      setSegmentationRunning(false)
    } catch (error) {
      setSegmentationRunning(false)
      console.error('Segmentation failed:', error)
      alert(`Segmentation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleCancelSegmentation = (): void => {
    // Cancellation is handled via AbortController in the IPC handler
    setSegmentationRunning(false)
  }

  // Open Label Manager from menu
  const [labelDialogOpen, setLabelDialogOpen] = useState<boolean>(false)
  const [labelEditMode, setLabelEditMode] = useState<boolean>(false)
  useEffect((): (() => void) => {
    const openLM = (): void => {
      setLabelDialogOpen(true)
      setLabelEditMode(false)
    }
    electron.ipcRenderer.on('openLabelManagerDialog', openLM)
    return (): void => {
      electron.ipcRenderer.removeAllListeners('openLabelManagerDialog')
    }
  }, [])

  // Toggle Segmentation Panel is handled via registerSegmentationHandlers
  // (onTogglePanel passed through registerAllIpcHandlers)

  // Headless mode workflow - Subcommand architecture
  useEffect(() => {
    // Helper: Wait for NiiVue instance to be ready
    const waitForDocument = (): Promise<NiivueInstanceContext> => {
      return new Promise((resolve) => {
        const check = (): void => {
          const current = selectedRef.current
          if (current && current.nvRef.current) {
            resolve(current)
          } else {
            setTimeout(check, 100)
          }
        }
        check()
      })
    }

    // Helper: Load volume from resolved input
    const loadVolume = async (
      nv: Niivue,
      doc: NiivueInstanceContext,
      input: string
    ): Promise<NVImage> => {
      const resolved = await window.electron.headlessResolveInput(input)
      const volume = await NVImage.loadFromBase64({ base64: resolved.base64, name: resolved.filename })
      nv.addVolume(volume)
      doc.setVolumes([...nv.volumes])
      nv.updateGLVolume()
      await new Promise((r) => requestAnimationFrame(r))
      return volume
    }

    // Helper: Convert Uint8Array to base64 (chunked to avoid call stack limits)
    const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
      const CHUNK_SIZE = 0x8000 // 32KB chunks
      let binary = ''
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length))
        binary += String.fromCharCode.apply(null, chunk as unknown as number[])
      }
      return btoa(binary)
    }

    // Helper: Save volume to output (file or stdout)
    const saveVolumeOutput = async (volume: NVImage, output: string): Promise<void> => {
      const isStdout = output === '-' || output.toLowerCase() === 'stdout'
      // Use saveToUint8Array which handles gzip compression based on filename
      // For stdout, compress as .nii.gz so downstream commands get proper NIfTI
      const filename = isStdout ? 'output.nii.gz' : output
      const niftiData = await volume.saveToUint8Array(filename)
      const base64 = uint8ArrayToBase64(niftiData)

      if (isStdout) {
        await window.electron.headlessWriteStdout(base64)
      } else {
        const saveResult = await window.electron.headlessSaveNifti(base64, output)
        if (!saveResult.success) {
          throw new Error(`Failed to save NIfTI: ${saveResult.error}`)
        }
      }
    }

    // Helper: Save screenshot
    const saveScreenshot = async (nv: Niivue, output: string): Promise<void> => {
      const canvas = nv.gl?.canvas as HTMLCanvasElement
      if (!canvas) {
        throw new Error('Canvas not available for screenshot')
      }
      nv.drawScene()
      const dataUrl = canvas.toDataURL('image/png')
      const saveResult = await window.electron.headlessSaveOutput(dataUrl, output)
      if (!saveResult.success) {
        throw new Error(`Failed to save PNG: ${saveResult.error}`)
      }
    }

    // VIEW command: Load and render volume, output screenshot or pass-through
    const runViewCommand = async (
      options: Awaited<ReturnType<typeof window.electron.headlessGetOptions>>
    ): Promise<void> => {
      if (!options.input) {
        throw new Error('view command requires --input')
      }
      if (!options.output) {
        throw new Error('view command requires --output')
      }

      const doc = await waitForDocument()
      const nv = doc.nvRef.current
      const volume = await loadVolume(nv, doc, options.input)

      const isPng = options.output.toLowerCase().endsWith('.png')
      if (isPng) {
        await saveScreenshot(nv, options.output)
      } else {
        await saveVolumeOutput(volume, options.output)
      }
    }

    // SEGMENT command: Run brain segmentation model
    const runSegmentCommand = async (
      options: Awaited<ReturnType<typeof window.electron.headlessGetOptions>>
    ): Promise<void> => {
      if (!options.input) {
        throw new Error('segment command requires --input')
      }
      if (!options.model) {
        throw new Error('segment command requires --model')
      }
      if (!options.output) {
        throw new Error('segment command requires --output')
      }

      const doc = await waitForDocument()
      const nv = doc.nvRef.current

      // Load input volume
      await loadVolume(nv, doc, options.input)

      // Initialize brainchop if needed
      if (!brainchopService.isReady()) {
        await brainchopService.initialize()
      }

      const baseVolume = nv.volumes[0]
      if (!baseVolume) {
        throw new Error('No volume loaded for segmentation')
      }

      // Conform to 256³ @ 1mm Uint8 — matches brainchop.org: nv.conform(volume, false)
      const conformedVolume = await nv.conform(baseVolume, false)

      console.error(`[niivue] Running segmentation model: ${options.model}`)
      const result = await brainchopService.runSegmentation(conformedVolume, options.model, {
        onProgress: (progress, status) => {
          console.error(`[niivue] Progress: ${progress}% - ${status}`)
        }
      })

      // Wait for processing
      await new Promise((r) => setTimeout(r, 500))

      // Output the segmentation result
      await saveVolumeOutput(result.volume, options.output)
    }

    // EXTRACT command: Extract subvolume using label mask
    const runExtractCommand = async (
      options: Awaited<ReturnType<typeof window.electron.headlessGetOptions>>
    ): Promise<void> => {
      if (!options.input) {
        throw new Error('extract command requires --input (base volume)')
      }
      if (!options.labels) {
        throw new Error('extract command requires --labels (label volume)')
      }
      if (!options.output) {
        throw new Error('extract command requires --output')
      }

      // Check that we have at least one way to select labels
      const hasNumericSelection = options.values || options.range.length > 0
      const hasNamedSelection = options.labelNames
      if (!hasNumericSelection && !hasNamedSelection) {
        throw new Error('extract command requires --values, --range, or --label-names')
      }

      // If using label names, require label-json
      if (hasNamedSelection && !options.labelJson) {
        throw new Error('--label-names requires --label-json')
      }

      // Load base volume (no NiiVue instance needed - direct volume manipulation)
      const baseResolved = await window.electron.headlessResolveInput(options.input)
      const baseVolume = await NVImage.loadFromBase64({
        base64: baseResolved.base64,
        name: baseResolved.filename
      })

      // Load label volume
      const labelResolved = await window.electron.headlessResolveInput(options.labels)
      const labelVolume = await NVImage.loadFromBase64({
        base64: labelResolved.base64,
        name: labelResolved.filename
      })

      // Parse label values and ranges
      const selectedLabels = new Set<number>()

      // Load and parse label.json if provided
      if (options.labelJson) {
        console.error(`[niivue] Loading label.json: ${options.labelJson}`)
        const labelJson = await window.electron.headlessLoadLabelJson(options.labelJson)
        const labelIndex = parseLabelJson(labelJson)

        // Resolve label names to numeric values
        if (options.labelNames) {
          const names = options.labelNames.split(',').map((n) => n.trim())
          const { found, notFound } = resolveLabels(names, labelIndex)

          if (notFound.length > 0) {
            console.error(`[niivue] Warning: labels not found: ${notFound.join(', ')}`)
          }

          found.forEach((v) => selectedLabels.add(v))
          console.error(`[niivue] Resolved label names to values: ${found.join(', ')}`)
        }
      }

      // Parse numeric values
      if (options.values) {
        options.values.split(',').forEach((v) => {
          const num = parseInt(v.trim(), 10)
          if (!isNaN(num)) selectedLabels.add(num)
        })
      }

      // Parse numeric ranges
      for (const rangeStr of options.range) {
        const [start, end] = rangeStr.split('-').map((s) => parseInt(s.trim(), 10))
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            selectedLabels.add(i)
          }
        }
      }

      console.error(`[niivue] Extracting labels: ${[...selectedLabels].join(', ')}`)

      // Get raw data arrays
      const baseData = baseVolume.img as Float32Array | Int16Array | Uint8Array
      const labelData = labelVolume.img as Float32Array | Int16Array | Uint8Array

      if (baseData.length !== labelData.length) {
        throw new Error('Base volume and label volume dimensions must match')
      }

      // Create output array
      const outputData = new Float32Array(baseData.length)

      // Extract voxels where label matches
      for (let i = 0; i < labelData.length; i++) {
        const labelValue = Math.round(labelData[i])
        const matches = selectedLabels.has(labelValue)
        const include = options.invert ? !matches : matches

        if (include) {
          outputData[i] = options.binarize ? 1 : baseData[i]
        } else {
          outputData[i] = 0
        }
      }

      // Create new volume with extracted data
      const extractedVolume = baseVolume.clone()
      extractedVolume.img = outputData
      extractedVolume.name = 'extracted.nii.gz'

      await saveVolumeOutput(extractedVolume, options.output)
    }

    // DCM2NIIX command: Convert DICOM to NIfTI
    const runDcm2niixCommand = async (
      options: Awaited<ReturnType<typeof window.electron.headlessGetOptions>>
    ): Promise<void> => {
      if (!options.input) {
        throw new Error('dcm2niix command requires --input (DICOM directory)')
      }

      const mode = options.subcommandMode || 'convert'

      if (mode === 'list') {
        // List DICOM series
        const series = await window.electron.headlessDcm2niixList(options.input)
        const json = JSON.stringify(series, null, 2)
        process.stdout?.write?.(json) // Direct stdout for JSON
        // Also use IPC fallback
        await window.electron.headlessSaveOutput(json, options.output || '-')
      } else if (mode === 'convert') {
        if (!options.output) {
          throw new Error('dcm2niix convert requires --output')
        }
        if (!options.series) {
          throw new Error('dcm2niix convert requires --series')
        }

        // Parse series numbers
        let seriesNumbers: number[] = []
        if (options.series === 'all') {
          const series = await window.electron.headlessDcm2niixList(options.input)
          seriesNumbers = series.map((s: { seriesNumber: number }) => s.seriesNumber).filter((n: number) => n != null)
        } else {
          seriesNumbers = options.series.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
        }

        console.error(`[niivue] Converting DICOM series: ${seriesNumbers.join(', ')}`)

        const results = await window.electron.headlessDcm2niixConvert({
          dicomDir: options.input,
          seriesNumbers,
          outputDir: options.output === '-' ? undefined : options.output,
          compress: options.compress,
          bids: options.bids
        })

        // If output is stdout, read first result file and output as base64
        if (options.output === '-' && results.length > 0 && results[0].files.length > 0) {
          const firstFile = `${results[0].outDir}/${results[0].files[0]}`
          const resolved = await window.electron.headlessResolveInput(firstFile)
          await window.electron.headlessWriteStdout(resolved.base64)
        } else {
          console.error(`[niivue] Converted ${results.length} series to ${options.output}`)
        }
      }
    }

    // NIIMATH command: Apply niimath operations
    const runNiimathCommand = async (
      options: Awaited<ReturnType<typeof window.electron.headlessGetOptions>>
    ): Promise<void> => {
      if (!options.input) {
        throw new Error('niimath command requires --input')
      }
      if (!options.ops) {
        throw new Error('niimath command requires --ops')
      }
      if (!options.output) {
        throw new Error('niimath command requires --output')
      }

      // Resolve input
      const resolved = await window.electron.headlessResolveInput(options.input)

      console.error(`[niivue] Running niimath: ${options.ops}`)

      // Run niimath
      const result = await window.electron.headlessNiimath(resolved.base64, resolved.filename, options.ops)

      // Output result
      const isStdout = options.output === '-' || options.output.toLowerCase() === 'stdout'
      if (isStdout) {
        await window.electron.headlessWriteStdout(result.base64)
      } else {
        const saveResult = await window.electron.headlessSaveNifti(result.base64, options.output)
        if (!saveResult.success) {
          throw new Error(`Failed to save niimath result: ${saveResult.error}`)
        }
      }
    }

    // Main headless workflow dispatcher
    const runHeadlessWorkflow = async (): Promise<void> => {
      try {
        const options = await window.electron.headlessGetOptions()

        // No subcommand means GUI mode
        if (!options.subcommand) return

        console.error(`[niivue] Running subcommand: ${options.subcommand}`)

        switch (options.subcommand) {
          case 'view':
            await runViewCommand(options)
            break
          case 'segment':
            await runSegmentCommand(options)
            break
          case 'extract':
            await runExtractCommand(options)
            break
          case 'dcm2niix':
            await runDcm2niixCommand(options)
            break
          case 'niimath':
            await runNiimathCommand(options)
            break
          default:
            throw new Error(`Unknown subcommand: ${options.subcommand}`)
        }

        console.error('[niivue] Completed successfully')
        window.electron.headlessComplete()
      } catch (error) {
        console.error('[niivue] Error:', error)
        window.electron.headlessError(error instanceof Error ? error.message : String(error))
      }
    }

    // Listen for headless start event
    window.electron.onHeadlessStart(() => {
      runHeadlessWorkflow()
    })
  }, [])

  // Clear scene command
  useEffect((): (() => void) => {
    const handleClear = (): void => {
      // Use ref to get latest selected, avoiding stale closures
      const current = selectedRef.current
      if (!current) return
      const nv = current.nvRef.current

      // Create fresh document to reset all internal state
      nv.document = new NVDocument()

      // Clear arrays
      nv.volumes = []
      nv.meshes = []

      // Clear derived volume state (back/overlays reference old volumes)
      nv.back = null
      nv.overlays = []

      // Clear other state
      nv.mediaUrlMap.clear()
      nv.createEmptyDrawing()

      // Clear label cache to free memory
      labelCache.clear()

      // Refresh WebGL textures to clear any cached overlay data
      nv.updateGLVolume()

      // Update React state
      current.setVolumes([])
      current.setMeshes([])
      current.setSelectedImage(null)

      updateDocument(current.id, {
        volumes: [],
        meshes: [],
        selectedImage: null,
        isDirty: false // Cleared scene is not dirty
      })
    }
    electron.ipcRenderer.on('clear-scene', handleClear)
    return (): void => {
      electron.ipcRenderer.removeAllListeners('clear-scene')
    }
  }, [])

  useEffect(() => {
    // define once, with `selected` & `updateDocument` in scope
    const onSave = async (): Promise<void> => {
      if (!selected) return
      const { id, title, nvRef } = selected
      const nv = nvRef.current

      const jsonStr = JSON.stringify(nv.document.json())
      const base = (title || id).replace(/\.nvd(\.gz)?$/, '')
      const suggestedName = `${base}.nvd`
      const savedPath: string | undefined = await window.electron.ipcRenderer.invoke(
        'saveCompressedNVD',
        jsonStr,
        suggestedName
      )
      if (savedPath) {
        const raw = savedPath.split('/').pop() || suggestedName
        const newTitle = raw.replace(/\.nvd(\.gz)?$/, '') || suggestedName
        updateDocument(id, {
          title: newTitle,
          filePath: savedPath,
          isDirty: false
        })
      }
    }

    window.electron.ipcRenderer.on('saveCompressedDocument', onSave)
    return (): void => {
      window.electron.ipcRenderer.removeListener('saveCompressedDocument', onSave)
    }
  }, [selected, updateDocument])

  // /**
  //  * Create a brand‐new Niivue document instance,
  //  * wire up its IPC & state setters, then add to context.
  //  */
  // async function createNewDocument(): Promise<void> {
  //   const nv = new Niivue({ dragAndDropEnabled: false })
  //   // const nvRef = { current: nv }
  //   const docId = `doc-${documents.length + 1}`

  //   function getCurrent<T extends keyof NiivueInstanceContext>(
  //     field: T
  //   ): NiivueInstanceContext[T] | undefined {
  //     const d = documents.find((d) => d.id === docId)
  //     return d?.[field]
  //   }

  //   const setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>> = (action) => {
  //     const prev = (getCurrent('volumes') as NVImage[]) ?? []
  //     const next =
  //       typeof action === 'function' ? (action as (prev: NVImage[]) => NVImage[])(prev) : action
  //     updateDocument(docId, { volumes: next, isDirty: true })
  //   }

  //   const setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>> = (action) => {
  //     const prev = (getCurrent('meshes') as NVMesh[]) ?? []
  //     const next =
  //       typeof action === 'function' ? (action as (prev: NVMesh[]) => NVMesh[])(prev) : action
  //     updateDocument(docId, { meshes: next, isDirty: true })
  //   }

  //   const setSelectedImage: React.Dispatch<React.SetStateAction<NVImage | null>> = (action) => {
  //     const prev = getCurrent('selectedImage') as NVImage | null
  //     const next =
  //       typeof action === 'function'
  //         ? (action as (prev: NVImage | null) => NVImage | null)(prev)
  //         : action
  //     updateDocument(docId, { selectedImage: next, isDirty: true })
  //   }

  //   const setSliceType: React.Dispatch<React.SetStateAction<SLICE_TYPE | null>> = (action) => {
  //     const prev = getCurrent('sliceType') as SLICE_TYPE | null
  //     const next =
  //       typeof action === 'function'
  //         ? (action as (prev: SLICE_TYPE | null) => SLICE_TYPE | null)(prev)
  //         : action
  //     if (next !== null) nv.setSliceType(next)
  //     updateDocument(docId, { sliceType: next, isDirty: true })
  //   }

  //   const setSliceMosaicString: React.Dispatch<React.SetStateAction<string>> = (action) => {
  //     const prev = getCurrent('sliceMosaicString')
  //     const next =
  //       typeof action === 'function' ? (action as (prev: string) => string)(prev!) : action
  //     nv.setSliceMosaicString(next)

  //     updateDocument(docId, { sliceMosaicString: next, isDirty: true })
  //   }

  //   const setOpts: React.Dispatch<React.SetStateAction<Partial<Niivue['opts']>>> = (action) => {
  //     // 1. Grab the previous opts from your context
  //     const prevOpts = getCurrent('opts') as Partial<Niivue['opts']>

  //     // 2. Compute the “next” opts, whether action is a value or updater fn
  //     const nextOpts =
  //       typeof action === 'function'
  //         ? (action as (prev: Partial<Niivue['opts']>) => Partial<Niivue['opts']>)(prevOpts)
  //         : action

  //     // 3. Apply to Niivue instance and push into your document state
  //     Object.assign(nv.opts, nextOpts)
  //     updateDocument(docId, { opts: { ...nv.opts }, isDirty: true })
  //   }

  //   const setLayout: React.Dispatch<React.SetStateAction<keyof typeof layouts>> = (action) => {
  //     const prevLayout = getCurrent('layout') as keyof typeof layouts
  //     const nextLayout =
  //       typeof action === 'function'
  //         ? (action as (prev: keyof typeof layouts) => keyof typeof layouts)(prevLayout)
  //         : action

  //     const layoutValue = layouts[nextLayout]
  //     if (layoutValue) nv.setMultiplanarLayout(layoutValue)
  //     updateDocument(docId, { layout: nextLayout, isDirty: true })
  //   }

  //   // 2) Mosaic orientation setter
  //   type Ori = 'A' | 'C' | 'S'
  //   const setMosaicOrientation: React.Dispatch<React.SetStateAction<Ori>> = (action) => {
  //     const prevOri = getCurrent('mosaicOrientation') as Ori
  //     const nextOri =
  //       typeof action === 'function' ? (action as (prev: Ori) => Ori)(prevOri) : action

  //     // if you need to drive Niivue itself:
  //     // nv.setSliceMosaicOrientation?.(nextOri)

  //     updateDocument(docId, { mosaicOrientation: nextOri, isDirty: true })
  //   }

  //   const doc: NiivueInstanceContext = {
  //     id: docId,
  //     nvRef: { current: nv },

  //     volumes: [],
  //     setVolumes,

  //     meshes: [],
  //     setMeshes,

  //     selectedImage: null,
  //     setSelectedImage,

  //     sliceType: null,
  //     setSliceType,

  //     opts: { ...nv.opts },
  //     setOpts,

  //     layout: 'Row',
  //     setLayout,

  //     mosaicOrientation: 'A',
  //     setMosaicOrientation,

  //     sliceMosaicString: '',
  //     setSliceMosaicString,

  //     title: 'Untitled',

  //     filePath: null,
  //     isDirty: false
  //   }

  //   addDocument(doc)

  //   // load persisted prefs
  //   const prefs = await electron.ipcRenderer.invoke('getPreferences')
  //   Object.entries(prefs ?? {}).forEach(([key, value]) => {
  //     if (key in nv.opts) {
  //       nv.opts[key] = value
  //     }
  //   })

  //   nv.setSliceType(nv.sliceTypeMultiplanar)
  //   overrideDrawGraph(nv)
  //   await niimathRef.current.init()

  //   nv.drawScene()
  // }

  // // Sidebar drag/drop handlers
  // function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
  //   e.preventDefault()
  // }
  // function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
  //   if (!selected) return
  //   const nv = selected.nvRef.current
  //   nv.volumes = []
  //   nv.meshes = []
  //   nv.updateGLVolume()
  //   loadDroppedFiles(e, selected.setVolumes, selected.setMeshes, nv.gl)
  // }

  // Sidebar remove/move
  function handleRemoveMesh(mesh: NVMesh): void {
    if (!selected) return
    const nv = selected.nvRef.current
    nv.removeMesh(mesh)
    selected.setMeshes((prev) => {
      updateDocument(selected.id, { isDirty: true })
      return prev.filter((m) => m.id !== mesh.id)
    })
  }

  function handleRemoveVolume(vol: NVImage): void {
    if (!selected) return
    const nv = selected.nvRef.current
    nv.removeVolume(vol)
    const remainingImages = nv.volumes.filter((v) => v.id !== vol.id)
    selected.setVolumes(remainingImages)
    updateDocument(selected.id, { isDirty: true })
  }

  function handleReplaceVolume(vol: NVImage): void {
    if (!selected) return
    const nv = selected.nvRef.current

    const index = nv.volumes.findIndex((v) => v.id === vol.id)
    if (index === -1) return

    // Listen for dialog result
    window.electron.ipcRenderer.once(
      'replaceVolumeFileDialogResult',
      async (_e, { index, path }) => {
        if (!path) return

        try {
          const base64 = await window.electron.ipcRenderer.invoke('loadFromFile', path)
          const newVol = await NVImage.loadFromBase64({ base64, name: path })
          const vol = nv.volumes[index]

          nv.setVolume(newVol, index)
          newVol.colorMap = vol.colorMap
          newVol.opacity = vol.opacity

          selected.setVolumes([...nv.volumes])
          selected.setSelectedImage(newVol)
          nv.updateGLVolume()
          updateDocument(selected.id, { isDirty: true })
        } catch (err) {
          console.error('Failed to replace volume:', err)
          window.alert('Failed to load replacement volume.')
        }
      }
    )

    // Trigger the dialog with index
    window.electron.ipcRenderer.invoke('openReplaceVolumeFileDialog', index)
  }

  function handleMoveVolumeUp(vol: NVImage): void {
    if (!selected) return
    const nv = selected.nvRef.current
    const vols = [...nv.volumes]
    const idx = vols.indexOf(vol)
    if (idx > 0) {
      vols.splice(idx, 1)
      vols.splice(idx - 1, 0, vol)
      nv.volumes = vols
      selected.setVolumes(vols)
      updateDocument(selected.id, { isDirty: true })
    }
  }
  function handleMoveVolumeDown(vol: NVImage): void {
    if (!selected) return
    const nv = selected.nvRef.current
    const vols = [...nv.volumes]
    const idx = vols.indexOf(vol)
    if (idx < vols.length - 1) {
      vols.splice(idx, 1)
      vols.splice(idx + 1, 0, vol)
      nv.volumes = vols
      selected.setVolumes(vols)
      updateDocument(selected.id, { isDirty: true })
    }
  }

  // Tab strip
  const handleCloseTab = async (e: React.MouseEvent, doc: NiivueInstanceContext): Promise<void> => {
    e.stopPropagation()
    if (doc.isDirty) {
      const save = window.confirm(`Save changes to “${doc.title}”?`)
      if (save) {
        const { id, nvRef, title } = doc
        const nv = nvRef.current
        const jsonStr = JSON.stringify(nv.document.json())
        const base = (title || id).replace(/\.nvd(\.gz)?$/, '')
        const suggestedName = `${base}.nvd`
        const savedPath = await window.electron.ipcRenderer.invoke(
          'saveCompressedNVD',
          jsonStr,
          suggestedName
        )
        if (savedPath) {
          const raw = savedPath.split('/').pop() || suggestedName
          const newTitle = raw.replace(/\.nvd(\.gz)?$/, '') || suggestedName
          updateDocument(id, {
            title: newTitle,
            filePath: savedPath,
            isDirty: false
          })
        }
      } else {
        const discard = window.confirm(`Discard changes to “${doc.title}”?`)
        if (!discard) return
      }
    }
    removeDocument(doc.id)
  }

  function renderTabs(nv: Niivue): JSX.Element {
    return (
      <div data-testid="tab-bar" className="flex flex-row bg-gray-800 text-white px-2">
        {documents.map((doc) => {
          const isEditing = doc.id === editingDocId
          return (
            <div
              key={doc.id}
              data-testid="tab"
              className={`group relative px-4 py-2 cursor-pointer ${
                doc.id === selectedDocId ? 'bg-gray-700' : ''
              }`}
              onClick={() => {
                if (!isEditing) selectDocument(doc.id)
              }}
              draggable
              onDragStart={(e) => {
                e.preventDefault()
                const fileName = `${doc.title || doc.id}.nvd`
                const jsonStr = JSON.stringify(nv.document.json(), null, 2)
                window.electron.startTabDrag(fileName, jsonStr)
              }}
            >
              {isEditing ? (
                <input
                  type="text"
                  className="bg-white text-black px-1 py-0.5 w-full"
                  value={editingName}
                  autoFocus
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => {
                    const newTitle = editingName.trim() || doc.id
                    updateDocument(doc.id, { title: newTitle, isDirty: true })
                    setEditingDocId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const newTitle = editingName.trim() || doc.id
                      updateDocument(doc.id, { title: newTitle, isDirty: true })
                      setEditingDocId(null)
                    } else if (e.key === 'Escape') {
                      setEditingDocId(null)
                    }
                  }}
                />
              ) : (
                <span
                  onDoubleClick={() => {
                    setEditingDocId(doc.id)
                    setEditingName(doc.title ?? '')
                  }}
                >
                  {(doc.title || doc.id) + (doc.isDirty ? ' *' : '')}
                </span>
              )}
              <button
                onClick={(e) => handleCloseTab(e, doc)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                aria-label="Close tab"
              >
                ✕
              </button>
            </div>
          )
        })}
        <div
          data-testid="new-tab-button"
          className="px-4 py-2 cursor-pointer bg-green-700 hover:bg-green-600"
          onClick={() => void createDocument()}
        >
          +
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* 1) Tabs bar */}
      <div className="flex-none">
        {selected?.nvRef.current && renderTabs(selected.nvRef.current)}
      </div>

      {/* 2) Main content: sidebar & viewer & right panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (left) */}
        <div className="flex-shrink-0 overflow-auto">
          <Sidebar
            onRemoveMesh={handleRemoveMesh}
            onRemoveVolume={handleRemoveVolume}
            onMoveVolumeUp={handleMoveVolumeUp}
            onMoveVolumeDown={handleMoveVolumeDown}
            onReplaceVolume={handleReplaceVolume}
            activePanel={activeLeftPanel}
            onSetActivePanel={setActiveLeftPanel}
            availableModels={availableModels}
            onRunSegmentation={handleRunSegmentation}
            onModelsChanged={() => setModelsVersion((v) => v + 1)}
          />
        </div>
        {/* Viewer (center) */}
        <div className="flex-1 relative overflow-hidden">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="absolute inset-0"
              style={{ display: doc.id === selectedDocId ? 'block' : 'none' }}
            >
              <Viewer
                doc={doc}
                sidebarCollapsed={activeLeftPanel === null}
                rightPanelOpen={rightPanelOpen}
                onToggleRightPanel={() => setRightPanelOpen((prev) => !prev)}
              />
            </div>
          ))}
        </div>
        {/* Right Panel (controls, volume, mesh, atlas, segmentation) */}
        {rightPanelOpen && (
          <div className="flex-shrink-0 w-80 bg-white border-l border-gray-300 overflow-auto">
            <RightPanel
              activeTab={rightPanelTab}
              onTabChange={setRightPanelTab}
              onRunSegmentation={handleRunSegmentation}
              onCancelSegmentation={handleCancelSegmentation}
              availableModels={availableModels}
              isRunning={segmentationRunning}
              progress={segmentationProgress}
              status={segmentationStatus}
              modeMap={modeMap}
              indexMap={indexMap}
              extractSubvolume={extractSubvolumeEnabled}
              onExtractSubvolumeChange={setExtractSubvolumeEnabled}
              selectedExtractLabels={selectedExtractLabels}
              onSelectedExtractLabelsChange={setSelectedExtractLabels}
            />
          </div>
        )}
      </div>
      {/* Status bar (optional footer) */}
      {showStatusBar && <StatusBar location={cursorLocation} />}
      {/* Dialogs (overlay) */}
      <PreferencesDialog />
      <LabelManagerDialog
        open={labelDialogOpen}
        setOpen={setLabelDialogOpen}
        editMode={labelEditMode}
        setEditMode={setLabelEditMode}
      />
      <DicomImportDialog />
      <SegmentationDialog
        open={segmentationRunning}
        progress={segmentationProgress}
        status={segmentationStatus}
        modelName={segmentationModelName}
        onCancel={handleCancelSegmentation}
        canCancel={true}
      />
    </div>
  )
}

export default MainApp
