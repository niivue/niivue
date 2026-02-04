import { useState, useEffect } from 'react'
import { ScrollArea, Text, Select, Badge } from '@radix-ui/themes'
import type { ModelInfo } from '../services/brainchop/types.js'
import { AddModelWizard } from './AddModelWizard.js'

interface ModelsPanelProps {
  availableModels: ModelInfo[]
  onRunSegmentation: (modelId: string) => void
  onModelsChanged?: () => void
}

const categories: Array<{ label: string; value: string }> = [
  { label: 'All', value: 'all' },
  { label: 'Tissue Segmentation', value: 'Tissue Segmentation' },
  { label: 'Brain Extraction', value: 'Brain Extraction' },
  { label: 'Regional Parcellation', value: 'Regional Parcellation' }
]

export function ModelsPanel({ availableModels, onRunSegmentation, onModelsChanged }: ModelsPanelProps): JSX.Element {
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [wizardOpen, setWizardOpen] = useState(false)

  const filteredModels =
    categoryFilter === 'all'
      ? availableModels
      : availableModels.filter((m) => m.category === categoryFilter)

  return (
    <>
      <ScrollArea style={{ height: '100%', paddingRight: '10px' }}>
        <Text size="2" weight="bold">
          Models
        </Text>

        <div className="mt-2 mb-3">
          <Select.Root value={categoryFilter} onValueChange={setCategoryFilter}>
            <Select.Trigger className="w-full" />
            <Select.Content>
              {categories.map((cat) => (
                <Select.Item key={cat.value} value={cat.value}>
                  {cat.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>

        <button
          onClick={() => setWizardOpen(true)}
          className="w-full px-3 py-2 mb-3 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
        >
          + Add Model
        </button>

        <div className="flex flex-col gap-2">
          {filteredModels.map((model) => (
            <ModelCard key={model.id} model={model} onRun={onRunSegmentation} />
          ))}
        </div>

        {filteredModels.length === 0 && (
          <Text size="1" color="gray" className="block mt-4 text-center">
            No models in this category
          </Text>
        )}
      </ScrollArea>

      <AddModelWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onModelAdded={() => onModelsChanged?.()}
      />
    </>
  )
}

function ModelCard({
  model,
  onRun
}: {
  model: ModelInfo
  onRun: (id: string) => void
}): JSX.Element {
  const isBundled = model.isBundled !== false
  const hasRemote = !!model.remoteUrl
  const isUserLocal = !isBundled && !hasRemote

  // State for preview image
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Load preview image on mount
  useEffect(() => {
    if (!model.previewPath) return

    let cancelled = false
    setPreviewLoading(true)

    window.electron
      .loadBrainchopPreview(model.previewPath)
      .then((base64) => {
        if (cancelled) return
        if (base64) {
          setPreviewSrc(`data:image/png;base64,${base64}`)
        }
      })
      .catch((err) => {
        console.error('Failed to load preview:', err)
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [model.previewPath])

  return (
    <div className="bg-white rounded-md border border-gray-200 p-3 flex flex-col gap-1.5">
      {/* Preview image */}
      {model.previewPath && (
        <div className="w-full h-36 bg-gray-100 rounded overflow-hidden mb-1">
          {previewLoading ? (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              Loading...
            </div>
          ) : previewSrc ? (
            <img src={previewSrc} alt={`${model.name} preview`} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              No preview
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Text size="2" weight="bold" className="leading-tight">
          {model.name}
        </Text>
        {isBundled ? (
          <Badge size="1" color="green" variant="soft">
            Bundled
          </Badge>
        ) : hasRemote ? (
          <Badge size="1" color="blue" variant="soft">
            Remote
          </Badge>
        ) : (
          <Badge size="1" color="orange" variant="soft">
            Local
          </Badge>
        )}
      </div>

      <Text size="1" color="gray">
        {model.description}
      </Text>

      <div className="flex gap-3 text-xs text-gray-500">
        <span>{model.outputClasses} classes</span>
        <span>~{model.estimatedTimeSeconds}s</span>
        <span>{model.memoryRequirementMB}MB</span>
      </div>

      <div className="flex gap-2 mt-1">
        {(isBundled || isUserLocal) && (
          <button
            onClick={() => onRun(model.id)}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Run
          </button>
        )}
        {hasRemote && !isBundled && (
          <button
            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            onClick={() => {
              /* TODO: download then run */
            }}
          >
            Download
          </button>
        )}
      </div>
    </div>
  )
}
